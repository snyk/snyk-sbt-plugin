import * as fs from 'fs';
import * as path from 'path';

/**
 * Ancestors of `startDir` that contain a `build.sbt`, nearest first.
 *
 * Used when `snyk test --all-projects` lands on a nested `build.sbt`: we ask
 * each parent via sbt whether this directory is already a subproject base
 * before treating the nested dir as a standalone build.
 */
export function findParentBuildDirs(startDir: string): string[] {
  const resolved = path.resolve(startDir);
  const parents: string[] = [];
  let ancestor = path.dirname(resolved);
  const { root } = path.parse(resolved);

  while (ancestor !== root) {
    if (fs.existsSync(path.join(ancestor, 'build.sbt'))) {
      parents.push(ancestor);
    }
    const parent = path.dirname(ancestor);
    if (parent === ancestor) {
      break;
    }
    ancestor = parent;
  }

  return parents;
}

/**
 * One-shot sbt command: register a session command that prints
 * `SNYK_PROJECT_BASE <id> <canonicalBase>` for every loaded project, then run it.
 *
 * Avoids a second cold sbt launch just to resolve ID ≠ dirname bases.
 */
export const LIST_PROJECT_BASES_COMMAND =
  'set commands += Command.command("snykListProjectBases") { (state: State) =>' +
  ' val extracted = Project.extract(state);' +
  ' extracted.structure.allProjectRefs.foreach { ref =>' +
  ' Project.getProject(ref, extracted.structure).foreach { p =>' +
  ' state.log.info("SNYK_PROJECT_BASE " + ref.project + " " + p.base.getCanonicalPath)' +
  ' } }; state }; snykListProjectBases';

export interface ProjectBase {
  id: string;
  base: string;
}

/**
 * Parse `SNYK_PROJECT_BASE <id> <path>` lines from
 * {@link LIST_PROJECT_BASES_COMMAND} output.
 */
export function parseProjectBases(sbtOutput: string[]): ProjectBase[] {
  const projects: ProjectBase[] = [];

  for (const line of sbtOutput) {
    const plain = line.replace(/\u001b\[[0-9;]*[A-Za-z]/g, '');
    const match = plain.match(
      /^\[info\]\s+SNYK_PROJECT_BASE\s+(\S+)\s+((?:[A-Za-z]:)?[\\/].+)$/,
    );
    if (!match) {
      continue;
    }
    const id = match[1];
    const base = realpathOrResolve(match[2].trim());
    if (!projects.some((p) => p.id === id)) {
      projects.push({ id, base });
    }
  }

  return projects;
}

/**
 * Parse absolute paths from `sbt 'show <id>/baseDirectory; …'` output.
 *
 * Only lines whose entire message is an absolute path are kept, so load noise
 * like "loading project definition from /…" is ignored. An aggregating project
 * prints one path per aggregate, so the result is a set of bases, not a list
 * aligned with the requested project IDs.
 */
export function parseBaseDirectories(sbtOutput: string[]): string[] {
  const bases: string[] = [];

  for (const line of sbtOutput) {
    const plain = line.replace(/\u001b\[[0-9;]*[A-Za-z]/g, '');
    const match = plain.match(/^\[info\]\s+((?:[A-Za-z]:)?[\\/].+)$/);
    if (!match) {
      continue;
    }
    const candidate = realpathOrResolve(match[1].trim());
    if (!bases.includes(candidate)) {
      bases.push(candidate);
    }
  }

  return bases;
}

/** True when `dir` is the base directory of a project in this build. */
export function isProjectBaseDir(baseDirs: string[], dir: string): boolean {
  const resolved = realpathOrResolve(dir);
  return baseDirs.some((base) => realpathOrResolve(base) === resolved);
}

export function realpathOrResolve(p: string): string {
  const resolved = path.resolve(p);
  try {
    return fs.realpathSync(resolved);
  } catch {
    return resolved;
  }
}

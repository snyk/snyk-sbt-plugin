package sbt
package snyk

import Keys._

object SnykSbtPlugin extends AutoPlugin {
  import collection.{SortedMap, SortedSet}
  import sjsonnew.shaded.scalajson.ast._
  import sjsonnew.support.scalajson.unsafe.PrettyPrinter

  object data {
    case class SnykModuleInfo(version: String, configurations: Set[String])

    case class SnykProjectData(projectId: String, modules: SortedMap[String, SnykModuleInfo]) {
      def merge(otherModules: SortedMap[String, SnykModuleInfo]): SnykProjectData = {
        val mergedModules = otherModules.foldLeft(modules) {
          case (acc, (moduleName, moduleInfo)) =>
            acc.get(moduleName) match {
              case Some(existing) =>
                acc + (moduleName -> SnykModuleInfo(
                  existing.version,
                  existing.configurations ++ moduleInfo.configurations
                ))
              case None =>
                acc + (moduleName -> moduleInfo)
            }
        }
        SnykProjectData(projectId, mergedModules)
      }
    }

    def snykProjectDataToJson(projectDatas: Seq[SnykProjectData]): String = {
      PrettyPrinter(JObject(projectDatas.map {
        case SnykProjectData(projectId, modules) =>
          projectId -> JObject(
            Map(
              "modules" -> JObject(
                modules.mapValues { moduleInfo =>
                  JObject(
                    Map(
                      "version"        -> JString(moduleInfo.version),
                      "configurations" -> JArray(moduleInfo.configurations.toVector.map(JString))
                    )
                  )
                }.toMap
              ),
              "dependencies" -> JObject(
                Map(projectId -> JArray(modules.keys.map(JString).toVector))
              )
            )
          )
      }.toMap).toUnsafe)
    }
  }

  object graph {
    type Edge = (GroupArtifactVersion, GroupArtifactVersion)

    def toGroupArtifactVersion(m: ModuleID): GroupArtifactVersion =
      GroupArtifactVersion(m.organization, m.name, m.revision)

    case class GroupArtifactVersion(organization: String, name: String, version: String)

    case class DependencyGraph(nodes: Seq[GroupArtifactVersion] = Seq.empty, edges: Seq[Edge] = Seq.empty)

    def fromReport(rootInfo: ModuleID)(report: ConfigurationReport): DependencyGraph = {
      def createEdges(orgArt: OrganizationArtifactReport): Seq[(GroupArtifactVersion, Seq[Edge])] = {
        val chosenVersion = orgArt.modules.find(!_.evicted).map(_.module.revision)
        orgArt.modules.flatMap(createEdge(chosenVersion))
      }

      def createEdge(chosenVersion: Option[String])(report: ModuleReport): Option[(GroupArtifactVersion, Seq[Edge])] =
        if (!report.evicted && chosenVersion.isDefined) {
          val module = toGroupArtifactVersion(report.module)
          val edges = report.callers.map(caller => toGroupArtifactVersion(caller.caller) -> module)
          Some(module -> edges)
        } else {
          None
        }

      val (nodes, edges) = report.details.flatMap(createEdges).unzip
      val root = toGroupArtifactVersion(rootInfo)

      DependencyGraph((root +: nodes).distinct, edges.flatten.distinct)
    }
  }

  import data._
  import graph._

  override def requires = plugins.JvmPlugin
  override def trigger  = allRequirements

  object autoImport {
    val snykConfigurationBlacklist = settingKey[Seq[String]]("Unsupported configurations to ignore dependencies in")
    private[snyk] val snykUpdateReport = taskKey[UpdateReport]("Gets the dependency update report")
    val snykExtractProjectData = taskKey[SnykProjectData]("Extracts the dependency information for each project")
    val snykRenderProjectData = taskKey[Unit]("Renders the dependency information for the current project")
    val snykRenderTree = taskKey[Unit]("Renders the dependency information for all projects")
  }

  import autoImport._

  override lazy val globalSettings = Seq(
    snykRenderTree := Def.taskDyn {
      val allProjs = buildStructure.value.allProjectRefs
      val filter   = ScopeFilter(inProjects(allProjs: _*))

      Def.task {
        val allProjectDatas = snykExtractProjectData.all(filter).value
        println("Snyk Output Start")
        println(snykProjectDataToJson(allProjectDatas))
        println("Snyk Output End")
      }
    }.value
  )

  override lazy val projectSettings = Seq(
    snykUpdateReport / updateOptions := updateOptions.value.withCachedResolution(false).withLatestSnapshots(true).withCircularDependencyLevel(CircularDependencyLevel.Ignore),
    snykUpdateReport / updateConfiguration := updateConfiguration.value.withMissingOk(true),
    snykUpdateReport / ivyConfiguration :=
      // inTask will make sure the new definition will pick up `updateOptions in ignoreMissingUpdate`
      inTask(snykUpdateReport, Classpaths.mkIvyConfiguration).value,
    snykUpdateReport / ivyModule := {
      import internal.librarymanagement.IvySbt
      // concatenating & inlining ivySbt & ivyModule default task implementations, as `SbtAccess.inTask` does
      // NOT correctly force the scope when applied to `TaskKey.toTask` instances (as opposed to raw
      // implementations like `Classpaths.mkIvyConfiguration` or `Classpaths.updateTask`)
      val is = new IvySbt((snykUpdateReport / ivyConfiguration).value)
      new is.Module(moduleSettings.value)
    },
    snykUpdateReport := inTask(snykUpdateReport, Def.taskDyn {
      Classpaths.updateTask
    }).value,
    snykRenderProjectData := {
      val projectData = snykExtractProjectData.value
      println("Snyk Output Start")
      println(snykProjectDataToJson(Vector(projectData)))
      println("Snyk Output End")
    },
    snykConfigurationBlacklist := Seq(Test.name, IntegrationTest.name, "smoke", "gatling", "gatling-it", "pom", "windows", "universal", "universal-docs", "debian", "rpm", "universal-src", "docker", "linux", "web-assets", "web-plugin", "web-assets-test"),
    snykExtractProjectData := Def.taskDyn[SnykProjectData] {
      val blacklistedConfigurations = snykConfigurationBlacklist.value

      val supportedConfigurations = thisProject.value.configurations.filterNot { c => blacklistedConfigurations.contains(c.name) }

      val configurationFilter = ScopeFilter(configurations = inConfigurations(supportedConfigurations:_*))

      val projId = CrossVersion(scalaVersion.value, scalaBinaryVersion.value)(projectID.value)

      val configAndDependencyGraph =
        Def.task {
          val config = configuration.value
          val dependencyGraph = snykUpdateReport.value.configuration(config).map(fromReport(projId)).getOrElse(DependencyGraph())
          config.name -> dependencyGraph
        }

      Def.task {
        def snykFormatForModuleId(m: ModuleID) = s"${m.organization}:${m.name}"
        def snykFormatForGroupArtifactVersion(m: GroupArtifactVersion) = s"${m.organization}:${m.name}"

        val dependencyGraphsForEachConfiguration = configAndDependencyGraph.all(configurationFilter).value

        val snykProjectId = snykFormatForModuleId(projId)

        dependencyGraphsForEachConfiguration.foldLeft(SnykProjectData(snykProjectId, SortedMap.empty)) {
          case (projectData, (configName, graph)) =>
            val snykModules =
              graph
                .nodes
                .foldLeft(SortedMap.empty[String, SnykModuleInfo]) { case (soFar, gav) =>
                  soFar + (snykFormatForGroupArtifactVersion(gav) -> SnykModuleInfo(gav.version, Set(configName)))
                }

            projectData.merge(snykModules)
        }
      }
    }.value
  )
}

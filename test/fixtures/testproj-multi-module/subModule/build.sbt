import Dependencies._

// Nested manifest discovered by `snyk test --all-projects`. The parent already
// declares this directory as a subproject, so inspect must run from the parent.
libraryDependencies += gson

ThisBuild / organization := "com.example"
ThisBuild / scalaVersion := "2.12.16"
ThisBuild / version := "0.1.0-SNAPSHOT"

// Root declares subprojects only. Settings for the submodule live in its own
// build.sbt (discovered by `snyk test --all-projects`). Root does not
// aggregate — submodule-only deps are missed unless every project is inspected.
// Project ID (`child`) deliberately differs from the directory name (`subModule`)
// so inspect must match via sbt project bases, not basename heuristics.
lazy val mainModule = (project in file("."))
  .settings(name := "mainModule")

lazy val child = (project in file("subModule"))
  .dependsOn(mainModule)
  .settings(name := "child")

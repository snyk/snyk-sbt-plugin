// Regression fixture with a public, non-standard sbt configuration, specifically missing the `moduleGraph` task.
//
// The Protobuf config below is intentionally declared without DependencyTreeSettings so that
// `Protobuf / moduleGraph` is undefined. The plugin should skip configs missing `moduleGraph` instead of failing the
// whole task graph.
lazy val Protobuf = config("protobuf")

lazy val root = (project in file("."))
  .configs(Protobuf)
  .settings(
    inThisBuild(List(
      organization := "com.example",
      scalaVersion := "2.12.16",
      version      := "0.1.0-SNAPSHOT"
    )),
    name := "Hello",
    libraryDependencies += "axis" % "axis" % "1.4",
    inConfig(Protobuf)(Defaults.configSettings)
  )

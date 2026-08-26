name := "test-snyk-scan"
organization := "org.example"

val appScalaVersion = "2.13.8"
val apiScalaVersions = Seq(appScalaVersion)

ThisBuild / scalaVersion := appScalaVersion

libraryDependencies ++= Seq(
  "com.softwaremill.macwire" %% "macros" % "2.3.5" % "provided",
  "com.softwaremill.macwire" %% "macrosakka" % "2.3.5",
)

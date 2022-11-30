name := "test-snyk-scan"
organization := "org.example"

val appScalaVersion = "2.13.8"
val apiScalaVersions = Seq(appScalaVersion)

ThisBuild / scalaVersion := appScalaVersion

libraryDependencies ++= Seq(
  "org.jsoup" % "jsoup" % "1.14.2",
  "com.softwaremill.macwire" %% "util" % "2.3.5" % "provided",
  "com.softwaremill.macwire" %% "macros" % "2.3.5" % "provided",
  "com.softwaremill.macwire" %% "macrosakka" % "2.3.5",
  "com.softwaremill.common" %% "tagging" % "2.2.1",
  "com.github.etaty" %% "rediscala" % "1.9.0",
  "org.apache.santuario" % "xmlsec" % "2.2.3",
  "org.apache.commons" % "commons-text" % "1.9",
)

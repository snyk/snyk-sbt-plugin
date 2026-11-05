ThisBuild / organization := "com.example"
ThisBuild / version := "0.1.0-SNAPSHOT"
ThisBuild / scalaVersion := "3.3.4"

lazy val root = (project in file("."))
  .settings(
    name := "sbt2-app",
    libraryDependencies ++= Seq(
      "com.google.code.gson" % "gson" % "2.10.1",
      "com.fasterxml.jackson.core" % "jackson-databind" % "2.17.2",
      "com.fasterxml.jackson.module" %% "jackson-module-scala" % "2.15.0"
    )
  )

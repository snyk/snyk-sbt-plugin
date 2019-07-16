name := "testproj"

organization := "com.iravid"

version := "1.0.0-SNAPSHOT"

scalaVersion := "2.12.8"

libraryDependencies ++= Seq(
  "org.apache.spark" %% "spark-sql" % "2.4.2"
)

enablePlugins(JavaAppPackaging)

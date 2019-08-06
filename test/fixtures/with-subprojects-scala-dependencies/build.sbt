import Resolvers._
import Dependencies._

// factor out common settings into a sequence
lazy val buildSettings = Seq(
  organization := "com.example",
  version := "0.1.0",
  scalaVersion := "2.12.8"
)

// Sub-project specific dependencies
lazy val commonDeps = Seq(
  logbackcore,
  logbackclassic,
  jacksonjson,
  scalatest % Test
)

lazy val serverDeps = Seq(
  grizzlyframwork,
  grizzlyhttp,
  grizzlyrcm,
  grizzlyutils,
  grizzlyportunif,
  sleepycat,
  scalatest % Test
)

lazy val pricingDeps = Seq(
  apachenet,
  apachecodec,
  scalatest % Test
)

lazy val cdap2 = (project in file("."))
  .aggregate(common, server, compact, pricing, pricing_service)
  .settings(buildSettings)

lazy val common = (project in file("cdap2-common"))
  .settings(
    buildSettings,
    libraryDependencies ++= commonDeps
  )

lazy val server = (project in file("cdap2-server"))
  .dependsOn(common)
  .settings(
    buildSettings,
    resolvers := oracleResolvers,
    libraryDependencies ++= serverDeps
  )

lazy val pricing = (project in file("cdap2-pricing"))
  .dependsOn(common, compact, server)
  .settings(
    buildSettings,
    libraryDependencies ++= pricingDeps
  )

lazy val pricing_service = (project in file("cdap2-pricing-service"))
  .dependsOn(pricing, server)
  .settings(buildSettings)

lazy val compact = (project in file("compact-hashmap"))
  .settings(buildSettings)

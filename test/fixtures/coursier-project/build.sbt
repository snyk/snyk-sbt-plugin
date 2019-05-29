import sbttalon._
thriftFlavor in ThisBuild := sbttalon.Apache
lazy val commonSettings = Seq(organization in ThisBuild := "com.snyk",name in ThisBuild := "claim-service",version in ThisBuild := "1.0.0")

lazy val root = project.in(file("."))
  .settings(commonSettings)
  .aggregate(core,
             service,
             client,
             jmeter
  )
lazy val core = project.in(file("core/scala"))
  .enablePlugins(TalonApplicationPlugin)

lazy val service = project.in(file("service"))
  .dependsOn(core)
  .configs(IntegrationTest)
  .settings(libraryDependencies ++= Dependencies.core)
  .settings(Defaults.itSettings : _*)
  .enablePlugins(JavaServerAppPackaging, JavaAppPackaging, DockerPlugin, TalonApplicationPlugin)
  .dependsOn(idl)

lazy val client = project.in(file("client/scala"))
  .dependsOn(core)

// Docker customization for Jmeter.lazy val jMeterDockerSettings = Seq(dockerCommands := JMeterDockerCustomization.getCommands,daemonUser in Docker := "root")
lazy val jmeter = project.in(file("jmeter"))
  .settings(commonSettings: _*)
  .settings(name := "jmeter")
  .dependsOn(service % "compile->compile")
  .enablePlugins(JavaServerAppPackaging)
  .settings(jMeterDockerSettings: _*)

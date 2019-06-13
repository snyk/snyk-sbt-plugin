import sbttalon., TalonVersions.

thriftFlavor in ThisBuild := sbttalon.Apache

lazy val commonSettings = Seq(organization in ThisBuild := "com.project",name in ThisBuild := "claim-service",version in ThisBuild := "1.0.0")

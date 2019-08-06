import sbt._
import Keys._

object Dependencies {
  val logbackVersion = "0.9.16"
  val grizzlyVersion = "1.9.19"

  val logbackcore    = "ch.qos.logback" % "logback-core"     % logbackVersion
  val logbackclassic = "ch.qos.logback" % "logback-classic"  % logbackVersion

  val jacksonjson = "org.codehaus.jackson" % "jackson-core-lgpl" % "1.7.2"

  val grizzlyframwork = "com.sun.grizzly" % "grizzly-framework" % grizzlyVersion
  val grizzlyhttp     = "com.sun.grizzly" % "grizzly-http"      % grizzlyVersion
  val grizzlyrcm      = "com.sun.grizzly" % "grizzly-rcm"       % grizzlyVersion
  val grizzlyutils    = "com.sun.grizzly" % "grizzly-utils"     % grizzlyVersion
  val grizzlyportunif = "com.sun.grizzly" % "grizzly-portunif"  % grizzlyVersion

  val sleepycat = "com.sleepycat" % "je" % "4.0.92"

  val apachenet   = "commons-net"   % "commons-net"   % "2.0"
  val apachecodec = "commons-codec" % "commons-codec" % "1.4"

  val scalatest = "org.scalatest" %% "scalatest" % "3.0.5"
}

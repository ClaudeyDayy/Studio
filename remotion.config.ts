import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
// three.js scenes need a GPU-backed WebGL in the render browser
Config.setChromiumOpenGlRenderer("angle");

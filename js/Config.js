/* -*- Mode: JS; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set sw=2 ts=2 et tw=80 : */

var Config = {
  tinderboxDataLoader: TinderboxJSONUser,
  pushlogDataLoader: PushlogJSONParser,
  defaultTreeName: "Firefox",
  mvtTimezoneOffset: -8,
  mvtTimezoneName: "PST",
  loadInterval: 120, // seconds
  goBackPushes: 10,
  baseURL: "",
  wooBugURL: "http://brasstacks.mozilla.com/starcomment.php", // war-on-orange database
  repoNames: {
    "Firefox": "mozilla-central",
    "Firefox3.6": "releases/mozilla-1.9.2",
    "Firefox3.5": "releases/mozilla-1.9.1",
    "TraceMonkey": "tracemonkey",
    "Jaegermonkey": "projects/jaegermonkey",
    "Electrolysis": "projects/electrolysis",
    "Places": "projects/places",
    "Mobile": "mozilla-central",
    "MozillaTry": "try",
    "Birch": "projects/birch",
    "Cedar": "projects/cedar",
    "Maple": "projects/maple",
  },
  // Trees that have split mochitests like M(12345).
  treesWithGroups: [
    "Firefox",
    "TraceMonkey",
    "Jaegermonkey",
    "Electrolysis",
    "Places",
    "MozillaTry",
    "Birch",
    "Cedar",
    "Maple",
    "Mobile",
  ],
  groupedMachineTypes: {
    "Mochitest" : ["Mochitest"],
    "Reftest" : ["Crashtest", "Reftest-Direct2D", "Reftest-Direct3D",
      "Reftest-OpenGL", "Reftest", "JSReftest"]
  },
  OSNames: {
    "linux": "Linux",
    "linux64": "Linux64",
    "osx":"OS X",
    "osx64": "OS X64",
    "windows": "Win",
    "windows7-64": "Win64",
    "windowsxp": "WinXP",
    "android": "Android",
    "maemo4": "Maemo 4",
    "maemo5": "Maemo 5"
  },
  testNames: {
    "Build" : "B",
    "Nightly" : "N",
    "Mochitest" : "M",
    "Crashtest" : "C",
    "Reftest-Direct2D" : "R2D",
    "Reftest-Direct3D" : "R3D",
    "Reftest-OpenGL" : "RGL",
    "Reftest" : "R",
    "JSReftest" : "J",
    "XPCShellTest" : "X",
    "Talos Performance" : "T",
    "Jetpack SDK Test" : "JP",
    "Mozmill" : "Z",
    "Valgrind": "V",
    "Unit Test" : "U"
  },
  hiddenBuilds: [
    // Firefox:
    "OS X 10.6.2 mozilla-central shark",
    "Rev3 Fedora 12 mozilla-central debug test jetpack",
    "Rev3 Fedora 12 mozilla-central debug test opengl",
    "Rev3 Fedora 12 mozilla-central opt test jetpack",
    "Rev3 Fedora 12 mozilla-central opt test opengl",
    "Rev3 Fedora 12x64 mozilla-central debug test jetpack",
    "Rev3 Fedora 12x64 mozilla-central debug test opengl",
    "Rev3 Fedora 12x64 mozilla-central opt test jetpack",
    "Rev3 Fedora 12x64 mozilla-central opt test opengl",
    "Rev3 MacOSX Leopard 10.5.8 mozilla-central debug test jetpack",
    "Rev3 MacOSX Leopard 10.5.8 mozilla-central opt test jetpack",
    "Rev3 MacOSX Snow Leopard 10.6.2 mozilla-central debug test jetpack",
    "Rev3 MacOSX Snow Leopard 10.6.2 mozilla-central opt test jetpack",
    "Rev3 WINNT 5.1 mozilla-central opt test jetpack",
    "Rev3 WINNT 6.1 mozilla-central opt test direct3D",
    "Rev3 WINNT 6.1 mozilla-central opt test jetpack",
    "Rev3 WINNT 6.1 mozilla-central opt test reftest-d2d",
    "Rev3 WINNT 6.1 x64 mozilla-central debug test crashtest",
    "Rev3 WINNT 6.1 x64 mozilla-central debug test jsreftest",
    "Rev3 WINNT 6.1 x64 mozilla-central debug test mochitest-other",
    "Rev3 WINNT 6.1 x64 mozilla-central debug test mochitests-1/5",
    "Rev3 WINNT 6.1 x64 mozilla-central debug test mochitests-2/5",
    "Rev3 WINNT 6.1 x64 mozilla-central debug test mochitests-3/5",
    "Rev3 WINNT 6.1 x64 mozilla-central debug test mochitests-4/5",
    "Rev3 WINNT 6.1 x64 mozilla-central debug test mochitests-5/5",
    "Rev3 WINNT 6.1 x64 mozilla-central debug test reftest",
    "Rev3 WINNT 6.1 x64 mozilla-central debug test xpcshell",
    "Rev3 WINNT 6.1 x64 mozilla-central opt test crashtest",
    "Rev3 WINNT 6.1 x64 mozilla-central opt test jsreftest",
    "Rev3 WINNT 6.1 x64 mozilla-central opt test mochitest-other",
    "Rev3 WINNT 6.1 x64 mozilla-central opt test mochitests-1/5",
    "Rev3 WINNT 6.1 x64 mozilla-central opt test mochitests-2/5",
    "Rev3 WINNT 6.1 x64 mozilla-central opt test mochitests-3/5",
    "Rev3 WINNT 6.1 x64 mozilla-central opt test mochitests-4/5",
    "Rev3 WINNT 6.1 x64 mozilla-central opt test mochitests-5/5",
    "Rev3 WINNT 6.1 x64 mozilla-central opt test reftest",
    "Rev3 WINNT 6.1 x64 mozilla-central opt test xpcshell",
    "Rev3 WINNT 6.1 x64 mozilla-central talos",
    "Rev3 WINNT 6.1 x64 mozilla-central talos dirty",
    "Rev3 WINNT 6.1 x64 mozilla-central talos dromaeo",
    "Rev3 WINNT 6.1 x64 mozilla-central talos nochrome",
    "Rev3 WINNT 6.1 x64 mozilla-central talos scroll",
    "Rev3 WINNT 6.1 x64 mozilla-central talos svg",
    "Rev3 WINNT 6.1 x64 mozilla-central talos tp4",
    "WINNT 6.1 x86-64 mozilla-central build",
    "WINNT 6.1 x86-64 mozilla-central debug test crashtest",
    "WINNT 6.1 x86-64 mozilla-central debug test jsreftest",
    "WINNT 6.1 x86-64 mozilla-central debug test mochitest-other",
    "WINNT 6.1 x86-64 mozilla-central debug test mochitests-1/5",
    "WINNT 6.1 x86-64 mozilla-central debug test mochitests-2/5",
    "WINNT 6.1 x86-64 mozilla-central debug test mochitests-3/5",
    "WINNT 6.1 x86-64 mozilla-central debug test mochitests-4/5",
    "WINNT 6.1 x86-64 mozilla-central debug test mochitests-5/5",
    "WINNT 6.1 x86-64 mozilla-central debug test reftest",
    "WINNT 6.1 x86-64 mozilla-central debug test xpcshell",
    "WINNT 6.1 x86-64 mozilla-central leak test nightly",
    "WINNT 6.1 x86-64 mozilla-central nightly",
    "WINNT 6.1 x86-64 mozilla-central opt test crashtest",
    "WINNT 6.1 x86-64 mozilla-central opt test jsreftest",
    "WINNT 6.1 x86-64 mozilla-central opt test mochitest-other",
    "WINNT 6.1 x86-64 mozilla-central opt test mochitests-1/5",
    "WINNT 6.1 x86-64 mozilla-central opt test mochitests-2/5",
    "WINNT 6.1 x86-64 mozilla-central opt test mochitests-3/5",
    "WINNT 6.1 x86-64 mozilla-central opt test mochitests-4/5",
    "WINNT 6.1 x86-64 mozilla-central opt test mochitests-5/5",
    "WINNT 6.1 x86-64 mozilla-central opt test reftest",
    "WINNT 6.1 x86-64 mozilla-central opt test xpcshell",
  ],
  talosTestNames: [
   " a11y",
    "tdhtml",
    "tdhtml_nochrome",
    "tp4",
    "tp4_memset",
    "tp4_pbytes",
    "tp4_rss",
    "tp4_shutdown",
    "tp4_xres",
    "dromaeo_basics",
    "dromaeo_css",
    "dromaeo_dom",
    "dromaeo_jslib",
    "dromaeo_sunspider",
    "dromaeo_v8",
    "tsspider",
    "tsspider_nochrome",
    "tgfx",
    "tgfx_nochrome",
    "tscroll",
    "tsvg",
    "tsvg_opacity",
    "ts",
    "ts_cold",
    "ts_cold_generated_max",
    "ts_cold_generated_max_shutdown",
    "ts_cold_generated_med",
    "ts_cold_generated_med_shutdown",
    "ts_cold_generated_min",
    "ts_cold_generated_min_shutdown",
    "ts_cold_shutdown",
    "ts_places_generated_max",
    "ts_places_generated_max_shutdown",
    "ts_places_generated_med",
    "ts_places_generated_med_shutdown",
    "ts_places_generated_min",
    "ts_places_generated_min_shutdown",
    "ts_shutdown",
    "twinopen"
  ]
};

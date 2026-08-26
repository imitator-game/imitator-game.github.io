/* ============================================================
   full-task-suite-data.js — data for the "Full task-suite
   reference (50 tasks)" table on leaderboard.html.

   Deliberately a plain <script> that sets a global, NOT a JSON
   file loaded via fetch() — fetch() of a local file is blocked
   by the browser's CORS policy under file:// (no server), so a
   JSON+fetch version only works once something is actually
   serving the site over http(s) (e.g. after deploying to
   github.io, or running a local dev server). This file loads
   like any other <script src="...">, so it works identically
   whether you open leaderboard.html directly by double-click or
   view it live on github.io. Same pattern as manifest-data.js.

   To edit the numbers: only touch the arrays below, nothing
   else in the site needs to change.
   ============================================================ */
window.FULL_TASK_SUITE = {
  "columns": {
    "dp":  ["L0", "L1", "L2", "L3"],
    "act": ["L0", "L1", "L2", "L3"]
  },
  "tasks": [
    { "name": "CleanCup",                  "dp": [40, 50, 20, 100],  "act": [30, 30, 70, 90],   "meanDP": 52.5, "meanACT": 55.0 },
    { "name": "CleanDesk",                 "dp": [10, 60, 40, 60],   "act": [80, 100, 100, 100],"meanDP": 42.5, "meanACT": 95.0 },
    { "name": "CutFruit",                  "dp": [100, 50, 0, 100],  "act": [100, 100, 0, 100], "meanDP": 62.5, "meanACT": 75.0 },
    { "name": "FoldBox",                   "dp": [100, 100, 100, 100], "act": [100, 100, 100, 100], "meanDP": 100.0, "meanACT": 100.0 },
    { "name": "FoldTowel",                 "dp": [60, 40, 10, 40],   "act": [100, 100, 100, 80],"meanDP": 37.5, "meanACT": 95.0 },
    { "name": "GrindFood",                 "dp": [100, 100, 100, 100], "act": [90, 100, 100, 70], "meanDP": 100.0, "meanACT": 90.0 },
    { "name": "KnifeBowlFork",             "dp": [0, 60, 60, 90],    "act": [100, 100, 80, 50], "meanDP": 52.5, "meanACT": 82.5 },
    { "name": "LiftLid FromSkillet",       "dp": [0, 80, 80, 100],   "act": [100, 100, 100, 100], "meanDP": 65.0, "meanACT": 100.0 },
    { "name": "OpenBox",                   "dp": [100, 90, 0, 100],  "act": [100, 100, 0, 100], "meanDP": 72.5, "meanACT": 75.0 },
    { "name": "OpenLiquidCap",             "dp": [60, 50, 70, 50],   "act": [90, 60, 90, 0],    "meanDP": 57.5, "meanACT": 60.0 },
    { "name": "PickApple Banana ToBaskets","dp": [50, 100, 50, 100], "act": [90, 90, 50, 50],   "meanDP": 75.0, "meanACT": 70.0 },
    { "name": "PickAppleBasket",           "dp": [70, 70, 100, 80],  "act": [100, 90, 100, 100],"meanDP": 80.0, "meanACT": 97.5 },
    { "name": "PickApple ToScale",         "dp": [40, 90, 40, 80],   "act": [90, 10, 90, 80],   "meanDP": 62.5, "meanACT": 67.5 },
    { "name": "PickFood",                  "dp": [40, 100, 10, 90],  "act": [100, 70, 30, 90],  "meanDP": 60.0, "meanACT": 72.5 },
    { "name": "PickFruits ToPlate",        "dp": [90, 90, 100, 50],  "act": [20, 40, 100, 0],   "meanDP": 82.5, "meanACT": 40.0 },
    { "name": "PickPill ToRegions",        "dp": [40, 60, 50, 10],   "act": [90, 90, 70, 80],   "meanDP": 40.0, "meanACT": 82.5 },
    { "name": "PickRemote Control",        "dp": [100, 100, 100, 40], "act": [100, 100, 100, 80],"meanDP": 85.0, "meanACT": 95.0 },
    { "name": "PickTennisBall GolfBall",   "dp": [90, 90, 90, 100],  "act": [60, 80, 70, 50],   "meanDP": 92.5, "meanACT": 65.0 },
    { "name": "PickWash",                  "dp": [70, 100, 30, 80],  "act": [90, 100, 60, 90],  "meanDP": 70.0, "meanACT": 85.0 },
    { "name": "PlaceBook Bookcase",        "dp": [100, 100, 90, 90], "act": [100, 80, 100, 30], "meanDP": 95.0, "meanACT": 77.5 },
    { "name": "PlaceBrushRest",            "dp": [90, 70, 100, 100], "act": [80, 100, 100, 100],"meanDP": 90.0, "meanACT": 95.0 },
    { "name": "PlaceBurgerTray",           "dp": [80, 90, 80, 70],   "act": [90, 80, 90, 70],   "meanDP": 80.0, "meanACT": 82.5 },
    { "name": "PlaceChipsRack",            "dp": [90, 80, 100, 80],  "act": [70, 70, 70, 100],  "meanDP": 87.5, "meanACT": 77.5 },
    { "name": "PlaceCloth Basket",         "dp": [100, 100, 80, 10], "act": [100, 100, 90, 90], "meanDP": 72.5, "meanACT": 95.0 },
    { "name": "PlaceCommodity Rack",       "dp": [40, 50, 30, 30],   "act": [100, 100, 90, 0],  "meanDP": 37.5, "meanACT": 72.5 },
    { "name": "PlaceCupPlate",             "dp": [40, 20, 70, 30],   "act": [50, 60, 70, 0],    "meanDP": 40.0, "meanACT": 45.0 },
    { "name": "PlaceFileFolder",           "dp": [80, 70, 100, 80],  "act": [80, 80, 60, 100],  "meanDP": 82.5, "meanACT": 80.0 },
    { "name": "PlaceFoodScale",            "dp": [40, 20, 90, 0],    "act": [60, 100, 100, 0],  "meanDP": 37.5, "meanACT": 65.0 },
    { "name": "PlaceFruitBox",             "dp": [80, 20, 90, 30],   "act": [70, 30, 90, 60],   "meanDP": 55.0, "meanACT": 62.5 },
    { "name": "PlaceMagazine Folder",      "dp": [80, 100, 0, 70],   "act": [100, 100, 0, 70],  "meanDP": 62.5, "meanACT": 67.5 },
    { "name": "PlaceMugRack",              "dp": [100, 70, 80, 90],  "act": [100, 100, 80, 100],"meanDP": 85.0, "meanACT": 95.0 },
    { "name": "PlacePillBox",              "dp": [80, 70, 60, 30],   "act": [100, 60, 80, 70],  "meanDP": 60.0, "meanACT": 77.5 },
    { "name": "PlacePlateRack",            "dp": [90, 40, 30, 80],   "act": [100, 90, 50, 80],  "meanDP": 60.0, "meanACT": 80.0 },
    { "name": "PlaceScrewdriver",          "dp": [30, 20, 30, 30],   "act": [100, 80, 40, 100], "meanDP": 27.5, "meanACT": 80.0 },
    { "name": "PlaceShoeBox",              "dp": [90, 90, 60, 100],  "act": [100, 100, 90, 90], "meanDP": 85.0, "meanACT": 95.0 },
    { "name": "PourCup",                   "dp": [10, 100, 100, 90], "act": [100, 100, 100, 100],"meanDP": 75.0, "meanACT": 100.0 },
    { "name": "PourKetchup Fries",         "dp": [50, 50, 100, 30],  "act": [100, 100, 80, 60], "meanDP": 57.5, "meanACT": 85.0 },
    { "name": "PourKettle",                "dp": [90, 80, 0, 80],    "act": [100, 90, 0, 100],  "meanDP": 62.5, "meanACT": 72.5 },
    { "name": "PourLiquidCup",             "dp": [10, 0, 0, 10],     "act": [10, 10, 0, 0],     "meanDP": 5.0,  "meanACT": 5.0 },
    { "name": "PourLiquid Filter",         "dp": [60, 60, 20, 50],   "act": [100, 100, 90, 90], "meanDP": 47.5, "meanACT": 95.0 },
    { "name": "PourLiquidMug",             "dp": [60, 10, 100, 20],  "act": [0, 90, 70, 0],     "meanDP": 47.5, "meanACT": 40.0 },
    { "name": "PressJuicer",               "dp": [60, 80, 0, 100],   "act": [20, 100, 0, 100],  "meanDP": 60.0, "meanACT": 55.0 },
    { "name": "PressStapler",              "dp": [100, 70, 100, 90], "act": [50, 90, 40, 40],   "meanDP": 90.0, "meanACT": 55.0 },
    { "name": "PutBox",                    "dp": [100, 90, 90, 10],  "act": [100, 90, 100, 100],"meanDP": 72.5, "meanACT": 97.5 },
    { "name": "PutCube OnScale",           "dp": [100, 90, 90, 60],  "act": [100, 100, 100, 70],"meanDP": 85.0, "meanACT": 92.5 },
    { "name": "ScanMilkBox",               "dp": [100, 100, 100, 90],"act": [100, 100, 100, 100],"meanDP": 97.5, "meanACT": 100.0 },
    { "name": "ScanPillBottle",            "dp": [90, 50, 90, 10],   "act": [100, 100, 90, 0],  "meanDP": 60.0, "meanACT": 72.5 },
    { "name": "StirSpoon",                 "dp": [20, 0, 40, 10],    "act": [50, 50, 40, 80],   "meanDP": 17.5, "meanACT": 55.0 },
    { "name": "TransFood",                 "dp": [50, 90, 30, 30],   "act": [60, 90, 0, 20],    "meanDP": 50.0, "meanACT": 42.5 },
    { "name": "WipePot",                   "dp": [10, 0, 0, 100],    "act": [20, 0, 0, 80],     "meanDP": 27.5, "meanACT": 25.0 }
  ],
  "average": {
    "label": "Average — all 50 tasks",
    "dp": [65.6, 67.2, 60.0, 63.4],
    "act": [80.8, 82.0, 68.4, 68.2],
    "meanDP": 64.1,
    "meanACT": 74.9
  }
};
window.ROBODEMO_DATA = {
  seen: {
    "15": { TwoRobotFoldTowel: [1,1,.8,.9], TwoRobotPlaceFileFolder: [.7,.5,.9,.9], TwoRobotPlaceMugRack: [1,.8,.9,1], TwoRobotPlacePlateRack: [1,1,1,1], TwoRobotStirSpoon: [1,.9,.9,.7] },
    "30": { TwoRobotFoldTowel: [1,.9,.8,1], TwoRobotPlaceFileFolder: [.7,.8,1,.9], TwoRobotPlaceMugRack: [.9,.9,1,1], TwoRobotPlacePlateRack: [1,1,1,1], TwoRobotStirSpoon: [.9,1,1,1] },
    "45": { TwoRobotFoldTowel: [1,1,.9,.9], TwoRobotPlaceFileFolder: [.8,.2,1,.7], TwoRobotPlaceMugRack: [.8,.9,1,1], TwoRobotPlacePlateRack: [1,.9,1,1], TwoRobotStirSpoon: [1,1,.7,.9] }
  },
  unseen: {
    "15": { TwoRobotFoldBox: [0,0,0,0], TwoRobotPickFood: [0,0,0,0], TwoRobotPickRemoteControl: [0,0,0,0], TwoRobotPourKettle: [0,0,0,0], TwoRobotScanMilkBox: [0,0,0,0] },
    "30": { TwoRobotFoldBox: [0,0,.1,0], TwoRobotPickFood: [0,0,0,0], TwoRobotPickRemoteControl: [0,0,0,0], TwoRobotPourKettle: [0,0,0,0], TwoRobotScanMilkBox: [0,0,0,0] },
    "45": { TwoRobotFoldBox: [.9,0,0,1], TwoRobotPickFood: [0,0,0,0], TwoRobotPickRemoteControl: [0,0,0,0], TwoRobotPourKettle: [.1,.1,0,0], TwoRobotScanMilkBox: [.1,0,.1,0] }
  },
  full: {
    "50": {
      TwoRobotKnifeBowlFork: [1,1,.9,1],
      TwoRobotPickAppleBananaToBaskets: [1,1,.7,1],
      TwoRobotPickAppleBasket: [.9,1,1,1],
      TwoRobotPickAppleToScale: [1,1,.8,1],
      TwoRobotPickFood: [1,1,.6,1],
      TwoRobotPickFruitsToPlate: [.9,.9,.9,.9],
      TwoRobotPickPillToRegions: [.8,.9,.5,.5],
      TwoRobotPickRemoteControl: [1,1,1,.9],
      TwoRobotPickTennisBallGolfBall: [.7,1,.3,.9],
      TwoRobotPlaceBookBookcase: [.9,1,1,1],
      TwoRobotPlaceBrushRest: [1,1,1,1],
      TwoRobotPlaceBurgerTray: [.7,.8,1,.8],
      TwoRobotPlaceChipsRack: [1,1,1,1],
      TwoRobotPlaceClothBasket: [1,.4,1,.5],
      TwoRobotPlaceCommodityRack: [1,1,.8,0],
      TwoRobotPlaceCupPlate: [.7,.6,.6,.5],
      TwoRobotPlaceFileFolder: [.8,.7,1,.8],
      TwoRobotPlaceFoodScale: [1,1,1,.6],
      TwoRobotPlaceFruitBox: [.8,.3,.3,.1],
      TwoRobotPlaceMagazineFolder: [1,1,0,.8],
      TwoRobotPlaceMugRack: [1,.9,.9,1],
      TwoRobotPlacePillBox: [1,1,.9,.6],
      TwoRobotPlacePlateRack: [1,1,1,1],
      TwoRobotPlaceScrewdriver: [1,.9,1,.1],
      TwoRobotPlaceShoeBox: [1,.4,1,1],
      TwoRobotPutBox: [1,1,1,.9],
      TwoRobotPutCubeOnScale: [1,1,.9,.7],
      TwoRobotTransFood: [1,1,1,1],
      TwoRobotPourCup: [1,1,.9,.9],
      TwoRobotPourKetchupFries: [1,1,1,.5],
      TwoRobotPourKettle: [1,.8,0,1],
      TwoRobotPourLiquidCup: [1,.9,.9,.6],
      TwoRobotPourLiquidFilter: [1,.1,.3,1],
      TwoRobotPourLiquidMug: [1,1,1,1],
      TwoRobotCleanCup: [.6,1,1,1],
      TwoRobotCleanDesk: [0,0,.5,1],
      TwoRobotPickWash: [.8,1,.8,.8],
      TwoRobotWipePot: [1,1,0,1],
      TwoRobotFoldBox: [1,1,1,1],
      TwoRobotFoldTowel: [1,1,1,1],
      TwoRobotLiftLidFromSkillet: [.9,.9,1,1],
      TwoRobotOpenBox: [1,1,0,.9],
      TwoRobotOpenLiquidCap: [.8,.9,1,.9],
      TwoRobotCutFruit: [1,1,0,1],
      TwoRobotGrindFood: [1,1,1,.9],
      TwoRobotPressJuicer: [1,1,0,1],
      TwoRobotPressStapler: [1,1,1,.7],
      TwoRobotScanMilkBox: [1,.9,.7,.4],
      TwoRobotScanPillBottle: [1,.9,1,1],
      TwoRobotStirSpoon: [1,.9,.7,.7]
    }
  }
};

(function () {
  var D = window.SIM_DETAIL;
  var R = window.ROBODEMO_DATA;
  var index = D.models.findIndex(function (m) { return m.fam === "ICL"; });
  D.models.splice(index, 0, { key: "robodemo", fam: "ICL", short: "RoboDemo" });
  ["seen", "unseen"].forEach(function (split) {
    var regime = split === "seen" ? "seen" : "zs";
    ["15", "30", "45", "mean"].forEach(function (scale) {
      Object.keys(R[split]["15"]).forEach(function (task) {
        for (var i = 0; i < 4; i++) {
          var sr = scale === "mean" ? ["15", "30", "45"].reduce(function (sum, s) {
            return sum + R[split][s][task][i];
          }, 0) / 3 : R[split][scale][task][i];
          D[regime][scale][task]["L" + i].robodemo = [sr, null];
        }
      });
    });
  });
}());

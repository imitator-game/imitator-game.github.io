window.ASTRA_DATA = {
  models: [{ key: "gpt_astra", fam: "Agentic", short: "GPT-Astra", seen: .44, unseen: .68 }],
  tasks: [
    { key: "TwoRobotStirSpoon", short: "Stir with spoon", seen: true, sr: { gpt_astra: [.4, 1, .8, .6] } },
    { key: "TwoRobotPlacePlateRack", short: "Place plate rack", seen: true, sr: { gpt_astra: [.2, .4, .6, .4] } },
    { key: "TwoRobotPlaceFileFolder", short: "Place file folder", seen: true, sr: { gpt_astra: [.2, .4, .4, .2] } },
    { key: "TwoRobotFoldTowel", short: "Fold towel", seen: true, sr: { gpt_astra: [.6, 0, .2, .2] } },
    { key: "TwoRobotPlaceMugRack", short: "Hang mug on rack", seen: true, sr: { gpt_astra: [.6, .6, .4, .6] } },
    { key: "TwoRobotPickRemoteControl", short: "Pick remote", seen: false, sr: { gpt_astra: [.6, .8, 1, 1] } },
    { key: "TwoRobotScanMilkBox", short: "Scan milk box", seen: false, sr: { gpt_astra: [.6, .8, .6, .6] } },
    { key: "TwoRobotPourKettle", short: "Pour kettle", seen: false, sr: { gpt_astra: [.8, 1, 0, .6] } },
    { key: "TwoRobotPickFood", short: "Pick food", seen: false, sr: { gpt_astra: [.8, .6, .6, .6] } },
    { key: "TwoRobotFoldBox", short: "Fold box", seen: false, sr: { gpt_astra: [.6, .6, .8, .6] } }
  ]
};

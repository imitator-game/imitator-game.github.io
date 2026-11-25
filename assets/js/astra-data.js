window.ASTRA_DATA = {
  models: [{ key: "gpt_astra", fam: "Agentic", short: "GPT-Astra", seen: .44, unseen: .68, seenSub: .6463833026401701, unseenSub: .7082049272092988 }],
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
  ],
  sub: {
    TwoRobotStirSpoon: { gpt_astra: [.8007014483213425, 1, .9798349976539612, .6596969187259674] },
    TwoRobotPlacePlateRack: { gpt_astra: [.5387382507324219, .5731992959976197, .699538791179657, .4877576470375061] },
    TwoRobotPlaceFileFolder: { gpt_astra: [.4665115028619766, .5820577323436738, .4547623362392187, .5981813907623291] },
    TwoRobotFoldTowel: { gpt_astra: [.9094571828842163, .4146309107542038, .3431631654500961, .598570990562439] },
    TwoRobotPlaceMugRack: { gpt_astra: [.7473336964845657, .6257643580436707, .7007698804140091, .7469955563545227] },
    TwoRobotPickRemoteControl: { gpt_astra: [.7058577001094818, .9288755416870117, 1, 1] },
    TwoRobotScanMilkBox: { gpt_astra: [.7599965736269951, .9167668938636779, .6401546129956841, .6316350370645523] },
    TwoRobotPourKettle: { gpt_astra: [.9406628966331482, 1, .12014986658468843, .7489428877830505] },
    TwoRobotPickFood: { gpt_astra: [.850979745388031, .8409065961837768, .7072581708431244, .7272123157978058] },
    TwoRobotFoldBox: { gpt_astra: [.12402541600167752, .11715893405489623, .8006958422251046, .6028195133432745] }
  }
};

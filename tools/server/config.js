module.exports = (conf) => {
  const sd = { ready: true }; // Whether the SD card has been initialized (true) or not (false).
  const state = {
    text: "Operational",
    flags: {
      operational: true, // true if the printer is operational, false otherwise
      paused: false, // true if the printer is currently paused, false otherwise
      printing: false, // true if the printer is currently printing, false otherwise
      cancelling: false, // true if the printer is currently printing and in the process of pausing, false otherwise
      pausing: false, // true if the printer is currently printing and in the process of pausing, false otherwise
      sdReady: true, // true if the printer’s SD card is available and initialized, false otherwise. This is redundant information to the SD State.
      error: false, // true if an unrecoverable error occurred, false otherwise
      ready: true, // true if the printer is operational and no data is currently being streamed to SD, so ready to receive instructions
      closedOrError: false, // always false
    },
  };
  const printerProfile = { id: "_default", name: "Original Prusa SL1" };

  const eTag = `W/"${new Date().getTime()}"`;
  const printing = {
    file: null,
    printing: false,
    selected: false,
    estimatedPrintTime: 0,
    completion: 0,
    printTime: 0,
    printTimeLeft: 0,
  };
  const allFiles = {
    files: [
      {
        origin: "sdcard",
        path: "examples",
        display: "examples",
        name: "examples",
        type: "folder",
        typePath: ["folder"],
        children: [
          {
            origin: "sdcard",
            path:
              "examples/Prusa_SL1_Calibration_test_2H_40M_50um_Prusa_Orange.sl1",
            display: "Prusa_SL1_Calibration_test_2H_40M_50um_Prusa_Orange.sl1",
            name: "Prusa_SL1_Calibration_test_2H_40M_50um_Prusa_Orange.sl1",
            size: 3636012,
            date: 1597667691,
            type: "machinecode",
            typePath: ["machinecode", "gcode"],
            hash: "03d25853d6fcbc3b221111743b11aa84d0580298",
            refs: {
              resource:
                "http://localhost:9000/api/files/sdcard/examples/Prusa_SL1_Calibration_test_2H_40M_50um_Prusa_Orange.sl1",
              download:
                "http://localhost:9000/api/downloads/sdcard/examples/Prusa_SL1_Calibration_test_2H_40M_50um_Prusa_Orange.sl1",
            },
            gcodeAnalysis: {
              estimatedPrintTime: 0,
              dimensions: { height: 0.05 },
              material: "",
            },
          },
          {
            origin: "sdcard",
            path: "examples/Petrin_Tower_10H_50um_Prusa_Orange.sl1",
            display: "Petrin_Tower_10H_50um_Prusa_Orange.sl1",
            name: "Petrin_Tower_10H_50um_Prusa_Orange.sl1",
            size: 21008282,
            date: 1597667806,
            type: "machinecode",
            typePath: ["machinecode", "gcode"],
            hash: "c49fa4b9fb5cc7a623df2a211c241355ca1a1db7",
            refs: {
              resource:
                "http://localhost:9000/api/files/sdcard/examples/Petrin_Tower_10H_50um_Prusa_Orange.sl1",
              download:
                "http://localhost:9000/api/downloads/sdcard/examples/Petrin_Tower_10H_50um_Prusa_Orange.sl1",
            },
            gcodeAnalysis: {
              estimatedPrintTime: 0,
              dimensions: { height: 0.05 },
              material: "",
            },
          },
          {
            origin: "sdcard",
            path: "examples/Calibration objects",
            display: "Calibration objects",
            name: "Calibration objects",
            type: "folder",
            typePath: ["folder"],
            children: [
              {
                origin: "sdcard",
                path:
                  "examples/Calibration objects/Resin_Calibration_Object_0.025.sl1",
                display: "Resin_Calibration_Object_0.025.sl1",
                name: "Resin_Calibration_Object_0.025.sl1",
                size: 4930590,
                date: 1593158488,
                type: "machinecode",
                typePath: ["machinecode", "gcode"],
                hash: "40abd18023555863b7699a8817c7ce711728446e",
                refs: {
                  resource:
                    "http://localhost:9000/api/files/sdcard/examples/Calibration objects/Resin_Calibration_Object_0.025.sl1",
                  download:
                    "http://localhost:9000/api/downloads/sdcard/examples/Calibration objects/Resin_Calibration_Object_0.025.sl1",
                },
                gcodeAnalysis: {
                  estimatedPrintTime: 7292000.0,
                  dimensions: { height: 0.025 },
                  material: "Prusa Orange Tough @0.025",
                },
              },
              {
                origin: "sdcard",
                path:
                  "examples/Calibration objects/Resin_Calibration_Object_0.100.sl1",
                display: "Resin_Calibration_Object_0.100.sl1",
                name: "Resin_Calibration_Object_0.100.sl1",
                size: 1333934,
                date: 1593158490,
                type: "machinecode",
                typePath: ["machinecode", "gcode"],
                hash: "3a2f5617bb008daf766def29ee79762674d5afd3",
                refs: {
                  resource:
                    "http://localhost:9000/api/files/sdcard/examples/Calibration objects/Resin_Calibration_Object_0.100.sl1",
                  download:
                    "http://localhost:9000/api/downloads/sdcard/examples/Calibration objects/Resin_Calibration_Object_0.100.sl1",
                },
                gcodeAnalysis: {
                  estimatedPrintTime: 3559000.0,
                  dimensions: { height: 0.1 },
                  material: "Prusa Orange Tough @0.1",
                },
              },
              {
                origin: "sdcard",
                path:
                  "examples/Calibration objects/Resin_Calibration_Object_0.035.sl1",
                display: "Resin_Calibration_Object_0.035.sl1",
                name: "Resin_Calibration_Object_0.035.sl1",
                size: 3557227,
                date: 1593158489,
                type: "machinecode",
                typePath: ["machinecode", "gcode"],
                hash: "5ee3147fd73cc3db6b358b099a7f04cda52f68a0",
                refs: {
                  resource:
                    "http://localhost:9000/api/files/sdcard/examples/Calibration objects/Resin_Calibration_Object_0.035.sl1",
                  download:
                    "http://localhost:9000/api/downloads/sdcard/examples/Calibration objects/Resin_Calibration_Object_0.035.sl1",
                },
                gcodeAnalysis: {
                  estimatedPrintTime: 5992000.0,
                  dimensions: { height: 0.035 },
                  material: "Prusa Orange Tough @0.035",
                },
              },
              {
                origin: "sdcard",
                path:
                  "examples/Calibration objects/Resin_Calibration_Object_0.050.sl1",
                display: "Resin_Calibration_Object_0.050.sl1",
                name: "Resin_Calibration_Object_0.050.sl1",
                size: 4304037,
                date: 1597665858,
                type: "machinecode",
                typePath: ["machinecode", "gcode"],
                hash: "e4acf2901f5f2cc5669b0371e75f6713bffe4826",
                refs: {
                  resource:
                    "http://localhost:9000/api/files/sdcard/examples/Calibration objects/Resin_Calibration_Object_0.050.sl1",
                  download:
                    "http://localhost:9000/api/downloads/sdcard/examples/Calibration objects/Resin_Calibration_Object_0.050.sl1",
                },
                gcodeAnalysis: {
                  estimatedPrintTime: 5257272.727,
                  dimensions: { height: 0.05 },
                  material: "Prusa Orange Tough 0.05",
                },
              },
            ],
            refs: {
              resource:
                "http://localhost:9000/api/files/sdcard/examples/Calibration objects",
            },
            size: 14125788,
          },
          {
            origin: "sdcard",
            path: "examples/Prusacek_Clay_Army_1H_50um_Prusa_Orange.sl1",
            display: "Prusacek_Clay_Army_1H_50um_Prusa_Orange.sl1",
            name: "Prusacek_Clay_Army_1H_50um_Prusa_Orange.sl1",
            size: 22627184,
            date: 1597667620,
            type: "machinecode",
            typePath: ["machinecode", "gcode"],
            hash: "9fc1a59b9b8cd59460e00682d48abbb8b5df6fce",
            refs: {
              resource:
                "http://localhost:9000/api/files/sdcard/examples/Prusacek_Clay_Army_1H_50um_Prusa_Orange.sl1",
              download:
                "http://localhost:9000/api/downloads/sdcard/examples/Prusacek_Clay_Army_1H_50um_Prusa_Orange.sl1",
            },
            gcodeAnalysis: {
              estimatedPrintTime: 3705000.0,
              dimensions: { height: 0.05 },
              material: "Prusa Orange Tough 0.05",
            },
          },
        ],
        refs: { resource: "http://localhost:9000/api/files/sdcard/examples" },
        size: 61397266,
      },
      {
        origin: "local",
        path: "examples",
        display: "examples",
        name: "examples",
        type: "folder",
        typePath: ["folder"],
        children: [
          {
            origin: "local",
            path:
              "examples/Prusa_SL1_Calibration_test_2H_40M_50um_Prusa_Orange.sl1",
            display: "Prusa_SL1_Calibration_test_2H_40M_50um_Prusa_Orange.sl1",
            name: "Prusa_SL1_Calibration_test_2H_40M_50um_Prusa_Orange.sl1",
            size: 3636012,
            date: 1597667691,
            type: "machinecode",
            typePath: ["machinecode", "gcode"],
            hash: "03d25853d6fcbc3b221111743b11aa84d0580298",
            refs: {
              resource:
                "http://localhost:9000/api/files/local/examples/Prusa_SL1_Calibration_test_2H_40M_50um_Prusa_Orange.sl1",
              download:
                "http://localhost:9000/api/downloads/local/examples/Prusa_SL1_Calibration_test_2H_40M_50um_Prusa_Orange.sl1",
            },
            gcodeAnalysis: {
              estimatedPrintTime: 0,
              dimensions: { height: 0.05 },
              material: "",
            },
          },
          {
            origin: "local",
            path: "examples/Petrin_Tower_10H_50um_Prusa_Orange.sl1",
            display: "Petrin_Tower_10H_50um_Prusa_Orange.sl1",
            name: "Petrin_Tower_10H_50um_Prusa_Orange.sl1",
            size: 21008282,
            date: 1597667806,
            type: "machinecode",
            typePath: ["machinecode", "gcode"],
            hash: "c49fa4b9fb5cc7a623df2a211c241355ca1a1db7",
            refs: {
              resource:
                "http://localhost:9000/api/files/local/examples/Petrin_Tower_10H_50um_Prusa_Orange.sl1",
              download:
                "http://localhost:9000/api/downloads/local/examples/Petrin_Tower_10H_50um_Prusa_Orange.sl1",
            },
            gcodeAnalysis: {
              estimatedPrintTime: 0,
              dimensions: { height: 0.05 },
              material: "",
            },
          },
          {
            origin: "local",
            path: "examples/Prusacek_Clay_Army_1H_50um_Prusa_Orange.sl1",
            display: "Prusacek_Clay_Army_1H_50um_Prusa_Orange.sl1",
            name: "Prusacek_Clay_Army_1H_50um_Prusa_Orange.sl1",
            size: 22627184,
            date: 1597667620,
            type: "machinecode",
            typePath: ["machinecode", "gcode"],
            hash: "9fc1a59b9b8cd59460e00682d48abbb8b5df6fce",
            refs: {
              resource:
                "http://localhost:9000/api/files/local/examples/Prusacek_Clay_Army_1H_50um_Prusa_Orange.sl1",
              download:
                "http://localhost:9000/api/downloads/local/examples/Prusacek_Clay_Army_1H_50um_Prusa_Orange.sl1",
            },
            gcodeAnalysis: {
              estimatedPrintTime: 3705000.0,
              dimensions: { height: 0.05 },
              material: "Prusa Orange Tough 0.05",
            },
          },
        ],
        refs: { resource: "http://localhost:9000/api/files/local/examples" },
        size: 61397266,
      },
    ],
    free: 88398225408,
    total: 237645131776,
  };

  return {
    type: conf.type,
    sd,
    state,
    printerProfile,
    allFiles,
    eTag,
    printing,
  };
};

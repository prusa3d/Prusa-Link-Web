const express = require("express");
const app = express();
const port = 8080;

// TODO - add parsing command line arguments with printer states - iddle
// | printing

var _jsonValue = {
  temp_nozzle: 126,
  temp_bed: 30,
  material: "PLA",
  pos_z_mm: 0.0,
  printing_speed: 100,
  flow_factor: 100,
  progress: 0,
  print_dur: "         31s",
  time_est: "96540",
  time_zone: "2",
  project_name: "1D2H.gcode"
};

var _sendPrintingJSON = function(res) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.end(JSON.stringify(_jsonValue));
};

app.get("/", (req, res) => {
  _sendPrintingJSON(res);
});

app.get("/api/telemetry", (req, res) => {
  _sendPrintingJSON(res);
});

app.listen(port, () => {
  console.log("Start - listening on port: ", port);
});

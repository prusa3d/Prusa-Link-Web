const fs = require("fs");

fs.stat("./redocly.yaml", (err, stats) => {
  console.log(stats.isFile());
  //console.log(stats);
});
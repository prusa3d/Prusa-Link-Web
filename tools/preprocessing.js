// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

const fs = require("fs");
const path = require("path");
const SVGO = require("svgo");
const nunjucks = require("nunjucks");
const svgToMiniDataURI = require("mini-svg-data-uri");

// optimize SVG
async function optimizeSVG(filepath) {
  const svgo = new SVGO();
  var optSVG;
  var data = fs.readFileSync(filepath, "utf8");
  await svgo.optimize(data, { path: filepath }).then(function (result) {
    optSVG = result.data;
  });

  return svgToMiniDataURI(optSVG);
}

// Get and optimize assets
async function getAssets(assets_dir) {
  var asyncAssets = {};
  var assets = {};
  var files = fs.readdirSync(assets_dir);
  files.forEach((file) => {
    if (file.endsWith(".svg")) {
      asyncAssets[file] = optimizeSVG(path.resolve(assets_dir, file));
    }
  });
  for (var key in asyncAssets) {
    assets[key] = await asyncAssets[key];
  }
  return assets;
}

// pre-process the html
const preprocessing = async ({ printer, templates_dir, assets_dir, output }) => {
  const parse = [];
  nunjucks.configure(templates_dir, { autoescape: true });

  // input/output: parse = [('input_path', 'output_path'), ]
  const path_to_printer_templates = path.resolve(
    __dirname,
    `${templates_dir}/printer/${printer}`
  );
  fs.readdirSync(path_to_printer_templates).forEach((filename) => {
    parse.push([
      `printer/${printer}/${filename}`,
      path.resolve(__dirname, `${output}/${filename}`),
    ]);
  });

  // Clean views
  if (fs.existsSync(output)) {
    fs.readdirSync(output).forEach((filename) => {
      fs.unlinkSync(`${output}/${filename}`);
    });
  } else {
    fs.mkdirSync(path.resolve(__dirname, output));
  }

  // generate source by template
  const promises = [];
  await getAssets(assets_dir).then((assets) => {
    for (locations of parse) {
      console.log(`- ${locations[0]} -> ${locations[1]}`);
      var data = nunjucks.render(locations[0], { assets: assets, printer: printer });
      promises.push(
        fs.writeFile(locations[1], data, "utf8", (err) => {
          if (err) throw err;
        })
      );
    }
  });

  for (promise of promises) {
    await promises;
  }
};

class PrusaPreprocessingPlugin {
  // options = {
  //    printer: "sl1",
  //    templates_dir: "preprocessing",
  //    assets_dir: "src/assets",
  //    output: "src/views",
  // }
  constructor(options) {
    this.options = options;
  }

  apply(compiler) {
    compiler.hooks.beforeRun.tapAsync(
      "PrusaPreprocessingPlugin",
      (compilation, callback) => {
        preprocessing(this.options).then(callback);
      }
    );
  }
}

module.exports = PrusaPreprocessingPlugin;

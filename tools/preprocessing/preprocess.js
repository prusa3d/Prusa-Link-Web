// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

const fs = require("fs");
const path = require("path");
const SVGO = require("svgo");
const nunjucks = require("nunjucks");
const svgToMiniDataURI = require("mini-svg-data-uri");

class Preprocess {
  constructor({ printer_conf, templates_dir, output_dir, assets_dir }) {
    this.printer_conf = printer_conf;
    this.templates_dir = templates_dir;
    this.assets_dir = assets_dir;
    this.output_dir = output_dir;
    this.render_again = false;
    this.assets = {};

    this.countAssets = {};
    nunjucks.configure(templates_dir, {
      autoescape: true,
      trimBlocks: true,
      lstripBlocks: true,
    });
  }

  clean() {
    if (fs.existsSync(this.output_dir)) {
      fs.readdirSync(this.output_dir).forEach((filename) => {
        fs.unlinkSync(path.join(this.output_dir, filename));
      });
    } else {
      fs.mkdirSync(this.output_dir);
    }
  }

  paths() {
    const paths_to_parse = [];
    const path_to_printer_templates = path.join(
      this.templates_dir,
      "printer",
      this.printer_conf.type
    );
    fs.readdirSync(path_to_printer_templates).forEach((filename) => {
      paths_to_parse.push({
        template_path: path.join(path_to_printer_templates, filename),
        output_path: path.join(this.output_dir, filename),
      });
    });
    return paths_to_parse;
  }

  countOrRenderAssets(filename) {
    let asset = this.assets[filename];
    if (asset) {
      return asset;
    } else {
      this.render_again = true;
      if (filename in this.countAssets) {
        this.countAssets[filename] += 1;
      } else {
        this.countAssets[filename] = 1;
      }
      return `{{ pre.countOrRenderAssets('${filename}') }}`;
    }
  }

  async loadAssets() {
    for (var filename in this.countAssets) {
      if (filename.endsWith(".svg")) {
        let assets_path = path.join(this.assets_dir, filename);
        let svg = await this.optimizeSVG(assets_path);
        if (this.countAssets[filename] > 1) {
          // more than 1: save in /views/{filename}
          let assets_view_path = path.join(this.output_dir, filename);
          fs.writeFileSync(assets_view_path, svg);
          this.assets[filename] = "./" + filename;
        } else {
          // only 1: save as data source
          this.assets[filename] = svgToMiniDataURI(svg);
        }
      } else {
        throw new Error(`There isn't pre loads to ${filename}`);
      }
    }
    this.countAssets = {};
  }

  async render() {
    this.clean();

    // Render and seek new assets to load.
    const parse = this.paths();
    parse.forEach((metadata) => {
      this.render_again = false;
      let data = nunjucks.render(metadata.template_path, {
        pre: this,
        env: this.printer_conf,
      });
      metadata.data = data;
      metadata.render_again = this.render_again;
    });

    // If there are some assets, then load
    if (this.countAssets) {
      await this.loadAssets();
    }

    // Render the data if needed and save
    parse.forEach((metadata) => {
      console.log(` ${metadata.template_path} -> ${metadata.output_path}`);
      let data;
      if (metadata.render_again) {
        data = nunjucks.renderString(metadata.data, { pre: this });
      } else {
        data = metadata.data;
      }

      fs.writeFileSync(metadata.output_path, data);
    });
  }

  async optimizeSVG(filepath) {
    var data = fs.readFileSync(filepath, "utf8");
    return new SVGO()
      .optimize(data, { path: filepath })
      .then(function (result) {
        return result.data;
      });
  }
}

module.exports = Preprocess;

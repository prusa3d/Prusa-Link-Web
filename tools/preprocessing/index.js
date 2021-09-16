// This file is part of the Prusa Link Web
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

const Preprocess = require("./preprocess");
const chokidar = require("chokidar");

class PreprocessingPlugin {
  /**
   * PreprocessingPlugin
   *
   *  options = {
   *    config: {},
   *    templates_dir: "templates",
   *    assets_dir: "src/assets[/env.PRINTER_CODE]",
   *    output_dir: "src/views",
   *  }
   *
   * @param {string: string} options
   */
  constructor(options) {
    this.options = options;
  }

  // Apply the webpack plugin
  apply(compiler) {
    compiler.hooks.beforeRun.tapAsync(
      "PreprocessingPlugin",
      (compilation, callback) => {
        new Preprocess(this.options).render().then(callback);
      }
    );
  }

  /**
   * Watcher the preprocessing files and rebuild on any change
   *
   * @param {object} server Webpack dev server
   */
  startWatcher(server) {
    global.watcher = chokidar
      .watch(this.options.templates_dir, {
        persistent: true,
      })
      .on("ready", () => {
        global.watcher
          .on("change", (path) => new Preprocess(this.options).render())
          .on("unlink", (path) => new Preprocess(this.options).render());
      });

    const old_close = server.close;
    const close = (cb) => {
      global.watcher.close();
      old_close(cb);
    };
    server.close = close;
  }
}

module.exports = PreprocessingPlugin;

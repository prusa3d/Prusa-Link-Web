// This file is part of the Prusa Link Web
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

const { joinPaths } = require("../helpers/join_paths");
const errors = require("./errors.js");
const Printer = require("./printer.js");

class PrinterFDM extends Printer {
  constructor(name) {
    super(require("./files_gcode"), name, 300);
  }

  // Functions are almost same as functions in printer
  getFiles(target, pathname, recursive = false) {
    let root = this.files.files;
    if (target == undefined) {
      return this.fileResponse(
        root,
        recursive
      );
    }

    return this.fileResponse(this.find(target, pathname), recursive);
  }

  find(target, pathname) {
    let root = this.files.files;

    if (pathname == "." || pathname == undefined) {
      return root.find(file => file.origin === target);
    }

    const paths = pathname.split("/");
    let node = root;
    for (let p of paths) {
      if (!Array.isArray(node) && node.type == "folder") {
        node = node.children;
      }
      node = node.find((element) => element.origin == target && element.name == p);
      if (!node)
        return null;
    }
    return node;
  }

  projectExtensions() {
    return [".gcode"]
  }

  uploadProject(options) {
    if (!options.path) {
      const root = this.files.files;
      const origin = root.find(file => file.origin === options.target);
      if (origin)
        options.path = origin.name;
    }

    let parent = this.getFiles(options.target, options.path, true);

    if (parent) {
      if (!Array.isArray(parent)) {
        if (parent.type == "folder") {
          parent = parent.children;
        } else {
          this.last_error = new errors.FileNotFound();
          return this.last_error;
        }
      }

      for (const node of parent) {
        if (node.name == options.fileName) {
          this.last_error = new errors.FileAlreadyExists();
          return this.last_error;
        }
      }

      const project = this.createNewFile(options);
      parent.push(project);
      this.eTag = `W/"${new Date().getTime()}"`;

      if (options.select || options.print) {
        const select = this.selectProject(
          options.target,
          joinPaths(options.path, options.fileName),
          options.print,
        );

        if (select instanceof errors.ApiError) {
          this.last_error = select;
          return this.last_error;
        }
      }

      return {
        files: {
          local: {
            name: project.name,
            origin: project.origin,
            refs: project.refs,
          },
        },
        done: true,
      };
    }
    this.last_error = new errors.FileNotFound();
    return this.last_error;
  }

  job() {
    const jobFDM = super.job();
    const pos_z = 50;
    const length = 45;
    const volume = 80;

    if (jobFDM.progress) {
      const completion = jobFDM.progress.completion;
      jobFDM.progress = {
        ...jobFDM.progress,
        pos_z_mm: pos_z * completion,
        printSpeed: Math.random() * 10,
        flow_factor: Math.random() * 5,
        filament_status: parseInt(Math.random() * 5),
      };
      jobFDM["filament"] = {
        length: length * completion,
        volume: volume * completion,
      };
    }

    return jobFDM;
  }

  version(system) {
    const versionFDM = super.version(system);
    versionFDM["firmware"] = "3.10.0";

    return versionFDM;
  }

  onUpdate() {
    const printerStatus = super.onUpdate();
    const temperatures = printerStatus.temperature;

    printerStatus["telemetry"] = {
      "temp-bed": this.isPrinting ? temperatures.bed.actual : 0,
      "temp-nozzle": this.isPrinting ? temperatures.tool0.actual : 0,
      "print-speed": 100,
      "z-height": 0.5,
      "axis_x": 0,
      "axis_y": 0,
      "axis_z": 0,
      material: "Material",
    };

    return printerStatus;
  }
}

module.exports = PrinterFDM;
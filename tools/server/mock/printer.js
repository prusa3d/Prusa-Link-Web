// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

const path = require("path");
const errors = require("./errors.js");

class Printer {
  constructor(files, name, maxTemperature) {
    this.files = files;
    this.maxTemperature = maxTemperature;
    this.free = 88398225408;
    this.total = 237645131776;
    this.profile = { id: "_default", name };
    this.eTag = `W/"${new Date().getTime()}"`;
    this.printingProject = null;
    this.isPrinting = false;
    this.progress = {
      estimatedPrintTime: 120,
      printTime: 0,
    };
    this.statusSD = true;
    this.statusText = "Operational";
    this.status = {
      operational: true, // true if the printer is operational, false otherwise
      paused: false, // true if the printer is currently paused, false otherwise
      printing: false, // true if the project is opened
      cancelling: false, // true if the printer is currently printing and in the process of pausing, false otherwise
      pausing: false, // true if the printer is currently printing and in the process of pausing, false otherwise
      sdReady: true, // true if the printer’s SD card is available and initialized, false otherwise. This is redundant information to the SD State.
      error: false, // true if an unrecoverable error occurred, false otherwise
      ready: true, // true if the printer is operational and no data is currently being streamed to SD, so ready to receive instructions
      closedOrError: false, // true if the printer is disconnected (possibly due to an error), false otherwise
    };
    this.last_error = null;
  }

  getAllFiles(eTag, recursive = false) {
    if (eTag == this.eTag) {
      return {
        files: null,
        eTag: this.eTag,
      };
    }
    return {
      files: this.getFiles(undefined, undefined, recursive),
      eTag: this.eTag,
    };
  }

  getFiles(target, pathname, recursive = false) {
    if (target == undefined) {
      return this.fileResponse(
        [...this.files.local, ...this.files.sdcard],
        recursive
      );
    }

    if (pathname == undefined) {
      return this.fileResponse(this.files[target], recursive);
    }

    return this.fileResponse(this.find(target, pathname), recursive);
  }

  fileResponse(data, recursive) {
    if (data == undefined || data == null) {
      return null;
    }

    if (!recursive) {
      if (Array.isArray(data)) {
        data = data.map((node) => {
          let newNode = Object.assign({}, node);
          if (newNode.type == "folder") {
            newNode.children = [];
          }
          return newNode;
        });
      } else if (data.type == "folder") {
        data = Object.assign({}, data);
        data.children = [];
      }
    }
    if (Array.isArray(data)) {
      return {
        files: data,
        free: this.free,
        total: this.total,
      };
    }
    return data;
  }

  checkProject(target, pathname) {
    if (this.status.printing) {
      this.last_error = new errors.NotAvailableInState();
      return this.last_error;
    }

    const project = this.getFiles(target, pathname);
    if (
      project == null ||
      project.total !== undefined ||
      project.type == "folder"
    ) {
      this.last_error = new errors.FileNotFound();
      return this.last_error;
    }

    return project;
  }

  selectProject(target, pathname, print = false) {
    const result = this.checkProject(target, pathname);
    if (!(result instanceof errors.ApiError)) {
      this.printingProject = result;
      this.status.printing = true;
      this.statusText = "Printing";
      if (print) {
        this.startPrint();
      }
    }
    return result;
  }

  uploadProject(options) {
    let parent = null;
    if (options.path) {
      parent = this.getFiles(options.target, options.path, true);
    } else {
      parent = this.files[options.target];
    }
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

  createNewFile(options) {
    const newPath = path.join(options.path || "", options.fileName);
    return {
      origin: options.target,
      path: newPath,
      display: options.fileName,
      name: options.fileName,
      size: options.size,
      date: 1597667620,
      type: "machinecode",
      typePath: ["machinecode", "gcode"],
      hash: "9fc1a59b9b8cd59460e00682d48abbb8b5df6fce",
      refs: {
        resource: `http://localhost:9000/api/files/${options.target}/${newPath}`,
        download: `http://localhost:9000/api/downloads/${options.target}/${newPath}`,
      },
    };
  }

  find(target, pathname) {
    if (pathname == "." || pathname == undefined) {
      return this.files[target];
    }
    const paths = pathname.split("/");
    let node = this.files[target];
    for (let p of paths) {
      if (!Array.isArray(node) && node.type == "folder") {
        node = node.children;
      }
      node = node.find((element) => element.name == p);
    }
    return node;
  }

  removeProject(target, pathname) {
    const result = this.checkProject(target, pathname);
    if (result instanceof errors.ApiError) {
      return result;
    }
    let node = this.find(target, path.dirname(pathname));
    if (!Array.isArray(node)) {
      node = node.children;
    }
    const pos = node.findIndex((elm) => elm.path == pathname);
    if (pos > -1) {
      node.splice(pos, 1);
      this.eTag = `W/"${new Date().getTime()}"`;
      return true;
    }
    this.last_error = new errors.FileNotFound();
    return this.last_error;
  }

  version() {
    return {
      api: "0.1",
      server: "1.1.0",
      text: "Prusa SLA SL1 1.0.5",
      hostname: `prusa-sl1`,
    };
  }

  connection() {
    return {
      current: {
        baudrate: null,
        port: null,
        printerProfile: "_default",
        state: this.statusText,
      },
      options: {
        baudratePreference: null,
        baudrates: [],
        portPreference: null,
        ports: [],
        printerProfilePreference: "_default",
        printerProfiles: [this.profile],
      },
    };
  }

  printerProfiles(req) {
    return {
      profiles: [
        {
          id: this.profile.id,
          name: this.profile.name,
          model: this.profile.name,
          color: "default",
          current: true,
          default: true,
          resource:
            req.protocol +
            "://" +
            req.get("host") +
            req.originalUrl +
            "/_default",
          heatedBed: true, // Original Prusa SL1 uses for CPU temperature
          heatedChamber: true, // Original Prusa SL1 uses for ambient temp
          extruder: {
            // Original Prusa SL1 uses for UV LED temp
            count: 1, // Number of print heads
            offsets: [0.0, 0.0],
          },
        },
      ],
    };
  }

  systemCommands(url) {
    return { core: [], custom: [] };
  }

  print() {
    if (!this.status.printing || this.isPrinting) {
      this.last_error = new errors.NotAvailableInState();
      return this.last_error;
    }

    this.startPrint();
    return true;
  }

  startPrint() {
    this.isPrinting = true;
    this.status.ready = false;
    let estimatedPrintTime = 120;
    if (
      this.printingProject.gcodeAnalysis &&
      this.printingProject.gcodeAnalysis.estimatedPrintTime
    ) {
      estimatedPrintTime = this.printingProject.gcodeAnalysis
        .estimatedPrintTime;
    }
    this.progress.estimatedPrintTime = estimatedPrintTime;
    this.progress.completion = 0;
    this.progress.printTime = 0;
    this.progress.printTimeLeft = estimatedPrintTime;
  }

  stopPrint() {
    if (this.status.printing) {
      this.printingProject = null;
      this.isPrinting = false; // don't print
      this.status.printing = false; // close project
      this.status.ready = true;
      this.statusText = "Operational";
      return true;
    }
    this.last_error = new errors.NotAvailableInState();
    return this.last_error;
  }

  job() {
    const state = this.statusText;
    if (this.status.printing) {
      const job = {
        estimatedPrintTime: this.progress.estimatedPrintTime,
        file: {
          date: this.printingProject.date,
          name: this.printingProject.name,
          origin: this.printingProject.origin,
          size: this.printingProject.size || 3636012,
        },
      };
      const result = { job, state };

      if (this.isPrinting) {
        this.progress.printTime = this.progress.printTime + 1;
        const percent =
          this.progress.printTime / this.progress.estimatedPrintTime;
        result["progress"] = {
          completion: percent,
          filepos: job.file.size * percent,
          printTime: this.progress.printTime,
          printTimeLeft:
            this.progress.estimatedPrintTime - this.progress.printTime,
        };
        if (percent >= 1) {
          this.stopPrint();
        }
      }
      return result;
    }
    return { state };
  }

  getStatus() {
    return {
      text: this.statusText,
      flags: this.status,
    };
  }

  getSD() {
    return {
      ready: this.statusSD,
    };
  }

  getTemperatures() {
    return {
      tool0: {
        actual: Math.random() * this.maxTemperature,
        target: 0,
        offset: 0,
      },
      bed: {
        actual: Math.random() * this.maxTemperature,
        target: 0,
        offset: 0,
      },
      chamber: {
        actual: Math.random() * this.maxTemperature,
        target: 0,
        offset: 0,
      },
    };
  }

  onUpdate() {
    return {
      temperature: this.getTemperatures(),
      sd: this.getSD(),
      state: this.getStatus(),
    };
  }
}

module.exports = Printer;

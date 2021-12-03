// This file is part of the Prusa Link Web
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

const { joinPaths } = require("../helpers/join_paths");
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
    this.isDownloading = false;
    this.downloadStatus = null;
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
      checked: false,
    };
    this.last_error = null;
    this.logFiles = require("./logs");
    this.logFilesContents = [];
    setInterval(() => this.updateLogs(), 10000);
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
    const project = this.getFiles(target, pathname);
    if (
      project == null ||
      project.total !== undefined ||
      project.type == "folder"
    ) {
      this.last_error = new errors.FileNotFound();
      return this.last_error;
    }

    if (this.status.cancelling) {
      this.last_error = new errors.NotAvailableInState();
      return this.last_error;
    }

    if (this.isPrinting && this.printingProject !== project) {
      this.last_error = new errors.NotAvailableInState();
      return this.last_error;
    }

    return project;
  }

  selectProject(target, pathname, print = false) {
    const result = this.checkProject(target, pathname);
    if (!(result instanceof errors.ApiError)) {
      this.printingProject = result;
      this.statusText = "Operational";
      if (print) {
        this.startPrint();
      }
    }
    return result;
  }

  uploadProject(options) {
    let parent = null;
    if (options.path && options.path !== "/") {
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

  createNewFile(options) {
    const newPath = joinPaths(options.path || "", options.fileName);

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
      if (this.printingProject == result) {
        this.stopPrint();
      }
      return true;
    }
    this.last_error = new errors.FileNotFound();
    return this.last_error;
  }

  version(system = false) {
    const result = {
      api: "0.1",
      server: "1.1.0",
      text: "Prusa SLA SL1 1.0.5",
      hostname: `prusa-sl1`,
      sdk: "0.2.0",
      python: [
        {
          name: "urllib3",
          version: "1.26.1",
          path: "/usr/lib/python3/dist-packages",
        },
      ],
    };

    if (system) {
      result["system"] = {
        python: "3.9.5",
        DESCRIPTION: "System description",
        ID: "Raspbian",
        OS: "GNU/Linux",
      }
    }

    return result;
  }

  logs(filename) {
    if (filename) {
      if (this.logFiles.files.find(file => file.name === filename)) {
        return this.logFilesContents[filename] ? this.logFilesContents[filename].join("\n") : "";
      } else {
        return new errors.FileNotFound;
      }
    }

    return this.logFiles;
  }

  updateLogs() {
    const w1 = ["oiling", "preparing", "solving", "printing", "clearing", "doing"];
    const w2 = ["buttons", "coffee", "errors", "job", "dust", "homework"];
    const generateLogLine = () => (
      w1[Math.floor(Math.random() * w1.length)]
      + " "
      + w2[Math.floor(Math.random() * w2.length)]
    );

    this.logFiles.files.forEach(file => {
      if (file.name === "empty.log")
        return;

      file.date = Math.floor(new Date().getTime() / 1000);

      if (!this.logFilesContents[file.name])
        this.logFilesContents[file.name] = [];

      const content = this.logFilesContents[file.name];
      content.push(generateLogLine());

      if (content.length > 30)
        content.shift();
    });
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
        baudrates: [115200],
        ports: ["VIRTUAL"],
        printerProfiles: [this.profile],
      },
      connect: {
        hostname: "dev.connect.prusa",
        port: 8080,
        tls: false,
        registrated: true,
      },
      states: {
        printer: {
          ok: false,
          message: "Serial port cannot be obtained",
        },
        connect: {
          ok: true,
          message: "OK",
        },
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
    if (!this.printingProject || this.isPrinting || this.status.cancelling) {
      this.last_error = new errors.NotAvailableInState();
      return this.last_error;
    }

    this.startPrint();
    return true;
  }

  startPrint() {
    this.isPrinting = true;
    this.statusText = "Printing";
    this.status.printing = true;
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
    this.printingProject = null;
    this.isPrinting = false; // doesn't print
    this.status.printing = false; // close project
    this.status.ready = true;
    this.status.cancelling = false;
    this.statusText = "Operational";
  }

  stop() {
    if (this.printingProject) {
      if (this.isPrinting) {
        this.printingProject = null;
        this.isPrinting = false; // doesn't print
        this.status.printing = false; // close project
        this.status.ready = false;
        this.status.cancelling = true;
        this.statusText = "Cancelling";

        setTimeout(() => this.stopPrint(), 5000);
      } else {
        this.stopPrint();
      }

      return true;
    }
    this.last_error = new errors.NotAvailableInState();
    return this.last_error;
  }

  job() {
    const state = this.statusText;
    if (this.printingProject) {
      const job = {
        estimatedPrintTime: this.progress.estimatedPrintTime,
        file: {
          date: this.printingProject.date,
          name: this.printingProject.name,
          origin: this.printingProject.origin,
          path: this.printingProject.path,
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

  startDownload({ url, target, destination, size, to_select = false, to_print = false }) {
    if (!url || !target) {
      this.last_error = new errors.InvalidProject();
      return this.last_error;
    }

    if (target != "sdcard" && target != "local") {
      this.last_error = new errors.FileNotFound();
      return this.last_error; // TODO: send origin not found?
    }

    // TODO: check if file exists?

    const start_time = Math.floor(new Date().getTime() / 1000);
    const download_time = 15;

    this.downloadStatus = {
      url,
      target,
      destination,
      size,
      start_time,
      estimated_time: download_time, // only internal
      remaining_time: download_time,
      to_select,
      to_print,
    };
    this.isDownloading = true;

    return this.download();
  }

  download() {
    if (!this.isDownloading)
      return null;

    this.downloadStatus.remaining_time -= 1;
    const status = this.downloadStatus;

    if (status.remaining_time > 0) {
      const progress = (status.estimated_time - status.remaining_time) / status.estimated_time;
      const result = JSON.parse(JSON.stringify(this.downloadStatus));
      delete result.estimated_time; // only internal
      result.progress = progress;
      return result;
    } else {
      this.isDownloading = false;
      const options = {
        target: status.target,
        select: status.to_select,
        print: status.to_print,
        path: status.destination,
        fileName: status.url.split("/").pop() || "new project",
        fileSize: status.size,
      };

      const uploadResult = this.uploadProject(options);
      if (uploadResult instanceof errors.ApiError)
        return uploadResult;

      if (options.select || options.print)
        return this.selectProject(
          options.target,
          joinPaths(options.path, options.fileName),
          options.print,
        );
    }
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

  pause() {
    if (!this.isPrinting) {
      this.last_error = new errors.NotAvailableInState();
      return this.last_error;
    }
    this.isPrinting = false;
    this.status.printing = false;
    this.status.pausing = true;
    this.status.busy = true;
    this.statusText = "Pausing";

    setTimeout(() => {
      this.status.paused = true;
      this.status.pausing = false;
      this.status.busy = false;
      this.statusText = "Paused";
    }, 3000);
    return true;
  }

  pauseResume() {
    if (!this.status.paused) {
      this.last_error = new errors.NotAvailableInState();
      return this.last_error;
    }
    this.status.paused = false;
    this.isPrinting = true;
    this.status.printing = true;
    this.statusText = "Printing";
    return true;
  }
}

module.exports = Printer;

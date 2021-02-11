// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

const path = require("path");
const express = require("express");
const router = new express.Router();
const multer = require("multer");
const upload = multer();

const noRecursive = (result) => {
  return {
    files: result.files.map((node) => {
      let newNode = Object.assign({}, node);
      if (newNode.type == "folder") {
        newNode.children = [];
      }
      return newNode;
    }),
    free: result.free,
    total: result.total,
  };
};

const _getFiles = (printerConf, target, pathname) => {
  if (target == undefined) {
    return printerConf.allFiles;
  }

  if (pathname == undefined) {
    return {
      files: printerConf.allFiles.files.filter((node) => node.origin == target),
      free: printerConf.allFiles.free,
      total: printerConf.allFiles.total,
    };
  }

  const paths = pathname.split("/");
  let allFiles = printerConf.allFiles.files;

  let result = null;
  for (let path of paths) {
    for (let node of allFiles) {
      if (node.origin == target && node.name == path) {
        result = node;
      }
    }

    if (result == null) {
      return null;
    }

    if (result.path != pathname) {
      allFiles = result.children;
      result = null;
    } else {
      return result;
    }
  }

  return result;
};

/**
 * Retrieve all files’ and folders’ information.
 */
router.get("/", async (req, res, next) => {
  const eTag = req.header("If-None-Match");
  const printerConf = req.app.get("printerConf");
  const allFiles = _getFiles(printerConf);

  if (eTag == printerConf.eTag) {
    res.status(304).send("Not Modified");
  } else {
    if (req.query["recursive"]) {
      res.set("ETag", printerConf.eTag).json(allFiles);
    } else {
      res.set("ETag", printerConf.eTag).json(noRecursive(allFiles));
    }
  }
});

/**
 * Retrieve all files’ and folders’ information for the target
 * location.
 */
router.get("/:target", async (req, res, next) => {
  const target = req.params.target;

  if (target != "sdcard" && target != "local") {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const eTag = req.header("If-None-Match");
  const printerConf = req.app.get("printerConf");
  const allFiles = _getFiles(printerConf, target);

  if (eTag == printerConf.eTag) {
    res.status(304).send("Not Modified");
  } else {
    if (req.query["recursive"]) {
      res.set("ETag", printerConf.eTag).json(allFiles);
    } else {
      res.set("ETag", printerConf.eTag).json(noRecursive(allFiles));
    }
  }
});

/**
 * Upload file or create folder.
 */
router.post("/:target", upload.any(), async (req, res, next) => {
  const uploadFile = req.files[0];
  const options = {
    target: req.params.target,
    select: req.body.select || false,
    print: req.body.print || false,
    path: req.body.path,
    fileName: uploadFile.originalname,
    fileSize: uploadFile.size,
  };

  const newFile = {
    origin: options.target,
    path: options.fileName,
    display: options.fileName,
    name: options.fileName,
    size: options.size,
    date: 1597667620,
    type: "machinecode",
    typePath: ["machinecode", "gcode"],
    hash: "9fc1a59b9b8cd59460e00682d48abbb8b5df6fce",
    refs: {
      resource: `http://localhost:9000/api/files/${options.target}/${options.fileName}`,
      download: `http://localhost:9000/api/downloads/${options.target}/${options.fileName}`,
    },
  };

  const printerConf = req.app.get("printerConf");
  printerConf.allFiles.files.push(newFile);
  res.status(201).json({
    files: {
      local: {
        name: newFile.name,
        origin: newFile.origin,
        refs: newFile.refs,
      },
    },
    done: true,
  });
});

/**
 * Retrieve a specific file’s or folder’s information.
 */
router.get("/:target/:filename(*)", async (req, res, next) => {
  const printerConf = req.app.get("printerConf");
  const target = req.params.target;
  const pathname = req.params.filename;

  const result = _getFiles(printerConf, target, pathname);

  if (result) {
    res.json(result);
  } else {
    res.status(404).json({ error: "Not found" });
  }
});

/**
 * Issue a file command to an existing file.
 */
router.post("/:target/:filename(*)", async (req, res, next) => {
  const printerConf = req.app.get("printerConf");
  const target = req.params.target;
  const pathname = req.params.filename;

  const result = _getFiles(printerConf, target, pathname);

  if (result) {
    const command = req.body.command;
    const print = req.body.print;

    if (command == "select") {
      printerConf.state.text = "Printing";
      printerConf.state.flags.printing = true;
      printerConf.state.flags.ready = false;
      printerConf.printing.file = result;
      printerConf.printing.selected = true;
      printerConf.printing.printing = print || false;
      printerConf.printing.estimatedPrintTime = new Date(
        new Date().getTime() + 2 * 60000
      ).getTime();
      printerConf.printing.completion = 0;
      printerConf.printing.printTime = 0;
      printerConf.printing.printTimeLeft = 2 * 60000;
    }
  } else {
    res.status(404).json({ error: "Not found" });
  }

  res.status(204).send();
});

/**
 * Delete a file or folder.
 */
router.delete("/:target/:filename(*)", async (req, res, next) => {
  const printerConf = req.app.get("printerConf");
  const target = req.params.target;
  const pathname = req.params.filename;

  const parent = _getFiles(printerConf, target, path.dirname(pathname));

  if (parent) {
    parent.children = parent.children.filter((node) => node.path != pathname);
  } else {
    res.status(404).json({ error: "Not found" });
  }

  res.status(204).send();
});

module.exports = router;

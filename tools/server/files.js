// This file is part of the Prusa Link Web
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

const express = require("express");
const router = new express.Router();
const multer = require("multer");
const upload = multer();
const errors = require("./mock/errors.js");

/**
 * Retrieve all files’ and folders’ information.
 */
router.get("/", async (req, res, next) => {
  const eTag = req.header("If-None-Match");
  const printer = req.app.get("printer");

  const result = printer.getAllFiles(eTag, req.query["recursive"]);
  if (result.files) {
    res.set("ETag", result.eTag).json(result.files);
  } else {
    res.status(304).send("Not Modified");
  }
});

/**
 * Retrieve all files’ and folders’ information for the target
 * location.
 */
router.get("/:target", async (req, res, next) => {
  const target = req.params.target;

  if (target != "sdcard" && target != "local") {
    new errors.FileNotFound().handleError(res);
    return;
  }

  const printer = req.app.get("printer");
  const allFiles = printer.getFiles(target, undefined, req.query["recursive"]);
  res.json(allFiles);
});

/**
 * Upload file or create folder.
 */
router.post("/:target", upload.any(), async (req, res, next) => {
  const target = req.params.target;

  if (target != "sdcard" && target != "local") {
    new errors.FileNotFound().handleError(res); // TODO: send origin not found?
    return;
  }

  const uploadFile = req.files[0];
  const options = {
    target,
    select: req.body.select === true || req.body.select === "true",
    print: req.body.print === true | req.body.print === "true",
    path: req.body.path,
    fileName: uploadFile.originalname,
    fileSize: uploadFile.size,
  };

  const printer = req.app.get("printer");
  const result = printer.uploadFile(options);
  if (result instanceof errors.ApiError) {
    result.handleError(res);
  } else {
    res.status(201).send(result);
  }
});

/**
 * Retrieve a specific file’s or folder’s information.
 */
router.get("/:target/:filename(*)", async (req, res, next) => {
  const printer = req.app.get("printer");
  const target = req.params.target;
  const pathname = req.params.filename;

  const result = printer.getFiles(target, pathname);
  if (result) {
    res.json(result);
  } else {
    new errors.FileNotFound().handleError(res);
  }
});

/**
 * Issue a file command to an existing file.
 */
router.post("/:target/:filename(*)", async (req, res, next) => {
  const printer = req.app.get("printer");
  const target = req.params.target;
  const pathname = req.params.filename;
  const command = req.body.command;
  const print = req.body.print || false;

  if (command != "select") {
    new errors.RemoteApiError().handleError(res);
    return;
  }

  const result = printer.selectFile(target, pathname, print);
  if (result instanceof errors.ApiError) {
    result.handleError(res);
  } else {
    res.sendStatus(204);
  }
});

/**
 * Delete a file or folder.
 */
router.delete("/:target/:filename(*)", async (req, res, next) => {
  const printer = req.app.get("printer");
  const target = req.params.target;
  const pathname = req.params.filename;

  const result = printer.removeFile(target, pathname);
  if (result instanceof errors.ApiError) {
    result.handleError(res);
  } else {
    res.sendStatus(204);
  }
});

module.exports = router;

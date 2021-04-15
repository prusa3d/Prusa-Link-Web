// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

// errors source: https://github.com/prusa3d/Prusa-Error-Codes

class ApiError {
  constructor() {
    this.status = 500;
    this.error = {
      code: "#10501",
      title: "UNEXPECTED ERROR",
      message:
        "An unexpected error has occurred :-(.\nIf the SL1 is printing, current job will be finished.\nYou can turn the printer off by pressing the front power button.\nSee the handbook to learn how to save a log file and send it to us.",
      url: "https://help.prusa3d.com/en/10501",
    };
  }

  handleError(res) {
    res.status(this.status).json(this.error);
  }
}

class Unauthorized extends ApiError {
  constructor() {
    super();
    this.status = 401;
    this.error = {
      code: "#10406",
      title: "UNAUTHORIZED",
      message:
        "The printer uses HTTP digest security. Please enable it also in the Slicer (recommended), or turn this security option off in the printer. You can find it in Settings > Network > Login credentials.",
      url: "https://help.prusa3d.com/en/10406",
    };
  }
}

class ApiKeyMissing extends ApiError {
  constructor() {
    super();
    this.status = 401;
    this.error = {
      code: "#10405",
      title: "INVALID API KEY",
      message:
        "Please turn on the HTTP digest (which is the recommended security option) or correct the API key. You can find it in Settings > Network > Login credentials.",
      url: "https://help.prusa3d.com/en/10405",
    };
  }
}

class FileNotFound extends ApiError {
  constructor() {
    super();
    this.status = 404;
    this.error = {
      code: "#10518",
      title: "FILE NOT FOUND",
      message: "Cannot find the selected file!",
      url: "https://help.prusa3d.com/en/10518",
    };
  }
}

class FileAlreadyExists extends ApiError {
  constructor() {
    super();
    this.status = 409;
    this.error = {
      code: "#10520",
      title: "FILE ALREADY EXISTS",
      message:
        "File already exists! Delete it in the printer first and try again.",
      url: "https://help.prusa3d.com/en/10520",
    };
  }
}

class NotMechanicallyCalibrated extends ApiError {
  constructor() {
    super();
    this.status = 409;
    this.error = {
      code: "#10113",
      title: "CALIBRATION ERROR",
      message: "The printer is not calibrated. Please run the Wizard first.",
      url: "https://help.prusa3d.com/en/10409",
    };
  }
}

class NotUvCalibrated extends ApiError {
  constructor() {
    super();
    this.status = 409;
    this.error = {
      code: "#10308",
      title: "PRINTER NOT UV CALIBRATED",
      message:
        "The printer is not UV calibrated. Connect the UV calibrator and complete the calibration.",
      url: "https://help.prusa3d.com/en/10308",
    };
  }
}

class InvalidProject extends ApiError {
  constructor() {
    super();
    this.status = 415;
    this.error = {
      code: "#10521",
      title: "INVALID PROJECT",
      message: "The project file is invalid!",
      url: "https://help.prusa3d.com/en/10521",
    };
  }
}

class NotAvailableInState extends ApiError {
  constructor() {
    super();
    this.status = 409;
    this.error = {
      code: "#10506",
      title: "PRINTER IS BUSY",
      message:
        "Cannot run this action, wait until the printer finishes the previous action.",
      url: "https://help.prusa3d.com/en/10506",
    };
  }
}

class NotEnoughInternalSpace extends ApiError {
  constructor() {
    super();
    this.status = 409;
    this.error = {
      code: "#10516",
      title: "INTERNAL MEMORY FULL",
      message: "Internal memory is full. Delete some of your projects first.",
      url: "https://help.prusa3d.com/en/10516",
    };
  }
}

class RemoteApiError extends ApiError {
  constructor() {
    super();
    this.status = 400;
    this.error = {
      code: "#10407",
      title: "REMOTE API ERROR",
      message:
        "This request is not compatible with Prusa remote API. See our documentation.",
      url: "https://help.prusa3d.com/en/10407",
    };
  }
}

module.exports = {
  ApiError,
  Unauthorized,
  ApiKeyMissing,
  FileNotFound,
  FileAlreadyExists,
  NotMechanicallyCalibrated,
  NotUvCalibrated,
  InvalidProject,
  NotAvailableInState,
  NotEnoughInternalSpace,
  RemoteApiError,
};

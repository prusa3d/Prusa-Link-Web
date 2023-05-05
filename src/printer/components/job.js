// This file is part of the Prusa Link Web
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import joinPaths from "../../helpers/join_paths";
import updateProperties from "./updateProperties";
import { cancelJob, cancelPreview, pauseJob, resumeJob, startJob } from "./jobActions";
import { deleteFile, downloadFile } from "./fileActions";
import { getImage, getJson } from "../../auth";
import { handleError } from "./errors";
import { renderProgressImg, updateProgressImg } from "./progressImage";
import { setEnabled, setHidden, setVisible, showLoading, hideLoading } from "../../helpers/element";
import { updateProgressBar } from "./progressBar";
import { translate } from "../../locale_provider";
import changeExposureTimesQuestion from "../sla/exposure";
import { resinRefill } from "../sla/refill";
import { JobPendingStates, LinkState, OperationalStates } from "../../state";
import { setButtonLoading, unsetButtonLoading } from "../../helpers/button";
import printer from "..";
import { context } from "../fdm";

let pendingCommand = null;
let pendingDownload = null;


/**
 * Rerender component without api calls.
 * @param {object} context Printer context.
 */
export function render(context) {
  const element = document.getElementById("job");
  if (!element) {
    console.error("Job element was not found!");
    return;
  }

  const visible = setComponentVisibility(context);
  if (visible)
    updateComponent(context);
}

/**
 * Updates component.
 * @param {object} context Printer context.
 */
export function update(context, isFilePreview = false) {
  const visible = setComponentVisibility(context, isFilePreview);

  if (pendingCommand && pendingCommand.state !== context.state) {
    pendingCommand = null;
  } 

  if (visible) {
    updateComponent(context, isFilePreview);
  }
};

function setComponentVisibility(context, isFilePreview) {
  const element = document.getElementById("job");
  if (!element)
    return false;

  const visible = isFilePreview
    ? !!context.files.selected 
    : !!context.job?.id;

  setVisible(element, visible);
  return visible;
}

function updateComponent(context, isFilePreview) {
  const dataSource = isFilePreview ? context.files.selected : context.job;
  const resource = dataSource?.file?.resource;
  const state = context.state;

  if (!!dataSource.file) {
    hideLoading();
  } else {
    showLoading();
  }

  if (process.env.PRINTER_TYPE === "sla") {
    setupRefill(state);
  }

  setupPreview(dataSource.thumbnail, dataSource.progress);
  setupProperties(isFilePreview);
  updateProperties("job", dataSource);

  if (!resource) {
    return;
  }

  if (dataSource.file) {
    const jobId = !isFilePreview ? dataSource.id : null;
    setupButtons(context.state, dataSource, jobId);
    updateProperties("file", dataSource.file);
    hideNaProperties(state, isFilePreview);
  }
}

function setupRefill(stateText) {
  const preview = document.getElementById("preview-wrapper")
  const refill = document.getElementById("refill-wrapper")
  if (stateText == "Feed me" || stateText == "Pour in resin") {
    if (stateText == "Pour in resin") {
      translate("msg.sla-pour-resin", { query: "#sla-refill-text" });
    }
    setHidden(preview);
    setVisible(refill);
  }
  else {
    setHidden(refill);
    setVisible(preview);
  }
}

function setupPreview(thumbnail, progress) {
  const progressBar = document.querySelector(".progress-bar");
  const progressPct = document.querySelector(".progress-pct");
  const preview = document.querySelector(".preview-img-wrapper");
  const isProgressVisible = progress !== undefined;

  renderProgressImg(preview, thumbnail, progress);
  updateProgressBar(progressBar, progress, "top");
  setVisible(progressBar, isProgressVisible);
  setVisible(progressPct, isProgressVisible);
}

function setupProperties(isPreview) {
  setHidden(document.querySelector("#job #pnt-time"), isPreview);
  setHidden(document.querySelector("#job #rem-time"), isPreview);
}

function hideNaProperties(state, isFilePreview) {
  const naValue = translate("prop.na");

  document.getElementById("job").querySelectorAll(".job-details .job-prop").forEach(section => {
    const group = section.querySelector(".job-prop-grid").children;
    let hidden = true;

    for (const prop of group) {
      var isNa = prop.querySelector("[data-type]")?.innerHTML.trim() === naValue;
      setHidden(prop, isNa);
      if (!isNa)
        hidden = false;
    }

    if (process.env.PRINTER_TYPE === "sla")
      setHidden(document.getElementById("pnt-time-est"), true)

    if (process.env.PRINTER_TYPE === "sla"
      && section.id === "file-last-mod"
      && !isFilePreview
      && ["Busy", "Printing"].includes(state.text)
    ) {
      hidden = true;
    }


    setHidden(section, hidden);
  })
}

/* ===================================== SETUP BUTTONS ======================================= */

function setupButtons(state, dataSource, jobId) {
  const file = dataSource.file;
  
  setupCancelButton(state, jobId);
  setupStartButton(state, file, jobId);
  setupDeleteButton(state, file, jobId);
  setupDownloadButton(state, file, jobId);

  if (!!jobId) {
    if (process.env.PRINTER_TYPE === "fdm") {
      setupPauseButton(state, jobId, "#job #pause");
      setupResumeButton(state, jobId);
    }

    if (process.env.PRINTER_TYPE === "sla") {
      const jobFile = jobResult?.job?.file;
      if (jobFile)
        setupExposureButton(state, jobFile, changeExposureTimesQuestion);
      setupPauseButton(state, jobId, "#job #refill");
      setupSlaResumeButton(state, "#job #continue");
      setupSlaResumeButton(state, "#job #back");
    }
  }
}

function setupCancelButton(state, jobId) {
  const btnStop = document.querySelector("#job #stop");
  const btnClose = document.querySelector("#job-close");
  const linkState = LinkState.fromApi(state);
  const isJobPreview = OperationalStates.includes(linkState);
  const enabled = !pendingCommand && JobPendingStates.includes(state)
  const context = printer.getContext();
  
  setEnabled(btnStop, enabled);

  if (btnStop) {
    if (jobId) {
      const isVisible = jobId || (process.env.PRINTER_TYPE === "sla" && state.text != "Feed me");
      setVisible(btnStop, isVisible);
      btnStop.onclick = () => {
        cancelJob(jobId, {
          onConfirm: () => {
            pendingCommand = {code: "stop", state: state};
            setEnabled(btnStop, false);
          },
          onError: () => pendingCommand = null
        });
      };
    }
  }

  if (btnClose) {
    setVisible(btnClose, isJobPreview || !jobId);
    btnClose.onclick = !jobId 
      ? () => context.selectFile(null)
      : cancelPreview;
  }
}

function setupStartButton(state, file, jobId) {
  const btn = document.querySelector("#job #start");
  const actionAllowed = OperationalStates.includes(state);

  if (btn) {
    setVisible(btn, actionAllowed)
    setEnabled(btn, actionAllowed);
    btn.onclick = () => startJob(state !== LinkState.READY, file.resource);
  }
}

function setupPauseButton(state, jobId, selector) {
  const btn = document.querySelector(selector);
  const isPrinting = state === LinkState.PRINTING;
  setVisible(btn, isPrinting);
  setEnabled(btn, !pendingCommand && isPrinting);

  if (btn) {
    btn.onclick = () => {
      setEnabled(btn, false);
      pendingCommand = {code: "pause", state: state};
      pauseJob(jobId)
        .catch(() => pendingCommand = null);
    };
  }
}

function setupResumeButton(state, jobId) {
  const btn = document.querySelector("#job #resume");
  const isPaused = state === LinkState.PAUSED;
  setVisible(btn, isPaused);
  setEnabled(btn, !pendingCommand && isPaused);

  if (btn) {
    btn.onclick = () => {
      setEnabled(btn, false);
      pendingCommand = {code: "resume", state: state};
      resumeJob(jobId)
        .catch(() => pendingCommand = null);
    }
  }
}

function setupSlaResumeButton(state, selector) {
  const btn = document.querySelector(selector);
  if (selector.includes("#back"))
    setVisible(btn, state.flags.paused && state.text === "Feed me");
  else
    setVisible(btn, state.flags.paused);


  if (btn) {
    if (state.text == "Feed me" && !selector.includes("#back")) {
      btn.onclick = resinRefill;
    } else {
      btn.onclick = resumeJob;
    }
  }
}

function setupDeleteButton(state, file, jobId) {
  const btn = document.querySelector("#job #delete");
  if (btn) {
    const fileDisplayName = file.display_name || file.name;
    setEnabled(btn, !file.readOnly && file.resource);
    setVisible(btn, !jobId || state === OperationalStates.includes(state));
    btn.onclick = () => {
      deleteFile(file.resource, fileDisplayName, () => {
        if (!jobId) {
          context.selectFile(null);
        }
      });
    }
  }
}

function setupDownloadButton(state, file, jobId) {
  const btn = document.querySelector("#job #download");
  if (btn) {
    const isVisible = !jobId && file.refs?.download && (
      !pendingDownload || pendingDownload === file.refs.download
    );
    
    const fileDisplayName = file.display_name || file.name;
    setVisible(btn, isVisible);
    if (isVisible) {
      btn.onclick = () => {
        pendingDownload = file.refs.download;
        setButtonLoading(btn);
        downloadFile(file.refs.download, fileDisplayName, () => {
          pendingDownload = null;
          unsetButtonLoading(btn)
        });
      }
    }
  }
}

function setupExposureButton(state, jobFile, changeExposureTimesQuestion) {
  const btn = document.querySelector("#job #exposure");
  if (btn) {
    setVisible(btn, state.text === "Pour in resin" || state.text === "Printing");
    setEnabled(btn, state.flags.operational);
    btn.onclick = () => changeExposureTimesQuestion(jobFile);
  }
}

function setupBackButton(state) {
  const btn = document.querySelector("#job #back");

  if (btn) {
    setVisible(btn, state.flags.paused && state.text === "Feed me");
    btn.onclick = resumeJob;
  }
}

export default { render, update, showLoading, hideLoading };

// This file is part of the Prusa Link Web
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import joinPaths from "../../helpers/join_paths";
import updateProperties from "./updateProperties";
import fallbackThumbnail from "../../assets/thumbnail.png";
import { cancelJob, cancelPreview, pauseJob, resumeJob, startJob } from "./jobActions";
import { deleteProject, downloadProject } from "./projectActions";
import { getImage, getJson } from "../../auth";
import { handleError } from "./errors";
import { renderProgressImg, updateProgressImg } from "./progressImage";
import { setEnabled, setHidden, setVisible } from "../../helpers/element";
import { setUpRefill } from "../sla/refill";
import { updateProgressBar } from "./progressBar";
import { translate } from "../../locale_provider";

let metadata = getDefaultMetadata();

function getDefaultMetadata() {
  return {
    /** Full path of the current selected (printing) file. */
    path: null,
    /** Last result of `api/job` when printer was printing.
     *
     *  If printer is paused, we don't have some informations, for example progress.
     */
    lastPrintingResult: null,
    /** Result of `api/file`. */
    file: {
      ready: false,
      data: null,
    },
    /** Result of `getImage(url)`. */
    thumbnail: {
      ready: false,
      url: null,
    },
  };
}

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
export function update(context) {
  const visible = setComponentVisibility(context);
  if (visible)
    updateJob(context);
};

function setComponentVisibility(context) {
  const element = document.getElementById("job");
  if (!element)
    return false;

  const visible = Boolean(
    context?.printer?.state?.flags?.printing || context?.current?.job?.file?.name
  );
  setVisible(element, visible);
  return visible;
}

function canEditMetadata(path) {
  return metadata.path === path;
}

function updateJob(context) {
  if (!context?.current?.job?.file) {
    console.error("No job file was provided!");
    return;
  }

  const jobFile = context.current.job.file;
  const path = joinPaths(jobFile.origin, jobFile.path);

  if (path !== metadata.path) {
    console.log(`File Path was changed\nold path: ${metadata.path}\nnew path: ${path}`)
    metadata = getDefaultMetadata();
    metadata.path = path;
    showLoading();
    reFetch(path);
  }

  metadata.lastPrintingResult = context.current.state === "Printing"
    ? context.current
    : metadata.lastPrintingResult;

  updateComponent(context);
}

function showLoading() {
  setVisible(document.querySelector("#job .loading-overlay"));
}

function hideLoading() {
  setHidden(document.querySelector("#job .loading-overlay"));
}

function reFetch(path) {
  console.log("Refetch");
  getJson(`/api/files/${path}`).then((result) => {
    if (!result?.data)
      console.error("No data from BE!");

    const data = result.data;
    if (canEditMetadata(path)) {
      metadata.file = {
        ready: true,
        data,
      };
    } else {
      console.warn("Can't edit metadata because path was changed");
    }

    if (!data.refs)
      console.warn("Missing refs for " + path);

    getThumbnailImgUrl(data.refs?.thumbnailBig).then(url => {
      console.log("Ref to thumbnail: " + data.refs?.thumbnailBig);
      console.log("URL to thumbnail img: " + url);
      if (canEditMetadata(path)) {
        metadata.thumbnail = {
          ready: true,
          url,
        };
      } else {
        console.warn("Can't edit metadata because path was changed");
      }
    });

  }).catch((result) => handleError(result)); // TODO: Consider better error handling
}

function updateComponent(context) {
  const jobResult = metadata.lastPrintingResult || context.current;
  if (!jobResult) {
    console.warn("No job result was provided!");
    return;
  }
  console.log("update component");

  const {
    file,
    thumbnail,
  } = metadata;

  const state = context.printer.state;
  setupProperties(state);
  updateProperties("job", jobResult);
  const progressIsVisible = state.flags.printing || state.flags.pausing || state.flags.paused;
  setHidden(document.querySelector("#job .preview-img"), progressIsVisible);
  setupProgress(progressIsVisible);

  if (file.ready)
    updateProperties("file", file.data);

  setupButtons(context, jobResult);

  if (thumbnail.ready) {
    hideLoading();
    setupThumbnail(thumbnail.url);
  }

  hideNaProperties();
}

async function getThumbnailImgUrl(url) {
  if (!url)
    return null;

  try {
    const imgUrl = await getImage(url);
    return imgUrl;
  } catch (e) {
    console.error("Error while getting image!");
    console.error(e);
    return null;
  }
}

function setupThumbnail(url) {
  const img = document.getElementById("preview-img");
  if (!img)
    console.error("Thumbnail element was not found!");
  if (img && (url || fallbackThumbnail)) {
    console.log("img src: " + (url || "fallback"));
    img.src = url || fallbackThumbnail;
  } else {
    console.error("url || fallbackThumbnail are both null!")
  }
}

function setupProgress(progressIsVisible) {
  const {
    thumbnail,
  } = metadata;

  const progressWithImg = document.querySelector(".progress-with-img");
  const progressWithoutImg = document.querySelector(".progress-without-img");

  if (!progressIsVisible) {
    setHidden(progressWithImg);
    setHidden(progressWithoutImg);
    return;
  }

  const previewImgWrapper = document.querySelector(".progress-img-wrapper");

  // Render (mount) progress image
  const haveThumbnail = Boolean(thumbnail.ready && thumbnail.url);
  if (haveThumbnail && thumbnail.url && !previewImgWrapper?.hasChildNodes()) {
    console.log("Render progress img");
    renderProgressImg(previewImgWrapper, thumbnail.url);
  }

  // Progress visibility
  setVisible(progressWithImg, haveThumbnail);
  setHidden(progressWithoutImg, haveThumbnail);

  // Update progress
  const completion = metadata.lastPrintingResult?.progress?.completion || 0;
  if (haveThumbnail) {
    updateProgressImg(previewImgWrapper, completion);
    updateProgressBar(progressWithImg, completion, "top");
  } else {
    updateProgressBar(progressWithoutImg, completion, "right");
  }
}

function setupProperties(state) {
  const isPreview = state.flags.ready && state.flags.operational;
  setHidden(document.querySelector("#job #pnt-time"), isPreview);
  setHidden(document.querySelector("#job #rem-time"), isPreview);
  const estEnd = document.querySelector("#job #est-end p[data-format]");
  if (estEnd) {
    estEnd.setAttribute("data-where",
      isPreview ? "gcodeAnalysis.estimatedPrintTime" : "progress.printTimeLeft");
    estEnd.setAttribute("data-type", isPreview ? "file" : "job");
  }
}

function hideNaProperties() {
  const naValue = translate("prop.na");

  document.getElementById("job").querySelectorAll(".job-details .job-prop").forEach(section => {
    const group = section.querySelector(".job-prop-grid").children;
    let hidden = true;

    for (const prop of group) {
      const isNa = prop.querySelector("[data-type]")?.innerHTML === naValue;
      setHidden(prop, isNa);
      if (!isNa)
        hidden = false;
    }

    setHidden(section, hidden);
  })
}

/* ===================================== SETUP BUTTONS ======================================= */

function setupButtons(context, jobResult) {
  const {
    file,
  } = metadata;
  const state = context.printer.state;
  const jobState = context.current.state;

  setupCancelButton(state);
  setupPauseButton(state);
  setupPausingButton(state);
  setupResumeButton(state);
  setupStartButton(state);

  if (file.ready) {
    setupDeleteButton(jobState, file.data);
    setupDownloadButton(jobState, file.data);
  }

  if (process.env.PRINTER_TYPE === "sla") {
    const changeExposureTimesQuestion = require("../sla/exposure");
    const jobFile = jobResult.job?.file;
    if (jobFile)
      setupExposureButton(state, jobFile, changeExposureTimesQuestion);
    setupRefillButton(jobState);
  }
}

function setupCancelButton(state) {
  const btn = document.querySelector("#job #cancel");
  const isPreview = state.flags.ready && state.flags.operational;

  if (btn)
    btn.onclick = isPreview ? cancelPreview : cancelJob;
}

function setupStartButton(state) {
  const btn = document.querySelector("#job #start");
  setVisible(btn, state.flags.ready && state.flags.operational)
  setEnabled(btn, state.flags.operational);

  if (btn && !btn.onclick)
    btn.onclick = () => startJob(!state.flags.checked);
}

function setupPauseButton(state) {
  const btn = document.querySelector("#job #pause");
  setVisible(btn, state.flags.printing);
  setEnabled(btn, state.flags.printing);

  if (btn && !btn.onclick)
    btn.onclick = pauseJob;
}

function setupPausingButton(state) {
  const btn = document.querySelector("#job #pausing");
  setVisible(btn, state.flags.pausing);
}

function setupResumeButton(state) {
  const btn = document.querySelector("#job #resume");
  setVisible(btn, state.flags.paused);
  setEnabled(btn, state.flags.paused);

  if (btn && !btn.onclick)
    btn.onclick = resumeJob;
}

function setupDeleteButton(jobState, file) {
  const btn = document.querySelector("#job #delete");
  setEnabled(btn, file.refs?.resource);
  setVisible(btn, jobState === "Operational");

  if (btn)
    btn.onclick = () => deleteProject(file);
}

function setupDownloadButton(jobState, file) {
  const btn = document.querySelector("#job #download");
  setEnabled(btn, file.refs?.download);
  setVisible(btn, jobState === "Operational");

  if (btn)
    btn.onclick = () => downloadProject(file);;
}

function setupExposureButton(state, jobFile, changeExposureTimesQuestion) {
  const btn = document.querySelector("#job #exposure");
  setEnabled(btn, state.flags.operational);

  if (btn)
    btn.onclick = () => changeExposureTimesQuestion(jobFile);
}

function setupRefillButton(jobState) {
  const btn = document.querySelector("#job #refill");
  setHidden(btn, jobState === "Operational");

  if (btn && !btn.onclick) {
    btn.onclick = setUpRefill;
  }
}

export default { render, update };

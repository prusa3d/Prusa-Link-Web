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

let metadata = getDefaultMetadata();
let filePreviewMetadata = getDefaultFilePreviewMetadata();
let fallbackThumbnailUrl = null;

function isLoading(state) {
  return ["Busy", "Cancelling"].includes(state)
}

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

function getDefaultFilePreviewMetadata() {
  return {
    file: null,
    thumbnail: {
      ready: false,
      url: null,
    },
  };
}

export function getPreviewFile() {
  return filePreviewMetadata.file;
}

export function selectFilePreview(filePreview) {
  if (!filePreview) {
    filePreviewMetadata = getDefaultFilePreviewMetadata();
    return;
  }

  filePreviewMetadata = getDefaultFilePreviewMetadata();
  filePreviewMetadata.file = filePreview;
  showLoading();
  getThumbnailImgUrl(filePreview.refs?.thumbnailBig, filePreview.date).then(url => {
    if (canEditFilePreviewMetadata(filePreview)) {
      filePreviewMetadata.thumbnail = {
        ready: true,
        url,
      };
    } else {
      console.warn("Can't edit file preview metadata because path was changed");
    }
  });
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
export function update(context, isFilePreview = false) {
  const visible = setComponentVisibility(context, isFilePreview);
  if (visible)
    updateJob(context, isFilePreview);
};

function setComponentVisibility(context, isFilePreview) {
  const element = document.getElementById("job");
  if (!element)
    return false;

  const visible = isFilePreview
    ? Boolean(filePreviewMetadata.file)
    : Boolean(context?.current?.job?.file?.name)

  setVisible(element, visible);
  return visible;
}

function canEditMetadata(path) {
  return metadata.path === path;
}

function canEditFilePreviewMetadata(file) {
  return filePreviewMetadata.file === file;
}

function updateJob(context, isFilePreview) {
  if (!isFilePreview) {
    if (!context?.current?.job?.file) {
      console.error("No job file was provided!");
      hideLoading();
      return;
    }

    const jobFile = context.current.job.file;
    const path = joinPaths(jobFile.origin, jobFile.path);
    let loading = isLoading(context.current.state);

    if (path && path !== metadata.path) {
      console.log(`File Path was changed\nold path: ${metadata.path}\nnew path: ${path}`)
      metadata = getDefaultMetadata();
      metadata.path = path;
      loading = true;
      reFetch(path);
    }

    if (loading) {
      showLoading();
    }

    metadata.lastPrintingResult = context.current.state === "Printing"
      ? context.current
      : metadata.lastPrintingResult;
  }

  updateComponent(context, isFilePreview);
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

    getThumbnailImgUrl(data.refs?.thumbnailBig, data.date).then(url => {
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

function updateComponent(context, isFilePreview) {
  const previewImgElm = document.querySelector("#job .preview-img");
  if (!fallbackThumbnailUrl)
    fallbackThumbnailUrl = document.querySelector("#job #preview-img")?.src;

  if (isFilePreview) {
    const {
      file,
      thumbnail,
    } = filePreviewMetadata;

    setupProperties(true);
    setVisible(previewImgElm);
    setupProgress(false);
    updateProperties("job", null);
    updateProperties("file", file);
    const nameElm = document.querySelector('#job [data-where="job.file.display"]');
    if (nameElm) {
      nameElm.innerHTML = file.display || file.name;
    }
    setupButtons(context, null, file, isFilePreview);

    const state = context.printer.state;
    hideNaProperties(state, isFilePreview);

    if (thumbnail.ready) {
      setupThumbnail(thumbnail.url);
      hideLoading();
    }

  } else if (!isFilePreview) { // job or remote preview
    const jobResult = metadata.lastPrintingResult || context.current;
    if (!jobResult) {
      console.warn("No job result was provided!");
      return;
    }

    const {
      file,
      thumbnail,
    } = metadata;

    const state = context.printer.state;

    if (process.env.PRINTER_TYPE === "sla") {
      setupRefill(state.text);
    }

    const isJobPreview = state.flags.ready && state.flags.operational;
    setupProperties(isJobPreview);

    updateProperties("job", jobResult);
    const progressIsVisible = state.flags.printing || state.flags.pausing || state.flags.paused;
    setHidden(previewImgElm, progressIsVisible);
    setupProgress(progressIsVisible);

    if (file.ready)
      updateProperties("file", file.data);

    setupButtons(context, jobResult, file, isFilePreview);

    if (thumbnail.ready) {
      setupThumbnail(thumbnail.url);
    }

    hideNaProperties(state, isFilePreview);

    if (thumbnail.ready && !isLoading(state.text)) {
      hideLoading();
    }
  }
}

async function getThumbnailImgUrl(url, timestamp) {
  if (!url)
    return null;

  try {
    const imgUrl = await getImage(url, timestamp);
    return imgUrl;
  } catch (e) {
    console.error("Error while getting image!");
    console.error(e);
    return null;
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

function setupThumbnail(url) {
  const img = document.getElementById("preview-img");
  if (!img) {
    console.error("Thumbnail element was not found!");
    return;
  }
  if (url || fallbackThumbnailUrl) {
    img.src = url || fallbackThumbnailUrl;
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

function setupProperties(isPreview) {
  setHidden(document.querySelector("#job #pnt-time"), isPreview);
  setHidden(document.querySelector("#job #rem-time"), isPreview);
  const estEnd = document.querySelector("#job #est-end p[data-format]");
  if (estEnd) {
    estEnd.setAttribute("data-where",
      isPreview ? "gcodeAnalysis.estimatedPrintTime" : "progress.printTimeLeft");
    estEnd.setAttribute("data-type", isPreview ? "file" : "job");
  }
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

function setupButtons(context, jobResult, file, isFilePreview) {
  const state = context.printer.state;
  const jobState = context.current.state;

  if (isFilePreview) {
    setupCancelButton(state, isFilePreview);

    if (file) {
      const fileUrl = joinPaths("api/files", file.origin, file.path);
      setupStartButton(state, fileUrl, isFilePreview);
      setupDeleteButton(jobState, file, isFilePreview);
      setupDownloadButton(jobState, file, isFilePreview);
    }
  } else { // job or remote preview
    setupCancelButton(state, isFilePreview);

    if (file.ready) {
      const fileUrl = joinPaths("api/files", file.data.origin, file.data.path);
      setupStartButton(state, fileUrl, isFilePreview);
      setupDeleteButton(jobState, file.data, isFilePreview);
      setupDownloadButton(jobState, file.data, isFilePreview);
    }

    if (process.env.PRINTER_TYPE === "fdm") {
      setupPauseButton(state, "#job #pause");
      setupPausingButton(state);
      setupResumeButton(state);
    }

    if (process.env.PRINTER_TYPE === "sla") {
      const jobFile = jobResult?.job?.file;
      if (jobFile)
        setupExposureButton(state, jobFile, changeExposureTimesQuestion);
      setupPauseButton(state, "#job #refill");
      setupSlaResumeButton(state, "#job #continue");
      setupSlaResumeButton(state, "#job #back");
    }
  }
}

function setupCancelButton(state, isFilePreview) {
  const btn = document.querySelector("#job #cancel");

  if (isFilePreview) {
    if (btn)
      btn.onclick = () => selectFilePreview(null);
  } else {
    const isJobPreview = state.flags.ready && state.flags.operational;

    if (process.env.PRINTER_TYPE === "sla")
      setVisible(btn, state.text != "Feed me");

    if (btn)
      btn.onclick = isJobPreview ? cancelPreview : cancelJob;
  }
}

function setupStartButton(state, fileUrl, isFilePreview) {
  const btn = document.querySelector("#job #start");
  const canPrint = state.flags.ready && state.flags.operational;
  setVisible(btn, isFilePreview || canPrint)
  setEnabled(btn, canPrint);

  if (btn)
    btn.onclick = () => startJob(!state.flags.checked, fileUrl);
}

function setupPauseButton(state, selector) {
  const btn = document.querySelector(selector);
  setVisible(btn, state.flags.printing && !state.flags.paused);
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


function setupDeleteButton(jobState, file, isFilePreview) {
  const btn = document.querySelector("#job #delete");
  setEnabled(btn, file.refs?.resource);
  setVisible(btn, isFilePreview || jobState === "Operational");

  if (btn)
    btn.onclick = () => deleteFile(file);
}

function setupDownloadButton(jobState, file, isFilePreview) {
  const btn = document.querySelector("#job #download");
  setEnabled(btn, file.refs?.download);
  setVisible(btn, isFilePreview || jobState === "Operational");

  if (btn)
    btn.onclick = () => downloadFile(file);
}

function setupExposureButton(state, jobFile, changeExposureTimesQuestion) {
  const btn = document.querySelector("#job #exposure");
  setVisible(btn, state.text === "Pour in resin" || state.text === "Printing");
  setEnabled(btn, state.flags.operational);

  if (btn)
    btn.onclick = () => changeExposureTimesQuestion(jobFile);
}

function setupBackButton(state) {
  const btn = document.querySelector("#job #back");
  setVisible(btn, state.flags.paused && state.text === "Feed me");

  if (btn)
    btn.onclick = resumeJob;
}

export default { render, update, showLoading, hideLoading };

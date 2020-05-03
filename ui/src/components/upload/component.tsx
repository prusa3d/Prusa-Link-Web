// This file is part of Prusa-Connect-Local
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h, Component, createRef } from "preact";
import { useTranslation } from "react-i18next";
import "./style.scss";

import { apiKey } from "../utils/network";
import Static from "./static";
import Dynamic from "./dynamic";
import Toast from "../toast";

export interface P extends apiKey {
  url?: string;
  path?: string;
  update?: () => void;
}

interface S {
  active: boolean;
  progress: { [index: string]: number };
}

interface NTF {
  ok: boolean;
  message: string;
}

class Upload extends Component<P, S> {
  ref = createRef();
  state = {
    active: false,
    progress: {}
  };

  handleDragEnter = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    this.setState(prev => ({ ...prev, active: true }));
  };

  handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    this.setState(prev => ({ ...prev, active: false }));
  };

  handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    this.setState(prev => ({ ...prev, active: true }));
  };

  handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    let dt = e.dataTransfer;
    let files = dt.files;
    this.setState(prev => ({ ...prev, active: false }));
    this.handleFiles(files);
  };

  onclickFile = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const fileInput = this.ref.current;
    if (e.isTrusted && fileInput) {
      fileInput.click();
    }
  };

  handleInput = (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
    // @ts-ignore
    const files = e.target.files;
    if (files) this.handleFiles(files);
  };

  handleFiles = files => {
    [...files].forEach(this.uploadFile);
  };

  notify = (status, file_name) => {
    const { t, i18n, ready } = useTranslation(null, { useSuspense: false });
    return new Promise<NTF>(function(resolve, reject) {
      if (ready) {
        let ok = false;
        let message = "";
        switch (status) {
          case 201:
            ok = true;
            message = t("ntf.upld-suc", { file_name });
            break;
          case 409:
            message = t("ntf.upld-exists", { file_name });
            break;
          case 415:
            message = t("ntf.upld-not-sup", { file_name });
            break;
          default:
            message = t("ntf.upld-unsuc", { file_name });
            break;
        }
        resolve({ ok, message });
      }
    }).then(result => {
      if (result.ok) {
        Toast.success(t("upld.title"), result.message);
      } else {
        Toast.error(t("upld.title"), result.message);
      }
    });
  };

  uploadFile = (file: File) => {
    let { url, path, update } = this.props;
    url = url ? url : "/api/files/local";
    path = path ? path : "";
    const index = url + path + file.name;

    const formData = new FormData();
    formData.append("path", path);
    formData.append("file", file);

    const request = new XMLHttpRequest();
    request.open("POST", url);
    request.setRequestHeader("X-Api-Key", this.props.getApikey());

    request.upload.onprogress = function(e: ProgressEvent) {
      that.setState(prev => {
        const progress = prev.progress;
        progress[index] = e.total ? e.loaded / e.total : 0;
        return { ...prev, progress: progress };
      });
    };

    const that = this;
    request.onloadstart = function(e: ProgressEvent) {
      that.setState(prev => {
        const progress = prev.progress;
        progress[index] = 0;
        return { ...prev, progress: progress };
      });
    };

    request.onloadend = (e: ProgressEvent) => {
      this.notify((e.target as XMLHttpRequest).status, file.name);
      that.setState(prev => {
        const progress = prev.progress;
        let n = Object.keys(progress).length;
        let total = 0;
        for (let path in progress) {
          total = total + progress[path];
        }
        if (total == n) {
          return { ...prev, progress: {} };
        }
        return { ...prev };
      });
      if (update) {
        update();
      }
    };

    request.send(formData);
  };

  render({}, { active, progress }) {
    const { t, i18n, ready } = useTranslation(null, { useSuspense: false });
    return (
      <div
        class="columns is-multiline is-mobile"
        onDrop={e => this.handleDrop(e)}
        onDragOver={e => this.handleDragOver(e)}
        onDragEnter={e => this.handleDragEnter(e)}
        onDragLeave={e => this.handleDragLeave(e)}
      >
        <div class="column is-full">
          <p class="txt-bold txt-grey txt-size-2 is-marginless prusa-line">
            {ready ? t("upld.title") : ""}
          </p>
        </div>
        <div class="column is-10 is-offset-1">
          {Object.keys(progress).length > 0 ? (
            <Dynamic progress={progress} />
          ) : (
            <Static active={active} onclickFile={this.onclickFile} />
          )}
        </div>
        <input
          ref={this.ref}
          style="display:none"
          type="file"
          multiple
          onInput={e => this.handleInput(e)}
          accept=".sl1"
        />
      </div>
    );
  }
}

export default Upload;

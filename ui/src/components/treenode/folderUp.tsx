// This file is part of Prusa-Connect-Local
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h, Fragment } from "preact";
import Upload from "../upload";

interface upload_info {
  url: string;
  path: string;
}
interface Props {
  onUpFolder(): void;
  upload_info?: upload_info;
}

const FolderUp: preact.FunctionalComponent<Props> = props => {
  return (
    <Fragment>
      <div class="column is-full-touch is-half-desktop">
        <Upload {...props.upload_info} />
      </div>
      <div
        class="column is-full tree-node-select"
        onClick={e => {
          e.preventDefault();
          props.onUpFolder();
        }}
      >
        <div class="media">
          <figure class="media-left image is-48x48 project-icon-desktop">
            <img src={require("../../assets/up_folder.svg")} />
          </figure>
          <div class="media-content">
            <p class="title is-size-3 is-size-6-desktop">Main</p>
          </div>
        </div>
      </div>
    </Fragment>
  );
};

export default FolderUp;

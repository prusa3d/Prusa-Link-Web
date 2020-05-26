// This file is part of Prusa-Connect-Local
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h } from "preact";

interface Props {
  display: string;
  onSelectFolder(): void;
}

const FolderNode: preact.FunctionalComponent<Props> = props => {
  return (
    <div
      class="column is-full tree-node-item"
      onClick={() => props.onSelectFolder()}
    >
      <div class="media">
        <figure class="media-left image is-48x48 project-icon-desktop">
          <img src={require("../../assets/projects_small.svg")} />
        </figure>
        <div class="media-content">
          <p class="txt-normal txt-size-2">{props.display}</p>
        </div>
      </div>
    </div>
  );
};

export default FolderNode;

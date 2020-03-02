// This file is part of Prusa-Connect-Web
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h, createRef } from "preact";
import { useEffect } from "preact/hooks";

import { ProjectProperties, FileProperties } from "./projectProperties";
import preview from "../../assets/thumbnail.png";

interface P extends FileProperties {
  display: string;
  onSelectFile(): void;
  preview_src: string;
}

const ProjectNode: preact.FunctionalComponent<P> = props => {
  const { display, onSelectFile, preview_src, ...properties } = props;
  const ref = createRef();

  useEffect(() => {
    const options = {
      headers: {
        "X-Api-Key": process.env.APIKEY,
        "Content-Type": "image/png"
      }
    };

    fetch(preview_src, options)
      .then(function(response) {
        if (!response.ok) {
          throw Error(response.statusText);
        }
        return response;
      })
      .then(res => res.blob())
      .then(blob => {
        ref.current.src = URL.createObjectURL(blob);
      })
      .catch(e => {});
  }, [props.preview_src]);

  return (
    <div
      class="column is-full tree-node-item"
      onClick={e => {
        e.preventDefault();
        onSelectFile();
      }}
    >
      <div class="media">
        <div class="media-left project-preview">
          <img ref={ref} src={preview} />
        </div>
        <div class="media-content">
          <div class="columns is-multiline is-mobile is-gapless">
            <div class="column is-full">
              <p class="title is-size-3 is-size-4-desktop">{display}</p>
            </div>
            <div class="column is-full">
              <ProjectProperties isVertical={false} {...properties} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectNode;

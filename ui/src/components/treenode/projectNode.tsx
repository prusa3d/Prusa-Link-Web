// This file is part of Prusa-Connect-Local
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h } from "preact";
import { useRef, useEffect } from "preact/hooks";

import { useTranslation } from "react-i18next";
import preview from "../../assets/thumbnail.png";

interface P {
  display: string;
  onSelectFile(): void;
  preview_src: string;
  not_found: string[];
  printing_time: string;
  material: string;
  layer_height: number;
}

const ProjectNode: preact.FunctionalComponent<P> = props => {
  const {
    display,
    onSelectFile,
    preview_src,
    not_found,
    printing_time,
    material,
    layer_height
  } = props;
  const ref = useRef(null);

  useEffect(() => {
    if (not_found.indexOf(preview_src) < 0) {
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
          if (ref.current) {
            ref.current.src = URL.createObjectURL(blob);
          }
        })
        .catch(e => {
          not_found.push(preview_src);
          if (ref.current) {
            ref.current.src = preview;
          }
        });
    } else {
      if (ref.current) {
        ref.current.src = preview;
      }
    }
  }, [preview_src]);

  const { t, i18n, ready } = useTranslation(null, { useSuspense: false });
  return (
    <div
      class="column is-full tree-node-item"
      onClick={e => {
        e.preventDefault();
        onSelectFile();
      }}
    >
      <div class="prusa-media">
        <div class="media-left project-preview">
          <img ref={ref} src={preview} />
        </div>
        <div class="media-content">
          <div class="columns is-multiline is-mobile">
            <div class="column is-full prusa-properties-title">
              <p class="prusa-break-word">{display}</p>
            </div>
            <div class="column is-full">
              {ready && (
                <div class="prusa-container">
                  {printing_time && (
                    <div class="prusa-properties">
                      <div class="icon">
                        <img src={require("../../assets/time_color.svg")} />
                      </div>
                      <div class="text">
                        <p>
                          {t("prop.pnt-time") + " "}
                          <span>{printing_time}</span>
                        </p>
                      </div>
                    </div>
                  )}
                  {material && (
                    <div class="prusa-properties">
                      <div class="icon">
                        <img
                          src={require("../../assets/status_filament.svg")}
                        />{" "}
                      </div>
                      <div class="text">
                        <p>
                          {t("prop.material") + " "}
                          <span>{material}</span>
                        </p>
                      </div>
                    </div>
                  )}
                  {layer_height && (
                    <div class="prusa-properties">
                      <div class="icon">
                        <img src={require("../../assets/quality_medium.svg")} />{" "}
                      </div>
                      <div class="text">
                        <p>
                          {t("prop.layer-ht") + " "}
                          <span>{layer_height} mm</span>
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectNode;

// This file is part of Prusa-Connect-Local
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h } from "preact";
import { useRef, useEffect } from "preact/hooks";

import { network } from "../utils/network";
import { useTranslation } from "react-i18next";
import preview from "../../assets/thumbnail.png";
import { formatTime } from "../utils/format";

interface P extends network {
  display: string;
  onSelectFile(): void;
  preview_src: string;
  not_found: string[];
  printing_time: number;
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
    layer_height,
    onFetch
  } = props;
  const ref = useRef(null);

  useEffect(() => {
    if (not_found.indexOf(preview_src) < 0) {
      onFetch({
        url: preview_src,
        then: response =>
          response.blob().then(blob => {
            if (ref.current) {
              ref.current.src = URL.createObjectURL(blob);
            }
          }),
        options: {
          headers: {
            "Content-Type": "image/png"
          }
        },
        except: e => {
          not_found.push(preview_src);
          if (ref.current) {
            ref.current.src = preview;
          }
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
            <div class="column is-full txt-normal txt-size-2">
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
                      <div class="text txt-size-2">
                        <p class="txt-normal txt-grey">
                          {t("prop.pnt-time") + " "}
                          <span class="txt-bold txt-white">
                            {formatTime(printing_time, t)}
                          </span>
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
                      <div class="text txt-size-2">
                        <p class="txt-normal txt-grey">
                          {t("prop.material") + " "}
                          <span class="txt-bold txt-white">{material}</span>
                        </p>
                      </div>
                    </div>
                  )}
                  {layer_height && (
                    <div class="prusa-properties">
                      <div class="icon">
                        <img src={require("../../assets/quality_medium.svg")} />{" "}
                      </div>
                      <div class="text txt-size-2">
                        <p class="txt-normal txt-grey">
                          {t("prop.layer-ht") + " "}
                          <span class="txt-bold txt-white">
                            {layer_height} mm
                          </span>
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

// This file is part of Prusa-Connect-Local
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h, Component, createRef, Fragment } from "preact";
import { useTranslation } from "react-i18next";

import preview from "../../assets/thumbnail.png";
import Title from "../../components/title";
import { ActionButton, NoButton, YesButton } from "../buttons";

export interface ProjectProps {
  onclick(e: Event, nextShow: number): void;
  onBack(e: Event): void;
  display: string;
  preview_src: string;
  not_found: string[];
  printing_time: string;
  material: string;
  layer_height: number;
}

interface S {}

class View extends Component<ProjectProps, S> {
  ref = createRef();

  onStartPrint = (e: Event) => {
    e.preventDefault();
    console.log("start print");
  };

  onCancel = (e: Event) => {
    e.preventDefault();

    const onBack = this.props.onBack;
    fetch("/api/job", {
      method: "POST",
      headers: {
        "X-Api-Key": process.env.APIKEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        command: "cancel"
      })
    }).then(function(response) {
      if (response.ok) {
        onBack(e);
      }
      return response;
    });
  };

  componentDidMount = () => {
    const ref = this.ref;
    const not_found = this.props.not_found;
    const preview_src = this.props.preview_src;

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
  };

  render() {
    const { t, i18n, ready } = useTranslation(null, { useSuspense: false });
    return (
      ready && (
        <Fragment>
          <Title title={t("proj.title")} />
          <div class="columns is-multiline is-mobile">
            <div class="column is-full">
              <p class="prusa-default-bold-text prusa-break-word">
                {this.props.display}
              </p>
            </div>
            <div class="column is-full">
              <div class="columns">
                <div class="column is-two-fifths">
                  <img ref={this.ref} src={preview} />
                </div>
              </div>
            </div>
            <div class="column is-full">
              <div class="prusa-button-wrapper">
                <ActionButton
                  icon="exp-times"
                  text={t("btn.chg-exp")}
                  onClick={e => this.props.onclick(e, 1)}
                  wrap
                />
                <YesButton
                  text={t("btn.start-pt")}
                  onClick={e => this.onStartPrint(e)}
                  wrap
                />
                <NoButton
                  text={t("btn.cancel-pt")}
                  onClick={e => this.onCancel(e)}
                  wrap
                />
              </div>
            </div>
          </div>
        </Fragment>
      )
    );
  }
}

export default View;

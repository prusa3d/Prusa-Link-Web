// This file is part of Prusa-Connect-Local
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h, Component, createRef, Fragment } from "preact";
import { useTranslation } from "react-i18next";

import { network } from "../utils/network";
import preview from "../../assets/thumbnail.png";
import Title from "../../components/title";
import { ActionButton, NoButton, YesButton, DelButton } from "../buttons";
import Properties from "./properties";
import Toast from "../toast";

export interface ProjectProps extends network {
  onclick(e: Event, nextShow: number): void;
  onBack(e: Event): void;
  display: string;
  preview_src: string;
  not_found: string[];
  printing_time: number;
  layer_height: number;
  title: string;
}

interface S {}

class View extends Component<ProjectProps, S> {
  ref = createRef();

  notify = () => {
    const { t, i18n, ready } = useTranslation(null, { useSuspense: false });
    return new Promise<string>(function(resolve, reject) {
      if (ready) {
        resolve(t("ntf.start-print"));
      }
    }).then(message => Toast.info(t("btn.start-pt"), message));
  };

  onStartPrint = (e: Event) => {
    this.props.onFetch({
      url: "/api/job",
      then: response => {
        this.props.onBack(e);
        this.notify();
      },
      options: {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          command: "start"
        })
      }
    });
  };

  onCancel = (e: Event) => {
    this.props.onFetch({
      url: "/api/job",
      then: response => this.props.onBack(e),
      options: {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          command: "cancel"
        })
      }
    });
  };

  componentDidMount = () => {
    const ref = this.ref;
    const not_found = this.props.not_found;
    const preview_src = this.props.preview_src;

    if (not_found.indexOf(preview_src) < 0) {
      this.props.onFetch({
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
  };

  render() {
    const { t, i18n, ready } = useTranslation(null, { useSuspense: false });
    return (
      ready && (
        <Fragment>
          <Title title={this.props.title} onFetch={this.props.onFetch} />
          <div class="columns is-multiline is-mobile">
            <div class="column is-full">
              <p class="txt-bold txt-size-2 prusa-break-word">
                {this.props.display}
              </p>
            </div>
            <div class="column is-two-fifths-widescreen is-full-desktop is-full-touch">
              <img class="proje-preview" ref={this.ref} src={preview} />
            </div>
            <div class="column">
              <Properties
                printing_time={this.props.printing_time}
                layer_height={this.props.layer_height}
                onFetch={this.props.onFetch}
              />
            </div>
            <div class="column is-full">
              <div class="columns is-multiline">
                <div class="column is-full-touch">
                  <DelButton
                    text={"delete"}
                    onClick={e => this.props.onclick(e, 2)}
                    className="prusa-flex-lr"
                  />
                </div>
                <div class="column column is-full-touch">
                  <div class="prusa-button-wrapper">
                    <ActionButton
                      icon="exp-times"
                      text={t("btn.chg-exp").toLowerCase()}
                      onClick={e => this.props.onclick(e, 1)}
                      wrap
                    />
                    <YesButton
                      text={t("btn.start-pt").toLowerCase()}
                      onClick={e => this.onStartPrint(e)}
                      wrap
                    />
                    <NoButton
                      text={t("btn.cancel-pt").toLowerCase()}
                      onClick={e => this.onCancel(e)}
                      wrap
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Fragment>
      )
    );
  }
}

export default View;

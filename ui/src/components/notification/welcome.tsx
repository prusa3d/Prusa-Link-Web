// This file is part of Prusa-Connect-Local
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h, Component } from "preact";
import { Translation } from "react-i18next";
const Logo = require("../../assets/prusa_connect_local_logo_black.svg");
import "./style.scss";
interface S {
  showWelcome: boolean;
}

class Welcome extends Component<{}, S> {
  constructor() {
    super();
    const cookieValue = document.cookie.replace(
      /(?:(?:^|.*;\s*)showWelcome\s*\=\s*([^;]*).*$)|^.*$/,
      "$1"
    );
    this.state = {
      showWelcome: cookieValue === "" ? true : false
    };
    setTimeout(this.onClose, 5500);
  }

  shouldComponentUpdate = () => this.state.showWelcome;

  onClose = () => {
    document.cookie = "showWelcome=false";
    this.setState(prev => ({ showWelcome: false }));
  };

  render({}, { showWelcome }) {
    return (
      // @ts-ignore
      <Translation useSuspense={false}>
        {(t, { i18n }, ready) =>
          ready && (
            <div
              class={showWelcome ? "modal is-active" : "modal"}
              onClick={e => this.onClose()}
            >
              <div class="modal-background"></div>
              <div class="modal-content">
                <div class="box has-background-grey-dark">
                  <div class="columns is-multiline">
                    <div class="column is-full">
                      <img src={Logo} class="well-logo" />
                      <button
                        class="delete delete-size is-pulled-right"
                        onClick={e => this.onClose()}
                      ></button>
                    </div>
                    <div class="column is-full has-text-centered">
                      <p
                        class="txt-normal txt-size-2"
                        style="padding-top: 20px;"
                      >
                        {" "}
                        {t("msg.modal-p1")}
                      </p>
                      <p class="txt-bold txt-size-2">{process.env.PRINTER}</p>
                    </div>
                    <div class="column is-three-fifths is-offset-one-fifth has-text-centered">
                      <p
                        class="txt-normal txt-size-2"
                        style="padding-top: 20px; padding-bottom: 20px;"
                      >
                        {t("msg.modal-p2")}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        }
      </Translation>
    );
  }
}

export default Welcome;

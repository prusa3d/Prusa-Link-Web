// This file is part of Prusa-Connect-Local
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h, Component } from "preact";
import { Translation } from "react-i18next";

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
            <div class={showWelcome ? "modal is-active" : "modal"}>
              <div class="modal-background"></div>
              <div class="modal-content">
                <div class="box has-background-grey-dark">
                  <button
                    class="delete is-pulled-right"
                    onClick={e => this.onClose()}
                  ></button>
                  <p class="subtitle is-size-3 is-size-6-desktop">
                    {t("msg.modal-p1")}{" "}
                    <span class="prusa-text-orange">
                      {" "}
                      {process.env.PRINTER}
                    </span>
                    .
                    <br />
                    {t("msg.modal-p2")}
                  </p>
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

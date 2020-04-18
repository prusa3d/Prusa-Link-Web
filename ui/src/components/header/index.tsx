// This file is part of Prusa-Connect-Local
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h, Component } from "preact";
import { Link } from "preact-router/match";
import { Translation } from "react-i18next";
import "./style.scss";

interface S {
  is_burger_active: boolean;
}

class Header extends Component<{}, S> {
  state = { is_burger_active: false };

  onClickBurger = () => {
    this.setState({ is_burger_active: !this.state.is_burger_active });
  };

  render(props, state) {
    let extra_burger_class = "";
    if (state.is_burger_active) {
      extra_burger_class = "is-active";
    }

    return (
      // @ts-ignore
      <Translation useSuspense={false}>
        {(t, { i18n }, ready) =>
          ready && (
            <nav
              class="navbar is-black"
              role="navigation"
              aria-label="main navigation"
            >
              <div class="navbar-brand">
                <a class="navbar-item navbar-logo" href="/"></a>
                <a
                  role="button"
                  class={"navbar-burger burger " + extra_burger_class}
                  aria-label="menu"
                  aria-expanded="false"
                  data-target="navbarBasicMenu"
                  onClick={this.onClickBurger}
                >
                  <span aria-hidden="true"></span>
                  <span aria-hidden="true"></span>
                  <span aria-hidden="true"></span>
                </a>
              </div>
              <div
                id="navbarBasicMenu"
                class={"navbar-menu " + extra_burger_class}
              >
                <div class="navbar-end">
                  <Link
                    class="navbar-item prusa-link-title"
                    activeClassName="active"
                    href="/"
                    onClick={this.onClickBurger}
                  >
                    {t("home.link")}
                  </Link>
                  {process.env.IS_SL1 && (
                    <Link
                      class="navbar-item prusa-link-title"
                      activeClassName="active"
                      href="/projects"
                      onClick={this.onClickBurger}
                    >
                      {t("proj.link")}
                    </Link>
                  )}
                  <Link
                    class="navbar-item prusa-link-title"
                    activeClassName="active"
                    href="/temperatures"
                    onClick={this.onClickBurger}
                  >
                    {t("temps.title")}
                  </Link>
                </div>
              </div>
            </nav>
          )
        }
      </Translation>
    );
  }
}

export default Header;

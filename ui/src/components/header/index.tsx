// This file is part of Prusa-Connect-Local
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h, Component } from "preact";
import { Link } from "preact-router/match";
import { Translation, useTranslation } from "react-i18next";
import "./style.scss";

interface S {
  is_burger_active: boolean;
}

class Locale extends Component<{}, { value: string }> {
  i18n;

  constructor() {
    super();
    const { t, i18n, ready } = useTranslation(null, { useSuspense: false });
    this.i18n = i18n;
    this.state = { value: i18n.language };
  }

  shouldComponentUpdate(nextProps, nextState) {
    if (nextState.value !== this.state.value) {
      return true;
    }
    return false;
  }

  onChange = e => {
    const lng = e.target.value;
    this.setState({ value: lng });
    this.i18n.changeLanguage(lng);
  };

  onSubmit = e => {
    alert("Submitted " + this.state.value);
    e.preventDefault();
  };

  render(_, { value }) {
    return (
      <div class="navbar-item">
        <form class="select" onSubmit={this.onSubmit}>
          <select value={value} onChange={this.onChange}>
            <option value="en">EN</option>
            <option value="cs">CS</option>
            <option value="de">DE</option>
            <option value="es">ES</option>
            <option value="fr">FR</option>
            <option value="it">IT</option>
            <option value="pl">PL</option>
          </select>
        </form>
      </div>
    );
  }
}

class Header extends Component<{}, S> {
  state = { is_burger_active: false };

  onClickBurger = () => {
    this.setState({ is_burger_active: !this.state.is_burger_active });
  };

  render(props, state) {
    let extra_burger_class = "";
    let extra_burger_class_icon = "";
    if (state.is_burger_active) {
      extra_burger_class = "is-active";
      extra_burger_class_icon = " open";
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
                <a class="navbar-item" href="/">
                  <img
                    src={require("../../assets/prusa_connect_local_logo_black.svg")}
                  />
                </a>
                <a
                  role="button"
                  class={"navbar-burger burger " + extra_burger_class}
                  aria-label="menu"
                  aria-expanded="false"
                  data-target="navbarBasicMenu"
                  onClick={this.onClickBurger}
                >
                  <div class={"icon-heard" + extra_burger_class_icon}></div>
                </a>
              </div>
              <div
                id="navbarBasicMenu"
                class={"navbar-menu " + extra_burger_class}
              >
                <div class="navbar-end">
                  <Link
                    class="navbar-item prusa-link txt-bold txt-size-2"
                    activeClassName="active"
                    href="/"
                    onClick={this.onClickBurger}
                  >
                    {t("home.link")}
                  </Link>
                  {process.env.IS_SL1 && (
                    <Link
                      class="navbar-item prusa-link txt-bold txt-size-2"
                      activeClassName="active"
                      href="/projects"
                      onClick={this.onClickBurger}
                    >
                      {t("proj.link")}
                    </Link>
                  )}
                  <Link
                    class="navbar-item prusa-link txt-bold txt-size-2"
                    activeClassName="active"
                    href="/temperatures"
                    onClick={this.onClickBurger}
                  >
                    {t("temps.title")}
                  </Link>
                  <Locale />
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

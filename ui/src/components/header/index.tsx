// This file is part of Prusa-Connect-Web
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h, Component } from "preact";
import { Link } from "preact-router/match";
// import { Text } from "preact-i18n";
import "./style.scss";

interface S {
  is_burger_active: boolean;
}

class Locale extends Component<{ changeLanguage: any }, { value: string }> {
  constructor() {
    super();
    var lang = window.localStorage.getItem("lang");
    if (lang == null) {
      lang = window.navigator.language.slice(0, 2);
    }
    if ("cs-de-es-fr-it-pl".indexOf(lang) > -1) {
      this.state = { value: lang };
    } else {
      this.state = { value: "en" };
    }
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
    this.props.changeLanguage(lng);
  };

  render(_, { value }) {
    return (
      <div class="navbar-item">
        <form class="select">
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

class Header extends Component<{ changeLanguage: any; Intl: object }, S> {
  constructor() {
    super();
    this.state = { is_burger_active: false };
    this.onClickBurger = this.onClickBurger.bind(this);
  }

  onClickBurger() {
    this.setState({ is_burger_active: !this.state.is_burger_active });
  }

  render(props, state) {
    let extra_burger_class = "";
    if (state.is_burger_active) {
      extra_burger_class = "is-active";
    }

    return (
      <nav
        class="navbar is-black prusa-menu"
        role="navigation"
        aria-label="main navigation"
      >
        <div class="navbar-brand">
          <a
            class="navbar-item navbar-logo"
            href="https://www.prusa3d.com/"
          ></a>
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
        <div id="navbarBasicMenu" class={"navbar-menu " + extra_burger_class}>
          <div class="navbar-end">
            <Link
              class="navbar-item prusa-menu-item is-size-2 is-size-6-desktop"
              activeClassName="active"
              href="/"
              onClick={this.onClickBurger}
            >
              {props.Intl["home"]["link"]}
            </Link>
            {process.env.PRINTER != "Original Prusa Mini" && (
              <Link
                class="navbar-item prusa-menu-item is-size-2 is-size-6-desktop"
                activeClassName="active"
                href="/projects"
                onClick={this.onClickBurger}
              >
                {props.Intl["projects"]["title"]}
              </Link>
            )}
            <Link
              class="navbar-item prusa-menu-item is-size-2 is-size-6-desktop"
              activeClassName="active"
              href="/temperatures"
              onClick={this.onClickBurger}
            >
              {props.Intl["temperature"]["title"]}
            </Link>
            <Locale changeLanguage={this.props.changeLanguage} />
          </div>
        </div>
      </nav>
    );
  }
}

export default Header;

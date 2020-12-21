// This file is part of Prusa-Connect-Web
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h, Component } from "preact";
import Container from "./container";

interface S {
  language: string;
}

class App extends Component<{}, S> {
  state = {
    language: "en"
  };
  languages = {
    cs: require("../i18n/cs.json"),
    de: require("../i18n/de.json"),
    en: require("../i18n/en.json"),
    es: require("../i18n/es.json"),
    fr: require("../i18n/fr.json"),
    it: require("../i18n/it.json"),
    pl: require("../i18n/pl.json")
  };

  componentDidMount() {
    var lang = window.localStorage.getItem("lang");
    if (lang == null) {
      lang = window.navigator.language.slice(0, 2);
    }
    if (lang !== "en" && "-cs-de-es-fr-it-pl".indexOf(lang) > -1) {
      this.changeLanguage(lang);
    }
  }

  changeLanguage = lang => {
    window.localStorage.setItem("lang", lang);
    this.setState({ language: lang });
  };

  render() {
    return (
      <Container
        definition={this.languages[this.state.language]}
        changeLanguage={this.changeLanguage}
      />
    );
  }
}

export default App;

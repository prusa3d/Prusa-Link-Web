// This file is part of Prusa-Connect-Web
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h, Component } from "preact";
import Container from "./container";
import defaultDefinition from "../i18n/en.json";

interface S {
  definition: any;
}

class App extends Component<{}, S> {
  state = {
    definition: defaultDefinition
  };

  // componentDidMount() {

  //     const lang = window.navigator.language.slice(0, 2);
  //     if (lang !== 'en' && "cs-de-es-fr-it-pl".indexOf(lang) > 0) {
  //         this.changeLanguage(lang);
  //     }

  // }

  changeLanguage = lang => {
    import(`../i18n/${lang}.json`).then(definition =>
      this.setState({ definition })
    );
  };

  render() {
    return <Container definition={this.state.definition} />;
  }
}

export default App;

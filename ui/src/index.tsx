// This file is part of Prusa-Connect-Local
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h, render } from "preact";

import i18n from "i18next";
import { initReactI18next, Translation } from "react-i18next";
import Backend from "i18next-xhr-backend";
import LanguageDetector from "i18next-browser-languagedetector";

import "./style/index.scss";
import App from "./components/app";

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: "en",
    nsSeparator: false,
    keySeparator: ".",
    debug: Boolean(process.env.DEVELOPMENT),
    interpolation: {
      escapeValue: false
    },
    backend: {
      loadPath: "/locales/{{lng}}/{{ns}}.json"
    },
    react: {
      useSuspense: false
    }
  });

function ExtendedComponent() {
  return (
    <Translation i18n={i18n}>
      {(t, { i18n }, ready) => ready && <App />}
    </Translation>
  );
}

render(<ExtendedComponent />, document.getElementById("root"));

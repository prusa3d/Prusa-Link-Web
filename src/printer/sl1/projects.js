// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { show, update as updateFiles } from "../components/projects";
import { navigate } from "../../router.js";

const load = () => {
  show();
};

const update = (context) => {
  if (context.printer.state.flags.printing) {
    navigate("#preview");
  } else {
    updateFiles();
  }
};

export default { load, update };

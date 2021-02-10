// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

const updateState = (data) => {
  let state = data.state.flags;
  if (state.operational) {
    if (state.ready) {
      console.log("idle");
    }
  } else if (state.paused) {
    console.log("paused");
  } else if (state.printing) {
    console.log("printing");
    if (state.cancelling) {
      console.log("cancelling");
    } else if (state.pausing) {
      console.log("pausing");
    }
  } else if (state.error) {
    console.log("error");
  } else if (state.closedOrError) {
    console.log("closedOrError");
  }

  if (state.sdReady) {
    // probable ignored
    console.log("sdReady");
  }
};

export default updateState;

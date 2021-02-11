// This file is part of the Prusa Connect Local
// Copyright (C) 2021 Prusa Research a.s. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

export function numberFormat(value) {
  if (value > 0) {
    return value.toFixed(1);
  } else {
    return 0;
  }
}

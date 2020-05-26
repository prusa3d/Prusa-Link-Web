// This file is part of Prusa-Connect-Local
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

export interface networkProps {
  url: string;
  then: (response: Response) => void;
  except?: (e: Error) => void;
  options?: { [key: string]: any };
}

export interface network {
  onFetch(param: networkProps): void;
}

export interface apiKey {
  getApikey(): string;
}

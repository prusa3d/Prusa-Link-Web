// This file is part of Prusa-Connect-Web
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h, Fragment, createRef } from 'preact';
import Title from "../../components/title"

interface P {

}

const GCode: preact.FunctionalComponent<P> = props => {

  const ref = createRef();

  const onSend = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const input = ref.current;

    if (input) {
      fetch("/api/g-code", {
        method: 'POST',
        headers: {
          "X-Api-Key": process.env.APIKEY,
        },
        body: JSON.stringify({
          "command": input.value
        })
      });
    }
  }

  return (
    <Fragment>
      <Title default_text="G-code" />
      <div class="field has-addons">
        <div class="control">
          <input ref={ref} class="input has-text-black" type="text" />
        </div>
        <div class="control">
          <a class="button is-info" onClick={e => onSend(e)}>
            Send
          </a>
        </div>
      </div>
    </Fragment>
  );
};

export default GCode;

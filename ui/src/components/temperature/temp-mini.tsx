// This file is part of Prusa-Connect-Local
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h } from "preact";
import { useTranslation } from "react-i18next";
import "./style.scss";

interface TempProps {
  temperatures: Array<Array<number>>;
}

interface P extends TempProps {
  bigSize?: boolean;
}

const Temperature: preact.FunctionalComponent<P> = props => {
  let temperatures = props.temperatures;
  let temp_lines = [];

  if (temperatures.length > 1) {
    const now = new Date().getTime();
    let xy = temperatures[0];
    let x = 500 - (2.66 * (now - xy[0])) / 1000;
    for (let i = 1; i < xy.length; i++) {
      temp_lines.push(`M${x},${(750 - 2 * xy[i]) / 3}`);
    }
    for (let i = 1; i < temperatures.length; i++) {
      xy = temperatures[i];
      x = 500 - (2.66 * (now - xy[0])) / 1000;
      for (let i = 0; i < temp_lines.length; i++) {
        temp_lines[i] = temp_lines[i] + `L${x},${(750 - 2 * xy[i + 1]) / 3}`;
      }
    }
  }
  const { t, i18n, ready } = useTranslation(null, { useSuspense: false });
  return ready ? (
    <div class="box has-background-black is-paddingless">
      {!props.bigSize && (
        <p
          class="prusa-line txt-bold txt-grey txt-size-2  is-marginless"
          style={{ padding: 0 }}
        >
          {t("temps.title")}
        </p>
      )}
      <svg
        width="550"
        height="300"
        role="img"
        viewBox="0 0 550 300"
        class="temp-svg"
      >
        <g>
          <rect
            vector-effect="non-scaling-stroke"
            role="presentation"
            shapeRendering="auto"
            x="355"
            y="280"
            width="170.85467128027682"
            height="20.75"
            style="fill: none;"
          ></rect>
          <path
            d="M 400, 285 m -6, 0 a 6, 6 0 1,0 12,0 a 6, 6 0 1,0 -12,0"
            role="presentation"
            shapeRendering="auto"
            class="temp-legend-led"
          ></path>
          <path
            d="M 473.9031141868512, 285 m -6, 0 a 6, 6 0 1,0 12,0 a 6, 6 0 1,0 -12,0"
            role="presentation"
            shapeRendering="auto"
            class="temp-legend-amb"
          ></path>
          <text
            direction="inherit"
            dx="0"
            dy="5.324999999999999"
            x="424.9515570934256"
            y="285"
            id="chart-legend-0-labels-1"
          >
            <tspan x="408" dx="0" text-anchor="start" class="temp-text">
              nozzle
            </tspan>
          </text>
          <text
            direction="inherit"
            dx="0"
            dy="5.324999999999999"
            x="481.9031141868512"
            y="285"
            id="chart-legend-0-labels-2"
          >
            <tspan
              x="481.9031141868512"
              dx="0"
              text-anchor="start"
              class="temp-text"
            >
              bed
            </tspan>
          </text>
        </g>
        <g clip-path="url(#victory-clip-2)" class="temp-g-label">
          <defs>
            <clipPath id="victory-clip-2">
              <rect
                vector-effect="non-scaling-stroke"
                x="50"
                y="50"
                width="450"
                height="200"
              ></rect>
            </clipPath>
          </defs>
          <path
            role="presentation"
            shapeRendering="auto"
            class="temp-line-led"
            d={temp_lines[1]}
          ></path>
        </g>
        <g clip-path="url(#victory-clip-3)" class="temp-g-label">
          <defs>
            <clipPath id="victory-clip-3">
              <rect
                vector-effect="non-scaling-stroke"
                x="50"
                y="50"
                width="450"
                height="200"
              ></rect>
            </clipPath>
          </defs>
          <path
            role="presentation"
            shapeRendering="auto"
            class="temp-line-amb"
            d={temp_lines[0]}
          ></path>
        </g>
        <g role="presentation">
          <line
            vector-effect="non-scaling-stroke"
            role="presentation"
            shapeRendering="auto"
            x1="50"
            x2="500"
            y1="250"
            y2="250"
            class="temp-label-line"
          ></line>
          <text
            direction="inherit"
            dx="0"
            dy="12.825"
            x="275"
            y="280"
            id="chart-axis-4-axisLabel-0"
          >
            <tspan x="275" dx="0" text-anchor="middle" class="temp-label-x">
              {t("temps.x")}
            </tspan>
          </text>
          <g role="presentation">
            <line
              vector-effect="non-scaling-stroke"
              role="presentation"
              shapeRendering="auto"
              x1="50"
              x2="50"
              y1="250"
              y2="255"
              class="temp-connect-text"
            ></line>
            <text
              direction="inherit"
              dx="0"
              dy="12.825"
              x="50"
              y="260"
              id="chart-axis-4-tickLabels-0"
            >
              <tspan x="50" dx="0" text-anchor="middle" class="temp-line-text">
                -180
              </tspan>
            </text>
          </g>
          <g role="presentation">
            <line
              vector-effect="non-scaling-stroke"
              role="presentation"
              shapeRendering="auto"
              x1="129.41176470588235"
              x2="129.41176470588235"
              y1="250"
              y2="255"
              class="temp-connect-text"
            ></line>
            <text
              direction="inherit"
              dx="0"
              dy="12.825"
              x="129.41176470588235"
              y="260"
              id="chart-axis-4-tickLabels-1"
            >
              <tspan
                x="129.41176470588235"
                dx="0"
                text-anchor="middle"
                class="temp-line-text"
              >
                -150
              </tspan>
            </text>
          </g>
          <g role="presentation">
            <line
              vector-effect="non-scaling-stroke"
              role="presentation"
              shapeRendering="auto"
              x1="208.8235294117647"
              x2="208.8235294117647"
              y1="250"
              y2="255"
              class="temp-connect-text"
            ></line>
            <text
              direction="inherit"
              dx="0"
              dy="12.825"
              x="208.8235294117647"
              y="260"
              id="chart-axis-4-tickLabels-2"
            >
              <tspan
                x="208.8235294117647"
                dx="0"
                text-anchor="middle"
                class="temp-line-text"
              >
                -120
              </tspan>
            </text>
          </g>
          <g role="presentation">
            <line
              vector-effect="non-scaling-stroke"
              role="presentation"
              shapeRendering="auto"
              x1="288.235294117647"
              x2="288.235294117647"
              y1="250"
              y2="255"
              class="temp-connect-text"
            ></line>
            <text
              direction="inherit"
              dx="0"
              dy="12.825"
              x="288.235294117647"
              y="260"
              id="chart-axis-4-tickLabels-3"
            >
              <tspan
                x="288.235294117647"
                dx="0"
                text-anchor="middle"
                class="temp-line-text"
              >
                -90
              </tspan>
            </text>
          </g>
          <g role="presentation">
            <line
              vector-effect="non-scaling-stroke"
              role="presentation"
              shapeRendering="auto"
              x1="367.6470588235294"
              x2="367.6470588235294"
              y1="250"
              y2="255"
              class="temp-connect-text"
            ></line>
            <text
              direction="inherit"
              dx="0"
              dy="12.825"
              x="367.6470588235294"
              y="260"
              id="chart-axis-4-tickLabels-4"
            >
              <tspan
                x="367.6470588235294"
                dx="0"
                text-anchor="middle"
                class="temp-line-text"
              >
                -60
              </tspan>
            </text>
          </g>
          <g role="presentation">
            <line
              vector-effect="non-scaling-stroke"
              role="presentation"
              shapeRendering="auto"
              x1="447.05882352941177"
              x2="447.05882352941177"
              y1="250"
              y2="255"
              class="temp-connect-text"
            ></line>
            <text
              direction="inherit"
              dx="0"
              dy="12.825"
              x="447.05882352941177"
              y="260"
              id="chart-axis-4-tickLabels-5"
            >
              <tspan
                x="447.05882352941177"
                dx="0"
                text-anchor="middle"
                class="temp-line-text"
              >
                -30
              </tspan>
            </text>
          </g>
          <g role="presentation">
            <line
              vector-effect="non-scaling-stroke"
              role="presentation"
              shapeRendering="auto"
              x1="500"
              x2="500"
              y1="250"
              y2="255"
              class="temp-connect-text"
            ></line>
            <text
              direction="inherit"
              dx="0"
              dy="12.825"
              x="500"
              y="260"
              id="chart-axis-4-tickLabels-6"
            >
              <tspan x="500" dx="0" text-anchor="middle" class="temp-line-text">
                -10
              </tspan>
            </text>
          </g>
        </g>
        <g role="presentation">
          <line
            vector-effect="non-scaling-stroke"
            role="presentation"
            shapeRendering="auto"
            x1="50"
            x2="50"
            y1="50"
            y2="250"
            class="temp-label-line"
          ></line>
          <text
            direction="inherit"
            dx="0"
            dy="-2.1750000000000003"
            x="15"
            y="150"
            transform="rotate(-90,15,150)"
            id="chart-axis-5-axisLabel-0"
          >
            <tspan x="15" dx="0" text-anchor="middle" class="temp-label-y">
              {t("temps.y")}
            </tspan>
          </text>
          <g role="presentation">
            <line
              vector-effect="non-scaling-stroke"
              role="presentation"
              shapeRendering="auto"
              x1="50"
              x2="500"
              y1="250"
              y2="250"
              class="temp-h-line"
            ></line>
            <line
              vector-effect="non-scaling-stroke"
              role="presentation"
              shapeRendering="auto"
              x1="50"
              x2="45"
              y1="250"
              y2="250"
              class="temp-connect-text"
            ></line>
            <text
              direction="inherit"
              dx="0"
              dy="5.324999999999999"
              x="40"
              y="250"
              id="chart-axis-5-tickLabels-0"
            >
              <tspan x="40" dx="0" text-anchor="end" class="temp-line-text">
                0
              </tspan>
            </text>
          </g>
          <g role="presentation">
            <line
              vector-effect="non-scaling-stroke"
              role="presentation"
              shapeRendering="auto"
              x1="50"
              x2="500"
              y1="200"
              y2="200"
              class="temp-h-line"
            ></line>
            <line
              vector-effect="non-scaling-stroke"
              role="presentation"
              shapeRendering="auto"
              x1="50"
              x2="45"
              y1="200"
              y2="200"
              class="temp-connect-text"
            ></line>
            <text
              direction="inherit"
              dx="0"
              dy="5.324999999999999"
              x="40"
              y="200"
              id="chart-axis-5-tickLabels-1"
            >
              <tspan x="40" dx="0" text-anchor="end" class="temp-line-text">
                75
              </tspan>
            </text>
          </g>
          <g role="presentation">
            <line
              vector-effect="non-scaling-stroke"
              role="presentation"
              shapeRendering="auto"
              x1="50"
              x2="500"
              y1="150"
              y2="150"
              class="temp-h-line"
            ></line>
            <line
              vector-effect="non-scaling-stroke"
              role="presentation"
              shapeRendering="auto"
              x1="50"
              x2="45"
              y1="150"
              y2="150"
              class="temp-connect-text"
            ></line>
            <text
              direction="inherit"
              dx="0"
              dy="5.324999999999999"
              x="40"
              y="150"
              id="chart-axis-5-tickLabels-2"
            >
              <tspan x="40" dx="0" text-anchor="end" class="temp-line-text">
                150
              </tspan>
            </text>
          </g>
          <g role="presentation">
            <line
              vector-effect="non-scaling-stroke"
              role="presentation"
              shapeRendering="auto"
              x1="50"
              x2="500"
              y1="100"
              y2="100"
              class="temp-h-line"
            ></line>
            <line
              vector-effect="non-scaling-stroke"
              role="presentation"
              shapeRendering="auto"
              x1="50"
              x2="45"
              y1="100"
              y2="100"
              class="temp-connect-text"
            ></line>
            <text
              direction="inherit"
              dx="0"
              dy="5.324999999999999"
              x="40"
              y="100"
              id="chart-axis-5-tickLabels-3"
            >
              <tspan x="40" dx="0" text-anchor="end" class="temp-line-text">
                225
              </tspan>
            </text>
          </g>
          <g role="presentation">
            <line
              vector-effect="non-scaling-stroke"
              role="presentation"
              shapeRendering="auto"
              x1="50"
              x2="500"
              y1="50"
              y2="50"
              class="temp-h-line"
            ></line>
            <line
              vector-effect="non-scaling-stroke"
              role="presentation"
              shapeRendering="auto"
              x1="50"
              x2="45"
              y1="50"
              y2="50"
              class="temp-connect-text"
            ></line>
            <text
              direction="inherit"
              dx="0"
              dy="5.324999999999999"
              x="40"
              y="50"
              id="chart-axis-5-tickLabels-4"
            >
              <tspan x="40" dx="0" text-anchor="end" class="temp-line-text">
                300
              </tspan>
            </text>
          </g>
        </g>
      </svg>
    </div>
  ) : (
    <div />
  );
};

export default Temperature;

// This file is part of Prusa-Connect-Web
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h } from 'preact';
import { Text, withText } from 'preact-i18n';
import "./style.scss";
export interface TempProps {
    temperatures: Array<Array<number>>;
}

interface P extends TempProps {
    bigSize: boolean;
}

export const Temperature: preact.FunctionalComponent<P> = withText({
    title: <Text id="temperature.title">temperatures</Text>,
    label_x: <Text id="temperature.label_x">Time (s)</Text>,
    label_y: <Text id="temperature.label_y">Temperature (°C)</Text>
})(props => {

    let temperatures = props.temperatures;
    let temp_cpu_d = "";
    let temp_led_d = "";
    let temp_amb_d = "";

    if (temperatures.length > 1) {

        const now = new Date().getTime();
        let xy = temperatures[0];
        let x = 500 - 2.66 * (now - xy[0]) / 1000;
        temp_cpu_d = `M${x},${250 - xy[1]}`;
        temp_led_d = `M${x},${250 - xy[2]}`;
        temp_amb_d = `M${x},${250 - xy[3]}`;

        for (let i = 1; i < temperatures.length; i++) {
            xy = temperatures[i];
            x = 500 - 2.66 * (now - xy[0]) / 1000;
            temp_cpu_d = temp_cpu_d + `L${x},${250 - xy[1]}`;
            temp_led_d = temp_led_d + `L${x},${250 - xy[2]}`;
            temp_amb_d = temp_amb_d + `L${x},${250 - xy[3]}`;
        }
    }

    return (
        <div class="box has-background-black is-paddingless">
            {
                !props.bigSize && <p class="prusa-line subtitle is-size-2 is-size-4-desktop has-text-grey is-marginless" style={{ padding: 0 }}>
                    {props.title}
                </p>
            }
            <svg width="550" height="300" role="img" viewBox="0 0 550 300" class="temp-svg">
                <g>
                    <rect vector-effect="non-scaling-stroke" role="presentation" shapeRendering="auto" x="355"
                        y="280" width="170.85467128027682" height="20.75" style="fill: none;"></rect>
                    <path d="M 360, 285 m -6, 0 a 6, 6 0 1,0 12,0 a 6, 6 0 1,0 -12,0" role="presentation"
                        shapeRendering="auto" class="temp-legend-led"></path>
                    <path d="M 416.9515570934256, 285 m -6, 0 a 6, 6 0 1,0 12,0 a 6, 6 0 1,0 -12,0"
                        role="presentation" shapeRendering="auto" class="temp-legend-amb"></path>
                    <path d="M 473.9031141868512, 285 m -6, 0 a 6, 6 0 1,0 12,0 a 6, 6 0 1,0 -12,0"
                        role="presentation" shapeRendering="auto" class="temp-legend-cpu"></path>
                    <text direction="inherit" dx="0" dy="5.324999999999999" x="368" y="285"
                        id="chart-legend-0-labels-0">
                        <tspan x="368" dx="0" text-anchor="start" class="temp-text">
                            led
                            </tspan>
                    </text>
                    <text direction="inherit" dx="0" dy="5.324999999999999" x="424.9515570934256" y="285"
                        id="chart-legend-0-labels-1">
                        <tspan x="424.9515570934256" dx="0" text-anchor="start" class="temp-text">
                            amb
                                </tspan>
                    </text>
                    <text direction="inherit" dx="0" dy="5.324999999999999" x="481.9031141868512" y="285"
                        id="chart-legend-0-labels-2">
                        <tspan x="481.9031141868512" dx="0" text-anchor="start" class="temp-text">
                            cpu
                                </tspan>
                    </text>
                </g>
                <g clip-path="url(#victory-clip-38)" class="temp-g-label">
                    <defs>
                        <clipPath id="victory-clip-38">
                            <rect vector-effect="non-scaling-stroke" x="50" y="50" width="450" height="200">
                            </rect>
                        </clipPath>
                    </defs>
                    <path class="temp-line-led"
                        d={temp_led_d}
                        role="presentation" shapeRendering="auto">
                    </path>
                </g>
                <g clip-path="url(#victory-clip-39)" class="temp-g-label">
                    <defs>
                        <clipPath id="victory-clip-39">
                            <rect vector-effect="non-scaling-stroke" x="50" y="50" width="450" height="200">
                            </rect>
                        </clipPath>
                    </defs>
                    <path class="temp-line-amb"
                        d={temp_amb_d}
                        role="presentation" shapeRendering="auto">
                    </path>
                </g>
                <g clip-path="url(#victory-clip-40)" class="temp-g-label">
                    <defs>
                        <clipPath id="victory-clip-40">
                            <rect vector-effect="non-scaling-stroke" x="50" y="50" width="450" height="200">
                            </rect>
                        </clipPath>
                    </defs>
                    <path class="temp-line-cpu"
                        d={temp_cpu_d}
                        role="presentation" shapeRendering="auto">
                    </path>
                </g>
                <g role="presentation">
                    <line vector-effect="non-scaling-stroke" role="presentation" shapeRendering="auto" x1="50"
                        x2="500" y1="250" y2="250" class="temp-label-line">
                    </line><text direction="inherit" dx="0" dy="12.825" x="275" y="280"
                        id="chart-axis-4-axisLabel-0">
                        <tspan x="275" dx="0" text-anchor="middle" class="temp-label-x">
                            {props.label_x}</tspan>
                    </text>
                    <g role="presentation">
                        <line vector-effect="non-scaling-stroke" role="presentation" shapeRendering="auto"
                            x1="50" x2="50" y1="250" y2="255" class="temp-connect-text">
                        </line><text direction="inherit" dx="0" dy="12.825" x="50" y="260"
                            id="chart-axis-4-tickLabels-0">
                            <tspan x="50" dx="0" text-anchor="middle" class="temp-line-text">
                                -180</tspan>
                        </text>
                    </g>
                    <g role="presentation">
                        <line vector-effect="non-scaling-stroke" role="presentation" shapeRendering="auto"
                            x1="125.00250008333612" x2="125.00250008333612" y1="250" y2="255" class="temp-connect-text">
                        </line><text direction="inherit" dx="0" dy="12.825" x="125.00250008333612" y="260"
                            id="chart-axis-4-tickLabels-1">
                            <tspan x="125.00250008333612" dx="0" text-anchor="middle" class="temp-line-text">
                                -150</tspan>
                        </text>
                    </g>
                    <g role="presentation">
                        <line vector-effect="non-scaling-stroke" role="presentation" shapeRendering="auto"
                            x1="200.00500016667223" x2="200.00500016667223" y1="250" y2="255" class="temp-connect-text">
                        </line><text direction="inherit" dx="0" dy="12.825" x="200.00500016667223" y="260"
                            id="chart-axis-4-tickLabels-2">
                            <tspan x="200.00500016667223" dx="0" text-anchor="middle" class="temp-line-text">
                                -120</tspan>
                        </text>
                    </g>
                    <g role="presentation">
                        <line vector-effect="non-scaling-stroke" role="presentation" shapeRendering="auto"
                            x1="275.0075002500083" x2="275.0075002500083" y1="250" y2="255" class="temp-connect-text">
                        </line><text direction="inherit" dx="0" dy="12.825" x="275.0075002500083" y="260"
                            id="chart-axis-4-tickLabels-3">
                            <tspan x="275.0075002500083" dx="0" text-anchor="middle" class="temp-line-text">
                                -90</tspan>
                        </text>
                    </g>
                    <g role="presentation">
                        <line vector-effect="non-scaling-stroke" role="presentation" shapeRendering="auto"
                            x1="350.01000033334446" x2="350.01000033334446" y1="250" y2="255" class="temp-connect-text">
                        </line><text direction="inherit" dx="0" dy="12.825" x="350.01000033334446" y="260"
                            id="chart-axis-4-tickLabels-4">
                            <tspan x="350.01000033334446" dx="0" text-anchor="middle" class="temp-line-text">
                                -60</tspan>
                        </text>
                    </g>
                    <g role="presentation">
                        <line vector-effect="non-scaling-stroke" role="presentation" shapeRendering="auto"
                            x1="425.01250041668055" x2="425.01250041668055" y1="250" y2="255" class="temp-connect-text">
                        </line><text direction="inherit" dx="0" dy="12.825" x="425.01250041668055" y="260"
                            id="chart-axis-4-tickLabels-5">
                            <tspan x="425.01250041668055" dx="0" text-anchor="middle" class="temp-line-text">
                                -30</tspan>
                        </text>
                    </g>
                    <g role="presentation">
                        <line vector-effect="non-scaling-stroke" role="presentation" shapeRendering="auto"
                            x1="475.01416713890467" x2="475.01416713890467" y1="250" y2="255" class="temp-connect-text">
                        </line><text direction="inherit" dx="0" dy="12.825" x="475.01416713890467" y="260"
                            id="chart-axis-4-tickLabels-6">
                            <tspan x="475.01416713890467" dx="0" text-anchor="middle" class="temp-line-text">
                                -10</tspan>
                        </text>
                    </g>
                </g>
                <g role="presentation">
                    <line vector-effect="non-scaling-stroke" role="presentation" shapeRendering="auto" x1="50"
                        x2="50" y1="50" y2="250" class="temp-label-line">
                    </line><text direction="inherit" dx="0" dy="-2.1750000000000003" x="15" y="150"
                        transform="rotate(-90,15,150)" id="chart-axis-5-axisLabel-0">
                        <tspan x="15" dx="0" text-anchor="middle" class="temp-label-y" >
                            {props.label_y}</tspan>
                    </text>
                    <g role="presentation">
                        <line vector-effect="non-scaling-stroke" role="presentation" shapeRendering="auto"
                            x1="50" x2="500" y1="250" y2="250" class="temp-h-line">
                        </line>
                        <line vector-effect="non-scaling-stroke" role="presentation" shapeRendering="auto"
                            x1="50" x2="45" y1="250" y2="250" class="temp-connect-text">
                        </line><text direction="inherit" dx="0" dy="5.324999999999999" x="40" y="250"
                            id="chart-axis-5-tickLabels-0">
                            <tspan x="40" dx="0" text-anchor="end" class="temp-line-text">
                                0</tspan>
                        </text>
                    </g>
                    <g role="presentation">
                        <line vector-effect="non-scaling-stroke" role="presentation" shapeRendering="auto"
                            x1="50" x2="500" y1="200" y2="200" class="temp-h-line">
                        </line>
                        <line vector-effect="non-scaling-stroke" role="presentation" shapeRendering="auto"
                            x1="50" x2="45" y1="200" y2="200" class="temp-connect-text">
                        </line><text direction="inherit" dx="0" dy="5.324999999999999" x="40" y="200"
                            id="chart-axis-5-tickLabels-1">
                            <tspan x="40" dx="0" text-anchor="end" class="temp-line-text">
                                50</tspan>
                        </text>
                    </g>
                    <g role="presentation">
                        <line vector-effect="non-scaling-stroke" role="presentation" shapeRendering="auto"
                            x1="50" x2="500" y1="150" y2="150" class="temp-h-line">
                        </line>
                        <line vector-effect="non-scaling-stroke" role="presentation" shapeRendering="auto"
                            x1="50" x2="45" y1="150" y2="150" class="temp-connect-text">
                        </line><text direction="inherit" dx="0" dy="5.324999999999999" x="40" y="150"
                            id="chart-axis-5-tickLabels-2">
                            <tspan x="40" dx="0" text-anchor="end" class="temp-line-text">
                                100</tspan>
                        </text>
                    </g>
                    <g role="presentation">
                        <line vector-effect="non-scaling-stroke" role="presentation" shapeRendering="auto"
                            x1="50" x2="500" y1="100" y2="100" class="temp-h-line">
                        </line>
                        <line vector-effect="non-scaling-stroke" role="presentation" shapeRendering="auto"
                            x1="50" x2="45" y1="100" y2="100" class="temp-connect-text">
                        </line><text direction="inherit" dx="0" dy="5.324999999999999" x="40" y="100"
                            id="chart-axis-5-tickLabels-3">
                            <tspan x="40" dx="0" text-anchor="end" class="temp-line-text">
                                150</tspan>
                        </text>
                    </g>
                    <g role="presentation">
                        <line vector-effect="non-scaling-stroke" role="presentation" shapeRendering="auto"
                            x1="50" x2="500" y1="50" y2="50" class="temp-h-line">
                        </line>
                        <line vector-effect="non-scaling-stroke" role="presentation" shapeRendering="auto"
                            x1="50" x2="45" y1="50" y2="50" class="temp-connect-text">
                        </line><text direction="inherit" dx="0" dy="5.324999999999999" x="40" y="50"
                            id="chart-axis-5-tickLabels-4">
                            <tspan x="40" dx="0" text-anchor="end" class="temp-line-text">
                                200</tspan>
                        </text>
                    </g>
                </g>
            </svg>
        </div>
    );
});


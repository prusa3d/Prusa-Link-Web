import { h } from 'preact';
import { VictoryChart, VictoryLine, VictoryTheme, VictoryAxis, VictoryLegend } from 'victory'

interface temperaturesPoint {
    x: number;
    y: number;
}

interface temperaturesWrapper {
    temp_led: temperaturesPoint[];
    temp_amb: temperaturesPoint[];
    temp_cpu: temperaturesPoint[];
}

export interface TempProps {
    temperatures: temperaturesWrapper;
}

interface P extends TempProps {
    bigSize: boolean;
}

export const Temperature: preact.FunctionalComponent<P> = props => {

    const now = new Date().getTime();
    const updateNow = (arr, value) => {
        arr.push({ x: (value.x - now) / 1000, y: value.y });
        return arr;
    };

    const temp_led = props.temperatures.temp_led.reduce(updateNow, []);
    const temp_amb = props.temperatures.temp_amb.reduce(updateNow, []);
    const temp_cpu = props.temperatures.temp_cpu.reduce(updateNow, []);


    return (
        <div class="box has-background-black is-paddingless">
            {
                !props.bigSize && <p class="prusa-line subtitle is-4 has-text-grey is-marginless" style={{ padding: 0 }}>
                    temperatures
                </p>
            }
            <div class="is-paddingless" style={{ display: "flex", flexWrap: "wrap" }}>
                <VictoryChart
                    theme={VictoryTheme.material}
                    style={{ parent: { maxWidth: "100%" } }}
                    height={props.bigSize ? 400 : 300}
                    width={props.bigSize ? 1000 : 550}
                >
                    <VictoryLegend x={props.bigSize ? 805 : 355} y={props.bigSize ? 380 : 280}
                        orientation="horizontal"
                        symbolSpacer={5}
                        gutter={20}
                        data={[
                            { name: "led", symbol: { fill: "#f8651b" }, labels: { fill: "white", fontSize: 15 } },
                            { name: "amb", symbol: { fill: "#1b73f8" }, labels: { fill: "white", fontSize: 15 } },
                            { name: "cpu", symbol: { fill: "#f3f12c" }, labels: { fill: "white", fontSize: 15 } }
                        ]}
                    />
                    <VictoryLine // led
                        style={{
                            data: { stroke: "#f8651b", strokeWidth: "1%" },
                            labels: { fill: "#f8651b" },
                        }}
                        data={temp_led}
                    />
                    <VictoryLine // amb
                        style={{
                            data: { stroke: "#1b73f8", strokeWidth: "1%" },
                            labels: { fill: "#1b73f8" },
                        }}
                        data={temp_amb}
                    />
                    <VictoryLine // cpu
                        style={{
                            data: { stroke: "#f3f12c", strokeWidth: "1%" },
                            labels: { fill: "#f3f12c" },
                        }}
                        data={temp_cpu}
                    />
                    <VictoryAxis
                        label="Time (s)"
                        style={{
                            axis: { stroke: "white" },
                            axisLabel: { fontSize: 15, padding: 30, fill: "white" },
                            ticks: { stroke: "white", size: 5, },
                            grid: { stroke: "none" },
                            tickLabels: { fontSize: 15, padding: 5, fill: "white" }
                        }}
                        tickValues={[-180, -150, -120, -90, -60, -30, -10]}
                    />
                    <VictoryAxis
                        dependentAxis
                        label="Temperature (°C)"
                        style={{
                            axis: { stroke: "white" },
                            axisLabel: { fontSize: 15, padding: 35, fill: "white" },
                            grid: { stroke: "gray", strokeDasharray: "none" },
                            ticks: { stroke: "white", size: 5, },
                            tickLabels: { fontSize: 15, padding: 5, fill: "white" }

                        }}
                        orientation="left"
                        tickValues={[0, 50, 100, 150, 200]}
                    />
                </VictoryChart>
            </div>
        </div>
    );
}


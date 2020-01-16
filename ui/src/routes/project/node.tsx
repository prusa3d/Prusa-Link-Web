import { h } from "preact";
import * as style from "./style.scss";

interface Props {
    user: string;
}

const ProjectNode: preact.FunctionalComponent<Props> = props => {

    return (
        <div>
            <div class="columns">
                <div class="column is-10 is-offset-1">
                    <div class="media">
                        <img class="media-left" src={require("../../assets/status_nozzle.svg")} width="40" />
                        <div class="media-content">
                            <p class="title is-5 is-spaced is-marginless">
                                Buddy_PLA_1h_30m.gcode
                        </p>
                            <div class="columns">
                                <div class="column has-text-grey">
                                    <img src={require("../../assets/time_color.svg")} width="15" /> printing time <span class="has-text-white has-text-weight-bold">1h 30m</span>
                                </div>
                                <div class="column has-text-grey">
                                    <img src={require("../../assets/status_filament.svg")} width="15" /> material <span class="has-text-white has-text-weight-bold">PLA</span>
                                </div>
                                <div class="column has-text-grey">
                                    <img src={require("../../assets/quality_medium.svg")} width="15" /> leyer height <span class="has-text-white has-text-weight-bold">1h 30m</span>
                                </div>
                            </div>
                        </div>
                        <div class="media-right">
                            <button class="button project-button">PRINT</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

}


export default ProjectNode;



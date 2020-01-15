import { h, Fragment, Component } from "preact";
import under_construction from "../../assets/under_construction.gif"
import "./style.scss";

interface P {
    user: string;
}

interface S {
    parent_path: string;
    current_path: string;
    root_path: string;
}

class Project extends Component<P, S> {

    container: any = null;
    constructor() {
        super();
        this.state = {
            parent_path: null,
            current_path: null,
            root_path: null
        };
    }

    // componentDidMount() {

    // }

    render() {
        return (
            <Fragment>
                <div class="box has-background-black is-paddingless">
                    <p class="title is-5 prusa-text-orange prusa-line">
                        Under construction <span class="subtitle is-6 has-text-grey">project files</span>
                    </p>
                </div>
                <div class="columns">
                    <div class="column is-4 is-offset-4">
                        <img src={under_construction}/>
                    </div>
                </div>
            </Fragment>
        );
    }
}



export default Project;

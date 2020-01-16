import { h, Component } from "preact";
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
        return (<div>Under construction</div>);
    }
}



export default Project;

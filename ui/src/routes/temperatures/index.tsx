import { h, Fragment } from "preact";
import { TempProps, Temperature } from "../../components/temperature";

const Temperatures: preact.FunctionalComponent<TempProps> = props => {
    return (
        <Fragment>
            <div class="box has-background-black is-paddingless">
                <p class="title is-5 prusa-text-orange prusa-line">
                    {process.env.PRINTER} <span class="subtitle is-6 has-text-grey">printer temperatures</span>
                </p>
            </div>

            <div class="columns">
                <div class="is-8 is-offset-2">
                    <Temperature temperatures={props.temperatures} bigSize={true} />
                </div>
            </div>
        </Fragment>
    );
}



export default Temperatures;

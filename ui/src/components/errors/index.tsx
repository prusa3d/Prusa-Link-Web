import { h, Fragment } from "preact";

export const Error401: preact.FunctionalComponent<{}> = () => {
  return (
    <Fragment>
      <div class="box has-background-black is-paddingless prusa-line">
        <div class="columns is-multiline is-centered">
          <div class="column is-full txt-normal txt-size-1 txt-grey prusa-break-word">
            Login failed
          </div>
        </div>
      </div>
      <div class="columns is-multiline is-mobile is-vcentered">
        <div class="column is-full">
          <p class="txt-normal txt-size-2">
            The printer uses HTTP digest security.
          </p>
          <p class="txt-normal txt-size-2" style="margin-top: 80px">
            Please fill in the correct credentials.
            <br />
            You can find it in Settings &gt; Network &gt; Login credentials.
          </p>
        </div>
      </div>
    </Fragment>
  );
};

import { h, Component } from "preact";
import { useTranslation } from "react-i18next";

import { YesButton, NoButton } from "../buttons";

interface P {
  onYes: (e: any) => void;
  onNo: (e: any) => void;
}
interface S {}

class Warning extends Component<P, S> {
  componentDidMount = () => {
    setTimeout(() => {
      this.props.onNo(null);
    }, 10000);
  };

  render() {
    const { t, i18n, ready } = useTranslation(null, { useSuspense: false });
    return (
      ready && (
        <div class="modal is-active">
          <div class="modal-background"></div>
          <div class="modal-content">
            <div class="box has-background-grey-dark">
              <div class="columns is-multiline is-mobile">
                <div class="column is-full">
                  <p class="label txt-bold txt-size-2">{t("print.1")}</p>
                </div>
                <div class="column is-full">
                  <div class="txt-size-2">
                    <div class="show-list">{t("print.2")}</div>
                    <div class="show-list">{t("print.3")}</div>
                    <div class="show-list">{t("print.4")}</div>
                    <div />
                  </div>
                </div>
              </div>
              <div class="field is-grouped is-grouped-right">
                <div class="control">
                  <YesButton
                    text={t("btn.confirm").toLowerCase()}
                    onClick={this.props.onYes}
                  />
                  <NoButton
                    text={t("btn.cancel").toLowerCase()}
                    onClick={this.props.onNo}
                    className="prop-buttons-shrink"
                    wrap
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    );
  }
}

export default Warning;

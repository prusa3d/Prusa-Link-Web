import { h } from "preact";
import { useRef } from "preact/hooks";
import { useTranslation } from "react-i18next";

import { YesButton } from "../buttons";

interface P {
  setApikey(value: string): void;
}

const Loging: preact.FunctionalComponent<P> = ({ setApikey }) => {
  const ref = useRef(null);

  const onClick = (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
    if (ref.current) {
      setApikey(ref.current.value);
    }
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key == "Enter" && ref.current) {
      setApikey(ref.current.value);
    }
  };

  const { t, i18n, ready } = useTranslation(null, { useSuspense: false });
  const [msg_1, msg_2, msg_3] = t("msg.api-key").split(".");
  return (
    ready && (
      <div class="modal is-active">
        <div class="modal-background"></div>
        <div class="modal-content">
          <div class="box has-background-grey-dark">
            <div class="field">
              <label>
                <p class="label txt-bold txt-size-2">{msg_1 + "."}</p>
                <p class="txt-bold txt-size-2" style={{ "margin-top": "30px" }}>
                  {msg_2 + "."}
                </p>
                <p class="txt-bold txt-size-2">{msg_3 + "."}</p>
              </label>
              <div class="control">
                <input
                  ref={ref}
                  class="input txt-normal txt-size-2 txt-grey"
                  type="text"
                  onKeyDown={onKeyDown}
                  autoFocus
                />
              </div>
            </div>
            <div class="field is-grouped is-grouped-right">
              <div class="control">
                <YesButton
                  text={t("btn.save-chgs").toLowerCase()}
                  onClick={onClick}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  );
};

export default Loging;

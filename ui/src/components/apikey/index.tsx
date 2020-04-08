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

  const { t, i18n, ready } = useTranslation(null, { useSuspense: false });
  return (
    ready && (
      <div class="modal is-active">
        <div class="modal-background"></div>
        <div class="modal-content">
          <div class="box has-background-grey-dark">
            <div class="field">
              <label class="label prusa-default-bold-text">Api Key</label>
              <div class="control">
                <input
                  ref={ref}
                  class="input prusa-default-text-grey"
                  type="text"
                />
              </div>
            </div>
            <div class="field is-grouped is-grouped-right">
              <div class="control">
                <YesButton text={t("btn.save-chgs")} onClick={onClick} />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  );
};

export default Loging;

import { h, Fragment } from "preact";
import { useTranslation } from "react-i18next";

export const Error401: preact.FunctionalComponent<{}> = () => {
  const { t, i18n, ready } = useTranslation(null, { useSuspense: false });
  return (ready &&
    <Fragment>
      <div class="box has-background-black is-paddingless prusa-line">
        <div class="columns is-multiline is-centered">
          <div class="column is-full txt-normal txt-size-1 txt-grey prusa-break-word">
            {t("401-title")}
          </div>
        </div>
      </div>
      <div class="columns is-multiline is-mobile is-vcentered">
        <div class="column is-full">
          <p class="txt-normal txt-size-2">
          {t("msg.e-401-1")}
          </p>
          <p class="txt-normal txt-size-2" style="margin-top: 80px">
          {t("msg.e-401-2")}
            <br />
            {t("msg.e-401-3")}
          </p>
        </div>
      </div>
    </Fragment>
  );
};

import { setLanguage, translate } from "./locale_provider"

function useLang(lang) {
    setLanguage(lang);
    console.log(`\n[${lang}]`);
}

function someTranslation() {
    console.log(translate('Network'));
    console.log(translate('Save to USB Drive'));
    console.log(translate( "About Us" ));
    console.log(translate(
        `Accept`
    ));
    console.log(translate(
        "Error code: %(code)s\n\n%(message)s",
        {
            code: '404',
            message: translate("Error, there is no file to reprint."),
        }
    ));
}

const testLocale = () => {
    useLang('en');
    someTranslation();

    useLang('cs');
    someTranslation();

    useLang('it');
    someTranslation();

    useLang('de');
    someTranslation();

    // Variable testing
    console.log('--- Test VARIABLES ---');
    useLang('it');
    const state_1 = new Date().getSeconds() > 30 ? "prop.st-idle" : "prop.st-printing";
    console.log(translate(state_1)); /* Don't not use this! Locale loader will not
    know which translates is needed and it does not match regex. */

    // Teoretically, you can do this
    // translate("prop.temp-amb")
    // translate("prop.temp-bed")
    const state_2 = new Date().getSeconds() > 30 ? "prop.temp-amb" : "prop.temp-bed";
    console.log(translate(state_2));
    /* It works, because translate functions in comments match Locale loader's regex.
    It's weird but it loads values from comments too. */

    // But this is the best way
    const state_3 = new Date().getSeconds() > 30 ? translate("Pause") : translate("Resume");
    console.log(state_3);
    // BTW you can have function to map state to translation using swith with translate calls

    console.log('--- Test QUOTES ---');
    useLang('en');
    // This translate is missing but it will not show error, because we use the same language
    console.log(
        translate("test with (bracket) and \"double quotes\" and 'single quotes' and `another quotes`")
    );

    console.log('--- Test ARGUMENTS ---');
    useLang('it');
    console.log(translate("test multiple %(temperature).0f temperatures (%(temperature).1f) so %(temperature).2f should be same as %(temperature).2f.",{ temperature: 36.525 }));
    console.log(translate("A64 temperature is too high. Measured: %(temperature).1f °C! Shutting down in 10 seconds...", { temperature: 280.22 }));
    console.log(translate("All done, happy printing!\n\nTilt settings for Prusa Slicer:\n\nTilt time fast: %(fast).1f s\nTilt time slow: %(slow).1f s\nArea fill: %(area)d %%", { fast: 60, slow: 180, area: 32 }));

    // Translate HTML elements
    const query = "#job";
    translate('There were some elements that was changed due to localization testing. Please remove lines 71-74 in locale_test.js.', { query });
    document.querySelector(query)?.removeAttribute('hidden');
    translate('Translated upload project', { query: ".home-row .component p" });
    translate('Translated temperatures', { query: ".home-row .component:last-child p" });
}

export default testLocale;
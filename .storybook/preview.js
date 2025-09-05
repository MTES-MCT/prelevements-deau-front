import "@codegouvfr/react-dsfr/main.css"
import {startReactDsfr} from "@codegouvfr/react-dsfr/spa"
import {MuiDsfrThemeProvider} from "@codegouvfr/react-dsfr/mui"
import "../src/app/globals.css"

startReactDsfr({
    defaultColorScheme: "light",
    useLang: () => "fr",
});

const preview = {
    parameters: {
        controls: {
            matchers: {
                color: /(background|color)$/i,
                date: /Date$/i,
            },
        },
    },
    decorators: [
        (Story) => (
            <MuiDsfrThemeProvider>
                <Story />
            </MuiDsfrThemeProvider>
        ),
    ],
};

export default preview;

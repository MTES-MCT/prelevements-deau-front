import "@codegouvfr/react-dsfr/main.css"
import {startReactDsfr} from "@codegouvfr/react-dsfr/spa"
import '../src/app/globals.css'

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
}

export default preview

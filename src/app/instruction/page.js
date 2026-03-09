import {CallOut} from '@codegouvfr/react-dsfr/CallOut'

import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import InstructionTabs from "@/components/instruction/instruction-tabs.js";

export const dynamic = 'force-dynamic'

const Instruction = async () => {
    return (
        <>
            <StartDsfrOnHydration/>

            <div className='fr-container mt-4'>
                <CallOut
                    iconId='ri-information-line'
                    title='Sources de données'
                >
                    Consultez, filtrez et triez les sources de données déposées. Identifiez rapidement les erreurs éventuelles
                    dans les données et accédez à leur détail pour un suivi précis.
                </CallOut>

                <InstructionTabs/>

            </div>
        </>
    );
}

export default Instruction

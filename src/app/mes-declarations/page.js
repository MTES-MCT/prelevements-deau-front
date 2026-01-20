import {CallOut} from '@codegouvfr/react-dsfr/CallOut'

import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {getMyDossiers} from "@/server/actions/dossiers.js";
import DossierCard from "@/components/declarations/dossier/dossier-card.js";
import {getDossierURL} from "@/lib/urls.js";

export const dynamic = 'force-dynamic'

const Dossiers = async () => {
    const result = await getMyDossiers();
    const dossiers = result?.success ? result.data : []

    return (
        <>
            <StartDsfrOnHydration/>

            <div className='fr-container mt-4'>
                <CallOut
                    iconId='ri-information-line'
                    title='Mes déclarations'
                >
                    Retrouvez toutes vos déclarations de prélèvements d’eau.
                </CallOut>

                {dossiers?.map((d, idx) => (
                    <DossierCard
                        key={d._id}
                        background={idx % 2 === 0 ? 'primary' : 'secondary'}
                        className='fr-mb-2w'
                        dossier={d}
                        url={getDossierURL(d)}
                    />
                ))}
            </div>
        </>
    );
}

export default Dossiers

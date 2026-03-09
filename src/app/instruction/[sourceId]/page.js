import {notFound} from 'next/navigation'

import DossierHeader from '@/components/declarations/dossier/dossier-header.js'
import DossierDetails from '@/components/declarations/dossier-details.js'
import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {
    getDossierFiles,
    getDossierPeriodLabel,
    getPointsPrelevementIdsFromDeclaration
} from '@/lib/dossier.js'
import {getMySourceAction} from "@/server/actions/sources.js";

const SourcePage = async ({params}) => {
    const {sourceId} = await params

    const result = await getMySourceAction(sourceId)
    if (!result.success || !result.data) {
        notFound()
    }

    const source = result.data.data
    const declaration = source.declaration
    const files = await getDossierFiles(declaration)
    const idPoints = getPointsPrelevementIdsFromDeclaration(declaration, files)
    const periodLabel = getDossierPeriodLabel(declaration)

    return (
        <>
            <StartDsfrOnHydration />

            <DossierHeader
                numero={declaration.code}
                status={declaration.status}
                dateDepot={declaration.createdAt}
                periodLabel={periodLabel}
            />

            <DossierDetails
                declaration={declaration}
                files={files}
                idPoints={idPoints}
            />
        </>
    )
}

export default SourcePage

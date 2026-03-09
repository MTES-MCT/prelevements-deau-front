import {notFound} from 'next/navigation'

import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {getMySourceAction} from "@/server/actions/sources.js";
import {getInstructionURL} from "@/lib/urls.js";
import Breadcrumb from "@codegouvfr/react-dsfr/Breadcrumb";

const SourceLayout = async ({params, children}) => {
    const {sourceId} = await params
    const result = await getMySourceAction(sourceId)
    if (!result.success || !result.data) {
        notFound()
    }

    const source = result.data
    const code = source?.declaration?.code

    return (
        <>
            <StartDsfrOnHydration />
            <div className='fr-container mt-4'>
                <Breadcrumb
                    currentPageLabel={`Déclaration n°${code}`}
                    segments={[{
                        label: 'Instruction',
                        linkProps: {
                            href: getInstructionURL()
                        }
                    }]}
                />
                {children}
            </div>
        </>
    )
}

export default SourceLayout

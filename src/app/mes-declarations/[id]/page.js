import {notFound} from 'next/navigation'

import {StartDsfrOnHydration} from '@/dsfr-bootstrap/index.js'
import {getDeclarationAction} from "@/server/actions/declarations.js";
import Link from 'next/link'
import moment from "moment";

const Page = async ({params}) => {
  const {id} = await params

  const result = await getDeclarationAction(id)
  if (!result.success || !result.data) {
    notFound()
  }

  const declaration = result.data.data;

  return (
    <>
      <StartDsfrOnHydration />

      <div className='flex flex-col gap-8 mb-16'>
        <dl>
          <dt>Date dépôt</dt>
          <dd>{ moment(declaration.createdAt).format('LLL')}</dd>

          <dt>Statut</dt>
          <dd>{ declaration.status }</dd>

          <dt>Dates</dt>
          <dd>
            { moment(declaration.startMonth).format('MMMM YYYY') } - { moment(declaration.endMonth).format('MMMM YYYY') }
          </dd>

          <dt>Source de donnée</dt>
          <dd>{ declaration.dataSourceType }</dd>

          <dt>Type de déclaration</dt>
          <dd>{ declaration.waterWithdrawalType }</dd>

          <dt>Numéro d'AOT</dt>
          <dd>{ declaration.aotDecreeNumber }</dd>

          <dt>Commentaire</dt>
          <dd style={{ whiteSpace: 'pre-line'}}>{ declaration.comment }</dd>

          <dt>Fichiers</dt>
          <dd>
            <ul>
                { declaration.files.map((file) => (
                    <li key={file.id}>
                      <Link
                        href={file.url}
                        download>
                        {file.filename}
                      </Link>
                    </li>
                )) }
            </ul>
          </dd>
        </dl>
      </div>
    </>
  )
}

export default Page

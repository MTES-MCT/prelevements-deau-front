'use client'

import {useState, useTransition} from 'react'

import {formatNativeDate} from '@/lib/native-declaration.js'
import {getChunkValuesAction} from '@/server/actions/sources.js'

const NativeValuesPreview = ({sourceId, chunkId}) => {
  const [payload, setPayload] = useState(null)
  const [error, setError] = useState(null)
  const [cursors, setCursors] = useState([undefined])
  const [page, setPage] = useState(0)
  const [busy, startTransition] = useTransition()

  const load = (cursor, nextPage) => startTransition(async () => {
    setError(null)
    const result = await getChunkValuesAction({sourceId, chunkId, cursor})
    if (!result.success) {
      setError({message: result.error || 'Les valeurs n’ont pas pu être chargées.', cursor, page: nextPage})
      return
    }
    setPayload(result.data)
    setPage(nextPage)
    setCursors(previous => [...previous.slice(0, nextPage), cursor])
  })

  return (
    <details className='mt-2' onToggle={event => {
      if (event.currentTarget.open && !payload && !busy && !error) load(undefined, 0)
    }}>
      <summary className='cursor-pointer text-sm font-medium text-[#000091]'>Voir les valeurs</summary>
      <div className='mt-2' aria-busy={busy}>
        {busy ? <p role='status'>Chargement des valeurs…</p> : error ? <div>
          <p className='fr-error-text' role='alert'>{error.message}</p>
          <button type='button' className='fr-btn fr-btn--secondary fr-btn--sm' onClick={() => load(error.cursor, error.page)}>Réessayer</button>
        </div> : payload && <>
          <div className='overflow-x-auto border border-gray-200'>
            <table className='w-full min-w-[520px] text-sm'>
              <caption className='text-left text-sm fr-mb-1w'>Dates et heures de La Réunion</caption>
              <thead className='bg-gray-50 text-left text-xs uppercase text-gray-500'><tr>
                <th className='px-3 py-2 font-medium'>Début / mesure</th>
                <th className='px-3 py-2 font-medium'>Fin de période (exclue)</th>
                <th className='px-3 py-2 font-medium'>Valeur</th>
                <th className='px-3 py-2 font-medium'>Unité</th>
                <th className='px-3 py-2 font-medium'>Remarque</th>
              </tr></thead>
              <tbody className='divide-y divide-gray-100'>{(payload.data ?? []).map(value => <tr key={value.id}>
                <td className='px-3 py-2'>{formatNativeDate(value.periodStart)}</td>
                <td className='px-3 py-2'>{value.periodStart === value.periodEnd ? '—' : formatNativeDate(value.periodEnd)}</td>
                <td className='px-3 py-2'>{String(value.value ?? '')}</td>
                <td className='px-3 py-2'>{value.unit}</td>
                <td className='px-3 py-2'>{value.remark || '—'}</td>
              </tr>)}</tbody>
            </table>
          </div>
          {payload.total === 0 && <p>Aucune valeur disponible.</p>}
          <div className='flex flex-wrap items-center gap-3 fr-mt-1w'>
            <button type='button' className='fr-btn fr-btn--secondary fr-btn--sm' disabled={page === 0} onClick={() => load(cursors[page - 1], page - 1)}>Précédent</button>
            <span className='text-sm'>Page {page + 1} — {payload.total} valeurs</span>
            <button type='button' className='fr-btn fr-btn--secondary fr-btn--sm' disabled={!payload.nextCursor} onClick={() => load(payload.nextCursor, page + 1)}>Suivant</button>
          </div>
        </>}
      </div>
    </details>
  )
}

export default NativeValuesPreview

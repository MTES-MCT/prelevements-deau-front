'use client'

import {useRef, useState} from 'react'

import {Button} from '@codegouvfr/react-dsfr/Button'

import CollectorCampaignParticipation from '@/components/collectors/campaign-participation.js'
import {getCollectorCampaignParticipationOptionsAction} from '@/server/actions/collector-points.js'

export default function CollectorCampaignParticipationEntry({exploitationId, label}) {
  const [result, setResult] = useState(null)
  const [pending, setPending] = useState(false)
  const loading = useRef(false)
  async function load() {
    if (loading.current) return
    loading.current = true
    setPending(true)
    try {
      setResult(await getCollectorCampaignParticipationOptionsAction(exploitationId))
    } catch {
      setResult({success: false})
    } finally {
      loading.current = false
      setPending(false)
    }
  }
  return <div>
    {(!result?.success || pending) && <Button priority='secondary' disabled={pending} onClick={load}>
      {pending ? 'Chargement des formulaires…' : result ? `Réessayer — ${label}` : `Formulaires de campagne — ${label}`}
    </Button>}
    {!pending && result && <CollectorCampaignParticipation exploitationId={exploitationId} result={result} label={`Formulaires — ${label}`} />}
    {result?.success && !result.data?.campaigns?.length && <p className='fr-text--sm mt-3'>Aucune campagne disponible pour cette exploitation.</p>}
  </div>
}

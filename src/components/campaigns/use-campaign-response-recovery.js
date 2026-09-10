'use client'

import {
  useCallback, useEffect, useRef, useState
} from 'react'

import {useAuth} from '@/contexts/auth-context.js'
import {
  campaignRecoveryEpoch, campaignRecoveryKey, hasCampaignDeparture, readCampaignRecovery, removeCampaignRecovery, trackCampaignDeparture, waitCampaignDeparture, writeCampaignRecovery
} from '@/lib/campaign-response-recovery.js'
import {campaignEditableTargets, getCampaignCapabilities, unwrapCampaignResult} from '@/lib/collection-campaigns.js'
import {getCampaignContextAction} from '@/server/actions/campaigns.js'

const storage = () => {
  try {
    return window.sessionStorage
  } catch {
    return undefined
  }
}

const scope = (context, kind) => JSON.stringify([
  context.targets.map(target => target.id).sort(), [...campaignEditableTargets(context, kind)].sort()
])

export default function useCampaignResponseRecovery({context, kind, queue, onRestore}) {
  const {user, isLoading} = useAuth()
  const key = campaignRecoveryKey({
    userId: user?.id, campaignId: context.campaign.id, preleveurUserId: context.preleveurUserId, kind
  })
  const [ready, setReady] = useState(true)
  const [editors, setEditors] = useState({})
  const [conflictEditors, setConflictEditors] = useState({})
  const [notice, setNotice] = useState('')
  const current = useRef(null)
  const identity = useRef(key)
  const epoch = useRef(campaignRecoveryEpoch())
  const discarded = useRef(false)
  const departed = useRef(false)
  const callbacks = useRef(null)
  callbacks.current = {context, onRestore}
  const persist = useCallback(() => {
    const entry = current.current
    if (!entry || epoch.current !== campaignRecoveryEpoch()) {
      return
    }

    if (entry.dirty || Object.keys(entry.editors).length > 0 || (departed.current && entry.draft)) {
      writeCampaignRecovery(key, entry, storage())
    } else {
      removeCampaignRecovery(key, storage())
    }
  }, [key])

  useEffect(() => {
    departed.current = false
    if (isLoading) {
      return undefined
    }

    if (identity.current && identity.current !== key) {
      current.current = null
      setReady(false)
      setEditors({})
      setNotice('Votre session a changé. Rechargez la page avant de reprendre la saisie.')
      return undefined
    }

    identity.current = key

    let active = true
    const freshEntry = value => ({
      revision: value.responses?.[kind]?.version || 0,
      responseId: value.responses?.[kind]?.id || null,
      scope: scope(value, kind), dirty: false, draft: null, editors: {}
    })
    const initial = readCampaignRecovery(key, storage())
    current.current = freshEntry(callbacks.current.context)
    if (!initial && !hasCampaignDeparture(key)) {
      setReady(true)
      return undefined
    }

    setReady(false)
    let restored = false
    const restore = async () => {
      await waitCampaignDeparture(key)
      const saved = readCampaignRecovery(key, storage())
      const fresh = unwrapCampaignResult(await getCampaignContextAction(callbacks.current.context.campaign.id, callbacks.current.context.preleveurUserId))
      if (!active || epoch.current !== campaignRecoveryEpoch()) {
        return
      }

      const canRestore = getCampaignCapabilities(fresh, kind).canEdit && campaignEditableTargets(fresh, kind).length > 0
      if (!canRestore || (saved && saved.scope !== scope(fresh, kind))) {
        removeCampaignRecovery(key, storage())
        current.current = freshEntry(fresh)
        callbacks.current.onRestore({context: fresh})
        setNotice('Vos droits ont changé : la saisie enregistrée a été rechargée.')
        restored = true
        return
      }

      const local = saved && (saved.dirty || Object.keys(saved.editors).length > 0) ? saved : null
      current.current = local || freshEntry(fresh)
      const conflict = Boolean(local && (local.revision !== (fresh.responses?.[kind]?.version || 0) || local.responseId !== (fresh.responses?.[kind]?.id || null)))
      callbacks.current.onRestore({context: fresh, recovery: local, conflict})
      restored = true
      if (saved) {
        setEditors(conflict ? {} : saved.editors)
        setConflictEditors(conflict ? saved.editors : {})
        if (saved.dirty || Object.keys(saved.editors).length > 0) {
          setNotice(conflict ? 'Votre saisie locale a été retrouvée, mais la réponse a changé entre-temps. Vérifiez-la avant de recharger les données enregistrées.' : 'Votre saisie non enregistrée a été reprise.')
        }

        if (!saved.dirty && Object.keys(saved.editors).length === 0) {
          removeCampaignRecovery(key, storage())
        }
      }
    }

    const load = async () => {
      try {
        await restore()
      } catch {
        if (active) {
          setNotice('La reprise de votre saisie est momentanément indisponible. Rechargez la page pour réessayer.')
        }
      } finally {
        if (active) {
          // A failed authorization/context read must not unlock a stale form.
          setReady(restored)
        }
      }
    }

    load()
    return () => {
      active = false
    }
  }, [key, kind, isLoading])

  const recordDraft = value => {
    if (current.current) {
      current.current.draft = structuredClone(value)
      current.current.dirty = true
      persist()
    }
  }

  const recordSave = state => {
    if (!current.current || !state.result) {
      return
    }

    current.current.revision = state.revision
    current.current.responseId = state.result.response.id
    current.current.dirty = state.dirty
    if (!state.dirty) {
      current.current.draft = structuredClone(state.result.response.draft)
    }

    persist()
  }

  const onEditorChange = useCallback((targetId, value) => {
    if (!current.current) {
      return
    }

    if (value) {
      current.current.editors[targetId] = structuredClone(value)
    } else {
      delete current.current.editors[targetId]
    }

    persist()
  }, [persist])

  return {
    ready: ready && !isLoading && Boolean(key) && identity.current === key && epoch.current === campaignRecoveryEpoch(), editors, conflictEditors, notice, recordDraft, recordSave, onEditorChange,
    hasChanges: () => Boolean(current.current?.dirty || Object.keys(current.current?.editors || {}).length > 0),
    clear({response, discard = false} = {}) {
      removeCampaignRecovery(key, storage())
      discarded.current = discard
      if (current.current) {
        current.current.dirty = false
        current.current.editors = {}
        current.current.draft = null
        if (response) {
          current.current.revision = response.version
          current.current.responseId = response.id
        }
      }
    },
    depart(submission) {
      if (!current.current || discarded.current || epoch.current !== campaignRecoveryEpoch()) {
        return
      }

      departed.current = true

      if (current.current?.draft) {
        writeCampaignRecovery(key, current.current, storage())
      }

      if (queue.current.getState().dirty || submission) {
        const save = queue.current.getState().dirty ? queue.current.retry() : Promise.resolve()
        trackCampaignDeparture(key, Promise.allSettled([save, submission]))
      }
    }
  }
}

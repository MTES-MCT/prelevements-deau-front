/** Serialize draft writes so an older response never replaces newer local edits. */
export function createCampaignDraftQueue({revision, save, onState = () => {}}) {
  let currentRevision = revision
  let pending = null
  let running = null
  let failure = null
  let generation = 0
  let disposed = false

  const notify = state => {
    if (!disposed) {
      onState({...state, revision: currentRevision, dirty: Boolean(pending)})
    }
  }

  const flush = async () => {
    if (failure) {
      throw failure
    }

    if (running) {
      await running
      return flush()
    }

    if (!pending || disposed) {
      return currentRevision
    }

    const snapshot = pending
    pending = null
    notify({status: 'saving'})
    running = (async () => {
      try {
        await Promise.resolve()
        const result = await save(snapshot.value, currentRevision)
        if (!Number.isInteger(result?.revision)) {
          throw new TypeError('Révision de sauvegarde absente : rechargez la campagne.')
        }

        currentRevision = result.revision
        notify({status: pending ? 'dirty' : 'saved', result, savedGeneration: snapshot.generation})
      } catch (error) {
        pending ||= snapshot
        failure = error
        notify({status: error.code === 409 ? 'conflict' : 'error', error})
        throw error
      } finally {
        running = null
      }
    })()
    await running
    return flush()
  }

  return {
    change(value) {
      if (disposed) {
        return
      }

      pending = {value: structuredClone(value), generation: ++generation}
      notify({status: failure ? (failure.code === 409 ? 'conflict' : 'error') : 'dirty'})
    },
    flush,
    retry() {
      if (failure?.code === 409) {
        return Promise.reject(failure)
      }

      failure = null
      return flush()
    },
    getState: () => ({revision: currentRevision, dirty: Boolean(pending) || Boolean(running), blocked: Boolean(failure)}),
    setRevision(revision) {
      if (pending || running || !Number.isInteger(revision) || revision < currentRevision) {
        throw new Error('La révision ne peut être remplacée pendant une saisie ou sauvegarde.')
      }

      currentRevision = revision
    },
    dispose() {
      disposed = true
    }
  }
}

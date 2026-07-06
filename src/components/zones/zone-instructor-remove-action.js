'use client'

import {useState} from 'react'

import {Button} from '@codegouvfr/react-dsfr/Button'
import {useRouter} from 'next/navigation'

import {getInstructorName} from '@/lib/zone-instructors.js'
import {deleteZoneInstructorAction} from '@/server/actions/zones.js'

const ZoneInstructorRemoveAction = ({zone, instructor}) => {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const close = () => {
    if (!isDeleting) {
      setError(null)
      setOpen(false)
    }
  }

  const confirm = async () => {
    setError(null)
    setIsDeleting(true)

    try {
      const result = await deleteZoneInstructorAction(zone.id, instructor.id)

      if (!result.success) {
        setError(result.error || 'Impossible de retirer cet agent de la zone.')
        setIsDeleting(false)
        return
      }

      setOpen(false)
      router.push(`/zones/${zone.id}/agents`)
      router.refresh()
    } catch (error) {
      setError(error.message)
      setIsDeleting(false)
    }
  }

  return (
    <>
      <Button
        priority='tertiary no outline'
        size='small'
        onClick={() => setOpen(true)}
      >
        Retirer de la zone
      </Button>

      {open && (
        <div className='fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 px-4' role='presentation'>
          <div
            aria-describedby='zone-instructor-remove-description'
            aria-labelledby='zone-instructor-remove-title'
            aria-modal='true'
            className='w-full max-w-lg bg-white p-6 shadow-xl'
            role='dialog'
          >
            <h2 id='zone-instructor-remove-title' className='fr-h4 fr-mb-2w'>
              Retirer cet agent de la zone ?
            </h2>

            <p id='zone-instructor-remove-description' className='fr-text--sm'>
              {getInstructorName(instructor)} ne pourra plus accéder à {zone.name}.
              Son compte utilisateur sera conservé.
            </p>

            {instructor.isAdmin && (
              <p className='fr-text--sm'>
                Si cet agent est le dernier administrateur actif de la zone, le retrait sera refusé.
              </p>
            )}

            {error && (
              <p className='fr-text--sm fr-mb-0' style={{color: 'var(--text-default-error)'}}>
                {error}
              </p>
            )}

            <div className='mt-4 flex flex-wrap justify-end gap-2'>
              <Button disabled={isDeleting} priority='secondary' onClick={close}>
                Annuler
              </Button>

              <Button disabled={isDeleting} onClick={confirm}>
                {isDeleting ? 'Retrait en cours...' : 'Retirer de la zone'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default ZoneInstructorRemoveAction

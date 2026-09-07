import {getProfileDetailGroups} from '@/lib/account-profile.js'

const ProfileDetails = ({role, user}) => {
  const groups = getProfileDetailGroups(user, role)

  return (
    <div className='flex max-w-3xl flex-col gap-5'>
      {groups.map(group => {
        const titleId = `account-profile-${group.id}-title`

        return (
          <section
            key={group.id}
            aria-labelledby={titleId}
            className='border-t border-[var(--border-default-grey)] pt-4 first:border-t-0 first:pt-0'
          >
            <h3 className='fr-h6 fr-mb-2w' id={titleId}>{group.title}</h3>
            <dl className='fr-mb-0 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2'>
              {group.items.map(item => (
                <div key={item.field} className='min-w-0'>
                  <dt className='fr-text--xs fr-mb-1v text-[var(--text-mention-grey)]'>
                    {item.label}
                  </dt>
                  <dd className='fr-text--sm fr-text--bold fr-mb-0 min-w-0 break-words'>
                    {item.value}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        )
      })}
    </div>
  )
}

export default ProfileDetails

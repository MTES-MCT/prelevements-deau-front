import {fr} from '@codegouvfr/react-dsfr'
import Button from '@codegouvfr/react-dsfr/Button'
import Tag from '@codegouvfr/react-dsfr/Tag'
import {Typography, Box} from '@mui/material'
import {uniqBy} from 'lodash-es'

import MetasList from '@/components/ui/MetasList/index.js'
import TagsList from '@/components/ui/TagsList/index.js'

const EntityHeader = ({
  title,
  metas,
  rightBadges,
  tags,
  hrefButtons,
  children
}) => {
  const uniqRightBadges = uniqBy(rightBadges, 'label')
  const uniqHrefButtons = uniqBy(hrefButtons, 'label')

  return (
    <Box className='w-fill flex flex-col gap-10 fr-mt-3w'>
      <Box className='w-fill flex flex-col gap-1'>
        <Box className='flex items-center justify-between w-fill flex-wrap-reverse gap-2'>
          <Box className='flex items-center sm:gap-3 flex-wrap'>
            <Box className='flex items-center'>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  fontSize: 26,
                  fontWeight: 500
                }}
              >
                {title}
              </Box>
            </Box>
            <TagsList tags={tags} />
          </Box>

          {(uniqRightBadges.length > 0 || uniqHrefButtons.length > 0) && (
            <Box className='flex items-start sm:items-center content-between sm:w-fill gap-4'>
              {uniqRightBadges.length > 0 && (
                <Box className='flex items-center w-fit gap-1 flex-wrap'>
                  {uniqRightBadges.map(({icon: Icon, label}) => (
                    <Tag
                      key={label}
                      className='flex items-center w-fit gap-1'
                      style={{
                        backgroundColor: fr.colors.decisions.background.actionLow.blueFrance.default,
                        color: fr.colors.decisions.text.actionHigh.blueFrance.default
                      }}
                    >
                      {Icon && <Icon />}
                      <Typography component='span'>{label}</Typography>
                    </Tag>
                  ))}
                </Box>
              )}

              {uniqHrefButtons.length > 0 && (
                <Box className='flex items-center w-fit gap-2'>
                  {uniqHrefButtons.map(
                    ({label, icon, alt, priority = 'secondary', href}) => (
                      <Button
                        key={label}
                        priority={priority}
                        iconId={icon}
                        alt={alt}
                        linkProps={{href}}
                      >
                        {label}
                      </Button>
                    )
                  )}
                </Box>
              )}
            </Box>
          )}
        </Box>
        <Box>
          <MetasList metas={metas} />
        </Box>
      </Box>

      <Box>
        {children}
      </Box>
    </Box>
  )
}

export default EntityHeader

import {fr} from '@codegouvfr/react-dsfr'
import Button from '@codegouvfr/react-dsfr/Button'
import Tag from '@codegouvfr/react-dsfr/Tag'
import {Typography, Box} from '@mui/material'
import {uniq, uniqBy} from 'lodash-es'

import MetasList from '@/components/ui/MetasList/index.js'
import TagsList from '@/components/ui/TagsList/index.js'

const EntityHeader = ({
  title,
  titleIcon: TitleIcon,
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
          <Box className='flex items-center gap-3 flex-wrap-reverse'>
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
                {TitleIcon && <TitleIcon sx={{fontSize: 38}} />}
                {title}
              </Box>
            </Box>
            <TagsList tags={tags} />
          </Box>

          {(uniqHrefButtons?.length || rightBadges?.length) && (
            <Box className='flex items-center w-fit gap-4 flex-wrap'>
              {rightBadges && (
                <Box className='flex items-center w-fit gap-1'>
                  {uniqRightBadges.map(({icon: Icon, label}, index) => (
                    <Tag
                      key={label || index}
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

              {uniq && (
                <Box className='flex items-center w-fit gap-2'>
                  {uniqHrefButtons.map(
                    ({label, icon, alt, priority = 'secondary', href}, index) => (
                      <Button
                        key={label || index}
                        priority={priority}
                        iconId={icon}
                        alt={alt}
                        linkProps={{
                          href
                        }}
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
        <Box sx={{paddingLeft: `${TitleIcon ? 4 : 0}px`}}>
          <MetasList metas={metas} />
        </Box>
      </Box>

      <Box sx={{paddingLeft: `${TitleIcon ? 4 : 0}px`}}>
        {children}
      </Box>
    </Box>
  )
}

export default EntityHeader

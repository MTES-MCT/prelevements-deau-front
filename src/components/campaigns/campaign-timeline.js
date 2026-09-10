import styles from './campaign-timeline.module.css'

import {buildCampaignTimeline, getCampaignPosition} from '@/lib/campaign-timeline.js'
import {campaignDate} from '@/lib/collection-campaigns.js'

const CalendarDate = ({date}) => <time dateTime={date}>{campaignDate(date)}</time>

const periodPosition = (period, today) => today < period.startDate ? 'future' : (today >= period.endDate ? 'past' : 'present')

const windowStatus = position => {
  if (position.phase === 'OPEN' && position.remainingDays !== null) {
    return position.remainingDays === 0 ? 'Dernier jour pour répondre' : `Encore ${position.remainingDays} jour${position.remainingDays > 1 ? 's' : ''} pour répondre`
  }

  return {PREPARATION: 'Ouverture manuelle', SCHEDULED: 'À venir', EXPIRED: 'Date limite dépassée'}[position.phase] || null
}

const DetailResponseWindow = ({model, campaign, position}) => {
  const events = Object.fromEntries(model.response.events.map(event => [event.id, event]))
  const isDraft = !campaign.status || campaign.status === 'DRAFT'
  const opening = (isDraft || position.phase === 'SCHEDULED') ? events.opening : (events['actual-opening'] || events.opening)
  return (
    <section className={styles.detailWindow} aria-label='Saisie des réponses'>
      <div className={styles.detailHeader}>
        <h3 className={styles.detailTitle}>Saisie des réponses</h3>
        {windowStatus(position) && <span className={styles.windowStatus} data-tone={position.tone}>{windowStatus(position)}</span>}
      </div>
      <div className={styles.detailBoundaries}>
        <ResponseBoundary event={opening} label={isDraft ? 'Ouverture au plus tôt' : 'Ouverture'} fallback={isDraft ? 'À votre initiative' : 'Date non renseignée'} />
        <ResponseBoundary event={events.deadline} label='Date limite de réponse' fallback='Aucune date limite définie' />
        {campaign.status === 'CLOSED' && <ResponseBoundary event={events['actual-closing']} label='Clôture effective' fallback='Date non renseignée' />}
      </div>
      {isDraft && <p className={styles.detailNote}>L’ouverture reste à déclencher depuis l’onglet Configuration.</p>}
      {position.phase === 'EXPIRED' && <p className={styles.detailNote}>La campagne n’est pas encore clôturée.</p>}
    </section>
  )
}

const DetailCalendar = ({model, campaign, warnings}) => {
  const position = getCampaignPosition(campaign, campaign.now)
  return (
    <div className={`${styles.calendar} ${campaign.embedded ? styles.embedded : ''} ${styles.detail}`}>
      {!campaign.embedded && !campaign.hideTitle && <p className={styles.heading}>Calendrier</p>}
      <DetailResponseWindow model={model} campaign={campaign} position={position} />
      <section className={styles.detailSection} aria-label='Dates des relevés'>
        <h3 className={styles.detailTitle}>Relevés de compteurs</h3>
        {model.readings.length > 0
          ? <ol className={styles.detailReadings}>{model.readings.map(reading => <li key={reading.id}><CalendarDate date={reading.date} /></li>)}</ol>
          : <p className={styles.pending}>Dates à préciser.</p>}
      </section>
      <section className={styles.detailSection} aria-label='Périodes de besoins en eau'>
        <h3 className={styles.detailTitle}>Besoins en eau</h3>
        <ul className={styles.detailNeeds}>{model.needs.map(period => {
          const current = period.valid && position.today && periodPosition(period, position.today) === 'present'
          return (
            <li key={period.id} className={styles.detailPeriod} data-current={current || undefined}>
              <div className={styles.periodHeading}><strong>{period.label}</strong>{current && <span>En cours</span>}</div>
              {period.valid
                ? <p>Du <CalendarDate date={period.startDate} /><br />au <CalendarDate date={period.inclusiveEndDate} /></p>
                : <p className={styles.pending}>Dates à préciser ou à corriger.</p>}
            </li>
          )
        })}</ul>
        {model.needs.length === 0 && <p className={styles.pending}>Aucune période renseignée.</p>}
      </section>
      {warnings.length > 0 && <ul className={styles.warnings}>{warnings.map(item => <li key={item.id}>{item.label} : {item.detail}</li>)}</ul>}
    </div>
  )
}

// Les périodes contiguës partagent une plage. Un intervalle vide ou un
// chevauchement reste séparé : ne pas suggérer une collecte continue à tort.
const groupNeeds = needs => {
  const groups = []
  for (const period of [...needs].sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''))) {
    const previous = groups.at(-1)?.at(-1)
    if (previous?.valid && period.valid && previous.endDate === period.startDate) {
      groups.at(-1).push(period)
    } else {
      groups.push([period])
    }
  }

  return groups
}

const ResponseBoundary = ({event, label, fallback}) => (
  <div className={styles.boundary}>
    <span className={styles.boundaryLabel}>{label || event?.label}</span>
    {event ? <strong><CalendarDate date={event.date} /></strong> : <span className={styles.pending}>{fallback}</span>}
  </div>
)

const ResponseSchedule = ({model, status}) => {
  const events = Object.fromEntries(model.response.events.map(event => [event.id, event]))
  const opening = events['actual-opening'] || events.opening
  const closing = events['actual-closing'] || events.deadline
  const reminders = model.response.events.filter(event => event.id.startsWith('reminder-'))
  const previousDates = [
    events['actual-opening'] && events.opening?.date !== opening.date && events.opening,
    events['actual-closing'] && events.deadline?.date !== closing.date && events.deadline
  ].filter(Boolean)
  return (
    <>
      <div className={model.response.valid ? styles.responseRange : styles.responseDates}>
        <ResponseBoundary event={opening} label={!opening && 'Ouverture'} fallback={['OPEN', 'CLOSED'].includes(status) ? 'Date d’ouverture non renseignée.' : 'À votre initiative, sans date définie.'} />
        <ResponseBoundary event={closing} label={status === 'CLOSED' && closing?.id === 'deadline' ? 'Date limite prévue' : (!closing && 'Clôture')} fallback={status === 'CLOSED' ? 'Date de clôture non renseignée.' : 'Clôture manuelle, sans date limite.'} />
      </div>
      {status === 'CLOSED' && closing?.id === 'deadline' && <p className={styles.scheduleNote}>Date de clôture effective non renseignée.</p>}
      {previousDates.map(event => <p key={event.id} className={styles.scheduleNote}>{event.id === 'deadline' ? 'Date limite initialement prévue' : 'Ouverture au plus tôt initialement prévue'} : <CalendarDate date={event.date} /></p>)}
      {reminders.length > 0 && <div className={styles.reminders}>
        <p>Relances prévues si une réponse manque</p>
        <ul>{reminders.map(event => <li key={event.id}><CalendarDate date={event.date} /></li>)}</ul>
      </div>}
    </>
  )
}

export const CampaignGlobalTimeline = props => {
  const model = buildCampaignTimeline(props)
  const warnings = model.pending.filter(item => item.id.startsWith('invalid-'))
  if (props.showPosition) {
    return <DetailCalendar model={model} campaign={props} warnings={warnings} />
  }

  return (
    <div className={`${styles.calendar} ${props.embedded ? styles.embedded : ''}`}>
      {!props.embedded && !props.hideTitle && <p className={styles.heading}>Calendrier</p>}
      {!model.startDate && <p className={styles.empty}>Renseignez des dates pour afficher le calendrier.</p>}
      <section className={styles.lane} aria-label='Dates des relevés'>
        <div className={styles.laneHeader}>
          <h3 className={styles.laneTitle}>Relevés à fournir</h3>
          <p className={styles.laneHint}>Index des compteurs à chacune de ces dates.</p>
        </div>
        <div className={styles.laneContent}>
          {model.readings.length > 0
            ? <ol className={styles.readingDates}>{model.readings.map(reading => <li key={reading.id}><CalendarDate date={reading.date} /></li>)}</ol>
            : <p className={styles.pending}>Dates à préciser.</p>}
        </div>
      </section>
      <section className={styles.lane} aria-label='Périodes de besoins en eau'>
        <div className={styles.laneHeader}>
          <h3 className={styles.laneTitle}>Besoins à estimer</h3>
          <p className={styles.laneHint}>Volume d’eau prévu sur chaque période.</p>
        </div>
        <div className={styles.laneContent}>
          {groupNeeds(model.needs).map(group => (
            <ul key={group[0].id} className={styles.needPeriods}>
              {group.map(period => (
                <li key={period.id} className={period.valid ? styles.needPeriod : styles.incompletePeriod}>
                  <strong>{period.label}</strong>
                  {period.valid
                    ? <span>Du <CalendarDate date={period.startDate} /><br />au <CalendarDate date={period.inclusiveEndDate} /></span>
                    : <span className={styles.pending}>Dates à préciser ou à corriger.</span>}
                </li>
              ))}
            </ul>
          ))}
          {model.needs.length === 0 && <p className={styles.pending}>Aucune période renseignée.</p>}
        </div>
      </section>
      <section className={styles.lane} aria-label='Saisie des réponses'>
        <div className={styles.laneHeader}>
          <h3 className={styles.laneTitle}>Quand répondre</h3>
          <p className={styles.laneHint}>Transmission des relevés et des besoins en eau.</p>
        </div>
        <div className={styles.laneContent}>
          <ResponseSchedule model={model} status={props.status} />
        </div>
      </section>
      {warnings.length > 0 && <ul className={styles.warnings}>{warnings.map(item => <li key={item.id}>{item.label} : {item.detail}</li>)}</ul>}
    </div>
  )
}

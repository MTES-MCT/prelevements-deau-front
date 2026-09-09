'use client'

import {
  useCallback,
  useId,
  useRef,
  useState,
  useTransition
} from 'react'

import Link from 'next/link'
import {useRouter} from 'next/navigation'

import styles from './public-stats.module.css'

import {
  formatStatsCount,
  formatStatsDate,
  formatStatsMonth,
  formatStatsPercentage,
  getSelectableStatsMonths,
  getStatsConnections,
  getStatsProfiles,
  isStatsCount
} from '@/lib/public-stats.js'

const PROFILE_COLORS = {
  AGRICULTURE: 'var(--stats-agriculture)',
  INDUSTRY: 'var(--stats-industry)',
  DRINKING_WATER: 'var(--stats-drinking-water)',
  OTHER: 'var(--stats-other)',
  UNKNOWN: 'var(--stats-unknown)'
}
const GEOGRAPHIES = [
  {key: 'SAGE', label: 'SAGE'},
  {key: 'DEPARTEMENT', label: 'Départements'}
]
const CHANNEL_LABELS = {
  DIRECT: 'Directement dans Partageons l’eau',
  THIRD_PARTY: 'Via un outil tiers',
  MIXED: 'Plusieurs canaux à égalité',
  UNKNOWN: 'Canal non renseigné'
}
const IMPACT_INDICATORS = [
  {label: 'Facilité d’usage', status: 'Fin de campagne 2026'},
  {label: 'Satisfaction usager', status: 'Fin de campagne 2026'},
  {label: 'Impact généré', status: 'Non disponible'},
  {label: 'Coût à l’utilisation', status: 'À publier avec le budget'}
]

const Count = ({value, className = ''}) => (
  <span className={`${className} ${isStatsCount(value) ? '' : styles.unavailable}`}>
    {formatStatsCount(value)}
  </span>
)

const ProgressBar = ({value, color = 'var(--stats-agriculture)'}) => {
  const percentage = isStatsCount(value) && value <= 100 ? value : 0

  return (
    <div className={styles.progress} aria-hidden='true'>
      <span style={{width: `${percentage}%`, background: color}} />
    </div>
  )
}

const MonthSelector = ({month, availableMonths}) => {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const months = getSelectableStatsMonths(availableMonths)

  const handleSubmit = useCallback(event => {
    event.preventDefault()
    const selectedMonth = new FormData(event.currentTarget).get('month')
    startTransition(() => {
      router.push(`/stats?${new URLSearchParams({month: selectedMonth})}`)
    })
  }, [router])

  return (
    <form className={styles.period} action='/stats' method='get' aria-busy={pending} onSubmit={handleSubmit}>
      <div className={styles.periodField}>
        <label className='fr-label' htmlFor='stats-month'>Mois observé</label>
        <select
          key={month}
          className='fr-select'
          id='stats-month'
          name='month'
          defaultValue={month}
          disabled={pending || months.length === 0}
        >
          {months.map(value => <option key={value} value={value}>{formatStatsMonth(value)}</option>)}
        </select>
      </div>
      <button className='fr-btn fr-btn--secondary' type='submit' disabled={pending || months.length === 0}>
        {pending ? 'Chargement…' : 'Afficher'}
      </button>
    </form>
  )
}

const Introduction = () => (
  <section className={styles.section} aria-labelledby='stats-purpose'>
    <h2 id='stats-purpose'>Pourquoi Partageons l’eau</h2>
    <div className={styles.problem}>
      <p>
        Pour assurer un partage de l’eau équitable, l’État et les acteurs de l’eau
        doivent décider qui peut prélever, combien, et quand. Ces décisions sont
        difficiles à prendre aujourd’hui, notamment par manque de connaissance des
        prélèvements réellement effectués : les données, quand elles existent, sont
        dispersées entre de nombreux acteurs, dans des formats hétérogènes.
      </p>
    </div>
    <ul className={styles.consequences}>
      <li>
        <h3>Gestion de la sécheresse</h3>
        <p>
          Les restrictions se décident à partir de l’état de la ressource. Sans savoir ce qui est
          prélevé, il reste difficile de les calibrer par usage et d’évaluer après coup ce qu’elles
          ont réellement produit.
        </p>
      </li>
      <li>
        <h3>Élaboration des SAGE et des PTGE</h3>
        <p>
          Les études de volumes prélevables, qui fixent ce qu’un territoire peut prélever
          durablement, s’appuient sur des estimations plutôt que sur des prélèvements constatés.
          La négociation entre usagers s’engage alors sur une base contestable.
        </p>
      </li>
      <li>
        <h3>Révision des autorisations</h3>
        <p>
          Beaucoup d’autorisations restent calées sur des volumes historiques, sans rapport avéré
          avec le besoin réel. Ni l’administration ni le préleveur ne disposent d’un argument
          solide pour les faire évoluer.
        </p>
      </li>
    </ul>
    <p className={styles.conclusion}>
      Partageons l’eau collecte ces prélèvements et les rend accessibles, pour que ces décisions
      s’appuient sur des faits mesurés.
    </p>
  </section>
)

const Deployment = ({totals}) => (
  <section className={styles.section} aria-labelledby='stats-deployment'>
    <h2 id='stats-deployment'>Où en est le déploiement</h2>
    <div className={styles.metrics}>
      <div className={`${styles.metric} ${styles.geographyMetric}`}>
        <div>
          <Count value={totals?.sageCount} className={styles.metricValue} />
          <span className={styles.metricLabel}>SAGE couverts</span>
        </div>
        <div>
          <Count value={totals?.departmentCount} className={styles.metricValue} />
          <span className={styles.metricLabel}>départements couverts</span>
        </div>
      </div>
      <div className={styles.metric}>
        <span className={styles.metricValue}>3</span>
        <span className={styles.metricLabel}>territoires supplémentaires visés d’ici fin 2026</span>
        <span className={styles.objective}>Objectif de déploiement</span>
      </div>
      <div className={styles.metric}>
        <Count value={totals?.pointsCount} className={styles.metricValue} />
        <span className={styles.metricLabel}>points de prélèvement</span>
      </div>
      <div className={styles.metric}>
        <Count value={totals?.preleveursCount} className={styles.metricValue} />
        <span className={styles.metricLabel}>préleveurs recensés</span>
      </div>
    </div>
    <p className={styles.note}>
      Les SAGE et les départements sont deux lectures du même périmètre : leurs nombres ne
      s’additionnent pas. Les points et les préleveurs sont comptés une seule fois dans les totaux.
    </p>
  </section>
)

const ProfileBreakdown = ({profiles}) => {
  const breakdown = getStatsProfiles(profiles)

  if (!breakdown.available) {
    return <p className={styles.note}>La répartition par profil est indisponible.</p>
  }

  if (breakdown.total === 0) {
    return <p className={styles.note}>Aucun préleveur recensé.</p>
  }

  let cursor = 0
  const slices = breakdown.profiles.map(profile => {
    const start = cursor
    cursor += profile.percentage
    return `${PROFILE_COLORS[profile.key] ?? PROFILE_COLORS.UNKNOWN} ${start}% ${cursor}%`
  })

  return (
    <div className={styles.breakdown}>
      <div className={styles.donut} style={{background: `conic-gradient(${slices.join(', ')})`}} aria-hidden='true'>
        <span>{formatStatsCount(breakdown.total)}</span>
      </div>
      <ul className={styles.profileLegend}>
        {breakdown.profiles.map(profile => (
          <li key={profile.key}>
            <span className={styles.swatch} style={{background: PROFILE_COLORS[profile.key] ?? PROFILE_COLORS.UNKNOWN}} aria-hidden='true' />
            <span>{profile.label}</span>
            <strong>{formatStatsCount(profile.count)}</strong>
            <span className={styles.profilePercentage}>{formatStatsPercentage(profile.percentage)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

const Territory = ({territory}) => {
  const hasDenominator = isStatsCount(territory.preleveursCount) && territory.preleveursCount > 0
  return (
    <article className={styles.territory}>
      <div className={styles.territoryHeading}>
        <div>
          <h3>{territory.name}</h3>
          <p className={styles.territoryPoints}>{formatStatsCount(territory.pointsCount)} points de prélèvement</p>
        </div>
        <div className={styles.territoryNumbers}>
          <span>{formatStatsCount(territory.reportingPreleveursCount)} sur {formatStatsCount(territory.preleveursCount)} préleveurs</span>
          <strong className={isStatsCount(territory.reportingRate) ? '' : styles.unavailable}>
            {formatStatsPercentage(territory.reportingRate)}
          </strong>
        </div>
      </div>
      <ProgressBar value={territory.reportingRate} />
      {!hasDenominator && <p className={styles.note}>Taux non calculable en l’absence de préleveurs recensés.</p>}
      <details className={styles.profileDetails}>
        <summary>Répartition des préleveurs par profil</summary>
        <ProfileBreakdown profiles={territory.profiles} />
      </details>
    </article>
  )
}

const Territories = ({territories, month}) => {
  const initialGeography = territories?.SAGE?.length === 0 && territories?.DEPARTEMENT?.length > 0
    ? 'DEPARTEMENT'
    : 'SAGE'
  const [geography, setGeography] = useState(initialGeography)
  const tabsRef = useRef([])
  const id = useId()
  const rows = territories?.[geography]

  function handleTabKey(event, index) {
    let nextIndex
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowLeft': {
        nextIndex = (index + 1) % GEOGRAPHIES.length

        break
      }

      case 'Home': {
        nextIndex = 0

        break
      }

      case 'End': {
        nextIndex = GEOGRAPHIES.length - 1

        break
      }

      default: {
        return
      }
    }

    event.preventDefault()
    setGeography(GEOGRAPHIES[nextIndex].key)
    tabsRef.current[nextIndex]?.focus()
  }

  return (
    <section className={styles.section} aria-labelledby='stats-reporting'>
      <h2 id='stats-reporting'>Préleveurs remontant leur donnée</h2>
      <p>
        Part des préleveurs pour lesquels une donnée de prélèvement est disponible sur au moins
        un point pendant le mois observé, rapportée aux préleveurs recensés sur le territoire.
      </p>
      {month && <p className={styles.periodCaption}>{formatStatsMonth(month)}</p>}
      <div className={styles.tabs} role='tablist' aria-label='Découpage territorial'>
        {GEOGRAPHIES.map((item, index) => (
          <button
            key={item.key}
            ref={element => {
              tabsRef.current[index] = element
            }}
            id={`${id}-tab-${item.key}`}
            role='tab'
            type='button'
            aria-selected={geography === item.key}
            aria-controls={`${id}-panel-${item.key}`}
            tabIndex={geography === item.key ? 0 : -1}
            onClick={() => setGeography(item.key)}
            onKeyDown={event => handleTabKey(event, index)}
          >
            {item.label}
          </button>
        ))}
      </div>
      {GEOGRAPHIES.map(item => (
        <div
          key={item.key}
          id={`${id}-panel-${item.key}`}
          role='tabpanel'
          aria-labelledby={`${id}-tab-${item.key}`}
          hidden={geography !== item.key}
          tabIndex={0}
        >
          {geography === item.key && (Array.isArray(rows)
            ? (rows.length > 0
              ? rows.map(territory => <Territory key={territory.id} territory={territory} />)
              : <p className={styles.empty}>Aucun territoire recensé dans ce découpage.</p>)
            : <p className={styles.empty}>Les données par territoire sont temporairement indisponibles.</p>)}
        </div>
      ))}
      <p className={styles.note}>
        Un préleveur peut être présent sur plusieurs territoires. Les résultats territoriaux ne
        s’additionnent donc pas pour obtenir le total du service.
      </p>
      <p className={styles.note}>
        Le mois observé est celui des mesures, pas de leur transmission. Les taux utilisent le
        référentiel actuel des préleveurs, y compris pour les mois passés. Les données reçues en
        attente de validation sont incluses ; les données rejetées ou dont le traitement a échoué
        sont exclues.
      </p>
    </section>
  )
}

const Channels = ({channels}) => {
  const available = Array.isArray(channels) && channels.length > 0
  const visibleChannels = available
    ? channels.filter(channel => ['DIRECT', 'THIRD_PARTY'].includes(channel.key) || channel.count > 0)
    : []
  const hasCounts = available && channels.every(channel => isStatsCount(channel.count))
  const total = hasCounts ? channels.reduce((sum, channel) => sum + channel.count, 0) : null

  return (
    <section className={styles.section} aria-labelledby='stats-channels'>
      <h2 id='stats-channels'>Comment la donnée arrive</h2>
      <p>Répartition des préleveurs remontant leur donnée pendant le mois observé, selon leur canal principal.</p>
      {available ? (
        <div className={styles.channels}>
          {visibleChannels.map(channel => (
            <div key={channel.key} className={styles.channel}>
              <Count value={channel.count} className={styles.channelValue} />
              <h3>{CHANNEL_LABELS[channel.key] ?? channel.label}</h3>
              <p>{formatStatsPercentage(channel.percentage)}</p>
              <ProgressBar
                value={channel.percentage}
                color={channel.key === 'DIRECT' ? 'var(--text-default-grey)' : 'var(--text-mention-grey)'}
              />
            </div>
          ))}
        </div>
      ) : <p className={styles.empty}>La répartition par canal est temporairement indisponible.</p>}
      {total === 0 && <p className={styles.note}>Aucune remontée de données enregistrée pour le mois observé.</p>}
      <p className={styles.note}>
        Chaque préleveur est compté une seule fois, dans le canal couvrant le plus de points
        distincts pendant le mois observé. La fréquence des transmissions n’influence pas ce
        classement. Les égalités et les canaux non renseignés sont présentés séparément.
      </p>
    </section>
  )
}

const Connections = ({connections}) => {
  const months = getStatsConnections(connections?.months)
  const maximum = Math.max(1, ...months.filter(month => month.available).map(month => month.total))
  const hasPartialMonth = months.some(month => month.status === 'partial')
  const accessibleDescription = months.map(month => `${formatStatsMonth(month.month)} : ${month.available
    ? `${formatStatsCount(month.administration)} comptes administration, ${formatStatsCount(month.declarants)} comptes déclarants, total ${formatStatsCount(month.total)}${month.status === 'partial' ? ', données partielles' : ''}`
    : 'données indisponibles'}`).join('. ')

  return (
    <section className={styles.section} aria-labelledby='stats-connections'>
      <h2 id='stats-connections'>Comptes s’étant connectés dans le mois</h2>
      <p>
        Nombre de comptes distincts ayant réussi une connexion au cours du mois. Les visites
        effectuées avec une session déjà ouverte ne sont pas comptabilisées.
      </p>
      {months.length > 0 ? (
        <>
          <div className={styles.chartScroll}>
            <div className={styles.connectionsChart} role='img' aria-label={accessibleDescription}>
              {months.map(month => (
                <div key={month.month} className={styles.chartColumn} aria-hidden='true'>
                  <div className={styles.chartPlot}>
                    <span className={styles.barValue}>
                      {month.available ? formatStatsCount(month.total) : '—'}
                      {month.status === 'partial' ? ' *' : ''}
                    </span>
                    {month.available ? (
                      <div className={styles.stack} style={{height: `${month.total / maximum * 180}px`}}>
                        {month.administration > 0 && (
                          <span
                            className={styles.administrationSegment}
                            style={{height: `${month.administration / month.total * 100}%`}}
                          >
                            {month.administration / maximum * 180 >= 22 ? formatStatsCount(month.administration) : ''}
                          </span>
                        )}
                        {month.declarants > 0 && (
                          <span
                            className={styles.declarantsSegment}
                            style={{height: `${month.declarants / month.total * 100}%`}}
                          >
                            {month.declarants / maximum * 180 >= 22 ? formatStatsCount(month.declarants) : ''}
                          </span>
                        )}
                      </div>
                    ) : <div className={styles.missingBar}>Non disponible</div>}
                  </div>
                  <span className={styles.chartMonth}>{formatStatsMonth(month.month, {short: true})}</span>
                </div>
              ))}
            </div>
          </div>
          <div className={styles.chartLegend}>
            <span><i className={`${styles.swatch} ${styles.administrationSegment}`} aria-hidden='true' />Administration</span>
            <span><i className={`${styles.swatch} ${styles.declarantsSegment}`} aria-hidden='true' />Déclarants — préleveurs et collecteurs</span>
          </div>
          <details className={styles.connectionDetails}>
            <summary>Voir les chiffres détaillés</summary>
            <div className={styles.tableScroll}>
              <table className={styles.connectionTable}>
                <caption>Comptes distincts connectés par mois et par public</caption>
                <thead><tr><th scope='col'>Mois</th><th scope='col'>Administration</th><th scope='col'>Déclarants</th><th scope='col'>Total</th><th scope='col'>Disponibilité</th></tr></thead>
                <tbody>
                  {months.map(month => (
                    <tr key={month.month}>
                      <th scope='row'>{formatStatsMonth(month.month)}</th>
                      <td>{formatStatsCount(month.administration)}</td>
                      <td>{formatStatsCount(month.declarants)}</td>
                      <td>{formatStatsCount(month.total)}</td>
                      <td>{month.available ? (month.status === 'partial' ? 'Partielle' : 'Complète') : 'Indisponible'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      ) : <p className={styles.empty}>Les statistiques de connexion sont temporairement indisponibles.</p>}
      {connections?.availableSince && <p className={styles.note}>Historique disponible depuis le {formatStatsDate(connections.availableSince)}.</p>}
      {hasPartialMonth && <p className={styles.note}>* Les données disponibles ne couvrent qu’une partie du mois.</p>}
      <p className={styles.note}>Les visiteurs anonymes et les comptes de service ne sont pas comptabilisés.</p>
    </section>
  )
}

const Impact = () => (
  <section className={styles.section} aria-labelledby='stats-impact'>
    <h2 id='stats-impact'>Utilité, impact sur la politique publique et efficience</h2>
    <div className={styles.impactGrid}>
      {IMPACT_INDICATORS.map(indicator => (
        <div key={indicator.label} className={styles.impactCard}>
          <h3>{indicator.label}</h3>
          <span className={styles.pendingBadge}>{indicator.status}</span>
        </div>
      ))}
    </div>
    <div className={styles.impactTarget}>
      <h3>Impact visé</h3>
      <p>
        Mieux calibrer les mesures de restriction et appuyer la révision des autorisations de
        prélèvement. Ces effets ne sont pas encore mesurables : la page publie pour l’instant
        la connaissance produite, qui en est la condition.
      </p>
    </div>
  </section>
)

const PublicStats = ({data, error}) => (
  <article className={styles.page}>
    <header className={styles.pageHeader}>
      <div>
        <h1>Statistiques</h1>
        <p className={styles.updated}>
          {data?.generatedAt
            ? <>Mise à jour le <time dateTime={data.generatedAt}>{formatStatsDate(data.generatedAt)}</time></>
            : 'Données temporairement indisponibles'}
        </p>
      </div>
      {data && <MonthSelector month={data.month} availableMonths={data.availableMonths} />}
    </header>
    {error && (
      <div className={styles.error} role='status'>
        <h2>{error === 'invalid-month' ? 'Ce mois n’est pas disponible' : 'Les statistiques sont temporairement indisponibles'}</h2>
        <p>{error === 'invalid-month'
          ? 'Seuls les mois terminés et disponibles peuvent être consultés.'
          : 'Les chiffres n’ont pas pu être chargés. Vous pouvez réessayer dans quelques instants.'}</p>
        <Link className='fr-link' href='/stats'>Consulter le dernier mois disponible</Link>
      </div>
    )}
    <Introduction />
    <Deployment totals={data?.totals} />
    <Territories territories={data?.territories} month={data?.month} />
    <Channels channels={data?.channels} />
    <Connections connections={data?.connections} />
    <Impact />
  </article>
)

export default PublicStats

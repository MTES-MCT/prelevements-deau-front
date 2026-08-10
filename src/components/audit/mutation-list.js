const OPERATION_CONFIG = {
  CREATE: {label: 'Création', className: 'fr-badge--success'},
  UPDATE: {label: 'Modification', className: 'fr-badge--info'},
  DELETE: {label: 'Suppression', className: 'fr-badge--error'}
}

const ENTITY_LABELS = {
  CHUNK: 'Ligne de déclaration',
  DATA_EXPORT: 'Export',
  DECLARANT: 'Déclarant',
  DECLARANT_ZONES: 'Zones du déclarant',
  DECLARANT_DECLARATION_TYPE: 'Autorisation de déclaration',
  DECLARATION: 'Déclaration',
  DECLARATION_OVERRIDE: 'Exception de période',
  DECLARATION_TYPE: 'Type de déclaration',
  DOCUMENT: 'Document',
  EMAIL_ALIAS: 'Adresse email secondaire',
  EXPLOITATION: 'Exploitation',
  NOTIFICATION_SETTING: 'Paramètre de notification',
  POINT: 'Point de prélèvement',
  RULE: 'Règle',
  SERVICE_ACCOUNT: 'Compte de service',
  SERVICE_ACCOUNT_CREDENTIAL: 'Identifiant de compte de service',
  SERVICE_ACCOUNT_DECLARANT: 'Autorisation de déclarant',
  ZONE: 'Zone',
  ZONE_AGENT_ASSIGNMENT: 'Habilitation d’agent',
  ZONE_DECLARATION_SETTINGS: 'Paramètres de déclaration',
  ZONE_MONITORING_STATION: 'Station de suivi'
}

const FIELD_LABELS = {
  addressLine1: 'Adresse',
  addressLine2: 'Complément d’adresse',
  after: 'Après',
  aquiferName: 'Aquifère',
  city: 'Commune',
  civility: 'Civilité',
  code: 'Code',
  collecteurUserIds: 'Collecteurs',
  commissioningDate: 'Date de mise en service',
  connectors: 'Connecteurs',
  constraint: 'Contrainte',
  coordinates: 'Coordonnées',
  declarationNotificationsEnabled: 'Rappels et relances',
  declarationTypeId: 'Type de déclaration',
  declarantRole: 'Rôle déclarant',
  declarantType: 'Type de déclarant',
  declarantUserId: 'Déclarant',
  defaultPeriodType: 'Périodicité par défaut',
  deletedAt: 'Date de suppression',
  email: 'Email',
  enabled: 'Actif',
  endDate: 'Fin',
  exploitationIds: 'Exploitations',
  filename: 'Nom du fichier',
  firstName: 'Prénom',
  flowType: 'Prélèvement ou rejet',
  frequency: 'Fréquence',
  isActive: 'Actif',
  isAvailable: 'Disponible',
  isReferencePoint: 'Point référent',
  isWaterBodyConnectedToGroundwater: 'Plan d’eau connecté à la nappe',
  isWaterBodyConnectedToStream: 'Plan d’eau connecté au cours d’eau',
  isZre: 'ZRE',
  jobTitle: 'Fonction',
  label: 'Libellé',
  lastName: 'Nom',
  mimeType: 'Type de fichier',
  name: 'Nom',
  nature: 'Origine prélèvement / rejet',
  notificationType: 'Type de notification',
  periodType: 'Périodicité',
  permissions: 'Droits',
  phoneNumber: 'Téléphone',
  pointKind: 'Nature du point',
  pointPrelevementId: 'Point de prélèvement',
  pointPrelevementNameAliases: 'Alias du point',
  postalCode: 'Code postal',
  quickDeclarationEnabled: 'Déclaration rapide',
  reason: 'Motif',
  reference: 'Référence',
  siret: 'SIRET',
  socialReason: 'Raison sociale',
  startDate: 'Début',
  status: 'Statut',
  title: 'Titre',
  type: 'Type',
  unit: 'Unité',
  usageId: 'Usage',
  usageName: 'Nom d’usage',
  value: 'Valeur',
  version: 'Version',
  waterAgencyInternalIdentifier: 'Identifiant Agence de l’eau',
  waterBodyType: 'Type de milieu',
  withdrawalType: 'Type de prélèvement / rejet',
  zones: 'Zones'
}

function looksLikeDate(value) {
  return typeof value === 'string'
    && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)
}

function formatValue(value) {
  if (value === null || value === undefined || value === '') {
    return <span className='text-[var(--text-mention-grey)]'>Non renseigné</span>
  }

  if (typeof value === 'boolean') {
    return value ? 'Oui' : 'Non'
  }

  if (looksLikeDate(value)) {
    return new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'short',
      timeStyle: value.includes('T00:00:00') ? undefined : 'short',
      timeZone: 'Europe/Paris'
    }).format(new Date(value))
  }

  if (Array.isArray(value)) {
    return value.length > 0
      ? value.map(item => typeof item === 'object'
        ? item.name || item.label || item.code || item.id || JSON.stringify(item)
        : String(item)).join(', ')
      : <span className='text-[var(--text-mention-grey)]'>Aucun</span>
  }

  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2)
  }

  return String(value)
}

const Mutation = ({mutation}) => {
  const operation = OPERATION_CONFIG[mutation.operation] ?? {
    label: mutation.operation,
    className: ''
  }
  const changedFields = mutation.changedFields ?? []
  const redactedFields = mutation.redactedFields ?? []

  return (
    <article className='border border-[var(--border-default-grey)] bg-white'>
      <header className='flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-default-grey)] px-3 py-2.5'>
        <div className='min-w-0'>
          <span className='block text-sm font-semibold text-[var(--text-title-grey)]'>
            {ENTITY_LABELS[mutation.entityType] || mutation.entityType}
          </span>
          <span className='block truncate text-xs text-[var(--text-mention-grey)]'>
            {mutation.entityLabel || mutation.entityId}
          </span>
        </div>
        <span className={`fr-badge fr-badge--sm ${operation.className}`}>{operation.label}</span>
      </header>

      {changedFields.length > 0 && (
        <div className='overflow-x-auto'>
          <table className='w-full min-w-[560px] border-collapse text-left text-sm'>
            <thead className='bg-[var(--background-alt-grey)] text-xs text-[var(--text-mention-grey)]'>
              <tr>
                <th className='w-1/3 px-3 py-2 font-medium' scope='col'>Champ</th>
                <th className='w-1/3 px-3 py-2 font-medium' scope='col'>Avant</th>
                <th className='w-1/3 px-3 py-2 font-medium' scope='col'>Après</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-[var(--border-default-grey)]'>
              {changedFields.map(field => (
                <tr key={field}>
                  <th className='px-3 py-2 font-medium' scope='row'>{FIELD_LABELS[field] || field}</th>
                  <td className='whitespace-pre-wrap break-words px-3 py-2'>{formatValue(mutation.before?.[field])}</td>
                  <td className='whitespace-pre-wrap break-words px-3 py-2'>{formatValue(mutation.after?.[field])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {redactedFields.length > 0 && (
        <p className='fr-text--xs fr-mb-0 border-t border-[var(--border-default-grey)] px-3 py-2 text-[var(--text-mention-grey)]'>
          Valeur non conservée : {redactedFields.map(field => FIELD_LABELS[field] || field).join(', ')}.
        </p>
      )}
    </article>
  )
}

const MutationList = ({mutations = []}) => {
  if (mutations.length === 0) {
    return (
      <p className='fr-text--sm fr-mb-0 text-[var(--text-mention-grey)]'>
        Aucune différence avant/après n’est disponible pour cette action.
      </p>
    )
  }

  return <div className='flex flex-col gap-3'>{mutations.map(mutation => <Mutation key={mutation.id} mutation={mutation} />)}</div>
}

export default MutationList

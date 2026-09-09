import test from 'ava'

import {campaignRequestHasAction, campaignRequestResponseState, mergeCampaignRequests} from './campaign-requests.js'

const now = new Date('2026-09-08T12:00:00Z').getTime()
const campaign = {id: 'campaign', status: 'OPEN', closesAt: '2026-11-01T00:00:00Z'}

test('les actions reflètent les vrais états et les droits, sans inventer de brouillon', t => {
  t.is(campaignRequestResponseState(campaign, {status: null, canEdit: true}, now).label, 'À compléter')
  t.is(campaignRequestResponseState(campaign, {status: 'DRAFT', canEdit: true}, now).action, 'Reprendre')
  t.is(campaignRequestResponseState(campaign, {status: 'DRAFT', canEdit: true, latestSubmissionAt: '2026-09-01'}, now).label, 'Modifications à transmettre')
  t.is(campaignRequestResponseState(campaign, {status: 'SUBMITTED', canEdit: true}, now).label, 'Transmis')
  t.false(campaignRequestResponseState(campaign, {status: 'SUBMITTED', canEdit: true}, now).actionable)
  t.is(campaignRequestResponseState(campaign, null, now).action, 'Consulter')
})

test('la fenêtre fermée reste consultable, une réouverture autorisée permet de reprendre', t => {
  const closed = {...campaign, status: 'CLOSED'}
  t.is(campaignRequestResponseState(closed, {status: 'DRAFT', canEdit: false}, now).label, 'Non transmis — saisie terminée')
  t.true(campaignRequestResponseState(closed, {status: 'DRAFT', canEdit: true}, now).actionable)
  t.is(campaignRequestResponseState({...campaign, opensAt: '2027-01-01'}, {canEdit: false}, now).label, 'À venir')
  t.is(campaignRequestResponseState({...campaign, closesAt: '2026-09-01'}, {canEdit: false}, now).label, 'Non transmis — saisie terminée')
  t.is(campaignRequestResponseState(campaign, {status: 'DRAFT', canEdit: false}, now).label, 'Consultation uniquement')
})

test('une demande reste à compléter tant qu’un seul de ses deux volets l’est', t => {
  const item = {campaign, responses: {INDEX: {status: 'SUBMITTED', canEdit: true}, NEEDS: {canEdit: true}}}
  t.true(campaignRequestHasAction(item, now))
  t.false(campaignRequestHasAction({...item, responses: {INDEX: {status: 'SUBMITTED'}, NEEDS: {canEdit: false}}}, now))
})

test('les pages sont réunies sans perdre ni dupliquer les demandes de différents préleveurs', t => {
  const first = {campaign, preleveur: {userId: 'a'}, pointCount: 1}
  const second = {campaign, preleveur: {userId: 'b'}, pointCount: 3}
  const updated = {...first, pointCount: 2}
  t.deepEqual(mergeCampaignRequests([first], [updated, second]), [updated, second])
  t.is(first.pointCount, 1)
})

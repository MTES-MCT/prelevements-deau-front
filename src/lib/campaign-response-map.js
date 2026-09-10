import {campaignPointName} from './collection-campaigns.js'

// Use campaign target identities, not physical point IDs: map selection must
// always lead to the row in the current, permission-filtered response.
export function campaignResponseMapPoints(targets) {
  return targets.flatMap(target => {
    const geometry = target.pointPrelevement?.coordinates
    if (geometry?.type !== 'Point' || !Array.isArray(geometry.coordinates) || geometry.coordinates.length < 2) {
      return []
    }

    const [longitude, latitude] = geometry.coordinates
    if (!Number.isFinite(longitude) || !Number.isFinite(latitude) || Math.abs(longitude) > 180 || Math.abs(latitude) > 90) {
      return []
    }

    return [{id: target.id, name: campaignPointName(target), coordinates: {type: 'Point', coordinates: [longitude, latitude]}}]
  })
}

export const IGN_RASTER_MAX_ZOOM = 19
export const DEFAULT_MAPLIBRE_MAX_ZOOM = 22

const IGN_RASTER_STYLES = new Set(['plan-ign', 'photo', 'orthophoto'])

export function getMapMaxZoomForStyle(style) {
  return IGN_RASTER_STYLES.has(style) ? IGN_RASTER_MAX_ZOOM : DEFAULT_MAPLIBRE_MAX_ZOOM
}

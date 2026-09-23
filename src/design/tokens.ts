export const palette = {
  kolostrum: '#D9A62E',
  onsut: '#EEF3F6',
  murekkep: '#1E3440',
  adacayi: '#8FA89A',
  alacakaranlik: '#6F6A8A',
  mese: '#B08D64',
  // Material tokens: never used for text or UI, only for 3D surfaces.
  ceviz: '#4A3326', // walnut print frames
  isik: '#FFF6E6', // warm fill light for PBR frames
  kirikBeyaz: '#ECE9E2', // classroom wall plaster
  korumaBandi: '#C9CDCF', // scuff-proof paint on the lower wall
  tavan: '#F1F1EE', // suspended ceiling tiles
  ledIsik: '#F5F8FF', // LED panel light
  laminat: '#D9CDB8', // desk tops, light beech laminate
  metal: '#4E555B', // desk and chair frames
  kabuk: '#35536B', // chair shells, blue-grey plastic
  beyazTahta: '#F6F7F7', // whiteboard surface
  aluminyum: '#B7BCC0', // board frame, screen housing
  mantar: '#B08A5B', // cork board
  perde: '#F2F2EF', // projection screen fabric
  radyator: '#E6E6E3', // panel radiators
  kapi: '#9C7B58', // wood-laminate classroom door
  sise: '#CFE2EA', // water bottles left on desks
  kagit: '#F4F1EA', // notebook paper edges
  stor: '#DCD6C8', // roller blind fabric
  alarm: '#C7362E', // fire alarm call point, red marker cap
  kalemMavi: '#2F5E9E', // blue marker cap
  // The demonstration corner: what makes the room a breastfeeding class rather than any classroom.
  dosemelik: '#9FB3A8', // nursing chair upholstery
  yastik: '#EFE6D6', // C-shaped nursing pillow
  bebekTeni: '#E5C6AA', // teaching doll, vinyl
  kundak: '#DCE6EC', // swaddle and blankets
  sut: '#FAF7F0', // expressed milk in the demo bottles
  hasir: '#C6B293', // bassinet basket
} as const

export type WallTone = 'kirikBeyaz'

<script setup lang="ts">
definePageMeta({ ssr: false })

type GeoSouvenir = {
  id: number
  title: string
  emoji: string
  date: string
  lieu: string
  lat: number
  lng: number
  cover: string | null
}

type Cluster = {
  key: string
  lat: number
  lng: number
  items: GeoSouvenir[]
}

const container = ref<HTMLElement | null>(null)
const souvenirs = ref<GeoSouvenir[]>([])
const loading = ref(true)
const selected = ref<Cluster | null>(null)
const altitude = ref(2.2)

let globe: any = null
let resizeObs: ResizeObserver | null = null
let rotateTimer: any = null
let povTimer: any = null

// Grid size in degrees, derived from camera altitude.
// Zoomed out (altitude high) -> coarse buckets, pins merge.
// Zoomed in (altitude low) -> fine buckets, pins split apart.
function gridForAltitude(alt: number) {
  if (alt > 2) return 12
  if (alt > 1.2) return 5
  if (alt > 0.6) return 1.5
  if (alt > 0.3) return 0.4
  return 0.05
}

const clusters = computed<Cluster[]>(() => {
  const grid = gridForAltitude(altitude.value)
  const map = new Map<string, Cluster>()
  for (const s of souvenirs.value) {
    const gx = Math.round(s.lat / grid) * grid
    const gy = Math.round(s.lng / grid) * grid
    const key = `${gx.toFixed(3)},${gy.toFixed(3)}`
    let c = map.get(key)
    if (!c) {
      // Centroid is computed from members so the pin sits on the actual data,
      // not on the grid corner.
      c = { key, lat: 0, lng: 0, items: [] }
      map.set(key, c)
    }
    c.items.push(s)
  }
  for (const c of map.values()) {
    let lat = 0, lng = 0
    for (const s of c.items) { lat += s.lat; lng += s.lng }
    c.lat = lat / c.items.length
    c.lng = lng / c.items.length
  }
  return [...map.values()]
})

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

function buildPin(cluster: Cluster) {
  const el = document.createElement('div')
  el.className = 'globe-pin'
  const inner = document.createElement('div')
  inner.className = 'globe-pin-inner'
  inner.textContent = cluster.items[0].emoji
  el.appendChild(inner)
  if (cluster.items.length > 1) {
    const badge = document.createElement('span')
    badge.className = 'globe-pin-count'
    badge.textContent = String(cluster.items.length)
    el.appendChild(badge)
  }
  el.addEventListener('click', (e) => {
    e.stopPropagation()
    selected.value = cluster
    if (globe) {
      const dist = globe.pointOfView().altitude
      globe.pointOfView({ lat: cluster.lat, lng: cluster.lng, altitude: Math.min(dist, 1.6) }, 900)
    }
  })
  return el
}

async function init() {
  if (!container.value) return
  const [{ default: Globe }, geoRes] = await Promise.all([
    import('globe.gl'),
    fetch('/data/countries.geojson').then(r => r.json())
  ])

  globe = new Globe(container.value, { animateIn: true })
    .backgroundColor('rgba(0,0,0,0)')
    .showAtmosphere(true)
    .atmosphereColor('#FF6F87')
    .atmosphereAltitude(0.2)
    .showGlobe(true)
    .showGraticules(false)
    .polygonsData(geoRes.features)
    .polygonCapColor(() => 'rgba(255, 182, 193, 0.55)')
    .polygonSideColor(() => 'rgba(255, 111, 135, 0.25)')
    .polygonStrokeColor(() => 'rgba(214, 49, 90, 0.45)')
    .polygonAltitude(0.006)
    .htmlElementsData(clusters.value)
    .htmlElement((d: any) => buildPin(d as Cluster))
    .htmlAltitude(0.018)
    .htmlElementVisibilityModifier((el: HTMLElement, isVisible: boolean) => {
      el.style.opacity = isVisible ? '1' : '0'
      el.style.pointerEvents = isVisible ? 'auto' : 'none'
    })

  // Solid pastel "ocean" sphere instead of satellite imagery
  const mat = globe.globeMaterial()
  mat.color?.set?.('#FFE5DC')
  mat.emissive?.set?.('#FFD6E0')
  if ('emissiveIntensity' in mat) mat.emissiveIntensity = 0.15
  if ('shininess' in mat) mat.shininess = 6

  // Initial view: roughly Europe
  globe.pointOfView({ lat: 46, lng: 5, altitude: 2.2 }, 0)

  // Gentle auto-rotate, pause on interaction
  const controls = globe.controls()
  controls.autoRotate = true
  controls.autoRotateSpeed = 0.35
  controls.enableDamping = true
  const stopRotate = () => {
    controls.autoRotate = false
    if (rotateTimer) clearTimeout(rotateTimer)
    rotateTimer = setTimeout(() => { controls.autoRotate = true }, 6000)
  }
  container.value.addEventListener('pointerdown', stopRotate)

  // Track camera distance to recluster pins by zoom level
  controls.addEventListener('change', () => {
    if (povTimer) return
    povTimer = setTimeout(() => {
      povTimer = null
      const pov = globe.pointOfView()
      if (Math.abs(pov.altitude - altitude.value) > 0.05) {
        altitude.value = pov.altitude
      }
    }, 120)
  })

  resizeObs = new ResizeObserver(() => {
    if (!container.value) return
    globe.width(container.value.clientWidth).height(container.value.clientHeight)
  })
  resizeObs.observe(container.value)
  globe.width(container.value.clientWidth).height(container.value.clientHeight)
}

watch(clusters, (val) => {
  if (globe) globe.htmlElementsData(val)
})

onMounted(async () => {
  try {
    const res: any = await $fetch('/api/souvenirs/geo')
    souvenirs.value = res.items
  } finally {
    loading.value = false
  }
  await init()
})

onBeforeUnmount(() => {
  if (rotateTimer) clearTimeout(rotateTimer)
  if (povTimer) clearTimeout(povTimer)
  resizeObs?.disconnect()
  if (globe?._destructor) globe._destructor()
})
</script>

<template>
  <div class="carte-page">
    <div ref="container" class="globe-container" />

    <header class="carte-header">
      <NuxtLink to="/souvenirs" class="icon-btn" aria-label="Retour">←</NuxtLink>
      <h1 class="h-serif text-xl">Notre carte</h1>
      <div class="w-10" />
    </header>

    <div v-if="loading" class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
      <span class="inline-block w-8 h-8 border-2 border-white/60 border-t-accent rounded-full animate-spin" />
      <p class="text-sm text-muted mt-3">Chargement de la carte…</p>
    </div>

    <div v-else-if="!souvenirs.length" class="absolute inset-x-0 bottom-24 px-5 pointer-events-none">
      <div class="card-frosted p-5 text-center mx-auto max-w-sm">
        <p class="text-3xl mb-2">🗺️</p>
        <p class="text-sm text-muted">
          Aucun souvenir géolocalisé.<br>
          Ajoute un lieu à tes souvenirs pour les voir apparaître ici.
        </p>
      </div>
    </div>

    <Transition name="slide-up">
      <div v-if="selected" class="carte-sheet" @click.self="selected = null">
        <div class="card-frosted p-4 mx-4 mb-6">
          <div class="flex items-center justify-between mb-3">
            <div class="min-w-0">
              <p class="eyebrow truncate">📍 {{ selected.items[0].lieu }}</p>
              <p class="text-xs text-muted mt-0.5">
                {{ selected.items.length }} souvenir{{ selected.items.length > 1 ? 's' : '' }} ici
              </p>
            </div>
            <button @click="selected = null" class="icon-btn flex-shrink-0" aria-label="Fermer">✕</button>
          </div>
          <div class="flex gap-3 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1 snap-x snap-mandatory">
            <article
              v-for="s in selected.items"
              :key="s.id"
              class="flex-shrink-0 w-56 snap-center bg-white/70 rounded-tile overflow-hidden border border-white/80"
            >
              <div class="relative aspect-[4/5] bg-white/40">
                <img v-if="s.cover" :src="s.cover" class="absolute inset-0 w-full h-full object-cover">
                <div v-else class="absolute inset-0 bg-gradient-primary flex items-center justify-center text-4xl">
                  {{ s.emoji }}
                </div>
                <div class="absolute top-2 left-2 w-9 h-9 rounded-full bg-white/90 flex items-center justify-center text-lg shadow-card">
                  {{ s.emoji }}
                </div>
              </div>
              <div class="p-3 space-y-2">
                <h3 class="h-serif text-base leading-tight line-clamp-2">{{ s.title }}</h3>
                <p class="text-[11px] text-muted">{{ fmtDate(s.date) }}</p>
                <NuxtLink
                  :to="`/souvenirs/${s.id}`"
                  class="btn bg-gradient-primary text-white w-full py-2 rounded-full text-xs shadow-cta"
                >
                  Voir les photos →
                </NuxtLink>
              </div>
            </article>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style>
.carte-page {
  position: fixed;
  inset: 0;
  overflow: hidden;
  background: linear-gradient(180deg, #FFE5DC 0%, #FFD6E0 50%, #FBC8E0 100%);
}
.globe-container {
  position: absolute;
  inset: 0;
}
.globe-container canvas {
  display: block;
}
.carte-header {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  padding: calc(env(safe-area-inset-top) + 1rem) 1.25rem 0.75rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  z-index: 10;
  pointer-events: none;
}
.carte-header > * { pointer-events: auto; }

.globe-pin {
  position: relative;
  cursor: pointer;
  pointer-events: auto;
  transform: translate(-50%, -100%);
  filter: drop-shadow(0 4px 8px rgba(214, 49, 90, 0.4));
  transition: transform 0.15s ease;
  z-index: 5;
}
.globe-pin * { pointer-events: auto; }
.globe-pin:hover {
  transform: translate(-50%, -100%) scale(1.15);
}
.globe-pin-inner {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #FF6F87, #A56CC1);
  border: 2px solid #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  line-height: 1;
}
.globe-pin-inner::after {
  content: '';
  position: absolute;
  bottom: -6px;
  left: 50%;
  transform: translateX(-50%) rotate(45deg);
  width: 10px;
  height: 10px;
  background: #A56CC1;
  border-right: 2px solid #fff;
  border-bottom: 2px solid #fff;
}
.globe-pin-count {
  position: absolute;
  top: -6px;
  right: -8px;
  background: #fff;
  color: #D6315A;
  font-size: 10px;
  font-weight: 700;
  border-radius: 999px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 6px rgba(214, 49, 90, 0.3);
}

.carte-sheet {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: flex-end;
  z-index: 20;
  pointer-events: none;
}
.carte-sheet > * { pointer-events: auto; width: 100%; }

.slide-up-enter-active, .slide-up-leave-active { transition: transform 0.3s ease, opacity 0.3s ease; }
.slide-up-enter-from, .slide-up-leave-to { transform: translateY(20px); opacity: 0; }
</style>

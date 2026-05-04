<script setup lang="ts">
type Souvenir = {
  id: number
  title: string
  emoji: string
  date: string
  lieu: string | null
  photos: string[]
}

const PAGE_SIZE = 10

const view = ref<'list' | 'calendar'>('list')

const items = ref<Souvenir[]>([])
const offset = ref(0)
const total = ref<number | null>(null)
const loading = ref(false)
const initialLoading = ref(true)

const allLoaded = computed(() => total.value != null && items.value.length >= total.value)

async function loadMore() {
  if (loading.value || allLoaded.value) return
  loading.value = true
  try {
    const res: any = await $fetch('/api/souvenirs', { query: { limit: PAGE_SIZE, offset: offset.value } })
    items.value.push(...res.items)
    offset.value = res.nextOffset
    total.value = res.total
  } finally {
    loading.value = false
    initialLoading.value = false
  }
}

const sentinel = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null

onMounted(() => {
  loadMore()
  observer = new IntersectionObserver((entries) => {
    if (entries[0]?.isIntersecting) loadMore()
  }, { rootMargin: '300px' })
  watchEffect((onCleanup) => {
    if (sentinel.value && observer) {
      observer.observe(sentinel.value)
      onCleanup(() => observer && sentinel.value && observer.unobserve(sentinel.value))
    }
  })
})

onBeforeUnmount(() => observer?.disconnect())

const calendarItems = ref<Souvenir[] | null>(null)
const calendarLoading = ref(false)
async function ensureCalendarData() {
  if (calendarItems.value || calendarLoading.value) return
  calendarLoading.value = true
  try {
    const res: any = await $fetch('/api/souvenirs')
    calendarItems.value = res.items
  } finally {
    calendarLoading.value = false
  }
}
watch(view, (v) => { if (v === 'calendar') ensureCalendarData() })

const groupedByMonth = computed(() => {
  const groups: { key: string; label: string; items: Souvenir[] }[] = []
  for (const s of items.value) {
    const d = new Date(s.date)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    let g = groups.find(g => g.key === key)
    if (!g) { g = { key, label, items: [] }; groups.push(g) }
    g.items.push(s)
  }
  return groups
})

const monthCursor = ref(new Date())
const monthLabel = computed(() =>
  monthCursor.value.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
)

const calendarDays = computed(() => {
  const list = calendarItems.value || []
  const year = monthCursor.value.getFullYear()
  const month = monthCursor.value.getMonth()
  const first = new Date(year, month, 1)
  const last = new Date(year, month + 1, 0)
  const startWeekday = (first.getDay() + 6) % 7
  const days: { date: Date | null; key: string; iso?: string; souvenirs: Souvenir[] }[] = []
  for (let i = 0; i < startWeekday; i++) days.push({ date: null, key: `e-${i}`, souvenirs: [] })
  for (let d = 1; d <= last.getDate(); d++) {
    const date = new Date(year, month, d)
    const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    const dayS = list.filter(s => s.date === iso)
    days.push({ date, key: iso, iso, souvenirs: dayS })
  }
  return days
})

function shiftMonth(delta: number) {
  monthCursor.value = new Date(monthCursor.value.getFullYear(), monthCursor.value.getMonth() + delta, 1)
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}
</script>

<template>
  <div class="min-h-screen px-5 pt-10 pb-10">
    <header class="flex items-center justify-between mb-2">
      <NuxtLink to="/" class="icon-btn" aria-label="Retour">←</NuxtLink>
      <h1 class="h-serif text-2xl">Nos souvenirs</h1>
      <div class="flex items-center gap-2">
        <NuxtLink to="/carte" class="icon-btn" aria-label="Voir la carte">🌍</NuxtLink>
        <NuxtLink
          to="/souvenirs/new"
          class="w-10 h-10 rounded-full bg-gradient-primary text-white flex items-center justify-center text-xl font-light shadow-cta active:scale-95"
          aria-label="Ajouter un souvenir"
        >+</NuxtLink>
      </div>
    </header>
    <p class="text-center text-sm text-muted mb-5">
      <span v-if="total != null">{{ total }} moment{{ total > 1 ? 's' : '' }} précieux</span>
    </p>

    <div class="flex gap-1 mb-6 bg-white/50 backdrop-blur-md rounded-full p-1 border border-white/80">
      <button
        @click="view = 'list'"
        :class="['flex-1 py-2.5 rounded-full text-sm font-semibold transition', view === 'list' ? 'bg-gradient-primary text-white shadow-cta' : 'text-muted']"
      >Liste</button>
      <button
        @click="view = 'calendar'"
        :class="['flex-1 py-2.5 rounded-full text-sm font-semibold transition', view === 'calendar' ? 'bg-gradient-primary text-white shadow-cta' : 'text-muted']"
      >Calendrier</button>
    </div>

    <!-- Liste -->
    <div v-if="view === 'list'">
      <div v-if="initialLoading" class="flex flex-col items-center justify-center py-16 gap-3">
        <span class="inline-block w-8 h-8 border-2 border-white/60 border-t-accent rounded-full animate-spin" />
        <p class="text-sm text-muted">Chargement des souvenirs…</p>
      </div>

      <div v-else-if="!items.length" class="text-center text-muted py-12">
        <p class="text-4xl mb-3">💕</p>
        <p>Aucun souvenir pour l'instant.<br>Ajoute le premier !</p>
      </div>

      <template v-else>
        <section v-for="g in groupedByMonth" :key="g.key" class="mb-6">
          <h2 class="eyebrow flex items-center gap-2 mb-3 capitalize">
            <span>💗</span>{{ g.label }}
          </h2>
          <div class="space-y-3">
            <NuxtLink
              v-for="s in g.items"
              :key="s.id"
              :to="`/souvenirs/${s.id}`"
              class="card-frosted flex gap-3 p-3 active:scale-[0.98] transition"
            >
              <div class="w-20 h-20 rounded-tile overflow-hidden bg-white/50 flex-shrink-0">
                <img v-if="s.photos[0]" :src="s.photos[0]" class="w-full h-full object-cover">
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <span class="text-xl">{{ s.emoji }}</span>
                  <h3 class="h-serif text-lg truncate">{{ s.title }}</h3>
                </div>
                <p class="text-xs text-muted mt-0.5">{{ fmtDate(s.date) }}</p>
                <div class="flex items-center gap-2 mt-1.5">
                  <span v-if="s.lieu" class="pill bg-gradient-warm text-white">{{ s.lieu }}</span>
                  <span class="text-[11px] text-muted">· {{ s.photos.length }} photo{{ s.photos.length > 1 ? 's' : '' }}</span>
                </div>
              </div>
            </NuxtLink>
          </div>
        </section>

        <div ref="sentinel" class="h-4" />

        <div v-if="loading && !initialLoading" class="flex justify-center py-4">
          <span class="inline-block w-6 h-6 border-2 border-white/60 border-t-accent rounded-full animate-spin" />
        </div>

        <p v-else-if="allLoaded && items.length > PAGE_SIZE" class="text-center text-xs text-muted py-4">
          Tu as tout vu ✨
        </p>
      </template>
    </div>

    <!-- Calendrier -->
    <div v-else>
      <div class="card-frosted p-3 mb-3 flex items-center justify-between">
        <button @click="shiftMonth(-1)" class="w-9 h-9 rounded-full hover:bg-white/40">‹</button>
        <span class="h-serif text-lg capitalize">{{ monthLabel }}</span>
        <button @click="shiftMonth(1)" class="w-9 h-9 rounded-full hover:bg-white/40">›</button>
      </div>

      <div v-if="calendarLoading && !calendarItems" class="flex justify-center py-12">
        <span class="inline-block w-8 h-8 border-2 border-white/60 border-t-accent rounded-full animate-spin" />
      </div>

      <template v-else>
        <div class="grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-[1px] text-muted mb-2">
          <div v-for="(d, i) in ['L','M','M','J','V','S','D']" :key="i">{{ d }}</div>
        </div>
        <div class="grid grid-cols-7 gap-1.5">
          <div v-for="cell in calendarDays" :key="cell.key" class="aspect-square">
            <NuxtLink
              v-if="cell.date && cell.souvenirs.length"
              :to="`/souvenirs/${cell.souvenirs[0].id}`"
              class="relative w-full h-full rounded-tile overflow-hidden flex items-center justify-center text-white shadow-card"
            >
              <img
                v-if="cell.souvenirs[0].photos[0]"
                :src="cell.souvenirs[0].photos[0]"
                class="absolute inset-0 w-full h-full object-cover"
              >
              <div class="absolute inset-0 bg-gradient-primary/70" />
              <div class="relative flex flex-col items-center">
                <span class="text-xs font-bold">{{ cell.date.getDate() }}</span>
                <span class="text-base leading-none">{{ cell.souvenirs[0].emoji }}</span>
              </div>
            </NuxtLink>
            <div
              v-else-if="cell.date"
              class="w-full h-full rounded-tile bg-white/40 flex items-center justify-center text-xs text-muted"
            >
              {{ cell.date.getDate() }}
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

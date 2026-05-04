<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const { data: s } = useFetch<any>(() => `/api/souvenirs/${route.params.id}`, { lazy: true, server: false })

const current = ref(0)
const scroller = ref<HTMLElement | null>(null)
const showConfirm = ref(false)
const deleting = ref(false)

function onScroll() {
  const el = scroller.value
  if (!el) return
  const i = Math.round(el.scrollLeft / el.clientWidth)
  if (i !== current.value) current.value = i
}

function goTo(i: number) {
  const el = scroller.value
  if (!el) return
  el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' })
}

async function confirmDelete() {
  if (!s.value) return
  deleting.value = true
  try {
    await $fetch(`/api/souvenirs/${s.value.id}`, { method: 'DELETE' })
    router.replace('/souvenirs')
  } catch {
    deleting.value = false
    showConfirm.value = false
  }
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}
</script>

<template>
  <div v-if="s" class="min-h-screen px-5 pt-10 pb-10">
    <header class="flex items-center justify-between mb-6">
      <NuxtLink to="/souvenirs" class="icon-btn" aria-label="Retour">←</NuxtLink>
      <div class="flex gap-2">
        <NuxtLink :to="`/souvenirs/${route.params.id}/edit`" class="icon-btn" aria-label="Modifier">✏️</NuxtLink>
        <button @click="showConfirm = true" class="icon-btn" aria-label="Supprimer">🗑</button>
      </div>
    </header>

    <div class="flex items-center gap-3 mb-3">
      <span v-if="s.lieu" class="pill bg-gradient-warm text-white">{{ s.lieu }}</span>
      <span class="text-xs text-muted">{{ fmtDate(s.date) }}</span>
    </div>

    <h1 class="h-serif text-3xl mb-5 flex items-center gap-2">
      <span>{{ s.emoji }}</span>
      <span>{{ s.title }}</span>
    </h1>

    <div class="relative rounded-photo overflow-hidden shadow-photo bg-white/40 mb-4">
      <div
        ref="scroller"
        @scroll.passive="onScroll"
        class="flex overflow-x-auto snap-x snap-mandatory scroll-smooth no-scrollbar aspect-[4/5]"
      >
        <div
          v-for="(p, i) in s.photos"
          :key="i"
          class="snap-center shrink-0 w-full h-full flex items-center justify-center"
        >
          <img :src="p" class="w-full h-full object-cover" :alt="`Photo ${i + 1}`">
        </div>
      </div>
      <div v-if="s.photos.length > 1" class="absolute bottom-3 right-3 bg-black/40 backdrop-blur-md text-white text-xs font-semibold px-2.5 py-1 rounded-full">
        {{ current + 1 }} / {{ s.photos.length }}
      </div>
    </div>

    <div v-if="s.photos.length > 1" class="flex flex-wrap justify-center gap-2 pb-2">
      <button
        v-for="(p, i) in s.photos"
        :key="i"
        @click="goTo(i)"
        :class="['w-16 h-16 rounded-tile overflow-hidden transition-all shadow-card', current === i ? 'ring-2 ring-accent opacity-100 scale-105' : 'opacity-50']"
      >
        <img :src="p" class="w-full h-full object-cover">
      </button>
    </div>

    <Teleport to="body">
      <div
        v-if="showConfirm"
        class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm"
        @click.self="showConfirm = false"
      >
        <div class="bg-white rounded-t-3xl sm:rounded-card w-full max-w-md p-6 shadow-2xl">
          <div class="text-4xl text-center mb-3">🗑️</div>
          <h3 class="h-serif text-xl text-center mb-1">Supprimer ce souvenir ?</h3>
          <p class="text-sm text-muted text-center mb-6">
            « {{ s.title }} » sera supprimé définitivement, ainsi que ses photos.
          </p>
          <div class="flex gap-3">
            <button @click="showConfirm = false" :disabled="deleting" class="btn-soft flex-1">Annuler</button>
            <button
              @click="confirmDelete"
              :disabled="deleting"
              class="btn flex-1 bg-gradient-primary text-white px-5 py-3 rounded-full shadow-cta disabled:opacity-50"
            >{{ deleting ? '…' : 'Supprimer' }}</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>

  <div v-else class="min-h-screen flex items-center justify-center">
    <span class="inline-block w-8 h-8 border-2 border-white/60 border-t-accent rounded-full animate-spin" />
  </div>
</template>

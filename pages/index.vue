<script setup lang="ts">
const { counter } = useCounter()
const { data: random, refresh } = useFetch<{ path: string | null; souvenir?: any }>('/api/random-photo', {
  default: () => ({ path: null }),
  lazy: true,
  server: false
})

const startDateLabel = '10·10·2024'
</script>

<template>
  <div class="min-h-screen flex flex-col px-5 pt-10 pb-8">
    <header class="flex items-center gap-3 mb-6">
      <img src="/logo-256.png" alt="Notre Histoire" class="w-11 h-11 rounded-full shadow-card">
      <span class="h-serif text-xl">Notre Histoire</span>
    </header>

    <!-- Photo aléatoire -->
    <div class="relative mb-10">
      <div class="relative aspect-[4/5] rounded-photo overflow-hidden shadow-photo bg-white/40">
        <img
          v-if="random?.path"
          :src="random.path"
          class="absolute inset-0 w-full h-full object-cover"
          alt="Souvenir aléatoire"
        >
        <div v-else class="absolute inset-0 flex items-center justify-center text-white/70 text-6xl bg-gradient-primary">
          💕
        </div>

        <button
          v-if="random?.path"
          @click="refresh()"
          class="absolute top-4 right-4 icon-btn"
          aria-label="Photo suivante"
        >✨</button>

        <div class="absolute inset-x-0 bottom-0 p-5 bg-gradient-to-t from-black/60 to-transparent text-white">
          <p class="text-[10px] uppercase tracking-[2px] font-semibold opacity-90">
            {{ random?.souvenir ? new Date(random.souvenir.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '' }}
          </p>
          <h2 v-if="random?.souvenir" class="h-serif text-3xl mt-1">{{ random.souvenir.title }}</h2>
        </div>
      </div>

      <ClientOnly>
        <div class="absolute left-1/2 -translate-x-1/2 -bottom-4 bg-gradient-warm text-white rounded-full px-5 py-2 shadow-badge text-sm font-semibold flex items-center gap-2 whitespace-nowrap">
          <span>💗</span>
          <span><span class="font-bold">{{ counter.days }}</span> jours ensemble</span>
        </div>
      </ClientOnly>
    </div>

    <!-- Compteur -->
    <ClientOnly>
      <div class="card-frosted p-5 mb-6">
        <div class="flex items-start justify-between mb-3">
          <div>
            <p class="label">Depuis le {{ startDateLabel }}</p>
            <p class="h-serif text-xl mt-1">
              {{ counter.years }} an{{ counter.years > 1 ? 's' : '' }},
              {{ counter.months }} mois,
              {{ counter.dayOfMonth }} jour{{ counter.dayOfMonth > 1 ? 's' : '' }}
            </p>
          </div>
          <div class="w-10 h-10 rounded-full bg-gradient-warm flex items-center justify-center text-white shadow-card">
            ✨
          </div>
        </div>
        <div class="grid grid-cols-3 gap-2">
          <div class="bg-gradient-warm text-white rounded-tile px-3 py-3 text-center">
            <div class="text-2xl font-bold tabular-nums leading-none">{{ String(counter.hours).padStart(2, '0') }}</div>
            <div class="text-[10px] uppercase tracking-[1.5px] mt-1 opacity-90">H</div>
          </div>
          <div class="bg-gradient-cool text-white rounded-tile px-3 py-3 text-center">
            <div class="text-2xl font-bold tabular-nums leading-none">{{ String(counter.minutes).padStart(2, '0') }}</div>
            <div class="text-[10px] uppercase tracking-[1.5px] mt-1 opacity-90">Min</div>
          </div>
          <div class="bg-gradient-deep text-white rounded-tile px-3 py-3 text-center">
            <div class="text-2xl font-bold tabular-nums leading-none">{{ String(counter.seconds).padStart(2, '0') }}</div>
            <div class="text-[10px] uppercase tracking-[1.5px] mt-1 opacity-90">Sec</div>
          </div>
        </div>
      </div>
      <template #fallback>
        <div class="card-frosted p-5 mb-6 h-[180px]" />
      </template>
    </ClientOnly>

    <NuxtLink to="/souvenirs" class="btn-primary w-full">
      Découvrir nos souvenirs
      <span>→</span>
    </NuxtLink>
  </div>
</template>

<script setup lang="ts">
import 'vue3-emoji-picker/css'

const EmojiPicker = defineAsyncComponent(() => import('vue3-emoji-picker'))
const route = useRoute()
const router = useRouter()

const { data: s } = useFetch<any>(() => `/api/souvenirs/${route.params.id}`, { lazy: true, server: false })

const title = ref('')
const emoji = ref('💖')
const date = ref('')
const lieu = ref('')
const existingPhotos = ref<string[]>([])
const newFiles = ref<File[]>([])
const newPreviews = ref<string[]>([])
const submitting = ref(false)
const error = ref('')
const showPicker = ref(false)

watch(s, (val) => {
  if (!val) return
  title.value = val.title
  emoji.value = val.emoji
  date.value = val.date
  lieu.value = val.lieu || ''
  existingPhotos.value = [...val.photos]
}, { immediate: true })

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  if (!input.files) return
  const list = Array.from(input.files)
  newFiles.value = [...newFiles.value, ...list]
  for (const f of list) newPreviews.value.push(URL.createObjectURL(f))
  input.value = ''
}

function removeExisting(i: number) {
  existingPhotos.value.splice(i, 1)
}

function removeNew(i: number) {
  URL.revokeObjectURL(newPreviews.value[i])
  newFiles.value.splice(i, 1)
  newPreviews.value.splice(i, 1)
}

function onSelectEmoji(e: any) {
  emoji.value = e.i || e.native || '💖'
  showPicker.value = false
}

async function submit() {
  error.value = ''
  if (!title.value.trim()) return error.value = 'Donne un titre 💭'
  if (existingPhotos.value.length + newFiles.value.length === 0) return error.value = 'Garde ou ajoute au moins une photo 📷'

  submitting.value = true
  try {
    const fd = new FormData()
    fd.append('title', title.value)
    fd.append('emoji', emoji.value)
    fd.append('date', date.value)
    if (lieu.value.trim()) fd.append('lieu', lieu.value.trim())
    for (const p of existingPhotos.value) fd.append('keepPhotos', p)
    for (const f of newFiles.value) fd.append('photos', f)
    await $fetch(`/api/souvenirs/${route.params.id}`, { method: 'PUT', body: fd })
    router.replace(`/souvenirs/${route.params.id}`)
  } catch (e: any) {
    error.value = e?.statusMessage || e?.message || 'Une erreur est survenue'
    submitting.value = false
  }
}
</script>

<template>
  <div class="min-h-screen px-5 pt-10 pb-32">
    <header class="flex items-center justify-between mb-6">
      <NuxtLink :to="`/souvenirs/${route.params.id}`" class="icon-btn" aria-label="Retour">←</NuxtLink>
      <h1 class="h-serif text-2xl">Modifier</h1>
      <div class="w-10" />
    </header>

    <div v-if="!s" class="flex justify-center py-16">
      <span class="inline-block w-8 h-8 border-2 border-white/60 border-t-accent rounded-full animate-spin" />
    </div>

    <form v-else @submit.prevent="submit" class="space-y-5">
      <div>
        <label class="label block mb-2">Titre</label>
        <input v-model="title" class="input" placeholder="Notre première soirée…" maxlength="80">
      </div>

      <div>
        <label class="label block mb-2">Emoji</label>
        <button
          type="button"
          @click="showPicker = !showPicker"
          class="card-frosted w-full p-3 flex items-center gap-3 active:scale-[0.99] transition"
        >
          <div class="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center text-2xl shadow-card">
            {{ emoji }}
          </div>
          <span class="text-sm text-muted">{{ showPicker ? 'Fermer' : 'Choisir un emoji' }}</span>
          <span class="ml-auto text-muted">{{ showPicker ? '▲' : '▼' }}</span>
        </button>
        <ClientOnly>
          <div v-if="showPicker" class="mt-3 rounded-input overflow-hidden">
            <EmojiPicker
              :native="true"
              :hide-search="false"
              :disable-skin-tones="true"
              @select="onSelectEmoji"
            />
          </div>
        </ClientOnly>
      </div>

      <div>
        <label class="label block mb-2">Date</label>
        <input v-model="date" type="date" class="input">
      </div>

      <div>
        <label class="label block mb-2">Lieu / Tag <span class="text-muted/70 normal-case tracking-normal text-xs">(optionnel)</span></label>
        <input v-model="lieu" class="input" placeholder="Lisbonne, Paris…" maxlength="60">
      </div>

      <div>
        <label class="label block mb-2">Photos</label>
        <div class="grid grid-cols-3 gap-2">
          <div v-for="(p, i) in existingPhotos" :key="'e-' + p" class="relative aspect-square rounded-tile overflow-hidden bg-white/40 shadow-card">
            <img :src="p" class="w-full h-full object-cover">
            <button
              type="button"
              @click="removeExisting(i)"
              class="absolute top-1 right-1 bg-white/90 text-accent-deep rounded-full w-6 h-6 text-xs font-bold shadow-card"
            >✕</button>
          </div>
          <div v-for="(p, i) in newPreviews" :key="'n-' + i" class="relative aspect-square rounded-tile overflow-hidden bg-white/40 shadow-card">
            <img :src="p" class="w-full h-full object-cover">
            <span class="absolute bottom-1 left-1 bg-accent text-white text-[9px] uppercase tracking-widest font-bold px-1.5 rounded-full">Nouveau</span>
            <button
              type="button"
              @click="removeNew(i)"
              class="absolute top-1 right-1 bg-white/90 text-accent-deep rounded-full w-6 h-6 text-xs font-bold shadow-card"
            >✕</button>
          </div>
          <label class="aspect-square rounded-tile border-2 border-dashed border-accent/50 flex items-center justify-center text-3xl text-accent cursor-pointer bg-white/40 hover:bg-white/60 transition">
            +
            <input type="file" accept="image/*" multiple class="hidden" @change="onFileChange">
          </label>
        </div>
      </div>

      <p v-if="error" class="text-sm text-accent-deep text-center">{{ error }}</p>

      <button type="submit" :disabled="submitting" class="btn-primary w-full disabled:opacity-50">
        {{ submitting ? 'Enregistrement…' : 'Enregistrer les modifications' }}
      </button>
    </form>
  </div>
</template>

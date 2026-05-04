const START_DATE = new Date('2024-10-10T00:00:00')

export function useCounter() {
  const now = ref(new Date())
  let timer: any

  onMounted(() => {
    timer = setInterval(() => { now.value = new Date() }, 1000)
  })
  onBeforeUnmount(() => { if (timer) clearInterval(timer) })

  const counter = computed(() => {
    const diffMs = now.value.getTime() - START_DATE.getTime()
    const totalSeconds = Math.max(0, Math.floor(diffMs / 1000))
    const days = Math.floor(totalSeconds / 86400)
    const hours = Math.floor((totalSeconds % 86400) / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60

    let years = now.value.getFullYear() - START_DATE.getFullYear()
    let months = now.value.getMonth() - START_DATE.getMonth()
    let dayDiff = now.value.getDate() - START_DATE.getDate()
    if (dayDiff < 0) {
      months -= 1
      const prev = new Date(now.value.getFullYear(), now.value.getMonth(), 0)
      dayDiff += prev.getDate()
    }
    if (months < 0) { years -= 1; months += 12 }

    return { days, hours, minutes, seconds, years, months, dayOfMonth: dayDiff }
  })

  return { counter, startDate: START_DATE }
}

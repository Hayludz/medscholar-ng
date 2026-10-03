import raw from '../data/scholarships.json'
import type { Dataset, Filters, Scholarship, Status } from '../types'

export const dataset = raw as unknown as Dataset

const DAY = 86_400_000

export function startOfToday(): number {
  const d = new Date()
  return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())
}

export function daysLeft(item: Scholarship, today = startOfToday()): number | null {
  if (!item.deadline) return null
  return Math.round((Date.parse(item.deadline) - today) / DAY)
}

export function statusOf(item: Scholarship, today = startOfToday()): Status {
  const d = daysLeft(item, today)
  if (d === null) return 'recurring'
  if (d < 0) return 'closed'
  return d <= 30 ? 'closing' : 'open'
}

/** Third-party titles use long dashes freely. Keep the UI plain. */
export function clean(s: string): string {
  return s.replace(/\s*[–—]\s*/g, ' - ').replace(/\s{2,}/g, ' ').trim()
}

/** Hand-picked programmes always outrank scraped listings; scraped ones rank by relevance score. */
export function fit(item: Scholarship): number {
  return (
    (item.kind === 'curated' ? 12 : 0) +
    (item.medical === 'specific' ? 2 : 0) +
    Math.min(item.score ?? 0, 8) +
    (item.funding === 'full' ? 1 : 0)
  )
}

export const destinations = Array.from(
  new Set(dataset.items.map((i) => i.destination).filter((d) => d && d !== 'Varies')),
).sort()

export function applyFilters(items: Scholarship[], f: Filters, saved: Set<string>): Scholarship[] {
  const today = startOfToday()
  const tokens = f.q.toLowerCase().split(/\s+/).filter(Boolean)

  const out = items.filter((i) => {
    const st = statusOf(i, today)
    if (!f.showClosed && st === 'closed') return false
    if (f.category !== 'all' && i.category !== f.category) return false
    if (f.remoteOnly && !i.remote) return false
    if (f.savedOnly && !saved.has(i.id)) return false
    if (f.fullOnly && i.funding !== 'full') return false
    if (f.medicalOnly && i.medical !== 'specific') return false
    if (f.levels.length && !f.levels.some((l) => i.level.includes(l))) return false
    if (f.destination && i.destination !== f.destination) return false
    if (tokens.length) {
      const hay = `${i.title} ${i.provider} ${i.summary} ${i.destination} ${i.tags.join(' ')}`.toLowerCase()
      if (!tokens.every((t) => hay.includes(t))) return false
    }
    return true
  })

  const byFit = (a: Scholarship, b: Scholarship) => fit(b) - fit(a)
  if (f.sort === 'newest') out.sort((a, b) => b.addedAt.localeCompare(a.addedAt) || byFit(a, b))
  else if (f.sort === 'match') out.sort(byFit)
  else {
    out.sort((a, b) => {
      const da = daysLeft(a, today)
      const db = daysLeft(b, today)
      const ca = da !== null && da < 0
      const cb = db !== null && db < 0
      if (ca !== cb) return ca ? 1 : -1
      if (da !== null && db !== null) return da - db
      if (da !== null) return -1
      if (db !== null) return 1
      return byFit(a, b)
    })
  }
  return out
}

export function formatDate(iso: string): string {
  return new Date(iso + 'T00:00:00Z').toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export function timeAgo(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000))
  if (mins < 2) return 'just now'
  if (mins < 60) return `${mins} minutes ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 36) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`
  const days = Math.round(hrs / 24)
  return `${days} days ago`
}

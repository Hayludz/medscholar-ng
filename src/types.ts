export type Level = 'masters' | 'phd' | 'fellowship' | 'research' | 'training'
export type Funding = 'full' | 'partial' | 'unknown'

export interface Scholarship {
  id: string
  title: string
  provider: string
  url: string
  level: Level[]
  funding: Funding
  destination: string
  medical: 'specific' | 'open'
  deadline: string | null
  window: string
  summary: string
  tags: string[]
  kind: 'curated' | 'feed'
  source: string
  addedAt: string
  score?: number
  linkStatus?: 'ok' | 'blocked' | 'broken' | 'unreachable'
  checkedAt?: string
}

export interface SourceStat {
  name: string
  ok: boolean
  scanned?: number
  matched?: number
}

export interface Dataset {
  meta: { generatedAt: string; total: number; curated: number; sources: SourceStat[] }
  items: Scholarship[]
}

export type Status = 'closing' | 'open' | 'recurring' | 'closed'

export type SortKey = 'soonest' | 'match' | 'newest'

export interface Filters {
  q: string
  levels: Level[]
  fullOnly: boolean
  medicalOnly: boolean
  showClosed: boolean
  savedOnly: boolean
  destination: string
  sort: SortKey
}

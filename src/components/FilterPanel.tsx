import { useId } from 'react'
import { MagnifyingGlass, X } from '@phosphor-icons/react'
import type { Filters, Level, SortKey } from '../types'

const LEVELS: { id: Level; label: string }[] = [
  { id: 'masters', label: "Master's" },
  { id: 'phd', label: 'PhD' },
  { id: 'fellowship', label: 'Fellowship' },
  { id: 'research', label: 'Research grant' },
]

const SORTS: { id: SortKey; label: string }[] = [
  { id: 'soonest', label: 'Closing soonest' },
  { id: 'match', label: 'Best match for you' },
  { id: 'newest', label: 'Recently added' },
]

export const DEFAULT_FILTERS: Filters = {
  q: '',
  levels: [],
  fullOnly: false,
  medicalOnly: false,
  showClosed: false,
  savedOnly: false,
  destination: '',
  sort: 'soonest',
}

interface Props {
  filters: Filters
  onChange: (f: Filters) => void
  destinations: string[]
  savedCount: number
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  const id = useId()
  return (
    <label htmlFor={id} className="flex min-h-11 cursor-pointer items-center gap-3 text-[0.95rem]">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-[18px] shrink-0 cursor-pointer accent-[var(--accent)]"
      />
      {label}
    </label>
  )
}

export function FilterPanel({ filters, onChange, destinations, savedCount }: Props) {
  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => onChange({ ...filters, [k]: v })
  const dirty = JSON.stringify({ ...filters, sort: 'soonest' }) !== JSON.stringify({ ...DEFAULT_FILTERS })
  const qId = useId()
  const sortId = useId()
  const destId = useId()

  return (
    <form role="search" onSubmit={(e) => e.preventDefault()} className="grid gap-6">
      <div>
        <label htmlFor={qId} className="mb-2 block text-sm font-semibold">
          Search
        </label>
        <div className="relative">
          <MagnifyingGlass size={18} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            id={qId}
            type="search"
            className="field pl-10"
            placeholder="public health, Mastercard, Chevening"
            value={filters.q}
            onChange={(e) => set('q', e.target.value)}
            autoComplete="off"
          />
        </div>
      </div>

      <fieldset>
        <legend className="mb-1 text-sm font-semibold">Level</legend>
        {LEVELS.map((l) => (
          <Check
            key={l.id}
            label={l.label}
            checked={filters.levels.includes(l.id)}
            onChange={(on) => set('levels', on ? [...filters.levels, l.id] : filters.levels.filter((x) => x !== l.id))}
          />
        ))}
      </fieldset>

      <fieldset>
        <legend className="mb-1 text-sm font-semibold">Show only</legend>
        <Check label="Fully funded" checked={filters.fullOnly} onChange={(v) => set('fullOnly', v)} />
        <Check label="Health-focused programmes" checked={filters.medicalOnly} onChange={(v) => set('medicalOnly', v)} />
        <Check label={`Saved (${savedCount})`} checked={filters.savedOnly} onChange={(v) => set('savedOnly', v)} />
        <Check label="Include closed" checked={filters.showClosed} onChange={(v) => set('showClosed', v)} />
      </fieldset>

      <div>
        <label htmlFor={destId} className="mb-2 block text-sm font-semibold">
          Study destination
        </label>
        <select id={destId} className="field" value={filters.destination} onChange={(e) => set('destination', e.target.value)}>
          <option value="">Anywhere</option>
          {destinations.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor={sortId} className="mb-2 block text-sm font-semibold">
          Sort by
        </label>
        <select id={sortId} className="field" value={filters.sort} onChange={(e) => set('sort', e.target.value as SortKey)}>
          {SORTS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {dirty && (
        <button type="button" className="btn btn-ghost press justify-self-start" onClick={() => onChange({ ...DEFAULT_FILTERS, sort: filters.sort })}>
          <X size={16} aria-hidden /> Clear filters
        </button>
      )}
    </form>
  )
}

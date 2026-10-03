import type { Category, Filters } from '../types'

const TABS: { id: Category | 'all'; label: string }[] = [
  { id: 'all', label: 'Everything' },
  { id: 'funding', label: 'Scholarships' },
  { id: 'research', label: 'Research' },
  { id: 'volunteer', label: 'Volunteer and internships' },
  { id: 'training', label: 'Training and events' },
]

interface Props {
  value: Filters['category']
  counts: Record<Category | 'all', number>
  onChange: (c: Filters['category']) => void
}

export function CategoryTabs({ value, counts, onChange }: Props) {
  return (
    <div role="group" aria-label="Type of opportunity" className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
      {TABS.map((t) => {
        const on = value === t.id
        return (
          <button
            key={t.id}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(t.id)}
            className={`press flex min-h-11 shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap rounded-[var(--radius)] border px-3.5 text-sm font-semibold transition-colors ${
              on ? 'border-accent bg-accent text-accent-ink' : 'border-line bg-surface hover:border-accent'
            }`}
          >
            {t.label}
            <span className={`num text-xs font-medium ${on ? 'opacity-80' : 'text-muted'}`}>{counts[t.id]}</span>
          </button>
        )
      })}
    </div>
  )
}

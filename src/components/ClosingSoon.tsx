import { daysLeft, clean, formatDate } from '../lib/data'
import type { Scholarship } from '../types'

/** The nearest deadlines among items worth a medical graduate's attention. */
export function ClosingSoon({ items }: { items: Scholarship[] }) {
  if (!items.length) return null
  const [first, ...rest] = items

  const dayText = (i: Scholarship) => {
    const d = daysLeft(i)!
    return d === 0 ? 'closes today' : `${d} ${d === 1 ? 'day' : 'days'} left`
  }

  return (
    <section aria-labelledby="closing-h" className="grid gap-px overflow-hidden rounded-[var(--radius)] border border-line bg-line lg:grid-cols-[1.5fr_1fr_1fr]">
      <div className="bg-surface p-5">
        <h2 id="closing-h" className="text-sm font-semibold text-muted">
          Closing next
        </h2>
        <a href={first.url} target="_blank" rel="noopener noreferrer" className="mt-2 block text-xl font-semibold leading-snug tracking-tight text-balance hover:underline underline-offset-4">
          {clean(first.title)}
        </a>
        <p className="num mt-2 text-sm font-medium text-warn">
          {dayText(first)} <span className="text-muted">({formatDate(first.deadline!)})</span>
        </p>
      </div>
      {rest.slice(0, 2).map((i) => (
        <div key={i.id} className="bg-surface p-5">
          <p className="num text-sm font-medium text-muted">{dayText(i)}</p>
          <a href={i.url} target="_blank" rel="noopener noreferrer" className="mt-2 block font-semibold leading-snug text-balance hover:underline underline-offset-4">
            {clean(i.title)}
          </a>
        </div>
      ))}
    </section>
  )
}

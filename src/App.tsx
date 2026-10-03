import { useMemo, useState } from 'react'
import { ArrowsClockwise, Funnel, Stethoscope } from '@phosphor-icons/react'
import { FilterPanel, DEFAULT_FILTERS } from './components/FilterPanel'
import { Row } from './components/Row'
import { ClosingSoon } from './components/ClosingSoon'
import { applyFilters, dataset, daysLeft, destinations, fit, statusOf, timeAgo } from './lib/data'
import { useShortlist } from './lib/useShortlist'
import type { Filters } from './types'

const PAGE = 20

export default function App() {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)
  const [limit, setLimit] = useState(PAGE)
  const [panelOpen, setPanelOpen] = useState(false)
  const { saved, toggle } = useShortlist()

  const results = useMemo(() => applyFilters(dataset.items, filters, saved), [filters, saved])

  const stats = useMemo(() => {
    const live = dataset.items.filter((i) => statusOf(i) !== 'closed')
    return {
      live: live.length,
      closing: live.filter((i) => statusOf(i) === 'closing').length,
      full: live.filter((i) => i.funding === 'full').length,
    }
  }, [])

  const closingSoon = useMemo(
    () =>
      dataset.items
        .filter((i) => {
          const d = daysLeft(i)
          return d !== null && d >= 0 && d <= 30 && (i.kind === 'curated' || fit(i) >= 8)
        })
        .sort((a, b) => daysLeft(a)! - daysLeft(b)!)
        .slice(0, 3),
    [],
  )

  const change = (f: Filters) => {
    setFilters(f)
    setLimit(PAGE)
  }

  return (
    <div className="mx-auto w-full max-w-[1240px] px-4 sm:px-6 lg:px-10">
      <header className="flex items-center justify-between gap-4 py-5">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-[var(--radius)] bg-accent text-accent-ink">
            <Stethoscope size={20} weight="bold" aria-hidden />
          </span>
          <span className="text-lg font-semibold tracking-tight">MedScholar</span>
        </div>
        <p className="flex items-center gap-2 text-sm text-muted">
          <ArrowsClockwise size={16} aria-hidden />
          <span>
            Updated <time dateTime={dataset.meta.generatedAt}>{timeAgo(dataset.meta.generatedAt)}</time>
          </span>
        </p>
      </header>

      <section className="grid gap-8 pb-10 pt-6 md:pt-10 lg:grid-cols-[1fr_auto] lg:items-end">
        <div className="max-w-[44rem]">
          <h1 className="text-4xl font-semibold leading-[1.05] tracking-tighter text-balance md:text-6xl">
            Funding for medical graduates
          </h1>
          <p className="mt-5 max-w-[52ch] text-lg leading-relaxed text-muted">
            Checked every six hours across scholarship boards and official programme pages. Opportunities open to Nigerian doctors rank first.
          </p>
        </div>
        <dl className="num grid grid-cols-3 gap-8 lg:gap-10">
          {[
            ['Open or recurring', stats.live],
            ['Closing in 30 days', stats.closing],
            ['Fully funded', stats.full],
          ].map(([label, n]) => (
            <div key={label as string}>
              <dd className="text-3xl font-semibold tracking-tight md:text-4xl">{n}</dd>
              <dt className="mt-1 font-sans text-sm text-muted">{label}</dt>
            </div>
          ))}
        </dl>
      </section>

      <ClosingSoon items={closingSoon} />

      <div className="mt-10 grid gap-10 lg:grid-cols-[17rem_1fr] lg:gap-14">
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <button
            type="button"
            className="btn btn-ghost press w-full lg:hidden"
            aria-expanded={panelOpen}
            aria-controls="filters"
            onClick={() => setPanelOpen((v) => !v)}
          >
            <Funnel size={18} aria-hidden /> {panelOpen ? 'Hide filters' : 'Search and filters'}
          </button>
          <div id="filters" className={`${panelOpen ? 'mt-5 block' : 'hidden'} lg:block`}>
            <FilterPanel filters={filters} onChange={change} destinations={destinations} savedCount={saved.size} />
          </div>
        </aside>

        <main id="results" className="min-w-0">
          <h2 className="border-b border-line pb-3 text-sm font-semibold text-muted" aria-live="polite">
            {results.length} {results.length === 1 ? 'opportunity' : 'opportunities'}
          </h2>

          {results.length === 0 ? (
            <div className="py-16">
              <p className="text-xl font-semibold tracking-tight">Nothing matches those filters.</p>
              <p className="mt-2 max-w-[48ch] text-muted">
                Try removing a filter, or include closed calls to see what ran recently. New listings are added every six hours.
              </p>
              <button type="button" className="btn btn-primary press mt-5" onClick={() => change(DEFAULT_FILTERS)}>
                Reset filters
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {results.slice(0, limit).map((item, i) => (
                <Row key={item.id} item={item} index={i} saved={saved.has(item.id)} onToggleSave={toggle} />
              ))}
            </ul>
          )}

          {results.length > limit && (
            <div className="border-t border-line pt-6">
              <button type="button" className="btn btn-ghost press" onClick={() => setLimit((l) => l + PAGE)}>
                Show {Math.min(PAGE, results.length - limit)} more
              </button>
            </div>
          )}
        </main>
      </div>

      <footer className="mt-20 border-t border-line py-10 text-sm text-muted">
        <div className="grid gap-8 md:grid-cols-2">
          <div className="max-w-[56ch]">
            <p className="font-semibold text-ink">How this list stays current</p>
            <p className="mt-2 leading-relaxed">
              A scheduled job reads {dataset.meta.sources.filter((s) => s.ok).length} scholarship boards, filters for postgraduate and health-relevant calls, reads deadlines from each listing, and removes expired ones. Official programme links are re-checked on every run.
            </p>
          </div>
          <div className="max-w-[56ch]">
            <p className="font-semibold text-ink">Check before you apply</p>
            <p className="mt-2 leading-relaxed">
              Deadlines are read automatically and can be wrong. Always confirm the date, eligibility and any fees on the provider's own page. Nobody legitimate charges you to apply for a scholarship.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

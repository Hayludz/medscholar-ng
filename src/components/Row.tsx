import { ArrowUpRight, BookmarkSimple, CalendarPlus, WarningCircle } from '@phosphor-icons/react'
import type { Level, Scholarship } from '../types'
import { clean, daysLeft, formatDate, statusOf } from '../lib/data'
import { downloadIcs } from '../lib/ics'

const LEVEL_LABEL: Record<Level, string> = {
  masters: "Master's",
  phd: 'PhD',
  fellowship: 'Fellowship',
  research: 'Research grant',
  training: 'Training',
}

const FUNDING_LABEL = { full: 'Fully funded', partial: 'Partial funding', unknown: 'Funding varies' } as const

function Deadline({ item }: { item: Scholarship }) {
  const status = statusOf(item)
  const d = daysLeft(item)

  if (status === 'recurring') {
    return (
      <div className="text-sm leading-snug">
        <div className="font-semibold">Recurring</div>
        <div className="text-muted">Check the official page</div>
      </div>
    )
  }
  if (status === 'closed') {
    return (
      <div className="text-sm leading-snug">
        <div className="font-semibold text-muted">Closed</div>
        <div className="num text-muted">{formatDate(item.deadline!)}</div>
      </div>
    )
  }
  const urgent = d! <= 7
  return (
    <div className="leading-snug">
      <div className={`num text-2xl font-semibold tracking-tight ${urgent ? 'text-warn' : 'text-ink'}`}>
        {d === 0 ? 'Today' : d}
        {d !== 0 && <span className="ml-1.5 text-sm font-medium text-muted">{d === 1 ? 'day' : 'days'}</span>}
      </div>
      <div className="num text-sm text-muted">{formatDate(item.deadline!)}</div>
    </div>
  )
}

interface Props {
  item: Scholarship
  index: number
  saved: boolean
  onToggleSave: (id: string) => void
}

export function Row({ item, index, saved, onToggleSave }: Props) {
  const status = statusOf(item)
  const closed = status === 'closed'
  const official = item.kind === 'curated'

  return (
    <li
      className="row-in grid gap-x-6 gap-y-4 py-6 md:grid-cols-[8.5rem_1fr_auto]"
      style={{ ['--i' as string]: index }}
    >
      <Deadline item={item} />

      <div className={`min-w-0 ${closed ? 'opacity-70' : ''}`}>
        <h3 className="text-[1.05rem] font-semibold leading-snug tracking-tight text-balance">
          <a href={item.url} target="_blank" rel="noopener noreferrer" className="hover:underline underline-offset-4">
            {clean(item.title)}
          </a>
        </h3>
        <p className="mt-1 text-sm text-muted">
          {item.provider}
          {official ? ' (official page)' : ''}
        </p>
        <p className="mt-2 max-w-[68ch] text-[0.95rem] leading-relaxed text-pretty">{clean(item.summary)}</p>
        {item.kind === 'curated' && <p className="mt-1 max-w-[68ch] text-sm text-muted">{item.window}</p>}

        <ul className="mt-3 flex flex-wrap gap-1.5 text-xs font-medium" aria-label="Details">
          {item.funding === 'full' && (
            <li className="rounded-[var(--radius)] bg-accent-soft px-2 py-1 text-accent">{FUNDING_LABEL.full}</li>
          )}
          {item.funding !== 'full' && item.funding !== 'unknown' && (
            <li className="rounded-[var(--radius)] border border-line px-2 py-1">{FUNDING_LABEL[item.funding]}</li>
          )}
          {item.level.map((l) => (
            <li key={l} className="rounded-[var(--radius)] border border-line px-2 py-1">
              {LEVEL_LABEL[l]}
            </li>
          ))}
          {item.destination !== 'Varies' && (
            <li className="rounded-[var(--radius)] border border-line px-2 py-1">{item.destination}</li>
          )}
          {item.medical === 'specific' && (
            <li className="rounded-[var(--radius)] border border-line px-2 py-1">Health focus</li>
          )}
        </ul>

        {item.linkStatus === 'broken' && (
          <p className="mt-3 flex items-center gap-1.5 text-sm text-warn">
            <WarningCircle size={16} aria-hidden /> This page may have moved. Search the provider's site for the current call.
          </p>
        )}
      </div>

      <div className="flex items-start gap-2 md:flex-col md:items-stretch">
        <a href={item.url} target="_blank" rel="noopener noreferrer" className="btn btn-primary press">
          {official ? 'Official page' : 'Read and apply'}
          <ArrowUpRight size={16} aria-hidden />
        </a>
        <div className="flex gap-2">
          <button
            type="button"
            className="btn btn-ghost press flex-1"
            aria-pressed={saved}
            onClick={() => onToggleSave(item.id)}
          >
            <BookmarkSimple size={18} weight={saved ? 'fill' : 'regular'} aria-hidden />
            {saved ? 'Saved' : 'Save'}
          </button>
          {item.deadline && !closed && (
            <button
              type="button"
              className="btn btn-ghost press px-3"
              onClick={() => downloadIcs(item)}
              aria-label={`Add the ${item.title} deadline to your calendar`}
              title="Add the deadline to your calendar"
            >
              <CalendarPlus size={18} aria-hidden />
            </button>
          )}
        </div>
      </div>
    </li>
  )
}

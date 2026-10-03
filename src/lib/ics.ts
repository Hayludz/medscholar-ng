import type { Scholarship } from '../types'

const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;')

/** All-day calendar entry on the deadline, with a reminder one week before. */
export function downloadIcs(item: Scholarship): void {
  if (!item.deadline) return
  const d = item.deadline.replace(/-/g, '')
  const next = new Date(Date.parse(item.deadline) + 86_400_000).toISOString().slice(0, 10).replace(/-/g, '')
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const body = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//MedScholar//EN',
    'BEGIN:VEVENT',
    `UID:${item.id}@medscholar`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${d}`,
    `DTEND;VALUE=DATE:${next}`,
    `SUMMARY:${esc('Deadline: ' + item.title)}`,
    `DESCRIPTION:${esc('Apply at ' + item.url)}`,
    `URL:${item.url}`,
    'BEGIN:VALARM',
    'TRIGGER:-P7D',
    'ACTION:DISPLAY',
    `DESCRIPTION:${esc('One week to apply: ' + item.title)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')

  const url = URL.createObjectURL(new Blob([body], { type: 'text/calendar' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `${item.id}-deadline.ics`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

const PATH = [
  {
    text: 'Get the free Good Clinical Practice certificate. Research groups ask for it first.',
    href: 'https://gcp.nidatraining.org/',
    link: 'GCP training',
  },
  {
    text: 'Volunteer with Cochrane to learn systematic reviews, then co-author one.',
    href: 'https://www.cochrane.org/get-involved',
    link: 'Cochrane volunteering',
  },
  {
    text: 'Write up a case from your own practice using the right checklist, and submit it to a journal.',
    href: 'https://www.equator-network.org/',
    link: 'Reporting checklists',
  },
  {
    text: 'Apply to a field epidemiology or research training programme for supervised, publishable work.',
    href: 'https://nfeltp.org/',
    link: 'NFELTP',
  },
]

/** A short, practical order of play for building a research record from Nigeria. */
export function PortfolioPath() {
  return (
    <aside aria-labelledby="path-h" className="rounded-[var(--radius)] border border-line bg-surface p-5">
      <h2 id="path-h" className="font-semibold tracking-tight">
        A practical path to a research portfolio
      </h2>
      <ol className="mt-3 grid gap-3 text-[0.95rem] leading-relaxed md:grid-cols-2">
        {PATH.map((p, i) => (
          <li key={p.href} className="flex gap-3">
            <span className="num grid size-6 shrink-0 place-items-center rounded-[var(--radius)] bg-accent-soft text-xs font-semibold text-accent">
              {i + 1}
            </span>
            <span>
              {p.text}{' '}
              <a href={p.href} target="_blank" rel="noopener noreferrer" className="font-semibold text-accent underline underline-offset-4">
                {p.link}
              </a>
            </span>
          </li>
        ))}
      </ol>
    </aside>
  )
}

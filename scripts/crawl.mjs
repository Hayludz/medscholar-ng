// Refreshes src/data/scholarships.json.
//   1. Reads curated evergreen programmes from scripts/curated.json
//   2. Pulls scholarship RSS feeds, keeps what fits a Nigerian medical graduate
//   3. Merges with the previous run, expires closed items, checks curated links
// Runs on a schedule in .github/workflows/refresh.yml and locally with `npm run crawl`.
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { XMLParser } from 'fast-xml-parser'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = resolve(ROOT, 'src/data/scholarships.json')
const UA = 'Mozilla/5.0 (compatible; MedScholarBot/1.0; +https://github.com/)'
const LINKS_ONLY = process.argv.includes('--links-only')

const SEARCH_SITES = [
  { name: 'Opportunities for Africans', base: 'https://www.opportunitiesforafricans.com/' },
  { name: 'Opportunity Desk', base: 'https://opportunitydesk.org/' },
  { name: 'Opportunities for Youth', base: 'https://opportunitiesforyouth.org/' },
]
const QUERIES = [
  'medical', 'medicine', 'public health', 'health fellowship', 'doctors', 'mastercard foundation', 'masters nigeria',
  'postgraduate africa', 'global health', 'clinical research',
  // research experience, volunteering and portfolio building
  'volunteer health', 'research internship', 'medical internship', 'epidemiology', 'research assistant health',
  'health research fellowship', 'free course health', 'conference travel grant', 'summer school health',
]
const CATEGORY_FEEDS = [
  ['Opportunities for Africans', 'https://www.opportunitiesforafricans.com/category/internships/feed/'],
  ['Opportunities for Africans', 'https://www.opportunitiesforafricans.com/category/fellowships/feed/'],
  ['Opportunities for Africans', 'https://www.opportunitiesforafricans.com/category/call-for-applications/feed/'],
  ['Opportunity Desk', 'https://opportunitydesk.org/category/internships/feed/'],
  ['Opportunity Desk', 'https://opportunitydesk.org/category/fellowships/feed/'],
  ['Opportunity Desk', 'https://opportunitydesk.org/category/training/feed/'],
].flatMap(([name, url]) => [1, 2, 3].map((page) => ({ name, label: `${name} ${url} p${page}`, url: page > 1 ? `${url}?paged=${page}` : url })))
const FEEDS = [
  { name: 'Opportunities for Africans', url: 'https://www.opportunitiesforafricans.com/feed/' },
  { name: 'Opportunity Desk', url: 'https://opportunitydesk.org/feed/' },
  { name: 'Opportunities for Youth', url: 'https://opportunitiesforyouth.org/feed/' },
  { name: 'Funds for NGOs', url: 'https://www.fundsforngos.org/feed/' },
  ...CATEGORY_FEEDS,
  ...SEARCH_SITES.flatMap((s) =>
    QUERIES.flatMap((q) =>
      [1, 2].map((page) => ({
        name: s.name,
        label: `${s.name} search "${q}" p${page}`,
        url: `${s.base}?s=${encodeURIComponent(q)}&feed=rss2${page > 1 ? `&paged=${page}` : ''}`,
      })),
    ),
  ),
]

const MONTHS = ['january','february','march','april','may','june','july','august','september','october','november','december']
const TODAY = new Date()
const DAY = 86400000

const RX = {
  award: /scholarship|fellowship|bursary|studentship|stipend|grant|award|funding|funded|programme|program/i,
  postgrad: /\bmaster(?!card)|msc|\bmph\b|\bmba\b|phd|doctoral|doctorate|postgraduate|post-graduate|graduate|fellowship|residency|research|early.?career|all levels/i,
  undergradOnly: /undergraduate|bachelor|high school|secondary school/i,
  medical: /medic|health|clinical|surgery|surgeon|physician|doctor|epidemiolog|nursing|pharma|biomedic|global health|public health|infectious|tropical|disease|hospital|neuro|oncolog|paediatric|pediatric|obstetric|anaesth|anesth|radiolog/i,
  eligible: /nigeria|africa|developing countr|low.?(and|&)?.?middle|all nationalit|commonwealth/i,
  notAward: /intern(ship)?\b|job|vacanc|recruit|trainee|we are hiring|economist program|call for (papers|proposals from ngos)|conference|webinar|competition|contest|prize/i,
  notFresh: /postdoc|post-doc|professor|mid-career|experienced researchers|visiting scholar|senior (fellow|researcher)|leadership fellows? program for/i,
  offField: new RegExp(String.raw`\b(?:media|reporting|entrepreneur|plant|land restoration|food|fiscal|accountab|biosphere|youth champion|human rights|indigenous|theolog|islamic|coptic|justice|feminis|princeton in africa|engineering|computer|computing|software|physics|mathemat|econom|journalis|architect|animation|music|banking|agricultur|climate|environment|data science|cyber|biodiversity|internship)|\b(?:ai|law|art|arts|oil|gas|energy|film|design|finance|artists?)\b`, 'i'),
  otherNationOnly: /\bfor (ghanaian|kenyan|ugandan|south african|indian|pakistani|bangladeshi|nepali|filipino|indonesian|vietnamese|zimbabwean|zambian|malawian|ethiopian|tanzanian|rwandan|egyptian|moroccan|american|canadian|australian|british|german|chinese|brazilian|mexican)\b/i,
  full: /fully.?funded|full (scholarship|funding|tuition)|full-ride|covers? (tuition|all)/i,
}

const DESTINATIONS = [
  ['United Kingdom', /\buk\b|united kingdom|england|scotland|wales|oxford|cambridge|london|edinburgh|liverpool|manchester/i],
  ['United States', /\busa\b|united states|\bu\.s\.|american|harvard|stanford|johns hopkins|yale/i],
  ['Canada', /canada|canadian|toronto|mcgill|ubc/i],
  ['Germany', /german|daad/i],
  ['Australia', /australia/i],
  ['Netherlands', /netherlands|dutch/i],
  ['Sweden', /sweden|swedish/i],
  ['Switzerland', /switzerland|swiss/i],
  ['China', /\bchina\b|chinese/i],
  ['South Africa', /south africa|cape town|wits\b|stellenbosch/i],
  ['Africa', /\bmakerere|ghana|kenya|uganda|rwanda|ethiopia|tanzania/i],
]

const stripHtml = (s = '') =>
  s.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&')
    .replace(/&#8217;|&rsquo;/g, "'").replace(/&#8211;|&#8212;|&ndash;|&mdash;/g, '-')
    .replace(/&#8220;|&#8221;|&quot;/g, '"').replace(/&#\d+;/g, ' ').replace(/\s+/g, ' ').trim()

const iso = (y, m, d) => {
  const dt = new Date(Date.UTC(y, m, d))
  return dt.getUTCMonth() === m ? dt.toISOString().slice(0, 10) : null
}

function findDates(text) {
  const out = []
  const a = /(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?(january|february|march|april|may|june|july|august|september|october|november|december),?\s+(20\d{2})/gi
  const b = /(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(20\d{2})/gi
  for (const m of text.matchAll(a)) out.push({ i: m.index, d: iso(+m[3], MONTHS.indexOf(m[2].toLowerCase()), +m[1]) })
  for (const m of text.matchAll(b)) out.push({ i: m.index, d: iso(+m[3], MONTHS.indexOf(m[1].toLowerCase()), +m[2]) })
  return out.filter((x) => x.d)
}

function extractDeadline(text) {
  const kw = /deadline|closing date|closes? on|close on|apply (?:before|by)|applications? (?:close|end)|last date|submit(?:ted)? (?:by|before)/gi
  const dates = findDates(text)
  for (const k of text.matchAll(kw)) {
    const hit = dates.find((x) => x.i >= k.index && x.i - k.index < 140)
    if (hit) return hit.d
  }
  return null
}

const hash = (s) => createHash('sha1').update(s).digest('hex').slice(0, 12)
const clip = (s, n) => (s.length <= n ? s : s.slice(0, s.lastIndexOf(' ', n)).replace(/[,.;:\s]+$/, '') + '...')

// Categories: funding (degrees), research (fellowships, research roles), volunteer (volunteering, internships),
// training (courses, conferences). Everything except funding must be health-relevant to be kept.
const CAT = {
  volunteer: /volunteer|\bintern(ship)?s?\b|externship|work placement/i,
  degree: /scholarship|bursary|studentship|\bmaster(?!card)|\bmsc\b|\bmph\b|\bphd\b|doctoral|degree|tuition/i,
  training: /conference|symposium|congress|summer school|winter school|course|workshop|training|webinar|bootcamp|certificate|masterclass|short programme|travel (grant|award)/i,
  research: /fellowship|research (assistant|associate|fellow|grant|programme|program)|attachment|traineeship|capacity building|early.?career/i,
}
const NOT_JOB = /\bjobs?\b|vacanc|recruit|we are hiring|now hiring|job opening|apply for (the )?position|full-time (role|position)/i
const STUDENTS_ONLY = /(for|open to|only)\s+(current\s+)?(undergraduate|medical|nursing|pharmacy|dental)\s+students?\b/i
const REMOTE = /\bremote(ly)?\b|\bonline\b|\bvirtual(ly)?\b|work from home|distance learning/i
const OPEN_TO_NG = /nigeria|africa|worldwide|global|international|online|virtual|remote|all nationalit|developing|low.?(and|&)?.?middle|open to all/i

// Never relevant to a doctor, even when a word like "tropical" trips the health check.
const HARD_OFF = /agricultur|\bcrops?\b|livestock|forestry|\bfood security\b|mining|petroleum|software|\bbanking\b|accounting|startups?\b|cultural heritage|crisis leadership|management training scheme/i

/** Normalised first words of a title, used to collapse the same call listed on several sites. */
const titleKey = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(' ').slice(0, 6).join(' ')

function detectCategory(title) {
  if (CAT.volunteer.test(title)) return 'volunteer'
  if (CAT.degree.test(title)) return 'funding'
  if (CAT.training.test(title)) return 'training'
  if (CAT.research.test(title)) return 'research'
  return 'funding'
}

function classifyOpportunity(category, title, body, source, link, pubDate) {
  const text = `${title}. ${body}`
  if (NOT_JOB.test(title) || RX.notFresh.test(title) || STUDENTS_ONLY.test(title)) return null
  if (RX.otherNationOnly.test(title) && !RX.eligible.test(title)) return null
  const medicalTitle = RX.medical.test(title)
  // Long pages mention "health" in boilerplate, so a body-only match needs real density.
  const medicalBody = (text.match(new RegExp(RX.medical.source, 'gi')) || []).length >= 10
  if (!medicalTitle && !medicalBody) return null
  if (!medicalTitle && RX.offField.test(title.replace(/internship/gi, ''))) return null
  if (/media|journalis|reporting|film|animation/i.test(title)) return null
  if (!OPEN_TO_NG.test(text)) return null

  const remote = REMOTE.test(text)
  const deadline = extractDeadline(text)
  const destination = remote ? 'Remote' : (DESTINATIONS.find(([, rx]) => rx.test(title)) || DESTINATIONS.find(([, rx]) => rx.test(body.slice(0, 600))) || ['Varies'])[0]
  const added = pubDate && !Number.isNaN(Date.parse(pubDate)) ? new Date(pubDate) : TODAY
  const score = (medicalTitle ? 4 : 0) + (medicalBody ? 1 : 0) + (/nigeria/i.test(text) ? 3 : 0) + (/africa/i.test(text) ? 1 : 0) + (remote ? 1 : 0)
  if (score < 3) return null

  return {
    id: 'f-' + hash(link),
    title: clip(title.replace(/\s*[|\-]\s*(Opportunity Desk|Scholars4Dev).*$/i, ''), 120),
    provider: `Listed on ${source}`,
    url: link,
    category,
    level: category === 'research' && /fellowship/i.test(title) ? ['fellowship'] : [],
    funding: /stipend|fully.?funded|paid/i.test(text) ? 'full' : 'unknown',
    destination,
    remote,
    medical: 'specific',
    deadline,
    window: deadline ? `Deadline ${deadline}` : 'Deadline not stated in the listing. Open the link to confirm.',
    summary: clip(body, 230),
    tags: [/nigeria/i.test(text) ? 'Nigeria' : 'Open to Africans'],
    kind: 'feed',
    score,
    source,
    addedAt: added.toISOString().slice(0, 10),
  }
}

function classify(title, body, source, link, pubDate) {
  if (HARD_OFF.test(title)) return null
  const category = detectCategory(title)
  if (category !== 'funding') return classifyOpportunity(category, title, body, source, link, pubDate)
  return classifyFunding(title, body, source, link, pubDate)
}

function classifyFunding(title, body, source, link, pubDate) {
  const text = `${title}. ${body}`
  if (!RX.award.test(title) && !RX.award.test(body.slice(0, 400))) return null
  if (RX.notAward.test(title) || RX.notFresh.test(title)) return null
  if (RX.undergradOnly.test(title) && !/\bmaster(?!card)|postgrad|phd|graduate/i.test(title.replace(/undergraduate/gi, ''))) return null
  if (!RX.postgrad.test(text)) return null
  if (RX.otherNationOnly.test(title) && !RX.eligible.test(title)) return null

  const medicalTitle = RX.medical.test(title)
  const medicalBody = (text.match(new RegExp(RX.medical.source, 'gi')) || []).length >= 5
  const eligible = RX.eligible.test(text)
  // Keep anything medical, or a general postgraduate award that Nigerians/Africans can use.
  if (!medicalTitle && !medicalBody && !eligible) return null
  // General awards must be field-agnostic, not tied to an unrelated discipline.
  if (!medicalTitle && RX.offField.test(title)) return null
  if (!medicalTitle && !medicalBody && !/nigeria|africa/i.test(text)) return null

  const level = []
  if (/master|msc|\bmph\b|\bmba\b|postgraduate|post-graduate/i.test(text)) level.push('masters')
  if (/phd|doctoral|doctorate/i.test(text)) level.push('phd')
  if (/fellowship|residency|early.?career/i.test(text)) level.push('fellowship')
  if (/research grant|research funding|seed grant/i.test(text)) level.push('research')
  if (!level.length) level.push('masters')

  const deadline = extractDeadline(text)
  const destination = (DESTINATIONS.find(([, rx]) => rx.test(title)) || DESTINATIONS.find(([, rx]) => rx.test(body.slice(0, 600))) || ['Varies'])[0]
  const added = pubDate && !Number.isNaN(Date.parse(pubDate)) ? new Date(pubDate) : TODAY

  const score = (medicalTitle ? 4 : 0) + (medicalBody ? 1 : 0) + (/nigeria/i.test(text) ? 3 : 0) + (/africa/i.test(text) ? 1 : 0) + (level.includes('masters') || level.includes('phd') ? 1 : 0) + (RX.full.test(text) ? 1 : 0)

  return {
    id: 'f-' + hash(link),
    title: clip(title.replace(/\s*[|\-]\s*(Opportunity Desk|Scholars4Dev).*$/i, ''), 120),
    provider: `Listed on ${source}`,
    url: link,
    category: 'funding',
    level,
    funding: RX.full.test(text) ? 'full' : 'unknown',
    destination,
    remote: false,
    medical: medicalTitle || medicalBody ? 'specific' : 'open',
    deadline,
    window: deadline ? `Deadline ${deadline}` : 'Deadline not stated in the listing. Open the link to confirm.',
    summary: clip(body, 230),
    tags: [eligible ? 'Open to Africans' : 'Check eligibility'],
    kind: 'feed',
    score,
    source,
    addedAt: added.toISOString().slice(0, 10),
  }
}

async function fetchText(url, ms = 25000) {
  const ctl = new AbortController()
  const t = setTimeout(() => ctl.abort(), ms)
  try {
    const r = await fetch(url, { headers: { 'user-agent': UA, accept: 'application/rss+xml, text/xml, */*' }, signal: ctl.signal, redirect: 'follow' })
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    return await r.text()
  } finally {
    clearTimeout(t)
  }
}

async function pullFeed(feed) {
  const xml = await fetchText(feed.url)
  if (!xml.trimStart().startsWith('<?xml') && !xml.includes('<rss')) throw new Error('not RSS')
  const doc = new XMLParser({ ignoreAttributes: true, processEntities: true }).parse(xml)
  const raw = doc?.rss?.channel?.item ?? []
  const items = Array.isArray(raw) ? raw : [raw]
  const kept = []
  for (const it of items) {
    const title = stripHtml(String(it.title ?? ''))
    const link = String(it.link ?? '').trim()
    if (!title || !link) continue
    const body = stripHtml(String(it['content:encoded'] ?? it.description ?? ''))
    const c = classify(title, body, feed.name, link, it.pubDate)
    if (c) kept.push(c)
  }
  return { total: items.length, kept }
}

async function checkLink(url) {
  const attempt = async (method) => {
    const ctl = new AbortController()
    const t = setTimeout(() => ctl.abort(), 15000)
    try {
      return await fetch(url, { method, headers: { 'user-agent': UA }, signal: ctl.signal, redirect: 'follow' })
    } finally {
      clearTimeout(t)
    }
  }
  try {
    let r = await attempt('HEAD')
    if (r.status === 405 || r.status === 403 || r.status === 400) r = await attempt('GET')
    if (r.status === 404 || r.status === 410) return 'broken'
    return r.ok ? 'ok' : 'blocked'
  } catch {
    return 'unreachable'
  }
}

async function readPrevious() {
  try {
    return JSON.parse(await readFile(OUT, 'utf8'))
  } catch {
    return { meta: {}, items: [] }
  }
}

async function main() {
  const curated = JSON.parse(await readFile(resolve(ROOT, 'scripts/curated.json'), 'utf8'))
  const prev = await readPrevious()
  const prevById = new Map(prev.items.map((i) => [i.id, i]))
  const todayIso = TODAY.toISOString().slice(0, 10)

  // Curated: attach link health
  const checked = new Date().toISOString()
  const curatedOut = []
  for (let i = 0; i < curated.length; i += 6) {
    const batch = await Promise.all(
      curated.slice(i, i + 6).map(async (c) => ({
        ...c,
        category: c.category ?? 'funding',
        remote: c.remote ?? false,
        kind: 'curated',
        source: 'Official page',
        addedAt: prevById.get(c.id)?.addedAt ?? todayIso,
        linkStatus: await checkLink(c.url),
        checkedAt: checked,
      })),
    )
    curatedOut.push(...batch)
  }
  const broken = curatedOut.filter((c) => c.linkStatus === 'broken')
  if (broken.length) console.warn('Broken curated links:', broken.map((b) => `${b.id} ${b.url}`).join(', '))

  let feedItems = prev.items.filter((i) => i.kind === 'feed').map((i) => ({ category: 'funding', remote: false, ...i }))
  const sources = []
  if (!LINKS_ONLY) {
    const results = []
    for (let i = 0; i < FEEDS.length; i += 5) {
      results.push(...(await Promise.allSettled(FEEDS.slice(i, i + 5).map(pullFeed))))
    }
    const agg = new Map()
    results.forEach((res, i) => {
      const name = FEEDS[i].name
      const row = agg.get(name) ?? { name, ok: false, scanned: 0, matched: 0, failed: 0 }
      if (res.status === 'fulfilled') {
        row.ok = true
        row.scanned += res.value.total
        const fresh = res.value.kept
        row.matched += fresh.length
        for (const item of fresh) {
          const old = prevById.get(item.id)
          feedItems = feedItems.filter((x) => x.id !== item.id)
          feedItems.push(old ? { ...item, addedAt: old.addedAt } : item)
        }
      } else {
        row.failed += 1
        console.warn(`Feed failed: ${FEEDS[i].label ?? name}: ${res.reason?.message ?? res.reason}`)
      }
      agg.set(name, row)
    })
    sources.push(...agg.values())
  } else {
    sources.push(...(prev.meta.sources ?? []))
  }

  // Expire: closed more than 30 days ago, or undated and older than 90 days
  feedItems = feedItems.filter((i) => {
    if (i.deadline) return Date.parse(i.deadline) > TODAY.getTime() - 30 * DAY
    return Date.parse(i.addedAt) > TODAY.getTime() - 90 * DAY
  })

  // Items kept from earlier runs are re-checked against today's rules, so tightening a filter also cleans old data.
  feedItems = feedItems.filter((i) => !HARD_OFF.test(i.title) && (i.category === 'funding' || (i.score ?? 0) >= 3))

  // The same call is often listed on several boards. Keep the best-scoring copy of each.
  const best = new Map()
  for (const i of feedItems) {
    const key = titleKey(i.title)
    const cur = best.get(key)
    if (!cur || (i.score ?? 0) > (cur.score ?? 0)) best.set(key, i)
  }
  feedItems = [...best.values()]

  const items = [...curatedOut, ...feedItems]
  const okFeeds = sources.filter((s) => s.ok).length
  if (!LINKS_ONLY && okFeeds === 0 && prev.items.length) {
    console.error('Every feed failed. Keeping the previous data file untouched.')
    process.exit(0)
  }

  const out = {
    meta: {
      generatedAt: new Date().toISOString(),
      total: items.length,
      curated: curatedOut.length,
      sources,
    },
    items,
  }
  await mkdir(dirname(OUT), { recursive: true })
  await writeFile(OUT, JSON.stringify(out, null, 1) + '\n')
  console.log(`Wrote ${items.length} items (${curatedOut.length} curated, ${feedItems.length} from feeds).`)
  for (const s of sources) console.log(`  ${s.ok ? 'ok  ' : 'FAIL'} ${s.name}: ${s.matched ?? 0} kept of ${s.scanned ?? 0} scanned${s.failed ? `, ${s.failed} requests failed` : ''}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

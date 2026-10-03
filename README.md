# MedScholar

Scholarships, fellowships, research roles, volunteering and free training for Nigerian medical graduates (built for an OAU, Ile-Ife MBBS holder). Mastercard Foundation, Chevening, Commonwealth, DAAD and more, with deadlines, funding level and a one-click calendar reminder.

## How it stays up to date

`.github/workflows/refresh.yml` runs every six hours:

1. `scripts/crawl.mjs` reads scholarship RSS and search feeds (Opportunities for Africans, Opportunity Desk, Scholarship Region, Funds for NGOs).
2. Each listing is filtered for postgraduate or fellowship level, health relevance and eligibility for Nigerians or Africans, then scored. Deadlines are read from the listing text. Expired items are dropped.
3. About twenty evergreen programmes in `scripts/curated.json` are always included, and their links are health-checked each run.
4. The result is written to `src/data/scholarships.json` and committed. Vercel redeploys on every push, so the live site follows within a minute or two.

Run it yourself with `npm run crawl`. Trigger a refresh any time from the Actions tab (Run workflow).

## Develop

```bash
npm install
npm run dev
npm run build
```

## Adding a source or a programme

- New feed: add it to `FEEDS` in `scripts/crawl.mjs` (any WordPress site supports `?s=term&feed=rss2`).
- New evergreen programme: add an object to `scripts/curated.json`. Only set `deadline` when you have confirmed it on the official page.

## Caveats

Deadlines parsed from third-party listings can be wrong. The site tells users to confirm on the provider's page. Saved items are stored in the visitor's browser only.

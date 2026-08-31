# Soreno — Daily Market Bulletin

A free, publicly linkable pre-market finance bulletin for the NU Oakland
Investing Club: market pulse, macro calendar, a tech desk, the small-cap
watchlist, a **Filings Watch** of recent SEC EDGAR filings from the watchlist
companies, daily quiz + interview prep — rebuilt automatically every trading
day before the opening bell. No login for readers.

There are **two independent live copies**, same design and logic, updating on
their own schedules:

| Copy | URL | Updater |
|---|---|---|
| Claude Artifact | https://claude.ai/code/artifact/67ad9f26-996d-477f-be57-3203df2c7a01 | a Claude Code routine (Anthropic cloud) |
| GitHub Pages | https://irinaboronina.github.io/Soreno-site/ | GitHub Actions in this repo |

They are mirrors, not the same instance — the Artifact copy is written by
Claude (Sonnet) on the Claude subscription, the Pages copy by Gemini Flash on
its free tier, each on its own weekday cron (`0 12 * * 1-5` UTC). Same
structure and sources; wording and the exact numbers can differ by a few
minutes' worth of news. Pick whichever link is more convenient to share.

The **GitHub Pages copy** is the free, public, hands-off one — a plain
`irinaboronina.github.io` URL, no logins, nothing to re-share. The **Artifact
copy** needs a Claude account per viewer for auto-updates, or a manual
version re-pin if shared by public link.

---

## The page

`index.html` (served at the Pages URL) and `site/bulletin.html` (the reference
copy of the Artifact) are the same document. All daily content lives in one
`<script id="bulletin-data" type="application/json">` block near the bottom;
the inline render script builds every section from it. Everything visual is in
the single `<style>` block.

To change the **design**, edit `site/bulletin.html` (and re-run the rebuild
step below to regenerate `index.html`), then: for the Artifact, re-publish it
(`Artifact` tool with `url` set, or ask Claude Code "republish
site/bulletin.html to <artifact URL>"); for Pages, just commit — the daily job
only rewrites the JSON block, so design edits and content updates don't
collide.

Rebuild `index.html` from `site/bulletin.html` after a design change:

```bash
node -e 'const fs=require("fs");let b=fs.readFileSync("site/bulletin.html","utf8").replace(/\r\n/g,"\n");const i=b.indexOf("<header class=\"masthead\">");const out="<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n"+b.slice(0,i).trim()+"\n</head>\n<body>\n"+b.slice(i).trim()+"\n</body>\n</html>\n";fs.writeFileSync("index.html",out)'
```

---

## GitHub Pages copy — how it runs

- `.github/workflows/daily-update.yml` — weekday `0 12 * * 1-5` UTC (plus a
  manual "Run workflow" button). Checks out the repo, runs
  `node scripts/generate.mjs`, and commits `index.html` back to `main` if it
  changed. Pages ("Deploy from a branch", `main` / `/root`) redeploys on that
  push automatically.
- `scripts/generate.mjs` — calls **Google's Gemini** (`gemini-3.6-flash`, with
  Google Search grounding) once, using the same source list and JSON schema as
  the Artifact routine, and rewrites the `bulletin-data` block inside
  `index.html`. Needs env var `GEMINI_API_KEY` (a repo secret). Gemini's free
  tier covers a once-a-day job with room to spare, so this costs nothing.
- `.nojekyll` — disables Jekyll so Pages serves the static files as-is.

### One-time setup (GitHub UI)

1. **Add the API key secret** — get a free key at
   https://aistudio.google.com/apikey (no credit card). Then repo → Settings →
   Secrets and variables → Actions → New repository secret → name
   `GEMINI_API_KEY`, paste the key. Enter it in that field yourself; don't
   paste it into any chat.
2. **Enable Pages** — repo → Settings → Pages → Build and deployment → Source
   = "Deploy from a branch", Branch = `main`, Folder = `/ (root)` → Save.
3. **Prime it** — repo → Actions → "Daily Soreno update" → Run workflow. When
   it finishes, `index.html` is updated and
   https://irinaboronina.github.io/Soreno-site/ shows the bulletin (not this
   README).

### Cost

Free. The GitHub Pages copy runs on Gemini's free tier; GitHub Actions + Pages
at this frequency are free. (The Claude Artifact copy runs on the Claude
subscription instead.)

### Changing the schedule

Edit the `cron` line in `.github/workflows/daily-update.yml` (UTC). To change
what's generated, edit the prompt in `scripts/generate.mjs`.

---

## Claude Artifact copy — how it runs

A Claude Code *routine* (scheduled cloud agent) at
https://claude.ai/code/routines/trig_01Ybp9Hn2JXjYzSKrBtB2MQn . Every weekday
at 12:00 UTC it reads the current Artifact, researches the day from the same
reading list, rewrites the JSON block, and republishes the same Artifact URL.
No repo, no API key to manage — it runs as Claude in Anthropic's cloud.

- **Make the link public:** open the Artifact → Share → "anyone with the
  link". If the share is pinned to an older version, update it to the latest.
- **Change the schedule / prompt:** edit the routine at the URL above, or via
  `/schedule` in Claude Code.
- **If a run misbehaves:** `/schedule` → list runs, or the routine URL — each
  run logs its research and publish result.

---

## Reading list (both updaters)

Morning Brew · Brew Markets · Financial Times · Axios Markets · Wall Street
Oasis – The Daily Peel · CFO Brew · Money Stuff (Matt Levine) ·
Stratechery / Sharp Tech · The Diff · TechCrunch · Yahoo Finance / CNBC /
CNN Markets · an economic calendar · **SEC EDGAR** (sec.gov) for recent
watchlist-company filings (10-K / 20-F / 10-Q / 8-K / proxies).

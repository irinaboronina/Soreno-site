# Soreno — Daily Market Bulletin

A free, publicly linkable pre-market finance bulletin for the NU Oakland
Investing Club: market pulse, macro calendar, a tech desk, the small-cap
watchlist, a **Filings Watch** of recent SEC EDGAR filings from the watchlist
companies, daily quiz + interview prep — rebuilt automatically every trading
day before the opening bell. No login for readers.

## How it works now (Claude scheduled cloud agent)

- **The page** is a single self-contained HTML file published as a Claude
  Artifact. All content lives in one `<script id="bulletin-data"
  type="application/json">` block near the bottom; the page renders itself
  from that block. `site/bulletin.html` in this repo is a copy of what was
  published.
- **The updater** is a Claude Code *routine* (scheduled cloud agent). Every
  weekday at **12:00 UTC** (= 5:00am Pacific during daylight time, 4:00am in
  winter — comfortably pre-market year-round) it:
  1. reads the current Artifact HTML,
  2. researches the day from the club reading list (Morning Brew, Brew
     Markets, Financial Times, Axios Markets, Wall Street Oasis — The Daily
     Peel, CFO Brew, Money Stuff, Stratechery/Sharp Tech, The Diff,
     TechCrunch, plus Yahoo Finance / CNBC / CNN Markets, an economic
     calendar, and **SEC EDGAR** for recent watchlist-company filings),
  3. rewrites only the JSON data block,
  4. republishes the **same** Artifact URL in place.

There is no server, no repo checkout, and no API key to manage — the routine
runs as Claude in Anthropic's cloud.

- **Artifact URL:** https://claude.ai/code/artifact/67ad9f26-996d-477f-be57-3203df2c7a01
- **Routine:** https://claude.ai/code/routines/trig_01Ybp9Hn2JXjYzSKrBtB2MQn

### Making the link public
Artifacts are private by default. Open the Artifact, use its **share** menu to
enable "anyone with the link," then share that link with the club.

### Changing the schedule / prompt
Edit the routine at the URL above (or via `/schedule` in Claude Code). The
cron is in UTC; `0 12 * * 1-5` is weekday 12:00 UTC. The full editor prompt —
sections, schema, source list — is stored on the routine.

### If a run misbehaves
`/schedule` → list runs, or check
https://claude.ai/code/routines/trig_01Ybp9Hn2JXjYzSKrBtB2MQn . Each run logs
its research, the JSON it wrote, and the publish result.

## Editing the design

Everything visual is in `site/bulletin.html` (one `<style>` block). To change
the layout or styling, edit that file and re-publish it to the same Artifact
URL (`Artifact` tool with `url` set, or from Claude Code:
"republish site/bulletin.html to <artifact URL>"). The routine only touches
the JSON data block, so design edits and daily content updates don't collide.

## Keeping this folder on GitHub (optional backup)

The live bulletin does **not** need GitHub — it updates itself through the
routine. But if you want this `soreno-site/` folder version-controlled as a
backup and change log, use GitHub Desktop:

1. **GitHub Desktop → File → Add Local Repository…** and pick this
   `soreno-site` folder. It will offer to *create a repository here* — accept
   (that runs `git init`).
2. Write a first commit summary (e.g. "Initial Soreno source") and click
   **Commit to main**.
3. Click **Publish repository** (top bar). Untick "Keep this code private" only
   if you want the source public; the bulletin link is shared separately either
   way. Click **Publish repository**.
4. From then on: after any edit here, GitHub Desktop shows the diff — write a
   summary, **Commit to main**, then **Push origin**.

This repo is a mirror of the source, not the thing that publishes the page, so
pushing here never changes the live bulletin.

## `_alt-github-pages/` — the other way to host this

The original scaffold hosted Soreno on **GitHub Pages** with a **GitHub
Actions** cron that called the Anthropic API to generate `data.json`. That
version is parked in `_alt-github-pages/` (`index.html`, `scripts/generate.mjs`,
`.github/workflows/daily-update.yml`). Use it instead if you'd rather have a
plain `github.io` URL and don't mind creating a repo, adding an
`ANTHROPIC_API_KEY` secret, and enabling Pages. See the comments in those
files.

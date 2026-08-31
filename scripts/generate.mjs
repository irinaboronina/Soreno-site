// Regenerates the Soreno bulletin's data block inside index.html.
//
// Mirrors the Claude Artifact routine (same source list, same JSON schema) but
// runs on Google's Gemini free tier so the GitHub Pages copy costs nothing.
// Run daily by the GitHub Actions workflow.
//
// Requires env var GEMINI_API_KEY - a free key from https://aistudio.google.com/apikey
// (no credit card). Set it as a GitHub Actions repo secret; never commit it.

import { readFile, writeFile } from "node:fs/promises";

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error("Missing GEMINI_API_KEY environment variable.");
  process.exit(1);
}

const MODEL = "gemini-2.5-flash"; // free-tier; fall back to "gemini-2.0-flash" if unavailable
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
const INDEX_FILE = new URL("../index.html", import.meta.url);
const DATA_RE =
  /(<script id="bulletin-data" type="application\/json">\n)([\s\S]*?)(\n<\/script>)/;

// --- date context (America/New_York) ---------------------------------------
const nyParts = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
}).formatToParts(new Date());
const part = (t) => nyParts.find((p) => p.type === t)?.value ?? "";
const weekdayET = part("weekday");
const prettyDateET = `${weekdayET}, ${part("month")} ${part("day")}, ${part("year")}`;
const isoDateET = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/New_York",
}).format(new Date()); // YYYY-MM-DD

// --- prompt ---------------------------------------------------------------
const prompt = `You are the automated editor of "Soreno," a daily pre-market finance bulletin for the NU Oakland Investing Club (Northeastern University, Oakland). Today in US Eastern time is ${prettyDateET} (${isoDateET}). Use Google Search to research the day's real market conditions before writing anything time-sensitive - never rely on memory for prices, dates, or headlines.

US equity markets are closed on weekends and NYSE holidays (New Year's Day, MLK Day, Presidents' Day, Good Friday, Memorial Day, Juneteenth, Independence Day, Labor Day = first Monday of September, Thanksgiving = fourth Thursday of November, Christmas; early close the day after Thanksgiving and on Christmas Eve). If markets are closed today, still produce an edition but set "marketsClosed": true, label "edition" accordingly (e.g. "Weekend edition" or "Holiday edition - markets closed"), and soften the "overnight" framing.

Prioritise the club reading list: Morning Brew, Brew Markets, Financial Times, Axios Markets, Wall Street Oasis - The Daily Peel, then CFO Brew, Money Stuff (Matt Levine / Bloomberg), Stratechery and Sharp Tech, The Diff, TechCrunch; plus Yahoo Finance / CNBC / CNN Markets for quotes and levels, an economic-calendar page, and SEC EDGAR (sec.gov) for recent watchlist-company filings.

Output ONE JSON object and nothing else - no markdown code fences, no preamble, no commentary. Exact shape (all strings plain text, no HTML, plain ASCII hyphens not fancy dashes):

{
  "date": "${isoDateET}",
  "prettyDate": "${prettyDateET}",
  "edition": "Daily edition",
  "compiled": "Www Mmm D, YYYY - HH:MM ET",
  "refresh": "Trading days, pre-market",
  "marketsClosed": false,
  "ticker": [ {"label":"S&P 500","value":"...","change":"...","dir":"up|down|flat"} ... 6-9 ],
  "pulse": [ {"kicker":"...","headline":"...","blurb":"..."} ... exactly 5 ],
  "macro": {
    "rate": {"k":"Fed funds target","v":"...","s":"..."},
    "stance": {"k":"Policy tilt","v":"...","s":"..."},
    "nextEvent": {"k":"Next FOMC","v":"...","s":"..."},
    "week": [ {"day":"Mon Sep 8","event":"...","note":"..."} ... 4-6 ],
    "watching": "one sentence"
  },
  "tech": [ {"kicker":"...","headline":"...","blurb":"..."} ... 3-4 ],
  "radar": {
    "asOf": "one-sentence caveat about the market-cap snapshot",
    "rows": [ {"ticker":"PDFS","co":"PDF Solutions","mcap":"~$1.9B","thesis":"...","flag":"Quiet","hot":false} ... all 10, in this order: PDFS, ZD, ATEN, PRGS, BL, APPS, YELP, GTM, AI, MQ ]
  },
  "filings": {
    "asOf": "one-sentence note on the window covered and the EDGAR source",
    "rows": [ {"ticker":"MQ","form":"8-K","what":"one plain sentence on the substance","date":"Aug 27"} ... 0-8, newest first, may be empty ]
  },
  "questions": [ {"q":"...","a":"..."} ... exactly 5 ],
  "interview": [ {"company":"...","question":"...","tip":"..."} ... exactly 5 ],
  "term": {"term":"...","def":"...","seeAlso":"see also: ... / ..."},
  "discussion": [ {"headline":"...","angle":"..."} ... exactly 3 ],
  "sourceFoot": "Compiled from the club reading list (incl. WSO's The Daily Peel and SEC EDGAR) via live web search. Figures are as reported by those outlets for ${prettyDateET}; a starting point for discussion, not investment advice.",
  "generatedAt": "<current time, ISO 8601 UTC>"
}

Content rules:
- Market Pulse: the 5 most important markets/macro developments in the last ~24h (overnight + pre-market), each a punchy headline plus a 1-2 sentence why-it-matters.
- Macro Watch: current Fed funds target range and stance, the next FOMC meeting date, this week's US economic-data calendar (day / release / why it matters), and one "what decides the week" sentence.
- Tech Desk: 3-4 tech-industry developments relevant to a tech-focused equity club (AI infrastructure, semis, enterprise software, major product or regulatory news).
- Small-Cap Radar: for each of PDFS, ZD, ATEN, PRGS, BL, APPS, YELP, GTM, AI, MQ - a one-line "what they do & why we watch" plus a short status flag (fresh news / upcoming earnings, else "Quiet"). Keep a reasonable prior market cap if you cannot verify a new one.
- Filings Watch: search SEC EDGAR for filings by those 10 tickers in the past ~7 days. Include 10-K, 20-F, 10-Q, 8-K, DEF 14A / proxy, S-1, 424B; skip routine Form 3/4/5 insider filings unless a very large or unusual insider trade. Newest first. If EDGAR data is unavailable, use filing news coverage and say so in the asOf note. An empty rows array is fine.
- Trading Floor: 5 market-analysis questions testing understanding of CURRENT conditions, each with a concise 2-3 sentence answer.
- The Desk: 5 interview-prep items {company, question, tip} for real large finance or tech-finance employers (Goldman Sachs, JPMorgan, Citadel, Blackstone, Jane Street, Morgan Stanley, Evercore, PJT, McKinsey, etc.).
- Term of the Day: one glossary term with a plain-language definition. Rotate day to day. Pool: market cap, P/E, EPS, free cash flow, long/short, diversification, penny stock, liquidity, RBV, VRIO, moat, insider ownership, R&D intensity, TAM, dilution, EV/Revenue, Price/Sales, the Fed / fed funds rate, CPI, earnings season, guidance, jobs report, yield curve, VIX / volatility, forward guidance, 10-K, 10-Q, 8-K, 20-F, SEC / EDGAR.
- Discussion Prep: 3 headlines framed as prompts for the weekly club news discussion, each with one line on what to bring; tie at least one to a watchlist name.

Do not fabricate numbers or filings. If you cannot verify something, describe it qualitatively or leave it out. Keep every string concise - this is read on a phone. Output valid JSON only.`;

// --- Gemini call (REST; Google Search grounding) --------------------------
async function callGemini() {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-goog-api-key": API_KEY,
    },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      tools: [{ google_search: {} }],
      generationConfig: {
        temperature: 0.6,
        maxOutputTokens: 8192,
        responseMimeType: "text/plain",
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Gemini API ${res.status}: ${body.slice(0, 600)}`);
  }

  const data = await res.json();
  const cand = data.candidates?.[0];
  if (!cand) throw new Error("No candidate in Gemini response: " + JSON.stringify(data).slice(0, 400));
  if (cand.finishReason && !["STOP", "MAX_TOKENS"].includes(cand.finishReason))
    throw new Error(`Gemini stopped early: ${cand.finishReason}`);

  return (cand.content?.parts || [])
    .map((p) => p.text || "")
    .join("")
    .trim();
}

// --- validation --------------------------------------------------------------
function validate(d) {
  const counts = {
    ticker: [6, 9],
    pulse: [5, 5],
    tech: [3, 4],
    questions: [5, 5],
    interview: [5, 5],
    discussion: [3, 3],
  };
  for (const [key, [lo, hi]] of Object.entries(counts)) {
    const n = Array.isArray(d[key]) ? d[key].length : -1;
    if (n < lo || n > hi) throw new Error(`"${key}" has ${n} items, expected ${lo}-${hi}`);
  }
  if (!d.macro || !Array.isArray(d.macro.week) || d.macro.week.length < 4)
    throw new Error('"macro.week" missing or too short');
  if (!d.radar || !Array.isArray(d.radar.rows) || d.radar.rows.length !== 10)
    throw new Error('"radar.rows" must have exactly 10 entries');
  if (!d.filings || !Array.isArray(d.filings.rows))
    throw new Error('"filings.rows" must be an array (may be empty)');
  if (!d.term || !d.term.term) throw new Error('"term" missing');
}

// --- main -----------------------------------------------------------------
async function main() {
  console.log(`Generating Soreno bulletin for ${prettyDateET} (Gemini: ${MODEL})...`);
  const html = await readFile(INDEX_FILE, "utf8");
  if (!DATA_RE.test(html)) throw new Error("bulletin-data script block not found in index.html");

  const raw = await callGemini();
  const cleaned = raw.replace(/```json|```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1)
    throw new Error("No JSON object in model response: " + cleaned.slice(0, 400));

  const parsed = JSON.parse(cleaned.slice(start, end + 1));
  validate(parsed);

  parsed.date ||= isoDateET;
  parsed.prettyDate ||= prettyDateET;
  parsed.refresh ||= "Trading days, pre-market";
  parsed.generatedAt = new Date().toISOString();

  const block = JSON.stringify(parsed, null, 2);
  const updated = html.replace(DATA_RE, (_m, open, _old, close) => open + block + close);
  await writeFile(INDEX_FILE, updated);
  console.log(
    `Wrote index.html - ${parsed.edition || "edition"} for ${parsed.prettyDate}` +
      (parsed.marketsClosed ? " (markets closed)" : "") +
      `, ${parsed.filings.rows.length} filing(s).`
  );
}

main().catch((err) => {
  console.error("Generation failed:", err.message || err);
  process.exit(1);
});

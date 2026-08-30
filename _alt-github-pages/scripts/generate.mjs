// Generates today's Soreno bulletin by calling the Anthropic API with web search,
// then writes the result to site/data.json. Run daily by the GitHub Actions workflow.
//
// Requires env var ANTHROPIC_API_KEY (set as a GitHub Actions secret, never committed).

import { writeFile } from 'node:fs/promises';

const API_KEY = process.env.ANTHROPIC_API_KEY;
if (!API_KEY) {
  console.error('Missing ANTHROPIC_API_KEY environment variable.');
  process.exit(1);
}

const today = new Date().toISOString().slice(0, 10);

const systemPrompt = `You are the editor of "Soreno," a daily bulletin for a university investing club. Today's date is ${today}. Use web search to find real, current market news and conditions before writing anything — do not rely on memory for anything time-sensitive.

Output ONLY a raw JSON object, no markdown code fences, no preamble, no commentary. Exact shape:

{
  "pulse": [
    {"headline": "short punchy headline, under 8 words", "blurb": "1-2 sentence explanation of why it matters, grounded in today's actual news"}
  ],
  "questions": [
    {"question": "a market-analysis question testing understanding of current conditions (rates, earnings, sectors, macro data, etc.)", "answer": "concise, correct answer, 2-3 sentences"}
  ],
  "interview": [
    {"company": "a real large finance employer, e.g. Goldman Sachs, JPMorgan, Citadel, Blackstone, McKinsey, Jane Street", "question": "a realistic interview question that company is known to ask, tied to current market context where relevant", "tip": "one short sentence of advice for answering it well"}
  ]
}

Include exactly 5 items in "pulse", 5 in "questions", and 5 in "interview". Keep every string concise — this must fit a phone screen. Valid JSON only, nothing else.`;

async function main() {
  console.log(`Generating Soreno bulletin for ${today}...`);

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [
        { role: 'user', content: "Research today's real market conditions with web search, then produce the JSON bulletin now." },
      ],
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Anthropic API error ${response.status}: ${body.slice(0, 500)}`);
  }

  const data = await response.json();
  const textBlocks = (data.content || [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n');

  const cleaned = textBlocks.replace(/```json|```/g, '').trim();
  const jsonStart = cleaned.indexOf('{');
  const jsonEnd = cleaned.lastIndexOf('}');
  if (jsonStart === -1 || jsonEnd === -1) {
    throw new Error('No JSON object found in model response: ' + cleaned.slice(0, 300));
  }

  const parsed = JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1));

  for (const key of ['pulse', 'questions', 'interview']) {
    if (!Array.isArray(parsed[key]) || parsed[key].length === 0) {
      throw new Error(`Response missing or empty "${key}" array`);
    }
  }

  const payload = {
    date: today,
    generatedAt: new Date().toISOString(),
    ...parsed,
  };

  await writeFile('site/data.json', JSON.stringify(payload, null, 2));
  console.log('Wrote site/data.json for', today);
}

main().catch((err) => {
  console.error('Generation failed:', err);
  process.exit(1);
});

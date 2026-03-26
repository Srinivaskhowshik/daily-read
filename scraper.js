/**
 * scraper.js — Daily article scraper
 * Sources: Guardian Opinion API, Aeon RSS, Big Think RSS, Psyche RSS
 * Output: articles.json
 *
 * Usage:
 *   node scraper.js
 *
 * Requires:
 *   npm install node-fetch rss-parser
 *   (Node 18+ has native fetch, but rss-parser is still needed)
 *
 * For Guardian: get a free API key at https://open-platform.theguardian.com/access/
 * Set it as env var: GUARDIAN_API_KEY=your_key_here
 */

const RSSParser = require('rss-parser');
const fs = require('fs');
const path = require('path');

const parser = new RSSParser({
  customFields: {
    item: ['media:content', 'media:thumbnail', 'enclosure', ['media:content', 'mediaContent']],
  },
});

const GUARDIAN_API_KEY = process.env.GUARDIAN_API_KEY || 'test'; // 'test' key works but is rate-limited
const OUTPUT_FILE = path.join(__dirname, 'articles.json');
const MAX_PER_SOURCE = 15;

// ── Helpers ──
function today() {
  return new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function extractImage(item) {
  // Try various RSS image fields
  if (item['media:content'] && item['media:content'].$ && item['media:content'].$.url) {
    return item['media:content'].$.url;
  }
  if (item.mediaContent && item.mediaContent.$ && item.mediaContent.$.url) {
    return item.mediaContent.$.url;
  }
  if (item['media:thumbnail'] && item['media:thumbnail'].$ && item['media:thumbnail'].$.url) {
    return item['media:thumbnail'].$.url;
  }
  if (item.enclosure && item.enclosure.url) return item.enclosure.url;
  // Extract from content/summary HTML
  const html = item.content || item.summary || item['content:encoded'] || '';
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (match) return match[1];
  return '';
}

// ── Guardian Opinion ──
async function fetchGuardian() {
  console.log('Fetching Guardian Opinion…');
  try {
    const url = `https://content.guardianapis.com/commentisfree/opinion?api-key=${GUARDIAN_API_KEY}&show-fields=thumbnail,byline,headline&page-size=${MAX_PER_SOURCE}&order-by=newest`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.response.status !== 'ok') throw new Error('Guardian API error');
    return data.response.results.map(item => ({
      source: 'guardian',
      title: item.fields.headline || item.webTitle,
      url: item.webUrl,
      author: item.fields.byline || '',
      date: today(),
      image: item.fields.thumbnail || '',
    }));
  } catch (err) {
    console.error('Guardian fetch failed:', err.message);
    return [];
  }
}

// ── Aeon Essays ──
async function fetchAeon() {
  console.log('Fetching Aeon…');
  try {
    const feed = await parser.parseURL('https://aeon.co/feed.rss');
    return feed.items.slice(0, MAX_PER_SOURCE).map(item => ({
      source: 'aeon',
      title: item.title || '',
      url: item.link || '',
      author: item.creator || item.author || '',
      date: today(),
      image: extractImage(item),
    }));
  } catch (err) {
    console.error('Aeon fetch failed:', err.message);
    return [];
  }
}

// ── Big Think ──
async function fetchBigThink() {
  console.log('Fetching Big Think…');
  try {
    const feed = await parser.parseURL('https://bigthink.com/feed/');
    return feed.items.slice(0, MAX_PER_SOURCE).map(item => ({
      source: 'bigthink',
      title: item.title || '',
      url: item.link || '',
      author: item.creator || item.author || 'Big Think',
      date: today(),
      image: extractImage(item),
    }));
  } catch (err) {
    console.error('Big Think fetch failed:', err.message);
    return [];
  }
}

// ── Psyche ──
async function fetchPsyche() {
  console.log('Fetching Psyche…');
  try {
    const feed = await parser.parseURL('https://psyche.co/feed');
    return feed.items.slice(0, MAX_PER_SOURCE).map(item => ({
      source: 'psyche',
      title: item.title || '',
      url: item.link || '',
      author: item.creator || item.author || '',
      date: today(),
      image: extractImage(item),
    }));
  } catch (err) {
    console.error('Psyche fetch failed:', err.message);
    return [];
  }
}

// ── Main ──
async function main() {
  console.log('=== Daily Read Scraper ===');
  const [guardian, aeon, bigthink, psyche] = await Promise.all([
    fetchGuardian(),
    fetchAeon(),
    fetchBigThink(),
    fetchPsyche(),
  ]);

  // Interleave sources for a mixed feed
  const all = [];
  const sources = [guardian, aeon, bigthink, psyche];
  const maxLen = Math.max(...sources.map(s => s.length));
  for (let i = 0; i < maxLen; i++) {
    for (const source of sources) {
      if (source[i]) all.push(source[i]);
    }
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(all, null, 2));
  console.log(`✓ Wrote ${all.length} articles to articles.json`);
  console.log(`  Guardian: ${guardian.length}, Aeon: ${aeon.length}, Big Think: ${bigthink.length}, Psyche: ${psyche.length}`);
}

main().catch(err => { console.error(err); process.exit(1); });

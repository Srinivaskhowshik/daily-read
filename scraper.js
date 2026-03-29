/**
 * scraper.js — Daily article scraper
 * Sources: Guardian Opinion API, Aeon RSS, Big Think RSS, Psyche RSS
 * Output: articles.json
 *
 * Usage:
 *   node scraper.js
 *
 * Requires:
 *   npm install rss-parser
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

const GUARDIAN_API_KEY = process.env.GUARDIAN_API_KEY || 'test';
const OUTPUT_FILE = path.join(__dirname, 'articles.json');
const MAX_PER_SOURCE = 20; // fetch more, then filter down to today's

// ── Date helpers ──

// Returns today's date in UTC as YYYY-MM-DD
function todayUTC() {
  return new Date().toISOString().slice(0, 10);
}

// Format a date nicely for display: "27 Mar 2026"
function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Check if a date string is today (in UTC)
function isToday(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (isNaN(d)) return false;
  return d.toISOString().slice(0, 10) === todayUTC();
}

// ── Image extractor ──
function extractImage(item) {
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
  const html = item.content || item.summary || item['content:encoded'] || '';
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (match) return match[1];
  return '';
}

// ── Guardian Opinion ──
async function fetchGuardian() {
  console.log('Fetching Guardian Opinion…');
  try {
    const today = todayUTC();
    const url = `https://content.guardianapis.com/commentisfree/opinion?api-key=${GUARDIAN_API_KEY}&show-fields=thumbnail,byline,headline,firstPublicationDate&page-size=${MAX_PER_SOURCE}&order-by=newest&from-date=${today}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.response.status !== 'ok') throw new Error('Guardian API error');
    return data.response.results
      .filter(item => isToday(item.webPublicationDate))
      .map(item => ({
        source: 'guardian',
        title: item.fields.headline || item.webTitle,
        url: item.webUrl,
        author: item.fields.byline || '',
        publishedAt: item.webPublicationDate,
        date: formatDate(item.webPublicationDate),
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
    return feed.items
      .filter(item => isToday(item.pubDate || item.isoDate))
      .slice(0, MAX_PER_SOURCE)
      .map(item => ({
        source: 'aeon',
        title: item.title || '',
        url: item.link || '',
        author: item.creator || item.author || '',
        publishedAt: item.isoDate || item.pubDate || '',
        date: formatDate(item.pubDate || item.isoDate),
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
    return feed.items
      .filter(item => isToday(item.pubDate || item.isoDate))
      .slice(0, MAX_PER_SOURCE)
      .map(item => ({
        source: 'bigthink',
        title: item.title || '',
        url: item.link || '',
        author: item.creator || item.author || 'Big Think',
        publishedAt: item.isoDate || item.pubDate || '',
        date: formatDate(item.pubDate || item.isoDate),
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
    return feed.items
      .filter(item => isToday(item.pubDate || item.isoDate))
      .slice(0, MAX_PER_SOURCE)
      .map(item => ({
        source: 'psyche',
        title: item.title || '',
        url: item.link || '',
        author: item.creator || item.author || '',
        publishedAt: item.isoDate || item.pubDate || '',
        date: formatDate(item.pubDate || item.isoDate),
        image: extractImage(item),
      }));
  } catch (err) {
    console.error('Psyche fetch failed:', err.message);
    return [];
  }
}

// ── Main ──
async function main() {
  console.log(`=== Daily Read Scraper — ${todayUTC()} ===`);
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

  if (all.length === 0) {
    console.log('⚠ No articles found for today. This is normal if no new pieces were published yet.');
  }
}

main().catch(err => { console.error(err); process.exit(1); });

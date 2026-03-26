# ✦ The Daily Read

A minimal, elegant daily reading digest pulling from Guardian Opinion, Aeon, Big Think, and Psyche.

## Files

| File | Purpose |
|------|---------|
| `index.html` | The website (no build step needed) |
| `scraper.js` | Fetches articles and writes `articles.json` |
| `articles.json` | Generated daily — this is what the site reads |
| `.github/workflows/daily.yml` | Auto-runs scraper every day at 6am UTC |

---

## 🚀 Setup in 20 minutes

### Step 1 — Get a Guardian API key (free)
1. Go to https://open-platform.theguardian.com/access/
2. Register for a free developer key
3. You'll get a key like `abc123def-xxxx-xxxx-xxxx-xxxxxxxxxxxx`

### Step 2 — Create a GitHub repo
1. Go to https://github.com/new
2. Create a **public** repo (e.g. `daily-read`)
3. Upload all these files into it

### Step 3 — Add your Guardian API key as a secret
1. In your GitHub repo → **Settings → Secrets and variables → Actions**
2. Click **New repository secret**
3. Name: `GUARDIAN_API_KEY`, Value: your key from Step 1

### Step 4 — Run the scraper for the first time
1. In your repo → **Actions** tab
2. Click **Daily Article Scraper** → **Run workflow**
3. Wait ~30 seconds → it will commit `articles.json` to your repo

### Step 5 — Deploy to Netlify (free)
1. Go to https://netlify.com → **Sign up** (use GitHub login)
2. Click **Add new site → Import an existing project**
3. Choose **GitHub** → select your `daily-read` repo
4. Settings:
   - **Build command**: *(leave empty)*
   - **Publish directory**: `.` (just a dot)
5. Click **Deploy site**
6. Done! Netlify gives you a URL like `https://your-site-name.netlify.app`

### Step 6 — Auto-deploy on scrape
Netlify auto-deploys every time GitHub gets a new commit — which happens every day when the scraper runs. Nothing else to do.

---

## Manual scrape (local)

```bash
npm install
GUARDIAN_API_KEY=your_key node scraper.js
```

---

## Customise

- **Change schedule**: Edit `cron: '0 6 * * *'` in the workflow file (uses UTC)
- **More/fewer articles**: Change `MAX_PER_SOURCE` in `scraper.js`
- **Add more sources**: Add a new `fetchXYZ()` function following the same pattern

---

## How it works

```
GitHub Actions (6am UTC)
  → runs scraper.js
  → fetches Guardian API + RSS feeds
  → writes articles.json
  → commits to repo
  → Netlify detects new commit
  → auto-deploys updated site
```

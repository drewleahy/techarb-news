# TechArb News

A one-page microsite for TechArb, the student-run entrepreneurs' library at the University of Michigan.

* RSVP for Tuesday Night (with a live headcount and a Ship Showcase opt-in)
* Students post their startup news: shipped, launched, raised, hiring, asking, what broke
* Static HTML/CSS/JS. Supabase for the database. No build step, no server.

## 15-minute setup

### 1. Supabase
1. Create a free project at https://supabase.com.
2. Open the SQL editor, paste `supabase/schema.sql`, run it. That creates the `events`, `rsvps` and `posts` tables, row-level security, helper functions, and seeds the Nov 3 event.
3. Project Settings → API. Copy the **Project URL** and the **anon public** key.
4. Paste both into `config.js`.

The anon key is designed to be public. The policies in `schema.sql` mean it can only read events and posts, insert RSVPs and posts, and never read emails.

### 2. Deploy

**GitHub Pages**
1. Push this folder to a repo (for example `techarb-news`).
2. Settings → Pages → Source: *Deploy from a branch*, branch `main`, folder `/ (root)`.
3. The site is live at `https://<org>.github.io/techarb-news/` in about a minute. `.nojekyll` is already included.

**Vercel or Netlify**: import the repo, no build command, output directory `/`. Done.

### 3. Local preview
Open `index.html` in a browser, or `python3 -m http.server` in this folder. Without keys in `config.js` the page runs in **demo mode** with sample posts and a maize banner at the bottom; nothing is saved.

## Running it week to week

* **New Tuesday Night**: insert a row in `events` (Supabase → Table editor). The site always shows the next upcoming event.
* **Export RSVPs for pizza math**: Table editor → `rsvps` → filter by event → Export CSV.
* **Moderation**: posts publish instantly. To review first, change `approved boolean not null default true` to `default false` in `posts`, and flip `approved` in the table editor. Note that the insert policy requires `approved = true`, so also change that policy to `with check (true)` if you switch to moderation.
* **Spam**: forms have a honeypot field. If it isn't enough, turn on Supabase's per-IP rate limiting or add Cloudflare Turnstile.

## Brand
Built on the TechArb Brand Guidelines v2: Outfit (display), Atkinson Hyperlegible (body), Michigan Blue `#00274C` and Maize `#FFCB05` only, square corners, Arc filament mark. Logo files are in `assets/`.

## Files
```
index.html          the page
styles.css          brand styles
app.js              Supabase client, RSVP + post forms, feed, demo mode
config.js           your Supabase URL + anon key
supabase/schema.sql tables, policies, functions, seed event
assets/             logos, favicon
```

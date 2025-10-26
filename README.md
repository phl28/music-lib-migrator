# TrackTransit

Client‑only SolidJS web app to migrate playlists between Spotify and YouTube (as seen in YouTube Music). BYO credentials: users paste their own Spotify Client ID and Google OAuth Client ID; no backend, no secrets stored server‑side.

## Features
- Spotify → YouTube and YouTube → Spotify (playlists; liked songs via a generated playlist)
- In‑browser OAuth: Spotify PKCE; Google Identity Services Token Client
- Dry‑run matching preview with per‑item details
- Migration options: create new or merge by exact title; skip duplicates in input; skip items already in destination
- Progress indicators with cancellable processing
- Deployed to GitHub Pages via Actions

## Limitations
- YouTube Music “Liked songs” is not exposed via official APIs; we create a normal playlist instead
- YouTube Data API quotas apply (~10k units/day; search=100, playlist insert=50)

## Requirements
- Node.js 20.19+ or 22.12+
- A Spotify Developer App (no secret needed)
- A Google Cloud OAuth Client (Web) with YouTube Data API v3 enabled

## Local development
```bash
pnpm i # or npm i / yarn
pnpm dev # opens http://localhost:5173
```

## Auth setup (BYO credentials)
In the app’s Setup page, paste your Client IDs. Use these settings when creating the apps:

### Spotify (PKCE)
1) https://developer.spotify.com/dashboard → Create app
2) Redirect URI (exact match):
   - Local: `http://localhost:5173/callback/spotify`
   - Pages: `https://<your-username>.github.io/<repo>/callback/spotify`
3) Scopes requested at runtime:
   - `playlist-read-private playlist-read-collaborative user-library-read playlist-modify-public playlist-modify-private`

### Google (YouTube Data API v3)
1) Enable “YouTube Data API v3” in Google Cloud Console
2) Create OAuth client: Application type = Web application
3) Authorized JavaScript origins:
   - `http://localhost:5173`
   - `https://<your-username>.github.io`
4) (Optional) Authorized redirect URI used by the app’s callback route:
   - `https://<your-username>.github.io/<repo>/callback/google`
5) Scopes requested at runtime:
   - `https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/youtube`

## Deploy to GitHub Pages
This repo includes a Pages workflow. Steps:
1) Push to the `main` branch
2) In GitHub → Settings → Pages → Build and deployment = GitHub Actions
3) Visit `https://<your-username>.github.io/<repo>/`

Notes:
- The workflow builds with `--base=/<repo>/` and generates `404.html` for SPA routing (CI runs `cp dist/index.html dist/404.html`)
- Add the Pages redirect URIs shown above to your Spotify/Google apps

## Troubleshooting
- 404 on deep links like `/callback/spotify` on Pages: this is normal for SPAs on GitHub Pages. The workflow‑generated `404.html` makes the app load, but you must ensure the app’s router is configured with the repo base path and app links stay under `https://<username>.github.io/<repo>/`.
- Redirects go to `https://<username>.github.io/` (root) or auth appears not connected: avoid hard‑coded absolute links like `/connect` or `/pick`. Use your router’s base‑aware links/components (e.g., Solid Router `<A href="/...">` and `useNavigate`) so navigation respects the subpath.
- Spotify: redirect_uri must match exactly. For this repo the Pages URI is:
  - `https://<your-username>.github.io/<repo>/callback/spotify`
- Google 403 “Access blocked … app not completed verification”: your OAuth consent screen is in Testing. Either add your account as a Test user (Google Cloud Console → APIs & Services → OAuth consent screen → Test users) or publish the app to Production. Also verify Authorized JavaScript origins include your Pages origin `https://<your-username>.github.io` (and `http://localhost:5173` for local).

## Security & privacy
- Client IDs are not secrets; all tokens stay in your browser
- Optional localStorage persistence is opt‑in via the UI; clear anytime

## Roadmap
- Improve matching accuracy (ISRC preferred; title/artist/duration fallback)
- Batched migration with retries and a final CSV/JSON report

## License
MIT

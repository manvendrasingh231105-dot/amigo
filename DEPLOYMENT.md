# Deploying Amigo Live

Your app is already built as a proper website (React + Vite frontend, Express server, Firebase backend). It just needs to be deployed to a live server. Here are your options, easiest first.

## 0. Before you deploy (do this no matter which option you pick)

1. Get a **Gemini API key**: https://aistudio.google.com/app/apikey
2. Copy `.env.example` to `.env.local` and fill it in:
   ```
   GEMINI_API_KEY="your-real-key-here"
   APP_URL="https://your-future-domain.com"
   ```
3. Your Firebase project (`amplified-torch-rrwfn`) is already wired up in `firebase-applet-config.json` — no changes needed there since you're keeping it as-is.
4. **Check your Firestore security rules** (`firestore.rules`) are deployed to that Firebase project — the app will silently fail writes otherwise. From the Firebase console or CLI:
   ```
   firebase deploy --only firestore:rules
   ```

## Option A: Firebase Hosting (recommended — you already use Firebase)

Since your database/auth already live on Firebase, hosting there too keeps everything in one place and avoids CORS/config headaches.

```bash
npm install -g firebase-tools
firebase login
npm run build
firebase init hosting   # point "public directory" to dist, choose "single-page app: yes"
firebase deploy --only hosting
```

Note: this serves the static frontend only. If you need the Express `/api/health` route or any future server-side routes, use Option B or C instead, or convert them to Firebase Cloud Functions.

## Option B: A VPS / your own server (DigitalOcean, AWS EC2, etc.)

This uses your existing `server.ts` (Express), which serves the built frontend AND can hold server-side routes.

```bash
npm install
npm run build
npm run start        # runs dist/server.cjs on port 3000
```

Put this behind a reverse proxy (Nginx or Caddy) for your domain + HTTPS. Example Nginx snippet:

```nginx
server {
    listen 80;
    server_name your-domain.com;
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
    }
}
```

Then get a free TLS cert with `certbot --nginx`. Run the app persistently with `pm2 start dist/server.cjs --name amigo` or a systemd service so it survives reboots.

## Option C: Vercel / Netlify (fastest, free tier)

These platforms auto-detect Vite. Steps:

1. Push this code to a GitHub repo.
2. Import the repo in Vercel or Netlify.
3. Build command: `npm run build` — Output directory: `dist`
4. Add `GEMINI_API_KEY` and `APP_URL` as environment variables in the platform's dashboard (do NOT commit `.env.local`).
5. Deploy.

Note: Vercel/Netlify serve static output by default — your `/api/health` Express route won't run unless you convert it to a serverless function. Since your app's real backend logic (auth, data) lives in Firebase already, this is usually fine.

## Which should you pick?

- **Firebase Hosting** — simplest, matches your existing backend, free tier is generous. Go with this unless you specifically need custom server routes.
- **VPS** — most control, needed if you plan to add real Express API routes later.
- **Vercel/Netlify** — fastest to get a live URL today, great for quick sharing.

## Common gotchas

- Blank page after deploy → check browser console; usually a missing env var or Firestore rules blocking reads.
- Login works but data doesn't save → check `firestore.rules` is deployed and matches what `firebase.ts` expects.
- 404 on refresh (any route but `/`) on Vercel/Netlify → make sure SPA fallback/rewrite to `index.html` is configured (Vercel/Netlify usually do this automatically for Vite projects, but double check).

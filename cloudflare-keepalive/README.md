# TripMate 24/7 Keep-Alive Cloudflare Worker

This Cloudflare Worker eliminates the **15-minute idle sleep** on Render's Free Tier and prevents the **7-day inactivity pause** on Supabase.

---

### How It Works
- Runs every **8 minutes** via Cloudflare Cron Trigger (`crons = ["*/8 * * * *"]`).
- Sends a `GET` request to your Render WhatsApp Worker's `/health` endpoint.
- Since Render free tier sleeps after 15 minutes of inactivity, an 8-minute ping guarantees it **never sleeps**.
- The worker's periodic sync loop simultaneously touches Supabase, ensuring Supabase **never pauses**.

---

### Deploy in 2 Minutes

#### Method A: Using Wrangler CLI (Quickest)
1. In `cloudflare-keepalive/wrangler.toml`, set `RENDER_HEALTH_URL` to your actual Render URL:
   ```toml
   [vars]
   RENDER_HEALTH_URL = "https://your-worker-name.onrender.com/health"
   ```
2. Run:
   ```bash
   cd cloudflare-keepalive
   npx wrangler deploy
   ```
3. Cloudflare will prompt you to log in (free) and deploy instantly!

#### Method B: Cloudflare Web Dashboard (No CLI needed)
1. Go to [dash.cloudflare.com](https://dash.cloudflare.com) &rarr; **Workers & Pages** &rarr; **Create Application** &rarr; **Create Worker**.
2. Name it `tripmate-keepalive` and click **Deploy**.
3. Click **Edit code** &rarr; Paste the contents of `src/index.js` &rarr; Click **Deploy**.
4. Go to **Settings** &rarr; **Triggers** &rarr; **Cron Triggers** &rarr; Add Cron Trigger: `*/8 * * * *` (Every 8 minutes).
5. Go to **Settings** &rarr; **Variables** &rarr; Add Environment Variable:
   - Variable Name: `RENDER_HEALTH_URL`
   - Value: `https://your-worker-name.onrender.com/health`
6. Click **Save and Deploy**.

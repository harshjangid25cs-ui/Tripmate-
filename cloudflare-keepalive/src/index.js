export default {
  /**
   * Cloudflare Cron Trigger (Runs every 8 minutes via crons = ["*/8 * * * *"])
   * Pings Render's /health endpoint to prevent the 15-minute free tier container sleep
   * and prevents Supabase's 7-day inactivity pause.
   */
  async scheduled(event, env, ctx) {
    const targetUrl = env.RENDER_HEALTH_URL;
    if (!targetUrl || targetUrl.includes('your-tripmate-worker')) {
      console.warn('[KeepAlive] RENDER_HEALTH_URL not configured. Please set RENDER_HEALTH_URL in wrangler.toml or Cloudflare dashboard.');
      return;
    }

    try {
      const startTime = Date.now();
      const res = await fetch(targetUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Cloudflare-Worker-KeepAlive/1.0',
          'Cache-Control': 'no-cache',
        },
      });
      const latency = Date.now() - startTime;
      console.log(`[KeepAlive] Pinged ${targetUrl} | Status: ${res.status} | Latency: ${latency}ms`);
    } catch (err) {
      console.error(`[KeepAlive] Failed to ping ${targetUrl}:`, err.message);
    }
  },

  /**
   * HTTP Handler for manual browser testing and uptime verification
   */
  async fetch(request, env, ctx) {
    const targetUrl = env.RENDER_HEALTH_URL;
    if (!targetUrl || targetUrl.includes('your-tripmate-worker')) {
      return new Response(
        JSON.stringify(
          {
            ok: false,
            message: 'RENDER_HEALTH_URL environment variable is not configured.',
            setupInstructions: 'Set RENDER_HEALTH_URL to your Render service /health endpoint (e.g., https://tripmate-worker.onrender.com/health).',
          },
          null,
          2
        ),
        { status: 400, headers: { 'content-type': 'application/json' } }
      );
    }

    try {
      const startTime = Date.now();
      const res = await fetch(targetUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Cloudflare-Worker-KeepAlive/1.0',
          'Cache-Control': 'no-cache',
        },
      });
      const latency = Date.now() - startTime;
      const text = await res.text();
      let parsed = null;
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = text;
      }

      return new Response(
        JSON.stringify(
          {
            ok: res.ok,
            workerOnline: res.ok,
            targetUrl,
            status: res.status,
            latencyMs: latency,
            renderResponse: parsed,
            timestamp: new Date().toISOString(),
          },
          null,
          2
        ),
        {
          status: res.ok ? 200 : 502,
          headers: { 'content-type': 'application/json' },
        }
      );
    } catch (err) {
      return new Response(
        JSON.stringify({ ok: false, error: err.message, targetUrl }, null, 2),
        { status: 502, headers: { 'content-type': 'application/json' } }
      );
    }
  },
};

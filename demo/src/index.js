export default {
  async fetch(request) {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>fastpass demo</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #0f172a;
      color: #e2e8f0;
    }
    .card {
      background: #1e293b;
      border-radius: 12px;
      padding: 3rem;
      max-width: 480px;
      text-align: center;
      box-shadow: 0 25px 50px rgba(0,0,0,0.3);
    }
    h1 { font-size: 1.75rem; margin-bottom: 0.75rem; }
    .check { font-size: 3rem; margin-bottom: 1rem; }
    p { color: #94a3b8; line-height: 1.6; }
    .meta { margin-top: 1.5rem; font-size: 0.85rem; color: #64748b; }
  </style>
</head>
<body>
  <div class="card">
    <div class="check">&#x2705;</div>
    <h1>You're in!</h1>
    <p>If you're seeing this, you made it past the Cloudflare Access gate. This page is protected by <strong>fastpass</strong>.</p>
    <div class="meta">your-domain.example.com</div>
  </div>
</body>
</html>`;

    return new Response(html, {
      headers: { "Content-Type": "text/html;charset=utf-8" },
    });
  },
};

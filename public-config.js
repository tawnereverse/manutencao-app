module.exports = async (_req, res) => {
  const url = process.env.SUPABASE_URL || "";
  const anonKey = process.env.SUPABASE_ANON_KEY || "";

  res.setHeader("Content-Type", "application/javascript; charset=utf-8");
  res.setHeader("Cache-Control", "no-store, max-age=0");

  res.status(200).send(
    `window.__APP_CONFIG__ = ${JSON.stringify({
      SUPABASE_URL: url,
      SUPABASE_ANON_KEY: anonKey
    })};`
  );
};

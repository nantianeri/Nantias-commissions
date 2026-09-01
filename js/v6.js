/* Nantia's Commissions V6 — Supabase client bootstrap */
(function () {
  const cfg = window.NANTIA_SUPABASE || {};
  const configured = cfg.url && !cfg.url.includes("YOUR-PROJECT") &&
                     cfg.anonKey && !cfg.anonKey.includes("YOUR_SUPABASE");
  window.NANTIA_V6 = {
    configured,
    client: null,
    async init() {
      if (!configured || !window.supabase) return null;
      this.client = window.supabase.createClient(cfg.url, cfg.anonKey);
      return this.client;
    }
  };
})();

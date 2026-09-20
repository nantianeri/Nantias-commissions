/* NANTIA'S COMMISSIONS — provider switching (V16.65) */
(function(){
  async function getClient(){
    const cfg=window.NANTIA_SUPABASE||{};
    if(!window.supabase||!cfg.url||!cfg.anonKey)return null;
    return window.supabase.createClient(cfg.url,cfg.anonKey);
  }
  function apply(cfg){
    const provider=String(cfg?.active_provider||'manual').toLowerCase();
    document.querySelectorAll('[data-payment-provider]').forEach(el=>{el.hidden=el.dataset.paymentProvider!==provider;});
    document.querySelectorAll('[data-payment-camerpay]').forEach(el=>{el.hidden=provider!=='camerpay';});
    document.querySelectorAll('[data-payment-manual]').forEach(el=>{el.hidden=provider==='camerpay';});
  }
  async function load(){
    const client=await getClient(); if(!client)return;
    const {data,error}=await client.rpc('get_public_payment_config');
    if(error||!data)return;
    apply(Array.isArray(data)?data[0]:data);
  }
  document.addEventListener('DOMContentLoaded',load);
})();

/* NANTIA'S COMMISSIONS — provider-aware public content (V16.64) */
(function(){
  async function getClient(){
    const cfg=window.NANTIA_SUPABASE||{};
    if(!window.supabase||!cfg.url||!cfg.anonKey)return null;
    return window.supabase.createClient(cfg.url,cfg.anonKey);
  }

  function setText(key,value){
    document.querySelectorAll(`[data-content-key="${CSS.escape(key)}"]`).forEach(el=>el.textContent=value);
  }

  function applyProviderContent(cfg){
    const provider=String(cfg?.active_provider||'manual').toLowerCase();
    const camerpay=provider==='camerpay';

    document.querySelectorAll('[data-payment-provider]').forEach(el=>{
      el.hidden=el.dataset.paymentProvider!==provider;
    });
    document.querySelectorAll('[data-payment-camerpay]').forEach(el=>{el.hidden=!camerpay;});
    document.querySelectorAll('[data-payment-manual]').forEach(el=>{el.hidden=camerpay;});

    if(!camerpay)return;

    // These replacements intentionally happen AFTER site_content has loaded,
    // so old Manual wording in editable site_content cannot overwrite the
    // active provider's public payment explanation.
    const replacements={
      'faq.a3':'Payment information is shown only after your request is accepted and the final price has been set. You will then use your private commission portal to start the secure CamerPay payment.',
      'faq.q4':'What happens when I pay through CamerPay?',
      'faq.a4':'After acceptance, your private commission portal shows the final amount and a Pay Now button. CamerPay handles the checkout, and the payment is confirmed automatically after the signed payment notification is verified. You do not need to submit a separate “I’ve Paid” claim.',
      'faq.q11':'Why don’t I need to select my country?',
      'faq.a11':'Because CamerPay handles the available payment methods through its checkout, the commission request form does not need the old manual country-payment selection.',
      'how.step4_text':'You pay through the secure CamerPay checkout. After CamerPay sends a valid signed confirmation, the payment is marked PAID automatically.',
      'tos.payment_text':'Payment information is provided only after I accept your request and set the final price. Payment is initiated from your private commission portal through CamerPay. The amount charged is based on the locked final price for your accepted commission and is converted to the provider currency using CamerPay’s current rate. Your commission is officially confirmed only after the payment provider confirmation has been verified.'
    };
    Object.entries(replacements).forEach(([key,value])=>setText(key,value));
    setText('how.step4_title','Payment');
  }

  async function load(){
    const client=await getClient(); if(!client)return;
    const {data,error}=await client.rpc('get_public_payment_config');
    if(error||!data?.length)return;
    const cfg=data[0];
    applyProviderContent(cfg);
    // Re-apply after editable site content finishes loading, because content.js
    // may have replaced the same elements with stored Manual wording.
    document.addEventListener('nantia:content-loaded',()=>applyProviderContent(cfg),{once:true});
    if(document.documentElement.dataset.contentLoaded==='true')applyProviderContent(cfg);
  }

  document.addEventListener('DOMContentLoaded',load);
})();

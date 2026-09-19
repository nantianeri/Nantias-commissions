/* NANTIA'S COMMISSIONS — provider-aware public content */
(function(){
  async function getClient(){
    const cfg=window.NANTIA_SUPABASE||{};
    if(!window.supabase||!cfg.url||!cfg.anonKey)return null;
    return window.supabase.createClient(cfg.url,cfg.anonKey);
  }
  async function load(){
    const client=await getClient(); if(!client)return;
    const {data,error}=await client.rpc('get_public_payment_config');
    if(error||!data?.length)return;
    const cfg=data[0], camerpay=String(cfg.active_provider||'manual')==='camerpay';
    document.querySelectorAll('[data-payment-provider]').forEach(el=>{el.hidden=el.dataset.paymentProvider!==cfg.active_provider;});
    document.querySelectorAll('[data-payment-camerpay]').forEach(el=>{el.hidden=!camerpay;});
    document.querySelectorAll('[data-payment-manual]').forEach(el=>{el.hidden=camerpay;});

    if(camerpay){
      const replacements={
        'faq.a3':'Payment information is shown only after your request is accepted and the final price has been set. You will then use the private commission portal to start the secure CamerPay payment.',
        'faq.q4':'What happens when I pay through CamerPay?',
        'faq.a4':'After acceptance, your private commission portal shows the locked payment amount and a Pay Now button. CamerPay handles the checkout, and the payment is confirmed automatically after the signed payment notification is verified. You do not need to click “I\'ve Paid”.',
        'faq.q11':'Why is my country not required on the commission form?',
        'faq.a11':'CamerPay handles the available payment methods through its checkout, so the commission form does not need the old manual country-payment selection. You will provide the phone number needed to start the CamerPay payment when you are ready to pay.',
        'how.step4_text':'You pay through the secure CamerPay checkout. After CamerPay sends a valid signed confirmation, the payment is marked PAID automatically.',
        'tos.payment_text':'Payment information is provided only after I accept your request and set the final price. Payment is initiated from your private commission portal through CamerPay. The amount sent to CamerPay is the locked payment amount for your accepted commission. Your commission is officially confirmed only after the payment provider confirmation has been verified.',
      };
      Object.entries(replacements).forEach(([key,value])=>document.querySelectorAll(`[data-content-key="${CSS.escape(key)}"]`).forEach(el=>el.textContent=value));
      document.querySelectorAll('[data-content-key="how.step4_title"]').forEach(el=>el.textContent='Payment');
    }
  }
  document.addEventListener('DOMContentLoaded',load);
})();

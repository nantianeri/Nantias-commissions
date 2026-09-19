(function(){
let finalDeliveryReady=false;
const statusInfo={
  NEW:{label:'Under Review',message:'Your commission request has been received and is waiting to be reviewed.'},
  REVIEWING:{label:'Under Review',message:'Your commission request is currently being reviewed.'},
  ACCEPTED_AWAITING_PAYMENT:{label:'Accepted',message:'Your commission request has been accepted. Your payment details are shown below.'},
  PAYMENT_CLAIMED:{label:'Payment Being Verified',message:'Your payment confirmation has been received and is currently being verified.'},
  PAYMENT_REJECTED:{label:'Payment Claim Rejected',message:'Your payment claim could not be verified. Please review the message below and submit a new payment claim after resolving the issue.'},
  PAID:{label:'Paid',message:'Your payment has been confirmed. Your commission has officially been added to my commission queue.'},
  IN_PROGRESS:{label:'In Progress',message:'Your commission is currently being worked on. I will contact you using your preferred contact method when personal communication or feedback is needed.'},
  COMPLETED:{label:'Completed',message:'Your commission is complete. Your final artwork is available below.'},
  DECLINED:{label:'Declined',message:'Unfortunately, this commission request was not accepted.'}
};
const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const money=v=>v==null||v===''?'—':'$'+Number(v).toFixed(2);
const xaf=v=>v==null||v===''?'—':Number(v).toLocaleString(undefined,{maximumFractionDigits:0})+' XAF';
const date=v=>v?new Date(v).toLocaleDateString(undefined,{year:'numeric',month:'long',day:'numeric'}):'—';

function getClient(){
 const cfg=window.NANTIA_SUPABASE||{};
 if(!window.supabase||!cfg.url||!cfg.anonKey)return null;
 return window.supabase.createClient(cfg.url,cfg.anonKey);
}
function getToken(){return new URLSearchParams(location.search).get('key')||sessionStorage.getItem('nantia_client_portal_token')||''}
function setAccessMessage(t,error){const e=document.getElementById('accessMessage');if(!e)return;e.textContent=t||'';e.style.color=error?'var(--pink)':''}

function timeline(status){
 const stages=[
  ['NEW','Request submitted'],
  ['ACCEPTED_AWAITING_PAYMENT','Accepted'],
  ['PAID','Payment confirmed'],
  ['IN_PROGRESS','In progress'],
  ['COMPLETED','Completed']
 ];
 if(status==='DECLINED') return [['DECLINED','Request declined']];
 if(status==='PAYMENT_REJECTED') return [
  {label:'Request submitted',state:'done'},
  {label:'Accepted',state:'done'},
  {label:'Payment claim rejected',state:'current'},
  {label:'Payment confirmed',state:'future'},
  {label:'In progress',state:'future'},
  {label:'Completed',state:'future'}
 ];
 if(status==='PAYMENT_CLAIMED') stages.splice(2,0,['PAYMENT_CLAIMED','Payment being verified']);
 const order={NEW:0,REVIEWING:0,ACCEPTED_AWAITING_PAYMENT:1,PAYMENT_CLAIMED:2,PAID:2,IN_PROGRESS:3,COMPLETED:4};
 const current=order[status]??0;
 return stages.map(([s,label],i)=>({label,state:i<current?'done':i===current?'current':'future'}));
}
function renderTimeline(status){
 const box=document.getElementById('portalTimeline');
 box.innerHTML=timeline(status).map((x,i)=>`<div class="portal-step ${x.state}"><div class="portal-dot">${x.state==='done'?'✓':x.state==='current'?'●':'○'}</div><div><strong>${esc(x.label)}</strong>${x.state==='current'?'<div class="muted">Current stage</div>':''}</div></div>`).join('');
}
function copyValue(value){
 if(!value)return;
 navigator.clipboard?.writeText(value).then(()=>{const m=document.getElementById('paymentMessage');m.textContent='Copied.';setTimeout(()=>{if(m.textContent==='Copied.')m.textContent=''},1500)}).catch(()=>{});
}

const nextStep={
 NEW:'I will review your request and decide whether I can accept it.',
 REVIEWING:'I am reviewing the request. Please check back here for an update.',
 ACCEPTED_AWAITING_PAYMENT:'Your next step is to complete the payment using the details shown below.',
 PAYMENT_CLAIMED:'I am checking the payment. No further action is needed from you right now.',
 PAYMENT_REJECTED:'Your payment claim was not verified. Review the payment rejection message, correct the issue, then submit a new claim.',
 PAID:'Your commission is in the queue. I will start it when it reaches the front.',
 IN_PROGRESS:'Your commission is being worked on. I will contact you using your preferred contact method if I need personal feedback or clarification.',
 COMPLETED:'Your commission is complete. Your final artwork will appear below when it has been uploaded.',
 DECLINED:'No further action is needed for this request.'
};
function renderNextStep(status){
 const el=document.getElementById('portalNextStep'); if(!el)return;
 const text=nextStep[status]||'Please check back here for the next update.';
 el.innerHTML='<strong>What happens next</strong><div class="muted" style="margin-top:5px">'+esc(text)+'</div>';
}
function renderUpdates(items){
 const card=document.getElementById('updatesCard'),box=document.getElementById('portalUpdates');
 if(!card||!box)return;
 if(!items?.length){card.hidden=true;return;}
 card.hidden=false;
 box.innerHTML=items.map(u=>`<article class="portal-update"><div class="portal-update-head"><strong>${esc(u.title||'Commission update')}</strong><span class="portal-update-type">${esc(String(u.update_type||'PROGRESS').replaceAll('_',' '))}</span></div><div class="muted portal-update-date" style="margin-top:5px">${esc(dateTime(u.created_at))}</div><div style="white-space:pre-wrap;margin-top:10px">${esc(u.message)}</div></article>`).join('');
}
function dateTime(v){return v?new Date(v).toLocaleString(undefined,{year:'numeric',month:'long',day:'numeric',hour:'numeric',minute:'2-digit'}):'—'}
async function loadUpdates(token){
 const client=getClient(); if(!client)return;
 const {data,error}=await client.rpc('get_client_commission_updates',{p_access_token:token});
 if(error){renderUpdates([]);return;}
 renderUpdates(data||[]);
}

function reviewStars(rating){
 const value=Number(rating||0); let out='';
 for(let i=1;i<=5;i++){
   const fill=Math.max(0,Math.min(1,value-(i-1)))*100;
   out+=`<span class="review-star-public" style="--review-fill:${fill}%">★</span>`;
 }
 return out;
}
function setReviewStars(rating){
 const value=Number(rating||0);
 const wrap=document.getElementById('reviewStars'); if(wrap)wrap.dataset.rating=String(value);
 document.querySelectorAll('#reviewStars [data-star]').forEach(btn=>{
   const n=Number(btn.dataset.star); const fill=Math.max(0,Math.min(1,value-(n-1)))*100;
   btn.classList.toggle('selected',n<=value);
   btn.querySelector('span').style.setProperty('--review-fill',fill+'%');
   btn.setAttribute('aria-checked',String(n===Math.ceil(value)));
 });
 const label=document.getElementById('reviewRatingLabel');
 if(label) label.textContent=value?`${value.toFixed(1).replace('.0','')} / 5`:'Choose a rating';
}
function ratingFromStarClick(btn,event){
 const rect=btn.getBoundingClientRect();
 const half=event.clientX-rect.left<rect.width/2;
 const n=Number(btn.dataset.star); return half?(n===1?1:n-0.5):n;
}
async function loadClientReview(token,status){
 const card=document.getElementById('reviewCard'); if(!card)return;
 card.hidden=true;
 if(status!=='COMPLETED' || !finalDeliveryReady)return;
 const client=getClient(); if(!client)return;
 try{
   const {data,error}=await client.rpc('get_client_commission_review',{p_access_token:token});
   if(error)return;
   card.hidden=false;
   const area=document.getElementById('reviewFormArea'), intro=document.getElementById('reviewIntro');
   if(Array.isArray(data)&&data.length){
     const r=data[0];
     if(intro) intro.textContent=r.status==='PUBLISHED'?'Thank you for sharing your experience.':r.status==='HIDDEN'?'Your review has been received.':'Your review has been received and is awaiting approval.';
     if(area) area.innerHTML=`<div class="review-stars-display" aria-label="${esc(r.rating)} out of 5 stars">${reviewStars(r.rating)}</div>${r.review_text?`<div class="review-existing">${esc(r.review_text)}</div>`:''}<div class="muted small" style="margin-top:10px">—${esc(String(r.instagram_username||'').replace(/^@/,''))}</div>`;
     return;
   }
   if(intro) intro.textContent='I would love to hear what you thought about the commission process.';
   setReviewStars(0);
   const text=document.getElementById('reviewText'); if(text)text.value='';
   const msg=document.getElementById('reviewMessage'); if(msg)msg.textContent='';
 }catch(_){card.hidden=true;}
}
function setupReviewForm(){
 document.querySelectorAll('#reviewStars [data-star]').forEach(btn=>btn.addEventListener('click',e=>setReviewStars(ratingFromStarClick(btn,e))));
 const submit=document.getElementById('submitReviewBtn');
 if(!submit)return;
 submit.addEventListener('click',async()=>{
   const exact=Number(document.getElementById('reviewStars')?.dataset.rating||0);
   const msg=document.getElementById('reviewMessage');
   if(!exact){if(msg){msg.textContent='Please choose a rating.';msg.style.color='var(--pink)';}return;}
   submit.disabled=true;if(msg){msg.textContent='Submitting…';msg.style.color='';}
   const client=getClient();
   const reviewText=document.getElementById('reviewText')?.value||'';
   const {data,error}=await client.rpc('submit_commission_review',{p_access_token:getToken(),p_rating:exact,p_review_text:reviewText});
   if(error){if(msg){msg.textContent=error.message||'Unable to submit your review.';msg.style.color='var(--pink)';}submit.disabled=false;return;}
   if(msg){msg.textContent='Thank you. Your review has been received.';msg.style.color='';}
   await loadClientReview(getToken(),'COMPLETED');
 });
}

async function loadFinalDelivery(token){
 const card=document.getElementById('finalDeliveryCard');
 if(!card)return;
 card.hidden=true;
 const client=getClient();
 if(!client)return;
 try{
   const {data,error}=await client.rpc('get_client_final_delivery',{p_access_token:token});
   if(error || !data?.length)return;
   const result=data[0];
   const cfg=window.NANTIA_SUPABASE||{};
   const base=String(cfg.url||'').replace(/\/$/,'');
   if(!base || !result.preview_path || !result.drive_url)return;
   const previewUrl=client.storage.from('commission-previews').getPublicUrl(result.preview_path).data?.publicUrl||'';
   if(!previewUrl)return;
   card.hidden=false;
   finalDeliveryReady=true;
   card.innerHTML='<strong>Final Artwork</strong><div class="muted" style="margin-top:5px">Your finished artwork is ready. This is a preview of the original file.</div><div class="portal-delivery-preview"><img src="'+esc(previewUrl)+'" alt="Preview of final artwork"></div><div style="margin-top:14px"><a class="btn btn-primary" href="'+esc(result.drive_url)+'" target="_blank" rel="noopener">Download Original Artwork</a></div><div class="muted small" style="margin-top:10px">The button opens the original artwork on Google Drive. The preview above is not clickable.</div>';
 }catch(_){card.hidden=true;}
}

function renderPayment(r){
 const card=document.getElementById('paymentCard');
 if(!card){console.error('Client portal: paymentCard is missing from commission.html.');return;}
 const allowed=['ACCEPTED_AWAITING_PAYMENT','PAYMENT_CLAIMED','PAYMENT_REJECTED'];
 if(!allowed.includes(r.status)){card.hidden=true;return;}
 card.hidden=false;

 const finalPrice=r.final_price;
 const hasFinalPrice=finalPrice!==null && finalPrice!==undefined && finalPrice!=='';
 const amount=document.getElementById('paymentAmount');
 if(amount){
   amount.textContent=hasFinalPrice?money(finalPrice):'Final price not set';
   amount.setAttribute('aria-label',hasFinalPrice?`Amount to pay ${money(finalPrice)}`:'Final price not set');
 }

 const provider=(r.payment_provider||'manual').toLowerCase();
 const isCamerPay=provider==='camerpay';
 const lockedAmount=r.payment_amount;
 const providerAmount=document.getElementById('paymentProviderAmount');
 if(providerAmount){
   providerAmount.textContent=isCamerPay && lockedAmount!=null ? `CamerPay payment amount: ${xaf(lockedAmount)}` : (isCamerPay ? 'CamerPay will calculate the XAF amount using its current rate when checkout starts.' : '');
 }

 const country=r.payment_country||'Cameroon';
 const method=r.payment_method||'Mobile Money';
 const network=r.mobile_network||'MTN Mobile Money';
 const details=isCamerPay
   ? [['Payment provider','CamerPay'],['Payment currency',r.payment_currency||'XAF'],['Payment amount',lockedAmount!=null?xaf(lockedAmount):'Calculated by CamerPay at checkout']]
   : [['Payment provider',provider==='manual'?'Manual payment':provider],['Destination country',country],['Delivery method',method],['Mobile network',network],['First name',r.payment_first_name],['Last name',r.payment_last_name],['Mobile phone number',r.payment_mobile_phone]];
 const detailsBox=document.getElementById('paymentDetails');
 if(detailsBox){
   detailsBox.innerHTML=details.map(([k,v])=>`<div class="detail"><strong>${esc(k)}</strong><div>${esc(v||'Not configured yet')}</div>${v&&['First name','Last name','Mobile phone number'].includes(k)?`<button type="button" class="btn" data-copy="${esc(v)}" style="margin-top:8px">Copy</button>`:''}</div>`).join('');
   detailsBox.querySelectorAll('[data-copy]').forEach(b=>b.addEventListener('click',()=>copyValue(b.dataset.copy)));
 }
 const note=document.getElementById('paymentNoteBox');
 if(note)note.textContent=isCamerPay?'':(r.payment_note||'');
 const rejectionBox=document.getElementById('paymentRejectionMessage');
 if(rejectionBox){ rejectionBox.hidden=r.status!=='PAYMENT_REJECTED'; rejectionBox.textContent=r.status==='PAYMENT_REJECTED'?(r.payment_rejection_message||'Your payment claim could not be verified. Please review your payment and submit a new claim.'):''; }
 const intro=document.getElementById('paymentIntro');
 if(intro)intro.textContent=isCamerPay
   ?(r.status==='PAYMENT_CLAIMED'?'Your payment has been submitted and is being checked by the payment provider.':r.status==='PAYMENT_REJECTED'?'The previous payment attempt was not confirmed. You can start a new payment attempt below.':(lastPaymentStatus==='failed'||lastPaymentStatus==='cancelled')?'Your previous CamerPay payment attempt was not completed. You can start a new payment attempt below.':'Your commission has been accepted. Complete the secure CamerPay checkout below.')
   :(r.status==='PAYMENT_CLAIMED'?'Your payment claim has been received. The payment details below are shown for reference.':r.status==='PAYMENT_REJECTED'?'Your payment claim was not verified. Please review the message below, correct the issue, and submit a new claim.':'Your commission has been accepted. Please pay the final amount using the manual payment instructions below.');

 const manualPanel=document.getElementById('manualPaymentPanel');
 const manualInstructions=document.getElementById('manualInstructionsPanel');
 const warning=document.getElementById('paymentWarning');
 const paidButton=document.getElementById('paidButton');
 const camPanel=document.getElementById('camerpayPaymentPanel');
 if(manualPanel)manualPanel.hidden=isCamerPay;
 if(manualInstructions)manualInstructions.hidden=isCamerPay;
 if(!isCamerPay){
   const manualHeading=manualInstructions?.querySelector('[data-content-key=\"portal.remitly_heading\"]');
   const manualIntro=manualInstructions?.querySelector('[data-content-key=\"portal.remitly_intro\"]');
   if(manualHeading)manualHeading.textContent='Manual payment instructions';
   if(manualIntro)manualIntro.textContent='Use the recipient details shown above, then review everything before sending.';
 }
 if(warning)warning.hidden=isCamerPay;
 if(paidButton)paidButton.hidden=isCamerPay;
 if(camPanel)camPanel.hidden=!isCamerPay;

 if(!isCamerPay){
   const destination=document.getElementById('paymentDestination');if(destination)destination.textContent=country;
   const paymentMethod=document.getElementById('paymentMethod');if(paymentMethod)paymentMethod.textContent=method;
   const paymentNetwork=document.getElementById('paymentNetwork');if(paymentNetwork)paymentNetwork.textContent=network;
   const warningCountry=document.getElementById('warningCountry');if(warningCountry)warningCountry.textContent=country;
   const warningMethod=document.getElementById('warningMethod');if(warningMethod)warningMethod.textContent=method;
   const warningNetwork=document.getElementById('warningNetwork');if(warningNetwork)warningNetwork.textContent=network;
 }

 const camButton=document.getElementById('camerpayPayButton');
 const camMsg=document.getElementById('camerpayMessage');
 if(isCamerPay && camButton){
   const phoneInput=document.getElementById('camerpayPhone');
   camButton.disabled=r.status==='PAYMENT_CLAIMED' || !hasFinalPrice;
   if(r.status==='PAYMENT_CLAIMED' && camMsg)camMsg.textContent='Your payment is being confirmed. You do not need to start another payment.';
   else if(!hasFinalPrice && camMsg)camMsg.textContent='Payment cannot start because the final price has not been set.';
   else if(camMsg)camMsg.textContent='';
   camButton.onclick=async()=>{
     const phone=phoneInput?.value.trim()||'';
     if(!/^\+?\d[\d\s-]{7,14}$/.test(phone)){if(camMsg)camMsg.textContent='Please enter a valid phone number.';phoneInput?.focus();return;}
     camButton.disabled=true;if(camMsg)camMsg.textContent='Starting secure CamerPay checkout…';
     try{
       const c=getClient();
       const {data,error}=await c.functions.invoke('payment-initiate',{body:{access_token:getToken(),customer_phone:phone,payment_method:''}});
       if(error||!data?.checkout_url){
         if(camMsg)camMsg.textContent=data?.error||error?.message||'Unable to start the CamerPay payment.';
         camButton.disabled=false;return;
       }
       location.href=data.checkout_url;
     }catch(err){
       if(camMsg)camMsg.textContent=err?.message||'Unable to start the CamerPay payment.';
       camButton.disabled=false;
     }
   };
 }

 const msg=document.getElementById('paymentMessage');
 const btn=document.getElementById('paidButton');
 if(isCamerPay){ if(msg)msg.textContent=''; return; }
 if(!btn||!msg)return;
 if(r.status==='PAYMENT_CLAIMED'){
   btn.hidden=true;
   msg.textContent='Payment claim received. Your payment is being verified. You will receive another update after verification.';
 } else if(r.status==='PAYMENT_REJECTED'){
   btn.hidden=false;
   btn.disabled=!hasFinalPrice;
   msg.textContent=r.payment_rejection_message||'Your payment claim could not be verified. Please review your payment and submit a new payment claim.';
 } else if(!hasFinalPrice){
   btn.hidden=false;
   btn.disabled=true;
   msg.textContent='Payment cannot be claimed yet because the final price has not been set.';
 } else {
   btn.hidden=false;
   btn.disabled=false;
   msg.textContent='';
   btn.onclick=async()=>{
     if(!confirm('Please confirm that you have already sent the payment using the correct recipient details.'))return;
     btn.disabled=true;
     msg.textContent='Submitting your payment claim…';
     const c=getClient();
     const {data,error}=await c.rpc('claim_commission_payment',{p_access_token:getToken()});
     if(error||!data){msg.textContent=error?.message||'Unable to submit your payment claim.';btn.disabled=false;return;}
     msg.textContent='Payment claim received. Your payment is now being verified.';
     btn.hidden=true;
     await loadByToken(getToken());
   };
 }
}

async function loadByToken(token){
 const client=getClient();
 if(!client){setAccessMessage('The commission portal is temporarily unavailable. Please try again later.',true);return false}
 if(!token){setAccessMessage('Please enter your request number and email address to open your private portal.',true);return false}
 try{
   const {data,error}=await client.rpc('get_client_commission_portal',{p_access_token:token});
   if(error){
     console.error('Client portal load error:',error);
     setAccessMessage(error.message||'I could not open your commission portal. Please try again.',true);
     return false;
   }
   if(!Array.isArray(data)||!data.length){
     setAccessMessage('I could not find the private portal for this commission. Please check your request number and email address.',true);
     return false;
   }
   renderPortal(data[0], token);
   return true;
 }catch(err){
   console.error('Client portal load exception:',err);
   setAccessMessage(err?.message||'Something went wrong while opening your commission portal. Please try again.',true);
   return false;
 }
}
document.addEventListener('DOMContentLoaded',async()=>{
 const menu=document.querySelector('.menu'),nav=document.querySelector('.navlinks');if(menu&&nav)menu.onclick=()=>nav.classList.toggle('open');
 setupReviewForm();
 const form=document.getElementById('accessForm');
 if(!form){console.error('Client portal: access form not found. Check that commission.html matches this client-portal.js.');return;}
 form.addEventListener('submit',async e=>{
  e.preventDefault();
  setAccessMessage('Opening your commission…');
  const submit=form.querySelector('button[type=submit]');
  if(submit)submit.disabled=true;
  try{
    const client=getClient();
    if(!client){setAccessMessage('The commission portal is temporarily unavailable. Please try again later.',true);return}
    const rawNumber=document.getElementById('portalRequestNumber').value.trim();
    const number=Number(rawNumber);
    const email=document.getElementById('portalEmail').value.trim();
    if(!/^\d+$/.test(rawNumber)||!Number.isSafeInteger(number)||number<1){
      setAccessMessage('Please enter a valid request number.',true);return;
    }
    if(!email){setAccessMessage('Please enter the email address used for the request.',true);return;}
    const {data,error}=await client.rpc('get_client_portal_access',{p_request_number:number,p_email:email});
    if(error){
      console.error('Client portal access error:',error);
      setAccessMessage(error.message||'Unable to verify your request details. Please try again.',true);return;
    }
    if(!Array.isArray(data)||!data.length||!data[0]?.client_access_token){
      setAccessMessage('No commission matched that request number and email. Please check both and try again.',true);return;
    }
    const token=data[0].client_access_token;
    sessionStorage.setItem('nantia_client_portal_token',token);
    const opened=await loadByToken(token);
    if(opened){
      history.replaceState({},'',location.pathname+'?key='+encodeURIComponent(token));
      setAccessMessage('');
    } else {
      sessionStorage.removeItem('nantia_client_portal_token');
    }
  }catch(err){
    console.error('Client portal access exception:',err);
    setAccessMessage(err?.message||'Something went wrong while opening your commission portal. Please try again.',true);
  }finally{
    if(submit)submit.disabled=false;
  }
 });
 const params=new URLSearchParams(location.search);
 const prefillNumber=params.get('request_number');
 if(prefillNumber){
   const numberInput=document.getElementById('portalRequestNumber');
   numberInput.value=prefillNumber;
   document.getElementById('portalEmail').focus();
 }
 const token=getToken();
 if(token) {
   const opened=await loadByToken(token);
   if(!opened) sessionStorage.removeItem('nantia_client_portal_token');
 }
});
})();
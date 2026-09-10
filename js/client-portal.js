(function(){
const statusInfo={
  NEW:{label:'Under Review',message:'Your commission request has been received and is waiting to be reviewed.'},
  REVIEWING:{label:'Under Review',message:'Your commission request is currently being reviewed.'},
  ACCEPTED_AWAITING_PAYMENT:{label:'Accepted',message:'Your commission request has been accepted. Your payment details are shown below.'},
  PAYMENT_CLAIMED:{label:'Payment Being Verified',message:'Your payment confirmation has been received and is currently being verified.'},
  PAYMENT_REJECTED:{label:'Payment Claim Rejected',message:'Your payment claim could not be verified. Please review the message below and submit a new payment claim after resolving the issue.'},
  PAID:{label:'Paid',message:'Your payment has been confirmed. Your commission has officially been added to my commission queue.'},
  IN_PROGRESS:{label:'In Progress',message:'Your commission is currently being worked on. I will contact you on Instagram when personal communication or feedback is needed.'},
  COMPLETED:{label:'Completed',message:'Your commission is complete. Your final artwork is available below.'},
  DECLINED:{label:'Declined',message:'Unfortunately, this commission request was not accepted.'}
};
const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const money=v=>v==null||v===''?'—':'$'+Number(v).toFixed(2);
const date=v=>v?new Date(v).toLocaleDateString(undefined,{year:'numeric',month:'long',day:'numeric'}):'—';

function getClient(){
 const cfg=window.NANTIA_SUPABASE||{};
 if(!window.supabase||!cfg.url||!cfg.anonKey)return null;
 return window.supabase.createClient(cfg.url,cfg.anonKey);
}
function getToken(){return new URLSearchParams(location.search).get('key')||''}
function setAccessMessage(t,error){const e=document.getElementById('accessMessage');e.textContent=t||'';e.style.color=error?'var(--pink)':''}

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
 IN_PROGRESS:'Your commission is being worked on. I will contact you on Instagram if I need personal feedback or clarification.',
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
   card.innerHTML='<strong>Final Artwork</strong><div class="muted" style="margin-top:5px">Your finished artwork is ready. This is a preview of the original file.</div><div class="portal-delivery-preview"><img src="'+esc(previewUrl)+'" alt="Preview of final artwork"></div><div style="margin-top:14px"><a class="btn btn-primary" href="'+esc(result.drive_url)+'" target="_blank" rel="noopener">Download Original Artwork</a></div><div class="muted small" style="margin-top:10px">The button opens the original artwork on Google Drive. The preview above is not clickable.</div>';
 }catch(_){card.hidden=true;}
}

function renderPayment(r){
 const card=document.getElementById('paymentCard');
 const allowed=['ACCEPTED_AWAITING_PAYMENT','PAYMENT_CLAIMED','PAYMENT_REJECTED'];
 if(!allowed.includes(r.status)){card.hidden=true;return;}
 card.hidden=false;

 const finalPrice=r.final_price;
 const amount=document.getElementById('paymentAmount');
 const hasFinalPrice=finalPrice!==null && finalPrice!==undefined && finalPrice!=='';
 amount.textContent=hasFinalPrice?money(finalPrice):'Final price not set';
 amount.setAttribute('aria-label',hasFinalPrice?`Amount to pay ${money(finalPrice)}`:'Final price not set');

 const provider=r.payment_provider||'Remitly';
 const country=r.payment_country||'Cameroon';
 const method=r.payment_method||'Mobile Money';
 const network=r.mobile_network||'MTN Mobile Money';
 const details=[
  ['Payment provider',provider],
  ['Destination country',country],
  ['Delivery method',method],
  ['Mobile network',network],
  ['First name',r.payment_first_name],
  ['Last name',r.payment_last_name],
  ['Mobile phone number',r.payment_mobile_phone]
 ];
 document.getElementById('paymentDetails').innerHTML=details.map(([k,v])=>`<div class="detail"><strong>${esc(k)}</strong><div>${esc(v||'Not configured yet')}</div>${v&&['First name','Last name','Mobile phone number'].includes(k)?`<button type="button" class="btn" data-copy="${esc(v)}" style="margin-top:8px">Copy</button>`:''}</div>`).join('');
 document.querySelectorAll('[data-copy]').forEach(b=>b.addEventListener('click',()=>copyValue(b.dataset.copy)));

 document.getElementById('paymentNoteBox').textContent=r.payment_note||'';
 const rejectionBox=document.getElementById('paymentRejectionMessage');
 if(rejectionBox){ rejectionBox.hidden=r.status!=='PAYMENT_REJECTED'; rejectionBox.textContent=r.status==='PAYMENT_REJECTED'?(r.payment_rejection_message||'Your payment claim could not be verified. Please review your payment and submit a new claim.'):''; }
 document.getElementById('paymentIntro').textContent=
   r.status==='PAYMENT_CLAIMED'
   ?'Your payment claim has been received. The payment details below are shown for reference.'
   :r.status==='PAYMENT_REJECTED'
   ?'Your payment claim was not verified. Please review the message below, correct the issue, and submit a new claim.'
   :'Your commission has been accepted. Please pay the final amount using the Remitly instructions below.';

 document.getElementById('paymentDestination').textContent=country;
 document.getElementById('paymentMethod').textContent=method;
 document.getElementById('paymentNetwork').textContent=network;
 document.getElementById('warningCountry').textContent=country;
 document.getElementById('warningMethod').textContent=method;
 document.getElementById('warningNetwork').textContent=network;

 const btn=document.getElementById('paidButton'), msg=document.getElementById('paymentMessage');
 if(r.status==='PAYMENT_CLAIMED'){
   btn.hidden=true;
   msg.textContent='Payment claim received. Your payment is being verified. You will receive another update after verification.';
 } else if(r.status==='PAYMENT_REJECTED'){
   btn.hidden=false;
   btn.disabled=!hasFinalPrice;
   msg.textContent=r.payment_rejection_message||'Your payment claim could not be verified. Please review your payment and submit a new claim.';
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
     if(error||!data){
       msg.textContent=error?.message||'Unable to submit your payment claim.';
       btn.disabled=false;
       return;
     }
     msg.textContent='Payment claim received. Your payment is now being verified.';
     btn.hidden=true;
     await loadByToken(getToken());
   };
 }
 if(r.status==='PAYMENT_REJECTED' && hasFinalPrice){
   btn.onclick=async()=>{
     if(!confirm('Please confirm that you have already sent the payment using the correct recipient details.'))return;
     btn.disabled=true;
     msg.textContent='Submitting your new payment claim…';
     const c=getClient();
     const {data,error}=await c.rpc('claim_commission_payment',{p_access_token:getToken()});
     if(error||!data){
       msg.textContent=error?.message||'Unable to submit your payment claim.';
       btn.disabled=false;
       return;
     }
     msg.textContent='Payment claim received. Your payment is now being verified.';
     btn.hidden=true;
     await loadByToken(getToken());
   };
 }
}
function renderQueuePosition(position,status){
 const card=document.getElementById('queuePositionCard');
 const text=document.getElementById('queuePositionText');
 const active=['PAID','IN_PROGRESS'].includes(status);
 if(!active || position==null){card.hidden=true;return;}
 card.hidden=false;
 text.textContent=`Queue position #${position}`;
}
async function loadQueuePosition(token,status){
 if(!['PAID','IN_PROGRESS'].includes(status)){renderQueuePosition(null,status);return;}
 const client=getClient();
 if(!client){renderQueuePosition(null,status);return;}
 const {data,error}=await client.rpc('get_client_queue_position',{p_access_token:token});
 if(error){renderQueuePosition(null,status);return;}
 renderQueuePosition(data,status);
}
function renderPortal(r){
 const info=statusInfo[r.status]||{label:r.status||'Unknown',message:'Please check back later for updates.'};
 document.getElementById('portalRequestTitle').textContent='#'+r.request_number;
 document.getElementById('portalStatus').textContent=info.label.toUpperCase();
 document.getElementById('portalMessage').textContent=info.message;
 const details=[
  ['Commission',r.commission_type],['Format',r.format],['Characters',r.character_count],
  ['Usage',r.usage_type],['Background',r.background],['Urgent',r.urgent?'Yes':'No'],
  ['Requested deadline',r.requested_deadline?date(r.requested_deadline):'—'],
  ['Estimated price',money(r.estimated_price)],['Final price',money(r.final_price)],
  ['Submitted',date(r.created_at)]
 ];
 document.getElementById('portalDetails').innerHTML=details.map(([k,v])=>`<div class="detail"><strong>${esc(k)}</strong><div>${esc(v??'—')}</div></div>`).join('');
 renderTimeline(r.status);
 renderNextStep(r.status);
 loadUpdates(getToken());
 loadFinalDelivery(getToken());
 renderQueuePosition(null,r.status);
 loadQueuePosition(getToken(),r.status);
 renderPayment(r);
 const notice=document.getElementById('portalNoticeCard');
 const title=document.getElementById('portalNoticeTitle'), text=document.getElementById('portalNoticeText');
 if(r.status==='DECLINED'&&r.decline_message){notice.hidden=false;title.textContent='Message about this request';text.textContent=r.decline_message}
 else if(r.status==='ACCEPTED_AWAITING_PAYMENT'&&r.payment_instructions){notice.hidden=false;title.textContent='Payment information';text.textContent=r.payment_instructions}
 else notice.hidden=true;
 document.getElementById('accessCard').hidden=true;
 document.getElementById('portalCard').hidden=false;
}
async function loadByToken(token){
 const client=getClient(); if(!client){setAccessMessage('The commission portal is temporarily unavailable.',true);return false}
 const {data,error}=await client.rpc('get_client_commission_portal',{p_access_token:token});
 if(error||!data?.length){setAccessMessage('I could not open a commission with that private access link.',true);return false}
 renderPortal(data[0]); return true;
}
document.addEventListener('DOMContentLoaded',async()=>{
 const menu=document.querySelector('.menu'),nav=document.querySelector('.navlinks');if(menu&&nav)menu.onclick=()=>nav.classList.toggle('open');
 const form=document.getElementById('accessForm');
 form.addEventListener('submit',async e=>{
  e.preventDefault(); setAccessMessage('Opening your commission…');
  const client=getClient(); if(!client){setAccessMessage('The commission portal is temporarily unavailable.',true);return}
  const number=Number(document.getElementById('portalRequestNumber').value.trim());
  const email=document.getElementById('portalEmail').value.trim();
  const {data,error}=await client.rpc('get_client_portal_access',{p_request_number:number,p_email:email});
  if(error||!data?.length){setAccessMessage('No commission matched that request number and email. Please check both and try again.',true);return}
  const token=data[0].client_access_token;
  history.replaceState({},'',location.pathname+'?key='+encodeURIComponent(token));
  setAccessMessage('');
  await loadByToken(token);
 });
 const params=new URLSearchParams(location.search);
 const prefillNumber=params.get('request_number');
 if(prefillNumber){
   const numberInput=document.getElementById('portalRequestNumber');
   numberInput.value=prefillNumber;
   document.getElementById('portalEmail').focus();
 }
 const token=getToken();
 if(token) await loadByToken(token);
});
})();
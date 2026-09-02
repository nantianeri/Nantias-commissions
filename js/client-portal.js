(function(){
const statusInfo={
  NEW:{label:'Under Review',message:'Your commission request has been received and is waiting to be reviewed.'},
  REVIEWING:{label:'Under Review',message:'Your commission request is currently being reviewed.'},
  ACCEPTED_AWAITING_PAYMENT:{label:'Accepted',message:'Your commission request has been accepted. Your payment details are shown below.'},
  PAYMENT_CLAIMED:{label:'Payment Being Verified',message:'Your payment confirmation has been received and is currently being verified.'},
  PAID:{label:'Paid',message:'Your payment has been confirmed. Your commission has officially been added to my commission queue.'},
  IN_PROGRESS:{label:'In Progress',message:'Your commission is currently being worked on. I will contact you on Instagram when personal communication or feedback is needed.'},
  COMPLETED:{label:'Completed',message:'Your commission has been completed. Final delivery options will be shown here when this stage is added.'},
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
 if(status==='PAYMENT_CLAIMED') stages.splice(3,0,['PAYMENT_CLAIMED','Payment being verified']);
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
function renderPayment(r){
 const card=document.getElementById('paymentCard');
 const allowed=['ACCEPTED_AWAITING_PAYMENT','PAYMENT_CLAIMED'];
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
 document.getElementById('paymentIntro').textContent=
   r.status==='PAYMENT_CLAIMED'
   ?'Your payment claim has been received. The payment details below are shown for reference.'
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
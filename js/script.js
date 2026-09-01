/* Nantia's Commissions V7.3 — real request submission via secure Supabase RPC */
const COMMERCIAL_RATE=1.0;
const URGENT_FEE=15;
function money(n){return "$"+Number(n||0).toFixed(2)}
function getParams(){const p=new URLSearchParams(location.search);return{type:p.get("type"),format:p.get("format")}}
async function getPublicClient(){const cfg=window.NANTIA_SUPABASE||{};if(!window.supabase||!cfg.url||!cfg.anonKey)return null;return window.supabase.createClient(cfg.url,cfg.anonKey)}
async function loadPublicData(client){const [{data:settings},{data:offers,error}]=await Promise.all([client.from('site_settings').select('*').eq('id',true).single(),client.from('commission_offers').select('*').eq('active',true).order('sort_order')]);return{settings:settings||null,offers:offers||[],error:error||null}}
function offerFormat(offer){const explicit=offer?.options&&typeof offer.options==='object'?offer.options.format:'';if(explicit)return String(explicit).toLowerCase();const key=`${offer?.slug||''} ${offer?.name||''}`.toLowerCase().replace(/[-_]/g,' ');if(/\bbust\s*up\b/.test(key))return'bust';if(/\bhalf\s*body\b/.test(key))return'half';if(/\bfull\s*body\b/.test(key))return'full';return''}
function findFormatOffer(offers,format){const wanted=String(format||'').toLowerCase();return(offers||[]).find(o=>o.category==='Character Illustration'&&offerFormat(o)===wanted)||null}
function findCustomOffer(offers){return(offers||[]).find(o=>o.category==='Custom Illustration'||String(o.slug||'').toLowerCase()==='custom-illustration')||null}
function applyAvailability(isOpen){document.querySelectorAll('[data-commission-open]').forEach(el=>{el.querySelectorAll('.open-state').forEach(x=>x.hidden=!isOpen);el.querySelectorAll('.closed-state').forEach(x=>x.hidden=isOpen);el.querySelector('.dot')?.classList.toggle('closed',!isOpen)});document.querySelectorAll('[data-request-link]').forEach(a=>{if(!a.dataset.originalHref)a.dataset.originalHref=a.getAttribute('href')||'commissions.html';a.setAttribute('href',isOpen?a.dataset.originalHref:'closed.html')});document.querySelectorAll('[data-format]').forEach(b=>{const format=b.dataset.format;b.setAttribute('href',isOpen?`request.html?type=character&format=${encodeURIComponent(format)}`:'closed.html')})}
function renderHomepagePrices(offers){const map={bust:'Bust Up',half:'Half Body',full:'Full Body'};document.querySelectorAll('[data-home-format]').forEach(el=>{const key=el.dataset.homeFormat,offer=findFormatOffer(offers,key),label=map[key]||key;el.textContent=offer&&offer.base_price!=null?`${label} · ${money(offer.base_price)}`:`${label} · Estimate`})}

async function initRequestPage(client,settings,offers){
 const form=document.querySelector('#commissionForm');if(!form)return;
 const q=getParams();
 const type=document.querySelector('#commissionType'),fmt=document.querySelector('#format'),formatLabel=document.querySelector('#formatLabel'),selectedNote=document.querySelector('#selectedFormatNote');
 const chars=document.querySelector('#characters'),commercial=document.querySelector('#commercial'),usage=document.querySelector('#usage'),custom=document.querySelector('#customComplexity'),box=document.querySelector('#customBox'),bg=document.querySelector('#background'),urgent=document.querySelector('#urgent'),urgentBox=document.querySelector('#urgentBox'),deadline=document.querySelector('#deadline');
 const baseOffers={bust:findFormatOffer(offers,'bust'),half:findFormatOffer(offers,'half'),full:findFormatOffer(offers,'full')};
 const formatNames={bust:'Bust Up',half:'Half Body',full:'Full Body'};
 let lockedFormat='';
 if(q.type==='character')type.value='Character Illustration';
 if(q.type==='custom')type.value='Custom Illustration';
 const formatOptions=Object.entries(baseOffers).map(([key,o])=>`<option value="${key}">${formatNames[key]}${o&&o.base_price!=null?' — '+money(o.base_price):''}</option>`).join('');
 fmt.innerHTML='<option value="">Choose one</option>'+formatOptions;
 if(q.type==='character'&&q.format&&baseOffers[q.format]){lockedFormat=q.format;fmt.value=q.format}
 function applyTypeUI(){
   const isCustom=type.value==='Custom Illustration';
   box.hidden=!isCustom;
   if(bg)bg.innerHTML=isCustom?'<option>Transparent / no background</option><option>Simple background</option><option>Detailed environment</option><option>Highly detailed scene</option>':'<option>Transparent / no background</option><option>Simple background</option>';
   const shouldLock=type.value==='Character Illustration'&&lockedFormat&&baseOffers[lockedFormat];
   fmt.hidden=!!shouldLock; if(formatLabel)formatLabel.hidden=!!shouldLock;
   if(selectedNote){selectedNote.hidden=!shouldLock;if(shouldLock){const o=baseOffers[lockedFormat];selectedNote.innerHTML=`<strong>Selected format:</strong> ${formatNames[lockedFormat]}${o?.base_price!=null?' — '+money(o.base_price):''}<br><span class="muted">This format was selected from the commission page and does not need to be chosen again.</span>`}}
 }
 function update(){
   const offer=baseOffers[fmt.value];const base=offer?.base_price!=null?Number(offer.base_price):0;const n=Math.max(1,+chars.value||1);const extraRate=Number(settings?.extra_character_rate??0.70);const commercialRate=Number(settings?.commercial_rate??COMMERCIAL_RATE);const urgentFee=urgent?.checked?Number(settings?.urgent_fee??URGENT_FEE):0;const extras=base*extraRate*(n-1);let comp=0;if(type.value==='Custom Illustration')comp={simple:0,moderate:15,detailed:30,'highly-detailed':50}[custom?.value||'simple']||0;const subtotal=base+extras+comp;const comm=commercial?.checked?subtotal*commercialRate:0;document.querySelector('#basePrice').textContent=money(base);document.querySelector('#extraPrice').textContent=money(extras+comp);document.querySelector('#usePrice').textContent=money(comm);const urgentRow=document.querySelector('#urgentPrice');if(urgentRow)urgentRow.textContent=money(urgentFee);document.querySelector('#estimatedTotal').textContent=money(subtotal+comm+urgentFee);if(document.querySelector('#estimateNote'))document.querySelector('#estimateNote').textContent=type.value==='Custom Illustration'?'Estimate only — I will review the scene and set the final price.':'Expected price based on the selected catalog price, character count and usage.';applyTypeUI();
 }
 [chars,commercial,usage,custom,fmt,type,urgent].filter(Boolean).forEach(x=>x.addEventListener('change',update));
 if(usage)usage.addEventListener('change',()=>{if(commercial)commercial.checked=usage.value==='commercial';update()});
 if(commercial)commercial.addEventListener('change',()=>{if(usage)usage.value=commercial.checked?'commercial':'personal';update()});
 if(urgent)urgent.addEventListener('change',()=>{if(urgentBox)urgentBox.hidden=!urgent.checked;if(deadline)deadline.required=urgent.checked;update()});
 update();
 form.addEventListener('submit',async e=>{
   e.preventDefault();
   const submit=form.querySelector('button[type="submit"]');
   if(!settings||settings.commissions_open===false){location.href='closed.html';return}
   if(!client){alert('The commission system is temporarily unavailable. Please try again later.');return}
   const instagram=document.querySelector('#instagramUsername')?.value.trim()||'';
   const email=document.querySelector('#clientEmail')?.value.trim()||'';
   const description=document.querySelector('#description')?.value.trim()||'';
   const additional=document.querySelector('#additionalInformation')?.value.trim()||'';
   const mood=document.querySelector('#moodLighting')?.value.trim()||'';
   const tos=document.querySelector('#tosAccepted')?.checked;
   const noGuarantee=document.querySelector('#noGuarantee')?.checked;
   const selectedFormat=fmt.value;
   const finalFormat=type.value==='Character Illustration'&&lockedFormat?lockedFormat:selectedFormat;
   if(!instagram||!email||!description||!tos||!noGuarantee){alert('Please complete all required fields and agreements.');return}
   if(!finalFormat){alert('Please choose a format.');return}
   if(urgent?.checked&&!deadline?.value){alert('Please enter your requested deadline for urgent priority.');return}
   const selectedOffer=type.value==='Custom Illustration'?findCustomOffer(offers):baseOffers[finalFormat];
   if(!selectedOffer){alert('The selected commission is no longer available. Please return to the Commissions page and try again.');return}
   const base=selectedOffer.base_price!=null?Number(selectedOffer.base_price):Number(baseOffers[finalFormat]?.base_price||0);
   const n=Math.max(1,+chars.value||1);const extraRate=Number(settings?.extra_character_rate??0.70);const commercialRate=Number(settings?.commercial_rate??COMMERCIAL_RATE);const urgentFee=urgent?.checked?Number(settings?.urgent_fee??URGENT_FEE):0;const complexity=type.value==='Custom Illustration'?({simple:0,moderate:15,detailed:30,'highly-detailed':50}[custom?.value||'simple']||0):0;const extras=(base*extraRate*(n-1))+complexity;const subtotal=base+extras;const comm=commercial?.checked?subtotal*commercialRate:0;const estimated=subtotal+comm+urgentFee;
   submit.disabled=true;submit.textContent='Submitting…';
   const {data:requestNumber,error}=await client.rpc('create_commission_request',{p_instagram_username:instagram,p_email:email,p_commission_offer_id:selectedOffer.id,p_commission_type:type.value,p_format:finalFormat,p_character_count:n,p_usage_type:commercial?.checked?'commercial':'personal',p_background:bg?.value||null,p_custom_complexity:type.value==='Custom Illustration'?(custom?.value||'simple'):null,p_urgent:!!urgent?.checked,p_requested_deadline:urgent?.checked?deadline.value:null,p_deadline_reason:urgent?.checked?(document.querySelector('#deadlineReason')?.value.trim()||null):null,p_description:description,p_preferred_mood_lighting:mood||null,p_additional_information:additional||null,p_estimated_price:estimated});
   if(error){console.error(error);alert('I could not submit your request. Please try again.');submit.disabled=false;submit.textContent='Submit Commission Request';return}
   form.hidden=true;const confirmation=document.querySelector('#confirmation');confirmation.hidden=false;confirmation.querySelector('.request-id').textContent='#'+requestNumber;
 });
}

document.addEventListener('DOMContentLoaded',async()=>{const menu=document.querySelector('.menu'),nav=document.querySelector('.navlinks');if(menu&&nav)menu.onclick=()=>nav.classList.toggle('open');const client=await getPublicClient();if(!client){applyAvailability(true);return}const{settings,offers}=await loadPublicData(client);const isOpen=settings?.commissions_open!==false;applyAvailability(isOpen);renderHomepagePrices(offers);await initRequestPage(client,settings||{},offers)});

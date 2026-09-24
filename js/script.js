/* Nantia's Commissions V7.3 — real request submission via secure Supabase RPC */
const SUPPORTED_COUNTRIES = [
  "Australia","Austria","Belgium","Benin","Brazil","Cameroon","Canada","Central African Republic","Chad","Côte d’Ivoire","Cyprus","Czech Republic","Denmark","Equatorial Guinea","Finland","France","Gabon","Germany","Ghana","Greece","Ireland","Israel","Italy","Japan","Latvia","Liechtenstein","Lithuania","Malta","Netherlands","New Zealand","Nigeria","Norway","Poland","Portugal","Republic of the Congo","Romania","Senegal","Singapore","Slovakia","Spain","Sweden","United Arab Emirates","United Kingdom","United States"
];

// CamerPay payment uses the full sovereign-country list, so the optional country
// picker can show international destinations. Manual payment keeps the existing
// SUPPORTED_COUNTRIES list above.
const CAMERPAY_COUNTRIES = [
  "Afghanistan","Albania","Algeria","Andorra","Angola","Antigua and Barbuda","Argentina","Armenia","Australia","Austria","Azerbaijan",
  "Bahamas","Bahrain","Bangladesh","Barbados","Belarus","Belgium","Belize","Benin","Bhutan","Bolivia","Bosnia and Herzegovina","Botswana","Brazil","Brunei","Bulgaria","Burkina Faso","Burundi",
  "Cabo Verde","Cambodia","Cameroon","Canada","Central African Republic","Chad","Chile","China","Colombia","Comoros","Republic of the Congo","Costa Rica","Côte d’Ivoire","Croatia","Cuba","Cyprus","Czech Republic",
  "Democratic Republic of the Congo","Denmark","Djibouti","Dominica","Dominican Republic","Ecuador","Egypt","El Salvador","Equatorial Guinea","Eritrea","Estonia","Eswatini","Ethiopia",
  "Fiji","Finland","France","Gabon","Gambia","Georgia","Germany","Ghana","Greece","Grenada","Guatemala","Guinea","Guinea-Bissau","Guyana","Haiti","Honduras","Hungary",
  "Iceland","India","Indonesia","Iran","Iraq","Ireland","Israel","Italy","Jamaica","Japan","Jordan","Kazakhstan","Kenya","Kiribati","Kuwait","Kyrgyzstan",
  "Laos","Latvia","Lebanon","Lesotho","Liberia","Libya","Liechtenstein","Lithuania","Luxembourg","Madagascar","Malawi","Malaysia","Maldives","Mali","Malta","Marshall Islands","Mauritania","Mauritius","Mexico","Micronesia","Moldova","Monaco","Mongolia","Montenegro","Morocco","Mozambique","Myanmar",
  "Namibia","Nauru","Nepal","Netherlands","New Zealand","Nicaragua","Niger","Nigeria","North Korea","North Macedonia","Norway","Oman","Pakistan","Palau","Palestine","Panama","Papua New Guinea","Paraguay","Peru","Philippines","Poland","Portugal",
  "Qatar","Romania","Russia","Rwanda","Saint Kitts and Nevis","Saint Lucia","Saint Vincent and the Grenadines","Samoa","San Marino","São Tomé and Príncipe","Saudi Arabia","Senegal","Serbia","Seychelles","Sierra Leone","Singapore","Slovakia","Slovenia","Solomon Islands","Somalia","South Africa","South Korea","South Sudan","Spain","Sri Lanka","Sudan","Suriname","Sweden","Switzerland","Syria",
  "Tajikistan","Tanzania","Thailand","Timor-Leste","Togo","Tonga","Trinidad and Tobago","Tunisia","Türkiye","Turkmenistan","Tuvalu","Uganda","Ukraine","United Arab Emirates","United Kingdom","United States","Uruguay","Uzbekistan","Vanuatu","Vatican City","Venezuela","Vietnam","Yemen","Zambia","Zimbabwe"
];
function initCountryPicker(){
  const picker=document.getElementById('countryPicker'), button=document.getElementById('countryButton'), menu=document.getElementById('countryMenu'), search=document.getElementById('countrySearch'), options=document.getElementById('countryOptions'), empty=document.getElementById('countryEmpty'), hidden=document.getElementById('country');
  if(!picker||!button||!menu||!search||!options||!hidden)return null;
  const render=(query='')=>{
    const q=String(query).trim().toLowerCase();
    const provider=String(NANTIA_PAYMENT_CONFIG.active_provider||'').toLowerCase();
    const countryList=(provider==='camerpay'||provider==='ultraner')?CAMERPAY_COUNTRIES:SUPPORTED_COUNTRIES;
    const rows=countryList.filter(c=>!q||c.toLowerCase().includes(q));
    options.innerHTML=rows.map(c=>`<button type="button" class="country-picker-option" role="option" aria-selected="${hidden.value===c?'true':'false'}" data-country="${escapeHtml(c)}">${escapeHtml(c)}</button>`).join('');
    empty.hidden=rows.length!==0;
    options.querySelectorAll('[data-country]').forEach(option=>option.addEventListener('click',()=>{
      const value=option.dataset.country||''; hidden.value=value; button.firstChild.textContent=value+' '; button.classList.add('is-selected'); close();
    }));
  };
  const open=()=>{menu.hidden=false;button.setAttribute('aria-expanded','true');render(search.value);requestAnimationFrame(()=>search.focus())};
  const close=()=>{menu.hidden=true;button.setAttribute('aria-expanded','false')};
  button.addEventListener('click',()=>menu.hidden?open():close());
  search.addEventListener('input',()=>render(search.value));
  document.addEventListener('click',e=>{if(!picker.contains(e.target))close()});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
  render();
  return {getValue:()=>hidden.value,focus:open,refresh:()=>render(search.value)};
}
function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
const COMMERCIAL_RATE=1.0;
const URGENT_FEE=15;
function money(n){return "$"+Number(n||0).toFixed(2)}
function getParams(){const p=new URLSearchParams(location.search);return{type:p.get("type"),format:p.get("format")}}
async function getPublicClient(){const cfg=window.NANTIA_SUPABASE||{};if(!window.supabase||!cfg.url||!cfg.anonKey)return null;return window.supabase.createClient(cfg.url,cfg.anonKey)}
let NANTIA_PAYMENT_CONFIG={active_provider:null,country_required:null};
async function loadPaymentProviderConfig(client){
  try{
    const {data,error}=await client.rpc('get_public_payment_config');
    const row=Array.isArray(data)?data[0]:data;
    const provider=String(row?.active_provider||'').toLowerCase();
    if(!error&&row&&(provider==='manual'||provider==='camerpay'||provider==='ultraner')){
      NANTIA_PAYMENT_CONFIG=row;
      return true;
    }
    console.error('Nantia payment configuration could not be loaded.',error);
  }catch(err){
    console.error('Nantia payment configuration could not be loaded.',err);
  }
  return false;
}
async function loadPublicData(client){const [{data:settings},{data:offers,error:offersError},{data:discounts,error:discountError}]=await Promise.all([client.from('site_settings').select('*').eq('id',true).single(),client.from('commission_offers').select('*').eq('active',true).order('sort_order'),client.from('commission_discounts').select('*')]);return{settings:settings||null,offers:offers||[],discounts:discounts||[],error:offersError||discountError||null}}
function offerFormat(offer){const explicit=offer?.options&&typeof offer.options==='object'?offer.options.format:'';if(explicit)return String(explicit).toLowerCase();const key=`${offer?.slug||''} ${offer?.name||''}`.toLowerCase().replace(/[-_]/g,' ');if(/\bbust\s*up\b/.test(key))return'bust';if(/\bhalf\s*body\b/.test(key))return'half';if(/\bfull\s*body\b/.test(key))return'full';return''}
function findFormatOffer(offers,format){const wanted=String(format||'').toLowerCase();return(offers||[]).find(o=>o.category==='Character Illustration'&&offerFormat(o)===wanted)||null}
function findCustomOffer(offers){return(offers||[]).find(o=>o.category==='Custom Illustration'||String(o.slug||'').toLowerCase()==='custom-illustration')||null}
function activeDiscountForOffer(offer,discounts){const now=Date.now();return(discounts||[]).filter(d=>(!d.offer_id||d.offer_id===offer?.id)&&d.active&&(!d.starts_at||new Date(d.starts_at).getTime()<=now)&&(!d.ends_at||new Date(d.ends_at).getTime()>now)).sort((a,b)=>new Date(a.created_at||0)-new Date(b.created_at||0))[0]||null}
function discountedPrice(base,discount){if(base==null||!discount)return base;const v=Number(discount.discount_value||0);return Math.max(0,discount.discount_type==='percentage'?Number(base)*(1-v/100):Number(base)-v)}
function priceMarkup(base,discount){if(base==null)return '<span>Estimate</span>';const old=money(base), next=discountedPrice(base,discount);return discount&&next!==Number(base)?`<span class="old-price">${old}</span> <strong class="discount-price">${money(next)}</strong> <span class="discount-badge">${discount.discount_type==='percentage'?Number(discount.discount_value).toFixed(0)+'% OFF':'SALE'}</span>`:old}
function currentGlobalDiscount(discounts=[]){const now=Date.now();return(discounts||[]).filter(d=>!d.offer_id&&d.active&&(!d.starts_at||new Date(d.starts_at).getTime()<=now)&&(!d.ends_at||new Date(d.ends_at).getTime()>now)).sort((a,b)=>new Date(a.created_at||0)-new Date(b.created_at||0))[0]||null}
function renderDiscountAnnouncement(discounts=[],isOpen=true){
 const existing=document.querySelector('.global-discount-banner');if(existing)existing.remove();
 if(!isOpen||location.pathname.toLowerCase().endsWith('admin.html'))return;
 const d=currentGlobalDiscount(discounts);if(!d)return;
 const banner=document.createElement('aside');banner.className='global-discount-banner';
 const value=d.discount_type==='percentage'?`${Number(d.discount_value).toFixed(0)}% OFF`:`$${Number(d.discount_value).toFixed(2)} OFF`;
 banner.innerHTML=`<div class="global-discount-inner"><span class="global-discount-pulse" aria-hidden="true"></span><div><strong>COMMISSION SALE · ${value}</strong><span>${d.name?String(d.name):'A special discount is currently active'} — applies to all fixed-price commission offers.</span></div><a href="/commissions/">View offers →</a></div>`;
 const header=document.querySelector('header');if(header)header.insertAdjacentElement('afterend',banner);else document.body.prepend(banner);
}

function applyAvailability(isOpen){document.querySelectorAll('[data-commission-open]').forEach(el=>{el.querySelectorAll('.open-state').forEach(x=>x.hidden=!isOpen);el.querySelectorAll('.closed-state').forEach(x=>x.hidden=isOpen);el.querySelector('.dot')?.classList.toggle('closed',!isOpen)});document.querySelectorAll('[data-request-link]').forEach(a=>{if(!a.dataset.originalHref)a.dataset.originalHref=a.getAttribute('href')||'/commissions/';a.setAttribute('href',isOpen?a.dataset.originalHref:'/closed/')});document.querySelectorAll('[data-format]').forEach(b=>{const format=b.dataset.format;b.setAttribute('href',isOpen?`/request/?type=character&format=${encodeURIComponent(format)}`:'/closed/')})}
function renderHomepagePrices(offers,discounts=[]){const map={bust:'Bust Up',half:'Half Body',full:'Full Body'};document.querySelectorAll('[data-home-format]').forEach(el=>{const key=el.dataset.homeFormat,offer=findFormatOffer(offers,key),label=map[key]||key;el.innerHTML=offer&&offer.base_price!=null?`${label} · ${priceMarkup(offer.base_price,activeDiscountForOffer(offer,discounts))}`:`${label} · Estimate`})}

async function initRequestPage(client,settings,offers,discounts=[]){
 const countryPicker=initCountryPicker();
 const form=document.querySelector('#commissionForm');if(!form)return;
 const countryWrap=document.getElementById('countryPicker'), countryLabel=document.querySelector('label[for=countryButton]'), countryNote=document.querySelector('.country-availability-note');
 const hideCountryForProvider=()=>{const provider=String(NANTIA_PAYMENT_CONFIG.active_provider||'').toLowerCase();const isCamerPay=provider==='camerpay';const isUltraner=provider==='ultraner';const hide=!isCamerPay&&!isUltraner&&NANTIA_PAYMENT_CONFIG.country_required===false;if(countryWrap){countryWrap.hidden=hide;countryWrap.style.display=hide?'none':'';}if(countryLabel){countryLabel.hidden=hide;countryLabel.style.display=hide?'none':'';}if(countryNote){countryNote.hidden=hide;countryNote.style.display=hide?'none':'';}if(hide){const hidden=document.getElementById('country');if(hidden)hidden.value='Unknown';}else if(isCamerPay||isUltraner){const hidden=document.getElementById('country');if(hidden && hidden.value==='Unknown')hidden.value='';}};
 hideCountryForProvider();
 if(countryPicker?.refresh)countryPicker.refresh();
 const q=getParams();
 const type=document.querySelector('#commissionType'),fmt=document.querySelector('#format'),formatLabel=document.querySelector('#formatLabel'),selectedNote=document.querySelector('#selectedFormatNote');
 const chars=document.querySelector('#characters'),commercial=document.querySelector('#commercial'),usage=document.querySelector('#usage'),custom=document.querySelector('#customComplexity'),box=document.querySelector('#customBox'),bg=document.querySelector('#background'),urgent=document.querySelector('#urgent'),urgentBox=document.querySelector('#urgentBox'),deadline=document.querySelector('#deadline');
 const baseOffers={bust:findFormatOffer(offers,'bust'),half:findFormatOffer(offers,'half'),full:findFormatOffer(offers,'full')};
 const formatNames={bust:'Bust Up',half:'Half Body',full:'Full Body'};
 let lockedFormat='';
 if(q.type==='character')type.value='Character Illustration';
 if(q.type==='custom')type.value='Custom Illustration';
 const formatOptions=Object.entries(baseOffers).map(([key,o])=>{const d=activeDiscountForOffer(o,discounts);let label='';if(o&&o.base_price!=null){const base=Number(o.base_price),next=discountedPrice(base,d);label=d&&next!==base?` — ${money(base)} → ${money(next)} (${d.discount_type==='percentage'?Number(d.discount_value).toFixed(0)+'% OFF':'SALE'})`:` — ${money(base)}`}return `<option value="${key}">${formatNames[key]}${label}</option>`}).join('');
 fmt.innerHTML='<option value="">Choose one</option>'+formatOptions;
 if(q.type==='character'&&q.format&&baseOffers[q.format]){lockedFormat=q.format;fmt.value=q.format}
 function applyTypeUI(){
   const isCustom=type.value==='Custom Illustration';
   box.hidden=!isCustom;
   if(custom){
     custom.required=isCustom;
     if(isCustom && !['moderate','detailed','highly-detailed'].includes(custom.value)) custom.value='moderate';
   }
   const backgroundBox=document.querySelector('#backgroundBox');
   if(backgroundBox) backgroundBox.hidden=isCustom;
   if(bg) bg.disabled=isCustom;
   const shouldLock=type.value==='Character Illustration'&&lockedFormat&&baseOffers[lockedFormat];
   fmt.hidden=!!shouldLock; if(formatLabel)formatLabel.hidden=!!shouldLock;
   if(selectedNote){selectedNote.hidden=!shouldLock;if(shouldLock){const o=baseOffers[lockedFormat];selectedNote.innerHTML=`<strong>Selected format:</strong> ${formatNames[lockedFormat]}${o?.base_price!=null?' — '+priceMarkup(o.base_price,activeDiscountForOffer(o,discounts)):''}<br><span class="muted">This format was selected from the commission page and does not need to be chosen again.</span>`}}
 }
 function update(){
   const offer=baseOffers[fmt.value];const discount=activeDiscountForOffer(offer,discounts);const base=offer?.base_price!=null?Number(offer.base_price):0;const effectiveBase=discountedPrice(base,discount);const n=Math.max(1,+chars.value||1);const extraRate=Number(settings?.extra_character_rate??0.70);const commercialRate=Number(settings?.commercial_rate??COMMERCIAL_RATE);const urgentFee=urgent?.checked?Number(settings?.urgent_fee??URGENT_FEE):0;const extras=effectiveBase*extraRate*(n-1);let comp=0;if(type.value==='Custom Illustration')comp={moderate:15,detailed:30,'highly-detailed':50}[custom?.value||'moderate']||15;const subtotal=effectiveBase+extras+comp;const comm=commercial?.checked?subtotal*commercialRate:0;document.querySelector('#basePrice').innerHTML=priceMarkup(base,discount);document.querySelector('#extraPrice').textContent=money(extras+comp);document.querySelector('#usePrice').textContent=money(comm);const urgentRow=document.querySelector('#urgentPrice');if(urgentRow)urgentRow.textContent=money(urgentFee);document.querySelector('#estimatedTotal').textContent=money(subtotal+comm+urgentFee);if(document.querySelector('#estimateNote'))document.querySelector('#estimateNote').textContent=type.value==='Custom Illustration'?'Estimate only — I will review the scene and set the final price.':'Expected price based on the selected catalog price, character count and usage.';applyTypeUI();
 }
 [chars,commercial,usage,custom,fmt,type,urgent].filter(Boolean).forEach(x=>x.addEventListener('change',update));
 const contactMethodEl=document.querySelector('#contactMethod'); if(contactMethodEl)contactMethodEl.addEventListener('change',()=>{const el=document.querySelector('#contactValue');const ph={instagram:'@username',tiktok:'@username',discord:'Username or handle',whatsapp:'Phone number',facebook:'Profile name or link',tumblr:'@username',x:'@username',other:'Username, handle, or contact detail'};if(el)el.placeholder=ph[contactMethodEl.value]||ph.other;});
 const discoverySourceEl=document.querySelector('#discoverySource'); const discoveryOtherEl=document.querySelector('#discoveryOther'); if(discoverySourceEl) discoverySourceEl.addEventListener('change',()=>{const isOther=discoverySourceEl.value==='Other'; if(discoveryOtherEl){discoveryOtherEl.style.display=isOther?'block':'none'; discoveryOtherEl.required=isOther; if(!isOther) discoveryOtherEl.value='';}});
 if(usage)usage.addEventListener('change',()=>{if(commercial)commercial.checked=usage.value==='commercial';update()});
 if(commercial)commercial.addEventListener('change',()=>{if(usage)usage.value=commercial.checked?'commercial':'personal';update()});
 if(urgent)urgent.addEventListener('change',()=>{if(urgentBox)urgentBox.hidden=!urgent.checked;if(deadline)deadline.required=urgent.checked;update()});
 update();
   // V16.55 — character references are required, limited to 5 files.
   // Any file type is accepted; each file must be 2 MB or smaller.
   // Validation happens before the request is created, so invalid/missing required references block submission.
   const characterReferenceInput=document.querySelector('#characterReferences');
   const additionalReferenceInput=document.querySelector('#additionalReferences');
   const characterReferenceList=document.querySelector('#characterReferenceList');
   const MAX_CHARACTER_REFERENCES=5;
   const MAX_REFERENCE_BYTES=2*1024*1024;
   let characterReferenceFiles=[];

   const formatFileSize=(bytes)=>{
     const n=Number(bytes||0);
     if(n<1024)return `${n} B`;
     if(n<1024*1024)return `${(n/1024).toFixed(1)} KB`;
     return `${(n/(1024*1024)).toFixed(2)} MB`;
   };
   const fileIsValid=(file)=>{
     if(!file||file.size>MAX_REFERENCE_BYTES)return false;
     return true;
   };
   const syncCharacterInput=()=>{
     if(!characterReferenceInput)return;
     try{
       const dt=new DataTransfer();
       characterReferenceFiles.forEach(item=>{if(item.file)dt.items.add(item.file)});
       characterReferenceInput.files=dt.files;
     }catch(err){console.warn('Could not sync character reference input:',err)}
   };
   const renderCharacterReferences=()=>{
     if(!characterReferenceList)return;
     characterReferenceList.innerHTML=characterReferenceFiles.map((item,index)=>{
       const file=item.file;
       const invalid=!fileIsValid(file);
       const reason=file?.size>MAX_REFERENCE_BYTES?'Too large. Maximum 2 MB.':'';
       return `<div class="reference-file-item${invalid?' invalid':''}" data-ref-index="${index}">
         <div class="reference-file-meta">
           <span class="reference-file-name">${escapeHtml(file?.name||'Reference file')}</span>
           <span class="reference-file-size">${formatFileSize(file?.size||0)}${invalid?` · <span class="reference-file-status">${escapeHtml(reason)}</span>`:' · Ready'}</span>
         </div>
         <div class="reference-file-actions">
           ${invalid?`<button type="button" class="reference-replace" data-replace-ref="${index}">Replace</button>`:''}
           <button type="button" class="reference-remove" aria-label="Remove ${escapeHtml(file?.name||'reference file')}" data-remove-ref="${index}">Remove</button>
         </div>
       </div>`;
     }).join('');
     characterReferenceList.querySelectorAll('[data-remove-ref]').forEach(btn=>btn.addEventListener('click',()=>{
       const index=Number(btn.dataset.removeRef);characterReferenceFiles.splice(index,1);syncCharacterInput();renderCharacterReferences();
     }));
     characterReferenceList.querySelectorAll('[data-replace-ref]').forEach(btn=>btn.addEventListener('click',()=>{
       const index=Number(btn.dataset.replaceRef);
       const picker=document.createElement('input');picker.type='file';
       picker.addEventListener('change',()=>{
         const file=picker.files?.[0];if(!file)return;
         characterReferenceFiles[index]={file};syncCharacterInput();renderCharacterReferences();
       });
       picker.click();
     }));
   };
   if(characterReferenceInput){
     characterReferenceInput.addEventListener('change',()=>{
       const incoming=Array.from(characterReferenceInput.files||[]);
       const room=Math.max(0,MAX_CHARACTER_REFERENCES-characterReferenceFiles.length);
       const accepted=incoming.slice(0,room);
       characterReferenceFiles.push(...accepted.map(file=>({file})));
       if(incoming.length>room)alert(`You can upload a maximum of ${MAX_CHARACTER_REFERENCES} character reference files. The extra file(s) were not added.`);
       syncCharacterInput();renderCharacterReferences();
     });
   }
   renderCharacterReferences();


 form.addEventListener('submit',async e=>{
   e.preventDefault();
   let country=countryPicker?.getValue()||'';
   if(String(NANTIA_PAYMENT_CONFIG.active_provider||'').toLowerCase()==='camerpay' || String(NANTIA_PAYMENT_CONFIG.active_provider||'').toLowerCase()==='ultraner'){ country=country||'Unknown'; }
   else if(NANTIA_PAYMENT_CONFIG.country_required!==false && !country){alert('Please select your country before submitting your request.');countryPicker?.focus();return;}
   const submit=form.querySelector('button[type="submit"]');
   if(!settings||settings.commissions_open===false){location.href='/closed/';return}
   if(!client){alert('The commission system is temporarily unavailable. Please try again later.');return}
   const contactMethod=document.querySelector('#contactMethod')?.value||'';
   const contactValue=document.querySelector('#contactValue')?.value.trim()||'';
   const email=document.querySelector('#clientEmail')?.value.trim()||'';
   const description=document.querySelector('#description')?.value.trim()||'';
   const additional=document.querySelector('#additionalInformation')?.value.trim()||'';
   const discoverySource=document.querySelector('#discoverySource')?.value||'';
   const discoveryOther=document.querySelector('#discoveryOther')?.value.trim()||'';
   if(discoverySource==='Other'&&!discoveryOther){alert('Please tell me how you found me, or choose another option.');document.querySelector('#discoveryOther')?.focus();return;}
   const discoveryText=discoverySource?(discoverySource==='Other'?`How did you find me: ${discoveryOther}`:`How did you find me: ${discoverySource}`):'';
   const combinedAdditional=[discoveryText,additional].filter(Boolean).join('\n\n');
   const mood=document.querySelector('#moodLighting')?.value.trim()||'';
   const tos=document.querySelector('#tosAccepted')?.checked;
   const noGuarantee=document.querySelector('#noGuarantee')?.checked;
   const contactMethodEl=document.querySelector('#contactMethod');
   const contactValueEl=document.querySelector('#contactValue');
   const contactPlaceholders={instagram:'@username',tiktok:'@username',discord:'Username or handle',whatsapp:'Phone number',facebook:'Profile name or link',tumblr:'@username',x:'@username',other:'Username, handle, or contact detail'};
   if(contactValueEl)contactValueEl.placeholder=contactPlaceholders[contactMethodEl?.value||'instagram']||contactPlaceholders.other;
   const selectedFormat=fmt.value;
   const finalFormat=type.value==='Character Illustration'&&lockedFormat?lockedFormat:selectedFormat;
   if(!contactMethod||!contactValue||!email||!description||!tos||!noGuarantee){alert('Please complete all required fields and agreements.');return}
   if(!finalFormat){alert('Please choose a format.');return}
   if(urgent?.checked&&!deadline?.value){alert('Please enter your requested deadline for urgent priority.');return}
   const selectedOffer=type.value==='Custom Illustration'?findCustomOffer(offers):baseOffers[finalFormat];
   if(!selectedOffer){alert('The selected commission is no longer available. Please return to the Commissions page and try again.');return}
   const base=selectedOffer.base_price!=null?Number(selectedOffer.base_price):Number(baseOffers[finalFormat]?.base_price||0);const discount=activeDiscountForOffer(selectedOffer,discounts);const effectiveBase=discountedPrice(base,discount);
   const n=Math.max(1,+chars.value||1);const extraRate=Number(settings?.extra_character_rate??0.70);const commercialRate=Number(settings?.commercial_rate??COMMERCIAL_RATE);const urgentFee=urgent?.checked?Number(settings?.urgent_fee??URGENT_FEE):0;const complexity=type.value==='Custom Illustration'?({moderate:15,detailed:30,'highly-detailed':50}[custom?.value||'moderate']||15):0;const extras=(effectiveBase*extraRate*(n-1))+complexity;const subtotal=effectiveBase+extras;const comm=commercial?.checked?subtotal*commercialRate:0;const estimated=subtotal+comm+urgentFee;
   // Required character references must be present and every selected file must be within the storage size limit.
   if(characterReferenceFiles.length<1){
     alert('Please upload at least 1 character reference file before submitting your request.');
     characterReferenceInput?.focus();
     return;
   }
   const invalidCharacterReferences=characterReferenceFiles.filter(item=>!fileIsValid(item.file));
   if(invalidCharacterReferences.length){
     alert('Please replace or remove every reference file that is too large before submitting. Each file must be 2 MB or smaller.');
     return;
   }
   syncCharacterInput();

   // V16.49 — reference system rebuild.
   // References are uploaded BEFORE the commission request is created.
   // If any reference fails, the request is NOT created.
   const makeReferenceUploadError = (file, err) => {
     const raw = String(err?.message || err || '').trim();
     if(/failed to fetch|networkerror|network error|load failed|fetch failed/i.test(raw)){
       return `Could not reach the file storage service while uploading "${file.name}". Your commission request was not submitted.`;
     }
     return raw || `The file could not be uploaded.`;
   };

   const uploadReferenceBatch = async (fileEntries, batchId) => {
     const uploaded=[];
     const failures=[];

     for(let index=0; index<fileEntries.length; index++){
       const entry=fileEntries[index];
       const file=entry.file;
       submit.textContent=`Uploading reference ${index+1} of ${fileEntries.length}…`;

       if(!file){
         failures.push({file,reason:'The selected file could not be read.'});
         continue;
       }
       if(!fileIsValid(file)){
         const reason=file.size>MAX_REFERENCE_BYTES?'File is larger than the 2 MB maximum.':'The selected file could not be read.';
         failures.push({file,reason});
         continue;
       }

       const safeName=(file.name||'reference').replace(/[^a-zA-Z0-9._-]/g,'_');
       const uniquePrefix=(window.crypto?.randomUUID?.()||`${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`).replace(/-/g,'');
       const path=`pending/${batchId}/${uniquePrefix}_${safeName}`;
       const storage=client.storage.from('commission-references');

       try{
         const {data,error}=await storage.upload(path,file,{
           upsert:false,
           contentType:file.type||'application/octet-stream',
           cacheControl:'3600'
         });
         if(error) throw error;

         uploaded.push({
           file_type:entry.fileType,
           storage_path:data?.path||path,
           original_name:file.name||safeName
         });
       }catch(err){
         console.error('Reference upload failed:',file.name,err);
         failures.push({file,reason:makeReferenceUploadError(file,err)});
       }
     }

     return {uploaded,failures};
   };

   const referenceEntries=[
     ...characterReferenceFiles.map(item=>({file:item.file,fileType:'character_reference'})),
     ...Array.from(additionalReferenceInput?.files||[]).map(file=>({file,fileType:'additional_reference'}))
   ];

   // Validate every reference before touching Supabase. Character references are
   // required; additional references are optional. Any file type is allowed, with a 2 MB per-file limit.
   if(characterReferenceFiles.length<1){
     alert('Please upload at least 1 character reference file before submitting your request.');
     characterReferenceInput?.focus();
     submit.disabled=false;
     submit.textContent='Submit Commission Request';
     return;
   }

   const invalidEntries=referenceEntries.filter(entry=>!fileIsValid(entry.file));
   if(invalidEntries.length){
     const details=invalidEntries.map(entry=>{
       const file=entry.file;
       const reason=file?.size>MAX_REFERENCE_BYTES
         ? 'File is larger than the 2 MB maximum.'
         : 'The selected file could not be read.';
       return `• ${file?.name||'Unnamed file'} — ${reason}`;
     }).join('\n');
     alert(`Please replace or remove these reference files before submitting:\n\n${details}`);
     submit.disabled=false;
     submit.textContent='Submit Commission Request';
     return;
   }

   submit.disabled=true;
   const batchId=window.crypto?.randomUUID?.()||`${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;

   // Upload references first. No commission request exists yet.
   const {uploaded,failures}=await uploadReferenceBatch(referenceEntries,batchId);

   if(failures.length){
     const details=failures.map(item=>`• ${item.file?.name||'Unnamed file'} — ${item.reason}`).join('\n');
     alert(
       `Your commission request was NOT submitted because one or more reference files could not be uploaded.\n\n`+
       `${details}\n\nPlease fix the listed file(s) and try again.`
     );
     submit.disabled=false;
     submit.textContent='Submit Commission Request';
     return;
   }

   // All selected references successfully reached Storage. Now create the request
   // and attach those exact files in one database transaction.
   submit.textContent='Submitting commission request…';
   const {data:requestNumber,error}=await client.rpc('create_commission_request_v16_49',{
     p_upload_batch_id:batchId,
     p_files:uploaded,
     p_country:country,
     p_contact_method:contactMethod,
     p_contact_value:contactValue,
     p_email:email,
     p_commission_offer_id:selectedOffer.id,
     p_commission_type:type.value,
     p_format:finalFormat,
     p_character_count:n,
     p_usage_type:commercial?.checked?'commercial':'personal',
     p_background:type.value==='Custom Illustration'?null:(bg?.value||null),
     p_custom_complexity:type.value==='Custom Illustration'?(custom?.value||'moderate'):null,
     p_urgent:!!urgent?.checked,
     p_requested_deadline:urgent?.checked?deadline.value:null,
     p_deadline_reason:urgent?.checked?(document.querySelector('#deadlineReason')?.value.trim()||null):null,
     p_description:description,
     p_preferred_mood_lighting:mood||null,
     p_additional_information:combinedAdditional||null,
     p_estimated_price:estimated
   });

   if(error){
     console.error('Commission submission error:',error);
     const details=[error.message,error.details,error.hint,error.code].filter(Boolean).join('\n\n');
     alert(
       `Your commission request was NOT submitted.\n\n`+
       `The reference images uploaded successfully, but the request could not be created.\n\n`+
       `${details||'No error details were returned.'}`
     );
     submit.disabled=false;
     submit.textContent='Submit Commission Request';
     return;
   }

   form.hidden=true;
   const confirmation=document.querySelector('#confirmation');
   confirmation.hidden=false;
   confirmation.querySelector('.request-id').textContent='#'+requestNumber;

   const existing=confirmation.querySelector('.portal-access');
   if(!existing){
     const p=document.createElement('div');
     p.className='portal-access muted';
     p.style.marginTop='18px';
     p.innerHTML='<p><strong>Important: save your request number.</strong></p><p>You can check your commission status anytime by visiting Nantia\'s Commissions and selecting <strong>Check My Commission</strong> from the menu.</p><p>To access your commission, you will need your request number and the email address used for this request.</p><a class="btn btn-primary" style="margin-top:8px;display:inline-block" href="/commission/?request_number='+encodeURIComponent(requestNumber)+'">Check My Commission</a>';
     confirmation.appendChild(p);
   }
 });
}

document.addEventListener('DOMContentLoaded',async()=>{const menu=document.querySelector('.menu'),nav=document.querySelector('.navlinks');if(menu&&nav)menu.onclick=()=>nav.classList.toggle('open');const client=await getPublicClient();if(!client){applyAvailability(true);return}const{settings,offers,discounts}=await loadPublicData(client);const paymentConfigOk=await loadPaymentProviderConfig(client);const isOpen=settings?.commissions_open!==false;applyAvailability(isOpen);renderDiscountAnnouncement(discounts,isOpen);renderHomepagePrices(offers,discounts);if(paymentConfigOk)await initRequestPage(client,settings||{},offers,discounts)});


/* V7.9.2 visual refresh — reveal animation. Navigation is handled by the main DOMContentLoaded handler above. */
document.addEventListener('DOMContentLoaded',()=>{
  const items=document.querySelectorAll('.reveal');
  if(!items.length)return;
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){items.forEach(x=>x.classList.add('visible'));return;}
  const io=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('visible');io.unobserve(entry.target)}}),{threshold:.12});
  items.forEach(x=>io.observe(x));
});

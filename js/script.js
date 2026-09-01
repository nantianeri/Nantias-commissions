/* Nantia's Commissions V6.8 — shared public-site data layer */
const COMMERCIAL_RATE=1.0;
const URGENT_FEE=15;
function money(n){return "$"+Number(n).toFixed(2)}
function getParams(){const p=new URLSearchParams(location.search);return{type:p.get("type"),format:p.get("format")}}

async function getPublicClient(){
  const cfg=window.NANTIA_SUPABASE||{};
  if(!window.supabase || !cfg.url || !cfg.anonKey) return null;
  return window.supabase.createClient(cfg.url,cfg.anonKey);
}

async function loadPublicData(client){
  const [{data:settings},{data:offers,error}]=await Promise.all([
    client.from('site_settings').select('*').eq('id',true).single(),
    client.from('commission_offers').select('*').eq('active',true).order('sort_order')
  ]);
  return {settings:settings||null,offers:offers||[],error:error||null};
}

function offerFormat(offer){
  const explicit = offer?.options && typeof offer.options==='object' ? offer.options.format : '';
  if(explicit) return String(explicit).toLowerCase();
  const key = `${offer?.slug||''} ${offer?.name||''}`.toLowerCase().replace(/[-_]/g,' ');
  if(/\bbust\s*up\b/.test(key) || /\bbust[- ]?up\b/.test(key)) return 'bust';
  if(/\bhalf\s*body\b/.test(key) || /\bhalf[- ]?body\b/.test(key)) return 'half';
  if(/\bfull\s*body\b/.test(key) || /\bfull[- ]?body\b/.test(key)) return 'full';
  return '';
}
function findFormatOffer(offers,format){
  const wanted=String(format||'').toLowerCase();
  return (offers||[]).find(o=>o.category==='Character Illustration' && offerFormat(o)===wanted) || null;
}

function applyAvailability(isOpen){
  document.querySelectorAll('[data-commission-open]').forEach(el=>{
    el.querySelectorAll('.open-state').forEach(x=>x.hidden=!isOpen);
    el.querySelectorAll('.closed-state').forEach(x=>x.hidden=isOpen);
    el.querySelector('.dot')?.classList.toggle('closed',!isOpen);
  });
  document.querySelectorAll('[data-request-link]').forEach(a=>{
    if(!a.dataset.originalHref) a.dataset.originalHref=a.getAttribute('href')||'commissions.html';
    a.setAttribute('href',isOpen?a.dataset.originalHref:'closed.html');
  });
  document.querySelectorAll('[data-format]').forEach(b=>{
    const format=b.dataset.format;
    b.setAttribute('href',isOpen?`request.html?type=character&format=${encodeURIComponent(format)}`:'closed.html');
  });
}

function renderHomepagePrices(offers){
  const map={bust:'Bust Up',half:'Half Body',full:'Full Body'};
  document.querySelectorAll('[data-home-format]').forEach(el=>{
    const key=el.dataset.homeFormat, offer=findFormatOffer(offers,key), label=map[key]||key;
    el.textContent=offer && offer.base_price!=null ? `${label} · ${money(offer.base_price)}` : `${label} · Estimate`;
  });
}

async function initRequestPage(client,settings,offers){
  const form=document.querySelector('#commissionForm'); if(!form)return;
  const q=getParams();
  const type=document.querySelector('#commissionType'),fmt=document.querySelector('#format');
  const formatLabel=document.querySelector('#formatLabel'),selectedNote=document.querySelector('#selectedFormatNote');
  const chars=document.querySelector('#characters'),commercial=document.querySelector('#commercial'),usage=document.querySelector('#usage'),custom=document.querySelector('#customComplexity'),box=document.querySelector('#customBox'),bg=document.querySelector('#background'),urgent=document.querySelector('#urgent'),urgentBox=document.querySelector('#urgentBox'),deadline=document.querySelector('#deadline');
  const baseOffers={bust:findFormatOffer(offers,'bust'),half:findFormatOffer(offers,'half'),full:findFormatOffer(offers,'full')};

  if(q.type==='character') type.value='Character Illustration';
  if(q.type==='custom') type.value='Custom Illustration';

  const formatOptions=Object.entries(baseOffers).map(([key,o])=>{
    const label={bust:'Bust Up',half:'Half Body',full:'Full Body'}[key];
    const price=o&&o.base_price!=null?` — ${money(o.base_price)}`:'';
    return `<option value="${key}">${label}${price}</option>`;
  }).join('');
  fmt.innerHTML='<option value="">Choose one</option>'+formatOptions;

  if(q.format && baseOffers[q.format]){
    fmt.value=q.format;
    if(q.type==='character'){
      fmt.hidden=true;
      if(formatLabel) formatLabel.hidden=true;
      if(selectedNote){
        const o=baseOffers[q.format], label={bust:'Bust Up',half:'Half Body',full:'Full Body'}[q.format];
        selectedNote.hidden=false;
        selectedNote.innerHTML=`<strong>Selected format:</strong> ${label}${o?.base_price!=null?' — '+money(o.base_price):''}<br><span class="muted">This format was selected from the commission page and does not need to be chosen again.</span>`;
      }
    }
  }

  function update(){
    const offer=baseOffers[fmt.value];
    const base=offer?.base_price!=null?Number(offer.base_price):0;
    const n=Math.max(1,+chars.value||1);
    const extraRate=Number(settings?.extra_character_rate ?? 0.70);
    const commercialRate=Number(settings?.commercial_rate ?? COMMERCIAL_RATE);
    const urgentFee=urgent?.checked?Number(settings?.urgent_fee ?? URGENT_FEE):0;
    const extras=base*extraRate*(n-1);
    let comp=0;
    if(type.value==='Custom Illustration') comp={simple:0,moderate:15,detailed:30,'highly-detailed':50}[custom?.value||'simple']||0;
    const subtotal=base+extras+comp;
    const comm=commercial?.checked?subtotal*commercialRate:0;
    document.querySelector('#basePrice').textContent=money(base);
    document.querySelector('#extraPrice').textContent=money(extras+comp);
    document.querySelector('#usePrice').textContent=money(comm);
    const urgentRow=document.querySelector('#urgentPrice'); if(urgentRow)urgentRow.textContent=money(urgentFee);
    document.querySelector('#estimatedTotal').textContent=money(subtotal+comm+urgentFee);
    if(document.querySelector('#estimateNote')) document.querySelector('#estimateNote').textContent=type.value==='Custom Illustration'?'Estimate only — I will review the scene and set the final price.':'Expected price based on the selected catalog price, character count and usage.';
    if(box)box.hidden=type.value!=='Custom Illustration';
    if(bg)bg.innerHTML=type.value==='Character Illustration'?'<option>Transparent / no background</option><option>Simple background</option>':'<option>Transparent / no background</option><option>Simple background</option><option>Detailed environment</option><option>Highly detailed scene</option>';
  }

  [chars,commercial,usage,custom,fmt,type,urgent].filter(Boolean).forEach(x=>x.addEventListener('change',update));
  if(usage)usage.addEventListener('change',()=>{if(commercial)commercial.checked=usage.value==='commercial';update()});
  if(commercial)commercial.addEventListener('change',()=>{if(usage)usage.value=commercial.checked?'commercial':'personal';update()});
  if(urgent)urgent.addEventListener('change',()=>{if(urgentBox)urgentBox.hidden=!urgent.checked;if(deadline)deadline.required=urgent.checked;update()});
  update();

  form.addEventListener('submit',e=>{
    e.preventDefault();
    if(!settings || settings.commissions_open===false){location.href='closed.html';return}
    const id='#'+(1042+Math.floor(Math.random()*9000));
    form.hidden=true;
    document.querySelector('#confirmation').hidden=false;
    document.querySelector('.request-id').textContent=id;
  });
}

document.addEventListener('DOMContentLoaded',async()=>{
  const menu=document.querySelector('.menu'),nav=document.querySelector('.navlinks');
  if(menu&&nav)menu.onclick=()=>nav.classList.toggle('open');

  const client=await getPublicClient();
  if(!client){applyAvailability(true);return;}
  const {settings,offers}=await loadPublicData(client);
  const isOpen=settings?.commissions_open!==false;
  applyAvailability(isOpen);
  renderHomepagePrices(offers);
  await initRequestPage(client,settings||{},offers);
});

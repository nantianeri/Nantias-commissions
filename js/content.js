/* V16.89 — editable content loader with single glass loading screen */
(function(){
  document.documentElement.dataset.contentPending='true';
  let finished=false;
  const failTimer=setTimeout(()=>{
    if(finished)return;
    document.documentElement.dataset.contentLoadError='true';
    document.dispatchEvent(new CustomEvent('nantia:content-error'));
  },10000);
  async function loadSiteContent(){
    const cfg=window.NANTIA_SUPABASE||{};
    if(!window.supabase || !cfg.url || !cfg.anonKey){finish();return;}
    try{
      const client=window.supabase.createClient(cfg.url,cfg.anonKey);
      const [{data:base,error:baseError},{data:providerCfg,error:providerError}]=await Promise.all([
        client.from('site_content').select('key,value'),
        client.rpc('get_public_payment_config')
      ]);
      if(baseError || !base){showError();return;}
      const map={}; base.forEach(row=>{map[row.key]=row.value??''});
      const provider=String(providerCfg?.[0]?.active_provider||'manual').toLowerCase();
      const {data:overrides,error:overrideError}=await client.from('provider_content').select('key,value').eq('provider',provider);
      if(!overrideError && overrides){overrides.forEach(row=>{map[row.key]=row.value??''});}
      apply(map);
      document.documentElement.dataset.contentLoaded='true';
      finish();
    }catch(_){showError();}
  }
  function apply(map){
    document.querySelectorAll('[data-content-href-key]').forEach(el=>{
      const key=el.dataset.contentHrefKey;
      if(key && map[key]!==undefined && (el.tagName==='A'||el.tagName==='AREA')){
        const href=String(map[key]).trim(); el.setAttribute('href',href||'#');
        if(href && /^https?:\/\//i.test(href)){el.setAttribute('target','_blank');el.setAttribute('rel','noopener noreferrer');}
      }
    });
    document.querySelectorAll('[data-content-key]').forEach(el=>{
      const key=el.dataset.contentKey; if(!(key in map))return;
      const attr=el.dataset.contentAttr;
      if(attr==='href')el.setAttribute('href',map[key]);
      else if(attr==='content')el.setAttribute('content',map[key]);
      else if(attr==='placeholder')el.setAttribute('placeholder',map[key]);
      else if(attr==='aria-label')el.setAttribute('aria-label',map[key]);
      else el.textContent=map[key];
    });
  }
  function showError(){
    clearTimeout(failTimer);
    document.documentElement.dataset.contentLoadError='true';
    const screen=document.getElementById('nantia-loading-screen');
    if(screen){
      const title=screen.querySelector('.nantia-loading-brand');
      const subtitle=screen.querySelector('.nantia-loading-subtitle');
      const spinner=screen.querySelector('.nantia-loading-spinner');
      if(title) title.textContent='NANTIA’S ART';
      if(subtitle) subtitle.textContent='We’re having trouble loading the latest content';
      if(spinner) spinner.outerHTML='<div class="nantia-loading-refresh">Refresh</div>';
    }
  }
  function finish(){
    if(finished)return; finished=true; clearTimeout(failTimer);
    delete document.documentElement.dataset.contentLoadError;
    document.documentElement.dataset.contentPending='false';
    const screen=document.getElementById('nantia-loading-screen');
    if(screen) screen.classList.add('nantia-loading-hide');
    setTimeout(()=>{ if(screen) screen.remove(); delete document.documentElement.dataset.contentOverlay; },220);
    document.dispatchEvent(new CustomEvent('nantia:content-loaded'));
  }
  document.addEventListener('DOMContentLoaded',loadSiteContent);
})();

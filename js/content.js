/* V16.65 — editable provider-specific public content */
(function(){
  document.documentElement.dataset.contentPending='true';
  async function loadSiteContent(){
    const cfg=window.NANTIA_SUPABASE||{};
    if(!window.supabase || !cfg.url || !cfg.anonKey){finish();return;}
    try{
      const client=window.supabase.createClient(cfg.url,cfg.anonKey);
      const [{data:base,error:baseError},{data:providerCfg,error:providerError}]=await Promise.all([
        client.from('site_content').select('key,value'),
        client.rpc('get_public_payment_config')
      ]);
      if(baseError || !base){finish();return;}
      const map={}; base.forEach(row=>{map[row.key]=row.value??''});
      const provider=String(providerCfg?.[0]?.active_provider||'manual').toLowerCase();
      const {data:overrides,error:overrideError}=await client.from('provider_content').select('key,value').eq('provider',provider);
      if(!overrideError && overrides){
        overrides.forEach(row=>{map[row.key]=row.value??''});
      }
      apply(map);
      document.documentElement.dataset.contentLoaded='true';
      finish();
    }catch(_){finish();}
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
  function finish(){
    document.documentElement.dataset.contentPending='false';
    document.dispatchEvent(new CustomEvent('nantia:content-loaded'));
  }
  document.addEventListener('DOMContentLoaded',loadSiteContent);
})();

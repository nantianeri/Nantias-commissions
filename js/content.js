/* V8 Site Content — loads editable public copy from Supabase. Falls back to HTML defaults. */
(function(){
  document.documentElement.dataset.contentPending='true';
  async function loadSiteContent(){
    const cfg=window.NANTIA_SUPABASE||{};
    if(!window.supabase || !cfg.url || !cfg.anonKey){document.documentElement.dataset.contentPending='false';document.dispatchEvent(new CustomEvent('nantia:content-loaded'));return;}
    try{
      const client=window.supabase.createClient(cfg.url,cfg.anonKey);
      const {data,error}=await client.from('site_content').select('key,value');
      if(error || !data){document.documentElement.dataset.contentPending='false';document.dispatchEvent(new CustomEvent('nantia:content-loaded'));return;}
      const map={}; data.forEach(row=>{map[row.key]=row.value??''});
      document.querySelectorAll('[data-content-href-key]').forEach(el=>{
        const hrefKey=el.dataset.contentHrefKey;
        if(hrefKey && map[hrefKey]!==undefined && (el.tagName==='A' || el.tagName==='AREA')) {
          const href=String(map[hrefKey]).trim();
          el.setAttribute('href',href || '#');
          if(href && /^https?:\/\//i.test(href)) {
            el.setAttribute('target','_blank');
            el.setAttribute('rel','noopener noreferrer');
          }
        }
      });
      document.querySelectorAll('[data-content-key]').forEach(el=>{
        const key=el.dataset.contentKey;
        if(!(key in map)) return;
        const attr=el.dataset.contentAttr;
        if(attr==='href') el.setAttribute('href',map[key]);
        else if(attr==='content') el.setAttribute('content',map[key]);
        else if(attr==='placeholder') el.setAttribute('placeholder',map[key]);
        else if(attr==='aria-label') el.setAttribute('aria-label',map[key]);
        else el.textContent=map[key];
      });
      document.documentElement.dataset.contentLoaded='true';
      document.documentElement.dataset.contentPending='false';
      document.dispatchEvent(new CustomEvent('nantia:content-loaded'));
    }catch(_){/* Keep built-in fallback copy. */
      document.documentElement.dataset.contentPending='false';
    }
  }
  document.addEventListener('DOMContentLoaded',loadSiteContent);
})();

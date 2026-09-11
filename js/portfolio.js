/* V9 Portfolio — public portfolio + homepage featured artwork. */
(function(){
  let client = null;

  async function getClient(){
    if(client) return client;
    const cfg=window.NANTIA_SUPABASE||{};
    if(!window.supabase || !cfg.url || !cfg.anonKey) return null;
    client=window.supabase.createClient(cfg.url,cfg.anonKey);
    return client;
  }

  function escapeHtml(value){
    return String(value??'').replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  }

  function portfolioUrl(item){
    const raw=String(item?.image_url||'').trim();
    return raw.replace(/^http:\/\//i,'https://');
  }

  function renderPortfolio(items){
    const grid=document.querySelector('[data-portfolio-grid]');
    if(!grid)return;
    if(!items.length){
      grid.innerHTML='<div class="portfolio-empty card"><strong>No artwork has been added yet.</strong><span class="muted">Portfolio artwork can be managed from the admin dashboard.</span></div>';
      return;
    }
    grid.innerHTML=items.map((item,i)=>{
      const url=portfolioUrl(item);
      const alt=item.alt_text||item.title||'Portfolio artwork';
      const meta=[item.title,item.category].filter(Boolean).map(escapeHtml).join(' · ');
      return `<article class="portfolio-piece">
        <a class="portfolio-artwork-link" href="${escapeHtml(url)}" target="_blank" rel="noopener" aria-label="Open artwork ${i+1} in a new tab">
          <img src="${escapeHtml(url)}" alt="${escapeHtml(alt)}" loading="${i===0?'eager':'lazy'}">
        </a>
        ${meta?`<div class="portfolio-piece-meta">${meta}</div>`:''}
      </article>`;
    }).join('');
  }

  function revealFeatured(carousel){
    carousel?.classList.remove('is-loading');
  }

  function renderFeatured(items){
    const carousel=document.querySelector('[data-featured-carousel]');
    if(!carousel)return;
    const usable=items.slice(0,3);
    if(!usable.length){
      carousel.innerHTML='<div class="featured-empty"><strong>No featured artwork yet.</strong><small>Add up to 3 featured pieces from the admin dashboard.</small></div>';
      revealFeatured(carousel);
      return;
    }
    carousel.innerHTML=`<div class="featured-track">${usable.map((item,i)=>`<a aria-label="View featured artwork ${i+1}" class="featured-slide ${i===0?'is-active':''}" href="portfolio.html">
      <img alt="${escapeHtml(item.alt_text||item.title||'Featured artwork')}" src="${escapeHtml(portfolioUrl(item))}" loading="${i===0?'eager':'lazy'}">
    </a>`).join('')}</div>
    <button aria-label="Previous featured artwork" class="featured-arrow featured-prev" type="button">‹</button>
    <button aria-label="Next featured artwork" class="featured-arrow featured-next" type="button">›</button>
    <div aria-label="Featured artwork navigation" class="featured-dots">${usable.map((_,i)=>`<button aria-label="Show featured artwork ${i+1}" class="featured-dot ${i===0?'is-active':''}" type="button"></button>`).join('')}</div>`;
    initFeaturedCarousel();
    const firstImage=carousel.querySelector('.featured-slide.is-active img');
    if(!firstImage){ revealFeatured(carousel); return; }
    if(firstImage.complete && firstImage.naturalWidth>0){ revealFeatured(carousel); return; }
    let revealed=false;
    const done=()=>{if(revealed)return;revealed=true;revealFeatured(carousel);};
    firstImage.addEventListener('load',done,{once:true});
    firstImage.addEventListener('error',done,{once:true});
    setTimeout(done,5000);
  }

  function initFeaturedCarousel(){
    const carousel=document.querySelector('[data-featured-carousel]');
    if(!carousel || carousel.dataset.carouselReady==='true')return;
    carousel.dataset.carouselReady='true';
    const track=carousel.querySelector('.featured-track');
    const slides=[...carousel.querySelectorAll('.featured-slide')];
    const dots=[...carousel.querySelectorAll('.featured-dot')];
    const prev=carousel.querySelector('.featured-prev');
    const next=carousel.querySelector('.featured-next');
    if(slides.length<2)return;
    let index=0,timer=null;
    const restart=()=>{clearInterval(timer);timer=setInterval(()=>show(index+1),5000)};
    const show=(nextIndex,manual=false)=>{
      index=(nextIndex+slides.length)%slides.length;
      track.style.transform=`translateX(-${index*100}%)`;
      slides.forEach((slide,i)=>slide.classList.toggle('is-active',i===index));
      dots.forEach((dot,i)=>{dot.classList.toggle('is-active',i===index);dot.setAttribute('aria-current',i===index?'true':'false')});
      if(manual)restart();
    };
    prev?.addEventListener('click',()=>show(index-1,true));
    next?.addEventListener('click',()=>show(index+1,true));
    dots.forEach((dot,i)=>dot.addEventListener('click',()=>show(i,true)));
    let startX=0,startY=0,suppressClick=false;
    carousel.addEventListener('pointerdown',e=>{
      if(e.pointerType==='mouse' && e.button!==0)return;
      startX=e.clientX;startY=e.clientY;suppressClick=false;
      try{carousel.setPointerCapture(e.pointerId)}catch(_){ }
      carousel.classList.add('is-dragging');clearInterval(timer);
    });
    carousel.addEventListener('pointermove',e=>{
      if(!carousel.classList.contains('is-dragging'))return;
      const dx=e.clientX-startX,dy=e.clientY-startY;
      if(Math.abs(dx)>10 && Math.abs(dx)>Math.abs(dy)){e.preventDefault();}
    },{passive:false});
    const end=e=>{
      if(!carousel.classList.contains('is-dragging'))return;
      const dx=e.clientX-startX,dy=e.clientY-startY;
      carousel.classList.remove('is-dragging');
      if(Math.abs(dx)>=45 && Math.abs(dx)>Math.abs(dy)*1.15){
        suppressClick=true;show(index+(dx<0?1:-1),true);setTimeout(()=>suppressClick=false,80);
      }else restart();
    };
    carousel.addEventListener('pointerup',end);carousel.addEventListener('pointercancel',()=>{carousel.classList.remove('is-dragging');restart()});
    carousel.addEventListener('click',e=>{if(suppressClick){e.preventDefault();e.stopPropagation();suppressClick=false}},true);
    carousel.addEventListener('mouseenter',()=>clearInterval(timer));carousel.addEventListener('mouseleave',restart);
    carousel.addEventListener('focusin',()=>clearInterval(timer));carousel.addEventListener('focusout',e=>{if(!carousel.contains(e.relatedTarget))restart()});
    show(0);restart();
  }

  async function load(){
    const c=await getClient();
    if(!c)return;
    const [{data:all,error:allError},{data:featured,error:featuredError}]=await Promise.all([
      c.from('portfolio_items').select('*').eq('active',true).order('sort_order').order('created_at'),
      c.from('portfolio_items').select('*').eq('active',true).eq('featured',true).order('sort_order').order('created_at')
    ]);
    if(allError || featuredError){
      const carousel=document.querySelector('[data-featured-carousel]');
      if(carousel){
        carousel.innerHTML='<div class="featured-empty"><strong>Featured artwork is unavailable right now.</strong><small>Please try again in a moment.</small></div>';
        revealFeatured(carousel);
      }
      return;
    }
    if(document.querySelector('[data-portfolio-grid]'))renderPortfolio(all||[]);
    if(document.querySelector('[data-featured-carousel]'))renderFeatured(featured||[]);
  }

  document.addEventListener('DOMContentLoaded',load);
})();

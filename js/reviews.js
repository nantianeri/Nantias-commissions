(function(){
const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
function stars(v){const n=Number(v||0);let out='';for(let i=1;i<=5;i++){const fill=Math.max(0,Math.min(1,n-(i-1)))*100;out+=`<span class="review-star-public" style="--review-fill:${fill}%">★</span>`;}return out;}
function cleanUsername(v){return String(v||'').trim().replace(/^@+/,'').replace(/[^A-Za-z0-9._-]/g,'');}
async function loadReviews(){
 const list=document.getElementById('publicReviewsList'); if(!list)return;
 const cfg=window.NANTIA_SUPABASE||{}; if(!window.supabase||!cfg.url||!cfg.anonKey){list.innerHTML='';return;}
 try{
  const client=window.supabase.createClient(cfg.url,cfg.anonKey);
  const {data,error}=await client.from('published_commission_reviews').select('id,rating,review_text,instagram_username,created_at').order('created_at',{ascending:false});
  if(error||!Array.isArray(data)||!data.length){list.innerHTML='';const s=document.getElementById('reviewsSummary');if(s)s.textContent='A few words from clients I have worked with.';return;}
  const avg=data.reduce((a,r)=>a+Number(r.rating||0),0)/data.length;
  const summary=document.getElementById('reviewsSummary');
  if(summary)summary.textContent=`${avg.toFixed(1)} / 5 from ${data.length} client review${data.length===1?'':'s'}`;
  list.innerHTML=data.map(r=>{const u=cleanUsername(r.instagram_username);const href=u?`https://www.instagram.com/${encodeURIComponent(u)}/`:'';return `<article class="review-card"><div class="review-stars-display" aria-label="${esc(r.rating)} out of 5 stars">${stars(r.rating)}</div>${r.review_text?`<p class="review-quote">“${esc(r.review_text)}”</p>`:''}<div class="review-author">${href?`<a class="review-instagram" href="${esc(href)}" target="_blank" rel="noopener noreferrer">—${esc(u||'client')}</a>`:`—${esc(u||'client')}`}</div></article>`}).join('');
 }catch(_){list.innerHTML='';}
}
document.addEventListener('DOMContentLoaded',loadReviews);
})();
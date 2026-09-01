const PRICES={bust:18,half:30,full:45};
const COMMERCIAL_RATE=1.0;
const URGENT_FEE=15;
function money(n){return "$"+Number(n).toFixed(2)}
function getParams(){const p=new URLSearchParams(location.search);return{type:p.get("type"),format:p.get("format")}}
document.addEventListener("DOMContentLoaded",()=>{
 const menu=document.querySelector(".menu"),nav=document.querySelector(".navlinks"); if(menu)menu.onclick=()=>nav.classList.toggle("open");
 const COMMISSIONS_OPEN=true;
 document.querySelectorAll("[data-commission-open]").forEach(el=>{el.querySelectorAll(".open-state").forEach(x=>x.hidden=!COMMISSIONS_OPEN);el.querySelectorAll(".closed-state").forEach(x=>x.hidden=COMMISSIONS_OPEN)});
 document.querySelectorAll("[data-request-link]").forEach(a=>a.addEventListener("click",e=>{if(!COMMISSIONS_OPEN){e.preventDefault();location.href="closed.html"}}));
 document.querySelectorAll("[data-format]").forEach(b=>b.addEventListener("click",()=>location.href=COMMISSIONS_OPEN?`request.html?type=character&format=${b.dataset.format}`:"closed.html"));
 const form=document.querySelector("#commissionForm");if(!form)return;
 const q=getParams(),type=document.querySelector("#commissionType"),fmt=document.querySelector("#format");if(q.type==="character")type.value="Character Illustration";if(q.type==="custom")type.value="Custom Illustration";if(q.format)fmt.value=q.format;
 const chars=document.querySelector("#characters"),commercial=document.querySelector("#commercial"),usage=document.querySelector("#usage"),custom=document.querySelector("#customComplexity"),box=document.querySelector("#customBox"),bg=document.querySelector("#background"),urgent=document.querySelector("#urgent"),urgentBox=document.querySelector("#urgentBox"),deadline=document.querySelector("#deadline");
 function update(){const base=PRICES[fmt.value]||0,n=Math.max(1,+chars.value||1),extras=base*.7*(n-1);let comp=0;if(type.value==="Custom Illustration")comp={simple:0,moderate:15,detailed:30,"highly-detailed":50}[custom?.value||"simple"]||0;const urgentFee=urgent?.checked?URGENT_FEE:0;const subtotal=base+extras+comp,comm=commercial?.checked?subtotal*COMMERCIAL_RATE:0;
 document.querySelector("#basePrice").textContent=money(base);document.querySelector("#extraPrice").textContent=money(extras+comp);document.querySelector("#usePrice").textContent=money(comm);
 const urgentRow=document.querySelector("#urgentPrice");if(urgentRow)urgentRow.textContent=money(urgentFee);
 document.querySelector("#estimatedTotal").textContent=money(subtotal+comm+urgentFee);
 if(document.querySelector("#estimateNote"))document.querySelector("#estimateNote").textContent=type.value==="Custom Illustration"?"Estimate only — I will review the scene and set the final price.":"Expected price based on format, character count and usage.";
 if(box)box.hidden=type.value!=="Custom Illustration";
 if(bg)bg.innerHTML=type.value==="Character Illustration"?'<option>Transparent / no background</option><option>Simple background</option>':'<option>Transparent / no background</option><option>Simple background</option><option>Detailed environment</option><option>Highly detailed scene</option>';
 }
 [chars,commercial,usage,custom,fmt,type,urgent].filter(Boolean).forEach(x=>x.addEventListener("change",update));
 if(usage) usage.addEventListener("change",()=>{if(commercial) commercial.checked=usage.value==="commercial";update()});
 if(commercial) commercial.addEventListener("change",()=>{if(usage) usage.value=commercial.checked?"commercial":"personal";update()});
 if(urgent) urgent.addEventListener("change",()=>{ if(urgentBox) urgentBox.hidden=!urgent.checked; if(deadline) deadline.required=urgent.checked; update(); });
 update();
 form.addEventListener("submit",e=>{e.preventDefault();if(!COMMISSIONS_OPEN){location.href="closed.html";return}const id="#"+(1042+Math.floor(Math.random()*9000));form.hidden=true;document.querySelector("#confirmation").hidden=false;document.querySelector(".request-id").textContent=id});
});

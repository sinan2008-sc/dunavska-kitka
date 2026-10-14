/* Управление на участията в администраторския панел на Дунавска китка. */
(()=>{"use strict";
const base="https://dmrwpxkkphmdmymfkzwl.supabase.co";
const apiKey="sb_publishable_1u-dN80rPQe5F1L2NclyRQ_qehD92ty";
const sessionKey="dunavska-kitka-admin-session";
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let items=[],active=false,root=null;
function admin(){return location.hash.startsWith("#/admin")}
async function token(){
 let s;try{s=JSON.parse(sessionStorage.getItem(sessionKey)||"null")}catch{}
 if(!s)return null;
 if(s.expires_at>Date.now()/1000+45)return s.access_token;
 if(!s.refresh_token)return null;
 const r=await fetch(base+"/auth/v1/token?grant_type=refresh_token",{method:"POST",headers:{apikey:apiKey,"Content-Type":"application/json"},body:JSON.stringify({refresh_token:s.refresh_token})});
 if(!r.ok)return null;
 const updated=await r.json();sessionStorage.setItem(sessionKey,JSON.stringify({access_token:updated.access_token,refresh_token:updated.refresh_token,expires_at:Math.floor(Date.now()/1000)+(updated.expires_in||3600)}));return updated.access_token;
}
async function request(path,opts={},protectedAction=false){
 const jwt=await token();
 if(protectedAction&&!jwt)throw Error("Моля, влезте отново като администратор.");
 const r=await fetch(base+path,{...opts,headers:{apikey:apiKey,...(jwt?{Authorization:"Bearer "+jwt}:{}),...opts.headers}});
 if(!r.ok){const error=await r.json().catch(()=>({}));throw Error(error.message||error.error||"Грешка ("+r.status+")");}
 if(r.status===204||r.headers.get("content-length")==="0")return null;
 const text=await r.text();return text?JSON.parse(text):null;
}
async function checkAdmin(){return await request("/rest/v1/rpc/is_club_admin",{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"},true)===true;}
function message(text,isError=false){const p=document.querySelector("#dk-performance-message");if(p){p.textContent=text;p.style.color=isError?"#a52d42":"#26714a";}}
function clear(){const form=document.querySelector("#dk-performance-form");if(form){form.reset();form.elements.namedItem("id").value="";form.querySelector("[type=submit]").textContent="Добави участие";}}
function redraw(){
 const list=document.querySelector("#dk-performance-admin-list");if(!list)return;
 list.innerHTML=items.length?items.map(item=>'<article class="dk-admin-item"><div><b>'+esc(item.data.title)+'</b><p>'+esc(item.data.date)+(item.data.time?" · "+esc(item.data.time):"")+(item.data.place?" · "+esc(item.data.place):"")+'</p></div><div class="dk-admin-actions"><button type="button" data-edit="'+esc(item.id)+'">Редактирай</button><button type="button" data-remove="'+esc(item.id)+'">Изтрий</button></div></article>').join(""):'<p>Все още няма добавени участия.</p>';
}
async function load(){
 try{if(!await checkAdmin())throw Error("Нямате администраторски права.");
 const data=await request("/rest/v1/site_records?select=id,data&kind=eq.performance&order=created.desc",{},true);
 items=Array.isArray(data)?data:[];redraw();message("");
 }catch(e){message(e.message,true);}
}
function edit(id){
 const record=items.find(x=>x.id===id);if(!record)return;
 const form=document.querySelector("#dk-performance-form");if(!form)return;
 for(const key of ["title","date","time","place","description"]){form.elements.namedItem(key).value=record.data[key]||"";}
 form.elements.namedItem("id").value=id;form.querySelector("[type=submit]").textContent="Запази промените";form.scrollIntoView({behavior:"smooth",block:"center"});
}
async function remove(id){
 if(!confirm("Да изтрием ли това участие?"))return;
 try{if(!await checkAdmin())throw Error("Нямате администраторски права.");
 await request("/rest/v1/site_records?id=eq."+encodeURIComponent(id)+"&kind=eq.performance",{method:"DELETE"},true);
 await load();window.dispatchEvent(new Event("dk-performances-updated"));message("Участието е изтрито.");
 }catch(e){message(e.message,true);}
}
async function submit(event){
 event.preventDefault();const form=event.currentTarget;
 const data=Object.fromEntries(new FormData(form));const id=data.id||crypto.randomUUID();
 const entry={title:String(data.title||"").trim(),date:data.date,time:data.time||"",place:String(data.place||"").trim(),description:String(data.description||"").trim()};
 if(!entry.title||!/^\d{4}-\d{2}-\d{2}$/.test(entry.date)){message("Въведи заглавие и валидна дата.",true);return;}
 const button=form.querySelector("[type=submit]");button.disabled=true;
 try{if(!await checkAdmin())throw Error("Нямате администраторски права.");
 await request("/rest/v1/site_records?on_conflict=id",{method:"POST",headers:{"Content-Type":"application/json",Prefer:"resolution=merge-duplicates,return=minimal"},body:JSON.stringify({id,kind:"performance",data:entry})},true);
 clear();await load();window.dispatchEvent(new Event("dk-performances-updated"));message("Участието е запазено.");
 }catch(e){message(e.message,true);}finally{button.disabled=false;}
}
function show(){
 const panel=document.querySelector("#dk-performance-admin-panel");if(!panel)return;
 active=true;const tabs=panel.parentElement;tabs.classList.add("dk-performance-mode");
 document.querySelector("#dk-performance-tab")?.setAttribute("aria-selected","true");panel.hidden=false;load();
}
function hide(){active=false;const panel=document.querySelector("#dk-performance-admin-panel");if(panel){panel.parentElement.classList.remove("dk-performance-mode");panel.hidden=true;}document.querySelector("#dk-performance-tab")?.setAttribute("aria-selected","false");}
function mount(){
 if(!admin()){hide();return;}
 const tabs=document.querySelector(".admin-tabs");if(!tabs||tabs.querySelector("#dk-performance-tab"))return;
 const wrapper=tabs.parentElement;if(!wrapper)return;
 const button=document.createElement("button");button.type="button";button.id="dk-performance-tab";button.className="dk-admin-tab-button";button.textContent="Участия";button.setAttribute("aria-selected","false");button.addEventListener("click",show);
 tabs.append(button);
 const panel=document.createElement("section");panel.id="dk-performance-admin-panel";panel.className="panel dk-performance-admin-panel";panel.hidden=true;
 panel.innerHTML='<h2>Управление на участията</h2><p>Добавяй и редактирай участията. Предстоящите се показват автоматично на началната страница.</p><form id="dk-performance-form" class="dk-performance-form"><input type="hidden" name="id"><label>Заглавие <input name="title" required maxlength="150" placeholder="Име на събитието"></label><label>Дата <input name="date" type="date" required></label><label>Час <input name="time" type="time"></label><label>Място <input name="place" maxlength="160" placeholder="Град и сцена"></label><label class="dk-admin-wide">Описание <textarea name="description" maxlength="1000" rows="3" placeholder="Незадължително"></textarea></label><div class="dk-admin-wide dk-admin-actions"><button class="dk-admin-save" type="submit">Добави участие</button><button type="button" id="dk-performance-cancel">Изчисти</button></div></form><p id="dk-performance-message" role="status"></p><h3>Всички участия</h3><div id="dk-performance-admin-list"></div>';
 wrapper.insertBefore(panel,tabs.nextSibling);
 panel.querySelector("form").addEventListener("submit",submit);
 panel.querySelector("#dk-performance-cancel").addEventListener("click",clear);
 panel.querySelector("#dk-performance-admin-list").addEventListener("click",e=>{const editButton=e.target.closest("[data-edit]"),deleteButton=e.target.closest("[data-remove]");if(editButton)edit(editButton.dataset.edit);if(deleteButton)remove(deleteButton.dataset.remove);});
 tabs.addEventListener("click",e=>{if(!e.target.closest("#dk-performance-tab"))hide();});
}
let queued=false;new MutationObserver(()=>{if(queued)return;queued=true;queueMicrotask(()=>{queued=false;mount();});}).observe(document.documentElement,{subtree:true,childList:true});
addEventListener("hashchange",()=>{hide();mount()});document.addEventListener("DOMContentLoaded",mount);mount();
})();
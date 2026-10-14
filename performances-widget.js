/* Дунавска китка — участие / информационно табло. Не променя основното приложение. */
(() => {
  "use strict";
  const file = "./performances.json";
  let performances = [];
  const dayMs = 86400000;
  const isHome = () => location.hash === "" || location.hash === "#" || location.hash === "#/";
  const safe = value => String(value ?? "").replace(/[&<>"']/g, x => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[x]));
  const parseDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(value+"T00:00:00") : null;
  const daysUntil = value => {
    const date = parseDate(value);
    if (!date || Number.isNaN(date.getTime())) return null;
    const now = new Date();
    const today = new Date(now.getFullYear(),now.getMonth(),now.getDate());
    return Math.round((date-today)/dayMs);
  };
  const dateBg = value => {
    const date = parseDate(value);
    return date ? new Intl.DateTimeFormat("bg-BG",{day:"numeric",month:"long",year:"numeric"}).format(date) : "";
  };
  const renderEvents = () => {
    const list = document.querySelector("#dk-performances-list");
    if (!list) return;
    const upcoming = performances.filter(x=>daysUntil(x.date)!==null && daysUntil(x.date)>=0).sort((a,b)=>a.date.localeCompare(b.date));
    if (!upcoming.length) {
      list.innerHTML = '<p class="dk-no-events">Очаквайте информация за предстоящите участия.</p>';
      return;
    }
    list.innerHTML = upcoming.map(item => {
      const days = daysUntil(item.date);
      const when = days===0 ? "Днес" : days===1 ? "Утре" : days+" дни";
      return '<article class="dk-event"><div class="dk-event-date">'+safe(dateBg(item.date))+'</div><div class="dk-event-main"><h3>'+safe(item.title)+'</h3>'+(item.place?'<p>'+safe(item.place)+'</p>':"")+'</div><div class="dk-countdown" aria-label="Остават '+when+'"><strong>'+safe(when)+'</strong><span>до участието</span></div></article>';
    }).join("");
  };
  let scheduled = false;
  const mount = () => {
    scheduled = false;
    const current = document.querySelector("#dk-performances-layout");
    const separator = document.querySelector(".embroidery-inspired");
    const bottom = document.querySelector(".home-bottom");
    const board = bottom?.querySelector(".green-card");
    if (!isHome() || !separator || !bottom || !board) {
      if(current) current.remove();
      return;
    }
    if (!current) {
      const section = document.createElement("section");
      section.id="dk-performances-layout";
      section.className="dk-performances-layout";
      section.setAttribute("aria-label","Предстоящи участия и информационно табло");
      section.innerHTML='<div class="dk-performances-panel"><div class="dk-performances-heading"><span class="dk-mini-label">НА СЦЕНАТА</span><h2>Предстоящи участия</h2><p>Броим дните до следващата ни среща с публиката.</p></div><div id="dk-performances-list" aria-live="off"></div></div><div class="dk-board-slot"></div>';
      separator.insertAdjacentElement("afterend",section);
      renderEvents();
    }
    const slot=document.querySelector("#dk-performances-layout .dk-board-slot");
    if(slot && (slot.dataset.snapshot!==board.innerHTML)) {
      slot.dataset.snapshot=board.innerHTML;
      const clone=board.cloneNode(true);
      clone.removeAttribute("aria-labelledby");
      const heading=clone.querySelector("#information-board-heading");
      if(heading) heading.id="dk-information-board-heading";
      clone.setAttribute("aria-labelledby","dk-information-board-heading");
      slot.replaceChildren(clone);
    }
  };
  const requestMount = () => {
    if(scheduled)return;
    scheduled=true;
    queueMicrotask(mount);
  };
  document.addEventListener("DOMContentLoaded",requestMount);
  window.addEventListener("hashchange",requestMount);
  const observer = new MutationObserver(changes => {
    if(changes.some(c=>!(c.target.nodeType===1 && c.target.closest("#dk-performances-layout")))) requestMount();
  });
  observer.observe(document.documentElement,{childList:true,subtree:true,characterData:true});
  fetch(file,{cache:"no-store"}).then(r=>r.ok?r.json():[]).then(data=>{
    performances=Array.isArray(data)?data:[];
    renderEvents();
  }).catch(()=>{performances=[];renderEvents();});
  setInterval(renderEvents,3600000);
  requestMount();
})();
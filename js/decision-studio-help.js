/* Decision Studio v4.2 · decision-studio-help.js */
(function(){
 const $=id=>document.getElementById(id);
 const drawer=$('helpDrawer'),backdrop=$('helpBackdrop'),trigger=$('helpButton');
 let previousFocus=null;
 function selectTab(tab){
  document.querySelectorAll('.help-tab').forEach(b=>{const a=b.dataset.tab===tab;b.setAttribute('aria-selected',String(a));b.tabIndex=a?0:-1});
  document.querySelectorAll('.help-page').forEach(p=>p.hidden=p.id!=='help-'+tab);
 }
 function open(tab='start'){
  previousFocus=document.activeElement;selectTab(tab);
  drawer.classList.remove('hidden');backdrop.classList.remove('hidden');document.body.classList.add('help-active');
  trigger.setAttribute('aria-expanded','true');$('helpClose').focus();
 }
 function close(){drawer.classList.add('hidden');backdrop.classList.add('hidden');document.body.classList.remove('help-active');trigger.setAttribute('aria-expanded','false');previousFocus?.focus?.()}
 trigger.addEventListener('click',()=>open());$('helpClose').addEventListener('click',close);backdrop.addEventListener('click',close);
 document.querySelectorAll('.help-tab').forEach(t=>t.addEventListener('click',()=>selectTab(t.dataset.tab)));
 document.querySelectorAll('[data-help-open]').forEach(b=>b.addEventListener('click',()=>{const v=b.dataset.helpOpen;close();const t={settings:'settingsButton',editor:'editorButton',export:'exportButton',ai:'aiButton'}[v];$(t)?.click()}));
 const aiTabs=[...document.querySelectorAll('.ai-tab')];
 function selectAI(tab){aiTabs.forEach(b=>{const active=b.dataset.aiTab===tab;b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1});document.querySelectorAll('.ai-tab-page').forEach(p=>p.hidden=p.dataset.aiPage!==tab)}
 aiTabs.forEach(b=>b.addEventListener('click',()=>selectAI(b.dataset.aiTab)));
 $('aiButton').addEventListener('click',()=>selectAI('workflow'));
 document.querySelectorAll('[data-copy]').forEach(b=>b.addEventListener('click',async()=>{const t=$(b.dataset.copy).textContent;try{await navigator.clipboard.writeText(t);b.textContent='Copiado ✓';setTimeout(()=>b.textContent='Copiar solicitud',1800)}catch(e){const el=document.createElement('textarea');el.value=t;document.body.appendChild(el);el.select();document.execCommand('copy');el.remove();b.textContent='Copiado ✓';setTimeout(()=>b.textContent='Copiar solicitud',1800)}}));
 document.addEventListener('keydown',e=>{if(drawer.classList.contains('hidden'))return;if(e.key==='Escape'){e.preventDefault();close()}if(e.key==='Tab'){const nodes=[...drawer.querySelectorAll('button:not([disabled]),a[href]')].filter(el=>el.offsetParent!==null);if(nodes.length){const first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}}});
 // old standalone guide links may be bookmarked; opening ?help=ai works without a second guide document.
 const section=new URLSearchParams(location.search).get('help');if(section==='ai'){$('aiButton').click()}else if(['start','meeting','faq'].includes(section))open(section);
})();

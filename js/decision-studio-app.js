/* Decision Studio v4.3 · decision-studio-app.js */
/* Aplicación cliente sin backend. Cuestionario editable, independiente del cliente. */
(function(){
'use strict';
let DATA=window.DecisionData, Export=window.DecisionExport; DATA.questions.forEach((q,i)=>q.uid=q.uid||'q-'+String(q.id||i+1).padStart(4,'0'));
if(!DATA || !Export){document.body.textContent='No se pudo cargar la aplicación. Compruebe que los archivos js están en sus carpetas.';return}
const KEY='decision-studio-v4'; const LEGACY_KEY='decision-studio-v3';
const state={meta:{title:'Validación de decisiones de arquitectura',client:'',project:'',brand:'Decision Studio',subtitle:'CUESTIONARIOS · ARQUITECTURA',date:new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,10),participants:''},answers:{},persistent:false,clock:{duration:30,remaining:1800,running:false,endAt:0}};
let current=1,mode='focus',saveAvailable=true,toastHandle=0;
const $=id=>document.getElementById(id);
const statuses=Export.statusLabels;
const text=s=>String(s==null?'':s);
const safe=s=>text(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const pad=n=>String(n).padStart(2,'0');
function storage(){try{return state.persistent?localStorage:sessionStorage}catch(e){return null}}
function persist(){try{const target=storage();if(!target)throw Error('storage unavailable');target.setItem(KEY,JSON.stringify({schema:1,meta:state.meta,answers:state.answers,persistent:state.persistent,clock:state.clock,data:DATA}));$('saveState').classList.remove('error');$('saveState').innerHTML='<span class="save-led"></span> Guardado automático';saveAvailable=true;return true}catch(e){$('saveState').classList.add('error');$('saveState').innerHTML='<span class="save-led"></span> Usa Respaldo JSON';saveAvailable=false;return false}}
function initState(){let obj=null;try{const local=localStorage.getItem(KEY),session=sessionStorage.getItem(KEY);const prior=localStorage.getItem(LEGACY_KEY)||sessionStorage.getItem(LEGACY_KEY);obj=JSON.parse(local||session||prior||'null')}catch(e){}if(obj&&obj.schema===1&&obj.answers&&typeof obj.answers==='object'){
state.meta={...state.meta,...(obj.meta||{})};state.answers=obj.answers;state.persistent=!!obj.persistent;state.clock={...state.clock,...(obj.clock||{})};if(obj.data)DATA=validateData(obj.data);}
if(state.clock.running&&Date.now()>=state.clock.endAt){state.clock.running=false;state.clock.remaining=0}
}
function answered(qid){return state.answers[String(qid)]||{}}
function getRec(qid){const k=String(qid);if(!state.answers[k])state.answers[k]={status:'sin_revisar',option:'',customAnswer:'',owner:'',customOwner:'',commitment:'',notes:''};return state.answers[k]}
function getStats(){let conf=0,pending=0,rev=0,na=0;DATA.questions.forEach(q=>{const s=answered(q.id).status;if(s==='confirmada')conf++;else if(s==='pendiente')pending++;else if(s==='revision')rev++;else if(s==='no_aplica')na++;});return{confirmed:conf,pending,rev,na,untouched:DATA.questions.length-conf-pending-rev-na,treated:conf+pending+rev+na}}
function groupStats(i){const list=DATA.questions.filter(q=>q.group===i);const treated=list.filter(q=>{const x=answered(q.id);return x.status&&x.status!=='sin_revisar'}).length;return{treated,total:list.length}}
function notify(message){const el=$('toast');el.textContent=message;el.classList.add('visible');clearTimeout(toastHandle);toastHandle=setTimeout(()=>el.classList.remove('visible'),2800)}
function renderNav(){const nav=$('groupNav');nav.innerHTML='';DATA.groups.forEach((g,i)=>{const gs=groupStats(i),btn=document.createElement('button');btn.type='button';btn.className='side-link '+(DATA.questions.find(q=>q.id===current)?.group===i&&mode==='focus'?'active':'');btn.innerHTML='<span class="side-n">'+g.number+'</span><span><strong>'+safe(g.short)+'</strong><small>'+safe(g.name)+'</small></span><span class="side-side">'+gs.treated+'/'+gs.total+'</span>';btn.addEventListener('click',()=>{const firstUnvisited=DATA.questions.find(q=>q.group===i && (!answered(q.id).status||answered(q.id).status==='sin_revisar'));const hit=firstUnvisited||DATA.questions.find(q=>q.group===i);if(hit)goto(hit.id)});nav.append(btn)});}
function renderStats(){const k=getStats();$('statTotal').textContent=DATA.questions.length;$('statConfirmed').textContent=k.confirmed;$('statPending').textContent=k.pending+k.rev;$('statUnreviewed').textContent=k.untouched;$('progressNumber').textContent=Math.round(k.treated/Math.max(1,DATA.questions.length)*100)+'%';$('progressFill').style.width=(k.treated/Math.max(1,DATA.questions.length)*100)+'%';$('progressSub').textContent=k.treated+' de '+DATA.questions.length+' decisiones tratadas'}
function feedback(){const a=answered(current),el=$('questionFeedback');const completed=a.status&&a.status!=='sin_revisar';el.textContent=completed?'✓ '+statuses[a.status]+' · guardado automático':'○ Sin decisión registrada';el.className='question-feedback '+(completed?'dirty':'')}
function renderQuestion(){const q=DATA.questions.find(q=>q.id===current),a=answered(current),g=DATA.groups[q.group];$('currentGroup').textContent=g.number+' · '+g.name.toUpperCase();$('questionCount').textContent='PREGUNTA '+pad(current)+' DE '+DATA.questions.length;$('questionPriority').textContent=q.priority==='P0'?'P0 · CRÍTICA':'P1 · IMPORTANTE';$('questionPriority').classList.toggle('p1',q.priority==='P1');$('questionDeadline').textContent=q.due.toUpperCase();$('questionOrigin').textContent=q.origin;$('questionText').textContent=q.question;$('suggestionText').textContent=q.suggestion;$('sourceText').textContent=(q.reference||'')+' · Recomendación orientativa';
const sel=$('answerSelect');sel.innerHTML='<option value="">Selecciona una alternativa…</option>';q.options.forEach(o=>{const opt=document.createElement('option');opt.value=o;opt.textContent=o;sel.append(opt)});const opt=document.createElement('option');opt.value='__other__';opt.textContent='＋ Otra alternativa (especificar)…';sel.append(opt);sel.value=a.option||'';
$('customAnswerWrap').classList.toggle('hidden',a.option!=='__other__');$('customAnswer').value=a.customAnswer||'';$('ownerSelect').value=a.owner||'';$('customOwner').classList.toggle('hidden',a.owner!=='__other__');$('customOwner').value=a.customOwner||'';$('commitmentDate').value=a.commitment||'';$('notes').value=a.notes||'';
document.querySelectorAll('#statusButtons button').forEach(b=>{const active=b.dataset.status===a.status;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active))});$('questionJump').value=current;$('prevQuestion').disabled=current<=1;$('nextQuestion').textContent=current===DATA.questions.length?'Ver matriz →':'Siguiente →';feedback()}
function update(field,value,rerender=false){const a=getRec(current);a[field]=value;a.updatedAt=new Date().toISOString();persist();renderStats();renderNav();if(rerender)renderQuestion();else feedback()}
function answerText(qid){const a=answered(qid);return a.option==='__other__'?a.customAnswer||'':a.option||''}
function markStatus(status){if(status==='confirmada'&&!answerText(current).trim()){notify('Selecciona una alternativa o escribe una respuesta antes de confirmar.');$('answerSelect').focus();return}update('status',status,true);notify(status==='confirmada'?'Decisión confirmada y guardada':'Estado actualizado: '+statuses[status])}
function goto(id){current=Math.min(DATA.questions.length,Math.max(1,Number(id)||1));mode='focus';renderMode();renderQuestion();renderNav();window.scrollTo({top:Math.max(0,$('focusView').getBoundingClientRect().top+window.scrollY-90),behavior:'smooth'});$('sidebar').classList.remove('open');syncSidebar()}
function renderMode(){const f=mode==='focus';$('focusView').classList.toggle('hidden',!f);$('matrixView').classList.toggle('hidden',f);$('focusViewBtn').classList.toggle('active',f);$('matrixViewBtn').classList.toggle('active',!f);$('focusViewBtn').setAttribute('aria-selected',String(f));$('matrixViewBtn').setAttribute('aria-selected',String(!f));if(!f)renderMatrix();renderNav()}
function renderMatrix(){const filterG=$('filterGroup').value,filterS=$('filterStatus').value,term=$('searchInput').value.trim().toLowerCase();const list=DATA.questions.filter(q=>{
 const a=answered(q.id);return(filterG==='all'||String(q.group)===filterG)&&(filterS==='all'||(a.status||'sin_revisar')===filterS)&&(q.question+' '+q.suggestion+' '+DATA.groups[q.group].name+' '+answerText(q.id)).toLowerCase().includes(term)});
 const body=$('matrixBody');body.innerHTML='';list.forEach(q=>{const a=answered(q.id),status=a.status||'sin_revisar',tr=document.createElement('tr');tr.innerHTML='<td>'+pad(q.id)+'</td><td>'+safe(q.question)+'</td><td>'+safe(answerText(q.id)||'—')+'</td><td><span class="status-pill '+safe(status)+'">'+safe(statuses[status])+'</span></td><td>'+safe(q.due)+'</td><td><button type="button">Abrir ↗</button></td>';tr.querySelector('button').addEventListener('click',()=>goto(q.id));body.append(tr)});$('matrixCount').textContent='Mostrando '+list.length+' de '+DATA.questions.length+' validaciones';if(!list.length){body.innerHTML='<tr><td colspan="6" style="padding:30px;text-align:center;color:#8ba1a3">No se encontraron validaciones con esos filtros.</td></tr>'}}
function openModal(){const k=getStats();$('exportStats').innerHTML='<span>✓ '+k.confirmed+' confirmadas</span><span>◷ '+(k.pending+k.rev)+' pendientes</span><span>◇ '+k.untouched+' sin revisar</span>';$('persistentCheck').checked=state.persistent;$('exportModal').classList.remove('hidden')}
function closeModal(){$('exportModal').classList.add('hidden')}
function basename(){return 'Validaciones_'+(state.meta.client||'Cliente').replace(/[^\wáéíóúñ-]+/gi,'_').slice(0,50)+'_'+(state.meta.date||'sin_fecha')}
function makeFile(format){try{const blob=Export[format](state.meta,DATA,state.answers);Export.download(blob,basename()+'.'+(format==='docx'?'docx':'xlsx'));notify('Informe '+(format==='docx'?'Word':'Excel')+' generado correctamente');}catch(e){console.error(e);notify('Error al generar archivo: '+e.message)}}
function backup(){const payload={schema:1,exportedAt:new Date().toISOString(),meta:state.meta,answers:state.answers,persistent:state.persistent,clock:state.clock,data:DATA};Export.download(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),basename()+'_respaldo.json');notify('Respaldo JSON descargado')}
let pendingRestore=null;
function closeRestoreMode(){pendingRestore=null;$('restoreModeModal').classList.add('hidden')}
async function restore(file){
 try{
  if(file.size>5*1024*1024)throw Error('El archivo supera el límite de 5 MB');
  const obj=JSON.parse(await file.text());
  if(!obj||obj.schema!==1||!obj.answers||typeof obj.answers!=='object'||Array.isArray(obj.answers)||!obj.meta||typeof obj.meta!=='object'||!obj.data)throw Error('Se necesita un respaldo completo de Decision Studio');
  const data=validateData(obj.data);
  const allowed=new Set(data.questions.map(q=>String(q.id))),clean={};
  Object.entries(obj.answers).forEach(([k,v])=>{if(allowed.has(k)&&v&&typeof v==='object'&&!Array.isArray(v))clean[k]={status:['sin_revisar','confirmada','pendiente','revision','no_aplica'].includes(v.status)?v.status:'sin_revisar',option:text(v.option).slice(0,600),customAnswer:text(v.customAnswer).slice(0,600),owner:text(v.owner).slice(0,120),customOwner:text(v.customOwner).slice(0,120),commitment:text(v.commitment).slice(0,10),notes:text(v.notes).slice(0,2000),updatedAt:text(v.updatedAt).slice(0,60)}});
  pendingRestore={data,answers:clean,meta:obj.meta,exportedAt:obj.exportedAt||''};
  const preview=$('restorePreview');preview.textContent='';
  const title=document.createElement('strong');title.textContent='Archivo: '+file.name;
  const detail=document.createElement('div');detail.textContent='Cliente: '+text(obj.meta.client||'Sin especificar').slice(0,120)+' · Proyecto: '+text(obj.meta.project||'Sin especificar').slice(0,140);
  const stats=document.createElement('div');stats.textContent=data.questions.length+' preguntas · '+Object.keys(clean).length+' registros de respuesta'+(obj.exportedAt?' · Respaldo: '+new Date(obj.exportedAt).toLocaleString('es-PE'):'');
  preview.append(title,detail,stats);
  document.querySelector('input[name="restoreMode"][value="full"]').checked=true;
  $('restoreModeConfirm').textContent='Continuar proyecto';
  $('restoreModeModal').classList.remove('hidden');
 }catch(e){pendingRestore=null;notify('No se pudo abrir: '+e.message)}finally{$('importJsonInput').value=''}
}
function commitRestore(){
 if(!pendingRestore)return;
 const choice=document.querySelector('input[name="restoreMode"]:checked')?.value||'full';
 const {data,answers,meta}=pendingRestore;
 DATA=data;
 if(choice==='template'){
  state.answers={};
  state.meta={title:'Validación de decisiones de arquitectura',client:'',project:'',brand:'Decision Studio',subtitle:'CUESTIONARIOS · ARQUITECTURA',date:new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,10),participants:'',logo:''};
  state.clock={duration:30,remaining:1800,running:false,endAt:0};
 }else{
  state.answers=answers;
  state.meta={...state.meta,client:text(meta.client).slice(0,120),project:text(meta.project).slice(0,140),brand:text(meta.brand).slice(0,80)||'Decision Studio',subtitle:text(meta.subtitle).slice(0,90)||'CUESTIONARIOS · ARQUITECTURA',title:text(meta.title).slice(0,140),date:text(meta.date).slice(0,10),participants:text(meta.participants).slice(0,350),logo:(typeof meta.logo==='string'&&/^data:image\/(png|jpeg|svg\+xml);base64,/.test(meta.logo)&&meta.logo.length<400000)?meta.logo:''};
  state.clock={duration:30,remaining:1800,running:false,endAt:0};
 }
 current=1;selectedEdit=0;mode='focus';syncMeta();updateAll();$('clockDuration').value=state.clock.duration;$('clockMinutesLabel').textContent=state.clock.duration+' MIN';
 closeRestoreMode();closeModal();notify(choice==='template'?'Nueva plantilla cargada sin datos del cliente anterior':'Proyecto completo restaurado');
}

function syncMeta(){$('meetingTitle').value=state.meta.title;$('meetingDate').value=state.meta.date;$('participants').value=state.meta.participants}
function toggleStorage(checked){const old=state.persistent;state.persistent=checked;try{if(old!==checked){const outdated=old?localStorage:sessionStorage;outdated.removeItem(KEY)}}catch(e){}persist();notify(checked?'Datos guardados para próximas sesiones':'Guardado limitado a esta sesión / pestaña')}
function resetAll(){if(!confirm('Esto eliminará todas las respuestas de esta sesión. ¿Continuar?'))return;state.answers={};state.meta.participants='';state.clock={duration:state.clock.duration||30,remaining:(state.clock.duration||30)*60,running:false,endAt:0};current=1;persist();syncMeta();renderStats();renderNav();renderQuestion();renderClock();closeModal();notify('Respuestas reiniciadas')}
function remaining(){return state.clock.running?Math.max(0,Math.ceil((state.clock.endAt-Date.now())/1000)):state.clock.remaining}
function renderClock(){let seconds=remaining();if(!seconds&&state.clock.running){state.clock.running=false;state.clock.remaining=0;persist();notify('El tiempo de la sesión ha terminado. Puedes seguir validando.')}
 $('clockDisplay').textContent=pad(Math.floor(seconds/60))+':'+pad(seconds%60);$('clockDisplay').classList.toggle('elapsed',seconds===0);$('clockToggle').textContent=state.clock.running?'Ⅱ Pausar':seconds===0?'↻ Reiniciar':'▶ '+(seconds===(state.clock.duration||30)*60?'Iniciar':'Continuar')}
function toggleClock(){const c=state.clock;if(c.running){c.remaining=remaining();c.running=false;c.endAt=0}else{if(!c.remaining)c.remaining=(c.duration||30)*60;c.running=true;c.endAt=Date.now()+c.remaining*1000}persist();renderClock()}

function validateData(obj){if(!obj||!Array.isArray(obj.groups)||!Array.isArray(obj.questions)||!obj.groups.length||!obj.questions.length||obj.questions.length>300)throw Error('Cuestionario inválido (se requieren 1 a 300 preguntas)');const groups=obj.groups.map((g,i)=>({id:i,number:pad(i+1),name:text(g.name||'Bloque '+(i+1)).slice(0,110),short:text(g.short||g.name||'Bloque').slice(0,70)}));const questions=obj.questions.map((q,i)=>{if(!q.question||!String(q.question).trim())throw Error('Pregunta '+(i+1)+' vacía');const group=Number(q.group);if(!Number.isInteger(group)||group<0||group>=groups.length)throw Error('Bloque incorrecto en pregunta '+(i+1));return {id:i+1,uid:(typeof q.uid==='string'&&/^q-[a-z0-9-]{3,80}$/.test(q.uid)?q.uid:'q-'+String(q.id||i+1).padStart(4,'0')),group,question:text(q.question).slice(0,900),suggestion:text(q.suggestion).slice(0,2000),options:(Array.isArray(q.options)?q.options:[]).map(v=>text(v).slice(0,500)).filter(Boolean).slice(0,35),due:text(q.due||'Por definir').slice(0,90),reference:text(q.reference||'').slice(0,200),priority:q.priority==='P1'?'P1':'P0',origin:'REFERENCIA ORIENTATIVA'}});if(new Set(questions.map(q=>q.uid)).size!==questions.length)throw Error('Identificadores UID duplicados');return {groups,questions}}
function updateAll(){current=Math.max(1,Math.min(current,DATA.questions.length));refreshFilters();renderStats();renderQuestion();renderMode();renderNav();renderClock();renderJump();renderBrand();persist()}
function refreshFilters(){const g=$('filterGroup'),old=g.value;g.innerHTML='<option value="all">Todos los bloques</option>';DATA.groups.forEach((x,i)=>{const el=document.createElement('option');el.value=i;el.textContent=x.name;g.append(el)});g.value=[...g.options].some(x=>x.value===old)?old:'all'}
function renderJump(){const el=$('questionJump');el.innerHTML='';DATA.questions.forEach(q=>{const x=document.createElement('option');x.value=q.id;x.textContent=pad(q.id)+' · '+q.question.slice(0,68);el.append(x)});el.value=current}
function syncSidebar(){const hidden=$('sidebar').classList.contains('open')?false:$('appShell').classList.contains('panel-hidden');$('menuToggle').textContent=hidden?'☰':'☰';$('menuToggle').setAttribute('aria-label',hidden?'Mostrar panel':'Ocultar panel')}
function renderBrand(){const m=state.meta;$('appBrand').textContent=m.brand||'Decision Studio';$('appSubtitle').textContent=m.subtitle||'CUESTIONARIOS · ARQUITECTURA';$('breadcrumbApp').textContent=(m.brand||'DECISION STUDIO').toUpperCase();$('heroClient').textContent=m.client?('CLIENTE · '+m.client.toUpperCase()):'VALIDACIONES TÉCNICAS · DECISIONES';const mark=document.querySelector('.brand-mark');mark.innerHTML=m.logo?'<img class="brand-logo" alt="Logo" src="'+m.logo+'">':'D<span>·</span>S';}
function applyDuration(n){n=Math.min(480,Math.max(1,Math.round(Number(n)||30)));state.clock={duration:n,remaining:n*60,running:false,endAt:0};$('clockDuration').value=n;$('clockMinutesLabel').textContent=n+' MIN';persist();renderClock()}
function openSettings(){['brand','subtitle','client','project'].forEach(f=>$(f+'Input').value=state.meta[f]||'');$('logoPreview').classList.toggle('hidden',!state.meta.logo);if(state.meta.logo)$('logoPreview').src=state.meta.logo;$('settingsModal').classList.remove('hidden')}
function closeSettings(){$('settingsModal').classList.add('hidden')}
let selectedEdit=0;
function editorRefresh(){const list=$('editorList');list.innerHTML='';DATA.questions.forEach((q,i)=>{const b=document.createElement('button');b.type='button';b.className=i===selectedEdit?'active':'';b.textContent=pad(i+1)+'  '+q.question;b.onclick=()=>{selectedEdit=i;editorRefresh()};list.append(b)});const q=DATA.questions[selectedEdit];const gs=$('editGroup');gs.innerHTML='';DATA.groups.forEach((g,i)=>{const opt=document.createElement('option');opt.value=i;opt.textContent=g.name;gs.append(opt)});if(!q)return;gs.value=q.group;$('editPriority').value=q.priority;$('editQuestion').value=q.question;$('editOptions').value=q.options.join('\n');$('editSuggestion').value=q.suggestion;$('editDue').value=q.due;$('editReference').value=q.reference}
function openEditor(){selectedEdit=Math.min(selectedEdit,DATA.questions.length-1);editorRefresh();$('editorModal').classList.remove('hidden')}
function closeEditor(){$('editorModal').classList.add('hidden')}
function saveEdited(){const q=DATA.questions[selectedEdit];if(!$('editQuestion').value.trim())return notify('La pregunta no puede estar vacía');q.group=Number($('editGroup').value);q.priority=$('editPriority').value;q.question=$('editQuestion').value.trim();q.options=$('editOptions').value.split('\n').map(s=>s.trim()).filter(Boolean).slice(0,35);q.suggestion=$('editSuggestion').value.trim();q.due=$('editDue').value.trim()||'Por definir';q.reference=$('editReference').value.trim();persist();updateAll();editorRefresh();notify('Pregunta actualizada')}
function addQuestion(){const g=DATA.questions[selectedEdit]?.group||0;DATA.questions.push({id:DATA.questions.length+1,uid:'q-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7),group:g,question:'Nueva pregunta: edita aquí el texto',suggestion:'',options:[],priority:'P1',due:'Por definir',reference:'',origin:'REFERENCIA ORIENTATIVA'});selectedEdit=DATA.questions.length-1;updateAll();editorRefresh()}
function deleteQuestion(){if(DATA.questions.length===1)return notify('Debe quedar al menos una pregunta');if(!confirm('¿Eliminar esta pregunta y su respuesta?'))return;DATA.questions.splice(selectedEdit,1);const oldAnswers=state.answers;state.answers={};DATA.questions.forEach((q,i)=>{if(oldAnswers[String(q.id)])state.answers[String(i+1)]=oldAnswers[String(q.id)];q.id=i+1});selectedEdit=Math.min(selectedEdit,DATA.questions.length-1);updateAll();editorRefresh();notify('Pregunta eliminada; respuestas restantes conservadas')}
function moveQuestion(delta){const i=selectedEdit,j=i+delta;if(j<0||j>=DATA.questions.length)return;[DATA.questions[i],DATA.questions[j]]=[DATA.questions[j],DATA.questions[i]];const oldAnswers=state.answers;state.answers={};DATA.questions.forEach((q,k)=>{if(oldAnswers[String(q.id)])state.answers[String(k+1)]=oldAnswers[String(q.id)];q.id=k+1});selectedEdit=j;updateAll();editorRefresh();notify('Orden actualizado; respuestas conservadas')}
function downloadTemplate(){Export.download(new Blob([JSON.stringify({schema:2,kind:'decision-studio-template',...DATA},null,2)],{type:'application/json'}),'Plantilla_Cuestionario_Arquitectura.json');notify('Plantilla descargada')}
async function loadTemplate(file){try{const raw=JSON.parse(await file.text()),next=validateData(raw);if(!confirm('¿Reemplazar las preguntas actuales? Se reiniciarán sus respuestas. Descarga un respaldo antes de continuar.'))return;DATA=next;state.answers={};current=1;selectedEdit=0;updateAll();editorRefresh();notify('Plantilla importada: '+DATA.questions.length+' preguntas')}catch(e){notify('No se pudo importar: '+e.message)}finally{$('templateFile').value=''}}


// ===== Decision Studio AI: validación transaccional y segura de paquetes =====
let preparedPatch=null;
function aiContext(){
 const payload={schema_version:'4.0',kind:'decision-studio-context',exported_at:new Date().toISOString(),project:{client:state.meta.client||'',name:state.meta.project||'',meeting_title:state.meta.title||'',meeting_date:state.meta.date||'',participants:state.meta.participants||''},groups:DATA.groups.map(g=>({id:g.id,name:g.name,short:g.short})),questions:DATA.questions.map(q=>({uid:q.uid||'q-'+pad(q.id).padStart(4,'0'),group:q.group,question:q.question,options:q.options,suggestion:q.suggestion,priority:q.priority,due:q.due,reference:q.reference,answer:structuredAnswer(q.id)})),instructions:{confirmed_answers:'Never change answers or status with a patch',recommended_actions:['add_question','update_question','add_option'],note:'Generate a decision-studio-patch, never a full modified context. Preserve original question text in expected_question when updating.'}};
 return payload;
}
function structuredAnswer(id){const a=answered(id);return {status:a.status||'sin_revisar',selected_option:a.option||'',custom_answer:a.customAnswer||'',owner:a.owner||'',custom_owner:a.customOwner||'',commitment:a.commitment||'',notes:a.notes||''}}
function aiDownloadContext(){Export.download(new Blob([JSON.stringify(aiContext(),null,2)],{type:'application/json'}),basename()+'_contexto_IA.json');notify('Contexto preparado para ChatGPT / Claude')}
function aiOpen(){$('aiModal').classList.remove('hidden');$('aiPreview').classList.add('hidden');preparedPatch=null}
function aiClose(){$('aiModal').classList.add('hidden');preparedPatch=null}
function patchString(v,label,max=900){if(typeof v!=='string'||!v.trim()||v.length>max)throw Error(label+' debe ser texto de 1 a '+max+' caracteres');return v.trim()}
function resolveUID(uid,items){const ix=items.findIndex(q=>q.uid===uid);if(ix<0)throw Error('ID desconocido: '+uid);return ix}
function planPatch(payload){
 if(!payload||payload.kind!=='decision-studio-patch'||payload.schema_version!=='4.0'||!Array.isArray(payload.operations)||payload.operations.length<1||payload.operations.length>70)throw Error('Se requiere paquete decision-studio-patch v4 (1 a 70 operaciones)');
 if(payload.operations.some(o=>!o||typeof o!=='object'||Array.isArray(o)))throw Error('Operación inválida');
 const draft=DATA.questions.map(q=>({...q,options:q.options.slice()}));let reviewed=[],uids=new Set(draft.map(q=>q.uid));
 for(const [i,op] of payload.operations.entries()){
  let title='',info='',answeredFlag=false;
  if(op.action==='add_question'){
   if(draft.length>=300)throw Error('Máximo 300 preguntas');
   const uid=patchString(op.uid,'uid',85);if(!/^q-[a-z0-9-]{3,80}$/.test(uid)||uids.has(uid))throw Error('ID duplicado o inválido: '+uid);
   const question=patchString(op.question,'Pregunta');const group=Number(op.group);if(!Number.isInteger(group)||group<0||group>=DATA.groups.length)throw Error('Bloque inválido en operación '+(i+1));
   const options=op.options===undefined?[]:op.options;if(!Array.isArray(options)||options.length>35||options.some(x=>typeof x!=='string'||!x.trim()||x.length>500))throw Error('Alternativas inválidas');
   draft.push({id:draft.length+1,uid,group,question,options:[...new Set(options.map(x=>x.trim()))],suggestion:typeof op.suggestion==='string'?op.suggestion.slice(0,2000):'',due:typeof op.due==='string'?op.due.slice(0,90):'Por definir',reference:'Sugerencia de IA · requiere validación',priority:op.priority==='P0'?'P0':'P1',origin:'PROPUESTA POR IA'});uids.add(uid);title='Agregar pregunta';info=question;
  } else if(op.action==='update_question'){
   const uid=patchString(op.uid,'uid',85),at=resolveUID(uid,draft),q=draft[at];
   if(q.question!==patchString(op.expected_question,'expected_question'))throw Error('Conflicto: el texto actual de '+uid+' es diferente al que examinó la IA');
   const newQ=patchString(op.question,'Nueva pregunta');if(newQ===q.question)throw Error('No hay cambio en '+uid);answeredFlag=!!answered(q.id).status&&answered(q.id).status!=='sin_revisar';
   title='Modificar pregunta '+uid;info=q.question+' → '+newQ;q.question=newQ;
  } else if(op.action==='add_option'){
   const uid=patchString(op.uid,'uid',85),at=resolveUID(uid,draft),q=draft[at];
   if(q.question!==patchString(op.expected_question,'expected_question'))throw Error('Conflicto: la pregunta de '+uid+' cambió desde la exportación');
   const option=patchString(op.option,'Alternativa',500);if(q.options.includes(option))throw Error('La alternativa ya existe en '+uid);if(q.options.length>=35)throw Error('Demasiadas alternativas en '+uid);
   answeredFlag=!!answered(q.id).status&&answered(q.id).status!=='sin_revisar';q.options.push(option);title='Agregar alternativa '+uid;info=option;
  }else throw Error('Acción no permitida: '+op.action);
  reviewed.push({title,info,answeredFlag});
 }
 // Keep answers by id stable; append-only addition avoids remapping.
 return {draft,reviewed};
}
async function aiReadPatch(file){try{if(file.size>600000)throw Error('Archivo demasiado grande');const packet=JSON.parse(await file.text());const plan=planPatch(packet);preparedPatch={packet,plan};$('aiPreview').classList.remove('hidden');$('aiPreviewTitle').textContent='Vista previa · '+plan.reviewed.length+' cambio(s)';$('aiPreviewSummary').textContent='No se aplicará ningún cambio sin tu aprobación. Las respuestas y estados se conservan.';const list=$('aiPreviewList');list.innerHTML='';plan.reviewed.forEach((x,i)=>{const div=document.createElement('div');div.className='ai-preview-item';const strong=document.createElement('strong');strong.textContent=(i+1)+'. '+x.title;const body=document.createElement('div');body.textContent=x.info;div.append(strong,body);if(x.answeredFlag){const warn=document.createElement('small');warn.textContent='⚠ Esta pregunta tiene una respuesta registrada; el acuerdo no se modificará.';div.append(warn)}list.append(div)});$('aiApplyPatch').disabled=false;notify('Cambios validados. Revisa antes de aplicar.')}catch(e){preparedPatch=null;$('aiPreview').classList.add('hidden');$('aiApplyPatch').disabled=true;notify('Paquete rechazado: '+e.message)}finally{$('aiPatchFile').value=''}}
function aiApply(){if(!preparedPatch)return;let recheck;try{recheck=planPatch(preparedPatch.packet)}catch(e){notify('Cambios no aplicables: '+e.message);return}
 if(!confirm('¿Aprobar y aplicar '+recheck.reviewed.length+' cambios? Se conservarán las respuestas y estados actuales.'))return;
 DATA.questions=recheck.draft;updateAll();renderMatrix();aiClose();notify('Se aplicaron '+recheck.reviewed.length+' cambios sin alterar acuerdos')}
function aiPrompt(){const p='Actúa como Decision Studio AI. Lee el JSON de contexto adjunto como fuente de verdad. Distingue acuerdos confirmados, propuestas y pendientes. Identifica decisiones relevantes, riesgos y dependencias, citando los UID de las preguntas. Recomienda preguntas adicionales solo si aportan valor. Si te pido agregar o modificar preguntas, genera EXCLUSIVAMENTE un JSON decision-studio-patch schema_version 4.0 con operaciones add_question, update_question o add_option, conservando expected_question exacto. Nunca cambies respuestas ni estados. Para otras solicitudes, entrega un análisis claro.';navigator.clipboard?.writeText(p).then(()=>notify('Prompt copiado')).catch(()=>{notify('Copia este prompt desde el manual del paquete')})}

function attach(){
 $('aiButton').addEventListener('click',aiOpen);$('closeAI').addEventListener('click',aiClose);$('aiExportContext').addEventListener('click',aiDownloadContext);$('aiCopyPrompt').addEventListener('click',aiPrompt);$('aiSelectPatch').addEventListener('click',()=>$('aiPatchFile').click());$('aiPatchFile').addEventListener('change',e=>{if(e.target.files.length)aiReadPatch(e.target.files[0])});$('aiApplyPatch').addEventListener('click',aiApply);$('aiCancelPatch').addEventListener('click',()=>{preparedPatch=null;$('aiPreview').classList.add('hidden')});
 $('answerSelect').addEventListener('change',e=>{update('option',e.target.value,true);if(e.target.value==='__other__')$('customAnswer').focus()});
 $('customAnswer').addEventListener('input',e=>update('customAnswer',e.target.value));
 $('ownerSelect').addEventListener('change',e=>{update('owner',e.target.value,true);if(e.target.value==='__other__')$('customOwner').focus()});
 $('customOwner').addEventListener('input',e=>update('customOwner',e.target.value));
 $('commitmentDate').addEventListener('change',e=>update('commitment',e.target.value));
 $('notes').addEventListener('input',e=>update('notes',e.target.value));
 $('statusButtons').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>markStatus(b.dataset.status)));
 $('prevQuestion').addEventListener('click',()=>goto(current-1));$('nextQuestion').addEventListener('click',()=>current<DATA.questions.length?goto(current+1):(mode='matrix',renderMode()));
 $('focusViewBtn').addEventListener('click',()=>{mode='focus';renderMode()});$('matrixViewBtn').addEventListener('click',()=>{mode='matrix';renderMode()});
 ['searchInput','filterGroup','filterStatus'].forEach(id=>$(id).addEventListener(id==='searchInput'?'input':'change',renderMatrix));
 ['meetingTitle','meetingDate','participants'].forEach(id=>$(id).addEventListener('input',e=>{const prop={meetingTitle:'title',meetingDate:'date',participants:'participants'}[id];state.meta[prop]=e.target.value;persist()}));
 $('metaCollapse').addEventListener('click',()=>{const collapsed=$('metaCollapse').closest('.session-meta').classList.toggle('collapsed');$('metaCollapse').textContent=collapsed?'⌄':'⌃'});
 $('menuToggle').addEventListener('click',()=>{if(window.matchMedia('(max-width:770px)').matches){$('appShell').classList.remove('panel-hidden');$('sidebar').classList.toggle('open')}else{$('appShell').classList.toggle('panel-hidden')}syncSidebar()});$('closeSidebar').addEventListener('click',()=>{$('sidebar').classList.remove('open');$('appShell').classList.add('panel-hidden');syncSidebar()});
 $('clockDuration').addEventListener('change',e=>applyDuration(e.target.value));$('questionJump').addEventListener('change',e=>goto(Number(e.target.value)));$('clockToggle').addEventListener('click',toggleClock);$('clockReset').addEventListener('click',()=>{state.clock={duration:state.clock.duration||30,remaining:(state.clock.duration||30)*60,running:false,endAt:0};persist();renderClock()});
 $('settingsButton').addEventListener('click',openSettings);$('closeSettings').addEventListener('click',closeSettings);$('saveSettings').addEventListener('click',()=>{['brand','subtitle','client','project'].forEach(f=>state.meta[f]=$(f+'Input').value.trim());persist();renderBrand();closeSettings();notify('Personalización guardada')});$('logoInput').addEventListener('change',async e=>{const f=e.target.files?.[0];if(!f)return;if(f.size>250000) return notify('El logo debe pesar menos de 250 KB');if(!['image/png','image/jpeg','image/svg+xml'].includes(f.type))return notify('Formato de logo no permitido');const reader=new FileReader();reader.onload=()=>{state.meta.logo=reader.result;persist();renderBrand();$('logoPreview').src=reader.result;$('logoPreview').classList.remove('hidden')};reader.readAsDataURL(f)});$('removeLogo').addEventListener('click',()=>{delete state.meta.logo;persist();renderBrand();$('logoPreview').classList.add('hidden')});$('editorButton').addEventListener('click',openEditor);$('closeEditor').addEventListener('click',closeEditor);$('addQuestion').addEventListener('click',addQuestion);$('deleteQuestion').addEventListener('click',deleteQuestion);$('moveUp').addEventListener('click',()=>moveQuestion(-1));$('moveDown').addEventListener('click',()=>moveQuestion(1));$('saveEditedQuestion').addEventListener('click',saveEdited);$('downloadTemplate').addEventListener('click',downloadTemplate);$('loadTemplate').addEventListener('click',()=>$('templateFile').click());$('templateFile').addEventListener('change',e=>{if(e.target.files.length)loadTemplate(e.target.files[0])});$('exportButton').addEventListener('click',openModal);$('closeExport').addEventListener('click',closeModal);$('exportModal').addEventListener('click',e=>{if(e.target===$('exportModal'))closeModal()});
 $('downloadWord').addEventListener('click',()=>makeFile('docx'));$('downloadExcel').addEventListener('click',()=>makeFile('xlsx'));$('backupButton').addEventListener('click',backup);$('downloadJson').addEventListener('click',backup);
 $('importJsonTrigger').addEventListener('click',()=>$('importJsonInput').click());$('importJsonInput').addEventListener('change',e=>{if(e.target.files.length)restore(e.target.files[0])});
 $('restoreModeClose').addEventListener('click',closeRestoreMode);$('restoreModeCancel').addEventListener('click',closeRestoreMode);$('restoreModeConfirm').addEventListener('click',commitRestore);$('restoreModeModal').addEventListener('click',e=>{if(e.target===$('restoreModeModal'))closeRestoreMode()});document.querySelectorAll('input[name="restoreMode"]').forEach(x=>x.addEventListener('change',()=>{$('restoreModeConfirm').textContent=x.value==='template'?'Crear nuevo proyecto':'Continuar proyecto'}));
 $('persistentCheck').addEventListener('change',e=>toggleStorage(e.target.checked));$('resetButton').addEventListener('click',resetAll);
 document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeRestoreMode();closeModal();$('sidebar').classList.remove('open');syncSidebar()};if(e.altKey&&['ArrowRight','ArrowLeft'].includes(e.key)&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)){e.preventDefault();goto(current+(e.key==='ArrowRight'?1:-1))}});
 window.addEventListener('storage',e=>{if(e.key===KEY&&state.persistent)notify('Hay cambios en otra pestaña. Actualiza para verlos.');});
}
function init(){initState();syncMeta();attach();refreshFilters();renderStats();renderQuestion();renderMode();renderNav();renderJump();renderBrand();$('clockDuration').value=state.clock.duration||30;$('clockMinutesLabel').textContent=(state.clock.duration||30)+' MIN';renderClock();setInterval(renderClock,1000);if(!persist())notify('El navegador bloqueó el autoguardado; utiliza Respaldo JSON.');}
init();
})();

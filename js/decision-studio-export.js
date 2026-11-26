/* Decision Studio v4.2 · decision-studio-export.js */
/* Exportación OOXML real (.docx / .xlsx), 100 % local y sin dependencias de red. */
(function () {
 'use strict';
 const enc = new TextEncoder();
 const xml = s => String(s == null ? '' : s).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
 const dateText = d => d ? String(d).split('T')[0] : '—';
 const statusLabels = {sin_revisar:'Sin revisar',confirmada:'Confirmada',pendiente:'Pendiente',revision:'En revisión',no_aplica:'No aplica'};
 const concat = chunks => {const n=chunks.reduce((a,x)=>a+x.length,0), b=new Uint8Array(n);let i=0;chunks.forEach(c=>{b.set(c,i);i+=c.length});return b};
 let crcTable=null;
 function crc32(data){if(!crcTable){crcTable=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?(0xedb88320^(c>>>1)):(c>>>1);crcTable[n]=c>>>0}}let crc=0xffffffff;for(const b of data)crc=crcTable[(crc^b)&255]^(crc>>>8);return (crc^0xffffffff)>>>0}
 const u16=n=>new Uint8Array([n&255,n>>>8&255]);
 const u32=n=>new Uint8Array([n&255,n>>>8&255,n>>>16&255,n>>>24&255]);
 function makeZip(files){
  const local=[], central=[];let offset=0;
  Object.entries(files).forEach(([name,text])=>{
   const filename=enc.encode(name), payload=typeof text==='string'?enc.encode(text):text, crc=crc32(payload), size=payload.length;
   // method STORED: no decompressor, dependencies or network required.
   const header=concat([u32(0x04034b50),u16(20),u16(0x800),u16(0),u16(0),u16(0),u32(crc),u32(size),u32(size),u16(filename.length),u16(0),filename]);
   local.push(header,payload);
   central.push(concat([u32(0x02014b50),u16(20),u16(20),u16(0x800),u16(0),u16(0),u16(0),u32(crc),u32(size),u32(size),u16(filename.length),u16(0),u16(0),u16(0),u16(0),u32(0),u32(offset),filename]));
   offset+=header.length+size;
  });
  const centralData=concat(central);
  const footer=concat([u32(0x06054b50),u16(0),u16(0),u16(central.length),u16(central.length),u32(centralData.length),u32(offset),u16(0)]);
  return new Blob([...local,centralData,footer],{type:'application/zip'});
 }
 const pct = (n,total) => total ? Math.round(n/total*100) : 0;
 function enriched(data,answers){return data.questions.map(q=>{
  const a=answers[String(q.id)]||{};
  const option=a.option==='__other__' ? (a.customAnswer||'') : (a.option||'');
  return {...q,groupName:data.groups[q.group].name,answer:option,status:a.status||'sin_revisar',statusLabel:statusLabels[a.status||'sin_revisar'],owner:a.owner==='__other__'?(a.customOwner||''):(a.owner||''),commitment:a.commitment||'',notes:a.notes||'',updatedAt:a.updatedAt||''};
 })}
 function calc(rows){return {total:rows.length,confirmed:rows.filter(r=>r.status==='confirmada').length,pending:rows.filter(r=>r.status==='pendiente').length,review:rows.filter(r=>r.status==='revision').length,notApplicable:rows.filter(r=>r.status==='no_aplica').length,untouched:rows.filter(r=>r.status==='sin_revisar').length,treated:rows.filter(r=>r.status!=='sin_revisar').length}}
 function para(s,style='Normal'){const text=String(s||'—').split('\n');return '<w:p><w:pPr><w:pStyle w:val="'+style+'"/></w:pPr>'+text.map((t,i)=>(i?'<w:r><w:br/></w:r>':'')+'<w:r><w:t xml:space="preserve">'+xml(t)+'</w:t></w:r>').join('')+'</w:p>'}
 function tableRow(cells,header=false){return '<w:tr>'+cells.map((text,i)=>'<w:tc><w:tcPr><w:tcW w:w="'+(i===0?1900:7100)+'" w:type="dxa"/><w:shd w:fill="'+(header?'EAF2F1':'FFFFFF')+'"/></w:tcPr>'+para(text,header?'TableHead':'TableText')+'</w:tc>').join('')+'</w:tr>'}
 function table(rows){return '<w:tbl><w:tblPr><w:tblW w:w="9000" w:type="dxa"/><w:tblBorders><w:bottom w:val="single" w:sz="4" w:color="DEE8E6"/><w:insideH w:val="single" w:sz="4" w:color="E6ECEB"/></w:tblBorders></w:tblPr><w:tblGrid><w:gridCol w:w="1900"/><w:gridCol w:w="7100"/></w:tblGrid>'+rows.map((r,i)=>tableRow(r,i===0)).join('')+'</w:tbl>'}
 function docx(meta,data,answers){
  const rows=enriched(data,answers),k=calc(rows);
  const pending=rows.filter(q=>!['confirmada','no_aplica'].includes(q.status));
  let body=para((meta.client||'Cliente no especificado')+'  /  '+(meta.project||'Evaluación de arquitectura'),'SubTitle')+para('INFORME DE VALIDACIONES TÉCNICAS','Title')+para(meta.title||'Validaciones técnicas previas al inicio del proyecto','Subtitle');
  body+=para('Cliente: '+(meta.client||'No especificado')+'    •    Proyecto: '+(meta.project||'No especificado'),'Meta');body+=para('Fecha: '+dateText(meta.date)+'    •    Participantes: '+(meta.participants||'No registrados'),'Meta');
  body+=para('Resumen ejecutivo','Heading1');
  body+=table([['Indicador','Resultado'],['Validaciones revisadas',k.treated+' de '+k.total+' ('+pct(k.treated,k.total)+' %)'],['Confirmadas',String(k.confirmed)],['Pendientes / en revisión',String(k.pending+k.review)],['Sin revisar',String(k.untouched)],['No aplica',String(k.notApplicable)]]);
  body+=para('Criterio de lectura','Heading2')+para('Las respuestas y estados reflejan únicamente los acuerdos registrados durante la sesión. Las recomendaciones son orientativas y no constituyen decisiones aprobadas hasta su validación.');
  if(pending.length){body+=para('Pendientes de cierre','Heading1');body+=table([['ID / Bloque','Seguimiento requerido'],...pending.map(q=>['#'+String(q.id).padStart(2,'0')+' · '+q.groupName, q.question+' | Estado: '+q.statusLabel+' | Responsable: '+(q.owner||'Sin asignar')+' | Compromiso: '+dateText(q.commitment)])]);}
  body+=para('Detalle de las '+rows.length+' validaciones','Heading1');
  data.groups.forEach((g,i)=>{
   const part=rows.filter(q=>q.group===i);body+=para(String(i+1).padStart(2,'0')+'  '+g.name,'Heading2');
   part.forEach(q=>{
    body+=para('#'+String(q.id).padStart(2,'0')+'  '+q.question,'Heading3');
    body+=table([['Campo','Registro'],['Estado',q.statusLabel],['Respuesta acordada',q.answer||'No registrada'],['Responsable',q.owner||'No asignado'],['Compromiso',dateText(q.commitment)],['Notas / acuerdos',q.notes||'Sin observaciones'],['Momento de cierre (plan)',q.due]]);
    body+=para('Referencia de trabajo: '+q.suggestion,'Evidence')+para('Fuente: '+q.reference+' · '+q.origin,'Source');
   });
  });
  body+='<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1100" w:right="1150" w:bottom="1050" w:left="1150" w:header="500" w:footer="500" w:gutter="0"/></w:sectPr>';
  const document=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}</w:body></w:document>`;
  const styles=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Aptos" w:hAnsi="Aptos"/><w:sz w:val="19"/><w:color w:val="294951"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="105"/></w:pPr></w:pPrDefault></w:docDefaults>
  <w:style w:type="paragraph" w:styleId="Normal" w:default="1"><w:name w:val="Normal"/></w:style>
  <w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:rPr><w:b/><w:sz w:val="36"/><w:color w:val="115D60"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="SubTitle"><w:name w:val="SubTitle"/><w:basedOn w:val="Normal"/><w:rPr><w:b/><w:sz w:val="18"/><w:color w:val="E36255"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Subtitle"><w:name w:val="Subtitle"/><w:basedOn w:val="Normal"/><w:rPr><w:sz w:val="21"/><w:color w:val="607F82"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Meta"><w:name w:val="Meta"/><w:basedOn w:val="Normal"/><w:rPr><w:sz w:val="17"/><w:color w:val="73858A"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:before="240" w:after="115"/><w:keepNext/></w:pPr><w:rPr><w:b/><w:sz w:val="27"/><w:color w:val="07565B"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:before="210" w:after="85"/><w:keepNext/></w:pPr><w:rPr><w:b/><w:sz w:val="23"/><w:color w:val="226D71"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="heading 3"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:before="160" w:after="65"/><w:keepNext/></w:pPr><w:rPr><w:b/><w:sz w:val="20"/><w:color w:val="1C444A"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="TableHead"><w:name w:val="TableHead"/><w:basedOn w:val="Normal"/><w:rPr><w:b/><w:sz w:val="17"/><w:color w:val="1E6A70"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="TableText"><w:name w:val="TableText"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="45" w:before="45"/></w:pPr><w:rPr><w:sz w:val="16"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Evidence"><w:name w:val="Evidence"/><w:basedOn w:val="Normal"/><w:rPr><w:sz w:val="17"/><w:color w:val="446D73"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Source"><w:name w:val="Source"/><w:basedOn w:val="Normal"/><w:rPr><w:i/><w:sz w:val="15"/><w:color w:val="88999B"/></w:rPr></w:style></w:styles>`;
  const files={
   '[Content_Types].xml':'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>',
   '_rels/.rels':'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
   'word/_rels/document.xml.rels':'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>',
   'word/document.xml':document,'word/styles.xml':styles
  };
  return new Blob([makeZip(files)],{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
 }
 function excelCol(n){let s='';while(n){s=String.fromCharCode(65+(n-1)%26)+s;n=Math.floor((n-1)/26)}return s}
 function worksheet(grid,widths,freeze=true,autofilter=false){
  let cells='';let rowNum=0;
  grid.forEach((row,ix)=>{const n=ix+1;rowNum=n;let inner='';row.forEach((v,c)=>{
   const ref=excelCol(c+1)+n;let style=ix===0?1:(c===0?2:3);let val=v;
   if(v&&typeof v==='object'&&v.formula){inner+='<c r="'+ref+'" s="'+style+'"><f>'+xml(v.formula)+'</f><v>'+String(v.cached||0)+'</v></c>';return}
   if(v&&typeof v==='object'&&v.status){val=v.status;style={Confirmada:4,Pendiente:5,'En revisión':6,'No aplica':7,'Sin revisar':8}[val]||3}
   inner+='<c r="'+ref+'" s="'+style+'" t="inlineStr"><is><t xml:space="preserve">'+xml(val)+'</t></is></c>';
  });cells+='<row r="'+n+'"'+(ix===0?' ht="31" customHeight="1"':'')+'>'+inner+'</row>';});
  const cols=(widths||[]).map((w,i)=>'<col min="'+(i+1)+'" max="'+(i+1)+'" width="'+w+'" customWidth="1"/>').join('');
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView showGridLines="0" workbookViewId="0">'+(freeze?'<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>':'')+'</sheetView></sheetViews><sheetFormatPr defaultRowHeight="17"/><cols>'+cols+'</cols><sheetData>'+cells+'</sheetData>'+(autofilter?'<autoFilter ref="A1:'+excelCol(grid[0].length)+grid.length+'"/>':'')+'<pageMargins left="0.3" right="0.3" top="0.5" bottom="0.5" header="0.1" footer="0.1"/></worksheet>';
 }
 function xlsx(meta,data,answers){
  const rows=enriched(data,answers),k=calc(rows);
  const cols=['ID','Bloque','Prioridad','Validación / pregunta','Respuesta acordada','Estado','Responsable','Fecha compromiso','Notas / acuerdos','Cierre previsto','Referencia / contexto','Propuesta sugerida','Última actualización'];
  function record(q){return [String(q.id).padStart(2,'0'),q.groupName,q.priority,q.question,q.answer,q.statusLabel&&{status:q.statusLabel},q.owner,q.commitment,q.notes,q.due,q.reference,q.suggestion,q.updatedAt]}
  const tracked=rows.map(record), pending=rows.filter(q=>!['confirmada','no_aplica'].includes(q.status));
  const summary=[[(meta.client||'CLIENTE')+' · INFORME DE VALIDACIONES','RESULTADO'],['Proyecto',meta.project||'No indicado'],['Reunión',meta.title||'Validaciones técnicas previas al inicio'],['Fecha',dateText(meta.date)],['Participantes',meta.participants||'No registrados'],['Total de preguntas',String(k.total)],['Decisiones tratadas',String(k.treated)],['Confirmadas',String(k.confirmed)],['Pendientes',String(k.pending)],['En revisión',String(k.review)],['Sin revisar',String(k.untouched)],['No aplica',String(k.notApplicable)],['Nota','Las recomendaciones de referencia no equivalen a una aprobación formal.']];
  const perGroup=[['BLOQUE','TOTAL','CONFIRMADAS','PENDIENTES','EN REVISIÓN','SIN REVISAR'],...data.groups.map((g,i)=>{const a=rows.filter(q=>q.group===i),s=calc(a);return[g.name,String(s.total),String(s.confirmed),String(s.pending),String(s.review),String(s.untouched)]})];
  const sheets=[['Resumen',summary,[57,90],false],['Validaciones',[cols,...tracked],[8,31,12,60,52,16,25,19,63,18,38,68,23],true],['Pendientes',[cols,...pending.map(record)],[8,31,12,60,52,16,25,19,63,18,38,68,23],true],['Por bloque',perGroup,[43,14,17,17,19,16],true]];
  let overrides='';let workbookRels='';let workbookSheets='';let sheetsXml={};
  sheets.forEach(([name,grid,widths,filter],i)=>{
   sheetsXml['xl/worksheets/sheet'+(i+1)+'.xml']=worksheet(grid,widths,true,filter);
   overrides+='<Override PartName="/xl/worksheets/sheet'+(i+1)+'.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>';
   workbookRels+='<Relationship Id="rId'+(i+1)+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet'+(i+1)+'.xml"/>';
   workbookSheets+='<sheet name="'+xml(name)+'" sheetId="'+(i+1)+'" r:id="rId'+(i+1)+'"/>';
  });
  const files={
   '[Content_Types].xml':'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>'+overrides+'<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>',
   '_rels/.rels':'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
   'xl/workbook.xml':'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>'+workbookSheets+'</sheets><calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>',
   'xl/_rels/workbook.xml.rels':'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+workbookRels+'<Relationship Id="rId5" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>',
   'xl/styles.xml':'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="3"><font><sz val="10"/><name val="Aptos"/><color rgb="FF29454A"/></font><font><b/><sz val="11"/><name val="Aptos"/><color rgb="FFFFFFFF"/></font><font><b/><sz val="10"/><name val="Aptos"/><color rgb="FF145D64"/></font></fonts><fills count="7"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF125A62"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE5F7F0"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFF1D9"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE8F1FF"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFEDF1F2"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="9"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyAlignment="1"><alignment wrapText="1" vertical="center"/></xf><xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment wrapText="1" vertical="center"/></xf><xf numFmtId="0" fontId="2" fillId="3" borderId="0" xfId="0"/><xf numFmtId="0" fontId="0" fillId="4" borderId="0" xfId="0"/><xf numFmtId="0" fontId="0" fillId="5" borderId="0" xfId="0"/><xf numFmtId="0" fontId="0" fillId="6" borderId="0" xfId="0"/><xf numFmtId="0" fontId="0" fillId="6" borderId="0" xfId="0"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>',...sheetsXml
  };
  return new Blob([makeZip(files)],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
 }
 function download(blob,filename){const a=document.createElement('a');const url=URL.createObjectURL(blob);a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),15000)}
 window.DecisionExport={docx,xlsx,download,enriched,calc,statusLabels};
})();

/* ============================================================
   IMDAC · PANEL DE ADMINISTRACIÓN — app.js
   Mismas colecciones Firestore que el Club. CRUD completo.
   ============================================================ */

/* ====== CONFIG — usar la MISMA cuenta Firebase que el Club ====== */
const firebaseConfig = {
  apiKey: "REEMPLAZAR_API_KEY",
  authDomain: "imdac-club.firebaseapp.com",
  projectId: "imdac-club",
  storageBucket: "imdac-club.appspot.com",
  messagingSenderId: "REEMPLAZAR_SENDER_ID",
  appId: "REEMPLAZAR_APP_ID"
};
// Credenciales demo (cuando Firebase no está configurado aún)
const DEMO_ADMIN = { email:"admin@imdac.mx", pass:"IMDACAdmin2026" };

let db=null, auth=null, FB_OK=false;
try{
  firebase.initializeApp(firebaseConfig);
  auth=firebase.auth(); db=firebase.firestore();
  FB_OK = firebaseConfig.apiKey && !firebaseConfig.apiKey.includes("REEMPLAZAR");
}catch(e){ console.warn("Firebase sin configurar — modo demo.",e); }

let CURRENT_USER=null;
let DATA={cursos:[],webinars:[],noticias:[],material:[],foro:[],miembros:[],notificaciones:[]};
const CATS=["Estructuras","Instalaciones","Costos y Presupuestos","Topografía","Diseño CAD","Normatividad","Sustentabilidad","Gestión de Obra"];
const NIVELES=["Básico","Intermedio","Avanzado"];

/* ====== NAV ====== */
const NAV=[
  {id:"dashboard",label:"Dashboard",icon:'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6'},
  {id:"cursos",label:"Cursos",icon:'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253'},
  {id:"webinars",label:"Webinars",icon:'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z'},
  {id:"noticias",label:"Noticias",icon:'M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9'},
  {id:"material",label:"Material PDF",icon:'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'},
  {id:"miembros",label:"Miembros",icon:'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z'},
  {id:"foro",label:"Foro",icon:'M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z'},
  {id:"notificaciones",label:"Notificaciones",icon:'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9'},
  {id:"configuracion",label:"Configuración",icon:'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z'},
];
function renderSidebar(){
  document.getElementById('sb-nav').innerHTML=NAV.map(it=>`
    <div class="sb-item" data-sec="${it.id}" onclick="go('${it.id}')">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="${it.icon}"/></svg>${it.label}
    </div>`).join('');
}

/* ====== ROUTER ====== */
let currentSection="dashboard";
function go(sec){
  currentSection=sec;
  document.querySelectorAll('.sb-item').forEach(e=>e.classList.toggle('active',e.dataset.sec===sec));
  document.getElementById('tb-title').textContent=NAV.find(n=>n.id===sec)?.label||'';
  if(window.innerWidth<=900)toggleSidebar(false);
  renderSection(sec);window.scrollTo(0,0);
}
function renderSection(sec){
  const R={dashboard:renderDashboard,cursos:renderCursos,webinars:renderWebinars,noticias:renderNoticias,
    material:renderMaterial,miembros:renderMiembros,foro:renderForo,notificaciones:renderNotificaciones,configuracion:renderConfig};
  document.getElementById('content').innerHTML=`<div class="section active">${(R[sec]||renderDashboard)()}</div>`;
}

/* ====== DASHBOARD ====== */
function renderDashboard(){
  const ingreso=DATA.miembros.length*499;
  return `
  <div class="page-head"><div><h1 class="page-h">Dashboard</h1><p class="page-sub">Resumen general del Club IMDAC.</p></div></div>
  <div class="stats">
    ${statCard('Miembros',DATA.miembros.length,'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z')}
    ${statCard('Cursos',DATA.cursos.length,'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253')}
    ${statCard('Webinars',DATA.webinars.length,'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z')}
    ${statCard('MRR estimado','$'+ingreso.toLocaleString('es-MX'),'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z')}
  </div>
  <div class="card">
    <table class="tbl"><thead><tr><th>Últimos miembros</th><th>Correo</th><th>Alta</th></tr></thead>
    <tbody>${DATA.miembros.slice(0,5).map(m=>`<tr><td class="t-title">${m.nombre||'—'}</td><td>${m.email||'—'}</td><td>${m.alta||'—'}</td></tr>`).join('')||'<tr><td colspan="3"><div class="empty"><b>Sin miembros aún</b></div></td></tr>'}</tbody></table>
  </div>`;
}
function statCard(label,val,icon){return `<div class="stat"><div class="top"><div class="si"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="${icon}"/></svg></div></div><b>${val}</b><span>${label}</span></div>`;}

/* ====== CRUD GENÉRICO (webinars, noticias, material) ====== */
function tableShell(title,sub,addLabel,addFn,head,rows){
  return `<div class="page-head"><div><h1 class="page-h">${title}</h1><p class="page-sub">${sub}</p></div>
    <button class="btn-add" onclick="${addFn}"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>${addLabel}</button></div>
    <div class="card"><div class="tbl-wrap"><table class="tbl"><thead><tr>${head.map(h=>`<th>${h}</th>`).join('')}<th></th></tr></thead>
    <tbody>${rows||`<tr><td colspan="${head.length+1}"><div class="empty"><b>Aún no hay registros</b><span>Crea el primero con el botón de arriba.</span></div></td></tr>`}</tbody></table></div></div>`;
}
function actions(coll,id){return `<div class="row-actions">
  <button class="ico-btn" onclick="editItem('${coll}','${id}')" title="Editar"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg></button>
  <button class="ico-btn del" onclick="delItem('${coll}','${id}')" title="Eliminar"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>
</div>`;}

/* ====== CURSOS ====== */
function renderCursos(){
  const rows=DATA.cursos.map(c=>`<tr>
    <td><div class="t-cell"><div class="t-thumb" style="background-image:url('${c.img||''}')"></div><span class="t-title">${c.titulo}</span></div></td>
    <td><span class="tag">${c.categoria||'—'}</span></td>
    <td>${c.nivel||'—'}</td>
    <td>${(c.listaClases?c.listaClases.length:c.clases)||0}</td>
    <td>${c.dripDias?`<span class="tag gray">En ${c.dripDias} días</span>`:'<span class="tag green">Abierto</span>'}</td>
    <td>${actions('cursos',c.id)}</td></tr>`).join('');
  return tableShell('Cursos','Gestiona el catálogo y las clases de cada curso.','Nuevo curso','newCurso()',
    ['Curso','Categoría','Nivel','Clases','Goteo'],rows);
}
function cursoForm(c={}){
  const clases=c.listaClases||[];
  return `
  <div class="form-grid">
    <div class="field form-full"><label>Título del curso</label><input id="f-titulo" value="${esc(c.titulo)}" placeholder="Ej. Diseño Estructural de Concreto"></div>
    <div class="field"><label>Categoría</label><select id="f-categoria">${CATS.map(x=>`<option ${c.categoria===x?'selected':''}>${x}</option>`).join('')}</select></div>
    <div class="field"><label>Nivel</label><select id="f-nivel">${NIVELES.map(x=>`<option ${c.nivel===x?'selected':''}>${x}</option>`).join('')}</select></div>
    <div class="field"><label>Liberación por goteo (días)</label><input id="f-drip" type="number" value="${c.dripDias||0}" placeholder="0 = abierto ya"></div>
    <div class="field"><label>Imagen (URL)</label><input id="f-img" value="${esc(c.img)}" placeholder="https://..."></div>
    <div class="field form-full"><label>Descripción</label><textarea id="f-desc" rows="3">${esc(c.desc)}</textarea></div>
  </div>
  <div class="form-full" style="margin-top:8px">
    <label style="display:block;font-size:.78rem;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin-bottom:10px">Clases del curso</label>
    <div id="clases-list">${clases.map((cl,i)=>claseEditRow(cl,i)).join('')}</div>
    <button class="btn-add-clase" onclick="addClaseRow()"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width:16px;height:16px"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.4" d="M12 4v16m8-8H4"/></svg>Agregar clase</button>
  </div>`;
}
function claseEditRow(cl={},i){return `<div class="clase-edit" data-clase>
  <span class="num">${i+1}</span>
  <input data-cl="titulo" value="${esc(cl.titulo)}" placeholder="Título de la clase">
  <input data-cl="duracion" value="${esc(cl.duracion)||'2 Horas'}" placeholder="Duración" style="max-width:110px">
  <input data-cl="videoUrl" value="${esc(cl.videoUrl)}" placeholder="URL Google Drive" style="max-width:170px">
  <button class="rm" onclick="this.parentElement.remove();renumClases()"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width:16px;height:16px"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg></button>
</div>`;}
function addClaseRow(){const l=document.getElementById('clases-list');l.insertAdjacentHTML('beforeend',claseEditRow({},l.children.length));}
function renumClases(){document.querySelectorAll('#clases-list .clase-edit').forEach((r,i)=>r.querySelector('.num').textContent=i+1);}
function collectClases(){return [...document.querySelectorAll('#clases-list .clase-edit')].map(r=>({titulo:r.querySelector('[data-cl="titulo"]').value,duracion:r.querySelector('[data-cl="duracion"]').value,videoUrl:r.querySelector('[data-cl="videoUrl"]').value}));}
function newCurso(){openForm('Nuevo curso',cursoForm(),()=>saveCurso(null));}
function saveCurso(id){
  const clases=collectClases();
  const data={titulo:fv('f-titulo'),categoria:fv('f-categoria'),nivel:fv('f-nivel'),dripDias:+fv('f-drip')||0,img:fv('f-img'),desc:fv('f-desc'),listaClases:clases,clases:clases.length};
  if(!data.titulo)return toast('El título es obligatorio');
  saveDoc('cursos',id,data);
}

/* ====== WEBINARS ====== */
function renderWebinars(){
  const rows=DATA.webinars.map(w=>`<tr>
    <td class="t-title">${w.titulo}</td><td>${w.fecha||'—'}</td>
    <td>${w.grabacion?'<span class="tag green">Con grabación</span>':'<span class="tag gray">En vivo</span>'}</td>
    <td>${actions('webinars',w.id)}</td></tr>`).join('');
  return tableShell('Webinars','Programa sesiones en vivo y sube grabaciones.','Nuevo webinar','newWebinar()',['Título','Fecha','Estado'],rows);
}
function webinarForm(w={}){return `<div class="form-grid">
  <div class="field form-full"><label>Título</label><input id="f-titulo" value="${esc(w.titulo)}"></div>
  <div class="field"><label>Fecha (texto visible)</label><input id="f-fecha" value="${esc(w.fecha)}" placeholder="15 jun 2026, 18:00"></div>
  <div class="field"><label>Fecha y hora (para countdown)</label><input id="f-fechaISO" type="datetime-local" value="${esc(w.fechaISO)}"></div>
  <div class="field form-full"><label>URL grabación (opcional)</label><input id="f-grabacion" value="${esc(w.grabacion)}" placeholder="https://drive.google.com/..."></div>
  <div class="field form-full"><label>Imagen (URL)</label><input id="f-img" value="${esc(w.img)}"></div>
</div>`;}
function newWebinar(){openForm('Nuevo webinar',webinarForm(),()=>saveWebinar(null));}
function saveWebinar(id){const d={titulo:fv('f-titulo'),fecha:fv('f-fecha'),fechaISO:fv('f-fechaISO'),grabacion:fv('f-grabacion'),img:fv('f-img')};if(!d.titulo)return toast('El título es obligatorio');saveDoc('webinars',id,d);}

/* ====== NOTICIAS ====== */
function renderNoticias(){
  const rows=DATA.noticias.map(n=>`<tr>
    <td><div class="t-cell"><div class="t-thumb" style="background-image:url('${n.img||''}')"></div><span class="t-title">${n.titulo}</span></div></td>
    <td><span class="tag">${n.fuente||'IMDAC'}</span></td><td>${n.fecha||'—'}</td>
    <td>${actions('noticias',n.id)}</td></tr>`).join('');
  return tableShell('Noticias','Publica novedades del sector de la construcción.','Nueva noticia','newNoticia()',['Noticia','Fuente','Fecha'],rows);
}
function noticiaForm(n={}){return `<div class="form-grid">
  <div class="field form-full"><label>Título</label><input id="f-titulo" value="${esc(n.titulo)}"></div>
  <div class="field"><label>Fuente</label><input id="f-fuente" value="${esc(n.fuente)||'IMDAC'}"></div>
  <div class="field"><label>Fecha</label><input id="f-fecha" value="${esc(n.fecha)||new Date().toLocaleDateString('es-MX')}"></div>
  <div class="field form-full"><label>Resumen</label><textarea id="f-resumen" rows="3">${esc(n.resumen)}</textarea></div>
  <div class="field form-full"><label>Imagen (URL)</label><input id="f-img" value="${esc(n.img)}"></div>
  <div class="field form-full"><label>Enlace (URL)</label><input id="f-url" value="${esc(n.url)}" placeholder="https://..."></div>
</div>`;}
function newNoticia(){openForm('Nueva noticia',noticiaForm(),()=>saveNoticia(null));}
function saveNoticia(id){const d={titulo:fv('f-titulo'),fuente:fv('f-fuente'),fecha:fv('f-fecha'),resumen:fv('f-resumen'),img:fv('f-img'),url:fv('f-url')};if(!d.titulo)return toast('El título es obligatorio');saveDoc('noticias',id,d);}

/* ====== MATERIAL ====== */
function renderMaterial(){
  const rows=DATA.material.map(m=>`<tr>
    <td class="t-title">📄 ${m.titulo}</td><td>${m.desc||'—'}</td>
    <td>${actions('material',m.id)}</td></tr>`).join('');
  return tableShell('Material PDF','Sube guías, planos tipo y documentos descargables.','Nuevo material','newMaterial()',['Título','Descripción'],rows);
}
function materialForm(m={}){return `<div class="form-grid">
  <div class="field form-full"><label>Título</label><input id="f-titulo" value="${esc(m.titulo)}"></div>
  <div class="field form-full"><label>Descripción</label><textarea id="f-desc" rows="2">${esc(m.desc)}</textarea></div>
  <div class="field form-full"><label>URL del PDF</label><input id="f-url" value="${esc(m.url)}" placeholder="https://..."></div>
</div>`;}
function newMaterial(){openForm('Nuevo material',materialForm(),()=>saveMaterial(null));}
function saveMaterial(id){const d={titulo:fv('f-titulo'),desc:fv('f-desc'),url:fv('f-url')};if(!d.titulo)return toast('El título es obligatorio');saveDoc('material',id,d);}

/* ====== MIEMBROS ====== */
function renderMiembros(){
  const rows=DATA.miembros.map(m=>`<tr>
    <td><div class="t-cell"><div class="t-thumb" style="border-radius:9px;background:var(--rojo);color:#fff;display:grid;place-items:center;font-weight:700;font-family:var(--font-display)">${(m.nombre||'U')[0].toUpperCase()}</div><span class="t-title">${m.nombre||'—'}</span></div></td>
    <td>${m.email||'—'}</td><td>${m.ciudad||'—'}</td><td><span class="tag green">Activo</span></td>
    <td><div class="row-actions"><button class="ico-btn" onclick="verMiembro('${m.id}')" title="Ver"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg></button>
    <button class="ico-btn del" onclick="delItem('miembros','${m.id}')" title="Eliminar"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button></div></td></tr>`).join('');
  return tableShell('Miembros','Consulta y administra los miembros del club.','',`toast('Los miembros se registran desde el Club')`,['Miembro','Correo','Ciudad','Estado'],rows)
    .replace(/<button class="btn-add"[^>]*>.*?<\/button>/,'');
}
function verMiembro(id){
  const m=DATA.miembros.find(x=>x.id===id);if(!m)return;
  document.getElementById('modal-content').innerHTML=`
    <div class="modal-head"><h3>Detalle del miembro</h3><button class="modal-x" onclick="closeModal()">✕</button></div>
    <div class="modal-body">
      <div class="member-hero"><div class="av">${(m.nombre||'U')[0].toUpperCase()}</div><div><h3 style="font-family:var(--font-display);font-size:1.3rem">${m.nombre||'—'}</h3><span style="color:var(--muted)">${m.email||''}</span></div></div>
      <div class="member-info">
        <div class="it"><div class="l">Teléfono</div><div class="v">${m.telefono||'—'}</div></div>
        <div class="it"><div class="l">Ciudad</div><div class="v">${m.ciudad||'—'}</div></div>
        <div class="it"><div class="l">Profesión</div><div class="v">${m.profesion||'—'}</div></div>
        <div class="it"><div class="l">Alta</div><div class="v">${m.alta||'—'}</div></div>
        <div class="it" style="grid-column:1/-1"><div class="l">Biografía</div><div class="v" style="font-weight:400">${m.bio||'—'}</div></div>
      </div>
      <div class="modal-foot"><button class="btn-ghost" onclick="closeModal()">Cerrar</button></div>
    </div>`;
  document.getElementById('modal').classList.add('open');
}

/* ====== FORO (moderación) ====== */
function renderForo(){
  const rows=DATA.foro.map(t=>`<tr>
    <td class="t-title">${t.titulo}</td><td>${t.autor||'—'}</td><td><span class="tag">${t.tag||'General'}</span></td>
    <td>❤️ ${t.likes||0} · 👁 ${t.vistas||0}</td>
    <td><div class="row-actions"><button class="ico-btn del" onclick="delItem('foro','${t.id}')" title="Eliminar tema"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button></div></td></tr>`).join('');
  return tableShell('Foro','Modera los temas publicados por la comunidad.','',`toast('Los temas los crean los miembros')`,['Tema','Autor','Categoría','Interacción'],rows)
    .replace(/<button class="btn-add"[^>]*>.*?<\/button>/,'');
}

/* ====== NOTIFICACIONES ====== */
const NOTIF_TIPOS=[['📢','Anuncio'],['📚','Nuevo curso'],['🎥','Webinar'],['📄','Material'],['🏷️','Promoción']];
let _notifEmoji='📢';
function renderNotificaciones(){
  const rows=DATA.notificaciones.map(n=>`<tr><td class="t-title">${n.emoji||'📢'} ${n.titulo}</td><td>${n.mensaje||''}</td><td>${n.fecha||'—'}</td>
    <td>${actions('notificaciones',n.id)}</td></tr>`).join('');
  return `<div class="page-head"><div><h1 class="page-h">Notificaciones</h1><p class="page-sub">Envía avisos a los miembros del club.</p></div>
    <button class="btn-add" onclick="newNotif()"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>Nueva notificación</button></div>
    <div class="card"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Notificación</th><th>Mensaje</th><th>Fecha</th><th></th></tr></thead>
    <tbody>${rows||'<tr><td colspan="4"><div class="empty"><b>Sin notificaciones enviadas</b></div></td></tr>'}</tbody></table></div></div>`;
}
function notifForm(n={}){_notifEmoji=n.emoji||'📢';return `
  <div class="field"><label>Tipo</label><div class="emoji-pick" id="emoji-pick">${NOTIF_TIPOS.map(t=>`<button class="${t[0]===_notifEmoji?'active':''}" onclick="pickEmoji('${t[0]}')" title="${t[1]}">${t[0]}</button>`).join('')}</div></div>
  <div class="field" style="margin-top:16px"><label>Título</label><input id="f-titulo" value="${esc(n.titulo)}" placeholder="Ej. Nuevo curso disponible"></div>
  <div class="field"><label>Mensaje</label><textarea id="f-mensaje" rows="3">${esc(n.mensaje)}</textarea></div>
  <div class="field"><label>Segmento</label><select id="f-segmento"><option>Todos los miembros</option><option>Solo Premium</option><option>Nuevos (último mes)</option></select></div>`;}
function pickEmoji(e){_notifEmoji=e;document.querySelectorAll('#emoji-pick button').forEach(b=>b.classList.toggle('active',b.textContent===e));}
function newNotif(){openForm('Nueva notificación',notifForm(),()=>saveNotif(null));}
function saveNotif(id){const d={emoji:_notifEmoji,titulo:fv('f-titulo'),mensaje:fv('f-mensaje'),segmento:fv('f-segmento'),fecha:new Date().toLocaleDateString('es-MX')};if(!d.titulo)return toast('El título es obligatorio');saveDoc('notificaciones',id,d);}

/* ====== CONFIG ====== */
function renderConfig(){
  return `<div class="page-head"><div><h1 class="page-h">Configuración</h1><p class="page-sub">Ajustes globales del club.</p></div></div>
  <div class="card" style="padding:8px 26px;max-width:620px">
    <div class="cfg-item"><div class="ci-t"><b>Modo mantenimiento</b><span>Bloquea el acceso de miembros al Club mientras actualizas contenido</span></div>
      <label class="toggle"><input type="checkbox" id="cfg-maint" onchange="saveMaint(this.checked)"><span class="tk"></span></label></div>
  </div>
  <div class="card" style="padding:26px;max-width:620px;margin-top:18px">
    <h3 style="font-family:var(--font-display);font-size:1.1rem;margin-bottom:16px">Datos de contacto</h3>
    <div class="form-grid">
      <div class="field"><label>Cupón de descuento</label><input id="cfg-cupon" value="CLUB20IMDAC"></div>
      <div class="field"><label>WhatsApp soporte 1</label><input id="cfg-wa1" value="238 219 6286"></div>
      <div class="field"><label>WhatsApp soporte 2</label><input id="cfg-wa2" value="236 111 2213"></div>
      <div class="field"><label>Enlace canal WhatsApp</label><input id="cfg-canal" placeholder="https://chat.whatsapp.com/..."></div>
    </div>
    <button class="btn-save" style="margin-top:18px" onclick="saveContacto()">Guardar contacto</button>
  </div>`;
}
function saveMaint(on){if(FB_OK)db.collection('config').doc('app').set({mantenimiento:on},{merge:true});toast(on?'Modo mantenimiento ACTIVADO':'Modo mantenimiento desactivado');}
function saveContacto(){if(FB_OK)db.collection('config').doc('app').set({cupon:fv('cfg-cupon'),wa1:fv('cfg-wa1'),wa2:fv('cfg-wa2'),canal:fv('cfg-canal')},{merge:true});toast('Datos de contacto guardados');}

/* ====== MODAL FORM (reusable) ====== */
let _saveFn=null;
function openForm(title,bodyHtml,saveFn){
  _saveFn=saveFn;
  document.getElementById('modal-content').innerHTML=`
    <div class="modal-head"><h3>${title}</h3><button class="modal-x" onclick="closeModal()">✕</button></div>
    <div class="modal-body">${bodyHtml}
      <div class="modal-foot"><button class="btn-ghost" onclick="closeModal()">Cancelar</button><button class="btn-save" onclick="_saveFn()">Guardar</button></div>
    </div>`;
  document.getElementById('modal').classList.add('open');
}
function closeModal(){document.getElementById('modal').classList.remove('open');_saveFn=null;}

/* ====== EDIT / DELETE genéricos ====== */
const COLL_MAP={cursos:{data:'cursos',form:cursoForm,save:saveCurso,title:'Editar curso'},
  webinars:{data:'webinars',form:webinarForm,save:saveWebinar,title:'Editar webinar'},
  noticias:{data:'noticias',form:noticiaForm,save:saveNoticia,title:'Editar noticia'},
  material:{data:'material',form:materialForm,save:saveMaterial,title:'Editar material'},
  notificaciones:{data:'notificaciones',form:notifForm,save:saveNotif,title:'Editar notificación'}};
function editItem(coll,id){
  const cfg=COLL_MAP[coll];const item=DATA[cfg.data].find(x=>x.id===id);if(!item)return;
  openForm(cfg.title,cfg.form(item),()=>cfg.save(id));
}
function delItem(coll,id){
  const map={foro:'foro'};const key=map[coll]||coll;
  if(!confirm('¿Eliminar este registro? No se puede deshacer.'))return;
  const collName=coll==='foro'?'foro_temas':coll;
  if(FB_OK){db.collection(collName).doc(id).delete().then(()=>{toast('Eliminado');reload();}).catch(()=>toast('Error al eliminar'));}
  else{DATA[key]=DATA[key].filter(x=>x.id!==id);toast('Eliminado');renderSection(currentSection);}
}

/* ====== SAVE genérico ====== */
function saveDoc(coll,id,data){
  if(FB_OK){
    const ref=id?db.collection(coll).doc(id):db.collection(coll).doc();
    ref.set(data,{merge:true}).then(()=>{toast(id?'Actualizado':'Creado');closeModal();reload();}).catch(()=>toast('Error al guardar'));
  }else{
    if(id){const it=DATA[coll].find(x=>x.id===id);Object.assign(it,data);}
    else DATA[coll].unshift({id:'demo'+Date.now(),...data});
    toast(id?'Actualizado':'Creado');closeModal();renderSection(currentSection);
  }
}

/* ====== AUTH ====== */
function showErr(m){const e=document.getElementById('auth-err');e.textContent=m;e.style.display='block';}
function doLogin(){
  const email=fv('li-email'),pass=fv('li-pass');
  if(!email||!pass)return showErr('Completa todos los campos.');
  if(!FB_OK){
    if(email===DEMO_ADMIN.email&&pass===DEMO_ADMIN.pass){CURRENT_USER={email,displayName:'Administrador',uid:'demo'};onLogged();}
    else showErr('Credenciales demo: '+DEMO_ADMIN.email+' / '+DEMO_ADMIN.pass);
    return;
  }
  auth.signInWithEmailAndPassword(email,pass).then(async cred=>{
    const adm=await db.collection('admins').doc(cred.user.uid).get();
    if(!adm.exists){showErr('Esta cuenta no tiene permisos de administrador.');auth.signOut();return;}
    CURRENT_USER=cred.user;onLogged();
  }).catch(()=>showErr('Correo o contraseña incorrectos.'));
}
function doLogout(){if(FB_OK)auth.signOut();else{CURRENT_USER=null;document.body.classList.remove('logged');document.getElementById('login').classList.remove('hidden');}}

/* ====== DATA LOAD ====== */
async function reload(){await loadData();renderSection(currentSection);}
async function loadData(){
  DATA={cursos:[...DEMO.cursos],webinars:[...DEMO.webinars],noticias:[...DEMO.noticias],material:[...DEMO.material],foro:[...DEMO.foro],miembros:[...DEMO.miembros],notificaciones:[...DEMO.notificaciones]};
  if(!FB_OK)return;
  try{
    const cols=['cursos','webinars','noticias','material'];
    const snaps=await Promise.all(cols.map(c=>db.collection(c).get()));
    cols.forEach((c,i)=>{if(!snaps[i].empty)DATA[c]=snaps[i].docs.map(d=>({id:d.id,...d.data()}));});
    const foro=await db.collection('foro_temas').get();if(!foro.empty)DATA.foro=foro.docs.map(d=>({id:d.id,...d.data()}));
    const miem=await db.collection('miembros').get();if(!miem.empty)DATA.miembros=miem.docs.map(d=>{const x=d.data();return {id:d.id,...x,alta:x.creado?.toDate?x.creado.toDate().toLocaleDateString('es-MX'):'—'};});
    const notif=await db.collection('notificaciones').orderBy('fecha','desc').get();if(!notif.empty)DATA.notificaciones=notif.docs.map(d=>({id:d.id,...d.data()}));
  }catch(e){console.warn('Firestore:',e.message);}
}

/* ====== UI helpers ====== */
const esc=s=>(s==null?'':String(s)).replace(/"/g,'&quot;').replace(/</g,'&lt;');
const fv=id=>document.getElementById(id)?.value||'';
function initials(){const n=CURRENT_USER?.displayName||CURRENT_USER?.email||'A';return n.trim().split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();}
function refreshUserUI(){document.getElementById('u-name').textContent=CURRENT_USER?.displayName||'Admin';document.getElementById('u-email').textContent=CURRENT_USER?.email||'';document.getElementById('u-av').textContent=initials();}
function toggleSidebar(open){const sb=document.getElementById('sidebar'),bd=document.getElementById('sb-backdrop');if(open===undefined)open=!sb.classList.contains('open');sb.classList.toggle('open',open);bd.classList.toggle('open',open);}
function toggleTheme(){const cur=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=cur;try{localStorage.setItem('imdac-admin-theme',cur);}catch(e){}updateThemeIcon();}
function updateThemeIcon(){const btn=document.getElementById('theme-btn');if(!btn)return;const dark=document.documentElement.dataset.theme==='dark';btn.innerHTML=dark?'<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/></svg>':'<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>';btn.title=dark?'Modo claro':'Modo oscuro';}
function toast(m){const t=document.getElementById('toast');t.textContent=m;t.classList.add('show');clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove('show'),2600);}

/* ====== ARRANQUE ====== */
async function onLogged(){
  document.body.classList.add('logged');document.getElementById('login').classList.add('hidden');
  renderSidebar();refreshUserUI();updateThemeIcon();
  await loadData();go('dashboard');
}
window.addEventListener('DOMContentLoaded',()=>{
  try{const t=localStorage.getItem('imdac-admin-theme');if(t)document.documentElement.dataset.theme=t;}catch(e){}
  if(FB_OK){
    auth.onAuthStateChanged(async u=>{
      document.getElementById('boot').classList.add('hide');
      if(u){const adm=await db.collection('admins').doc(u.uid).get();if(adm.exists){CURRENT_USER=u;onLogged();}else{auth.signOut();document.getElementById('login').classList.remove('hidden');}}
      else document.getElementById('login').classList.remove('hidden');
    });
  }else{document.getElementById('boot').classList.add('hide');document.getElementById('login').classList.remove('hidden');}
});

/* ====== DATOS DEMO ====== */
const DEMO={
  cursos:[
    {id:'c1',titulo:'Diseño Estructural de Concreto Reforzado',categoria:'Estructuras',nivel:'Intermedio',dripDias:0,clases:3,img:'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=400&q=70',desc:'Fundamentos del diseño de elementos de concreto según NTC.',listaClases:[{titulo:'Introducción y normativa',duracion:'2 Horas',videoUrl:''},{titulo:'Diseño de vigas',duracion:'2 Horas',videoUrl:''},{titulo:'Diseño de columnas',duracion:'2 Horas',videoUrl:''}]},
    {id:'c2',titulo:'Presupuestos y Precios Unitarios de Obra',categoria:'Costos y Presupuestos',nivel:'Básico',dripDias:0,clases:0,img:'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400&q=70',desc:'Integración de precios unitarios.',listaClases:[]},
  ],
  webinars:[],
  noticias:[{id:'n1',titulo:'Nuevas Normas Técnicas Complementarias entran en vigor',fuente:'CMIC',resumen:'Actualización de requisitos de diseño estructural.',fecha:'30/5/2026',img:'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=300&q=70',url:'#'}],
  material:[],
  foro:[{id:'f1',titulo:'¿Qué software usan para presupuestar?',autor:'Arq. Demo',tag:'Costos',likes:3,vistas:12}],
  miembros:[{id:'m1',nombre:'Arq. Demo Usuario',email:'demo@imdac.mx',ciudad:'Tehuacán, Pue.',telefono:'238 000 0000',profesion:'Arquitecto',alta:'21/5/2026',bio:'Miembro de prueba.'}],
  notificaciones:[],
};

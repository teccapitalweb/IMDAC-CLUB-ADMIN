/* ============================================================
   IMDAC · PANEL DE ADMINISTRACIÓN — app.js
   Mismas colecciones Firestore que el Club. CRUD completo.
   ============================================================ */

/* ====== CONFIG — usar la MISMA cuenta Firebase que el Club ====== */
const firebaseConfig = {
  apiKey: "AIzaSyCps1AMDXyh9iAPDLVdzk4gNRyHRwtUedw",
  authDomain: "imdac-club-prod.firebaseapp.com",
  projectId: "imdac-club-prod",
  storageBucket: "imdac-club-prod.firebasestorage.app",
  messagingSenderId: "302004970658",
  appId: "1:302004970658:web:d390d5199220f2cb86e3fb"
};
// Credenciales demo (cuando Firebase no está configurado aún)
const DEMO_ADMIN = { email:"admin@imdac.mx", pass:"IMDACAdmin2026" };

/* ====== Webhook (acciones que Firestore solo no puede hacer, ej. borrar Firebase Auth) ====== */
const WEBHOOK_URL='https://imdac-club-webhook-production.up.railway.app';
const CLUB_URL='https://teccapitalweb.github.io/IMDAC-CLUB';
async function apiFetch(path,{method='POST',body}={}){
  if(!CURRENT_USER||CURRENT_USER.uid==='demo'||typeof CURRENT_USER.getIdToken!=='function')throw new Error('Inicia sesión con una cuenta admin real para esta acción');
  const token=await CURRENT_USER.getIdToken();
  const response=await fetch(WEBHOOK_URL+path,{
    method,
    headers:{'Authorization':'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},
    body:body?JSON.stringify(body):undefined,
    cache:'no-store'
  });
  let data={};try{data=await response.json();}catch(e){}
  if(!response.ok){throw new Error(data.error||'No se pudo completar la solicitud');}
  return data;
}

let db=null, auth=null, FB_OK=false;
try{
  // App con NOMBRE propio → sesión independiente de la del Club (mismo dominio, distinta llave)
  const _adminApp=firebase.initializeApp(firebaseConfig,'imdac-admin');
  auth=_adminApp.auth(); db=_adminApp.firestore();
  FB_OK = firebaseConfig.apiKey && !firebaseConfig.apiKey.includes("REEMPLAZAR");
}catch(e){ console.warn("Firebase sin configurar — modo demo.",e); }

let CURRENT_USER=null;
let DATA={cursos:[],webinars:[],noticias:[],material:[],foro:[],miembros:[],notificaciones:[],directorio:[],certificados:[],datos_curiosos:[],encuestas:[]};
let CATS=["Estructuras","Instalaciones","Costos y Presupuestos","Topografía","Diseño CAD","Normatividad","Sustentabilidad","Gestión de Obra"];
const NIVELES=["Básico","Intermedio","Avanzado"];
const ESTADOS=["Publicado","Borrador"];

/* ====== "Descubre algo nuevo" — igual que DulceLab (Pages.noticias en
   vip-admin.html): reemplaza las noticias externas por datos propios que
   rotan solos cada día, sin backend (ver _discoverPickDaily). Usa las mismas
   8 categorías que ya existen para los cursos, para no inventar una taxonomía
   aparte. La colección real es 'datos_curiosos' — mismo nombre que DulceLab,
   para que ambos proyectos se puedan comparar línea a línea. */
const DISCOVER_CAT_META={
  'Estructuras':{color:'#FF2C2C',icon:'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5'},
  'Instalaciones':{color:'#F59E0B',icon:'M13 10V3L4 14h7v7l9-11h-7z'},
  'Costos y Presupuestos':{color:'#A16207',icon:'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z'},
  'Topografía':{color:'#3B82F6',icon:'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7'},
  'Diseño CAD':{color:'#9333EA',icon:'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z'},
  'Normatividad':{color:'#0891B2',icon:'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z'},
  'Sustentabilidad':{color:'#16A34A',icon:'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z'},
  'Gestión de Obra':{color:'#4F46E5',icon:'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4'}
};
const DISCOVER_TIPOS=['¿Sabías que?','Tip IMDAC','Error común','Técnica rápida','Normativa de la semana','Dato de negocio','Seguridad en 1 minuto','Reto rápido'];
const DISCOVER_LIBRARY=[
  {id:1,categoria:'Estructuras',tipo:'¿Sabías que?',titulo:'El concreto no se seca, se cura',resumen:'Gana resistencia por una reacción química con el agua (hidratación), no por evaporación.',contenido:'Si el concreto perdiera agua por evaporación antes de hidratarse por completo, el cemento no alcanza su resistencia de diseño y queda poroso y débil. Por eso se cura manteniéndolo húmedo, no dejándolo "secar" al sol.',consejo:'Cura el concreto con agua, costales húmedos o membrana de curado mínimo 7 días en climas normales.',imagen:null,cursoRelacionado:null},
  {id:2,categoria:'Estructuras',tipo:'Error común',titulo:'Agregar agua extra a la mezcla "para que fluya mejor"',resumen:'Más agua de la especificada en el diseño de mezcla reduce la resistencia final del concreto.',contenido:'La relación agua/cemento determina directamente la resistencia del concreto. Agregar agua en obra para facilitar el colado diluye la mezcla y puede bajar la resistencia de forma importante, aunque en el momento "se vea mejor".',consejo:'Si necesitas más trabajabilidad, pide al proveedor un aditivo plastificante, no agregues agua en obra.',imagen:null,cursoRelacionado:null},
  {id:3,categoria:'Estructuras',tipo:'Técnica rápida',titulo:'¿Por qué el acero y el concreto trabajan juntos?',resumen:'El concreto resiste bien la compresión; el acero de refuerzo resiste la tensión que el concreto no soporta.',contenido:'Un elemento de concreto simple se fisura fácilmente al flexionarse porque la zona en tensión falla primero. El acero de refuerzo se coloca en esas zonas para absorber esa tensión, formando el concreto reforzado.',consejo:'Revisa siempre el recubrimiento mínimo del acero: muy poco lo expone a corrosión, de más reduce la sección efectiva.',imagen:null,cursoRelacionado:null},
  {id:4,categoria:'Instalaciones',tipo:'Normativa de la semana',titulo:'La pendiente del drenaje sanitario no es opcional',resumen:'Una tubería sanitaria sin la pendiente mínima no desaloja por gravedad, aunque "se vea derecha".',contenido:'Las tuberías de drenaje funcionan por gravedad, no por presión. Una pendiente insuficiente provoca que los sólidos se queden estancados y tapen la línea con el tiempo.',consejo:'Verifica la pendiente con nivel láser antes de cubrir la tubería, no después.',imagen:null,cursoRelacionado:null},
  {id:5,categoria:'Instalaciones',tipo:'¿Sabías que?',titulo:'¿Qué es el golpe de ariete?',resumen:'Es el sonido y la vibración que se produce cuando se cierra una llave de golpe y el agua se detiene bruscamente.',contenido:'Cuando el flujo de agua se detiene repentinamente, su energía cinética se convierte en un pico de presión que viaja por la tubería, generando el característico golpeteo y, con el tiempo, puede dañar válvulas y conexiones.',consejo:'Las válvulas de cierre lento y las cámaras de aire reducen este efecto en instalaciones hidráulicas.',imagen:null,cursoRelacionado:null},
  {id:6,categoria:'Instalaciones',tipo:'Seguridad en 1 minuto',titulo:'No mezclar tuberías de cobre y acero galvanizado sin aislar',resumen:'El contacto directo entre dos metales distintos en presencia de agua acelera la corrosión de uno de ellos.',contenido:'Es corrosión galvánica: cuando dos metales con distinto potencial electroquímico están en contacto y hay un electrolito (el agua), el metal menos noble se corroe más rápido de lo normal.',consejo:'Usa un niple o conexión dieléctrica para separar eléctricamente ambos materiales.',imagen:null,cursoRelacionado:null},
  {id:7,categoria:'Costos y Presupuestos',tipo:'Dato de negocio',titulo:'Costo directo no es lo mismo que precio de venta',resumen:'Entre el costo de materiales y mano de obra, y el precio que se cobra, debe existir un margen que cubra indirectos y utilidad.',contenido:'El costo directo cubre materiales, mano de obra y equipo de una partida. El presupuesto también debe incluir costos indirectos (administración, supervisión, imprevistos) y la utilidad — cobrar solo el costo directo es, en la práctica, trabajar a pérdida.',consejo:'Define tu porcentaje de indirectos y utilidad antes de cotizar, no al final.',imagen:null,cursoRelacionado:null},
  {id:8,categoria:'Costos y Presupuestos',tipo:'Error común',titulo:'No registrar el desperdicio de material en el presupuesto',resumen:'Varillas, block, cerámica y otros materiales siempre generan un porcentaje de merma que debe presupuestarse.',contenido:'Ningún material se aprovecha al 100%: cortes, roturas y sobrantes son normales. No incluir un porcentaje de desperdicio en el presupuesto genera compras de último momento a precios peores y retrasos.',consejo:'Revisa los porcentajes de merma típicos por partida antes de armar el presupuesto, no los inventes.',imagen:null,cursoRelacionado:null},
  {id:9,categoria:'Costos y Presupuestos',tipo:'¿Sabías que?',titulo:'La curva de inversión de una obra casi nunca es una línea recta',resumen:'El gasto real de una obra suele seguir una forma de "S": lento al inicio, acelerado a la mitad, lento al cierre.',contenido:'Al arranque el gasto es bajo (trámites, preliminares); se acelera durante la construcción gruesa; y vuelve a bajar en acabados y cierre. Por eso la "curva S" es la herramienta estándar para programar y controlar el flujo de efectivo.',consejo:'Compara tu curva S programada contra la real cada mes — una desviación grande y sostenida es una alerta temprana.',imagen:null,cursoRelacionado:null},
  {id:10,categoria:'Topografía',tipo:'¿Sabías que?',titulo:'¿Qué es un banco de nivel (BM)?',resumen:'Es un punto fijo de referencia con elevación conocida del que parten todas las mediciones de nivel de una obra.',contenido:'Sin un BM confiable, cada medición de altura en obra sería relativa a un punto distinto, haciendo imposible coordinar niveles entre cimentación, pisos e instalaciones.',consejo:'Coloca al menos dos BM en puntos que no se vayan a mover ni a excavar, por si uno se pierde.',imagen:null,cursoRelacionado:null},
  {id:11,categoria:'Topografía',tipo:'Error común',titulo:'Trazar la obra sin verificar el ángulo recto (escuadría)',resumen:'Un trazo "a ojo" puede parecer correcto y acumular un error que solo se nota hasta que se levantan los muros.',contenido:'Pequeños errores de escuadría al trazar los ejes se amplifican conforme avanza la construcción, hasta volverse un problema real al colocar puertas, ventanas o losas prefabricadas.',consejo:'Verifica la escuadría con el método 3-4-5 (triángulo egipcio) o con estación total antes de fijar el trazo definitivo.',imagen:null,cursoRelacionado:null},
  {id:12,categoria:'Topografía',tipo:'Técnica rápida',titulo:'Nivel de piso terminado vs. nivel de plantilla',resumen:'No son el mismo nivel: entre ambos hay espesores de piso, mortero y, a veces, instalaciones.',contenido:'Confundir estos niveles en planos es una causa común de sorpresas en obra: un piso que no cuadra con el nivel de banqueta, o instalaciones que quedan muy cerca de la superficie terminada.',consejo:'Siempre confirma a qué nivel se refiere una cota antes de trazar: piso terminado, losa estructural o plantilla.',imagen:null,cursoRelacionado:null},
  {id:13,categoria:'Diseño CAD',tipo:'Técnica rápida',titulo:'¿Qué es un plano "as built"?',resumen:'Es el plano que refleja cómo quedó realmente construida la obra, no cómo se diseñó originalmente.',contenido:'Durante la construcción casi siempre hay ajustes: una instalación que se recorrió, un muro que cambió de posición. El as built documenta esos cambios y es la referencia real para mantenimiento o remodelaciones futuras.',consejo:'Actualiza el as built conforme avanza la obra, no lo dejes para el final cuando ya nadie recuerda los cambios.',imagen:null,cursoRelacionado:null},
  {id:14,categoria:'Diseño CAD',tipo:'Dato de negocio',titulo:'El proyecto ejecutivo no es lo mismo que el anteproyecto',resumen:'El anteproyecto define la idea general; el ejecutivo trae el detalle constructivo listo para licitar y construir.',contenido:'Un anteproyecto (plantas, cortes y fachadas a nivel conceptual) no tiene el nivel de detalle para cotizar con precisión ni para que un contratista construya sin interpretar. El ejecutivo incluye especificaciones y detalles constructivos coordinados.',consejo:'Nunca cotices una obra completa solo con planos de anteproyecto — el margen de error es demasiado alto.',imagen:null,cursoRelacionado:null},
  {id:15,categoria:'Diseño CAD',tipo:'¿Sabías que?',titulo:'Las capas (layers) en CAD no son solo organización visual',resumen:'Un buen manejo de capas permite activar o desactivar información completa (instalaciones, acabados, estructura) sin borrar nada.',contenido:'Cuando arquitectura, estructura e instalaciones se superponen por capas, es mucho más fácil detectar conflictos —como una viga que choca con un ducto— antes de que lleguen a obra.',consejo:'Define una convención de capas desde el inicio del proyecto y respétala en todas las disciplinas.',imagen:null,cursoRelacionado:null},
  {id:16,categoria:'Normatividad',tipo:'Normativa de la semana',titulo:'La licencia de uso de suelo va antes que el permiso de construcción',resumen:'Confirma que el proyecto que quieres construir está permitido en ese predio, antes de invertir en el proyecto ejecutivo completo.',contenido:'Pagar el proyecto ejecutivo completo antes de confirmar el uso de suelo es un riesgo común: si el uso pretendido no está permitido en esa zona, ese trabajo puede no servir tal cual estaba planeado.',consejo:'Verifica el uso de suelo en la autoridad municipal correspondiente desde la etapa de factibilidad del proyecto.',imagen:null,cursoRelacionado:null},
  {id:17,categoria:'Normatividad',tipo:'¿Sabías que?',titulo:'Las Normas Técnicas Complementarias no son iguales en todo México',resumen:'Cada estado o municipio puede tener sus propios reglamentos de construcción y normas técnicas, con requisitos distintos.',contenido:'Un diseño estructural o de instalaciones que cumple en una ciudad no necesariamente cumple en otra, porque los reglamentos locales —y las condiciones sísmicas o de viento de cada zona— pueden variar.',consejo:'Siempre verifica el reglamento de construcción vigente del municipio donde se construye, no asumas que es el mismo de otro proyecto.',imagen:null,cursoRelacionado:null},
  {id:18,categoria:'Normatividad',tipo:'Error común',titulo:'Empezar la obra antes de tener el permiso de construcción',resumen:'Iniciar sin el permiso vigente puede derivar en suspensión de obra, multas o, en casos graves, orden de demolición.',contenido:'El permiso de construcción certifica que el proyecto fue revisado contra el reglamento vigente (estructura, instalaciones, uso de suelo). Construir sin él expone al propietario y al responsable de obra a sanciones.',consejo:'Guarda copia del permiso vigente en la obra — es de los primeros documentos que pide una autoridad en una inspección.',imagen:null,cursoRelacionado:null},
  {id:19,categoria:'Sustentabilidad',tipo:'¿Sabías que?',titulo:'La orientación del edificio cambia su consumo de energía',resumen:'Una fachada mal orientada hacia el sol de la tarde puede disparar el uso de aire acondicionado todo el año.',contenido:'La ganancia solar varía mucho según la orientación y la hora del día. Pensar la orientación, los aleros y la protección solar desde el diseño reduce la necesidad de climatización artificial.',consejo:'Revisa la carta solar del sitio antes de definir la orientación de las fachadas con mayor área acristalada.',imagen:null,cursoRelacionado:null},
  {id:20,categoria:'Sustentabilidad',tipo:'Dato de negocio',titulo:'Un edificio eficiente no siempre cuesta más construirlo',resumen:'Muchas estrategias de sustentabilidad (orientación, ventilación cruzada, aislamiento) son decisiones de diseño, no gasto extra.',contenido:'El mito de que "sustentable es caro" suele venir de pensar solo en tecnología. Decisiones de diseño pasivo —orientación, sombreado, ventilación cruzada— mejoran el desempeño sin costo adicional significativo si se piensan desde el anteproyecto.',consejo:'Prioriza estrategias pasivas de diseño antes de evaluar tecnología activa adicional.',imagen:null,cursoRelacionado:null},
  {id:21,categoria:'Sustentabilidad',tipo:'Técnica rápida',titulo:'¿Qué es la ventilación cruzada?',resumen:'Es el flujo de aire natural que se logra al tener aberturas en lados opuestos (o distintos) de un espacio.',contenido:'Cuando el aire puede entrar por un lado del espacio y salir por otro, se genera una corriente natural que ayuda a enfriar y renovar el aire interior sin necesidad de ventiladores, dependiendo del clima.',consejo:'Ubica ventanas o aberturas en muros opuestos (o en ángulo) del mismo espacio, no solo en una fachada.',imagen:null,cursoRelacionado:null},
  {id:22,categoria:'Gestión de Obra',tipo:'¿Sabías que?',titulo:'La curva S también sirve para medir avance, no solo dinero',resumen:'Se puede construir una curva S de avance físico (% de obra) además de la de gasto, y compararlas entre sí.',contenido:'Comparar la curva S de gasto contra la de avance físico revela desviaciones que una sola no muestra: por ejemplo, gastar al ritmo programado pero con menos avance real del esperado.',consejo:'Lleva ambas curvas en paralelo en obras de cierta duración, no solo la de presupuesto.',imagen:null,cursoRelacionado:null},
  {id:23,categoria:'Gestión de Obra',tipo:'Reto rápido',titulo:'¿Sabes diferenciar ruta crítica de holgura en un programa de obra?',resumen:'La ruta crítica son las actividades que, si se retrasan, retrasan toda la obra. La holgura es el margen que sí se puede mover.',contenido:'En un programa tipo Gantt o CPM no todas las actividades tienen el mismo peso: las de la ruta crítica no tienen margen de retraso sin afectar la fecha de entrega. Identificarlas permite enfocar la supervisión donde realmente importa.',consejo:'Revisa primero el avance de las actividades en ruta crítica en cada junta de obra, antes que las demás.',imagen:null,cursoRelacionado:null},
  {id:24,categoria:'Gestión de Obra',tipo:'Seguridad en 1 minuto',titulo:'Una excavación sin ademe no es "solo un hoyo"',resumen:'Las zanjas y cepas de cierta profundidad necesitan entibado o ademe: el suelo puede colapsar sin previo aviso.',contenido:'Un derrumbe de zanja puede ocurrir en segundos y sin señales claras previas, especialmente en suelos sueltos o después de lluvia. Es de las causas de accidentes fatales más comunes en obra civil, y de las más prevenibles.',consejo:'A partir de 1.2-1.5 m de profundidad (según el tipo de suelo) usa ademe o taludes seguros — nunca entres a una zanja sin revisar esto.',imagen:null,cursoRelacionado:null}
];
// PRNG determinista (mulberry32) sembrado con la fecha de hoy: mismo día →
// misma selección/orden, sin backend ni localStorage. Igual que DulceLab.
function _mulberry32(seed){
  return function(){
    seed|=0;seed=seed+0x6D2B79F5|0;
    let t=Math.imul(seed^seed>>>15,1|seed);
    t=t+Math.imul(t^t>>>7,61|t)^t;
    return ((t^t>>>14)>>>0)/4294967296;
  };
}
function _discoverPickDaily(lib,n){
  const hoy=new Date();
  const semilla=hoy.getFullYear()*372+hoy.getMonth()*31+hoy.getDate();
  const rand=_mulberry32(semilla);
  const arr=lib.slice();
  for(let i=arr.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));const tmp=arr[i];arr[i]=arr[j];arr[j]=tmp;}
  return arr.slice(0,n);
}
/* estado de búsqueda / filtros / paginación */
let _search={}, _page={}, _filterCat='Todos', _filterEstado='Todos', _cursoSort='az', _cursoView='grid', _webinarFilter='proximas';
let _metricasPeriodo='30';
let _metricasExcluirMi=(()=>{try{return localStorage.getItem('imdac_metricas_notrack')!=='0';}catch(e){return true;}})();
let _appCfg={};
const PER_PAGE=8;

/* ====== NAV ====== */
/* Mismo orden y mismas secciones que el nav de vip-admin.html (DulceLab),
   ver C:\dev\dulcelab\dulcelab-club\vip-admin.html líneas 1230-1262. Las que
   llevan "needsData" no tienen hoy una fuente de datos real en IMDAC (no
   existe esa colección en imdac-club-webhook) — su página lo explica en vez
   de inventar números o quedar vacía sin decir por qué. */
const NAV=[
  {id:"dashboard",label:"Dashboard",group:"Resumen",icon:'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6'},
  {id:"cursos",label:"Cursos",group:"Contenido",icon:'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253'},
  {id:"webinars",label:"Clases en vivo",group:"Contenido",icon:'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z'},
  {id:"material",label:"PDFs y material",group:"Contenido",icon:'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'},
  {id:"certificados",label:"Certificados",group:"Contenido",icon:'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z'},
  {id:"preguntas",label:"Quiz del Arquitecto",group:"Contenido",icon:'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'},
  {id:"retosvisuales",label:"Detecta el error",group:"Contenido",icon:'M12 9v2m0 4h.01M5.07 19h13.86a2 2 0 001.73-3L13.73 4a2 2 0 00-3.46 0L3.34 16a2 2 0 001.73 3z'},
  {id:"tienda",label:"Tienda de recompensas",group:"Contenido",icon:'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4'},
  {id:"notificaciones",label:"Notificaciones",group:"Comunicación",icon:'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9'},
  {id:"miembros",label:"Miembros VIP",group:"Comunidad",icon:'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z'},
  {id:"pagos",label:"Pagos",group:"Comunidad",icon:'M3 10h18M7 15h1m4 0h1m-7 4h12a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z'},
  {id:"noticias",label:"Descubre algo nuevo",group:"Comunidad",icon:'M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9'},
  {id:"foro",label:"Foro",group:"Comunidad",icon:'M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z'},
  {id:"directorio",label:"Directorio",group:"Comunidad",icon:'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'},
  {id:"configuracion",label:"Configuración",group:"Cuenta",icon:'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z'},
  {id:"verpanel",label:"Ver panel de usuario",group:"Cuenta",icon:'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z'},
  {id:"pruebasvip",label:"Pruebas VIP",icon:'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z',needsData:true},
  {id:"encuesta",label:"Encuesta de clientes",group:"Comunidad",icon:'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-6l-4 4v-4z'},
];
/* El menú se parte en dos: las secciones activas se agrupan arriba con sus
   encabezados habituales, mientras que las funciones pendientes de datos o
   lógica propia se mantienen colapsadas bajo "Próximamente". */
function sbItemHTML(it){
  return `<div class="sb-item" data-sec="${it.id}" onclick="go('${it.id}')">
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="${it.icon}"/></svg>${it.label}
  </div>`;
}
function sbSectionsHTML(items){
  let out='',lastGroup=null;
  items.forEach(it=>{
    if(it.group!==lastGroup){out+=`<div class="sb-section">${esc(it.group)}</div>`;lastGroup=it.group;}
    out+=sbItemHTML(it);
  });
  return out;
}
let _sbGroupOpen=localStorage.getItem('imdac_admin_sb_proximamente')==='1';
function toggleSbGroup(){
  _sbGroupOpen=!_sbGroupOpen;
  localStorage.setItem('imdac_admin_sb_proximamente',_sbGroupOpen?'1':'0');
  renderSidebar();
  document.querySelectorAll('.sb-item').forEach(e=>e.classList.toggle('active',e.dataset.sec===currentSection));
}
function renderSidebar(){
  const core=NAV.filter(it=>!it.needsData), extra=NAV.filter(it=>it.needsData);
  document.getElementById('sb-nav').innerHTML=sbSectionsHTML(core)+
    `<div class="sb-group-toggle" onclick="toggleSbGroup()">
      <span>Próximamente</span>
      <svg class="sb-group-chev ${_sbGroupOpen?'open':''}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
    </div>
    <div class="sb-group ${_sbGroupOpen?'open':''}"><div>${extra.map(sbItemHTML).join('')}</div></div>`;
}

/* ====== ROUTER ====== */
let currentSection="dashboard";
function go(sec){
  currentSection=sec;
  const it=NAV.find(n=>n.id===sec);
  if(it?.needsData&&!_sbGroupOpen){_sbGroupOpen=true;localStorage.setItem('imdac_admin_sb_proximamente','1');renderSidebar();}
  document.querySelectorAll('.sb-item').forEach(e=>{
    const active=e.dataset.sec===sec;
    e.classList.toggle('active',active);
    if(active)e.scrollIntoView({block:'nearest'});
  });
  const topTitle=document.getElementById('tb-title');if(topTitle)topTitle.textContent=it?.label||'';
  if(window.innerWidth<=900)toggleSidebar(false);
  renderSection(sec);window.scrollTo(0,0);
}
function renderSection(sec){
  const R={dashboard:renderDashboard,cursos:renderCursos,webinars:renderWebinars,noticias:renderNoticias,
    material:renderMaterial,miembros:renderMiembros,foro:renderForo,notificaciones:renderNotificaciones,configuracion:renderConfig,verpanel:renderVerPanel,
    certificados:renderCertificados,directorio:renderDirectorioAdmin,preguntas:renderPreguntas,retosvisuales:renderRetosVisuales,tienda:renderTienda,
    metricas:renderMetricas,pruebas:renderPruebas,pruebasvip:()=>renderSinDatos('pruebasvip'),pagos:renderPagos,encuesta:renderEncuesta};
  document.getElementById('content').innerHTML=`<div class="section active">${(R[sec]||renderDashboard)()}</div>`;
}
/* Secciones que existen en el nav de DulceLab pero cuya fuente de datos no
   existe en IMDAC todavía (ningún lugar del webhook escribe pruebas, pagos
   o encuestas a Firestore). Decirlo aquí en vez de mostrar una tabla vacía
   sin explicación, o peor, números inventados. */
const SIN_DATOS_INFO={
  pruebasvip:{titulo:'Pruebas VIP',falta:'No existe un flujo de "prueba VIP por tiempo limitado" en IMDAC — ni el campo en miembros ni la lógica que lo otorgue.'},
};
function renderSinDatos(id){
  const info=SIN_DATOS_INFO[id]||{titulo:'Sección',falta:'Falta definir de dónde saldrían estos datos.'};
  return `<div class="page-head"><div><h1 class="page-h">${info.titulo}</h1><p class="page-sub">Esta sección existe en DulceLab pero IMDAC todavía no tiene datos reales para llenarla.</p></div></div>
  <div class="card"><div class="empty"><b>Sin fuente de datos todavía</b><span>${esc(info.falta)}</span></div></div>`;
}

function renderEncuesta(){
  const list=[...(DATA.encuestas||[])];
  const fecha=e=>e.creado?new Date(e.creado).toLocaleString('es-MX',{dateStyle:'medium',timeStyle:'short'}):'Fecha pendiente';
  const colores=['#ff2c2c','#8d1b25','#f59e0b','#3b82f6','#16a34a','#9333ea','#0891b2','#ec4899'];
  const conteo=values=>values.reduce((acc,value)=>{const label=String(value||'Sin respuesta');acc[label]=(acc[label]||0)+1;return acc;},{});
  const pastel=(titulo,subtitulo,values)=>{
    const datos=Object.entries(conteo(values)).sort((a,b)=>b[1]-a[1]);
    if(!datos.length)return `<article class="survey-chart"><h3>${esc(titulo)}</h3><p>${esc(subtitulo)}</p><div class="survey-empty">Aún no hay datos suficientes.</div></article>`;
    const total=datos.reduce((sum,[,cantidad])=>sum+cantidad,0);let desde=0;
    const segmentos=datos.map(([,cantidad],i)=>{const hasta=desde+(cantidad/total*100);const color=colores[i%colores.length];const tramo=`${color} ${desde.toFixed(2)}% ${hasta.toFixed(2)}%`;desde=hasta;return tramo;}).join(',');
    return `<article class="survey-chart"><h3>${esc(titulo)}</h3><p>${esc(subtitulo)}</p><div class="survey-chart-body"><div class="survey-pie" style="--pie:conic-gradient(${segmentos})"><strong>${total}</strong><span>respuestas</span></div><ul class="survey-legend">${datos.map(([label,cantidad],i)=>`<li><i style="background:${colores[i%colores.length]}"></i><span>${esc(label)}</span><b>${cantidad}</b></li>`).join('')}</ul></div></article>`;
  };
  return `<div class="page-head"><div><div class="pill-eyebrow">Ruta IMDAC · Datos reales</div><h1 class="page-h">Encuesta de clientes</h1><p class="page-sub">Respuestas anónimas de visitantes que terminaron su ruta de aprendizaje en IMDAC México.</p></div><button class="btn-add" onclick="reload()">Actualizar</button></div>
  <div class="stats">${statCard('Respuestas recibidas',list.length,'Sin datos personales','M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-6l-4 4v-4z')}${statCard('Ruta más reciente',list[0]?.recomendacion||'—','Según intereses seleccionados','M12 2l3 7h7l-5.5 4 2 7-6.5-4.2L5.5 20l2-7L2 9h7z')}</div>
  ${list.length?`<section class="survey-charts">${pastel('Perfil de los visitantes','Cómo se describen al iniciar su ruta.',list.map(e=>e.perfil))}${pastel('Interés o área de crecimiento','La segunda decisión de cada visitante.',list.map(e=>(e.respuestas||[])[1]))}${pastel('Modalidad preferida','Cómo prefieren tomar su capacitación.',list.map(e=>{const r=e.respuestas||[];return r[r.length-1];}))}</section><section class="survey-recent card"><div class="survey-recent-head"><h2>Respuestas recientes</h2><span>Detalle de las últimas ${list.length} respuestas</span></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Fecha</th><th>Perfil</th><th>Intereses / respuestas</th><th>Recomendación</th></tr></thead><tbody>${list.map(e=>`<tr><td>${esc(fecha(e))}</td><td><b>${esc(e.perfil)}</b></td><td>${esc((e.respuestas||[]).join(' · ')||'—')}</td><td><span class="tag green">${esc(e.recomendacion)}</span></td></tr>`).join('')}</tbody></table></div></section>`:`<div class="card"><div class="empty"><b>Aún no hay respuestas</b><span>Cuando un visitante termine la ruta de IMDAC México, aparecerá aquí.</span></div></div>`}`;
}

/* ====== PRUEBAS GRATUITAS ======
   Qué curso eligió cada cuenta como prueba gratuita (progreso/{uid}.cursoPrueba,
   escrito por POST /curso-prueba en el webhook) y cuántas de esas cuentas
   terminaron pagando (miembros/{uid}.estado==='Activo' -- mismo criterio que
   usa el resto de este panel para "activo", ej. el Dashboard y Miembros VIP). */
function fechaProgreso(p){
  if(p?.cursoPruebaAt?.toDate)return p.cursoPruebaAt.toDate();
  if(p?.cursoPruebaAt)return new Date(p.cursoPruebaAt);
  return null;
}
function renderPruebas(){
  const miembros=DATA.miembros||[];
  const progreso=DATA.progreso||[];
  const miembrosPorId=new Map(miembros.map(m=>[m.id,m]));
  const cursosPorId=new Map((DATA.cursos||[]).map(c=>[c.id,c]));
  const conPrueba=progreso.filter(p=>p.cursoPrueba);
  const idsConPrueba=new Set(conPrueba.map(p=>p.id));
  const totalCuentas=miembros.length;
  const sinElegir=miembros.filter(m=>!idsConPrueba.has(m.id)).length;
  const eligieronYPagaron=conPrueba.filter(p=>miembrosPorId.get(p.id)?.estado==='Activo').length;
  const pagaronSinElegir=miembros.filter(m=>m.estado==='Activo'&&!idsConPrueba.has(m.id)).length;
  const pct=totalCuentas?Math.round(conPrueba.length/totalCuentas*100):0;

  const porCurso={};
  conPrueba.forEach(p=>{porCurso[p.cursoPrueba]=(porCurso[p.cursoPrueba]||0)+1;});
  const cursosTop=Object.entries(porCurso).sort((a,b)=>b[1]-a[1]).slice(0,6);
  const maxCurso=cursosTop.length?cursosTop[0][1]:0;

  const hoy=new Date();hoy.setHours(0,0,0,0);
  const claveDia=d=>d.toISOString().slice(0,10);
  const dias=Array.from({length:14},(_,i)=>{const d=new Date(hoy);d.setDate(d.getDate()-(13-i));return d;});
  const conteoPorDia={};
  conPrueba.forEach(p=>{const f=fechaProgreso(p);if(!f)return;const d=new Date(f);d.setHours(0,0,0,0);const k=claveDia(d);conteoPorDia[k]=(conteoPorDia[k]||0)+1;});
  const porDia=dias.map(d=>({d,count:conteoPorDia[claveDia(d)]||0}));
  const maxDia=Math.max(1,...porDia.map(x=>x.count));

  const ultimas=conPrueba.slice().sort((a,b)=>(fechaProgreso(b)?.getTime()||0)-(fechaProgreso(a)?.getTime()||0)).slice(0,12);
  const filaPrueba=p=>{
    const m=miembrosPorId.get(p.id);
    const curso=cursosPorId.get(p.cursoPrueba);
    const pagado=m?.estado==='Activo';
    const f=fechaProgreso(p);
    return `<tr>
      <td><div class="t-cell"><div class="t-thumb" style="border-radius:9px;background:var(--rojo);color:#fff;display:grid;place-items:center;font-weight:700;font-family:var(--font-display)">${esc((m?.nombre||'?')[0].toUpperCase())}</div>
        <span class="t-title">${esc(m?.nombre||'Cuenta eliminada')}<br><span style="font-weight:400;color:var(--muted);font-size:.78rem">${esc(m?.email||p.id)}</span></span></div></td>
      <td>${esc(curso?.titulo||p.cursoPrueba)}</td>
      <td>${pagado?'<span class="tag green">Activo</span>':'<span class="tag gray">Sin pagar</span>'}</td>
      <td>${f?esc(f.toLocaleDateString('es-MX',{day:'2-digit',month:'short',year:'numeric'})):'—'}</td>
    </tr>`;
  };

  return `<div class="page-head"><div><div class="pill-eyebrow">Ruta IMDAC · Datos reales</div><h1 class="page-h">Pruebas gratuitas</h1><p class="page-sub">Qué curso eligen las cuentas nuevas como prueba gratuita y cuántas de ellas terminan activando la membresía.</p></div><button class="btn-ghost" onclick="reload()">Actualizar</button></div>
  <div class="stats">
    ${kpiCard('Pruebas elegidas',conPrueba.length,`${pct}% de las cuentas registradas (${totalCuentas})`,'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z')}
    ${kpiCard('Cuentas sin elegir',sinElegir,'Registradas y todavía sin seleccionar un curso.','M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z')}
    ${kpiCard('Eligieron y ya pagaron',eligieronYPagaron,'Personas que eligieron una prueba y activaron su membresía.','M13 7h8m0 0v8m0-8l-8 8-4-4-6 6')}
    ${kpiCard('Pagaron sin elegir curso',pagaronSinElegir,'Activaron la membresía sin usar una prueba.','M13 10V3L4 14h7v7l9-11h-7z')}
  </div>
  <div class="pruebas-cols">
    <div class="card" style="padding:22px">
      <h3 style="font-family:var(--font-display);font-size:1.02rem;margin:0 0 4px">Cursos más elegidos</h3>
      <p style="font-size:.78rem;color:var(--muted);margin:0 0 16px">Preferencias de las personas que ya seleccionaron su prueba.</p>
      ${cursosTop.length?cursosTop.map(([id,count])=>`<div class="pb-bar-row"><span class="pb-bar-label">${esc(cursosPorId.get(id)?.titulo||id)}</span><div class="pb-bar-track"><div class="pb-bar-fill" style="width:${maxCurso?Math.round(count/maxCurso*100):0}%"></div></div><b>${count}</b></div>`).join(''):'<div class="survey-empty">Aún no hay datos suficientes.</div>'}
    </div>
    <div class="card" style="padding:22px">
      <h3 style="font-family:var(--font-display);font-size:1.02rem;margin:0 0 4px">Pruebas elegidas por día</h3>
      <p style="font-size:.78rem;color:var(--muted);margin:0 0 16px">Últimos 14 días.</p>
      <div class="pb-daychart">
        ${porDia.map(({d,count})=>`<div class="pb-day" title="${count} prueba(s) el ${d.toLocaleDateString('es-MX')}"><div class="pb-day-bar" style="height:${count?Math.max(6,Math.round(count/maxDia*100)):2}%"></div><span>${d.getDate()}/${d.getMonth()+1}</span></div>`).join('')}
      </div>
    </div>
  </div>
  <section class="survey-recent card">
    <div class="survey-recent-head"><h2>Últimas pruebas elegidas</h2><span>Elección de curso y estado actual de la membresía.</span></div>
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Miembro</th><th>Curso elegido</th><th>Estado</th><th>Fecha</th></tr></thead>
    <tbody>${ultimas.length?ultimas.map(filaPrueba).join(''):'<tr><td colspan="4"><div class="empty"><b>Aún no hay pruebas elegidas</b><span>Aparecerán aquí en cuanto un socio elija su curso gratuito.</span></div></td></tr>'}</tbody></table></div>
  </section>`;
}

/* ====== MÉTRICAS DE VISITAS ======
   Primera entrega: lo esencial (visitas, personas distintas, cuentas
   nuevas, páginas más vistas, dispositivos). El mapa de calor, el embudo
   completo y las campañas UTM quedan para una siguiente entrega.
   Los eventos los escribe el webhook (POST /track, sin auth obligatorio)
   desde imdac-mexico (sitio público) y desde imdac-club (antes y después
   de iniciar sesión) -- ver analytics_visitas en Firestore. */
const METRICAS_PERIODOS={semana:7,'30':30,'90':90,'12m':365};
function _miVidAdmin(){
  try{
    let v=localStorage.getItem('imdac_vid');
    if(!v){v=(crypto.randomUUID?crypto.randomUUID():'v-'+Date.now()+'-'+Math.random().toString(16).slice(2));localStorage.setItem('imdac_vid',v);}
    return v;
  }catch(e){return '';}
}
function fechaVisita(v){
  if(v?.creada?.toDate)return v.creada.toDate();
  if(v?.creada)return new Date(v.creada);
  return null;
}
function setMetricasPeriodo(p){_metricasPeriodo=p;renderSection('metricas');}
function toggleMetricasExcluir(checked){
  _metricasExcluirMi=checked;
  try{localStorage.setItem('imdac_metricas_notrack',checked?'1':'0');}catch(e){}
  renderSection('metricas');
}
function renderMetricas(){
  const dias=METRICAS_PERIODOS[_metricasPeriodo]||30;
  const desde=new Date();desde.setHours(0,0,0,0);desde.setDate(desde.getDate()-(dias-1));
  const miVid=_miVidAdmin();
  const todas=(DATA.analytics_visitas||[]).filter(v=>!_metricasExcluirMi||v.vid!==miVid);
  const eventos=todas.filter(v=>{const f=fechaVisita(v);return f&&f>=desde;});

  const visitas=eventos.length;
  const vids=new Set(eventos.map(v=>v.vid).filter(Boolean));
  const personas=vids.size;
  const cuentasNuevas=(DATA.miembros||[]).filter(m=>fechaMiembro(m)>=desde.getTime()).length;
  const promedio=dias?Math.round(visitas/dias):0;

  // Visitas por día: agrupa por día si el periodo es corto, por semana si
  // son 90 días, por mes si es 12 meses -- para no dibujar 365 barras.
  const unidad=dias<=30?'dia':dias<=90?'semana':'mes';
  const claveBucket=f=>{
    if(unidad==='dia')return f.toISOString().slice(0,10);
    if(unidad==='mes')return f.getFullYear()+'-'+String(f.getMonth()+1).padStart(2,'0');
    const inicioSemana=new Date(f);inicioSemana.setDate(f.getDate()-f.getDay());
    return inicioSemana.toISOString().slice(0,10);
  };
  const etiquetaBucket=k=>{
    if(unidad==='mes'){const[y,m]=k.split('-');return new Date(+y,+m-1,1).toLocaleDateString('es-MX',{month:'short'});}
    const d=new Date(k+'T00:00:00');
    return unidad==='dia'?`${d.getDate()}/${d.getMonth()+1}`:`${d.getDate()}/${d.getMonth()+1}`;
  };
  const conteoBucket={};
  eventos.forEach(v=>{const f=fechaVisita(v);if(!f)return;const k=claveBucket(f);conteoBucket[k]=(conteoBucket[k]||0)+1;});
  const buckets=[];
  const cursor=new Date(desde);
  const hoy=new Date();hoy.setHours(0,0,0,0);
  while(cursor<=hoy){
    const k=claveBucket(cursor);
    if(!buckets.length||buckets[buckets.length-1].k!==k)buckets.push({k,count:0});
    cursor.setDate(cursor.getDate()+1);
  }
  buckets.forEach(b=>{b.count=conteoBucket[b.k]||0;});
  const maxBucket=Math.max(1,...buckets.map(b=>b.count));
  const pasoEtiqueta=Math.max(1,Math.ceil(buckets.length/10));

  const porPagina={};
  eventos.forEach(v=>{const p=v.pagina||v.ruta||'—';porPagina[p]=(porPagina[p]||0)+1;});
  const paginasTop=Object.entries(porPagina).sort((a,b)=>b[1]-a[1]).slice(0,6);
  const maxPagina=paginasTop.length?paginasTop[0][1]:0;

  const porDispositivo={movil:0,computadora:0,tablet:0};
  eventos.forEach(v=>{const d=porDispositivo.hasOwnProperty(v.dispositivo)?v.dispositivo:'computadora';porDispositivo[d]++;});
  const dispColores={movil:'#ff2c2c',computadora:'#3b82f6',tablet:'#f59e0b'};
  const dispLabel={movil:'Celular',computadora:'Computadora',tablet:'Tableta'};
  const dispDatos=Object.entries(porDispositivo).filter(([,n])=>n>0).sort((a,b)=>b[1]-a[1]);
  let desdePct=0;
  const segmentos=dispDatos.map(([k,n])=>{const hasta=desdePct+(visitas?n/visitas*100:0);const tramo=`${dispColores[k]} ${desdePct.toFixed(2)}% ${hasta.toFixed(2)}%`;desdePct=hasta;return tramo;}).join(',');

  const periodoBtn=(val,label)=>`<button class="${_metricasPeriodo===val?'active':''}" onclick="setMetricasPeriodo('${val}')">${label}</button>`;

  return `<div class="page-head"><div><div class="pill-eyebrow">Ruta IMDAC · Datos reales</div><h1 class="page-h">Métricas de visitas</h1><p class="page-sub">Cuánta gente visita IMDAC (sitio público y Club) y desde qué dispositivo. El conteo es anónimo.</p></div></div>
  <div class="card" style="padding:14px 18px;display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;margin-bottom:22px">
    <div class="live-filters" style="display:flex;gap:8px">${periodoBtn('semana','Semana')}${periodoBtn('30','30 días')}${periodoBtn('90','90 días')}${periodoBtn('12m','12 meses')}</div>
    <label style="display:flex;align-items:center;gap:8px;font-size:.84rem;color:var(--muted)"><input type="checkbox" ${_metricasExcluirMi?'checked':''} onchange="toggleMetricasExcluir(this.checked)"> No contar mis visitas en este navegador</label>
    <button class="btn-ghost" onclick="reload()">Actualizar</button>
  </div>
  <div class="stats">
    ${kpiCard('Visitas',visitas,'Páginas vistas','M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z')}
    ${kpiCard('Personas distintas',personas,'Visitantes únicos del periodo','M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z')}
    ${kpiCard('Cuentas nuevas',cuentasNuevas,'Personas que crearon su cuenta','M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z')}
    ${kpiCard('Promedio por día',promedio,`${visitas} visita${visitas!==1?'s':''} en ${dias} día${dias!==1?'s':''}`,'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14')}
  </div>
  <div class="card" style="padding:22px;margin-bottom:22px">
    <h3 style="font-family:var(--font-display);font-size:1.02rem;margin:0 0 4px">Visitas por día</h3>
    <p style="font-size:.78rem;color:var(--muted);margin:0 0 4px">Visitas durante el periodo seleccionado.</p>
    <div class="pb-daychart">
      ${buckets.map((b,i)=>`<div class="pb-day" title="${b.count} visita(s)"><div class="pb-day-bar" style="height:${b.count?Math.max(6,Math.round(b.count/maxBucket*100)):2}%"></div><span>${i%pasoEtiqueta===0?etiquetaBucket(b.k):''}</span></div>`).join('')}
    </div>
  </div>
  <div class="pruebas-cols">
    <div class="card" style="padding:22px">
      <h3 style="font-family:var(--font-display);font-size:1.02rem;margin:0 0 4px">Páginas más vistas</h3>
      <p style="font-size:.78rem;color:var(--muted);margin:0 0 16px">Por dónde entra la gente.</p>
      ${paginasTop.length?paginasTop.map(([pagina,count])=>`<div class="pb-bar-row"><span class="pb-bar-label">${esc(pagina)}</span><div class="pb-bar-track"><div class="pb-bar-fill" style="width:${maxPagina?Math.round(count/maxPagina*100):0}%"></div></div><b>${count}</b></div>`).join(''):'<div class="survey-empty">Aún no hay visitas en este periodo.</div>'}
    </div>
    <div class="card" style="padding:22px">
      <h3 style="font-family:var(--font-display);font-size:1.02rem;margin:0 0 4px">Dispositivos</h3>
      <p style="font-size:.78rem;color:var(--muted);margin:0 0 16px">Desde qué aparato entra la gente.</p>
      ${dispDatos.length?`<div class="survey-chart-body"><div class="survey-pie" style="--pie:conic-gradient(${segmentos})"><strong>${visitas}</strong><span>visitas</span></div><ul class="survey-legend">${dispDatos.map(([k,n])=>`<li><i style="background:${dispColores[k]}"></i><span>${dispLabel[k]}</span><b>${n} · ${visitas?Math.round(n/visitas*100):0}%</b></li>`).join('')}</ul></div>`:'<div class="survey-empty">Aún no hay visitas en este periodo.</div>'}
    </div>
  </div>`;
}

/* ====== DASHBOARD ====== */
/* Mismo layout que el Dashboard de superadmin de DulceLab (4 KPIs con
   sub-dato, banner "Requiere atención" y dos columnas Últimos miembros /
   Próximas clases) pero con datos reales de IMDAC — nada inventado: si no
   hay clases próximas, el banner y la columna lo dicen tal cual. */
function proximosWebinars(){
  const ahora=Date.now();
  return (DATA.webinars||[])
    .filter(w=>w.fechaISO&&new Date(w.fechaISO).getTime()>ahora)
    .sort((a,b)=>new Date(a.fechaISO)-new Date(b.fechaISO));
}
function fechaMiembro(m){
  if(m.creado?.toMillis)return m.creado.toMillis();
  if(m.creado?.toDate)return m.creado.toDate().getTime();
  const fecha=new Date(m.alta||0).getTime();
  return Number.isNaN(fecha)?0:fecha;
}
function nombreMiembro(m){return m.nombre||m.nombreCompleto||m.displayName||m.name||'Perfil pendiente de completar';}
function correoMiembro(m){return m.email||m.correo||'Sin correo registrado';}
function miembroVerificable(m){
  const nombre=String(m.nombre||m.nombreCompleto||m.displayName||m.name||'').trim();
  const correo=String(m.email||m.correo||'').trim();
  return Boolean(nombre)&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);
}
function renderDashboard(){
  const precio=+(_appCfg.precio)||499;
  const miembrosVerificados=DATA.miembros.filter(miembroVerificable);
  const activos=miembrosVerificados.filter(m=>m.estado==='Activo').length;
  const totalMiembros=miembrosVerificados.length;
  const pctActivos=totalMiembros?Math.round(activos/totalMiembros*100):0;
  const mrr=activos*precio;
  const money=n=>'$'+Math.round(n).toLocaleString('es-MX');
  const publicados=DATA.cursos.filter(c=>(c.estado||'Publicado')!=='Borrador').length;
  const borrador=DATA.cursos.length-publicados;
  const proximas=proximosWebinars();
  return `
  <div class="page-head"><div>
    <div class="pill-eyebrow">Operación · Club IMDAC</div>
    <h1 class="page-h">Panel administrativo</h1><p class="page-sub">Resumen de miembros, contenido y actividad. Los datos se actualizan desde Firestore.</p></div>
    <div style="display:flex;gap:10px">
      <button class="btn-ghost" onclick="go('cursos');newCurso()">+ Nuevo curso</button>
      <button class="btn-add" onclick="go('webinars');newWebinar()"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>Programar clase</button>
    </div>
  </div>
  <div class="stats">
    ${kpiCard('Miembros activos',`${activos}/${totalMiembros||0}`,`${pctActivos}% con acceso`,'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z')}
    ${kpiCard('Ingresos estimados',money(mrr),'MXN estimados por mes','M9 7h6m0 10v-3m-3 3h.01M9 17h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z')}
    ${kpiCard('Cursos activos',`${publicados}/${DATA.cursos.length}`,`${borrador} pendiente${borrador!==1?'s':''} de publicar`,'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253')}
    ${kpiCard('Próximas clases',proximas.length,proximas.length?`${proximas.length} sesión${proximas.length!==1?'es':''} programada${proximas.length!==1?'s':''}`:'Sin sesiones programadas','M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z')}
  </div>
  ${!proximas.length?`<div class="card" style="border-left:4px solid #b86b00;background:#fff8ec;padding:14px 18px;margin-bottom:18px;display:flex;align-items:center;justify-content:space-between;gap:12px">
    <div><b>⚠️ Requiere atención</b><div style="color:var(--muted);font-size:.86rem;margin-top:2px">Sin clases programadas</div></div>
    <button class="btn-ghost" onclick="go('webinars')">Revisar</button>
  </div>`:''}
  <div class="dash-cols">
    <div class="card">
      <div class="dash-card-head"><b>Últimos miembros</b><a onclick="go('miembros')">Ver todos →</a></div>
      ${[...miembrosVerificados].sort((a,b)=>fechaMiembro(b)-fechaMiembro(a)).slice(0,5).map(m=>{
        const activo=m.estado==='Activo';
        const nombre=nombreMiembro(m),correo=correoMiembro(m);
        return `<div class="dash-row"><div class="dash-row-av">${esc(nombre[0].toUpperCase())}</div>
          <div class="dash-row-body"><b>${esc(nombre)}</b><span>${esc(correo)}</span></div>
          <span class="tag ${activo?'green':'gray'}">${activo?'Activo':'Cancelado'}</span></div>`;
      }).join('')||'<div class="empty"><b>Sin miembros aún</b></div>'}
    </div>
    <div class="card">
      <div class="dash-card-head"><b>Próximas clases</b><a onclick="go('webinars')">Programar →</a></div>
      ${proximas.slice(0,5).map(w=>`<div class="dash-row"><div class="dash-row-av" style="background:var(--rojo)">📹</div>
        <div class="dash-row-body"><b>${esc(w.titulo||'Webinar')}</b><span>${esc(w.fecha||'')}</span></div></div>`).join('')||'<div class="empty"><b>Sin clases programadas</b></div>'}
    </div>
  </div>`;
}
function statCard(label,val,icon){return `<div class="stat"><div class="top"><div class="si"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="${icon}"/></svg></div></div><b>${val}</b><span>${label}</span></div>`;}
function kpiCard(label,val,sub,icon){return `<div class="stat"><div class="top"><div class="si"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="${icon}"/></svg></div></div><b>${val}</b><span>${label}</span><div class="kpi-sub">${sub}</div></div>`;}

/* ====== INFRA DE LISTAS: búsqueda + filtros + paginación ====== */
const ROWCFG={
  cursos:{key:'cursos',fields:c=>[c.titulo,c.categoria,c.instructor],row:cursoRow},
  webinars:{key:'webinars',fields:w=>[w.titulo,w.fecha],row:webinarRow},
  noticias:{key:'noticias',fields:n=>[n.titulo,n.fuente],row:noticiaRow},
  material:{key:'material',fields:m=>[m.titulo,m.desc],row:materialRow},
  miembros:{key:'miembros',fields:m=>[m.nombre,m.email,m.ciudad],row:miembroRow},
  foro:{key:'foro',fields:t=>[t.titulo,t.autor],row:foroRow},
  directorio:{key:'directorio',fields:d=>[d.nombre,d.empresa,d.puesto,d.sector],row:dirRow},
};
function getList(sec){
  const cfg=ROWCFG[sec]; let list=DATA[cfg.key]||[];
  if(sec==='miembros')list=list.filter(miembroVerificable);
  const q=(_search[sec]||'').toLowerCase().trim();
  if(q)list=list.filter(it=>cfg.fields(it).join(' ').toLowerCase().includes(q));
  if(sec==='cursos'){
    list=list.filter(c=>(_filterCat==='Todos'||c.categoria===_filterCat)&&(_filterEstado==='Todos'||(c.estado||'Publicado')===_filterEstado));
    list=list.slice().sort((a,b)=>{
      if(_cursoSort==='horas')return horasCurso(b)-horasCurso(a);
      if(_cursoSort==='populares')return (Number(b.order)||0)-(Number(a.order)||0);
      return (a.titulo||'').localeCompare(b.titulo||'','es');
    });
  }
  const total=list.length, pages=Math.max(1,Math.ceil(total/PER_PAGE));
  const page=Math.min(_page[sec]||1,pages); _page[sec]=page;
  return {pageItems:list.slice((page-1)*PER_PAGE,page*PER_PAGE),total,pages,page};
}
function rowsHTML(sec){
  const cfg=ROWCFG[sec]; const {pageItems,total}=getList(sec);
  const vacio=sec==='directorio'?'Aparecerán aquí en cuanto los socios arman su tarjeta desde el Club.':'Crea el primero con el botón de arriba.';
  if(!pageItems.length)return `<tr><td colspan="20"><div class="empty"><b>${total?'Sin resultados':'Aún no hay registros'}</b><span>${total?'Prueba con otra búsqueda o filtro.':vacio}</span></div></td></tr>`;
  return pageItems.map(cfg.row).join('');
}
function pagerInner(sec){
  const {total,pages,page}=getList(sec); if(pages<=1)return total?`<div class="pager"><span style="color:var(--muted);font-size:.85rem">${total} registro(s)</span><span></span></div>`:'';
  return `<div class="pager"><span style="color:var(--muted);font-size:.85rem">${total} registros · página ${page} de ${pages}</span><div style="display:flex;gap:8px"><button onclick="setPage('${sec}',-1)" ${page<=1?'disabled':''}>Anterior</button><button onclick="setPage('${sec}',1)" ${page>=pages?'disabled':''}>Siguiente</button></div></div>`;
}
function rebuildRows(){
  if(currentSection==='cursos'){
    if(_cursoView==='list'){
      const b=document.getElementById('tbl-body'); if(!b)return;
      b.innerHTML=rowsHTML('cursos');
    }else{
      const g=document.getElementById('curso-grid'); if(!g)return;
      const {pageItems,total}=getList('cursos');
      g.innerHTML=pageItems.length?pageItems.map(cursoCard).join(''):`<div class="card" style="grid-column:1/-1"><div class="empty"><b>${total?'Sin resultados':'Aún no hay cursos'}</b><span>${total?'Prueba con otra búsqueda o filtro.':'Crea el primero con el botón de arriba.'}</span></div></div>`;
    }
    const p=document.getElementById('tbl-pager'); if(p)p.innerHTML=pagerInner('cursos');
    return;
  }
  if(currentSection==='certificados'){
    const c=document.getElementById('cert-list'); if(!c)return;
    const list=certificadosFiltrados();
    c.innerHTML=list.length?list.map(certCard).join(''):`<div class="card"><div class="empty"><b>${DATA.certificados.length?'Sin resultados':'Aún no hay registros'}</b><span>${DATA.certificados.length?'Prueba con otra búsqueda.':'Crea el primero con el botón de arriba.'}</span></div></div>`;
    return;
  }
  if(currentSection==='miembros'){
    const c=document.getElementById('mb-list'); if(!c)return;
    const list=miembrosFiltrados();
    c.innerHTML=list.length?list.map(miembroCard).join(''):`<div class="card"><div class="empty"><b>${DATA.miembros.length?'Sin resultados':'Aún no hay miembros'}</b><span>${DATA.miembros.length?'Prueba con otro filtro o búsqueda.':''}</span></div></div>`;
    return;
  }
  const b=document.getElementById('tbl-body');if(!b)return;b.innerHTML=rowsHTML(currentSection);const p=document.getElementById('tbl-pager');if(p)p.innerHTML=pagerInner(currentSection);
}
function onSearch(sec,v){_search[sec]=v;_page[sec]=1;rebuildRows();}
function setPage(sec,d){_page[sec]=(_page[sec]||1)+d;rebuildRows();}
function setCatFilter(c){_filterCat=c;_page.cursos=1;renderSection('cursos');}
function setEstadoFilter(e){_filterEstado=e;_page.cursos=1;renderSection('cursos');}
function setCursoSort(v){_cursoSort=v;renderSection('cursos');}
function setCursoView(v){_cursoView=v;renderSection('cursos');}
function searchBar(sec,ph){return `<div class="search-admin"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg><input value="${esc(_search[sec]||'')}" oninput="onSearch('${sec}',this.value)" placeholder="${ph}"></div>`;}
function listSection(sec,o){
  const add=o.addFn?`<button class="btn-add" onclick="${o.addFn}"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>${o.addLabel}</button>`:'';
  return `<div class="page-head"><div><h1 class="page-h">${o.title}</h1><p class="page-sub">${o.sub}</p></div>${add}</div>
    ${searchBar(sec,o.search||'Buscar...')}
    <div class="card"><div class="tbl-wrap"><table class="tbl"><thead><tr>${o.head.map(h=>`<th>${h}</th>`).join('')}<th></th></tr></thead>
    <tbody id="tbl-body">${rowsHTML(sec)}</tbody></table></div><div id="tbl-pager">${pagerInner(sec)}</div></div>`;
}

/* ====== ROW FUNCTIONS ====== */
function cursoRow(c){const est=(c.estado||'Publicado')==='Borrador';return `<tr>
  <td><div class="t-cell"><div class="t-thumb" style="background-image:url('${esc(driveImg(c.img))}')"></div><span class="t-title">${c.titulo}${c.esPruebaGratuita? ' <span class="tag">Prueba gratuita</span>':''}</span></div></td>
  <td><span class="tag">${c.categoria||'—'}</span></td>
  <td>${c.nivel||'—'}</td>
  <td>${(c.listaClases?c.listaClases.length:c.clases)||0}</td>
  <td>${est?'<span class="tag gray">Borrador</span>':'<span class="tag green">Publicado</span>'}</td>
  <td><div class="row-actions">
    <button class="ico-btn" onclick="previewCurso('${c.id}')" title="Vista previa"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg></button>
    <button class="ico-btn" onclick="duplicarCurso('${c.id}')" title="Duplicar"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg></button>
    <button class="ico-btn" onclick="editItem('cursos','${c.id}')" title="Editar"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg></button>
    <button class="ico-btn del" onclick="delItem('cursos','${c.id}')" title="Eliminar"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>
  </div></td></tr>`;}
function webinarRow(w){return `<tr><td class="t-title">${w.titulo}</td><td>${w.fecha||'—'}</td>
  <td>${w.grabacion?'<span class="tag green">Con grabación</span>':'<span class="tag gray">En vivo</span>'}</td>
  <td>${actions('webinars',w.id)}</td></tr>`;}
function noticiaRow(n){return `<tr><td><div class="t-cell"><div class="t-thumb" style="background-image:url('${esc(driveImg(n.img))}')"></div><span class="t-title">${n.titulo}</span></div></td>
  <td><span class="tag">${n.fuente||'IMDAC'}</span></td><td>${n.fecha||'—'}</td><td>${actions('noticias',n.id)}</td></tr>`;}
function materialRow(m){return `<tr><td class="t-title">📄 ${m.titulo}</td><td>${m.desc||'—'}</td><td>${actions('material',m.id)}</td></tr>`;}
function miembroRow(m){return `<tr>
  <td><div class="t-cell"><div class="t-thumb" style="border-radius:9px;background:var(--rojo);color:#fff;display:grid;place-items:center;font-weight:700;font-family:var(--font-display)">${(m.nombre||'U')[0].toUpperCase()}</div><span class="t-title">${m.nombre||'—'}</span></div></td>
  <td>${m.email||'—'}</td><td>${m.ciudad||'—'}</td><td>${(m.estado||'Activo')==='Cancelado'?'<span class="tag gray">Cancelado</span>':(m.estado==='Suspendido'?'<span class="tag">Suspendido</span>':'<span class="tag green">Activo</span>')}</td>
  <td><div class="row-actions"><button class="ico-btn" onclick="verMiembro('${m.id}')" title="Ver"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg></button>
  <button class="ico-btn del" onclick="delItem('miembros','${m.id}')" title="Eliminar"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button></div></td></tr>`;}
function foroRow(t){return `<tr><td class="t-title">${t.titulo}</td><td>${t.autor||'—'}</td><td><span class="tag">${t.tag||'General'}</span></td>
  <td>❤️ ${t.likes||0} · 👁 ${t.vistas||0}</td>
  <td><div class="row-actions"><button class="ico-btn del" onclick="delItem('foro','${t.id}')" title="Eliminar"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button></div></td></tr>`;}

/* ====== DUPLICAR + VISTA PREVIA ====== */
function duplicarCurso(id){
  const c=DATA.cursos.find(x=>x.id===id);if(!c)return;
  const copy=JSON.parse(JSON.stringify(c));delete copy.id;copy.titulo=(c.titulo||'Curso')+' (copia)';
  saveDoc('cursos',null,copy);toast('Curso duplicado');
}
function previewCurso(id){
  const c=DATA.cursos.find(x=>x.id===id);if(!c)return;
  const total=c.listaClases?c.listaClases.length:(c.clases||0);
  const clases=c.listaClases&&c.listaClases.length?c.listaClases:Array.from({length:total},(_,i)=>({titulo:'Clase '+(i+1),duracion:'2 Horas'}));
  document.getElementById('modal-content').innerHTML=`
    <div class="modal-head"><h3>Vista previa · como lo ve el miembro</h3><button class="modal-x" onclick="closeModal()">✕</button></div>
    <div class="modal-body">
      <div class="pv-hero"><div class="pv-img" style="background-image:url('${esc(driveImg(c.img))}')"></div>
        <div class="pv-body"><div class="pv-cat">${c.categoria||'General'}</div><h3>${c.titulo}</h3>
          <p class="pv-desc">${c.desc||'Capacitación profesional IMDAC.'}</p><span class="tag">${total} clases · ${c.nivel||'Intermedio'}</span></div></div>
      <div class="pv-progress"><span>Tu progreso</span><div class="pv-bar"><i style="width:0%"></i></div><b>0%</b></div>
      <div style="font-family:var(--font-display);font-weight:700;margin:16px 0 10px">Lista de clases</div>
      ${clases.length?clases.map((cl,i)=>`<div class="pv-clase"><div class="pv-cnum">${i+1}</div><div style="flex:1"><b>${cl.titulo||('Clase '+(i+1))}</b><div style="color:var(--muted);font-size:.82rem">⏱ ${cl.duracion||'2 Horas'}</div></div><div class="pv-play">▶</div></div>`).join(''):'<p style="color:var(--muted)">Sin clases aún.</p>'}
      <div class="modal-foot"><button class="btn-ghost" onclick="closeModal()">Cerrar</button></div>
    </div>`;
  document.getElementById('modal').classList.add('open');
}

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
/* Horas totales: suma la duración de cada clase ("2 Horas" -> 2). Los cursos
   legacy sin listaClases detallada no traen duración por clase, así que se
   estima con el mismo default que usa el reproductor del socio (2h/clase)
   en vez de dejarlo en 0, que mentiría más que una estimación razonable. */
function horasTotalesCursos(){
  let total=0;
  (DATA.cursos||[]).forEach(c=>{total+=horasCurso(c);});
  return total;
}
/* Horas de un curso: si el admin puso un override manual (campo "Horas
   totales" del form) se respeta tal cual; si no, se suma la duración de
   cada clase, igual que hace horasTotalesCursos() para el agregado. */
function horasCurso(c){
  if(Number(c.horasTotales)>0)return Number(c.horasTotales);
  const lista=c.listaClases;
  if(lista&&lista.length)return lista.reduce((s,l)=>s+(parseFloat(l.duracion)||2),0);
  return (c.clases||0)*2;
}
function materialesDeCurso(cursoId){return (DATA.material||[]).filter(m=>m.cursoId===cursoId);}
function catChipsConCount(){
  const counts={};
  (DATA.cursos||[]).forEach(c=>{const k=c.categoria||'General';counts[k]=(counts[k]||0)+1;});
  // Solo categorías con al menos 1 curso real — CATS trae el catálogo completo
  // de categorías disponibles para el formulario, pero mostrarlas todas aquí
  // aunque estén en 0 era puro ruido visual.
  const items=[['Todos',DATA.cursos.length],...CATS.filter(c=>counts[c]>0).map(c=>[c,counts[c]])];
  return items.map(([label,n])=>`<button class="chip ${_filterCat===label?'active':''}" onclick="setCatFilter('${label.replace(/'/g,"\\'")}')">${label} <span class="chip-count">${n}</span></button>`).join('');
}
function estChipsConCount(){
  const pub=(DATA.cursos||[]).filter(c=>(c.estado||'Publicado')!=='Borrador').length;
  const bor=(DATA.cursos||[]).filter(c=>(c.estado||'Publicado')==='Borrador').length;
  return [['Todos',DATA.cursos.length],['Publicado',pub],['Borrador',bor]]
    .map(([label,n])=>`<button class="chip ${_filterEstado===label?'active':''}" onclick="setEstadoFilter('${label}')">${label} <span class="chip-count">${n}</span></button>`).join('');
}
function cursoCard(c){
  const activo=(c.estado||'Publicado')!=='Borrador';
  const totalClases=(c.listaClases?c.listaClases.length:c.clases)||0;
  const totalMat=materialesDeCurso(c.id).length;
  return `<div class="curso-card">
    <div class="cc-img" style="background-image:url('${esc(driveImg(c.img))}')">
      <span class="cc-cat">${esc(c.categoria||'General')}</span>
      <label class="toggle cc-toggle" title="${activo?'Publicado — clic para pasar a borrador':'Borrador — clic para publicar'}" onclick="event.stopPropagation()">
        <input type="checkbox" ${activo?'checked':''} onchange="toggleCursoEstado('${c.id}',this.checked)"><span class="tk"></span>
      </label>
      <span class="cc-nivel">${esc(c.nivel||'Básico')}</span>
    </div>
    <div class="cc-body">
      ${c.esPruebaGratuita===true||String(c.esPruebaGratuita||'').toLowerCase()==='true'?'<span class="tag" style="margin:0 0 7px 5px;display:inline-block">Prueba gratuita</span>':''}
      <h4>${esc(c.titulo)}</h4>
      <span class="cc-inst">${esc(c.instructor||'Equipo IMDAC')}</span>
      <div class="cc-meta-row">
        <span title="Clases">📋 ${totalClases} clase${totalClases===1?'':'s'}</span>
        <span title="Horas totales">🕐 ${horasCurso(c)}h</span>
        <span title="Materiales ligados">📄 ${totalMat} mat.</span>
      </div>
      <div class="cc-status ${activo?'on':'off'}"><i></i>${activo?'ACTIVO':'BORRADOR'}</div>
      <div class="cc-actions">
        <button class="ico-btn" onclick="previewCurso('${c.id}')" title="Vista previa"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg></button>
        <button class="ico-btn" onclick="duplicarCurso('${c.id}')" title="Duplicar"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg></button>
        <button class="ico-btn" onclick="editItem('cursos','${c.id}')" title="Editar"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg></button>
        <button class="ico-btn del" onclick="delItem('cursos','${c.id}')" title="Eliminar"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>
      </div>
    </div>
  </div>`;
}
function toggleCursoEstado(id,checked){
  const nuevo=checked?'Publicado':'Borrador';
  const c=DATA.cursos.find(x=>x.id===id); if(c)c.estado=nuevo;
  rebuildRows();
  if(!FB_OK)return;
  db.collection('cursos').doc(id).set({estado:nuevo},{merge:true})
    .then(()=>toast(nuevo==='Publicado'?'Curso publicado':'Curso pasado a borrador'))
    .catch(()=>toast('No se pudo actualizar','err'));
}
function renderCursos(){
  return `<div class="page-head"><div>
    <div class="pill-eyebrow">Catálogo de cursos</div>
    <h1 class="page-h">Cursos</h1><p class="page-sub">Gestiona tu catálogo, actívalos o pásalos a borrador al toque, busca y filtra.</p></div>
    <button class="btn-add" onclick="newCurso()"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>Nuevo curso</button></div>
    <div class="stats">
      ${statCard('Total catálogo',DATA.cursos.length,'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253')}
      ${statCard('Publicados',DATA.cursos.filter(c=>(c.estado||'Publicado')!=='Borrador').length,'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z')}
      ${statCard('Total clases',DATA.cursos.reduce((s,c)=>s+((c.listaClases?c.listaClases.length:c.clases)||0),0),'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z')}
      ${statCard('Horas totales',horasTotalesCursos()+'h','M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z')}
    </div>
    <div class="curso-tools-row">
      ${searchBar('cursos','Buscar curso por título, categoría o instructor...')}
      <div class="sort-select">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7h18M6 12h12M10 17h4"/></svg>
        <select onchange="setCursoSort(this.value)">
          <option value="az" ${_cursoSort==='az'?'selected':''}>A-Z</option>
          <option value="horas" ${_cursoSort==='horas'?'selected':''}>Horas</option>
          <option value="populares" ${_cursoSort==='populares'?'selected':''}>Populares</option>
        </select>
      </div>
      <div class="view-toggle">
        <button class="${_cursoView==='grid'?'active':''}" onclick="setCursoView('grid')" title="Vista de cuadrícula"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h7V4H4v2zm9 0h7V4h-7v2zM4 13h7v-2H4v2zm9 0h7v-2h-7v2zM4 20h7v-2H4v2zm9 0h7v-2h-7v2z"/></svg></button>
        <button class="${_cursoView==='list'?'active':''}" onclick="setCursoView('list')" title="Vista de lista"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg></button>
      </div>
    </div>
    <div class="chips-row">${catChipsConCount()}</div>
    <div class="chips-row" style="margin-bottom:18px">${estChipsConCount()}</div>
    ${cursosListaHTML()}
    <div id="tbl-pager">${pagerInner('cursos')}</div>`;
}
function cursosListaHTML(){
  const {pageItems,total}=getList('cursos');
  if(_cursoView==='list'){
    return `<div class="card"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Título</th><th>Categoría</th><th>Nivel</th><th>Clases</th><th>Estado</th><th></th></tr></thead>
    <tbody id="tbl-body">${pageItems.length?pageItems.map(cursoRow).join(''):`<tr><td colspan="6"><div class="empty"><b>${total?'Sin resultados':'Aún no hay cursos'}</b><span>${total?'Prueba con otra búsqueda o filtro.':'Crea el primero con el botón de arriba.'}</span></div></td></tr>`}</tbody></table></div></div>`;
  }
  return `<div class="curso-grid" id="curso-grid">${pageItems.length?pageItems.map(cursoCard).join(''):`<div class="card" style="grid-column:1/-1"><div class="empty"><b>${total?'Sin resultados':'Aún no hay cursos'}</b><span>${total?'Prueba con otra búsqueda o filtro.':'Crea el primero con el botón de arriba.'}</span></div></div>`}</div>`;
}
let _removedCourseMaterialIds=[];
function cursoForm(c={}){
  _removedCourseMaterialIds=[];
  const clases=c.listaClases||[];
  const materiales=c.id?materialesDeCurso(c.id):[];
  const pruebaGratis=c.esPruebaGratuita===true||String(c.esPruebaGratuita||'').toLowerCase()==='true';
  return `<div class="course-form">
  <div class="form-grid">
    <div class="field form-full"><label>Nombre del curso</label><input id="f-titulo" value="${esc(c.titulo)}" placeholder="Ej. Diseño Estructural de Concreto"></div>
    <div class="field form-full"><label>Descripción</label><textarea id="f-desc" rows="3">${esc(c.desc)}</textarea></div>
    <div class="field"><label style="display:flex;justify-content:space-between">Categoría <a onclick="addCategoria()" style="color:var(--rojo);font-weight:700;cursor:pointer;text-transform:none;letter-spacing:0">+ Nueva</a></label><select id="f-categoria">${CATS.map(x=>`<option ${c.categoria===x?'selected':''}>${x}</option>`).join('')}</select></div>
    <div class="field"><label>Nivel</label><select id="f-nivel">${NIVELES.map(x=>`<option ${c.nivel===x?'selected':''}>${x}</option>`).join('')}</select></div>
    <div class="field"><label>Instructor</label><input id="f-instructor" value="${esc(c.instructor)}" placeholder="Ej. Arq. Nombre"></div>
    <div class="field"><label>Estado</label><select id="f-estado">${ESTADOS.map(x=>`<option ${c.estado===x?'selected':''}>${x}</option>`).join('')}</select></div>
    <div class="field"><label>Horas totales (opcional)</label><input id="f-horas" type="number" min="0" step="0.5" value="${Number(c.horasTotales)||''}" placeholder="Auto: suma de clases">
      <p style="color:var(--muted);font-size:.78rem;margin-top:6px">Vacío = se calcula solo sumando la duración de cada clase.</p></div>
    <div class="field form-full"><label>Disponibilidad para los miembros</label>
      <div class="avail-opt sel"><div><b>Ruta de membresía automática</b><span>El primer curso se habilita al activar la membresía y se libera uno adicional cada 7 días, según el orden del catálogo.</span></div></div>
    </div>
    <div class="field form-full"><label>Prueba gratuita</label>
      <label class="avail-opt ${pruebaGratis?'sel':''}" style="display:flex;align-items:flex-start;gap:10px">
        <input type="checkbox" id="f-prueba-gratuita" ${pruebaGratis?'checked':''}>
        <div><b>Este curso puede elegirse como prueba gratuita</b><span>Quien lo elija podrá ver todas las clases en orden, excepto la última. La última clase y el certificado son exclusivos de la membresía VIP.</span></div>
      </label>
    </div>
    <div class="field form-full"><label>📄 Temario del curso (Google Drive)</label><input id="f-temario" value="${esc(c.temario)}" placeholder="https://drive.google.com/file/d/..."></div>
    <div class="field form-full"><label>🖼️ Imagen de portada (Google Drive)</label><input id="f-img" value="${esc(c.img)}" placeholder="https://drive.google.com/file/d/..."></div>
  </div>
  <div class="form-full" style="margin-top:8px">
    <label style="display:block;font-size:.78rem;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin-bottom:10px">Clases del curso</label>
    <div id="clases-list">${clases.map((cl,i)=>claseEditRow(cl,i)).join('')}</div>
    <button class="btn-add-clase" onclick="addClaseRow()"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width:16px;height:16px"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.4" d="M12 4v16m8-8H4"/></svg>Agregar clase</button>
  </div>
  <div class="form-full" style="margin-top:22px">
    <div class="course-materials-head"><div><b>Materiales descargables (PDFs, Excel, etc.)</b><span>Documentos extra · cada uno con su propia disponibilidad.</span></div><button type="button" class="btn-ghost" onclick="addMaterialCursoRow()">＋ Agregar material</button></div>
    <div id="curso-mats-list" class="course-materials-list">${materiales.map((m,i)=>materialCursoEditRow(m,i,clases)).join('')}</div>
  </div></div>`;
}
function materialClaseOptions(clases=[],selected=''){return `<option value="" ${!selected?'selected':''}>— Selecciona una clase —</option>${clases.map((cl,i)=>`<option value="${esc(cl.lessonId||cl.id||'')}" ${selected===(cl.lessonId||cl.id)?'selected':''}>Clase ${i+1}: ${esc(cl.titulo||'Sin título')}</option>`).join('')}`;}
function clasesActualesDelFormulario(){return [...document.querySelectorAll('#clases-list .clase-item')].map((row,i)=>({lessonId:row.querySelector('[data-cl="lessonId"]')?.value||'',titulo:row.querySelector('[data-cl="titulo"]')?.value||`Clase ${i+1}`}));}
function materialCursoEditRow(m={},i=0,clases=[]){
  const siempre=m.disponibleSiempre===true||String(m.disponibleSiempre||'').toLowerCase()==='true';
  return `<div class="course-material-row" data-course-material data-material-id="${esc(m.id||'')}">
    <div class="cm-edit-top"><span class="cm-num">MAT ${i+1}</span><input data-mat="titulo" value="${esc(m.titulo)}" placeholder="Título (ej. Guía de obra.pdf)"><button type="button" class="cm-remove" onclick="removeMaterialCursoRow(this)">✕</button></div>
    <input data-mat="url" value="${esc(m.url)}" placeholder="URL de descarga (Google Drive, etc.)">
    <label class="cm-always"><input type="checkbox" data-mat="siempre" ${siempre?'checked':''}> Disponible siempre (sin esperar abrir una clase)</label>
    <label class="cm-unlock">Se desbloquea al abrir: <select data-mat="claseId">${materialClaseOptions(clases,m.claseId||'')}</select></label>
  </div>`;
}
function addMaterialCursoRow(){const list=document.getElementById('curso-mats-list');if(!list)return;list.insertAdjacentHTML('beforeend',materialCursoEditRow({},list.children.length,clasesActualesDelFormulario()));}
function removeMaterialCursoRow(btn){const row=btn.closest('[data-course-material]');if(row?.dataset.materialId)_removedCourseMaterialIds.push(row.dataset.materialId);row?.remove();}
function collectMaterialesCurso(){return [...document.querySelectorAll('[data-course-material]')].map(row=>({
  id:row.dataset.materialId||'',titulo:row.querySelector('[data-mat="titulo"]').value.trim(),url:row.querySelector('[data-mat="url"]').value.trim(),disponibleSiempre:row.querySelector('[data-mat="siempre"]').checked,claseId:row.querySelector('[data-mat="claseId"]').value||''
})).filter(m=>m.titulo||m.url);}
function curMatRow(m){
  return `<div class="curso-mat-row">
    <span class="cmr-ico">${materialIconSmall(m.formato)}</span>
    <span class="cmr-title">${esc(m.titulo)}</span>
    <span class="cmr-formato">${esc(m.formato||'PDF')}</span>
    <button class="ico-btn" onclick="editItem('material','${m.id}')" title="Editar"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width:15px;height:15px"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg></button>
  </div>`;
}
function materialIconSmall(formato){
  const map={'Presentación':'📊','Excel':'📈','Word':'📝','Imagen':'🖼️','PDF':'📄'};
  return map[formato]||'📄';
}
/* Abre el form de material ya precargado con este cursoId, para que
   el admin lo pueda agregar sin salir del modal del curso. Al guardar,
   el modal normal de material se cierra (comportamiento estándar de
   saveDoc); el admin reabre "Editar curso" para ver la lista actualizada. */
function agregarMaterialDesdeCurso(cursoId){
  openForm('Nuevo material',materialForm({cursoId}),()=>saveMaterial(null));
}
function addCategoria(){
  const n=prompt('Nombre de la nueva categoría:');
  if(n&&n.trim()){const v=n.trim();if(CATS.includes(v)){toast('Ya existe');return;}CATS.push(v);const sel=document.getElementById('f-categoria');const o=document.createElement('option');o.textContent=v;o.selected=true;sel.appendChild(o);if(FB_OK)db.collection('config').doc('app').set({categorias:CATS},{merge:true});toast('Categoría agregada');}
}
function nuevaClaseId(){return 'lesson-'+(globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2,10)}`);}
function claseEditRow(cl={},i){
  const lessonId=cl.lessonId||cl.id||nuevaClaseId();
  const act=cl.actividad&&cl.actividad.tipo?cl.actividad:null;
  return `<div class="clase-item" data-clase draggable="true" ondragstart="dragStart(event)" ondragover="dragOver(event)" ondragend="dragEnd(event)">
  <input type="hidden" data-cl="lessonId" value="${esc(lessonId)}"><input type="hidden" data-cl="duracion" value="${esc(cl.duracion)||'2 Horas'}">
  <div class="clase-edit simple-clase-edit"><span class="num">Clase ${i+1}</span><input class="in-titulo" data-cl="titulo" value="${esc(cl.titulo)}" oninput="refreshMaterialClassOptions()" placeholder="Título de la clase"><div class="clase-move"><button type="button" onclick="moverClase(this,-1)" title="Subir">▲</button><button type="button" onclick="moverClase(this,1)" title="Bajar">▼</button></div></div>
  <div class="clase-url-row"><input class="in-video-id" data-cl="videoId" value="${esc(cl.videoId)}" placeholder="ID del video en Bunny Stream" title="GUID del video en Bunny Stream"><input class="in-url" data-cl="videoUrl" value="${esc(cl.videoUrl)}" placeholder="O URL del video (Google Drive, YouTube, etc.)"><button class="rm" onclick="this.closest('.clase-item').remove();renumClases();refreshMaterialClassOptions()" title="Eliminar clase">✕</button></div>
  <label class="clase-act-toggle"><input type="checkbox" onchange="toggleClaseAct(this)" ${act?'checked':''}> 🎮 Agregar actividad al terminar esta clase</label>
  ${act?claseActBoxHTML(act):''}
</div>`;}
/* ====== ACTIVIDAD POR CLASE (ahorcado, V/F, opción, sopa, memorama, crucigrama, rompecabezas) ====== */
function defaultActividad(tipo){
  if(tipo==='vf')return{tipo,enunciado:'',respuesta:true};
  if(tipo==='opcion')return{tipo,pregunta:'',opciones:['','',''],correcta:0};
  if(tipo==='sopa')return{tipo,palabras:''};
  if(tipo==='memorama')return{tipo,parejas:''};
  if(tipo==='crucigrama')return{tipo,pistas:''};
  if(tipo==='rompecabezas')return{tipo,imagen:'',instruccion:''};
  return{tipo:'ahorcado',palabra:'',pista:''};
}
function claseActBoxHTML(act){
  const tipo=act.tipo||'ahorcado';
  return `<div class="clase-act-box">
    <select class="act-tipo" onchange="setClaseActTipo(this)">
      <option value="ahorcado" ${tipo==='ahorcado'?'selected':''}>🔤 Ahorcado</option>
      <option value="vf" ${tipo==='vf'?'selected':''}>✅ Verdadero o falso</option>
      <option value="opcion" ${tipo==='opcion'?'selected':''}>📝 Opción múltiple</option>
      <option value="sopa" ${tipo==='sopa'?'selected':''}>🔎 Sopa de letras</option>
      <option value="memorama" ${tipo==='memorama'?'selected':''}>🎴 Memorama</option>
      <option value="crucigrama" ${tipo==='crucigrama'?'selected':''}>🧩 Crucigrama</option>
      <option value="rompecabezas" ${tipo==='rompecabezas'?'selected':''}>🧩 Rompecabezas</option>
    </select>
    ${actCamposHTML(act)}
  </div>`;
}
function actCamposHTML(act){
  if(act.tipo==='vf')return `
    <textarea class="act-field" data-act-f="enunciado" rows="2" placeholder="Enunciado (la afirmación que el alumno debe juzgar)">${esc(act.enunciado)}</textarea>
    <div class="act-vf-row">
      <label><input type="radio" name="act-vf" value="true" ${act.respuesta===true?'checked':''}> Verdadero</label>
      <label><input type="radio" name="act-vf" value="false" ${act.respuesta===false?'checked':''}> Falso</label>
    </div>`;
  if(act.tipo==='opcion'){
    const opts=Array.isArray(act.opciones)&&act.opciones.length===3?act.opciones:['','',''];
    return `
    <textarea class="act-field" data-act-f="pregunta" rows="2" placeholder="Pregunta">${esc(act.pregunta)}</textarea>
    ${opts.map((o,i)=>`<div class="act-opt-row">
      <input type="radio" name="act-correcta" value="${i}" ${Number(act.correcta)===i?'checked':''}>
      <input type="text" class="act-field" data-act-f="opcion${i}" placeholder="Opción ${String.fromCharCode(65+i)}" value="${esc(o)}">
    </div>`).join('')}
    <small class="act-hint">Marca el radio de la respuesta correcta.</small>`;
  }
  if(act.tipo==='sopa')return `<textarea class="act-field" data-act-f="palabras" rows="3" placeholder="Palabras separadas por coma o una por línea, ej: CHEF, HORNO, RECETA (de 3 a 12 letras, sin acentos)">${esc(act.palabras)}</textarea><small class="act-hint">Mínimo 3 palabras. Se acomodan solas en la cuadrícula.</small>`;
  if(act.tipo==='memorama')return `<textarea class="act-field" data-act-f="parejas" rows="4" placeholder="Un par por línea, formato: Término = Definición">${esc(act.parejas)}</textarea><small class="act-hint">Mínimo 3 pares (término = definición, uno por línea).</small>`;
  if(act.tipo==='crucigrama')return `<textarea class="act-field" data-act-f="pistas" rows="4" placeholder="Una palabra y su pista por línea, formato: PALABRA = Pista">${esc(act.pistas)}</textarea><small class="act-hint">Mínimo 4 palabras. Las que compartan letras se cruzan solas.</small>`;
  if(act.tipo==='rompecabezas')return `
    <input type="text" class="act-field" data-act-f="imagen" placeholder="URL de la imagen del rompecabezas (Google Drive)" value="${esc(act.imagen)}">
    <input type="text" class="act-field" data-act-f="instruccion" placeholder="Instrucción opcional" value="${esc(act.instruccion)}">
    <small class="act-hint">El alumno ordena una imagen de 9 piezas para completar la clase.</small>`;
  return `
    <input type="text" class="act-field" data-act-f="palabra" placeholder="Palabra a adivinar (sin acentos, ej. FERMENTACION)" style="text-transform:uppercase" value="${esc(act.palabra)}">
    <input type="text" class="act-field" data-act-f="pista" placeholder="Pista" value="${esc(act.pista)}">`;
}
function toggleClaseAct(chk){
  const item=chk.closest('.clase-item');
  if(chk.checked){
    if(!item.querySelector('.clase-act-box'))item.insertAdjacentHTML('beforeend',claseActBoxHTML(defaultActividad('ahorcado')));
  }else{
    item.querySelector('.clase-act-box')?.remove();
  }
}
function setClaseActTipo(sel){
  const box=sel.closest('.clase-act-box');
  box.outerHTML=claseActBoxHTML(defaultActividad(sel.value));
}
function collectActividad(item){
  const chk=item.querySelector('.clase-act-toggle input[type="checkbox"]');
  if(!chk||!chk.checked)return null;
  const box=item.querySelector('.clase-act-box'); if(!box)return null;
  const tipo=box.querySelector('.act-tipo').value;
  const v=sel=>(box.querySelector(sel)?.value||'').trim();
  if(tipo==='vf')return{tipo,enunciado:v('[data-act-f="enunciado"]'),respuesta:box.querySelector('input[name="act-vf"]:checked')?.value==='true'};
  if(tipo==='opcion')return{tipo,pregunta:v('[data-act-f="pregunta"]'),opciones:[0,1,2].map(i=>v(`[data-act-f="opcion${i}"]`)),correcta:Number(box.querySelector('input[name="act-correcta"]:checked')?.value||0)};
  if(tipo==='sopa')return{tipo,palabras:v('[data-act-f="palabras"]')};
  if(tipo==='memorama')return{tipo,parejas:v('[data-act-f="parejas"]')};
  if(tipo==='crucigrama')return{tipo,pistas:v('[data-act-f="pistas"]')};
  if(tipo==='rompecabezas')return{tipo,imagen:v('[data-act-f="imagen"]'),instruccion:v('[data-act-f="instruccion"]')};
  return{tipo:'ahorcado',palabra:v('[data-act-f="palabra"]').toUpperCase(),pista:v('[data-act-f="pista"]')};
}
/* Mismas reglas mínimas que valida vip-admin.html de DulceLab, para que una
   actividad a medio llenar no se guarde silenciosamente rota. */
function validarActividad(a,numClase){
  if(!a)return null;
  if(a.tipo==='ahorcado'&&(!a.palabra||!a.pista))return `Clase ${numClase}: el ahorcado necesita palabra y pista`;
  if(a.tipo==='vf'&&!a.enunciado)return `Clase ${numClase}: falta el enunciado de verdadero/falso`;
  if(a.tipo==='opcion'&&(!a.pregunta||a.opciones.length!==3||a.opciones.some(o=>!o)))return `Clase ${numClase}: completa la pregunta y las 3 opciones`;
  if(a.tipo==='sopa'&&(a.palabras||'').split(/[,\n]/).map(w=>w.trim()).filter(w=>w.length>=3).length<3)return `Clase ${numClase}: la sopa de letras necesita al menos 3 palabras (mínimo 3 letras)`;
  if(a.tipo==='memorama'&&(a.parejas||'').split('\n').map(l=>l.split('=')).filter(p=>p.length>=2&&p[0].trim()&&p.slice(1).join('=').trim()).length<3)return `Clase ${numClase}: el memorama necesita al menos 3 pares (formato: término = definición)`;
  if(a.tipo==='crucigrama'&&(a.pistas||'').split('\n').map(l=>l.split('=')).filter(p=>p.length>=2&&p[0].trim().length>=2&&p.slice(1).join('=').trim()).length<4)return `Clase ${numClase}: el crucigrama necesita al menos 4 palabras con su pista (formato: PALABRA = pista)`;
  if(a.tipo==='rompecabezas'&&!a.imagen)return `Clase ${numClase}: el rompecabezas necesita una imagen`;
  return null;
}
let _dragEl=null;
function dragStart(e){_dragEl=e.currentTarget;e.currentTarget.classList.add('dragging');}
function dragEnd(e){e.currentTarget.classList.remove('dragging');_dragEl=null;renumClases();}
function dragOver(e){
  e.preventDefault();const t=e.currentTarget;if(!_dragEl||t===_dragEl)return;
  const list=t.parentElement,items=[...list.children];
  if(items.indexOf(t)<items.indexOf(_dragEl))list.insertBefore(_dragEl,t);
  else list.insertBefore(_dragEl,t.nextSibling);
}
function addClaseRow(){const l=document.getElementById('clases-list');l.insertAdjacentHTML('beforeend',claseEditRow({},l.children.length));refreshMaterialClassOptions();}
function renumClases(){document.querySelectorAll('#clases-list .clase-item').forEach((r,i)=>r.querySelector('.num').textContent='Clase '+(i+1));}
function refreshMaterialClassOptions(){document.querySelectorAll('[data-mat="claseId"]').forEach(sel=>{const current=sel.value;sel.innerHTML=materialClaseOptions(clasesActualesDelFormulario(),current);});}
function moverClase(btn,dir){const item=btn.closest('.clase-item'),sibling=dir<0?item.previousElementSibling:item.nextElementSibling;if(!sibling)return;dir<0?item.parentElement.insertBefore(item,sibling):item.parentElement.insertBefore(sibling,item);renumClases();refreshMaterialClassOptions();}
function collectClases(){return [...document.querySelectorAll('#clases-list .clase-item')].map((r,i)=>({
  lessonId:r.querySelector('[data-cl="lessonId"]').value.trim()||nuevaClaseId(),
  titulo:r.querySelector('[data-cl="titulo"]').value.trim(),
  duracion:r.querySelector('[data-cl="duracion"]').value.trim(),
  provider:r.querySelector('[data-cl="videoId"]').value.trim()?'bunny':(r.querySelector('[data-cl="videoUrl"]').value.trim()?'url':''),
  videoId:r.querySelector('[data-cl="videoId"]').value.trim(),
  videoUrl:r.querySelector('[data-cl="videoUrl"]').value.trim(),
  isPreview:false,
  actividad:collectActividad(r),
  orden:i+1
}));}
function newCurso(){openForm('Nuevo curso',cursoForm(),()=>saveCurso(null));}
function saveCurso(id){
  const clases=collectClases();
  const materiales=collectMaterialesCurso();
  for(let i=0;i<clases.length;i++){
    const err=validarActividad(clases[i].actividad,i+1);
    if(err)return toast(err,{type:'err'});
  }
  const data={titulo:fv('f-titulo'),categoria:fv('f-categoria'),nivel:fv('f-nivel'),instructor:fv('f-instructor'),estado:fv('f-estado'),esPruebaGratuita:!!document.getElementById('f-prueba-gratuita')?.checked,horasTotales:+fv('f-horas')||0,temario:fv('f-temario'),img:fv('f-img'),desc:fv('f-desc'),listaClases:clases,clases:clases.length};
  if(!data.titulo)return toast('El título es obligatorio');
  if(materiales.some(m=>!m.titulo||!m.url))return toast('Cada material necesita título y URL',{type:'err'});
  if(materiales.some(m=>!m.disponibleSiempre&&!m.claseId))return toast('Elige la clase que desbloquea cada material o marca “Disponible siempre”',{type:'err'});
  const btn=document.getElementById('modal-save');if(btn){btn.disabled=true;btn._txt=btn.textContent;btn.textContent='Guardando…';}
  const finish=()=>{toast(id?'Cambios guardados':'Curso creado',{type:'ok'});closeModal();if(FB_OK)reload();else renderSection(currentSection);};
  const fail=()=>{if(btn){btn.disabled=false;btn.textContent=btn._txt||'Guardar';}toast('Error al guardar',{type:'err'});};
  if(FB_OK){
    const ref=id?db.collection('cursos').doc(id):db.collection('cursos').doc();
    ref.set(data,{merge:true}).then(()=>Promise.all([...materiales.map(m=>{
      const {id:materialId,...mat}=m;const matData={...mat,cursoId:ref.id,desbloqueoDias:0,formato:inferirFormatoURL(mat.url)||'PDF'};
      return (materialId?db.collection('material').doc(materialId):db.collection('material').doc()).set(matData,{merge:true});
    }),..._removedCourseMaterialIds.map(materialId=>db.collection('material').doc(materialId).delete())])).then(finish).catch(fail);
  }else{
    const cursoId=id||'demo'+Date.now();if(id){const c=DATA.cursos.find(x=>x.id===id);Object.assign(c,data);}else DATA.cursos.unshift({id:cursoId,...data});
    materiales.forEach((m,i)=>{const existing=m.id&&DATA.material.find(x=>x.id===m.id);const mat={...m,id:m.id||`mat-${Date.now()}-${i}`,cursoId,desbloqueoDias:0,formato:inferirFormatoURL(m.url)||'PDF'};if(existing)Object.assign(existing,mat);else DATA.material.unshift(mat);});DATA.material=DATA.material.filter(m=>!_removedCourseMaterialIds.includes(m.id));finish();
  }
}

/* ====== CLASES EN VIVO ====== */
function webinarTime(w){const t=new Date(w.fechaISO||'').getTime();return Number.isNaN(t)?null:t;}
function liveFilter(v){_webinarFilter=v;renderSection('webinars');}
function liveSearch(v){_search.webinars=v;renderSection('webinars');}
function liveClassCard(w){
  const fecha=w.fecha||'Fecha por definir';
  const grabacion=w.grabacion?'<span class="live-tag recorded">Grabación disponible</span>':'<span class="live-tag">En vivo</span>';
  const imagen=w.img?`style="background-image:linear-gradient(0deg,rgba(13,13,13,.7),rgba(13,13,13,.05)),url('${esc(driveImg(w.img))}')"`:'';
  return `<article class="live-class-card"><div class="live-class-cover" ${imagen}><span>${grabacion}</span></div><div class="live-class-body"><h3>${esc(w.titulo||'Clase en vivo')}</h3><p>${esc(fecha)}${w.instructor?' · '+esc(w.instructor):''}</p><div class="live-card-actions"><button class="btn-ghost" onclick="editItem('webinars','${w.id}')">Editar</button><button class="btn-add" onclick="editItem('webinars','${w.id}')">Ver clase</button></div></div></article>`;
}
function renderWebinars(){
  const ahora=Date.now();
  const todos=[...DATA.webinars].sort((a,b)=>(webinarTime(a)||Infinity)-(webinarTime(b)||Infinity));
  const proximas=todos.filter(w=>{const t=webinarTime(w);return t!==null&&t>=ahora;});
  const pasadas=todos.filter(w=>{const t=webinarTime(w);return t!==null&&t<ahora;});
  const q=(_search.webinars||'').trim().toLowerCase();
  let visibles=_webinarFilter==='proximas'?proximas:_webinarFilter==='pasadas'?pasadas:todos;
  if(q)visibles=visibles.filter(w=>`${w.titulo||''} ${w.fecha||''}`.toLowerCase().includes(q));
  const totalProgramadas=todos.length;
  const emptyText=_webinarFilter==='pasadas'?'Aún no hay clases pasadas':_webinarFilter==='todos'?'Aún no hay clases programadas':'Sin clases programadas';
  const emptySub=_webinarFilter==='proximas'?'Programa la primera clase en vivo con “Nueva clase en vivo”.':'Cuando existan clases en este periodo aparecerán aquí.';
  return `<section class="live-admin">
    <div class="live-admin-head"><div><div class="pill-eyebrow">Programación en vivo</div><h1 class="page-h">Clases en vivo</h1><p class="page-sub">Programa transmisiones para los miembros del Club IMDAC. El inicio del panel se actualiza con la próxima clase.</p></div><button class="btn-add" onclick="newWebinar()"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>Nueva clase en vivo</button></div>
    <div class="live-divider"></div>
    <div class="live-stats"><div class="live-stat"><span>Próximas clases</span><b>${proximas.length}</b><small>${proximas[0]?.fecha||'Próxima: —'}</small></div><div class="live-stat"><span>Pasadas</span><b>${pasadas.length}</b><small>Total histórico</small></div><div class="live-stat"><span>Total programadas</span><b>${totalProgramadas}</b><small>En Firestore</small></div></div>
    <div class="live-tools"><label class="live-search"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="m21 21-4.35-4.35m1.35-5.15a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z"/></svg><input value="${esc(_search.webinars||'')}" oninput="liveSearch(this.value)" placeholder="Buscar por título..."></label><div class="live-filters"><button class="${_webinarFilter==='proximas'?'active':''}" onclick="liveFilter('proximas')">Próximas</button><button class="${_webinarFilter==='pasadas'?'active':''}" onclick="liveFilter('pasadas')">Pasadas</button><button class="${_webinarFilter==='todos'?'active':''}" onclick="liveFilter('todos')">Todas</button></div></div>
    ${visibles.length?`<div class="live-class-grid">${visibles.map(liveClassCard).join('')}</div>`:`<div class="live-empty"><div class="live-empty-icon">◉</div><b>${emptyText}</b><span>${emptySub}</span></div>`}
  </section>`;
}
/* Mismos campos y mismo orden que "Nueva clase en vivo" de DulceLab
   (vip-admin.html). "Fecha (texto visible)" se quita como campo manual: se
   deriva sola de fechaISO con fechaVisible(), igual de útil pero sin
   duplicar captura. envivo/grabacion/img se conservan con el mismo nombre
   porque el webhook (index.js /webinar-acceso) ya los espera así. */
function webinarForm(w={}){return `<div class="form-grid">
  <div class="field form-full"><label>Título de la clase</label><input id="f-titulo" value="${esc(w.titulo)}" placeholder="Ej: Costeo y presupuesto en obra"></div>
  <div class="field form-full"><label>Descripción</label><textarea id="f-desc" rows="3" placeholder="Qué se cubrirá en la clase, casos reales, herramientas, etc.">${esc(w.desc)}</textarea></div>
  <div class="field"><label>Instructor</label><input id="f-instructor" value="${esc(w.instructor)}" placeholder="Ej: Arq. Nombre"></div>
  <div class="field"><label>Duración (minutos)</label><input id="f-duracion" type="number" min="15" step="5" value="${Number(w.duracionMin)||60}"></div>
  <div class="field form-full"><label>Fecha y hora de la clase</label><input id="f-fechaISO" type="datetime-local" value="${esc(w.fechaISO)}">
    <p style="color:var(--muted);font-size:.82rem;margin-top:6px">Hora local (CDMX) · la cuenta regresiva del Club se actualiza automáticamente.</p></div>
  <div class="field form-full"><label>Link de transmisión</label><input id="f-envivo" value="${esc(w.envivo)}" placeholder="https://meet.google.com/... o https://zoom.us/...">
    <p style="color:var(--muted);font-size:.82rem;margin-top:6px">URL pública (Zoom, Google Meet, YouTube Live, etc.)</p></div>
  <div class="field form-full"><label>🎬 Grabación (opcional, se agrega después de la clase)</label><input id="f-grabacion" value="${esc(w.grabacion)}" placeholder="https://drive.google.com/..."></div>
  <div class="field form-full"><label>🖼️ Imagen de portada (opcional)</label><input id="f-img" value="${esc(w.img)}" placeholder="https://drive.google.com/file/d/..."></div>
</div>`;}
function newWebinar(){openForm('Nueva clase en vivo',webinarForm(),()=>saveWebinar(null));}
function fechaVisible(iso){
  if(!iso)return '';
  const d=new Date(iso); if(isNaN(d))return '';
  const txt=d.toLocaleDateString('es-MX',{day:'numeric',month:'short',year:'numeric'});
  const hora=d.toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit',hour12:false});
  return `${txt}, ${hora}`;
}
function saveWebinar(id){
  const fechaISO=fv('f-fechaISO');
  const d={titulo:fv('f-titulo'),desc:fv('f-desc'),instructor:fv('f-instructor'),duracionMin:+fv('f-duracion')||60,fecha:fechaVisible(fechaISO),fechaISO,envivo:fv('f-envivo'),grabacion:fv('f-grabacion'),img:fv('f-img')};
  if(!d.titulo)return toast('El título es obligatorio');
  if(!fechaISO)return toast('La fecha y hora de la clase es obligatoria');
  saveDoc('webinars',id,d);
}

/* ====== DESCUBRE ALGO NUEVO (datos_curiosos) — igual que DulceLab ======
   DulceLab reemplazó sus noticias externas por esto; en IMDAC las noticias
   manuales (abajo, colapsadas) siguen siendo lo que de verdad ven los socios
   en el Club hoy — esto es nuevo y por ahora solo vive aquí en el panel,
   hasta que conectemos imdac-club/app.js a la colección 'datos_curiosos'. */
function renderNoticias(){
  const curiosos=DATA.datos_curiosos||[];
  const usandoFirestore=curiosos.length>0;
  const bib=usandoFirestore?curiosos:DISCOVER_LIBRARY;
  const hoyDiscover=_discoverPickDaily(bib,6);
  const dcTag=(item)=>{const meta=DISCOVER_CAT_META[item.categoria]||{color:'#6B7280'};return `<span class="tag" style="color:${meta.color};background:color-mix(in srgb,${meta.color} 14%,transparent)">${esc(item.categoria)} · ${esc(item.tipo)}</span>`;};
  return `<div class="page-head"><div><div class="pill-eyebrow">Contenido del Inicio</div><h1 class="page-h">Descubre algo nuevo</h1><p class="page-sub">Datos propios de IMDAC (construcción, estructuras, normatividad, etc.) que rotan solos cada día, sin backend. Por ahora solo se administra aquí — avísame cuando quieras que el Club de socios también lo muestre en su Inicio.</p></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn-add" onclick="newDatoCurioso()"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>Nuevo dato</button>
      ${!usandoFirestore?`<button class="btn-ghost" onclick="seedDiscoverLibrary()">Cargar biblioteca inicial (${DISCOVER_LIBRARY.length} datos)</button>`:''}
    </div></div>
    ${!usandoFirestore?`<p style="font-size:.78rem;color:#b8862f;margin:-10px 0 20px">Aún no hay datos en Firestore · esta vista está usando la biblioteca de respaldo integrada (solo lectura aquí). Carga la biblioteca inicial o agrega uno nuevo para empezar a administrarlo de verdad.</p>`:''}

    <div class="dash-card-head" style="margin-bottom:12px"><b>Vista previa de hoy</b><span style="color:var(--muted);font-size:.8rem">${new Date().toLocaleDateString('es-MX',{day:'2-digit',month:'short'})}</span></div>
    <div class="dc-preview-grid">
      ${hoyDiscover.map(item=>`<div class="dc-preview-card">${dcTag(item)}<b>${esc(item.titulo)}</b><span>${esc(item.resumen)}</span></div>`).join('')}
    </div>

    <div class="dash-card-head" style="margin-bottom:12px"><b>Biblioteca completa</b>${usandoFirestore?`<span class="tag gray">${curiosos.length}</span>`:''}</div>
    ${!usandoFirestore
      ?`<p style="font-size:.8rem;color:var(--muted);margin-bottom:20px">Mostrando la biblioteca de respaldo (${DISCOVER_LIBRARY.length} datos, solo lectura). Carga la biblioteca inicial arriba para poder editarla aquí.</p>`
      :curiosos.map(item=>{const meta=DISCOVER_CAT_META[item.categoria]||{color:'#6B7280',icon:'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'};return `
      <div class="dc-row">
        <div class="dc-ico" style="--c:${meta.color}"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="${meta.icon}"/></svg></div>
        <div class="dc-body"><b>${esc(item.titulo)}</b><div class="dc-meta">${esc(item.categoria)} · ${esc(item.tipo)}</div></div>
        <div class="row-actions">
          <button class="ico-btn" onclick="editItem('datos_curiosos','${item.id}')" title="Editar"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg></button>
          <button class="ico-btn del" onclick="delItem('datos_curiosos','${item.id}')" title="Eliminar"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>
        </div>
      </div>`;}).join('')
    }

    <details style="margin-top:28px">
      <summary style="cursor:pointer;font-size:.82rem;font-weight:700;color:var(--muted);padding:10px 0">Noticias manuales · lo que ven los socios hoy en "Descubre algo nuevo" del Club</summary>
      <div style="padding-top:14px">
        <div style="display:flex;justify-content:flex-end;margin-bottom:14px"><button class="btn-ghost" onclick="newNoticia()">+ Nueva noticia</button></div>
        ${DATA.noticias.length===0?`<div class="card"><div class="empty"><b>Sin noticias manuales</b><span>Nada publicado todavía en la colección 'noticias'.</span></div></div>`:DATA.noticias.map(n=>`
        <div class="dc-row">
          <div class="dc-ico" style="--c:#6B7280"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9"/></svg></div>
          <div class="dc-body"><b>${esc(n.titulo)}</b><div class="dc-meta">${esc(n.fuente||'IMDAC')} · ${esc(n.fecha||'—')}</div></div>
          <div class="row-actions">
            <button class="ico-btn" onclick="editItem('noticias','${n.id}')" title="Editar"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg></button>
            <button class="ico-btn del" onclick="delItem('noticias','${n.id}')" title="Eliminar"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>
          </div>
        </div>`).join('')}
      </div>
    </details>`;
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

function datoCuriosoForm(d={}){
  const categorias=Object.keys(DISCOVER_CAT_META);
  return `<div class="form-grid">
  <div class="field"><label>Categoría</label><select id="f-categoria">${categorias.map(c=>`<option value="${c}" ${c===d.categoria?'selected':''}>${c}</option>`).join('')}</select></div>
  <div class="field"><label>Tipo de contenido</label><select id="f-tipo">${DISCOVER_TIPOS.map(t=>`<option value="${t}" ${t===d.tipo?'selected':''}>${t}</option>`).join('')}</select></div>
  <div class="field form-full"><label>Título</label><input id="f-titulo" maxlength="90" placeholder="5 a 10 palabras, llamativo" value="${esc(d.titulo)}"></div>
  <div class="field form-full"><label>Resumen (lo que se ve en la tarjeta)</label><textarea id="f-resumen" rows="2" maxlength="160" placeholder="Máximo 2-3 líneas">${esc(d.resumen)}</textarea></div>
  <div class="field form-full"><label>Contenido ampliado</label><textarea id="f-contenido" rows="4" placeholder="Explicación un poco más completa">${esc(d.contenido)}</textarea></div>
  <div class="field form-full"><label>Consejo práctico</label><textarea id="f-consejo" rows="2" placeholder="Una recomendación accionable">${esc(d.consejo)}</textarea></div>
  <div class="field form-full"><label>Imagen (URL, opcional — si no hay se muestra el ícono de la categoría)</label><input id="f-imagen" value="${esc(d.imagen)}"></div>
</div>`;
}
function newDatoCurioso(){openForm('Nuevo dato',datoCuriosoForm(),()=>saveDatoCurioso(null));}
function saveDatoCurioso(id){
  const titulo=fv('f-titulo'),resumen=fv('f-resumen');
  if(!titulo)return toast('Falta el título');
  if(!resumen)return toast('Falta el resumen');
  const d={categoria:fv('f-categoria'),tipo:fv('f-tipo'),titulo,resumen,contenido:fv('f-contenido'),consejo:fv('f-consejo'),imagen:fv('f-imagen')||null};
  saveDoc('datos_curiosos',id,d);
}
function seedDiscoverLibrary(){
  if(!confirm(`¿Cargar los ${DISCOVER_LIBRARY.length} datos de la biblioteca inicial a Firestore? Después podrás editarlos o borrarlos desde aquí.`))return;
  if(FB_OK){
    const batch=db.batch();
    DISCOVER_LIBRARY.forEach(item=>{const{id,...datos}=item;batch.set(db.collection('datos_curiosos').doc(),datos);});
    batch.commit().then(()=>{toast(`${DISCOVER_LIBRARY.length} datos cargados`,{type:'ok'});reload();}).catch(()=>toast('No se pudo cargar la biblioteca',{type:'err'}));
  }else{
    DATA.datos_curiosos=DISCOVER_LIBRARY.map(item=>{const{id,...datos}=item;return {id:'demo'+Date.now()+Math.random(),...datos};});
    toast(`${DISCOVER_LIBRARY.length} datos cargados (demo)`,{type:'ok'});renderSection('noticias');
  }
}

/* ====== MATERIAL ======
   Antes era una tabla plana (Título/Descripción) con los 53 registros en el
   orden en que llegan de Firestore — por eso se veía "revuelto" (ej. tres
   "Paisajismo" separados por otros cursos en medio). Ahora se puede filtrar
   por curso y por formato, con buscador, igual que el "PDFs y material" de
   DulceLab (ver vip-admin.html líneas 3924-4150). */
let _matFilterCurso='todos', _matFilterFormato='todos', _matSearch='';
function materialStats(){
  const sinFormato=DATA.material.filter(m=>!m.formato).length;
  const cursosConMat=new Set(DATA.material.filter(m=>m.cursoId).map(m=>m.cursoId)).size;
  const sinCurso=DATA.material.filter(m=>!m.cursoId).length;
  return {sinFormato,cursosConMat,sinCurso};
}
function materialFiltrado(){
  let list=DATA.material.slice();
  if(_matFilterCurso!=='todos')list=list.filter(m=>(m.cursoId||'(sin-curso)')===_matFilterCurso);
  if(_matFilterFormato!=='todos')list=list.filter(m=>(m.formato||'(sin-formato)')===_matFilterFormato);
  const q=_matSearch.toLowerCase().trim();
  if(q){
    list=list.filter(m=>{
      const c=DATA.cursos.find(x=>x.id===m.cursoId);
      return (m.titulo||'').toLowerCase().includes(q)||(c?.titulo||'').toLowerCase().includes(q);
    });
  }
  return list;
}
function matPillsCurso(){
  const counts={};
  DATA.material.forEach(m=>{const k=m.cursoId||'(sin-curso)';counts[k]=(counts[k]||0)+1;});
  const cursosConMat=Object.keys(counts).filter(k=>k!=='(sin-curso)')
    .map(id=>DATA.cursos.find(c=>c.id===id)).filter(Boolean)
    .sort((a,b)=>(a.titulo||'').localeCompare(b.titulo||'','es'));
  let html=`<button class="chip ${_matFilterCurso==='todos'?'active':''}" onclick="setMatFilterCurso('todos')">Todos los cursos <span class="chip-count">${DATA.material.length}</span></button>`;
  html+=cursosConMat.map(c=>`<button class="chip ${_matFilterCurso===c.id?'active':''}" onclick="setMatFilterCurso('${c.id}')" title="${esc(c.titulo)}">${esc((c.titulo||'').length>28?c.titulo.slice(0,28)+'…':c.titulo)} <span class="chip-count">${counts[c.id]}</span></button>`).join('');
  if(counts['(sin-curso)'])html+=`<button class="chip ${_matFilterCurso==='(sin-curso)'?'active':''}" onclick="setMatFilterCurso('(sin-curso)')">Sin curso asociado <span class="chip-count">${counts['(sin-curso)']}</span></button>`;
  return html;
}
function matPillsFormato(){
  const counts={};
  DATA.material.forEach(m=>{const k=m.formato||'(sin-formato)';counts[k]=(counts[k]||0)+1;});
  let html=`<button class="chip ${_matFilterFormato==='todos'?'active':''}" onclick="setMatFilterFormato('todos')">Todos los formatos <span class="chip-count">${DATA.material.length}</span></button>`;
  html+=Object.keys(counts).sort().map(f=>`<button class="chip ${_matFilterFormato===f?'active':''}" onclick="setMatFilterFormato('${f}')">${f==='(sin-formato)'?'Sin formato':esc(f)} <span class="chip-count">${counts[f]}</span></button>`).join('');
  return html;
}
function setMatFilterCurso(v){_matFilterCurso=v;renderSection('material');}
function setMatFilterFormato(v){_matFilterFormato=v;renderSection('material');}
function onMatSearch(v){_matSearch=v;rebuildMatList();}
function rebuildMatList(){const c=document.getElementById('mat-list');if(c)c.innerHTML=matListaHTML();}
function renderMaterial(){
  const st=materialStats();
  return `<div class="page-head"><div>
    <div class="pill-eyebrow">Biblioteca descargable</div>
    <h1 class="page-h">PDFs y material</h1><p class="page-sub">Todos los materiales están vinculados a un curso. Aquí ves la lista completa, sin importar a cuál pertenecen.</p></div>
    <div style="display:flex;gap:10px;flex-wrap:wrap">
      <button class="btn-ghost" onclick="migrarPortadasMaterial(this)" title="Copia las portadas que aun esten en Google Drive a Firebase Storage, para que dejen de fallar al cargar"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>Migrar portadas a Storage</button>
      <button class="btn-add" onclick="newMaterial()"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>Nuevo material</button>
    </div>
    <div class="stats" style="margin-bottom:20px">
      ${statCard('Total materiales',DATA.material.length,'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z')}
      ${statCard('Cursos con material',st.cursosConMat,'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253')}
      ${statCard('Sin formato asignado',st.sinFormato,'M12 9v3.75m-9.303 3.376C1.83 17.513 2.952 19.5 4.697 19.5h14.606c1.745 0 2.868-1.987 1.9-3.374L13.9 4.5c-.866-1.25-2.934-1.25-3.8 0L2.697 16.126z')}
      ${st.sinCurso?statCard('Sin curso asociado',st.sinCurso,'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'):''}
    </div>
    <div class="search-admin" style="max-width:460px"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg><input value="${esc(_matSearch)}" oninput="onMatSearch(this.value)" placeholder="Buscar por título o curso..."></div>
    <div class="chips-row">${matPillsCurso()}</div>
    <div class="chips-row" style="margin-bottom:18px">${matPillsFormato()}</div>
    <div id="mat-list">${matListaHTML()}</div>`;
}
function matListaHTML(){
  const list=materialFiltrado();
  if(!list.length)return `<div class="card"><div class="empty"><b>Sin resultados</b><span>Prueba con otro curso, formato o búsqueda.</span></div></div>`;
  return `<div class="mat-rows">${list.map(matRowCard).join('')}</div>`;
}
function matRowCard(m){
  const c=DATA.cursos.find(x=>x.id===m.cursoId);
  const clase=c&&m.claseId?(c.listaClases||[]).find(l=>l.lessonId===m.claseId):null;
  const thumb=driveImg(m.img);
  return `<div class="mat-row" onclick="editItem('material','${m.id}')">
    <div class="mat-row__thumb" ${thumb?`style="background-image:url('${esc(thumb)}')"`:''}>${thumb?'':materialIconSmall(m.formato)}</div>
    <div class="mat-row__body">
      <div class="mat-row__title">${esc(m.titulo)}</div>
      <div class="mat-row__meta">
        ${c?`<span class="mat-row__curso" title="${esc(c.titulo)}">${esc((c.titulo||'').length>40?c.titulo.slice(0,40)+'…':c.titulo)}</span>`:'<span class="mat-row__curso mat-row__curso--none">Sin curso asociado</span>'}
        ${clase?`<span>· Clase: ${esc(clase.titulo||'')}</span>`:''}
      </div>
    </div>
    <span class="tag ${m.formato?'':'gray'}">${esc(m.formato||'Sin formato')}</span>
    <div class="row-actions" onclick="event.stopPropagation()">
      ${/^https?:\/\//i.test((m.url||'').trim())?`<button class="ico-btn" data-url="${esc(m.url)}" onclick="abrirEnlaceMaterial(this.dataset.url)" title="Abrir enlace" aria-label="Abrir enlace de ${esc(m.titulo||'material')}"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M14 3h7v7m0-7-10 10"/><path stroke-linecap="round" stroke-linejoin="round" d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"/></svg></button>`:''}
      <button class="ico-btn" onclick="editItem('material','${m.id}')" title="Editar"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg></button>
      <button class="ico-btn del" onclick="delItem('material','${m.id}')" title="Eliminar"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>
    </div>
  </div>`;
}
function abrirEnlaceMaterial(url){
  const enlace=(url||'').trim();
  if(!/^https?:\/\//i.test(enlace))return toast('El enlace del material no es válido',{type:'err'});
  const nueva=window.open(enlace,'_blank','noopener,noreferrer');
  if(nueva)nueva.opener=null;
}
const FORMATOS_MATERIAL=['PDF','Presentación','Excel','Word','Imagen','Otro'];
/* Igual que inferirTipo() en dulcelab-webhook/services/materiales.js, adaptado
   a que la mayoría de nuestros links son de Drive compartido (sin extensión
   en la URL) en vez de archivos subidos con extensión — ahí no hay forma de
   saber el formato real sin abrir el archivo. */
function inferirFormatoURL(url){
  const u=(url||'').toLowerCase();
  if(u.includes('docs.google.com/spreadsheets')||u.includes('sheets.google'))return 'Excel';
  if(u.includes('docs.google.com/presentation'))return 'Presentación';
  if(u.includes('docs.google.com/document'))return 'Word';
  if(u.endsWith('.xlsx')||u.endsWith('.xls'))return 'Excel';
  if(u.endsWith('.pptx')||u.endsWith('.ppt'))return 'Presentación';
  if(u.endsWith('.docx')||u.endsWith('.doc'))return 'Word';
  if(u.endsWith('.pdf'))return 'PDF';
  if(/\.(png|jpe?g|gif|webp)$/.test(u))return 'Imagen';
  return null;
}
function autoFormatoMaterial(url){
  const f=inferirFormatoURL(url);
  if(f)document.getElementById('f-formato').value=f;
}
function claseOptionsHTML(cursoId,claseIdSel){
  const c=(DATA.cursos||[]).find(x=>x.id===cursoId);
  const clases=(c&&c.listaClases)||[];
  return '<option value="">General del curso (sin clase)</option>'+clases.map((cl,i)=>`<option value="${esc(cl.lessonId||'')}" ${claseIdSel&&claseIdSel===cl.lessonId?'selected':''}>Clase ${i+1}: ${esc(cl.titulo||'')}</option>`).join('');
}
function actualizarClasesMaterial(){
  const cursoId=fv('f-curso');
  const wrap=document.getElementById('f-clase-wrap');
  if(!wrap)return;
  if(!cursoId){wrap.style.display='none';return;}
  wrap.style.display='block';
  document.getElementById('f-clase').innerHTML=claseOptionsHTML(cursoId,'');
}
function materialForm(m={}){
  const opts=(DATA.cursos||[]).map(c=>`<option value="${c.id}" ${m.cursoId===c.id?'selected':''}>${esc(c.titulo)}</option>`).join('');
  return `<div class="form-grid">
  <div class="field form-full"><label>Título</label><input id="f-titulo" value="${esc(m.titulo)}"></div>
  <div class="field form-full"><label>Descripción</label><textarea id="f-desc" rows="2">${esc(m.desc)}</textarea></div>
  <div class="field form-full"><label>URL del archivo</label><input id="f-url" value="${esc(m.url)}" placeholder="https://..." oninput="autoFormatoMaterial(this.value)">
    <small style="color:var(--muted);font-size:.78rem">Si pegas un link de Google Sheets, Slides o Docs, el Formato se ajusta solo. Para links genéricos de Drive (drive.google.com/file/d/...) no se puede saber el tipo real sin abrir el archivo — revísalo tú.</small></div>
  <div class="field form-full"><label>🖼️ Imagen de portada (Google Drive, opcional)</label><input id="f-img" value="${esc(m.img)}" placeholder="https://drive.google.com/file/d/..."></div>
  <div class="field"><label>Formato</label><select id="f-formato">${FORMATOS_MATERIAL.map(f=>`<option ${m.formato===f?'selected':''}>${f}</option>`).join('')}</select></div>
  <div class="field"><label>Curso asociado (opcional)</label>
    <select id="f-curso" onchange="actualizarClasesMaterial()"><option value="">Sin curso asociado</option>${opts}</select>
  </div>
  <div class="field form-full" id="f-clase-wrap" style="${m.cursoId?'':'display:none'}">
    <label>Clase del curso (opcional)</label>
    <select id="f-clase">${claseOptionsHTML(m.cursoId,m.claseId)}</select>
    <small style="color:var(--muted);font-size:.78rem">Agrupa el material bajo esa clase en la lista del socio. No restringe el acceso: el archivo se abre igual, esto es solo para ordenarlo.</small>
  </div>
</div>`;}
function newMaterial(){openForm('Nuevo material',materialForm(),()=>saveMaterial(null));}
async function migrarPortadasMaterial(btn){
  if(btn){btn.disabled=true;btn.style.opacity='.6';}
  toast('Migrando portadas de Drive a Storage, puede tardar un poco…',{type:'info'});
  try{
    const data=await apiFetch('/admin/migrar-portadas-material',{method:'POST'});
    if(data.fallidos&&data.fallidos.length){
      console.warn('Portadas que no se pudieron migrar:',data.fallidos);
      const primerError=data.fallidos[0].error||'error desconocido';
      toast(`${data.migrados} migradas, ${data.fallidos.length} fallaron: "${primerError}"`,{type:'err'});
    }else{
      toast(`${data.migrados} portada${data.migrados===1?'':'s'} migrada${data.migrados===1?'':'s'} a Storage · ${data.saltados} ya estaban listas`);
    }
    await loadData();
    if(currentSection==='material')renderSection('material');
  }catch(e){
    toast(e.message||'No se pudo migrar las portadas',{type:'err'});
  }finally{
    if(btn){btn.disabled=false;btn.style.opacity='';}
  }
}
function saveMaterial(id){
  const d={titulo:fv('f-titulo'),desc:fv('f-desc'),url:fv('f-url'),img:fv('f-img').trim(),formato:fv('f-formato')||'PDF',cursoId:fv('f-curso')||'',claseId:fv('f-clase')||''};
  if(!d.titulo)return toast('El título es obligatorio');
  saveDoc('material',id,d);
}

/* ====== Quiz del Arquitecto (Zona de Retos, Fase 1) ======
   El socio nunca lee esta colección directo (firestore.rules la deja solo
   para isAdmin()) -- ve las preguntas filtradas vía /preguntas-quiz y se
   califican en /quiz-responder, ambos en el webhook. Categorías fijas por
   ahora: las mismas ocho que se definieron para el Quiz. */
const QUIZ_CATEGORIAS=['Arquitectura','Materiales','Estructuras','Procesos constructivos','Instalaciones','Seguridad','Interpretación de planos','Ingeniería civil'];
const QUIZ_DIFICULTADES=[['facil','Fácil'],['intermedio','Intermedio'],['dificil','Difícil']];
function preguntaForm(p={}){
  const opciones=Array.isArray(p.opciones)&&p.opciones.length===4?p.opciones:['','','',''];
  const correctaIndex=Number.isInteger(p.correctaIndex)?p.correctaIndex:0;
  return `<div class="form-grid">
  <div class="field"><label>Categoría</label><select id="f-categoria">${QUIZ_CATEGORIAS.map(c=>`<option ${p.categoria===c?'selected':''}>${esc(c)}</option>`).join('')}</select></div>
  <div class="field"><label>Dificultad</label><select id="f-dificultad">${QUIZ_DIFICULTADES.map(([v,l])=>`<option value="${v}" ${p.dificultad===v?'selected':''}>${l}</option>`).join('')}</select></div>
  <div class="field form-full"><label>Pregunta</label><textarea id="f-pregunta" rows="2">${esc(p.pregunta)}</textarea></div>
  ${opciones.map((o,i)=>`<div class="field form-full"><label>Opción ${i+1}${i===correctaIndex?' ✓ correcta':''}</label>
    <div style="display:flex;gap:10px;align-items:center">
      <input id="f-opcion-${i}" value="${esc(o)}" style="flex:1">
      <label style="display:flex;align-items:center;gap:6px;white-space:nowrap;font-size:.84rem;color:var(--muted)"><input type="radio" name="f-correcta" value="${i}" ${i===correctaIndex?'checked':''}> Correcta</label>
    </div></div>`).join('')}
  <div class="field form-full"><label>Explicación (se muestra al responder, siempre)</label><textarea id="f-explicacion" rows="2">${esc(p.explicacion)}</textarea></div>
  <div class="field form-full"><label style="display:flex;align-items:center;gap:8px;font-weight:600"><input type="checkbox" id="f-activo" ${p.activo===false?'':'checked'}> Activa (aparece en el quiz de los socios)</label></div>
</div>`;}
function newPregunta(){openForm('Nueva pregunta',preguntaForm(),()=>savePregunta(null));}
function savePregunta(id){
  const opciones=[0,1,2,3].map(i=>fv('f-opcion-'+i).trim());
  const correctaEl=document.querySelector('input[name="f-correcta"]:checked');
  const d={
    categoria:fv('f-categoria'), dificultad:fv('f-dificultad')||'facil',
    pregunta:fv('f-pregunta').trim(), opciones,
    correctaIndex:correctaEl?Number(correctaEl.value):0,
    explicacion:fv('f-explicacion').trim(),
    activo:document.getElementById('f-activo')?.checked!==false
  };
  if(!d.pregunta)return toast('La pregunta es obligatoria');
  if(opciones.some(o=>!o))return toast('Completa las 4 opciones');
  if(!d.explicacion)return toast('La explicación es obligatoria');
  saveDoc('preguntas',id,d);
}
function preguntasStats(){
  const activas=DATA.preguntas.filter(p=>p.activo!==false).length;
  const porCategoria=new Set(DATA.preguntas.map(p=>p.categoria).filter(Boolean)).size;
  return {activas,porCategoria};
}
function preguntaRowCard(p){
  const dificultadLabel=(QUIZ_DIFICULTADES.find(([v])=>v===p.dificultad)||[,'Fácil'])[1];
  return `<div class="mat-row" onclick="editItem('preguntas','${p.id}')">
    <div class="mat-row__thumb" style="background:var(--rojo-50);color:var(--rojo);display:grid;place-items:center;font-weight:800;font-size:.82rem">${esc(dificultadLabel)}</div>
    <div class="mat-row__body">
      <div class="mat-row__title">${esc((p.pregunta||'').length>90?p.pregunta.slice(0,90)+'…':p.pregunta)}</div>
      <div class="mat-row__meta"><span class="mat-row__curso">${esc(p.categoria||'Sin categoría')}</span></div>
    </div>
    <span class="tag ${p.activo===false?'gray':''}">${p.activo===false?'Inactiva':'Activa'}</span>
    <div class="row-actions" onclick="event.stopPropagation()">
      <button class="ico-btn" onclick="editItem('preguntas','${p.id}')" title="Editar"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg></button>
      <button class="ico-btn del" onclick="delItem('preguntas','${p.id}')" title="Eliminar"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>
    </div>
  </div>`;
}
let _pregSearch='';
function onPregSearch(v){_pregSearch=v;const c=document.getElementById('preg-list');if(c)c.innerHTML=preguntasListaHTML();}
function preguntasFiltradas(){
  const q=_pregSearch.toLowerCase().trim();
  if(!q)return DATA.preguntas.slice();
  return DATA.preguntas.filter(p=>(p.pregunta||'').toLowerCase().includes(q)||(p.categoria||'').toLowerCase().includes(q));
}
function preguntasListaHTML(){
  const list=preguntasFiltradas();
  if(!list.length)return `<div class="card"><div class="empty"><b>Sin resultados</b><span>Prueba con otra búsqueda, o crea la primera pregunta.</span></div></div>`;
  return `<div class="mat-rows">${list.map(preguntaRowCard).join('')}</div>`;
}
function renderPreguntas(){
  const st=preguntasStats();
  return `<div class="page-head"><div>
    <div class="pill-eyebrow">Zona de Retos</div>
    <h1 class="page-h">Quiz del Arquitecto</h1><p class="page-sub">Banco de preguntas del quiz. Jugar es libre para cualquier socio; ganar monedas requiere membresía activa.</p></div>
    <button class="btn-add" onclick="newPregunta()"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>Nueva pregunta</button>
    </div>
    <div class="stats" style="margin-bottom:20px">
      ${statCard('Total preguntas',DATA.preguntas.length,'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z')}
      ${statCard('Activas en el quiz',st.activas,'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z')}
      ${statCard('Categorías en uso',st.porCategoria,'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10')}
    </div>
    <div class="search-admin" style="max-width:460px"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg><input value="${esc(_pregSearch)}" oninput="onPregSearch(this.value)" placeholder="Buscar por pregunta o categoría..."></div>
    <div id="preg-list" style="margin-top:18px">${preguntasListaHTML()}</div>`;
}

function retoVisualForm(r={}){return `<div class="form-grid"><div class="field form-full"><label>Título</label><input id="f-titulo" value="${esc(r.titulo)}"></div><div class="field"><label>Categoría</label><input id="f-categoria" value="${esc(r.categoria||'Seguridad')}"></div><div class="field"><label>Dificultad</label><select id="f-dificultad">${QUIZ_DIFICULTADES.map(([v,l])=>`<option value="${v}" ${r.dificultad===v?'selected':''}>${l}</option>`).join('')}</select></div><div class="field form-full"><label>URL de la fotografía</label><input id="f-imagen" value="${esc(r.imagen)}" placeholder="https://…"></div><div class="field form-full"><label>Fuente verificable (URL)</label><input id="f-fuente" value="${esc(r.fuente)}"></div><div class="field form-full"><label>Crédito / licencia</label><input id="f-credito" value="${esc(r.credito)}"></div><div class="field form-full"><label>Instrucción</label><textarea id="f-descripcion" rows="2">${esc(r.descripcion)}</textarea></div><div class="field form-full"><label>Pista</label><input id="f-pista" value="${esc(r.pista)}"></div><div class="field form-full"><label>Zonas correctas (JSON, coordenadas 0–100)</label><textarea id="f-zonas" rows="8" placeholder='[{"id":"zona-1","x":10,"y":20,"w":15,"h":12,"titulo":"Aspecto a revisar","feedback":"Explicación técnica prudente."}]'>${esc(JSON.stringify(r.zonas||[],null,2))}</textarea><small>Publica solo fotos reales con fuente y crédito. Usa “aspecto a revisar” si la imagen no permite confirmar un incumplimiento.</small></div><div class="field form-full"><label><input type="checkbox" id="f-activo" ${r.activo===false?'':'checked'}> Activo</label></div></div>`;}
function newRetoVisual(){openForm('Nuevo reto visual',retoVisualForm(),()=>saveRetoVisual(null));}
function saveRetoVisual(id){let zonas=[];try{zonas=JSON.parse(fv('f-zonas')||'[]');}catch(e){return toast('Las zonas deben estar en JSON válido');}const d={titulo:fv('f-titulo').trim(),categoria:fv('f-categoria').trim(),dificultad:fv('f-dificultad')||'facil',imagen:fv('f-imagen').trim(),fuente:fv('f-fuente').trim(),credito:fv('f-credito').trim(),descripcion:fv('f-descripcion').trim(),pista:fv('f-pista').trim(),zonas,activo:document.getElementById('f-activo')?.checked!==false};if(!d.titulo||!d.imagen||!d.fuente||!d.credito)return toast('Título, foto, fuente y crédito son obligatorios');if(!Array.isArray(zonas)||!zonas.length)return toast('Agrega al menos una zona');saveDoc('retos_visuales',id,d);}
function renderRetosVisuales(){const list=DATA.retos_visuales||[];return `<div class="page-head"><div><div class="pill-eyebrow">Zona de Retos</div><h1 class="page-h">Detecta el error</h1><p class="page-sub">Carga la foto, su fuente verificable y zonas en porcentajes para el juego.</p></div><button class="btn-add" onclick="newRetoVisual()">+ Nuevo reto</button></div>${list.length?`<div class="mat-rows">${list.map(r=>`<div class="mat-row" onclick="editItem('retos_visuales','${r.id}')"><div class="mat-row__thumb" style="background-image:url('${esc(driveImg(r.imagen))}')"></div><div class="mat-row__body"><div class="mat-row__title">${esc(r.titulo)}</div><div class="mat-row__meta"><span>${esc(r.categoria)} · ${(r.zonas||[]).length} zonas</span></div></div><span class="tag ${r.activo===false?'gray':''}">${r.activo===false?'Inactivo':'Activo'}</span></div>`).join('')}</div>`:`<div class="card"><div class="empty"><b>Aún no hay retos</b><span>Agrega una fotografía real y define las zonas revisables.</span></div></div>`}`;}

/* ====== TIENDA DE RECOMPENSAS ======
   Dos tipos de artículo: 'archivo' (plantilla/PDF descargable, vive en
   Drive -- la URL real nunca se le muestra a un socio que no haya pagado,
   eso lo hace /tienda-canjear en el webhook) y 'curso_anticipado' (canje de
   un solo uso por cuenta para adelantar el curso que tengan bloqueado por
   el goteo de 7 días; no se liga a un curso fijo, el socio elige cuál al
   canjear). */
const TIENDA_TIPOS=[['archivo','Archivo descargable'],['curso_anticipado','Desbloqueo anticipado de curso']];
function tiendaArticuloForm(a={}){
  const tipo=a.tipo||'archivo';
  return `<div class="form-grid">
  <div class="field"><label>Tipo</label><select id="f-tipo" onchange="toggleTiendaArchivoField(this.value)">${TIENDA_TIPOS.map(([v,l])=>`<option value="${v}" ${tipo===v?'selected':''}>${l}</option>`).join('')}</select></div>
  <div class="field"><label>Costo en monedas</label><input id="f-costo" type="number" min="1" value="${Number(a.costoMonedas)||100}"></div>
  <div class="field form-full"><label>Nombre</label><input id="f-nombre" value="${esc(a.nombre)}"></div>
  <div class="field"><label>Categoría</label><input id="f-categoria" value="${esc(a.categoria||'Plantillas')}"></div>
  <div class="field form-full"><label>Descripción (la ve el socio antes de canjear)</label><textarea id="f-descripcion" rows="2">${esc(a.descripcion)}</textarea></div>
  <div class="field form-full" id="f-archivo-wrap" style="display:${tipo==='archivo'?'block':'none'}"><label>URL del archivo (Google Drive, enlace "cualquiera con el enlace")</label><input id="f-archivo" value="${esc(a.archivoUrl)}" placeholder="https://drive.google.com/..."></div>
  <div class="field form-full"><label>Portada (URL de Drive o imagen directa, enlace "cualquiera con el enlace")</label><input id="f-img" value="${esc(a.img)}" placeholder="https://drive.google.com/..."></div>
  <div class="field form-full"><label style="display:flex;align-items:center;gap:8px;font-weight:600"><input type="checkbox" id="f-activo" ${a.activo===false?'':'checked'}> Activo (aparece en la tienda)</label></div>
</div>`;}
function toggleTiendaArchivoField(tipo){const w=document.getElementById('f-archivo-wrap');if(w)w.style.display=tipo==='archivo'?'block':'none';}
function newTiendaArticulo(){openForm('Nuevo artículo',tiendaArticuloForm(),()=>saveTiendaArticulo(null));}
function saveTiendaArticulo(id){
  const d={
    tipo:fv('f-tipo')||'archivo',
    costoMonedas:Math.max(1,Number(fv('f-costo'))||0),
    nombre:fv('f-nombre').trim(),
    categoria:fv('f-categoria').trim(),
    descripcion:fv('f-descripcion').trim(),
    archivoUrl:fv('f-archivo').trim(),
    img:fv('f-img').trim(),
    activo:document.getElementById('f-activo')?.checked!==false
  };
  if(!d.nombre)return toast('El nombre es obligatorio');
  if(!d.descripcion)return toast('La descripción es obligatoria');
  if(d.tipo==='archivo'&&!d.archivoUrl)return toast('Falta la URL del archivo');
  if(d.tipo==='curso_anticipado')d.archivoUrl='';
  saveDoc('tienda_articulos',id,d);
}
function tiendaArticuloRowCard(a){
  return `<div class="mat-row" onclick="editItem('tienda_articulos','${a.id}')">
    <div class="mat-row__thumb" style="${a.img?`background-image:url('${esc(driveImg(a.img))}')`:'background:var(--rojo-50);color:var(--rojo);display:grid;place-items:center;font-weight:800;font-size:.82rem'}">${a.img?'':(a.tipo==='curso_anticipado'?'📚':'📄')}</div>
    <div class="mat-row__body">
      <div class="mat-row__title">${esc(a.nombre)}</div>
      <div class="mat-row__meta"><span class="mat-row__curso">${esc(a.categoria||'Sin categoría')} · ${Number(a.costoMonedas)||0} monedas</span></div>
    </div>
    <span class="tag ${a.activo===false?'gray':''}">${a.activo===false?'Inactivo':'Activo'}</span>
    <div class="row-actions" onclick="event.stopPropagation()">
      <button class="ico-btn" onclick="editItem('tienda_articulos','${a.id}')" title="Editar"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg></button>
      <button class="ico-btn del" onclick="delItem('tienda_articulos','${a.id}')" title="Eliminar"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>
    </div>
  </div>`;
}
function renderTienda(){
  const list=DATA.tienda_articulos||[];
  const activos=list.filter(a=>a.activo!==false).length;
  return `<div class="page-head"><div>
    <div class="pill-eyebrow">Zona de Retos</div>
    <h1 class="page-h">Tienda de recompensas</h1><p class="page-sub">Lo que los socios canjean con las monedas que ganan jugando. El archivo real solo se revela después de canjear.</p></div>
    <button class="btn-add" onclick="newTiendaArticulo()"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>Nuevo artículo</button>
    </div>
    <div class="stats" style="margin-bottom:20px">
      ${statCard('Artículos totales',list.length,'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4')}
      ${statCard('Activos en la tienda',activos,'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z')}
    </div>
    ${list.length?`<div class="mat-rows">${list.map(tiendaArticuloRowCard).join('')}</div>`:`<div class="card"><div class="empty"><b>Aún no hay artículos</b><span>Agrega una plantilla descargable o el desbloqueo anticipado de curso.</span></div></div>`}`;
}

/* ====== DIRECTORIO VIP (admin: moderar las tarjetas que arman los socios) ====== */
function renderDirectorioAdmin(){
  return `<div class="page-head"><div>
    <div class="pill-eyebrow">Comunidad</div>
    <h1 class="page-h">Directorio</h1><p class="page-sub">Tarjetas profesionales que arman los socios desde el Club. Aquí solo moderas — ellos las crean y editan desde su cuenta.</p></div></div>
    <div class="stats" style="margin-bottom:20px">${statCard('Tarjetas publicadas',DATA.directorio.length,'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z')}</div>
    ${searchBar('directorio','Buscar por nombre, empresa, puesto o sector...')}
    <div class="card"><div class="tbl-wrap"><table class="tbl"><thead><tr>${['Nombre','Empresa','Puesto','Sector'].map(h=>`<th>${h}</th>`).join('')}<th></th></tr></thead>
    <tbody id="tbl-body">${rowsHTML('directorio')}</tbody></table></div><div id="tbl-pager">${pagerInner('directorio')}</div></div>`;
}
function dirRow(d){return `<tr>
  <td><div class="t-cell"><div class="t-thumb" style="border-radius:9px;background:${esc(d.colorPortada)||'var(--rojo)'};color:#fff;display:grid;place-items:center;font-weight:700;font-family:var(--font-display)">${esc((d.nombre||'S')[0].toUpperCase())}</div><span class="t-title">${esc(d.nombre||'—')}</span></div></td>
  <td>${esc(d.empresa||'—')}</td><td>${esc(d.puesto||'—')}</td><td>${d.sector?`<span class="tag">${esc(d.sector)}</span>`:'—'}</td>
  <td><div class="row-actions">
    <button class="ico-btn" onclick="verTarjetaDirectorio('${d.id}')" title="Ver tarjeta completa"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg></button>
    <button class="ico-btn del" onclick="delItem('directorio','${d.id}')" title="Eliminar"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>
  </div></td></tr>`;}
function verTarjetaDirectorio(id){
  const d=DATA.directorio.find(x=>x.id===id);if(!d)return;
  const contacto=d.contacto||{};
  document.getElementById('modal-content').innerHTML=`
    <div class="modal-head"><h3>${esc(d.nombre||'Tarjeta')}</h3><button class="modal-x" onclick="closeModal()">✕</button></div>
    <div class="modal-body">
      <p style="color:var(--muted);margin-bottom:4px">${esc(d.puesto||'—')} ${d.empresa?'· '+esc(d.empresa):''}</p>
      ${d.sector?`<span class="tag" style="margin-bottom:12px;display:inline-block">${esc(d.sector)}</span>`:''}
      ${d.bio?`<p style="margin-top:10px">${esc(d.bio)}</p>`:'<p style="color:var(--muted)">Sin biografía.</p>'}
      <div style="margin-top:14px;display:flex;flex-direction:column;gap:6px;font-size:.88rem">
        ${contacto.email?`<span>✉️ ${esc(contacto.email)}</span>`:''}
        ${contacto.telefono?`<span>📞 ${esc(contacto.telefono)}</span>`:''}
        ${contacto.whatsapp?`<span>💬 ${esc(contacto.whatsapp)}</span>`:''}
        ${contacto.web?`<span>🌐 ${esc(contacto.web)}</span>`:''}
        ${contacto.linkedin?`<span>🔗 ${esc(contacto.linkedin)}</span>`:''}
      </div>
      <div class="modal-foot"><button class="btn-ghost" onclick="closeModal()">Cerrar</button><button class="btn-save" style="background:var(--rojo)" onclick="delItem('directorio','${d.id}');closeModal()">Eliminar tarjeta</button></div>
    </div>`;
  document.getElementById('modal').classList.add('open');
}

/* ====== CERTIFICADOS ======
   Igual que en DulceLab: la emisión automática (PDF + envío por correo) no
   está activa todavía, así que esto es un registro manual de qué socio
   recibió qué certificado — ver vip-admin.html líneas 4451-4457 de DulceLab,
   mismo texto de aviso. */
function renderCertificados(){
  const list=certificadosFiltrados();
  return `<div class="page-head"><div>
    <div class="pill-eyebrow">Emisión</div>
    <h1 class="page-h">Certificados</h1><p class="page-sub">Aquí aparecen los certificados emitidos. <strong style="color:#b86b00">La emisión automática (PDF + envío por correo) todavía no está activa</strong> — por ahora se registran aquí manualmente.</p></div>
    <button class="btn-add" onclick="newCertificado()"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>Nuevo certificado</button></div>
    ${searchBar('certificados','Buscar por miembro o curso...')}
    <div id="cert-list">${list.length?list.map(certCard).join(''):`<div class="card"><div class="empty"><b>${DATA.certificados.length?'Sin resultados':'Aún no hay registros'}</b><span>${DATA.certificados.length?'Prueba con otra búsqueda.':'Crea el primero con el botón de arriba.'}</span></div></div>`}</div>`;
}
function certificadosFiltrados(){
  const q=(_search.certificados||'').toLowerCase().trim();
  let list=DATA.certificados.slice();
  if(q)list=list.filter(c=>`${c.miembro||''} ${c.curso||''}`.toLowerCase().includes(q));
  return list.sort((a,b)=>new Date(b.emitido||0)-new Date(a.emitido||0));
}
function certMeta(c){
  const curso=DATA.cursos.find(x=>x.titulo===c.curso);
  const sesiones=curso?(curso.listaClases?curso.listaClases.length:curso.clases)||0:0;
  return {area:curso?.categoria||'General',horas:curso?horasCurso(curso):0,sesiones};
}
function certCard(c){
  const {area,horas,sesiones}=certMeta(c);
  return `<div class="cert-row-card">
    <div class="crc-ico"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width:20px;height:20px"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg></div>
    <div class="crc-body">
      <b>${esc(c.miembro||'—')} · ${esc(c.curso||'—')}</b>
      <div class="crc-meta"><span>🏷 ${esc(area)}</span><span>📅 ${esc(c.fecha||'—')}</span>${horas?`<span>🕐 ${horas}h</span>`:''}${sesiones?`<span>${sesiones} sesiones</span>`:''}</div>
      <div class="crc-folio">${esc(certFolio(c))}</div>
    </div>
    <span class="tag green">● Registrado</span>
    <div class="row-actions">
      <button class="ico-btn" onclick="verMiembroPorNombre('${esc(c.miembro).replace(/'/g,"\\'")}')" title="Ver miembro"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg></button>
      <button class="ico-btn del" onclick="delItem('certificados','${c.id}')" title="Eliminar"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>
    </div>
  </div>`;
}
/* Mismo formato de folio que ya usa generarCertificado() en el Club
   (imdac-club/app.js genFolio) — para que el registro manual del admin se
   vea igual que el que produce el PDF real. */
function certFolio(c){
  if(c.folio)return c.folio;
  const año=new Date(c.emitido||Date.now()).getFullYear();
  const hash=String(c.id||'').slice(0,6).toUpperCase()||'000000';
  return `IMDAC-${año}-${hash}`;
}
function verMiembroPorNombre(nombre){
  const m=DATA.miembros.find(x=>x.nombre===nombre);
  if(m)verMiembro(m.id);else toast('No se encontró el miembro');
}
function certificadoForm(c={}){
  const miembros=(DATA.miembros||[]).map(m=>`<option value="${esc(m.nombre)}" ${c.miembro===m.nombre?'selected':''}>${esc(m.nombre)}</option>`).join('');
  const cursos=(DATA.cursos||[]).map(x=>`<option value="${esc(x.titulo)}" ${c.curso===x.titulo?'selected':''}>${esc(x.titulo)}</option>`).join('');
  return `<div class="form-grid">
  <div class="field form-full"><label>Miembro</label><select id="f-miembro"><option value="">— Elige un miembro —</option>${miembros}</select></div>
  <div class="field form-full"><label>Curso</label><select id="f-curso"><option value="">— Elige un curso —</option>${cursos}</select></div>
  <div class="field"><label>Fecha</label><input id="f-fecha" value="${esc(c.fecha)||new Date().toLocaleDateString('es-MX')}"></div>
</div>`;}
function newCertificado(){openForm('Nuevo certificado',certificadoForm(),()=>saveCertificado(null));}
function saveCertificado(id){
  const d={miembro:fv('f-miembro'),curso:fv('f-curso'),fecha:fv('f-fecha'),emitido:new Date().toISOString()};
  if(!d.miembro||!d.curso)return toast('Elige miembro y curso');
  saveDoc('certificados',id,d);
}

/* ====== MIEMBROS ====== */
/* ====== MIEMBROS ======
   Igual que "Miembros VIP" de DulceLab (vip-admin.html líneas ~4590-5136):
   búsqueda + chips de plan/estado + tarjetas con menú de acciones contextual
   (distinto si el socio ya pagó o no). "Activar Plan Mensual/Anual" es una
   activación MANUAL sin pasar por Stripe — mismo texto de aviso que usa
   DulceLab — útil para pagos en efectivo/transferencia fuera de línea. */
let _mbPlan='todos', _mbEstado='todos';
function miembroPlan(m){
  if(m.plan)return m.plan;
  if((m.diasRegalados||0)>0)return 'Regalo';
  if(m.estado==='Activo'&&m.vigenciaHasta)return 'Membresía';
  return 'Sin pagar';
}
function miembrosFiltrados(){
  const q=(_search.miembros||'').toLowerCase().trim();
  let list=DATA.miembros.slice();
  if(q)list=list.filter(m=>[m.nombre,m.email,m.ciudad].join(' ').toLowerCase().includes(q));
  if(_mbPlan!=='todos')list=list.filter(m=>miembroPlan(m)===_mbPlan);
  if(_mbEstado!=='todos')list=list.filter(m=>m.estado===_mbEstado);
  return list;
}
function mbPillsPlan(){
  const planes=['Mensual','Anual','Regalo','Sin pagar'];
  const counts={};DATA.miembros.forEach(m=>{const p=miembroPlan(m);counts[p]=(counts[p]||0)+1;});
  let html=`<button class="chip ${_mbPlan==='todos'?'active':''}" onclick="setMbPlan('todos')">Todos los planes <span class="chip-count">${DATA.miembros.length}</span></button>`;
  html+=planes.filter(p=>counts[p]).map(p=>`<button class="chip ${_mbPlan===p?'active':''}" onclick="setMbPlan('${p}')">${p} <span class="chip-count">${counts[p]}</span></button>`).join('');
  return html;
}
function mbPillsEstado(){
  const counts={};DATA.miembros.forEach(m=>{const e=m.estado;if(e)counts[e]=(counts[e]||0)+1;});
  let html=`<button class="chip ${_mbEstado==='todos'?'active':''}" onclick="setMbEstado('todos')">Todos los estados <span class="chip-count">${DATA.miembros.length}</span></button>`;
  html+=['Activo','Cancelado','Suspendido'].filter(e=>counts[e]).map(e=>`<button class="chip ${_mbEstado===e?'active':''}" onclick="setMbEstado('${e}')">${e==='Activo'?'Activos':e==='Cancelado'?'Cancelados':'Suspendidos'} <span class="chip-count">${counts[e]}</span></button>`).join('');
  return html;
}
function setMbPlan(p){_mbPlan=p;renderSection('miembros');}
function setMbEstado(e){_mbEstado=e;renderSection('miembros');}
function miembroCard(m){
  const plan=miembroPlan(m);
  const estado=m.estado||'';
  const planClass=plan==='Mensual'?'tag amber':plan==='Anual'?'tag':plan==='Regalo'?'tag purple':'tag gray';
  const estTag=estado==='Cancelado'?'<span class="tag gray">CANCELADO</span>':estado==='Suspendido'?'<span class="tag">SUSPENDIDO</span>':estado==='Activo'?'<span class="tag green">ACTIVO</span>':'<span class="tag gray">SIN PAGAR</span>';
  return `<div class="mb-card">
    <div class="mb-av">${esc((m.nombre||'U')[0].toUpperCase())}</div>
    <div class="mb-body">
      <b>${esc(m.nombre||'—')}</b>
      <span class="mb-meta">✉ ${esc(m.email||'—')}</span>
      <span class="mb-reg">Se registró ${esc(m.alta||'—')}</span>
    </div>
    <span class="${planClass}">${plan.toUpperCase()}</span>
    ${estTag}
    <button class="ico-btn" onclick="abrirAccionesMiembro('${m.id}')" title="Acciones"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 5v.01M12 12v.01M12 19v.01"/></svg></button>
  </div>`;
}
function renderMiembros(){
  const list=miembrosFiltrados();
  return `<div class="page-head"><div>
    <div class="pill-eyebrow">Comunidad</div>
    <h1 class="page-h">Miembros</h1><p class="page-sub">Consulta y administra los miembros del Club.</p></div></div>
    ${searchBar('miembros','Buscar por nombre, correo o ciudad...')}
    <div class="chips-row">${mbPillsPlan()}</div>
    <div class="chips-row" style="margin-bottom:18px">${mbPillsEstado()}</div>
    <div id="mb-list">${list.length?list.map(miembroCard).join(''):`<div class="card"><div class="empty"><b>${DATA.miembros.length?'Sin resultados':'Aún no hay miembros'}</b><span>${DATA.miembros.length?'Prueba con otro filtro o búsqueda.':''}</span></div></div>`}</div>`;
}
function verMiembro(id){abrirAccionesMiembro(id);}
function abrirAccionesMiembro(id){
  const m=DATA.miembros.find(x=>x.id===id);if(!m)return;
  const activo=m.estado==='Activo';
  const plan=miembroPlan(m);
  document.getElementById('modal-content').innerHTML=`
    <div class="modal-head"><h3>Acciones del miembro</h3><button class="modal-x" onclick="closeModal()">✕</button></div>
    <div class="modal-body">
      <div class="member-hero"><div class="av">${esc((m.nombre||'U')[0].toUpperCase())}</div><div><h3 style="font-family:var(--font-display);font-size:1.3rem">${esc(m.nombre||'—')}</h3><span style="color:var(--muted)">${esc(m.email||'')}</span></div><div style="margin-left:auto">${activo?'<span class="tag green">● Activo</span>':'<span class="tag gray">○ '+esc(plan)+'</span>'}</div></div>
      <div class="mb-actions">
        <button class="mb-action" onclick="editarNombreMiembro('${id}')"><span class="ma-ico" style="--c:#6B7280"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg></span><span class="ma-body"><b>Editar nombre</b><span>Corrige cómo se muestra en el panel y el directorio</span></span>›</button>
        ${!activo?`
        <button class="mb-action" onclick="activarPlanManual('${id}','Mensual',30)"><span class="ma-ico" style="--c:#B8862F"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path stroke-linecap="round" d="M16 2v4M8 2v4M3 10h18"/></svg></span><span class="ma-body"><b>Activar Plan Mensual</b><span>30 días de acceso · activación manual</span></span>›</button>
        <button class="mb-action" onclick="activarPlanManual('${id}','Anual',365)"><span class="ma-ico" style="--c:#6B1526"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg></span><span class="ma-body"><b>Activar Plan Anual</b><span>365 días de acceso · activación manual</span></span>›</button>
        <button class="mb-action" onclick="regalarTiempo('${id}');document.getElementById('mbr-panel-wrap').scrollIntoView({behavior:'smooth'})"><span class="ma-ico" style="--c:#A855F7"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M20 7h-7m0 0V3m0 4L9 7m0 0H4m0 0l4 4m-4-4l4-4M4 7v12a1 1 0 001 1h14a1 1 0 001-1V7"/></svg></span><span class="ma-body"><b>Regalar acceso temporal</b><span>Elige cuántos días de cortesía</span></span>›</button>
        `:`
        <button class="mb-action" onclick="regalarTiempo('${id}');document.getElementById('mbr-panel-wrap').scrollIntoView({behavior:'smooth'})"><span class="ma-ico" style="--c:#E5C171"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg></span><span class="ma-body"><b>Renovar / extender</b><span>Suma días a la vigencia actual</span></span>›</button>
        <button class="mb-action" onclick="toggleMiembroEstado('${id}')"><span class="ma-ico" style="--c:#F59E0B"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/></svg></span><span class="ma-body"><b>Cancelar membresía</b><span>El socio pierde acceso al contenido</span></span>›</button>
        `}
        <button class="mb-action" onclick="verProgreso('${id}');document.getElementById('mbr-panel-wrap').scrollIntoView({behavior:'smooth'})"><span class="ma-ico" style="--c:#60A5FA"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2"/></svg></span><span class="ma-body"><b>Ver progreso</b><span>Avance por curso asignado</span></span>›</button>
        <button class="mb-action" onclick="asignarCurso('${id}');document.getElementById('mbr-panel-wrap').scrollIntoView({behavior:'smooth'})"><span class="ma-ico" style="--c:#22C55E"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg></span><span class="ma-body"><b>Asignar curso</b><span>Darle acceso a un curso puntual</span></span>›</button>
        <button class="mb-action mb-action--danger" onclick="eliminarMiembroReal('${id}')"><span class="ma-ico" style="--c:#EF4444"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></span><span class="ma-body"><b>Eliminar miembro</b><span>Borra de Firestore y Firebase Auth · irreversible</span></span>›</button>
      </div>
      <div id="mbr-panel-wrap"><div id="mbr-panel"></div></div>
      <div class="modal-foot"><button class="btn-ghost" onclick="closeModal()">Cerrar</button></div>
    </div>`;
  document.getElementById('modal').classList.add('open');
}
/* Borra Firestore Y Firebase Auth (como DulceLab) — Firestore solo no puede
   tocar Auth, por eso pasa por el webhook con requireAdmin. Sin undo: es
   irreversible de verdad. */
async function eliminarMiembroReal(id){
  const m=DATA.miembros.find(x=>x.id===id);if(!m)return;
  if(!confirm(`¿Eliminar definitivamente a ${m.nombre||'este miembro'}? Se borra su registro y su acceso (Firebase Auth) · no se puede deshacer.`))return;
  const btn=document.querySelector(`[onclick="eliminarMiembroReal('${id}')"]`);
  if(btn){btn.disabled=true;btn.style.opacity='.6';}
  try{
    await apiFetch('/admin/eliminar-miembro',{body:{uid:id}});
    DATA.miembros=DATA.miembros.filter(x=>x.id!==id);
    closeModal();
    renderSection(currentSection);
    toast('Miembro eliminado de Firestore y Firebase Auth',{type:'ok'});
  }catch(e){
    if(btn){btn.disabled=false;btn.style.opacity='1';}
    toast(e.message||'No se pudo eliminar al miembro',{type:'err'});
  }
}
function editarNombreMiembro(id){
  const m=DATA.miembros.find(x=>x.id===id);if(!m)return;
  const p=document.getElementById('mbr-panel');if(!p)return;
  p.innerHTML=`<div style="${_MBRFORM}">
    <label style="font-size:.82rem;color:var(--muted)">Nombre completo</label>
    <div style="display:flex;gap:8px;margin-top:6px">
      <input id="en-nombre" value="${esc(m.nombre)}" style="${_MBRINP}">
      <button class="btn-save" onclick="confirmEditarNombre('${id}')">Guardar</button>
    </div></div>`;
}
function confirmEditarNombre(id){
  const m=DATA.miembros.find(x=>x.id===id);if(!m)return;
  const nombre=document.getElementById('en-nombre').value.trim();
  if(!nombre)return toast('El nombre no puede quedar vacío',{type:'err'});
  m.nombre=nombre;
  _saveMiembro(m,'Nombre actualizado');
  abrirAccionesMiembro(id);
}
/* Activación manual sin pasar por Stripe — el admin ya puede escribir estos
   campos directo (firestore.rules: isAdmin() los exceptúa de la restricción
   que le aplica al propio socio). Útil para pagos en efectivo/transferencia. */
function activarPlanManual(id,plan,dias){
  const m=DATA.miembros.find(x=>x.id===id);if(!m)return;
  if(!confirm(`¿Activar ${plan} (${dias} días) para ${m.nombre||'este miembro'}? Esto es una activación manual, sin pasar por Stripe.`))return;
  const expira=new Date();expira.setDate(expira.getDate()+dias);
  m.estado='Activo';m.plan=plan;m.vigenciaHasta=expira.toISOString().slice(0,10);
  _saveMiembro(m,`Plan ${plan} activado para ${m.nombre||'el miembro'}`);
  notificarMiembro(id,'✅',`¡Plan ${plan} activado!`,`IMDAC activó tu membresía ${plan}. Tu acceso está vigente hasta el ${m.vigenciaHasta}.`);
  abrirAccionesMiembro(id);
}
const _MBRFORM='background:var(--base);border:1.5px solid var(--line);border-radius:12px;padding:14px;margin-top:8px';
const _MBRINP='flex:1;padding:10px 12px;border:1.5px solid var(--line);border-radius:10px;background:var(--surface,var(--base));color:var(--text)';
function notificarMiembro(uid,emoji,titulo,mensaje){
  if(!FB_OK||!uid)return;
  db.collection('notificaciones').add({
    emoji,titulo,mensaje,
    paraUid:uid,
    fecha:new Date().toLocaleDateString('es-MX'),
    creado:firebase.firestore.FieldValue.serverTimestamp()
  }).catch(()=>{});
}
function _saveMiembro(m,msg){
  if(FB_OK){const {id,alta,...rest}=m;db.collection('miembros').doc(id).set(rest,{merge:true}).then(()=>toast(msg,{type:'ok'})).catch(()=>toast('Error al guardar',{type:'err'}));}
  else toast(msg+' (demo)',{type:'ok'});
}
function regalarTiempo(id){
  const p=document.getElementById('mbr-panel');if(!p)return;
  p.innerHTML=`<div style="${_MBRFORM}">
    <label style="font-size:.82rem;color:var(--muted)">Días a regalar / extender vigencia</label>
    <div style="display:flex;gap:8px;margin-top:6px">
      <input id="rt-dias" type="number" min="1" value="30" style="${_MBRINP}">
      <button class="btn-save" onclick="confirmRegalarTiempo('${id}')">Aplicar</button>
    </div></div>`;
}
function confirmRegalarTiempo(id){
  const m=DATA.miembros.find(x=>x.id===id);if(!m)return;
  const dias=+document.getElementById('rt-dias').value||0;
  if(dias<=0)return toast('Indica un número de días válido',{type:'err'});
  let base=m.vigenciaHasta?new Date(m.vigenciaHasta):new Date();
  if(isNaN(base.getTime()))base=new Date();
  base.setDate(base.getDate()+dias);
  m.vigenciaHasta=base.toISOString().slice(0,10);
  m.diasRegalados=(m.diasRegalados||0)+dias;
  _saveMiembro(m,`Se regalaron ${dias} días a ${m.nombre||'el miembro'}`);
  notificarMiembro(id,'🎁','¡Te regalamos acceso!',`IMDAC te otorgó ${dias} días de acceso de cortesía. Tu membresía está activa hasta el ${m.vigenciaHasta}. ¡Disfruta el contenido!`);
  verMiembro(id);
}
function asignarCurso(id){
  const m=DATA.miembros.find(x=>x.id===id);if(!m)return;
  const asign=m.cursosAsignados||[];
  const opts=DATA.cursos.map(c=>`<option value="${c.id}" ${asign.includes(c.id)?'disabled':''}>${esc(c.titulo)}${asign.includes(c.id)?' (ya asignado)':''}</option>`).join('');
  const p=document.getElementById('mbr-panel');if(!p)return;
  p.innerHTML=`<div style="${_MBRFORM}">
    <label style="font-size:.82rem;color:var(--muted)">Asignar curso a este socio</label>
    <div style="display:flex;gap:8px;margin-top:6px">
      <select id="ac-curso" style="${_MBRINP}">${opts||'<option value="">Sin cursos disponibles</option>'}</select>
      <button class="btn-save" onclick="confirmAsignarCurso('${id}')">Asignar</button>
    </div></div>`;
}
function confirmAsignarCurso(id){
  const m=DATA.miembros.find(x=>x.id===id);if(!m)return;
  const cid=document.getElementById('ac-curso').value;if(!cid)return;
  m.cursosAsignados=Array.from(new Set([...(m.cursosAsignados||[]),cid]));
  const c=DATA.cursos.find(x=>x.id===cid);
  _saveMiembro(m,`Curso "${c?c.titulo:cid}" asignado`);
  notificarMiembro(id,'📚','Nuevo curso desbloqueado',`Se te dio acceso al curso "${c?c.titulo:'nuevo curso'}". Ya puedes verlo en tu biblioteca. ¡A aprender!`);
  verMiembro(id);
}
function verProgreso(id){
  const m=DATA.miembros.find(x=>x.id===id);if(!m)return;
  const p=document.getElementById('mbr-panel');if(!p)return;
  const asign=m.cursosAsignados||[];
  const pintar=(prog)=>{
    const ids=Array.from(new Set([...Object.keys(prog),...asign]));
    if(!ids.length){p.innerHTML=`<div style="${_MBRFORM}"><span style="color:var(--muted);font-size:.88rem">Sin datos de progreso ni cursos asignados.</span></div>`;return;}
    p.innerHTML=`<div style="${_MBRFORM}">${ids.map(cid=>{
      const c=DATA.cursos.find(x=>x.id===cid);const pct=Math.round(prog[cid]||0);
      return `<div style="margin-bottom:11px"><div style="display:flex;justify-content:space-between;font-size:.85rem;margin-bottom:4px"><span>${c?esc(c.titulo):cid}</span><b>${pct}%</b></div><div style="height:8px;background:var(--line);border-radius:6px;overflow:hidden"><i style="display:block;height:100%;width:${pct}%;background:var(--rojo)"></i></div></div>`;
    }).join('')}</div>`;
  };
  if(FB_OK){
    p.innerHTML=`<div style="${_MBRFORM}"><span style="color:var(--muted);font-size:.88rem">Cargando progreso…</span></div>`;
    db.collection('progreso').where('uid','==',id).get().then(snap=>{
      const prog={};snap.forEach(d=>{const x=d.data();prog[x.cursoId]=x.porcentaje||0;});
      pintar(prog);
    }).catch(()=>pintar(m.progreso||{}));
  }else pintar(m.progreso||{});
}
function toggleMiembroEstado(id){
  const m=DATA.miembros.find(x=>x.id===id);if(!m)return;
  m.estado=(m.estado||'Activo')==='Cancelado'?'Activo':'Cancelado';
  _saveMiembro(m,m.estado==='Cancelado'?'Membresía cancelada':'Membresía reactivada');
  if(m.estado==='Cancelado')notificarMiembro(id,'⛔','Membresía cancelada','Tu membresía fue cancelada por el equipo IMDAC. Si crees que es un error, escríbenos por WhatsApp.');
  else notificarMiembro(id,'✅','Membresía reactivada','¡Buenas noticias! Tu membresía fue reactivada por el equipo IMDAC. Ya tienes acceso completo de nuevo.');
  verMiembro(id);if(typeof rebuildRows==='function')rebuildRows();
}

/* ====== FORO (moderación) — igual que DulceLab (Pages.foro en vip-admin.html):
   KPIs reales, componer como cuenta oficial, ver/responder/borrar respuestas.
   Adaptado a la colección real de IMDAC (foro_temas + comentarios), que ya
   usa el Club de socios — no se inventó una colección paralela como 'posts'.
   Sin subida de imagen: el Club tampoco la soporta todavía en el foro (el
   botón de imagen del socio dice "disponible pronto"), así que no se ofrece
   solo del lado admin. */
function foroTiempoRelativo(t){
  let d;try{d=t.creado&&t.creado.toDate?t.creado.toDate():new Date(t.fecha);}catch(e){return t.fecha||'';}
  if(!d||isNaN(d.getTime()))return t.fecha||'';
  const seg=Math.floor((Date.now()-d.getTime())/1000);
  if(seg<60)return 'ahora';
  if(seg<3600)return `hace ${Math.floor(seg/60)} min`;
  if(seg<86400)return `hace ${Math.floor(seg/3600)} h`;
  return d.toLocaleDateString('es-MX',{day:'numeric',month:'short'});
}
function renderForo(){
  const temas=DATA.foro||[];
  const autoresUnicos=new Set(temas.map(t=>t.autorUid).filter(Boolean)).size;
  const likesTotal=temas.reduce((s,t)=>s+(t.likes||0),0);
  const h24=temas.filter(t=>{let d;try{d=t.creado&&t.creado.toDate?t.creado.toDate():new Date(t.fecha);}catch(e){return false;}return d&&!isNaN(d.getTime())&&(Date.now()-d.getTime())<86400000;}).length;
  return `<div class="page-head"><div><h1 class="page-h">Foro · Moderación</h1><p class="page-sub">Modera los temas y respuestas publicados por la comunidad. Puedes borrar cualquiera.</p></div></div>
  <div class="stats">
    ${statCard('Publicaciones',temas.length,'M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z')}
    ${statCard('Autores distintos',autoresUnicos,'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z')}
    ${statCard('Reacciones totales',likesTotal,'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z')}
    ${statCard('Últimas 24 h',h24,'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z')}
  </div>
  <div class="card fr-compose">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;flex-wrap:wrap">
      <span class="tag" style="background:var(--rojo);color:#fff">IMDAC</span>
      <span style="color:var(--muted);font-size:.8rem">Publica como cuenta oficial — ideal para anuncios o resolver dudas de membresía</span>
    </div>
    <textarea id="fr-texto" rows="2" maxlength="1500" placeholder="Escribe un anuncio o mensaje para la comunidad…" oninput="document.getElementById('fr-char').textContent=this.value.length+' / 1500'"></textarea>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px">
      <span id="fr-char" style="color:var(--muted);font-size:.78rem">0 / 1500</span>
      <button class="btn-add" onclick="publicarTemaAdmin()">Publicar como IMDAC</button>
    </div>
  </div>
  <div id="fr-list">${temas.length?temas.map(foroAdminCard).join(''):`<div class="card"><div class="empty"><b>Aún no hay publicaciones</b><span>Nada en el foro todavía.</span></div></div>`}</div>`;
}
function foroAdminCard(t){
  const autor=t.autor||'Miembro';
  const av=autor.trim().split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase()||'?';
  const esIMDAC=t.autor==='IMDAC'||!!t.esAdmin;
  return `<div class="fr-card">
    <div class="fr-card__head">
      <div class="mb-av" style="${esIMDAC?'':'background:var(--gris-500)'}">${esc(av)}</div>
      <div><b class="fr-card__name">${esc(autor)}</b>${esIMDAC?'<span class="tag" style="background:var(--rojo);color:#fff;margin-left:6px">IMDAC</span>':`<span class="tag gray" style="margin-left:6px">${esc(t.tag||'General')}</span>`}</div>
      <span class="fr-card__time">${foroTiempoRelativo(t)}</span>
    </div>
    <div class="fr-card__text">${esc(t.texto||t.titulo||'')}</div>
    <div class="fr-card__meta">
      <span>❤ ${t.likes||0}</span>
      <button class="btn-ghost" style="padding:4px 10px;font-size:.78rem" onclick="foroAdminVerComentarios('${t.id}')">Ver respuestas y responder</button>
      <button class="ico-btn del fr-card__del" onclick="delItem('foro','${t.id}')" title="Eliminar publicación"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>
    </div>
    <div class="fr-coms" id="fr-coms-${t.id}" style="display:none"></div>
  </div>`;
}
function foroAdminVerComentarios(id){
  const box=document.getElementById('fr-coms-'+id);if(!box)return;
  if(box.style.display==='block'){box.style.display='none';box.innerHTML='';return;}
  box.style.display='block';
  foroAdminCargarComentarios(id);
}
function foroAdminCargarComentarios(id){
  const box=document.getElementById('fr-coms-'+id);if(!box)return;
  box.innerHTML='<div style="color:var(--muted);font-size:.8rem;padding:4px 0">Cargando…</div>';
  db.collection('foro_temas').doc(id).collection('comentarios').orderBy('creado','asc').get().then(snap=>{
    const coms=snap.docs.map(d=>({id:d.id,...d.data()}));
    box.innerHTML=(coms.length?coms.map(c=>foroAdminComentario(id,c)).join(''):'<div style="color:var(--muted);font-size:.8rem;padding:4px 0">Sin respuestas todavía.</div>')
      +`<div class="fr-reply"><input id="fr-reply-${id}" placeholder="Responder como IMDAC..." onkeydown="if(event.key==='Enter')foroAdminResponder('${id}')"><button class="btn-ghost" onclick="foroAdminResponder('${id}')">Responder</button></div>`;
  }).catch(()=>{box.innerHTML='<div style="color:var(--muted);font-size:.8rem">No se pudieron cargar las respuestas.</div>';});
}
function foroAdminComentario(temaId,c){
  const esIMDAC=c.autor==='IMDAC'||!!c.esAdmin;
  const av=(c.autor||'M').trim().split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();
  return `<div class="fr-com">
    <div class="fr-com__av" style="${esIMDAC?'background:var(--rojo);color:#fff':''}">${esc(av)}</div>
    <div class="fr-com__body"><b>${esc(c.autor||'Miembro')}</b><span>${foroTiempoRelativo(c)}</span><div class="fr-com__text">${esc(c.texto||'')}</div></div>
    <button class="ico-btn del" style="width:28px;height:28px;flex-shrink:0" onclick="foroAdminBorrarComentario('${temaId}','${c.id}')" title="Eliminar respuesta"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width:14px;height:14px"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>
  </div>`;
}
function foroAdminBorrarComentario(temaId,cId){
  if(!confirm('¿Eliminar esta respuesta?'))return;
  db.collection('foro_temas').doc(temaId).collection('comentarios').doc(cId).delete()
    .then(()=>{toast('Respuesta eliminada',{type:'ok'});foroAdminCargarComentarios(temaId);})
    .catch(()=>toast('No se pudo eliminar',{type:'err'}));
}
function foroAdminResponder(temaId){
  const inp=document.getElementById('fr-reply-'+temaId);if(!inp)return;
  const texto=(inp.value||'').trim();if(!texto)return;
  if(!FB_OK||!CURRENT_USER||CURRENT_USER.uid==='demo')return toast('Inicia sesión con una cuenta admin real',{type:'err'});
  const c={texto,autor:'IMDAC',autorUid:CURRENT_USER.uid,esAdmin:true,fecha:new Date().toLocaleDateString('es-MX'),likes:0,likedBy:[],creado:firebase.firestore.FieldValue.serverTimestamp()};
  inp.disabled=true;
  db.collection('foro_temas').doc(temaId).collection('comentarios').add(c)
    .then(()=>{inp.value='';toast('Respuesta publicada',{type:'ok'});foroAdminCargarComentarios(temaId);})
    .catch(()=>{inp.disabled=false;toast('No se pudo responder',{type:'err'});});
}
function publicarTemaAdmin(){
  const ta=document.getElementById('fr-texto');if(!ta)return;
  const texto=(ta.value||'').trim();
  if(!texto)return toast('Escribe algo para publicar');
  if(!FB_OK||!CURRENT_USER||CURRENT_USER.uid==='demo')return toast('Inicia sesión con una cuenta admin real',{type:'err'});
  const titulo=texto.length>70?texto.slice(0,70).trim()+'…':texto;
  const tema={titulo,texto,tag:'Anuncio IMDAC',autor:'IMDAC',autorUid:CURRENT_USER.uid,esAdmin:true,fecha:new Date().toLocaleDateString('es-MX'),vistas:0,likes:0,likedBy:[],creado:firebase.firestore.FieldValue.serverTimestamp()};
  db.collection('foro_temas').add(tema).then(ref=>{
    DATA.foro.unshift({id:ref.id,...tema});
    ta.value='';const ch=document.getElementById('fr-char');if(ch)ch.textContent='0 / 1500';
    renderSection('foro');
    toast('Publicado como IMDAC',{type:'ok'});
  }).catch(()=>toast('No se pudo publicar',{type:'err'}));
}

/* ====== NOTIFICACIONES ======
   Igual que DulceLab no solo en lo visual: el formulario de alta vive en la
   misma página (no en un modal aparte), con tipo+color+ícono, contador de
   caracteres y vista previa en vivo de cómo se va a ver en la campanita del
   socio — antes de mandarla, no después de adivinar. Ver vip-admin.html
   líneas 1828-1950 de DulceLab para la referencia exacta. */
const NOTIF_TIPOS={
  clase:{label:'Clase',icon:'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z',color:'var(--rojo)',emoji:'🎥'},
  certificado:{label:'Certificado',icon:'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',color:'#D5A13D',emoji:'🎓'},
  logro:{label:'Logro',icon:'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z',color:'#FBBF24',emoji:'🏆'},
  sistema:{label:'Sistema',icon:'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',color:'#60A5FA',emoji:'⚙️'},
  general:{label:'General',icon:'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',color:'#A78BFA',emoji:'📢'},
};
let _notifTipo='clase';
function notifStats(){
  const ahora=Date.now();
  const ms=n=>n.creado?.toDate?.()?.getTime?.()||(n.fecha?new Date(n.fecha).getTime():0)||0;
  return {
    total:DATA.notificaciones.length,
    hoy:DATA.notificaciones.filter(n=>(ahora-ms(n))<86400000).length,
    semana:DATA.notificaciones.filter(n=>(ahora-ms(n))<7*86400000).length,
  };
}
function notifTiempoRelativo(n){
  const ms=n.creado?.toDate?.()?.getTime?.()||(n.fecha?new Date(n.fecha).getTime():0)||0;
  if(!ms)return n.fecha||'—';
  const diff=Date.now()-ms,m=Math.floor(diff/60000),h=Math.floor(diff/3600000),d=Math.floor(diff/86400000);
  if(m<1)return 'Ahora';
  if(m<60)return `Hace ${m} min`;
  if(h<24)return d===0?'Hoy':`Hace ${h}h`;
  if(d===1)return 'Ayer';
  if(d<7)return `Hace ${d} días`;
  return new Date(ms).toLocaleDateString('es-MX',{day:'2-digit',month:'short'});
}
function renderNotificaciones(){
  const st=notifStats();
  const historial=DATA.notificaciones.slice().sort((a,b)=>(b.creado?.toDate?.()?.getTime?.()||0)-(a.creado?.toDate?.()?.getTime?.()||0));
  return `<div class="page-head"><div>
    <div class="pill-eyebrow">Comunicación con miembros</div>
    <h1 class="page-h">Notificaciones</h1><p class="page-sub">Envía avisos a todos los miembros. Aparecen en tiempo real en la campanita 🔔 del Club, con un punto rojo hasta que cada quien la abra.</p></div></div>
    <div class="stats" style="margin-bottom:22px">
      ${statCard('Total publicadas',st.total,'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z')}
      ${statCard('Hoy',st.hoy,'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z')}
      ${statCard('Esta semana',st.semana,'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z')}
    </div>
    <div class="notif-layout">
      <div class="card notif-compose">
        <h3 style="font-family:var(--font-display);font-size:1rem;margin-bottom:14px">📤 Crear nueva notificación</h3>
        <label class="notif-label">Tipo</label>
        <div class="notif-tipos" id="notif-tipos">${Object.entries(NOTIF_TIPOS).map(([key,t])=>`
          <button type="button" class="notif-tipo-btn ${key===_notifTipo?'active':''}" data-tipo="${key}" onclick="setNotifTipo('${key}')" style="--tc:${t.color}">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width:17px;height:17px"><path stroke-linecap="round" stroke-linejoin="round" d="${t.icon}"/></svg>${t.label}
          </button>`).join('')}</div>
        <label class="notif-label" style="margin-top:14px">Título *</label>
        <input id="f-titulo" maxlength="80" placeholder="Ej: Nueva clase en vivo el viernes" oninput="notifPreviewUpdate()">
        <div class="notif-count"><span id="notif-titulo-count">0</span>/80 caracteres</div>
        <label class="notif-label" style="margin-top:10px">Descripción *</label>
        <textarea id="f-mensaje" maxlength="180" rows="3" placeholder="Ej: Únete este viernes 18:00 a la clase en vivo" oninput="notifPreviewUpdate()"></textarea>
        <div class="notif-count"><span id="notif-desc-count">0</span>/180 caracteres</div>
        <label class="notif-label" style="margin-top:10px">Vista previa</label>
        <div class="notis-item" id="notif-preview" style="pointer-events:none">
          <div class="ni-ico" id="notif-preview-ico" style="background:color-mix(in srgb,${NOTIF_TIPOS[_notifTipo].color} 18%,transparent);color:${NOTIF_TIPOS[_notifTipo].color}"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width:17px;height:17px"><path stroke-linecap="round" stroke-linejoin="round" d="${NOTIF_TIPOS[_notifTipo].icon}"/></svg></div>
          <div class="ni-body"><b id="notif-preview-titulo">Título de la notificación</b><span id="notif-preview-desc">La descripción aparecerá aquí mientras la escribes</span><small>Ahora</small></div>
        </div>
        <button class="btn-save" style="width:100%;margin-top:16px;display:flex;align-items:center;justify-content:center;gap:8px" onclick="enviarNotifTodos()"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width:16px;height:16px"><path stroke-linecap="round" stroke-linejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>Enviar a todos los miembros</button>
      </div>
      <div class="card notif-historial">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
          <h3 style="font-family:var(--font-display);font-size:1rem">🔔 Historial de notificaciones</h3>
          <span class="tag">${st.total} en total</span>
        </div>
        ${historial.length?historial.map(notifHistItem).join(''):'<div class="empty"><b>Sin notificaciones aún</b><span>Créala con el formulario de la izquierda. Aparecerá en tiempo real en la campanita de todos los miembros.</span></div>'}
      </div>
    </div>`;
}
function notifHistItem(n){
  const t=NOTIF_TIPOS[n.tipo]||NOTIF_TIPOS.general;
  return `<div class="notis-item">
    <div class="ni-ico" style="background:color-mix(in srgb,${t.color} 18%,transparent);color:${t.color}"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width:17px;height:17px"><path stroke-linecap="round" stroke-linejoin="round" d="${t.icon}"/></svg></div>
    <div class="ni-body"><b>${esc(n.titulo)}</b><span>${esc(n.mensaje||'')}</span><small>${notifTiempoRelativo(n)}</small></div>
    <button class="ico-btn del" onclick="delItem('notificaciones','${n.id}')" title="Eliminar"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width:15px;height:15px"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>
  </div>`;
}
function setNotifTipo(key){
  _notifTipo=key;
  document.querySelectorAll('.notif-tipo-btn').forEach(b=>b.classList.toggle('active',b.dataset.tipo===key));
  notifPreviewUpdate();
}
function notifPreviewUpdate(){
  const t=NOTIF_TIPOS[_notifTipo];
  const titulo=fv('f-titulo'),msj=fv('f-mensaje');
  document.getElementById('notif-titulo-count').textContent=titulo.length;
  document.getElementById('notif-desc-count').textContent=msj.length;
  document.getElementById('notif-preview-titulo').textContent=titulo||'Título de la notificación';
  document.getElementById('notif-preview-desc').textContent=msj||'La descripción aparecerá aquí mientras la escribes';
  const ico=document.getElementById('notif-preview-ico');
  ico.style.background=`color-mix(in srgb,${t.color} 18%,transparent)`;ico.style.color=t.color;
  ico.innerHTML=`<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width:17px;height:17px"><path stroke-linecap="round" stroke-linejoin="round" d="${t.icon}"/></svg>`;
}
function enviarNotifTodos(){
  const t=NOTIF_TIPOS[_notifTipo];
  const d={tipo:_notifTipo,emoji:t.emoji,titulo:fv('f-titulo').trim(),mensaje:fv('f-mensaje').trim(),fecha:new Date().toLocaleDateString('es-MX'),creado:firebase.firestore.FieldValue.serverTimestamp()};
  if(!d.titulo||!d.mensaje)return toast('Título y descripción son obligatorios',{type:'err'});
  const btn=event?.currentTarget;if(btn){btn.disabled=true;btn.textContent='Enviando…';}
  if(FB_OK){
    db.collection('notificaciones').add(d)
      .then(()=>{toast('Notificación enviada a todos los miembros',{type:'ok'});_notifTipo='clase';reload();})
      .catch(()=>{toast('Error al enviar',{type:'err'});if(btn){btn.disabled=false;}});
  }else{
    DATA.notificaciones.unshift({id:'demo'+Date.now(),...d});toast('Notificación enviada (demo)',{type:'ok'});renderSection('notificaciones');
  }
}

/* ====== PAGOS (diagnóstico de Stripe, igual que DulceLab) ======
   A diferencia del resto del panel, esto no sale de Firestore vía DATA: se
   pide en vivo al webhook (/admin/pagos), que a su vez le pregunta a Stripe.
   renderSection() necesita un string de inmediato, así que acá se devuelve
   el cascarón con "Cargando…" y el fetch real se dispara con un setTimeout
   de 0 — para cuando corre, el innerHTML ya quedó en el DOM. */
const PG_ETQ={
  'pagado':{t:'Pagó',cls:'green',h:'El pago se completó y se cobró.'},
  'completo-sin-cobro':{t:'Completó sin cobro',cls:'amber',h:'Terminó el proceso pero no se cobró nada: casi siempre fue un código de descuento del 100%.'},
  'sin-terminar':{t:'No terminó de pagar',cls:'',h:'Abrió la pantalla de pago pero no la completó: dejó de pagar o su tarjeta no pasó. Aún puede terminar si sigue abierta (hasta 24 h).'},
  'expirada':{t:'Expiró sin pagar',cls:'gray',h:'Pasaron 24 horas sin que completara el pago.'}
};
function pgFmtFecha(iso){return iso?new Date(iso).toLocaleString('es-MX',{dateStyle:'medium',timeStyle:'short'}):'—';}
function pgDinero(n){return '$'+Number(n||0).toLocaleString('es-MX',{minimumFractionDigits:0,maximumFractionDigits:2});}
function renderPagos(){
  setTimeout(cargarPagos,0);
  return `<div class="page-head"><div><div class="pill-eyebrow">Cobros con Stripe</div><h1 class="page-h">Pagos</h1><p class="page-sub">Aquí ves qué pasó con cada intento de pago del Club IMDAC, sin tener que preguntarle al socio. Se muestran los últimos 30.</p></div>
    <button class="btn-ghost" onclick="cargarPagos()">Actualizar</button></div>
    <div id="pg-estado"></div>
    <div id="pg-tabla"><div class="card"><div class="empty"><b>Cargando…</b></div></div></div>`;
}
let _pgCargando=false;
async function cargarPagos(){
  if(_pgCargando)return;
  _pgCargando=true;
  const estadoBox=document.getElementById('pg-estado'), cont=document.getElementById('pg-tabla');
  if(!estadoBox||!cont){_pgCargando=false;return;}
  cont.innerHTML=`<div class="card"><div class="empty"><b>Cargando…</b></div></div>`;
  let data;
  try{
    data=await apiFetch('/admin/pagos',{method:'GET'});
  }catch(e){
    _pgCargando=false;
    estadoBox.innerHTML='';
    cont.innerHTML=`<div class="pg-card mal"><h3>No se pudo cargar el diagnóstico</h3><p>${esc(e.message)}</p></div>`;
    return;
  }
  _pgCargando=false;

  // ── Cuenta de Stripe a la que pertenece la llave secreta del servidor ──
  // La cuenta de Stripe de IMDAC es la misma que usa DulceLab (Bioorigen,
  // compartida entre varios proyectos de la agencia) — mismo Account ID.
  const PG_CUENTA_ESPERADA='acct_1ThG5SDCxZfVu338';
  const cu=data.cuenta||{};
  let cuentaHtml;
  if(cu.id&&cu.id===PG_CUENTA_ESPERADA) cuentaHtml=`<div class="pg-card ok"><h3>✅ La llave secreta del servidor es de la cuenta correcta</h3><p>${esc(cu.nombre||'Bioorigen')} (${esc(cu.id)}): coincide con la cuenta donde viven los productos de IMDAC.</p></div>`;
  else if(cu.id) cuentaHtml=`<div class="pg-card mal"><h3>⚠️ La llave secreta de Railway es de OTRA cuenta de Stripe</h3><p>El servidor usa la cuenta ${esc(cu.nombre||'')} (${esc(cu.id)}), pero los productos de IMDAC viven en ${PG_CUENTA_ESPERADA} (Bioorigen). Con esto los pagos no cuadran. En Railway, <code>STRIPE_SECRET_KEY</code> debe ser la clave secreta de la cuenta Bioorigen (Stripe → Desarrolladores → Claves de API).</p></div>`;
  else cuentaHtml=`<div class="pg-card aviso"><h3>No se pudo comprobar la cuenta de la llave secreta</h3><p>${esc(cu.error||'Sin datos')}. Si usas una clave restringida, puede faltarle permiso para leer la cuenta; no significa que esté mal.</p></div>`;

  // ── Estado del aviso de Stripe (webhook) ──
  const w=data.webhook||{};
  const tEv=w.ultimoEventoEn?Date.parse(w.ultimoEventoEn):0;
  const tRe=w.ultimoRechazoEn?Date.parse(w.ultimoRechazoEn):0;
  const tEr=w.ultimoErrorEn?Date.parse(w.ultimoErrorEn):0;
  let est;
  if(tRe&&tRe>=tEv){
    est=`<div class="pg-card mal"><h3>⚠️ Stripe avisa, pero el servidor lo rechaza</h3><p>El último aviso fue rechazado el ${pgFmtFecha(w.ultimoRechazoEn)} (${esc(w.ultimoRechazoMotivo||'firma inválida')}). Casi siempre significa que el <b>secreto del webhook</b> en Railway (<code>STRIPE_WEBHOOK_SECRET</code>) no es el del destino del Club IMDAC en Stripe. Mientras eso no se corrija, las renovaciones y cancelaciones no se registran solas.</p></div>`;
  }else if(tEr&&tEr>=tEv){
    est=`<div class="pg-card aviso"><h3>Llegó un aviso pero falló al procesarlo</h3><p>${pgFmtFecha(w.ultimoErrorEn)}: ${esc(w.ultimoErrorMotivo||'error interno')}.</p></div>`;
  }else if(tEv){
    est=`<div class="pg-card ok"><h3>✅ El aviso de Stripe está funcionando</h3><p>Último aviso recibido: ${pgFmtFecha(w.ultimoEventoEn)} (${esc(w.ultimoEventoTipo||'')}).</p></div>`;
  }else{
    est=`<div class="pg-card aviso"><h3>Todavía no ha llegado ningún aviso de Stripe</h3><p>Cuando entre un pago, una renovación o una cancelación, aquí aparecerá la hora del último aviso. Si ya hubo pagos y sigue vacío, el webhook del Club IMDAC no está llegando al servidor.</p></div>`;
  }
  estadoBox.innerHTML=cuentaHtml+est;

  // ── Tabla de intentos ──
  const filas=data.intentos||[];
  if(!filas.length){cont.innerHTML='<div class="card"><div class="empty"><b>Todavía no hay intentos de pago del Club IMDAC</b></div></div>';return;}
  cont.innerHTML=`<div class="pg-wrap"><table class="pg-tabla"><thead><tr><th>Fecha</th><th>Correo</th><th>Plan</th><th>Monto</th><th>Qué pasó</th><th>Membresía</th><th></th></tr></thead><tbody>
    ${filas.map(f=>{
      const e=PG_ETQ[f.estado]||{t:f.estado,cls:'gray',h:''};
      const desc=f.descuento>0?`<span class="pg-hint">Descuento aplicado: ${pgDinero(f.descuento)}</span>`:'';
      return `<tr>
        <td>${pgFmtFecha(f.creada)}</td>
        <td>${esc(f.email||'sin correo todavía')}</td>
        <td>${esc(f.plan||'—')}</td>
        <td>${pgDinero(f.monto)}${desc}</td>
        <td><span class="tag ${e.cls}">${esc(e.t)}</span><span class="pg-hint">${esc(e.h)}</span></td>
        <td>${f.activa?'<span class="tag green">Activa</span>':'<span class="tag gray">No activa</span>'}</td>
        <td>${f.puedeActivar?`<button class="btn-ghost" data-activar="${esc(f.id)}" onclick="activarPagoSesion('${f.id}')">Activar membresía</button>`:''}</td>
      </tr>`;
    }).join('')}
  </tbody></table></div>
  <p class="pg-hint" style="max-width:none;margin-top:10px">«Activar membresía» aparece cuando el pago está completo pero la membresía no quedó activa. Úsalo solo con compras que sí reconoces.</p>`;
}
async function activarPagoSesion(sessionId){
  const btn=document.querySelector(`[data-activar="${sessionId}"]`);
  if(btn){btn.disabled=true;btn.textContent='Activando…';}
  try{
    await apiFetch('/admin/pagos/activar',{body:{session_id:sessionId}});
    toast('Membresía activada',{type:'ok'});
    cargarPagos();
  }catch(e){
    if(btn){btn.disabled=false;btn.textContent='Activar membresía';}
    toast(e.message||'No se pudo activar',{type:'err'});
  }
}

/* ====== CONFIG — igual que DulceLab (Pages.config en vip-admin.html):
   Precios Stripe / Contacto / Administradores / Estado de servicios, en un
   grid de tarjetas. "Modo mantenimiento" y "Categorías de cursos" son de
   IMDAC y no existen en DulceLab — se dejan tal cual, sin rediseñar, el
   usuario pidió explícitamente no tocarlas. Administradores y Estado de
   servicios son reales (webhook + Firestore), no una lista decorativa como
   en la referencia de DulceLab (ahí 'Agregar admin' solo mueve un arreglo
   en memoria, sin tocar Firestore — aquí si de verdad da/quita acceso). */
function renderConfig(){
  setTimeout(cargarEstadoServicios,0);
  return `<div class="page-head"><div><h1 class="page-h">Configuración</h1><p class="page-sub">Ajustes globales del club.</p></div></div>
  <div class="card" style="padding:8px 26px;max-width:620px">
    <div class="cfg-item"><div class="ci-t"><b>Modo mantenimiento</b><span>Bloquea el acceso de miembros al Club mientras actualizas contenido</span></div>
      <label class="toggle"><input type="checkbox" id="cfg-maint" ${_appCfg.mantenimiento?'checked':''} onchange="saveMaint(this.checked)"><span class="tk"></span></label></div>
  </div>
  <div class="card" style="padding:26px;max-width:620px;margin-top:18px">
    <h3 style="font-family:var(--font-display);font-size:1.1rem;margin-bottom:6px">Categorías de cursos</h3>
    <p style="color:var(--muted);font-size:.86rem;margin-bottom:16px">Aparecen en el formulario de cursos y en los filtros del Club. Recuerda guardar.</p>
    <div class="chips-row" id="cat-chips">${CATS.map((c,i)=>catChip(c,i)).join('')}</div>
    <div style="display:flex;gap:10px;margin-top:14px">
      <input id="cat-new" placeholder="Nueva categoría" onkeydown="if(event.key==='Enter')addCatInput()" style="flex:1;padding:11px 14px;border:1.5px solid var(--line);border-radius:11px;background:var(--base);color:var(--text)">
      <button class="btn-ghost" onclick="addCatInput()">Agregar</button>
    </div>
    <button class="btn-save" style="margin-top:16px" onclick="saveCats()">Guardar categorías</button>
  </div>

  <div class="cfg-grid">
    <div class="card cfg-card">
      <h3>Precios y plan</h3>
      <div class="form-grid">
        <div class="field"><label>Precio mensual (MXN)</label><input id="cfg-precio" type="number" value="${_appCfg.precio||199}"></div>
        <div class="field"><label>Precio anual (MXN)</label><input id="cfg-precioanual" type="number" value="${_appCfg.precioAnual||1799}"></div>
        <div class="field form-full"><label>Cupón de descuento</label><input id="cfg-cupon" value="${esc(_appCfg.cupon)||'CLUB20IMDAC'}"></div>
      </div>
      <p class="cfg-hint">Esto es lo que se muestra en el Club <b>y lo que Stripe cobra de verdad</b> a partir de la siguiente suscripción nueva (igual que en DulceLab) — no afecta a quien ya está suscrito. Hasta que guardes aquí por primera vez, se sigue cobrando lo que ya definen los Price ID en Railway (PRICE_MENSUAL / PRICE_ANUAL).</p>
      <button class="btn-save" onclick="saveConfigPrecios()">Guardar precios</button>
    </div>

    <div class="card cfg-card">
      <h3>Contacto</h3>
      <div class="form-grid">
        <div class="field"><label>WhatsApp soporte 1</label><input id="cfg-wa1" value="${esc(_appCfg.wa1)||'238 219 6286'}"></div>
        <div class="field"><label>WhatsApp soporte 2</label><input id="cfg-wa2" value="${esc(_appCfg.wa2)||'236 111 2213'}"></div>
        <div class="field form-full"><label>Canal de WhatsApp (comunidad/anuncios)</label><input id="cfg-canal" value="${esc(_appCfg.canal)}" placeholder="https://chat.whatsapp.com/..."></div>
        <div class="field form-full"><label>Instagram</label><input id="cfg-ig" value="${esc(_appCfg.instagram)}" placeholder="https://instagram.com/..."></div>
        <div class="field form-full"><label>Facebook</label><input id="cfg-fb" value="${esc(_appCfg.facebook)}" placeholder="https://facebook.com/..."></div>
        <div class="field form-full"><label>Email de contacto</label><input id="cfg-em" type="email" value="${esc(_appCfg.emailContacto)}" placeholder="contacto@imdac.mx"></div>
      </div>
      <button class="btn-save" style="margin-top:4px" onclick="saveConfigContacto()">Guardar contacto</button>
    </div>

    <div class="card cfg-card">
      <h3>Administradores</h3>
      <p class="cfg-hint" style="margin-top:0">Los correos de aquí pueden entrar al panel admin. <b style="color:var(--rojo)">No quites a ${esc(ADMIN_SUPER_EMAIL)} bajo ningún motivo.</b></p>
      <div id="cfg-admins-list">${(DATA.admins||[]).length?(DATA.admins||[]).map(adminRow).join(''):'<div class="empty" style="padding:14px 0"><b>Cargando…</b></div>'}</div>
      <div style="display:flex;gap:8px;margin-top:12px">
        <input id="cfg-new-admin" type="email" placeholder="nuevo@email.com" style="flex:1;padding:10px 13px;border:1.5px solid var(--line);border-radius:10px;background:var(--base);color:var(--text)">
        <button class="btn-ghost" onclick="agregarAdminReal()">+ Agregar</button>
      </div>
      <p class="cfg-hint">La persona debe haber iniciado sesión al menos una vez en el Club o el panel antes de poder agregarla.</p>
    </div>

    <div class="card cfg-card">
      <h3>Estado de servicios</h3>
      <div id="cfg-estado-list"><div class="empty" style="padding:14px 0"><b>Cargando…</b></div></div>
    </div>
  </div>`;
}
const ADMIN_SUPER_EMAIL='teccapitalweb@gmail.com';
function adminRow(a){
  const esSuper=(a.email||'').toLowerCase()===ADMIN_SUPER_EMAIL;
  return `<div class="dc-row">
    <div class="dc-ico" style="--c:#4F46E5"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg></div>
    <div class="dc-body"><b>${esc(a.email||a.id)}</b></div>
    ${esSuper?'<span class="tag" style="background:var(--rojo);color:#fff">Superadmin</span>':`<button class="ico-btn del" onclick="quitarAdminReal('${a.id}')" title="Quitar acceso"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>`}
  </div>`;
}
function estadoRow(c,label,meta,ok){
  return `<div class="dc-row">
    <div class="dc-ico" style="--c:${ok?'#16A34A':'#B8862F'}"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="${c}"/></svg></div>
    <div class="dc-body"><b>${esc(label)}</b><div class="dc-meta">${esc(meta)}</div></div>
    <span class="tag ${ok?'green':'amber'}">${ok?'OK':'Pendiente'}</span>
  </div>`;
}
async function cargarEstadoServicios(){
  const box=document.getElementById('cfg-estado-list'); if(!box)return;
  const icoShield='M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z';
  const icoBolt='M13 10V3L4 14h7v7l9-11h-7z';
  const icoMail='M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z';
  let rows=[estadoRow(icoShield,'Firebase Auth','imdac-club · Funcionando',FB_OK),estadoRow(icoShield,'Firestore','imdac-club · Reglas v1',FB_OK)];
  try{
    const data=await apiFetch('/admin/estado',{method:'GET'});
    const cu=data.stripe&&data.stripe.cuenta||{};
    const w=data.stripe&&data.stripe.webhook||{};
    rows.push(estadoRow(icoBolt,'Stripe',cu.id?`${cu.nombre||'Cuenta conectada'} (${cu.id})`:(cu.error||'No se pudo verificar la cuenta'),!!cu.id));
    rows.push(estadoRow(icoBolt,'Webhook de Stripe',w.ultimoEventoEn?`Último aviso: ${new Date(w.ultimoEventoEn).toLocaleDateString('es-MX',{day:'2-digit',month:'short'})}`:'Todavía no ha llegado ningún aviso',!!w.ultimoEventoEn));
    rows.push(estadoRow(icoMail,'Correos (EmailJS)',data.emailjsConfigurado?'Configurado en Railway':'Falta EMAILJS_PRIVATE en Railway',!!data.emailjsConfigurado));
  }catch(e){
    rows.push(`<div class="dc-row"><div class="dc-body" style="color:var(--muted);font-size:.84rem">No se pudo consultar Stripe/correo (${esc(e.message)}). Revisa tu sesión.</div></div>`);
  }
  box.innerHTML=rows.join('');
}
function saveMaint(on){
  _appCfg.mantenimiento=on;
  const msgOk=on?'Modo mantenimiento ACTIVADO':'Modo mantenimiento desactivado';
  if(!FB_OK){toast(msgOk,{type:on?'info':'ok'});return;}
  db.collection('config').doc('app').set({mantenimiento:on},{merge:true})
    .then(()=>toast(msgOk,{type:on?'info':'ok'}))
    .catch(()=>{
      _appCfg.mantenimiento=!on;
      const cb=document.getElementById('cfg-maint');if(cb)cb.checked=!on;
      toast('No se pudo guardar — revisa tu conexión o permisos',{type:'err'});
    });
}
function catChip(c,i){return `<span class="cat-tag">${esc(c)}<button onclick="removeCat(${i})" title="Quitar">✕</button></span>`;}
function addCatInput(){const v=document.getElementById('cat-new').value.trim();if(!v)return;if(CATS.includes(v))return toast('Esa categoría ya existe');CATS.push(v);document.getElementById('cat-chips').innerHTML=CATS.map((c,j)=>catChip(c,j)).join('');document.getElementById('cat-new').value='';}
function removeCat(i){CATS.splice(i,1);document.getElementById('cat-chips').innerHTML=CATS.map((c,j)=>catChip(c,j)).join('');}
function saveCats(){if(FB_OK)db.collection('config').doc('app').set({categorias:CATS},{merge:true}).then(()=>toast('Categorías guardadas')).catch(()=>toast('Error al guardar'));else toast('Categorías guardadas (demo)');}
function saveConfigPrecios(){
  // preciosManual:true es lo que hace que el webhook empiece a cobrar este
  // número en vez del Price ID fijo de Stripe — confírmalo contra el precio
  // real en Stripe antes de guardar aquí la primera vez.
  if(!confirm('Esto va a cambiar lo que Stripe cobra de verdad a los socios nuevos desde la siguiente suscripción. ¿Confirmas que estos montos son correctos?'))return;
  const d={precio:+fv('cfg-precio')||199,precioAnual:+fv('cfg-precioanual')||1799,cupon:fv('cfg-cupon'),preciosManual:true};
  Object.assign(_appCfg,d);
  if(FB_OK)db.collection('config').doc('app').set(d,{merge:true}).then(()=>toast('Precios guardados — ya es lo que cobra Stripe',{type:'ok'})).catch(()=>toast('Error al guardar',{type:'err'}));
  else toast('Precios guardados (demo)',{type:'ok'});
}
function saveConfigContacto(){
  const d={wa1:fv('cfg-wa1'),wa2:fv('cfg-wa2'),canal:fv('cfg-canal'),instagram:fv('cfg-ig'),facebook:fv('cfg-fb'),emailContacto:fv('cfg-em')};
  Object.assign(_appCfg,d);
  if(FB_OK)db.collection('config').doc('app').set(d,{merge:true}).then(()=>toast('Contacto guardado',{type:'ok'})).catch(()=>toast('Error al guardar',{type:'err'}));
  else toast('Contacto guardado (demo)',{type:'ok'});
}
async function agregarAdminReal(){
  const inp=document.getElementById('cfg-new-admin'); if(!inp)return;
  const email=(inp.value||'').trim();
  if(!email||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return toast('Escribe un correo válido',{type:'err'});
  try{
    await apiFetch('/admin/agregar-admin',{body:{email}});
    inp.value='';
    toast('Administrador agregado',{type:'ok'});
    await reload();
  }catch(e){toast(e.message||'No se pudo agregar',{type:'err'});}
}
async function quitarAdminReal(uid){
  if(!confirm('¿Quitarle el acceso al panel a este administrador?'))return;
  try{
    await apiFetch('/admin/quitar-admin',{body:{uid}});
    toast('Acceso removido',{type:'ok'});
    await reload();
  }catch(e){toast(e.message||'No se pudo quitar',{type:'err'});}
}

/* ====== VER PANEL DE USUARIO — igual que lo tiene Alitec Food ======
   Abre el Club de socios (otro dominio) ya firmado con tu misma cuenta, sin
   volver a pedirte la contraseña: el webhook te da un custom token de
   Firebase de un solo uso (/admin/token-vista) y el Club lo consume con
   signInWithCustomToken. "Todo abierto" ya lo resuelve imdac-club/app.js
   solo (detecta que eres admin y desbloquea todo); "Como miembro VIP"
   simula una membresía Mensual activa desde hoy, solo en el navegador —
   nunca se escribe nada falso en tu cuenta real de Firestore. */
function renderVerPanel(){
  return `<div class="page-head"><div><div class="pill-eyebrow">Cuenta</div><h1 class="page-h">Ver panel de usuario</h1><p class="page-sub">Entra al panel que ven tus miembros con tu misma cuenta, sin cerrar sesión ni cambiar de correo. Sirve para comprobar que un curso, un material o una clase se subió bien. En el panel de usuario siempre tendrás a la vista el botón para volver aquí.</p></div></div>
  <div class="card" style="padding:22px;max-width:640px;margin-bottom:18px;border-left:4px solid #16A34A">
    <h3 style="font-family:var(--font-display);font-size:1.05rem;margin-bottom:6px">Verlo todo abierto</h3>
    <p style="color:var(--muted);font-size:.86rem;line-height:1.55;margin-bottom:16px">Ves el panel con <b>todos los cursos desbloqueados</b>, como administrador. Es lo más útil para revisar que un curso nuevo quedó bien: títulos, videos, materiales y orden de las clases.</p>
    <button class="btn-add" id="vp-btn-todo" onclick="abrirPanelUsuario('todo')">Abrir el panel de usuario →</button>
  </div>
  <div class="card" style="padding:22px;max-width:640px">
    <h3 style="font-family:var(--font-display);font-size:1.05rem;margin-bottom:6px">Verlo como un miembro VIP</h3>
    <p style="color:var(--muted);font-size:.86rem;line-height:1.55;margin-bottom:16px">Ves el panel simulando una membresía Mensual activa desde hoy, con los cursos desbloqueándose por fecha igual que a un socio real recién inscrito. Sirve para comprobar el calendario de desbloqueo.</p>
    <button class="btn-ghost" id="vp-btn-miembro" onclick="abrirPanelUsuario('miembro')">Abrir como miembro VIP →</button>
  </div>`;
}
async function abrirPanelUsuario(modo){
  const btnId=modo==='todo'?'vp-btn-todo':'vp-btn-miembro';
  const txt=modo==='todo'?'Abrir el panel de usuario →':'Abrir como miembro VIP →';
  const btn=document.getElementById(btnId);
  if(btn){btn.disabled=true;btn.textContent='Abriendo…';}
  try{
    const {token}=await apiFetch('/admin/token-vista',{method:'POST'});
    const url=`${CLUB_URL}/?vtok=${encodeURIComponent(token)}&preview=${modo}&volver=${encodeURIComponent(location.href)}`;
    window.open(url,'_blank');
  }catch(e){
    toast(e.message||'No se pudo abrir el panel de usuario',{type:'err'});
  }finally{
    if(btn){btn.disabled=false;btn.textContent=txt;}
  }
}

/* ====== MODAL FORM (reusable) ====== */
let _saveFn=null;
function openForm(title,bodyHtml,saveFn){
  _saveFn=saveFn;
  document.getElementById('modal-content').innerHTML=`
    <div class="modal-head"><h3>${title}</h3><button class="modal-x" onclick="closeModal()">✕</button></div>
    <div class="modal-body">${bodyHtml}
      <div class="modal-foot"><button class="btn-ghost" onclick="closeModal()">Cancelar</button><button class="btn-save" id="modal-save" onclick="_saveFn()">Guardar</button></div>
    </div>`;
  document.getElementById('modal').classList.add('open');
}
function closeModal(){document.getElementById('modal').classList.remove('open');_saveFn=null;}

/* ====== EDIT / DELETE genéricos ====== */
const COLL_MAP={cursos:{data:'cursos',form:cursoForm,save:saveCurso,title:'Editar curso'},
  webinars:{data:'webinars',form:webinarForm,save:saveWebinar,title:'Editar clase en vivo'},
  noticias:{data:'noticias',form:noticiaForm,save:saveNoticia,title:'Editar noticia'},
  material:{data:'material',form:materialForm,save:saveMaterial,title:'Editar material'},
  certificados:{data:'certificados',form:certificadoForm,save:saveCertificado,title:'Editar certificado'},
  datos_curiosos:{data:'datos_curiosos',form:datoCuriosoForm,save:saveDatoCurioso,title:'Editar dato'},
  preguntas:{data:'preguntas',form:preguntaForm,save:savePregunta,title:'Editar pregunta'},retos_visuales:{data:'retos_visuales',form:retoVisualForm,save:saveRetoVisual,title:'Editar reto visual'},
  tienda_articulos:{data:'tienda_articulos',form:tiendaArticuloForm,save:saveTiendaArticulo,title:'Editar artículo de tienda'}};
function editItem(coll,id){
  const cfg=COLL_MAP[coll];const item=DATA[cfg.data].find(x=>x.id===id);if(!item)return;
  const title=coll==='cursos'?`Editar curso<span style="display:block;font-size:.8rem;font-weight:500;color:var(--muted);margin-top:3px">${esc(item.titulo||'')}</span>`:cfg.title;
  openForm(title,cfg.form(item),()=>cfg.save(id));
}
function delItem(coll,id){
  const dataKey=coll, collName=coll==='foro'?'foro_temas':coll;
  const item=DATA[dataKey].find(x=>x.id===id); if(!item)return;
  const snap=JSON.parse(JSON.stringify(item));
  const restore=()=>{
    if(FB_OK){const{id:iid,...rest}=snap;db.collection(collName).doc(iid).set(rest).then(()=>{DATA[dataKey].unshift(snap);renderSection(currentSection);toast('Restaurado',{type:'ok'});});}
    else{DATA[dataKey].unshift(snap);renderSection(currentSection);toast('Restaurado',{type:'ok'});}
  };
  if(FB_OK){
    // Un tema de foro borrado deja huérfana su subcolección 'comentarios'
    // (Firestore no borra en cascada) — se limpia aparte, sin bloquear el
    // borrado principal si falla.
    if(collName==='foro_temas'){
      db.collection('foro_temas').doc(id).collection('comentarios').get()
        .then(cs=>Promise.all(cs.docs.map(c=>c.ref.delete())))
        .catch(()=>{});
    }
    db.collection(collName).doc(id).delete().then(()=>{DATA[dataKey]=DATA[dataKey].filter(x=>x.id!==id);renderSection(currentSection);toast('Registro eliminado',{type:'ok',undo:restore});}).catch(()=>toast('Error al eliminar',{type:'err'}));
  }else{
    DATA[dataKey]=DATA[dataKey].filter(x=>x.id!==id);renderSection(currentSection);toast('Registro eliminado',{type:'ok',undo:restore});
  }
}

/* ====== SAVE genérico ====== */
function saveDoc(coll,id,data){
  const btn=document.getElementById('modal-save');
  if(btn){btn.disabled=true;btn._txt=btn.textContent;btn.textContent='Guardando…';}
  const ok=()=>{toast(id?'Cambios guardados':'Creado correctamente',{type:'ok'});closeModal();if(FB_OK)reload();else renderSection(currentSection);};
  const fail=()=>{if(btn){btn.disabled=false;btn.textContent=btn._txt||'Guardar';}toast('Error al guardar',{type:'err'});};
  if(FB_OK){
    const ref=id?db.collection(coll).doc(id):db.collection(coll).doc();
    ref.set(data,{merge:true}).then(ok).catch(fail);
  }else{
    setTimeout(()=>{if(id){const it=DATA[coll].find(x=>x.id===id);Object.assign(it,data);}else DATA[coll].unshift({id:'demo'+Date.now(),...data});ok();},450);
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
  // Modo real: arranca vacío y solo se llena con Firestore. El demo aplica únicamente sin Firebase.
  DATA={cursos:[],webinars:[],noticias:[],material:[],foro:[],miembros:[],notificaciones:[],directorio:[],certificados:[],datos_curiosos:[],preguntas:[],retos_visuales:[],tienda_articulos:[],encuestas:[],progreso:[],analytics_visitas:[]};
  if(!FB_OK){DATA={cursos:[...DEMO.cursos],webinars:[...DEMO.webinars],noticias:[...DEMO.noticias],material:[...DEMO.material],foro:[...DEMO.foro],miembros:[...DEMO.miembros],notificaciones:[...DEMO.notificaciones],directorio:[],certificados:[],datos_curiosos:[],preguntas:[],progreso:[],analytics_visitas:[]};return;}
  // Cada colección se trae por separado y con su propio catch: una colección
  // sin reglas desplegadas todavía (ej. certificados, antes de pegar las
  // reglas nuevas en Firebase Console) no debe tumbar el resto del panel.
  const safeGet=(c)=>db.collection(c).get().catch(e=>{console.warn(`Firestore (${c}):`,e.message);return {docs:[]};});
  try{
    const cols=['cursos','webinars','noticias','material','directorio','certificados','datos_curiosos','preguntas','retos_visuales','tienda_articulos','progreso'];
    const snaps=await Promise.all(cols.map(safeGet));
    cols.forEach((c,i)=>{DATA[c]=snaps[i].docs.map(d=>({id:d.id,...d.data()}));});
    const foro=await safeGet('foro_temas');DATA.foro=foro.docs.map(d=>({id:d.id,...d.data()}));
    const visitas=await db.collection('analytics_visitas').orderBy('creada','desc').limit(20000).get().catch(e=>{console.warn('Firestore (analytics_visitas):',e.message);return {docs:[]};});
    DATA.analytics_visitas=visitas.docs.map(d=>({id:d.id,...d.data()}));
    const miem=await safeGet('miembros');DATA.miembros=miem.docs.map(d=>{const x=d.data();return {id:d.id,...x,alta:x.creado?.toDate?x.creado.toDate().toLocaleDateString('es-MX'):'—'};});
    const notif=await db.collection('notificaciones').orderBy('fecha','desc').get().catch(e=>{console.warn('Firestore (notificaciones):',e.message);return {docs:[]};});DATA.notificaciones=notif.docs.map(d=>({id:d.id,...d.data()}));
    const cfg=await db.collection('config').doc('app').get().catch(()=>({exists:false}));if(cfg.exists){_appCfg=cfg.data();if(Array.isArray(_appCfg.categorias)&&_appCfg.categorias.length)CATS=_appCfg.categorias;}
    const adminsSnap=await safeGet('admins');DATA.admins=adminsSnap.docs.map(d=>({id:d.id,...d.data()}));
    try{const survey=await apiFetch('/admin/encuestas-clientes',{method:'GET'});DATA.encuestas=Array.isArray(survey.encuestas)?survey.encuestas:[];}catch(e){console.warn('Encuestas:',e.message);}
  }catch(e){console.warn('Firestore:',e.message);}
}

/* ====== UI helpers ====== */
const esc=s=>(s==null?'':String(s)).replace(/"/g,'&quot;').replace(/</g,'&lt;');
/* Convierte un link de Google Drive a imagen directa visible (misma lógica
   que imdac-club/app.js, para que las portadas se vean en el panel igual que
   en la app del socio en vez de salir en gris). */
function driveImg(url){
  if(!url) return '';
  url=String(url).trim();
  if(url.indexOf('drive.google.com')===-1 && url.indexOf('docs.google.com')===-1){
    if(/^[A-Za-z0-9_-]{20,}$/.test(url)) return 'https://drive.google.com/thumbnail?id='+url+'&sz=w1000';
    return url;
  }
  let id='';
  let m=url.match(/\/file\/d\/([A-Za-z0-9_-]+)/) || url.match(/[?&]id=([A-Za-z0-9_-]+)/) || url.match(/\/d\/([A-Za-z0-9_-]+)/);
  if(m) id=m[1];
  if(!id) return url;
  return 'https://drive.google.com/thumbnail?id='+id+'&sz=w1000';
}
const fv=id=>document.getElementById(id)?.value||'';
function initials(){const n=CURRENT_USER?.displayName||CURRENT_USER?.email||'A';return n.trim().split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();}
function refreshUserUI(){
  const nombre=CURRENT_USER?.displayName||'Administrador',av=initials();
  document.getElementById('u-name').textContent=nombre;document.getElementById('u-email').textContent=CURRENT_USER?.email||'';document.getElementById('u-av').textContent=av;
  const topName=document.getElementById('tb-u-name'),topAv=document.getElementById('tb-u-av');
  if(topName)topName.textContent=nombre;if(topAv)topAv.textContent=av;
}
function toggleSidebar(open){const sb=document.getElementById('sidebar'),bd=document.getElementById('sb-backdrop');if(open===undefined)open=!sb.classList.contains('open');sb.classList.toggle('open',open);bd.classList.toggle('open',open);}
function toggleTheme(){const cur=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=cur;try{localStorage.setItem('imdac-admin-theme',cur);}catch(e){}updateThemeIcon();}
function updateThemeIcon(){const btn=document.getElementById('theme-btn');if(!btn)return;const dark=document.documentElement.dataset.theme==='dark';btn.innerHTML=dark?'<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/></svg>':'<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>';btn.title=dark?'Modo claro':'Modo oscuro';}
function toast(m,opts={}){
  const t=document.getElementById('toast');
  const type=opts.type||'ok';const icon=type==='err'?'✕':type==='info'?'i':'✓';
  t.innerHTML=`<span class="tic ${type}">${icon}</span><span>${m}</span>${opts.undo?'<button class="undo" id="toast-undo">Deshacer</button>':''}`;
  t.classList.add('show');
  if(opts.undo){document.getElementById('toast-undo').onclick=()=>{opts.undo();t.classList.remove('show');};}
  clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove('show'),opts.undo?5500:2600);
}

/* ====== ARRANQUE ====== */
async function onLogged(){
  document.body.classList.add('logged');document.getElementById('login').classList.add('hidden');
  renderSidebar();refreshUserUI();updateThemeIcon();
  renderLoading();
  await loadData();go('dashboard');
}
function renderLoading(msg){const c=document.getElementById('content');if(c)c.innerHTML=`<div class="adm-loading"><div class="adm-spin"></div><span>${msg||'Cargando datos…'}</span></div>`;}
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
  miembros:[
    {id:'m1',nombre:'Arq. Demo Usuario',email:'demo@imdac.mx',ciudad:'Tehuacán, Pue.',telefono:'238 000 0000',profesion:'Arquitecto',alta:'21/5/2026',bio:'Miembro de prueba.',estado:'Activo',vigenciaHasta:'2026-12-31',cursosAsignados:['c1'],progreso:{c1:60}},
    {id:'m2',nombre:'Ing. Laura Méndez',email:'laura@imdac.mx',ciudad:'Puebla, Pue.',telefono:'222 111 2222',profesion:'Ing. Civil',alta:'2/5/2026',bio:'',estado:'Activo'},
    {id:'m3',nombre:'Arq. Carlos Ruiz',email:'carlos@imdac.mx',ciudad:'CDMX',telefono:'55 333 4444',profesion:'Arquitecto',alta:'10/4/2026',bio:'',estado:'Cancelado'},
  ],
  notificaciones:[],
};

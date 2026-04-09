let tareasPorEquipo = {};
let parametrosPorEquipo = {};
let offsetPaqueteX = 0;
let posXActual = -900;
let cortesEnPaquete = 0; // posición base donde quedan en la cuna
let puedeCortar = true;


function normalizarID(nombre){
  return (nombre || "")
    .toString()
    .toLowerCase()
    .trim()
    .replace(" de ", " ")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/°/g, "")
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

const X_ENZUNCHADO = posXActual - 100;
const X_SALIDA = posXActual - 1000;

const pdfs = {
  "Encendido del Horno": "https://aza.greendocs.net/Arquivo/VisualizarPDF?idArquivo=26808&view=true&idBPMInstancia=54840&idRevisao=26808&fileName=PO-LAM2-026%20Listado%20de%20telefonos%20de%20emergencia.pdf&_p=1"
};

let filtroCriticidad = null;
let equipoActual = null;

const panel = document.getElementById("panel");
const overlay = document.getElementById("overlay");


// ================== CARGA DE DATOS ==================
fetch("parametros.json")
  .then(res => res.json())
  .then(datos => {

    console.log("JSON parametros:", datos);

    parametrosPorEquipo = agruparParametros(datos);

    console.log("Parametros agrupados:", parametrosPorEquipo);

  })
  .catch(err => console.error("Error cargando parametros:", err));

function agruparParametros(filas){

  const resultado = {};

  filas.forEach(p => {
console.log("TIPO REAL:", JSON.stringify(p.Tipo));
    const equipo = normalizarID(p.Equipo);

   // 🔥 clave

    if(!resultado[equipo]){
      resultado[equipo] = {
        producto: p.ProductoProceso,
        critico: [],
        no_controlado: [],
        controlado: [],
        producto_param: []
      };
    }

const tipo = normalizarID(p.Tipo);

if(tipo === "critico"){
  resultado[equipo].critico.push(p.Parametros);
}

if(tipo === "ruido"){
  resultado[equipo].no_controlado.push(p.Parametros);
}

if(tipo === "controlado"){
  resultado[equipo].controlado.push(p.Parametros);
}

if(tipo === "de_producto"){
  resultado[equipo].producto_param.push(p.Parametros);
}

  });

  return resultado;
}

fetch("riesgos.json")
  .then(res => res.json())
  .then(datos => {
    tareasPorEquipo = agruparPorEquipo(datos);
    console.log("Datos cargados:", tareasPorEquipo);
  })
  .catch(err => {
    console.error("Error cargando riesgos:", err);
  });

function agruparPorEquipo(filas) {
console.log("PRIMERA FILA:", filas[0]);

  const resultado = {};

  filas.forEach(f => {
 console.log("FILA COMPLETA:", f);
const equipo = normalizarID(f.Equipo); // 🔥 clave

console.log("EQUIPO DETECTADO:", equipo);

    const actividad = f.Actividad;
    const dimension = f.Dimension;
    const total = Number(f.Total) || 0;

    if (!resultado[equipo]) resultado[equipo] = {};

    if (!resultado[equipo][actividad]) {
      resultado[equipo][actividad] = {
        nombre: actividad,
        dimensiones: {},
        maxTotal: 0
      };
    }

    resultado[equipo][actividad].dimensiones[dimension] = total;

    resultado[equipo][actividad].maxTotal = Math.max(
      resultado[equipo][actividad].maxTotal,
      total
    );

  });

  Object.keys(resultado).forEach(equipo => {

    resultado[equipo] = Object.values(resultado[equipo]).map(t => ({
      nombre: t.nombre,
      dimensiones: t.dimensiones,
      criticidad: nivelCriticidad(t.maxTotal)
    }));

  });

  return resultado;
}

function nivelCriticidad(total) {

  if (total >= 12) return "alta";
  if (total >= 6) return "media";
  return "baja";

}
const mapaEquipos = {
  d1h: "tren_desbaste",
  d2v: "tren_desbaste",
  d3h: "tren_desbaste",
  d4v: "tren_desbaste",
  d5h: "tren_desbaste",
  d6v: "tren_desbaste",

  d7h: "tren_medio",
  d8v: "tren_medio",
  d9h: "tren_medio",
  d10v: "tren_medio",
  d11h: "tren_medio",
  d12v: "tren_medio",
  d13h: "tren_medio",
  d14v: "tren_medio"
};

// ================== PANEL ==================



function mostrarEquipo(e, id){

  const el = e.currentTarget;
  const nombre = el.dataset.nombre || id;

  const idReal = normalizarID(mapaEquipos[id] || id);
  equipoActual = idReal;

  const titulo = document.getElementById("titulo-equipo");
  const contenedor = document.getElementById("contenedor-tareas");
  const contenedorParametros = document.getElementById("contenedor-parametros");

  // limpiar
  contenedor.innerHTML = "";
  contenedorParametros.innerHTML = "";

  titulo.innerText = nombre;

  const tareas = tareasPorEquipo[idReal] || [];

  // tareas
  contenedor.innerHTML = renderTareas(tareas);

  // parámetros
  const params = parametrosPorEquipo[idReal];

  if(params){
    contenedorParametros.innerHTML = `
      <div class="param-grupo">
        <h4>🔴 Críticos (${params.critico.length})</h4>
        ${params.critico.map(p => `<div class="param-item critico">${p}</div>`).join("")}
      </div>

      <div class="param-grupo">
        <h4>🟢 Controlados (${params.controlado.length})</h4>
        ${params.controlado.map(p => `<div class="param-item controlado">${p}</div>`).join("")}
      </div>

      <div class="param-grupo">
        <h4>🟡 Producto (${params.producto_param.length})</h4>
        ${params.producto_param.map(p => `<div class="param-item producto">${p}</div>`).join("")}
      </div>
    `;
  }

  panel.classList.add("abierto");
  overlay.classList.add("activo");

  // 🔥 estado inicial SIEMPRE
  mostrarTareas();
}



const tabs = document.querySelectorAll('.panel-tabs button');

function activarTab(boton){
  tabs.forEach(b => b.classList.remove('activa'));
  boton.classList.add('activa');
}

function renderDimensiones(dimensiones){
  return Object.entries(dimensiones || {})
    .map(([dim, val]) => `
      <span class="dim-item">
        ${dim}: <strong>${val}</strong>
      </span>
    `).join("");
}

function mostrarTareas(){
  document.getElementById("contenedor-tareas").style.display = "grid";
  document.getElementById("contenedor-parametros").style.display = "none";
}

function mostrarParametros(){
  document.getElementById("contenedor-tareas").style.display = "none";
  document.getElementById("contenedor-parametros").style.display = "grid";
}






function calcularTotalesDimensiones(tareas){

  const totales = {};

  tareas.forEach(t => {
    Object.entries(t.dimensiones || {}).forEach(([dim, valor]) => {
      totales[dim] = (totales[dim] || 0) + valor;
    });
  });

  return totales;
}


// ================== FILTROS ==================

function aplicarFiltro(nivel) {

  filtroCriticidad = nivel;

  if (equipoActual) mostrarEquipo(equipoActual);

}

function limpiarFiltro() {

  filtroCriticidad = null;

  if (equipoActual) mostrarEquipo(equipoActual);

}


// ================== UTILIDADES ==================

function prioridad(nivel) {

  return nivel === "alta" ? 3 : nivel === "media" ? 2 : 1;

}

function contarCriticidades(tareas) {

  return tareas.reduce(
    (acc, t) => {

      acc.total++;
      acc[t.criticidad]++;

      return acc;

    },
    { total: 0, alta: 0, media: 0, baja: 0 }
  );

}


function renderTareas(tareas){

  const altas = tareas.filter(t => t.criticidad === "alta");
  const medias = tareas.filter(t => t.criticidad === "media");
  const bajas = tareas.filter(t => t.criticidad === "baja");

  function grupo(nombre, lista, clase){
    if(lista.length === 0) return "";

    return `
      <div class="grupo">
        <h3>${nombre} (${lista.length})</h3>

        ${lista.map(t => `
          <div class="tarea-item ${clase}">
            
            <div class="tarea-nombre">
              ${t.nombre}
            </div>

            <div class="tarea-dimensiones">
              ${renderDimensiones(t.dimensiones)}
            </div>

          </div>
        `).join("")}

      </div>
    `;
  }

  return `
    ${grupo("🔴 Altas", altas, "alta")}
    ${grupo("🟡 Medias", medias, "media")}
    ${grupo("🟢 Bajas", bajas, "baja")}
  `;
}



function activarModo(modo){

const jaula = document.querySelector(".jaula-delimitador");

if(modo === "doble"){

jaula.classList.remove("modo-unitario");
jaula.classList.add("modo-doble");

}

if(modo === "unitario"){

jaula.classList.remove("modo-doble");
jaula.classList.add("modo-unitario");

}

}



function setProducto(tipo){

  const planta = document.querySelector('.planta');

  // validar tipo (evita errores silenciosos)
  if(!['gruesa','delgada','rollo'].includes(tipo)){
    console.warn("Tipo inválido:", tipo);
    return;
  }

  // 1. limpiar clases
  planta.classList.remove('prod-gruesa','prod-delgada','prod-rollo');

  // 2. reiniciar animaciones
  const barras = document.querySelectorAll('.barra, .barra-rollo, .barra-delgada');

  barras.forEach(barra => {
    barra.style.animation = 'none';
    barra.offsetHeight; // fuerza reflow
    barra.style.animation = '';
  });

  // 3. aplicar clase
  planta.classList.add('prod-' + tipo);
}

let cortes = 0;
const paso = 180;
const maxCortes = 5;

function cortarLote(){
  const cizalla = document.querySelector(".cizalla-frio");

  // 🔥 animación visual
  cizalla.classList.remove("activa");
  void cizalla.offsetWidth;
  cizalla.classList.add("activa");

  // 🔥 crear piezas reales
  crearPiezas();
pieza.classList.add("pieza-corte");
  // 🔥 lógica de corte
  if(cortes >= maxCortes){
    console.log("FIN");
    return;
  }

  cortes++;

  const desplazamiento = -cortes * paso;
  const nuevoLargo = 900 - cortes * paso;

  document.querySelectorAll(".barra").forEach(b=>{
    b.style.transform = `translateX(${desplazamiento}px)`;
    b.style.width = nuevoLargo + "px";
  });

  // 🔥 quitar animación después
  setTimeout(()=>{
    cizalla.classList.remove("activa");
  }, 120);
}



function crearPiezas(){

  const planta = document.querySelector(".planta");
  const cizalla = document.querySelector(".cizalla-frio");

  const rect = cizalla.getBoundingClientRect();
  const plantaRect = planta.getBoundingClientRect();

  const x = rect.left - plantaRect.left;
  const y = rect.top - plantaRect.top;

  for(let i = 0; i < 10; i++){

    const pieza = document.createElement("div");

    pieza.classList.add("pieza-corte");

    pieza.style.position = "absolute";
    pieza.style.left = x + "px";
    pieza.style.top = (y + i * 18) + "px";

    planta.appendChild(pieza);
  }
}


// ================== CIERRE PANEL ==================

function cerrarPanel() {

  panel.classList.remove("abierto");
  overlay.classList.remove("activo");

}

overlay.addEventListener("click", cerrarPanel);




// ================== Cortar Lote ======================

let referenciaGrupoX = null;

// =========================
// FUNCIÓN AGRUPACIÓN
// =========================
function agruparEnCunas(pieza){

  const rect = pieza.getBoundingClientRect();

  if(referenciaGrupoX === null){
    referenciaGrupoX = rect.left;
  }

  const deltaX = referenciaGrupoX - rect.left;

  pieza.style.transition = "transform 0.4s ease-out";

  pieza.style.transform = ` translateX(${deltaX}px)`;

}

// =========================
// 🚀 CREAR Y LANZAR BARRA NUEVA
// =========================
function lanzarBarra(){

  const existentes = document.querySelectorAll(".barra");

  if(existentes.length > 0){
    return; // 🔥 evita duplicadas
  }

  console.log("barra creada");

  const planta = document.querySelector(".planta");

  const barra = document.createElement("div");
  barra.classList.add("barra");

  barra.style.position = "absolute";
  barra.style.left = "0px";
  barra.style.top = "250px"; // 👈 AJUSTALO AL CARRIL REAL

  barra.style.width = "900px";
  barra.style.height = "6px";
  barra.style.background = "#ff6a00";

  planta.appendChild(barra);

  setTimeout(() => {
    barra.style.transition = "transform 48s linear";
    barra.style.transform = "translateX(1400px)";
  }, 50);

}


// =========================
// ✂️ CORTE REAL
// =========================
function corteReal(){

  console.log("✂️ CORTE");

  const planta = document.querySelector(".planta");
  const cizalla = document.querySelector(".cizalla-frio");

  if(!planta || !cizalla) return;

  cizalla.classList.remove("activa");
  void cizalla.offsetWidth;
  cizalla.classList.add("activa");

 const barras = document.querySelectorAll(".barra");

let hayMaterial = false;

barras.forEach(barra => {

const anchoActual = barra.offsetWidth;
const rectBarra = barra.getBoundingClientRect();
const rectCizalla = cizalla.getBoundingClientRect();

// 🔥 verificar si la barra está en la zona de corte
const estaEnCizalla = rectBarra.right >= rectCizalla.left;
if(anchoActual > 170 && estaEnCizalla){

    hayMaterial = true;

    barra.style.transition = "width 0.2s ease-out";
    barra.style.width = (anchoActual - 180) + "px";

  }

});

// 🚨 si no hay material → NO cortar
if(!hayMaterial){
  console.log("⛔ SIN MATERIAL");
  return;
}

  // piezas
  const rect = cizalla.getBoundingClientRect();
  const plantaRect = planta.getBoundingClientRect();
  const x = rect.left - plantaRect.left + 20;
  const yBase = rect.top - plantaRect.top + 55;
  const separacion = 8;
  const separacionCompacta = -6;
  for(let i = 0; i < 10; i++){

    const pieza = document.createElement("div");

    pieza.classList.add("pieza-corte");

    pieza.style.position = "absolute";
    pieza.style.left = x + "px";
    pieza.style.top = (yBase + i * separacion) + "px";

    pieza.style.height = "6px";
    pieza.style.width = "180px";
    pieza.style.background = "#6b6b6b";

    planta.appendChild(pieza);

// salida
setTimeout(() => {
  pieza.style.transition = "transform 4s linear";
  pieza.style.transform = "translateX(-900px)";
}, 100);

// subida (solo Y, manteniendo X)
setTimeout(() => {
  pieza.style.transition = "transform 2.5s linear";
  pieza.style.transform = "translate(-900px, -400px)";
}, 4200);

setTimeout(() => {
const grupo = Math.floor(i / 2);
const offset = (i % 2) * 1;

pieza.style.transition = "transform 0.4s ease-out";

pieza.style.transform = `translate(-900px, ${-380 + grupo * separacionCompacta + offset}px)`;
}, 6500);


  }

cortesEnPaquete++;
if(cortesEnPaquete === 5){

  console.log("📦 paquete listo");

  document.querySelectorAll(".pieza-corte:not(.paquete-listo)").forEach(p => {
    p.classList.add("paquete-listo");
  });

  const maquinas = document.querySelectorAll(".enzunchadora");

  // =========================
  // 🚀 SECUENCIA PRO REAL
  // =========================

  setTimeout(() => {

    // 🟡 1️⃣ IR A PRIMERA POSICIÓN
    moverPaquete(-210,2);

    setTimeout(() => {

      pausarPaquete(); // 🔥 pausa real

      console.log("📍 pausa 1");

      // 🔧 enzunchadora 1
      maquinas[1].classList.add("activa");

      setTimeout(() => {

        maquinas[1].classList.remove("activa");

        // 🟡 2️⃣ IR A SEGUNDA POSICIÓN
        setTimeout(() => {

          moverPaquete(-190,2);

          setTimeout(() => {

            pausarPaquete(); // 🔥 pausa real

            console.log("📍 pausa 2");

            // 🔧 enzunchadora 2
            maquinas[0].classList.add("activa");

            setTimeout(() => {

              maquinas[0].classList.remove("activa");

  setTimeout(() => {

  moverPaquete(-3100,5); // 🚀 salida larga

  // ⏳ cuando termina el movimiento → subir
  setTimeout(() => {

    subirPaquete(-380, 2); // 🔼 subida al pesaje

  }, 5000); // ⬅️ igual a velocidad (5s)

}, 300);

            }, 1400); // proceso enz 2

          }, 3300); // llegada a -400

        }, 300);

      }, 1400); // proceso enz 1

    }, 3300); // llegada a -210

  }, 9000);

  cortesEnPaquete = 0;
}

  setTimeout(()=>{
    cizalla.classList.remove("activa");
  }, 120);
}


function moverPaquete(dx, velocidad = 2){

  const piezas = document.querySelectorAll(".paquete-listo");

  piezas.forEach(pieza => {

    const matchY = pieza.style.transform.match(/,\s*(-?\d+)/);
    const y = matchY ? parseInt(matchY[1]) : -200;

    const matchX = pieza.style.transform.match(/translate\((-?\d+)px/);
    const x = matchX ? parseInt(matchX[1]) : -900;

    pieza.style.transition = `transform ${velocidad}s linear`;
    pieza.style.transform = `translate(${x + dx}px, ${y}px)`;

  });

}

function subirPaquete(dy, velocidad = 1.2){

  const piezas = document.querySelectorAll(".paquete-listo");

  piezas.forEach(pieza => {

    const matchY = pieza.style.transform.match(/,\s*(-?\d+)/);
    const y = matchY ? parseInt(matchY[1]) : -200;

    const matchX = pieza.style.transform.match(/translate\((-?\d+)px/);
    const x = matchX ? parseInt(matchX[1]) : -900;

    pieza.style.transition = `transform ${velocidad}s ease-in-out`;
    pieza.style.transform = `translate(${x}px, ${y + dy}px)`;

  });

}


console.log("🟢 SISTEMA REAL OK");

const TIEMPO_LLEGADA = 48000;
const INTERVALO_CORTE = 4000;

// 🔥 lanzar PRIMERA barra

lanzarBarra();

setInterval(() => {

  const barras = document.querySelectorAll(".barra-activa");

  if(barras.length === 0){
    lanzarBarra();
    return;
  }

  const ultima = barras[barras.length - 1];
  const rect = ultima.getBoundingClientRect();

  // 🔥 cuando la barra ya pasó cierto punto → entra otra
  if(rect.left > 300){  // ← AJUSTABLE
    lanzarBarra();
  }

}, 1000);

// 🔥 sistema de corte
setTimeout(() => {

  console.log("✂️ PRIMER CORTE");

  corteReal();

  setInterval(() => {
    corteReal();
  }, INTERVALO_CORTE);

}, TIEMPO_LLEGADA);

function pausarPaquete(){

  const piezas = document.querySelectorAll(".paquete-listo");

  piezas.forEach(pieza => {

    const estilo = getComputedStyle(pieza);
    const matrix = new DOMMatrix(estilo.transform);

    // 🔥 obtener posición actual REAL
    const x = matrix.m41;
    const y = matrix.m42;

    // ❗ cortar animación
    pieza.style.transition = "none";

    // ❗ fijar posición actual
    pieza.style.transform = `translate(${x}px, ${y}px)`;

  });

}


activarEspiras();
function activarEspiras(){

  const espiras = document.querySelectorAll(".espira");

  espiras.forEach((e, i) => {

    setTimeout(() => {
      e.classList.add("activa");
    }, i * 300);

  });

}


// =========================
// 🔧 CONTROL GLOBAL
// =========================
let loteActual = [];
let produciendo = true;
let timerUltimaEspira = null;


// =========================
// 🔥 ENFRIAMIENTO
// =========================
function enfriarEspira(espira){
  setTimeout(() => espira.style.setProperty("--color", "#ff6a00"), 0);
  setTimeout(() => espira.style.setProperty("--color", "#ff7f2a"), 400);
  setTimeout(() => espira.style.setProperty("--color", "#ffb347"), 900);
  setTimeout(() => espira.style.setProperty("--color", "#ffd27f"), 1400);
  setTimeout(() => espira.style.setProperty("--color", "#b6b6b6"), 2200);
}


// =========================
// 🔁 CREAR ESPIRA
// =========================
function crearEspira(onFinish){

  const contenedor = document.querySelector(".espiras-stelmor");
  if(!contenedor) return;

  const espira = document.createElement("div");
  espira.classList.add("espira");

  espira.style.position = "absolute";
  espira.style.left = "0px";
  espira.style.top = "50%";
  espira.style.transform = "translateY(-50%)";

  contenedor.appendChild(espira);

  setTimeout(() => enfriarEspira(espira), 2000);

  const DISTANCIA = 1123;
  const DURACION = 6000;

  setTimeout(() => {
    espira.style.transition = `transform ${DURACION}ms linear`;
    espira.style.transform = `translateX(${DISTANCIA}px) translateY(-50%)`;
  }, 50);

  setTimeout(() => {
    if(onFinish) onFinish(espira);
  }, DURACION);
}


// =========================
// 🔁 CICLO ESPIRAS
// =========================
function cicloEspiras(){

  if(!produciendo) return;

  crearEspira((espira) => {

    loteActual.push(espira);

    clearTimeout(timerUltimaEspira);

    timerUltimaEspira = setTimeout(() => {

      if(loteActual.length === 0) return;

      const base = loteActual[0];

      loteActual.slice(1).forEach(e => e.remove());
      loteActual = [];

      convertirEnRollo(base);

    }, 1500); // 🔥 tiempo correcto

  });

}


// =========================
// 🔧 ENZUNCHADORA
// =========================
function accionarEnzunchadora(){

  const enz = document.querySelector(".enzunchadora-rollos");
  if(!enz) return;

  enz.classList.add("cerrando");

  setTimeout(() => {
    enz.classList.remove("cerrando");
  }, 1500);
}
// =========================
// ⏸️ CICLOS
// =========================
function iniciarCiclos(){

  produciendo = true;

  setTimeout(() => {

    produciendo = false;

    setTimeout(() => {
      iniciarCiclos();
    }, 5000);

  }, 10000);

}
// =========================
// 🚀 INICIO
// =========================
setTimeout(() => {

  console.log("🟢 sistema espiras activo");

  setInterval(cicloEspiras, 200);

  iniciarCiclos();

}, 1000);
// =========================
// 🔁 CONVERTIR EN ROLLO
// =========================
function convertirEnRollo(espira){

  espira.classList.remove("espira");
  espira.classList.add("rollo");

  document.querySelector(".planta").appendChild(espira);

  espira.style.transition = "none";
  espira.style.transform = "none";

  espira.style.position = "absolute";
  espira.style.left = "6743px";
  espira.style.top = "1648px";

  espira.style.width = "80px";
  espira.style.height = "80px";
  espira.style.background = "#6b6b6b";
  espira.style.borderRadius = "50%";
  espira.style.zIndex = "9999";

  setTimeout(() => {

    const pasos = [
      { y: 400, t: 8000 },
      { pausa: true, t: 1000 },

      { x: 710, t: 5000 },
      { pausa: true, t: 1000 },

      { y: -803, t: 16000 },
      { pausa: true, t: 1000 },

      { x: -230, t: 1000 },

      { pausa: true, t: 2500, enzunchar: true },

      { x: -300, t: 3000 },
      { pausa: true, t: 2000 },

      { y: -108, t: 2000},
      { pausa: true, t: 1000}, // 🔥 clave

      { y: -300, t: 2000, subirPlataforma: true },
      { x: 200, t: 1000 },




    ];

    moverEspiraNueva(espira, pasos);

  }, 1500);
}
// =========================
// 🔁 MOVIMIENTO
// =========================
function moverEspiraNueva(el, pasos){

  let tiempo = 0;
  let x = 0;
  let y = 0;
  let activo = true;

  pasos.forEach(p => {

    setTimeout(() => {
if(p.subirPlataforma){
  console.log("🛗 sincronizar elevador");

  moverPlataforma();

  // ⚠️ NO return
}
      if(!activo) return;

      // 🔧 enzunchadora
      if(p.enzunchar){
        accionarEnzunchadora();
      }

      // 🛗 recoger → corta flujo
      if(p.recoger){
        activo = false;
        recogerRollo(el);
        return;
      }

      if(p.pausa){
        el.style.transition = "none";
        return;
      }

      x += p.x || 0;
      y += p.y || 0;

      el.style.transition = `transform ${p.t}ms linear`;
      el.style.transform = `translate(${x}px, ${y}px)`;

    }, tiempo);

    tiempo += p.t;

  });

}
// =========================
// 🛗 PLATAFORMA (SIMPLE)
// =========================
function recogerRollo(rollo){

  const plataforma = document.querySelector(".plataforma-elevador");
  if(!plataforma) return;

  // enganchar
// 📍 guardar posición real en pantalla
const rect = rollo.getBoundingClientRect();

// mover a planta primero
document.querySelector(".planta").appendChild(rollo);

// 🔒 fijar posición visual
rollo.style.position = "absolute";
rollo.style.left = rect.left + "px";
rollo.style.top = rect.top + "px";
rollo.style.transform = "none";

// ahora sí enganchar SIN salto
setTimeout(() => {

  plataforma.appendChild(rollo);

  rollo.style.left = "20px";
  rollo.style.top = "-50px";

}, 50);

}

// =========================
// 🚀 INICIO
// =========================
setTimeout(() => {

  console.log("🟢 sistema espiras activo");

  setInterval(cicloEspiras, 200);

  iniciarCiclos();

}, 1000);

function moverPlataforma(){

  const plataforma = document.querySelector(".plataforma-elevador");
  if(!plataforma) return;

  // usar mismo easing que rollo
  plataforma.style.transition = "transform 2000ms linear";
  plataforma.style.transform = "translateY(-300px)";

  setTimeout(() => {
    plataforma.style.transition = "transform 3000ms linear";
    plataforma.style.transform = "translateY(0px)";
  }, 3000); // ⬅️ mismo tiempo que subida
}



function obtenerEquiposHTML(){

  const equipos = [];

  document.querySelectorAll(".equipo").forEach(el => {

    const onclick = el.getAttribute("onclick");

    if(onclick){
      const match = onclick.match(/'([^']+)'/);
      if(match){
        equipos.push(match[1]);
      }
    }

  });

  return [...new Set(equipos)]; // sin duplicados
}
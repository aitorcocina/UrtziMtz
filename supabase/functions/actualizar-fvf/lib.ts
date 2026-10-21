// actualizar-fvf — Lee la web de la Federación Vizcaína de Fútbol (fvf-bff.eus) y actualiza
// la app del Centro de Entrenamiento (tabla team_data): Liga (clasificación, jornadas),
// partidos del Gorliz y estadísticas de jugadores a partir de las actas.
//
// Llamadas:
//   POST /actualizar-fvf               -> actualiza todo
//   POST /actualizar-fvf?dry=1         -> calcula y devuelve el resultado SIN guardar nada
//   POST /actualizar-fvf?cat=juvenil   -> solo una categoría
//   POST /actualizar-fvf?cron=1        -> solo actúa si en Madrid son las 16 h (lo usa pg_cron)
// Requiere la cabecera x-fvf-token igual al secreto FVF_TOKEN.
//
// Notas sobre la web de la federación:
//  - Los marcadores de las páginas de jornada/calendario están ofuscados a propósito. NO se leen de ahí:
//    el resultado sale de la página de clasificación (limpia) y se comprueba con los goles del acta.


const BASE = "https://www.fvf-bff.eus/pnfg/NPcd/";
export const CATS: Record<string, any> = {
  juvenil: {
    comp: "24058478", grupo: "24153119", agrup: "1773564", temporada: "22",
    nosotros: "GORLIZ A", equipo: 'GORLIZ "A"',
    competicion: "División de Honor Juvenil · Bizkaia · Grupo 1", duracion: 90,
  },
  cadete: {
    comp: "24058487", grupo: "24190893", agrup: "1773565", temporada: "22",
    nosotros: "GORLIZ", equipo: "GORLIZ",
    competicion: "Segunda División Cadete · Bizkaia · Grupo 2", duracion: 80,
  },
};

// ---------- utilidades ----------
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
function unesc(s: string) {
  return s.replace(/&nbsp;/g, " ").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/&([a-z]+);/gi, (m, n) => ({ Ntilde: "Ñ", ntilde: "ñ", Aacute: "Á", Eacute: "É", Iacute: "Í", Oacute: "Ó", Uacute: "Ú", aacute: "á", eacute: "é", iacute: "í", oacute: "ó", uacute: "ú", uuml: "ü", Uuml: "Ü" } as any)[n] ?? m);
}
function clean(s: string) { return unesc(s.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim(); }
function noScripts(h: string) { return h.replace(/<script[\s\S]*?<\/script>/gi, ""); }
function norm(s: string) { return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/"/g, "").replace(/\s+/g, " ").trim(); }
function toks(s: string) { return new Set((norm(s).match(/[A-Z]+/g) || []).filter((t) => t.length > 2)); }
export function titulo(n: string) {
  const low = new Set(["DE", "DEL", "LA", "EL", "Y"]);
  return n.trim().split(/\s+/).map((w, i) => {
    if (/^"/.test(w) || w.includes(".")) return w;
    if (i > 0 && low.has(w.toUpperCase())) return w.toLowerCase();
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  }).join(" ");
}
// "ORTEGA PEREZ, PAU" -> "Pau Ortega Perez"
export function nombreBonito(n: string) {
  const [ap, no] = n.split(",").map((x) => x.trim());
  const t = (x: string) => x.toLowerCase().split(/\s+/).map((w, i) => (i > 0 && ["de", "del", "la", "y"].includes(w)) ? w : w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  return no ? `${t(no)} ${t(ap)}` : t(ap);
}
const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
export function fechaCorta(ddmmyyyy: string, hora?: string) {
  const [d, m, y] = ddmmyyyy.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return `${DIAS[dt.getUTCDay()]} ${d} ${MESES[m - 1]}` + (hora ? ` ${hora}` : "");
}
function minNombre(txt: string) {
  const m = txt.match(/^\((\d+)'(?:\s*\+\s*(\d+))?\)\s*(.*)$/);
  return m ? { min: Number(m[1]), extra: m[2] ? Number(m[2]) : 0, nombre: m[3].trim() } : { min: null as number | null, extra: 0, nombre: txt.trim() };
}
function iso(ddmmyyyy: string) { const [d, m, y] = ddmmyyyy.split("-"); return `${y}-${m}-${d}`; }
export function hoyMadrid() {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hour12: false }).formatToParts(new Date());
  const g = (t: string) => p.find((x) => x.type === t)!.value;
  return { fecha: `${g("year")}-${g("month")}-${g("day")}`, hora: Number(g("hour")) % 24 };
}

// La web de la federación no entrega contenido a peticiones directas desde servidores,
// así que las páginas se piden a través de Firecrawl (abre la página como un navegador).
// Clave: firecrawl_api_key en la tabla privada config_privada. Cada página leída gasta un crédito de Firecrawl.
const memo = new Map<string, Promise<string>>();
export let paginasLeidas = 0;
let claveFirecrawl = "";
let limite = 0;
export function reiniciar(clave?: string) { memo.clear(); paginasLeidas = 0; limite = Date.now() + 105000; if (clave) claveFirecrawl = clave; }
export function sinTiempo() { return Date.now() > limite; }
function get(url: string): Promise<string> {
  if (!memo.has(url)) memo.set(url, getReal(url));
  return memo.get(url)!;
}
async function getReal(url: string): Promise<string> {
  const key = Deno.env.get("FIRECRAWL_API_KEY") || claveFirecrawl;
  if (!key) throw new Error("Falta la clave de Firecrawl (firecrawl_api_key en la tabla config_privada).");
  let last: any;
  for (let i = 0; i < 6; i++) {
    try {
      if (sinTiempo()) throw Object.assign(new Error("PARCIAL: se acabó el tiempo de esta ejecución"), { fatal: true });
      const r = await fetch("https://api.firecrawl.dev/v2/scrape", {
        method: "POST",
        headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ url, formats: ["rawHtml"], onlyMainContent: true, maxAge: 0 }),
      });
      const j = await r.json().catch(() => null);
      if (r.status === 429) {
        const seg = Number((String(j?.error || "").match(/retry after (\d+)s/) || [])[1] || 20);
        await sleep(seg * 1000 + 800); continue;
      }
      if (r.status === 401 || r.status === 402) throw Object.assign(new Error(`Firecrawl rechaza la petición (${r.status}): revisa la clave o los créditos.`), { fatal: true });
      if (!r.ok || !j?.success) throw new Error(`Firecrawl HTTP ${r.status}: ${j?.error || ""}`);
      const html: string = j.data?.rawHtml || "";
      if (html.length < 2000) throw new Error("La federación devolvió una página vacía");
      paginasLeidas++;
      return html;
    } catch (e: any) { last = e; if (e?.fatal) break; await sleep(2000); }
  }
  memo.delete(url);
  throw new Error(`No se pudo leer ${url}: ${last?.message || last}`);
}
const urlCalendario = (c: any) => `${BASE}NFG_VisCalendario_Vis?cod_primaria=1000120&codtemporada=${c.temporada}&codcompeticion=${c.comp}&codgrupo=${c.grupo}&CodJornada=1&cod_agrupacion=${c.agrup}`;
const urlClasif = (c: any, j: number) => `${BASE}NFG_VisClasificacion?cod_primaria=1000120&codjornada=${j}&codcompeticion=${c.comp}&codgrupo=${c.grupo}&codjornada=${j}&cod_agrupacion=${c.agrup}`;
const urlJornada = (c: any, j: number) => `${BASE}NFG_CmpJornada?cod_primaria=1000120&CodCompeticion=${c.comp}&CodGrupo=${c.grupo}&CodTemporada=${c.temporada}&cod_agrupacion=${c.agrup}&CodJornada=${j}&Sch_Tipo_Juego=1`;
const urlActa = (id: string) => `${BASE}NFG_CmpPartido?cod_primaria=1000120&CodActa=${id}&cod_acta=${id}`;

// ---------- parsers ----------
type Partido = { local: string; visitante: string };
export function parseCalendario(h: string) {
  h = noScripts(h);
  const out: { n: number; fecha: string; partidos: Partido[] }[] = [];
  const re = /Jardunaldia (\d+) <span[^>]*>\(([\d-]+)\)<\/span>([\s\S]*?)<\/table>/g;
  let m;
  while ((m = re.exec(h))) {
    const partidos: Partido[] = [];
    const r2 = /<td width="47%" align="right">([\s\S]*?)<\/td>[\s\S]*?<td width="47%" align="left">([\s\S]*?)<\/td>/g;
    let p;
    while ((p = r2.exec(m[3]))) partidos.push({ local: clean(p[1]), visitante: clean(p[2]) });
    out.push({ n: +m[1], fecha: m[2], partidos });
  }
  return out;
}
export function parseClasif(h: string) {
  h = noScripts(h);
  // Tabla resumen (la que tiene goles): pos, equipo, pts, casa J G E P, fuera J G E P, GF, GC
  const tabla: any[] = [];
  const i0 = h.indexOf("Aldeko golak");
  const tb = h.slice(i0, h.indexOf("</table>", i0));
  for (const tr of tb.split(/<tr[\s>]/).slice(1)) {
    const cells = [...tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((c) => clean(c[1]));
    if (cells.length < 14 || !/^\d+$/.test(cells[1])) continue;
    const n = cells.slice(3, 14).map(Number);
    if (n.some(isNaN)) continue;
    const [pts, jh, gh, eh, ph, ja, ga, ea, pa, gf, gc] = n;
    tabla.push({ pos: +cells[1], equipo: cells[2], pts, pj: jh + ja, g: gh + ga, e: eh + ea, p: ph + pa, gf, gc });
  }
  // Resultados de la jornada (marcadores limpios en esta página)
  const res: any[] = [];
  const re = /<td width="40%" align="right">([\s\S]*?)<\/td>\s*<td width="20%" align="center">([\s\S]*?)<\/td>\s*<td width="40%" align="left">([\s\S]*?)<\/td>/g;
  let m;
  while ((m = re.exec(h))) {
    const sc = [...m[2].matchAll(/<b>\s*(\d*)\s*<\/b>/g)].map((x) => x[1]);
    const acta = (m[2].match(/CodActa=(\d+)/) || [])[1] || null;
    res.push({ local: clean(m[1]), visitante: clean(m[3]), gl: sc[0] !== undefined && sc[0] !== "" ? +sc[0] : null, gv: sc[1] !== undefined && sc[1] !== "" ? +sc[1] : null, acta });
  }
  return { tabla, res };
}
export function parseJornada(h: string) {
  // fecha y hora de cada partido
  h = noScripts(h);
  const out: any[] = [];
  for (const seg of h.split('<table width="100%">').slice(1)) {
    const l = seg.match(/class="font_widgetL">\s*<h4>([\s\S]*?)<\/h4>/);
    const v = seg.match(/class="font_widgetV">\s*<h4>([\s\S]*?)<\/h4>/);
    if (!l || !v) continue;
    const hor = [...seg.matchAll(/<span class="horario"[^>]*>([\s\S]*?)<\/span>/g)].map((x) => clean(x[1]));
    const acta = (seg.match(/CodActa=(\d+)/) || [])[1] || null;
    out.push({ local: clean(l[1]), visitante: clean(v[1]), fecha: hor.find((x) => /\d\d-\d\d-\d{4}/.test(x)) || null, hora: hor.find((x) => /^\d\d:\d\d$/.test(x)) || null, acta });
  }
  return out;
}
export function parseActa(h: string) {
  h = noScripts(h);
  const equipos: any[] = [];
  for (const b0 of h.split(/<div class="number"[^>]*>/).slice(1)) {
    const nombre = clean(b0.split("</div>")[0]);
    if (!b0.slice(0, 3000).includes("Titularrak")) continue;
    const b = b0.split('<div class="number"')[0];
    const filas = (sec: string) => {
      const s = b.match(new RegExp("<strong>" + sec + "</strong></h5>\\s*<table[\\s\\S]*?</table>"));
      return s ? [...s[0].matchAll(/<td[^>]*>([\s\S]*?)<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/g)].map((x) => ({ dorsal: clean(x[1]), nombre: clean(x[2]) })) : [];
    };
    const cambios: any[] = [];
    const sc = b.match(/<h4>Ordezkapenak<\/h4>([\s\S]*?)(?:<h4|$)/);
    if (sc) for (const tr of sc[1].matchAll(/<tr>([\s\S]*?)<\/tr>/g)) {
      const c = [...tr[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((x) => x[1]);
      if (c.length >= 3) { const x = minNombre(clean(c[1])); cambios.push({ nombre: x.nombre, min: x.min, entra: c[2].includes("arrow-left") }); }
    }
    const tarjetas: any[] = [];
    const st = b.match(/<h4>Txartelak<\/h4>([\s\S]*?)<\/table>/);
    if (st) for (const tr of st[1].matchAll(/<tr>([\s\S]*?)<\/tr>/g)) {
      const c = [...tr[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((x) => x[1]);
      if (c.length < 2) continue;
      const tipo = (c[0].match(/tarj_(\w+)\.gif/) || [])[1] || "?";
      const x = minNombre(clean(c[1]));
      tarjetas.push({ tipo, nombre: x.nombre, min: x.min, extra: x.extra });
    }
    equipos.push({ equipo: nombre, titulares: filas("Titularrak"), suplentes: filas("Ordezkoak"), cambios, tarjetas });
  }
  const goles: any[] = [];
  const g = h.match(/Golak<\/div>([\s\S]*?)<\/table>/);
  if (g) for (const tr of g[1].matchAll(/<tr>([\s\S]*?)<\/tr>/g)) {
    const c = [...tr[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((x) => x[1]);
    if (c.length < 2) continue;
    const col = (c[0].match(/fa-futbol" style="color: ([^;"]+)/) || [])[1] || "";
    const tipo = col === "red" ? "propia" : col.startsWith("rgb(21") ? "penalti" : "gol";
    const x = minNombre(clean(c[1]));
    goles.push({ nombre: x.nombre, min: x.min, extra: x.extra, tipo });
  }
  const t = clean(h);
  const arbitro = (t.match(/Árbitro Principal\s+([^]+?)(?:\s{2,}|\s+Golak|\s+Epaile|\s+Asistente|$)/) || [])[1] || null;
  const campo = (t.match(/Futbol Zelaia:\s*([^]+?)\s+(?:Hiria|$)/) || [])[1] || null;
  return { equipos, goles, arbitro: arbitro ? arbitro.trim() : null, campo: campo ? campo.trim() : null };
}

// ---------- lógica ----------
function esNos(c: any, n: string) { return norm(n) === norm(c.nosotros) || norm(n) === norm(c.equipo); }

// Resume el acta solo con lo nuestro, y calcula el marcador con los goles
export function resumenActa(c: any, a: any) {
  const nos = a.equipos.find((e: any) => esNos(c, e.equipo));
  const otro = a.equipos.find((e: any) => e !== nos);
  if (!nos || !otro) return null;
  const mios = new Set([...nos.titulares, ...nos.suplentes].map((x: any) => x.nombre));
  let gf = 0, gc = 0;
  const goleadores: string[] = [];
  for (const g of a.goles) {
    let nuestro = mios.has(g.nombre);
    if (g.tipo === "propia") nuestro = !nuestro; else if (nuestro) goleadores.push(g.nombre);
    if (nuestro) gf++; else gc++;
  }
  // Cambios: el acta los da por parejas (entra sin minuto, sale con minuto)
  const cambios: any[] = [];
  for (let i = 0; i < nos.cambios.length; i++) {
    const x = nos.cambios[i], y = nos.cambios[i + 1];
    if (x.entra && y && !y.entra) { cambios.push({ min: y.min ?? x.min, entra: x.nombre, sale: y.nombre }); i++; }
    else if (x.entra) cambios.push({ min: x.min, entra: x.nombre, sale: null });
    else cambios.push({ min: x.min, entra: null, sale: x.nombre });
  }
  // Goles en orden con el marcador desde el punto de vista del Gorliz
  let mf = 0, mc = 0;
  const goles = a.goles.map((g: any) => {
    let nuestro = mios.has(g.nombre);
    if (g.tipo === "propia") nuestro = !nuestro;
    if (nuestro) mf++; else mc++;
    return { min: g.min, extra: g.extra, nombre: g.nombre, tipo: g.tipo, nuestro, marcador: `${mf}-${mc}` };
  });
  return {
    v: 2,
    titulares: nos.titulares, suplentes: nos.suplentes,
    entran: cambios.filter((x) => x.entra).map((x) => x.entra),
    cambios, goles, goleadores, tarjetas: nos.tarjetas, gf, gc, rival: otro.equipo,
    arbitro: a.arbitro, campo: a.campo,
  };
}

export function emparejar(nombre: string, dorsal: string | null, jugadores: any[], manual: Record<string, string | null>, excluir: Set<string>) {
  if (nombre in manual) return manual[nombre];
  const ft = toks(nombre);
  const sc = jugadores.filter((p) => !excluir.has(p.id)).map((p) => {
    const pt = toks(String(p.name || ""));
    let s = 0;
    for (const t of ft) if (pt.has(t)) s += 2;
    for (const a of ft) for (const b of pt) if (a !== b && a.slice(0, 4) === b.slice(0, 4)) s += 0.5;
    if (dorsal && String(p.number) === String(dorsal)) s += 1;
    return { s, p };
  }).sort((x, y) => y.s - x.s);
  if (sc.length && sc[0].s >= 2 && (sc.length < 2 || sc[0].s > sc[1].s)) return sc[0].p.id;
  return null;
}

export async function procesar(sb: any, cat: string, dry: boolean, hoy: string, renombrar = false) {
  const c = CATS[cat];
  const avisos: string[] = [];
  const kv = async (k: string) => (await sb.from("team_data").select("value").eq("key", k).maybeSingle()).data?.value ?? null;
  const cache = (await kv(`${cat}:fvf-cache`)) || { jornadas: {} };
  const config = ((await kv("fvf:config")) || {})[cat] || {};
  const manual: Record<string, string | null> = config.manual || {};
  const excluir = new Set<string>(config.excluir || []);
  // La caché solo guarda lo leído de la federación (no toca datos de la app), así que se guarda también en pruebas
  const guardarCache = async () => { await sb.from("team_data").upsert({ key: `${cat}:fvf-cache`, value: cache, updated_at: new Date().toISOString() }); };

  // 1) Calendario y última jornada que ya debería estar jugada
  const cal = parseCalendario(await get(urlCalendario(c)));
  if (!cal.length) throw new Error("Calendario vacío (¿ha cambiado la web?)");
  const total = cal.length;
  const jugadas = cal.filter((j) => iso(j.fecha) <= hoy).map((j) => j.n);
  let J = jugadas.length ? Math.max(...jugadas) : 0;

  // 2) Clasificación de J (si el partido del Gorliz de J no tiene resultado aún, se usa J-1)
  let clas = J ? parseClasif(await get(urlClasif(c, J))) : null;
  const pendiente = (cl: any) => cl && cl.res.some((r: any) => (esNos(c, r.local) || esNos(c, r.visitante)) && (r.gl === null || r.gv === null));
  if (J && pendiente(clas)) {
    avisos.push(`Jornada ${J}: el resultado del Gorliz aún no está publicado; se usa la jornada ${J - 1}.`);
    J -= 1; clas = J ? parseClasif(await get(urlClasif(c, J))) : null;
  }
  if (!J || !clas) return { cat, avisos: [...avisos, "Aún no hay jornadas jugadas."], escrito: false };
  if (clas.tabla.length < 4) throw new Error(`Clasificación de la jornada ${J} ilegible`);

  // 3) Partidos del Gorliz jornada a jornada (con caché; se refrescan siempre las dos últimas)
  for (const jd of cal.filter((x) => x.n <= J)) {
    const pc = jd.partidos.find((p) => esNos(c, p.local) || esNos(c, p.visitante));
    if (!pc || /atsedena|descansa/i.test(pc.local + pc.visitante)) { cache.jornadas[jd.n] = { descanso: true }; continue; }
    const enCache = cache.jornadas[jd.n];
    if (enCache?.acta?.v === 2 && jd.n < J - 1) continue;
    if (enCache?.acta && enCache.actaId && jd.n < J - 1) {
      // Caché de una versión anterior: se vuelve a leer solo el acta (con minutos, árbitro y campo)
      if (sinTiempo()) { await guardarCache(); throw new Error(`PARCIAL: actas actualizadas hasta la jornada ${jd.n - 1}; vuelve a ejecutar para seguir.`); }
      const nueva = resumenActa(c, parseActa(await get(urlActa(enCache.actaId))));
      if (nueva && nueva.gf === enCache.gf && nueva.gc === enCache.gc) { enCache.acta = nueva; await guardarCache(); }
      else avisos.push(`Jornada ${jd.n}: no se pudo releer el acta.`);
      continue;
    }
    if (sinTiempo()) { await guardarCache(); throw new Error(`PARCIAL: leídas hasta la jornada ${jd.n - 1}; vuelve a ejecutar para seguir.`); }
    const cl = jd.n === J ? clas : parseClasif(await get(urlClasif(c, jd.n)));
    const jl = parseJornada(await get(urlJornada(c, jd.n)));
    const r = cl.res.find((x: any) => esNos(c, x.local) || esNos(c, x.visitante));
    if (!r || r.gl === null) { avisos.push(`Jornada ${jd.n}: sin resultado publicado.`); continue; }
    const jp = jl.find((x: any) => esNos(c, x.local) || esNos(c, x.visitante));
    const actaId = r.acta || jp?.acta;
    let acta = null;
    if (actaId) {
      acta = resumenActa(c, parseActa(await get(urlActa(actaId))));
      if (!acta) avisos.push(`Jornada ${jd.n}: no se pudo leer el acta ${actaId}.`);
    } else avisos.push(`Jornada ${jd.n}: sin acta publicada.`);
    const casa = esNos(c, r.local);
    const gf = casa ? r.gl : r.gv, gc = casa ? r.gv : r.gl;
    if (acta && (acta.gf !== gf || acta.gc !== gc)) {
      avisos.push(`Jornada ${jd.n}: los goles del acta (${acta.gf}-${acta.gc}) no cuadran con el resultado (${gf}-${gc}); no se usa esa acta.`);
      acta = null;
    }
    cache.jornadas[jd.n] = { local: r.local, visitante: r.visitante, gl: r.gl, gv: r.gv, casa, gf, gc, fecha: jp?.fecha || jd.fecha, hora: jp?.hora || null, actaId, acta };
    await guardarCache();
  }

  // 4) Validación: los partidos del Gorliz deben cuadrar con su fila de la clasificación
  const jugados = Object.entries(cache.jornadas).filter(([n, v]: any) => +n <= J && !v.descanso && v.gf !== undefined).sort((a, b) => +a[0] - +b[0]) as [string, any][];
  const t = { pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0 };
  for (const [, v] of jugados) { t.pj++; t.gf += v.gf; t.gc += v.gc; if (v.gf > v.gc) t.g++; else if (v.gf < v.gc) t.p++; else t.e++; }
  const fila = clas.tabla.find((x: any) => esNos(c, x.equipo));
  if (!fila) throw new Error("El Gorliz no aparece en la clasificación");
  const cuadra = ["pj", "g", "e", "p", "gf", "gc"].every((k) => (t as any)[k] === fila[k]);
  if (!cuadra) throw new Error(`Los partidos del Gorliz (${JSON.stringify(t)}) no cuadran con la clasificación (${JSON.stringify(fila)}). No se guarda nada.`);

  // 5) Datos de Liga (mismo formato que competicion-data.js)
  const jornJ = parseJornada(await get(urlJornada(c, J)));
  const hor = (l: string, v: string, lista: any[]) => lista.find((x) => norm(x.local) === norm(l) && norm(x.visitante) === norm(v));
  const ultimos = clas.res.filter((r: any) => !/atsedena|descansa/i.test(r.local + r.visitante)).map((r: any) => {
    const h = hor(r.local, r.visitante, jornJ);
    return { f: h?.fecha ? iso(h.fecha) + (h.hora || "") : "", row: [h?.fecha ? fechaCorta(h.fecha, h.hora) : "", titulo(r.local), r.gl === null ? "" : `${r.gl}-${r.gv}`, titulo(r.visitante)] };
  }).sort((a: any, b: any) => a.f.localeCompare(b.f)).map((x: any) => x.row);
  let proximos: any = { titulo: "", partidos: [] };
  if (J < total) {
    const jp = parseJornada(await get(urlJornada(c, J + 1)));
    const calN = cal.find((x) => x.n === J + 1)!;
    proximos = {
      titulo: `Jornada ${J + 1}`,
      partidos: calN.partidos.filter((p) => !/atsedena|descansa/i.test(p.local + p.visitante)).map((p) => {
        const h = hor(p.local, p.visitante, jp);
        return { f: h?.fecha ? iso(h.fecha) + (h.hora || "") : iso(calN.fecha), row: [h?.fecha ? fechaCorta(h.fecha, h.hora) : fechaCorta(calN.fecha), titulo(p.local), "", titulo(p.visitante)] };
      }).sort((a: any, b: any) => a.f.localeCompare(b.f)).map((x: any) => x.row),
    };
  }
  const liga = {
    competicion: c.competicion, jornada: `Jornada ${J} de ${total}`, equipo: c.equipo,
    clasificacion: clas.tabla.map((x: any) => [titulo(x.equipo), x.pts, x.pj, x.g, x.e, x.p, x.gf, x.gc]),
    partidosGorliz: jugados.map(([n, v]) => [+n, fechaCorta(v.fecha), titulo(v.local), v.gl, v.gv, titulo(v.visitante)]),
    ultimos: { titulo: `Jornada ${J}`, partidos: ultimos },
    proximos,
  };

  // 6) Partidos de la app (<cat>:matches): marcador y fecha; no se toca la convocatoria
  const jugadores: any[] = (await kv(`${cat}:players`)) || [];
  let matches: any[] = (await kv(`${cat}:matches`)) || [];
  const calSinDesc = cal.filter((jd) => { const p = jd.partidos.find((x) => esNos(c, x.local) || esNos(c, x.visitante)); return p && !/atsedena|descansa/i.test(p.local + p.visitante); });
  if (!matches.length) {
    matches = calSinDesc.map((jd) => {
      const p = jd.partidos.find((x) => esNos(c, x.local) || esNos(c, x.visitante))!;
      const casa = esNos(c, p.local);
      return { id: `fvf${cat}${jd.n}`, jornada: jd.n, date: iso(jd.fecha), rival: titulo(casa ? p.visitante : p.local), venue: casa ? "casa" : "fuera", scoreFor: "", scoreAgainst: "" };
    });
    avisos.push(`Creada la lista de ${matches.length} partidos de liga.`);
  } else if (!matches.some((m) => m.jornada)) {
    // Primera vez: se asocia por orden y se comprueba casa/fuera
    calSinDesc.forEach((jd, i) => {
      const p = jd.partidos.find((x) => esNos(c, x.local) || esNos(c, x.visitante))!;
      const venue = esNos(c, p.local) ? "casa" : "fuera";
      if (matches[i] && matches[i].venue === venue) matches[i].jornada = jd.n;
      else avisos.push(`Jornada ${jd.n}: el partido nº ${i + 1} de la app no coincide (casa/fuera); revísalo a mano.`);
    });
  }
  for (const [n, v] of jugados) {
    const m = matches.find((x) => x.jornada === +n);
    if (!m) continue;
    m.scoreFor = v.gf; m.scoreAgainst = v.gc;
    if (v.fecha) m.date = iso(v.fecha);
  }

  // 7) Estadísticas desde todas las actas
  const statsPrev: any = (await kv(`${cat}:stats`)) || {};
  const stats: any = JSON.parse(JSON.stringify(statsPrev));
  const cont: Record<string, any> = {};
  const sinPareja = new Set<string>();
  const id = (nombre: string, dorsal: string | null) => { const r = emparejar(nombre, dorsal, jugadores, manual, excluir); if (r === null && !(nombre in manual)) sinPareja.add(nombre); return r; };
  const C = (pid: string) => (cont[pid] ??= { titular: 0, suplente: 0, convocado: 0, goals: 0, yellow: 0, red: 0 });
  let partidosEquipo = 0;
  for (const [n, v] of jugados) {
    partidosEquipo++;
    if (!v.acta) { avisos.push(`Jornada ${n}: sin acta, no cuenta para las estadísticas.`); partidosEquipo--; continue; }
    const a = v.acta;
    for (const x of a.titulares) { const p = id(x.nombre, x.dorsal); if (p) { C(p).titular++; C(p).convocado++; } }
    for (const x of a.suplentes) { const p = id(x.nombre, x.dorsal); if (p) { C(p).convocado++; if (a.entran.includes(x.nombre)) C(p).suplente++; } }
    for (const g of a.goleadores) { const p = id(g, null); if (p) C(p).goals++; }
    for (const tj of a.tarjetas) { const p = id(tj.nombre, null); if (!p) continue; if (tj.tipo === "amar") C(p).yellow++; else { C(p).red++; if (tj.tipo !== "roja") avisos.push(`Jornada ${n}: tarjeta de tipo "${tj.tipo}" a ${tj.nombre}, contada como roja; revísala.`); } }
  }
  // Minutos jugados por partido (titular desde el 0; el que entra desde su minuto; hasta el cambio, la roja o el final)
  const dur = c.duracion || 90;
  const minutos: Record<string, number> = {};
  const actasApp: Record<string, any> = {};
  const ultimoNombre: Record<string, { nombre: string; dorsal: string }> = {};
  for (const [n, v] of jugados) {
    const a = v.acta;
    if (!a) continue;
    const mins: Record<string, number> = {};
    const inicio: Record<string, number> = {};
    for (const x of a.titulares) inicio[x.nombre] = 0;
    const fin: Record<string, number> = {};
    for (const cb of a.cambios || []) {
      const m = Math.min(dur, cb.min ?? dur);
      if (cb.sale && fin[cb.sale] === undefined) fin[cb.sale] = m;
      if (cb.entra && inicio[cb.entra] === undefined) inicio[cb.entra] = m;
    }
    for (const tj of a.tarjetas || []) if (tj.tipo !== "amar" && tj.min != null && fin[tj.nombre] === undefined) fin[tj.nombre] = Math.min(dur, tj.min);
    for (const [nombre, ini] of Object.entries(inicio)) {
      const m = Math.max(0, (fin[nombre] ?? dur) - ini);
      mins[nombre] = m;
      const pid = id(nombre, null);
      if (pid) minutos[pid] = (minutos[pid] || 0) + m;
    }
    for (const x of [...a.titulares, ...a.suplentes]) ultimoNombre[x.nombre] = { nombre: x.nombre, dorsal: x.dorsal };
    const m = matches.find((x) => x.jornada === +n);
    const B = nombreBonito;
    if (m) actasApp[m.id] = {
      jornada: +n, fecha: v.fecha, hora: v.hora, local: titulo(v.local), visitante: titulo(v.visitante), gl: v.gl, gv: v.gv, casa: v.casa,
      campo: a.campo ? titulo(a.campo) : null, arbitro: a.arbitro ? B(a.arbitro) : null, actaId: v.actaId, duracion: dur,
      titulares: a.titulares.map((x: any) => ({ dorsal: x.dorsal, nombre: B(x.nombre), min: mins[x.nombre] ?? 0 })),
      suplentes: a.suplentes.map((x: any) => ({ dorsal: x.dorsal, nombre: B(x.nombre), min: mins[x.nombre] ?? 0 })),
      cambios: (a.cambios || []).map((x: any) => ({ min: x.min, entra: x.entra ? B(x.entra) : null, sale: x.sale ? B(x.sale) : null })),
      goles: (a.goles || []).map((g: any) => ({ min: g.min, extra: g.extra, nombre: B(g.nombre), tipo: g.tipo, nuestro: g.nuestro, marcador: g.marcador })),
      tarjetas: (a.tarjetas || []).map((x: any) => ({ min: x.min, extra: x.extra, nombre: B(x.nombre), tipo: x.tipo })),
    };
  }
  // Renombrar (solo cuando se pide): nombre de la federación y dorsal si falta
  const renombrados: string[] = [];
  if (renombrar) {
    for (const x of Object.values(ultimoNombre)) {
      const pid = id(x.nombre, x.dorsal);
      const p = jugadores.find((q) => q.id === pid);
      if (!p) continue;
      const nuevo = nombreBonito(x.nombre);
      if (p.name !== nuevo) { renombrados.push(`${p.name} → ${nuevo}`); p.name = nuevo; }
      if (!p.number && x.dorsal) p.number = x.dorsal;
    }
  }
  for (const p of jugadores) {
    if (excluir.has(p.id)) continue;
    const k = cont[p.id] || { titular: 0, suplente: 0, convocado: 0, goals: 0, yellow: 0, red: 0 };
    const s = stats[p.id] ||= { goals: 0, yellow: 0, red: 0, status: "no_convocado", counts: {} };
    s.counts ||= {};
    const sancion = s.counts.sancionado || 0;
    s.goals = k.goals; s.yellow = k.yellow; s.red = k.red;
    s.counts.titular = k.titular; s.counts.suplente = k.suplente; s.counts.convocado = k.convocado;
    s.counts.lesionado = Math.max(0, partidosEquipo - k.convocado - sancion);
    s.counts.no_convocado = 0;
    s.counts.sancionado = sancion;
    s.minutes = minutos[p.id] || 0;
  }
  if (sinPareja.size) avisos.push(`En el acta pero no en la app (no contados): ${[...sinPareja].join("; ")}.`);

  // 8) Guardar
  const gorliz = clas.tabla.find((x: any) => esNos(c, x.equipo));
  const prox = proximos.partidos.find((p: any) => /gorliz/i.test(p[1] + p[3]));
  const ult = liga.partidosGorliz[liga.partidosGorliz.length - 1];
  const resumen = {
    jornada: J, puesto: gorliz.pos, puntos: gorliz.pts,
    ultimo: ult ? `${ult[2]} ${ult[3]}-${ult[4]} ${ult[5]}` : null,
    proximo: prox ? `${prox[1]} vs ${prox[3]} · ${prox[0]}` : null,
  };
  if (!dry) {
    const now = new Date().toISOString();
    const ups = [
      { key: `${cat}:matches`, value: matches, updated_at: now },
      { key: `${cat}:stats`, value: stats, updated_at: now },
      { key: `${cat}:fvf-cache`, value: cache, updated_at: now },
      { key: `${cat}:actas`, value: actasApp, updated_at: now },
    ];
    if (renombrados.length) {
      ups.push({ key: `backup-${cat}-players-${hoy}-antes-nombres-fvf`, value: (await kv(`${cat}:players`)), updated_at: now });
      ups.push({ key: `${cat}:players`, value: jugadores, updated_at: now });
    }
    // copia de seguridad del día (solo si no existe ya)
    for (const [k, v] of [[`backup-${cat}-stats-${hoy}-antes-fvf`, statsPrev], [`backup-${cat}-matches-${hoy}-antes-fvf`, (await kv(`${cat}:matches`))]] as [string, any][]) {
      if (v && !(await kv(k))) ups.push({ key: k, value: v, updated_at: now });
    }
    const { error } = await sb.from("team_data").upsert(ups);
    if (error) throw new Error("Error guardando en Supabase: " + error.message);
  }
  if (renombrados.length) avisos.push(`Nombres cambiados: ${renombrados.length}.`);
  return { cat, escrito: !dry, resumen, avisos, liga, matches, stats, contados: cont, partidosEquipo, minutos, actasApp, renombrados };
}


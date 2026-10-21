/* acta.js — "Acta del partido" en plantilla-juvenil / plantilla-cadete.
   Muestra el resumen del acta oficial de la Federación Vizcaína (alineación, cambios con minuto,
   goles, tarjetas y minutos jugados). Los datos los guarda cada lunes la función actualizar-fvf
   en la clave "<categoría>:actas" de Supabase (una entrada por id de partido de la app).
   Uso: <script src="acta.js" defer></script> y window.ActaFVF.abrir(idPartido) */
(function(){
  'use strict';
  var cat = /cadete/i.test(location.pathname + document.title) ? 'cadete' : 'juvenil';
  var SB_URL = 'https://bzjzedwbahgitunoksps.supabase.co', SB_KEY = 'sb_publishable_GwXGrJorusdd94VeHBH4Lg_C657Knj5';
  var datos = null, cargadoEn = 0, rivalDatos = null, rivalEn = 0;
  function cargarRival(){
    if(rivalDatos && Date.now() - rivalEn < 120000) return Promise.resolve(rivalDatos);
    return fetch(SB_URL + '/rest/v1/team_data?key=eq.' + encodeURIComponent(cat + ':rival') + '&select=value', { headers: { apikey: SB_KEY } })
      .then(function(r){ return r.ok ? r.json() : []; })
      .then(function(rows){ rivalDatos = (rows && rows[0] && rows[0].value) || null; rivalEn = Date.now(); return rivalDatos; })
      .catch(function(){ return rivalDatos; });
  }

  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
  function esGorliz(n){ return /^gorliz/i.test(String(n || '')); }
  function minTxt(m, extra){ return m == null ? '' : (m + "'" + (extra ? '+' + extra : '')); }
  var DIAS = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'], MESES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  function fechaTxt(f, h){
    if(!f) return '';
    var p = f.split('-'); var d = new Date(Date.UTC(+p[2], +p[1]-1, +p[0]));
    return DIAS[d.getUTCDay()] + ' ' + (+p[0]) + ' ' + MESES[+p[1]-1] + (h ? ' · ' + h : '');
  }

  function cargar(forzar){
    if(datos && !forzar && Date.now() - cargadoEn < 120000) return Promise.resolve(datos);
    return fetch(SB_URL + '/rest/v1/team_data?key=eq.' + encodeURIComponent(cat + ':actas') + '&select=value', { headers: { apikey: SB_KEY } })
      .then(function(r){ return r.ok ? r.json() : []; })
      .then(function(rows){ datos = (rows && rows[0] && rows[0].value) || {}; cargadoEn = Date.now(); return datos; })
      .catch(function(){ return datos || {}; });
  }

  var css = document.createElement('style');
  css.textContent =
    '.acta-btn{flex:1 1 100%;display:flex;align-items:center;justify-content:center;gap:6px;background:rgba(245,245,246,0.06);border:1px solid var(--line-faint);color:var(--line);font-family:"JetBrains Mono",monospace;font-size:10.5px;text-transform:uppercase;letter-spacing:.04em;padding:9px 6px;border-radius:9px;cursor:pointer}' +
    '.acta-btn:active{filter:brightness(0.9)}.acta-btn svg{width:14px;height:14px;flex-shrink:0}' +
    '.match-actions{flex-wrap:wrap}.pj-badge+.pj-badge{margin-left:6px}' +
    '#acta-ov{position:fixed;inset:0;z-index:300;background:rgba(0,0,0,.55);display:none;align-items:flex-end;justify-content:center}' +
    '#acta-ov.open{display:flex}' +
    '#acta-sh{background:var(--pitch);color:var(--line);width:100%;max-width:560px;max-height:92vh;overflow:auto;border-radius:22px 22px 0 0;padding:18px 16px 28px;box-shadow:var(--shadow);-webkit-overflow-scrolling:touch}' +
    '@media(min-width:620px){#acta-ov{align-items:center}#acta-sh{border-radius:22px}}' +
    '.ac-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}' +
    '.ac-tit{font-family:Oswald,sans-serif;text-transform:uppercase;letter-spacing:.06em;font-size:13px;color:var(--amber)}' +
    '.ac-x{background:none;border:none;color:var(--line-dim);font-size:22px;line-height:1;cursor:pointer;padding:4px 6px}' +
    '.ac-sub{font-size:12px;color:var(--line-dim);margin-bottom:12px}' +
    '.ac-score{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:10px;background:var(--pitch-light);border-radius:16px;padding:14px 12px;margin-bottom:8px}' +
    '.ac-score .eq{font-weight:600;font-size:14px;line-height:1.2}.ac-score .eq.l{text-align:right}.ac-score .yo{color:var(--amber)}' +
    '.ac-score .res{font-family:Oswald,sans-serif;font-size:30px;font-weight:600;letter-spacing:.02em;font-variant-numeric:tabular-nums}' +
    '.ac-meta{font-size:11.5px;color:var(--line-dim);text-align:center;margin-bottom:14px}' +
    '.ac-sec{margin-top:14px}.ac-h{font-family:Oswald,sans-serif;text-transform:uppercase;letter-spacing:.06em;font-size:12px;color:var(--line-dim);margin:0 0 6px}' +
    '.ac-row{display:flex;align-items:center;gap:10px;padding:8px 2px;border-top:1px solid var(--line-faint);font-size:13.5px}' +
    '.ac-row:first-of-type{border-top:none}' +
    '.ac-min{font-family:"JetBrains Mono",monospace;font-size:11.5px;color:var(--line-dim);min-width:38px}' +
    '.ac-dor{font-family:"JetBrains Mono",monospace;font-size:11px;color:var(--line-dim);min-width:22px;text-align:right}' +
    '.ac-nom{flex:1;min-width:0}.ac-nom small{display:block;font-size:11px;color:var(--line-dim);margin-top:1px}' +
    '.ac-mins{font-family:"JetBrains Mono",monospace;font-size:11.5px;background:var(--pitch-light);border-radius:8px;padding:2px 7px;white-space:nowrap}' +
    '.ac-ic{display:inline-flex;gap:3px;margin-left:6px;vertical-align:1px}' +
    '.ac-card{display:inline-block;width:8px;height:11px;border-radius:2px}.ac-card.y{background:var(--oro)}.ac-card.r{background:var(--red)}' +
    '.ac-gol.nos{font-weight:600}.ac-gol .mk{font-family:"JetBrains Mono",monospace;font-size:11.5px;margin-left:auto;color:var(--line-dim)}' +
    '.ac-gol.nos .mk{color:var(--verde)}' +
    '.ac-in{color:var(--verde);font-weight:700}.ac-out{color:var(--red);font-weight:700}' +
    '.ac-vacio{font-size:12.5px;color:var(--line-dim);padding:6px 2px}' +
    '.ac-pie{margin-top:18px;font-size:11px;color:var(--line-dim);text-align:center}.ac-pie a{color:var(--line-dim)}' +
    '.rv-link{cursor:pointer;text-decoration:underline;text-decoration-style:dotted;text-underline-offset:3px}' +
    '.rv-link::after{content:" ›";opacity:.6;text-decoration:none;display:inline-block;margin-left:2px}' +
    '.rv-racha{display:flex;gap:6px;justify-content:center;margin:4px 0 14px}' +
    '.rv-b{width:30px;height:30px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-family:Oswald,sans-serif;font-weight:600;font-size:14px;color:#fff}' +
    '.rv-b.G{background:var(--verde)}.rv-b.E{background:#8b8d93}.rv-b.P{background:var(--red)}' +
    '.rv-res{font-family:"JetBrains Mono",monospace;font-weight:700;font-size:13px;min-width:44px;text-align:center;background:var(--pitch-light);border-radius:8px;padding:2px 6px}' +
    '.rv-row .yo{font-weight:700}' +
    '.rv-tab{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;text-align:center;margin-bottom:6px}' +
    '.rv-tab div{background:var(--pitch-light);border-radius:12px;padding:8px 0}.rv-tab b{display:block;font-size:17px;font-variant-numeric:tabular-nums}.rv-tab span{font-size:9.5px;letter-spacing:.08em;color:var(--line-dim);text-transform:uppercase}';
  document.head.appendChild(css);

  var ov = document.createElement('div');
  ov.id = 'acta-ov';
  ov.innerHTML = '<div id="acta-sh" role="dialog" aria-modal="true" aria-label="Acta del partido"></div>';
  function cerrar(){ ov.classList.remove('open'); document.body.style.overflow = ''; }
  ov.addEventListener('click', function(e){ if(e.target === ov) cerrar(); });
  document.addEventListener('keydown', function(e){ if(e.key === 'Escape') cerrar(); });
  function montar(){ if(!ov.parentNode) document.body.appendChild(ov); }

  function pintar(a){
    var sh = document.getElementById('acta-sh');
    if(!a){
      sh.innerHTML = '<div class="ac-top"><div class="ac-tit">Acta del partido</div><button class="ac-x" aria-label="Cerrar">×</button></div>' +
        '<div class="ac-vacio">El acta de este partido todavía no está disponible. Se carga sola cada lunes a las 16:00 desde la Federación Vizcaína.</div>';
      sh.querySelector('.ac-x').onclick = cerrar; return;
    }
    // iconos por jugador (goles y tarjetas del Gorliz)
    var ic = {};
    (a.goles || []).forEach(function(g){ if(g.nuestro && g.tipo !== 'propia'){ (ic[g.nombre] = ic[g.nombre] || []).push('⚽'); } });
    (a.tarjetas || []).forEach(function(t){ (ic[t.nombre] = ic[t.nombre] || []).push(t.tipo === 'amar' ? '<span class="ac-card y"></span>' : '<span class="ac-card r"></span>'); });
    var sale = {}, entra = {};
    (a.cambios || []).forEach(function(c){ if(c.sale) sale[c.sale] = c.min; if(c.entra) entra[c.entra] = c.min; });
    function icon(n){ return ic[n] ? '<span class="ac-ic">' + ic[n].join('') + '</span>' : ''; }

    var h = '<div class="ac-top"><div class="ac-tit">Acta del partido · Jornada ' + esc(a.jornada) + '</div><button class="ac-x" aria-label="Cerrar">×</button></div>' +
      '<div class="ac-sub">' + esc(fechaTxt(a.fecha, a.hora)) + '</div>' +
      '<div class="ac-score"><div class="eq l' + (esGorliz(a.local) ? ' yo' : '') + '">' + esc(a.local) + '</div><div class="res">' + esc(a.gl) + ' - ' + esc(a.gv) + '</div><div class="eq' + (esGorliz(a.visitante) ? ' yo' : '') + '">' + esc(a.visitante) + '</div></div>' +
      '<div class="ac-meta">' + [a.campo ? '📍 ' + esc(a.campo) : '', a.arbitro ? 'Árbitro: ' + esc(a.arbitro) : ''].filter(Boolean).join(' · ') + '</div>';

    h += '<div class="ac-sec"><div class="ac-h">Goles</div>' + ((a.goles || []).length ? a.goles.map(function(g){
      var et = g.tipo === 'penalti' ? ' (pen.)' : g.tipo === 'propia' ? ' (p.p.)' : '';
      return '<div class="ac-row ac-gol' + (g.nuestro ? ' nos' : '') + '"><span class="ac-min">' + minTxt(g.min, g.extra) + '</span><span class="ac-nom">' + (g.nuestro ? '⚽ ' : '') + esc(g.nombre) + et + (g.nuestro ? '' : '<small>Rival</small>') + '</span><span class="mk">' + esc(g.marcador) + '</span></div>';
    }).join('') : '<div class="ac-vacio">Sin goles.</div>') + '</div>';

    h += '<div class="ac-sec"><div class="ac-h">Alineación titular</div>' + (a.titulares || []).map(function(p){
      var nota = sale[p.nombre] != null ? 'Sustituido en el ' + sale[p.nombre] + "'" : 'Todo el partido';
      return '<div class="ac-row"><span class="ac-dor">' + esc(p.dorsal) + '</span><span class="ac-nom">' + esc(p.nombre) + icon(p.nombre) + '<small>' + nota + '</small></span><span class="ac-mins">' + esc(p.min) + "'</span></div>";
    }).join('') + '</div>';

    h += '<div class="ac-sec"><div class="ac-h">Suplentes</div>' + (a.suplentes || []).map(function(p){
      var jugo = entra[p.nombre] != null;
      return '<div class="ac-row"><span class="ac-dor">' + esc(p.dorsal) + '</span><span class="ac-nom">' + esc(p.nombre) + icon(p.nombre) + '<small>' + (jugo ? 'Entra en el ' + entra[p.nombre] + "'" : 'No jugó') + '</small></span>' + (jugo ? '<span class="ac-mins">' + esc(p.min) + "'</span>" : '') + '</div>';
    }).join('') + '</div>';

    h += '<div class="ac-sec"><div class="ac-h">Cambios</div>' + ((a.cambios || []).length ? a.cambios.map(function(c){
      return '<div class="ac-row"><span class="ac-min">' + minTxt(c.min) + '</span><span class="ac-nom">' + (c.entra ? '<span class="ac-in">↑</span> ' + esc(c.entra) : '') + (c.sale ? '<small><span class="ac-out">↓</span> ' + esc(c.sale) + '</small>' : '') + '</span></div>';
    }).join('') : '<div class="ac-vacio">Sin cambios.</div>') + '</div>';

    h += '<div class="ac-sec"><div class="ac-h">Tarjetas</div>' + ((a.tarjetas || []).length ? a.tarjetas.map(function(t){
      return '<div class="ac-row"><span class="ac-min">' + minTxt(t.min, t.extra) + '</span><span class="ac-card ' + (t.tipo === 'amar' ? 'y' : 'r') + '"></span><span class="ac-nom">' + esc(t.nombre) + '</span></div>';
    }).join('') : '<div class="ac-vacio">Sin tarjetas.</div>') + '</div>';

    h += '<div class="ac-pie">Fuente: acta oficial de la Federación Vizcaína de Fútbol' + (a.actaId ? ' · <a href="https://www.fvf-bff.eus/pnfg/NPcd/NFG_CmpPartido?cod_primaria=1000120&CodActa=' + encodeURIComponent(a.actaId) + '&cod_acta=' + encodeURIComponent(a.actaId) + '" target="_blank" rel="noopener">ver en la web</a>' : '') + '</div>';
    sh.innerHTML = h;
    sh.querySelector('.ac-x').onclick = cerrar;
    sh.scrollTop = 0;
  }

  function pintarRival(r){
    var sh = document.getElementById('acta-sh');
    if(!r){
      sh.innerHTML = '<div class="ac-top"><div class="ac-tit">Próximo rival</div><button class="ac-x" aria-label="Cerrar">×</button></div><div class="ac-vacio">Todavía no hay datos del rival. Se cargan solos cada lunes a las 16:00.</div>';
      sh.querySelector('.ac-x').onclick = cerrar; return;
    }
    var ult = r.ultimos || [];
    var h = '<div class="ac-top"><div class="ac-tit">Próximo rival · Jornada ' + esc(r.jornada) + '</div><button class="ac-x" aria-label="Cerrar">×</button></div>' +
      '<div class="ac-score" style="grid-template-columns:1fr"><div class="eq" style="text-align:center;font-size:18px">' + esc(r.rival) + '</div></div>' +
      '<div class="ac-meta">' + (r.casa ? 'Jugamos en casa' : 'Jugamos fuera') + (r.puesto ? ' · ' + esc(r.puesto) + 'º en la clasificación' : '') + '</div>';
    if(r.puesto) h += '<div class="rv-tab"><div><b>' + esc(r.puntos) + '</b><span>Puntos</span></div><div><b>' + esc(r.g) + '-' + esc(r.e) + '-' + esc(r.p) + '</b><span>G-E-P</span></div><div><b>' + esc(r.gf) + '</b><span>Goles a favor</span></div><div><b>' + esc(r.gc) + '</b><span>Goles en contra</span></div></div>';
    h += '<div class="ac-sec"><div class="ac-h">Últimos ' + ult.length + ' partidos</div>';
    if(ult.length){
      h += '<div class="rv-racha">' + ult.slice().reverse().map(function(u){ return '<span class="rv-b ' + u.res + '" title="Jornada ' + esc(u.jornada) + '">' + u.res + '</span>'; }).join('') + '</div>';
      h += ult.map(function(u){
        var lo = u.casa ? ' yo' : '', vi = u.casa ? '' : ' yo';
        return '<div class="ac-row rv-row"><span class="ac-min">J' + esc(u.jornada) + '</span><span class="ac-nom"><span class="' + lo + '">' + esc(u.local) + '</span><small>' + (u.fecha ? esc(fechaTxt(u.fecha)) + ' · ' : '') + (u.casa ? 'En casa' : 'Fuera') + '</small></span><span class="rv-res">' + esc(u.gl) + '-' + esc(u.gv) + '</span><span class="ac-nom" style="text-align:right"><span class="' + vi + '">' + esc(u.visitante) + '</span></span></div>';
      }).join('');
    } else h += '<div class="ac-vacio">Sin partidos jugados todavía.</div>';
    h += '</div><div class="ac-pie">Fuente: Federación Vizcaína de Fútbol · se actualiza cada lunes</div>';
    sh.innerHTML = h;
    sh.querySelector('.ac-x').onclick = cerrar;
    sh.scrollTop = 0;
  }
  window.RivalFVF = {
    abrir: function(){
      montar();
      var sh = document.getElementById('acta-sh');
      sh.innerHTML = '<div class="spinner"></div>';
      ov.classList.add('open'); document.body.style.overflow = 'hidden';
      cargarRival().then(pintarRival);
    },
    // id del partido de la app al que corresponde el informe (el de esta semana)
    partido: function(){ return cargarRival().then(function(r){ return r && r.matchId; }); }
  };
  window.ActaFVF = {
    abrir: function(id){
      montar();
      var sh = document.getElementById('acta-sh');
      sh.innerHTML = '<div class="spinner"></div>';
      ov.classList.add('open'); document.body.style.overflow = 'hidden';
      cargar().then(function(d){ pintar(d[id]); });
    },
    precargar: function(){ return cargar(); }
  };
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ montar(); cargar(); cargarRival(); }); else { montar(); cargar(); cargarRival(); }
})();

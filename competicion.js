/* competicion.js — pestaña "Liga" (clasificación y partidos) en plantilla-juvenil / plantilla-cadete.
   Lee los datos de competicion-data.js. Uso: <script src="competicion-data.js"></script><script src="competicion.js" defer></script> */
(function(){
  'use strict';
  var cat = /cadete/i.test(location.pathname + document.title) ? 'cadete' : 'juvenil';
  function init(){
    var D = window.COMPETICION_DATA && window.COMPETICION_DATA[cat];
    var tabbar = document.querySelector('nav.tabbar'), main = document.querySelector('main') || document.querySelector('.app');
    if(!D || !tabbar || !main) return;
    var yo = D.equipo.toLowerCase().replace(/"/g,'');
    function esYo(n){ return n.toLowerCase().replace(/"/g,'').indexOf('gorliz') === 0; }
    function esc(s){ return String(s).replace(/[&<>]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;'}[c]; }); }

    var css = document.createElement('style');
    css.textContent =
      '.lg-card{background:var(--pitch);border:1px solid var(--line-faint);border-radius:20px;padding:14px;margin-bottom:14px;box-shadow:var(--shadow)}' +
      '.lg-h{font-family:Oswald,sans-serif;text-transform:uppercase;letter-spacing:.06em;font-size:13px;color:var(--amber);margin:0 0 10px}' +
      '.lg-sub{font-size:12px;color:var(--line-dim);margin:-6px 0 10px}' +
      '.lg-next{display:flex;align-items:center;justify-content:space-between;gap:8px;font-weight:600;font-size:15px}' +
      '.lg-next small{display:block;font-weight:400;font-size:12px;color:var(--line-dim);margin-top:2px}' +
      '.lg-tbl{width:100%;border-collapse:collapse;font-size:12.5px;font-variant-numeric:tabular-nums}' +
      '.lg-tbl th{font-size:10px;letter-spacing:.08em;color:var(--line-dim);font-weight:600;text-align:right;padding:4px 3px}' +
      '.lg-tbl td{padding:7px 3px;text-align:right;border-top:1px solid var(--line-faint)}' +
      '.lg-tbl th:nth-child(2),.lg-tbl td:nth-child(2){text-align:left}' +
      '.lg-tbl td:nth-child(2){max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
      '.lg-tbl td:first-child,.lg-tbl th:first-child{text-align:center;width:24px}' +
      '.lg-tbl td.pts{font-weight:700}' +
      '.lg-tbl tr.yo td{background:rgba(179,18,43,.09);font-weight:700;color:var(--amber-dark)}' +
      '.lg-m{display:grid;grid-template-columns:1fr auto 1fr;gap:6px;align-items:center;padding:8px 0;border-top:1px solid var(--line-faint);font-size:13px}' +
      '.lg-m:first-of-type{border-top:none}' +
      '.lg-m .f{grid-column:1/-1;font-size:11px;color:var(--line-dim)}' +
      '.lg-m .l{text-align:right}.lg-m .v{text-align:left}' +
      '.lg-m .r{font-weight:700;background:var(--pitch-light);border-radius:8px;padding:2px 9px;min-width:46px;text-align:center}' +
      '.lg-m .yo{font-weight:700;color:var(--amber-dark)}' +
      '.lg-pie{font-size:11px;color:var(--line-dim);text-align:center;margin:6px 0 4px}' +
      'nav.tabbar .tab{font-size:10px;padding-left:0;padding-right:0}' +
      '#matchSummary{display:none !important}';
    document.head.appendChild(css);

    // Pestaña
    var btn = document.createElement('button');
    btn.className = 'tab'; btn.setAttribute('data-view','competicion');
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4M12 14v4M8 20h8"/></svg>Liga';
    tabbar.insertBefore(btn, tabbar.firstChild); // Liga la primera

    // Vista
    function filas(lista){
      return lista.map(function(m){
        var r = m[2] || 'vs';
        return '<div class="lg-m"><div class="f">'+esc(m[0])+'</div><div class="l'+(esYo(m[1])?' yo':'')+'">'+esc(m[1])+'</div><div class="r">'+esc(r)+'</div><div class="v'+(esYo(m[3])?' yo':'')+'">'+esc(m[3])+'</div></div>';
      }).join('');
    }
    var prox = D.proximos.partidos.filter(function(m){ return esYo(m[1])||esYo(m[3]); })[0];
    var h = '<div class="section-title">Liga</div><div class="lg-sub">'+esc(D.competicion)+' · '+esc(D.jornada)+'</div>';
    if(prox){
      h += '<div class="lg-card"><div class="lg-h">Próximo partido · '+esc(D.proximos.titulo)+'</div><div class="lg-next"><div>'+esc(prox[1])+' <span style="color:var(--line-dim)">vs</span> '+esc(prox[3])+'<small>'+esc(prox[0])+'</small></div></div><button type="button" id="lg-conv" style="margin-top:12px;width:100%;border:none;border-radius:16px;padding:13px;font-size:15px;font-weight:600;background:#B3122B;color:#fff;cursor:pointer">📋 Convocatoria</button></div>';
    }
    h += '<div class="lg-card"><div class="lg-h">Clasificación</div><table class="lg-tbl"><tr><th>#</th><th>EQUIPO</th><th>PTS</th><th>PJ</th><th>G</th><th>E</th><th>P</th><th>GF</th><th>GC</th></tr>' +
      D.clasificacion.map(function(t,i){
        return '<tr class="'+(esYo(t[0])?'yo':'')+'"><td>'+(i+1)+'</td><td>'+esc(t[0])+'</td><td class="pts">'+t[1]+'</td><td>'+t[2]+'</td><td>'+t[3]+'</td><td>'+t[4]+'</td><td>'+t[5]+'</td><td>'+t[6]+'</td><td>'+t[7]+'</td></tr>';
      }).join('') + '</table></div>';
    h += '<div class="lg-card"><div class="lg-h">Resultados · '+esc(D.ultimos.titulo)+'</div>'+filas(D.ultimos.partidos)+'</div>';
    h += '<div class="lg-card"><div class="lg-h">Próxima jornada · '+esc(D.proximos.titulo)+'</div>'+filas(D.proximos.partidos)+'</div>';
    h += '<div class="lg-pie">Actualizado: '+esc(window.COMPETICION_DATA.actualizado)+' · Fuente: futbuteo.com (no oficial)</div>';
    var view = document.createElement('div');
    view.className = 'view'; view.id = 'view-competicion'; view.innerHTML = h;
    var cb = view.querySelector('#lg-conv');
    if(cb && prox) cb.addEventListener('click', function(){
      if(window.Convocatoria) window.Convocatoria.abrir({cat:cat, categoria:(cat==='cadete'?'CADETE':'JUVENIL')+' · '+D.competicion.split(' · ')[0], competicion:D.competicion, partido:prox});
    });
    var ref = document.getElementById('view-notas');
    ref.parentNode.insertBefore(view, ref);


    // ---- Bloque "Partidos de Liga" en la pestaña Partidos (solo lectura, no toca tus datos guardados) ----
    if(D.partidosGorliz && D.partidosGorliz.length){
      var g=0,e=0,p=0,gf=0,gc=0;
      var items = D.partidosGorliz.map(function(m){
        var local = esYo(m[2]), mis = local?m[3]:m[4], suyos = local?m[4]:m[3];
        gf+=mis; gc+=suyos;
        var res = mis>suyos?'G':(mis<suyos?'P':'E'); if(res==='G')g++; else if(res==='P')p++; else e++;
        var col = res==='G'?'#1B7A3E':(res==='P'?'#B3122B':'#8b8d93');
        return '<div class="lg-m"><div class="f">J'+m[0]+' · '+esc(m[1])+' · '+(local?'Casa':'Fuera')+'</div><div class="l'+(local?' yo':'')+'">'+esc(m[2])+'</div><div class="r" style="color:'+col+'">'+m[3]+'-'+m[4]+'</div><div class="v'+(local?'':' yo')+'">'+esc(m[5]||'')+'</div></div>';
      });
      // en visitante el rival está en m[2] y Gorliz en m[5]; ajustar nombres
      items = D.partidosGorliz.map(function(m){
        var local = esYo(m[2]), mis = local?m[3]:m[4], suyos = local?m[4]:m[3];
        var res = mis>suyos?'G':(mis<suyos?'P':'E');
        var col = res==='G'?'#1B7A3E':(res==='P'?'#B3122B':'#8b8d93');
        var etq = res==='G'?'Ganado':(res==='P'?'Perdido':'Empatado');
        return '<div class="lg-m"><div class="f">J'+m[0]+' · '+esc(m[1])+' · '+(local?'Casa':'Fuera')+' · <b style="color:'+col+'">'+etq+'</b></div><div class="l'+(local?' yo':'')+'">'+esc(m[2])+'</div><div class="r" style="color:'+col+'">'+m[3]+'-'+m[4]+'</div><div class="v'+(local?'':' yo')+'">'+esc(m[5])+'</div></div>';
      });
      var pj=g+e+p, dif=gf-gc;
      var box = '<div class="lg-card" id="lg-partidos"><div class="lg-h">Partidos de Liga · '+esc(D.jornada.split(' de ')[0])+'</div>' +
        '<div style="display:grid;grid-template-columns:repeat(6,1fr);gap:6px;text-align:center;margin-bottom:10px">' +
        [['PJ',pj],['G',g],['E',e],['P',p],['GF',gf],['GC',gc]].map(function(x){return '<div style="background:var(--pitch-light);border-radius:12px;padding:8px 0"><div style="font-size:18px;font-weight:700;font-variant-numeric:tabular-nums">'+x[1]+'</div><div style="font-size:10px;letter-spacing:.08em;color:var(--line-dim)">'+x[0]+'</div></div>';}).join('') +
        '</div><div class="lg-sub" style="margin:0 0 6px">Diferencia de goles: '+(dif>0?'+':'')+dif+'</div>' + items.join('') +
        '<div class="lg-pie">Datos de la liga (futbuteo.com, no oficial)</div></div>';
      var vp = document.getElementById('view-partidos');
      if(vp){ var t = vp.querySelector('.section-title'); var w = document.createElement('div'); w.innerHTML = box; if(t) t.insertAdjacentElement('afterend', w.firstChild); else vp.insertBefore(w.firstChild, vp.firstChild); }
    }

    btn.addEventListener('click', function(){
      document.querySelectorAll('.tab').forEach(function(b){ b.classList.remove('active'); });
      document.querySelectorAll('.view').forEach(function(v){ v.classList.remove('active'); });
      btn.classList.add('active'); view.classList.add('active');
      var fab = document.getElementById('fabAdd'); if(fab) fab.style.display = 'none';
      window.scrollTo(0,0);
    });
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

/* avisos.js — Botón «Avisos» de la portada: activa las notificaciones del Centro de Entrenamiento.
   Los avisos los manda Supabase (función agenda-avisos):
   - Viernes 17:00 y 21:30: convocatoria del Juvenil, del Cadete y cadetes que suben con el Juvenil.
   - Jueves 19:00: partidos del fin de semana con día y hora.
   Para apuntar el móvil hace falta el código de edición (el mismo de siempre). */
(function () {
  'use strict';
  var SB = 'https://bzjzedwbahgitunoksps.supabase.co', KEY = 'sb_publishable_GwXGrJorusdd94VeHBH4Lg_C657Knj5';
  var VAPID = 'BFAca9d8b3HvZyWwM7kfq1yLbGTVAV5Gw3O8giHDvVRE8X4LePR9bLKK095mwSwaLbygZDu-2jqP5PW3Fm5XF_E';
  var soporta = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  var esIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  var instalada = window.navigator.standalone || (window.matchMedia && matchMedia('(display-mode: standalone)').matches);
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(function () {});

  function codigo() { try { return localStorage.getItem('urtzi_edit_key') || ''; } catch (e) { return ''; } }
  function api(path, opt) {
    opt = opt || {};
    var h = { apikey: KEY, 'Content-Type': 'application/json', 'x-edit-key': codigo() };
    if (opt.prefer) h.Prefer = opt.prefer;
    return fetch(SB + '/rest/v1/' + path, { method: opt.method || 'GET', headers: h, body: opt.body ? JSON.stringify(opt.body) : undefined })
      .then(function (r) { if (!r.ok) return r.text().then(function (t) { throw new Error(t || r.status); }); return r; });
  }
  function b64(s) { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; var r = atob(s), a = new Uint8Array(r.length); for (var i = 0; i < r.length; i++) a[i] = r.charCodeAt(i); return a; }
  function suscripcion() { return navigator.serviceWorker.ready.then(function (r) { return r.pushManager.getSubscription(); }); }

  var css = document.createElement('style');
  css.textContent =
    '.av-btn{display:flex;align-items:center;gap:8px;margin:18px auto 0;padding:10px 16px;border-radius:999px;border:1px solid #D4E8DA;background:#fff;color:#14151a;box-shadow:0 2px 8px rgba(0,0,0,.05);font:inherit;font-size:14px;cursor:pointer}' +
    '.av-btn i{width:8px;height:8px;border-radius:50%;background:#8B8D93}.av-btn.on i{background:#1FA85C;box-shadow:0 0 0 3px rgba(31,168,92,.25)}' +
    '.av-ov{position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.55);display:flex;align-items:flex-end;justify-content:center}' +
    '.av-hoja{width:100%;max-width:520px;background:#fff;color:#14151a;border-radius:24px 24px 0 0;padding:22px 20px calc(env(safe-area-inset-bottom,0px) + 22px);font-family:inherit;text-align:left}' +
    '.av-hoja h3{margin:0 0 6px;font-size:20px}.av-hoja p{margin:6px 0;color:#5b5e66;font-size:14px;line-height:1.45}' +
    '.av-hoja ul{margin:10px 0 4px;padding-left:18px;color:#2b2d33;font-size:14px;line-height:1.6}' +
    '.av-hoja input{width:100%;margin-top:10px;padding:12px 14px;border-radius:12px;border:1px solid #D8D9DC;background:#F6F7F8;color:#14151a;font-size:16px}' +
    '.av-b{display:block;width:100%;margin-top:12px;padding:14px;border:0;border-radius:14px;font:inherit;font-size:16px;font-weight:700;cursor:pointer;background:#E31E24;color:#fff}' +
    '.av-b.sec{background:#EEF0F2;color:#14151a;font-weight:600}.av-b:disabled{opacity:.45}' +
    '.av-msg{min-height:20px;margin-top:10px;font-size:14px;color:#1FA85C}';
  document.head.appendChild(css);

  var btn = document.createElement('button');
  btn.className = 'av-btn'; btn.type = 'button';
  btn.innerHTML = '<i></i><span>Avisos</span>';
  var ancla = document.querySelector('.home .menu-grid');
  if (ancla && ancla.parentNode) ancla.parentNode.insertBefore(btn, ancla.nextSibling); else document.body.appendChild(btn);

  function pintaBoton() {
    if (!soporta) return;
    suscripcion().then(function (s) { btn.classList.toggle('on', !!s && Notification.permission === 'granted'); btn.querySelector('span').textContent = s ? 'Avisos activados' : 'Activar avisos'; }).catch(function () {});
  }
  pintaBoton();

  btn.onclick = function () {
    var ov = document.createElement('div'); ov.className = 'av-ov';
    ov.innerHTML = '<div class="av-hoja"><h3>Avisos del Centro de Entrenamiento</h3>' +
      '<p>Te llegan como notificación de esta app:</p><ul><li>Viernes 17:00 y 21:30: convocatoria del Juvenil, del Cadete y cadetes que suben con el Juvenil</li><li>Jueves 19:00: partidos del fin de semana con día y hora</li></ul>' +
      '<div id="avZona"></div><div class="av-msg" id="avMsg"></div><button class="av-b sec" id="avCerrar">Cerrar</button></div>';
    document.body.appendChild(ov);
    var q = function (s) { return ov.querySelector(s); };
    q('#avCerrar').onclick = function () { ov.remove(); };
    ov.addEventListener('click', function (e) { if (e.target === ov) ov.remove(); });
    function msg(t, mal) { q('#avMsg').style.color = mal ? '#E31E24' : '#1FA85C'; q('#avMsg').textContent = t; }

    if (!soporta) {
      q('#avZona').innerHTML = esIOS && !instalada
        ? '<p><b>Primero instálala:</b> en Safari toca Compartir y «Añadir a pantalla de inicio». Luego ábrela desde ese icono y vuelve aquí.</p>'
        : '<p>Este navegador no admite avisos.</p>';
      return;
    }
    suscripcion().then(function (s) {
      var z = q('#avZona');
      if (Notification.permission === 'denied') { z.innerHTML = '<p>Los avisos están bloqueados. Actívalos en Ajustes del iPhone › Notificaciones › Entrenamiento.</p>'; return; }
      z.innerHTML = (codigo() ? '' : '<input id="avCod" type="password" placeholder="Código de edición" autocomplete="off">') +
        (s ? '<button class="av-b" id="avProbar">Mandarme un aviso de prueba</button><button class="av-b sec" id="avQuitar">Desactivar en este móvil</button>'
           : '<button class="av-b" id="avActivar">Activar avisos</button>');
      var cod = q('#avCod');
      function guardaCodigo() { if (cod && cod.value.trim()) try { localStorage.setItem('urtzi_edit_key', cod.value.trim()); } catch (e) {} return !!codigo(); }
      if (q('#avActivar')) q('#avActivar').onclick = function () {
        if (!guardaCodigo()) { msg('Pon el código de edición.', true); return; }
        this.disabled = true; msg('Activando…');
        Notification.requestPermission().then(function (p) {
          if (p !== 'granted') throw new Error('permiso');
          return navigator.serviceWorker.ready;
        }).then(function (reg) {
          return reg.pushManager.getSubscription().then(function (x) { return x || reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(VAPID) }); });
        }).then(function (sub) {
          var j = sub.toJSON();
          return api('ent_push?on_conflict=endpoint', { method: 'POST', prefer: 'resolution=merge-duplicates,return=minimal', body: [{ endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth }] });
        }).then(function () { msg('Avisos activados.'); pintaBoton(); setTimeout(function () { ov.remove(); btn.click(); }, 900); })
          .catch(function (e) { msg(e.message === 'permiso' ? 'Sin permiso para avisar.' : 'No se pudo activar. ¿El código de edición es correcto?', true); });
      };
      if (q('#avProbar')) q('#avProbar').onclick = function () {
        guardaCodigo(); this.disabled = true;
        api('rpc/ent_prueba', { method: 'POST', body: {} })
          .then(function () { msg('Te llega en menos de un minuto. Puedes cerrar la app.'); })
          .catch(function () { msg('No se pudo programar la prueba. Revisa el código de edición.', true); });
      };
      if (q('#avQuitar')) q('#avQuitar').onclick = function () {
        var ep = s.endpoint;
        s.unsubscribe().then(function () { return api('ent_push?endpoint=eq.' + encodeURIComponent(ep), { method: 'DELETE' }).catch(function () {}); })
          .then(function () { msg('Avisos desactivados.'); pintaBoton(); });
      };
    });
  };
})();

/* dictado-voz.js — Dictado por voz en todos los <textarea> (notas).
   Uso: <script src="dictado-voz.js" defer></script>
   - Excluir un campo: <textarea data-sin-voz>
   - Idioma: es-ES. Funciona en Chrome/Android; en iPhone usa el micrófono del teclado. */
(function(){
  'use strict';
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SR) return; // sin soporte: no se muestra nada

  var css = document.createElement('style');
  css.textContent =
    '.dv-wrap{position:relative;display:block}' +
    '.dv-btn{position:absolute;right:8px;bottom:8px;width:38px;height:38px;border-radius:50%;border:none;' +
    'background:#B3122B;color:#fff;font-size:18px;line-height:1;cursor:pointer;box-shadow:0 2px 8px rgba(179,18,43,.35);' +
    'display:flex;align-items:center;justify-content:center;z-index:2}' +
    '.dv-btn.on{background:#1B7A3E;animation:dvp 1.1s infinite}' +
    '@keyframes dvp{0%{box-shadow:0 0 0 0 rgba(27,122,62,.5)}100%{box-shadow:0 0 0 12px rgba(27,122,62,0)}}' +
    '.dv-msg{font-size:12px;color:#B3122B;margin-top:4px}';
  document.head.appendChild(css);

  var activo = null; // {rec, ta, btn, quiere}

  function insertar(ta, texto){
    var s = ta.selectionStart, e = ta.selectionEnd, v = ta.value;
    if(typeof s !== 'number'){ s = e = v.length; }
    var antes = v.slice(0, s), despues = v.slice(e);
    var pre = (antes && !/\s$/.test(antes)) ? ' ' : '';
    var ins = pre + texto;
    ta.value = antes + ins + despues;
    var pos = (antes + ins).length;
    ta.setSelectionRange(pos, pos);
    ta.dispatchEvent(new Event('input', {bubbles:true}));
    ta.dispatchEvent(new Event('change', {bubbles:true}));
  }

  function mensaje(wrap, txt){
    var m = wrap.querySelector('.dv-msg');
    if(!m){ m = document.createElement('div'); m.className = 'dv-msg'; wrap.appendChild(m); }
    m.textContent = txt;
    if(txt) setTimeout(function(){ if(m.textContent === txt) m.textContent = ''; }, 5000);
  }

  function parar(){
    if(!activo) return;
    activo.quiere = false;
    try{ activo.rec.stop(); }catch(_){}
    activo.btn.classList.remove('on');
    activo.btn.textContent = '🎤';
    activo = null;
  }

  function empezar(ta, btn, wrap){
    if(activo) parar();
    var rec = new SR();
    rec.lang = 'es-ES';
    rec.continuous = true;
    rec.interimResults = false;
    var est = {rec:rec, ta:ta, btn:btn, quiere:true};
    activo = est;

    rec.onresult = function(ev){
      for(var i = ev.resultIndex; i < ev.results.length; i++){
        if(ev.results[i].isFinal){
          var t = ev.results[i][0].transcript.trim();
          if(t) insertar(ta, t);
        }
      }
    };
    rec.onerror = function(ev){
      if(ev.error === 'not-allowed' || ev.error === 'service-not-allowed'){
        est.quiere = false;
        mensaje(wrap, 'Permiso de micrófono denegado. Actívalo en los ajustes del navegador.');
      } else if(ev.error === 'no-speech' || ev.error === 'aborted'){
        /* se reinicia en onend */
      } else {
        mensaje(wrap, 'Error de dictado: ' + ev.error);
      }
    };
    rec.onend = function(){
      if(est.quiere && activo === est){
        try{ rec.start(); return; }catch(_){}
      }
      btn.classList.remove('on');
      btn.textContent = '🎤';
      if(activo === est) activo = null;
    };
    try{
      rec.start();
      btn.classList.add('on');
      btn.textContent = '⏹';
    }catch(_){
      activo = null;
      mensaje(wrap, 'No se pudo iniciar el dictado.');
    }
  }

  function preparar(ta){
    if(ta.dataset.dvListo || ta.hasAttribute('data-sin-voz') || ta.disabled || ta.readOnly) return;
    ta.dataset.dvListo = '1';
    var wrap = document.createElement('div');
    wrap.className = 'dv-wrap';
    ta.parentNode.insertBefore(wrap, ta);
    wrap.appendChild(ta);
    ta.style.paddingRight = '52px';
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'dv-btn';
    btn.title = 'Dictar por voz';
    btn.setAttribute('aria-label', 'Dictar por voz');
    btn.textContent = '🎤';
    btn.addEventListener('mousedown', function(e){ e.preventDefault(); });
    btn.addEventListener('click', function(){
      if(activo && activo.btn === btn){ parar(); }
      else { empezar(ta, btn, wrap); }
    });
    wrap.appendChild(btn);
  }

  function escanear(raiz){
    if(!raiz || !raiz.querySelectorAll) return;
    if(raiz.tagName === 'TEXTAREA') preparar(raiz);
    var l = raiz.querySelectorAll('textarea');
    for(var i = 0; i < l.length; i++) preparar(l[i]);
  }

  function iniciar(){
    escanear(document);
    new MutationObserver(function(muts){
      muts.forEach(function(m){
        m.addedNodes.forEach(function(n){ if(n.nodeType === 1) escanear(n); });
      });
    }).observe(document.body, {childList:true, subtree:true});
  }

  if(document.body) iniciar();
  else document.addEventListener('DOMContentLoaded', iniciar);
})();

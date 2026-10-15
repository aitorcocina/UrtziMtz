/* Avatares UM: 22 caras estilo animación con la equipación del Gorliz K.E.
   A cada jugador sin foto se le asigna una, siempre la misma.
   Dentro de un mismo equipo se reparten en orden para que no se repitan
   (hasta 22 jugadores). Cadete empieza en otra posición que Juvenil. */
(function(){
  const TOTAL = 22;
  const VERSION = '20261015';

  function hash(str){
    let h = 2166136261;
    for (let i = 0; i < str.length; i++){ h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  function teamOffset(){
    return /cadete/i.test(location.pathname) ? 11 : 0;
  }

  // p = jugador; list = plantilla completa (opcional)
  function avatarIndex(p, list){
    const key = String(p && (p.id || p.name) || 'x');
    if (Array.isArray(list) && list.length){
      const ids = list.map(x => String(x.id || x.name)).sort();
      const pos = ids.indexOf(key);
      if (pos >= 0) return (pos + teamOffset()) % TOTAL + 1;
    }
    return hash(key) % TOTAL + 1;
  }

  function avatarHTML(p, list){
    const n = String(avatarIndex(p, list)).padStart(2, '0');
    return `<img class="um-avatar" src="avatares/${n}.webp?v=${VERSION}" alt="" loading="lazy" decoding="async">`;
  }

  window.avatarHTML = avatarHTML;
})();

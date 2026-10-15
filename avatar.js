/* Avatares UM: cabeza dibujada con la 1ª equipación del Gorliz K.E.
   (cuerpo rojo, banda blanca en diagonal, mangas y cuello verdes, escudo).
   Cada jugador tiene siempre la misma cara: se genera a partir de su id. */
(function(){
  function hash(str){
    let h = 2166136261;
    for (let i = 0; i < str.length; i++){ h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function rng(seed){
    let s = seed || 1;
    return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 10000) / 10000; };
  }
  const pick = (r, arr) => arr[Math.floor(r() * arr.length)];

  const SKIN = [
    ['#f6d3b8','#e9b897'], ['#f1c39f','#dfa57e'], ['#e3a97f','#cf8f63'],
    ['#c98d62','#b0764d'], ['#a8714a','#8f5c39'], ['#7e5233','#684227']
  ];
  const HAIR = ['#1c1410','#2e1f16','#4a2f1d','#6b4428','#8c5a32','#c08a4e','#d9b56e','#2a2a2a'];
  const BG   = ['#fbe9ec','#eaf4ec','#eef1f6','#fff4e2','#f3ecf8'];

  function hairSVG(style, c){
    switch(style){
      case 'corto': return `<path d="M30 44 Q30 22 50 21 Q70 22 70 44 Q66 33 50 32 Q34 33 30 44Z" fill="${c}"/>`;
      case 'rizado': {
        let s = '';
        [[33,36,7],[39,28,7],[48,24,8],[58,26,7],[66,33,7],[69,42,5],[31,44,5],[44,31,6],[55,31,6]]
          .forEach(([x,y,r]) => s += `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/>`);
        return s;
      }
      case 'rapado': return `<path d="M31 42 Q31 23 50 22 Q69 23 69 42 Q65 31 50 30 Q35 31 31 42Z" fill="${c}" opacity=".55"/>`;
      case 'tupe':   return `<path d="M30 44 Q29 26 44 20 Q52 14 62 19 Q71 25 70 44 Q67 32 56 30 Q60 24 50 25 Q36 28 30 44Z" fill="${c}"/>`;
      case 'flequillo': return `<path d="M29 46 Q28 22 50 20 Q72 22 71 46 Q68 36 64 33 Q56 38 46 34 Q38 38 33 35 Q30 40 29 46Z" fill="${c}"/>`;
      case 'raya':   return `<path d="M30 45 Q29 22 50 21 Q71 22 70 45 Q68 32 60 30 L44 26 Q35 30 30 45Z" fill="${c}"/><path d="M44 26 L45 22" stroke="#00000033" stroke-width="1"/>`;
      case 'largo':  return `<path d="M27 56 Q24 22 50 20 Q76 22 73 56 Q70 50 69 40 Q63 31 50 31 Q37 31 31 40 Q30 50 27 56Z" fill="${c}"/>`;
      default: return '';
    }
  }

  function avatarSVG(seedStr){
    const r = rng(hash(String(seedStr || 'x')));
    const [skin, skinShade] = pick(r, SKIN);
    const hairC = pick(r, HAIR);
    const style = pick(r, ['corto','rizado','rapado','tupe','flequillo','raya','largo','corto','rizado']);
    const bg = pick(r, BG);
    const brow = r() < .5 ? 2.2 : 1.6;
    const smile = pick(r, ['M44 58 Q50 63 56 58','M45 58 Q50 61 55 58','M44 58 Q50 64 56 58 Z']);
    const freckles = r() < .22;
    const beard = r() < .15;
    const eyeY = 46 + Math.floor(r() * 2);
    const uid = 'av' + hash(String(seedStr)).toString(36);

    return `<svg class="um-avatar" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs><clipPath id="${uid}"><circle cx="50" cy="50" r="50"/></clipPath></defs>
  <g clip-path="url(#${uid})">
    <rect width="100" height="100" fill="${bg}"/>
    <!-- camiseta -->
    <path d="M8 100 Q10 80 26 75 L40 70 L60 70 L74 75 Q90 80 92 100Z" fill="#c8102e"/>
    <path d="M8 100 Q9 84 20 78 L24 100Z" fill="#14853c"/>
    <path d="M92 100 Q91 84 80 78 L76 100Z" fill="#14853c"/>
    <path d="M34 72 L44 70 L76 100 L60 100Z" fill="#ffffff"/>
    <path d="M40 70 L50 82 L60 70 L56 69 L50 76 L44 69Z" fill="#14853c"/>
    <path d="M64 81 h8 v6 q-4 4 -8 0z" fill="#ffffff" stroke="#14853c" stroke-width="1"/>
    <!-- cuello y cara -->
    <path d="M43 60 L57 60 L57 72 Q50 76 43 72Z" fill="${skinShade}"/>
    <ellipse cx="30" cy="48" rx="4" ry="6" fill="${skinShade}"/>
    <ellipse cx="70" cy="48" rx="4" ry="6" fill="${skinShade}"/>
    <ellipse cx="50" cy="46" rx="20" ry="23" fill="${skin}"/>
    ${beard ? `<path d="M31 50 Q33 70 50 70 Q67 70 69 50 Q66 64 50 65 Q34 64 31 50Z" fill="${hairC}" opacity=".35"/>` : ''}
    ${hairSVG(style, hairC)}
    <!-- cejas, ojos, nariz, boca -->
    <path d="M39 ${eyeY-6} Q43 ${eyeY-9} 47 ${eyeY-6}" stroke="${hairC}" stroke-width="${brow}" fill="none" stroke-linecap="round"/>
    <path d="M53 ${eyeY-6} Q57 ${eyeY-9} 61 ${eyeY-6}" stroke="${hairC}" stroke-width="${brow}" fill="none" stroke-linecap="round"/>
    <ellipse cx="43" cy="${eyeY}" rx="2.6" ry="3" fill="#2b1d16"/>
    <ellipse cx="57" cy="${eyeY}" rx="2.6" ry="3" fill="#2b1d16"/>
    <circle cx="44" cy="${eyeY-1}" r=".9" fill="#fff"/>
    <circle cx="58" cy="${eyeY-1}" r=".9" fill="#fff"/>
    <path d="M50 49 Q48 54 51 54" stroke="${skinShade}" stroke-width="1.6" fill="none" stroke-linecap="round"/>
    <path d="${smile}" stroke="#8a3a2c" stroke-width="1.8" fill="${smile.endsWith('Z') ? '#fff' : 'none'}" stroke-linecap="round"/>
    ${freckles ? `<g fill="${skinShade}"><circle cx="39" cy="53" r=".9"/><circle cx="42" cy="55" r=".9"/><circle cx="58" cy="55" r=".9"/><circle cx="61" cy="53" r=".9"/></g>` : ''}
  </g>
</svg>`;
  }

  window.avatarSVG = avatarSVG;
})();

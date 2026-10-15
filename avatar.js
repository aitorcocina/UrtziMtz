/* Avatares UM estilo dibujo animado 3D con la 1ª equipación del Gorliz K.E.
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

  // [luz, base, sombra]
  const SKIN = [
    ['#ffe3cc','#f5c9a6','#d9a07a'], ['#fbd6b5','#eeb991','#cf9067'],
    ['#f2c49c','#e0a676','#bf7f52'], ['#dfa77a','#c88b5c','#a26a40'],
    ['#c08a5f','#a87047','#83522f'], ['#9a6a45','#7f5233','#5f3a21']
  ];
  // [luz, base, sombra]
  const HAIR = [
    ['#5a3a26','#3a2416','#1f130b'], ['#4a3427','#2c1d14','#150d08'],
    ['#7a4f2c','#5b381d','#38210f'], ['#9b6a3c','#7a4f2a','#4f3218'],
    ['#d8b06a','#b88d48','#8a6630'], ['#3b3b3b','#1d1d1d','#0a0a0a'],
    ['#a4532d','#83401f','#5a2a12']
  ];
  const IRIS = ['#5b3a1f','#6b4423','#3f2a17','#7a5a2a','#5b3a1f','#4c6b3a','#3d6a8f'];
  const BG   = [['#fdeef0','#f7d3d9'],['#eef7f0','#cfe8d6'],['#eef2f8','#d3dceb'],['#fff6e6','#f6dfb6']];

  function hair(style, c, uid){
    const [hi, base, sh] = c;
    const g = `url(#h${uid})`;
    const shine = (d) => `<path d="${d}" stroke="${hi}" stroke-width="1.6" fill="none" stroke-linecap="round" opacity=".7"/>`;
    switch(style){
      case 'rizos': { // rizado voluminoso, como el de la web
        const pts = [[30,36,7],[34,28,8],[42,22,9],[52,19,9],[62,22,8],[68,29,7],[71,37,5],[29,43,4],[47,26,7],[57,25,7],[38,29,6]];
        let s = `<path d="M27 50 Q26 26 50 20 Q74 26 73 50 Q70 38 50 36 Q30 38 27 50Z" fill="${sh}"/>`;
        pts.forEach(([x,y,r]) => s += `<circle cx="${x}" cy="${y}" r="${r}" fill="${g}"/>`);
        [[40,22],[51,19],[61,22],[33,30],[67,30]].forEach(([x,y]) => s += shine(`M${x-3} ${y+1} q3 -3 6 0`));
        s += `<path d="M36 33 q4 -5 9 -3 q3 -4 9 -2 q4 -3 9 1" stroke="${sh}" stroke-width="2" fill="none" stroke-linecap="round"/>`;
        return s;
      }
      case 'tupe':
        return `<path d="M28 50 Q25 28 40 21 Q50 13 63 18 Q75 25 72 50 Q70 37 63 33 Q60 26 50 28 Q38 30 33 38 Q30 43 28 50Z" fill="${g}"/>
          <path d="M40 21 Q52 10 65 19 Q56 16 47 22Z" fill="${hi}" opacity=".5"/>
          ${shine('M44 22 q8 -6 16 -2')}`;
      case 'corto':
        return `<path d="M28 48 Q27 24 50 20 Q73 24 72 48 Q70 36 62 32 Q50 35 40 31 Q31 36 28 48Z" fill="${g}"/>
          ${shine('M40 24 q8 -4 18 -1')}<path d="M40 31 q6 2 10 -1 q6 3 12 1" stroke="${sh}" stroke-width="1.4" fill="none"/>`;
      case 'flequillo':
        return `<path d="M27 50 Q25 23 50 19 Q75 23 73 50 Q71 40 67 36 Q64 41 58 37 Q53 42 47 37 Q41 42 36 37 Q31 41 27 50Z" fill="${g}"/>
          ${shine('M38 24 q10 -5 22 -1')}${shine('M45 30 q5 -2 10 0')}`;
      case 'rapado':
        return `<path d="M29 46 Q28 23 50 21 Q72 23 71 46 Q68 33 50 31 Q32 33 29 46Z" fill="${base}" opacity=".7"/>
          <path d="M36 27 q14 -6 28 0" stroke="${hi}" stroke-width="1.2" fill="none" opacity=".5"/>`;
      case 'ondas':
        return `<path d="M26 54 Q22 24 50 18 Q78 24 74 54 Q72 44 70 38 Q66 31 58 31 Q52 35 46 31 Q36 31 31 39 Q28 46 26 54Z" fill="${g}"/>
          <path d="M30 40 q-4 8 -2 16 M70 40 q4 8 2 16" stroke="${sh}" stroke-width="2" fill="none"/>
          ${shine('M36 25 q6 -4 12 0 q6 -4 12 0')}`;
      default: return '';
    }
  }

  function avatarSVG(seedStr){
    const seed = hash(String(seedStr || 'x'));
    const r = rng(seed);
    const uid = seed.toString(36);
    const [sHi, sBase, sSh] = pick(r, SKIN);
    const hc = pick(r, HAIR);
    const iris = pick(r, IRIS);
    const [bg1, bg2] = pick(r, BG);
    const style = pick(r, ['rizos','rizos','tupe','corto','flequillo','rapado','ondas','corto']);
    const browUp = r() < .5;          // ceja levantada (gesto pícaro)
    const smirkSide = r() < .5 ? 1 : -1;
    const freckles = r() < .2;
    const fuzz = r() < .12;           // sombra de barba suave
    const jaw = 22 + Math.floor(r() * 3);
    const brow = (x1, x2, up) => {
      const y = up ? 32 : 34, m = (x1+x2)/2;
      return `<path d="M${x1} ${y+1.6} Q${m} ${y-3.2} ${x2} ${y+1.2} Q${m} ${y-0.8} ${x1} ${y+1.6}Z" fill="${hc[2]}" stroke="${hc[2]}" stroke-width=".6" stroke-linejoin="round"/>`;
    };
    const eye = (cx) => `
      <ellipse cx="${cx}" cy="45.5" rx="5.6" ry="6.4" fill="#fff"/>
      <circle cx="${cx+0.5}" cy="46.3" r="4.3" fill="${iris}"/>
      <circle cx="${cx+0.5}" cy="46.3" r="4.3" fill="url(#ir${uid})"/>
      <circle cx="${cx+0.5}" cy="46.5" r="2.1" fill="#120a06"/>
      <circle cx="${cx+2}" cy="44.4" r="1.4" fill="#fff"/>
      <circle cx="${cx-1}" cy="48.2" r=".6" fill="#fff" opacity=".85"/>
      <path d="M${cx-5.6} 45.5 A5.6 6.4 0 0 1 ${cx+5.6} 45.5" stroke="#2a1a10" stroke-width="1.3" fill="none" stroke-linecap="round"/><path d="M${cx+4.6} 41.6 l1.6 -1.2" stroke="#2a1a10" stroke-width="1" stroke-linecap="round"/>
      <path d="M${cx-4} 51.4 Q${cx} 53 ${cx+4} 51.4" stroke="${sSh}" stroke-width=".8" fill="none" opacity=".6"/>`;
    const sm = smirkSide;
    const mouth = `<path d="M${50-6*sm} 59.5 Q50 ${62.5} ${50+6.5*sm} ${57.6}" stroke="#7b3524" stroke-width="1.7" fill="none" stroke-linecap="round"/>
      <path d="M${50+6.5*sm} 57.6 q${1.2*sm} -.6 ${1.6*sm} -1.6" stroke="#7b3524" stroke-width="1.2" fill="none" stroke-linecap="round"/>
      <path d="M46 61.6 Q50 63.4 54 61.6" stroke="${sSh}" stroke-width="1" fill="none" opacity=".6"/>`;

    return `<svg class="um-avatar" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <clipPath id="c${uid}"><circle cx="50" cy="50" r="50"/></clipPath>
    <radialGradient id="bg${uid}" cx=".5" cy=".35" r=".75"><stop offset="0" stop-color="${bg1}"/><stop offset="1" stop-color="${bg2}"/></radialGradient>
    <radialGradient id="sk${uid}" cx=".42" cy=".38" r=".7"><stop offset="0" stop-color="${sHi}"/><stop offset=".65" stop-color="${sBase}"/><stop offset="1" stop-color="${sSh}"/></radialGradient>
    <linearGradient id="h${uid}" x1="0" y1="0" x2=".3" y2="1"><stop offset="0" stop-color="${hc[0]}"/><stop offset=".55" stop-color="${hc[1]}"/><stop offset="1" stop-color="${hc[2]}"/></linearGradient>
    <radialGradient id="ir${uid}" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset="1" stop-color="#000" stop-opacity=".35"/></radialGradient>
    <linearGradient id="sh${uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e2233f"/><stop offset="1" stop-color="#a50e25"/></linearGradient>
    <linearGradient id="gr${uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1f9e4c"/><stop offset="1" stop-color="#0f6b30"/></linearGradient>
  </defs>
  <g clip-path="url(#c${uid})">
    <rect width="100" height="100" fill="url(#bg${uid})"/>
    <!-- camiseta -->
    <path d="M6 100 Q8 82 22 77 L40 71 L60 71 L78 77 Q92 82 94 100Z" fill="url(#sh${uid})"/>
    <path d="M6 100 Q7 85 19 79 L23 100Z" fill="url(#gr${uid})"/>
    <path d="M94 100 Q93 85 81 79 L77 100Z" fill="url(#gr${uid})"/>
    <path d="M30 74 L41 71 L80 100 L62 100Z" fill="#fff"/>
    <path d="M30 74 L41 71 L80 100 L62 100Z" fill="#000" opacity=".06" transform="translate(0 2)"/>
    <path d="M40 71 L50 84 L60 71 L56.5 70 L50 78 L43.5 70Z" fill="url(#gr${uid})"/>
    <path d="M65 82 h9 v6.5 q-4.5 4.5 -9 0z" fill="#fff" stroke="#1f9e4c" stroke-width="1.1"/>
    <path d="M67.5 84.5 h4 v3 q-2 2 -4 0z" fill="#c8102e"/>
    <text x="28" y="86" font-family="Arial Black,Arial,sans-serif" font-size="6" font-weight="900" fill="#fff" opacity=".9">K</text>
    <!-- cuello -->
    <path d="M42 58 L58 58 L58.5 72 Q50 77 41.5 72Z" fill="${sSh}"/>
    <!-- orejas -->
    <ellipse cx="29" cy="48" rx="4.5" ry="6.5" fill="${sBase}"/><path d="M28 45 q2 3 0 6" stroke="${sSh}" stroke-width="1.2" fill="none"/>
    <ellipse cx="71" cy="48" rx="4.5" ry="6.5" fill="${sBase}"/><path d="M72 45 q-2 3 0 6" stroke="${sSh}" stroke-width="1.2" fill="none"/>
    <!-- cara -->
    <path d="M30 42 Q30 22 50 22 Q70 22 70 42 Q70 ${50+jaw/3} 62 ${60+jaw/6} Q56 ${66} 50 ${66} Q44 66 38 ${60+jaw/6} Q30 ${50+jaw/3} 30 42Z" fill="url(#sk${uid})"/>
    <ellipse cx="38" cy="54" rx="4" ry="2.5" fill="#e8806a" opacity=".22"/>
    <ellipse cx="62" cy="54" rx="4" ry="2.5" fill="#e8806a" opacity=".22"/>
    ${fuzz ? `<path d="M33 52 Q36 66 50 67 Q64 66 67 52 Q63 62 50 63 Q37 62 33 52Z" fill="${hc[2]}" opacity=".18"/>` : ''}
    ${hair(style, hc, uid)}
    <!-- cejas y ojos -->
    ${brow(47, 37, sm < 0 && browUp)}
    ${brow(53, 63, sm > 0 && browUp)}
    ${eye(42)}${eye(58)}
    <!-- nariz -->
    <path d="M50 47 Q48 53 46.5 55 Q48.5 57.5 51 56.6" stroke="${sSh}" stroke-width="1.3" fill="none" stroke-linecap="round" opacity=".8"/>
    <ellipse cx="51" cy="53" rx="1.6" ry="2.4" fill="#fff" opacity=".18"/>
    ${mouth}
    ${freckles ? `<g fill="${sSh}" opacity=".7"><circle cx="37" cy="52" r=".7"/><circle cx="40" cy="54" r=".7"/><circle cx="38.5" cy="55.6" r=".6"/><circle cx="60" cy="54" r=".7"/><circle cx="63" cy="52" r=".7"/><circle cx="61.5" cy="55.6" r=".6"/></g>` : ''}
  </g>
</svg>`;
  }

  window.avatarSVG = avatarSVG;
})();

/* Informe de estadísticas en PDF (Juvenil y Cadete).
   La página llama a InformePDF.generar({...}) con los jugadores ya calculados.
   jsPDF y autotable se cargan solo al pulsar el botón. */
(function(){
  const LIBS = [
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js'
  ];
  const ROJO = [227,30,36], NEGRO = [14,15,17], GRIS = [110,114,120], GRIS_CLARO = [244,245,247];

  function cargarScript(src){
    return new Promise((ok, ko)=>{
      if(document.querySelector(`script[src="${src}"]`)) return ok();
      const s = document.createElement('script');
      s.src = src; s.onload = ok; s.onerror = ()=>ko(new Error('No se pudo cargar '+src));
      document.head.appendChild(s);
    });
  }
  async function cargarLibs(){
    if(window.jspdf && window.jspdf.jsPDF && window.jspdf.jsPDF.API.autoTable) return;
    for(const src of LIBS) await cargarScript(src);
  }
  async function imagenDataURL(url){
    try{
      const r = await fetch(url); if(!r.ok) return null;
      const b = await r.blob();
      return await new Promise(res=>{ const fr = new FileReader(); fr.onload = ()=>res(fr.result); fr.onerror = ()=>res(null); fr.readAsDataURL(b); });
    }catch(e){ return null; }
  }

  const fechaLarga = d => d.toLocaleDateString('es-ES', {day:'numeric', month:'long', year:'numeric'});
  const slug = t => String(t||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');

  /* jugadores: [{dorsal, nombre, conv, pj, tit, sup, min, goles, amarillas, rojas, lesionado, sancionado}] */
  function construir(jsPDF, opts, logo){
    const { equipo, nombreEquipo, categoria, jugadores } = opts;
    const hoy = opts.fecha || new Date();
    const doc = new jsPDF({orientation:'landscape', unit:'mm', format:'a4'});
    const W = doc.internal.pageSize.getWidth(), M = 12;

    // Cabecera
    doc.setFillColor(...NEGRO); doc.rect(0, 0, W, 30, 'F');
    doc.setFillColor(...ROJO); doc.rect(0, 30, W, 1.6, 'F');
    let x = M;
    if(logo){ try{ doc.addImage(logo, 'PNG', M, 5, 20, 20); x = M + 25; }catch(e){} }
    doc.setTextColor(255,255,255);
    doc.setFont('helvetica','bold'); doc.setFontSize(18);
    doc.text('Estadísticas de la plantilla', x, 14);
    doc.setFont('helvetica','normal'); doc.setFontSize(10.5);
    const sub = [nombreEquipo, categoria].filter(Boolean).join(' · ');
    doc.text(sub || equipo, x, 21);
    doc.setFont('helvetica','bold'); doc.setFontSize(9);
    const badgeW = doc.getTextWidth(equipo) + 8;
    doc.setFillColor(...ROJO); doc.roundedRect(W - M - badgeW, 8, badgeW, 7, 1.5, 1.5, 'F');
    doc.text(equipo, W - M - badgeW/2, 12.8, {align:'center'});
    doc.setFont('helvetica','normal'); doc.setFontSize(8.5); doc.setTextColor(200,200,205);
    doc.text('Actualizado a ' + fechaLarga(hoy), W - M, 22, {align:'right'});

    // Resumen
    const suma = k => jugadores.reduce((a,j)=>a+(j[k]||0), 0);
    const mejor = k => { const t = jugadores.filter(j=>(j[k]||0)>0).sort((a,b)=>b[k]-a[k]); return t.length ? t[0] : null; };
    const pichichi = mejor('goles'), masMin = mejor('min');
    const cajas = [
      ['Jugadores', String(jugadores.length), ''],
      ['Goles', String(suma('goles')), ''],
      ['Máximo goleador', pichichi ? String(pichichi.goles) : '—', pichichi ? pichichi.corto : ''],
      ['Más minutos', masMin ? String(masMin.min) : '—', masMin ? masMin.corto : ''],
      ['Tarjetas', `${suma('amarillas')} / ${suma('rojas')}`, 'amarillas / rojas']
    ];
    const gap = 4, bw = (W - 2*M - gap*(cajas.length-1)) / cajas.length, by = 37, bh = 19;
    cajas.forEach((c,i)=>{
      const bx = M + i*(bw+gap);
      doc.setFillColor(...GRIS_CLARO); doc.roundedRect(bx, by, bw, bh, 2, 2, 'F');
      doc.setFillColor(...ROJO); doc.rect(bx, by+3, 1.2, bh-6, 'F');
      doc.setTextColor(...GRIS); doc.setFont('helvetica','normal'); doc.setFontSize(7.5);
      doc.text(c[0].toUpperCase(), bx+5, by+5.5);
      doc.setTextColor(...NEGRO); doc.setFont('helvetica','bold'); doc.setFontSize(15);
      doc.text(c[1], bx+5, by+13);
      if(c[2]){
        const vw = doc.getTextWidth(c[1]);
        doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.setTextColor(...GRIS);
        const maxW = bw - vw - 12;
        let t = c[2]; while(t.length > 3 && doc.getTextWidth(t) > maxW) t = t.slice(0,-2);
        if(t !== c[2]) t = t.replace(/.$/,'…');
        doc.text(t, bx+5+vw+3, by+13);
      }
    });

    // Tabla
    const n = v => (v ? String(v) : '–');
    const cuerpo = jugadores.map(j=>[
      j.dorsal || '', j.nombre, n(j.conv), n(j.pj), n(j.tit), n(j.sup), n(j.min),
      n(j.goles), n(j.amarillas), n(j.rojas), n(j.lesionado), n(j.sancionado)
    ]);
    const pie = [['', 'TOTAL EQUIPO', '', '', '', '', String(suma('min')), String(suma('goles')),
      String(suma('amarillas')), String(suma('rojas')), String(suma('lesionado')), String(suma('sancionado'))]];

    // Ajusta el alto de fila para que toda la plantilla quepa en una hoja
    const H = doc.internal.pageSize.getHeight(), y0 = by + bh + 6;
    const alto = (H - y0 - 14) / (jugadores.length + 2.6);
    const pad = Math.max(0.9, Math.min(2.4, (alto - 3.6) / 2));
    doc.autoTable({
      startY: y0,
      showFoot: 'lastPage',
      margin: {left:M, right:M, bottom:12},
      head: [['Nº','Jugador','Conv.','Jugados','Titular','Suplente','Minutos','Goles','Amarillas','Rojas','Lesionado','Sancionado']],
      body: cuerpo,
      foot: pie,
      theme: 'plain',
      styles: {font:'helvetica', fontSize:9, cellPadding:{top:pad, bottom:pad, left:2, right:2}, textColor:NEGRO, halign:'center', valign:'middle', lineColor:[226,228,232], lineWidth:{bottom:0.2}},
      headStyles: {fillColor:NEGRO, textColor:[255,255,255], fontStyle:'bold', fontSize:8},
      footStyles: {fillColor:[232,234,238], textColor:NEGRO, fontStyle:'bold'},
      alternateRowStyles: {fillColor:[250,250,251]},
      columnStyles: {
        0: {cellWidth:11, fontStyle:'bold', textColor:ROJO},
        1: {halign:'left', cellWidth:'auto', fontStyle:'bold'},
        6: {fontStyle:'bold'},
        7: {fontStyle:'bold'}
      },
      didParseCell: d => {
        if(d.section === 'head' && d.column.index === 1) d.cell.styles.halign = 'left';
        if(d.section === 'foot' && d.column.index === 1) d.cell.styles.halign = 'left';
        if(d.section === 'body' && d.cell.raw === '–') d.cell.styles.textColor = [190,192,196];
        if(d.section === 'body' && d.column.index === 9 && d.cell.raw !== '–') d.cell.styles.textColor = ROJO;
      }
    });

    // Pie de página
    const paginas = doc.internal.getNumberOfPages();
    for(let i=1; i<=paginas; i++){
      doc.setPage(i);
      const H = doc.internal.pageSize.getHeight();
      doc.setFont('helvetica','normal'); doc.setFontSize(7.5); doc.setTextColor(...GRIS);
      doc.text('Minutos, goles y tarjetas sacados de las actas de la Federación. «Sancionado» se apunta a mano.', M, H - 6);
      doc.text(`Página ${i} de ${paginas}`, W - M, H - 6, {align:'right'});
    }
    return doc;
  }

  async function generar(opts){
    await cargarLibs();
    const logo = opts.logo ? await imagenDataURL(opts.logo) : null;
    const doc = construir(window.jspdf.jsPDF, opts, logo);
    const hoy = opts.fecha || new Date();
    const fecha = hoy.toISOString().slice(0,10);
    const nombre = `estadisticas-${slug(opts.equipo)}-${fecha}.pdf`;
    const blob = doc.output('blob');
    const file = new File([blob], nombre, {type:'application/pdf'});
    if(navigator.canShare && navigator.canShare({files:[file]})){
      try{
        await navigator.share({files:[file], title:`Estadísticas ${opts.equipo}`});
        return 'compartido';
      }catch(e){
        if(e && e.name === 'AbortError') return 'cancelado';
      }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = nombre;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url), 5000);
    return 'descargado';
  }

  window.InformePDF = { generar, construir };
})();

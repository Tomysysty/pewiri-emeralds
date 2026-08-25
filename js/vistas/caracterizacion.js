/* Vista: Caracterización — la huella digital SVP-9 de una esmeralda. */
(function (global) {
  'use strict';

  var COLOR_PRINCIPAL = '#1f4a3a';
  var COLOR_COMPARA = '#9a7b28';

  var borrador = null;
  var comparaCon = '';

  function nuevoBorrador() {
    return {
      id: null,
      codigo: '',
      fecha: Store.hoy(),
      evaluador: '',
      pesoCt: 0,
      largo: 0,
      ancho: 0,
      profundidad: 0,
      procedenciaTexto: '',
      tratamientoTexto: '',
      notas: '',
      factores: SVP9.factoresVacios(5)
    };
  }

  /* Evaluaciones viejas guardaban las medidas como un solo texto
     ("8,2 × 6,1 × 4,3"). Al abrirlas se reparten en los tres campos. */
  function normalizar(evaluacion) {
    var e = JSON.parse(JSON.stringify(evaluacion));
    if (!e.largo && !e.ancho && !e.profundidad && e.dimensiones) {
      var numeros = String(e.dimensiones).match(/[\d.,]+/g) || [];
      e.largo = Calc.num((numeros[0] || '0').replace(',', '.'));
      e.ancho = Calc.num((numeros[1] || '0').replace(',', '.'));
      e.profundidad = Calc.num((numeros[2] || '0').replace(',', '.'));
    }
    e.largo = e.largo || 0;
    e.ancho = e.ancho || 0;
    e.profundidad = e.profundidad || 0;
    delete e.dimensiones;
    return e;
  }

  function medidasTexto(e) {
    if (!e.largo && !e.ancho && !e.profundidad) return '';
    return UI.numero(e.largo, 2) + ' × ' + UI.numero(e.ancho, 2) + ' × ' + UI.numero(e.profundidad, 2) + ' mm';
  }

  function relacionLA(e) {
    return e.ancho ? e.largo / e.ancho : 0;
  }

  function siguienteCodigo() {
    var n = Store.datos.evaluaciones.length + 1;
    return 'SVP-' + String(n).padStart(3, '0');
  }

  function escapar(s) { return String(s || '').replace(/"/g, '&quot;'); }

  /* Título de tarjeta con su icono. Los marcos alternan redondo y cuadrado. */
  function titulo(icono, texto, forma) {
    return '<h3 class="con-icono">' + Iconos.usar(icono, 'icono-titulo') + texto + '</h3>';
  }

  function render(raiz) {
    if (!borrador) borrador = nuevoBorrador();

    raiz.innerHTML = [
      '<div class="encabezado-vista">',
      '  <div>',
      '    <h2>Caracterización</h2>',
      '    <p class="ayuda">Nueve factores, de 1 a 10. La huella digital se dibuja sola mientras calificas y el sistema define el nivel de la piedra.</p>',
      '  </div>',
      '  <div class="fila-botones">',
      '    <button class="boton" id="nuevaEval">Nueva</button>',
      '    <button class="boton primario" id="guardarEval">Guardar evaluación</button>',
      '  </div>',
      '</div>',

      '<div class="dos-columnas">',
      '  <div>',
      '    <section class="tarjeta">',
      titulo('ficha', 'Ficha de la piedra'),
      '      <div class="rejilla-3">',
      '        <div class="campo"><label>Código o nombre</label><input type="text" data-campo="codigo" value="' + escapar(borrador.codigo) + '" placeholder="' + siguienteCodigo() + '"></div>',
      '        <div class="campo"><label>Fecha</label><input type="date" data-campo="fecha" value="' + borrador.fecha + '"></div>',
      '        <div class="campo"><label>Evaluador</label><input type="text" data-campo="evaluador" value="' + escapar(borrador.evaluador) + '"></div>',
      '        <div class="campo"><label>Peso (ct)</label><input type="number" min="0" step="0.01" data-campo="pesoCt" value="' + borrador.pesoCt + '"></div>',
      '        <div class="campo campo-doble"><label>Dimensiones (mm)</label>',
      '          <div class="fila-campo">',
      '            <input type="number" min="0" step="0.01" data-campo="largo" value="' + borrador.largo + '" placeholder="Largo" title="Largo">',
      '            <input type="number" min="0" step="0.01" data-campo="ancho" value="' + borrador.ancho + '" placeholder="Ancho" title="Ancho">',
      '            <input type="number" min="0" step="0.01" data-campo="profundidad" value="' + borrador.profundidad + '" placeholder="Prof." title="Profundidad (alto)">',
      '          </div>',
      '          <span class="pista" id="pistaMedidas">largo × ancho × profundidad</span>',
      '        </div>',
      '        <div class="campo"><label>Procedencia</label><input type="text" data-campo="procedenciaTexto" value="' + escapar(borrador.procedenciaTexto) + '" placeholder="Muzo, Chivor…"></div>',
      '        <div class="campo"><label>Tratamiento</label><input type="text" data-campo="tratamientoTexto" value="' + escapar(borrador.tratamientoTexto) + '" placeholder="Ninguno, aceite menor…"></div>',
      '        <div class="campo"><label>Notas</label><input type="text" data-campo="notas" value="' + escapar(borrador.notas) + '"></div>',
      '      </div>',
      '    </section>',

      '    <section class="tarjeta">',
      titulo('huella', 'Calificación de los nueve factores'),
      '      <div id="factores" class="factores"></div>',
      '      <div class="fila-botones">',
      '        <span class="aviso" id="avisoFactores"></span>',
      '      </div>',
      '    </section>',

      '    <section class="tarjeta">',
      titulo('escala', 'Escala de calificación'),
      '      <div class="escala-svp">',
      SVP9.ESCALA.map(function (e) {
        var rango = e.min === e.max ? e.min : e.min + '–' + e.max;
        return '<div class="escalon" data-escalon="' + e.nombre + '"><strong>' + rango + '</strong><span>' + e.nombre + '</span></div>';
      }).join(''),
      '      </div>',
      '    </section>',
      '  </div>',

      '  <div>',
      '    <section class="tarjeta resultado" id="panelHuella"></section>',
      '    <section class="tarjeta">',
      titulo('base', 'Evaluaciones guardadas'),
      '      <div class="fila-botones">',
      '        <select id="comparar" class="select-compacto"><option value="">Comparar con…</option></select>',
      '        <button class="boton pequeno" id="exportarCsv">Exportar CSV</button>',
      '        <button class="boton pequeno" id="descargarPng">Descargar huella</button>',
      '      </div>',
      '      <div id="listaEvaluaciones"></div>',
      '    </section>',
      '  </div>',
      '</div>'
    ].join('');

    pintarFactores(raiz);
    pintarSelectorComparar(raiz);

    raiz.addEventListener('input', function (e) { alCambiar(raiz, e); });
    raiz.addEventListener('change', function (e) { alCambiar(raiz, e); });

    UI.$('#nuevaEval', raiz).addEventListener('click', function () {
      borrador = nuevoBorrador();
      App.recargar();
    });

    UI.$('#guardarEval', raiz).addEventListener('click', function () {
      leerBorrador(raiz);
      if (!borrador.codigo) borrador.codigo = siguienteCodigo();

      var codigoGuardado = borrador.codigo;
      var actualiza = false;

      if (borrador.id) {
        var i = Store.datos.evaluaciones.findIndex(function (x) { return x.id === borrador.id; });
        if (i >= 0) { Store.datos.evaluaciones[i] = JSON.parse(JSON.stringify(borrador)); actualiza = true; }
      }
      if (!actualiza) {
        borrador.id = Store.id();
        Store.datos.evaluaciones.unshift(JSON.parse(JSON.stringify(borrador)));
      }
      Store.guardar();

      // Queda lista para la siguiente piedra, sin pasar por "Nueva".
      borrador = nuevoBorrador();
      App.recargar();
      var primer = UI.$('[data-campo="codigo"]');
      if (primer) primer.focus();

      UI.toast(codigoGuardado + (actualiza ? ' actualizada' : ' guardada') + '. Lista para la siguiente piedra.');
    });

    UI.$('#comparar', raiz).addEventListener('change', function (e) {
      comparaCon = e.target.value;
      sincronizar(raiz);
    });

    UI.$('#exportarCsv', raiz).addEventListener('click', exportarCsv);
    UI.$('#descargarPng', raiz).addEventListener('click', function () { descargarPng(raiz); });

    sincronizar(raiz);
    pintarLista(raiz);
  }

  function pintarFactores(raiz) {
    var cont = UI.$('#factores', raiz);
    cont.innerHTML = SVP9.FACTORES.map(function (f, i) {
      var v = borrador.factores[f.clave];
      // Marcos alternados: unos redondos, otros cuadrados.
      var forma = i % 2 === 0 ? 'redondo' : 'cuadrado';
      return [
        '<div class="factor">',
        '  <div class="factor-cabeza">',
        '    <span class="marco ' + forma + '">' + Iconos.usar(f.clave) + '</span>',
        '    <span class="factor-orden">' + String(i + 1).padStart(2, '0') + '</span>',
        '    <span class="factor-nombre">' + f.nombre + '</span>',
        '    <span class="factor-nivel" data-nivel="' + f.clave + '"></span>',
        '    <input type="number" min="1" max="10" step="1" class="factor-numero" data-factor="' + f.clave + '" value="' + v + '">',
        '  </div>',
        '  <input type="range" min="1" max="10" step="1" class="factor-rango" data-rango="' + f.clave + '" value="' + v + '">',
        '  <p class="factor-descripcion">' + f.descripcion + '</p>',
        '</div>'
      ].join('');
    }).join('');
  }

  function pintarSelectorComparar(raiz) {
    var sel = UI.$('#comparar', raiz);
    if (!sel) return;
    sel.innerHTML = '<option value="">Comparar con…</option>';
    Store.datos.evaluaciones.forEach(function (e) {
      var o = document.createElement('option');
      o.value = e.id;
      o.textContent = e.codigo + (e.pesoCt ? ' · ' + UI.numero(e.pesoCt, 2) + ' ct' : '');
      if (e.id === comparaCon) o.selected = true;
      sel.appendChild(o);
    });
  }

  function alCambiar(raiz, evento) {
    var t = evento.target;
    // Mantener sincronizados el deslizador y el número de cada factor.
    if (t && t.getAttribute('data-rango')) {
      var clave = t.getAttribute('data-rango');
      var numero = UI.$('[data-factor="' + clave + '"]', raiz);
      if (numero) numero.value = t.value;
    } else if (t && t.getAttribute('data-factor')) {
      var c = t.getAttribute('data-factor');
      var rango = UI.$('[data-rango="' + c + '"]', raiz);
      if (rango) rango.value = SVP9.acotar(t.value);
    }
    sincronizar(raiz);
  }

  function leerBorrador(raiz) {
    var f = UI.leerFormulario(raiz);
    borrador.codigo = f.codigo;
    borrador.fecha = f.fecha;
    borrador.evaluador = f.evaluador;
    borrador.pesoCt = Calc.num(f.pesoCt);
    borrador.largo = Calc.num(f.largo);
    borrador.ancho = Calc.num(f.ancho);
    borrador.profundidad = Calc.num(f.profundidad);
    borrador.procedenciaTexto = f.procedenciaTexto;
    borrador.tratamientoTexto = f.tratamientoTexto;
    borrador.notas = f.notas;

    SVP9.FACTORES.forEach(function (fac) {
      var el = UI.$('[data-factor="' + fac.clave + '"]', raiz);
      if (el) borrador.factores[fac.clave] = SVP9.acotar(el.value);
    });
  }

  function sincronizar(raiz) {
    leerBorrador(raiz);
    var cfg = Store.datos.config;
    var r = SVP9.evaluar(borrador.factores, cfg.svp9Pesos);
    var p = SVP9.puntaje(r, cfg.svp9Modo);
    var niv = SVP9.nivel(p);

    r.detalle.forEach(function (d) {
      var el = UI.$('[data-nivel="' + d.clave + '"]', raiz);
      if (el) el.textContent = d.nivel;
    });

    UI.$$('.escalon', raiz).forEach(function (el) {
      el.classList.toggle('activo', el.getAttribute('data-escalon') === niv.nombre);
    });

    var pistaMedidas = UI.$('#pistaMedidas', raiz);
    if (pistaMedidas) {
      var medidas = medidasTexto(borrador);
      var rel = relacionLA(borrador);
      pistaMedidas.textContent = medidas
        ? medidas + (rel ? ' · relación largo/ancho ' + UI.numero(rel, 2) : '')
        : 'largo × ancho × profundidad';
    }

    var aviso = UI.$('#avisoFactores', raiz);
    if (aviso) {
      aviso.textContent = 'Suma ' + UI.numero(r.suma) + '/90 · más alto: ' + r.masAlto.nombre +
        ' (' + r.masAlto.valor + ') · más bajo: ' + r.masBajo.nombre + ' (' + r.masBajo.valor + ')';
    }

    var series = [{
      nombre: borrador.codigo || 'Esta piedra',
      color: COLOR_PRINCIPAL,
      valores: borrador.factores
    }];

    var otra = comparaCon ? Store.datos.evaluaciones.find(function (x) { return x.id === comparaCon; }) : null;
    if (otra) {
      series.push({ nombre: otra.codigo, color: COLOR_COMPARA, valores: otra.factores });
    }

    UI.$('#panelHuella', raiz).innerHTML = [
      '<h3>Huella digital</h3>',
      '<div id="radar"></div>',
      '<div class="puntaje-svp">',
      '  <div class="puntaje-numero">' + UI.numero(p, 1) + '<span>de 10</span></div>',
      '  <div class="puntaje-nivel"><strong>' + niv.nombre + '</strong>',
      '  <span>' + (cfg.svp9Modo === 'equilibrado' ? 'índice equilibrado' : 'promedio ponderado') + '</span></div>',
      '</div>',
      '<div class="indicadores">',
      '  <div class="indicador"><span>Promedio simple</span><strong>' + UI.numero(r.promedio, 1) + '</strong></div>',
      '  <div class="indicador"><span>Índice equilibrado</span><strong>' + UI.numero(r.equilibrado, 1) + '</strong><em>' + r.nivelEquilibrado.nombre + '</em></div>',
      '  <div class="indicador"><span>Uniformidad</span><strong>' + UI.pct(r.uniformidad, 0) + '</strong><em>' + (r.desviacion < 1 ? 'piedra muy pareja' : (r.desviacion < 2.2 ? 'variación normal' : 'muy despareja')) + '</em></div>',
      '</div>',
      otra ? '<div class="bloque-equilibrio"><h4>Comparación con ' + otra.codigo + '</h4><p>' + comparacion(borrador.factores, otra.factores) + '</p></div>' : '',
      '<div class="bloque-equilibrio">',
      '  <h4>Lectura rápida</h4>',
      '  <p>Su fortaleza es <strong>' + r.masAlto.nombre + '</strong> (' + r.masAlto.valor + '/10) y lo que más la limita es <strong>' + r.masBajo.nombre + '</strong> (' + r.masBajo.valor + '/10).</p>',
      '</div>'
    ].join('');

    Grafica.radar(UI.$('#radar', raiz), SVP9.FACTORES, series);
  }

  function comparacion(a, b) {
    var mejores = [], peores = [];
    SVP9.FACTORES.forEach(function (f) {
      var d = SVP9.acotar(a[f.clave]) - SVP9.acotar(b[f.clave]);
      if (d >= 2) mejores.push(f.nombre + ' (+' + d + ')');
      if (d <= -2) peores.push(f.nombre + ' (' + d + ')');
    });
    var texto = [];
    if (mejores.length) texto.push('Supera en ' + mejores.join(', ') + '.');
    if (peores.length) texto.push('Queda por debajo en ' + peores.join(', ') + '.');
    if (!texto.length) texto.push('Las dos piedras tienen perfiles muy parecidos: ninguna diferencia llega a 2 puntos.');
    return texto.join(' ');
  }

  function pintarLista(raiz) {
    var cont = UI.$('#listaEvaluaciones', raiz);
    var evals = Store.datos.evaluaciones;
    if (!evals.length) { cont.innerHTML = '<p class="vacio">Aún no has guardado evaluaciones.</p>'; return; }

    var cfg = Store.datos.config;
    cont.innerHTML = evals.map(function (crudo) {
      var e = normalizar(crudo);
      var r = SVP9.evaluar(e.factores, cfg.svp9Pesos);
      var p = SVP9.puntaje(r, cfg.svp9Modo);
      var medidas = medidasTexto(e);
      return [
        '<div class="item-lista con-huella">',
        '  ' + Grafica.miniHuella(SVP9.FACTORES, e.factores, 40),
        '  <div class="cuerpo-item"><strong>' + e.codigo + '</strong> <span class="insignia-nivel">' + SVP9.nivel(p).nombre + ' · ' + UI.numero(p, 1) + '</span>',
        '  <span class="pista">' + UI.fecha(e.fecha) + (e.pesoCt ? ' · ' + UI.numero(e.pesoCt, 2) + ' ct' : '') + (medidas ? ' · ' + medidas : '') + (e.procedenciaTexto ? ' · ' + e.procedenciaTexto : '') + '</span></div>',
        '  <div class="fila-botones">',
        '    <button class="boton pequeno" data-abrir="' + e.id + '">Abrir</button>',
        '    <button class="boton pequeno peligro" data-borrar="' + e.id + '">Borrar</button>',
        '  </div>',
        '</div>'
      ].join('');
    }).join('');

    UI.$$('[data-abrir]', cont).forEach(function (b) {
      b.addEventListener('click', function () {
        var e = Store.datos.evaluaciones.find(function (x) { return x.id === b.getAttribute('data-abrir'); });
        borrador = normalizar(e);
        App.recargar();
      });
    });
    UI.$$('[data-borrar]', cont).forEach(function (b) {
      b.addEventListener('click', function () {
        var id = b.getAttribute('data-borrar');
        Store.datos.evaluaciones = Store.datos.evaluaciones.filter(function (x) { return x.id !== id; });
        if (comparaCon === id) comparaCon = '';
        Store.guardar();
        App.recargar();
      });
    });
  }

  /* ---------- Exportar ---------- */

  function exportarCsv() {
    var cfg = Store.datos.config;
    var evals = Store.datos.evaluaciones;
    if (!evals.length) { UI.toast('No hay evaluaciones guardadas para exportar.'); return; }

    var coma = function (n) { return String(n).replace('.', ','); };
    var encabezado = ['Codigo', 'Fecha', 'Evaluador', 'Peso ct', 'Largo mm', 'Ancho mm', 'Profundidad mm', 'Relacion L/A', 'Procedencia', 'Tratamiento']
      .concat(SVP9.FACTORES.map(function (f) { return f.nombre; }))
      .concat(['Suma', 'Promedio', 'Ponderado', 'Equilibrado', 'Nivel', 'Notas']);

    var filas = evals.map(function (crudo) {
      var e = normalizar(crudo);
      var r = SVP9.evaluar(e.factores, cfg.svp9Pesos);
      var p = SVP9.puntaje(r, cfg.svp9Modo);
      var rel = relacionLA(e);
      return [e.codigo, e.fecha, e.evaluador, coma(e.pesoCt), coma(e.largo), coma(e.ancho), coma(e.profundidad),
        rel ? coma(rel.toFixed(2)) : '', e.procedenciaTexto, e.tratamientoTexto]
        .concat(SVP9.FACTORES.map(function (f) { return e.factores[f.clave]; }))
        .concat([r.suma, coma(r.promedio.toFixed(2)), coma(r.ponderado.toFixed(2)), coma(r.equilibrado.toFixed(2)), SVP9.nivel(p).nombre, e.notas]);
    });

    var csv = [encabezado].concat(filas).map(function (fila) {
      return fila.map(function (c) { return '"' + String(c === undefined ? '' : c).replace(/"/g, '""') + '"'; }).join(';');
    }).join('\r\n');

    descargar(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }), 'svp9-evaluaciones-' + Store.hoy() + '.csv');
    UI.toast(evals.length + ' evaluaciones exportadas.');
  }

  /* Estilos que el SVG necesita llevar dentro para verse igual fuera del navegador. */
  var ESTILOS_SVG = [
    '.anillo{fill:none;stroke:#c3d9c9;stroke-width:1}',
    '.anillo.borde{stroke:#1f4a3a;stroke-width:1.4}',
    '.eje{stroke:#c3d9c9;stroke-width:1}',
    '.punto{stroke:#f7fcf8;stroke-width:1.6}',
    '.eje-nombre{fill:#1f4a3a;font-family:Georgia,serif;font-size:13px;letter-spacing:1.4px}',
    '.eje-valor{fill:#5f7d6f;font-family:Georgia,serif;font-size:15px;font-weight:700}',
    '.escala-num{fill:#8aa495;font-family:Georgia,serif;font-size:10px}'
  ].join('');

  function descargarPng(raiz) {
    var svg = UI.$('#radar svg', raiz);
    if (!svg) { UI.toast('No hay huella para descargar.'); return; }

    var clon = svg.cloneNode(true);
    var estilo = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    estilo.textContent = ESTILOS_SVG;
    clon.insertBefore(estilo, clon.firstChild);

    var W = 620, H = 560, escala = 2;
    clon.setAttribute('width', W);
    clon.setAttribute('height', H);

    var texto = new XMLSerializer().serializeToString(clon);
    var url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(texto);

    var img = new Image();
    img.onload = function () {
      var lienzo = document.createElement('canvas');
      lienzo.width = W * escala;
      lienzo.height = H * escala;
      var ctx = lienzo.getContext('2d');
      ctx.fillStyle = '#eaf5ec';
      ctx.fillRect(0, 0, lienzo.width, lienzo.height);
      ctx.drawImage(img, 0, 0, lienzo.width, lienzo.height);
      lienzo.toBlob(function (blob) {
        descargar(blob, 'huella-' + (borrador.codigo || 'esmeralda') + '.png');
        UI.toast('Huella descargada.');
      });
    };
    img.onerror = function () { UI.toast('No se pudo generar la imagen.'); };
    img.src = url;
  }

  function descargar(blob, nombre) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    a.click();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  global.Vistas = global.Vistas || {};
  global.Vistas.caracterizacion = { titulo: 'Caracterización', render: render };
})(window);

/* Vista: Caracterización — la huella digital SVP-9 de una esmeralda. */
(function (global) {
  'use strict';

  var COLOR_PRINCIPAL = '#1f4a3a';
  var COLOR_COMPARA = '#9a7b28';

  /* Tamaño en que se dibuja la huella dentro del PNG descargado (1,3× del
     viewBox 620×560): la caracterización es la protagonista del archivo. */
  var ANCHO_RADAR = 806;
  var ALTO_RADAR = 728;

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
      factores: SVP9.factoresVacios(5),
      imagenes: []
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
    e.imagenes = Array.isArray(e.imagenes) ? e.imagenes : [];
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
      titulo('imagen', 'Imágenes de la piedra'),
      '      <div id="zonaImagenes"></div>',
      '      <input type="file" id="entradaImagenes" accept="image/*" multiple hidden>',
      '      <div class="fila-botones">',
      '        <button class="boton" id="agregarImagen">Agregar imágenes</button>',
      '        <span class="pista-inline">Se guardan en este navegador y aparecen en la huella descargada.</span>',
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
    pintarImagenes(raiz);

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

    UI.$('#agregarImagen', raiz).addEventListener('click', function () {
      UI.$('#entradaImagenes', raiz).click();
    });
    UI.$('#entradaImagenes', raiz).addEventListener('change', function (e) {
      procesarArchivos(e.target.files, raiz);
      e.target.value = '';
    });
    UI.$('#zonaImagenes', raiz).addEventListener('click', function (e) {
      var t = e.target.closest('[data-ver-imagen], [data-quitar-imagen]');
      if (!t) return;
      if (t.hasAttribute('data-ver-imagen')) {
        abrirVisor(borrador.imagenes[parseInt(t.getAttribute('data-ver-imagen'), 10)]);
      } else {
        borrador.imagenes.splice(parseInt(t.getAttribute('data-quitar-imagen'), 10), 1);
        pintarImagenes(raiz);
      }
    });

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
      otra ? compararFotosHtml(borrador, otra) : '',
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

  /* Al comparar, muestra las fotos de las dos piedras lado a lado, cada una
     con su nombre: la actual a la izquierda y la comparada a la derecha. */
  function compararFotosHtml(a, b) {
    var fotoA = (a.imagenes && a.imagenes.length) ? a.imagenes[0] : '';
    var fotoB = (b.imagenes && b.imagenes.length) ? b.imagenes[0] : '';
    var nombreA = a.codigo || 'Esta piedra';
    var nombreB = b.codigo || 'Comparada';
    var visualA = fotoA
      ? '<img src="' + fotoA + '" alt="' + escapar(nombreA) + '">'
      : Grafica.miniHuella(SVP9.FACTORES, a.factores, 40);
    var visualB = fotoB
      ? '<img src="' + fotoB + '" alt="' + escapar(nombreB) + '">'
      : Grafica.miniHuella(SVP9.FACTORES, b.factores, 40);
    return [
      '<div class="comparar-fotos">',
      '  <div class="comparar-lado">',
      '    <div class="comparar-foto">' + visualA + '</div>',
      '    <div class="comparar-nombre">' + escapar(nombreA) + '</div>',
      '  </div>',
      '  <div class="comparar-lado">',
      '    <div class="comparar-foto">' + visualB + '</div>',
      '    <div class="comparar-nombre">' + escapar(nombreB) + '</div>',
      '  </div>',
      '</div>'
    ].join('');
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
        '  ' + (e.imagenes && e.imagenes.length ? '<img class="foto-mini" src="' + e.imagenes[0] + '" alt="Foto de ' + escapar(e.codigo) + '">' : Grafica.miniHuella(SVP9.FACTORES, e.factores, 40)),
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

  /* ---------- Imágenes de la piedra ---------- */

  function pintarImagenes(raiz) {
    var cont = UI.$('#zonaImagenes', raiz);
    if (!cont) return;
    var imgs = borrador.imagenes || [];
    if (!imgs.length) {
      cont.innerHTML = '<p class="vacio">Sin imágenes todavía. Agrega una o varias fotos de la piedra.</p>';
      return;
    }
    cont.innerHTML = '<div class="galeria">' + imgs.map(function (d, i) {
      return '<div class="galeria-item">' +
        '<img class="mini-imagen" src="' + d + '" alt="Foto ' + (i + 1) + '" data-ver-imagen="' + i + '">' +
        '<button class="boton icono quitar" type="button" data-quitar-imagen="' + i + '" title="Quitar imagen">×</button>' +
        '</div>';
    }).join('') + '</div>';
  }

  function procesarArchivos(lista, raiz) {
    var archivos = Array.prototype.slice.call(lista || []);
    if (!archivos.length) return;
    UI.toast('Procesando ' + archivos.length + ' imagen' + (archivos.length === 1 ? '' : 'es') + '…');
    var tareas = archivos.map(function (f) { return leerImagen(f); });
    Promise.all(tareas).then(function (datos) {
      datos.forEach(function (d) { borrador.imagenes.push(d); });
      pintarImagenes(raiz);
      UI.toast(borrador.imagenes.length + ' imagen' + (borrador.imagenes.length === 1 ? '' : 'es') + ' en total.');
    }).catch(function () {
      UI.toast('No se pudo leer alguna de las imágenes.');
    });
  }

  /* Lee un archivo y lo devuelve como data URL reducido (para no reventar
     el límite de localStorage). Máximo 1600 px de lado, JPEG al 85 %. */
  function leerImagen(archivo) {
    return new Promise(function (resolver, rechazar) {
      if (!archivo || !archivo.type || archivo.type.indexOf('image/') !== 0) { rechazar(); return; }
      var lector = new FileReader();
      lector.onload = function () {
        var img = new Image();
        img.onload = function () {
          try {
            var MAX = 1600;
            var w = img.naturalWidth, h = img.naturalHeight;
            var escala = Math.min(1, MAX / Math.max(w, h));
            var dw = Math.round(w * escala), dh = Math.round(h * escala);
            var lienzo = document.createElement('canvas');
            lienzo.width = dw; lienzo.height = dh;
            var ctx = lienzo.getContext('2d');
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, dw, dh);
            ctx.drawImage(img, 0, 0, dw, dh);
            resolver(lienzo.toDataURL('image/jpeg', 0.85));
          } catch (e) { rechazar(e); }
        };
        img.onerror = rechazar;
        img.src = lector.result;
      };
      lector.onerror = rechazar;
      lector.readAsDataURL(archivo);
    });
  }

  function abrirVisor(dataUrl) {
    if (!dataUrl) return;
    var capa = document.createElement('div');
    capa.className = 'visor';
    capa.setAttribute('role', 'dialog');
    capa.setAttribute('aria-label', 'Imagen de la piedra');

    var cuadro = document.createElement('figure');
    cuadro.className = 'visor-cuadro';
    var img = document.createElement('img');
    img.src = dataUrl;
    img.alt = 'Imagen de la piedra';
    var boton = document.createElement('button');
    boton.className = 'visor-cerrar';
    boton.type = 'button';
    boton.textContent = '×';
    boton.setAttribute('aria-label', 'Cerrar');
    cuadro.appendChild(boton);
    cuadro.appendChild(img);
    capa.appendChild(cuadro);

    var cerrar = function () {
      capa.remove();
      document.removeEventListener('keydown', tecla);
    };
    var tecla = function (e) { if (e.key === 'Escape') cerrar(); };
    capa.addEventListener('click', function (e) { if (e.target === capa) cerrar(); });
    boton.addEventListener('click', cerrar);
    document.addEventListener('keydown', tecla);
    document.body.appendChild(capa);
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

    var otra = comparaCon ? Store.datos.evaluaciones.find(function (x) { return x.id === comparaCon; }) : null;

    var radarUrl = svgADataUrl(svg);

    var cargas;
    if (otra) {
      // Comparando: dos fotos (izquierda = actual, derecha = comparada).
      cargas = [
        cargarImagen(radarUrl),
        cargarImagen((borrador.imagenes && borrador.imagenes[0]) || ''),
        cargarImagen((otra.imagenes && otra.imagenes[0]) || '')
      ];
    } else {
      var fotos = (borrador.imagenes || []).slice();
      cargas = [cargarImagen(radarUrl)].concat(fotos.map(function (d) { return cargarImagen(d); }));
    }

    Promise.all(cargas).then(function (imgs) {
      if (otra) {
        componerComparacion(imgs[0], imgs[1], imgs[2], borrador, otra);
      } else {
        componerYDescargar(imgs[0], imgs.slice(1));
      }
    }).catch(function () {
      UI.toast('No se pudo generar la imagen.');
    });
  }

  /* Convierte el radar en un data URL a doble resolución, a la medida exacta
     en que se va a dibujar, para que salga nítido. */
  function svgADataUrl(svg) {
    var clon = svg.cloneNode(true);
    var estilo = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    estilo.textContent = ESTILOS_SVG;
    clon.insertBefore(estilo, clon.firstChild);
    clon.setAttribute('width', ANCHO_RADAR * 2);
    clon.setAttribute('height', ALTO_RADAR * 2);
    var texto = new XMLSerializer().serializeToString(clon);
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(texto);
  }

  function cargarImagen(dataUrl) {
    return new Promise(function (resolver) {
      if (!dataUrl) { resolver(null); return; }
      var img = new Image();
      img.onload = function () { resolver(img); };
      img.onerror = function () { resolver(null); };
      img.src = dataUrl;
    });
  }

  /* Arma el PNG final: nombre de la piedra arriba a la izquierda, las fotos
     en fila debajo y la huella SVP-9 al final. */
  /* Parte el texto en líneas que quepan dentro de maxAncho. */
  function envolver(ctx, texto, maxAncho) {
    var palabras = String(texto).split(' ');
    var lineas = [];
    var actual = '';
    palabras.forEach(function (p) {
      var prueba = actual ? actual + ' ' + p : p;
      if (!actual || ctx.measureText(prueba).width <= maxAncho) {
        actual = prueba;
      } else {
        lineas.push(actual);
        actual = p;
      }
    });
    if (actual) lineas.push(actual);
    return lineas;
  }

  function componerYDescargar(radar, fotos) {
    var M = 56, ANCHO = 1240, ESCALA = 2;
    var THUMB = 156, TGAP = 16;

    var nombre = borrador.codigo || 'Esmeralda';
    var cfg = Store.datos.config;
    var r = SVP9.evaluar(borrador.factores, cfg.svp9Pesos);
    var p = SVP9.puntaje(r, cfg.svp9Modo);
    var sub = 'Huella SVP-9 · ' + SVP9.nivel(p).nombre + ' · ' + UI.numero(p, 1) + ' / 10';
    if (borrador.pesoCt) sub += ' · ' + UI.numero(borrador.pesoCt, 2) + ' ct';

    var FUENTE_NOMBRE = 'italic 700 40px "Playfair Display", Georgia, serif';
    var FUENTE_DESC = '600 32px "Montserrat", "Segoe UI", sans-serif';
    var INTERLINEA = 40;   // separación entre líneas de la descripción

    // Medir el nombre y envolver la descripción (puede ocupar dos líneas).
    var medidor = document.createElement('canvas').getContext('2d');
    medidor.font = FUENTE_NOMBRE;
    var anchoNombre = medidor.measureText(nombre).width;
    medidor.font = FUENTE_DESC;
    var lineasDesc = envolver(medidor, sub, ANCHO - 2 * M);
    var anchoDesc = 0;
    lineasDesc.forEach(function (l) {
      anchoDesc = Math.max(anchoDesc, medidor.measureText(l).width);
    });

    // Posiciones verticales del bloque de texto (nombre + filete + descripción).
    var yNombre = M + 34;                        // línea base del nombre
    var yFilete = M + 50;                        // filete bajo el nombre
    var yDesc0 = M + 82;                        // primera línea de la descripción
    var finNombre = yDesc0 + (lineasDesc.length - 1) * INTERLINEA + 12;

    // Las miniaturas van en la esquina superior derecha, siempre a la derecha
    // del texto más ancho, para no pisar ni el nombre ni la descripción.
    var limiteIzq = M + Math.max(anchoNombre, anchoDesc) + 48;
    var porFila, yThumb;
    if ((ANCHO - M) - limiteIzq >= THUMB) {
      porFila = Math.max(1, Math.floor(((ANCHO - M - limiteIzq) + TGAP) / (THUMB + TGAP)));
      yThumb = M + 4;
    } else {
      porFila = Math.max(1, Math.floor((ANCHO - 2 * M + TGAP) / (THUMB + TGAP)));
      yThumb = finNombre + 20;
    }
    var filasThumb = fotos.length ? Math.ceil(fotos.length / porFila) : 0;
    var finThumbs = yThumb + filasThumb * (THUMB + TGAP);

    var altoCabecera = Math.max(finNombre, finThumbs) - M;
    var ALTO = M + altoCabecera + 26 + ALTO_RADAR + M;

    var lienzo = document.createElement('canvas');
    lienzo.width = ANCHO * ESCALA;
    lienzo.height = ALTO * ESCALA;
    var ctx = lienzo.getContext('2d');
    ctx.scale(ESCALA, ESCALA);

    ctx.fillStyle = '#eaf5ec';
    ctx.fillRect(0, 0, ANCHO, ALTO);

    // Nombre de la piedra, arriba a la izquierda.
    ctx.fillStyle = '#1f4a3a';
    ctx.font = FUENTE_NOMBRE;
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(nombre, M, yNombre);

    // Filete con rombo, firma visual de la casa.
    ctx.fillStyle = '#6fa98c';
    ctx.fillRect(M, yFilete, 88, 1);
    ctx.save();
    ctx.translate(M + 94, yFilete + 0.5);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-3.5, -3.5, 7, 7);
    ctx.restore();

    // Descripción: nivel, puntaje y peso (puede ocupar dos líneas).
    ctx.fillStyle = '#526e5f';
    ctx.font = FUENTE_DESC;
    lineasDesc.forEach(function (linea, i) {
      ctx.fillText(linea, M, yDesc0 + i * INTERLINEA);
    });

    // Fotos en miniatura, en la esquina superior derecha (alineadas a la derecha).
    if (fotos.length) {
      var col = 0, fila = 0;
      fotos.forEach(function (img) {
        var enFila = Math.min(porFila, fotos.length - fila * porFila);
        var anchoFila = enFila * THUMB + (enFila - 1) * TGAP;
        var xInicio = (ANCHO - M) - anchoFila;
        dibujarPortada(ctx, img, xInicio + col * (THUMB + TGAP), yThumb + fila * (THUMB + TGAP), THUMB, THUMB);
        col++;
        if (col >= porFila) { col = 0; fila++; }
      });
    }

    // Huella (radar), grande y centrada: la protagonista del PNG.
    var xRadar = (ANCHO - ANCHO_RADAR) / 2;
    var yRadar = M + altoCabecera + 26;
    ctx.drawImage(radar, xRadar, yRadar, ANCHO_RADAR, ALTO_RADAR);

    lienzo.toBlob(function (blob) {
      descargar(blob, 'huella-' + (borrador.codigo || 'esmeralda') + '.png');
      UI.toast('Huella descargada.');
    });
  }

  /* Descarga de una comparación: título y descripción arriba, los dos nombres
     grandes (uno a cada extremo) y las fotos pequeñas debajo de cada nombre,
     cada una en un extremo. La huella con las dos formas va al final. */
  function componerComparacion(radar, imgA, imgB, a, b) {
    var M = 56, ANCHO = 1240, ESCALA = 2;
    var TILE = 150;   // fotos pequeñas

    var nombreA = a.codigo || 'Esta piedra';
    var nombreB = b.codigo || 'Comparada';

    var FUENTE_TITULO = 'italic 700 34px "Playfair Display", Georgia, serif';
    var FUENTE_DESC = '600 18px "Montserrat", "Segoe UI", sans-serif';
    var FUENTE_NOMBRE = 'italic 700 46px "Playfair Display", Georgia, serif';

    // Posiciones verticales: título + descripción, luego nombres y fotos.
    var yTitulo = M + 32;      // línea base del título (34px)
    var yDesc = M + 62;        // línea base de la descripción (18px)
    var yNombre = M + 108;     // línea base de los nombres (46px)
    var yFotos = M + 124;      // borde superior de las fotos (debajo de los nombres)
    var finFotos = yFotos + TILE;
    var ALTO = finFotos + 30 + ALTO_RADAR + M;

    var lienzo = document.createElement('canvas');
    lienzo.width = ANCHO * ESCALA;
    lienzo.height = ALTO * ESCALA;
    var ctx = lienzo.getContext('2d');
    ctx.scale(ESCALA, ESCALA);

    ctx.fillStyle = '#eaf5ec';
    ctx.fillRect(0, 0, ANCHO, ALTO);

    // Título y descripción, centrados arriba.
    ctx.fillStyle = '#1f4a3a';
    ctx.font = FUENTE_TITULO;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('Comparación de piedras', ANCHO / 2, yTitulo);
    ctx.fillStyle = '#526e5f';
    ctx.font = FUENTE_DESC;
    ctx.fillText('Huella SVP-9 · comparación de dos piedras', ANCHO / 2, yDesc);

    // Nombres grandes, uno en cada extremo.
    ctx.font = FUENTE_NOMBRE;
    ctx.fillStyle = '#1f4a3a';
    ctx.textAlign = 'left';
    ctx.fillText(nombreA, M, yNombre);
    ctx.fillStyle = '#9a7b28';
    ctx.textAlign = 'right';
    ctx.fillText(nombreB, ANCHO - M, yNombre);

    // Fotos pequeñas, debajo de cada nombre y en los extremos.
    dibujarFotoComparacion(ctx, imgA, M, yFotos, TILE, TILE);
    dibujarFotoComparacion(ctx, imgB, ANCHO - M - TILE, yFotos, TILE, TILE);

    ctx.textAlign = 'left';

    // Huella con las dos formas superpuestas, abajo.
    var xRadar = (ANCHO - ANCHO_RADAR) / 2;
    var yRadar = ALTO - M - ALTO_RADAR;
    ctx.drawImage(radar, xRadar, yRadar, ANCHO_RADAR, ALTO_RADAR);

    lienzo.toBlob(function (blob) {
      var archivo = 'comparacion-' + nombreA.replace(/[^\w-]+/g, '-') + '-vs-' + nombreB.replace(/[^\w-]+/g, '-') + '.png';
      descargar(blob, archivo);
      UI.toast('Comparación descargada.');
    });
  }

  /* Dibuja una foto en el cuadrado. Si no hay imagen, no dibuja nada. */
  function dibujarFotoComparacion(ctx, img, x, y, w, h) {
    if (img) dibujarPortada(ctx, img, x, y, w, h);
  }

  /* Dibuja una foto recortada en el cuadrado (cover) con su marco fino. */
  function dibujarPortada(ctx, img, x, y, w, h) {
    var iw = img.naturalWidth || img.width || w;
    var ih = img.naturalHeight || img.height || h;
    var esc = Math.max(w / iw, h / ih);
    var dw = iw * esc, dh = ih * esc;
    var dx = x + (w - dw) / 2, dy = y + (h - dh) / 2;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.drawImage(img, dx, dy, dw, dh);
    ctx.restore();
    ctx.strokeStyle = '#c3d9c9';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
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

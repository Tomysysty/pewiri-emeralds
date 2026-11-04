/* Vista: Configuración — constantes que carga la dueña y que el programa multiplica por detrás. */
(function (global) {
  'use strict';

  function render(raiz) {
    var c = Store.datos.config;

    raiz.innerHTML = [
      '<div class="encabezado-vista">',
      '  <div>',
      '    <h2>Configuración</h2>',
      '    <p class="ayuda">Estos son los valores constantes. Todo lo demás se calcula a partir de aquí: no hay que volver a escribirlos en cada lote ni en cada producto.</p>',
      '  </div>',
      '  <button class="boton primario" id="guardarConfig">Guardar cambios</button>',
      '</div>',

      '<section class="tarjeta">',
      '  <h3>Costo del quilate por calidad</h3>',
      '  <p class="ayuda">El valor de venta de una piedra es <strong>quilates × precio del quilate de su calidad</strong>.</p>',
      '  <div class="rejilla-3">',
      Calc.CALIDADES.map(function (q) {
        return [
          '<div class="campo">',
          '  <label>Calidad ' + UI.nombreCalidad(q) + ', precio por quilate</label>',
          '  <div class="fila-campo">',
          '    <input type="text" class="codigo" data-campo="codigoCalidad.' + q + '" value="' + (c.codigoCalidad[q] || '') + '" maxlength="4" title="Código de la calidad">',
          '    <input type="number" min="0" step="1000" data-campo="precioQuilate.' + q + '" value="' + c.precioQuilate[q] + '">',
          '  </div>',
          '</div>'
        ].join('');
      }).join(''),
      '  </div>',
      '</section>',

      '<section class="tarjeta">',
      '  <h3>Metales</h3>',
      '  <p class="ayuda">Valor del gramo. El gramaje que ingreses en un producto se multiplica por este valor. El oro, la plata y el platino siguen el precio internacional y la TRM solos; el ajuste sirve para acercarlo a lo que de verdad pagas o cobras.</p>',
      '  <div class="bloque-metal" data-estado-precios style="margin-bottom:1.2rem">' + Precios.resumenHTML() + '</div>',
      '  <div id="listaMetales" class="lista-metales"></div>',
      '  <div class="fila-agregar">',
      '    <input type="text" id="nuevoMetalNombre" placeholder="Nombre del metal (ej. Oro 21k)">',
      '    <input type="number" id="nuevoMetalPrecio" placeholder="Precio por gramo (no hace falta para oro o plata)" min="0" step="100">',
      '    <button class="boton" id="agregarMetal">Agregar metal</button>',
      '  </div>',
      '</section>',

      '<section class="tarjeta">',
      '  <h3>Costos estándar</h3>',
      '  <div class="rejilla-3">',
      '    <div class="campo"><label>Mano de obra del joyero (por pieza)</label><input type="number" min="0" step="1000" data-campo="manoObra" value="' + c.manoObra + '"></div>',
      '    <div class="campo"><label>Mano de obra por gramo trabajado</label><input type="number" min="0" step="500" data-campo="manoObraPorGramo" value="' + c.manoObraPorGramo + '"></div>',
      '    <div class="campo"><label>Envío (valor estándar)</label><input type="number" min="0" step="500" data-campo="envio" value="' + c.envio + '"></div>',
      '    <div class="campo"><label>Empaque</label><input type="number" min="0" step="500" data-campo="empaque" value="' + c.empaque + '"></div>',
      '    <div class="campo"><label>Publicidad por pieza</label><input type="number" min="0" step="500" data-campo="publicidad" value="' + c.publicidad + '"></div>',
      '    <div class="campo"><label>Gastos fijos del mes</label><input type="number" min="0" step="10000" data-campo="gastosFijosMes" value="' + c.gastosFijosMes + '"><span class="pista">Se usa para el punto de equilibrio.</span></div>',
      '  </div>',
      '</section>',

      '<section class="tarjeta">',
      '  <h3>Margen</h3>',
      '  <div class="rejilla-2">',
      '    <div class="campo"><label>Cómo se calcula el margen</label>',
      '      <select data-campo="margenModo" data-segmentos>',
      '        <option value="sobrePrecio" data-sub="precio = costo ÷ (1 − margen)"' + (c.margenModo === 'sobrePrecio' ? ' selected' : '') + '>Sobre el precio de venta</option>',
      '        <option value="sobreCosto" data-sub="precio = costo × (1 + margen)"' + (c.margenModo === 'sobreCosto' ? ' selected' : '') + '>Sobre el costo</option>',
      '      </select>',
      '      <span class="pista">Con 40 %: sobre precio da un precio más alto que sobre costo. Elige uno y quédate con él.</span>',
      '    </div>',
      '    <div class="campo"><label>Margen meta (%)</label><input type="number" min="0" max="99" step="1" data-campo="margenMeta" value="' + c.margenMeta + '"></div>',
      '  </div>',
      '</section>',

      '<section class="tarjeta">',
      '  <h3>SVP-9 · peso de cada factor</h3>',
      '  <p class="ayuda">Si todos valen 1, los nueve factores pesan igual. Sube el de un factor para que influya más en el puntaje final (por ejemplo Color en 2 = vale el doble).</p>',
      '  <div class="rejilla-3">',
      SVP9.FACTORES.map(function (f) {
        return '<div class="campo"><label>' + f.nombre + '</label><input type="number" min="0" max="5" step="0.5" data-campo="svp9Pesos.' + f.clave + '" value="' + (c.svp9Pesos[f.clave] === undefined ? 1 : c.svp9Pesos[f.clave]) + '"></div>';
      }).join(''),
      '  </div>',
      '  <div class="campo" style="margin-top:1rem">',
      '    <label>Cómo se combinan los nueve factores</label>',
      '    <select data-campo="svp9Modo" data-segmentos>',
      '      <option value="ponderado" data-sub="la suma de los nueve según su peso"' + (c.svp9Modo === 'ponderado' ? ' selected' : '') + '>Promedio ponderado</option>',
      '      <option value="equilibrado" data-sub="castiga el factor más débil"' + (c.svp9Modo === 'equilibrado' ? ' selected' : '') + '>Índice equilibrado</option>',
      '    </select>',
      '    <span class="pista">Con promedio, un 2 en Claridad se compensa con dieces en el resto. Con índice equilibrado, no: la piedra baja de nivel.</span>',
      '  </div>',
      '</section>',

      '<section class="tarjeta">',
      '  <h3>Google Drive</h3>',
      '  <p class="ayuda">Todo lo que guardas (evaluaciones, lotes, piedras, productos y ventas) se copia solo a una hoja de Google. Si no hay internet, se guarda aquí igual y se envía cuando vuelva.</p>',
      '  <div class="bloque-equilibrio" data-estado-drive style="margin-bottom:1rem">' + Drive.estadoHTML() + '</div>',
      '  <div class="rejilla-2">',
      '    <div class="campo campo-completo"><label for="driveUrl">Enlace de la aplicación web</label><input type="url" id="driveUrl" value="' + escapar(Drive.url()) + '" placeholder="https://script.google.com/macros/s/…/exec" autocomplete="off" spellcheck="false"><span class="pista">Lo da Google al publicar el Apps Script (Implementar → Nueva implementación).</span></div>',
      '    <div class="campo"><label for="driveClave">Clave</label><input type="text" id="driveClave" value="' + escapar(Drive.clave()) + '" placeholder="La misma del Apps Script" autocomplete="off" spellcheck="false"></div>',
      '  </div>',
      '  <div class="fila-botones">',
      '    <button class="boton primario" id="probarDrive">Guardar y probar conexión</button>',
      '    <button class="boton" id="enviarDrive">Enviar todo ahora</button>',
      '  </div>',
      '</section>',

      '<section class="tarjeta">',
      '  <h3>Respaldo de datos</h3>',
      '  <p class="ayuda">Los datos viven en este navegador. Exporta de vez en cuando para no perderlos.</p>',
      '  <div class="fila-botones">',
      '    <button class="boton" id="exportar">Exportar respaldo (.json)</button>',
      '    <button class="boton" id="importar">Importar respaldo</button>',
      '    <input type="file" id="archivoImportar" accept="application/json" hidden>',
      '    <button class="boton peligro" id="reiniciar">Borrar todo</button>',
      '  </div>',
      '</section>'
    ].join('');

    pintarMetales(raiz);
    UI.segmentar(raiz);

    UI.$('#agregarMetal', raiz).addEventListener('click', function () {
      var nombre = UI.$('#nuevoMetalNombre', raiz).value.trim();
      var precio = Calc.num(UI.$('#nuevoMetalPrecio', raiz).value);
      if (!nombre) { UI.toast('Ponle nombre al metal.'); return; }
      var deducida = Precios.inferir(nombre);
      if (!deducida && !precio) { UI.toast('Escribe el precio por gramo: este metal no sigue un precio internacional.'); return; }
      var clave = nombre.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      var metal = { nombre: nombre, precioGramo: precio };
      if (deducida) {
        // Oro, plata o platino reconocidos: siguen el mercado desde ya.
        metal.ref = deducida.ref; metal.pureza = deducida.pureza; metal.ajuste = 0; metal.auto = true;
        var enVivo = Precios.precioGramo(metal);
        if (enVivo !== null) metal.precioGramo = enVivo;
      }
      Store.datos.config.metales[clave] = metal;
      if (deducida) Precios.aplicar(); // su historial sale de la serie que ya se tiene
      else if (metal.precioGramo) Store.registrarPrecio(clave, metal.precioGramo);
      Store.guardar();
      UI.$('#nuevoMetalNombre', raiz).value = '';
      UI.$('#nuevoMetalPrecio', raiz).value = '';
      pintarMetales(raiz);
      UI.toast(deducida ? metal.nombre + ' agregado: ' + Precios.describir(metal) : 'Metal agregado.');
      // Si es una referencia que aún no se consultaba (p. ej. platino), se trae ya.
      if (deducida && Precios.precioGramo(metal) === null) {
        Precios.actualizar().then(function () { pintarMetales(raiz); });
      }
      if (deducida) Precios.rellenarHistoria();
    });

    // Al cambiar pureza o ajuste se ve el precio que daría, antes de guardar.
    raiz.addEventListener('input', function (e) {
      var k = e.target.getAttribute('data-metal-pureza') || e.target.getAttribute('data-metal-ajuste') || e.target.getAttribute('data-metal');
      if (k) previsualizar(raiz, k);
    });

    UI.$('#guardarConfig', raiz).addEventListener('click', function () {
      var form = UI.leerFormulario(raiz);
      var cfg = Store.datos.config;

      Calc.CALIDADES.forEach(function (q) {
        cfg.precioQuilate[q] = Calc.num(form.precioQuilate[q]);
        cfg.codigoCalidad[q] = (form.codigoCalidad[q] || '').toUpperCase();
        Store.registrarPrecio('esmeralda-' + q, cfg.precioQuilate[q]);
      });

      UI.$$('[data-metal]', raiz).forEach(function (input) {
        var clave = input.getAttribute('data-metal');
        var m = cfg.metales[clave];
        if (!m) return;
        var receta = recetaEnPantalla(raiz, clave);
        if (receta.ref) {
          m.ref = receta.ref; m.pureza = receta.pureza; m.ajuste = receta.ajuste; m.auto = receta.auto;
        }
        m.precioGramo = Calc.num(input.value);
        Store.registrarPrecio(clave, m.precioGramo);
      });
      Precios.aplicar();

      ['manoObra', 'manoObraPorGramo', 'envio', 'empaque', 'publicidad', 'gastosFijosMes', 'margenMeta'].forEach(function (k) {
        cfg[k] = Calc.num(form[k]);
      });
      cfg.margenModo = form.margenModo;

      SVP9.FACTORES.forEach(function (f) {
        cfg.svp9Pesos[f.clave] = Calc.num(form.svp9Pesos[f.clave]);
      });
      cfg.svp9Modo = form.svp9Modo;

      Store.guardar();
      UI.toast('Configuración guardada. Los cambios de precio quedaron registrados en Mercado.');
    });

    UI.$('#probarDrive', raiz).addEventListener('click', function () {
      var boton = this;
      Drive.configurar(UI.$('#driveUrl', raiz).value, UI.$('#driveClave', raiz).value);
      boton.disabled = true;
      boton.textContent = 'Probando…';
      Drive.probar().then(function (r) {
        boton.disabled = false;
        boton.textContent = 'Guardar y probar conexión';
        if (!r.ok) { UI.toast('No se pudo conectar: ' + r.error + '.'); return; }
        UI.toast('Conectado a «' + r.nombre + '». Enviando tus datos…');
        Drive.enviar().then(function (e) {
          if (e.ok) UI.toast(e.enviados ? 'Listo: ' + e.enviados + ' registros quedaron en Drive.' : 'Drive ya estaba al día.');
        });
      });
    });

    UI.$('#enviarDrive', raiz).addEventListener('click', function () {
      if (!Drive.configurado()) { UI.toast('Pega primero el enlace de la aplicación web.'); return; }
      Drive.enviar(true).then(function (e) {
        if (e.ok) UI.toast('Se enviaron ' + e.enviados + ' registros a Drive.');
      });
    });

    UI.$('#exportar', raiz).addEventListener('click', Store.exportar);
    UI.$('#importar', raiz).addEventListener('click', function () { UI.$('#archivoImportar', raiz).click(); });
    UI.$('#archivoImportar', raiz).addEventListener('change', function (e) {
      var archivo = e.target.files[0];
      if (!archivo) return;
      var lector = new FileReader();
      lector.onload = function () {
        try {
          Store.importar(lector.result);
          UI.toast('Respaldo importado.');
          render(raiz);
        } catch (err) {
          UI.toast('El archivo no es un respaldo válido.');
        }
      };
      lector.readAsText(archivo);
    });

    UI.$('#reiniciar', raiz).addEventListener('click', function () {
      if (confirm('Esto borra lotes, piedras, productos e historial. ¿Continuar?')) {
        Store.reiniciar();
        render(raiz);
        UI.toast('Datos borrados.');
      }
    });
  }

  function escapar(s) { return String(s === undefined || s === null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }

  /* La receta de un metal tal como está en pantalla (sin guardar todavía). */
  function recetaEnPantalla(raiz, k) {
    var m = Store.datos.config.metales[k];
    var r = Precios.receta(m);
    var pureza = UI.$('[data-metal-pureza="' + k + '"]', raiz);
    var ajuste = UI.$('[data-metal-ajuste="' + k + '"]', raiz);
    var precio = UI.$('[data-metal="' + k + '"]', raiz);
    return {
      nombre: m.nombre,
      ref: r.ref,
      pureza: pureza ? Calc.num(pureza.value) / 100 : r.pureza,
      ajuste: ajuste ? Calc.num(ajuste.value) : r.ajuste,
      auto: !!r.ref && !UI.esManual(precio)
    };
  }

  function previsualizar(raiz, k) {
    if (!Store.datos.config.metales[k]) return;
    var r = recetaEnPantalla(raiz, k);
    var precio = Precios.precioGramo(r);
    if (r.auto && precio !== null) UI.auto(UI.$('[data-metal="' + k + '"]', raiz), precio);
    var pista = UI.$('[data-pista-metal="' + k + '"]', raiz);
    if (pista) pista.textContent = Precios.describir(r);
  }

  function pintarMetales(raiz) {
    var metales = Store.datos.config.metales;
    var cont = UI.$('#listaMetales', raiz);
    cont.innerHTML = Object.keys(metales).map(function (k) {
      var m = metales[k];
      var r = Precios.receta(m);
      return [
        '<div class="campo">',
        '  <label>' + escapar(m.nombre) + ', precio por gramo</label>',
        '  <div class="fila-campo">',
        '    <input type="number" min="0" step="100" data-metal="' + k + '"' + (r.ref ? ' data-auto' + (r.auto ? '' : ' data-manual="1"') : '') + ' value="' + m.precioGramo + '">',
        '    <button class="boton icono" data-borrar-metal="' + k + '" title="Eliminar">✕</button>',
        '  </div>',
        r.ref ? [
          '  <div class="fila-mini">',
          '    <span>Pureza <input type="number" min="1" max="100" step="0.1" data-metal-pureza="' + k + '" value="' + Math.round(r.pureza * 1000) / 10 + '" aria-label="Pureza de ' + escapar(m.nombre) + ' en %"> %</span>',
          '    <span>Ajuste <input type="number" min="-90" max="200" step="0.5" data-metal-ajuste="' + k + '" value="' + r.ajuste + '" aria-label="Ajuste de ' + escapar(m.nombre) + ' en %"> %</span>',
          '  </div>'
        ].join('') : '',
        '  <span class="pista" data-pista-metal="' + k + '">' + Precios.describir(m) + '</span>',
        '</div>'
      ].join('');
    }).join('');
    UI.armarAutos(raiz, function (input) { previsualizar(raiz, input.getAttribute('data-metal')); });

    UI.$$('[data-borrar-metal]', cont).forEach(function (b) {
      b.addEventListener('click', function () {
        var k = b.getAttribute('data-borrar-metal');
        delete Store.datos.config.metales[k];
        Store.guardar();
        pintarMetales(raiz);
      });
    });
  }

  global.Vistas = global.Vistas || {};
  global.Vistas.configuracion = { titulo: 'Configuración', render: render };
})(window);

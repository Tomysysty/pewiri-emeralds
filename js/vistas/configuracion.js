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
      '  <p class="ayuda">Valor promedio del gramo. El gramaje que ingreses en un producto se multiplica por este valor.</p>',
      '  <div id="listaMetales" class="lista-metales"></div>',
      '  <div class="fila-agregar">',
      '    <input type="text" id="nuevoMetalNombre" placeholder="Nombre del metal (ej. Oro 21k)">',
      '    <input type="number" id="nuevoMetalPrecio" placeholder="Precio por gramo" min="0" step="100">',
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
      '      <select data-campo="margenModo">',
      '        <option value="sobrePrecio"' + (c.margenModo === 'sobrePrecio' ? ' selected' : '') + '>Sobre el precio de venta (precio = costo ÷ (1 − margen))</option>',
      '        <option value="sobreCosto"' + (c.margenModo === 'sobreCosto' ? ' selected' : '') + '>Sobre el costo (precio = costo × (1 + margen))</option>',
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
      '    <select data-campo="svp9Modo">',
      '      <option value="ponderado"' + (c.svp9Modo === 'ponderado' ? ' selected' : '') + '>Promedio ponderado, la suma de los nueve según su peso</option>',
      '      <option value="equilibrado"' + (c.svp9Modo === 'equilibrado' ? ' selected' : '') + '>Índice equilibrado, castiga el factor más débil</option>',
      '    </select>',
      '    <span class="pista">Con promedio, un 2 en Claridad se compensa con dieces en el resto. Con índice equilibrado, no: la piedra baja de nivel.</span>',
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

    UI.$('#agregarMetal', raiz).addEventListener('click', function () {
      var nombre = UI.$('#nuevoMetalNombre', raiz).value.trim();
      var precio = Calc.num(UI.$('#nuevoMetalPrecio', raiz).value);
      if (!nombre) { UI.toast('Ponle nombre al metal.'); return; }
      var clave = nombre.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      Store.datos.config.metales[clave] = { nombre: nombre, precioGramo: precio };
      Store.registrarPrecio(clave, precio);
      Store.guardar();
      UI.$('#nuevoMetalNombre', raiz).value = '';
      UI.$('#nuevoMetalPrecio', raiz).value = '';
      pintarMetales(raiz);
      UI.toast('Metal agregado.');
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
        var valor = Calc.num(input.value);
        if (cfg.metales[clave]) {
          cfg.metales[clave].precioGramo = valor;
          Store.registrarPrecio(clave, valor);
        }
      });

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

  function pintarMetales(raiz) {
    var metales = Store.datos.config.metales;
    var cont = UI.$('#listaMetales', raiz);
    cont.innerHTML = Object.keys(metales).map(function (k) {
      return [
        '<div class="campo">',
        '  <label>' + metales[k].nombre + ', precio por gramo</label>',
        '  <div class="fila-campo">',
        '    <input type="number" min="0" step="100" data-metal="' + k + '" value="' + metales[k].precioGramo + '">',
        '    <button class="boton icono" data-borrar-metal="' + k + '" title="Eliminar">✕</button>',
        '  </div>',
        '</div>'
      ].join('');
    }).join('');

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

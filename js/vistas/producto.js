/* Vista: Producto — joya terminada: piedras + metal + mano de obra + costos + margen. */
(function (global) {
  'use strict';

  var borrador = null;

  function nuevoBorrador() {
    var cfg = Store.datos.config;
    var primerMetal = Object.keys(cfg.metales)[0] || '';
    return {
      id: null,
      nombre: '',
      fecha: Store.hoy(),
      piedras: [{ calidad: 'media', quilates: 1, cantidad: 1 }],
      metal: { tipo: primerMetal, modo: 'gramaje', gramos: 0, precioMercadoGramo: (cfg.metales[primerMetal] || {}).precioGramo || 0, precioCompraGramo: 0, valorManual: 0 },
      manoObra: { modo: 'directo', valor: cfg.manoObra, valorPorGramo: cfg.manoObraPorGramo },
      envio: cfg.envio,
      empaque: cfg.empaque,
      publicidad: cfg.publicidad,
      otros: 0,
      margenModo: cfg.margenModo,
      margen: cfg.margenMeta,
      precioDeseado: 0
    };
  }

  function render(raiz) {
    if (!borrador) borrador = nuevoBorrador();
    var cfg = Store.datos.config;
    var m = borrador.metal;

    raiz.innerHTML = [
      '<div class="encabezado-vista">',
      '  <div><h2>Producto</h2><p class="ayuda">Arma la joya: piedras, metal, mano de obra y gastos. Abajo sale el precio de venta con el margen que quieras.</p></div>',
      '  <div class="fila-botones">',
      '    <button class="boton" id="nuevoProducto">Nuevo producto</button>',
      '    <button class="boton primario" id="guardarProducto">Guardar producto</button>',
      '  </div>',
      '</div>',

      '<div class="dos-columnas">',
      '  <div>',
      '    <section class="tarjeta">',
      '      <h3>Identificación</h3>',
      '      <div class="rejilla-2">',
      '        <div class="campo"><label>Nombre del producto</label><input type="text" data-campo="nombre" value="' + escapar(borrador.nombre) + '" placeholder="Anillo esmeralda oro 18k"></div>',
      '        <div class="campo"><label>Fecha</label><input type="date" data-campo="fecha" value="' + borrador.fecha + '"></div>',
      '      </div>',
      '    </section>',

      '    <section class="tarjeta">',
      '      <h3>Esmeraldas de la pieza</h3>',
      '      <div class="tabla-envoltura">',
      '        <table class="tabla-entrada">',
      '          <thead><tr><th>Calidad</th><th>Quilates c/u</th><th>Cantidad</th><th>Valor</th><th></th></tr></thead>',
      '          <tbody id="filasPiedras"></tbody>',
      '        </table>',
      '      </div>',
      '      <div class="fila-botones">',
      '        <button class="boton" id="agregarPiedra">+ Agregar piedra</button>',
      '        <select id="traerPiedra" class="select-compacto"><option value="">Traer piedra guardada…</option></select>',
      '      </div>',
      '    </section>',

      '    <section class="tarjeta">',
      '      <h3>Metal</h3>',
      '      <div class="rejilla-3">',
      '        <div class="campo"><label>Tipo de metal</label><select data-campo="metal.tipo">',
      Object.keys(cfg.metales).map(function (k) {
        return '<option value="' + k + '"' + (k === m.tipo ? ' selected' : '') + '>' + cfg.metales[k].nombre + '</option>';
      }).join(''),
      '        </select></div>',
      '        <div class="campo"><label>Cómo se calcula</label><select data-campo="metal.modo">',
      '          <option value="gramaje"' + (m.modo === 'gramaje' ? ' selected' : '') + '>Por gramaje</option>',
      '          <option value="valor"' + (m.modo === 'valor' ? ' selected' : '') + '>Ingresar el valor directo</option>',
      '        </select></div>',
      '        <div class="campo"><label>Gramos</label><input type="number" min="0" step="0.1" data-campo="metal.gramos" value="' + m.gramos + '"></div>',
      '        <div class="campo"><label>Precio de mercado por gramo</label><input type="number" min="0" step="100" data-campo="metal.precioMercadoGramo" value="' + m.precioMercadoGramo + '"><span class="pista">Viene de Configuración; puedes ajustarlo aquí.</span></div>',
      '        <div class="campo"><label>Precio al que se compró el gramo</label><input type="number" min="0" step="100" data-campo="metal.precioCompraGramo" value="' + m.precioCompraGramo + '"><span class="pista">Si lo dejas en cero se usa el de mercado.</span></div>',
      '        <div class="campo"><label>Valor del metal (directo)</label><input type="number" min="0" step="1000" data-campo="metal.valorManual" value="' + m.valorManual + '"></div>',
      '      </div>',
      '    </section>',

      '    <section class="tarjeta">',
      '      <h3>Mano de obra y gastos</h3>',
      '      <div class="rejilla-3">',
      '        <div class="campo"><label>Costo del joyero</label><select data-campo="manoObra.modo">',
      '          <option value="directo"' + (borrador.manoObra.modo === 'directo' ? ' selected' : '') + '>Valor por pieza</option>',
      '          <option value="porGramo"' + (borrador.manoObra.modo === 'porGramo' ? ' selected' : '') + '>Por gramo trabajado</option>',
      '        </select></div>',
      '        <div class="campo"><label>Valor por pieza</label><input type="number" min="0" step="1000" data-campo="manoObra.valor" value="' + borrador.manoObra.valor + '"></div>',
      '        <div class="campo"><label>Valor por gramo</label><input type="number" min="0" step="500" data-campo="manoObra.valorPorGramo" value="' + borrador.manoObra.valorPorGramo + '"></div>',
      '        <div class="campo"><label>Envío</label><input type="number" min="0" step="500" data-campo="envio" value="' + borrador.envio + '"></div>',
      '        <div class="campo"><label>Empaque</label><input type="number" min="0" step="500" data-campo="empaque" value="' + borrador.empaque + '"></div>',
      '        <div class="campo"><label>Publicidad</label><input type="number" min="0" step="500" data-campo="publicidad" value="' + borrador.publicidad + '"></div>',
      '        <div class="campo"><label>Otros costos</label><input type="number" min="0" step="500" data-campo="otros" value="' + borrador.otros + '"></div>',
      '      </div>',
      '    </section>',

      '    <section class="tarjeta">',
      '      <h3>Margen</h3>',
      '      <div class="rejilla-3">',
      '        <div class="campo"><label>Tipo de margen</label><select data-campo="margenModo">',
      '          <option value="sobrePrecio"' + (borrador.margenModo === 'sobrePrecio' ? ' selected' : '') + '>Sobre el precio de venta</option>',
      '          <option value="sobreCosto"' + (borrador.margenModo === 'sobreCosto' ? ' selected' : '') + '>Sobre el costo</option>',
      '        </select></div>',
      '        <div class="campo"><label>Margen deseado (%)</label><input type="number" min="0" max="99" step="1" data-campo="margen" value="' + borrador.margen + '"></div>',
      '        <div class="campo"><label>¿Y si lo vendo a…?</label><input type="number" min="0" step="10000" data-campo="precioDeseado" value="' + borrador.precioDeseado + '"><span class="pista">Escribe un precio y abajo verás qué margen te deja.</span></div>',
      '      </div>',
      '    </section>',
      '  </div>',

      '  <div>',
      '    <section class="tarjeta resultado" id="panelProducto"></section>',
      '    <section class="tarjeta"><h3>Productos guardados</h3><div id="listaProductos"></div></section>',
      '  </div>',
      '</div>'
    ].join('');

    pintarPiedras(raiz);
    pintarSelectorPiedras(raiz);

    raiz.addEventListener('input', function (e) { sincronizar(raiz, e); });
    raiz.addEventListener('change', function (e) { sincronizar(raiz, e); });

    UI.$('#agregarPiedra', raiz).addEventListener('click', function () {
      leerBorrador(raiz);
      borrador.piedras.push({ calidad: 'media', quilates: 1, cantidad: 1 });
      pintarPiedras(raiz);
      sincronizar(raiz);
    });

    UI.$('#traerPiedra', raiz).addEventListener('change', function (e) {
      var id = e.target.value;
      if (!id) return;
      var p = Store.datos.piedras.find(function (x) { return x.id === id; });
      if (p) {
        leerBorrador(raiz);
        borrador.piedras.push({ calidad: p.calidad, quilates: p.quilates, cantidad: p.cantidad || 1 });
        pintarPiedras(raiz);
        sincronizar(raiz);
      }
      e.target.value = '';
    });

    UI.$('#nuevoProducto', raiz).addEventListener('click', function () {
      borrador = nuevoBorrador();
      App.recargar();
    });

    UI.$('#guardarProducto', raiz).addEventListener('click', function () {
      leerBorrador(raiz);
      if (!borrador.nombre) borrador.nombre = 'Producto ' + UI.fecha(borrador.fecha);
      if (borrador.id) {
        var i = Store.datos.productos.findIndex(function (p) { return p.id === borrador.id; });
        if (i >= 0) Store.datos.productos[i] = JSON.parse(JSON.stringify(borrador));
      } else {
        borrador.id = Store.id();
        Store.datos.productos.unshift(JSON.parse(JSON.stringify(borrador)));
      }
      Store.guardar();
      pintarLista(raiz);
      UI.toast('Producto guardado.');
    });

    sincronizar(raiz);
    pintarLista(raiz);
  }

  function escapar(s) { return String(s || '').replace(/"/g, '&quot;'); }

  function pintarPiedras(raiz) {
    var cfg = Store.datos.config;
    var cuerpo = UI.$('#filasPiedras', raiz);
    cuerpo.innerHTML = borrador.piedras.map(function (p, i) {
      return [
        '<tr>',
        '  <td><select data-piedra="' + i + '" data-prop="calidad">',
        Calc.CALIDADES.map(function (q) {
          return '<option value="' + q + '"' + (q === p.calidad ? ' selected' : '') + '>' + UI.nombreCalidad(q) + ', ' + UI.cop(cfg.precioQuilate[q]) + '/ct</option>';
        }).join(''),
        '  </select></td>',
        '  <td><input type="number" min="0" step="0.01" data-piedra="' + i + '" data-prop="quilates" value="' + p.quilates + '"></td>',
        '  <td><input type="number" min="1" step="1" data-piedra="' + i + '" data-prop="cantidad" value="' + p.cantidad + '"></td>',
        '  <td class="celda-calculada" data-valor-piedra="' + i + '">—</td>',
        '  <td><button class="boton icono" data-quitar-piedra="' + i + '" title="Quitar">✕</button></td>',
        '</tr>'
      ].join('');
    }).join('') || '<tr><td colspan="5" class="vacio">Sin piedras: la pieza se cotiza solo con metal y mano de obra.</td></tr>';

    UI.$$('[data-quitar-piedra]', cuerpo).forEach(function (b) {
      b.addEventListener('click', function () {
        leerBorrador(raiz);
        borrador.piedras.splice(parseInt(b.getAttribute('data-quitar-piedra'), 10), 1);
        pintarPiedras(raiz);
        sincronizar(raiz);
      });
    });
  }

  function pintarSelectorPiedras(raiz) {
    var sel = UI.$('#traerPiedra', raiz);
    Store.datos.piedras.forEach(function (p) {
      var o = document.createElement('option');
      o.value = p.id;
      o.textContent = p.codigo + ' · ' + UI.nombreCalidad(p.calidad) + ' · ' + UI.numero(p.quilates, 2) + ' ct';
      sel.appendChild(o);
    });
  }

  function leerBorrador(raiz) {
    var f = UI.leerFormulario(raiz);
    borrador.nombre = f.nombre;
    borrador.fecha = f.fecha;
    borrador.metal = {
      tipo: f.metal.tipo,
      modo: f.metal.modo,
      gramos: Calc.num(f.metal.gramos),
      precioMercadoGramo: Calc.num(f.metal.precioMercadoGramo),
      precioCompraGramo: Calc.num(f.metal.precioCompraGramo),
      valorManual: Calc.num(f.metal.valorManual)
    };
    borrador.manoObra = {
      modo: f.manoObra.modo,
      valor: Calc.num(f.manoObra.valor),
      valorPorGramo: Calc.num(f.manoObra.valorPorGramo)
    };
    ['envio', 'empaque', 'publicidad', 'otros', 'margen', 'precioDeseado'].forEach(function (k) {
      borrador[k] = Calc.num(f[k]);
    });
    borrador.margenModo = f.margenModo;

    borrador.piedras = borrador.piedras.map(function (p, i) {
      var fila = {};
      UI.$$('[data-piedra="' + i + '"]', raiz).forEach(function (el) {
        var prop = el.getAttribute('data-prop');
        fila[prop] = prop === 'calidad' ? el.value : Calc.num(el.value);
      });
      return { calidad: fila.calidad || p.calidad, quilates: fila.quilates || 0, cantidad: fila.cantidad || 0 };
    });
  }

  function sincronizar(raiz, evento) {
    // Al cambiar el tipo de metal, trae el precio de mercado de Configuración.
    if (evento && evento.target && evento.target.getAttribute('data-campo') === 'metal.tipo') {
      var def = Store.datos.config.metales[evento.target.value];
      if (def) UI.$('[data-campo="metal.precioMercadoGramo"]', raiz).value = def.precioGramo;
    }

    leerBorrador(raiz);
    var r = Calc.producto(borrador, Store.datos.config);

    r.piedras.forEach(function (p, i) {
      var celda = UI.$('[data-valor-piedra="' + i + '"]', raiz);
      if (celda) celda.textContent = UI.cop(p.valor);
    });

    var inverso = borrador.precioDeseado > 0 ? Calc.margenDesdePrecio(r.costoTotal, borrador.precioDeseado) : null;

    UI.$('#panelProducto', raiz).innerHTML = [
      '<h3>Precio de venta sugerido</h3>',
      '<div class="precio-grande">' + UI.cop(r.precioVenta) + '<span>margen ' + UI.numero(borrador.margen) + ' % ' + (borrador.margenModo === 'sobrePrecio' ? 'sobre el precio' : 'sobre el costo') + '</span></div>',

      '<div class="tabla-envoltura">',
      '<table class="tabla-resultado">',
      '  <thead><tr><th>Concepto</th><th>Valor</th><th>% del costo</th><th>% del precio</th></tr></thead>',
      '  <tbody>',
      r.componentes.map(function (c) {
        return '<tr class="' + (c.valor ? '' : 'tenue') + '"><td>' + c.nombre + '</td><td>' + UI.cop(c.valor) + '</td><td>' + UI.pct(c.pctCosto, 0) + '</td><td>' + UI.pct(c.pctPrecio, 0) + '</td></tr>';
      }).join(''),
      '  </tbody>',
      '  <tfoot>',
      '    <tr><th>Costo total</th><th>' + UI.cop(r.costoTotal) + '</th><th>100 %</th><th>' + UI.pct(r.precioVenta ? r.costoTotal / r.precioVenta : 0, 0) + '</th></tr>',
      '    <tr><th>Utilidad</th><th class="' + UI.claseSigno(r.utilidad) + '">' + UI.cop(r.utilidad) + '</th><th></th><th>' + UI.pct(r.margenSobrePrecio, 0) + '</th></tr>',
      '  </tfoot>',
      '</table>',
      '</div>',

      '<div class="indicadores">',
      '<div class="indicador"><span>Precio de equilibrio</span><strong>' + UI.cop(r.precioEquilibrio) + '</strong></div>',
      '<div class="indicador"><span>Quilates de la pieza</span><strong>' + UI.numero(r.quilatesProducto, 2) + ' ct</strong></div>',
      '<div class="indicador"><span>Retorno sobre costo</span><strong>' + UI.pct(r.margenSobreCosto) + '</strong></div>',
      '</div>',

      '<div class="bloque-metal">',
      '  <h4>Metal: mercado vs. compra</h4>',
      '  <p>' + r.metal.nombre + ' · ' + UI.numero(r.metal.gramos, 2) + ' g<br>',
      '  A precio de mercado: <strong>' + UI.cop(r.metal.valorMercado) + '</strong> · Lo que costó: <strong>' + UI.cop(r.metal.costo) + '</strong><br>',
      '  Diferencia: <strong class="' + UI.claseSigno(r.metal.diferencia) + '">' + UI.cop(r.metal.diferencia) + ' (' + UI.pct(r.metal.diferenciaPct) + ')</strong>',
      r.metal.diferencia > 0 ? '. Compraste por debajo del mercado.' : (r.metal.diferencia < 0 ? '. Pagaste por encima del mercado.' : ''),
      '  </p>',
      '</div>',

      inverso ? [
        '<div class="bloque-equilibrio">',
        '  <h4>Si lo vendes a ' + UI.cop(borrador.precioDeseado) + '</h4>',
        '  <p>Utilidad <strong class="' + UI.claseSigno(inverso.utilidad) + '">' + UI.cop(inverso.utilidad) + '</strong>',
        '  · Margen sobre precio ' + UI.pct(inverso.sobrePrecio) + ' · Sobre costo ' + UI.pct(inverso.sobreCosto) + '</p>',
        '</div>'
      ].join('') : '',

      Store.datos.config.gastosFijosMes > 0 ? [
        '<div class="bloque-equilibrio">',
        '  <h4>Punto de equilibrio del mes</h4>',
        '  <p>Con gastos fijos de ' + UI.cop(Store.datos.config.gastosFijosMes) + ', necesitas vender ',
        '  <strong>' + UI.numero(Math.ceil(r.unidadesEquilibrio)) + '</strong> piezas como esta para cubrirlos.</p>',
        '</div>'
      ].join('') : ''
    ].join('');
  }

  function pintarLista(raiz) {
    var cont = UI.$('#listaProductos', raiz);
    var productos = Store.datos.productos;
    if (!productos.length) { cont.innerHTML = '<p class="vacio">Aún no has guardado productos.</p>'; return; }
    cont.innerHTML = productos.map(function (p) {
      var r = Calc.producto(p, Store.datos.config);
      return [
        '<div class="item-lista">',
        '  <div><strong>' + p.nombre + '</strong><span class="pista">' + UI.fecha(p.fecha) + ' · costo ' + UI.cop(r.costoTotal) + ' · precio ' + UI.cop(r.precioVenta) + '</span></div>',
        '  <div class="fila-botones">',
        '    <button class="boton pequeno" data-cargar="' + p.id + '">Abrir</button>',
        '    <button class="boton pequeno peligro" data-borrar="' + p.id + '">Borrar</button>',
        '  </div>',
        '</div>'
      ].join('');
    }).join('');

    UI.$$('[data-cargar]', cont).forEach(function (b) {
      b.addEventListener('click', function () {
        var p = Store.datos.productos.find(function (x) { return x.id === b.getAttribute('data-cargar'); });
        borrador = JSON.parse(JSON.stringify(p));
        App.recargar();
      });
    });
    UI.$$('[data-borrar]', cont).forEach(function (b) {
      b.addEventListener('click', function () {
        var id = b.getAttribute('data-borrar');
        Store.datos.productos = Store.datos.productos.filter(function (x) { return x.id !== id; });
        Store.guardar();
        pintarLista(raiz);
      });
    });
  }

  global.Vistas = global.Vistas || {};
  global.Vistas.producto = { titulo: 'Producto', render: render };
})(window);

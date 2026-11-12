/* Vista: Producto — joya terminada: piedras + metal + mano de obra + costos + margen.
   Las piedras salen del inventario (no se puede usar más de las que hay) y
   casi todo lo demás se calcula solo, pero se puede escribir encima. */
(function (global) {
  'use strict';

  var borrador = null;

  var TIPOS_PIEZA = ['Anillo', 'Aretes', 'Topos', 'Dije', 'Collar', 'Gargantilla', 'Pulsera', 'Broche'];
  var COSTOS_FRECUENTES = ['Certificado gemológico', 'Engaste', 'Baño de rodio', 'Grabado', 'Estuche especial', 'Comisión'];

  function nuevoBorrador() {
    var cfg = Store.datos.config;
    var primerMetal = Object.keys(cfg.metales)[0] || '';
    return {
      id: null,
      nombre: '',
      tipoPieza: '',
      fecha: Store.hoy(),
      cantidad: 1,
      piedras: [],
      metal: { tipo: primerMetal, modo: 'gramaje', gramos: 0, precioMercadoGramo: (cfg.metales[primerMetal] || {}).precioGramo || 0, precioCompraGramo: 0, valorManual: 0 },
      manoObra: { modo: 'directo', cobro: 'pieza', valor: cfg.manoObra, valorPorGramo: cfg.manoObraPorGramo },
      envio: cfg.envio,
      empaque: cfg.empaque,
      publicidad: cfg.publicidad,
      otros: 0,
      otrosCostos: [],
      margenModo: cfg.margenModo,
      margen: cfg.margenMeta,
      precioDeseado: 0,
      manuales: {}
    };
  }

  /* Productos guardados antes de los campos automáticos: se deduce qué
     escribió la dueña a mano para no pisárselo. */
  function normalizar(p) {
    var cfg = Store.datos.config;
    p.piedras = p.piedras || [];
    p.cantidad = Inventario.piezas(p);
    p.manoObra = p.manoObra || { modo: 'directo', valor: cfg.manoObra, valorPorGramo: cfg.manoObraPorGramo };
    if (!p.manuales) {
      var def = cfg.metales[(p.metal || {}).tipo] || {};
      p.manuales = {
        nombre: !!p.nombre,
        precioMercadoGramo: Calc.num((p.metal || {}).precioMercadoGramo) !== Calc.num(def.precioGramo),
        manoObra: p.manoObra.modo !== 'porGramo' && Calc.num(p.manoObra.valor) !== Calc.num(cfg.manoObra)
      };
    }
    if (!p.manoObra.cobro) p.manoObra.cobro = p.manoObra.modo === 'porGramo' ? 'gramo' : 'pieza';
    // Antes había un solo campo "Otros costos": pasa a ser la primera línea.
    p.otrosCostos = p.otrosCostos || [];
    if (Calc.num(p.otros) > 0) {
      p.otrosCostos.unshift({ concepto: 'Otros costos', valor: Calc.num(p.otros) });
      p.otros = 0;
    }
    return p;
  }

  /* El borrador vive mientras se navega: si el producto se vendió o se borró
     desde otra pestaña, se trae su estado actual. */
  function refrescarEstado() {
    if (!borrador.id) return;
    var guardado = Inventario.buscarProducto(borrador.id);
    if (!guardado) { borrador.id = null; delete borrador.vendido; return; }
    ['vendido', 'comprador', 'ventaId', 'fechaVenta'].forEach(function (k) {
      if (guardado[k] === undefined) delete borrador[k]; else borrador[k] = guardado[k];
    });
  }

  function render(raiz) {
    if (!borrador) borrador = nuevoBorrador();
    refrescarEstado();
    normalizar(borrador);
    var cfg = Store.datos.config;
    var m = borrador.metal;
    var man = borrador.manuales;
    var ep = Inventario.estadoProducto(borrador);
    var parcial = ep.vendidas > 0 && !borrador.vendido;

    raiz.innerHTML = [
      '<div class="encabezado-vista">',
      '  <div><h2>Producto</h2><p class="ayuda">Arma la joya con piedras del inventario, metal, mano de obra y gastos. Los campos con fondo menta se calculan solos; si escribes encima, manda lo tuyo.</p></div>',
      '  <div class="fila-botones">',
      '    <button class="boton" id="nuevoProducto">Nuevo producto</button>',
      '    <button class="boton primario" id="guardarProducto">' + (borrador.vendido ? 'Guardar como nuevo' : 'Guardar producto') + '</button>',
      '  </div>',
      '</div>',

      borrador.vendido ? [
        '<div class="bloque-equilibrio" style="margin-bottom:1.2rem">',
        '  <h4>' + (ep.total > 1 ? 'Ya se vendieron las ' + ep.total + ' piezas' : 'Este producto ya se vendió') + '</h4>',
        '  <p>Vendido' + (ep.compradores.length === 1 ? ' a <strong>' + escapar(ep.compradores[0]) + '</strong>' : (ep.compradores.length > 1 ? ' a ' + escapar(ep.compradores.join(', ')) : '')) +
          (ep.ventas.length === 1 && borrador.fechaVenta ? ' el ' + UI.fecha(borrador.fechaVenta) : '') + '. ',
        '  La venta no cambia. Si guardas, se crea un producto nuevo parecido (necesita piedras disponibles).</p>',
        '</div>'
      ].join('') : '',

      parcial ? [
        '<div class="bloque-equilibrio" style="margin-bottom:1.2rem">',
        '  <h4>Se han vendido ' + ep.vendidas + ' de ' + ep.total + ' piezas</h4>',
        '  <p>Quedan ' + ep.disponibles + ' por vender. Si agregas piezas, las piedras se apartan del inventario; no puedes bajar de ' + ep.vendidas + ' piezas.</p>',
        '</div>'
      ].join('') : '',

      '<div class="dos-columnas">',
      '  <div>',
      '    <section class="tarjeta">',
      '      <h3>Identificación</h3>',
      '      <div class="rejilla-2">',
      '        <div class="campo campo-completo"><label>Tipo de pieza</label><input type="text" data-campo="tipoPieza" value="' + escapar(borrador.tipoPieza) + '" placeholder="Toca uno o escribe otro">',
      '          <div class="segmentos compactos" id="chipsPieza" role="radiogroup" aria-label="Tipos de pieza frecuentes">' + TIPOS_PIEZA.map(function (t) {
        return '<button type="button" class="segmento" role="radio" data-pieza="' + t + '">' + t + '</button>';
      }).join('') + '</div></div>',
      '        <div class="campo"><label>Nombre del producto</label><input type="text" data-campo="nombre" data-auto' + (man.nombre ? ' data-manual="1"' : '') + ' value="' + escapar(borrador.nombre) + '"><span class="pista">Se arma con el tipo, las piedras y el metal.</span></div>',
      '        <div class="campo"><label>Fecha</label><input type="date" data-campo="fecha" value="' + borrador.fecha + '"></div>',
      '        <div class="campo"><label>Piezas iguales</label><input type="number" min="' + Math.max(1, ep.vendidas) + '" step="1" data-campo="cantidad" value="' + borrador.cantidad + '"><span class="pista" id="pistaPiezas"></span></div>',
      '        <div class="campo campo-completo"><label>Venta</label><select id="estadoVenta" data-segmentos>',
      '          <option value="no" data-icono="anillo" data-sub="' + escapar(borrador.vendido
        ? 'deshacer la última venta'
        : (parcial ? ep.disponibles + ' de ' + ep.total + ' por vender' : (ep.total > 1 ? ep.total + ' piezas por vender' : 'disponible para vender'))) + '"' + (borrador.vendido ? '' : ' selected') + '>' + (parcial ? 'Quedan por vender' : 'No vendido') + '</option>',
      '          <option value="si" data-icono="pagado" data-sub="' + escapar(borrador.vendido
        ? (ep.ventas.length > 1 ? ep.ventas.length + ' ventas · ' + ep.compradores.join(', ') : 'a ' + (borrador.comprador || 'comprador sin nombre') + (borrador.fechaVenta ? ' · ' + UI.fecha(borrador.fechaVenta) : ''))
        : (parcial ? 'vender más piezas' : 'registra comprador y pago')) + '"' + (borrador.vendido ? ' selected' : '') + '>Vendido</option>',
      '        </select></div>',
      '      </div>',
      '    </section>',

      '    <section class="tarjeta">',
      '      <h3>Esmeraldas de la pieza</h3>',
      '      <div class="tabla-envoltura">',
      '        <table class="tabla-entrada">',
      '          <thead><tr><th>Piedra</th><th>Quilates c/u</th><th>Por pieza</th><th>Valor</th><th></th></tr></thead>',
      '          <tbody id="filasPiedras"></tbody>',
      '        </table>',
      '      </div>',
      '      <div class="fila-botones">',
      '        <select id="traerPiedra" class="select-compacto"><option value="">+ Agregar piedra del inventario…</option></select>',
      '        <button class="boton" id="agregarPiedra" title="Para cotizar una piedra que todavía no tienes">+ Cotizar piedra sin inventario</button>',
      '      </div>',
      '    </section>',

      '    <section class="tarjeta">',
      '      <h3>Metal</h3>',
      '      <div class="rejilla-3">',
      '        <div class="campo campo-completo"><label>Tipo de metal</label><select data-campo="metal.tipo" data-segmentos>',
      Object.keys(cfg.metales).map(function (k) {
        return '<option value="' + k + '" data-sub="' + UI.cop(cfg.metales[k].precioGramo) + '/g"' + (k === m.tipo ? ' selected' : '') + '>' + escapar(cfg.metales[k].nombre) + '</option>';
      }).join(''),
      '        </select></div>',
      '        <div class="campo"><label>Gramos</label><input type="number" min="0" step="0.1" data-campo="metal.gramos" value="' + m.gramos + '"></div>',
      '        <div class="campo"><label>Precio de mercado por gramo</label><input type="number" min="0" step="100" data-campo="metal.precioMercadoGramo" data-auto' + (man.precioMercadoGramo ? ' data-manual="1"' : '') + ' value="' + m.precioMercadoGramo + '"><span class="pista">Viene de Configuración.</span></div>',
      '        <div class="campo"><label>Precio al que se compró el gramo</label><input type="number" min="0" step="100" data-campo="metal.precioCompraGramo" value="' + m.precioCompraGramo + '"><span class="pista">Si lo dejas en cero se usa el de mercado.</span></div>',
      '        <div class="campo"><label>Valor del metal</label><input type="number" min="0" step="1000" data-campo="metal.valorManual" data-auto' + (m.modo === 'valor' ? ' data-manual="1"' : '') + ' value="' + m.valorManual + '"><span class="pista">Gramos × precio del gramo.</span></div>',
      '      </div>',
      '    </section>',

      '    <section class="tarjeta">',
      '      <h3>Mano de obra y gastos</h3>',
      '      <div class="rejilla-3">',
      '        <div class="campo campo-completo"><label>Cómo cobra el joyero</label><select data-campo="manoObra.cobro" data-segmentos>',
      '          <option value="pieza" data-sub="valor fijo por joya"' + (borrador.manoObra.cobro === 'pieza' ? ' selected' : '') + '>Por pieza</option>',
      '          <option value="gramo" data-sub="según el metal trabajado"' + (borrador.manoObra.cobro === 'gramo' ? ' selected' : '') + '>Por gramo</option>',
      '        </select></div>',
      '        <div class="campo"><label>Valor por gramo</label><input type="number" min="0" step="500" data-campo="manoObra.valorPorGramo" value="' + borrador.manoObra.valorPorGramo + '"></div>',
      '        <div class="campo"><label>Mano de obra</label><input type="number" min="0" step="1000" data-campo="manoObra.valor" data-auto' + (man.manoObra ? ' data-manual="1"' : '') + ' value="' + borrador.manoObra.valor + '"><span class="pista" id="pistaManoObra"></span></div>',
      '        <div class="campo"><label>Envío</label><input type="number" min="0" step="500" data-campo="envio" value="' + borrador.envio + '"></div>',
      '        <div class="campo"><label>Empaque</label><input type="number" min="0" step="500" data-campo="empaque" value="' + borrador.empaque + '"></div>',
      '        <div class="campo"><label>Publicidad</label><input type="number" min="0" step="500" data-campo="publicidad" value="' + borrador.publicidad + '"></div>',
      '      </div>',

      '      <div class="subseccion">',
      '        <h4>Otros costos</h4>',
      '        <p class="pista" style="margin:0 0 .7rem">Certificado, engaste, grabado… cada uno aparece aparte en el desglose del precio.</p>',
      '        <div id="filasCostos"></div>',
      '        <div class="segmentos compactos" aria-label="Agregar un costo frecuente">' + COSTOS_FRECUENTES.map(function (c) {
        return '<button type="button" class="segmento" data-costo-frecuente="' + c + '">+ ' + c + '</button>';
      }).join('') + '<button type="button" class="segmento" data-costo-frecuente="">+ Otro costo</button></div>',
      '      </div>',
      '    </section>',

      '    <section class="tarjeta">',
      '      <h3>Margen y precio</h3>',
      '      <div class="rejilla-3">',
      '        <div class="campo campo-completo"><label>Tipo de margen</label><select data-campo="margenModo" data-segmentos>',
      '          <option value="sobrePrecio" data-sub="precio = costo ÷ (1 − margen)"' + (borrador.margenModo === 'sobrePrecio' ? ' selected' : '') + '>Sobre el precio de venta</option>',
      '          <option value="sobreCosto" data-sub="precio = costo × (1 + margen)"' + (borrador.margenModo === 'sobreCosto' ? ' selected' : '') + '>Sobre el costo</option>',
      '        </select></div>',
      '        <div class="campo"><label>Margen deseado (%)</label><input type="number" min="0" max="99" step="1" data-campo="margen" value="' + borrador.margen + '"></div>',
      '        <div class="campo"><label>Precio de venta</label><input type="number" min="0" step="10000" data-campo="precioDeseado" data-auto' + (borrador.precioDeseado > 0 ? ' data-manual="1"' : '') + ' value="' + borrador.precioDeseado + '"><span class="pista">Sale del margen. Si escribes otro precio, abajo ves qué margen te deja.</span></div>',
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
    pintarCostos(raiz);

    UI.segmentar(raiz);
    UI.armarAutos(raiz, function () { sincronizar(raiz); });

    // Atajos: un toque pone el tipo de pieza o agrega un costo frecuente.
    UI.$$('[data-pieza]', raiz).forEach(function (b) {
      b.addEventListener('click', function () {
        var input = UI.$('[data-campo="tipoPieza"]', raiz);
        input.value = b.getAttribute('data-pieza');
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });
    });
    UI.$$('[data-costo-frecuente]', raiz).forEach(function (b) {
      b.addEventListener('click', function () {
        leerBorrador(raiz);
        var concepto = b.getAttribute('data-costo-frecuente');
        borrador.otrosCostos.push({ concepto: concepto, valor: 0 });
        pintarCostos(raiz);
        sincronizar(raiz);
        var i = borrador.otrosCostos.length - 1;
        var foco = UI.$('[data-costo="' + i + '"][data-prop="' + (concepto ? 'valor' : 'concepto') + '"]', raiz);
        if (foco) { foco.focus(); if (foco.select) foco.select(); }
      });
    });
    raiz.addEventListener('input', function (e) { sincronizar(raiz, e); });
    raiz.addEventListener('change', function (e) {
      if (e.target.id === 'traerPiedra') return;
      if (e.target.id === 'estadoVenta') { cambiarEstadoVenta(raiz, e.target.value); return; }
      sincronizar(raiz, e);
    });

    UI.$('#agregarPiedra', raiz).addEventListener('click', function () {
      leerBorrador(raiz);
      borrador.piedras.push({ calidad: 'media', quilates: 1, cantidad: 1 });
      pintarPiedras(raiz);
      sincronizar(raiz);
    });

    UI.$('#traerPiedra', raiz).addEventListener('change', function (e) {
      var id = e.target.value;
      e.target.value = '';
      if (!id) return;
      var p = Inventario.buscarPiedra(id);
      if (!p) return;
      leerBorrador(raiz);
      var maximo = porPieza(Inventario.disponibles(p, excluido()));
      var fila = borrador.piedras.find(function (x) { return x.piedraId === id; });
      if (fila) {
        if (fila.cantidad >= maximo) { UI.toast('Con ' + borrador.cantidad + ' pieza' + (borrador.cantidad === 1 ? '' : 's') + ', de ' + p.codigo + ' alcanzan ' + maximo + ' por pieza.'); return; }
        fila.cantidad += 1;
      } else {
        borrador.piedras.push({ piedraId: p.id, codigo: p.codigo, calidad: p.calidad, quilates: p.quilates, cantidad: 1 });
      }
      pintarPiedras(raiz);
      pintarSelectorPiedras(raiz);
      sincronizar(raiz);
    });

    UI.$('#nuevoProducto', raiz).addEventListener('click', function () {
      borrador = nuevoBorrador();
      App.recargar();
    });

    UI.$('#guardarProducto', raiz).addEventListener('click', function () { guardar(raiz); });

    sincronizar(raiz);
    pintarLista(raiz);
  }

  function escapar(s) { return String(s === undefined || s === null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }

  /* Al medir existencias se descuenta lo que ya usa este mismo producto…
     salvo que esté vendido: esas piedras ya salieron y no vuelven. */
  function excluido() { return borrador.vendido ? null : borrador.id; }

  /* La tabla de piedras es por pieza: de las que hay, cuántas caben en cada
     una de las piezas iguales. */
  function porPieza(hay) { return Math.floor(hay / Math.max(1, borrador.cantidad)); }

  function guardar(raiz) {
    refrescarEstado();
    sincronizar(raiz);
    var copia = JSON.parse(JSON.stringify(borrador));

    // Un producto vendido no se toca: se guarda uno nuevo parecido.
    if (copia.vendido) {
      copia.id = null;
      delete copia.vendido; delete copia.comprador; delete copia.ventaId; delete copia.fechaVenta;
      copia.fecha = Store.hoy();
    }

    // No se pueden vender menos piezas de las que ya se vendieron.
    var vendidas = copia.id ? Inventario.estadoProducto(copia).vendidas : 0;
    if (copia.cantidad < vendidas) {
      UI.toast('Ya se vendieron ' + vendidas + ' piezas: el producto no puede tener menos.');
      return false;
    }

    // No se pueden montar más piedras de las que hay: por pieza × piezas.
    for (var i = 0; i < copia.piedras.length; i++) {
      var fila = copia.piedras[i];
      if (!fila.piedraId) continue;
      var p = Inventario.buscarPiedra(fila.piedraId);
      if (!p) continue; // la piedra se borró del inventario: la fila queda como cotización
      var hay = Inventario.disponibles(p, copia.id);
      var necesita = fila.cantidad * copia.cantidad;
      if (necesita > hay) {
        UI.toast(!hay ? 'La piedra ' + p.codigo + ' ya no está disponible. Quítala del producto.'
          : (copia.cantidad > 1 ? 'Para ' + copia.cantidad + ' piezas hacen falta ' + necesita + ' de ' + p.codigo + ' y solo quedan ' + hay + '.' : 'De ' + p.codigo + ' solo quedan ' + hay + '.'));
        return false;
      }
    }

    if (!copia.nombre) copia.nombre = 'Producto ' + UI.fecha(copia.fecha);
    if (!copia.manuales.nombre) copia.nombre = nombreUnico(copia.nombre, copia.id);

    var idx = copia.id ? Store.datos.productos.findIndex(function (x) { return x.id === copia.id; }) : -1;
    if (idx >= 0) {
      Store.datos.productos[idx] = copia;
    } else {
      copia.id = Store.id();
      Store.datos.productos.unshift(copia);
    }
    Store.guardar();
    var eraVendido = borrador.vendido;
    borrador = JSON.parse(JSON.stringify(copia));
    if (eraVendido) { App.recargar(); UI.toast('Se guardó como producto nuevo.'); return true; }
    UI.$('[data-campo="nombre"]', raiz).value = copia.nombre;
    pintarPiedras(raiz);
    pintarSelectorPiedras(raiz);
    sincronizar(raiz);
    pintarLista(raiz);
    UI.toast('Producto guardado. Sus piedras quedaron apartadas del inventario.');
    return true;
  }

  /* Selector Vendido / No vendido. Marcar "Vendido" lleva a registrar la
     venta (comprador, piezas y pago quedan en el historial); volver a "No
     vendido" deshace la venta más reciente. Así el producto y el historial
     siempre coinciden. */
  function cambiarEstadoVenta(raiz, valor) {
    var selector = UI.$('#estadoVenta', raiz);
    var volver = function (v) { selector.value = v; UI.segmentar(raiz); };

    if (valor === 'si' && !borrador.vendido) {
      if (!guardar(raiz)) { volver('no'); return; }
      Vistas.venta.prepararVenta('producto', borrador.id);
      App.mostrar('venta');
      UI.toast('Escribe el comprador y cómo pagó, y registra la venta.');
      return;
    }
    if (valor === 'no' && borrador.vendido) {
      var venta = Inventario.ventasDeProducto(borrador)[0];
      var cuantas = venta && venta.cantidad > 1 ? venta.cantidad + ' piezas de ' : '';
      var aQuien = venta && venta.comprador ? ' a ' + venta.comprador : '';
      if (!confirm('¿Deshacer la venta de ' + cuantas + '«' + borrador.nombre + '»' + aQuien + '? Se borra del historial de ventas y esas piezas vuelven a estar disponibles.')) { volver('si'); return; }
      if (venta) {
        Vistas.venta.borrarVenta(venta.id);
      } else {
        // Marcado como vendido sin venta registrada (datos viejos).
        var p = Inventario.buscarProducto(borrador.id);
        if (p) { p.vendido = false; delete p.comprador; delete p.ventaId; delete p.fechaVenta; Store.guardar(); }
      }
      App.recargar();
      UI.toast('Venta deshecha: «' + borrador.nombre + '» está disponible otra vez.');
    }
  }

  /* Dos productos automáticos con la misma receta no deben llamarse igual. */
  function nombreUnico(nombre, id) {
    var usados = Store.datos.productos.filter(function (p) { return p.id !== id; }).map(function (p) { return p.nombre; });
    if (usados.indexOf(nombre) < 0) return nombre;
    var n = 2;
    while (usados.indexOf(nombre + ' (' + n + ')') >= 0) n++;
    return nombre + ' (' + n + ')';
  }

  function nombreSugerido(r) {
    var cfg = Store.datos.config;
    var partes = [borrador.tipoPieza ? borrador.tipoPieza.charAt(0).toUpperCase() + borrador.tipoPieza.slice(1) : 'Joya'];
    if (r.piedras.length) {
      var principal = r.piedras.slice().sort(function (a, b) { return b.valor - a.valor; })[0];
      var cuantas = r.piedras.reduce(function (a, p) { return a + p.cantidad; }, 0);
      partes.push((cuantas > 1 ? 'esmeraldas ' : 'esmeralda ') + UI.nombreCalidad(principal.calidad).toLowerCase() + ' ' + UI.numero(r.quilatesProducto, 2) + ' ct');
    }
    var metal = cfg.metales[borrador.metal.tipo];
    var nombre = partes.join(' ');
    if (metal && borrador.metal.gramos > 0) nombre += ' · ' + metal.nombre;
    return nombre;
  }

  function pintarPiedras(raiz) {
    var cfg = Store.datos.config;
    var cuerpo = UI.$('#filasPiedras', raiz);
    cuerpo.innerHTML = borrador.piedras.map(function (p, i) {
      var enInventario = p.piedraId ? Inventario.buscarPiedra(p.piedraId) : null;
      if (enInventario) {
        var maximo = porPieza(Inventario.disponibles(enInventario, excluido()));
        return [
          '<tr>',
          '  <td><span class="etiqueta-calidad ' + p.calidad + '">' + escapar(p.codigo || enInventario.codigo) + '</span> ' + UI.nombreCalidad(p.calidad) + '</td>',
          '  <td><input type="number" readonly tabindex="-1" value="' + p.quilates + '" title="Viene del inventario"></td>',
          '  <td><input type="number" min="1" max="' + Math.max(1, maximo) + '" step="1" data-piedra="' + i + '" data-prop="cantidad" value="' + p.cantidad + '"><span class="de-cuantas">de ' + maximo + '</span></td>',
          '  <td class="celda-calculada" data-valor-piedra="' + i + '">—</td>',
          '  <td><button class="boton icono" data-quitar-piedra="' + i + '" title="Quitar (vuelve al inventario)">✕</button></td>',
          '</tr>'
        ].join('');
      }
      return [
        '<tr>',
        '  <td><select data-piedra="' + i + '" data-prop="calidad" title="Piedra a cotizar, no está en el inventario">',
        Calc.CALIDADES.map(function (q) {
          return '<option value="' + q + '"' + (q === p.calidad ? ' selected' : '') + '>' + UI.nombreCalidad(q) + ', ' + UI.cop(cfg.precioQuilate[q]) + '/ct</option>';
        }).join(''),
        '  </select></td>',
        '  <td><input type="number" min="0" step="0.01" data-piedra="' + i + '" data-prop="quilates" value="' + p.quilates + '"></td>',
        '  <td><input type="number" min="1" step="1" data-piedra="' + i + '" data-prop="cantidad" value="' + p.cantidad + '"><span class="de-cuantas">cotiz.</span></td>',
        '  <td class="celda-calculada" data-valor-piedra="' + i + '">—</td>',
        '  <td><button class="boton icono" data-quitar-piedra="' + i + '" title="Quitar">✕</button></td>',
        '</tr>'
      ].join('');
    }).join('') || '<tr><td colspan="5" class="vacio">Sin piedras: agrega del inventario, o la pieza se cotiza solo con metal y mano de obra.</td></tr>';

    UI.$$('[data-quitar-piedra]', cuerpo).forEach(function (b) {
      b.addEventListener('click', function () {
        leerBorrador(raiz);
        borrador.piedras.splice(parseInt(b.getAttribute('data-quitar-piedra'), 10), 1);
        pintarPiedras(raiz);
        pintarSelectorPiedras(raiz);
        sincronizar(raiz);
      });
    });
  }

  function pintarCostos(raiz) {
    var cont = UI.$('#filasCostos', raiz);
    cont.innerHTML = borrador.otrosCostos.map(function (c, i) {
      return [
        '<div class="fila-costo">',
        '  <input type="text" data-costo="' + i + '" data-prop="concepto" value="' + escapar(c.concepto) + '" placeholder="Concepto" aria-label="Concepto">',
        '  <input type="number" min="0" step="1000" data-costo="' + i + '" data-prop="valor" value="' + Calc.num(c.valor) + '" aria-label="Valor">',
        '  <button class="boton icono" data-quitar-costo="' + i + '" title="Quitar">✕</button>',
        '</div>'
      ].join('');
    }).join('');

    UI.$$('[data-quitar-costo]', cont).forEach(function (b) {
      b.addEventListener('click', function () {
        leerBorrador(raiz);
        borrador.otrosCostos.splice(parseInt(b.getAttribute('data-quitar-costo'), 10), 1);
        pintarCostos(raiz);
        sincronizar(raiz);
      });
    });
  }

  /* Solo las piedras con existencias, descontando las que ya van en este
     producto. Con varias piezas, una piedra más por pieza necesita una por
     cada pieza. */
  function pintarSelectorPiedras(raiz) {
    var sel = UI.$('#traerPiedra', raiz);
    var piezas = Math.max(1, borrador.cantidad);
    var usadasAqui = {};
    borrador.piedras.forEach(function (f) { if (f.piedraId) usadasAqui[f.piedraId] = (usadasAqui[f.piedraId] || 0) + f.cantidad * piezas; });
    var opciones = Store.datos.piedras.map(function (p) {
      return { p: p, quedan: Inventario.disponibles(p, excluido()) - (usadasAqui[p.id] || 0) };
    }).filter(function (x) { return x.quedan >= piezas; });

    sel.innerHTML = '<option value="">' + (opciones.length ? '+ Agregar piedra del inventario…' : 'No hay piedras disponibles') + '</option>';
    opciones.forEach(function (x) {
      var o = document.createElement('option');
      o.value = x.p.id;
      o.textContent = x.p.codigo + ' · ' + UI.nombreCalidad(x.p.calidad) + ' · ' + UI.numero(x.p.quilates, 2) + ' ct · ' + x.quedan + ' disp.';
      sel.appendChild(o);
    });
    sel.disabled = !opciones.length;
  }

  function leerBorrador(raiz) {
    var f = UI.leerFormulario(raiz);
    borrador.nombre = (f.nombre || '').trim();
    borrador.tipoPieza = (f.tipoPieza || '').trim();
    borrador.fecha = f.fecha;
    borrador.cantidad = Math.max(1, Math.round(Calc.num(f.cantidad) || 1));

    var valorMetal = UI.$('[data-campo="metal.valorManual"]', raiz);
    borrador.metal = {
      tipo: f.metal.tipo,
      // Si la dueña escribió el valor, manda ese; si no, gramos × precio.
      modo: UI.esManual(valorMetal) ? 'valor' : 'gramaje',
      gramos: Calc.num(f.metal.gramos),
      precioMercadoGramo: Calc.num(f.metal.precioMercadoGramo),
      precioCompraGramo: Calc.num(f.metal.precioCompraGramo),
      valorManual: Calc.num(f.metal.valorManual)
    };
    // El campo "Mano de obra" siempre tiene el valor que se cobra (calculado o
    // escrito), así que para el cálculo es un valor directo.
    borrador.manoObra = {
      modo: 'directo',
      cobro: f.manoObra.cobro,
      valor: Calc.num(f.manoObra.valor),
      valorPorGramo: Calc.num(f.manoObra.valorPorGramo)
    };
    ['envio', 'empaque', 'publicidad', 'margen'].forEach(function (k) {
      borrador[k] = Calc.num(f[k]);
    });
    borrador.otros = 0;
    borrador.otrosCostos = borrador.otrosCostos.map(function (c, i) {
      var concepto = UI.$('[data-costo="' + i + '"][data-prop="concepto"]', raiz);
      var valor = UI.$('[data-costo="' + i + '"][data-prop="valor"]', raiz);
      return {
        concepto: concepto ? concepto.value.trim() : c.concepto,
        valor: valor ? Calc.num(valor.value) : Calc.num(c.valor)
      };
    });
    borrador.margenModo = f.margenModo;
    borrador.precioDeseado = UI.esManual(UI.$('[data-campo="precioDeseado"]', raiz)) ? Calc.num(f.precioDeseado) : 0;
    borrador.manuales = {
      nombre: UI.esManual(UI.$('[data-campo="nombre"]', raiz)),
      precioMercadoGramo: UI.esManual(UI.$('[data-campo="metal.precioMercadoGramo"]', raiz)),
      manoObra: UI.esManual(UI.$('[data-campo="manoObra.valor"]', raiz))
    };

    borrador.piedras = borrador.piedras.map(function (p, i) {
      var fila = {};
      UI.$$('[data-piedra="' + i + '"]', raiz).forEach(function (el) {
        var prop = el.getAttribute('data-prop');
        fila[prop] = prop === 'calidad' ? el.value : Calc.num(el.value);
      });
      var out = {
        calidad: fila.calidad || p.calidad,
        quilates: fila.quilates === undefined ? p.quilates : fila.quilates,
        cantidad: Math.max(0, Math.round(fila.cantidad === undefined ? p.cantidad : fila.cantidad))
      };
      if (p.piedraId) { out.piedraId = p.piedraId; out.codigo = p.codigo; }
      return out;
    });
  }

  /* Lo que se calcula solo. Cada valor se escribe únicamente si su campo
     sigue en automático. */
  function rellenarAutomaticos(raiz, evento) {
    var cfg = Store.datos.config;
    var campo = function (c) { return UI.$('[data-campo="' + c + '"]', raiz); };

    // Otro metal: su precio de mercado vuelve a ser el de Configuración.
    var precioGramo = campo('metal.precioMercadoGramo');
    if (evento && evento.target === campo('metal.tipo')) UI.marcarManual(precioGramo, false);
    var def = cfg.metales[borrador.metal.tipo];
    if (def) UI.auto(precioGramo, def.precioGramo);

    var precio = Calc.num(campo('metal.precioCompraGramo').value) || Calc.num(precioGramo.value);
    UI.auto(campo('metal.valorManual'), Math.round(borrador.metal.gramos * precio));

    var porGramo = borrador.manoObra.cobro === 'gramo';
    UI.auto(campo('manoObra.valor'), porGramo ? Math.round(borrador.metal.gramos * borrador.manoObra.valorPorGramo) : cfg.manoObra);
    var pista = UI.$('#pistaManoObra', raiz);
    if (pista) pista.textContent = porGramo
      ? UI.numero(borrador.metal.gramos, 2) + ' g × ' + UI.cop(borrador.manoObra.valorPorGramo)
      : 'Valor estándar de Configuración.';

    if (borrador.vendido) return;
    var inputPiezas = campo('cantidad');
    var vendidas = Inventario.estadoProducto(borrador).vendidas;

    // Piezas: no menos de las ya vendidas, ni más de las que alcanzan las piedras.
    if (evento && evento.target === inputPiezas) {
      var alcanzan = Infinity, limita = null;
      borrador.piedras.forEach(function (f) {
        if (!f.piedraId || !f.cantidad) return;
        var p = Inventario.buscarPiedra(f.piedraId);
        if (!p) return;
        var n = Math.floor(Inventario.disponibles(p, excluido()) / f.cantidad);
        if (n < alcanzan) { alcanzan = n; limita = p; }
      });
      if (borrador.cantidad > alcanzan) {
        inputPiezas.value = Math.max(1, alcanzan);
        UI.toast('Con las ' + limita.codigo + ' disponibles alcanza para ' + alcanzan + ' pieza' + (alcanzan === 1 ? '' : 's') + '.');
      }
    }
    if (borrador.cantidad < vendidas) {
      inputPiezas.value = vendidas;
      UI.toast('Ya se vendieron ' + vendidas + ' piezas: no puede haber menos.');
    }
    borrador.cantidad = Math.max(1, Math.round(Calc.num(inputPiezas.value) || 1));

    // Piedras por pieza: nunca más de las que hay para todas las piezas.
    borrador.piedras.forEach(function (f, i) {
      if (!f.piedraId) return;
      var p = Inventario.buscarPiedra(f.piedraId);
      if (!p) return;
      var maximo = porPieza(Inventario.disponibles(p, excluido()));
      if (f.cantidad > maximo) {
        var input = UI.$('[data-piedra="' + i + '"][data-prop="cantidad"]', raiz);
        if (input) input.value = maximo;
        UI.toast(borrador.cantidad > 1
          ? 'Para ' + borrador.cantidad + ' piezas, de ' + p.codigo + ' alcanzan ' + maximo + ' por pieza.'
          : 'De ' + p.codigo + ' solo hay ' + maximo + ' disponible' + (maximo === 1 ? '' : 's') + '.');
      }
    });

    // Al cambiar las piezas cambia cuántas piedras caben en cada una.
    if (evento && evento.target === inputPiezas) { pintarPiedras(raiz); pintarSelectorPiedras(raiz); }

    var pistaPiezas = UI.$('#pistaPiezas', raiz);
    if (pistaPiezas) {
      var porCadaUna = borrador.piedras.reduce(function (a, f) { return a + (f.cantidad || 0); }, 0);
      pistaPiezas.textContent = borrador.cantidad > 1
        ? 'Cada pieza lleva las piedras de la tabla: ' + (porCadaUna * borrador.cantidad) + ' en total.'
        : 'Si haces varias iguales, escribe cuántas.';
    }
  }

  function sincronizar(raiz, evento) {
    leerBorrador(raiz);
    rellenarAutomaticos(raiz, evento);
    leerBorrador(raiz);

    var r = Calc.producto(borrador, Store.datos.config);
    UI.auto(UI.$('[data-campo="nombre"]', raiz), nombreSugerido(r));
    UI.auto(UI.$('[data-campo="precioDeseado"]', raiz), Math.round(r.precioVenta));
    leerBorrador(raiz);

    r.piedras.forEach(function (p, i) {
      var celda = UI.$('[data-valor-piedra="' + i + '"]', raiz);
      if (celda) celda.textContent = UI.cop(p.valor);
    });
    UI.$$('[data-pieza]', raiz).forEach(function (b) {
      var igual = b.getAttribute('data-pieza').toLowerCase() === borrador.tipoPieza.toLowerCase();
      b.setAttribute('aria-checked', igual ? 'true' : 'false');
    });

    var precioManual = borrador.precioDeseado > 0;
    var inverso = precioManual ? Calc.margenDesdePrecio(r.costoTotal, borrador.precioDeseado) : null;
    var piezas = Math.max(1, borrador.cantidad);
    var porPiezaTexto = piezas > 1 ? ' · por pieza' : '';

    UI.$('#panelProducto', raiz).innerHTML = [
      precioManual ? '<h3>Precio de venta (fijado a mano)</h3>' : '<h3>Precio de venta sugerido</h3>',
      precioManual
        ? '<div class="precio-grande">' + UI.cop(borrador.precioDeseado) + '<span>el margen te sugería ' + UI.cop(r.precioVenta) + porPiezaTexto + '</span></div>'
        : '<div class="precio-grande">' + UI.cop(r.precioVenta) + '<span>margen ' + UI.numero(borrador.margen) + ' % ' + (borrador.margenModo === 'sobrePrecio' ? 'sobre el precio' : 'sobre el costo') + porPiezaTexto + '</span></div>',

      piezas > 1 ? [
        '<div class="bloque-equilibrio" style="margin-bottom:1rem">',
        '  <h4>Las ' + piezas + ' piezas</h4>',
        '  <p>Costo <strong>' + UI.cop(r.costoTotal * piezas) + '</strong> · Venta <strong>' + UI.cop(r.precioFinal * piezas) + '</strong>',
        '  · Utilidad <strong class="' + UI.claseSigno(r.precioFinal - r.costoTotal) + '">' + UI.cop((r.precioFinal - r.costoTotal) * piezas) + '</strong>',
        '  · ' + UI.numero(r.quilatesProducto * piezas, 2) + ' ct en total</p>',
        '</div>'
      ].join('') : '',

      '<div class="tabla-envoltura">',
      '<table class="tabla-resultado">',
      '  <thead><tr><th>Concepto</th><th>Valor</th><th>% del costo</th><th>% del precio</th></tr></thead>',
      '  <tbody>',
      r.componentes.map(function (c) {
        return '<tr class="' + (c.valor ? '' : 'tenue') + '"><td>' + escapar(c.nombre) + '</td><td>' + UI.cop(c.valor) + '</td><td>' + UI.pct(c.pctCosto, 0) + '</td><td>' + UI.pct(c.pctPrecio, 0) + '</td></tr>';
      }).join(''),
      '  </tbody>',
      '  <tfoot>',
      '    <tr><th>Costo total</th><th>' + UI.cop(r.costoTotal) + '</th><th>100 %</th><th>' + UI.pct(r.precioVenta ? r.costoTotal / r.precioVenta : 0, 0) + '</th></tr>',
      '    <tr><th>Utilidad</th><th class="' + UI.claseSigno(r.utilidad) + '">' + UI.cop(r.utilidad) + '</th><th></th><th>' + UI.pct(r.margenSobrePrecio, 0) + '</th></tr>',
      '  </tfoot>',
      '</table>',
      '</div>',

      inverso ? [
        '<div class="bloque-equilibrio">',
        '  <h4>Vendiéndolo a ' + UI.cop(borrador.precioDeseado) + '</h4>',
        '  <p>Utilidad <strong class="' + UI.claseSigno(inverso.utilidad) + '">' + UI.cop(inverso.utilidad) + '</strong>',
        '  · Margen sobre precio ' + UI.pct(inverso.sobrePrecio) + ' · Sobre costo ' + UI.pct(inverso.sobreCosto) + '</p>',
        '</div>'
      ].join('') : '',

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
      var e = Inventario.estadoProducto(p);
      var codigos = (p.piedras || []).map(function (f) {
        return (f.codigo || UI.nombreCalidad(f.calidad)) + (f.cantidad > 1 ? ' ×' + f.cantidad : '');
      });
      return [
        '<div class="item-lista">',
        '  <div class="cuerpo-item"><strong>' + escapar(p.nombre) + '</strong>' + (e.total > 1 ? ' × ' + e.total : '') +
          '<span class="' + e.clase + '">' + escapar(e.etiqueta) + '</span>',
        '  <span class="pista">' + UI.fecha(p.fecha) + ' · costo ' + UI.cop(r.costoTotal) + ' · precio ' + UI.cop(r.precioFinal) + (e.total > 1 ? ' c/u' : '') +
          (codigos.length ? ' · ' + escapar(codigos.join(', ')) + (e.total > 1 ? ' por pieza' : '') : '') + '</span></div>',
        '  <div class="fila-botones">',
        '    <button class="boton pequeno" data-cargar="' + p.id + '">Abrir</button>',
        '    <button class="boton pequeno peligro" data-borrar="' + p.id + '">Borrar</button>',
        '  </div>',
        '</div>'
      ].join('');
    }).join('');

    UI.$$('[data-cargar]', cont).forEach(function (b) {
      b.addEventListener('click', function () {
        var p = Inventario.buscarProducto(b.getAttribute('data-cargar'));
        borrador = normalizar(JSON.parse(JSON.stringify(p)));
        App.recargar();
      });
    });
    UI.$$('[data-borrar]', cont).forEach(function (b) {
      b.addEventListener('click', function () {
        var id = b.getAttribute('data-borrar');
        var p = Inventario.buscarProducto(id);
        var ventas = p ? Inventario.ventasDeProducto(p).length : 0;
        if (ventas && !confirm('«' + p.nombre + '» tiene ' + (ventas === 1 ? 'una venta registrada' : ventas + ' ventas registradas') + '. Se conservan en el historial. ¿Borrar el producto?')) return;
        Store.datos.productos = Store.datos.productos.filter(function (x) { return x.id !== id; });
        Store.guardar();
        if (borrador && borrador.id === id) borrador.id = null;
        pintarSelectorPiedras(raiz);
        pintarLista(raiz);
        if (p && !p.vendido && (p.piedras || []).some(function (f) { return f.piedraId; })) {
          UI.toast(ventas ? 'Producto borrado. Las piedras de las piezas sin vender volvieron al inventario.' : 'Producto borrado. Sus piedras volvieron al inventario.');
        }
      });
    });
  }

  global.Vistas = global.Vistas || {};
  global.Vistas.producto = { titulo: 'Producto', render: render };
})(window);

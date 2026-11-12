/* Vista: Venta — registrar ventas de productos, piedras o lotes y llevar el
   historial. Solo se ofrece lo que está disponible; al vender, el inventario
   se descuenta solo y la venta guarda una foto de lo que se vendió. */
(function (global) {
  'use strict';

  var borrador = null;
  var enfocarComprador = false;

  /* Desde otra pestaña (Producto → "Vendido"): abre Venta con ese artículo
     ya elegido y el cursor en el comprador. */
  function prepararVenta(tipo, id) {
    borrador = nuevoBorrador();
    borrador.tipo = tipo;
    borrador.itemId = id;
    enfocarComprador = true;
  }

  /* Borra una venta y devuelve el artículo al inventario. */
  function borrarVenta(id) {
    var v = Store.datos.ventas.find(function (x) { return x.id === id; });
    if (!v) return false;
    Store.datos.ventas = Store.datos.ventas.filter(function (x) { return x.id !== id; });
    deshacerVenta(v);
    Store.guardar();
    return true;
  }

  function nuevoBorrador() {
    return {
      tipo: 'producto',
      itemId: '',
      cantidad: 1,
      comprador: '',
      fecha: Store.hoy(),
      precio: 0,
      estadoPago: 'total',
      metodoPago: 'efectivo',
      fechaPago: Store.hoy(),
      anticipoMonto: 0,
      anticipoFecha: Store.hoy(),
      deuda: 0,
      fechaPagoEsperada: ''
    };
  }

  /* Lo que se puede vender hoy de cada tipo. */
  function disponiblesDe(tipo) {
    if (tipo === 'piedra') return Store.datos.piedras.filter(function (p) { return Inventario.disponibles(p) > 0; });
    if (tipo === 'lote') return Store.datos.lotes.filter(function (l) { return !l.vendido && !l.enInventario; });
    return Store.datos.productos.filter(function (p) { return Inventario.estadoProducto(p).disponibles > 0; });
  }

  /* Cuántas unidades quedan de lo elegido (piedras o piezas de un producto). */
  function quedan(tipo, item) {
    if (tipo === 'piedra') return Inventario.disponibles(item);
    if (tipo === 'producto') return Inventario.estadoProducto(item).disponibles;
    return 1;
  }

  function buscarItem(tipo, id) {
    if (tipo === 'piedra') return Inventario.buscarPiedra(id);
    if (tipo === 'lote') return Inventario.buscarLote(id);
    return Inventario.buscarProducto(id);
  }

  function nombreItem(tipo, item) {
    if (!item) return '';
    if (tipo === 'piedra') return item.codigo + ' · ' + UI.nombreCalidad(item.calidad) + ' · ' + UI.numero(item.quilates, 2) + ' ct';
    if (tipo === 'lote') return item.nombre + ' · ' + UI.fecha(item.fecha);
    return item.nombre;
  }

  function precioSugerido(tipo, item, cantidad) {
    if (!item) return 0;
    var cfg = Store.datos.config;
    if (tipo === 'piedra') return Calc.piedra(item, cfg.precioQuilate).valorUnitario * (cantidad || 1);
    if (tipo === 'lote') return Calc.lote(item, cfg.precioQuilate).ventaTotal;
    return Calc.producto(item, cfg).precioFinal * (cantidad || 1);
  }

  /* Foto de lo vendido: si después se edita o borra el producto o la piedra,
     el historial sigue diciendo qué se vendió y cuánto costó. */
  function detalleDe(tipo, item, cantidad) {
    var cfg = Store.datos.config;
    if (tipo === 'producto') {
      // Las piedras del producto son por pieza: se vendieron × las piezas vendidas.
      var r = Calc.producto(item, cfg);
      var n = cantidad || 1;
      return {
        piedras: (item.piedras || []).map(function (f) {
          return { piedraId: f.piedraId || null, codigo: f.codigo || '', calidad: f.calidad, quilates: Calc.num(f.quilates), cantidad: (Calc.num(f.cantidad) || 1) * n };
        }),
        metal: r.metal.gramos > 0 || r.metal.costo > 0 ? r.metal.nombre + ' · ' + UI.numero(r.metal.gramos * n, 2) + ' g' + (n > 1 ? ' (' + n + ' piezas)' : '') : '',
        costo: Math.round(r.costoTotal * n)
      };
    }
    if (tipo === 'piedra') {
      return {
        piedras: [{ piedraId: item.id, codigo: item.codigo, calidad: item.calidad, quilates: Calc.num(item.quilates), cantidad: cantidad }],
        costo: Math.round(Calc.num(item.costo) * cantidad)
      };
    }
    var rl = Calc.lote(item, cfg.precioQuilate);
    return {
      piedras: rl.detalle.filter(function (d) { return d.cantidad; }).map(function (d) {
        return { codigo: '', calidad: d.calidad, quilates: d.quilatePromedio, cantidad: d.cantidad };
      }),
      costo: Math.round(rl.costoTotal)
    };
  }

  function escapar(s) { return String(s === undefined || s === null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }

  function tipoTexto(t) {
    return { producto: 'Producto vendido', piedra: 'Piedra vendida', lote: 'Lote vendido' }[t] || t;
  }

  function estadoTexto(v) {
    if (v.estadoPago === 'total') return 'Pagado (' + (v.metodoPago === 'transferencia' ? 'transferencia' : 'efectivo') + ')';
    if (v.estadoPago === 'anticipo') return 'Anticipo ' + UI.cop(v.anticipoMonto) + ' · resta ' + UI.cop(v.deuda);
    return 'Sin pagar · debe ' + UI.cop(v.deuda);
  }

  function render(raiz) {
    if (!borrador) borrador = nuevoBorrador();

    raiz.innerHTML = [
      '<div class="encabezado-vista">',
      '  <div><h2>Venta</h2><p class="ayuda">Registra la venta de un producto, una piedra o un lote. Solo aparece lo que está disponible; al venderlo sale del inventario y queda en el historial con todo su detalle.</p></div>',
      '</div>',

      '<div class="dos-columnas">',
      '  <div>',
      '    <section class="tarjeta">',
      '      <h3>Registrar venta</h3>',
      '      <div class="rejilla-2">',
      '        <div class="campo campo-completo"><label>Qué tipo de venta</label><select id="tipoVenta" data-segmentos>',
      '          <option value="producto" data-icono="anillo" data-sub="joya terminada">Producto</option>',
      '          <option value="piedra" data-icono="cristal" data-sub="suelta, del inventario">Piedra</option>',
      '          <option value="lote" data-icono="base" data-sub="lote completo">Lote</option>',
      '        </select></div>',
      '        <div class="campo campo-completo"><label>Qué se vende</label><select id="itemVenta"><option value="">Elegir…</option></select></div>',
      '        <div class="campo" id="campoCantidad" style="display:none"><label>Cuántas piedras</label><input type="number" min="1" step="1" data-campo="cantidad" value="' + borrador.cantidad + '"><span class="pista" id="pistaCantidad"></span></div>',
      '        <div class="campo"><label>Comprador</label><input type="text" data-campo="comprador" list="compradores" value="' + escapar(borrador.comprador) + '" placeholder="Nombre del comprador">',
      '          <datalist id="compradores">' + Inventario.compradores().map(function (c) { return '<option value="' + escapar(c) + '">'; }).join('') + '</datalist></div>',
      '        <div class="campo"><label>Fecha de venta</label><input type="date" data-campo="fecha" value="' + borrador.fecha + '"></div>',
      '        <div class="campo"><label>Precio de venta</label><input type="number" min="0" step="1000" data-campo="precio" data-auto value="' + borrador.precio + '"><span class="pista">Sale del precio del artículo.</span></div>',
      '        <div class="campo"><label>Método de pago</label><select data-campo="metodoPago" data-segmentos>',
      '          <option value="efectivo" data-icono="efectivo"' + (borrador.metodoPago === 'efectivo' ? ' selected' : '') + '>Efectivo</option>',
      '          <option value="transferencia" data-icono="transferencia"' + (borrador.metodoPago === 'transferencia' ? ' selected' : '') + '>Transferencia</option>',
      '        </select></div>',
      '        <div class="campo campo-completo"><label>Estado de pago</label><select data-campo="estadoPago" id="estadoPago" data-segmentos>',
      '          <option value="total" data-icono="pagado"' + (borrador.estadoPago === 'total' ? ' selected' : '') + '>Pago total</option>',
      '          <option value="anticipo" data-icono="anticipo"' + (borrador.estadoPago === 'anticipo' ? ' selected' : '') + '>Anticipo</option>',
      '          <option value="sinPago" data-icono="pendiente"' + (borrador.estadoPago === 'sinPago' ? ' selected' : '') + '>Sin pagar</option>',
      '        </select></div>',
      '      </div>',
      '      <div id="zonaPago" style="margin-top:1rem"></div>',
      '      <div id="detalleItem"></div>',
      '      <div class="fila-botones">',
      '        <button class="boton primario" id="registrarVenta">Registrar venta</button>',
      '      </div>',
      '    </section>',
      '  </div>',
      '  <div>',
      '    <section class="tarjeta resultado" id="resumenVentas"></section>',
      '    <section class="tarjeta"><h3>Historial de ventas</h3><div id="listaVentas"></div></section>',
      '  </div>',
      '</div>'
    ].join('');

    pintarSelectorItems(raiz);
    pintarZonaPago(raiz);
    UI.segmentar(raiz);
    UI.armarAutos(raiz, function () { actualizar(raiz); });

    raiz.addEventListener('input', function () { actualizar(raiz); });

    raiz.addEventListener('change', function (e) {
      if (e.target.id === 'tipoVenta') {
        borrador.tipo = e.target.value;
        borrador.itemId = '';
        pintarSelectorItems(raiz);
      } else if (e.target.id === 'itemVenta') {
        borrador.itemId = e.target.value;
        // Otro artículo: su precio vuelve a ser el sugerido.
        UI.marcarManual(UI.$('[data-campo="precio"]', raiz), false);
        UI.$('[data-campo="cantidad"]', raiz).value = 1;
      } else if (e.target.id === 'estadoPago') {
        leerBorrador(raiz);
        pintarZonaPago(raiz);
      }
      actualizar(raiz);
    });

    UI.$('#registrarVenta', raiz).addEventListener('click', function () { registrarVenta(raiz); });

    actualizar(raiz);
    pintarResumen(raiz);
    pintarLista(raiz);

    if (enfocarComprador) {
      enfocarComprador = false;
      var comprador = UI.$('[data-campo="comprador"]', raiz);
      // Después del desplazamiento al inicio que hace App.mostrar.
      setTimeout(function () {
        comprador.scrollIntoView({ block: 'center' });
        comprador.focus({ preventScroll: true });
      }, 350);
    }
  }

  function pintarSelectorItems(raiz) {
    var tipoSel = UI.$('#tipoVenta', raiz);
    if (tipoSel) tipoSel.value = borrador.tipo;
    var sel = UI.$('#itemVenta', raiz);
    if (!sel) return;
    var items = disponiblesDe(borrador.tipo);
    var vacio = { producto: 'No hay productos sin vender', piedra: 'No hay piedras disponibles', lote: 'No hay lotes por vender' }[borrador.tipo];
    sel.innerHTML = '<option value="">' + (items.length ? 'Elegir…' : vacio) + '</option>';
    items.forEach(function (item) {
      var o = document.createElement('option');
      o.value = item.id;
      var conCantidad = borrador.tipo === 'piedra' || (borrador.tipo === 'producto' && Inventario.piezas(item) > 1);
      o.textContent = nombreItem(borrador.tipo, item) + (conCantidad ? ' · ' + quedan(borrador.tipo, item) + ' disp.' : '');
      if (item.id === borrador.itemId) o.selected = true;
      sel.appendChild(o);
    });
    if (!items.some(function (x) { return x.id === borrador.itemId; })) borrador.itemId = '';
  }

  function pintarZonaPago(raiz) {
    var zona = UI.$('#zonaPago', raiz);
    if (!zona) return;
    var e = borrador.estadoPago;
    if (e === 'total') {
      zona.innerHTML = '<div class="rejilla-2"><div class="campo"><label>Fecha del pago</label><input type="date" data-campo="fechaPago" value="' + (borrador.fechaPago || Store.hoy()) + '"></div></div>';
    } else if (e === 'anticipo') {
      zona.innerHTML = [
        '<div class="rejilla-2">',
        '<div class="campo"><label>Fecha del anticipo</label><input type="date" data-campo="anticipoFecha" value="' + (borrador.anticipoFecha || Store.hoy()) + '"></div>',
        '<div class="campo"><label>Monto del anticipo</label><input type="number" min="0" step="1000" data-campo="anticipoMonto" data-auto value="' + borrador.anticipoMonto + '">',
        '  <div class="segmentos compactos" id="pctAnticipo" role="radiogroup" aria-label="Porcentaje del anticipo">' + [30, 50, 70].map(function (p) {
          return '<button type="button" class="segmento" role="radio" data-pct-anticipo="' + p + '">' + p + ' %</button>';
        }).join('') + '</div></div>',
        '<div class="campo"><label>Cuándo se espera el resto</label><input type="date" data-campo="fechaPagoEsperada" value="' + (borrador.fechaPagoEsperada || '') + '"></div>',
        '</div>',
        '<p class="pista" id="pistaRestante"></p>'
      ].join('');
    } else {
      zona.innerHTML = [
        '<div class="rejilla-2">',
        '<div class="campo"><label>Cuánto se debe</label><input type="number" min="0" step="1000" data-campo="deuda" data-auto value="' + borrador.deuda + '"><span class="pista">Por defecto, el precio completo.</span></div>',
        '<div class="campo"><label>Cuándo se espera el pago</label><input type="date" data-campo="fechaPagoEsperada" value="' + (borrador.fechaPagoEsperada || '') + '"></div>',
        '</div>'
      ].join('');
    }
    UI.armarAutos(raiz, function () { actualizar(raiz); });

    // Atajos del anticipo: un toque pone ese % del precio.
    UI.$$('[data-pct-anticipo]', zona).forEach(function (b) {
      b.addEventListener('click', function () {
        var input = UI.$('[data-campo="anticipoMonto"]', zona);
        input.value = Math.round(borrador.precio * Calc.num(b.getAttribute('data-pct-anticipo')) / 100);
        UI.marcarManual(input, true);
        actualizar(raiz);
      });
    });
  }

  /* Recalcula lo automático y la vista previa del artículo. */
  function actualizar(raiz) {
    leerBorrador(raiz);
    var item = borrador.itemId ? buscarItem(borrador.tipo, borrador.itemId) : null;

    // Cuántas: piedras sueltas, o piezas de un producto que tiene varias iguales.
    var campoCantidad = UI.$('#campoCantidad', raiz);
    var inputCantidad = UI.$('[data-campo="cantidad"]', raiz);
    var esPiedra = borrador.tipo === 'piedra';
    var conCantidad = esPiedra || (borrador.tipo === 'producto' && item && Inventario.piezas(item) > 1);
    campoCantidad.style.display = conCantidad ? '' : 'none';
    campoCantidad.querySelector('label').textContent = esPiedra ? 'Cuántas piedras' : 'Cuántas piezas';
    if (conCantidad && item) {
      var hay = quedan(borrador.tipo, item);
      inputCantidad.max = hay;
      if (borrador.cantidad > hay) {
        inputCantidad.value = hay; borrador.cantidad = hay;
        UI.toast((esPiedra ? 'De ' + item.codigo : 'De «' + item.nombre + '»') + ' solo hay ' + hay + '.');
      }
      if (borrador.cantidad < 1) { inputCantidad.value = 1; borrador.cantidad = 1; }
      UI.$('#pistaCantidad', raiz).textContent = 'Hay ' + hay + ' disponible' + (hay === 1 ? '' : 's') + '.';
    } else if (!conCantidad) {
      inputCantidad.value = 1; borrador.cantidad = 1;
    }

    UI.auto(UI.$('[data-campo="precio"]', raiz), Math.round(precioSugerido(borrador.tipo, item, borrador.cantidad)));
    leerBorrador(raiz);
    UI.auto(UI.$('[data-campo="anticipoMonto"]', raiz), Math.round(borrador.precio / 2));
    UI.auto(UI.$('[data-campo="deuda"]', raiz), borrador.precio);
    leerBorrador(raiz);

    var restante = UI.$('#pistaRestante', raiz);
    if (restante) restante.textContent = 'Resta por pagar: ' + UI.cop(Math.max(0, borrador.precio - borrador.anticipoMonto));
    UI.$$('[data-pct-anticipo]', raiz).forEach(function (b) {
      var monto = Math.round(borrador.precio * Calc.num(b.getAttribute('data-pct-anticipo')) / 100);
      b.setAttribute('aria-checked', borrador.precio > 0 && monto === borrador.anticipoMonto ? 'true' : 'false');
    });

    pintarDetalleItem(raiz, item);
  }

  /* Antes de vender, se ve qué lleva lo que se está vendiendo. */
  function pintarDetalleItem(raiz, item) {
    var cont = UI.$('#detalleItem', raiz);
    if (!item) { cont.innerHTML = ''; return; }
    var d = detalleDe(borrador.tipo, item, borrador.cantidad);
    var utilidad = borrador.precio - d.costo;
    cont.innerHTML = [
      '<div class="bloque-equilibrio">',
      '  <h4>' + (borrador.tipo === 'producto' ? 'Lo que lleva' : 'Lo que se vende') + '</h4>',
      d.piedras.length ? '<ul style="margin:.2rem 0 .4rem;padding-left:1rem">' + d.piedras.map(lineaPiedra).join('') + '</ul>' : '<p>Sin esmeraldas.</p>',
      d.metal ? '<p>' + escapar(d.metal) + '</p>' : '',
      d.costo ? '<p>Costo ' + UI.cop(d.costo) + ' · Utilidad <strong class="' + UI.claseSigno(utilidad) + '">' + UI.cop(utilidad) + '</strong></p>' : '',
      '</div>'
    ].join('');
  }

  function lineaPiedra(f) {
    return '<li><span class="etiqueta-calidad ' + f.calidad + '">' + escapar(f.codigo || Store.datos.config.codigoCalidad[f.calidad] || '') + '</span> ' +
      UI.nombreCalidad(f.calidad) + ' · ' + UI.numero(f.quilates, 2) + ' ct' + (f.cantidad > 1 ? ' × ' + f.cantidad : '') + '</li>';
  }

  function leerBorrador(raiz) {
    var f = UI.leerFormulario(raiz);
    borrador.cantidad = Math.max(0, Math.round(Calc.num(f.cantidad)));
    borrador.comprador = (f.comprador || '').trim();
    borrador.fecha = f.fecha || Store.hoy();
    borrador.precio = Calc.num(f.precio);
    borrador.metodoPago = f.metodoPago || 'efectivo';
    borrador.estadoPago = f.estadoPago || 'total';
    borrador.fechaPago = f.fechaPago || '';
    borrador.anticipoFecha = f.anticipoFecha || '';
    borrador.anticipoMonto = Calc.num(f.anticipoMonto);
    borrador.deuda = Calc.num(f.deuda);
    borrador.fechaPagoEsperada = f.fechaPagoEsperada || '';
  }

  function registrarVenta(raiz) {
    actualizar(raiz);
    if (!borrador.itemId) { UI.toast('Elige qué se vende.'); return; }
    if (!borrador.comprador) { UI.toast('Escribe el nombre del comprador.'); return; }

    var item = buscarItem(borrador.tipo, borrador.itemId);
    if (!item) { UI.toast('No se encontró el artículo.'); return; }
    var esPiedra = borrador.tipo === 'piedra';
    var porUnidades = esPiedra || borrador.tipo === 'producto';
    if (porUnidades && (borrador.cantidad < 1 || borrador.cantidad > quedan(borrador.tipo, item))) {
      UI.toast(esPiedra ? 'Revisa cuántas piedras se venden.' : 'Revisa cuántas piezas se venden.');
      return;
    }

    var venta = {
      id: Store.id(),
      fecha: borrador.fecha,
      tipo: borrador.tipo,
      itemId: item.id,
      itemNombre: nombreItem(borrador.tipo, item),
      comprador: borrador.comprador,
      precio: borrador.precio,
      estadoPago: borrador.estadoPago,
      metodoPago: borrador.metodoPago,
      fechaPago: borrador.estadoPago === 'total' ? borrador.fechaPago : '',
      anticipoMonto: borrador.estadoPago === 'anticipo' ? borrador.anticipoMonto : 0,
      anticipoFecha: borrador.estadoPago === 'anticipo' ? borrador.anticipoFecha : '',
      deuda: borrador.estadoPago === 'sinPago'
        ? borrador.deuda
        : (borrador.estadoPago === 'anticipo' ? Math.max(0, borrador.precio - borrador.anticipoMonto) : 0),
      fechaPagoEsperada: borrador.estadoPago === 'total' ? '' : borrador.fechaPagoEsperada,
      detalle: detalleDe(borrador.tipo, item, borrador.cantidad)
    };
    if (porUnidades) venta.cantidad = borrador.cantidad;

    // Las piedras se descuentan solas (Inventario). Un producto queda vendido
    // cuando ya no le quedan piezas; un lote se vende entero.
    Store.datos.ventas.unshift(venta);
    if (borrador.tipo === 'producto') {
      Inventario.sincronizarProducto(item);
    } else if (borrador.tipo === 'lote') {
      item.vendido = true;
      item.comprador = venta.comprador;
      item.ventaId = venta.id;
      item.fechaVenta = venta.fecha;
    }
    Store.guardar();

    borrador = nuevoBorrador();
    App.recargar();
    UI.toast('Venta registrada: ' + venta.itemNombre + ' a ' + venta.comprador + '.');
  }

  /* Ya borrada la venta de la lista: el artículo vuelve a estar disponible
     (las piedras vuelven solas; un producto recupera esas piezas). */
  function deshacerVenta(v) {
    if (v.tipo === 'piedra') return;
    var item = buscarItem(v.tipo, v.itemId);
    if (!item) return;
    if (v.tipo === 'producto') { Inventario.sincronizarProducto(item); return; }
    if (item.ventaId && item.ventaId !== v.id) return;
    item.vendido = false;
    delete item.comprador; delete item.ventaId; delete item.fechaVenta;
  }

  /* Ventas anteriores a la foto de detalle: se reconstruye con lo que hay hoy.
     Una venta vieja de piedra sin cantidad era la piedra entera; de producto, una pieza. */
  function detalleDeVenta(v) {
    if (v.detalle) return v.detalle;
    var item = buscarItem(v.tipo, v.itemId);
    if (!item) return null;
    return detalleDe(v.tipo, item, v.cantidad || (v.tipo === 'piedra' ? Calc.num(item.cantidad) : 1) || 1);
  }

  /* ---------- Resumen de ventas ---------- */

  function esPendiente(v) { return v.estadoPago === 'anticipo' || v.estadoPago === 'sinPago'; }

  function nombreMes(mes) {
    var d = new Date(mes + '-01T00:00:00');
    var t = d.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
    return t.charAt(0).toUpperCase() + t.slice(1);
  }

  /* Del primer mes con ventas hasta hoy, sin huecos (los meses sin ventas
     también cuentan) y como mucho los últimos doce. */
  function mesesSeguidos(meses, esteMes) {
    var porMes = {};
    // Solo meses bien escritos (AAAA-MM): una fecha vacía no debe romper la gráfica.
    meses = meses.filter(function (m) { return /^\d{4}-\d{2}$/.test(m.mes); });
    meses.forEach(function (m) { porMes[m.mes] = m; });
    var desde = meses.length && meses[0].mes < esteMes ? meses[0].mes : esteMes;
    var hasta = meses.length && meses[meses.length - 1].mes > esteMes ? meses[meses.length - 1].mes : esteMes;
    var out = [];
    var d = new Date(desde + '-01T00:00:00');
    for (var vuelta = 0; vuelta < 600; vuelta++) {
      var clave = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
      out.push(porMes[clave] || { mes: clave, cantidad: 0, vendido: 0, utilidad: 0, sinCosto: 0 });
      if (clave >= hasta) break;
      d.setMonth(d.getMonth() + 1);
    }
    return out.slice(-12);
  }

  /* "Este mes vas en … y ganaste …", frente al mes anterior. */
  function bloqueEsteMes(r, esteMes) {
    var porMes = {};
    r.meses.forEach(function (m) { porMes[m.mes] = m; });
    var d = new Date(esteMes + '-01T00:00:00');
    d.setMonth(d.getMonth() - 1);
    var anterior = porMes[d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')];
    var actual = porMes[esteMes] || { vendido: 0, utilidad: 0, cantidad: 0 };
    var nombreActual = nombreMes(esteMes).split(' ')[0].toLowerCase();
    var comparacion = '';
    if (anterior && anterior.vendido) {
      var cambio = (actual.vendido - anterior.vendido) / anterior.vendido;
      comparacion = ' <span class="' + UI.claseSigno(cambio) + '">' + (cambio > 0 ? '▲ ' : (cambio < 0 ? '▼ ' : '')) + UI.pct(Math.abs(cambio), 0) + '</span> frente a ' +
        nombreMes(anterior.mes).split(' ')[0].toLowerCase() + ' (' + UI.cop(anterior.vendido) + ').';
    }
    return '<div class="bloque-equilibrio" style="margin-top:.6rem"><p>En <strong>' + nombreActual + '</strong> llevas <strong>' + UI.cop(actual.vendido) + '</strong> vendidos' +
      (actual.cantidad ? ' y <strong class="' + UI.claseSigno(actual.utilidad) + '">' + UI.cop(actual.utilidad) + '</strong> de ganancia' : '') + '.' + comparacion + '</p></div>';
  }

  function indicador(titulo, valor, nota, clase) {
    return '<div class="indicador"><span>' + titulo + '</span><strong class="' + (clase || '') + '">' + valor + '</strong>' + (nota ? '<em>' + nota + '</em>' : '') + '</div>';
  }

  function pintarResumen(raiz) {
    var cont = UI.$('#resumenVentas', raiz);
    var ventas = Store.datos.ventas;
    var productos = Store.datos.productos;
    // Se cuentan piezas: un producto de 3 aretes iguales son 3.
    var piezas = productos.reduce(function (a, p) {
      var e = Inventario.estadoProducto(p);
      a.total += e.total; a.vendidas += Math.min(e.vendidas, e.total);
      return a;
    }, { total: 0, vendidas: 0 });

    var r = Calc.reporteVentas(ventas.map(function (v) {
      var d = detalleDeVenta(v);
      return {
        fecha: v.fecha, precio: v.precio, pendiente: esPendiente(v), deuda: v.deuda,
        costo: d && d.costo ? d.costo : null
      };
    }));
    var esteMes = Store.hoy().slice(0, 7);
    var delMes = r.meses.filter(function (m) { return m.mes === esteMes; })[0];

    // Lo que se cobró por quilate en piedras sueltas (los lotes y las joyas
    // mezclan calidades o metal, así que no sirven para esto).
    var reales = Calc.precioRealPorQuilate(ventas.filter(function (v) { return v.tipo === 'piedra'; }).map(function (v) {
      var d = detalleDeVenta(v);
      var f = d && d.piedras && d.piedras[0];
      return f ? { calidad: f.calidad, quilates: Calc.num(f.quilates) * (Calc.num(f.cantidad) || 1), precio: v.precio } : {};
    }), Store.datos.config.precioQuilate);

    var pendientes = ventas.filter(function (v) { return esPendiente(v) && Calc.num(v.deuda) > 0; });
    var hoy = Store.hoy();

    cont.innerHTML = [
      '<h3>Resumen de ventas</h3>',
      '<div class="indicadores">',
      indicador('Ventas registradas', UI.numero(r.cantidad), delMes ? delMes.cantidad + ' este mes' : (r.cantidad ? 'ninguna este mes' : '')),
      indicador('Total vendido', UI.cop(r.vendido), r.cantidad ? 'cobrado ' + UI.cop(r.cobrado) : ''),
      indicador('Productos vendidos', piezas.vendidas + ' de ' + piezas.total, piezas.total ? UI.pct(piezas.vendidas / piezas.total, 0) + ' de las piezas' : 'sin productos'),
      indicador('Pendiente por cobrar', UI.cop(r.pendiente), r.ventasPendientes ? 'en ' + r.ventasPendientes + ' venta' + (r.ventasPendientes === 1 ? '' : 's') : 'nada pendiente', r.pendiente > 0 ? 'negativo' : ''),
      indicador('Utilidad', UI.cop(r.utilidad), r.vendidoConCosto ? 'margen ' + UI.pct(r.margen, 0) : '', UI.claseSigno(r.utilidad)),
      '</div>',

      pendientes.length ? [
        '<details class="desplegable"><summary>Quién debe (' + pendientes.length + ')</summary><ul>',
        pendientes.map(function (v) {
          var vencida = v.fechaPagoEsperada && v.fechaPagoEsperada < hoy;
          return '<li><strong>' + escapar(v.comprador) + '</strong> debe <strong class="negativo">' + UI.cop(v.deuda) + '</strong> por ' + escapar(v.itemNombre) +
            (v.fechaPagoEsperada ? ' · <span class="' + (vencida ? 'negativo' : '') + '">' + (vencida ? 'se esperaba el ' : 'para el ') + UI.fecha(v.fechaPagoEsperada) + '</span>' : '') +
            ' <button class="boton pequeno" style="margin-left:.4rem" data-pagada="' + v.id + '">Ya pagó</button></li>';
        }).join(''),
        '</ul></details>'
      ].join('') : '',

      r.meses.length ? [
        '<h4 style="margin-top:1.4rem">Ventas por mes</h4>',
        bloqueEsteMes(r, esteMes),
        '<div id="graficaMeses"></div>',
        '<div class="meses-lista">',
        r.meses.slice().reverse().map(function (m) {
          var ganancia = m.cantidad === m.sinCosto
            ? 'sin costo registrado para calcular la ganancia'
            : 'ganaste <b class="' + UI.claseSigno(m.utilidad) + '">' + UI.cop(m.utilidad) + '</b>' + (m.sinCosto ? ' (sin contar ' + m.sinCosto + ' sin costo)' : '');
          return '<div class="mes-fila"><strong>' + nombreMes(m.mes) + (m.mes === esteMes ? ' · este mes' : '') + '</strong>' +
            '<span>Vendiste <b>' + UI.cop(m.vendido) + '</b> y ' + ganancia + ' · ' + m.cantidad + ' venta' + (m.cantidad === 1 ? '' : 's') + '</span></div>';
        }).join(''),
        '</div>'
      ].join('') : '<p class="vacio">Cuando registres ventas, aquí verás cuánto vendes y cuánto ganas cada mes.</p>',

      reales.length ? [
        '<h4 style="margin-top:1.2rem">Lo que te pagan por quilate</h4>',
        '<p class="pista" style="margin:0 0 .4rem">Piedras sueltas vendidas, frente a tu tabla de Configuración.</p>',
        '<div class="tabla-envoltura"><table class="tabla-resultado">',
        '<thead><tr><th>Calidad</th><th>Vendidos</th><th>Real /ct</th><th>Tabla /ct</th><th>Diferencia</th></tr></thead><tbody>',
        reales.map(function (g) {
          return '<tr><td><span class="etiqueta-calidad ' + g.calidad + '">' + escapar(Store.datos.config.codigoCalidad[g.calidad] || '') + '</span> ' + UI.nombreCalidad(g.calidad) + '</td>' +
            '<td>' + UI.numero(g.quilates, 2) + ' ct</td><td class="fuerte">' + UI.cop(g.real) + '</td><td>' + UI.cop(g.tabla) + '</td>' +
            '<td class="' + UI.claseSigno(g.diferencia) + '">' + (g.diferencia > 0 ? '+' : '') + UI.pct(g.diferencia) + '</td></tr>';
        }).join(''),
        '</tbody></table></div>'
      ].join('') : ''
    ].join('');

    if (r.meses.length) {
      Grafica.barras(UI.$('#graficaMeses', cont), mesesSeguidos(r.meses, esteMes).map(function (m) {
        var d = new Date(m.mes + '-01T00:00:00');
        return {
          etiqueta: d.toLocaleDateString('es-CO', { month: 'short' }).replace('.', ''),
          titulo: nombreMes(m.mes),
          valores: [m.vendido, m.utilidad],
          destacado: m.mes === esteMes
        };
      }), [{ nombre: 'Vendido', color: '#1f4a3a' }, { nombre: 'Ganancia', color: '#9a7b28' }]);
    }

    UI.$$('[data-pagada]', cont).forEach(function (b) {
      b.addEventListener('click', function () {
        var v = Store.datos.ventas.find(function (x) { return x.id === b.getAttribute('data-pagada'); });
        if (!v || !confirm(v.comprador + ' pagó los ' + UI.cop(v.deuda) + ' que debía. ¿Marcar la venta como pagada?')) return;
        v.estadoPago = 'total';
        v.deuda = 0;
        v.fechaPago = Store.hoy();
        Store.guardar();
        App.recargar();
        UI.toast('Venta de ' + v.itemNombre + ' marcada como pagada.');
      });
    });
  }

  function pintarLista(raiz) {
    var cont = UI.$('#listaVentas', raiz);
    var ventas = Store.datos.ventas;
    if (!ventas.length) { cont.innerHTML = '<p class="vacio">Aún no has registrado ventas.</p>'; return; }
    cont.innerHTML = ventas.map(function (v) {
      var d = detalleDeVenta(v);
      var piedras = d ? d.piedras : [];
      var cuantas = piedras.reduce(function (a, f) { return a + (Calc.num(f.cantidad) || 1); }, 0);
      var resumen = v.tipo === 'producto' ? 'Ver piedras (' + cuantas + ')' : 'Ver detalle';
      return [
        '<div class="item-lista">',
        '  <div class="cuerpo-item"><strong>' + escapar(v.itemNombre) + '</strong>' + (v.cantidad > 1 ? ' × ' + v.cantidad : '') + ' <span class="insignia-vendido">' + tipoTexto(v.tipo) + '</span>',
        '  <span class="pista">' + UI.fecha(v.fecha) + ' · a ' + escapar(v.comprador) + ' · ' + UI.cop(v.precio) + ' · ' + estadoTexto(v) + '</span>',
        d ? [
          '  <details class="desplegable"><summary>' + resumen + '</summary>',
          piedras.length ? '<ul>' + piedras.map(lineaPiedra).join('') + '</ul>' : '<p class="pista">Sin esmeraldas.</p>',
          d.metal ? '<p class="pista">' + escapar(d.metal) + '</p>' : '',
          d.costo ? '<p class="pista">Costo ' + UI.cop(d.costo) + ' · Utilidad <span class="' + UI.claseSigno(v.precio - d.costo) + '">' + UI.cop(v.precio - d.costo) + '</span></p>' : '',
          '  </details>'
        ].join('') : '',
        '  </div>',
        '  <button class="boton pequeno peligro" data-borrar="' + v.id + '">Borrar</button>',
        '</div>'
      ].join('');
    }).join('');

    UI.$$('[data-borrar]', cont).forEach(function (b) {
      b.addEventListener('click', function () {
        var id = b.getAttribute('data-borrar');
        var v = Store.datos.ventas.find(function (x) { return x.id === id; });
        if (!v || !confirm('¿Borrar la venta de ' + v.itemNombre + '? El artículo vuelve a quedar disponible.')) return;
        borrarVenta(id);
        App.recargar();
        UI.toast('Venta borrada. El artículo volvió al inventario.');
      });
    });
  }

  global.Vistas = global.Vistas || {};
  global.Vistas.venta = { titulo: 'Venta', render: render, prepararVenta: prepararVenta, borrarVenta: borrarVenta };
})(window);

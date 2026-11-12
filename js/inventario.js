/*
 * inventario.js — De dónde sale y a dónde va cada piedra.
 * El estado NO se guarda: se calcula cada vez a partir de piedras, productos
 * y ventas. Así nunca se desincroniza (borrar una venta o un producto
 * devuelve las piedras solas).
 *
 *   disponibles = cantidad − montadas en productos − vendidas sueltas
 */
(function (global) {
  'use strict';

  function num(v) { return Calc.num(v); }

  function buscar(lista, id) {
    for (var i = 0; i < lista.length; i++) if (lista[i].id === id) return lista[i];
    return null;
  }

  /* Cuántas piezas iguales tiene un producto (los viejos no lo decían: una). */
  function piezas(p) { return Math.max(1, Math.round(num(p.cantidad) || 1)); }

  /* Productos que llevan esta piedra y cuántas de ella. La tabla de piedras
     de un producto es por pieza: 3 aretes con 2 esmeraldas cada uno son 6. */
  function enProductos(piedraId, excluirProductoId) {
    var out = [];
    Store.datos.productos.forEach(function (p) {
      if (p.id === excluirProductoId) return;
      var n = 0;
      (p.piedras || []).forEach(function (f) {
        if (f.piedraId === piedraId) n += (num(f.cantidad) || 1) * piezas(p);
      });
      if (n) out.push({ producto: p, cantidad: n });
    });
    return out;
  }

  /* Ventas de un producto, la más reciente primero. */
  function ventasDeProducto(p) {
    return Store.datos.ventas.filter(function (v) { return v.tipo === 'producto' && v.itemId === p.id; });
  }

  /* Piezas de un producto: cuántas hay, cuántas se vendieron y cuántas quedan.
     Las ventas anteriores a las piezas no traían cantidad: eran una pieza. */
  function estadoProducto(p) {
    var total = piezas(p);
    var ventas = ventasDeProducto(p);
    var vendidas = ventas.reduce(function (a, v) { return a + (num(v.cantidad) || 1); }, 0);
    var disponibles = Math.max(0, total - vendidas);
    var compradores = [];
    ventas.forEach(function (v) { if (v.comprador && compradores.indexOf(v.comprador) < 0) compradores.push(v.comprador); });

    var etiqueta;
    if (!vendidas) etiqueta = total > 1 ? total + ' disponibles' : 'Disponible';
    else if (disponibles) etiqueta = disponibles + ' de ' + total + ' disponibles';
    else etiqueta = 'Vendido' + (compradores.length === 1 ? ' a ' + compradores[0] : (compradores.length > 1 ? ' a ' + compradores.length + ' compradores' : ''));

    return {
      total: total, vendidas: vendidas, disponibles: disponibles, ventas: ventas,
      compradores: compradores, agotado: vendidas > 0 && disponibles === 0,
      etiqueta: etiqueta, clase: disponibles > 0 ? 'insignia-nivel' : 'insignia-vendido'
    };
  }

  /* Tras vender o deshacer una venta: el producto queda "vendido" solo si
     ya no le quedan piezas, y recuerda la venta más reciente. */
  function sincronizarProducto(p) {
    var e = estadoProducto(p);
    p.vendido = e.agotado;
    var ultima = e.ventas[0];
    if (ultima) { p.comprador = ultima.comprador; p.ventaId = ultima.id; p.fechaVenta = ultima.fecha; }
    else { delete p.comprador; delete p.ventaId; delete p.fechaVenta; }
  }

  /* Las ventas anteriores a este cambio no traían cantidad: se vendió todo. */
  function vendidasSueltas(piedra) {
    return Store.datos.ventas.reduce(function (acc, v) {
      if (v.tipo !== 'piedra' || v.itemId !== piedra.id) return acc;
      return acc + (v.cantidad === undefined ? (num(piedra.cantidad) || 1) : num(v.cantidad));
    }, 0);
  }

  /* Piedras que salieron en joyas vendidas cuyo producto después se borró:
     el producto ya no las cuenta, pero la venta guardó cuáles llevaba. */
  function enJoyasBorradas(piedra) {
    return Store.datos.ventas.reduce(function (acc, v) {
      if (v.tipo !== 'producto' || buscar(Store.datos.productos, v.itemId)) return acc;
      ((v.detalle && v.detalle.piedras) || []).forEach(function (f) {
        if (f.piedraId === piedra.id) acc += num(f.cantidad) || 1;
      });
      return acc;
    }, 0);
  }

  function estadoPiedra(piedra, excluirProductoId) {
    var total = num(piedra.cantidad) || 1;
    var productos = enProductos(piedra.id, excluirProductoId);
    var montadas = productos.reduce(function (a, x) { return a + x.cantidad; }, 0);
    var vendidas = vendidasSueltas(piedra);
    var joyasBorradas = enJoyasBorradas(piedra);
    var disponibles = Math.max(0, total - montadas - vendidas - joyasBorradas);
    var enProductoSinVender = productos.some(function (x) { return !x.producto.vendido; });

    var etiqueta;
    if (disponibles === total) etiqueta = 'Disponible';
    else if (disponibles > 0) etiqueta = disponibles + ' de ' + total + ' disponibles';
    else if (enProductoSinVender) etiqueta = 'Usada en producto';
    else etiqueta = 'Vendida';

    return {
      total: total,
      montadas: montadas,
      vendidas: vendidas,
      enJoyasBorradas: joyasBorradas,
      disponibles: disponibles,
      productos: productos,
      agotada: disponibles === 0,
      etiqueta: etiqueta,
      // Para pintar la insignia: verde si queda algo, dorada si ya no.
      clase: disponibles > 0 ? 'insignia-nivel' : 'insignia-vendido'
    };
  }

  function disponibles(piedra, excluirProductoId) {
    return estadoPiedra(piedra, excluirProductoId).disponibles;
  }

  /* Un lote se vende entero, o se pasa al inventario como piedras sueltas.
     Pasado al inventario, queda agotado cuando ya no queda ninguna. */
  function estadoLote(lote) {
    if (lote.vendido) return { clave: 'vendido', texto: 'Vendido', clase: 'insignia-vendido' };
    if (!lote.enInventario) return { clave: 'libre', texto: '', clase: '' };
    var quedan = Store.datos.piedras
      .filter(function (p) { return p.loteId === lote.id; })
      .reduce(function (a, p) { return a + disponibles(p); }, 0);
    if (!quedan) return { clave: 'agotado', texto: 'Agotado', clase: 'insignia-vendido' };
    return { clave: 'enInventario', texto: 'En inventario · quedan ' + quedan, clase: 'insignia-nivel', quedan: quedan };
  }

  /* Próximo código libre para una calidad: MA-001, MA-002…
     Busca el número más alto en uso para no repetir aunque se hayan borrado piedras. */
  function siguienteCodigo(calidad, reservados) {
    var prefijo = Store.datos.config.codigoCalidad[calidad] || 'X';
    var patron = new RegExp('^' + prefijo.replace(/[^A-Za-z0-9]/g, '') + '-(\\d+)$', 'i');
    var mayor = 0;
    Store.datos.piedras.map(function (p) { return p.codigo; }).concat(reservados || []).forEach(function (c) {
      var m = patron.exec(c || '');
      if (m) mayor = Math.max(mayor, parseInt(m[1], 10));
    });
    return prefijo + '-' + String(mayor + 1).padStart(3, '0');
  }

  function codigoEnUso(codigo, excluirId) {
    var c = String(codigo || '').trim().toLowerCase();
    return Store.datos.piedras.some(function (p) { return p.id !== excluirId && String(p.codigo).toLowerCase() === c; });
  }

  /* Compradores anteriores, para sugerirlos al escribir. */
  function compradores() {
    var vistos = {};
    Store.datos.ventas.forEach(function (v) {
      var n = (v.comprador || '').trim();
      if (n) vistos[n.toLowerCase()] = n;
    });
    return Object.keys(vistos).map(function (k) { return vistos[k]; }).sort(function (a, b) { return a.localeCompare(b, 'es'); });
  }

  /* SVP-9 tiene seis niveles y la escala de precios seis calidades:
     se corresponden uno a uno. */
  var CALIDAD_POR_NIVEL = {
    'Básico': 'muyBaja', 'Bueno': 'baja', 'Muy bueno': 'media',
    'Excelente': 'alta', 'Excepcional': 'muyAlta', 'Legendario': 'exclusiva'
  };

  function calidadDeEvaluacion(ev) {
    var cfg = Store.datos.config;
    var r = SVP9.evaluar(ev.factores || {}, cfg.svp9Pesos);
    var nivel = SVP9.nivel(SVP9.puntaje(r, cfg.svp9Modo));
    return { nivel: nivel.nombre, calidad: CALIDAD_POR_NIVEL[nivel.nombre] || 'media' };
  }

  global.Inventario = {
    buscarPiedra: function (id) { return buscar(Store.datos.piedras, id); },
    buscarProducto: function (id) { return buscar(Store.datos.productos, id); },
    buscarLote: function (id) { return buscar(Store.datos.lotes, id); },
    enProductos: enProductos,
    estadoPiedra: estadoPiedra,
    piezas: piezas,
    ventasDeProducto: ventasDeProducto,
    estadoProducto: estadoProducto,
    sincronizarProducto: sincronizarProducto,
    disponibles: disponibles,
    estadoLote: estadoLote,
    siguienteCodigo: siguienteCodigo,
    codigoEnUso: codigoEnUso,
    compradores: compradores,
    calidadDeEvaluacion: calidadDeEvaluacion
  };
})(window);

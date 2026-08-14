/*
 * calc.js — Motor de cálculo (funciones puras, sin DOM).
 * Este archivo NO depende del navegador: se puede reusar tal cual
 * en un programa de escritorio (Electron/Tauri) o en Node.
 */
(function (global) {
  'use strict';

  var CALIDADES = ['baja', 'media', 'alta'];

  function num(v) {
    var n = typeof v === 'string' ? parseFloat(v.replace(/[^0-9.,-]/g, '').replace(',', '.')) : Number(v);
    return isFinite(n) ? n : 0;
  }

  function suma(lista, campo) {
    return lista.reduce(function (acc, x) { return acc + num(x[campo]); }, 0);
  }

  /* ---------------------------------------------------------------
   * PIEDRA INDIVIDUAL
   * valor de venta = quilates * precio del quilate segun la calidad
   * ------------------------------------------------------------- */
  function piedra(entrada, precioQuilate) {
    var quilates = num(entrada.quilates);
    var cantidad = num(entrada.cantidad) || 1;
    var precioQ = num(precioQuilate[entrada.calidad]);
    var costo = num(entrada.costo); // costo de adquisicion, opcional

    var valorUnitario = quilates * precioQ;
    var valorTotal = valorUnitario * cantidad;
    var costoTotal = costo * cantidad;
    var utilidad = valorTotal - costoTotal;

    return {
      quilates: quilates,
      cantidad: cantidad,
      precioQuilate: precioQ,
      valorUnitario: valorUnitario,
      valorTotal: valorTotal,
      costoTotal: costoTotal,
      utilidad: utilidad,
      margenSobrePrecio: valorTotal ? utilidad / valorTotal : 0,
      margenSobreCosto: costoTotal ? utilidad / costoTotal : 0
    };
  }

  /* ---------------------------------------------------------------
   * LOTE
   * El costo del lote se reparte entre calidades en proporcion al
   * valor de venta de cada calidad (metodo de valor relativo).
   * ------------------------------------------------------------- */
  function lote(entrada, precioQuilate) {
    var costoLote = num(entrada.costoTotal);
    var dist = entrada.distribucion || {};

    var detalle = CALIDADES.map(function (c) {
      var d = dist[c] || {};
      var cantidad = num(d.cantidad);
      var quilates = num(d.quilates);
      var precioQ = num(precioQuilate[c]);
      var valorVenta = quilates * precioQ;
      return {
        calidad: c,
        cantidad: cantidad,
        quilates: quilates,
        precioQuilate: precioQ,
        valorVenta: valorVenta,
        quilatePromedio: cantidad ? quilates / cantidad : 0,
        valorPromedioPiedra: cantidad ? valorVenta / cantidad : 0
      };
    });

    var cantidadTotal = suma(detalle, 'cantidad');
    var quilatesTotal = suma(detalle, 'quilates');
    var ventaTotal = suma(detalle, 'valorVenta');

    detalle.forEach(function (d) {
      d.proporcion = cantidadTotal ? d.cantidad / cantidadTotal : 0;
      d.costoAsignado = ventaTotal ? costoLote * (d.valorVenta / ventaTotal) : 0;
      d.costoPorPiedra = d.cantidad ? d.costoAsignado / d.cantidad : 0;
      d.utilidad = d.valorVenta - d.costoAsignado;
      d.margen = d.valorVenta ? d.utilidad / d.valorVenta : 0;
    });

    var utilidad = ventaTotal - costoLote;
    var recuperacion = ventaTotal ? costoLote / ventaTotal : 0; // % del lote a vender para recuperar

    return {
      detalle: detalle,
      cantidadDeclarada: num(entrada.cantidadPiedras),
      cantidadTotal: cantidadTotal,
      cuadra: num(entrada.cantidadPiedras) === 0 || num(entrada.cantidadPiedras) === cantidadTotal,
      quilatesTotal: quilatesTotal,
      costoTotal: costoLote,
      costoPorPiedra: cantidadTotal ? costoLote / cantidadTotal : 0,
      costoPorQuilate: quilatesTotal ? costoLote / quilatesTotal : 0,
      ventaTotal: ventaTotal,
      utilidad: utilidad,
      margenSobrePrecio: ventaTotal ? utilidad / ventaTotal : 0,
      margenSobreCosto: costoLote ? utilidad / costoLote : 0,
      equilibrioPorcentaje: recuperacion,
      equilibrioPiedras: recuperacion * cantidadTotal,
      equilibrioQuilates: recuperacion * quilatesTotal
    };
  }

  /* ---------------------------------------------------------------
   * PRODUCTO TERMINADO (joya)
   * ------------------------------------------------------------- */
  function producto(entrada, config) {
    var precioQuilate = config.precioQuilate;

    // --- Piedras
    var piedras = (entrada.piedras || []).map(function (p) {
      var quilates = num(p.quilates);
      var cantidad = num(p.cantidad) || 1;
      var precioQ = num(precioQuilate[p.calidad]);
      return {
        calidad: p.calidad,
        quilates: quilates,
        cantidad: cantidad,
        quilatesTotales: quilates * cantidad,
        precioQuilate: precioQ,
        valor: quilates * cantidad * precioQ
      };
    });
    var valorPiedras = suma(piedras, 'valor');
    var quilatesProducto = suma(piedras, 'quilatesTotales');

    // --- Metal
    var m = entrada.metal || {};
    var def = (config.metales || {})[m.tipo] || {};
    var gramos = num(m.gramos);
    var precioMercadoGramo = num(m.precioMercadoGramo || def.precioGramo);
    var precioCompraGramo = num(m.precioCompraGramo) || precioMercadoGramo;

    var valorMercadoMetal = gramos * precioMercadoGramo;
    var costoMetal = m.modo === 'valor' ? num(m.valorManual) : gramos * precioCompraGramo;
    var difMetal = valorMercadoMetal - costoMetal;

    var metal = {
      tipo: m.tipo,
      nombre: def.nombre || m.tipo || '—',
      gramos: gramos,
      precioMercadoGramo: precioMercadoGramo,
      precioCompraGramo: precioCompraGramo,
      valorMercado: valorMercadoMetal,
      costo: costoMetal,
      diferencia: difMetal,
      diferenciaPct: costoMetal ? difMetal / costoMetal : 0
    };

    // --- Mano de obra del joyero
    var mo = entrada.manoObra || {};
    var costoManoObra = mo.modo === 'porGramo'
      ? gramos * num(mo.valorPorGramo || config.manoObraPorGramo)
      : num(mo.valor);

    // --- Costos operativos
    var envio = num(entrada.envio);
    var empaque = num(entrada.empaque);
    var publicidad = num(entrada.publicidad);
    var otros = num(entrada.otros);

    var costoTotal = valorPiedras + costoMetal + costoManoObra + envio + empaque + publicidad + otros;

    // --- Margen
    var margenPct = num(entrada.margen) / 100;
    var modo = entrada.margenModo || 'sobrePrecio';
    var precioVenta;
    if (modo === 'sobrePrecio') {
      precioVenta = margenPct >= 1 ? Infinity : costoTotal / (1 - margenPct);
    } else {
      precioVenta = costoTotal * (1 + margenPct);
    }
    if (!isFinite(precioVenta)) precioVenta = 0;

    var utilidad = precioVenta - costoTotal;

    var componentes = [
      { nombre: 'Esmeraldas', valor: valorPiedras },
      { nombre: 'Metal', valor: costoMetal },
      { nombre: 'Mano de obra', valor: costoManoObra },
      { nombre: 'Envío', valor: envio },
      { nombre: 'Empaque', valor: empaque },
      { nombre: 'Publicidad', valor: publicidad },
      { nombre: 'Otros', valor: otros }
    ].map(function (c) {
      c.pctCosto = costoTotal ? c.valor / costoTotal : 0;
      c.pctPrecio = precioVenta ? c.valor / precioVenta : 0;
      return c;
    });

    var gastosFijos = num(config.gastosFijosMes);

    return {
      piedras: piedras,
      valorPiedras: valorPiedras,
      quilatesProducto: quilatesProducto,
      metal: metal,
      costoManoObra: costoManoObra,
      envio: envio,
      empaque: empaque,
      publicidad: publicidad,
      otros: otros,
      componentes: componentes,
      costoTotal: costoTotal,
      precioVenta: precioVenta,
      utilidad: utilidad,
      margenSobrePrecio: precioVenta ? utilidad / precioVenta : 0,
      margenSobreCosto: costoTotal ? utilidad / costoTotal : 0,
      precioEquilibrio: costoTotal,
      unidadesEquilibrio: utilidad > 0 ? gastosFijos / utilidad : 0
    };
  }

  /* ---------------------------------------------------------------
   * PRECIO OBJETIVO INVERSO: dado un precio de venta deseado,
   * cuanto margen queda.
   * ------------------------------------------------------------- */
  function margenDesdePrecio(costoTotal, precioVenta) {
    var utilidad = precioVenta - costoTotal;
    return {
      utilidad: utilidad,
      sobrePrecio: precioVenta ? utilidad / precioVenta : 0,
      sobreCosto: costoTotal ? utilidad / costoTotal : 0
    };
  }

  /* ---------------------------------------------------------------
   * VARIACION DE PRECIOS (historial)
   * ------------------------------------------------------------- */
  function variacion(serie) {
    // serie: [{fecha:'2026-01-01', valor:100}, ...] ordenada asc
    var puntos = serie.slice().sort(function (a, b) {
      return new Date(a.fecha) - new Date(b.fecha);
    });
    var out = puntos.map(function (p, i) {
      var anterior = i > 0 ? num(puntos[i - 1].valor) : null;
      var valor = num(p.valor);
      return {
        fecha: p.fecha,
        valor: valor,
        cambio: anterior === null ? 0 : valor - anterior,
        cambioPct: anterior ? (valor - anterior) / anterior : 0
      };
    });
    var primero = out.length ? out[0].valor : 0;
    var ultimo = out.length ? out[out.length - 1].valor : 0;
    return {
      puntos: out,
      primero: primero,
      ultimo: ultimo,
      variacionTotal: ultimo - primero,
      variacionTotalPct: primero ? (ultimo - primero) / primero : 0,
      minimo: out.length ? Math.min.apply(null, out.map(function (p) { return p.valor; })) : 0,
      maximo: out.length ? Math.max.apply(null, out.map(function (p) { return p.valor; })) : 0
    };
  }

  global.Calc = {
    CALIDADES: CALIDADES,
    num: num,
    piedra: piedra,
    lote: lote,
    producto: producto,
    margenDesdePrecio: margenDesdePrecio,
    variacion: variacion
  };
})(typeof window !== 'undefined' ? window : globalThis);

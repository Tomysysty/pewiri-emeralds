/* Vista: Lote — costo del lote, reparto por calidad, pesaje y valor de venta.
   Un lote se vende entero o se pasa al inventario como piedras sueltas. */
(function (global) {
  'use strict';

  var borrador = null;
  // Calidades cuyo % escribió la dueña. Los demás porcentajes se ajustan
  // solos para que entre todos sumen 100 %.
  var tocados = {};

  function nuevoBorrador() {
    return {
      id: null,
      nombre: '',
      fecha: Store.hoy(),
      costoTotal: 0,
      cantidadPiedras: 0,
      distribucion: Calc.CALIDADES.reduce(function (o, q) {
        o[q] = { cantidad: 0, quilates: 0 };
        return o;
      }, {})
    };
  }

  /* El borrador vive mientras se navega: si el lote se vendió, se pasó al
     inventario o se borró en otro momento, se trae su estado actual. */
  function refrescarEstado() {
    if (!borrador.id) return;
    var guardado = Inventario.buscarLote(borrador.id);
    if (!guardado) { borrador.id = null; delete borrador.vendido; delete borrador.enInventario; return; }
    ['vendido', 'comprador', 'ventaId', 'fechaVenta', 'enInventario'].forEach(function (k) {
      if (guardado[k] === undefined) delete borrador[k]; else borrador[k] = guardado[k];
    });
  }

  function render(raiz) {
    if (!borrador) borrador = nuevoBorrador();
    refrescarEstado();
    tocados = {};
    var cfg = Store.datos.config;
    var sumaCantidades = Calc.CALIDADES.reduce(function (a, q) { return a + Calc.num((borrador.distribucion[q] || {}).cantidad); }, 0);
    var totalAMano = borrador.cantidadPiedras > 0 && borrador.cantidadPiedras !== sumaCantidades;

    raiz.innerHTML = [
      '<div class="encabezado-vista">',
      '  <div><h2>Lote</h2><p class="ayuda">Ingresa lo que costó el lote y cómo se reparte por calidad. El valor de venta sale del precio por quilate de cada calidad.</p></div>',
      '  <div class="fila-botones">',
      '    <button class="boton" id="nuevoLote">Nuevo lote</button>',
      '    <button class="boton primario" id="guardarLote">Guardar lote</button>',
      '  </div>',
      '</div>',

      borrador.enInventario ? '<div class="bloque-equilibrio" style="margin-bottom:1.2rem"><h4>Este lote ya está en el inventario</h4><p>Sus piedras se crearon el ' + UI.fecha(borrador.enInventario) + '. Cambiar el reparto aquí no cambia esas piedras; se manejan desde Piedra.</p></div>' : '',

      '<div class="dos-columnas">',
      '  <div>',
      '    <section class="tarjeta">',
      '      <h3>Datos del lote</h3>',
      '      <div class="rejilla-2">',
      '        <div class="campo"><label>Nombre o referencia</label><input type="text" data-campo="nombre" value="' + escapar(borrador.nombre) + '" placeholder="Lote Muzo enero"></div>',
      '        <div class="campo"><label>Fecha</label><input type="date" data-campo="fecha" value="' + borrador.fecha + '"></div>',
      '        <div class="campo"><label>Costo total del lote</label><input type="number" min="0" step="10000" data-campo="costoTotal" value="' + borrador.costoTotal + '"></div>',
      '        <div class="campo"><label>Cantidad de piedras del lote</label><input type="number" min="0" step="1" data-campo="cantidadPiedras" data-auto' + (totalAMano ? ' data-manual="1"' : '') + ' value="' + (borrador.cantidadPiedras || sumaCantidades) + '"><span class="pista">Si no la escribes, es la suma del reparto.</span></div>',
      '      </div>',
      '    </section>',

      '    <section class="tarjeta">',
      '      <h3>Reparto por calidad y pesaje</h3>',
      '      <p class="ayuda">Escribe el % de cada calidad y el número de piedras sale solo; los porcentajes que no hayas tocado se ajustan para sumar 100 %. También puedes escribir las cantidades directamente.</p>',
      '      <div class="tabla-envoltura">',
      '      <table class="tabla-entrada">',
      '        <thead><tr><th>Calidad</th><th>% del lote</th><th>N.º piedras</th><th>Quilates totales</th><th>Quilate prom.</th></tr></thead>',
      '        <tbody>',
      Calc.CALIDADES.map(function (q) {
        // Los lotes guardados antes de ampliar la escala no traen las calidades nuevas.
        var d = borrador.distribucion[q] || { cantidad: 0, quilates: 0 };
        return [
          '<tr>',
          '  <td><span class="etiqueta-calidad ' + q + '">' + (cfg.codigoCalidad[q] || '') + '</span> ' + UI.nombreCalidad(q) + '</td>',
          '  <td><input type="number" min="0" max="100" step="1" data-pct="' + q + '" placeholder="0"></td>',
          '  <td><input type="number" min="0" step="1" data-campo="distribucion.' + q + '.cantidad" value="' + d.cantidad + '"></td>',
          '  <td><input type="number" min="0" step="0.01" data-campo="distribucion.' + q + '.quilates" value="' + d.quilates + '"></td>',
          '  <td class="celda-calculada" data-prom="' + q + '">—</td>',
          '</tr>'
        ].join('');
      }).join(''),
      '        </tbody>',
      '      </table>',
      '      </div>',
      '      <div class="fila-botones">',
      '        <span id="avisoCantidad" class="aviso"></span>',
      '      </div>',
      '    </section>',
      '  </div>',

      '  <div>',
      '    <section class="tarjeta resultado" id="panelResultado"></section>',
      '    <section class="tarjeta"><h3>Lotes guardados</h3><div id="listaLotes"></div></section>',
      '  </div>',
      '</div>'
    ].join('');

    UI.armarAutos(raiz, function () { pctDesdeCantidades(raiz); sincronizar(raiz); });

    raiz.addEventListener('input', function (e) {
      var campo = e.target.getAttribute('data-campo') || '';
      var q = e.target.getAttribute('data-pct');
      if (q) {
        tocados[q] = true;
        balancearPorcentajes(raiz);
      } else if (/^distribucion\.\w+\.cantidad$/.test(campo)) {
        tocados = {};
        UI.auto(UI.$('[data-campo="cantidadPiedras"]', raiz), sumarCantidades(raiz));
        pctDesdeCantidades(raiz);
      } else if (campo === 'cantidadPiedras') {
        cantidadesDesdePct(raiz, leerPcts(raiz));
      }
      sincronizar(raiz);
    });
    raiz.addEventListener('change', function () { sincronizar(raiz); });

    UI.$('#nuevoLote', raiz).addEventListener('click', function () {
      borrador = nuevoBorrador();
      App.recargar();
    });

    UI.$('#guardarLote', raiz).addEventListener('click', function () {
      refrescarEstado();
      leerBorrador(raiz);
      if (!borrador.nombre) borrador.nombre = 'Lote ' + UI.fecha(borrador.fecha);
      var i = borrador.id ? Store.datos.lotes.findIndex(function (l) { return l.id === borrador.id; }) : -1;
      if (i >= 0) {
        Store.datos.lotes[i] = JSON.parse(JSON.stringify(borrador));
      } else {
        borrador.id = Store.id();
        Store.datos.lotes.unshift(JSON.parse(JSON.stringify(borrador)));
      }
      Store.guardar();
      pintarLista(raiz);
      UI.toast('Lote guardado. Puedes venderlo entero o pasarlo al inventario.');
    });

    pctDesdeCantidades(raiz);
    sincronizar(raiz);
    pintarLista(raiz);
  }

  function escapar(s) { return String(s === undefined || s === null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }

  /* ---------- Porcentajes y cantidades, siempre de acuerdo ---------- */

  function leerPcts(raiz) {
    var o = {};
    Calc.CALIDADES.forEach(function (q) { o[q] = Calc.num(UI.$('[data-pct="' + q + '"]', raiz).value); });
    return o;
  }

  function sumarCantidades(raiz) {
    return Calc.CALIDADES.reduce(function (a, q) {
      return a + Calc.num(UI.$('[data-campo="distribucion.' + q + '.cantidad"]', raiz).value);
    }, 0);
  }

  /* No se reescribe el campo que la dueña está escribiendo: le movería el cursor. */
  function escribirPcts(raiz, pcts) {
    Calc.CALIDADES.forEach(function (q) {
      var input = UI.$('[data-pct="' + q + '"]', raiz);
      if (input === document.activeElement) return;
      input.value = pcts[q] ? String(Math.round(pcts[q] * 10) / 10) : '';
    });
  }

  /* Los % escritos se respetan; lo que falta para 100 se reparte entre los
     demás en la misma proporción que ya tenían (o por partes iguales). */
  function balancearPorcentajes(raiz) {
    var pcts = leerPcts(raiz);
    var fijos = 0, libres = [];
    Calc.CALIDADES.forEach(function (q) {
      if (tocados[q]) fijos += pcts[q]; else libres.push(q);
    });
    var resto = Math.max(0, 100 - fijos);
    var base = libres.reduce(function (a, q) { return a + pcts[q]; }, 0);
    libres.forEach(function (q) {
      pcts[q] = base > 0 ? pcts[q] / base * resto : resto / libres.length;
    });
    escribirPcts(raiz, pcts);
    cantidadesDesdePct(raiz, pcts);
  }

  /* N.º de piedras = total × %. Se redondea por el mayor residuo para que
     la suma dé exactamente el total. */
  function cantidadesDesdePct(raiz, pcts) {
    var total = Calc.num(UI.$('[data-campo="cantidadPiedras"]', raiz).value);
    var sumaPct = Calc.CALIDADES.reduce(function (a, q) { return a + pcts[q]; }, 0);
    if (!total || !sumaPct) return;
    var meta = Math.round(total * Math.min(sumaPct, 100) / 100);
    var filas = Calc.CALIDADES.map(function (q) {
      var exacto = total * pcts[q] / 100;
      return { q: q, n: Math.floor(exacto), resto: exacto - Math.floor(exacto) };
    });
    var faltan = meta - filas.reduce(function (a, f) { return a + f.n; }, 0);
    filas.slice().sort(function (a, b) { return b.resto - a.resto; }).forEach(function (f) {
      if (faltan > 0 && f.resto > 0) { f.n += 1; faltan -= 1; }
    });
    filas.forEach(function (f) {
      UI.$('[data-campo="distribucion.' + f.q + '.cantidad"]', raiz).value = f.n;
    });
  }

  function pctDesdeCantidades(raiz) {
    var total = Calc.num(UI.$('[data-campo="cantidadPiedras"]', raiz).value) || sumarCantidades(raiz);
    var pcts = {};
    Calc.CALIDADES.forEach(function (q) {
      var n = Calc.num(UI.$('[data-campo="distribucion.' + q + '.cantidad"]', raiz).value);
      pcts[q] = total ? n / total * 100 : 0;
    });
    escribirPcts(raiz, pcts);
  }

  function leerBorrador(raiz) {
    var form = UI.leerFormulario(raiz);
    borrador.nombre = (form.nombre || '').trim();
    borrador.fecha = form.fecha;
    borrador.costoTotal = Calc.num(form.costoTotal);
    borrador.cantidadPiedras = Calc.num(form.cantidadPiedras);
    Calc.CALIDADES.forEach(function (q) {
      var d = (form.distribucion || {})[q] || {};
      borrador.distribucion[q] = {
        cantidad: Calc.num(d.cantidad),
        quilates: Calc.num(d.quilates)
      };
    });
  }

  function sincronizar(raiz) {
    leerBorrador(raiz);
    var r = Calc.lote(borrador, Store.datos.config.precioQuilate);

    r.detalle.forEach(function (d) {
      var celda = UI.$('[data-prom="' + d.calidad + '"]', raiz);
      if (celda) celda.textContent = d.cantidad ? UI.numero(d.quilatePromedio, 2) + ' ct' : '—';
    });

    var aviso = UI.$('#avisoCantidad', raiz);
    var sumaPct = Calc.CALIDADES.reduce(function (a, q) { return a + Calc.num(UI.$('[data-pct="' + q + '"]', raiz).value); }, 0);
    var hayPct = Object.keys(tocados).length > 0;
    if (hayPct && !borrador.cantidadPiedras) {
      aviso.textContent = 'Escribe cuántas piedras tiene el lote y las cantidades salen solas.';
      aviso.className = 'aviso alerta';
    } else if (hayPct && Math.abs(sumaPct - 100) > 0.5) {
      aviso.textContent = 'Los porcentajes suman ' + UI.numero(sumaPct, 1) + ' %.';
      aviso.className = 'aviso alerta';
    } else if (borrador.cantidadPiedras && !r.cuadra) {
      aviso.textContent = 'El reparto suma ' + UI.numero(r.cantidadTotal) + ' piedras y el lote dice ' + UI.numero(borrador.cantidadPiedras) + '.';
      aviso.className = 'aviso alerta';
    } else {
      aviso.textContent = r.cantidadTotal ? UI.numero(r.cantidadTotal) + ' piedras repartidas · ' + UI.numero(r.quilatesTotal, 2) + ' ct' : '';
      aviso.className = 'aviso';
    }

    UI.$('#panelResultado', raiz).innerHTML = [
      '<h3>Valor de venta del lote</h3>',
      '<div class="tabla-envoltura">',
      '<table class="tabla-resultado">',
      '  <thead><tr><th>Calidad</th><th>Piedras</th><th>Quilates</th><th>Valor venta</th><th>Costo asignado</th><th>Utilidad</th><th>Precio/piedra</th></tr></thead>',
      '  <tbody>',
      r.detalle.map(function (d) {
        return [
          '<tr>',
          '<td><span class="etiqueta-calidad ' + d.calidad + '">' + (Store.datos.config.codigoCalidad[d.calidad] || '') + '</span> ' + UI.nombreCalidad(d.calidad),
          d.cantidad ? '<span class="pista-inline">' + UI.pct(d.proporcion, 0) + ' del lote</span>' : '',
          '</td>',
          '<td>' + UI.numero(d.cantidad) + '</td>',
          '<td>' + UI.numero(d.quilates, 2) + '</td>',
          '<td class="fuerte">' + UI.cop(d.valorVenta) + '</td>',
          '<td>' + UI.cop(d.costoAsignado) + '</td>',
          '<td class="' + UI.claseSigno(d.utilidad) + '">' + UI.cop(d.utilidad) + '</td>',
          '<td>' + UI.cop(d.valorPromedioPiedra) + '</td>',
          '</tr>'
        ].join('');
      }).join(''),
      '  </tbody>',
      '  <tfoot><tr><th>Total</th><th>' + UI.numero(r.cantidadTotal) + '</th><th>' + UI.numero(r.quilatesTotal, 2) + '</th>',
      '  <th>' + UI.cop(r.ventaTotal) + '</th><th>' + UI.cop(r.costoTotal) + '</th>',
      '  <th class="' + UI.claseSigno(r.utilidad) + '">' + UI.cop(r.utilidad) + '</th><th></th></tr></tfoot>',
      '</table>',
      '</div>',

      '<div class="indicadores">',
      indicador('Costo por piedra', UI.cop(r.costoPorPiedra)),
      indicador('Costo por quilate', UI.cop(r.costoPorQuilate)),
      indicador('Margen sobre venta', UI.pct(r.margenSobrePrecio), UI.claseSigno(r.utilidad)),
      indicador('Retorno sobre costo', UI.pct(r.margenSobreCosto), UI.claseSigno(r.utilidad)),
      '</div>',

      '<div class="bloque-equilibrio">',
      '  <h4>Punto de equilibrio del lote</h4>',
      '  <p>Recuperas lo invertido vendiendo el <strong>' + UI.pct(r.equilibrioPorcentaje, 1) + '</strong> del lote: ',
      '  aprox. <strong>' + UI.numero(r.equilibrioPiedras, 0) + ' piedras</strong> (' + UI.numero(r.equilibrioQuilates, 2) + ' ct). Lo demás es ganancia.</p>',
      '</div>',
      '<p class="ayuda">El costo del lote se reparte entre calidades en proporción a su valor de venta, no por número de piedras: así una piedra alta carga más costo que una baja.</p>'
    ].join('');
  }

  function indicador(titulo, valor, clase) {
    return '<div class="indicador"><span>' + titulo + '</span><strong class="' + (clase || '') + '">' + valor + '</strong></div>';
  }

  /* Cada calidad del lote se vuelve un grupo de piedras iguales en el
     inventario, con el quilate promedio y el costo que le tocó. */
  function pasarAInventario(lote) {
    var r = Calc.lote(lote, Store.datos.config.precioQuilate);
    var grupos = r.detalle.filter(function (d) { return d.cantidad > 0; });
    if (!grupos.length) { UI.toast('El lote no tiene piedras repartidas por calidad.'); return false; }
    if (grupos.some(function (d) { return !d.quilates; }) &&
        !confirm('Hay calidades sin quilates: esas piedras entrarán con peso 0. ¿Continuar?')) return false;

    var nuevos = [];
    grupos.forEach(function (d) {
      var codigo = Inventario.siguienteCodigo(d.calidad, nuevos.map(function (p) { return p.codigo; }));
      nuevos.push({
        id: Store.id(), fecha: Store.hoy(), codigo: codigo, calidad: d.calidad,
        quilates: Math.round(d.quilatePromedio * 100) / 100,
        cantidad: d.cantidad,
        costo: Math.round(d.costoPorPiedra),
        nota: 'Del lote ' + lote.nombre,
        loteId: lote.id
      });
    });
    Array.prototype.unshift.apply(Store.datos.piedras, nuevos);
    lote.enInventario = Store.hoy();
    Store.guardar();
    UI.toast(r.cantidadTotal + ' piedras pasaron al inventario en ' + nuevos.length + ' grupo' + (nuevos.length === 1 ? '' : 's') + '. Están en Piedra.');
    return true;
  }

  function pintarLista(raiz) {
    var cont = UI.$('#listaLotes', raiz);
    var lotes = Store.datos.lotes;
    if (!lotes.length) { cont.innerHTML = '<p class="vacio">Aún no has guardado lotes.</p>'; return; }
    cont.innerHTML = lotes.map(function (l) {
      var r = Calc.lote(l, Store.datos.config.precioQuilate);
      var estado = Inventario.estadoLote(l);
      return [
        '<div class="item-lista">',
        '  <div class="cuerpo-item"><strong>' + escapar(l.nombre) + '</strong>' +
          (estado.texto ? '<span class="' + estado.clase + '">' + estado.texto + (l.vendido && l.comprador ? ' a ' + escapar(l.comprador) : '') + '</span>' : ''),
        '  <span class="pista">' + UI.fecha(l.fecha) + ' · ' + UI.numero(r.cantidadTotal) + ' piedras · costo ' + UI.cop(l.costoTotal) + ' · venta ' + UI.cop(r.ventaTotal) + '</span></div>',
        '  <div class="fila-botones">',
        estado.clave === 'libre' && r.cantidadTotal ? '    <button class="boton pequeno" data-inventario="' + l.id + '" title="Crea las piedras en Piedra para usarlas en productos o venderlas sueltas">Pasar a inventario</button>' : '',
        '    <button class="boton pequeno" data-cargar="' + l.id + '">Abrir</button>',
        '    <button class="boton pequeno peligro" data-borrar="' + l.id + '">Borrar</button>',
        '  </div>',
        '</div>'
      ].join('');
    }).join('');

    UI.$$('[data-inventario]', cont).forEach(function (b) {
      b.addEventListener('click', function () {
        var l = Inventario.buscarLote(b.getAttribute('data-inventario'));
        if (!l) return;
        if (pasarAInventario(l)) {
          if (borrador && borrador.id === l.id) { borrador = JSON.parse(JSON.stringify(l)); App.recargar(); }
          else pintarLista(raiz);
        }
      });
    });
    UI.$$('[data-cargar]', cont).forEach(function (b) {
      b.addEventListener('click', function () {
        var l = Inventario.buscarLote(b.getAttribute('data-cargar'));
        borrador = JSON.parse(JSON.stringify(l));
        App.recargar();
      });
    });
    UI.$$('[data-borrar]', cont).forEach(function (b) {
      b.addEventListener('click', function () {
        var id = b.getAttribute('data-borrar');
        var l = Inventario.buscarLote(id);
        if (l && l.enInventario && !confirm('Las piedras que salieron de «' + l.nombre + '» se quedan en el inventario. ¿Borrar el lote?')) return;
        if (l && l.vendido && !confirm('«' + l.nombre + '» tiene una venta registrada; la venta se conserva. ¿Borrar el lote?')) return;
        Store.datos.lotes = Store.datos.lotes.filter(function (x) { return x.id !== id; });
        Store.guardar();
        if (borrador && borrador.id === id) borrador.id = null;
        pintarLista(raiz);
      });
    });
  }

  global.Vistas = global.Vistas || {};
  global.Vistas.lote = { titulo: 'Lote', render: render };
})(window);

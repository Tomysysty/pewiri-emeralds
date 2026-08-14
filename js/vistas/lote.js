/* Vista: Lote — costo del lote, reparto por calidad, pesaje y valor de venta. */
(function (global) {
  'use strict';

  var borrador = null;

  function nuevoBorrador() {
    return {
      id: null,
      nombre: '',
      fecha: Store.hoy(),
      costoTotal: 0,
      cantidadPiedras: 0,
      distribucion: { baja: { cantidad: 0, quilates: 0 }, media: { cantidad: 0, quilates: 0 }, alta: { cantidad: 0, quilates: 0 } }
    };
  }

  function render(raiz) {
    if (!borrador) borrador = nuevoBorrador();
    var cfg = Store.datos.config;

    raiz.innerHTML = [
      '<div class="encabezado-vista">',
      '  <div><h2>Lote</h2><p class="ayuda">Ingresa lo que costó el lote y cómo se reparte por calidad. El valor de venta sale del precio por quilate de cada calidad.</p></div>',
      '  <div class="fila-botones">',
      '    <button class="boton" id="nuevoLote">Nuevo lote</button>',
      '    <button class="boton primario" id="guardarLote">Guardar lote</button>',
      '  </div>',
      '</div>',

      '<div class="dos-columnas">',
      '  <div>',
      '    <section class="tarjeta">',
      '      <h3>Datos del lote</h3>',
      '      <div class="rejilla-2">',
      '        <div class="campo"><label>Nombre o referencia</label><input type="text" data-campo="nombre" value="' + escapar(borrador.nombre) + '" placeholder="Lote Muzo enero"></div>',
      '        <div class="campo"><label>Fecha</label><input type="date" data-campo="fecha" value="' + borrador.fecha + '"></div>',
      '        <div class="campo"><label>Costo total del lote</label><input type="number" min="0" step="10000" data-campo="costoTotal" value="' + borrador.costoTotal + '"></div>',
      '        <div class="campo"><label>Cantidad de piedras del lote</label><input type="number" min="0" step="1" data-campo="cantidadPiedras" value="' + borrador.cantidadPiedras + '"></div>',
      '      </div>',
      '    </section>',

      '    <section class="tarjeta">',
      '      <h3>Reparto por calidad y pesaje</h3>',
      '      <p class="ayuda">Cuántas piedras hay de cada calidad y cuántos quilates suman. Si prefieres, reparte por porcentaje y el programa calcula las cantidades.</p>',
      '      <div class="tabla-envoltura">',
      '      <table class="tabla-entrada">',
      '        <thead><tr><th>Calidad</th><th>% del lote</th><th>N.º piedras</th><th>Quilates totales</th><th>Quilate prom.</th></tr></thead>',
      '        <tbody>',
      Calc.CALIDADES.map(function (q) {
        var d = borrador.distribucion[q];
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
      '        <button class="boton" id="repartir">Repartir por porcentaje</button>',
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

    raiz.addEventListener('input', function () { sincronizar(raiz); });
    raiz.addEventListener('change', function () { sincronizar(raiz); });

    UI.$('#repartir', raiz).addEventListener('click', function () {
      var total = Calc.num(UI.$('[data-campo="cantidadPiedras"]', raiz).value);
      if (!total) { UI.toast('Primero escribe la cantidad de piedras del lote.'); return; }
      var pcts = {}, suma = 0;
      Calc.CALIDADES.forEach(function (q) {
        pcts[q] = Calc.num(UI.$('[data-pct="' + q + '"]', raiz).value);
        suma += pcts[q];
      });
      if (!suma) { UI.toast('Escribe los porcentajes de cada calidad.'); return; }
      if (Math.abs(suma - 100) > 0.5) UI.toast('Los porcentajes suman ' + UI.numero(suma) + ' %. Se reparte proporcionalmente.');
      var asignadas = 0, ultima = null;
      Calc.CALIDADES.forEach(function (q, i) {
        var input = UI.$('[data-campo="distribucion.' + q + '.cantidad"]', raiz);
        if (i < Calc.CALIDADES.length - 1) {
          var n = Math.round(total * (pcts[q] / suma));
          input.value = n;
          asignadas += n;
        } else {
          ultima = input;
        }
      });
      if (ultima) ultima.value = Math.max(0, total - asignadas);
      sincronizar(raiz);
    });

    UI.$('#nuevoLote', raiz).addEventListener('click', function () {
      borrador = nuevoBorrador();
      App.recargar();
    });

    UI.$('#guardarLote', raiz).addEventListener('click', function () {
      leerBorrador(raiz);
      if (!borrador.nombre) borrador.nombre = 'Lote ' + UI.fecha(borrador.fecha);
      if (borrador.id) {
        var i = Store.datos.lotes.findIndex(function (l) { return l.id === borrador.id; });
        if (i >= 0) Store.datos.lotes[i] = JSON.parse(JSON.stringify(borrador));
      } else {
        borrador.id = Store.id();
        Store.datos.lotes.unshift(JSON.parse(JSON.stringify(borrador)));
      }
      Store.guardar();
      pintarLista(raiz);
      UI.toast('Lote guardado.');
    });

    sincronizar(raiz);
    pintarLista(raiz);
  }

  function escapar(s) { return String(s || '').replace(/"/g, '&quot;'); }

  function leerBorrador(raiz) {
    var form = UI.leerFormulario(raiz);
    borrador.nombre = form.nombre;
    borrador.fecha = form.fecha;
    borrador.costoTotal = Calc.num(form.costoTotal);
    borrador.cantidadPiedras = Calc.num(form.cantidadPiedras);
    Calc.CALIDADES.forEach(function (q) {
      borrador.distribucion[q] = {
        cantidad: Calc.num(form.distribucion[q].cantidad),
        quilates: Calc.num(form.distribucion[q].quilates)
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
    if (borrador.cantidadPiedras && !r.cuadra) {
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

  function pintarLista(raiz) {
    var cont = UI.$('#listaLotes', raiz);
    var lotes = Store.datos.lotes;
    if (!lotes.length) { cont.innerHTML = '<p class="vacio">Aún no has guardado lotes.</p>'; return; }
    cont.innerHTML = lotes.map(function (l) {
      var r = Calc.lote(l, Store.datos.config.precioQuilate);
      return [
        '<div class="item-lista">',
        '  <div><strong>' + l.nombre + '</strong><span class="pista">' + UI.fecha(l.fecha) + ' · ' + UI.numero(r.cantidadTotal) + ' piedras · costo ' + UI.cop(l.costoTotal) + ' · venta ' + UI.cop(r.ventaTotal) + '</span></div>',
        '  <div class="fila-botones">',
        '    <button class="boton pequeno" data-cargar="' + l.id + '">Abrir</button>',
        '    <button class="boton pequeno peligro" data-borrar="' + l.id + '">Borrar</button>',
        '  </div>',
        '</div>'
      ].join('');
    }).join('');

    UI.$$('[data-cargar]', cont).forEach(function (b) {
      b.addEventListener('click', function () {
        var l = Store.datos.lotes.find(function (x) { return x.id === b.getAttribute('data-cargar'); });
        borrador = JSON.parse(JSON.stringify(l));
        App.recargar();
      });
    });
    UI.$$('[data-borrar]', cont).forEach(function (b) {
      b.addEventListener('click', function () {
        var id = b.getAttribute('data-borrar');
        Store.datos.lotes = Store.datos.lotes.filter(function (x) { return x.id !== id; });
        Store.guardar();
        pintarLista(raiz);
      });
    });
  }

  global.Vistas = global.Vistas || {};
  global.Vistas.lote = { titulo: 'Lote', render: render };
})(window);

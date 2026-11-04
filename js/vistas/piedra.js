/* Vista: Piedra individual — una sola piedra, fuera de lote. También es el
   inventario: aquí se ve qué hay disponible, qué está montado y qué se vendió. */
(function (global) {
  'use strict';

  // Evaluación SVP-9 de la que se trajeron los datos (si se trajeron).
  var evaluacionId = null;

  function render(raiz) {
    var cfg = Store.datos.config;
    var evaluaciones = Store.datos.evaluaciones || [];
    evaluacionId = null;

    raiz.innerHTML = [
      '<div class="encabezado-vista">',
      '  <div><h2>Piedra individual</h2><p class="ayuda">Para piedras sueltas. El valor de venta es quilates × precio del quilate de su calidad. Las piedras guardadas forman el inventario que usan Producto y Venta.</p></div>',
      '  <button class="boton primario" id="guardarPiedra">Guardar piedra</button>',
      '</div>',

      '<div class="dos-columnas">',
      '  <div>',
      '    <section class="tarjeta">',
      '      <h3>Datos de la piedra</h3>',
      evaluaciones.length ? [
        '      <div class="campo" style="margin-bottom:1rem"><label>Traer de una evaluación SVP-9</label><select id="traerEvaluacion">',
        '        <option value="">Elegir evaluación (opcional)…</option>',
        evaluaciones.map(function (e) {
          var q = Inventario.calidadDeEvaluacion(e);
          return '<option value="' + e.id + '">' + escapar(e.codigo || 'Sin código') + (e.pesoCt ? ' · ' + UI.numero(e.pesoCt, 2) + ' ct' : '') + ' · ' + q.nivel + '</option>';
        }).join(''),
        '      </select><span class="pista">Copia el peso, el código y la procedencia, y sugiere la calidad según el nivel SVP-9.</span></div>'
      ].join('') : '',
      '      <div class="rejilla-2">',
      '        <div class="campo"><label>Código o nombre</label><input type="text" data-campo="codigo" data-auto></div>',
      '        <div class="campo campo-completo"><label>Calidad</label><select data-campo="calidad" data-segmentos="calidades">',
      Calc.CALIDADES.map(function (q) {
        var html = '<span class="etiqueta-calidad ' + q + '">' + escapar(cfg.codigoCalidad[q] || '') + '</span> ' + UI.nombreCalidad(q);
        return '<option value="' + q + '" data-html="' + escapar(html) + '" data-sub="' + UI.cop(cfg.precioQuilate[q]) + '/ct"' + (q === 'media' ? ' selected' : '') + '>' + UI.nombreCalidad(q) + '</option>';
      }).join(''),
      '        </select></div>',
      '        <div class="campo"><label>Peso en quilates (c/u)</label><input type="number" min="0" step="0.01" data-campo="quilates" value="1"></div>',
      '        <div class="campo"><label>Cantidad de piedras iguales</label><input type="number" min="1" step="1" data-campo="cantidad" value="1"></div>',
      '        <div class="campo"><label>Costo de adquisición (por piedra, opcional)</label><input type="number" min="0" step="1000" data-campo="costo" value="0"><span class="pista">Si lo dejas en cero, solo verás el valor de venta.</span></div>',
      '        <div class="campo"><label>Nota</label><input type="text" data-campo="nota" placeholder="origen, color, talla…"></div>',
      '      </div>',
      '    </section>',
      '  </div>',
      '  <div>',
      '    <section class="tarjeta resultado" id="panelPiedra"></section>',
      '    <section class="tarjeta"><h3>Inventario de piedras</h3><div id="listaPiedras"></div></section>',
      '  </div>',
      '</div>'
    ].join('');

    UI.segmentar(raiz);
    UI.armarAutos(raiz, function () { sincronizar(raiz); });
    raiz.addEventListener('input', function () { sincronizar(raiz); });
    raiz.addEventListener('change', function (e) {
      if (e.target.id === 'traerEvaluacion') { traerEvaluacion(raiz, e.target.value); return; }
      sincronizar(raiz);
    });

    UI.$('#guardarPiedra', raiz).addEventListener('click', function () {
      var f = UI.leerFormulario(raiz);
      var codigo = (f.codigo || '').trim() || Inventario.siguienteCodigo(f.calidad);
      if (Inventario.codigoEnUso(codigo)) {
        UI.toast('Ya hay una piedra con el código ' + codigo + '. Cámbialo o vuelve al código automático.');
        return;
      }
      if (Calc.num(f.quilates) <= 0) { UI.toast('Escribe el peso en quilates.'); return; }
      var piedra = {
        id: Store.id(), fecha: Store.hoy(), codigo: codigo, calidad: f.calidad,
        quilates: Calc.num(f.quilates), cantidad: Math.max(1, Math.round(Calc.num(f.cantidad))) || 1,
        costo: Calc.num(f.costo), nota: f.nota || ''
      };
      if (evaluacionId) piedra.evaluacionId = evaluacionId;
      Store.datos.piedras.unshift(piedra);
      Store.guardar();

      // Listo para la siguiente: el código vuelve a ser automático.
      evaluacionId = null;
      var sel = UI.$('#traerEvaluacion', raiz);
      if (sel) sel.value = '';
      UI.marcarManual(UI.$('[data-campo="codigo"]', raiz), false);
      sincronizar(raiz);
      pintarLista(raiz);
      UI.toast('Piedra ' + codigo + ' guardada en el inventario.');
    });

    sincronizar(raiz);
    pintarLista(raiz);
  }

  function escapar(s) { return String(s === undefined || s === null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }

  /* Copia lo que ya se sabe de la piedra desde su ficha SVP-9. */
  function traerEvaluacion(raiz, id) {
    var ev = (Store.datos.evaluaciones || []).find(function (x) { return x.id === id; });
    evaluacionId = ev ? ev.id : null;
    if (!ev) return;
    var q = Inventario.calidadDeEvaluacion(ev);
    UI.$('[data-campo="calidad"]', raiz).value = q.calidad;
    UI.segmentar(raiz);
    if (Calc.num(ev.pesoCt) > 0) UI.$('[data-campo="quilates"]', raiz).value = ev.pesoCt;
    var codigo = UI.$('[data-campo="codigo"]', raiz);
    if (ev.codigo && !Inventario.codigoEnUso(ev.codigo)) {
      codigo.value = ev.codigo;
      UI.marcarManual(codigo, true);
    }
    var nota = [ev.procedenciaTexto, ev.tratamientoTexto].filter(Boolean).join(' · ');
    if (nota) UI.$('[data-campo="nota"]', raiz).value = nota;
    sincronizar(raiz);
    UI.toast('Nivel ' + q.nivel + ' → calidad ' + UI.nombreCalidad(q.calidad) + '. Puedes cambiarla.');
  }

  function sincronizar(raiz) {
    var f = UI.leerFormulario(raiz);
    UI.auto(UI.$('[data-campo="codigo"]', raiz), Inventario.siguienteCodigo(f.calidad));

    var r = Calc.piedra(f, Store.datos.config.precioQuilate);
    var hayCosto = r.costoTotal > 0;

    UI.$('#panelPiedra', raiz).innerHTML = [
      '<h3>Valor de venta</h3>',
      '<div class="precio-grande">' + UI.cop(r.valorUnitario) + '<span>por piedra</span></div>',
      '<div class="indicadores">',
      '<div class="indicador"><span>Precio del quilate</span><strong>' + UI.cop(r.precioQuilate) + '</strong></div>',
      '<div class="indicador"><span>Peso</span><strong>' + UI.numero(r.quilates, 2) + ' ct</strong></div>',
      '<div class="indicador"><span>Total (' + UI.numero(r.cantidad) + ' piedras)</span><strong>' + UI.cop(r.valorTotal) + '</strong></div>',
      '</div>',
      hayCosto ? [
        '<div class="bloque-equilibrio">',
        '<h4>Frente al costo</h4>',
        '<p>Costo total ' + UI.cop(r.costoTotal) + ' · Utilidad <strong class="' + UI.claseSigno(r.utilidad) + '">' + UI.cop(r.utilidad) + '</strong>',
        ' · Margen sobre venta ' + UI.pct(r.margenSobrePrecio) + ' · Retorno sobre costo ' + UI.pct(r.margenSobreCosto) + '</p>',
        '</div>'
      ].join('') : ''
    ].join('');
  }

  function itemPiedra(p) {
    var r = Calc.piedra(p, Store.datos.config.precioQuilate);
    var e = Inventario.estadoPiedra(p);
    var lote = p.loteId ? Inventario.buscarLote(p.loteId) : null;

    var destinos = e.productos.map(function (x) {
      return '<li>' + x.cantidad + ' en <strong>' + escapar(x.producto.nombre) + '</strong>' +
        (x.producto.vendido ? ' <span class="insignia-vendido">Vendido' + (x.producto.comprador ? ' a ' + escapar(x.producto.comprador) : '') + '</span>' : ' <span class="pista-inline">sin vender</span>') + '</li>';
    });
    if (e.vendidas) destinos.push('<li>' + e.vendidas + ' vendida' + (e.vendidas > 1 ? 's' : '') + ' suelta' + (e.vendidas > 1 ? 's' : '') + '</li>');

    return [
      '<div class="item-lista">',
      '  <div class="cuerpo-item"><strong>' + escapar(p.codigo) + '</strong> <span class="etiqueta-calidad ' + p.calidad + '">' + UI.nombreCalidad(p.calidad) + '</span>',
      '  <span class="' + e.clase + '">' + e.etiqueta + '</span>',
      '  <span class="pista">' + UI.numero(p.quilates, 2) + ' ct c/u · ' + UI.cop(r.valorUnitario) + ' c/u' + (e.total > 1 ? ' · ' + e.total + ' piedras' : '') +
        (lote ? ' · del lote ' + escapar(lote.nombre) : '') + (p.nota ? ' · ' + escapar(p.nota) : '') + '</span>',
      destinos.length ? '  <details class="desplegable"><summary>Dónde está</summary><ul>' + destinos.join('') + '</ul></details>' : '',
      '  </div>',
      '  <button class="boton pequeno peligro" data-borrar="' + p.id + '">Borrar</button>',
      '</div>'
    ].join('');
  }

  function pintarLista(raiz) {
    var cont = UI.$('#listaPiedras', raiz);
    var piedras = Store.datos.piedras;
    if (!piedras.length) { cont.innerHTML = '<p class="vacio">Aún no has guardado piedras.</p>'; return; }

    var conExistencias = piedras.filter(function (p) { return Inventario.disponibles(p) > 0; });
    var sinExistencias = piedras.filter(function (p) { return Inventario.disponibles(p) === 0; });
    var quedan = conExistencias.reduce(function (a, p) { return a + Inventario.disponibles(p); }, 0);

    cont.innerHTML = [
      conExistencias.length
        ? '<p class="aviso">' + quedan + ' piedra' + (quedan === 1 ? '' : 's') + ' disponible' + (quedan === 1 ? '' : 's') + ' para productos o venta.</p>' + conExistencias.map(itemPiedra).join('')
        : '<p class="vacio">No quedan piedras disponibles.</p>',
      sinExistencias.length ? [
        '<details class="desplegable grupo"><summary>Montadas o vendidas (' + sinExistencias.length + ')</summary>',
        sinExistencias.map(itemPiedra).join(''),
        '</details>'
      ].join('') : ''
    ].join('');

    UI.$$('[data-borrar]', cont).forEach(function (b) {
      b.addEventListener('click', function () {
        var id = b.getAttribute('data-borrar');
        var p = Inventario.buscarPiedra(id);
        var e = p && Inventario.estadoPiedra(p);
        if (e && (e.montadas || e.vendidas) &&
            !confirm('La piedra ' + p.codigo + ' está en productos o ventas. Esos registros conservan sus datos, pero pierden el vínculo con el inventario. ¿Borrarla?')) return;
        Store.datos.piedras = Store.datos.piedras.filter(function (x) { return x.id !== id; });
        Store.guardar();
        sincronizar(raiz);
        pintarLista(raiz);
      });
    });
  }

  global.Vistas = global.Vistas || {};
  global.Vistas.piedra = { titulo: 'Piedra individual', render: render };
})(window);

/* Vista: Piedra individual — una sola piedra, fuera de lote. */
(function (global) {
  'use strict';

  function render(raiz) {
    var cfg = Store.datos.config;

    raiz.innerHTML = [
      '<div class="encabezado-vista">',
      '  <div><h2>Piedra individual</h2><p class="ayuda">Para piedras sueltas. El valor de venta es quilates × precio del quilate de su calidad.</p></div>',
      '  <button class="boton primario" id="guardarPiedra">Guardar piedra</button>',
      '</div>',

      '<div class="dos-columnas">',
      '  <div>',
      '    <section class="tarjeta">',
      '      <h3>Datos de la piedra</h3>',
      '      <div class="rejilla-2">',
      '        <div class="campo"><label>Código o nombre</label><input type="text" data-campo="codigo" placeholder="Automático"></div>',
      '        <div class="campo"><label>Calidad</label><select data-campo="calidad">',
      Calc.CALIDADES.map(function (q) {
        return '<option value="' + q + '"' + (q === 'media' ? ' selected' : '') + '>' + UI.nombreCalidad(q) + ' (' + (cfg.codigoCalidad[q] || '') + '), ' + UI.cop(cfg.precioQuilate[q]) + '/ct</option>';
      }).join(''),
      '        </select></div>',
      '        <div class="campo"><label>Peso en quilates</label><input type="number" min="0" step="0.01" data-campo="quilates" value="1"></div>',
      '        <div class="campo"><label>Cantidad de piedras iguales</label><input type="number" min="1" step="1" data-campo="cantidad" value="1"></div>',
      '        <div class="campo"><label>Costo de adquisición (por piedra, opcional)</label><input type="number" min="0" step="1000" data-campo="costo" value="0"><span class="pista">Si lo dejas en cero, solo verás el valor de venta.</span></div>',
      '        <div class="campo"><label>Nota</label><input type="text" data-campo="nota" placeholder="origen, color, talla…"></div>',
      '      </div>',
      '    </section>',
      '  </div>',
      '  <div>',
      '    <section class="tarjeta resultado" id="panelPiedra"></section>',
      '    <section class="tarjeta"><h3>Piedras guardadas</h3><div id="listaPiedras"></div></section>',
      '  </div>',
      '</div>'
    ].join('');

    raiz.addEventListener('input', function () { sincronizar(raiz); });
    raiz.addEventListener('change', function () { sincronizar(raiz); });

    UI.$('#guardarPiedra', raiz).addEventListener('click', function () {
      var f = UI.leerFormulario(raiz);
      var codigo = (f.codigo || '').trim() || generarCodigo(f.calidad);
      Store.datos.piedras.unshift({
        id: Store.id(), fecha: Store.hoy(), codigo: codigo, calidad: f.calidad,
        quilates: Calc.num(f.quilates), cantidad: Calc.num(f.cantidad) || 1,
        costo: Calc.num(f.costo), nota: f.nota || ''
      });
      Store.guardar();
      pintarLista(raiz);
      UI.toast('Piedra ' + codigo + ' guardada.');
    });

    sincronizar(raiz);
    pintarLista(raiz);
  }

  function generarCodigo(calidad) {
    var cfg = Store.datos.config;
    var prefijo = cfg.codigoCalidad[calidad] || 'X';
    var n = Store.datos.piedras.filter(function (p) { return p.calidad === calidad; }).length + 1;
    return prefijo + '-' + String(n).padStart(3, '0');
  }

  function sincronizar(raiz) {
    var f = UI.leerFormulario(raiz);
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

  function pintarLista(raiz) {
    var cont = UI.$('#listaPiedras', raiz);
    var piedras = Store.datos.piedras;
    if (!piedras.length) { cont.innerHTML = '<p class="vacio">Aún no has guardado piedras.</p>'; return; }
    cont.innerHTML = piedras.map(function (p) {
      var r = Calc.piedra(p, Store.datos.config.precioQuilate);
      return [
        '<div class="item-lista">',
        '  <div><strong>' + p.codigo + '</strong> <span class="etiqueta-calidad ' + p.calidad + '">' + UI.nombreCalidad(p.calidad) + '</span>',
        '  <span class="pista">' + UI.numero(p.quilates, 2) + ' ct · ' + UI.cop(r.valorUnitario) + (p.nota ? ' · ' + p.nota : '') + '</span></div>',
        '  <button class="boton pequeno peligro" data-borrar="' + p.id + '">Borrar</button>',
        '</div>'
      ].join('');
    }).join('');

    UI.$$('[data-borrar]', cont).forEach(function (b) {
      b.addEventListener('click', function () {
        var id = b.getAttribute('data-borrar');
        Store.datos.piedras = Store.datos.piedras.filter(function (x) { return x.id !== id; });
        Store.guardar();
        pintarLista(raiz);
      });
    });
  }

  global.Vistas = global.Vistas || {};
  global.Vistas.piedra = { titulo: 'Piedra individual', render: render };
})(window);

/* Vista: Mercado — variación del precio de la esmeralda y de los metales. */
(function (global) {
  'use strict';

  var COLORES = {
    'esmeralda-alta': '#1f4a3a',
    'esmeralda-media': '#3f8f7a',
    'esmeralda-baja': '#8b7cb8',
    'oro-18k': '#9a7b28',
    'oro-14k': '#c0a250',
    'plata-925': '#7b8f88'
  };
  var PALETA = ['#a4453f', '#4a6fa5', '#6b8f3a', '#a86c2f', '#7a5b8f'];
  var seleccion = null;

  function itemsDisponibles() {
    var items = Calc.CALIDADES.map(function (q) {
      return { clave: 'esmeralda-' + q, nombre: 'Esmeralda ' + UI.nombreCalidad(q) + ' (por quilate)' };
    });
    var metales = Store.datos.config.metales;
    Object.keys(metales).forEach(function (k) {
      items.push({ clave: k, nombre: metales[k].nombre + ' (por gramo)' });
    });
    return items;
  }

  function color(clave, i) {
    return COLORES[clave] || PALETA[i % PALETA.length];
  }

  function render(raiz) {
    var items = itemsDisponibles();
    if (!seleccion) seleccion = ['esmeralda-baja', 'esmeralda-media', 'esmeralda-alta'];

    raiz.innerHTML = [
      '<div class="encabezado-vista">',
      '  <div><h2>Mercado</h2><p class="ayuda">Cada vez que guardas un precio en Configuración queda un registro aquí. También puedes anotar precios manualmente.</p></div>',
      '</div>',

      '<section class="tarjeta">',
      '  <h3>Variación de precios</h3>',
      '  <div class="filtros" id="filtros">',
      items.map(function (it, i) {
        var activo = seleccion.indexOf(it.clave) >= 0;
        return '<label class="filtro' + (activo ? ' activo' : '') + '"><input type="checkbox" value="' + it.clave + '"' + (activo ? ' checked' : '') + '><i style="background:' + color(it.clave, i) + '"></i>' + it.nombre + '</label>';
      }).join(''),
      '  </div>',
      '  <div id="grafica"></div>',
      '  <div class="indicadores" id="resumenVariacion"></div>',
      '</section>',

      '<div class="dos-columnas">',
      '  <section class="tarjeta">',
      '    <h3>Anotar un precio</h3>',
      '    <div class="rejilla-3">',
      '      <div class="campo"><label>Fecha</label><input type="date" id="regFecha" value="' + Store.hoy() + '"></div>',
      '      <div class="campo"><label>Concepto</label><select id="regItem">',
      items.map(function (it) { return '<option value="' + it.clave + '">' + it.nombre + '</option>'; }).join(''),
      '      </select></div>',
      '      <div class="campo"><label>Valor</label><input type="number" min="0" step="1000" id="regValor"></div>',
      '    </div>',
      '    <div class="fila-botones">',
      '      <button class="boton primario" id="agregarRegistro">Agregar registro</button>',
      '      <label class="casilla"><input type="checkbox" id="regActualizaConfig" checked> Actualizar también el precio en Configuración</label>',
      '    </div>',
      '  </section>',

      '  <section class="tarjeta">',
      '    <h3>Historial</h3>',
      '    <div id="tablaHistorial"></div>',
      '  </section>',
      '</div>'
    ].join('');

    UI.$$('#filtros input', raiz).forEach(function (chk) {
      chk.addEventListener('change', function () {
        seleccion = UI.$$('#filtros input:checked', raiz).map(function (c) { return c.value; });
        UI.$$('.filtro', raiz).forEach(function (l) {
          l.classList.toggle('activo', l.querySelector('input').checked);
        });
        dibujar(raiz);
      });
    });

    UI.$('#agregarRegistro', raiz).addEventListener('click', function () {
      var fecha = UI.$('#regFecha', raiz).value || Store.hoy();
      var item = UI.$('#regItem', raiz).value;
      var valor = Calc.num(UI.$('#regValor', raiz).value);
      if (!valor) { UI.toast('Escribe el valor.'); return; }

      // ¿Es el registro más reciente de ese concepto? Solo entonces
      // tiene sentido que reemplace el precio vigente en Configuración.
      var esElMasReciente = Store.datos.historial
        .filter(function (h) { return h.item === item; })
        .every(function (h) { return new Date(h.fecha) <= new Date(fecha); });

      Store.registrarPrecio(item, valor, fecha);

      var actualizoConfig = false;
      if (UI.$('#regActualizaConfig', raiz).checked && esElMasReciente) {
        var cfg = Store.datos.config;
        if (item.indexOf('esmeralda-') === 0) {
          cfg.precioQuilate[item.replace('esmeralda-', '')] = valor;
          actualizoConfig = true;
        } else if (cfg.metales[item]) {
          cfg.metales[item].precioGramo = valor;
          actualizoConfig = true;
        }
      }
      Store.guardar();
      UI.$('#regValor', raiz).value = '';
      dibujar(raiz);
      UI.toast(actualizoConfig
        ? 'Registro agregado y precio actualizado en Configuración.'
        : (esElMasReciente ? 'Registro agregado.' : 'Registro histórico agregado. No se tocó el precio vigente porque hay registros más recientes.'));
    });

    dibujar(raiz);
  }

  function dibujar(raiz) {
    var items = itemsDisponibles();
    var historial = Store.datos.historial;

    var series = items.filter(function (it) { return seleccion.indexOf(it.clave) >= 0; })
      .map(function (it, i) {
        return {
          nombre: it.nombre,
          color: color(it.clave, items.findIndex(function (x) { return x.clave === it.clave; })),
          puntos: historial.filter(function (h) { return h.item === it.clave; })
            .map(function (h) { return { fecha: h.fecha, valor: h.valor }; })
        };
      });

    Grafica.linea(UI.$('#grafica', raiz), series);

    UI.$('#resumenVariacion', raiz).innerHTML = series.filter(function (s) { return s.puntos.length; })
      .map(function (s) {
        var v = Calc.variacion(s.puntos);
        var signo = v.variacionTotal > 0 ? '▲' : (v.variacionTotal < 0 ? '▼' : '=');
        return [
          '<div class="indicador">',
          '<span>' + s.nombre + '</span>',
          '<strong>' + UI.cop(v.ultimo) + '</strong>',
          '<em class="' + UI.claseSigno(v.variacionTotal) + '">' + signo + ' ' + UI.pct(v.variacionTotalPct) + ' desde ' + UI.fecha(v.puntos[0].fecha) + '</em>',
          '</div>'
        ].join('');
      }).join('') || '<p class="vacio">Selecciona al menos un concepto con registros.</p>';

    pintarHistorial(raiz);
  }

  function pintarHistorial(raiz) {
    var items = itemsDisponibles();
    var nombres = {};
    items.forEach(function (it) { nombres[it.clave] = it.nombre; });

    var historial = Store.datos.historial.slice().sort(function (a, b) {
      return new Date(b.fecha) - new Date(a.fecha);
    });

    var cont = UI.$('#tablaHistorial', raiz);
    if (!historial.length) { cont.innerHTML = '<p class="vacio">Sin registros todavía.</p>'; return; }

    // variación frente al registro anterior del mismo concepto
    var previos = {};
    Store.datos.historial.forEach(function (h) {
      previos[h.item] = previos[h.item] || [];
      previos[h.item].push(h);
    });

    cont.innerHTML = [
      '<div class="tabla-envoltura">',
      '<table class="tabla-resultado">',
      '<thead><tr><th>Fecha</th><th>Concepto</th><th>Valor</th><th>Cambio</th><th></th></tr></thead>',
      '<tbody>',
      historial.slice(0, 40).map(function (h) {
        var lista = previos[h.item] || [];
        var idx = lista.findIndex(function (x) { return x.id === h.id; });
        var anterior = idx > 0 ? Calc.num(lista[idx - 1].valor) : null;
        var cambio = anterior === null ? null : (Calc.num(h.valor) - anterior) / (anterior || 1);
        return [
          '<tr>',
          '<td>' + UI.fecha(h.fecha) + '</td>',
          '<td>' + (nombres[h.item] || h.item) + '</td>',
          '<td>' + UI.cop(h.valor) + '</td>',
          '<td class="' + (cambio === null ? '' : UI.claseSigno(cambio)) + '">' + (cambio === null ? '—' : UI.pct(cambio)) + '</td>',
          '<td><button class="boton icono" data-borrar-reg="' + h.id + '" title="Eliminar">✕</button></td>',
          '</tr>'
        ].join('');
      }).join(''),
      '</tbody></table></div>'
    ].join('');

    UI.$$('[data-borrar-reg]', cont).forEach(function (b) {
      b.addEventListener('click', function () {
        var id = b.getAttribute('data-borrar-reg');
        Store.datos.historial = Store.datos.historial.filter(function (x) { return x.id !== id; });
        Store.guardar();
        dibujar(raiz);
      });
    });
  }

  global.Vistas = global.Vistas || {};
  global.Vistas.mercado = { titulo: 'Mercado', render: render };
})(window);

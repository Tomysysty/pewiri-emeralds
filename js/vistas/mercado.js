/* Vista: Mercado — variación del precio de la esmeralda y de los metales. */
(function (global) {
  'use strict';

  var COLORES = {
    'esmeralda-exclusiva': '#4a6fa5',
    'esmeralda-muyAlta': '#a4453f',
    'esmeralda-alta': '#1f4a3a',
    'esmeralda-media': '#3f8f7a',
    'esmeralda-baja': '#8b7cb8',
    'esmeralda-muyBaja': '#9aa8a0',
    'oro-18k': '#9a7b28',
    'oro-14k': '#c0a250',
    'plata-925': '#7b8f88'
  };
  var PALETA = ['#a4453f', '#4a6fa5', '#6b8f3a', '#a86c2f', '#7a5b8f'];
  var seleccion = null;
  var periodo = 12;      // meses hacia atrás; 0 = todo
  var modo = 'pesos';    // 'pesos' | 'pct'
  var raizActual = null;

  /* Arranca mostrando lo que de verdad se mueve: el primer metal que sigue
     el mercado y las calidades de esmeralda cuyo precio ya cambió alguna vez. */
  function seleccionInicial(items) {
    var metales = Store.datos.config.metales;
    var oro = Object.keys(metales).filter(function (k) { return Precios.receta(metales[k]).auto; })[0];
    var conCambios = items.filter(function (it) {
      if (it.clave.indexOf('esmeralda-') !== 0) return false;
      var valores = {};
      Store.datos.historial.forEach(function (h) { if (h.item === it.clave) valores[h.valor] = true; });
      return Object.keys(valores).length > 1;
    }).map(function (it) { return it.clave; });
    var out = (oro ? [oro] : []).concat(conCambios);
    return out.length ? out : ['esmeralda-baja', 'esmeralda-media', 'esmeralda-alta'];
  }

  function fechaHaceMeses(n) {
    var d = new Date();
    d.setMonth(d.getMonth() - n);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

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
    if (!seleccion) seleccion = seleccionInicial(items);
    raizActual = raiz;

    raiz.innerHTML = [
      '<div class="encabezado-vista">',
      '  <div><h2>Mercado</h2><p class="ayuda">Los metales siguen el precio internacional y la TRM solos, y cada día queda un registro aquí. Los precios de la esmeralda se registran al guardarlos en Configuración; también puedes anotar precios a mano.</p></div>',
      '</div>',

      '<div class="bloque-metal" data-estado-precios style="margin-bottom:1.3rem">' + Precios.resumenHTML() + '</div>',

      '<section class="tarjeta">',
      '  <h3>Cómo cambian los precios</h3>',
      '  <div class="controles-grafica">',
      '    <div class="campo"><label>Periodo</label><select id="periodo" data-segmentos>',
      [[3, '3 meses'], [6, '6 meses'], [12, '1 año'], [0, 'Todo']].map(function (p) {
        return '<option value="' + p[0] + '"' + (p[0] === periodo ? ' selected' : '') + '>' + p[1] + '</option>';
      }).join(''),
      '    </select></div>',
      '    <div class="campo"><label>Ver en</label><select id="modoGrafica" data-segmentos>',
      '      <option value="pesos" data-sub="el valor de cada día"' + (modo === 'pesos' ? ' selected' : '') + '>Pesos</option>',
      '      <option value="pct" data-sub="para comparar entre sí"' + (modo === 'pct' ? ' selected' : '') + '>% de cambio</option>',
      '    </select></div>',
      '  </div>',
      '  <div class="filtros" id="filtros">',
      items.map(function (it, i) {
        var activo = seleccion.indexOf(it.clave) >= 0;
        return '<label class="filtro' + (activo ? ' activo' : '') + '"><input type="checkbox" value="' + it.clave + '"' + (activo ? ' checked' : '') + '><i style="background:' + color(it.clave, i) + '"></i>' + it.nombre + '</label>';
      }).join(''),
      '  </div>',
      '  <div id="grafica"></div>',
      '  <p class="pista" id="notaGrafica"></p>',
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

    UI.segmentar(raiz);
    UI.$('#periodo', raiz).addEventListener('change', function (e) { periodo = Calc.num(e.target.value); dibujar(raiz); });
    UI.$('#modoGrafica', raiz).addEventListener('change', function (e) { modo = e.target.value; dibujar(raiz); });

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

      var actualizoConfig = false, pasoAMano = false;
      if (UI.$('#regActualizaConfig', raiz).checked && esElMasReciente) {
        var cfg = Store.datos.config;
        if (item.indexOf('esmeralda-') === 0) {
          cfg.precioQuilate[item.replace('esmeralda-', '')] = valor;
          actualizoConfig = true;
        } else if (cfg.metales[item]) {
          // Si seguía el mercado, el precio anotado manda: pasa a manual
          // (si no, la próxima actualización lo pisaría).
          pasoAMano = Precios.receta(cfg.metales[item]).auto;
          if (pasoAMano) cfg.metales[item].auto = false;
          cfg.metales[item].precioGramo = valor;
          actualizoConfig = true;
        }
      }
      Store.guardar();
      UI.$('#regValor', raiz).value = '';
      dibujar(raiz);
      UI.toast(pasoAMano
        ? 'Registro agregado. ' + Store.datos.config.metales[item].nombre + ' quedó con precio manual; para que vuelva a seguir el mercado, usa ↺ en Configuración.'
        : actualizoConfig
          ? 'Registro agregado y precio actualizado en Configuración.'
          : (esElMasReciente ? 'Registro agregado.' : 'Registro histórico agregado. No se tocó el precio vigente porque hay registros más recientes.'));
    });

    dibujar(raiz);
  }

  /* Puntos de un concepto dentro del periodo elegido. Los metales que siguen
     el mercado se dibujan solo con su línea de mercado: mezclarla con
     precios anotados a mano la volvería un serrucho. */
  function puntosDe(clave) {
    var desde = periodo ? fechaHaceMeses(periodo) : '';
    var todos = Store.datos.historial.filter(function (h) { return h.item === clave; });
    var deMercado = todos.filter(function (h) { return h.fuente === 'mercado'; });
    return (deMercado.length ? deMercado : todos)
      .filter(function (h) { return !desde || h.fecha >= desde; })
      .map(function (h) { return { fecha: h.fecha, valor: Calc.num(h.valor) }; })
      .sort(function (a, b) { return a.fecha < b.fecha ? -1 : (a.fecha > b.fecha ? 1 : 0); });
  }

  function dibujar(raiz) {
    var items = itemsDisponibles();

    var series = items.filter(function (it) { return seleccion.indexOf(it.clave) >= 0; })
      .map(function (it) {
        return {
          nombre: it.nombre,
          color: color(it.clave, items.findIndex(function (x) { return x.clave === it.clave; })),
          puntos: puntosDe(it.clave)
        };
      });

    // En "% de cambio" cada línea arranca en 0 %: así el oro y la plata se
    // comparan aunque uno valga sesenta veces más que el otro.
    var aGraficar = modo === 'pct' ? series.map(function (s) {
      var base = s.puntos.length ? s.puntos[0].valor : 0;
      return {
        nombre: s.nombre, color: s.color,
        puntos: base ? s.puntos.map(function (p) { return { fecha: p.fecha, valor: (p.valor - base) / base * 100 }; }) : []
      };
    }) : series;

    Grafica.linea(UI.$('#grafica', raiz), aGraficar, modo === 'pct' ? {
      negativos: true,
      formatoEje: function (v) { return UI.numero(v, 0) + ' %'; },
      formatoValor: function (v) { return (v > 0 ? '+' : '') + UI.numero(v, 1) + ' %'; }
    } : {});

    var maximos = series.filter(function (s) { return s.puntos.length; })
      .map(function (s) { return Math.max.apply(null, s.puntos.map(function (p) { return p.valor; })); });
    var muyDistintos = modo === 'pesos' && maximos.length > 1 && Math.max.apply(null, maximos) / Math.max(1, Math.min.apply(null, maximos)) > 15;
    UI.$('#notaGrafica', raiz).textContent = muyDistintos
      ? 'Hay precios de escalas muy distintas y los más bajos se ven planos. Usa "% de cambio" para compararlos.'
      : '';

    UI.$('#resumenVariacion', raiz).innerHTML = series.filter(function (s) { return s.puntos.length; })
      .map(function (s) {
        var v = Calc.variacion(s.puntos);
        var signo = v.variacionTotal > 0 ? '▲' : (v.variacionTotal < 0 ? '▼' : '=');
        return [
          '<div class="indicador">',
          '<span>' + s.nombre + '</span>',
          '<strong>' + UI.cop(v.ultimo) + '</strong>',
          '<em class="' + UI.claseSigno(v.variacionTotal) + '">' + signo + ' ' + UI.pct(Math.abs(v.variacionTotalPct)) + ' desde ' + UI.fecha(v.puntos[0].fecha) + '</em>',
          '</div>'
        ].join('');
      }).join('') || '<p class="vacio">Selecciona al menos un concepto con registros.</p>';

    pintarHistorial(raiz);
  }

  /* Lo llama precios.js cuando llegan precios nuevos o el historial. */
  function redibujar() {
    if (raizActual && document.body.contains(raizActual)) dibujar(raizActual);
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

    // variación frente al registro anterior del mismo concepto y la misma
    // fuente (mercado con mercado, a mano con a mano)
    var previos = {};
    var grupo = function (h) { return h.item + '|' + (h.fuente || ''); };
    Store.datos.historial.forEach(function (h) {
      previos[grupo(h)] = previos[grupo(h)] || [];
      previos[grupo(h)].push(h);
    });

    cont.innerHTML = [
      '<div class="tabla-envoltura">',
      '<table class="tabla-resultado">',
      '<thead><tr><th>Fecha</th><th>Concepto</th><th>Valor</th><th>Cambio</th><th></th></tr></thead>',
      '<tbody>',
      historial.slice(0, 40).map(function (h) {
        var lista = previos[grupo(h)] || [];
        var idx = lista.findIndex(function (x) { return x.id === h.id; });
        var anterior = idx > 0 ? Calc.num(lista[idx - 1].valor) : null;
        var cambio = anterior === null ? null : (Calc.num(h.valor) - anterior) / (anterior || 1);
        return [
          '<tr>',
          '<td>' + UI.fecha(h.fecha) + '</td>',
          '<td>' + (nombres[h.item] || h.item) + (h.fuente === 'mercado' ? '<span class="pista-inline">mercado</span>' : '') + '</td>',
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
  global.Vistas.mercado = { titulo: 'Mercado', render: render, redibujar: redibujar };
})(window);

/*
 * chart.js — Gráficas en SVG, sin librerías externas.
 * Grafica.linea(contenedor, series, opciones) donde
 *   series = [{ nombre, color, puntos: [{ fecha:'2026-01-01', valor: 1000, etiqueta? }] }]
 *   opciones.formatoFecha  formato de las fechas del eje X (toLocaleDateString)
 *   opciones.vacio         texto cuando no hay puntos
 *   opciones.formatoEje    function (v) → texto de cada marca del eje Y
 *   opciones.formatoValor  function (v) → texto del valor al pasar el mouse
 *   opciones.negativos     true para no cortar el eje Y en cero (p. ej. % de cambio)
 *
 * Grafica.barras(contenedor, grupos, series, opciones) donde
 *   grupos = [{ etiqueta:'nov', titulo:'Noviembre de 2026', valores:[1000, 400] }]
 *   series = [{ nombre, color }]   (una por cada posición de valores)
 */
(function (global) {
  'use strict';

  function svgEl(tag, attrs) {
    var el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.keys(attrs || {}).forEach(function (k) { el.setAttribute(k, attrs[k]); });
    return el;
  }

  function linea(contenedor, series, opciones) {
    opciones = opciones || {};
    contenedor.innerHTML = '';

    var activas = (series || []).filter(function (s) { return s.puntos && s.puntos.length; });
    if (!activas.length) {
      contenedor.innerHTML = '<p class="vacio">' + (opciones.vacio || 'Todavía no hay registros de precios. Guarda cambios en Configuración o agrega un registro manual para empezar a ver la variación.') + '</p>';
      return;
    }

    var W = 760, H = 320;
    var m = { arriba: 20, derecha: 18, abajo: 40, izquierda: 78 };
    var ancho = W - m.izquierda - m.derecha;
    var alto = H - m.arriba - m.abajo;

    var todos = [];
    activas.forEach(function (s) {
      s.puntos.forEach(function (p) {
        todos.push({ t: new Date(p.fecha + 'T00:00:00').getTime(), v: Calc.num(p.valor) });
      });
    });

    var tMin = Math.min.apply(null, todos.map(function (p) { return p.t; }));
    var tMax = Math.max.apply(null, todos.map(function (p) { return p.t; }));
    var vMin = Math.min.apply(null, todos.map(function (p) { return p.v; }));
    var vMax = Math.max.apply(null, todos.map(function (p) { return p.v; }));

    if (tMin === tMax) { tMin -= 86400000; tMax += 86400000; }
    var rango = vMax - vMin;
    if (rango === 0) { var holgura = Math.abs(vMin) * 0.1 || 1; vMin -= holgura; vMax += holgura; }
    else { vMin = vMin - rango * 0.12; vMax = vMax + rango * 0.12; }
    if (!opciones.negativos) vMin = Math.max(0, vMin);
    var formatoEje = opciones.formatoEje || function (v) {
      return UI.numero(v >= 1000 ? Math.round(v / 1000) : v, 0) + (v >= 1000 ? ' k' : '');
    };
    var formatoValor = opciones.formatoValor || UI.cop;

    function x(t) { return m.izquierda + ((t - tMin) / (tMax - tMin)) * ancho; }
    function y(v) { return m.arriba + alto - ((v - vMin) / (vMax - vMin)) * alto; }

    var svg = svgEl('svg', {
      viewBox: '0 0 ' + W + ' ' + H,
      class: 'grafica',
      preserveAspectRatio: 'xMidYMid meet'
    });

    // Rejilla + eje Y
    var pasos = 4;
    for (var i = 0; i <= pasos; i++) {
      var v = vMin + (vMax - vMin) * (i / pasos);
      var yy = y(v);
      svg.appendChild(svgEl('line', {
        x1: m.izquierda, x2: W - m.derecha, y1: yy, y2: yy, class: 'rejilla'
      }));
      var txt = svgEl('text', { x: m.izquierda - 10, y: yy + 4, class: 'etiqueta-eje', 'text-anchor': 'end' });
      txt.textContent = formatoEje(v);
      svg.appendChild(txt);
    }

    // Eje X (primer, medio y último)
    [tMin, (tMin + tMax) / 2, tMax].forEach(function (t, idx) {
      var d = new Date(t);
      var txt = svgEl('text', {
        x: x(t), y: H - 14, class: 'etiqueta-eje',
        'text-anchor': idx === 0 ? 'start' : (idx === 2 ? 'end' : 'middle')
      });
      txt.textContent = d.toLocaleDateString('es-CO', opciones.formatoFecha || { day: '2-digit', month: 'short' });
      svg.appendChild(txt);
    });

    // Series
    activas.forEach(function (s) {
      var pts = s.puntos.slice().sort(function (a, b) {
        return new Date(a.fecha) - new Date(b.fecha);
      });
      var d = pts.map(function (p, i) {
        return (i ? 'L' : 'M') + x(new Date(p.fecha + 'T00:00:00').getTime()).toFixed(1) + ' ' + y(Calc.num(p.valor)).toFixed(1);
      }).join(' ');

      svg.appendChild(svgEl('path', { d: d, fill: 'none', stroke: s.color, 'stroke-width': 2.5, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));

      pts.forEach(function (p) {
        var cx = x(new Date(p.fecha + 'T00:00:00').getTime());
        var cy = y(Calc.num(p.valor));
        var c = svgEl('circle', { cx: cx, cy: cy, r: 4, fill: s.color, class: 'punto' });
        var titulo = svgEl('title');
        titulo.textContent = s.nombre + ' · ' + (p.etiqueta || UI.fecha(p.fecha)) + ' · ' + formatoValor(p.valor);
        c.appendChild(titulo);
        svg.appendChild(c);
      });
    });

    contenedor.appendChild(svg);

    // Leyenda
    var leyenda = document.createElement('div');
    leyenda.className = 'leyenda';
    activas.forEach(function (s) {
      var item = document.createElement('span');
      item.innerHTML = '<i style="background:' + s.color + '"></i>' + s.nombre;
      leyenda.appendChild(item);
    });
    contenedor.appendChild(leyenda);
  }

  /* Cifra corta para etiquetas: 2,5 M · 230 k · 900. */
  function compacto(v) {
    var n = Math.abs(v);
    if (n >= 1e6) return UI.numero(v / 1e6, n >= 1e7 ? 0 : 1) + ' M';
    if (n >= 1e3) return UI.numero(Math.round(v / 1e3), 0) + ' k';
    return UI.numero(v, 0);
  }

  /* ---------------------------------------------------------------
   * barras() — columnas agrupadas por mes (vendido y ganancia, p. ej.).
   * El valor de la primera serie va escrito encima de cada grupo.
   * ------------------------------------------------------------- */
  function barras(contenedor, grupos, series, opciones) {
    opciones = opciones || {};
    contenedor.innerHTML = '';
    if (!grupos || !grupos.length) {
      contenedor.innerHTML = '<p class="vacio">' + (opciones.vacio || 'Sin datos todavía.') + '</p>';
      return;
    }

    var W = 760, H = 330;
    var m = { arriba: 34, derecha: 12, abajo: 46, izquierda: 70 };
    var ancho = W - m.izquierda - m.derecha;
    var alto = H - m.arriba - m.abajo;

    var todos = [];
    grupos.forEach(function (g) { g.valores.forEach(function (v) { todos.push(Calc.num(v)); }); });
    var vMax = Math.max.apply(null, todos.concat([0]));
    var vMin = Math.min.apply(null, todos.concat([0]));
    if (vMax === vMin) vMax = vMin + 1;
    vMax += (vMax - vMin) * 0.08;

    function y(v) { return m.arriba + alto - ((v - vMin) / (vMax - vMin)) * alto; }

    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'grafica barras', preserveAspectRatio: 'xMidYMid meet' });

    for (var i = 0; i <= 4; i++) {
      var v = vMin + (vMax - vMin) * (i / 4);
      svg.appendChild(svgEl('line', { x1: m.izquierda, x2: W - m.derecha, y1: y(v), y2: y(v), class: 'rejilla' }));
      var t = svgEl('text', { x: m.izquierda - 10, y: y(v) + 5, class: 'etiqueta-eje grande', 'text-anchor': 'end' });
      t.textContent = compacto(v);
      svg.appendChild(t);
    }

    var paso = ancho / grupos.length;
    var anchoBarra = Math.min(46, paso * 0.72 / series.length);
    var cero = y(0);

    grupos.forEach(function (g, gi) {
      var centro = m.izquierda + paso * gi + paso / 2;
      var inicio = centro - (anchoBarra * series.length) / 2;
      g.valores.forEach(function (valor, si) {
        var v = Calc.num(valor);
        var yv = y(v);
        var r = svgEl('rect', {
          x: (inicio + si * anchoBarra + 1).toFixed(1), width: (anchoBarra - 2).toFixed(1),
          y: Math.min(yv, cero).toFixed(1), height: Math.max(1, Math.abs(cero - yv)).toFixed(1),
          fill: series[si].color, class: 'barra' + (g.destacado ? ' destacada' : '')
        });
        var titulo = svgEl('title');
        titulo.textContent = (g.titulo || g.etiqueta) + ' · ' + series[si].nombre + ': ' + UI.cop(v);
        r.appendChild(titulo);
        svg.appendChild(r);
      });
      var principal = Calc.num(g.valores[0]);
      if (principal) {
        var etiqueta = svgEl('text', { x: centro, y: y(Math.max(0, principal)) - 8, class: 'etiqueta-barra', 'text-anchor': 'middle' });
        etiqueta.textContent = compacto(principal);
        svg.appendChild(etiqueta);
      }
      var mes = svgEl('text', { x: centro, y: H - 18, class: 'etiqueta-eje grande' + (g.destacado ? ' destacada' : ''), 'text-anchor': 'middle' });
      mes.textContent = g.etiqueta;
      svg.appendChild(mes);
    });

    contenedor.appendChild(svg);

    var leyenda = document.createElement('div');
    leyenda.className = 'leyenda';
    series.forEach(function (s) {
      var item = document.createElement('span');
      item.innerHTML = '<i style="background:' + s.color + '"></i>' + s.nombre;
      leyenda.appendChild(item);
    });
    contenedor.appendChild(leyenda);
  }

  /* ---------------------------------------------------------------
   * radar() — la "huella digital" de la esmeralda.
   *   ejes:   [{ clave, nombre }]  (el orden define el giro, empezando arriba)
   *   series: [{ nombre, color, valores: { clave: 1..10 } }]
   * ------------------------------------------------------------- */
  function radar(contenedor, ejes, series, opciones) {
    opciones = opciones || {};
    contenedor.innerHTML = '';

    var W = 620, H = 560;
    var cx = W / 2, cy = H / 2 - 6;
    var R = 170;
    var MAX = opciones.max || 10;
    var n = ejes.length;

    var svg = svgEl('svg', {
      viewBox: '0 0 ' + W + ' ' + H,
      class: 'radar',
      preserveAspectRatio: 'xMidYMid meet'
    });

    function angulo(i) { return (Math.PI * 2 * i / n) - Math.PI / 2; }
    function punto(i, valor) {
      var a = angulo(i);
      var r = (valor / MAX) * R;
      return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
    }
    function poligono(valores) {
      return valores.map(function (v, i) {
        var p = punto(i, v);
        return p[0].toFixed(1) + ',' + p[1].toFixed(1);
      }).join(' ');
    }

    // Anillos de la escala
    [2, 4, 6, 8, 10].forEach(function (nivel) {
      var vals = ejes.map(function () { return nivel; });
      svg.appendChild(svgEl('polygon', {
        points: poligono(vals),
        class: 'anillo' + (nivel === 10 ? ' borde' : '')
      }));
    });

    // Ejes y etiquetas
    ejes.forEach(function (eje, i) {
      var extremo = punto(i, MAX);
      svg.appendChild(svgEl('line', {
        x1: cx, y1: cy, x2: extremo[0], y2: extremo[1], class: 'eje'
      }));

      var a = angulo(i);
      var lx = cx + Math.cos(a) * (R + 34);
      var ly = cy + Math.sin(a) * (R + 34);
      var cos = Math.cos(a);
      var anclaje = cos > 0.25 ? 'start' : (cos < -0.25 ? 'end' : 'middle');

      var etiqueta = svgEl('text', {
        x: lx, y: ly, class: 'eje-nombre', 'text-anchor': anclaje
      });
      etiqueta.textContent = eje.nombre.toUpperCase();
      svg.appendChild(etiqueta);

      if (series.length === 1) {
        var valor = svgEl('text', {
          x: lx, y: ly + 17, class: 'eje-valor', 'text-anchor': anclaje
        });
        valor.textContent = series[0].valores[eje.clave];
        svg.appendChild(valor);
      }
    });

    // Números de la escala sobre el eje vertical
    [2, 4, 6, 8, 10].forEach(function (nivel) {
      var p = punto(0, nivel);
      var t = svgEl('text', { x: p[0] + 7, y: p[1] + 4, class: 'escala-num' });
      t.textContent = nivel;
      svg.appendChild(t);
    });

    // Series
    series.forEach(function (s) {
      var vals = ejes.map(function (e) { return Math.max(0, Math.min(MAX, Number(s.valores[e.clave]) || 0)); });
      svg.appendChild(svgEl('polygon', {
        points: poligono(vals),
        fill: s.color,
        'fill-opacity': series.length > 1 ? 0.16 : 0.24,
        stroke: s.color,
        'stroke-width': 2.2,
        'stroke-linejoin': 'round'
      }));
      vals.forEach(function (v, i) {
        var p = punto(i, v);
        var c = svgEl('circle', { cx: p[0], cy: p[1], r: 4.5, fill: s.color, class: 'punto' });
        var titulo = svgEl('title');
        titulo.textContent = ejes[i].nombre + ': ' + v + '/10' + (series.length > 1 ? ' · ' + s.nombre : '');
        c.appendChild(titulo);
        svg.appendChild(c);
      });
    });

    contenedor.appendChild(svg);

    if (series.length > 1) {
      var leyenda = document.createElement('div');
      leyenda.className = 'leyenda';
      series.forEach(function (s) {
        var item = document.createElement('span');
        item.innerHTML = '<i style="background:' + s.color + '"></i>' + s.nombre;
        leyenda.appendChild(item);
      });
      contenedor.appendChild(leyenda);
    }

    return svg;
  }

  /* ---------------------------------------------------------------
   * miniHuella() — la huella de una piedra, en miniatura.
   * Devuelve el SVG como texto para incrustarlo en listas y fichas:
   * cada evaluación guardada se reconoce por su forma, no por su código.
   * ------------------------------------------------------------- */
  function miniHuella(ejes, valores, tam) {
    var s = tam || 38, c = s / 2, R = s / 2 - 3, MAX = 10, n = ejes.length;
    function vertices(escala) {
      return ejes.map(function (eje, i) {
        var a = (Math.PI * 2 * i / n) - Math.PI / 2;
        var v = typeof escala === 'number' ? escala : Math.max(0, Math.min(MAX, Number(valores[eje.clave]) || 0));
        var r = (v / MAX) * R;
        return (c + Math.cos(a) * r).toFixed(1) + ',' + (c + Math.sin(a) * r).toFixed(1);
      }).join(' ');
    }
    return '<svg class="mini-huella" viewBox="0 0 ' + s + ' ' + s + '" aria-hidden="true">' +
      '<polygon class="mh-marco" points="' + vertices(MAX) + '"/>' +
      '<polygon class="mh-forma" points="' + vertices() + '"/>' +
      '</svg>';
  }

  global.Grafica = { linea: linea, barras: barras, radar: radar, miniHuella: miniHuella, compacto: compacto };
})(window);

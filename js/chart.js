/*
 * chart.js — Gráficas en SVG, sin librerías externas.
 * Grafica.linea(contenedor, series) donde
 *   series = [{ nombre, color, puntos: [{ fecha:'2026-01-01', valor: 1000 }] }]
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
      contenedor.innerHTML = '<p class="vacio">Todavía no hay registros de precios. Guarda cambios en Configuración o agrega un registro manual para empezar a ver la variación.</p>';
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
    if (rango === 0) { vMin = vMin * 0.9; vMax = vMax * 1.1 || 1; }
    else { vMin = Math.max(0, vMin - rango * 0.12); vMax = vMax + rango * 0.12; }

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
      txt.textContent = UI.numero(v >= 1000 ? Math.round(v / 1000) : v, 0) + (v >= 1000 ? ' k' : '');
      svg.appendChild(txt);
    }

    // Eje X (primer, medio y último)
    [tMin, (tMin + tMax) / 2, tMax].forEach(function (t, idx) {
      var d = new Date(t);
      var txt = svgEl('text', {
        x: x(t), y: H - 14, class: 'etiqueta-eje',
        'text-anchor': idx === 0 ? 'start' : (idx === 2 ? 'end' : 'middle')
      });
      txt.textContent = d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
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
        titulo.textContent = s.nombre + ' · ' + UI.fecha(p.fecha) + ' · ' + UI.cop(p.valor);
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

  global.Grafica = { linea: linea, radar: radar, miniHuella: miniHuella };
})(window);

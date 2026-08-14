/* ui.js — utilidades de formato y ayudas para el DOM. */
(function (global) {
  'use strict';

  var fmtCOP = new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', maximumFractionDigits: 0
  });
  var fmtNum = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 });

  function cop(v) {
    var n = Calc.num(v);
    return fmtCOP.format(Math.round(n));
  }
  function numero(v, dec) {
    var n = Calc.num(v);
    return new Intl.NumberFormat('es-CO', {
      minimumFractionDigits: dec === undefined ? 0 : dec,
      maximumFractionDigits: dec === undefined ? 2 : dec
    }).format(n);
  }
  function pct(v, dec) {
    return numero(Calc.num(v) * 100, dec === undefined ? 1 : dec) + ' %';
  }
  function fecha(f) {
    try {
      var d = new Date(f + 'T00:00:00');
      return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch (e) { return f; }
  }

  function $(sel, raiz) { return (raiz || document).querySelector(sel); }
  function $$(sel, raiz) { return Array.prototype.slice.call((raiz || document).querySelectorAll(sel)); }

  /* Lee todos los [data-campo] dentro de un contenedor y arma un objeto plano.
     Soporta rutas con punto: data-campo="metal.gramos" */
  function leerFormulario(raiz) {
    var obj = {};
    $$('[data-campo]', raiz).forEach(function (el) {
      var ruta = el.getAttribute('data-campo').split('.');
      var valor = el.type === 'checkbox' ? el.checked
        : (el.type === 'number' ? (el.value === '' ? 0 : parseFloat(el.value)) : el.value);
      var cursor = obj;
      for (var i = 0; i < ruta.length - 1; i++) {
        cursor[ruta[i]] = cursor[ruta[i]] || {};
        cursor = cursor[ruta[i]];
      }
      cursor[ruta[ruta.length - 1]] = valor;
    });
    return obj;
  }

  function nombreCalidad(c) {
    return { baja: 'Baja', media: 'Media', alta: 'Alta' }[c] || c;
  }

  function toast(mensaje) {
    var t = $('#toast');
    if (!t) return;
    t.textContent = mensaje;
    t.classList.add('visible');
    clearTimeout(t._temporizador);
    t._temporizador = setTimeout(function () { t.classList.remove('visible'); }, 2600);
  }

  function claseSigno(v) { return Calc.num(v) < 0 ? 'negativo' : (Calc.num(v) > 0 ? 'positivo' : ''); }

  global.UI = {
    cop: cop, numero: numero, pct: pct, fecha: fecha,
    $: $, $$: $$, leerFormulario: leerFormulario,
    nombreCalidad: nombreCalidad, toast: toast, claseSigno: claseSigno
  };
})(window);

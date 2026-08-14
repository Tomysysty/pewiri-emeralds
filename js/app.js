/* app.js — navegación entre vistas. */
(function (global) {
  'use strict';

  var actual = 'lote';
  var contenedor;

  function mostrar(nombre) {
    if (!Vistas[nombre]) return;
    actual = nombre;

    UI.$$('.pestana').forEach(function (b) {
      b.classList.toggle('activa', b.getAttribute('data-vista') === nombre);
    });

    // Contenedor nuevo en cada render: así no se acumulan escuchadores.
    var nuevo = document.createElement('div');
    nuevo.id = 'vista';
    contenedor.replaceWith(nuevo);
    contenedor = nuevo;

    Vistas[nombre].render(contenedor);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function recargar() { mostrar(actual); }

  function sembrarHistorial() {
    if (Store.datos.historial.length) return;
    var cfg = Store.datos.config;
    Calc.CALIDADES.forEach(function (q) {
      Store.registrarPrecio('esmeralda-' + q, cfg.precioQuilate[q]);
    });
    Object.keys(cfg.metales).forEach(function (k) {
      Store.registrarPrecio(k, cfg.metales[k].precioGramo);
    });
    Store.guardar();
  }

  function iniciar() {
    contenedor = UI.$('#vista');
    UI.$$('.pestana').forEach(function (b) {
      b.addEventListener('click', function () { mostrar(b.getAttribute('data-vista')); });
    });
    sembrarHistorial();
    mostrar(actual);
  }

  global.App = { mostrar: mostrar, recargar: recargar };
  document.addEventListener('DOMContentLoaded', iniciar);
})(window);

/*
 * iconos.js — Iconos de línea propios, en SVG.
 * Un solo sprite oculto en la página; cada uso es un <use> que apunta a él.
 * Sin librerías ni fuentes de iconos: el trazo combina con el del logo.
 */
(function (global) {
  'use strict';

  // Cada icono es el contenido de un <symbol> de 24 × 24.
  var TRAZOS = {
    // Los nueve factores del SVP-9
    color: '<path d="M12 3.4c0 0-5.6 6.3-5.6 9.9a5.6 5.6 0 0 0 11.2 0C17.6 9.7 12 3.4 12 3.4z"/>',
    tamano: '<path d="M12 4.2v15.4M7.5 19.6h9M4 8.4h16M4 8.4 1.9 13.1h4.2zM20 8.4l-2.1 4.7h4.2z"/>',
    cristal: '<path d="M8 3.2h8l5 6.2-9 11.4-9-11.4z"/><path d="M3 9.4h18M9 3.2l-1 6.2M15 3.2l1 6.2"/>',
    claridad: '<circle cx="10.8" cy="10.8" r="6.6"/><path d="M15.6 15.6 20.6 20.6"/><path d="M8.6 9.2a3 3 0 0 1 2.6-2"/>',
    fire: '<path d="M12 2.6 13.9 8.1 19.4 10 13.9 11.9 12 17.4 10.1 11.9 4.6 10 10.1 8.1z"/><path d="M18.4 15.6l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/>',
    talla: '<path d="M12 3.2 19.2 7.4v9.2L12 20.8 4.8 16.6V7.4z"/><path d="M4.8 7.4 12 11.6l7.2-4.2M12 11.6v9.2"/>',
    procedencia: '<circle cx="12" cy="12" r="8.8"/><path d="M3.2 12h17.6M12 3.2c2.6 2.7 3.9 5.6 3.9 8.8s-1.3 6.1-3.9 8.8c-2.6-2.7-3.9-5.6-3.9-8.8S9.4 5.9 12 3.2z"/>',
    tratamiento: '<path d="M9.6 3h4.8M10.6 3v6L5.7 17.8A2.4 2.4 0 0 0 7.8 21.4h8.4a2.4 2.4 0 0 0 2.1-3.6L13.4 9V3"/><path d="M7.9 15.2h8.2"/>',
    appeal: '<path d="M2.6 12S6.1 5.6 12 5.6 21.4 12 21.4 12 17.9 18.4 12 18.4 2.6 12 2.6 12z"/><circle cx="12" cy="12" r="2.9"/>',

    // Encabezados de sección
    ficha: '<path d="M6.4 3h7.4l4.2 4.2v13.8H6.4z"/><path d="M13.8 3v4.2H18"/><path d="M9.2 12.4h6.2M9.2 16.2h4.4"/>',
    escala: '<path d="M3 9.2h18v5.6H3z"/><path d="M7 9.2v2.6M11 9.2v2.6M15 9.2v2.6M19 9.2v2.6"/>',
    huella: '<path d="M12 3.2 19 7.4v9.2L12 20.8 5 16.6V7.4z"/><path d="M12 7.6 15.6 9.7v4.6L12 16.4 8.4 14.3V9.7z"/><circle cx="12" cy="12" r="1.2"/>',
    base: '<path d="M12 3.4 21 8l-9 4.6L3 8z"/><path d="M3 12.2 12 16.8 21 12.2M3 16.4 12 21l9-4.6"/>',
    imagen: '<rect x="3" y="4.5" width="18" height="15"/><circle cx="8.6" cy="9.4" r="1.6"/><path d="M3 17l5.8-5.8 3.1 3.1 2-2 4.1 4.2"/>',

    // Botones de venta: qué se vende, cómo se paga y en qué va el pago
    anillo: '<circle cx="12" cy="14.6" r="6.2"/><path d="M9.3 5.7 12 3l2.7 2.7L12 8.4z"/>',
    efectivo: '<rect x="2.8" y="6.4" width="18.4" height="11.2"/><circle cx="12" cy="12" r="2.6"/><path d="M6 9.6v4.8M18 9.6v4.8"/>',
    transferencia: '<path d="M4 8.6h14.6M15 5l3.6 3.6-3.6 3.6"/><path d="M20 15.4H5.4M9 11.8l-3.6 3.6L9 19"/>',
    pagado: '<circle cx="12" cy="12" r="8.8"/><path d="M8 12.3l2.7 2.7 5.5-5.6"/>',
    anticipo: '<circle cx="12" cy="12" r="8.8"/><path d="M12 3.2a8.8 8.8 0 0 1 0 17.6z" fill="currentColor" stroke="none"/>',
    pendiente: '<circle cx="12" cy="12" r="8.8"/><path d="M12 7v5.2l3.4 2"/>'
  };

  function sprite() {
    var simbolos = Object.keys(TRAZOS).map(function (nombre) {
      return '<symbol id="ic-' + nombre + '" viewBox="0 0 24 24">' + TRAZOS[nombre] + '</symbol>';
    }).join('');
    return '<svg id="spriteIconos" aria-hidden="true" focusable="false" ' +
      'style="position:absolute;width:0;height:0;overflow:hidden">' + simbolos + '</svg>';
  }

  function montar() {
    if (document.getElementById('spriteIconos')) return;
    var envoltura = document.createElement('div');
    envoltura.innerHTML = sprite();
    document.body.insertBefore(envoltura.firstChild, document.body.firstChild);
  }

  /* usar('color', 'redondo') -> <svg class="icono redondo">…</svg> */
  function usar(nombre, clase) {
    if (!TRAZOS[nombre]) return '';
    return '<svg class="icono ' + (clase || '') + '" viewBox="0 0 24 24" aria-hidden="true">' +
      '<use href="#ic-' + nombre + '"></use></svg>';
  }

  global.Iconos = { montar: montar, usar: usar, nombres: Object.keys(TRAZOS) };
})(window);

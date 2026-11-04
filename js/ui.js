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
    return {
      muyBaja: 'Muy baja', baja: 'Baja', media: 'Media',
      alta: 'Alta', muyAlta: 'Muy alta', exclusiva: 'Exclusiva'
    }[c] || c;
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

  /* ---------------------------------------------------------------
   * Campos automáticos (input con data-auto).
   * El programa los llena solo, pero se puede escribir encima: el campo
   * queda "a mano" y su etiqueta muestra ↺ para volver al cálculo.
   * Para que un campo arranque a mano, se dibuja con data-manual="1".
   * ------------------------------------------------------------- */
  function esManual(input) { return !!input && input.getAttribute('data-manual') === '1'; }

  function marcarManual(input, manual) {
    if (!input) return;
    if (manual) input.setAttribute('data-manual', '1');
    else input.removeAttribute('data-manual');
    input.classList.toggle('es-auto', !manual);
    var marca = input._marcaAuto;
    if (marca) {
      marca.textContent = manual ? '↺ volver a auto' : 'auto';
      marca.disabled = !manual;
      marca.title = manual ? 'Volver al valor calculado' : 'Se calcula solo. Puedes escribir encima.';
    }
  }

  /* Escribe el valor calculado, solo si el campo sigue en automático. */
  function auto(input, valor) {
    if (!input || esManual(input)) return;
    input.value = valor;
  }

  /* Prepara los [data-auto] de un contenedor; se puede llamar varias veces.
     alVolver(input) se llama al pulsar ↺, para que la vista recalcule. */
  function armarAutos(raiz, alVolver) {
    $$('[data-auto]', raiz).forEach(function (input) {
      if (input._marcaAuto) return;
      var campo = input.closest('.campo');
      var etiqueta = campo && campo.querySelector('label');
      var marca = document.createElement('button');
      marca.type = 'button';
      marca.className = 'marca-auto';
      marca.addEventListener('click', function (e) {
        e.preventDefault();
        marcarManual(input, false);
        if (alVolver) alVolver(input);
      });
      input._marcaAuto = marca;
      if (etiqueta) etiqueta.appendChild(marca);
      marcarManual(input, esManual(input));
    });
    if (!raiz._autosArmados) {
      raiz._autosArmados = true;
      // En captura: corre antes que los escuchas de la vista, que ya
      // encuentran el campo marcado como manual.
      raiz.addEventListener('input', function (e) {
        if (e.target.hasAttribute && e.target.hasAttribute('data-auto')) marcarManual(e.target, true);
      }, true);
    }
  }

  /* ---------------------------------------------------------------
   * Botones segmentados. Un <select data-segmentos> de pocas opciones se
   * muestra como botones que se tocan directo, sin abrir nada. El select
   * queda oculto y sigue mandando: leerFormulario y los 'change' de cada
   * vista funcionan igual. Cada <option> puede traer:
   *   data-icono  nombre de un icono de Iconos
   *   data-sub    texto chico debajo
   *   data-html   contenido propio (reemplaza al texto)
   * data-segmentos="clase" agrega esa clase al grupo (p. ej. "calidades").
   * Llamar de nuevo a segmentar() refresca cuál está marcado, por si el
   * select se cambió por código.
   * ------------------------------------------------------------- */
  function marcarSegmento(sel) {
    $$('.segmento', sel._segmentos).forEach(function (b) {
      var activo = b.getAttribute('data-valor') === sel.value;
      b.setAttribute('aria-checked', activo ? 'true' : 'false');
      b.tabIndex = activo ? 0 : -1;
    });
  }

  function elegirSegmento(sel, valor) {
    if (sel.value === valor) return;
    sel.value = valor;
    marcarSegmento(sel);
    sel.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function segmentar(raiz) {
    $$('select[data-segmentos]', raiz).forEach(function (sel) {
      if (sel._segmentos) { marcarSegmento(sel); return; }
      var grupo = document.createElement('div');
      grupo.className = 'segmentos ' + (sel.getAttribute('data-segmentos') || '');
      grupo.setAttribute('role', 'radiogroup');
      var campo = sel.closest('.campo');
      var etiqueta = campo && campo.querySelector('label');
      if (etiqueta) grupo.setAttribute('aria-label', etiqueta.textContent);

      // El texto y data-sub se escriben como texto (pueden traer nombres de
      // compradores o metales); solo data-html se toma como HTML.
      var comoTexto = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); };
      grupo.innerHTML = Array.prototype.map.call(sel.options, function (o) {
        var icono = o.getAttribute('data-icono');
        var sub = o.getAttribute('data-sub');
        var texto = o.getAttribute('data-html') || comoTexto(o.textContent);
        return '<button type="button" class="segmento" role="radio" data-valor="' + o.value + '">' +
          (icono ? Iconos.usar(icono) : '') +
          '<span>' + texto + (sub ? '<small>' + comoTexto(sub) + '</small>' : '') + '</span></button>';
      }).join('');

      grupo.addEventListener('click', function (e) {
        var b = e.target.closest('.segmento');
        if (b) elegirSegmento(sel, b.getAttribute('data-valor'));
      });
      // Flechas para moverse entre opciones, como en cualquier grupo de radios.
      grupo.addEventListener('keydown', function (e) {
        var paso = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
        if (!paso) return;
        e.preventDefault();
        var botones = $$('.segmento', grupo);
        var i = (sel.selectedIndex + paso + botones.length) % botones.length;
        elegirSegmento(sel, botones[i].getAttribute('data-valor'));
        botones[i].focus();
      });

      sel.style.display = 'none';
      sel.parentNode.insertBefore(grupo, sel.nextSibling);
      sel._segmentos = grupo;
      marcarSegmento(sel);
    });
  }

  global.UI = {
    cop: cop, numero: numero, pct: pct, fecha: fecha,
    $: $, $$: $$, leerFormulario: leerFormulario,
    nombreCalidad: nombreCalidad, toast: toast, claseSigno: claseSigno,
    esManual: esManual, marcarManual: marcarManual, auto: auto, armarAutos: armarAutos,
    segmentar: segmentar
  };
})(window);

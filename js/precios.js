/*
 * precios.js — Precio de los metales al día, solo.
 *
 * Al abrir la app (si el último precio tiene más de una hora) y luego cada
 * hora mientras está abierta, trae:
 *   - oro, plata y platino en dólares por onza troy: api.gold-api.com
 *   - la TRM vigente: datos.gov.co (Superintendencia Financiera)
 * Las dos fuentes son gratis, no piden clave y responden desde el navegador
 * aunque la app se abra con doble clic.
 *
 * Con eso se recalcula el gramo de cada metal en pesos:
 *   gramo = dólares por onza × TRM ÷ 31,1035 × pureza × (1 + ajuste %)
 *
 * Sin internet no pasa nada: queda el último precio guardado y se reintenta
 * al volver la conexión.
 */
(function (global) {
  'use strict';

  var FUENTE_METAL = 'https://api.gold-api.com/price/';
  var FUENTE_TRM = 'https://www.datos.gov.co/resource/32sa-8pi3.json?$order=vigenciadesde%20DESC&$limit=1';
  var SIMBOLO = { oro: 'XAU', plata: 'XAG', platino: 'XPT' };
  // Historial: cotizaciones diarias publicadas (gratis, sin clave), con el
  // metal ya expresado en pesos por onza. Dos espejos por si uno falla.
  var FUENTES_HISTORIA = [
    'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@{fecha}/v1/currencies/{m}.min.json',
    'https://{fecha}.currency-api.pages.dev/v1/currencies/{m}.min.json'
  ];
  var MESES_HISTORIA = 12;
  var GRAMOS_POR_ONZA = 31.1035;
  var CADA = 60 * 60 * 1000;        // una hora
  var REINTENTO = 10 * 60 * 1000;   // si falló, otra vez en diez minutos
  var ESPERA = 12000;               // cada consulta, como máximo doce segundos

  var enCurso = null;
  var reintento = null;

  /* Ley del oro según el quilataje, como se marca en joyería. */
  var LEY_ORO = { 24: 0.999, 22: 0.916, 21: 0.875, 18: 0.750, 14: 0.585, 10: 0.417, 9: 0.375 };

  /* De qué está hecho un metal y en qué proporción, leído del nombre:
     "Oro 18k" → oro al 75 %, "Plata 925" → plata al 92,5 %.
     Si no se reconoce, el metal queda con precio fijo. */
  function inferir(nombre) {
    var n = String(nombre || '').toLowerCase();
    var k = /oro\D*(\d{1,2})\s*k/.exec(n) || /(\d{1,2})\s*k\D*oro/.exec(n);
    if (k) {
      var q = Math.min(24, parseInt(k[1], 10));
      return { ref: 'oro', pureza: LEY_ORO[q] || q / 24 };
    }
    var ley = /(plata|platino)\D*(\d{3})/.exec(n);
    if (ley) return { ref: ley[1], pureza: parseInt(ley[2], 10) / 1000 };
    return null;
  }

  /* Cómo se calcula un metal: lo guardado manda; si falta, se deduce del nombre. */
  function receta(metal) {
    var deducida = inferir(metal.nombre);
    var ref = metal.ref || (deducida && deducida.ref) || null;
    return {
      ref: ref,
      pureza: Calc.num(metal.pureza) || (deducida ? deducida.pureza : 1),
      ajuste: Calc.num(metal.ajuste),
      // Solo se actualiza solo si se sabe de qué metal se trata.
      auto: !!ref && metal.auto !== false
    };
  }

  function cotizacion() { return Store.datos.cotizacion || null; }

  /* Del precio de la onza pura en pesos al gramo de este metal. */
  function gramoDesdeOnza(copOnza, r) {
    return Math.round(copOnza / GRAMOS_POR_ONZA * r.pureza * (1 + r.ajuste / 100));
  }

  /* Precio del gramo en pesos según la última cotización (o null si no hay). */
  function precioGramo(metal) {
    var c = cotizacion();
    var r = receta(metal);
    if (!c || !r.ref || !c.usdOnza || !c.usdOnza[r.ref] || !c.trm) return null;
    return gramoDesdeOnza(c.usdOnza[r.ref] * c.trm, r);
  }

  /* ---------- Historial ----------
   * serieMetales guarda la onza pura en pesos por fecha: { oro: { '2026-11-01': 12627073 } }.
   * De ahí sale el historial del gramo de cada metal automático (con su
   * pureza y su ajuste), marcado como fuente "mercado" para no mezclarlo
   * con los precios anotados a mano. */
  function serie(ref) {
    var s = Store.datos.serieMetales = Store.datos.serieMetales || {};
    return s[ref] = s[ref] || {};
  }

  function anotar(item, fecha, valor) {
    var h = Store.datos.historial;
    for (var i = 0; i < h.length; i++) {
      if (h[i].item === item && h[i].fecha === fecha && h[i].fuente === 'mercado') { h[i].valor = valor; return; }
    }
    h.push({ id: Store.id(), fecha: fecha, item: item, valor: valor, fuente: 'mercado' });
  }

  function escribirHistorial() {
    var metales = Store.datos.config.metales;
    Object.keys(metales).forEach(function (k) {
      var r = receta(metales[k]);
      if (!r.auto) return;
      var s = serie(r.ref);
      Object.keys(s).forEach(function (fecha) { anotar(k, fecha, gramoDesdeOnza(s[fecha], r)); });
    });
    Store.datos.historial.sort(function (a, b) { return new Date(a.fecha) - new Date(b.fecha); });
  }

  /* Pone al día los metales automáticos con la cotización guardada.
     Devuelve true si cambió algún precio. */
  function aplicar() {
    var metales = Store.datos.config.metales;
    var c = cotizacion();
    var cambio = false;
    // El punto de hoy en la serie: la onza en dólares por la TRM.
    if (c && c.usdOnza && c.trm) {
      Object.keys(c.usdOnza).forEach(function (ref) { serie(ref)[Store.hoy()] = c.usdOnza[ref] * c.trm; });
    }
    Object.keys(metales).forEach(function (k) {
      var m = metales[k];
      if (!receta(m).auto) return;
      var nuevo = precioGramo(m);
      if (nuevo === null) return;
      if (nuevo !== m.precioGramo) { m.precioGramo = nuevo; cambio = true; }
    });
    escribirHistorial();
    return cambio;
  }

  function fechaISO(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  /* El 1 y el 15 de cada mes del último año, hasta ayer. */
  function fechasHistoria() {
    var hoy = new Date();
    var out = [];
    for (var i = MESES_HISTORIA; i >= 0; i--) {
      [1, 15].forEach(function (dia) {
        var d = new Date(hoy.getFullYear(), hoy.getMonth() - i, dia);
        if (fechaISO(d) < Store.hoy()) out.push(fechaISO(d));
      });
    }
    return out;
  }

  function onzaEnPesos(fecha, ref) {
    var m = SIMBOLO[ref].toLowerCase();
    var url = function (plantilla) { return plantilla.replace('{fecha}', fecha).replace('{m}', m); };
    return traer(url(FUENTES_HISTORIA[0]))
      .catch(function () { return traer(url(FUENTES_HISTORIA[1])); })
      .then(function (j) { return (j && j[m] && Calc.num(j[m].cop)) || null; });
  }

  /* Corre las tareas de a pocas a la vez, para no saturar la conexión. */
  function enTandas(tareas, cuantas) {
    var resultados = [];
    var i = 0;
    function siguiente() {
      if (i >= tareas.length) return Promise.resolve();
      var j = i++;
      return tareas[j]().then(function (r) { resultados[j] = r; }, function () { resultados[j] = null; }).then(siguiente);
    }
    var hilos = [];
    for (var k = 0; k < cuantas; k++) hilos.push(siguiente());
    return Promise.all(hilos).then(function () { return resultados; });
  }

  /* Trae el último año de cada metal en uso, una sola vez (o hasta que
     se logre: si no hay internet, se intenta en la próxima apertura). */
  var rellenando = null;
  function rellenarHistoria() {
    if (rellenando || typeof fetch === 'undefined') return rellenando || Promise.resolve(false);
    var faltan = referenciasEnUso().filter(function (ref) { return Object.keys(serie(ref)).length < 10; });
    if (!faltan.length) return Promise.resolve(false);

    var fechas = fechasHistoria();
    var tareas = [];
    faltan.forEach(function (ref) {
      fechas.forEach(function (fecha) {
        tareas.push(function () {
          return onzaEnPesos(fecha, ref).then(function (cop) { if (cop) serie(ref)[fecha] = cop; return cop; });
        });
      });
    });
    rellenando = enTandas(tareas, 6).then(function (resultados) {
      rellenando = null;
      if (!resultados.some(Boolean)) return false;
      aplicar(); // escribe el historial y el punto de hoy
      Store.guardar();
      refrescarPantalla();
      return true;
    });
    return rellenando;
  }

  function traer(url) {
    var control = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var reloj = control ? setTimeout(function () { control.abort(); }, ESPERA) : null;
    return fetch(url, control ? { signal: control.signal, cache: 'no-store' } : { cache: 'no-store' })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (json) { clearTimeout(reloj); return json; }, function (e) { clearTimeout(reloj); throw e; });
  }

  /* Qué referencias hacen falta: solo las de los metales automáticos. */
  function referenciasEnUso() {
    var vistas = {};
    var metales = Store.datos.config.metales;
    Object.keys(metales).forEach(function (k) {
      var r = receta(metales[k]);
      if (r.auto) vistas[r.ref] = true;
    });
    return Object.keys(vistas);
  }

  function actualizar() {
    if (enCurso) return enCurso;
    var refs = referenciasEnUso();
    if (!refs.length) return Promise.resolve(false);
    if (typeof fetch === 'undefined') return Promise.resolve(false);

    var anterior = cotizacion() || {};
    enCurso = Promise.all([traer(FUENTE_TRM)].concat(refs.map(function (ref) {
      return traer(FUENTE_METAL + SIMBOLO[ref]);
    }))).then(function (resultados) {
      var trm = resultados[0] && resultados[0][0];
      if (!trm || !Calc.num(trm.valor)) throw new Error('TRM vacía');
      var usdOnza = {};
      // Se conservan las referencias que ya no se consultan, por si vuelven.
      Object.keys(anterior.usdOnza || {}).forEach(function (r) { usdOnza[r] = anterior.usdOnza[r]; });
      refs.forEach(function (ref, i) {
        var precio = Calc.num(resultados[i + 1] && resultados[i + 1].price);
        if (!precio) throw new Error('Sin precio de ' + ref);
        usdOnza[ref] = precio;
      });

      Store.datos.cotizacion = {
        usdOnza: usdOnza,
        trm: Calc.num(trm.valor),
        trmVigencia: String(trm.vigenciadesde || '').slice(0, 10),
        actualizado: new Date().toISOString(),
        error: ''
      };
      aplicar();
      Store.guardar();
      refrescarPantalla();
      return true;
    }).catch(function (e) {
      // Sin conexión o la fuente no respondió: se queda el último precio.
      var c = Store.datos.cotizacion || {};
      c.error = navigator.onLine === false ? 'sin conexión' : 'la fuente no respondió';
      c.ultimoIntento = new Date().toISOString();
      Store.datos.cotizacion = c;
      Store.guardar();
      refrescarPantalla();
      console.warn('Precios en vivo: no se pudo actualizar.', e);
      clearTimeout(reintento);
      reintento = setTimeout(actualizar, REINTENTO);
      return false;
    }).then(function (ok) {
      enCurso = null;
      return ok;
    });
    return enCurso;
  }

  function vencida() {
    var c = cotizacion();
    if (!c || !c.actualizado || c.error) return true;
    return Date.now() - new Date(c.actualizado).getTime() >= CADA;
  }

  function actualizarSiHaceFalta() { if (vencida()) actualizar(); }

  function iniciar() {
    // Con la última cotización guardada, el día de hoy ya tiene su punto
    // aunque todavía no toque volver a consultar.
    if (cotizacion() && cotizacion().actualizado) { aplicar(); Store.guardar(); }
    actualizarSiHaceFalta();
    rellenarHistoria();
    setInterval(actualizar, CADA);
    // Al volver a la ventana o recuperar internet, se pone al día si toca.
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) actualizarSiHaceFalta();
    });
    window.addEventListener('online', actualizar);
  }

  /* ---------- Para mostrar ---------- */

  function hace(iso) {
    var min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (min < 1) return 'hace un momento';
    if (min < 60) return 'hace ' + min + ' min';
    var h = Math.round(min / 60);
    if (h < 24) return 'hace ' + h + ' h';
    return 'el ' + UI.fecha(String(iso).slice(0, 10));
  }

  function resumenHTML() {
    var c = cotizacion();
    var nombres = { oro: 'Oro', plata: 'Plata', platino: 'Platino' };
    if (!c || !c.actualizado) {
      return '<h4>Precios en vivo</h4><p>' +
        (c && c.error ? 'Todavía no se han podido traer (' + c.error + '). ' : 'Trayendo el precio del oro y la TRM… ') +
        'Mientras tanto se usan los precios escritos aquí.</p>';
    }
    var cotiz = Object.keys(c.usdOnza || {}).map(function (r) {
      return (nombres[r] || r) + ' <strong>US$ ' + UI.numero(c.usdOnza[r], 2) + '</strong>/oz';
    });
    cotiz.push('TRM <strong>$ ' + UI.numero(c.trm, 2) + '</strong>' + (c.trmVigencia ? ' (' + UI.fecha(c.trmVigencia) + ')' : ''));
    return [
      '<h4>Precios en vivo</h4>',
      '<p>' + cotiz.join(' · ') + '<br>',
      c.error
        ? 'Ahora no se pudo actualizar (' + c.error + '): se usan los precios de ' + hace(c.actualizado) + '. Se reintenta solo.'
        : 'Actualizado ' + hace(c.actualizado) + '. Se actualiza solo cada hora mientras la app está abierta.',
      '</p>'
    ].join('');
  }

  /* Explica de dónde sale el precio de un metal. */
  function describir(metal) {
    var r = receta(metal);
    if (!r.ref) return 'Precio fijo: no se reconoce como oro, plata o platino. Para que se actualice solo, nómbralo como "Oro 18k" o "Plata 925".';
    if (!r.auto) return 'Precio escrito a mano: no se actualiza solo.';
    var texto = r.ref.charAt(0).toUpperCase() + r.ref.slice(1) + ' al ' + UI.numero(r.pureza * 100, 1) + ' %';
    if (r.ajuste) texto += ', ajuste ' + (r.ajuste > 0 ? '+' : '') + UI.numero(r.ajuste, 1) + ' %';
    return texto + '. Se actualiza solo.';
  }

  /* Tras actualizar, refresca lo que esté en pantalla sin redibujar la
     vista (para no quitarle el foco a nadie). */
  function refrescarPantalla() {
    UI.$$('[data-estado-precios]').forEach(function (el) { el.innerHTML = resumenHTML(); });
    var metales = Store.datos.config.metales;
    UI.$$('[data-metal][data-auto]').forEach(function (input) {
      var m = metales[input.getAttribute('data-metal')];
      if (m && input !== document.activeElement) UI.auto(input, m.precioGramo);
    });
    // Si Mercado está abierto, su gráfica se vuelve a dibujar con lo nuevo.
    if (global.Vistas && Vistas.mercado && Vistas.mercado.redibujar) Vistas.mercado.redibujar();
  }

  global.Precios = {
    iniciar: iniciar,
    actualizar: actualizar,
    aplicar: aplicar,
    rellenarHistoria: rellenarHistoria,
    inferir: inferir,
    receta: receta,
    precioGramo: precioGramo,
    describir: describir,
    resumenHTML: resumenHTML
  };
})(window);

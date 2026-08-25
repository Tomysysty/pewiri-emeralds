/* app.js — navegación entre vistas. */
(function (global) {
  'use strict';

  var actual = 'inicio';
  var contenedor;

  var temporizadorPildora = null;

  /* Lleva la píldora de vidrio hasta la pestaña activa. Durante el viaje se
     estira un poco y luego recupera su forma: de ahí la sensación líquida. */
  function moverPildora(conViaje) {
    var pildora = UI.$('.pildora');
    var activa = UI.$('.pestana.activa');
    if (!pildora || !activa) return;

    if (!conViaje) pildora.classList.add('sin-viaje');

    var x = activa.offsetLeft;
    var y = activa.offsetTop;
    pildora.style.width = activa.offsetWidth + 'px';
    pildora.style.height = activa.offsetHeight + 'px';
    pildora.style.transform = 'translate(' + x + 'px, ' + y + 'px) scaleX(' + (conViaje ? 1.07 : 1) + ')';
    pildora.classList.add('lista');

    clearTimeout(temporizadorPildora);
    temporizadorPildora = setTimeout(function () {
      pildora.style.transform = 'translate(' + x + 'px, ' + y + 'px) scaleX(1)';
      pildora.classList.remove('sin-viaje');
    }, conViaje ? 240 : 40);
  }

  function mostrar(nombre) {
    if (!Vistas[nombre]) return;
    var cambia = actual !== nombre;

    // La vista que se va suelta lo que tenga vivo (escuchas de scroll, video).
    if (cambia && Vistas[actual] && Vistas[actual].limpiar) Vistas[actual].limpiar();
    actual = nombre;

    UI.$$('.pestana').forEach(function (b) {
      b.classList.toggle('activa', b.getAttribute('data-vista') === nombre);
    });
    moverPildora(cambia);

    // Contenedor nuevo en cada render: así no se acumulan escuchadores.
    var nuevo = document.createElement('div');
    nuevo.id = 'vista';
    contenedor.replaceWith(nuevo);
    contenedor = nuevo;

    Vistas[nombre].render(contenedor);
    armarEntradas(contenedor, nombre);
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

  /* La cabecera es fija: hay que reservarle su hueco en el body. Se mide
     siempre el estado alto, con la transición apagada, para que la medida no
     dependa de si en ese momento estaba compactada. */
  function reservarHueco() {
    var cabecera = UI.$('.cabecera');
    if (!cabecera) return 0;
    var compactada = cabecera.classList.contains('desplazada');

    cabecera.style.transition = 'none';
    if (compactada) cabecera.classList.remove('desplazada');
    var alto = cabecera.getBoundingClientRect().height;
    if (compactada) cabecera.classList.add('desplazada');
    cabecera.offsetHeight;            // fuerza el recálculo antes de repintar
    cabecera.style.transition = '';

    document.body.style.paddingTop = Math.round(alto) + 'px';
    document.documentElement.style.setProperty('--alto-cabecera', Math.round(alto) + 'px');
    return alto;
  }

  /* Al bajar, la cabecera se compacta y aparece el degradado.
     Los dos umbrales (histéresis) evitan que entre y salga sin parar cuando el
     scroll queda justo sobre el límite. */
  function vigilarDesplazamiento() {
    var cabecera = UI.$('.cabecera');
    if (!cabecera) return;
    var compactada = false;
    var pendiente = null;

    var alBajar = function () {
      var y = window.scrollY;
      var cambia = (!compactada && y > 24) || (compactada && y < 8);
      if (!cambia) return;

      compactada = !compactada;
      cabecera.classList.toggle('desplazada', compactada);

      // Terminada la transición, las pestañas pueden haber reacomodado:
      // la píldora vuelve a medirse.
      clearTimeout(pendiente);
      pendiente = setTimeout(function () { moverPildora(false); }, 460);
    };

    window.addEventListener('scroll', alBajar, { passive: true });
    alBajar();
  }

  /* Si cambia el ancho, las pestañas se reacomodan: la píldora también. */
  function vigilarTamano() {
    var pendiente = null;
    window.addEventListener('resize', function () {
      clearTimeout(pendiente);
      pendiente = setTimeout(function () { reservarHueco(); moverPildora(false); }, 120);
    });
    // Las tipografías propias llegan después del primer dibujo y cambian
    // los anchos: hay que volver a medir hueco y píldora.
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { reservarHueco(); moverPildora(false); });
    }
  }

  /* Las tarjetas llegan en secuencia al entrar en pantalla. Cuando terminan se
     les quitan los retrasos: si no, cada hover posterior arrastra el escalonado. */
  var observador = null;
  var yaVistas = {};
  function armarEntradas(raiz, nombre) {
    var quiereQuieto = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (quiereQuieto || !('IntersectionObserver' in window)) {
      document.body.classList.remove('animado');
      return;
    }
    document.body.classList.add('animado');

    // La pestaña se anima la primera vez que se abre. Al volver a dibujarla
    // (guardar, abrir una evaluación) aparece de una: reanimar en cada guardado
    // se siente como un parpadeo, no como un detalle.
    if (yaVistas[nombre]) {
      UI.$$('.tarjeta, .factores', raiz).forEach(function (el) {
        el.classList.add('entra', 'asentada');
      });
      return;
    }
    yaVistas[nombre] = true;
    if (observador) observador.disconnect();
    observador = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('entra');
        setTimeout(function () { e.target.classList.add('asentada'); }, 900);
        observador.unobserve(e.target);
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -6% 0px' });

    UI.$$('.tarjeta, .factores', raiz).forEach(function (el) { observador.observe(el); });
  }

  function iniciar() {
    Iconos.montar();
    contenedor = UI.$('#vista');
    UI.$$('.pestana').forEach(function (b) {
      b.addEventListener('click', function () { mostrar(b.getAttribute('data-vista')); });
    });
    reservarHueco();
    vigilarDesplazamiento();
    vigilarTamano();
    sembrarHistorial();
    mostrar(actual);
  }

  global.App = { mostrar: mostrar, recargar: recargar };
  document.addEventListener('DOMContentLoaded', iniciar);
})(window);

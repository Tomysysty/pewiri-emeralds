/* Vista: Inicio — la puerta de entrada. El video de la veta arriba y desde
   aquí se entra a todo lo demás. */
(function (global) {
  'use strict';

  var PUERTAS = [
    { vista: 'caracterizacion', icono: 'huella', titulo: 'Caracterización',
      texto: 'Los nueve factores del SVP-9 y la huella digital de cada piedra.' },
    { vista: 'lote', icono: 'base', titulo: 'Lote',
      texto: 'Reparte el lote por calidad y saca su valor de venta.' },
    { vista: 'piedra', icono: 'cristal', titulo: 'Piedra individual',
      texto: 'Una piedra suelta: calidad, quilates y precio.' },
    { vista: 'producto', icono: 'talla', titulo: 'Producto',
      texto: 'La joya terminada, con metal, mano de obra y margen.' },
    { vista: 'mercado', icono: 'fire', titulo: 'Mercado',
      texto: 'Cómo se ha movido el precio del quilate y del gramo.' },
    { vista: 'configuracion', icono: 'escala', titulo: 'Configuración',
      texto: 'Las constantes: precios por calidad, metales y márgenes.' }
  ];

  function cuenta(lista) { return (lista || []).length; }

  function render(raiz) {
    var d = Store.datos;
    var quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;

    raiz.innerHTML = [
      '<section class="portada' + (quieto ? ' sin-video' : '') + '" id="portada">',
      '  <div class="portada-fondo" aria-hidden="true">',
      quieto ? '' : '    <video id="videoPortada" muted loop playsinline preload="none" poster="assets/veta-poster.jpg" aria-hidden="true" tabindex="-1"></video>',
      '    <div class="portada-velo"></div>',
      '  </div>',
      '  <div class="portada-texto">',
      '    <span class="portada-marca">Pewiri Emeralds</span>',
      '    <h2>De la veta a la ficha.</h2>',
      '    <p class="ayuda">Caracteriza la piedra, calcula su precio y guarda todo con su origen y su tratamiento por escrito.</p>',
      '    <div class="portada-cifras">',
      cifra(cuenta(d.evaluaciones), 'evaluaciones'),
      cifra(cuenta(d.lotes), 'lotes'),
      cifra(cuenta(d.piedras), 'piedras'),
      cifra(cuenta(d.productos), 'productos'),
      '    </div>',
      '  </div>',
      '</section>',

      '<section class="puertas">',
      PUERTAS.map(function (p, i) {
        return [
          '<button class="puerta" data-ir="' + p.vista + '" style="--orden:' + i + '">',
          '  <span class="marco ' + (i % 2 === 0 ? 'redondo' : 'cuadrado') + '">' + Iconos.usar(p.icono) + '</span>',
          '  <span class="puerta-titulo">' + p.titulo + '</span>',
          '  <span class="puerta-texto">' + p.texto + '</span>',
          '  <span class="puerta-flecha" aria-hidden="true">→</span>',
          '</button>'
        ].join('');
      }).join(''),
      '</section>'
    ].join('');

    UI.$$('[data-ir]', raiz).forEach(function (b) {
      b.addEventListener('click', function () { App.mostrar(b.getAttribute('data-ir')); });
    });

    if (!quieto) arrancarVideo(raiz);
  }

  function cifra(n, etiqueta) {
    return '<div class="cifra"><strong>' + UI.numero(n) + '</strong><span>' + etiqueta + '</span></div>';
  }

  /* El video entra por detrás del póster y solo cuando ya se puede reproducir:
     así la portada nunca se ve vacía ni da un salto al aparecer. */
  function arrancarVideo(raiz) {
    var video = UI.$('#videoPortada', raiz);
    var portada = UI.$('#portada', raiz);
    if (!video) return;

    video.addEventListener('canplay', function () {
      portada.classList.add('con-video');
      var intento = video.play();
      if (intento && intento.catch) intento.catch(function () { /* sin reproducción automática, queda el póster */ });
    }, { once: true });
    video.addEventListener('error', function () { portada.classList.add('sin-video'); }, { once: true });

    video.src = 'assets/veta.mp4';
    video.load();

    // Un video que nadie está viendo no tiene por qué seguir corriendo.
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (e) {
        if (!video.src) return;
        if (e[0].isIntersecting) { var i = video.play(); if (i && i.catch) i.catch(function () {}); }
        else video.pause();
      }, { threshold: 0.05 }).observe(portada);
    }
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) video.pause();
      else if (document.body.contains(video)) { var i = video.play(); if (i && i.catch) i.catch(function () {}); }
    });
  }

  global.Vistas = global.Vistas || {};
  global.Vistas.inicio = { titulo: 'Inicio', render: render };
})(window);

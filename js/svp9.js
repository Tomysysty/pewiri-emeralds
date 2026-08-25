/*
 * svp9.js — Sistema de valoración de 9 factores (SVP-9).
 * Funciones puras, sin DOM: reusable en un programa de escritorio.
 *
 * Los nueve factores, sus definiciones y la escala provienen de la ficha
 * del sistema. Cada factor se califica de 1 a 10.
 */
(function (global) {
  'use strict';

  // Orden en el sentido de las manecillas del reloj, empezando arriba.
  var FACTORES = [
    { clave: 'color', nombre: 'Color', descripcion: 'Intensidad, tono, saturación y pureza del verde.' },
    { clave: 'tamano', nombre: 'Tamaño', descripcion: 'Peso en quilates y rareza de encontrar ese tamaño con buena calidad.' },
    { clave: 'cristal', nombre: 'Cristal', descripcion: 'Capacidad de la gema de transmitir la luz. Transparencia y limpieza visual.' },
    { clave: 'claridad', nombre: 'Claridad', descripcion: 'Cantidad, tipo y visibilidad de inclusiones naturales y su impacto en la belleza y la resistencia.' },
    { clave: 'fire', nombre: 'Fire', descripcion: 'Brillo, viveza y retornos de luz que dan vida a la esmeralda.' },
    { clave: 'talla', nombre: 'Talla', descripcion: 'Calidad del corte, proporciones, simetría y pulido. Determina cómo la luz interactúa con la gema.' },
    { clave: 'procedencia', nombre: 'Procedencia', descripcion: 'Origen geográfico de la esmeralda, reconocido y valorado por el mercado.' },
    { clave: 'tratamiento', nombre: 'Tratamiento', descripcion: 'Tipo y grado de mejora aplicada a la piedra. Menor intervención, mayor valor.' },
    { clave: 'appeal', nombre: 'Appeal', descripcion: 'Impresión visual global. Armonía entre todos los factores y el impacto emocional que genera.' }
  ];

  var ESCALA = [
    { min: 1, max: 2, nombre: 'Básico' },
    { min: 3, max: 4, nombre: 'Bueno' },
    { min: 5, max: 6, nombre: 'Muy bueno' },
    { min: 7, max: 8, nombre: 'Excelente' },
    { min: 9, max: 9, nombre: 'Excepcional' },
    { min: 10, max: 10, nombre: 'Legendario' }
  ];

  function num(v) { var n = Number(v); return isFinite(n) ? n : 0; }

  function acotar(v) {
    var n = num(v);
    if (n < 1) return 1;
    if (n > 10) return 10;
    return n;
  }

  /* Nivel de la escala al que corresponde un puntaje (se redondea al entero
     más cercano, igual que en la ficha impresa). */
  function nivel(puntaje) {
    var p = Math.round(acotar(puntaje));
    for (var i = 0; i < ESCALA.length; i++) {
      if (p >= ESCALA[i].min && p <= ESCALA[i].max) return ESCALA[i];
    }
    return ESCALA[0];
  }

  function factoresVacios(valorInicial) {
    var o = {};
    FACTORES.forEach(function (f) { o[f.clave] = valorInicial === undefined ? 5 : valorInicial; });
    return o;
  }

  function pesosPorDefecto() {
    var o = {};
    FACTORES.forEach(function (f) { o[f.clave] = 1; });
    return o;
  }

  /* ---------------------------------------------------------------
   * evaluar() — de nueve calificaciones a un puntaje único.
   *
   *  promedio    media aritmética simple, sin pesos.
   *  ponderado   media aritmética con los pesos configurados.
   *  equilibrado media geométrica ponderada: castiga el eslabón débil.
   *              Una piedra 10/10 en todo menos claridad = 2 no puede
   *              salir "legendaria" por promedio.
   * ------------------------------------------------------------- */
  function evaluar(factores, pesos) {
    pesos = pesos || pesosPorDefecto();

    var detalle = FACTORES.map(function (f) {
      var valor = acotar(factores[f.clave]);
      var peso = Math.max(0, num(pesos[f.clave]));
      return {
        clave: f.clave,
        nombre: f.nombre,
        descripcion: f.descripcion,
        valor: valor,
        peso: peso,
        nivel: nivel(valor).nombre
      };
    });

    var sumaPesos = detalle.reduce(function (a, d) { return a + d.peso; }, 0);
    var suma = detalle.reduce(function (a, d) { return a + d.valor; }, 0);
    var promedio = suma / detalle.length;

    var ponderado = sumaPesos
      ? detalle.reduce(function (a, d) { return a + d.valor * d.peso; }, 0) / sumaPesos
      : promedio;

    var equilibrado = sumaPesos
      ? Math.exp(detalle.reduce(function (a, d) { return a + d.peso * Math.log(d.valor); }, 0) / sumaPesos)
      : promedio;

    // Dispersión: qué tan pareja es la piedra entre sus nueve factores.
    var varianza = detalle.reduce(function (a, d) {
      return a + Math.pow(d.valor - promedio, 2);
    }, 0) / detalle.length;
    var desviacion = Math.sqrt(varianza);

    var ordenados = detalle.slice().sort(function (a, b) { return a.valor - b.valor; });

    return {
      detalle: detalle,
      suma: suma,
      promedio: promedio,
      ponderado: ponderado,
      equilibrado: equilibrado,
      desviacion: desviacion,
      uniformidad: 1 - Math.min(1, desviacion / 4.5), // 1 = piedra pareja
      masBajo: ordenados[0],
      masAlto: ordenados[ordenados.length - 1],
      nivelPonderado: nivel(ponderado),
      nivelEquilibrado: nivel(equilibrado)
    };
  }

  /* Puntaje según el modo elegido en Configuración. */
  function puntaje(resultado, modo) {
    return modo === 'equilibrado' ? resultado.equilibrado : resultado.ponderado;
  }

  global.SVP9 = {
    FACTORES: FACTORES,
    ESCALA: ESCALA,
    nivel: nivel,
    evaluar: evaluar,
    puntaje: puntaje,
    acotar: acotar,
    factoresVacios: factoresVacios,
    pesosPorDefecto: pesosPorDefecto
  };
})(typeof window !== 'undefined' ? window : globalThis);

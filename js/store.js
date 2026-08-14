/*
 * store.js — Estado de la aplicación + persistencia.
 * Hoy guarda en localStorage. Para el programa de escritorio basta
 * con reemplazar leer()/escribir() por archivo o base de datos.
 */
(function (global) {
  'use strict';

  var CLAVE = 'esmeraldas_app_v1';

  var PREDETERMINADO = {
    version: 1,
    empresa: 'Esmeraldas',
    config: {
      // Constantes que carga la dueña. Todo esto se multiplica por detrás.
      precioQuilate: { baja: 30000, media: 80000, alta: 200000 },
      codigoCalidad: { baja: 'B', media: 'M', alta: 'A' },
      manoObra: 40000,          // costo estándar del joyero por pieza
      manoObraPorGramo: 12000,  // alternativa: costo por gramo trabajado
      metales: {
        'oro-18k': { nombre: 'Oro 18k', precioGramo: 280000 },
        'oro-14k': { nombre: 'Oro 14k', precioGramo: 220000 },
        'plata-925': { nombre: 'Plata 925', precioGramo: 4500 }
      },
      envio: 19000,
      empaque: 5000,
      publicidad: 0,
      margenModo: 'sobrePrecio', // 'sobrePrecio' | 'sobreCosto'
      margenMeta: 40,            // %
      gastosFijosMes: 0
    },
    lotes: [],
    piedras: [],
    productos: [],
    historial: [] // { fecha, item, valor }  item: 'esmeralda-alta' | 'oro-18k' | ...
  };

  function clonar(o) { return JSON.parse(JSON.stringify(o)); }

  function fusionar(base, extra) {
    var out = clonar(base);
    if (!extra || typeof extra !== 'object') return out;
    Object.keys(extra).forEach(function (k) {
      var v = extra[k];
      if (v && typeof v === 'object' && !Array.isArray(v) && out[k] && typeof out[k] === 'object' && !Array.isArray(out[k])) {
        out[k] = fusionar(out[k], v);
      } else if (v !== undefined) {
        out[k] = v;
      }
    });
    return out;
  }

  function leer() {
    try {
      var crudo = localStorage.getItem(CLAVE);
      return crudo ? fusionar(PREDETERMINADO, JSON.parse(crudo)) : clonar(PREDETERMINADO);
    } catch (e) {
      console.warn('No se pudo leer el almacenamiento, se usan valores por defecto.', e);
      return clonar(PREDETERMINADO);
    }
  }

  var datos = leer();
  var suscriptores = [];

  function guardar() {
    try {
      localStorage.setItem(CLAVE, JSON.stringify(datos));
    } catch (e) {
      console.warn('No se pudo guardar.', e);
    }
    suscriptores.forEach(function (fn) { fn(datos); });
  }

  function hoy() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function id() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  /* Registra un punto en el historial de precios (para la gráfica de variación).
     No duplica si ya existe el mismo item con el mismo valor ese día. */
  function registrarPrecio(item, valor, fecha) {
    fecha = fecha || hoy();
    valor = Calc.num(valor);
    var previos = datos.historial.filter(function (h) { return h.item === item; });
    var ultimo = previos[previos.length - 1];
    if (ultimo && ultimo.fecha === fecha) { ultimo.valor = valor; return; }
    if (ultimo && Calc.num(ultimo.valor) === valor) return;
    datos.historial.push({ id: id(), fecha: fecha, item: item, valor: valor });
    datos.historial.sort(function (a, b) { return new Date(a.fecha) - new Date(b.fecha); });
  }

  function exportar() {
    var blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'esmeraldas-respaldo-' + hoy() + '.json';
    a.click();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function importar(texto) {
    var entrante = JSON.parse(texto);
    datos = fusionar(PREDETERMINADO, entrante);
    guardar();
  }

  function reiniciar() {
    datos = clonar(PREDETERMINADO);
    guardar();
  }

  global.Store = {
    get datos() { return datos; },
    guardar: guardar,
    registrarPrecio: registrarPrecio,
    exportar: exportar,
    importar: importar,
    reiniciar: reiniciar,
    hoy: hoy,
    id: id,
    suscribir: function (fn) { suscriptores.push(fn); }
  };
})(window);

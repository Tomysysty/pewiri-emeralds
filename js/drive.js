/*
 * drive.js — Copia en línea de todo lo que se guarda, en una hoja de Google.
 *
 * Cada vez que se guarda algo (evaluación, lote, piedra, producto o venta),
 * unos segundos después se envía a un Google Apps Script publicado como
 * aplicación web (el código está en drive/apps-script.gs y los pasos en
 * drive/LEEME.md). Solo viaja lo que cambió desde el último envío.
 *
 * El guardado local nunca depende de esto: si no hay internet o Drive no
 * responde, la app sigue igual, avisa discretamente y reintenta sola.
 * Las fotos no se envían (no caben en una celda); va cuántas tiene cada ficha.
 */
(function (global) {
  'use strict';

  /* -------------------------------------------------------------------
   * DÓNDE SE PEGA LA URL
   * Lo recomendado es pegarla en la app: Configuración → Google Drive.
   * Queda guardada solo en este navegador.
   *
   * Si prefieres dejarla fija en el código, pégala aquí entre las comillas
   * (empieza con https://script.google.com/macros/s/ y termina en /exec),
   * junto con la clave que pusiste en el Apps Script. OJO: si la app se
   * publica en internet (Netlify), cualquiera que mire el código las vería.
   * ----------------------------------------------------------------- */
  var DRIVE_WEBAPP_URL = '';
  var DRIVE_CLAVE = '';

  var CLAVE_LOCAL = 'esmeraldas_drive_v1';
  var ESPERA = 2500;               // tras el último guardado, cuánto esperar para enviar
  var REINTENTO = 5 * 60 * 1000;   // si falló, otra vez en cinco minutos
  var LIMITE = 30000;              // cada envío, como máximo treinta segundos

  var estado = leerEstado();
  var temporizador = null;
  var reintento = null;
  var enCurso = null;
  var avisoMostrado = false;

  function leerEstado() {
    try {
      var e = JSON.parse(localStorage.getItem(CLAVE_LOCAL) || '{}');
      e.huellas = e.huellas || {};
      // Conexiones hechas antes de esta revisión: si ya enviaron, ya estaban verificadas.
      if (e.url && e.ultimoEnvio && !e.verificado) e.verificado = e.url;
      return e;
    } catch (err) {
      return { huellas: {} };
    }
  }

  function guardarEstado() {
    try { localStorage.setItem(CLAVE_LOCAL, JSON.stringify(estado)); } catch (err) { /* sin espacio: se reenvía después */ }
  }

  function url() { return String(estado.url || DRIVE_WEBAPP_URL || '').trim(); }
  function clave() { return String(estado.clave || DRIVE_CLAVE || '').trim(); }
  function configurado() { return /^https:\/\/\S+$/.test(url()) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//.test(url()); }

  /* No se envía nada hasta revisar la hoja al conectar: si este navegador
     está vacío y Drive ya tiene datos, primero se ofrece traerlos. Si no,
     lo vacío de aquí (por ejemplo la configuración de fábrica) pisaría lo
     que hay allá. */
  function listo() { return configurado() && estado.verificado === url(); }

  function datosLocalesVacios() {
    var d = Store.datos;
    return !['evaluaciones', 'lotes', 'piedras', 'productos', 'ventas'].some(function (k) { return (d[k] || []).length; });
  }

  /* ---------- De los datos de la app a filas de la hoja ---------- */

  function texto(v) { return v === undefined || v === null ? '' : String(v); }
  function redondo(v, dec) { var f = Math.pow(10, dec || 0); return Math.round(Calc.num(v) * f) / f; }

  function filasEvaluaciones() {
    var cfg = Store.datos.config;
    return (Store.datos.evaluaciones || []).map(function (e) {
      var r = SVP9.evaluar(e.factores || {}, cfg.svp9Pesos);
      var puntaje = SVP9.puntaje(r, cfg.svp9Modo);
      var fila = {
        'ID': e.id, 'Código': texto(e.codigo), 'Fecha': texto(e.fecha), 'Evaluador': texto(e.evaluador),
        'Peso (ct)': redondo(e.pesoCt, 2), 'Largo': redondo(e.largo, 2), 'Ancho': redondo(e.ancho, 2), 'Profundidad': redondo(e.profundidad, 2),
        'Procedencia': texto(e.procedenciaTexto), 'Tratamiento': texto(e.tratamientoTexto), 'Notas': texto(e.notas)
      };
      SVP9.FACTORES.forEach(function (f) { fila[f.nombre] = Calc.num((e.factores || {})[f.clave]); });
      fila['Puntaje SVP-9'] = redondo(puntaje, 2);
      fila['Nivel'] = SVP9.nivel(puntaje).nombre;
      fila['Fotos'] = (e.imagenes || []).length;
      return fila;
    });
  }

  function filasLotes() {
    var cfg = Store.datos.config;
    return Store.datos.lotes.map(function (l) {
      var r = Calc.lote(l, cfg.precioQuilate);
      var estadoLote = Inventario.estadoLote(l);
      return {
        'ID': l.id, 'Nombre': texto(l.nombre), 'Fecha': texto(l.fecha), 'Costo total': redondo(l.costoTotal),
        'Piedras': r.cantidadTotal, 'Quilates': redondo(r.quilatesTotal, 2), 'Valor de venta': redondo(r.ventaTotal), 'Utilidad': redondo(r.utilidad),
        'Reparto': r.detalle.filter(function (d) { return d.cantidad; }).map(function (d) {
          return UI.nombreCalidad(d.calidad) + ': ' + d.cantidad + ' (' + UI.numero(d.quilates, 2) + ' ct)';
        }).join(' · '),
        'Estado': estadoLote.texto || 'Sin vender', 'Comprador': texto(l.comprador)
      };
    });
  }

  function filasPiedras() {
    var cfg = Store.datos.config;
    return Store.datos.piedras.map(function (p) {
      var e = Inventario.estadoPiedra(p);
      var lote = p.loteId ? Inventario.buscarLote(p.loteId) : null;
      var ev = p.evaluacionId ? (Store.datos.evaluaciones || []).find(function (x) { return x.id === p.evaluacionId; }) : null;
      return {
        'ID': p.id, 'Código': texto(p.codigo), 'Fecha': texto(p.fecha), 'Calidad': UI.nombreCalidad(p.calidad),
        'Quilates c/u': redondo(p.quilates, 2), 'Cantidad': e.total, 'Disponibles': e.disponibles, 'Estado': e.etiqueta,
        'Costo c/u': redondo(p.costo), 'Valor de venta c/u': redondo(Calc.piedra(p, cfg.precioQuilate).valorUnitario),
        'Lote': lote ? lote.nombre : '', 'Evaluación SVP-9': ev ? texto(ev.codigo) : '', 'Nota': texto(p.nota)
      };
    });
  }

  function filasProductos() {
    var cfg = Store.datos.config;
    return Store.datos.productos.map(function (p) {
      var r = Calc.producto(p, cfg);
      var e = Inventario.estadoProducto(p);
      return {
        'ID': p.id, 'Nombre': texto(p.nombre), 'Tipo de pieza': texto(p.tipoPieza), 'Fecha': texto(p.fecha),
        'Piezas': e.total, 'Vendidas': e.vendidas, 'Disponibles': e.disponibles,
        'Piedras por pieza': (p.piedras || []).map(function (f) {
          return (f.codigo || UI.nombreCalidad(f.calidad)) + ' ' + UI.numero(f.quilates, 2) + ' ct' + (f.cantidad > 1 ? ' ×' + f.cantidad : '');
        }).join(', '),
        'Quilates por pieza': redondo(r.quilatesProducto, 2), 'Metal': r.metal.nombre, 'Gramos por pieza': redondo(r.metal.gramos, 2),
        'Otros costos': r.otrosCostos.map(function (c) { return c.nombre + ' ' + UI.cop(c.valor); }).join(' · '),
        'Costo por pieza': redondo(r.costoTotal), 'Precio por pieza': redondo(r.precioFinal),
        'Estado': e.agotado ? 'Vendido' : (e.vendidas ? 'Vendido en parte' : 'Disponible'),
        'Compradores': e.compradores.join(', '), 'Última venta': texto(p.fechaVenta)
      };
    });
  }

  function filasVentas() {
    var tipos = { producto: 'Producto', piedra: 'Piedra', lote: 'Lote' };
    var pagos = { total: 'Pagado', anticipo: 'Anticipo', sinPago: 'Sin pagar' };
    return Store.datos.ventas.map(function (v) {
      var d = v.detalle || {};
      var costo = Calc.num(d.costo);
      return {
        'ID': v.id, 'Fecha': texto(v.fecha), 'Tipo': tipos[v.tipo] || texto(v.tipo), 'Artículo': texto(v.itemNombre),
        'Cantidad': v.cantidad || 1, 'Comprador': texto(v.comprador), 'Precio': redondo(v.precio),
        'Estado de pago': pagos[v.estadoPago] || texto(v.estadoPago),
        'Método de pago': v.metodoPago === 'transferencia' ? 'Transferencia' : 'Efectivo',
        'Fecha de pago': texto(v.fechaPago), 'Anticipo': redondo(v.anticipoMonto), 'Fecha del anticipo': texto(v.anticipoFecha),
        'Debe': redondo(v.deuda), 'Pago esperado': texto(v.fechaPagoEsperada),
        'Costo': costo ? redondo(costo) : '', 'Utilidad': costo ? redondo(Calc.num(v.precio) - costo) : '',
        'Piedras': (d.piedras || []).map(function (f) {
          return (f.codigo || UI.nombreCalidad(f.calidad)) + ' ' + UI.numero(f.quilates, 2) + ' ct' + (f.cantidad > 1 ? ' ×' + f.cantidad : '');
        }).join(', ')
      };
    });
  }

  function nombreConcepto(item) {
    if (String(item).indexOf('esmeralda-') === 0) return 'Esmeralda ' + UI.nombreCalidad(item.replace('esmeralda-', '')) + ' (por quilate)';
    var m = Store.datos.config.metales[item];
    return (m ? m.nombre : item) + ' (por gramo)';
  }

  function filasHistorial() {
    return (Store.datos.historial || []).filter(function (h) { return h.id; }).map(function (h) {
      return {
        'ID': h.id, 'Fecha': texto(h.fecha), 'Concepto': nombreConcepto(h.item), 'Valor': redondo(h.valor),
        'Fuente': h.fuente === 'mercado' ? 'Mercado' : 'A mano', 'Datos': ficha(h)
      };
    });
  }

  /* La configuración entera en una sola fila: precios por calidad, metales,
     márgenes y pesos del SVP-9. Sirve para restaurarla tal cual. */
  function filasAjustes() {
    return [{
      'ID': 'configuracion', 'Qué es': 'Configuración de la app: precios por calidad, metales, márgenes y SVP-9',
      'Datos': JSON.stringify(Store.datos.config)
    }];
  }

  /* La ficha completa de un registro, para poder restaurarlo desde la hoja.
     Las fotos no van: no caben en una celda (máximo 50.000 caracteres). */
  function ficha(registro) {
    var copia = {};
    Object.keys(registro).forEach(function (k) { if (k !== 'imagenes') copia[k] = registro[k]; });
    var json = JSON.stringify(copia);
    return json.length < 49000 ? json : '';
  }

  function conFicha(filas, registros) {
    return filas.map(function (f, i) { f['Datos'] = ficha(registros[i]); return f; });
  }

  function todasLasFilas() {
    var d = Store.datos;
    return {
      Evaluaciones: conFicha(filasEvaluaciones(), d.evaluaciones || []),
      Lotes: conFicha(filasLotes(), d.lotes),
      Piedras: conFicha(filasPiedras(), d.piedras),
      Productos: conFicha(filasProductos(), d.productos),
      Ventas: conFicha(filasVentas(), d.ventas),
      Historial: filasHistorial(),
      Ajustes: filasAjustes()
    };
  }

  /* Huella corta de una fila, para saber si cambió desde el último envío. */
  function huella(fila) {
    var s = JSON.stringify(fila), h = 5381;
    for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return String(h);
  }

  /* Qué hay que enviar: filas nuevas o cambiadas, y las que ya no están. */
  function cambios(todo) {
    var hojas = {}, total = 0, nuevasHuellas = {};
    var filas = todasLasFilas();
    Object.keys(filas).forEach(function (nombre) {
      var antes = todo ? {} : (estado.huellas[nombre] || {});
      var ahora = {};
      var enviar = [];
      filas[nombre].forEach(function (f) {
        var h = huella(f);
        ahora[f.ID] = h;
        if (antes[f.ID] !== h) enviar.push(f);
      });
      var borrados = todo ? [] : Object.keys(antes).filter(function (id) { return !(id in ahora); });
      nuevasHuellas[nombre] = ahora;
      if (enviar.length || borrados.length) {
        hojas[nombre] = { filas: enviar, borrados: borrados };
        total += enviar.length + borrados.length;
      }
    });
    return { hojas: hojas, total: total, huellas: nuevasHuellas };
  }

  /* ---------- Envío ---------- */

  function llamar(cuerpo) {
    var control = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var reloj = control ? setTimeout(function () { control.abort(); }, LIMITE) : null;
    // text/plain: así el navegador no hace la consulta previa (CORS) que
    // Apps Script no sabe contestar.
    return fetch(url(), {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(cuerpo),
      redirect: 'follow',
      signal: control ? control.signal : undefined
    }).then(function (r) {
      clearTimeout(reloj);
      if (!r.ok) throw new Error('Drive respondió ' + r.status);
      return r.json();
    }, function (e) {
      clearTimeout(reloj);
      throw e;
    }).then(function (respuesta) {
      if (!respuesta || !respuesta.ok) {
        throw new Error(respuesta && respuesta.error === 'clave'
          ? 'la clave no coincide con la del Apps Script'
          : ((respuesta && respuesta.error) || 'respuesta inesperada'));
      }
      return respuesta;
    });
  }

  function motivo(e) {
    if (navigator.onLine === false) return 'sin conexión';
    if (e && e.name === 'AbortError') return 'Drive tardó demasiado';
    if (e && e instanceof TypeError) return 'no se pudo conectar, revisa el enlace o la conexión';
    return (e && e.message) || 'error desconocido';
  }

  /* Envía lo pendiente. todo = true reenvía todas las filas. */
  function enviar(todo) {
    if (!configurado()) return Promise.resolve({ ok: false, sinConfigurar: true });
    if (!listo()) return Promise.resolve({ ok: false, error: 'falta tocar "Guardar y probar conexión"' });
    if (enCurso) return enCurso.then(function () { return enviar(todo); });

    var c = cambios(todo);
    if (!c.total) { pintarEstado(); return Promise.resolve({ ok: true, enviados: 0 }); }

    estado.enviando = true;
    pintarEstado();
    enCurso = llamar({ clave: clave(), accion: 'guardar', enviado: new Date().toISOString(), hojas: c.hojas })
      .then(function (respuesta) {
        // Solo lo que se envió queda como "al día" (si algo cambió mientras
        // tanto, el próximo envío lo recoge).
        Object.keys(c.huellas).forEach(function (nombre) {
          var enviadas = c.hojas[nombre];
          var antes = estado.huellas[nombre] || {};
          if (!enviadas) return;
          // Un Apps Script viejo ignora las pestañas que no conoce: esas no
          // cuentan como enviadas y vuelven a ir cuando se actualice.
          if (respuesta.resumen && !(nombre in respuesta.resumen)) return;
          enviadas.filas.forEach(function (f) { antes[f.ID] = c.huellas[nombre][f.ID]; });
          enviadas.borrados.forEach(function (id) { delete antes[id]; });
          estado.huellas[nombre] = antes;
        });
        estado.ultimoEnvio = new Date().toISOString();
        estado.error = '';
        avisoMostrado = false;
        clearTimeout(reintento);
        return { ok: true, enviados: c.total, resumen: respuesta.resumen };
      }, function (e) {
        estado.error = motivo(e);
        estado.ultimoIntento = new Date().toISOString();
        // Un solo aviso por racha de fallos: discreto, sin insistir.
        if (!avisoMostrado) {
          UI.toast('No se pudo guardar en Drive: ' + estado.error + '. Quedó guardado aquí y se reintenta solo.');
          avisoMostrado = true;
        }
        clearTimeout(reintento);
        reintento = setTimeout(function () { enviar(); }, REINTENTO);
        return { ok: false, error: estado.error };
      })
      .then(function (resultado) {
        estado.enviando = false;
        enCurso = null;
        guardarEstado();
        pintarEstado();
        return resultado;
      });
    return enCurso;
  }

  /* Cada guardado de la app programa un envío; varios guardados seguidos
     se juntan en uno solo. */
  function programar() {
    if (!listo()) return;
    pintarEstado();
    clearTimeout(temporizador);
    temporizador = setTimeout(function () { enviar(); }, ESPERA);
  }

  function probar() {
    if (!configurado()) return Promise.resolve({ ok: false, error: 'Pega primero el enlace de la aplicación web.' });
    return llamar({ clave: clave(), accion: 'probar' }).then(function (r) {
      estado.hoja = { nombre: r.nombre, url: r.url };
      estado.error = '';
      guardarEstado();
      pintarEstado();
      return r;
    }, function (e) {
      return { ok: false, error: motivo(e) };
    });
  }

  function marcarVerificado() {
    estado.verificado = url();
    guardarEstado();
    pintarEstado();
  }

  /* Probar la conexión y revisar la hoja antes de enviar nada. Si este
     navegador está vacío y Drive tiene registros, devuelve ofrecerRestaurar
     y deja la decisión a la vista; si no, queda lista para enviar. */
  function conectar() {
    return probar().then(function (r) {
      if (!r.ok) return r;
      if (Calc.num(r.registros) > 0 && datosLocalesVacios()) { r.ofrecerRestaurar = true; return r; }
      marcarVerificado();
      return r;
    });
  }

  /* Trae de la hoja las fichas completas (columna Datos) y reemplaza lo de
     este navegador. Las fotos no están en Drive: si este navegador las
     tiene, se conservan. */
  function restaurar() {
    if (!configurado()) return Promise.resolve({ ok: false, error: 'Pega primero el enlace y la clave.' });
    return llamar({ clave: clave(), accion: 'leer' }).then(function (r) {
      if (!r.hojas) throw new Error('el Apps Script está desactualizado: pega el código nuevo de drive/apps-script.gs y publica una nueva versión');
      var leer = function (nombre) {
        return (r.hojas[nombre] || []).map(function (s) {
          try { return JSON.parse(s); } catch (e) { return null; }
        }).filter(function (x) { return x && x.id; });
      };
      // Los ID llevan la hora en que se crearon: el más nuevo primero, como en la app.
      var masNuevoPrimero = function (a, b) { return a.id < b.id ? 1 : (a.id > b.id ? -1 : 0); };
      var actuales = Store.datos;
      var fotos = {};
      (actuales.evaluaciones || []).forEach(function (e) { if (e.imagenes && e.imagenes.length) fotos[e.id] = e.imagenes; });

      var config = null;
      (r.hojas.Ajustes || []).forEach(function (s) { try { config = JSON.parse(s); } catch (e) { /* fila dañada: se queda la de aquí */ } });

      var nuevo = {
        version: actuales.version,
        empresa: actuales.empresa,
        config: config || actuales.config,
        evaluaciones: leer('Evaluaciones').map(function (e) { e.imagenes = fotos[e.id] || []; return e; }).sort(masNuevoPrimero),
        lotes: leer('Lotes').sort(masNuevoPrimero),
        piedras: leer('Piedras').sort(masNuevoPrimero),
        productos: leer('Productos').sort(masNuevoPrimero),
        ventas: leer('Ventas').sort(masNuevoPrimero),
        historial: leer('Historial').sort(function (a, b) { return a.fecha < b.fecha ? -1 : (a.fecha > b.fecha ? 1 : 0); }),
        cotizacion: actuales.cotizacion,
        serieMetales: actuales.serieMetales
      };
      if (!nuevo.historial.length) nuevo.historial = actuales.historial;
      var total = nuevo.evaluaciones.length + nuevo.lotes.length + nuevo.piedras.length + nuevo.productos.length + nuevo.ventas.length;

      Store.importar(JSON.stringify(nuevo));
      // Lo de aquí ya es igual a lo de Drive: no hay nada que reenviar.
      estado.huellas = cambios(true).huellas;
      estado.verificado = url();
      estado.error = '';
      estado.ultimoEnvio = new Date().toISOString();
      guardarEstado();
      pintarEstado();
      return {
        ok: true, total: total, configuracion: !!config,
        fotosConservadas: nuevo.evaluaciones.filter(function (e) { return e.imagenes.length; }).length
      };
    }).catch(function (e) {
      return { ok: false, error: motivo(e) };
    });
  }

  /* Cambiar de hoja (p. ej. de la cuenta de prueba a la de Pewiri) obliga a
     enviar todo de nuevo: la hoja nueva no tiene nada. */
  function configurar(nuevaUrl, nuevaClave) {
    nuevaUrl = String(nuevaUrl || '').trim();
    if (nuevaUrl !== String(estado.url || '')) { estado.huellas = {}; delete estado.hoja; delete estado.ultimoEnvio; delete estado.verificado; }
    estado.url = nuevaUrl;
    estado.clave = String(nuevaClave || '').trim();
    estado.error = '';
    guardarEstado();
    pintarEstado();
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

  function escapar(s) { return String(s === undefined || s === null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }

  /* Resumen corto: 'al día', 'pendiente', 'error'… */
  function situacion() {
    if (!configurado()) return { clase: 'apagado', texto: 'Drive sin conectar' };
    if (!listo()) return { clase: 'error', texto: 'Drive en pausa · toca "Guardar y probar conexión"' };
    if (estado.enviando) return { clase: 'enviando', texto: 'Guardando en Drive…' };
    if (estado.error) return { clase: 'error', texto: 'Drive pendiente · ' + estado.error };
    var pendientes = cambios().total;
    if (pendientes) return { clase: 'enviando', texto: 'Drive: ' + pendientes + ' cambio' + (pendientes === 1 ? '' : 's') + ' por enviar' };
    return { clase: 'ok', texto: 'Drive al día' + (estado.ultimoEnvio ? ' · ' + hace(estado.ultimoEnvio) : '') };
  }

  function estadoHTML() {
    var s = situacion();
    var hoja = estado.hoja;
    return [
      '<h4>' + escapar(s.texto) + '</h4>',
      '<p>',
      configurado()
        ? (hoja ? 'Conectado a la hoja <a href="' + escapar(hoja.url) + '" target="_blank" rel="noopener">' + escapar(hoja.nombre) + '</a>. ' : 'Enlace guardado. ') +
          'Cada vez que guardas algo, se envía solo unos segundos después.'
        : 'Pega el enlace de la aplicación web de Google y la clave para que todo lo que guardes quede también en una hoja de Google. Los pasos están en <strong>drive/LEEME.md</strong>.',
      estado.error && estado.ultimoIntento ? '<br>Último intento ' + hace(estado.ultimoIntento) + '. Se reintenta solo cada cinco minutos y al volver la conexión.' : '',
      '</p>'
    ].join('');
  }

  /* El indicador del pie de página y el bloque de Configuración, si están a la vista. */
  function pintarEstado() {
    var pie = document.querySelector('[data-estado-drive-pie]');
    if (pie) {
      var s = situacion();
      pie.style.display = configurado() ? '' : 'none';
      pie.className = 'estado-drive ' + s.clase;
      pie.innerHTML = '<i aria-hidden="true"></i>' + escapar(s.texto);
    }
    UI.$$('[data-estado-drive]').forEach(function (el) { el.innerHTML = estadoHTML(); });
  }

  function iniciar() {
    var pie = document.querySelector('.pie');
    if (pie && !document.querySelector('[data-estado-drive-pie]')) {
      var s = document.createElement('span');
      s.setAttribute('data-estado-drive-pie', '');
      s.setAttribute('role', 'status');
      pie.appendChild(s);
    }
    estado.enviando = false;
    Store.suscribir(programar);
    window.addEventListener('online', function () { enviar(); });
    pintarEstado();
    // Lo que quedó pendiente de la última vez (p. ej. se cerró sin internet).
    if (configurado()) setTimeout(function () { enviar(); }, 4000);
  }

  global.Drive = {
    iniciar: iniciar,
    enviar: enviar,
    probar: probar,
    conectar: conectar,
    restaurar: restaurar,
    marcarVerificado: marcarVerificado,
    datosLocalesVacios: datosLocalesVacios,
    configurar: configurar,
    configurado: configurado,
    url: url,
    clave: clave,
    estadoHTML: estadoHTML,
    // Para probar y revisar desde la consola: qué se enviaría ahora.
    pendiente: function () { return cambios(); }
  };
})(window);

/*
 * Pewiri Emeralds → Google Sheets
 * ------------------------------------------------------------------
 * Este código va DENTRO de la hoja de cálculo de Google, en
 * Extensiones → Apps Script. Los pasos completos están en drive/LEEME.md.
 *
 * Qué hace: recibe lo que la app envía cada vez que se guarda algo y lo
 * escribe en pestañas: Evaluaciones, Lotes, Piedras, Productos, Ventas,
 * Historial (de precios) y Ajustes (la configuración de la app).
 *   - Cada fila se identifica por su ID: si ya existe se actualiza, si no
 *     se agrega. Nunca se reemplaza la hoja entera, así que abrir la app en
 *     un navegador vacío no borra nada de aquí.
 *   - Lo que se borra en la app NO se elimina de la hoja: queda la fecha en
 *     la columna "Borrado", para no perder el historial.
 *   - Las columnas se ubican por su nombre; si la app agrega una nueva,
 *     aparece al final sin desordenar las demás.
 *   - La columna "Datos" (oculta) guarda la ficha completa de cada fila:
 *     con ella la app puede restaurar todo desde aquí si se pierde lo que
 *     tenía guardado en el navegador.
 */

// ⚠️ Cambia esta clave por una tuya (letras y números) y escribe LA MISMA
// en la app: Configuración → Google Drive → Clave. Sin la clave correcta,
// nadie puede escribir en esta hoja aunque tenga el enlace.
var CLAVE = 'CAMBIA-ESTA-CLAVE';

var HOJAS = ['Evaluaciones', 'Lotes', 'Piedras', 'Productos', 'Ventas', 'Historial', 'Ajustes'];
var COL_ID = 'ID';
var COL_ACTUALIZADO = 'Actualizado';
var COL_BORRADO = 'Borrado';
var COL_DATOS = 'Datos';

/* La app envía todo por POST. */
function doPost(e) {
  var datos;
  try {
    datos = JSON.parse(e.postData.contents);
  } catch (err) {
    return responder({ ok: false, error: 'El envío no es un JSON válido.' });
  }
  if (CLAVE && datos.clave !== CLAVE) return responder({ ok: false, error: 'clave' });

  var libro = SpreadsheetApp.getActiveSpreadsheet();
  if (datos.accion === 'probar') {
    return responder({ ok: true, nombre: libro.getName(), url: libro.getUrl(), registros: contarRegistros(libro) });
  }
  if (datos.accion === 'leer') {
    return responder({ ok: true, hojas: leerTodo(libro) });
  }

  // Si llegan dos envíos a la vez, se escriben uno detrás del otro.
  var candado = LockService.getScriptLock();
  candado.waitLock(30000);
  try {
    var resumen = {};
    Object.keys(datos.hojas || {}).forEach(function (nombre) {
      if (HOJAS.indexOf(nombre) < 0) return;
      var h = datos.hojas[nombre];
      resumen[nombre] = escribir(libro, nombre, h.filas || [], h.borrados || []);
    });
    return responder({ ok: true, resumen: resumen });
  } finally {
    candado.releaseLock();
  }
}

/* Abrir el enlace en el navegador solo confirma que está publicado. */
function doGet() {
  return responder({ ok: true, mensaje: 'Pewiri Emeralds: la conexión está publicada. La app envía los datos sola.' });
}

function escribir(libro, nombre, filas, borrados) {
  var hoja = libro.getSheetByName(nombre) || libro.insertSheet(nombre);

  // Encabezados: los que ya hay, más los nuevos que traiga el envío.
  var encabezados = hoja.getLastColumn() > 0
    ? hoja.getRange(1, 1, 1, hoja.getLastColumn()).getValues()[0].map(String)
    : [];
  if (!encabezados.length || encabezados[0] !== COL_ID) encabezados = [COL_ID];
  filas.forEach(function (f) {
    Object.keys(f).forEach(function (k) { if (encabezados.indexOf(k) < 0) encabezados.push(k); });
  });
  [COL_ACTUALIZADO, COL_BORRADO].forEach(function (k) {
    if (encabezados.indexOf(k) < 0) encabezados.push(k);
  });
  hoja.getRange(1, 1, 1, encabezados.length).setValues([encabezados]).setFontWeight('bold');
  hoja.setFrozenRows(1);
  // La ficha completa es para restaurar, no para leer: se oculta.
  var colDatos = encabezados.indexOf(COL_DATOS);
  if (colDatos >= 0) hoja.hideColumns(colDatos + 1);

  // En qué fila está cada ID.
  var ultima = hoja.getLastRow();
  var ids = ultima > 1
    ? hoja.getRange(2, 1, ultima - 1, 1).getValues().map(function (r) { return String(r[0]); })
    : [];

  var ahora = new Date();
  var colActualizado = encabezados.indexOf(COL_ACTUALIZADO);
  var colBorrado = encabezados.indexOf(COL_BORRADO);
  var nuevas = [];
  var actualizadas = 0;

  filas.forEach(function (f) {
    var i = ids.indexOf(String(f[COL_ID]));
    // Las columnas que la app no envía (por ejemplo una de notas que alguien
    // agregó a mano en la hoja) conservan lo que ya tenían.
    var antes = i >= 0 ? hoja.getRange(i + 2, 1, 1, encabezados.length).getValues()[0] : [];
    var fila = encabezados.map(function (k, j) {
      if (!(k in f)) return antes[j] === undefined ? '' : antes[j];
      var v = f[k];
      return v === undefined || v === null ? '' : v;
    });
    fila[colActualizado] = ahora;
    fila[colBorrado] = '';
    if (i >= 0) {
      hoja.getRange(i + 2, 1, 1, fila.length).setValues([fila]);
      actualizadas++;
    } else {
      nuevas.push(fila);
      ids.push(String(f[COL_ID]));
    }
  });
  if (nuevas.length) {
    hoja.getRange(ultima + 1, 1, nuevas.length, encabezados.length).setValues(nuevas);
  }

  var marcadas = 0;
  borrados.forEach(function (id) {
    var i = ids.indexOf(String(id));
    if (i >= 0) { hoja.getRange(i + 2, colBorrado + 1).setValue(ahora); marcadas++; }
  });

  return { nuevas: nuevas.length, actualizadas: actualizadas, borradas: marcadas };
}

/* Las fichas completas (columna Datos) de cada pestaña, sin las borradas.
   Es lo que la app usa para restaurar. */
function leerTodo(libro) {
  var salida = {};
  HOJAS.forEach(function (nombre) {
    var hoja = libro.getSheetByName(nombre);
    salida[nombre] = [];
    if (!hoja || hoja.getLastRow() < 2) return;
    var valores = hoja.getDataRange().getValues();
    var encabezados = valores[0].map(String);
    var colDatos = encabezados.indexOf(COL_DATOS);
    var colBorrado = encabezados.indexOf(COL_BORRADO);
    if (colDatos < 0) return;
    valores.slice(1).forEach(function (fila) {
      if (!fila[colDatos] || (colBorrado >= 0 && fila[colBorrado] !== '')) return;
      salida[nombre].push(String(fila[colDatos]));
    });
  });
  return salida;
}

/* Cuántas fichas se pueden restaurar (sin contar ajustes ni historial). */
function contarRegistros(libro) {
  var todo = leerTodo(libro);
  return ['Evaluaciones', 'Lotes', 'Piedras', 'Productos', 'Ventas'].reduce(function (n, h) {
    return n + (todo[h] || []).length;
  }, 0);
}

function responder(objeto) {
  return ContentService.createTextOutput(JSON.stringify(objeto)).setMimeType(ContentService.MimeType.JSON);
}

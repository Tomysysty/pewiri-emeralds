# Conectar la app con Google Drive

Todo lo que se guarda en la app (evaluaciones, lotes, piedras, productos y ventas)
se copia solo, unos segundos después, a una hoja de cálculo de Google. Si no hay
internet, la app guarda igual en el computador y envía lo pendiente cuando vuelve
la conexión.

**No se necesita contraseña, ni claves de API, ni Google Cloud, ni tarjeta.** Solo
una cuenta de Google y unos 10 minutos la primera vez.

> Primero se prueba con una cuenta propia. Cuando todo funcione, se repiten
> estos mismos pasos en la cuenta de Pewiri y se pega su enlace en la app:
> la app envía todo de nuevo a la hoja nueva.

---

## 1. Crear la hoja

1. Entra a <https://sheets.google.com> con la cuenta donde quieres guardar los datos.
2. Crea una **hoja de cálculo en blanco**.
3. Ponle nombre arriba a la izquierda, por ejemplo **Pewiri Emeralds · Base de datos**.

No hace falta crear pestañas: la app crea **Evaluaciones, Lotes, Piedras,
Productos y Ventas** la primera vez que envía.

## 2. Pegar el código

1. En la hoja: menú **Extensiones → Apps Script**. Se abre otra pestaña.
2. Borra todo lo que haya en el archivo `Código.gs`.
3. Abre el archivo **`drive/apps-script.gs`** de esta carpeta, copia todo y pégalo ahí.
4. Busca la línea:

   ```js
   var CLAVE = 'CAMBIA-ESTA-CLAVE';
   ```

   y cambia `CAMBIA-ESTA-CLAVE` por una clave inventada, solo letras y números
   (por ejemplo `pewiri2026verde`). **Anótala**: la vas a escribir también en la app.
5. Guarda con el ícono del disquete (o `Ctrl + S`). Si pide nombre de proyecto,
   pon "Pewiri app".

## 3. Publicarlo como aplicación web

1. Arriba a la derecha: **Implementar → Nueva implementación**.
2. Al lado de "Seleccionar tipo", toca el engranaje ⚙ y elige **Aplicación web**.
3. Llena así:
   - **Descripción:** Pewiri app
   - **Ejecutar como:** **Yo** (tu correo)
   - **Quién tiene acceso:** **Cualquier usuario** (en algunas cuentas dice
     "Cualquier persona")
4. Toca **Implementar**.

"Cualquier usuario" significa que la app puede enviar datos sin iniciar sesión
en Google. Aun así, nadie puede escribir sin la clave del paso 2.

## 4. Dar el permiso (solo la primera vez)

1. Google pide **Autorizar acceso**: tócalo y elige la cuenta.
2. Aparece **"Google no ha verificado esta aplicación"**. Es normal con un código
   propio que nadie más usa.
3. Toca **Configuración avanzada** (o "Avanzado") → **Ir a Pewiri app (no seguro)**
   → **Permitir**.

El permiso es para que el código escriba en **esta** hoja de **tu** Drive.

## 5. Copiar el enlace a la app

1. Google muestra la **URL de la aplicación web**. Empieza con
   `https://script.google.com/macros/s/` y termina en `/exec`. Cópiala.
2. Abre la app → **Configuración → Google Drive**.
3. Pega el enlace, escribe la **misma clave** del paso 2 y toca
   **Guardar y probar conexión**.
4. Si sale *"Conectado a «Pewiri Emeralds · Base de datos»"*, listo: la app envía
   todo lo que ya tenías y, desde ahí, cada cambio.

Abajo de la app, en el pie de página, verás **"Drive al día"** o cuántos cambios
quedan por enviar.

---

## Qué queda en la hoja

| Pestaña | Una fila por… |
|---|---|
| Evaluaciones | cada ficha SVP-9: medidas, los nueve factores, puntaje, nivel y cuántas fotos tiene |
| Lotes | cada lote: costo, piedras, quilates, reparto por calidad, valor de venta y estado |
| Piedras | cada piedra o grupo de piedras iguales: calidad, quilates, disponibles, estado y costo |
| Productos | cada joya: piedras, metal, otros costos, costo, precio y si se vendió (y a quién) |
| Ventas | cada venta: fecha, comprador, precio, estado y método de pago, deuda, costo y utilidad |

- Cada fila tiene su **ID**: si cambias algo en la app, se actualiza la misma fila.
- Lo que borras en la app **no se elimina** de la hoja: queda la fecha en la
  columna **Borrado**, para no perder el historial.
- La columna **Actualizado** dice cuándo llegó el último cambio de esa fila.
- Puedes agregar columnas propias en la hoja (por ejemplo "Observaciones"): la app
  no las toca.
- Las **fotos no se envían** (no caben en una celda); va cuántas tiene cada ficha.

## Si algo falla

| Mensaje en la app | Qué hacer |
|---|---|
| *la clave no coincide con la del Apps Script* | La clave de la app y la de la línea `var CLAVE` deben ser idénticas (mayúsculas incluidas). |
| *no se pudo conectar, revisa el enlace o la conexión* | Revisa que el enlace termine en `/exec` y que en "Quién tiene acceso" esté **Cualquier usuario**. |
| *sin conexión* | No hay internet. No hay que hacer nada: se envía solo cuando vuelva. |
| La hoja no cambia | En la app: **Configuración → Google Drive → Enviar todo ahora**. |

**Si cambias el código del Apps Script** (por ejemplo la clave): guarda, y luego
**Implementar → Gestionar implementaciones →** lápiz ✏️ → en *Versión* elige
**Nueva versión → Implementar**. El enlace sigue siendo el mismo. Si en cambio
haces "Nueva implementación", sale un enlace nuevo y hay que pegarlo otra vez en
la app.

## Pasarlo a la cuenta de Pewiri

1. Con la señora, en su computador y con su cuenta de Google, repite los pasos 1 a 4.
2. En la app de ella, pega **su** enlace y **su** clave en Configuración → Google Drive.
3. La app detecta que es una hoja nueva y le envía todo desde cero.

Nunca hace falta su contraseña: el permiso lo da ella misma en el paso 4.

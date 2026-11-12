# Pewiri Emeralds — Caracterización y precios

Herramienta interna de Pewiri Emeralds para caracterizar esmeraldas (sistema propio
SVP-9), calcular el precio de lotes, piedras sueltas y joyas terminadas, llevar el
inventario y registrar las ventas.

## Cómo abrirla

- **En internet:** <https://tomysysty.github.io/pewiri-emeralds/> (GitHub Pages). Se
  actualiza sola cada vez que se sube un cambio a la rama `main` (ver
  [Publicar](#publicar)).
- **En este computador:** doble clic en `index.html`. No hay que instalar nada.

Funciona sin internet. La conexión solo se usa para dos cosas, y si no hay, la app
sigue igual:

- traer el precio del oro, la plata y la TRM;
- copiar los datos a Google Drive.

Los datos se guardan en el navegador (`localStorage`) del computador donde se use.
Cada navegador tiene los suyos: para pasarlos a otro, **Configuración → Exportar
respaldo** y, en el otro, **Importar respaldo**. Con Google Drive conectado, además
queda una copia en línea.

## Pestañas

| Pestaña | Para qué sirve |
|---|---|
| **Caracterización** | La huella digital SVP-9: nueve factores calificados de 1 a 10 que se dibujan solos en el radar. Da el puntaje y el nivel, guarda varias fotos por piedra, compara dos piedras y exporta la huella en PNG y la base en CSV. |
| **Lote** | Costo del lote y su reparto por calidad. Al escribir el % de una calidad, los que no has tocado se ajustan para sumar 100 % y el número de piedras sale solo. Da el valor de venta y el punto de equilibrio. Un lote se vende entero o se **pasa al inventario** como piedras sueltas. |
| **Piedra** | Una piedra o un grupo de piedras iguales: calidad, quilates y precio. Puede traer los datos de una evaluación SVP-9. Es también el **inventario**: arriba las disponibles; en un desplegable, las montadas en joyas o vendidas. |
| **Producto** | La joya: piedras del inventario + metal + mano de obra + otros costos + margen → precio de venta. Puede tener **varias piezas iguales**: la tabla de piedras es por pieza y el inventario descuenta piedras × piezas. Tiene el selector **Vendido / No vendido**. |
| **Venta** | Registra la venta de un producto, piedras o un lote: comprador, fecha, precio y pago (total, anticipo o sin pagar; efectivo o transferencia). Arriba, el **resumen**: total vendido, pendiente por cobrar y quién debe, ganancia, ventas y ganancia de cada mes en gráfica, y lo que de verdad te pagan por quilate. |
| **Mercado** | Cómo cambian los precios: el último año del oro y la plata y los cambios de la tabla de esmeraldas, en pesos o en % de cambio. |
| **Configuración** | Las constantes (precio del quilate por calidad, metales, mano de obra, envío, empaque, margen, pesos del SVP-9), la conexión con Google Drive y el respaldo de datos. |

### Cómo se conectan

- **Piedra → Producto → Venta.** Una piedra montada en un producto queda apartada y
  no se puede usar en otro. Al vender el producto, la piedra sale del inventario.
  Si se borra la venta o el producto, la piedra vuelve sola. Las existencias no se
  marcan a mano: se calculan de los productos y las ventas, así nunca quedan
  desincronizadas.
- **Producto → Vendido.** Marcar "Vendido" abre Venta con ese producto elegido, para
  que el comprador y el pago queden en el historial. Si tiene varias piezas, se
  venden una o varias a la vez; queda "Vendido" cuando ya no quedan. Volver a
  "No vendido" deshace la venta más reciente.
- **Cada venta guarda una foto de lo que se vendió** (piedras, metal y costo): si
  después se edita o se borra el producto, el historial no cambia.

### Campos automáticos

Los campos con fondo menta y la etiqueta **AUTO** se calculan solos: código de la
piedra, nombre del producto, valor del metal, mano de obra, precio de venta, precio
del anticipo… Si escribes encima, manda lo tuyo; con **↺ volver a auto** regresa al
cálculo. Las opciones de pocas alternativas (calidad, metal, método y estado de pago)
son botones de un toque.

## Cómo calcula

- **Valor de una piedra** = quilates × precio del quilate de su calidad.
- **Costo del lote por calidad**: se reparte en proporción al valor de venta de cada
  calidad, no por número de piedras. Así una piedra alta carga más costo que una baja.
- **Punto de equilibrio del lote** = costo del lote ÷ valor de venta del lote,
  expresado en porcentaje de piedras a vender.
- **Costo del producto** = esmeraldas + metal + mano de obra + envío + empaque +
  publicidad + cada uno de los otros costos.
- **Precio de venta**, según el tipo de margen elegido:
  - Sobre el precio: `precio = costo ÷ (1 − margen)`
  - Sobre el costo: `precio = costo × (1 + margen)`
- **Metal**: el costo usa el precio al que se compró el gramo (si está en cero, usa el
  de mercado). Aparte se muestra cuánto vale ese mismo gramaje a precio de mercado.
- **Precio del gramo en vivo** (oro, plata, platino), cada hora mientras la app está
  abierta:
  `gramo = dólares por onza × TRM ÷ 31,1035 × pureza × (1 + ajuste %)`.
  La pureza sale del nombre ("Oro 18k" = 75 %, "Plata 925" = 92,5 %). El ajuste se
  pone en Configuración para acercarlo a lo que de verdad se paga o se cobra.
  Si se escribe un precio a mano, ese metal deja de actualizarse solo. Los productos
  ya guardados conservan el precio del gramo con que se guardaron.
- **Ganancia de una venta** = precio − costo guardado en la venta. Las ventas sin
  costo conocido (piedra con costo 0) no entran en el margen.

Fuentes de precios (gratis, sin clave): oro y plata del día en
`api.gold-api.com`; TRM oficial de la Superintendencia Financiera en `datos.gov.co`;
historial del último año en el registro diario público `fawazahmed0/currency-api`.

## Google Drive

Todo lo que se guarda (evaluaciones, lotes, piedras, productos y ventas) se copia
solo, unos segundos después, a una hoja de Google con una pestaña por tipo. Cada
fila tiene su ID y se actualiza en su lugar; lo borrado queda marcado, no se elimina;
las fotos no viajan. Sin internet, se envía cuando vuelva.

Se instala una sola vez por cuenta de Google, sin contraseñas ni claves de API: los
pasos están en **[drive/LEEME.md](drive/LEEME.md)** y el código que se pega en Google
en **[drive/apps-script.gs](drive/apps-script.gs)**. El enlace y la clave se pegan en
**Configuración → Google Drive**.

## Publicar

La app está publicada con **GitHub Pages**, desde la raíz de la rama `main` de este
repositorio (Settings → Pages → *Deploy from a branch* → `main` / `(root)`):

- **Dirección:** <https://tomysysty.github.io/pewiri-emeralds/>
- **Para actualizarla** basta con subir los cambios a `main` (`git push`): GitHub la
  vuelve a publicar sola en uno o dos minutos. No hay que subir archivos a mano.
- Es gratis, sin anuncios ni límites de créditos. GitHub Pages solo funciona gratis con
  el repositorio **público**; en el código no hay claves ni datos del negocio.

El enlace y la clave de Google Drive no van en el código: se pegan en la app, en
**Configuración → Google Drive**, y quedan solo en ese navegador. Los datos tampoco:
cada dirección web guarda los suyos, así que al cambiar de dirección se pasan con
**Exportar / Importar respaldo**.

### Archivo único (para mandar o usar sin internet)

```bash
node empaquetar.js
```

Arma toda la app en un solo `index.html` (código, estilos, tipografías, logo y video
adentro) y lo deja en:

- `../pewiri-app.html` → para mandarlo por correo o abrirlo con doble clic;
- `../esmeraldas-publicar-unico/` → la misma app lista para cualquier otro hosting de
  páginas estáticas (incluye `robots.txt` y `_headers` para que no la indexen los
  buscadores).

Hay que volver a correrlo después de cada cambio si se usa este archivo.

## SVP-9: la huella digital

Nueve factores, cada uno de 1 a 10: **Color, Tamaño, Cristal, Claridad, Fire, Talla,
Procedencia, Tratamiento y Appeal**. Se dibujan sobre un nonágono en ese mismo orden,
empezando arriba y girando con las manecillas del reloj.

Escala: 1–2 Básico · 3–4 Bueno · 5–6 Muy bueno · 7–8 Excelente · 9 Excepcional · 10 Legendario.

Los seis niveles se corresponden con las seis calidades de precio (Básico → Muy baja …
Legendario → Exclusiva): así una piedra traída desde su evaluación llega con la calidad
sugerida.

Del puntaje único hay dos formas de calcularlo, conmutables en Configuración:

- **Promedio ponderado** — suma de los nueve factores según el peso de cada uno. Un
  factor muy bajo se compensa con los demás.
- **Índice equilibrado** — media geométrica ponderada. Castiga el eslabón débil: una
  piedra con dieces en todo y un 2 en Claridad da 9,1 por promedio pero 8,4 por índice
  equilibrado, y baja de Excepcional a Excelente.

⚠️ **Pendiente de confirmar con el criterio original del sistema:** qué peso lleva cada
factor y cuál de las dos formas de combinarlos es la correcta. Por ahora los nueve pesan
igual y el modo por defecto es el promedio ponderado. Ambas cosas se cambian en
Configuración sin tocar código.

## Identidad visual

La interfaz sigue la marca **Pewiri Emeralds**: fondo verde menta `#eaf5ec`, verde
profundo `#1f4a3a` para texto y títulos, tipografía serif, mayúsculas espaciadas en la
navegación y cajas de línea fina sin esquinas redondeadas. Los colores están todos en
variables al inicio de `css/styles.css`; cambiar la marca es cambiar esas variables.

**Para usar el logo original:** guarda el archivo como `img/logo.png` (cuadrado, fondo
transparente, mínimo 200×200 px) y la app lo toma automáticamente. Si ese archivo no
existe, usa la versión en SVG que está en `img/logo.svg`.

**Tipografía:** tres registros, con las fuentes incrustadas en `fonts/` para que
funcionen sin internet y sin instalar nada en el computador:

- **Playfair Display** — la misma de la web de Pewiri. Títulos y cifras grandes.
- **Cambria** (del sistema) — párrafos y tablas.
- **Montserrat** — etiquetas, botones, encabezados de tabla y el nivel de la piedra.

Ambas descargadas son de licencia **SIL Open Font License**, que permite usarlas y
redistribuirlas; el texto de cada licencia está junto a los archivos (`fonts/OFL-*.txt`)
y debe conservarse ahí.

## Estructura

```
index.html
css/styles.css
js/
  calc.js        ← motor de cálculo y reportes, funciones puras, sin DOM
  svp9.js        ← los nueve factores, la escala y los niveles
  ui.js          ← formato de moneda, %, fechas, campos automáticos y botones
  store.js       ← estado + persistencia (hoy localStorage)
  inventario.js  ← existencias calculadas de piedras y estado de lotes
  precios.js     ← precio del oro, la plata y la TRM al día, e historial
  drive.js       ← copia automática en Google Drive
  chart.js       ← gráficas SVG hechas a mano (líneas, barras, radar), sin librerías
  iconos.js      ← iconos de línea propios
  app.js         ← navegación entre pestañas
  vistas/        ← una vista por pestaña
drive/
  apps-script.gs ← el código que se pega en Google
  LEEME.md       ← los pasos para conectar Drive
empaquetar.js    ← arma el archivo único para publicar
```

## Cuando pase a ser un programa de escritorio

`js/calc.js` y `js/svp9.js` no tocan el navegador: se pueden copiar tal cual a
Electron, Tauri o Node y seguir usando `Calc.lote()`, `Calc.piedra()`,
`Calc.producto()` y `Calc.reporteVentas()` sin cambios. Lo único que habría que
reescribir es `store.js`, cambiando `localStorage` por archivo o base de datos.

# Calculadora de precios — Esmeraldas y joyería

Herramienta interna para calcular el precio de venta de lotes, piedras sueltas y joyas
terminadas, y ver la variación del precio de la esmeralda y de los metales.

## Cómo abrirla

Doble clic en `index.html`. No necesita instalar nada ni tener internet.

Los datos se guardan en el navegador (`localStorage`) del computador donde se use.
Desde **Configuración → Respaldo** se exporta un `.json` y se vuelve a importar en otro equipo.

## Pestañas

| Pestaña | Para qué sirve |
|---|---|
| **Caracterización** | La huella digital SVP-9: nueve factores calificados de 1 a 10 que se dibujan solos en el radar. Da el puntaje, el nivel de la escala, compara dos piedras y exporta la huella en PNG y la base en CSV. |
| **Lote** | Costo del lote, cuántas piedras hay de cada calidad, cuántos quilates suman, y el valor de venta por calidad y total. Incluye punto de equilibrio del lote. |
| **Piedra individual** | Una piedra suelta: calidad + quilates → valor de venta. Se puede guardar con código y usarla después en un producto. |
| **Producto** | La joya terminada: esmeraldas + metal + mano de obra + envío + empaque + publicidad + margen → precio de venta. Compara el metal a precio de mercado contra lo que costó. |
| **Mercado** | Historial y gráfica de variación del precio del quilate por calidad y del gramo de cada metal. |
| **Configuración** | Las constantes: precio del quilate por calidad, precio del gramo de cada metal, mano de obra, envío, empaque, margen meta y gastos fijos. |

## Cómo calcula

- **Valor de una piedra** = quilates × precio del quilate de su calidad.
- **Costo del lote por calidad**: se reparte en proporción al valor de venta de cada
  calidad, no por número de piedras. Así una piedra alta carga más costo que una baja.
- **Punto de equilibrio del lote** = costo del lote ÷ valor de venta del lote, expresado
  en porcentaje de piedras a vender.
- **Costo del producto** = esmeraldas + metal + mano de obra + envío + empaque +
  publicidad + otros.
- **Precio de venta**, según el tipo de margen elegido:
  - Sobre el precio: `precio = costo ÷ (1 − margen)`
  - Sobre el costo: `precio = costo × (1 + margen)`
- **Metal**: el costo usa el precio al que se compró el gramo (si está en cero, usa el de
  mercado). Aparte se muestra cuánto vale ese mismo gramaje a precio de mercado y la diferencia.

## SVP-9: la huella digital

Nueve factores, cada uno de 1 a 10: **Color, Tamaño, Cristal, Claridad, Fire, Talla,
Procedencia, Tratamiento y Appeal**. Se dibujan sobre un nonágono en ese mismo orden,
empezando arriba y girando con las manecillas del reloj.

Escala: 1–2 Básico · 3–4 Bueno · 5–6 Muy bueno · 7–8 Excelente · 9 Excepcional · 10 Legendario.

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
  calc.js     ← motor de cálculo, funciones puras, sin DOM
  store.js    ← estado + persistencia (hoy localStorage)
  ui.js       ← formato de moneda, %, fechas y ayudas del DOM
  chart.js    ← gráficas SVG hechas a mano, sin librerías
  app.js      ← navegación entre pestañas
  vistas/     ← una vista por pestaña
```

## Cuando pase a ser un programa de escritorio

`js/calc.js` no toca el navegador: se puede copiar tal cual a Electron, Tauri o Node y
seguir usando `Calc.lote()`, `Calc.piedra()` y `Calc.producto()` sin cambios. Lo único que
habría que reescribir es `store.js`, cambiando `localStorage` por archivo o base de datos.

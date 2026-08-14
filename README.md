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

## Identidad visual

La interfaz sigue la marca **Pewiri Emeralds**: fondo verde menta `#eaf5ec`, verde
profundo `#1f4a3a` para texto y títulos, tipografía serif, mayúsculas espaciadas en la
navegación y cajas de línea fina sin esquinas redondeadas. Los colores están todos en
variables al inicio de `css/styles.css`; cambiar la marca es cambiar esas variables.

**Para usar el logo original:** guarda el archivo como `img/logo.png` (cuadrado, fondo
transparente, mínimo 200×200 px) y la app lo toma automáticamente. Si ese archivo no
existe, usa la versión en SVG que está en `img/logo.svg`.

**Tipografía:** el sitio web usa Playfair Display. Como la app funciona sin internet, se
usa la serif más parecida que ya trae Windows (Constantia para títulos, Cambria para
texto y tablas). Si se instala Playfair Display en el computador, la app la toma sola.

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

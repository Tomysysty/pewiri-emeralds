/* Empaqueta la app en un solo index.html: CSS, JavaScript, tipografías,
   logo, imágenes y video, todo incrustado. El resultado se puede mandar por
   correo o abrir con doble clic sin que falte nada.

   OJO: los reemplazos se hacen con función, no con cadena. Con cadena,
   replace() interpreta $$, $&, $` y $' como escapes y corrompe el código
   fuente sin avisar (UI.$$ se convertía en UI.$). */
const fs = require('fs');
const path = require('path');

// Empaqueta la carpeta donde está este archivo: así nunca arma una copia vieja.
const raiz = __dirname;
const salida = 'C:/Users/Nitro V15/Documents/esmeraldas-publicar-unico';

const leer = (p) => fs.readFileSync(path.join(raiz, p), 'utf8');
const meter = (txt, buscar, valor) => txt.replace(buscar, () => valor);

const TIPOS = { '.woff2': 'font/woff2', '.jpg': 'image/jpeg', '.png': 'image/png', '.mp4': 'video/mp4', '.svg': 'image/svg+xml' };
const incrustados = [];
function dataURI(rutaRelativa) {
  const ext = path.extname(rutaRelativa).toLowerCase();
  const datos = fs.readFileSync(path.join(raiz, rutaRelativa)).toString('base64');
  incrustados.push(path.basename(rutaRelativa) + ' (' + Math.round(datos.length / 1024) + ' KB)');
  return 'data:' + (TIPOS[ext] || 'application/octet-stream') + ';base64,' + datos;
}

/* Cambia toda referencia a assets/ y fonts/ por el archivo incrustado. */
function incrustarRecursos(texto) {
  return texto
    .replace(/url\("\.\.\/(fonts|assets)\/([^"]+)"\)/g, (t, carpeta, archivo) => 'url("' + dataURI(carpeta + '/' + archivo) + '")')
    .replace(/'assets\/([^']+)'/g, (t, archivo) => "'" + dataURI('assets/' + archivo) + "'")
    .replace(/poster="assets\/([^"]+)"/g, (t, archivo) => 'poster=\\"' + dataURI('assets/' + archivo) + '\\"');
}

let html = leer('index.html');

// 1. Logo como data URI
const logoData = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(leer('img/logo.svg'));
html = meter(html, /<img class="logo"[\s\S]*?>/, '<img class="logo" src="' + logoData + '" alt="Pewiri Emeralds">');
html = meter(html, '<link rel="icon" href="img/logo.svg">', '<link rel="icon" href="' + logoData + '">');

// 2. CSS con sus tipografías y su textura adentro
const css = incrustarRecursos(leer('css/styles.css'));
html = meter(html, '<link rel="stylesheet" href="css/styles.css">', '<style>\n' + css + '\n</style>');

// 3. JavaScript, en el orden en que se carga
const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)];
const codigos = [];
scripts.forEach((m) => {
  const codigo = incrustarRecursos(leer(m[1]));
  if (codigo.includes('</script')) throw new Error('El archivo ' + m[1] + ' contiene </script y rompería el HTML');
  codigos.push({ ruta: m[1], codigo: codigo });
  html = meter(html, m[0], '<script>\n/* ===== ' + m[1] + ' ===== */\n' + codigo + '\n</script>');
});

// 4. Verificación: nada quedó alterado ni suelto
const fallos = codigos.filter((f) => !html.includes(f.codigo)).map((f) => f.ruta);
if (!html.includes(css)) fallos.push('css/styles.css');
if (fallos.length) throw new Error('Estos archivos se incrustaron alterados: ' + fallos.join(', '));

const externas = (html.match(/(src|href|url\()\s*=?\s*["']?(?!data:|#)[^"')]*\.(css|js|jpg|png|mp4|woff2|svg)/g) || []);
if (externas.length) throw new Error('Quedaron referencias externas: ' + externas.join(', '));

fs.mkdirSync(salida, { recursive: true });
fs.writeFileSync(path.join(salida, 'index.html'), html, 'utf8');
fs.writeFileSync(path.join(salida, 'robots.txt'), 'User-agent: *\r\nDisallow: /\r\n', 'utf8');
// En Netlify, que los buscadores tampoco la indexen (lo mismo que netlify.toml).
fs.writeFileSync(path.join(salida, '_headers'), '/*\r\n  X-Robots-Tag: noindex, nofollow\r\n', 'utf8');
fs.writeFileSync('C:/Users/Nitro V15/Documents/pewiri-app.html', html, 'utf8');

console.log('Archivo único generado y verificado');
console.log('  tamaño:', (html.length / 1024 / 1024).toFixed(2), 'MB');
console.log('  archivos de código incrustados:', codigos.length + 1);
console.log('  recursos incrustados:', incrustados.length);
incrustados.forEach((r) => console.log('    ' + r));
console.log('  ocurrencias de UI.$$ conservadas:', (html.match(/UI\.\$\$/g) || []).length);

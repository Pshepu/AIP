# AIP · Aplicación Inventario Personal

App para el celular para llevar el inventario de un almacén o bazar:

- Escanear productos con la cámara (código de barras).
- Categorías con color e ícono.
- Muebles y repisas creados por ti (ej: **Mueble A1 · Repisa 2**).
- Avisos de bajo stock y lista de compras para WhatsApp.
- Ventas, ganancias del día, la semana y el mes.
- Respaldo en Excel: descargar, enviar y recuperar.
- Etiquetas QR para pegar en los muebles.
- Funciona sin internet una vez instalada.

**Tus datos se guardan solo en tu teléfono.** Este repositorio tiene el programa, nunca tu inventario.

## Sobre este proyecto

Lo hice para resolver un problema real (control de inventario de un almacén) sin depender de
internet ni de un servidor propio: todo corre en el teléfono como PWA instalable, con los datos
en IndexedDB y respaldo manual a Excel. Diseño y desarrollo en solitario, con asistencia de IA.

Detalle técnico en la sección [Para quien programe](#para-quien-programe), al final de este README.

---

# Guía: publicar AIP en GitHub y pasarla a tu teléfono

Se hace una sola vez y toma unos 15 minutos. No se paga nada.

## ¿Es seguro? ¿Alguien puede tocar mis datos?

No. Lo importante:

1. **En GitHub solo queda el programa (la app vacía).** Tus productos, ventas y precios viven dentro de tu teléfono y nunca se suben a internet.
2. **Si otra persona abre tu link, ve una app vacía en su propio teléfono.** No ve ni puede cambiar nada de tu local.
3. **Solo tú puedes cambiar el programa.** GitHub solo deja modificar el repositorio a su dueño. Mientras no agregues colaboradores, nadie más puede cambiarlo. Si alguien te propone un cambio ("pull request"), no pasa nada a menos que tú lo aceptes. Simplemente ignóralo.
4. **Nunca subas tus respaldos en Excel al repositorio.** Este proyecto ya está configurado para ignorarlos.

> El repositorio tiene que ser **público** para usar GitHub Pages gratis. Eso significa que otros pueden ver el código del programa, no tus datos. Si prefieres que ni el código se vea, hay otras opciones al final de esta guía.

## Paso 1 · Crear el repositorio

1. Entra a <https://github.com> e inicia sesión.
2. Arriba a la derecha toca **+** → **New repository**.
3. En **Repository name** escribe `AIP`.
4. Marca **Public**.
5. **No** marques "Add a README" (ya viene uno).
6. Toca **Create repository**.

## Paso 2 · Subir los archivos

Elige **una** de estas dos formas.

### Forma A · Con comandos (recomendada, ya está todo listo)

La carpeta `D:\AIP` ya tiene Git preparado con el primer guardado hecho. Abre una terminal en esa carpeta y escribe (cambia `TU_USUARIO` por tu usuario de GitHub):

```bash
git remote add origin https://github.com/TU_USUARIO/AIP.git
```

```bash
git push -u origin main
```

Si pide iniciar sesión, se abre una ventana del navegador para que entres a GitHub y aceptes.

### Forma B · Arrastrando archivos (sin comandos)

1. En la página del repositorio recién creado toca **uploading an existing file**.
2. Abre la carpeta `D:\AIP` en el Explorador de Windows.
3. Selecciona **todo su contenido** (las carpetas `css`, `icons`, `js`, `vendor` y los archivos `index.html`, `manifest.webmanifest`, `sw.js`, `README.md`, `.nojekyll`) y arrástralo a la página.
4. Abajo toca **Commit changes**.

> Si `.nojekyll` no aparece en el Explorador, activa "Ver → Elementos ocultos". No es grave si falta.

## Paso 3 · Activar la página web (GitHub Pages)

1. En tu repositorio toca **Settings** (arriba).
2. En el menú de la izquierda toca **Pages**.
3. En **Source** elige **Deploy from a branch**.
4. En **Branch** elige `main` y la carpeta `/ (root)`. Toca **Save**.
5. Espera 1 o 2 minutos y recarga. Arriba aparecerá: *"Your site is live at…"*

Tu link será:

```
https://TU_USUARIO.github.io/AIP/
```

## Paso 4 · Instalar en el teléfono

**Android:**

1. Abre el link en **Chrome**.
2. Toca los tres puntos **⋮** → **Instalar aplicación** (o "Agregar a pantalla principal").
3. Aparece el ícono verde de AIP. Ábrela desde ahí.
4. La primera vez que escanees, acepta el permiso de la **cámara**.

**iPhone:** abre el link en **Safari** → botón Compartir → **Agregar a inicio**.

Desde ahora AIP funciona aunque no tengas internet.

## Paso 5 · Primer uso

1. **Lugares → Crear varios**: por ejemplo letra `A`, del 1 al 5, con 4 repisas → crea A1 a A5.
2. Toca el botón verde del centro y escanea tu primer producto.
3. Una vez por semana: **Más → Enviar respaldo** y mándate el Excel por WhatsApp o Drive.

## Cómo publicar una mejora más adelante

1. Cambia los archivos que quieras.
2. En `sw.js` sube el número de la versión, por ejemplo `aip-v1.0.0` → `aip-v1.0.1`. Si no lo cambias, los teléfonos no se enteran de la mejora.
3. Sube los cambios (`git add .`, `git commit -m "mejora"`, `git push`, o arrastrando los archivos).
4. Al abrir la app con internet aparecerá **"Hay una versión nueva → Actualizar"**. Tus datos se mantienen.

## Cuidado con tus datos

- Si **borras los datos de Chrome**, desinstalas la app o pierdes el teléfono, se pierde el inventario si no tienes respaldo.
- Para pasar todo a un teléfono nuevo: instala AIP en el nuevo → **Más → Cargar desde Excel → Recuperar respaldo**.

## Si no quieres que el código sea público

- **GitHub Pro** (pagado) permite GitHub Pages con repositorio privado.
- **Netlify Drop** (gratis): entra a <https://app.netlify.com/drop> y arrastra la carpeta `D:\AIP`. Te da un link privado sin repositorio público.
- **Cloudflare Pages** (gratis) también acepta repositorios privados.

En cualquiera de esas opciones tus datos siguen quedando solo en el teléfono.

---

## Para quien programe

- HTML + JavaScript sin compilación (PWA). Se abre con cualquier servidor estático: `python -m http.server 5173`.
- Datos en IndexedDB (`js/db.js`).
- Cámara: `BarcodeDetector` del navegador, o ZXing si el teléfono no lo trae (`js/scanner.js`).
- Excel con SheetJS (`js/excel.js`). Hojas: Productos, Muebles, Categorías, Movimientos.
- Funciona sin internet gracias a `sw.js`.
- Librerías incluidas en `vendor/`: SheetJS 0.18.5 (Apache-2.0) y ZXing 0.21.3 (Apache-2.0).

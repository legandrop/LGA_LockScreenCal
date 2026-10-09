# Instrucciones para agentes — LockScreenCal

Antes de hacer nada, leé **`docs/Bitacora.md`**: dice dónde quedó el proyecto,
qué está probado y qué no, y qué sigue. El `README.md` es para el usuario final.

## Qué es

Calendario de los próximos días dibujado como **fondo del lock screen** del iPhone,
con colores. No es una app nativa: es un script de **Scriptable** (app gratis que
corre JavaScript en iOS) que dibuja la imagen, y un **Atajo** de iOS que la pone de
fondo. Lo usa Lega y la idea es pasárselo a su familia y amigos.

## Con quién trabajás

- **Lega** (usuario de GitHub `legandrop`). Habla castellano rioplatense: contestale
  así, corto y directo.
- **Trabaja desde el iPhone**, sin computadora a mano (tiene una MacBook, pero no la
  usa para esto salvo que haga falta de verdad). Todo lo que le pidas que haga es
  tocando pantallas: pasos numerados, uno por línea.
- **No es usuario avanzado de Atajos ni de Scriptable.** Nunca los había usado.

## Reglas

1. **Nunca inventes el nombre de un botón o una acción de iOS.** Ya pasó: se le dijo
   "tocá *Buscar apps y acciones*" y en su iOS la barra dice "Buscar acciones"; perdió
   tiempo y confianza. Si no estás seguro del texto exacto, decile **qué palabra
   escribir en el buscador** (ej. "Scriptable", "Base64", "fondo") y pedile una
   captura para guiarlo sobre lo que ve. Los nombres confirmados en su teléfono están
   en la bitácora.
2. **El repo es público.** No subir datos personales: nombres de clientes, mails,
   códigos de proyecto de Lega, eventos reales. Sus palabras clave van solo en el
   `MI_CONFIG` de su Atajo, nunca en el código. Los ejemplos usan ALFA/BETA/etc.
3. **Commits con la identidad `legandrop`** (`176236735+legandrop@users.noreply.github.com`),
   sin coautores ni footers de atribución. Verificar `git config user.email` antes de
   commitear: una sesión nueva en la nube arranca con la identidad de Claude.
4. **Commit y push al terminar cada cambio**, a `main`. El Atajo de todos baja
   `LockScreenCal.js` de `main` en cada corrida (ver `loader.js`): **lo que se pushea
   a `main` le llega al instante a todos los que lo tienen instalado.** Un error de
   sintaxis rompe el fondo de todos, así que antes de pushear:
   `node --input-type=module --check < LockScreenCal.js` y la vista previa
   (`node tools/preview.cjs`).
5. **Comentarios y textos en castellano.** Los comentarios explican el por qué.
6. **Probar el dibujo sin el iPhone** con `tools/preview.cjs` (Playwright + Chromium):
   en esta nube, `TZ=America/Argentina/Buenos_Aires NODE_PATH=$(npm root -g) node tools/preview.cjs`.
   Mirá la imagen antes de mostrársela a Lega.

## Arquitectura en una línea por archivo

| Archivo | Qué hace |
|---|---|
| `LockScreenCal.js` | Lee eventos (calendarios del iPhone o el puente de Google), dibuja en un `<canvas>` dentro de un `WebView`, y devuelve el PNG **en base64** con `Script.setShortcutOutput` (Scriptable no acepta una imagen como salida). Todo lo configurable está en `CONFIG`; el cargador lo pisa con `OVERRIDES`. |
| `loader.js` | Va **adentro del Atajo** (acción "Run Inline Script" de Scriptable). Baja `LockScreenCal.js` de `raw.githubusercontent.com/.../main`, lo cachea en el iPhone y lo corre con `new AsyncFunction("OVERRIDES", code)(MI_CONFIG)`. |
| `google/Code.gs` | Puente opcional (Google Apps Script) para tener el color de cada **evento** de Google, que el iPhone no expone. Sin probar. |
| `tools/preview.cjs` | Vista previa en la compu: extrae `drawCalendar` entre las marcas `RENDER START/END` y lo corre en Chromium con datos inventados. |
| `docs/preview.png` | La imagen del README. Regenerarla si cambia el dibujo. |

`drawCalendar` **no puede usar nada de afuera de la función**: se inyecta en el
WebView con `drawCalendar.toString()`.

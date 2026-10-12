# Bitácora — dónde estamos

Este archivo es el **estado actual**, no un historial: se reescribe cuando algo
cambia. Si algo de acá deja de ser cierto, se corrige en la misma pasada.
Última actualización: 12/10/2026 (versión del script: ver `VERSION` en
`LockScreenCal.js`).

## Resumen

**El Atajo sigue siendo intermitente.** El 12/10 se probó el retorno del cargador
v0.14: una corrida manual funcionó y después volvió a fallar. La captura más
reciente muestra otro error, en la acción Base64: **Shortcuts no pudo convertir
de Texto a NSString**. Ocurre después de Scriptable y no lo puede capturar un
`catch` del calendario. No atribuirlo a memoria, tiempo, Google ni Todoist sin
evidencia. El diagnóstico v0.13 había llegado a "Salida entregada", 7.8 s, estado
ok; ese registro solo confirmaba que se llamó a la función de salida y podía
corresponder a otra corrida. La etiqueta quedó corregida desde v0.14.

**v0.15 agrega historial por corrida y envío privado al puente de Google.** Lega
pidió logs persistentes y aprobó usar su puente existente. Cada corrida tiene su
propio ID y archivo, con etapas, tiempos, cantidades y tamaño del PNG. Se conservan
100 corridas locales y 50 en Google. No se suben títulos, nombres de calendarios,
claves, contenido del PNG ni mensajes crudos de excepciones. Los códigos de error
y las etapas permiten identificar fallos de JavaScript y de red. Si iOS termina
el proceso, una corrida posterior intenta subir el último estado pendiente.

El bloque `google/Logs.gs` se agrega al final del puente existente y usa su TOKEN.
**Falta que Lega actualice esa implementación**, agregue `logRemote: true` a su
MI_CONFIG e instale el bloque `tools/loader-body.js` desde `const URL =` hasta el
final del Atajo. El código del script principal llega automáticamente; el
cargador y la implementación de Google necesitan esa actualización manual. Los
pasos están en `docs/Logs.md`. `tools/diagnostico.js` muestra el historial local y
`tools/ver-logs-google.js` consulta los registros remotos sin mostrar la clave.

Sintaxis, salida simulada, fallos de envío que no impiden devolver el PNG,
autenticación del puente, reintentos, deduplicación, recuperación de una corrida
interrumpida, retención y privacidad verificados con APIs simuladas. Vista previa
en Chromium revisada. **Falta validar el circuito real en Google y el iPhone.**
`loader_return_prepared` no confirma que Base64 decodificó ni que se aplicó el
fondo; hace falta una confirmación posterior desde el Atajo para asegurar eso.

## Pendiente

0. **Activar y probar los logs de v0.15** siguiendo `docs/Logs.md`. Consultar Google
   con `tools/ver-logs-google.js` y comprobar que llegan corridas reales. Después
   reproducir el fallo y correlacionar hora, ID, última etapa y tamaño del PNG.
   Si el fallo sigue en Base64, revisar la salida que recibió Atajos; el historial
   de Scriptable no registra el error de otra acción ni confirma el fondo aplicado.
1. **Link para compartir.** Lega tiene que duplicar su Atajo, dejar la copia con
   `const MI_CONFIG = {};` (sin su URL de Google ni su token de Todoist), compartirla
   como enlace de iCloud y pasar el link. Va en el `README.md` donde dice
   `LINK_DEL_ATAJO`.
2. **Probar con otra persona** (su mujer o un amigo) siguiendo el README tal cual,
   para encontrar lo que el README da por sentado. Puntos a mirar: que al importar el
   Atajo le pida o le deje elegir su fondo (el "3 fondo de pantalla" es de Lega), y si
   "Mostrar al ejecutar" viene apagado o no en la copia importada.
3. Sin confirmar todavía: que las automatizaciones por **App** ("se cierra") corran
   bien en segundo plano, y si el puente de Google aguanta la cuota de Apps Script con
   muchas corridas por día.

## Cómo lo tiene armado Lega

- **Atajo:** se llama **`LGA_ScreenLockCal`**. Tres acciones (ver README, "A mano"),
  con "Mostrar al ejecutar" apagado en la de Scriptable.
- **Fondo:** pisa el tercer lock screen de su galería, el negro que había creado Ink.
- **`MI_CONFIG`:** `googleUrl` (su puente), `todoistToken`, `onlyCalendars: ["Wanka",
  "Feriados Argentina", "Cumples", "Cumpleaños"]` y sus palabras clave. **La URL, el
  token del puente y el de Todoist no van en este repo** (es público): están solo en
  su Atajo.
- **Palabras clave:** los códigos de sus proyectos con sus colores de Google
  Calendar. Están en su repo privado `legandrop/LGA_Assistant`,
  `context/contexto.md`, sección "Colores de proyecto: Todoist y Google Calendar"; el
  `colorId` se traduce a hex con `EVENT_COLORS` de `google/Code.gs`.
- **Puente de Google:** publicado en script.google.com con su cuenta
  (`lega@wanka.tv`, Workspace: "Cualquier usuario" no estaba bloqueado). Google conoce
  `Holidays in Argentina`, `Cumples`, `Wanka` y `EEI Rodaje`; "Feriados Argentina" y
  "Cumpleaños" salen del iPhone.
- **Todoist:** el token es el mismo `TODOIST_API_TOKEN` que usa LGA Assistant (en su
  `.env`).
- **Automatizaciones:** 07:00 diaria ("Ejecutar de inmediato", "Notificar al
  ejecutar" apagado) y una de tipo App con apps que usa seguido, al cerrarse.
- **Ink:** lo desinstaló el 10/10. Ya no hay conflicto.

## Textos de iOS confirmados en sus capturas (iOS 26, castellano)

Regla del repo: no inventar nombres de botones (ver `CLAUDE.md`). Estos están vistos:

- Al agregar una acción: panel con la barra **"Buscar acciones"** y chips
  **Scripts · Controles · Dispositivo…**. Se escribe ahí lo que se busca.
- Scriptable, código en línea: se ve **"Run with [Parameter] ›"** con el ícono `{}`.
  La **›** despliega el código, después **"Texts"**, **"URLs"** y el interruptor
  **"Mostrar al ejecutar"**. Los diálogos de error la llaman "Run Inline Script".
- Base64: **"Decodificar [Output] con base64"**.
- Fondo: **"Establecer foto como fondo de pantalla"** (ícono azul de flor). Ya
  armada: **"Establecer [Codificado con Base64] como [3 fondo de pantalla] en
  [Pantalla bloqueada] ⌄"**, con los interruptores **"Mostrar vista previa"** y
  **"Recortar sujeto"**. El parámetro del fondo abre una galería de sus lock screens.
  "Codificado con Base64" es el nombre de la salida de la acción de Base64, aunque
  esté en modo decodificar.
- **No confundir** con "Cambiar entre fondos de pantalla" (se ve "Cambiar a [Fondo
  de pantalla]"), que solo alterna fondos. Lega la agregó por error una vez.
- Editor: abajo, deshacer, rehacer, (i), compartir y **▶︎** para correr.
- Automatización: **"Automatización: Ejecutar de inmediato"**, **"Notificar al
  ejecutar"**, **"Cuándo: 07:00, diariamente"**, **"Hacer"**.
- Cuando el script se corta sin salida: **"No se pudo ejecutar Run Inline Script.
  Script completed without presenting UI, triggering a text to speak or outputting a
  value…"**.

## Problemas que aparecieron y cómo se resolvieron

- **`Script.setShortcutOutput(imagen)` falla** ("Unsupported shortcut output"):
  Scriptable no le pasa imágenes a Atajos. Sale el PNG en base64 y el Atajo lo
  decodifica.
- **El lock screen mostraba otro fondo:** la acción pisa el fondo elegido en su
  parámetro, no el activo. Se cambió el activo a mano. Si molesta, se puede agregar
  "Cambiar entre fondos de pantalla" apuntando al mismo fondo, como hacía Ink.
- **Feriados repetidos y de otros países:** el script lee todos los calendarios del
  iPhone, estén tildados o no en la app Calendario ("Días festivos (EE.UU.)" traía
  "Día de la Raza" y "Día de los Pueblos Indígenas" de EE.UU.). Se resuelve con
  `onlyCalendars`; además se deduplican eventos de título, inicio y fin iguales.
- **Corte sin salida** ("Script completed without… outputting a value"), una vez, al
  pegar el cargador con Google. En la nube andaba con sus datos reales; nunca se
  identificó la causa (probablemente la caché de GitHub sirviendo una versión
  intermedia). Desde entonces `main()` atrapa cualquier error y entrega un fondo con
  el error escrito en rojo (dibujado con `DrawContext`, por si lo que falla es el
  WebView), y hay logs por etapa ("Google: …", "iPhone: …", "Todoist: …", "Dibujo
  listo"). Volvio a pasar el 10/10. v0.12 entrega directamente el base64 del
  canvas: la imagen nativa se crea solo para la vista previa dentro de la app.
  Esto evita una conversion innecesaria en la extension, que tiene poca memoria
  (ver https://docs.scriptable.app/webview/#loadfile). No hay logs del corte real
  que confirmen memoria como causa. Si sigue, probar el cargador como script dentro
  de la app Scriptable para ver los logs.
- **Tareas repetidas por Akiflow:** Akiflow crea en Google un evento con el nombre de
  cada tarea de Todoist a la que se le reserva horario (las que Lega ve
  "bloqueadas"). Si una tarea y un evento coinciden en día y nombre (sin mayúsculas
  ni puntuación del final), queda solo la tarea. Log: "Akiflow: N eventos repetidos".
- **Cartel con ✓ y "Listo" en cada corrida:** se apaga con "Mostrar al ejecutar" en
  la acción de Scriptable.
- **Caché de GitHub:** `raw.githubusercontent.com` tarda hasta ~5 minutos en entregar
  una versión nueva. Al probar un cambio, esperar antes de correr el Atajo.

## Riesgos conocidos

- Si el nombre que Google le da a un calendario no coincide con el del iPhone (el
  principal a veces se llama como el mail), `onlyCalendars` lo descarta de Google y
  sale la copia del iPhone, sin colores de evento. Se arregla sumando el nombre de
  Google a `onlyCalendars`.
- Cada corrida pega al puente de Google y a la API de Todoist. Con automatizaciones
  muy frecuentes puede tocar la cuota diaria de Apps Script.
- Lo que se pushea a `main` les llega a todos en la próxima corrida: un error de
  sintaxis rompe el fondo de todos (ver reglas en `CLAUDE.md`).
- `node tools/check-shortcut.cjs` verifica con APIs simuladas la salida base64 sin
  decodificacion nativa en Atajos, la vista en la app, el fondo de error y el
  cargador con/sin internet; también la reutilización en un minuto, el solapamiento
  y la recuperación de marcas vencidas. No reproduce los límites de memoria/tiempo
  de iOS ni demuestra exclusión atómica entre procesos reales.
- La protección de v0.13 empieza en el script descargado: el cargador ya instalado
  todavía descarga el código en cada corrida. La marca local reduce el trabajo
  duplicado, pero no es un bloqueo atómico entre procesos. Si cambia `MI_CONFIG`
  o la versión, no se reutiliza el fondo de los ajustes anteriores.

## Decisiones tomadas (no re-litigar)

- **Fondo de pantalla y no widget:** los widgets del lock screen se ven en blanco y
  negro (modo "vibrant"). Es lo mismo que hace Ink.
- **Scriptable + Atajos y no app nativa:** una app propia necesita Mac/Xcode y, sin
  cuenta de developer paga, vence cada 7 días.
- **Dibujo con canvas en WebView** y no con `DrawContext`: canvas tiene `measureText`
  (para cortar títulos con "…") y el mismo código se prueba en la compu.
- **Repo público + cargador:** cada mejora llega sola a todos sin reinstalar el
  Atajo. Aprobado por Lega el 07/10; el historial se reescribió a un único commit
  antes de publicarlo, para sacar datos personales.
- **Fondo negro**, desde **hoy hasta donde entre**. Los días sin eventos no ocupan
  lugar; un día que no entra entero solo se dibuja si entra al menos un evento y el
  "+N más".
- **Eventos como cajas de su color** (`eventStyle: "fill"`, pedido de Lega), texto en
  negro o blanco según luminancia (corte WCAG 0.179). Las palabras clave sobre una
  caja van en negrita del color del texto.
- **Palabras clave:** distinguen mayúsculas y solo palabras enteras ("VA" sí, "va"
  no).
- **Google:** el puente trae el color de cada evento; del iPhone sale lo que Google no
  tiene. Si el puente falla, todo sale del iPhone y el pie dice "sin Google".
- **Todoist:** API v1 (la REST v2 contesta 410), tareas con fecha **de hoy en
  adelante** (no vencidas: Lega manda su backlog a "ayer"), solo las suyas o sin
  asignar. Las de hoy no se ocultan aunque haya pasado su hora. Color: etiqueta en
  `keywords`, si no el del proyecto. Si una tarea coincide con un evento de Akiflow,
  queda la tarea.
- **No hay disparador de desbloqueo en iOS:** lo más frecuente es una automatización
  por App al cerrarse.

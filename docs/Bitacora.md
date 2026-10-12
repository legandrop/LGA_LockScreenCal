# Bitácora — dónde estamos

Este archivo es el **estado actual**, no un historial: se reescribe cuando algo
cambia. Si algo de acá deja de ser cierto, se corrige en la misma pasada.
Última actualización: 12/10/2026 (versión del script: ver `VERSION` en
`LockScreenCal.js`).

## Resumen

**El Atajo sigue siendo intermitente; no se ha confirmado una solucion en iOS.**
Los registros recuperados el 12/10 muestran una consulta a Google de 45 min 31 s
en v0.16 y otra de 61 min 4 s en v0.18. Esta ultima tambien tuvo un timeout de
Todoist de 87.7 s; luego dibujo el PNG y preparo el retorno a las 19:21 locales,
62 min 37 s despues de empezar. Atajos ya habia mostrado el error. Otra corrida
reutilizo un PNG y preparo el retorno en 1.5 s. Las etapas de salida no confirman
que Atajos recibio el texto, decodifico el PNG ni aplico el fondo. Se observaron
fallos tanto en Scriptable como en la accion Base64 de Atajos.

**El plazo de 12 s de Google no se cumplio en esas corridas reales.**
Desde v0.16 se usa Timer y Promise.race.
`Request.timeoutInterval` limita inactividad, no tiempo total. Al vencer el nuevo
limite se continua con los calendarios del iPhone. El temporizador no cancela la
peticion nativa ni corre mientras iOS suspende el proceso. Los registros no
distinguen espera continua de red de suspension de callbacks. Los envios de registros
usan el mismo mecanismo con 2 s. Las respuestas tardias no modifican el resultado.

**Lega pide una sola instalacion y mantenimiento remoto, sin copiar diagnosticos.**
Ya instalo el cargador v0.15 y activo `logRemote`. No volver a pedir capturas o
exports como procedimiento habitual. El bloque `google/Logs.gs` no tiene despliegue
real confirmado y los envios observados fallaban; no depender de que Lega edite
Apps Script para habilitar registros.

Se creo y publico un receptor propio con Sites; su recepcion publica ya esta
habilitada, con lectura reservada a la administracion. La escritura
requiere clave derivada del token local; no hay API publica de lectura. Guarda
solo etapas, tiempos, cantidades, codigos y tamanos, hasta 500 corridas. Se verifico
un POST real y su lectura directa mediante las herramientas de administracion de
D1. Se recupero el historial completo de esas corridas del iPhone. El intento
v0.19 de las 19:21 se recupero al ejecutar otra vez, con un timeout de Google
tras 21 min 42 s. Ver `docs/Receptor.md` para identidad,
ubicacion del proyecto, acceso y procedimiento de consulta.

Sintaxis, entrega simulada, fallback de Google que nunca responde, plazos de logs,
SHA-256, limpieza de temporizadores, reintentos, revisiones, privacidad y retencion
verificados. Vista previa de Chromium revisada. El receptor se probo con SQLite
real, se construyo y se desplego correctamente.

**v0.20 prepara una alternativa dentro de la app, sin pegar codigo.** Antes de
consultar calendarios guarda un cargador generico `LGA_LockScreenCal_App.js` en
los documentos locales y de iCloud de Scriptable. Solo se habilita con el receptor
administrado de Lega. Guarda los ajustes en Keychain; el archivo no contiene
tokens, URLs privadas ni eventos. `script_start.count` registra cuantas copias
pudo preparar (0, 1 o 2). No pisa archivos personales sin su marca administrada.
El script guardado descarga las mejoras, valida y cachea el codigo, espera el
PNG y llama al setter nativo exterior y a `Script.complete()` como ultima accion.
Una ejecucion manual muestra la vista previa; el parametro `atajo` la omite.
Todoist tambien tiene un plazo logico de 15 s, sujeto a la misma suspension.
Esto NO convierte por codigo una ejecucion en segundo plano en primer plano.
La alternativa abre Scriptable. La ejecucion manual en el telefono ya funciono;
falta validar su llamada desde Atajos y la automatizacion.

Se probaron instalacion sin secretos en archivos, proteccion de archivos
personales, cache offline, descargas invalidas, salida nativa despues del await,
vista previa manual y finalizacion. Una prueba de nube con la fabrica y programa
reales, servicios Google/Todoist/receptor reales y dibujo simulado preparo la
salida en 11.6 s; Google respondio en 7.0 s y Todoist en 0.4 s. Su registro
`foreground-probe-...` se confirmo en D1. No es una prueba de iOS.

**Prueba real v0.20, 12/10 a las 19:43/19:44 locales:** el Atajo existente
volvio a mostrar el error. Su registro `mv5u9946-egyh6vcrvxd` confirma dos copias
preparadas, timeout de Google tras 21.7 s y retorno preparado a los 26.7 s.
El script guardado `mv5ua5fu-vvrcyb6ohwk` respondio Google en 7.4 s, Todoist en
0.6 s, preparo el PNG a los 9.5 s y registro `app_preview` a los 9.8 s. Lega
confirmo que Scriptable mostro la imagen. Esto valida esa corrida manual, no
la recepcion de Atajos ni estabilidad repetida. Los registros se consultaron
directamente en D1, sin pedir diagnosticos al usuario.

## Pendiente

0. **Cambiar y probar la primera accion del Atajo.** El script guardado ya
   esta preparado y mostro la imagen en Scriptable. Buscar Scriptable en Atajos,
   elegir la accion que ejecuta un script guardado (`Run Script` en la documentacion),
   seleccionar `LGA_LockScreenCal_App`, parametro `atajo`, y activar la ejecucion
   dentro de la app (`Run in App`). Estas opciones estan documentadas en
   https://docs.scriptable.app/args/; confirmar su ubicacion si la UI difiere.
   Reemplazar la accion inline y reconectar el `Output` de la nueva accion a
   `Decodificar`. Conservar la accion de fondo. Validar una ejecucion y leer D1.
   No pedir que copie codigo, tokens o logs. Esta alternativa abre Scriptable
   durante la actualizacion; falta comprobar que Atajos reciba y aplique el PNG.
   La captura de las 20:16 confirma Texto con `atajo` antes del Run guardado y
   Run In App activado. Parameter sigue sin conectar: tocarlo abre el selector
   de ARCHIVOS (confirmado por Recientes/Compartido/Explorar), no de variables.
   Las indicaciones de buscar `Texto` alli fueron incorrectas. Apple documenta
   mantener pulsados algunos parametros para sustituirlos por variables:
   https://support.apple.com/es-es/guide/shortcuts/apdd02c2780c/ios.
   Siguiente gesto a comprobar: cerrar Archivos y mantener pulsado Parameter,
   luego seleccionar la salida de Texto desde el menu de variables. No afirmar
   que ese menu ya se vio en este telefono; no pedir otra busqueda de archivos.
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

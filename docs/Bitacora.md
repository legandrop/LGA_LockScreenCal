# Bitácora — dónde estamos

Este archivo es el **estado actual**, no un historial: se reescribe cuando algo
cambia. Última actualización: 10/10/2026.

## Resumen

El script funciona en el iPhone de Lega (probado). **El Atajo está a medio armar**
(ver "Cómo guiarlo"): las tres acciones están puestas y revisadas por captura. Falta
apagar los dos interruptores, ponerle nombre y la primera corrida. Después vienen compartirlo por link, personalizar el suyo y las
automatizaciones.

## Qué está probado en el iPhone y qué no

| Cosa | Estado |
|---|---|
| Scriptable lee los calendarios del iPhone (pide permiso, lo dio) | ✅ Probado |
| Dibujo en WebView + `Device.screenResolution()` + `QuickLook` | ✅ Probado (corriendo el script dentro de Scriptable) |
| Palabras clave en color dentro del título | ✅ Probado |
| `Script.setShortcutOutput(imagen)` | ❌ Falla: "Unsupported shortcut output". Por eso ahora sale **base64** |
| Salida base64 → Atajo la decodifica → fondo | ⏳ Sin probar |
| `loader.js` dentro de "Run Inline Script" (await de primer nivel, `AsyncFunction`) | ⏳ Sin probar |
| El WebView corriendo desde Atajos (fuera de la app, con menos memoria) | ⏳ Sin probar. Si falla, probar la opción "Run In App" de la acción |
| Que el reloj no tape la lista (`topPercent: 33`, `bottomPercent: 13`) | ⏳ Sin probar en el lock screen real |
| Puente de Google (`google/Code.gs`) | ⏳ Nunca probado. Lega usa una cuenta Google Workspace; puede que el admin bloquee "Cualquier usuario" |
| Deduplicar eventos repetidos entre calendarios | ⏳ Escrito, sin probar en el teléfono |

## Lo que se vio en la primera prueba (07/10)

Captura del script corriendo en Scriptable:

- Hoy decía "Nada más por hoy", el jueves no tenía nada y solo aparecían reuniones de
  un proyecto. **Pregunta abierta a Lega:** ¿faltan eventos? Puede que no todos sus
  calendarios de Google estén activados en el iPhone (app Calendario → Calendarios).
  Todavía no contestó.
- El lunes 12/10 aparecía el mismo feriado 4 veces, desde varios calendarios de
  feriados ("Day of Respect for Cultural Diversity", "Día de la Raza" ×2, "Día de los
  Pueblos Indígenas"). La deduplicación saca los de título idéntico; los otros se
  sacan con `excludeCalendars`. **Pregunta abierta:** los nombres de sus calendarios
  de feriados, para saber cuáles excluir.

## Próximos pasos, en orden

1. **Armar el Atajo** con Lega (ver "Cómo guiarlo" abajo). Tres acciones:
   1. Scriptable → **Run Inline Script** con el contenido de `loader.js` y `MI_CONFIG`
      vacío.
   2. La acción de **Base64**, en modo **decodificar**, con entrada = resultado del script.
   3. La acción de **fondo de pantalla** (identificador interno
      `is.workflow.actions.wallpaper.set`), solo **pantalla bloqueada**, sin vista previa
      y sin recorte inteligente (en el plist: `WFWallpaperShowPreview: false`,
      `WFWallpaperSmartCrop: false`, `WFWallpaperLocation: ["Lock Screen"]`).
   Nombre del Atajo: **Actualizar calendario**.
2. Correrlo, que Lega bloquee el teléfono y mande captura. Ajustar `topPercent` /
   `bottomPercent` según lo que tape el reloj.
3. **Compartir** el Atajo por link de iCloud con `MI_CONFIG` vacío. Poner el link en el
   `README.md`, donde dice `LINK_DEL_ATAJO`.
4. **Recién después**, personalizar el de Lega: `MI_CONFIG` con sus palabras clave (ver
   abajo) y `excludeCalendars` con los feriados que sobran. Se hace después de
   compartir porque el link copia el Atajo tal como está en ese momento.
5. **Automatizaciones** (cada persona hace las suyas; iOS no deja compartirlas): Hora
   del día, diariamente, ejecutar inmediatamente → Actualizar calendario. Varias horas.
   Opcional: al cerrar la app Calendario.
6. Opcional: el puente de Google, si Lega quiere el color de cada evento además del
   color del calendario.

## Cómo guiarlo con el Atajo

Lega está en **iOS 26** (o el que corresponda a octubre de 2026), en castellano.
**Textos confirmados en sus capturas:**

- En el editor del Atajo, al agregar una acción se abre un panel con una barra que dice
  **"Buscar acciones"**, y abajo chips **Scripts · Controles · Dispositivo…**
- Ahí hay que **escribir en la barra** el nombre de lo que se busca. Se confundió: creyó
  que tenía que buscar un botón con ese nombre y escribió "Accio".

- Acción de Base64 ya agregada, se ve así: **"Decodificar [Output] con base64"**
  (bien: "Output" es la salida de la acción de Scriptable).
- La acción de Scriptable (la de código en línea) en su iOS se ve como **"Run with
  [Parameter] ›"** con el ícono `{}`. Al tocar la › se despliega el código (✅ tiene
  el cargador pegado) y abajo "Texts" y "URLs", que no se usan.
- La de fondo quedó: **"Establecer [Codificado con Base64] como [3 fondo de pantalla]
  en [Pantalla bloqueada] ⌄"**, con los interruptores **"Mostrar vista previa"** y
  **"Recortar sujeto"** (hay que apagar los dos). "Codificado con Base64" es el nombre
  de la salida de la acción de Base64 aunque esté en modo decodificar.
- Botones de abajo del editor: barra "Buscar acciones", y deshacer, rehacer, (i),
  compartir y ▶︎ para correr.
- Agregó por error **"Cambiar a [Fondo de pantalla]"**: es "Cambiar entre fondos de
  pantalla" (`posters.switch`), que solo alterna entre fondos ya creados y no pone la
  imagen. Hay que borrarla y usar la que *pone* una imagen de fondo
  (`wallpaper.set`), que en su iOS se llama **"Establecer foto como fondo de
  pantalla"** (confirmado en captura; ícono azul de flor, buscando "fondo").
  Ojo que en la misma búsqueda aparecen acciones de Ink ("Confirmar fondo aplicado",
  "Generar el último fondo"…): no van.

**Sin confirmar** (no inventar, pedir captura): el nombre exacto en castellano de la
acción de Base64, de la de fondo de pantalla y de sus opciones internas. Indicarle la
palabra a buscar ("Scriptable", "Base64", "fondo") y guiarlo con capturas. "Run Inline
Script" está en inglés porque lo define Scriptable, no Apple.

Si armar el Atajo a mano se vuelve muy trabado, la alternativa es generarlo: escribir el
plist del `.shortcut` (los identificadores de acción se pueden sacar de cualquier atajo
compartido, como se hizo con el de Ink) y firmarlo en la Mac de Lega con
`shortcuts sign --mode anyone`. iOS no importa atajos sin firmar.

## Las palabras clave de Lega

Son los códigos de sus proyectos y sus colores de Google Calendar. **No van en este
repo** (es público). Están en su repo privado `legandrop/LGA_Assistant`, archivo
`context/contexto.md`, sección "Colores de proyecto: Todoist y Google Calendar": la
columna Google `colorId` se traduce a hex con la tabla `EVENT_COLORS` de
`google/Code.gs`. Ya se le pasaron armadas en el chat para pegar en su `MI_CONFIG`.

## Ink (la app que Lega usaba)

**Lega desinstaló Ink el 10/10/2026.** Ya no hay conflicto. El fondo negro que había
creado Ink (el tercero de su galería) es el que eligió para que lo pise nuestro Atajo:
en "Establecer foto como fondo de pantalla", el parámetro del fondo abre una galería
con miniaturas de sus lock screens y se marca uno.

Lo de abajo queda como referencia.

Ink hace lo mismo (fondo con el calendario). Lega la tiene instalada y no hay que
pisarla. Se analizó su atajo ("Ink Refresh Lock Screen V2"): usa acciones propias de la
app Ink para generar la imagen y la misma acción de fondo de pantalla de Atajos, con
vista previa y recorte apagados. Las dos apps cambian el fondo actual y gana la última
que corrió: mientras se prueba, Lega tiene que desactivar (no borrar) la automatización
de Ink si la tiene, o no abrir la app Ink.

## Decisiones tomadas (no re-litigar)

- **Fondo de pantalla y no widget:** los widgets del lock screen se ven en blanco y negro
  (modo "vibrant"). Es lo mismo que hace Ink.
- **Scriptable + Atajos y no app nativa:** una app propia necesita Mac/Xcode y, sin
  cuenta de developer paga, vence cada 7 días.
- **Dibujo con canvas en WebView** y no con `DrawContext` de Scriptable: canvas tiene
  `measureText` (para cortar títulos con "…") y el mismo código se prueba en la compu.
- **Salida en base64:** Scriptable no puede pasarle una imagen a Atajos.
- **Repo público + cargador:** cada mejora llega sola a todos sin reinstalar el Atajo.
  Lega lo aprobó el 07/10. El historial se reescribió a un único commit antes de
  publicarlo, para sacar datos personales de versiones viejas.
- **Fondo negro** y mostrar **desde hoy hasta donde entre** (pedido de Lega). Los días
  sin eventos no ocupan lugar.
- **Palabras clave:** distinguen mayúsculas y solo palabras enteras ("VA" sí, "va" no).
  Los colores oscuros se aclaran en el texto para que se lean sobre negro; las barras
  usan el color tal cual.

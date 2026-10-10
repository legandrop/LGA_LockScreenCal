# LockScreenCal

Tu calendario y tus tareas de los próximos días en el lock screen del iPhone, con
colores y fondo negro. No es una app del App Store: es un **Atajo** de iOS más la
app gratis [Scriptable](https://apps.apple.com/app/scriptable/id1405459188), que
dibuja el fondo de pantalla con tus eventos.

<img src="docs/preview.png" width="300" alt="Vista previa">

(Datos de ejemplo. El reloj y los botones los pone el iPhone.)

- Muestra hoy, mañana y los días que sigan, **hasta donde entre**. Los días sin
  eventos no ocupan lugar.
- Cada evento es una caja de su color, con el texto en negro o blanco según qué se
  lea mejor. Las tareas llevan un circulito adelante, como en Todoist.
- Las palabras que elijas (por ejemplo, nombres de proyectos) salen en negrita.
- Todo corre en tu teléfono. Lo único que sale a internet es lo opcional: el puente
  con tu propia cuenta de Google y la API de Todoist.
- Se actualiza solo: cada mejora del código llega sin reinstalar nada.

**¿Por qué un fondo y no un widget?** En el lock screen, iOS muestra los widgets en
blanco y negro. La única forma de tener colores es el fondo de pantalla (lo mismo
hacen apps como Ink).

---

## Instalar

Los nombres de botones de esta guía son los de un iPhone en castellano con iOS 26.
Si en tu versión algo se llama distinto, buscá la palabra que se indica.

### 1. Lo previo

1. Instalá **[Scriptable](https://apps.apple.com/app/scriptable/id1405459188)** y abrila una vez.
2. Si usás Google Calendar, la cuenta tiene que estar agregada en el iPhone: en
   **Ajustes**, buscá **Cuentas** con la lupa y agregá tu cuenta de Google con
   **Calendarios** prendido.
3. Creá un lock screen negro para el calendario: mantené apretado el lock screen →
   **+** → **Color** → negro. (Si ya tenés uno negro, sirve ese.)

### 2. El Atajo

**Con link (lo más fácil):** abrí **LINK_DEL_ATAJO** → **Agregar atajo**. Después
seguí desde el punto 4 de abajo ("Elegir el fondo").

**A mano (si no tenés el link):** en la app **Atajos** → pestaña **Atajos** → **+**.
Cada acción se agrega escribiendo en la barra **Buscar acciones**:

1. Escribí **Scriptable** y elegí **Run Inline Script**. En el atajo se ve como
   **"Run with Parameter"**. Tocá la flechita **›**, borrá el código de ejemplo y
   pegá todo el contenido de [`loader.js`](loader.js).
2. Escribí **Base64** y agregá la acción. Tocá la palabra **Codificar** y cambiala a
   **Decodificar**. Tiene que quedar **"Decodificar Output con base64"**.
3. Escribí **fondo** y elegí **Establecer foto como fondo de pantalla** (ícono azul
   de flor). **No** "Cambiar entre fondos de pantalla", que solo alterna fondos.
   Tiene que quedar **"Establecer Codificado con Base64 como … en Pantalla
   bloqueada"**. Si dice "Pantalla bloqueada y Pantalla de inicio", tocalo y dejá
   solo **Pantalla bloqueada**.
4. **Elegir el fondo:** en esa misma acción, tocá el fondo (dice algo como
   "3 fondo de pantalla") y marcá el lock screen negro del paso 1.3. Ese es el que
   el Atajo va a ir pisando.
5. Tocá la flechita **⌄** de esa acción y **apagá "Mostrar vista previa" y
   "Recortar sujeto"**.
6. En la primera acción ("Run with Parameter"), tocá la **›**, bajá hasta debajo de
   "Texts" y "URLs" y **apagá "Mostrar al ejecutar"**. Si no, cada vez que corre
   aparece un cartel con un ✓ y un botón "Listo".
7. Ponele un nombre arriba (ej. **Actualizar calendario**).

### 3. Probar

1. Tocá **▶︎** (abajo a la derecha del editor). La primera vez pide permisos
   (calendario, internet, fondo de pantalla): aceptá todo, y si ofrece "Permitir
   siempre", elegí ese.
2. Bloqueá el teléfono. Si ves otro fondo, mantené apretado el lock screen y elegí el
   negro: el Atajo pinta **el fondo elegido en el paso 4**, no el que esté activo.

Arriba a la derecha del calendario dice `act. HH:MM`: la hora de la última
actualización.

### 4. Que se actualice solo

iOS no deja compartir automatizaciones: cada uno las arma una vez. En **Atajos** →
pestaña **Automatización** → **+**:

- **Por horario:** elegí la hora (ej. 7:00) y que se repita **diariamente**. En
  **Automatización** elegí **Ejecutar de inmediato** y apagá **Notificar al
  ejecutar**. En "Hacer", tu Atajo. Repetilo para otras horas (iOS no tiene "cada
  hora").
- **Al usar el teléfono:** iOS no tiene disparador de desbloqueo. Lo más parecido es
  la opción **App**: marcá varias apps que uses seguido (WhatsApp, mail, Calendario)
  y que se dispare cuando **se cierran**. Mismo "Ejecutar de inmediato" sin
  notificación. Con 3 o 4 apps alcanza; cada corrida tarda unos segundos y gasta un
  poco de batería.

---

## Ajustes

Todo se configura en el bloque `MI_CONFIG`, al principio del código de la primera
acción del Atajo. Lo que no pongas usa el valor por defecto. Ejemplo:

```js
const MI_CONFIG = {
  onlyCalendars: ["Trabajo", "Feriados Argentina"],
  keywords: { ALFA: "#8E24AA", BETA: "#F6BF26" },
};
```

| Opción | Para qué |
|---|---|
| `onlyCalendars` | Solo estos calendarios, con el nombre tal cual aparece en la app Calendario. **Recomendado**: sin esto aparecen todos, incluidos los que tengas destildados (feriados de otros países, sugerencias de Siri…) |
| `excludeCalendars` | Calendarios a ignorar |
| `keywords` | Palabras que salen en negrita en los títulos (y con su color, en el estilo de barrita). Distingue mayúsculas y solo toma palabras enteras ("VA" sí, "va" no). Una tarea de Todoist con una etiqueta que esté acá toma ese color |
| `maxDays` | Hasta cuántos días adelante mirar (se dibuja lo que entre). Por defecto 14 |
| `startInDays` | Arrancar N días después de hoy, para probar cómo se ve otra semana. **Volver a sacarlo** después |
| `topPercent` / `bottomPercent` | Espacio libre arriba (reloj, widgets) y abajo (linterna, cámara), en % del alto. Por defecto 33 y 13 |
| `eventStyle` | `"fill"` (por defecto): cada evento como caja de su color. `"bar"`: barrita de color a la izquierda |
| `background`, `textColor`, `mutedColor` | Colores |
| `showUpdated` | Mostrar `act. HH:MM` |
| `googleUrl` | Color de cada evento de Google (ver abajo) |
| `todoistToken` | Suma las tareas de Todoist (ver abajo) |
| `todoistOnlyMine` | Solo tus tareas o las sin asignar. Por defecto `true` |

Si el mismo evento viene de dos calendarios, sale una sola vez.

## Tareas de Todoist (opcional)

Suma tus tareas con fecha **de hoy en adelante** (las vencidas no), con un circulito
adelante. Las que no tienen hora van arriba de cada día. Color: el de la primera
etiqueta que esté en `keywords`; si no, el del proyecto de Todoist.

Agregá tu token en `MI_CONFIG`. Está en Todoist, en la configuración, sección de
integraciones para desarrolladores ("token de API"):

```js
todoistToken: "tu-token",
```

El token da acceso total a tu cuenta de Todoist: **no compartas el Atajo con el
token puesto**.

**Si usás Akiflow:** cuando le reservás horario a una tarea de Todoist, Akiflow crea
un evento con el mismo nombre en tu Google Calendar. El fondo lo detecta (mismo día y
mismo nombre) y muestra solo la tarea.

## Colores de Google por evento (opcional)

El iPhone sabe el color de cada **calendario**, pero no el color que le ponés a cada
**evento** en Google Calendar. Para traerlo hay un puente chiquito que corre en tu
propia cuenta de Google (Google Apps Script, gratis). Conviene armarlo desde la compu:

1. Entrá a <https://script.google.com> con la cuenta del calendario y creá un
   proyecto nuevo.
2. Borrá lo que hay y pegá [`google/Code.gs`](google/Code.gs).
3. Cambiá `TOKEN` por algo largo y al azar: es la "contraseña" de la URL.
4. En la configuración del proyecto (engranaje), revisá que la zona horaria sea la tuya.
5. **Implementar → Nueva implementación** → tipo **Aplicación web**. Ejecutar como:
   **vos**. Quién tiene acceso: **Cualquier usuario**. Aceptá los permisos de
   Calendar (si dice que la app "no está verificada", es normal: la app sos vos).
6. Copiá la URL que termina en `/exec` y agregala en `MI_CONFIG` con tu token:
   ```js
   googleUrl: "https://script.google.com/macros/s/XXXX/exec?token=TU_TOKEN",
   ```

Con el puente, de Google salen los calendarios que Google conoce (con el color de
cada evento) y del iPhone el resto (por ejemplo, los cumpleaños de los contactos).
`onlyCalendars` filtra las dos fuentes igual.

Si en el paso 5 no aparece "Cualquier usuario", tu cuenta es de una empresa
(Google Workspace) que lo tiene bloqueado: se habilita en la consola de admin.

---

## Si algo no anda

| Qué pasa | Qué hacer |
|---|---|
| El lock screen muestra otro fondo | El Atajo pinta el fondo elegido en la acción, no el activo. Mantené apretado el lock screen y elegí ese |
| Aparece un cartel con ✓ y "Listo" cada vez que corre | Apagá **"Mostrar al ejecutar"** en la acción "Run with Parameter" (debajo de "Texts" y "URLs") |
| "Script completed without presenting UI… or outputting a value" | El script se cortó antes de terminar. Volvé a correrlo en unos minutos. Si sigue, avisá al que lo mantiene |
| El fondo sale negro con un error en rojo | Es el error real, escrito para poder leerlo: mandale una captura al que lo mantiene |
| Arriba dice `sin Google` o `sin Todoist` | No pudo conectarse. Revisá la URL o el token en `MI_CONFIG`. El resto del fondo sale igual |
| Faltan eventos | Revisá que el calendario esté en el iPhone (app Calendario → Calendarios) y que su nombre esté en `onlyCalendars` |
| Sobran eventos (feriados de otros países, etc.) | Poné `onlyCalendars` con solo los que querés |
| Una tarea sale dos veces | Revisá que el evento de Akiflow y la tarea tengan el mismo nombre |
| El reloj o los widgets tapan la lista | Subí `topPercent` (ej. 36) |
| Cambié algo y no se ve | GitHub puede tardar unos 5 minutos en entregar la versión nueva |

---

## Pasárselo a otra persona

1. **Una copia limpia, sin tus claves:** en **Atajos**, mantené apretado tu Atajo →
   **Duplicar**. En la copia, reemplazá todo el bloque `MI_CONFIG` por
   `const MI_CONFIG = {};` (así no viajan tu URL de Google ni tu token de Todoist).
2. **El link:** mantené apretada la copia → **Compartir** → **Copiar enlace de
   iCloud**. El link es una foto del Atajo en ese momento.
3. La otra persona sigue esta guía. Con el link se saltea el armado, pero igual tiene
   que **elegir su fondo** (paso 4), **apagar "Mostrar al ejecutar"** si hiciera falta
   y armar **sus automatizaciones**.
4. Sin tocar nada, ve **todos** los calendarios de su iPhone, cada uno con su color.
   Lo demás (filtrar calendarios, palabras clave, Google, Todoist) lo agrega en su
   `MI_CONFIG`.

---

## Cómo está hecho

| Archivo | Qué es |
|---|---|
| `LockScreenCal.js` | El script: lee calendarios del iPhone, el puente de Google y Todoist; dibuja la imagen en un `<canvas>` dentro de un WebView; se la pasa a Atajos en base64 |
| `loader.js` | Lo que va adentro del Atajo: baja `LockScreenCal.js` de este repo y lo corre con tu `MI_CONFIG`. Sin internet, usa la última copia |
| `google/Code.gs` | El puente opcional con Google Calendar |
| `tools/preview.cjs` | Vista previa en la compu, con datos de ejemplo |
| `docs/Bitacora.md` | Estado del proyecto, decisiones tomadas y problemas conocidos |
| `CLAUDE.md` | Instrucciones para agentes de IA que trabajen en el repo |

Lo que se sube a `main` les llega a todos los que tienen el Atajo en la próxima
corrida: un error rompe el fondo de todos. Antes de subir:

```sh
node --input-type=module --check < LockScreenCal.js
npm i playwright && npx playwright install chromium
node tools/preview.cjs          # -> preview/preview.png
```

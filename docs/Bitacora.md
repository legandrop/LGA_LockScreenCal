# Bitácora — estado actual

Actualizada el 12/10/2026. Versión del programa: **v0.24**. Esta guía registra
el estado comprobado y lo pendiente; no da por validado iOS a partir de pruebas
simuladas. Para el usuario: [README](../README.md). Para otro iPhone:
[Compartir](Compartir.md). Para el Atajo actual: [Instalación administrada](Instalacion-administrada.md).

## Qué funciona y qué falta confirmar

- Lega confirmó v0.22 funcionando sin abrir Scriptable, con colores individuales
  de Google y tareas/checks de Todoist. La corrida de las 21:15:02 preparó el PNG
  en 3.3 s, con 21 eventos de Google y 2 tareas; el snapshot tardó 2.6 s.
- v0.23 agregó una marca cooperativa para no multiplicar descargas en ráfagas.
  El 12/10 a las 21:31:25 preparó 280288 caracteres en 2.8 s. Siete segundos
  después reutilizó una copia de 105128 caracteres; Atajos falló en Base64.
  Esa copia debería conservar el tamaño. No hubo consultas de red en la repetición.
  Es una anomalía del almacenamiento/lectura, sin causa interna de iOS confirmada.
- v0.24 exige la longitud guardada en output.json para reutilizar output.txt:
  rechaza lecturas parciales con prefijo PNG y copias antiguas sin ese campo.
- v0.24 permite salida como archivo PNG de iCloud con parámetro `archivo`.
  El cargador escribe Data comprimida en un archivo por corrida y pasa su ruta
  al setter nativo de Scriptable. No materializa una imagen nativa para entregarla.
  Solo limpia sus PNG de más de una hora; no envía imágenes al receptor.
- **Pendiente: confirmación explícita de esa entrega v0.24 en el iPhone y del
  uso repetido habitual.** No se recibió todavía una confirmación explícita de
  esa migración. Los logs de salida tampoco
  confirman por sí solos que Atajos aplicó el fondo.

## Implementación del teléfono

Atajo `LGA_ScreenLockCal`; script guardado `LGA_LockScreenCal_App`.
La última estructura observada tenía Texto `atajo` → Run con esa variable →
Decodificar el Output de Run → Establecer el fondo elegido en Pantalla bloqueada.
La estructura nueva indicada para v0.24 es Texto `archivo` → Run → Establecer
usando directamente Output de Run. Ver [los pasos](Instalacion-administrada.md).

Run In App, Mostrar al ejecutar y Always Run in App deben quedar apagados.
La automatización debe ser silenciosa: abrir Scriptable o exigir el cartel
Listo no satisface el objetivo. El fondo elegido pertenece a la galería del
usuario; no copiar su número a una instalación nueva. Hay automatizaciones
por horario y al cerrar apps; se crean en cada teléfono.

Los ajustes originales venían de MI_CONFIG del cargador inline; ahora están
localmente en Keychain, clave `LGA_LockScreenCal.managed.config.v1`. Incluyen
cuentas, filtros, colores y receptor. No publicar esos valores ni los títulos
reales en este repo. El archivo genérico guardado no contiene secretos.
No hay pantalla de configuración remota ni alta automática de amigos.

## Datos preparados y registros

Lega autorizó expresamente preparar Google/Todoist en el servicio protegido.
El servidor conserva una copia por fuente en D1 `calendar_cache`; los secretos
están en Sites. La lectura usa una clave distinta de la escritura de logs.
Los calendarios del iPhone y el dibujo siguen locales. Cliente: 3.5 s de plazo
lógico y 4 s nativos para pedir el snapshot; combina fuentes parciales con la
copia local vigente y no pisa una nueva con una antigua. Las copias vencen a
la hora, incluso después de esperar una respuesta.

GET /api/calendar devuelve la copia disponible sin esperar a las APIs externas
e inicia refresco en waitUntil si pasaron 60 s. No hay cron. Después de
inactividad, la primera solicitud puede usar calendarios nativos mientras se
preparan los datos; la siguiente recibe la copia nueva. El servicio actual es
**de una sola cuenta**, sin separación por usuario. Tanto prepareManagedApp
como usesManagedData reconocen su URL concreta. Replicar ese servicio para un
amigo requiere aprovisionamiento separado y adaptar esa selección.

El receptor conserva hasta 500 corridas técnicas y el teléfono hasta 100.
Envía lotes de cinco, hasta 50 etapas por corrida, con revisión para evitar
que una copia antigua pise una nueva. Las siguientes ejecuciones recuperan
pendientes. Los logs no incluyen títulos, tokens, imágenes ni mensajes crudos
de excepciones. Consultar directamente D1 `phone_runs`, siguiendo
[Receptor](Receptor.md); no pedir exports como procedimiento habitual ni
leer `calendar_cache` para diagnosticar tiempos.

## Actualizaciones y protección contra ráfagas

El cargador guardado guarda código validado durante cinco minutos. Si hay copia,
el refresco tiene plazo lógico de 1 s y usa la copia ante fallo. Una marca de
cinco segundos anterior al primer await evita descargas repetidas; solo su dueño
la libera. El programa prepara el cargador nuevo en disco: esa lógica exterior
nueva se usa en la siguiente invocación. Por eso la migración a `archivo` empieza
con una ejecución usando las acciones anteriores, tras vencer la caché.

PNG: reutilización durante 60 s, marca activa de 120 s y coincidencia de ajustes.
Durante otra actualización activa se permite una imagen de versión anterior
compatible; v0.24 exige también la longitud completa. Las marcas son cooperativas,
no exclusiones atómicas entre procesos de iOS. No impiden que Atajos ejecute
su acción de fondo en cada disparo.

Las mejoras de código llegan desde main; las acciones, permisos y automatizaciones
no se editan desde GitHub. No volver a pedir código nuevo para cambios dentro
del programa/cargador administrado. El cargador inline publicado queda como vía
independiente para amigos y usa base64; no incluye el servicio preparado.

## Diagnóstico que motivó esta implementación

Las corridas inline anteriores esperaron Google durante 45 min 31 s y 61 min 4 s;
una de ellas esperó Todoist otros 87.7 s antes de preparar un PNG cuando Atajos
ya había fallado. Timer/Promise.race no ejecutan callbacks si iOS suspende el
proceso; Request.timeoutInterval limita inactividad, no el tiempo total.
No inferir memoria, suspensión o red como causa exacta sin evidencia.

v0.21 tuvo un plazo de snapshot de 1.5 s: venció en el iPhone y dibujó solo
calendarios nativos, perdiendo colores por evento y tareas. v0.22 lo amplió a
3.5 s y conservó fuentes locales recientes. No se cambió el renderer para
resolver esa regresión. v0.24 busca omitir la conversión de Atajos usando la
salida por ruta de iCloud documentada por Scriptable.

## Verificación

Sintaxis, cargador inline, cargador guardado, logs, plazos, SHA-256, datos preparados,
colores/task, fallos de escritura, limpieza y vista previa de Chromium verificados.
check-bursts ejecuta cargador y programa reales con 18 llamadas en cada modo:
una consulta/dibujo por ventana, solapamientos, archivos distintos en modo PNG y
respeto del propietario. APIs de iOS simuladas: no demuestran el puente nativo.

Servidor construido, pruebas con SQLite real y despliegue confirmado; recepción
autenticada real y lectura administrativa verificadas. Operación y fuente del
servicio están en Receptor.md. El addon google/Logs.gs no tiene despliegue real
confirmado y no es requisito del receptor actual.

## Textos de iOS confirmados

- Barra Buscar acciones; Run with Parameter para la acción inline.
- Run LGA_LockScreenCal_App with Texto para la acción guardada.
- Run In App y Mostrar al ejecutar en Run; Always Run in App en Scriptable.
- Tocar Parameter abre Archivos. Mantenerlo pulsado permite Seleccionar variable
  y elegir la salida de Texto. No buscar variables en Archivos.
- Decodificar Output con base64; Codificado con Base64 es el nombre de su salida.
- Establecer foto como fondo de pantalla, Pantalla bloqueada, Mostrar vista previa
  y Recortar sujeto. Cambiar entre fondos de pantalla solo alterna fondos.
- Una referencia roja tras borrar una acción debe reconectarse al Output nuevo.
- Ejecutar de inmediato y Notificar al ejecutar para las automatizaciones.

## Decisiones vigentes y próximos pasos

Fondo negro con cajas de color, canvas en WebView, tareas desde hoy sin vencidas,
palabras clave sensibles a mayúsculas y palabras enteras. Duplicados de
Akiflow/Todoist se resuelven prefiriendo la tarea. Datos públicos de ejemplo
ALFA/BETA; nunca publicar cuentas, clientes, tokens ni eventos reales.

1. Confirmar la migración v0.24 y observar repeticiones desde los registros remotos.
2. Probar la instalación independiente siguiendo README con otra persona.
3. Si se quiere ofrecer la implementación administrada completa a amigos,
   preparar aislamiento/provisión; no compartir claves de la cuenta existente.
4. Un enlace de Atajo limpio sigue pendiente: no hay archivo .shortcut ni enlace
   publicado. La guía Compartir explica cómo prepararlo sin duplicar la instalación
   administrada como si fuera transportable.

# Registros y mantenimiento remoto

Cada corrida conserva un ID, version, etapas, tiempos, cantidades, tamanos del PNG
y codigos de error. No incluye titulos, nombres de calendarios, opciones, tokens,
imagenes ni mensajes crudos de excepciones. Hay hasta 100 corridas locales y
50 etapas por corrida. Una corrida posterior recupera los registros pendientes
si iOS termino el proceso antes del envio.

## Receptor administrado

Desde v0.16 `logCollector` permite enviar los registros a un servicio separado
del puente de calendario de Google. El receptor conserva hasta 500 corridas; el
asistente las consulta directamente con herramientas de Sites. No se necesita
instalar un visor ni copiar resultados desde el telefono.

El receptor esta desplegado y probado con registros sinteticos. La recepcion ya
esta accesible sin sesion, exige clave y la lectura sigue privada. Se recibio una
corrida real v0.18 y luego se recupero su estado final, junto a intentos anteriores.
Esos registros muestran esperas de Google de decenas de minutos, aun con el
temporizador de 12 s. Ver [Receptor.md](Receptor.md).

Con el acceso listo, el usuario conserva su MI_CONFIG y agrega una sola opcion:

```js
logRemote: true,
logCollector: "https://lga-lockscreencal-logs.swoony-degu-6417.chatgpt.site/api/runs",
```

Si `logRemote` ya esta presente, no duplicarlo. El cargador v0.15 ya instalado baja
la funcion de telemetria de `LockScreenCal.js` en cada corrida. No hace falta volver
a reemplazar el cargador ni actualizar Apps Script para esta via.

v0.17 asigna todos los encabezados de la peticion juntos para que Scriptable
transmita Authorization; el cargador ya instalado recibe esa correccion.

La clave de escritura se deriva localmente con SHA-256 y un prefijo propio del
servicio a partir del token de Google. El receptor recibe esa clave derivada,
nunca el token original. Solo acepta el usuario configurado en el gestor de
secretos; no es un servicio abierto para otros usuarios del repo. El token de
Todoist tampoco se transmite. La clave de escritura no concede lectura.

Los lotes tienen hasta cinco corridas. Desde v0.18 se prioriza la corrida actual,
se intenta enviar su inicio antes de consultar calendarios, un punto antes del
WebView y el estado final antes del retorno. Cada lote tambien puede recuperar
pendientes anteriores. Desde v0.19 se recuperan primero los pendientes mas
recientes, para consultar el ultimo intento sin esperar a vaciar la cola antigua.
El intento actual tambien se envia desde memoria si no
pudo guardarse localmente. El envio espera hasta 2 s con
Timer, ademas del timeout de inactividad de Request. Si falla, se marca pendiente
y se reintenta. El temporizador no cancela la red nativa y no funciona mientras
iOS suspende el proceso. Sin conexion o al superar la retencion pueden perderse
registros. Una conexion abierta no debe prolongar voluntariamente la espera por
logs durante minutos.

## Compatibilidad con Google

Sin `logCollector` se conserva el envio v0.15 al puente propio. Esa via requiere
el addon [google/Logs.gs](../google/Logs.gs) desplegado junto al puente y conserva
50 corridas remotas. No forma parte de la nueva instalacion de Lega.

## Script guardado y ejecucion en segundo plano

Desde v0.20 el programa prepara automaticamente `LGA_LockScreenCal_App` cuando
se usa el receptor administrado. El archivo guardado contiene un cargador
generico; la configuracion queda en Keychain del dispositivo. No hace falta
volver a copiar tokens ni codigo. Se escriben los documentos locales y de
iCloud disponibles, sin pisar un archivo personal sin la marca administrada.
La cantidad preparada aparece como `script_start.count` (0, 1 o 2).

El cargador guardado baja las mejoras y conserva una copia validada para fallos
de red. Una ejecucion manual desde Scriptable muestra el PNG; con parametro
`atajo` entrega base64 sin abrir la vista previa. El setter nativo exterior se
invoca despues de esperar todo el programa y `Script.complete()` es la ultima
accion. Ejecutarlo dentro de la app requiere abrir Scriptable; el script no
puede cambiar por si solo el modo de ejecucion de la accion de Atajos.
La prueba manual en el iPhone del 12/10 mostro la imagen y envio sus registros.
Lega luego confirmo que el Atajo funciono sin abrir la app, pero apagar tambien
Mostrar al ejecutar volvio a fallar. La ejecucion silenciosa sigue pendiente.

Para conectar la alternativa, buscar Scriptable en Atajos y elegir la accion
para ejecutar un script guardado, `Run Script`. Seleccionar `LGA_LockScreenCal_App`,
parametro `atajo`, y dejar `Run In App` APAGADO para funcionar sin abrir la app.
`Always Run in App` en los ajustes del script tambien debe estar apagado.
El modo activado se uso solo para diagnosticar la ejecucion en primer plano.
Los parametros de entrada estan
documentados en [Scriptable](https://docs.scriptable.app/args/); su ubicacion puede
variar en la interfaz. Esa accion reemplaza la inline; `Decodificar` debe tomar
el `Output` de la nueva accion. La accion de establecer fondo conserva sus ajustes.

En la interfaz observada, tocar `Parameter` abre el selector de archivos.
Para pasar texto estatico se agrega una accion Texto con `atajo` antes de Run
y se conecta su salida como variable. No se busca esa variable en Archivos.
[Apple documenta](https://support.apple.com/es-es/guide/shortcuts/apdd02c2780c/ios)
que algunos parametros requieren mantener pulsado para sustituirlos por variables;
ese gesto ya se confirmo en este telefono y permitio conectar la variable Texto.

## Datos preparados fuera del telefono (v0.21)

Lega eligio esta opcion para evitar las consultas lentas en la corrida silenciosa.
El servicio conserva una copia privada por fuente en `calendar_cache`. Google y
Todoist se consultan con secretos configurados en Sites, sin subir tokens a fuente.
Se conservan titulos, fechas y campos necesarios para filtrar/colorear, sin
descripciones, correos ni historial de snapshots. Los calendarios nativos siguen
en el dispositivo. Esto es distinto del historial tecnico `phone_runs`, que
mantiene la whitelist original y no contiene eventos.

GET `/api/calendar` exige una clave derivada con el prefijo
`LockScreenCal.calendar.v1:`; la clave de logs no concede acceso a esos datos.
La respuesta no espera a Google/Todoist. Si pasaron 60 s inicia actualizacion
en el servidor con waitUntil; la siguiente corrida recibe el resultado. No hay
actualizacion programada mientras no se solicita el endpoint. Se rechazan copias
con mas de una hora y se conserva la ultima buena ante un fallo. Tras inactividad
la primera corrida puede usar los calendarios del iPhone mientras se prepara la
copia nueva. El telefono guarda tambien una copia local reciente para fallos de red.

El modo administrado omite envios de logs antes de preparar el PNG; el cargador
los envia despues del setter nativo. Se recuperan pendientes en la proxima corrida.
El codigo se reutiliza por cinco minutos y una descarga lenta usa la copia valida.
Los demas usuarios, sin el receptor administrado, mantienen el funcionamiento
anterior; `managedData: false` permite desactivar esta via.

v0.21 corto una consulta real del iPhone a los 1.5 s y dibujo solo calendarios
nativos: faltaron los colores individuales de Google y las tareas de Todoist.
v0.22 espera hasta 3.5 s por el snapshot, sin volver a consultar esas APIs en
el telefono. Combina respuestas parciales con las fuentes locales recientes;
una copia mas vieja no pisa una nueva. El vencimiento se revalida al usar datos.
Las pruebas incluyen una respuesta de 2 s y la conservacion de colores y
marca task que dibuja el checkbox. Lega confirmo que v0.22 recupero ambos en una
ejecucion silenciosa; el registro recibio 21 eventos de Google y 2 tareas.

## Rafagas de automatizaciones

Una actualizacion completada se reutiliza durante 60 s; si hay otra en curso
se devuelve la ultima imagen compatible. La marca activa vence a los 120 s.
Desde v0.23 se permite devolver un PNG anterior durante una actualizacion de
version solo si los ajustes coinciden. Una marca separada protege el refresco
de codigo por cinco segundos: otras llegadas usan su copia; la marca vence si
el propietario termina abruptamente. No incluye datos personales.

`reuse_recent`, `reuse_active` y `download_cache` permiten verificar las rafagas
directamente en el historial. `tools/check-bursts.cjs` ejecuta cargador y programa
completos con almacenamiento compartido. Las marcas no son exclusiones atomicas
entre procesos reales. Atajos sigue ejecutando sus acciones de Base64 y fondo
con el PNG devuelto; no hace falta agregar controles manuales en la interfaz.

## Alcance del diagnostico

`loader_return_prepared` confirma que el cargador preparo un PNG base64 valido.
No confirma que Atajos lo recibio, decodifico ni puso como fondo. Un error posterior
en Base64 o en la accion de fondo ocurre fuera de Scriptable. Tampoco un registro
interrumpido demuestra por si solo un corte por memoria o por iOS.

El diagnostico local [tools/diagnostico.js](../tools/diagnostico.js) sigue disponible
para casos excepcionales; no es el procedimiento habitual del mantenimiento.

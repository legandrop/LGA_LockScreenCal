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
esta accesible sin sesion, exige clave y la lectura sigue privada. Falta confirmar
la primera corrida real del telefono. Ver [Receptor.md](Receptor.md).

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

Los lotes tienen hasta cinco corridas. Se recuperan pendientes al comenzar y se
intenta enviar el estado final antes del retorno. El envio espera hasta 2 s con
Timer, ademas del timeout de inactividad de Request. Si falla, se marca pendiente
y se reintenta. El temporizador no cancela la red nativa y no funciona mientras
iOS suspende el proceso. Sin conexion o al superar la retencion pueden perderse
registros. Una conexion abierta no debe prolongar voluntariamente la espera por
logs durante minutos.

## Compatibilidad con Google

Sin `logCollector` se conserva el envio v0.15 al puente propio. Esa via requiere
el addon [google/Logs.gs](../google/Logs.gs) desplegado junto al puente y conserva
50 corridas remotas. No forma parte de la nueva instalacion de Lega.

## Alcance del diagnostico

`loader_return_prepared` confirma que el cargador preparo un PNG base64 valido.
No confirma que Atajos lo recibio, decodifico ni puso como fondo. Un error posterior
en Base64 o en la accion de fondo ocurre fuera de Scriptable. Tampoco un registro
interrumpido demuestra por si solo un corte por memoria o por iOS.

El diagnostico local [tools/diagnostico.js](../tools/diagnostico.js) sigue disponible
para casos excepcionales; no es el procedimiento habitual del mantenimiento.

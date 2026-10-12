# Historial local y logs en Google

Desde v0.15 cada ejecución guarda su propio archivo en Scriptable: fecha, ID,
versión, etapas, tiempos, cantidad de eventos y tareas, tamaño del PNG y códigos
de error técnicos. El historial local conserva hasta 100 corridas (puede superar
el límite mientras otras corridas recientes terminan); Google conserva las
últimas 50. Cada corrida conserva sus últimas 50 etapas.

Los registros no incluyen títulos, nombres de calendarios, tokens, URL del puente,
contenido del PNG ni mensajes crudos de excepciones. Estos últimos podrían
contener datos o claves, así que se registran códigos como `TypeError` o `HTTP_503`
junto a la etapa. La URL con token se conserva únicamente en el contenedor local
de Scriptable para consultar el puente sin volver a escribirla.

## Activar en el puente existente

1. Abrí tu proyecto de calendario en <https://script.google.com>.
2. Copiá [`google/Logs.gs`](../google/Logs.gs) y **pegalo al final del código que ya
   tenés**, después de la última llave. El bloque usa tu `TOKEN` y `json_` existentes.
3. Guardá y actualizá la implementación web existente para que ejecute una nueva
   versión con ese código. La URL `/exec` que usa el Atajo debe seguir siendo la
   misma. Guardar el editor no actualiza por sí solo esa implementación.
4. En el `MI_CONFIG` del Atajo agregá:
   ```js
   logRemote: true,
   ```
5. Para registrar también la descarga y el retorno del cargador, reemplazá desde
   `const URL =` hasta el final del código del Atajo con
   [`tools/loader-body.js`](../tools/loader-body.js). Tu bloque `MI_CONFIG` va antes.
6. Ejecutá el Atajo una vez con internet. GitHub puede demorar unos cinco minutos
   en entregar la nueva versión.

No se necesita una planilla ni un token de GitHub. Google guarda los datos en las
propiedades del proyecto; tanto la lectura como la escritura exigen el token del
puente. El bloque no reemplaza `doGet`, así que la consulta de calendarios sigue
usando el código ya instalado. Si tu puente ya tiene un `doPost` propio, revisá
esa función antes de agregar el bloque para evitar duplicarlo.

## Consultar el historial

- **Local:** copiá la versión actualizada de
  [`tools/diagnostico.js`](../tools/diagnostico.js) en un script de Scriptable y
  ejecutalo. Muestra las últimas diez corridas y si Google confirmó cada registro.
- **Google:** copiá [`tools/ver-logs-google.js`](../tools/ver-logs-google.js) en un
  script nuevo de Scriptable y ejecutalo. Lee los registros recibidos mediante
  `POST` con `action: "read_logs"`; la URL y la clave no aparecen en el resultado.
  Ese texto se puede compartir para revisar el fallo.

El envío usa lotes de hasta cinco corridas y tiene un límite de dos segundos por
petición. Se intentan recuperar las pendientes al empezar y enviar el estado
actual antes del retorno del cargador. Un fallo de envío no bloquea la imagen:
queda marcado como pendiente y se reintenta en una corrida posterior. Cuando no
hay internet o se supera la retención, no se garantiza conservar todos los logs.

## Qué confirma cada etapa

`loader_return_prepared` significa que el cargador obtuvo un PNG base64 válido y
está por devolverlo. **No significa que Atajos lo decodificó o puso el fondo.**
Un error posterior en Base64 o en la acción de fondo ocurre fuera de Scriptable y
no puede ser capturado por su `catch`.

Si iOS mata el proceso tampoco puede ejecutarse un `catch` ni el envío final. El
último evento queda localmente y la siguiente corrida intenta subirlo. Una etapa
sin continuación muestra dónde llegó; no prueba por sí sola si el proceso fue
terminado por memoria, tiempo o un fallo del sistema. Las pruebas en la nube
simulan las APIs; falta validar el envío en el puente y el iPhone reales.

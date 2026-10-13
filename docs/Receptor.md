# Receptor de registros

Servicio construido con la habilidad Sites. Proyecto administrado por su propietario:
`appgprj_6acd3bd6e5c48191a2340ed059cf9a90`.

- URL: https://lga-lockscreencal-logs.swoony-degu-6417.chatgpt.site
- Fuente local: `/workspace/sites/lga-lockscreencal-logs`.
- Fuente remota: repositorio gestionado por Sites; recuperar su credencial con
  `sites_get_site` o `sites_create_source_repository_write_credential`.
- Commit inicial desplegado: `3e6c1c3b15d842af9b074f943a9a8132b72116eb`.
- Base D1: binding `DB`, tabla `phone_runs`, migracion de Drizzle aplicada al desplegar.
- Secreto de escritura: `LOG_INGEST_KEY`, almacenado en el gestor de Sites. No
  copiarlo a GitHub, archivos de fuente, bundles, argumentos ni salidas de comandos.
- Desde v0.21: tabla `calendar_cache` y `/api/calendar` para datos preparados,
  con consentimiento expreso de Lega. Secretos `CALENDAR_READ_KEY`,
  `SERVER_GOOGLE_URL`, `SERVER_TODOIST_TOKEN`; la clave de logs sigue sin lectura.
- Fuente desplegada de datos: `ef9e7c6bad77ff72a59569c0edebb6e60eec2b6e`,
  version 2 y revision de entorno 3, deployment
  `appgdep_6acd71e55c14819181ed05e3569b3967`.

## Estado y acceso

Recepcion publica habilitada el 12/10/2026 tras la respuesta afirmativa de Lega
al pedido de activacion. La lectura de D1 sigue reservada a la administracion.
Probado sin bypass de plataforma: envio sin clave y con clave incorrecta devuelve
401; clave valida devuelve 200 y se confirma en D1; GET a la ruta devuelve 405.
Hay registros sinteticos de prueba; las peticiones del telefono llegaron pero
fueron rechazadas inicialmente por una clave incorrecta configurada a partir de
una captura. Se corrigio el secreto en Sites y se redesplego la misma fuente con
revision de entorno 2. El token exacto se obtuvo del cargador compartido por Lega;
no se guarda en esta documentacion ni en fuente. Se confirmo un POST con la clave
corregida. Luego se recibieron corridas reales y se recuperaron sus pendientes.

Las peticiones reales v0.16 seguian devolviendo 401 tras corregir la clave: no
incluian el encabezado Authorization. Se corrigio el cliente v0.17 para asignar
el diccionario completo a `req.headers`, evitando mutar la copia de su getter.
Verificado con prueba de regresion y con la fabrica real enviando un registro
sintetico al receptor real; se confirmo revision 2 y se leyo desde D1. Las
peticiones reales posteriores v0.18/v0.19 tienen autorizacion y devolvieron 200.
El cargador instalado descarga esta mejora automaticamente.

v0.18 agrega envios del inicio actual y del estado previo al WebView, y prioriza
el intento actual sobre una cola de pendientes. La comprobacion posterior encontro una
corrida real v0.18 a las 18:19 locales: marca de inicio aceptada en D1 y cuatro
corridas antiguas recuperadas. Luego se recupero su estado final: Google tuvo
un timeout tras 61 min 4 s, Todoist tras 87.7 s y el PNG se preparo a las 19:21.
La corrida anterior v0.16 tambien espero Google durante 45 min 31 s. Desde v0.19 se
priorizan pendientes recientes para recuperar el ultimo intento antes que la
cola vieja. Un corte antes de ejecutar la fabrica
remota de telemetria queda fuera de su alcance. La corrida real v0.19 de las
19:21 se recupero al ejecutar de nuevo: timeout de Google tras 21 min 42 s.

v0.20 prepara un script generico guardado en Scriptable, luego utilizado
en segundo plano. La ejecucion en primer plano se uso solo para diagnostico. `script_start.count` indica las copias locales/iCloud preparadas;
no transmite sus ajustes, que quedan en Keychain del telefono. La prueba
`foreground-probe-...` de nube verifica Google, Todoist y receptor con dibujo
simulado; no demuestra que el Atajo funcione en iOS.

La prueba real v0.20 del 12/10 a las 19:44 preparo un PNG en 9.5 s y registro
`app_preview`; Lega confirmo la imagen en Scriptable. La corrida inline de las
19:43 tuvo timeout de Google y preparo la salida en 26.7 s, pero Atajos mostro
error. Ambas quedaron en D1. Posteriormente Lega confirmo que la accion guardada
funciono sin abrir Scriptable, tras apagar Run In App en Atajos. Los retornos
recientes de las 20:36 reutilizaron un PNG en 1.2-1.3 s. El intento completo
anterior tuvo timeout de Google y preparo el fondo con fallback del iPhone.
Falta observar estabilidad repetida; D1 no confirma por si solo el fondo aplicado
ni registra explicitamente el modo de ejecucion.

En v0.20 Mostrar al ejecutar apagado volvio a fallar. v0.21 preparo datos fuera
del telefono; v0.22 luego funciono silenciosa con colores y tareas, confirmado
por Lega. v0.23 tuvo otro fallo de Base64 en una repeticion. v0.24 permite
entrega como archivo PNG; su validacion real sigue en Bitacora.md.
Ambas fuentes reales se calentaron con POST autenticado a /api/calendar; los GET
reales devolvieron 200 en 152-322 ms y sin clave devolvieron 401. Un registro
`background-probe-...` prueba la fabrica real con dibujo simulado; no es un iPhone.
No consultar ni imprimir filas de `calendar_cache` para diagnosticar tiempos:
contienen los datos privados. Las consultas habituales siguen en `phone_runs`.

Las peticiones de Python-urllib sin identificacion explicita devolvian 403, error
1010, antes de entrar al Worker. Con User-Agent `LockScreenCal/0.16` llegaron al
receptor correctamente. El cliente de registros se identifica con su version.
Ese bloqueo de la prueba no demuestra la causa del error reportado en Atajos.

## Consultar sin involucrar al usuario

1. `sites_read_database_overview` con el project_id anterior.
2. Usar exactamente los nombres devueltos en `sites_read_database_table_rows`.
3. Leer `payload`: JSON con ID, version, tiempos y etapas. Paginar solo usando
   `model_projection.next_offset`. Correlacionar ID y startedAt con la hora local.
4. Si falla el receptor, consultar `sites_get_site_worker_logs`. No pedir al
   usuario que copie datos salvo que el fallo quede fuera del alcance del registro.

El almacenamiento admite 500 corridas, acepta lotes de hasta cinco y limita el
cuerpo a 45000 bytes. Una revision antigua no pisa una nueva; las confirmaciones
se guardan por revision en el iPhone. Whitelist tanto en cliente como servidor.

## Mantenimiento

Conservar `.openai/hosting.json`, project_id y audiencia. Construir con `npm run
build`; generar migraciones de esquema con `npm run db:generate`. Probar con
`node tools-receiver-test.mjs` (SQLite real). Subir fuente exacta al remoto de
Sites y desplegar una version guardada usando el archivo de build. Las credenciales
se pasan por stdin sin eco; nunca se guardan. La lectura de D1 usa herramientas
nativas autenticadas, independiente del acceso web.

Las mejoras del calendario y de su telemetria se publican en `main` de este repo.
El cargador inline v0.15 las descarga en cada corrida; el guardado reutiliza
codigo por cinco minutos y actualiza su archivo para la siguiente invocacion.
No requieren nuevos pegados para cambios dentro de esos contratos. Las acciones propias de Atajos y permisos de
iOS no se pueden editar directamente desde este servicio.

## Alcance de la cuenta y documentación para compartir

El despliegue actual tiene un juego de claves y una copia por fuente, sin columna
ni autorización por usuario. No ofrece alta de amigos. Compartir las claves
permitiría acceder a los datos de la cuenta aprovisionada; no provisiona otra.
Para una implementación equivalente se necesita un servicio aislado o introducir
separación por usuario, y adaptar el reconocimiento de la URL en el cliente.
Ver [Compartir](Compartir.md) e [Instalación administrada](Instalacion-administrada.md).

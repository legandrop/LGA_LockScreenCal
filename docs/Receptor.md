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

## Estado y acceso

Recepcion publica habilitada el 12/10/2026 tras la respuesta afirmativa de Lega
al pedido de activacion. La lectura de D1 sigue reservada a la administracion.
Probado sin bypass de plataforma: envio sin clave y con clave incorrecta devuelve
401; clave valida devuelve 200 y se confirma en D1; GET a la ruta devuelve 405.
Solo hay registros sinteticos de prueba, no corridas reales del telefono.

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
El cargador v0.15 instalado las descarga; no requiere nuevos pegados para cambios
que quedan dentro de ese contrato. Las acciones propias de Atajos y permisos de
iOS no se pueden editar directamente desde este servicio.

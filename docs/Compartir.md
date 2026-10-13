# Pasárselo a un amigo

El repo se puede compartir: no contiene las credenciales necesarias para entrar
a tus cuentas. Cada persona instala Scriptable y usa sus propios calendarios,
ajustes y fondo de pantalla.

## Qué incluye cada opción

| Opción | Qué recibe la otra persona | Qué tiene que preparar |
|---|---|---|
| Independiente | Calendarios del iPhone y mejoras desde GitHub; Google/Todoist opcionales | Scriptable, el Atajo del README y sus ajustes |
| Administrada, como la implementación actual | Script guardado, PNG en iCloud, Google/Todoist preparados y logs remotos | Cuenta y servicio separados, configuración del teléfono y adaptación del código |

El servicio administrado desplegado **es de una sola cuenta**. No tiene alta de
usuarios ni separa los datos por amigo. Cambiar un token o una URL no convierte
esa implementación en un servicio multiusuario. No compartir sus claves de acceso.

## La instalación independiente, paso a paso

1. Pasale el [README](../README.md#instalar-la-versión-independiente) y el
   [cargador limpio](../loader.js).
2. Que instale Scriptable, abra la app una vez y compruebe que sus calendarios
   aparecen en Calendario del iPhone.
3. Que arme las tres acciones del README: Run Inline Script, Decodificar Base64
   y Establecer fondo. El cargador publicado tiene `MI_CONFIG` vacío.
4. Que elija **su propio fondo** en Establecer; el número del fondo de tu teléfono
   no identifica uno en el suyo.
5. Que ejecute una vez, conceda los permisos necesarios y compruebe la imagen.
6. Que agregue `onlyCalendars` con los nombres que quiere ver. Sin filtro se leen
   todos los calendarios, incluidos los destildados en la app Calendario.
7. Si quiere colores por evento de Google o tareas, que configure **su propio**
   puente de Google y **su propio** token de Todoist siguiendo el README.
8. Que cree sus automatizaciones por horario o al cerrar una app. Las
   automatizaciones personales se preparan en cada iPhone.

Esta vía consulta Google/Todoist desde el teléfono y conserva Base64. No incluye
el servicio preparado ni la entrega por archivo del Atajo administrado; los
problemas de espera/conversión observados motivaron esa otra implementación.
Conviene probar primero manualmente y luego con la automatización elegida.

## Si querés enviar un enlace de Atajo

Todavía no hay un enlace de instalación publicado en el repo ni un archivo
`.shortcut` listo para importar. Se puede crear a partir de un **Atajo
independiente limpio** construido con `loader.js`:

1. Antes de compartir, revisar que `MI_CONFIG` esté vacío y no haya credenciales,
   URLs privadas, filtros personales ni acciones adicionales con datos tuyos.
2. Usar Compartir en Atajos para generar el enlace de iCloud.
3. Enviar también esta guía: la otra persona igual debe instalar Scriptable,
   elegir su fondo, configurar sus cuentas y crear sus automatizaciones.

Un enlace conserva las acciones que tenía el Atajo al compartirlo; las mejoras
del programa se descargan desde GitHub. Un cambio en la estructura de las
acciones puede requerir una modificación manual.

## Por qué no alcanza con copiar el Atajo administrado actual

Run apunta a `LGA_LockScreenCal_App`, un script guardado que no viaja dentro del
Atajo. Los ajustes viven en Keychain del iPhone y tampoco se exportan. El servicio
guarda una copia de Google/Todoist correspondiente a la cuenta aprovisionada.

Para ofrecer la misma implementación a otra persona, un mantenedor debe:

1. Preparar un servicio aislado para sus cuentas, con secretos y almacenamiento
   propios, o implementar separación y autorización por usuario.
2. Adaptar la selección del servicio en el cliente: `prepareManagedApp` y
   `usesManagedData` reconocen la URL administrada actual; no son configurables
   para cualquier despliegue sin un cambio de código.
3. Preparar sus ajustes locales y el script guardado. No copiar el Keychain ni
   las credenciales del teléfono original.
4. Verificar su ruta de datos, logs, archivo PNG y automatización en su iPhone.

Este aprovisionamiento no está automatizado. La arquitectura y el Atajo final
están documentados en [Instalación administrada](Instalacion-administrada.md),
[Logs](Logs.md) y [Receptor](Receptor.md).

const URL = "https://raw.githubusercontent.com/legandrop/LGA_LockScreenCal/main/LockScreenCal.js";
const fm = FileManager.local();
const cache = fm.joinPath(fm.libraryDirectory(), "LockScreenCal.js");
const logDir = fm.joinPath(fm.libraryDirectory(), "LockScreenCal-logs");
const record = {
  id: Date.now().toString(36) + "-" + Math.random().toString(36).slice(2),
  version: "0.15", startedAt: Date.now(), events: [],
};
// Se registra antes de internet: incluso un fallo al bajar el programa queda
// en disco. No se guardan la URL, los ajustes ni los mensajes de excepcion.
function loaderEvent(stage) {
  const at = Date.now();
  record.updatedAt = at;
  record.revision = (record.revision || 0) + 1;
  record.events.push({ at, ms: Math.max(0, at - record.startedAt), stage });
  try {
    fm.createDirectory(logDir, true);
    fm.writeString(fm.joinPath(logDir, record.id + ".json"), JSON.stringify(record));
  } catch (_) {}
}
loaderEvent("loader_start");

let code;
try {
  loaderEvent("download_start");
  const req = new Request(URL);
  req.timeoutInterval = 15;
  code = await req.loadString();
  // Un 404 o una pagina de error tambien llegan como texto: se valida antes de
  // pisar la copia buena.
  if (req.response.statusCode !== 200 || !code.includes("drawCalendar")) {
    throw new Error("No se pudo bajar el script (HTTP " + req.response.statusCode + ")");
  }
  fm.writeString(cache, code);
  loaderEvent("download_ok");
} catch (err) {
  loaderEvent("download_error");
  if (!fm.fileExists(cache)) { loaderEvent("loader_error"); throw err; }
  code = fm.readString(cache);
  loaderEvent("download_cache");
}

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
let fondo;
const context = { record };
// La telemetria llega con el mismo archivo del calendario. Con una copia
// anterior sin esta funcion se conserva la salida y el registro basico local.
const traceCode = code.split("// ==== TRACE START ====")[1]?.split("// ==== TRACE END ====")[0];
if (traceCode) {
  const factory = new Function(traceCode + "\nreturn createTelemetry;")();
  const version = code.match(/const VERSION = "([\d.]+)"/)?.[1] || record.version;
  context.trace = factory(MI_CONFIG, version, record);
}
// El script descargado prepara la salida. El cargador espera que termine antes
// de devolversela a Atajos; complete() dentro de esa funcion no debe terminar
// el cargador mientras todavia esta esperando su promesa.
try {
  await new AsyncFunction("OVERRIDES", "Script", "RUN_CONTEXT", code)(MI_CONFIG, {
    setShortcutOutput: valor => { fondo = valor; },
    complete: () => {},
  }, context);
  if (typeof fondo !== "string" || !fondo.startsWith("iVBORw0KGgo")) {
    throw new Error("El script no preparo un PNG valido para Atajos");
  }
  if (context.trace) {
    context.trace.event("loader_return_prepared", { base64Chars: fondo.length });
    await context.trace.flush();
  } else loaderEvent("loader_return_prepared");
} catch (err) {
  if (context.trace) { context.trace.error("loader_error", err); await context.trace.flush(); }
  else loaderEvent("loader_error");
  throw err;
}
// return es una salida documentada para Run Inline Script. Queda en el codigo
// exterior de la accion, despues de resolver la funcion descargada.
return fondo;

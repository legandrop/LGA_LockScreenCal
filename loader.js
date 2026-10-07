// LockScreenCal — cargador.
//
// Este es el codigo que va adentro del Atajo, en la accion "Run Inline Script"
// de Scriptable. Baja la ultima version de LockScreenCal.js y la corre con tus
// ajustes, asi cada mejora llega sola sin reinstalar nada. Si no hay internet,
// usa la ultima version que bajo.

// Tus ajustes. Lo que no pongas usa el valor por defecto (ver CONFIG en
// LockScreenCal.js). Ejemplos:
//   keywords: { ALFA: "#8E24AA", BETA: "#F6BF26" },
//   excludeCalendars: ["Holidays in Argentina"],
//   topPercent: 35,
const MI_CONFIG = {
};

const URL = "https://raw.githubusercontent.com/legandrop/LGA_LockScreenCal/main/LockScreenCal.js";
const fm = FileManager.local();
const cache = fm.joinPath(fm.libraryDirectory(), "LockScreenCal.js");

let code;
try {
  const req = new Request(URL);
  req.timeoutInterval = 15;
  code = await req.loadString();
  // Un 404 o una pagina de error tambien llegan como texto: se valida antes de
  // pisar la copia buena.
  if (req.response.statusCode !== 200 || !code.includes("drawCalendar")) {
    throw new Error("No se pudo bajar el script (HTTP " + req.response.statusCode + ")");
  }
  fm.writeString(cache, code);
} catch (err) {
  if (!fm.fileExists(cache)) throw err;
  code = fm.readString(cache);
}

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
await new AsyncFunction("OVERRIDES", code)(MI_CONFIG);

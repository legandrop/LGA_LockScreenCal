// Pegar en un script nuevo de Scriptable. Lee los logs privados de Google;
// la URL con su token se toma del archivo local, no se muestra ni se comparte.
const fm = FileManager.local();
const path = fm.joinPath(fm.libraryDirectory(), "LockScreenCal-log-endpoint.txt");
let text;
try {
  if (!fm.fileExists(path)) throw new Error("Todavia no hay un puente de logs configurado. Agrega logRemote: true a MI_CONFIG y ejecuta el Atajo una vez.");
  const req = new Request(fm.readString(path));
  req.method = "POST";
  req.headers = { "Content-Type": "application/json" };
  req.body = JSON.stringify({ action: "read_logs" });
  req.timeoutInterval = 10;
  const reply = await req.loadJSON();
  if (!Array.isArray(reply && reply.runs)) throw new Error("El puente no devolvio los logs. Revisa que el bloque Logs.gs este publicado en la implementacion que usa tu Atajo.");
  text = "Logs recibidos por Google (no confirman que Atajos puso el fondo):\n\n" + JSON.stringify(reply.runs, null, 2);
} catch (err) {
  // No se muestra el error crudo de red, que podria incluir la URL con token.
  text = String(err.message || "").startsWith("Todavia") || String(err.message || "").startsWith("El puente")
    ? err.message : "No se pudo consultar Google. El historial local sigue disponible con diagnostico.js.";
}
console.log(text);
await QuickLook.present(text, true);
Script.complete();

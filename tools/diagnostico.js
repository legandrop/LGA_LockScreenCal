// Pegar en un script nuevo dentro de Scriptable y ejecutar DESPUES del error.
// Solo lee el registro: no vuelve a ejecutar el calendario ni pisa su estado.
const fm = FileManager.local();
const path = fm.joinPath(fm.libraryDirectory(), "LockScreenCal-run.json");
const deliveryPath = fm.joinPath(fm.libraryDirectory(), "LockScreenCal-delivery.json");
let text = "No hay registro de una corrida con v0.13 o posterior.\n\nEjecuta el Atajo una vez con internet y vuelve a consultar. Si sigue sin registro, el corte puede ocurrir en el cargador o estar usando una version anterior.";
try {
  if (fm.fileExists(path)) {
    const run = JSON.parse(fm.readString(path));
    text = "LockScreenCal v" + run.version +
      "\nInicio: " + new Date(run.startedAt).toLocaleString("es-AR") +
      "\nUltima etapa: " + run.phase +
      "\nTiempo hasta esa etapa: " + ((run.updatedAt - run.startedAt) / 1000).toFixed(1) + " s" +
      "\nEstado: " + run.result +
      "\n\nEl estado ok significa que se preparo la salida sin error de JavaScript. No confirma que Atajos la recibio.";
    if (fm.fileExists(deliveryPath)) {
      const delivery = JSON.parse(fm.readString(deliveryPath));
      text += "\n\nUltimo intento de salida (incluye fondos reutilizados):" +
        "\nv" + delivery.version + " · " + new Date(delivery.startedAt).toLocaleString("es-AR") +
        "\n" + delivery.phase + "\nPNG base64: " + delivery.base64Chars + " caracteres";
    }
  }
} catch (_) { text = "No se pudo leer el registro local."; }
console.log(text);
await QuickLook.present(text, true);
Script.complete();

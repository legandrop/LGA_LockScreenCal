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
try {
  const dir = fm.joinPath(fm.libraryDirectory(), "LockScreenCal-logs");
  const runs = fm.listContents(dir).filter(n => n.endsWith(".json") && !n.endsWith(".sync.json"))
    .map(n => { try { return JSON.parse(fm.readString(fm.joinPath(dir, n))); } catch (_) { return null; } })
    .filter(r => r && Array.isArray(r.events)).sort((a, b) => b.startedAt - a.startedAt).slice(0, 10);
  if (runs.length) {
    text += "\n\nHISTORIAL (ultimas 10 corridas; no confirma el fondo aplicado):\n";
    for (const r of runs) {
      let sent;
      try { sent = JSON.parse(fm.readString(fm.joinPath(dir, r.id + ".sync.json"))); } catch (_) {}
      const status = !r.remoteEnabled ? "envio remoto desactivado" :
        sent && sent.revision >= r.revision ? "Google confirmo el registro" : "pendiente de envio a Google" + (sent?.errorCode ? " · " + sent.errorCode : "");
      text += "\n" + new Date(r.startedAt).toLocaleString("es-AR") + " · " + r.id + " · v" + r.version + "\n" + status + "\n";
      text += r.events.map(e => e.stage + " (" + (e.ms / 1000).toFixed(1) + " s)" +
        (e.errorCode ? " · " + e.errorCode : "") + (e.base64Chars != null ? " · " + e.base64Chars + " caracteres" : "")).join("\n") + "\n";
    }
  }
} catch (_) {}
console.log(text);
await QuickLook.present(text, true);
Script.complete();

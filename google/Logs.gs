// Agregar este bloque AL FINAL del puente ya instalado, conservando su TOKEN.
// Despues actualizar la implementacion existente. No necesita una planilla:
// guarda hasta 50 corridas en las propiedades privadas del proyecto.

const LOG_PREFIX = "LockScreenCal.trace.";
const LOG_STAGES = ("loader_start download_start download_ok download_error download_cache loader_error " +
  "script_start google_start google_ok google_error phone_start phone_ok todoist_start todoist_ok todoist_error " +
  "render_start render_ok build_error error_image output_prepared output_call output_error app_preview " +
  "script_prepared reuse_active reuse_recent loader_return_prepared").split(" ");

function doPost(e) {
  const p = (e && e.parameter) || {};
  if (p.token !== TOKEN || TOKEN.indexOf("CAMBIAME-") === 0) return json_({ error: "token" });
  const raw = e && e.postData && e.postData.contents || "";
  if (raw.length > 45000) return json_({ error: "size" });
  let body;
  try { body = JSON.parse(raw); } catch (_) { return json_({ error: "json" }); }
  if (!body || typeof body !== "object") return json_({ error: "json" });
  const action = body.action || p.action;
  if (action === "read_logs") return json_({ runs: readLogRuns_() });
  if (action !== "logs" || !Array.isArray(body.runs) || body.runs.length > 5) return json_({ error: "action" });
  const runs = body.runs.map(cleanLogRun_);
  if (runs.some(r => !r)) return json_({ error: "schema" });
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return json_({ error: "busy" });
  try {
    const props = PropertiesService.getScriptProperties();
    const accepted = [];
    for (const run of runs) {
      const key = LOG_PREFIX + run.id;
      let previous;
      try { previous = JSON.parse(props.getProperty(key)); } catch (_) {}
      // Un reintento de una foto anterior del mismo registro no debe borrar
      // etapas que Google ya recibio en un envio mas reciente.
      if (!previous || (previous.revision || 0) <= run.revision) {
        props.setProperty(key, JSON.stringify(run));
      }
      accepted.push({ id: run.id, count: run.events.length, revision: run.revision });
    }
    for (const old of readLogRuns_().slice(50)) props.deleteProperty(LOG_PREFIX + old.id);
    return json_({ accepted });
  } finally { lock.releaseLock(); }
}

function cleanLogRun_(input) {
  if (!input || !/^[a-z0-9-]{1,80}$/.test(input.id || "") ||
      !/^\d+\.\d+$/.test(input.version || "") ||
      !Number.isFinite(input.startedAt) || !Number.isFinite(input.updatedAt) ||
      !Number.isInteger(input.revision) || input.revision < 1 || input.revision > 100000 ||
      !Array.isArray(input.events) || !input.events.length || input.events.length > 50) return null;
  const events = [];
  for (const row of input.events) {
    if (!row || LOG_STAGES.indexOf(row.stage) < 0 || !Number.isFinite(row.at) ||
        !Number.isFinite(row.ms) || row.ms < 0) return null;
    const out = { at: row.at, ms: row.ms, stage: row.stage };
    for (const key of ["count", "width", "height", "base64Chars", "httpStatus"]) {
      if (Number.isFinite(row[key]) && row[key] >= 0 && row[key] <= 20000000) out[key] = row[key];
    }
    if (/^(Error|TypeError|RangeError|SyntaxError|NetworkError|HTTP_\d{3}|invalid_png|invalid_google_response|timeout|network_error)$/.test(row.errorCode || "")) out.errorCode = row.errorCode;
    events.push(out);
  }
  const run = { id: input.id, version: input.version, startedAt: input.startedAt, updatedAt: input.updatedAt, revision: input.revision, events };
  // Cada propiedad admite 9 KB. Los datos admitidos son ASCII; se deja margen
  // y se reservan como maximo 50 propiedades para no agotar el almacenamiento.
  return JSON.stringify(run).length <= 8000 ? run : null;
}

function readLogRuns_() {
  const all = PropertiesService.getScriptProperties().getProperties();
  return Object.keys(all).filter(k => k.indexOf(LOG_PREFIX) === 0).map(k => {
    try { return JSON.parse(all[k]); } catch (_) { return null; }
  }).filter(r => r && Array.isArray(r.events)).sort((a, b) => b.startedAt - a.startedAt);
}

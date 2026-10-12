// Verifica el circuito iPhone -> Google con ambos lados reales y puentes
// simulados: autenticacion, reintentos, retencion y datos que se transmiten.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.join(__dirname, "..");
const source = fs.readFileSync(path.join(root, "LockScreenCal.js"), "utf8");
const traceSource = source.split("// ==== TRACE START ====")[1].split("// ==== TRACE END ====")[0];
const serverSource = fs.readFileSync(path.join(root, "google/Logs.gs"), "utf8");
const properties = new Map();
let lockAvailable = true;
let releases = 0;
const server = vm.createContext({
  PropertiesService: { getScriptProperties: () => ({
    getProperty: key => properties.get(key), getProperties: () => Object.fromEntries(properties),
    setProperty: (key, value) => { properties.set(key, value); },
    deleteProperty: key => { properties.delete(key); },
  }) },
  LockService: { getScriptLock: () => ({ tryLock: () => lockAvailable, releaseLock: () => { releases++; } }) },
});
vm.runInContext('const TOKEN = "test-token"; function json_(obj) { return obj; }\n' + serverSource, server);
const send = (body, token = "test-token", action = "logs") => server.doPost({
  parameter: { token, action }, postData: { contents: JSON.stringify(body) },
});
const files = new Map();
const requests = [];
let online = true;
let hanging = false;
let invalidAck = false;
let writesAvailable = true;
const client = vm.createContext({
  console: { log() {} },
  Timer: { schedule(ms, repeat, callback) { const handle = setTimeout(callback, ms); return { invalidate() { clearTimeout(handle); } }; } },
  FileManager: { local: () => ({
    libraryDirectory: () => "/cache", joinPath: (a, b) => a + "/" + b, createDirectory() {},
    writeString: (key, value) => { if (!writesAvailable) throw new Error("Disco lleno"); files.set(key, value); },
    readString: key => files.get(key), fileExists: key => files.has(key), remove: key => { files.delete(key); },
    listContents: dir => [...files.keys()].filter(key => key.startsWith(dir + "/")).map(key => key.slice(dir.length + 1)),
  }) },
  Request: class {
    constructor(url) { this.url = url; this.response = { statusCode: 200 }; this.nativeHeaders = {}; }
    // Una propiedad puenteada devuelve una copia: mutar el getter no llama al
    // setter nativo. La prueba verifica el encabezado realmente transmitido.
    set headers(value) { this.nativeHeaders = { ...value }; }
    get headers() { return { ...this.nativeHeaders }; }
    async loadJSON() {
      assert.equal(this.method, "POST");
      assert.equal(this.timeoutInterval, 2, "El envio no debe bloquear el fondo indefinidamente");
      requests.push(JSON.parse(this.body));
      if (this.url.includes("chatgpt.site")) assert.equal(this.nativeHeaders.Authorization, "Bearer " + require("node:crypto").createHash("sha256").update("LockScreenCal.logs.v1:test-token").digest("hex"));
      if (hanging) return new Promise(() => {});
      if (!online) throw new Error(this.url + " SECRET_NETWORK_MESSAGE");
      if (invalidAck) return { accepted: [] };
      return send(JSON.parse(this.body));
    }
  },
});
vm.runInContext(traceSource, client);
const options = { logRemote: true, googleUrl: "https://script.google.com/macros/s/example/exec?token=test-token",
  todoistToken: "SECRET_TODOIST", keywords: { SECRET_PROJECT: "#000" } };
const newTrace = initial => client.createTelemetry(options, "0.15", initial);
const last = id => JSON.parse(files.get("/cache/LockScreenCal-logs/" + id + ".json"));
const sync = id => JSON.parse(files.get("/cache/LockScreenCal-logs/" + id + ".sync.json"));

(async () => {
  const trace = newTrace();
  trace.event("script_start", { title: "SECRET_EVENT" });
  trace.error("google_error", new Error("HTTP 503 SECRET_EVENT SECRET_TODOIST"));
  trace.event("output_prepared", { base64Chars: 1000 });
  online = false;
  await trace.flush();
  assert.equal(sync(trace.id).errorCode, "envio_fallido");
  online = true;
  await trace.flush();
  assert.equal(sync(trace.id).revision, last(trace.id).revision);
  assert.equal(server.readLogRuns_()[0].events[1].errorCode, "HTTP_503");
  const count = requests.length;
  await trace.flush();
  assert.equal(requests.length, count, "No se debe reenviar un registro ya confirmado");

  trace.event("loader_return_prepared", { base64Chars: 1000 });
  invalidAck = true;
  await trace.flush();
  assert.equal(sync(trace.id).errorCode, "sin_confirmacion");
  invalidAck = false;
  await trace.flush();
  assert.equal(sync(trace.id).revision, 4);

  // Simula un proceso cortado: no llego a flush. La siguiente corrida envia el
  // ultimo evento guardado de la anterior sin declararla exitosa.
  const interrupted = newTrace();
  interrupted.event("script_start");
  interrupted.event("render_start");
  const next = newTrace();
  next.event("script_start");
  await next.flush(true);
  assert.equal(sync(interrupted.id).revision, 2);
  assert.equal(files.has("/cache/LockScreenCal-logs/" + next.id + ".sync.json"), false);
  assert.equal(server.readLogRuns_().find(r => r.id === interrupted.id).events.at(-1).stage, "render_start");

  // Retener solo 50 eventos no debe esconder nuevas etapas al llegar al limite.
  for (let i = 0; i < 55; i++) trace.event("phone_ok", { count: i });
  await trace.flush();
  assert.equal(last(trace.id).events.length, 50);
  assert.equal(sync(trace.id).revision, last(trace.id).revision);
  assert.equal(server.readLogRuns_().find(r => r.id === trace.id).events.at(-1).count, 54);

  const before = properties.size;
  assert.equal(send({ action: "read_logs" }, "wrong").error, "token");
  assert.equal(send({ runs: [] }, "wrong").error, "token");
  assert.equal(properties.size, before);
  lockAvailable = false;
  assert.equal(send({ runs: [last(trace.id)] }).error, "busy");
  lockAvailable = true;
  const stale = { ...last(trace.id), revision: 1, events: [last(trace.id).events[0]] };
  send({ runs: [stale] });
  assert.equal(server.readLogRuns_().find(r => r.id === trace.id).revision, last(trace.id).revision);
  assert.equal(send({ runs: [{ ...stale, events: [{ at: 1, ms: 0, stage: "SECRET_EVENT" }] }] }).error, "schema");

  const clean = { ...stale, id: "extra-fields", todoistToken: "SECRET_TODOIST", title: "SECRET_EVENT",
    events: [{ at: 1, ms: 0, stage: "google_error", errorCode: "SECRET_MESSAGE", message: "SECRET_EVENT" }] };
  send({ runs: [clean] });
  for (let i = 0; i < 60; i++) send({ runs: [{ ...stale, id: "retention-" + i, startedAt: Date.now() + i }] });
  assert.equal(properties.size, 50, "Google debe mantener acotado el historial");
  assert.ok(releases > 0);
  assert.ok(Array.isArray(send({ action: "read_logs" }).runs));

  const transmitted = JSON.stringify(requests) + JSON.stringify([...properties.values()]);
  for (const secret of ["SECRET_EVENT", "SECRET_PROJECT", "SECRET_TODOIST", "SECRET_NETWORK_MESSAGE", "test-token"]) {
    assert.ok(!transmitted.includes(secret), "Dato privado transmitido: " + secret);
  }
  options.logCollector = "https://lga-lockscreencal-logs.swoony-degu-6417.chatgpt.site/api/runs";
  const managed = newTrace(); managed.event("loader_start");
  await managed.flush();
  assert.equal(sync(managed.id).revision, 1, "El receptor propio debe confirmar la corrida con la clave derivada");
  managed.event("script_start"); hanging = true;
  await managed.flush();
  assert.equal(sync(managed.id).errorCode, "timeout", "La espera de logs debe terminar aunque la conexion siga abierta");
  hanging = false;
  await managed.flush();
  assert.equal(sync(managed.id).revision, 2);
  writesAvailable = false;
  assert.doesNotThrow(() => newTrace().event("script_start"));
  console.log("OK: historial por corrida, Google autenticado, reintentos, cortes, deduplicacion, retencion y privacidad");
})().catch(err => { console.error(err); process.exitCode = 1; });

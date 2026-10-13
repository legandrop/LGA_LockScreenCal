// Prueba la entrega a Atajos sin iPhone. Las APIs de Scriptable se simulan:
// la vista previa en Chromium verifica por separado el dibujo real.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const source = fs.readFileSync(path.join(root, "LockScreenCal.js"), "utf8");
const loader = fs.readFileSync(path.join(root, "loader.js"), "utf8");
assert.equal(fs.readFileSync(path.join(__dirname, "loader-body.js"), "utf8").trim(), loader.slice(loader.indexOf("const URL =")).trim(),
  "El bloque para actualizar el Atajo debe coincidir con el cargador completo");
const diagnostic = fs.readFileSync(path.join(__dirname, "diagnostico.js"), "utf8");
const png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=";

const epoch = Date.now();
async function check({ inApp = false, renderFails = false, invalidOutput = false, useLoader = false, offline = false,
  files = new Map(), now = epoch, beforeRender, expectRender = true, storageFails = false, overrides = {}, busyWithoutCache = false, googleNeverResponds = false, remoteRuns, managedSnapshot, checkPayload } = {}) {
  const calls = [];
  let output;
  let errorText = "";
  let renders = 0;
  files.set("/cache/LockScreenCal.js", source);
  class Clock extends Date {
    constructor(...args) { super(...(args.length ? args : [now])); }
    static now() { return now; }
  }
  const context = vm.createContext({
    Date: Clock, OVERRIDES: overrides,
    console: { log() {}, error() {} },
    config: { runsInApp: inApp },
    Timer: { schedule(ms, repeat, callback) {
      assert.ok([12000, 2000, 3500, 1000, 15000].includes(ms));
      const handle = setTimeout(callback, 0);
      return { invalidate() { clearTimeout(handle); } };
    } },
    Device: { screenResolution: () => ({ width: 1179, height: 2556 }) },
    Calendar: { forEvents: async () => [] },
    WebView: class {
      async loadHTML() {}
      async evaluateJavaScript(js) {
        renders++;
        if (beforeRender) await beforeRender();
        assert.match(js, /c.width = 1179; c.height = 2556;/);
        if (checkPayload) checkPayload(JSON.parse(js.match(/drawCalendar\(c, (\{[^\n]*\})\);/)[1]));
        if (renderFails) throw new Error("Fallo de dibujo simulado");
        return invalidOutput ? null : png;
      }
    },
    Image: { fromData(data) {
      calls.push("decode");
      // En Atajos no debe materializarse la imagen: puede cortar el proceso.
      assert.ok(inApp, "La entrega a Atajos decodificó el PNG en memoria nativa");
      return { data };
    } },
    Data: {
      fromBase64String: text => text,
      fromPNG: image => {
        calls.push("encode");
        assert.equal(image.error, true, "El PNG normal no debe volver a codificarse");
        return { toBase64String: () => png };
      },
    },
    QuickLook: { present: async () => { calls.push("preview"); } },
    Script: {
      setShortcutOutput: value => { output = value; calls.push("output"); },
      complete: () => { calls.push("complete"); },
    },
    DrawContext: class {
      setFillColor() {} fillRect() {} setTextColor() {} setFont() {}
      drawTextInRect(text) { errorText = text; }
      getImage() { return { error: true }; }
    },
    Size: class {}, Rect: class {}, Color: class {},
    Font: { boldSystemFont() {} },
    FileManager: { local: () => ({
      joinPath: (a, b) => a + "/" + b, libraryDirectory: () => "/cache",
      writeString: (name, text) => { if (storageFails) throw new Error("Disco no disponible"); files.set(name, text); },
      readString: name => files.get(name), fileExists: name => files.has(name),
      remove: name => { files.delete(name); },
      createDirectory() {},
      listContents: dir => [...files.keys()].filter(name => name.startsWith(dir + "/")).map(name => name.slice(dir.length + 1)),
    }) },
    Request: class {
      constructor(url) { this.url = url; }
      async loadJSON() {
        if (remoteRuns && this.method === "POST") {
          assert.match(this.headers.Authorization, /^Bearer [a-f0-9]{64}$/);
          const batch = JSON.parse(this.body).runs;
          remoteRuns.push(...batch);
          return { accepted: batch.map(r => ({ id: r.id, count: r.events.length, revision: r.revision })) };
        }
        if (managedSnapshot) {
          assert.equal(this.url, "https://lga-lockscreencal-logs.swoony-degu-6417.chatgpt.site/api/calendar", "El modo administrado no debe llamar Google/Todoist en el telefono");
          assert.match(this.headers.Authorization, /^Bearer [a-f0-9]{64}$/);
          return managedSnapshot;
        }
        if (remoteRuns) return { events: [], calendars: [] };
        assert.equal(googleNeverResponds, true);
        return new Promise(() => {});
      }
      response = { statusCode: 200 };
      async loadString() {
        if (offline) throw new Error("Sin internet");
        // Simula trabajo asincrono al final del archivo descargado: la salida
        // del cargador tiene que esperar tambien ese final, no solo main().
        return source + "\nawait Promise.resolve(); loadedSettled = true;";
      }
    },
  });
  const configuredLoader = loader.replace(/const MI_CONFIG = \{\s*\};/, "const MI_CONFIG = " + JSON.stringify(overrides) + ";");
  const returned = await vm.runInContext("(async () => {\n" + (useLoader ? configuredLoader : source) + "\n})()", context);
  assert.equal(useLoader ? returned : output, png, "Atajos debe recibir el base64 del PNG");
  if (useLoader) {
    assert.equal(output, undefined, "La salida nativa no debe indicarse desde la funcion descargada");
    assert.ok(!calls.includes("complete"), "La funcion descargada no debe finalizar la accion exterior");
    if (!offline && !storageFails) assert.equal(context.loadedSettled, true, "El cargador debe esperar el final asincrono");
  } else {
    assert.equal(calls.at(-1), "complete");
  }
  assert.equal(renders, expectRender ? 1 : 0, "Una corrida repetida no debe crear otro dibujo");
  if (renderFails || invalidOutput || busyWithoutCache) {
    assert.match(errorText, busyWithoutCache ? /actualizacion en curso/ : renderFails ? /Fallo de dibujo simulado/ : /PNG valido/);
    assert.deepEqual(calls, useLoader ? ["encode"] : ["encode", "output", "complete"]);
  } else if (inApp) {
    assert.deepEqual(calls, useLoader ? ["decode", "preview"] : ["output", "decode", "preview", "complete"]);
  } else {
    assert.equal(errorText, "", "Una corrida normal no debe entregar el fondo de error");
    assert.deepEqual(calls, useLoader ? [] : ["output", "complete"]);
  }
  return files;
}

async function readDiagnostic(files) {
  const before = new Map(files);
  let text;
  await vm.runInNewContext("(async () => {\n" + diagnostic + "\n})()", {
    console: { log() {} },
    FileManager: { local: () => ({
      libraryDirectory: () => "/cache", joinPath: (a, b) => a + "/" + b,
      fileExists: name => files.has(name), readString: name => files.get(name),
    }) },
    QuickLook: { present: async value => { text = value; } },
    Script: { complete() {} },
  });
  assert.deepEqual(files, before, "Consultar el diagnostico no debe modificar el registro del corte");
  return text;
}

(async () => {
  await check();
  const timedOut = await check({ overrides: { googleUrl: "https://example.test/calendar" }, googleNeverResponds: true });
  const run = [...timedOut.entries()].find(([name]) => name.includes("/LockScreenCal-logs/") && !name.endsWith(".sync.json"));
  const stages = JSON.parse(run[1]).events;
  assert.equal(stages.find(e => e.stage === "google_error").errorCode, "timeout");
  assert.ok(stages.some(e => e.stage === "phone_ok"), "Un Google que no responde debe permitir seguir con el iPhone");
  await check({ inApp: true });
  await check({ renderFails: true });
  await check({ invalidOutput: true });
  await check({ useLoader: true });
  const remoteRuns = [];
  await check({ useLoader: true, remoteRuns,
    overrides: { managedData: false, logRemote: true, logCollector: "https://lga-lockscreencal-logs.swoony-degu-6417.chatgpt.site/api/runs", googleUrl: "https://example.test/calendar?token=test-token" },
    beforeRender: () => {
      assert.ok(remoteRuns.some(r => r.events.some(e => e.stage === "script_start")), "El inicio debe enviarse antes del dibujo");
      assert.equal(remoteRuns.at(-1).events.at(-1).stage, "render_start", "La etapa previa al WebView debe llegar sin esperar el PNG");
      assert.ok(!remoteRuns.some(r => r.events.some(e => e.stage === "output_call")));
    },
  });
  const managedRuns = [];
  const managedFiles = await check({ useLoader: true, remoteRuns: managedRuns,
    managedSnapshot: { version: 1, google: { at: epoch, data: { events: [], calendars: [] } },
      todoist: { at: epoch, data: { me: { id: "fixture" }, projects: [], tasks: [] } } },
    overrides: { logRemote: true, logCollector: "https://lga-lockscreencal-logs.swoony-degu-6417.chatgpt.site/api/runs", googleUrl: "https://example.test/calendar?token=test-token", todoistToken: "FIXTURE" },
    beforeRender: () => assert.equal(managedRuns.length, 0, "La preparacion silenciosa no debe esperar envios de logs"),
  });
  const managedEvents = [...managedFiles.entries()].filter(([name]) => name.includes("/LockScreenCal-logs/") && !name.endsWith(".sync.json")).flatMap(([,value]) => JSON.parse(value).events);
  assert.ok(managedEvents.some(e => e.stage === "google_ok"));
  assert.ok(managedEvents.some(e => e.stage === "todoist_ok"));
  const today = new Date(epoch);
  const dueDay = today.getFullYear() + "-" + String(today.getMonth()+1).padStart(2,"0") + "-" + String(today.getDate()).padStart(2,"0");
  await check({ useLoader: true, remoteRuns: [],
    managedSnapshot: { version: 1,
      google: { at: epoch, data: { events: [{title:"Evento de ejemplo",calendar:"Ejemplo",color:"#AABBCC",start:epoch+3600000,end:epoch+7200000,allDay:false}], calendars:["Ejemplo"] } },
      todoist: { at: epoch, data: { me:{id:"fixture"}, projects:[{id:"project",color:"red"}],
        tasks:[{content:"Tarea de ejemplo",project_id:"project",due:{date:dueDay},labels:["ALFA"]}] } },
    },
    overrides: { logRemote:true, logCollector:"https://lga-lockscreencal-logs.swoony-degu-6417.chatgpt.site/api/runs", googleUrl:"https://example.test?token=fixture", todoistToken:"FIXTURE", keywords:{ALFA:"#112233"} },
    checkPayload: payload => {
      assert.equal(payload.events.find(e=>e.title==="Evento de ejemplo").color,"#AABBCC","Se debe preservar el color individual de Google");
      const task=payload.events.find(e=>e.title==="Tarea de ejemplo");
      assert.equal(task.task,true,"Todoist debe conservar la marca que dibuja el checkbox");
      assert.equal(task.color,"#112233","Se debe conservar el color de la etiqueta de Todoist");
      assert.ok(!payload.footer.includes("sin Google")&&!payload.footer.includes("sin Todoist"));
    },
  });
  await check({ useLoader: true, offline: true });
  await check({ useLoader: true, inApp: true });
  await check({ useLoader: true, renderFails: true });
  await check({ useLoader: true, invalidOutput: true });
  const files = await check();
  await check({ files, now: epoch + 1000, expectRender: false });
  assert.equal(JSON.parse(files.get("/cache/LockScreenCal-delivery.json")).startedAt, epoch + 1000);
  assert.match(await readDiagnostic(files), /No confirma que Atajos la recibio/);
  await check({ files, now: epoch + 2000, expectRender: false, useLoader: true });
  await check({ files, now: epoch + 60000 });
  await check({ files, now: epoch + 60001, inApp: true });
  await check({ files, now: epoch + 60002, overrides: { onlyCalendars: ["Ejemplo"] } });

  // Con la primera corrida pausada en el WebView, la segunda entrega el fondo
  // anterior. No pisa la etapa que necesitamos leer si iOS corta la primera.
  let reached, resume;
  const reachedRender = new Promise(resolve => { reached = resolve; });
  const hold = new Promise(resolve => { resume = resolve; });
  const activeFiles = await check();
  const pending = check({ files: activeFiles, now: epoch + 60000, beforeRender: async () => { reached(); await hold; } });
  await reachedRender;
  await check({ files: activeFiles, now: epoch + 60001, expectRender: false });
  assert.equal(JSON.parse(activeFiles.get("/cache/LockScreenCal-run.json")).phase, "Dibujo en WebView");
  assert.match(await readDiagnostic(activeFiles), /Ultima etapa: Dibujo en WebView/);
  resume();
  await pending;
  assert.equal(activeFiles.has("/cache/LockScreenCal-active.json"), false);

  // Una marca dejada por un proceso terminado no bloquea el calendario para
  // siempre; tampoco un archivo roto ni un fallo de escritura local.
  activeFiles.set("/cache/LockScreenCal-active.json", JSON.stringify({ id: "interrumpida", startedAt: epoch }));
  await check({ files: activeFiles, now: epoch + 120000 });
  activeFiles.set("/cache/LockScreenCal-output.txt", "archivo roto");
  await check({ files: activeFiles, now: epoch + 120001 });
  await check({ storageFails: true });
  // El simulador no ofrece loadJSON: fuerza fallos del puente y del envio.
  // Igual debe entregar el PNG; los logs quedan pendientes para otra corrida.
  const remoteFailure = await check({ overrides: { logRemote: true, googleUrl: "https://example.invalid/exec?token=PRIVADO" } });
  assert.ok([...remoteFailure.keys()].some(key => key.endsWith(".sync.json")), "Debe conservarse el intento de envio fallido");
  const coldFiles = new Map([["/cache/LockScreenCal-active.json", JSON.stringify({ id: "primera", startedAt: epoch })]]);
  await check({ files: coldFiles, expectRender: false, busyWithoutCache: true });
  assert.equal(coldFiles.has("/cache/LockScreenCal-output.txt"), false, "El aviso no debe guardarse como fondo bueno");
  assert.match(await readDiagnostic(new Map()), /No hay registro/);
  assert.match(await readDiagnostic(new Map([["/cache/LockScreenCal-run.json", "roto"]])), /No se pudo leer/);
  console.log("OK: retorno del cargador al finalizar, entrega anterior, app, errores, repeticion, solapamiento y diagnostico sin confirmacion de recepcion");
})().catch(err => { console.error(err); process.exitCode = 1; });

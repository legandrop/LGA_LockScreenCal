// Prueba la entrega a Atajos sin iPhone. Las APIs de Scriptable se simulan:
// la vista previa en Chromium verifica por separado el dibujo real.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const source = fs.readFileSync(path.join(root, "LockScreenCal.js"), "utf8");
const loader = fs.readFileSync(path.join(root, "loader.js"), "utf8");
const diagnostic = fs.readFileSync(path.join(__dirname, "diagnostico.js"), "utf8");
const png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=";

const epoch = Date.now();
async function check({ inApp = false, renderFails = false, invalidOutput = false, useLoader = false, offline = false,
  files = new Map(), now = epoch, beforeRender, expectRender = true, storageFails = false, overrides = {}, busyWithoutCache = false } = {}) {
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
    Device: { screenResolution: () => ({ width: 1179, height: 2556 }) },
    Calendar: { forEvents: async () => [] },
    WebView: class {
      async loadHTML() {}
      async evaluateJavaScript(js) {
        renders++;
        if (beforeRender) await beforeRender();
        assert.match(js, /c.width = 1179; c.height = 2556;/);
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
    }) },
    Request: class {
      response = { statusCode: 200 };
      async loadString() {
        if (offline) throw new Error("Sin internet");
        // Simula trabajo asincrono al final del archivo descargado: la salida
        // del cargador tiene que esperar tambien ese final, no solo main().
        return source + "\nawait Promise.resolve(); loadedSettled = true;";
      }
    },
  });
  const returned = await vm.runInContext("(async () => {\n" + (useLoader ? loader : source) + "\n})()", context);
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
  await check({ inApp: true });
  await check({ renderFails: true });
  await check({ invalidOutput: true });
  await check({ useLoader: true });
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
  const coldFiles = new Map([["/cache/LockScreenCal-active.json", JSON.stringify({ id: "primera", startedAt: epoch })]]);
  await check({ files: coldFiles, expectRender: false, busyWithoutCache: true });
  assert.equal(coldFiles.has("/cache/LockScreenCal-output.txt"), false, "El aviso no debe guardarse como fondo bueno");
  assert.match(await readDiagnostic(new Map()), /No hay registro/);
  assert.match(await readDiagnostic(new Map([["/cache/LockScreenCal-run.json", "roto"]])), /No se pudo leer/);
  console.log("OK: retorno del cargador al finalizar, entrega anterior, app, errores, repeticion, solapamiento y diagnostico sin confirmacion de recepcion");
})().catch(err => { console.error(err); process.exitCode = 1; });

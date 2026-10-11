// Prueba la entrega a Atajos sin iPhone. Las APIs de Scriptable se simulan:
// la vista previa en Chromium verifica por separado el dibujo real.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const source = fs.readFileSync(path.join(root, "LockScreenCal.js"), "utf8");
const loader = fs.readFileSync(path.join(root, "loader.js"), "utf8");
const png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=";

async function check({ inApp = false, renderFails = false, invalidOutput = false, useLoader = false, offline = false } = {}) {
  const calls = [];
  let output;
  let errorText = "";
  let cached = source;
  const context = vm.createContext({
    console: { log() {}, error() {} },
    config: { runsInApp: inApp },
    Device: { screenResolution: () => ({ width: 1179, height: 2556 }) },
    Calendar: { forEvents: async () => [] },
    WebView: class {
      async loadHTML() {}
      async evaluateJavaScript(js) {
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
      writeString: (_, text) => { cached = text; },
      readString: () => cached, fileExists: () => true,
    }) },
    Request: class {
      response = { statusCode: 200 };
      async loadString() { if (offline) throw new Error("Sin internet"); return source; }
    },
  });
  await vm.runInContext("(async () => {\n" + (useLoader ? loader : source) + "\n})()", context);
  assert.equal(output, png, "Atajos debe recibir el base64 del PNG");
  assert.equal(calls.at(-1), "complete");
  if (renderFails || invalidOutput) {
    assert.match(errorText, renderFails ? /Fallo de dibujo simulado/ : /PNG valido/);
    assert.deepEqual(calls, ["encode", "output", "complete"]);
  } else if (inApp) {
    assert.deepEqual(calls, ["output", "decode", "preview", "complete"]);
  } else {
    assert.equal(errorText, "", "Una corrida normal no debe entregar el fondo de error");
    assert.deepEqual(calls, ["output", "complete"]);
  }
}

(async () => {
  await check();
  await check({ inApp: true });
  await check({ renderFails: true });
  await check({ invalidOutput: true });
  await check({ useLoader: true });
  await check({ useLoader: true, offline: true });
  console.log("OK: salida directa a Atajos, vista en app, error y cargador con/sin internet");
})().catch(err => { console.error(err); process.exitCode = 1; });

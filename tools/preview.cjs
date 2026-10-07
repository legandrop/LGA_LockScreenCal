// Genera una vista previa del fondo sin el iPhone, con eventos de ejemplo.
// Usa el mismo drawCalendar de LockScreenCal.js y le dibuja encima un reloj y
// los botones del lock screen, para ver que no se pise nada.
//
//   npm i playwright && node tools/preview.cjs [ancho alto]
//   -> preview/preview.png

const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const root = path.join(__dirname, "..");
const src = fs.readFileSync(path.join(root, "LockScreenCal.js"), "utf8");
const render = src.split("// ==== RENDER START ====")[1].split("// ==== RENDER END ====")[0];
const config = eval("(" + src.match(/const CONFIG = (\{[\s\S]*?\n\});/)[1] + ")");

const W = Number(process.argv[2]) || 1179; // iPhone 15/16 Pro
const H = Number(process.argv[3]) || 2556;

const NOW = new Date(2026, 9, 7, 14, 5); // miercoles 7/10/2026 14:05
// Datos inventados. Las palabras clave de ejemplo muestran como se pintan.
const KEYWORDS = { ALFA: "#8E24AA", BETA: "#F6BF26", GAMA: "#D50000", DELTA: "#039BE5" };
const C = { alfa: "#8E24AA", beta: "#F6BF26", gama: "#D50000", delta: "#039BE5",
  personal: "#3F51B5", dev: "#F4511E", cumples: "#33B679", va: "#7986CB" };
const at = (d, h, m, durMin, title, color) => {
  const s = new Date(2026, 9, 7 + d, h, m).getTime();
  return { title, color, allDay: false, start: s, end: s + durMin * 60000 };
};
const allDay = (d, n, title, color) => ({ title, color, allDay: true,
  start: new Date(2026, 9, 7 + d).getTime(), end: new Date(2026, 9, 7 + d + n).getTime() });

const events = [
  at(0, 10, 0, 60, "Daily ALFA", C.alfa),
  at(0, 13, 30, 60, "Revisión semanal ALFA", C.alfa),
  at(0, 15, 0, 90, "Reunión BETA con el cliente", C.beta),
  at(0, 18, 0, 60, "Probar LockScreenCal en el iPhone", C.dev),
  at(0, 20, 30, 120, "Cena con amigos (va en auto)", C.personal),
  allDay(1, 1, "Cumple de Juan", C.cumples),
  at(1, 9, 30, 30, "Llamada con producción", C.alfa),
  at(1, 11, 0, 60, "Entrega GAMA: versión final", C.gama),
  at(1, 16, 0, 60, "Tech call DELTA", C.delta),
  at(2, 10, 0, 240, "Rodaje BETA — día 3", C.beta),
  at(2, 17, 0, 60, "Dentista", C.personal),
  allDay(4, 2, "Finde largo", C.personal),
  at(5, 12, 0, 60, "Almuerzo", C.personal),
  at(6, 10, 0, 60, "Daily ALFA", C.alfa),
];

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ timezoneId: "America/Argentina/Buenos_Aires", locale: "es-AR" });
  await page.setContent('<canvas id="c"></canvas>');
  const payload = { now: NOW.getTime(), events, opts: { ...config, keywords: KEYWORDS }, footer: "act. 14:05" };
  const b64 = await page.evaluate(([code, W, H, payload]) => {
    eval(code + "\nwindow.drawCalendar = drawCalendar;");
    const c = document.getElementById("c");
    c.width = W; c.height = H;
    window.drawCalendar(c, payload);

    // Simulacion del lock screen (no va en la imagen real)
    const ctx = c.getContext("2d"), s = W / 390;
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.font = `600 ${19 * s}px system-ui, sans-serif`;
    ctx.fillText("miércoles 7 de octubre", W / 2, 95 * s);
    ctx.font = `600 ${96 * s}px system-ui, sans-serif`;
    ctx.fillText("14:05", W / 2, 190 * s);
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    for (const x of [70 * s, W - 70 * s]) {
      ctx.beginPath(); ctx.arc(x, H - 90 * s, 25 * s, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillRect(W / 2 - 67 * s, H - 22 * s, 134 * s, 5 * s);
    return c.toDataURL("image/png").split(",")[1];
  }, [render, W, H, payload]);

  fs.mkdirSync(path.join(root, "preview"), { recursive: true });
  const out = path.join(root, "preview", "preview.png");
  fs.writeFileSync(out, Buffer.from(b64, "base64"));
  await browser.close();
  console.log(out);
})();

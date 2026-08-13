/**
 * One command: backend + dashboard + serial plotter (no ESP32 upload).
 * Usage: npm start
 */
const { spawn } = require("child_process");
const path = require("path");
const os = require("os");

const root = path.join(__dirname, "..");
const isWin = os.platform() === "win32";
const port = process.env.NEURO_SERIAL_PORT || "COM5";
const env = {
  ...process.env,
  NEURO_AUTO_CONNECT: process.env.NEURO_AUTO_CONNECT || "serial",
  NEURO_SERIAL_PORT: port,
};

const children = [];

function run(name, command, args, cwd = root) {
  const child = spawn(command, args, {
    cwd,
    env,
    stdio: "inherit",
    shell: isWin,
  });
  child.on("exit", (code) => {
    console.log(`[${name}] stopped (exit ${code ?? "?"})`);
  });
  children.push(child);
  return child;
}

function openBrowser(url) {
  if (isWin) {
    spawn("cmd", ["/c", "start", "", url], { stdio: "ignore", shell: true });
  } else if (os.platform() === "darwin") {
    spawn("open", [url], { stdio: "ignore" });
  } else {
    spawn("xdg-open", [url], { stdio: "ignore" });
  }
}

console.log("=== Neuro-project: npm start ===");
console.log(`Serial port: ${port} (set NEURO_SERIAL_PORT to override)`);
console.log("Educational prototype — NOT a medical device.\n");

run("backend", "python", [
  "-m",
  "uvicorn",
  "backend.app.main:app",
  "--host",
  "127.0.0.1",
  "--port",
  "8000",
]);

setTimeout(() => {
  run("frontend", "npm", ["run", "dev"], path.join(root, "frontend"));
}, 4000);

setTimeout(() => {
  if (process.env.NEURO_PLOTTER === "1") {
    run("plotter", "python", ["tools/serial_plotter.py", "--port", port]);
  } else {
    console.log("Serial plotter skipped (set NEURO_PLOTTER=1 to enable). Close nothing before upload.\n");
  }
}, 8000);

setTimeout(() => {
  openBrowser("http://localhost:5173");
  console.log("\nDashboard: http://localhost:5173");
  console.log("Backend:   http://127.0.0.1:8000");
  console.log("Press Ctrl+C to stop all services.\n");
}, 10000);

function shutdown() {
  console.log("\nShutting down…");
  for (const child of children) {
    if (!child.killed) {
      if (isWin) spawn("taskkill", ["/pid", String(child.pid), "/f", "/t"], { shell: true });
      else child.kill("SIGTERM");
    }
  }
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

/**
 * One command: backend + dashboard + serial plotter (no ESP32 upload).
 * Usage: npm start
 */
const { spawn, execSync } = require("child_process");
const http = require("http");
const path = require("path");
const os = require("os");

const root = path.join(__dirname, "..");
const isWin = os.platform() === "win32";
const API_PORT = Number(process.env.NEURO_API_PORT || 8000);
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

function findPortListeners(portNum) {
  const pids = new Set();
  try {
    if (isWin) {
      const out = execSync(`netstat -ano -p tcp | findstr :${portNum}`, { encoding: "utf8" });
      for (const line of out.split(/\r?\n/)) {
        if (!/LISTENING/i.test(line)) continue;
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (/^\d+$/.test(pid) && pid !== "0") pids.add(pid);
      }
    } else {
      const out = execSync(`lsof -ti tcp:${portNum} -sTCP:LISTEN`, { encoding: "utf8" });
      for (const pid of out.split(/\r?\n/)) {
        if (/^\d+$/.test(pid)) pids.add(pid);
      }
    }
  } catch {
    /* port free */
  }
  return [...pids];
}

function killPid(pid) {
  try {
    if (isWin) execSync(`cmd /c taskkill /PID ${pid} /F /T`, { stdio: "ignore" });
    else execSync(`kill -9 ${pid}`, { stdio: "ignore" });
  } catch {
    /* already gone */
  }
}

function gracefulDisconnect(portNum) {
  return new Promise((resolve) => {
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port: portNum,
        path: "/api/disconnect",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        timeout: 2000,
      },
      () => resolve()
    );
    req.on("error", () => resolve());
    req.on("timeout", () => {
      req.destroy();
      resolve();
    });
    req.write("{}");
    req.end();
  });
}

async function freePort(portNum, { graceful = false } = {}) {
  if (graceful) {
    await gracefulDisconnect(portNum);
    await new Promise((r) => setTimeout(r, 400));
  }

  const pids = findPortListeners(portNum);
  if (!pids.length) return;

  console.log(`[start] Port ${portNum} is busy — stopping PID(s): ${pids.join(", ")}`);
  for (const pid of pids) killPid(pid);

  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 250));
    if (!findPortListeners(portNum).length) return;
  }
  console.error(`[start] Could not free port ${portNum}. Close other terminals running npm start.`);
  process.exit(1);
}

async function freeApiPort(portNum) {
  await freePort(portNum, { graceful: true });
}

async function waitForBackend(maxMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    try {
      const res = await fetch(`http://127.0.0.1:${API_PORT}/api/status`);
      if (res.ok) return true;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
}

async function main() {
  console.log("=== Neuro-project: npm start ===");
  console.log(`Serial port: ${port} (set NEURO_SERIAL_PORT to override)`);
  console.log("Educational prototype — NOT a medical device.\n");

  await freeApiPort(API_PORT);

  run("backend", "python", [
    "-m",
    "uvicorn",
    "backend.app.main:app",
    "--host",
    "127.0.0.1",
    "--port",
    String(API_PORT),
  ]);

  const ok = await waitForBackend();
  if (!ok) {
    console.error(`\n[backend] Not responding on http://127.0.0.1:${API_PORT} — check Python errors above.\n`);
    shutdown(1);
    return;
  }

  await freePort(5173);

  run("frontend", "npm", ["run", "dev"], path.join(root, "frontend"));

  if (process.env.NEURO_PLOTTER === "1") {
    run("plotter", "python", ["tools/serial_plotter.py", "--port", port]);
  } else {
    console.log("Serial plotter skipped (set NEURO_PLOTTER=1 to enable).\n");
  }

  setTimeout(() => {
    openBrowser("http://localhost:5173");
    console.log("\nDashboard: http://localhost:5173  (use this URL — not :8000)");
    console.log(`Backend:   http://127.0.0.1:${API_PORT}/api/status`);
    console.log("Press Ctrl+C to stop all services.\n");
  }, 3000);
}

function shutdown(code = 0) {
  console.log("\nShutting down…");
  for (const child of children) {
    if (!child.killed) {
      if (isWin) spawn("cmd", ["/c", "taskkill", "/PID", String(child.pid), "/F", "/T"], { stdio: "ignore" });
      else child.kill("SIGTERM");
    }
  }
  process.exit(code);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

main().catch((err) => {
  console.error(err);
  shutdown(1);
});

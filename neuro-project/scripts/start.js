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
  PYTHONUNBUFFERED: "1",
  NEURO_AUTO_CONNECT: process.env.NEURO_AUTO_CONNECT || "serial",
  NEURO_SERIAL_PORT: port,
};

const children = [];
let backendChild = null;

function resolvePython() {
  if (process.env.NEURO_PYTHON) return process.env.NEURO_PYTHON;
  const candidates = isWin ? ["py -3", "python", "python3"] : ["python3", "python"];
  for (const cmd of candidates) {
    try {
      const out = execSync(`${cmd} -c "import sys; print(sys.executable)"`, {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
        shell: true,
      }).trim();
      if (out) return out;
    } catch {
      /* try next */
    }
  }
  return isWin ? "py" : "python3";
}

const PYTHON = resolvePython();

function run(name, command, args, cwd = root) {
  const child = spawn(command, args, {
    cwd,
    env,
    stdio: "inherit",
    shell: false,
    windowsHide: true,
  });
  child.on("exit", (code) => {
    console.log(`[${name}] stopped (exit ${code ?? "?"})`);
  });
  child.on("error", (err) => {
    console.error(`[${name}] failed to start: ${err.message}`);
  });
  children.push(child);
  return child;
}

function runNpmDev(cwd) {
  if (isWin) {
    return run("frontend", "cmd", ["/c", "npm", "run", "dev"], cwd);
  }
  return run("frontend", "npm", ["run", "dev"], cwd);
}

function openBrowser(url) {
  if (isWin) {
    spawn("cmd", ["/c", "start", "", url], { stdio: "ignore", shell: false });
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

function pingBackend(portNum) {
  return new Promise((resolve) => {
    const req = http.get(
      { hostname: "127.0.0.1", port: portNum, path: "/api/status", timeout: 3000 },
      (res) => {
        res.resume();
        resolve(res.statusCode === 200);
      }
    );
    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitForBackend(child, maxMs = 90000) {
  const start = Date.now();
  let dots = 0;
  while (Date.now() - start < maxMs) {
    if (child && child.exitCode !== null) {
      console.error(`\n[backend] Process exited early (code ${child.exitCode}).`);
      return false;
    }
    if (await pingBackend(API_PORT)) return true;
    dots = (dots + 1) % 4;
    process.stdout.write(`\r[start] Waiting for backend${".".repeat(dots)}   `);
    await new Promise((r) => setTimeout(r, 600));
  }
  process.stdout.write("\n");
  return false;
}

async function main() {
  console.log("=== Neuro-project: npm start ===");
  console.log(`Serial port: ${port} (set NEURO_SERIAL_PORT to override)`);
  console.log(`Python: ${PYTHON}`);
  console.log("Educational prototype — NOT a medical device.\n");

  await freePort(API_PORT, { graceful: true });

  console.log("[start] Launching backend…");
  backendChild = run(
    "backend",
    PYTHON,
    ["-m", "uvicorn", "backend.app.main:app", "--host", "127.0.0.1", "--port", String(API_PORT)],
    root
  );

  const ok = await waitForBackend(backendChild);
  if (!ok) {
    console.error(
      `\n[backend] Not responding on http://127.0.0.1:${API_PORT}.\n` +
        "  • Check Python errors above\n" +
        "  • Try: python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000\n"
    );
    shutdown(1);
    return;
  }
  console.log("\n[start] Backend ready.");

  await freePort(5173);

  runNpmDev(path.join(root, "frontend"));

  if (process.env.NEURO_PLOTTER === "1") {
    run("plotter", PYTHON, [path.join("tools", "serial_plotter.py"), "--port", port]);
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

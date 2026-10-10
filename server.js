const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { runAgents } = require("./agent");

const PORT = Number(process.env.PORT || 3000);
const DB_FILE = path.join(__dirname, "data.json");

const seed = {
  listings: [
    { id: "L1", title: "Cafe and bakery website template", name: "Lim Kar Yee", cat: "website templates", desc: "4-page responsive site with cake gallery and contact form", price: 800, days: 5, rating: 4.3, orders: 5, agency: 3200 },
    { id: "L2", title: "One-page portfolio website", name: "Muhammad Danial Hakim", cat: "website templates", desc: "Fast single-page site, mobile first, 2 revisions", price: 350, days: 3, rating: 4.8, orders: 9, agency: 1200 },
    { id: "L3", title: "Logo and colour palette pack", name: "Nur Aisyah Razak", cat: "logo and branding", desc: "3 logo concepts, final files in PNG and SVG", price: 180, days: 4, rating: 4.9, orders: 16, agency: 900 },
    { id: "L4", title: "Product descriptions, 20 items", name: "Siti Nor Amira Salleh", cat: "copywriting", desc: "Clear, SEO friendly copy for 20 products", price: 160, days: 3, rating: 4.7, orders: 21, agency: 600 }
  ],
  requests: [],
  runs: []
};

function loadDb() {
  try { return JSON.parse(fs.readFileSync(DB_FILE, "utf8")); }
  catch { fs.writeFileSync(DB_FILE, JSON.stringify(seed, null, 2)); return structuredClone(seed); }
}
let db = loadDb();
function saveDb() { fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2)); }

function send(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  });
  res.end(JSON.stringify(data));
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", chunk => {
      raw += chunk;
      if (raw.length > 1_000_000) { reject(new Error("Request body too large")); req.destroy(); }
    });
    req.on("end", () => {
      if (!raw) return resolve({});
      try { resolve(JSON.parse(raw)); } catch { reject(new Error("Body must be valid JSON")); }
    });
    req.on("error", reject);
  });
}
function id(prefix) { return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") return send(res, 204, {});
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const parts = url.pathname.split("/").filter(Boolean);

  try {
    if (req.method === "GET" && url.pathname === "/api/health")
      return send(res, 200, { ok: true, service: "UniBiz API", timestamp: new Date().toISOString() });

    if (req.method === "GET" && url.pathname === "/api/listings") {
      const q = (url.searchParams.get("q") || "").toLowerCase();
      const category = url.searchParams.get("category");
      const listings = db.listings.filter(x =>
        (!category || category === "all" || x.cat === category) &&
        (!q || [x.title, x.name, x.cat, x.desc].join(" ").toLowerCase().includes(q))
      );
      return send(res, 200, { listings });
    }

    if (req.method === "POST" && url.pathname === "/api/listings") {
      const b = await readBody(req);
      if (!b.title || !b.name || !b.cat || !b.desc || !Number.isFinite(Number(b.price)) || Number(b.price) < 0)
        return send(res, 400, { error: "title, name, cat, desc and a non-negative price are required" });
      const listing = {
        id: id("N"), title: String(b.title).trim(), name: String(b.name).trim(),
        cat: String(b.cat).trim(), desc: String(b.desc).trim(), price: Number(b.price),
        days: Math.max(1, Number(b.days) || 1), rating: 0, orders: 0,
        agency: Math.max(0, Number(b.agency) || 0)
      };
      db.listings.unshift(listing); saveDb();
      return send(res, 201, { listing });
    }

    if (req.method === "POST" && url.pathname === "/api/requests") {
      const b = await readBody(req);
      if (typeof b.request !== "string" || !b.request.trim())
        return send(res, 400, { error: "request must be a non-empty string" });
      const record = { id: id("R"), request: b.request.trim(), status: "received", createdAt: new Date().toISOString() };
      db.requests.unshift(record); saveDb();
      return send(res, 201, { request: record });
    }

    if (req.method === "POST" && url.pathname === "/api/agents/run") {
      const b = await readBody(req);
      if (typeof b.request !== "string" || !b.request.trim())
        return send(res, 400, { error: "request must be a non-empty string" });
      const result = runAgents({ request: b.request, listings: db.listings, chosenListingId: b.chosenListingId || null });
      const run = { id: id("RUN"), createdAt: new Date().toISOString(), input: b.request, result };
      db.runs.unshift(run); saveDb();
      return send(res, 200, run);
    }

    if (req.method === "GET" && parts[0] === "api" && parts[1] === "agents" && parts[2] === "runs" && parts[3]) {
      const run = db.runs.find(x => x.id === parts[3]);
      return run ? send(res, 200, run) : send(res, 404, { error: "Run not found" });
    }

    if (req.method === "GET" && url.pathname === "/api/agents/runs")
      return send(res, 200, { runs: db.runs });

    if (req.method === "GET" && url.pathname === "/")
      return send(res, 200, { service: "UniBiz backend starter", docs: "/README.md", health: "/api/health" });

    return send(res, 404, { error: "Route not found" });
  } catch (err) {
    return send(res, 400, { error: err.message || "Bad request" });
  }
});

server.listen(PORT, () => console.log(`UniBiz API running at http://localhost:${PORT}`));
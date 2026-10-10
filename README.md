# UniBiz backend + agent starter

This is a hackathon-ready **starter backend** based on the UniBiz HTML prototype you uploaded. It keeps the backend separate from the agent orchestration logic.

## Files
- `server.js` — Node.js HTTP REST API and lightweight JSON-file persistence.
- `agent.js` — separate agent pipeline: planner, concierge/recommendation, matcher, contract, meeting report, QA and run log.
- `data.json` — created automatically on first run; stores sample listings and submitted agent runs.
- `package.json` — run scripts (no third-party dependencies required).

## Run locally
Requires Node.js 18 or newer.

```bash
npm start
```

Server starts at `http://localhost:3000`.

## Endpoints
- `GET /api/health` — health check.
- `GET /api/listings?q=bakery&category=website%20templates` — search listings.
- `POST /api/listings` — create a listing.
- `POST /api/requests` — save a business request.
- `POST /api/agents/run` — run the agent pipeline and save the result.
- `GET /api/agents/runs` — list saved agent runs.
- `GET /api/agents/runs/:id` — fetch one run.

### Example: run the agents
```bash
curl -X POST http://localhost:3000/api/agents/run \\
  -H "Content-Type: application/json" \\
  -d '{"request":"I need a website for my bakery. Budget around RM1,500. Finish in 3 weeks."}'
```

The response includes structured files such as `scope.json`, `recommendation.json`, `team.json`, `contract.json`, `meeting_report.json`, `qa_report.json`, and `run_log.json`.

## Connect your existing HTML
Your HTML currently runs its sample listings and simulated agent sequence entirely in the browser. The backend will not be used by the page until you change the frontend JavaScript to call the API. For example:

```js
const response = await fetch("http://localhost:3000/api/agents/run", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ request: document.getElementById("req").value })
});
const run = await response.json();
console.log(run.result.files);
```

Replace the demo `setTimeout` agent replay with this fetch call when you're ready to integrate. If frontend and backend are deployed on different domains, configure a specific CORS origin instead of the starter's permissive `*`.

## Important hackathon caveats
- This is a **working starter**, not a production backend.
- Agent steps are deterministic rules, not a real LLM. Add your chosen AI provider in `agent.js` if the judging criteria require actual AI agents.
- Data is stored in a local JSON file. Use a database for multi-user or deployed production use.
- There is no authentication, file upload security, payment processing, or legally binding contract workflow.
- The sample listings are fictional/demo data. Verify names, prices, availability and all generated scope details before a real project.
- QA deliberately returns **HOLD** until a human tests delivered work; the demo must not automatically release real payments.

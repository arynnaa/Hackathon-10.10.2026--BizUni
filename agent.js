// Separate agent orchestration module.
// This is a deterministic demo pipeline; connect an LLM/provider later if desired.
function money(value) {
  return "RM " + Number(value || 0).toLocaleString("en-MY", { maximumFractionDigits: 2 });
}
function datePlus(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" });
}
function parseRequest(text) {
  const budgetMatch = text.match(/RM\\s?([\\d,]+)/i);
  const weeksMatch = text.match(/(\\d+)\\s*weeks?/i);
  const daysMatch = text.match(/(\\d+)\\s*days?/i);
  return {
    text: text.trim(),
    budget: budgetMatch ? Number(budgetMatch[1].replace(/,/g, "")) : 1500,
    weeks: weeksMatch ? Math.max(1, Number(weeksMatch[1])) : (daysMatch ? Math.max(1, Math.ceil(Number(daysMatch[1]) / 7)) : 3)
  };
}
function chooseListing(listings, request, chosenId) {
  if (chosenId) {
    const chosen = listings.find(x => String(x.id) === String(chosenId));
    if (chosen) return chosen;
  }
  const text = request.toLowerCase();
  const scored = listings.map(x => {
    const words = (x.title + " " + x.desc + " " + x.cat).toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 2);
    const score = words.reduce((n, w) => n + (text.includes(w) ? 1 : 0), 0);
    return { x, score };
  }).sort((a, b) => b.score - a.score || a.x.price - b.x.price);
  return scored[0]?.x || null;
}
function runAgents({ request, listings = [], chosenListingId = null }) {
  const c = parseRequest(request);
  const pick = chooseListing(listings, c.text, chosenListingId);
  const writer = listings.find(x => x.cat === "copywriting") || null;
  const wantsWeb = /website|web site|bakery|cafe|café|shop|online/i.test(c.text);
  const selected = pick ? [pick] : [];
  const addWriter = writer && pick && pick.cat === "website templates" && /copy|writing|product descriptions/i.test(c.text);
  const total = (pick ? pick.price : 0) + (addWriter ? writer.price : 0);
  const team = pick ? [{ name: pick.name, role: "Lead student", listing: pick.title }] : [];
  if (addWriter) team.push({ name: writer.name, role: "Copywriter", listing: writer.title });

  const scope = {
    title: "Project scope",
    request: c.text,
    budget: c.budget,
    timelineWeeks: c.weeks,
    recommendedListing: pick,
    deliverables: wantsWeb
      ? ["Responsive business website", "Product/gallery section", "Contact method (form or WhatsApp, subject to implementation)"]
      : (pick ? [pick.desc] : ["Clarify deliverables with the requester"]),
    milestones: [
      { name: "Plan and first draft", due: datePlus(Math.ceil(c.weeks * 7 * 0.33)) },
      { name: "Build and revisions", due: datePlus(Math.ceil(c.weeks * 7 * 0.66)) },
      { name: "Final handover", due: datePlus(c.weeks * 7) }
    ],
    acceptanceCriteria: ["Deliverables match the agreed scope", "Files open and work as described", "Any exclusions or extra costs are approved before work begins"]
  };
  const recommendation = {
    title: "Recommendation",
    options: [
      pick ? { type: "listed", title: pick.title, student: pick.name, price: pick.price, deliveryDays: pick.days } : null,
      { type: "custom", note: "A custom quote is needed; no matching listing was found." }
    ].filter(Boolean),
    recommended: pick ? pick.title : "Request clarification / custom quote",
    estimatedTotal: total,
    budget: c.budget,
    withinBudget: total <= c.budget,
    remainingBudget: c.budget - total,
    note: pick ? "Listing prices and seller details are sample marketplace data; confirm availability and final scope with the student." : "No listing was confidently matched. Ask the owner to clarify the category or add a relevant listing."
  };
  const contract = {
    title: "Milestone contract (draft)",
    parties: ["Business owner", ...team.map(x => x.name)],
    total,
    currency: "MYR",
    payments: [
      { milestone: "Plan / first draft approval", percent: 30, amount: Math.round(total * 0.30) },
      { milestone: "Build milestone accepted", percent: 40, amount: Math.round(total * 0.40) },
      { milestone: "Final handover accepted", percent: 30, amount: total - Math.round(total * 0.30) - Math.round(total * 0.40) }
    ],
    terms: ["Scope is defined in scope.md", "Changes outside scope require written agreement and a revised quote", "Payments should only be released after human review of the milestone"],
    disclaimer: "Illustrative draft only, not legal advice. Do not treat this as a signed contract or process real payments automatically."
  };
  const meetingReport = {
    title: "Meeting report",
    decisions: pick ? [`Consider ${pick.title} as the starting point`] : ["Clarify project type and required deliverables"],
    actionItems: [
      { owner: "Business owner", action: "Provide content, branding assets and required features", due: datePlus(3) },
      { owner: "Student", action: "Confirm availability and share a first draft plan", due: datePlus(Math.max(4, Math.ceil(c.weeks * 7 * 0.25))) }
    ],
    outOfScope: ["Features not explicitly listed in scope require a separate quote and approval"]
  };
  const qaReport = {
    title: "QA report",
    checks: [
      { criterion: "Scope and acceptance criteria documented", status: "pass" },
      { criterion: "Student availability confirmed", status: "pending" },
      { criterion: "Delivered files tested against criteria", status: "not_run" }
    ],
    decision: "HOLD — this planning run cannot verify actual delivery. A human must test the work before approving or releasing payment.",
    paymentGuidance: "No real payment is initiated by this demo."
  };
  const runLog = {
    title: "Agent run log",
    mode: "deterministic-demo",
    steps: [
      { agent: "Planner agent", output: "scope.md" },
      { agent: "Concierge agent", output: "recommendation.md" },
      { agent: "Matcher agent", output: "team.json" },
      { agent: "Contract agent", output: "contract.json" },
      { agent: "Meeting agent", output: "meeting_report.json" },
      { agent: "QA agent", output: "qa_report.json" }
    ],
    note: "The current agents use rules and sample listings, not an external AI model."
  };
  return {
    parsedRequest: c,
    files: {
      "scope.json": scope,
      "recommendation.json": recommendation,
      "team.json": { title: "Student team", members: team, total, budget: c.budget, withinBudget: total <= c.budget },
      "contract.json": contract,
      "meeting_report.json": meetingReport,
      "qa_report.json": qaReport,
      "run_log.json": runLog
    },
    summary: { recommended: recommendation.recommended, estimatedTotal: total, withinBudget: total <= c.budget, agentCount: runLog.steps.length }
  };
}
module.exports = { runAgents, parseRequest };
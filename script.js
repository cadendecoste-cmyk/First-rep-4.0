// =======================
// FirstRep - v3 Feature Build
// Adds (without removing):
// - Custom sets (Auto/Custom)
// - More workout variety (variations per split)
// - Rest guidance based on rep range
// - Exercise alternatives display
// - PR celebration messaging
// - Built-in workout chat (offline coach + optional API mode)
// Keeps:
// - Rotation persisted
// - History + PRs persisted
// - Delete, export/import, clear all
// =======================

// ---------- Storage keys
const STORE = {
  dayIndex: "firstrep_dayIndex_v3",
  history: "firstrep_history_v3",
  prs: "firstrep_prs_v3",
  splitVarIndex: "firstrep_splitVarIndex_v3", // per split variation rotation
  chat: "firstrep_chat_v3"
};

// ---------- Rep range => rest guidance
// You requested examples like:
// 10–12 => 1–2 min
// 6–10  => 2–3 min
const REST_RULES = [
  { min: 1,  max: 5,  rest: "3–5 min",  note: "Heavy strength work" },
  { min: 6,  max: 10, rest: "2–3 min",  note: "Strength / hypertrophy" },
  { min: 10, max: 12, rest: "1–2 min",  note: "Hypertrophy" },
  { min: 12, max: 20, rest: "45–90 sec", note: "Higher reps / conditioning" }
];

function restForRepRange(rangeStr) {
  // rangeStr like "6-10" or "10-12"
  const m = String(rangeStr).match(/(\d+)\s*-\s*(\d+)/);
  if (!m) return { rest: "1–2 min", note: "" };
  const min = Number(m[1]);
  const max = Number(m[2]);
  for (const r of REST_RULES) {
    if (min >= r.min && max <= r.max) return { rest: r.rest, note: r.note };
  }
  // fallback: use min
  for (const r of REST_RULES) {
    if (min >= r.min && min <= r.max) return { rest: r.rest, note: r.note };
  }
  return { rest: "1–2 min", note: "" };
}

// ---------- Workout split logic (same idea as your original)
function getSplit(days) {
  if (days === 6) return ["push", "pull", "legs"];   // repeats across 6 days
  if (days === 5) return ["upper", "lower", "arms"];
  if (days === 4) return ["upper", "lower"];
  return ["full"]; // 1–3 days => full body
}

// ---------- Workout library with VARIATIONS + alternatives + rep ranges
// Each split has multiple session "variations".
// Each exercise is an object: { name, repRange, alternatives[] }
const LIB = {
  push: [
    [
      { name: "Barbell Bench Press", repRange: "6-10", alternatives: ["Dumbbell Bench Press", "Machine Chest Press", "Push-Ups"] },
      { name: "Seated Dumbbell Shoulder Press", repRange: "8-12", alternatives: ["Machine Shoulder Press", "Standing Dumbbell Press", "Landmine Press"] },
      { name: "Incline Dumbbell Press", repRange: "8-12", alternatives: ["Incline Machine Press", "Incline Barbell Press", "Push-Ups (feet elevated)"] },
      { name: "Cable Tricep Pushdown", repRange: "10-12", alternatives: ["Rope Pushdown", "Dips (assisted)", "Close-Grip Push-Ups"] }
    ],
    [
      { name: "Machine Chest Press", repRange: "8-12", alternatives: ["Barbell Bench Press", "Dumbbell Bench Press", "Push-Ups"] },
      { name: "Lateral Raises", repRange: "12-15", alternatives: ["Cable Lateral Raise", "Machine Lateral Raise", "Lean-Away DB Lateral Raise"] },
      { name: "Incline Machine Press", repRange: "10-12", alternatives: ["Incline DB Press", "Incline Barbell Press", "Push-Ups (feet elevated)"] },
      { name: "Overhead Tricep Extension", repRange: "10-12", alternatives: ["Cable OH Extension", "Skull Crushers", "Close-Grip Bench (light)"] }
    ],
    [
      { name: "Dumbbell Bench Press", repRange: "8-12", alternatives: ["Machine Chest Press", "Barbell Bench Press", "Push-Ups"] },
      { name: "Arnold Press", repRange: "8-12", alternatives: ["Seated DB Press", "Machine Shoulder Press", "Landmine Press"] },
      { name: "Cable Fly", repRange: "12-15", alternatives: ["Pec Deck", "DB Fly (light)", "Push-Up Plus"] },
      { name: "Tricep Dips (assisted)", repRange: "8-12", alternatives: ["Bench Dips", "Cable Pushdown", "Close-Grip Push-Ups"] }
    ]
  ],

  pull: [
    [
      { name: "Lat Pulldown", repRange: "8-12", alternatives: ["Assisted Pull-Ups", "Band Pull-Downs", "High Row Machine"] },
      { name: "Seated Cable Row", repRange: "8-12", alternatives: ["Chest-Supported Row", "Dumbbell Row", "Machine Row"] },
      { name: "Face Pull", repRange: "12-15", alternatives: ["Rear Delt Fly", "Band Face Pull", "Reverse Pec Deck"] },
      { name: "Dumbbell Curl", repRange: "10-12", alternatives: ["Cable Curl", "EZ-Bar Curl", "Hammer Curl"] }
    ],
    [
      { name: "Assisted Pull-Ups", repRange: "6-10", alternatives: ["Lat Pulldown", "Band-Assisted Pull-Ups", "High Row Machine"] },
      { name: "Chest-Supported Row", repRange: "8-12", alternatives: ["Seated Row", "Dumbbell Row", "Machine Row"] },
      { name: "Reverse Pec Deck", repRange: "12-15", alternatives: ["Rear Delt Fly", "Face Pull", "Band Pull-Aparts"] },
      { name: "Hammer Curl", repRange: "10-12", alternatives: ["Incline DB Curl", "Cable Curl", "EZ-Bar Curl"] }
    ],
    [
      { name: "High Row Machine", repRange: "8-12", alternatives: ["Lat Pulldown", "Assisted Pull-Ups", "Band Pull-Downs"] },
      { name: "One-Arm Dumbbell Row", repRange: "8-12", alternatives: ["Seated Row", "Machine Row", "Chest-Supported Row"] },
      { name: "Rear Delt Fly", repRange: "12-15", alternatives: ["Face Pull", "Reverse Pec Deck", "Band Pull-Aparts"] },
      { name: "Cable Curl", repRange: "10-12", alternatives: ["DB Curl", "EZ-Bar Curl", "Hammer Curl"] }
    ]
  ],

  legs: [
    [
      { name: "Leg Press", repRange: "8-12", alternatives: ["Goblet Squat", "Hack Squat Machine", "Smith Squat (light)"] },
      { name: "Goblet Squat", repRange: "8-12", alternatives: ["Leg Press", "Smith Squat", "Bodyweight Squat (slow)"] },
      { name: "Hamstring Curl", repRange: "10-12", alternatives: ["Romanian Deadlift (light)", "Glute Bridge", "Swiss Ball Curl"] },
      { name: "Standing Calf Raise", repRange: "12-15", alternatives: ["Seated Calf Raise", "Leg Press Calf Press", "Single-Leg Calf Raise"] }
    ],
    [
      { name: "Hack Squat Machine", repRange: "6-10", alternatives: ["Leg Press", "Goblet Squat", "Smith Squat"] },
      { name: "Romanian Deadlift (DB)", repRange: "8-12", alternatives: ["Hamstring Curl", "Good Morning (light)", "Hip Hinge with KB"] },
      { name: "Walking Lunges", repRange: "10-12", alternatives: ["Split Squat", "Step-Ups", "Leg Press (higher reps)"] },
      { name: "Seated Calf Raise", repRange: "12-15", alternatives: ["Standing Calf Raise", "Single-Leg Calf Raise", "Leg Press Calf Press"] }
    ],
    [
      { name: "Smith Squat (light)", repRange: "8-12", alternatives: ["Leg Press", "Goblet Squat", "Hack Squat"] },
      { name: "Leg Extension", repRange: "10-12", alternatives: ["Split Squat", "Step-Ups", "Goblet Squat (slow)"] },
      { name: "Hamstring Curl", repRange: "10-12", alternatives: ["RDL (DB)", "Glute Bridge", "Swiss Ball Curl"] },
      { name: "Calf Raises (any)", repRange: "12-15", alternatives: ["Standing Calf Raise", "Seated Calf Raise", "Single-Leg Calf Raise"] }
    ]
  ],

  upper: [
    [
      { name: "Chest Press", repRange: "8-12", alternatives: ["Bench Press", "DB Bench Press", "Push-Ups"] },
      { name: "Lat Pulldown", repRange: "8-12", alternatives: ["Assisted Pull-Ups", "High Row Machine", "Band Pull-Downs"] },
      { name: "Seated Dumbbell Shoulder Press", repRange: "8-12", alternatives: ["Machine Shoulder Press", "Arnold Press", "Landmine Press"] },
      { name: "Seated Cable Row", repRange: "8-12", alternatives: ["Chest-Supported Row", "Machine Row", "DB Row"] }
    ],
    [
      { name: "Dumbbell Bench Press", repRange: "8-12", alternatives: ["Chest Press Machine", "Bench Press", "Push-Ups"] },
      { name: "High Row Machine", repRange: "8-12", alternatives: ["Lat Pulldown", "Assisted Pull-Ups", "Band Pull-Downs"] },
      { name: "Lateral Raises", repRange: "12-15", alternatives: ["Cable Lateral Raise", "Machine Lateral Raise", "Lean-Away DB Raise"] },
      { name: "Chest-Supported Row", repRange: "8-12", alternatives: ["Seated Row", "Machine Row", "DB Row"] }
    ]
  ],

  lower: [
    [
      { name: "Leg Press", repRange: "8-12", alternatives: ["Goblet Squat", "Hack Squat", "Smith Squat (light)"] },
      { name: "Hamstring Curl", repRange: "10-12", alternatives: ["RDL (DB)", "Glute Bridge", "Swiss Ball Curl"] },
      { name: "Split Squat", repRange: "8-12", alternatives: ["Lunges", "Step-Ups", "Leg Press (higher reps)"] },
      { name: "Calf Raise", repRange: "12-15", alternatives: ["Seated Calf Raise", "Standing Calf Raise", "Single-Leg Calf Raise"] }
    ],
    [
      { name: "Hack Squat Machine", repRange: "6-10", alternatives: ["Leg Press", "Goblet Squat", "Smith Squat"] },
      { name: "Romanian Deadlift (DB)", repRange: "8-12", alternatives: ["Hamstring Curl", "Hip Hinge (KB)", "Glute Bridge"] },
      { name: "Leg Extension", repRange: "10-12", alternatives: ["Step-Ups", "Split Squat", "Goblet Squat (slow)"] },
      { name: "Seated Calf Raise", repRange: "12-15", alternatives: ["Standing Calf Raise", "Single-Leg Calf Raise", "Leg Press Calf Press"] }
    ]
  ],

  arms: [
    [
      { name: "EZ-Bar Curl", repRange: "8-12", alternatives: ["DB Curl", "Cable Curl", "Hammer Curl"] },
      { name: "Hammer Curl", repRange: "10-12", alternatives: ["Incline DB Curl", "Cable Curl", "DB Curl"] },
      { name: "Cable Tricep Pushdown", repRange: "10-12", alternatives: ["Rope Pushdown", "Dips (assisted)", "Close-Grip Push-Ups"] },
      { name: "Overhead Tricep Extension", repRange: "10-12", alternatives: ["Cable OH Extension", "Skull Crushers", "Tricep Pushdown"] }
    ],
    [
      { name: "Incline Dumbbell Curl", repRange: "10-12", alternatives: ["DB Curl", "Cable Curl", "EZ-Bar Curl"] },
      { name: "Cable Curl", repRange: "10-12", alternatives: ["DB Curl", "EZ-Bar Curl", "Hammer Curl"] },
      { name: "Skull Crushers (light)", repRange: "8-12", alternatives: ["Overhead Extension", "Cable Pushdown", "Close-Grip Push-Ups"] },
      { name: "Rope Pushdown", repRange: "10-12", alternatives: ["Cable Pushdown", "Dips (assisted)", "Overhead Extension"] }
    ]
  ],

  full: [
    [
      { name: "Chest Press", repRange: "8-12", alternatives: ["DB Bench Press", "Bench Press", "Push-Ups"] },
      { name: "Lat Pulldown", repRange: "8-12", alternatives: ["Assisted Pull-Ups", "High Row Machine", "Band Pull-Downs"] },
      { name: "Leg Press", repRange: "8-12", alternatives: ["Goblet Squat", "Hack Squat", "Smith Squat (light)"] },
      { name: "Plank", repRange: "30-60", alternatives: ["Dead Bug", "Pallof Press", "Side Plank"] }
    ],
    [
      { name: "Dumbbell Bench Press", repRange: "8-12", alternatives: ["Chest Press Machine", "Bench Press", "Push-Ups"] },
      { name: "Seated Cable Row", repRange: "8-12", alternatives: ["Chest-Supported Row", "Machine Row", "DB Row"] },
      { name: "Goblet Squat", repRange: "8-12", alternatives: ["Leg Press", "Smith Squat", "Bodyweight Squat"] },
      { name: "Dead Bug", repRange: "10-12", alternatives: ["Plank", "Pallof Press", "Bird Dog"] }
    ]
  ]
};

// ---------- DOM
const form = document.getElementById("workoutForm");
const outputEl = document.getElementById("output");
const historyEl = document.getElementById("history");
const prsEl = document.getElementById("prs");

const statusEl = document.getElementById("status");
const rotationHintEl = document.getElementById("rotationHint");

const resetRotationBtn = document.getElementById("resetRotationBtn");
const clearAllBtn = document.getElementById("clearAllBtn");
const exportBtn = document.getElementById("exportBtn");
const importFile = document.getElementById("importFile");

const setsModeEl = document.getElementById("setsMode");
const customSetsEl = document.getElementById("customSets");

// Chat
const chatLogEl = document.getElementById("chatLog");
const chatInputEl = document.getElementById("chatInput");
const chatSendBtn = document.getElementById("chatSendBtn");
const chatModeBadge = document.getElementById("chatModeBadge");

// ---------- UI helpers
function setStatus(message = "", type = "") {
  statusEl.textContent = message;
  statusEl.className = `status ${type}`.trim();
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}
function writeJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getDayIndex() {
  const v = Number(localStorage.getItem(STORE.dayIndex));
  return Number.isFinite(v) && v >= 0 ? v : 0;
}
function setDayIndex(v) {
  localStorage.setItem(STORE.dayIndex, String(v));
}

function nowISO() {
  return new Date().toISOString();
}
function prettyDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function isValidDays(d) {
  return Number.isFinite(d) && d >= 1 && d <= 6;
}
function isValidTime(t) {
  return Number.isFinite(t) && t >= 20 && t <= 180;
}

function setsForTime(minutes) {
  if (minutes <= 30) return 2;
  if (minutes <= 45) return 3;
  return 4;
}

function uid() {
  return `w_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function sanitizeNumberOrNull(raw) {
  if (raw === "") return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  if (n < 0) return null;
  return n;
}

// ---------- Split variation rotation
function getSplitVarIndexMap() {
  const m = readJSON(STORE.splitVarIndex, {});
  return (m && typeof m === "object") ? m : {};
}
function setSplitVarIndexMap(map) {
  writeJSON(STORE.splitVarIndex, map);
}
function pickVariation(split) {
  const variations = LIB[split] || [];
  if (variations.length === 0) return { variationIndex: 0, session: [] };

  const map = getSplitVarIndexMap();
  const idx = Number(map[split] ?? 0);
  const session = variations[idx % variations.length];

  // advance split variation index
  map[split] = idx + 1;
  setSplitVarIndexMap(map);

  return { variationIndex: idx % variations.length, session };
}

// ---------- Rotation hint
function renderRotationHint(days) {
  const cycle = getSplit(days);
  const idx = getDayIndex();
  const nextSplit = cycle[idx % cycle.length];

  // what variation is "next"? we do not advance it here; just show count.
  const variations = LIB[nextSplit]?.length ?? 1;
  rotationHintEl.textContent = `Next in rotation: ${nextSplit.toUpperCase()} (has ${variations} workout variations)`;
}

// ---------- Sets mode handling
setsModeEl.addEventListener("change", () => {
  const mode = setsModeEl.value;
  customSetsEl.disabled = (mode !== "custom");
});

// =======================
// Generate workout
// =======================
form.addEventListener("submit", (e) => {
  e.preventDefault();
  setStatus("");

  const days = Number(document.getElementById("days").value);
  const time = Number(document.getElementById("time").value);

  if (!isValidDays(days)) {
    setStatus("Days per week must be between 1 and 6.", "err");
    return;
  }
  if (!isValidTime(time)) {
    setStatus("Time must be at least 20 minutes (max 180).", "err");
    return;
  }

  // sets selection
  let sets = setsForTime(time);
  if (setsModeEl.value === "custom") {
    const cs = Number(customSetsEl.value);
    if (!Number.isFinite(cs) || cs < 1 || cs > 6) {
      setStatus("Custom sets must be between 1 and 6.", "err");
      return;
    }
    sets = cs;
  }

  const cycle = getSplit(days);
  const dayIndex = getDayIndex();
  const split = cycle[dayIndex % cycle.length];

  // advance day rotation immediately
  setDayIndex(dayIndex + 1);
  renderRotationHint(days);

  const workoutId = uid();
  const { variationIndex, session } = pickVariation(split);

  outputEl.innerHTML = `
    <h2>Today's Workout (${escapeHtml(split).toUpperCase()} • Variation ${variationIndex + 1})</h2>
    <p class="mini">
      Sets per exercise: <strong>${sets}</strong>. Enter weight + reps for at least one exercise, then Save.
    </p>
    <div id="exerciseList"></div>
    <div class="row">
      <button type="button" id="saveBtn">Save Workout</button>
      <button type="button" id="clearWorkoutBtn" class="secondary">Clear</button>
    </div>
  `;

  const list = document.getElementById("exerciseList");
  list.innerHTML = session.map((ex, i) => {
    const rest = restForRepRange(ex.repRange);
    return `
      <div class="exercise" data-name="${escapeHtml(ex.name)}" data-reprange="${escapeHtml(ex.repRange)}" data-i="${i}">
        <div class="exercise-title">
          <div>
            <strong>${escapeHtml(ex.name)}</strong><br>
            <small>${sets} sets × <strong>${escapeHtml(ex.repRange)}</strong> reps</small>
          </div>
          <small>Rest: <strong>${escapeHtml(rest.rest)}</strong></small>
        </div>

        <div class="mini">Rest note: ${escapeHtml(rest.note || "General training")}</div>

        <div class="inputs">
          <label>
            Weight (lbs)
            <input type="number" min="0" step="0.5" inputmode="decimal" data-weight />
          </label>
          <label>
            Reps
            <input type="number" min="0" step="1" inputmode="numeric" data-reps />
          </label>
        </div>

        <div class="row">
          <button type="button" class="secondary" data-toggle-alt="${i}">Show alternatives</button>
        </div>

        <div class="details" id="alt_${i}" style="display:none;">
          <strong>Alternatives if equipment is busy:</strong>
          <ul class="altList">
            ${(ex.alternatives || []).map(a => `<li>${escapeHtml(a)}</li>`).join("")}
          </ul>
        </div>
      </div>
    `;
  }).join("");

  // alt toggles
  list.querySelectorAll("[data-toggle-alt]").forEach(btn => {
    btn.addEventListener("click", () => {
      const i = btn.getAttribute("data-toggle-alt");
      const box = document.getElementById(`alt_${i}`);
      const isOpen = box.style.display !== "none";
      box.style.display = isOpen ? "none" : "block";
      btn.textContent = isOpen ? "Show alternatives" : "Hide alternatives";
    });
  });

  document.getElementById("saveBtn").addEventListener("click", () => {
    saveWorkout({ id: workoutId, split, sets, variationIndex });
  });

  document.getElementById("clearWorkoutBtn").addEventListener("click", () => {
    outputEl.innerHTML = "";
    setStatus("Workout cleared (not saved).", "ok");
  });

  setStatus("Workout generated. Rotation + variation advanced.", "ok");
});

// =======================
// Save workout + PR update + PR celebration
// =======================
function saveWorkout({ id, split, sets, variationIndex }) {
  setStatus("");

  const cards = Array.from(document.querySelectorAll(".exercise"));
  if (cards.length === 0) {
    setStatus("No workout to save. Generate a workout first.", "err");
    return;
  }

  const history = readJSON(STORE.history, []);
  const prs = readJSON(STORE.prs, {});
  const exercises = [];

  let hasAnyEntry = false;
  const prHits = []; // list of { name, old, next }

  for (const card of cards) {
    const name = card.getAttribute("data-name") || "Exercise";
    const repRange = card.getAttribute("data-reprange") || "8-12";

    const wRaw = card.querySelector("[data-weight]").value;
    const rRaw = card.querySelector("[data-reps]").value;

    const weight = sanitizeNumberOrNull(wRaw);
    const reps = sanitizeNumberOrNull(rRaw);

    const hasWeight = weight !== null;
    const hasReps = reps !== null;

    if (hasWeight || hasReps) hasAnyEntry = true;

    exercises.push({ name, repRange, weight, reps, sets });

    // PR update only if both present
    if (hasWeight && hasReps) {
      const current = prs[name];
      const candidate = { weight, reps, achievedAt: nowISO() };

      const isBetter =
        !current ||
        candidate.weight > current.weight ||
        (candidate.weight === current.weight && candidate.reps > current.reps);

      if (isBetter) {
        if (current) prHits.push({ name, old: current, next: candidate });
        else prHits.push({ name, old: null, next: candidate });

        prs[name] = candidate;
      }
    }
  }

  if (!hasAnyEntry) {
    setStatus("Enter weight/reps for at least one exercise before saving.", "err");
    return;
  }

  const workout = {
    id,
    createdAt: nowISO(),
    split,
    variationIndex,
    sets,
    exercises
  };

  history.unshift(workout);

  writeJSON(STORE.history, history);
  writeJSON(STORE.prs, prs);

  renderHistory();
  renderPRs();

  if (prHits.length > 0) {
    const msg = buildPRCongrats(prHits);
    setStatus("Saved. PRs updated—nice work.", "ok");
    alert(msg);
  } else {
    setStatus("Saved. History and PRs updated.", "ok");
  }
}

function buildPRCongrats(prHits) {
  const lines = prHits.slice(0, 4).map(hit => {
    const oldTxt = hit.old ? `${hit.old.weight} lbs × ${hit.old.reps}` : "First record!";
    const newTxt = `${hit.next.weight} lbs × ${hit.next.reps}`;
    return `• ${hit.name}: ${oldTxt} → ${newTxt}`;
  });
  const more = prHits.length > 4 ? `\n(+${prHits.length - 4} more PRs)` : "";
  return `PR HIT. CONGRATS.\n\n${lines.join("\n")}${more}\n\nKeep going—small wins compound.`;
}

// =======================
// Render history
// =======================
function renderHistory() {
  const history = readJSON(STORE.history, []);

  if (!Array.isArray(history) || history.length === 0) {
    historyEl.innerHTML = `<p class="mini">No workouts saved yet.</p>`;
    return;
  }

  historyEl.innerHTML = history.map((w) => {
    const lines = (w.exercises || []).map(ex => {
      const wt = ex.weight === null ? "—" : `${ex.weight} lbs`;
      const rp = ex.reps === null ? "—" : `${ex.reps} reps`;
      const rest = restForRepRange(ex.repRange);
      return `${escapeHtml(ex.name)}: ${wt} × ${rp} (${ex.sets} sets) • Rest ${escapeHtml(rest.rest)}`;
    }).join("<br>");

    return `
      <div class="history-item">
        <div class="row space-between">
          <div>
            <strong>${prettyDate(w.createdAt)}</strong> — ${escapeHtml(w.split).toUpperCase()}
            <div class="mini">Variation: ${Number(w.variationIndex ?? 0) + 1} • Workout ID: ${escapeHtml(w.id)}</div>
          </div>
          <button class="secondary danger" data-del="${escapeHtml(w.id)}">Delete</button>
        </div>
        <hr class="sep" />
        <div class="mini">${lines}</div>
      </div>
    `;
  }).join("");

  historyEl.querySelectorAll("[data-del]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-del");
      deleteWorkout(id);
    });
  });
}

function deleteWorkout(id) {
  const history = readJSON(STORE.history, []);
  const next = history.filter(w => w.id !== id);
  writeJSON(STORE.history, next);
  renderHistory();
  setStatus("Workout deleted. (PRs are not recalculated automatically.)", "ok");
}

// =======================
// Render PRs
// =======================
function renderPRs() {
  const prs = readJSON(STORE.prs, {});
  const keys = Object.keys(prs);

  if (keys.length === 0) {
    prsEl.innerHTML = `<p class="mini">No PRs yet. Save workouts with weight + reps.</p>`;
    return;
  }

  keys.sort((a, b) => a.localeCompare(b));

  prsEl.innerHTML = keys.map((name) => {
    const pr = prs[name];
    const when = pr.achievedAt ? ` • ${prettyDate(pr.achievedAt)}` : "";
    return `
      <div class="pr-item">
        <strong>${escapeHtml(name)}</strong><br />
        Best: ${pr.weight} lbs × ${pr.reps} reps${escapeHtml(when)}
      </div>
    `;
  }).join("");
}

// =======================
// Reset rotation
// =======================
resetRotationBtn.addEventListener("click", () => {
  setDayIndex(0);
  renderRotationHint(Number(document.getElementById("days").value) || 3);
  setStatus("Rotation reset to the start.", "ok");
});

// =======================
// Clear all data
// =======================
clearAllBtn.addEventListener("click", () => {
  const ok = confirm("This will delete ALL FirstRep history, PRs, rotation, variations, and chat. Continue?");
  if (!ok) return;

  Object.values(STORE).forEach(k => localStorage.removeItem(k));

  outputEl.innerHTML = "";
  renderHistory();
  renderPRs();
  renderRotationHint(Number(document.getElementById("days").value) || 3);
  renderChat();
  setStatus("All data cleared.", "ok");
});

// =======================
// Export / Import
// =======================
exportBtn.addEventListener("click", () => {
  const payload = {
    version: "firstrep-v3",
    exportedAt: nowISO(),
    dayIndex: getDayIndex(),
    splitVarIndex: readJSON(STORE.splitVarIndex, {}),
    history: readJSON(STORE.history, []),
    prs: readJSON(STORE.prs, {}),
    chat: readJSON(STORE.chat, [])
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "firstrep-export.json";
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
  setStatus("Export downloaded.", "ok");
});

importFile.addEventListener("change", async (e) => {
  setStatus("");
  const file = e.target.files?.[0];
  if (!file) return;

  try {
    const text = await file.text();
    const data = JSON.parse(text);

    if (typeof data.dayIndex === "number") setDayIndex(data.dayIndex);
    if (data.splitVarIndex && typeof data.splitVarIndex === "object") writeJSON(STORE.splitVarIndex, data.splitVarIndex);
    if (Array.isArray(data.history)) writeJSON(STORE.history, data.history);
    if (data.prs && typeof data.prs === "object") writeJSON(STORE.prs, data.prs);
    if (Array.isArray(data.chat)) writeJSON(STORE.chat, data.chat);

    renderHistory();
    renderPRs();
    renderChat();

    const days = Number(document.getElementById("days").value) || 3;
    renderRotationHint(days);

    setStatus("Import complete.", "ok");
  } catch {
    setStatus("Import failed. Please upload a valid firstrep-export.json file.", "err");
  } finally {
    e.target.value = "";
  }
});

// =======================
// CHAT (Offline Coach + optional API mode placeholder)
// =======================

// By default: offline coach (no internet, no API keys).
// If you later want real AI:
// 1) set CHAT_MODE = "api"
// 2) provide your own backend endpoint (recommended) or a direct model call (not recommended in frontend)
// This file intentionally stays safe for GitHub Pages (static hosting).
const CHAT_MODE = "offline"; // "offline" | "api"
chatModeBadge.textContent = CHAT_MODE === "api" ? "API Coach" : "Offline Coach";

function getChat() {
  const arr = readJSON(STORE.chat, []);
  return Array.isArray(arr) ? arr : [];
}
function setChat(arr) {
  writeJSON(STORE.chat, arr);
}
function addChatMsg(role, text) {
  const chat = getChat();
  chat.push({ id: uid(), at: nowISO(), role, text });
  setChat(chat);
  renderChat(true);
}
function renderChat(scrollToBottom = false) {
  const chat = getChat();
  if (chat.length === 0) {
    chatLogEl.innerHTML = `<div class="mini muted">No messages yet.</div>`;
    return;
  }
  chatLogEl.innerHTML = chat.map(m => `
    <div class="chatMsg ${m.role === "user" ? "user" : "bot"}">
      <div class="who">${m.role === "user" ? "You" : "Coach"}</div>
      <div class="txt">${escapeHtml(m.text)}</div>
      <div class="mini muted">${prettyDate(m.at)}</div>
    </div>
  `).join("");

  if (scrollToBottom) chatLogEl.scrollTop = chatLogEl.scrollHeight;
}

chatSendBtn.addEventListener("click", onChatSend);
chatInputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") onChatSend();
});

async function onChatSend() {
  const q = chatInputEl.value.trim();
  if (!q) return;

  chatInputEl.value = "";
  addChatMsg("user", q);

  if (CHAT_MODE === "api") {
    addChatMsg("bot", "API mode is not configured in this static build. Use offline coach or add a backend endpoint.");
    return;
  }

  // offline coach response
  const answer = offlineCoach(q);
  addChatMsg("bot", answer);
}

function offlineCoach(q) {
  const text = q.toLowerCase();

  // Simple “smart” helpers based on your app’s features
  if (text.includes("rest") || text.includes("how long")) {
    return [
      "Rest guidance (simple rule):",
      "• 1–5 reps: 3–5 min",
      "• 6–10 reps: 2–3 min",
      "• 10–12 reps: 1–2 min",
      "• 12–20 reps: 45–90 sec",
      "",
      "If your last set was truly hard, take the high end of the range."
    ].join("\n");
  }

  if (text.includes("pr") || text.includes("progress")) {
    return [
      "For PRs, focus on one of these per session:",
      "1) Add 2.5–5 lb (upper body) or 5–10 lb (lower body), OR",
      "2) Add 1 rep at the same weight, OR",
      "3) Improve form/tempo and keep the same reps/weight.",
      "",
      "Your job is consistency—small wins compound."
    ].join("\n");
  }

  if (text.includes("form") || text.includes("hurt") || text.includes("pain")) {
    return [
      "If something hurts (sharp pain), stop that movement.",
      "Switch to an alternative, reduce range of motion, and lower load.",
      "General cues:",
      "• Rows: feel mid-back, keep ribs down, avoid shrugging.",
      "• Press: shoulder blades stable, elbows not flared aggressively.",
      "",
      "If pain persists across sessions, consider a qualified clinician."
    ].join("\n");
  }

  if (text.includes("busy") || text.includes("equipment") || text.includes("taken")) {
    return [
      "If equipment is busy:",
      "1) Use the alternatives button under the exercise.",
      "2) Keep the same pattern: press, row/pull, squat/hinge, core.",
      "3) Match the rep range in the plan and keep rest similar."
    ].join("\n");
  }

  if (text.includes("sets") || text.includes("how many sets")) {
    return [
      "Beginner default: 2–4 sets per exercise.",
      "Use these rules:",
      "• Short time: 2 sets",
      "• Normal time: 3 sets",
      "• Long time / feeling great: 4 sets",
      "",
      "Quality reps beat junk volume."
    ].join("\n");
  }

  // fallback
  return [
    "I can help with:",
    "• exercise form cues",
    "• rest time and pacing",
    "• substitutions when equipment is busy",
    "• how to progress reps/weight",
    "",
    "Ask your question with the exercise name and what you’re feeling."
  ].join("\n");
}

// =======================
// Initial render
// =======================
renderHistory();
renderPRs();
renderRotationHint(Number(document.getElementById("days").value) || 3);
renderChat();

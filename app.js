// app.js — KidsCollab Submission Generator

const SUBSECTIONS = {
  KidsCollab:  ["Fiction", "Non-Fiction", "Poetry", "Speeches", "Persuasive", "Reports", "Science Fiction", "Diaries", "Video Game Reviews", "Write 4 Fun"],
  KidsPerplex: ["Puzzles", "Brain Teasers", "Chrome Music Labs Music"],
  QuizCollab:  [],
  ColLabs:     [],
};

// Custom categories added by user per section
const customCategories = { KidsCollab: [], KidsPerplex: [], QuizCollab: [], ColLabs: [] };

// ── State ────────────────────────────────────────────────────────────────────
const state = {
  title:    "",
  section:  "KidsCollab",
  category: "Fiction",
  authors:  [],
  draft:    false,
  extra:    [],
  content:  "",
};

// ── LocalStorage persistence ─────────────────────────────────────────────────
const STORAGE_KEY = "kidscollab_draft";

function saveDraft() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ state, customCategories }));
}

function loadDraft() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return false;
  try {
    const { state: savedState, customCategories: savedCats } = JSON.parse(saved);
    Object.assign(state, savedState);
    Object.assign(customCategories, savedCats);
    return true;
  } catch (e) {
    console.error("Failed to load draft:", e);
    return false;
  }
}

function clearDraft() {
  localStorage.removeItem(STORAGE_KEY);
  Object.assign(state, {
    title:    "",
    section:  "KidsCollab",
    category: "Fiction",
    authors:  [],
    draft:    false,
    extra:    [],
    content:  "",
  });
  Object.assign(customCategories, { KidsCollab: [], KidsPerplex: [], QuizCollab: [], ColLabs: [] });
}

// ── DOM refs ─────────────────────────────────────────────────────────────────
const titleInput    = document.getElementById("title");
const sectionSeg    = document.getElementById("section-seg");
const categoryChips = document.getElementById("category-chips");
const authorInput   = document.getElementById("author-input");
const addAuthorBtn  = document.getElementById("add-author-btn");
const authorTagsEl  = document.getElementById("author-tags");
const flagChips     = document.getElementById("flag-chips");
const contentArea   = document.getElementById("content");
const outputEl      = document.getElementById("output");
const copyAllBtn    = document.getElementById("copy-all-btn");
const copyFmBtn     = document.getElementById("copy-fm-btn");

// ── Helpers ───────────────────────────────────────────────────────────────────
function slugify(str) {
  // "Nathan W" → "NathanW", "Alvin C" → "AlvinC"
  return str.trim().replace(/\s+/g, "").replace(/[^a-zA-Z0-9]/g, "");
}

function fmtDate(d) {
  const days    = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const months  = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const date    = d.getDate();
  const suffix  = [11,12,13].includes(date % 100) ? "th"
                : date % 10 === 1 ? "st"
                : date % 10 === 2 ? "nd"
                : date % 10 === 3 ? "rd" : "th";
  const h   = d.getHours();
  const min = String(d.getMinutes()).padStart(2, "0");
  const sec = String(d.getSeconds()).padStart(2, "0");
  const ampm = h >= 12 ? "pm" : "am";
  const h12  = h % 12 || 12;
  return `${days[d.getDay()]}, ${months[d.getMonth()]} ${date}${suffix} ${d.getFullYear()}, ${h12}:${min}:${sec} ${ampm}`;
}

// Helper to generate an ID from title
function generateId(name) {
  const cleaned = name
    .replace(/\.md$/, "")   // remove extension (though not needed for title)
    .replace(/\s+/g, "")    // remove spaces
    .toLowerCase();         // lowercase
  return cleaned;
}

// ── Category chips ────────────────────────────────────────────
function renderCategoryChips() {
  const builtIn = SUBSECTIONS[state.section];
  const custom  = customCategories[state.section];
  const all     = [...builtIn, ...custom];

  // reset if current category not in combined list
  if (all.length && !all.includes(state.category)) state.category = all[0];
  const catChips = document.getElementById("category-chips");
  catChips.innerHTML = all.map(cat => `
    <button class="chip${state.category === cat ? ' active' : ''}" data-cat="${cat}">${cat}</button>
  `).join('') + `
    <button class="chip add-cat-btn" id="add-cat-btn" title="Add custom category">+</button>
  `;

  const catChips = document.getElementById("category-chips");
  catChips.querySelectorAll('.chip:not(.add-cat-btn)').forEach(btn => {
    btn.addEventListener('click', () => {
      state.category = btn.dataset.cat;
      renderCategoryChips();
      gen();
    });
  });

  document.getElementById('add-cat-btn').addEventListener('click', () => {
    const name = prompt('Custom category name:');
    if (!name || !name.trim()) return;
    const trimmed = name.trim();
    if (!customCategories[state.section].includes(trimmed) && !builtIn.includes(trimmed)) {
      customCategories[state.section].push(trimmed);
    }
    state.category = trimmed;
    renderCategoryChips();
    gen();
  });
}

// ── Section segmented control ─────────────────────────────────────────────────
sectionSeg.querySelectorAll(".seg").forEach(btn => {
  btn.addEventListener("click", () => {
    sectionSeg.querySelectorAll(".seg").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    state.section = btn.dataset.value;
    renderCategoryChips();
    gen();
  });
});

// ── Author management ─────────────────────────────────────────────────────────
function addAuthor() {
  const raw  = authorInput.value.trim();
  if (!raw) return;
  const slug = slugify(raw);
  if (!slug || state.authors.includes(slug)) {
    authorInput.value = "";
    return;
  }
  state.authors.push(slug);
  authorInput.value = "";
  renderAuthorTags();
  gen();
}

function removeAuthor(slug) {
  state.authors = state.authors.filter(a => a !== slug);
  renderAuthorTags();
  gen();
}

function renderAuthorTags() {
  authorTagsEl.innerHTML = state.authors.map(slug => `
    <span class="author-tag">
      author/${slug}
      <button class="remove" data-slug="${slug}" aria-label="Remove ${slug}">×</button>
    </span>
  `).join("");

  authorTagsEl.querySelectorAll(".remove").forEach(btn => {
    btn.addEventListener("click", () => removeAuthor(btn.dataset.slug));
  });
}

addAuthorBtn.addEventListener("click", addAuthor);
authorInput.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); addAuthor(); } });

// ── Flag chips ────────────────────────────────────────────────────────────────
flagChips.querySelectorAll(".chip").forEach(btn => {
  btn.addEventListener("click", () => {
    btn.classList.toggle("active");
    if (btn.dataset.field === "draft") {
      state.draft = btn.classList.contains("active");
    } else {
      const val = btn.dataset.value;
      if (state.extra.includes(val)) {
        state.extra = state.extra.filter(v => v !== val);
      } else {
        state.extra.push(val);
      }
    }
    gen();
  });
});

// ── Live inputs ───────────────────────────────────────────────────────────────
titleInput.addEventListener("input",   () => { state.title   = titleInput.value;   gen(); });
contentArea.addEventListener("input",  () => { state.content = contentArea.value;  gen(); });

// ── Generate ──────────────────────────────────────────────────────────────────
function buildFrontmatter() {
  const now     = new Date();
  const dateStr = fmtDate(now);
  const title   = state.title.trim() || "Untitled";
  const id      = generateId(title);

  const tags = [];
  tags.push(`section/${state.section}/${state.category.replace(/\s+/g, "")}`);
  state.authors.forEach(a => tags.push(`author/${a}`));
  state.extra.forEach(e => tags.push(`type/${e}`));

  const tagLines = tags.map(t => `  - ${t}`).join("\n");

  return [
    "---",
    `comments: true`,
    `title: ${title}`,
    `id: ${id}`,
    `draft: ${state.draft}`,
    `tags:`,
    tagLines,
    `creation_date: ${dateStr}`,
    `last_edit_date: ${dateStr}`,
    "---",
  ].join("\n");
}

function escHtml(str) {
  return str.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

function highlightLine(line) {
  // Unified syntax highlighting for a single line
  if (line === "---") return `<span class="fm-fence">---</span>`;
  if (/^\s{2}-\s/.test(line)) {
    const tag = escHtml(line.replace(/^\s{2}-\s/, ""));
    return `  <span class="fm-dash">-</span> <span class="fm-tag">${tag}</span>`;
  }
  if (/^[a-z_]+:/.test(line)) {
    const colon = line.indexOf(":");
    const key   = escHtml(line.slice(0, colon));
    const val   = escHtml(line.slice(colon + 1));
    return `<span class="fm-key">${key}</span><span class="fm-dash">:</span><span class="fm-val">${val}</span>`;
  }
  return `<span class="body-text">${escHtml(line)}</span>`;
}

function gen() {
  const fm      = buildFrontmatter();
  const body    = state.content ? "\n\n" + state.content : "";
  const full    = fm + body;

  // highlighted version for display
  const fmLines    = fm.split("\n");
  const bodyLines  = (body ? body.split("\n") : []);
  const allLines   = fmLines.concat(bodyLines);

  outputEl.innerHTML = allLines.map(line => highlightLine(line)).join("\n");

  // store plain version for copying
  outputEl.dataset.plain = full;

  // Save draft to LocalStorage
  saveDraft();
}

// ── Copy buttons ──────────────────────────────────────────────────────────────
function flashSuccess(btn, label) {
  const orig = btn.textContent;
  btn.textContent = "Copied!";
  btn.classList.add("success");
  btn.classList.remove("primary");
  setTimeout(() => {
    btn.textContent = label;
    btn.classList.remove("success");
    if (btn === copyAllBtn) btn.classList.add("primary");
  }, 1800);
}

function flashError(btn, label) {
  btn.textContent = "Failed";
  btn.classList.add("error");
  setTimeout(() => {
    btn.textContent = label;
    btn.classList.remove("error");
    if (btn === copyAllBtn) btn.classList.add("primary");
  }, 1800);
}

copyAllBtn.addEventListener("click", () => {
  if (!navigator.clipboard) {
    flashError(copyAllBtn, "Copy all");
    return;
  }
  navigator.clipboard.writeText(outputEl.dataset.plain || "").then(() => {
    flashSuccess(copyAllBtn, "Copy all");
  }).catch(err => {
    console.error("Clipboard error:", err);
    flashError(copyAllBtn, "Copy all");
  });
});

copyFmBtn.addEventListener("click", () => {
  if (!navigator.clipboard) {
    flashError(copyFmBtn, "Copy frontmatter");
    return;
  }
  const plain = outputEl.dataset.plain || "";
  const end   = plain.indexOf("---", 4);
  const fm    = end > -1 ? plain.slice(0, end + 3) : plain;
  navigator.clipboard.writeText(fm).then(() => {
    flashSuccess(copyFmBtn, "Copy frontmatter");
  }).catch(err => {
    console.error("Clipboard error:", err);
    flashError(copyFmBtn, "Copy frontmatter");
  });
});

// ── Keyboard shortcuts ─────────────────────────────────────────────────────────
document.addEventListener("keydown", (e) => {
  // Ctrl/Cmd + Enter to copy all
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    e.preventDefault();
    copyAllBtn.click();
  }
  // Escape to clear form
  if (e.key === "Escape") {
    if (confirm("Clear all data and start fresh?")) {
      clearDraft();
      titleInput.value = "";
      contentArea.value = "";
      authorTagsEl.innerHTML = "";
      flagChips.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
      renderCategoryChips();
      gen();
    }
  }
});

// ── Init ──────────────────────────────────────────────────────────────────────
if (loadDraft()) {
  // Restore form fields from saved state
  titleInput.value = state.title;
  contentArea.value = state.content;
  
  // Restore section selection
  sectionSeg.querySelectorAll(".seg").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.value === state.section);
  });
  
  // Restore author tags
  renderAuthorTags();
  
  // Restore draft flag
  flagChips.querySelectorAll(".chip").forEach(btn => {
    if (btn.dataset.field === "draft") {
      btn.classList.toggle("active", state.draft);
    } else if (state.extra.includes(btn.dataset.value)) {
      btn.classList.add("active");
    }
  });
}

renderCategoryChips();
gen();
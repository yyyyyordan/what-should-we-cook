(function () {
  const STORAGE_KEY = "wswc:v1:state";

  const state = loadState() || { meat: null, filters: [] };

  const meatGrid = document.getElementById("meatGrid");
  const filterChips = document.getElementById("filterChips");
  const results = document.getElementById("results");
  const countBar = document.getElementById("countBar");
  const clearBtn = document.getElementById("clearFilters");
  const modal = document.getElementById("modal");
  const modalClose = document.getElementById("modalClose");
  const modalTitle = document.getElementById("modalTitle");
  const modalDesc = document.getElementById("modalDesc");
  const modalMeta = document.getElementById("modalMeta");
  const modalTags = document.getElementById("modalTags");
  const modalSearch = document.getElementById("modalSearch");

  const METHOD_LABEL = {
    "air-fryer": "Air fryer",
    "oven": "Oven",
    "stovetop": "Stovetop",
    "grill": "Grill",
    "slow-cooker": "Slow cooker",
    "instant-pot": "Instant Pot",
    "no-cook": "No cook",
  };

  const EFFORT_LABEL = {
    easy: "Easy",
    medium: "Some effort",
    involved: "Weekend project",
  };

  function loadState() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch (_) { return null; }
  }
  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) {}
  }

  function renderMeats() {
    meatGrid.innerHTML = "";
    window.MEATS.forEach((m) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "meat-btn" + (state.meat === m.id ? " selected" : "");
      btn.setAttribute("role", "radio");
      btn.setAttribute("aria-checked", state.meat === m.id ? "true" : "false");
      btn.innerHTML = `<span class="emoji" aria-hidden="true">${m.emoji}</span><span class="label">${m.label}</span>`;
      btn.addEventListener("click", () => {
        state.meat = state.meat === m.id ? null : m.id;
        saveState();
        renderMeats();
        renderResults();
      });
      meatGrid.appendChild(btn);
    });
  }

  function renderFilters() {
    filterChips.innerHTML = "";
    window.FILTERS.forEach((f) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "chip" + (state.filters.includes(f.id) ? " on" : "");
      b.textContent = f.label;
      b.setAttribute("aria-pressed", state.filters.includes(f.id) ? "true" : "false");
      b.addEventListener("click", () => {
        const i = state.filters.indexOf(f.id);
        if (i === -1) state.filters.push(f.id);
        else state.filters.splice(i, 1);
        saveState();
        renderFilters();
        renderResults();
      });
      filterChips.appendChild(b);
    });
  }

  function matches(recipe) {
    if (state.meat && recipe.meat !== state.meat) return false;
    const methodFilters = ["air-fryer", "oven", "stovetop"];
    for (const f of state.filters) {
      if (methodFilters.includes(f)) {
        if (recipe.method !== f) return false;
      } else {
        if (!recipe.tags.includes(f)) return false;
      }
    }
    return true;
  }

  function renderResults() {
    results.innerHTML = "";
    if (!state.meat) {
      countBar.textContent = "";
      const empty = document.createElement("div");
      empty.className = "empty";
      empty.innerHTML = "<strong>Pick a protein to get started</strong>A bunch of ideas are waiting.";
      results.appendChild(empty);
      return;
    }

    const list = window.RECIPES.filter(matches);
    countBar.textContent = list.length === 1
      ? "1 recipe"
      : `${list.length} recipes`;

    if (list.length === 0) {
      const empty = document.createElement("div");
      empty.className = "empty";
      empty.innerHTML = "<strong>Nothing matches all those filters</strong>Try removing one or two.";
      results.appendChild(empty);
      return;
    }

    list.forEach((r) => {
      const card = document.createElement("article");
      card.className = "recipe";
      card.tabIndex = 0;
      card.setAttribute("role", "button");

      const metaBits = [];
      if (r.method) metaBits.push(METHOD_LABEL[r.method] || r.method);
      if (r.effort) metaBits.push(EFFORT_LABEL[r.effort] || r.effort);

      card.innerHTML = `
        <h3>${escapeHtml(r.name)}</h3>
        <p class="desc">${escapeHtml(r.desc)}</p>
        <div class="meta">
          ${metaBits.map((b, i) => `${i > 0 ? '<span class="dot"></span>' : ''}<span>${escapeHtml(b)}</span>`).join("")}
        </div>
      `;

      card.addEventListener("click", () => openModal(r));
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openModal(r); }
      });
      results.appendChild(card);
    });
  }

  function openModal(r) {
    modalTitle.textContent = r.name;
    modalDesc.textContent = r.desc;

    modalMeta.innerHTML = "";
    const bits = [];
    if (r.method) bits.push(METHOD_LABEL[r.method] || r.method);
    if (r.effort) bits.push(EFFORT_LABEL[r.effort] || r.effort);
    bits.forEach((b, i) => {
      if (i > 0) {
        const dot = document.createElement("span");
        dot.className = "dot";
        modalMeta.appendChild(dot);
      }
      const s = document.createElement("span");
      s.textContent = b;
      modalMeta.appendChild(s);
    });

    modalTags.innerHTML = "";
    r.tags.forEach((t) => {
      const chip = document.createElement("span");
      chip.className = "chip on small";
      chip.textContent = labelForTag(t);
      modalTags.appendChild(chip);
    });

    modalSearch.href = "https://www.google.com/search?q=" + encodeURIComponent(r.name + " recipe");

    modal.hidden = false;
    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    modal.hidden = true;
    document.body.style.overflow = "";
  }

  function labelForTag(t) {
    const f = window.FILTERS.find((x) => x.id === t);
    if (f) return f.label;
    return t.replace(/-/g, " ");
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  clearBtn.addEventListener("click", () => {
    state.filters = [];
    saveState();
    renderFilters();
    renderResults();
  });

  modalClose.addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !modal.hidden) closeModal(); });

  renderMeats();
  renderFilters();
  renderResults();
})();

(function () {
  const TODAY = new Date("2026-11-24T14:30:00+02:00");
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function parseDate(iso) { return new Date(iso); }
  function daysLeft(iso) {
    const d = parseDate(iso);
    return Math.ceil((d - TODAY) / 86400000);
  }
  function fmtDate(iso) {
    const d = parseDate(iso);
    return d.toLocaleDateString("he-IL", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jerusalem" }) +
      (iso.includes("T") ? ", " + d.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jerusalem" }) : "");
  }
  function fmtMoney(n) {
    if (!n) return "";
    return n.toLocaleString("he-IL") + " ₪";
  }
  function dueChip(iso) {
    const n = daysLeft(iso);
    if (n <= 14) return { cls: "due-soon", text: n <= 0 ? "נסגר היום" : "נסגר בעוד " + n + " ימים" };
    if (n <= 30) return { cls: "due-mid", text: "נסגר בעוד " + n + " ימים" };
    return { cls: "due-ok", text: "נסגר בעוד " + n + " ימים" };
  }
  function scoreLabel(s) {
    return { high: "התאמה גבוהה", medium: "התאמה אפשרית", conditional: "מותנה בנתונים" }[s] || "";
  }

  if (window.MATZPEN_FITS) {
    MATZPEN.calls.forEach(c => {
      if (MATZPEN_FITS[c.id]) c.motzkinFit = MATZPEN_FITS[c.id];
    });
  }
  const calls = () => MATZPEN.calls.slice().sort((a, b) => a.deadline.localeCompare(b.deadline));

  function unique(key) {
    return Array.from(new Set(MATZPEN.calls.map(c => c[key]))).sort();
  }

  function filtered() {
    const q = ($("#q")?.value || "").trim();
    const body = $("#f-body")?.value || "";
    const topic = $("#f-topic")?.value || "";
    const due = $("#f-due")?.value || "";
    const amount = $("#f-amount")?.value || "";
    return calls().filter(c => {
      if (q) {
        const hay = [c.title, c.body, c.summary, c.eligible, c.topic, ...(c.topics || [])].join(" ");
        if (!hay.includes(q)) return false;
      }
      if (body && c.bodyShort !== body && c.body !== body) return false;
      if (topic && !(c.topics || []).includes(topic) && c.topic !== topic) return false;
      if (due) {
        const n = daysLeft(c.deadline);
        if (due === "14" && n > 14) return false;
        if (due === "30" && n > 30) return false;
        if (due === "60" && n > 60) return false;
      }
      if (amount) {
        const max = c.amountMax || 0;
        if (amount === "500" && max < 500000) return false;
        if (amount === "1000" && max < 1000000) return false;
        if (amount === "3000" && max < 3000000) return false;
      }
      return true;
    });
  }

  function cardHTML(c, showFit) {
    const due = dueChip(c.deadline);
    const score = showFit ? `<span class="chip score-${c.motzkinScore}">${scoreLabel(c.motzkinScore)}</span>` : "";
    const fit = showFit && c.motzkinFit ? `<p class="fit">${escapeHtml(c.motzkinFit.split("\n")[0])}</p>` : "";
    return `<a class="card" href="#/call/${c.id}">
      <div class="chips">
        <span class="chip">${escapeHtml(c.bodyShort)}</span>
        <span class="chip">${escapeHtml(c.topic)}</span>
        <span class="chip ${due.cls}">${due.text}</span>
        ${score}
      </div>
      <h3>${escapeHtml(c.title)}</h3>
      <p class="meta">מועד אחרון: ${fmtDate(c.deadline)}</p>
      <p class="amount">${escapeHtml(c.amountLabel)}</p>
      ${fit}
    </a>`;
  }

  function escapeHtml(s) {
    return String(s || "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  }

  function urgentCount() {
    return MATZPEN.calls.filter(c => daysLeft(c.deadline) <= 14).length;
  }

  function home(view) {
    const m = MATZPEN.municipality;
    const list = view === "motzkin"
      ? filtered().filter(c => c.motzkinScore !== "none")
      : filtered();
    const motzkinSorted = view === "motzkin"
      ? list.slice().sort((a, b) => {
          const rank = { high: 0, medium: 1, conditional: 2 };
          return (rank[a.motzkinScore] - rank[b.motzkinScore]) || a.deadline.localeCompare(b.deadline);
        })
      : list;

    const profile = view === "motzkin" ? `
      <section class="profile">
        <div class="panel">
          <p class="kicker">תצוגה לעירייה</p>
          <h2>מה רלוונטי לקריית מוצקין</h2>
          <p class="lede">הסינון מתבסס רק על נתונים פומביים מאומתים של הלמ״ס ועל תנאי הזכאות שבקולות הקוראים. לא המצאנו שירותים או מתקנים שפועלים בעיר. כל הסבר התאמה נכתב במודל AI עם תקרה תקציבית נמוכה, ואפשר לקרוא אותו במלואו בעמוד הפרטים.</p>
        </div>
        <div class="panel">
          <h3>פרופיל הרשות</h3>
          <dl>
            <dt>מעמד</dt><dd>${m.status}, ${m.district}</dd>
            <dt>אוכלוסייה</dt><dd>${m.population2023.toLocaleString("he-IL")} תושבים בסוף 2023</dd>
            <dt>אשכול חברתי-כלכלי</dt><dd>${m.socioEconomic.cluster} מתוך 10 (למ״ס ${m.socioEconomic.year}), דירוג ${m.socioEconomic.rank}</dd>
            <dt>אשכול פריפריאליות</dt><dd>${m.periphery.cluster} מתוך 10 (למ״ס ${m.periphery.year})</dd>
            <dt>שטח</dt><dd>${m.areaKm2} קמ״ר</dd>
          </dl>
        </div>
      </section>` : "";

    const banner = urgentCount()
      ? `<div class="banner warn">${urgentCount()} קולות קוראים נסגרים ב־14 הימים הקרובים. <a href="#/alerts">לצפייה בהתראות המועד</a></div>`
      : "";

    return `
      <section class="hero"><div class="hero-inner">
        <p class="kicker">הדגמה לרשויות המקומיות</p>
        <h1>${view === "motzkin" ? "קולות קוראים שכדאי לבחון בקריית מוצקין" : "כל המענקים והקולות הקוראים הפתוחים, במקום אחד"}</h1>
        <p class="lede">${view === "motzkin"
          ? "עיר בינונית במפרץ חיפה, אשכול חברתי-כלכלי 7. כאן מוצגים רק קולות פתוחים שרשות מקומית יכולה להגיש אליהם, עם הסבר התאמה לכל אחד."
          : "מצפן מרכז קולות קוראים, מבחני תמיכה ומענקים שמיועדים לרשויות המקומיות. בהדגמה הזו מופיעים רק הליכים פתוחים שנבדקו במקורות הרשמיים נכון ל־24 בנובמבר 2026."}</p>
        <div class="stats">
          <div class="stat"><b>${MATZPEN.calls.length}</b><span>קולות פתוחים מאומתים</span></div>
          <div class="stat"><b>${urgentCount()}</b><span>נסגרים ב־14 הימים הקרובים</span></div>
          <div class="stat"><b>${MATZPEN.calls.filter(c => c.motzkinScore === "high").length}</b><span>עם התאמה גבוהה למוצקין</span></div>
        </div>
      </div></section>
      <div class="wrap">
        ${banner}
        <div class="search-card">
          <div class="views">
            <button data-view="all" class="${view === "all" ? "active" : ""}">כל הקולות הפתוחים</button>
            <button data-view="motzkin" class="${view === "motzkin" ? "active" : ""}">רלוונטי לקריית מוצקין</button>
            <button data-nav="alerts">התראות מועד</button>
          </div>
          <div class="search-row">
            <div><label for="q">חיפוש</label><input id="q" type="search" placeholder="שם, גוף מפרסם, נושא..." /></div>
            <div><label for="f-body">גוף מפרסם</label><select id="f-body"><option value="">הכול</option></select></div>
            <div><label for="f-topic">תחום</label><select id="f-topic"><option value="">הכול</option></select></div>
            <div><label for="f-due">מועד אחרון</label>
              <select id="f-due">
                <option value="">הכול</option>
                <option value="14">ב־14 הימים הקרובים</option>
                <option value="30">ב־30 הימים הקרובים</option>
                <option value="60">ב־60 הימים הקרובים</option>
              </select>
            </div>
            <div><label for="f-amount">סכום מקסימלי</label>
              <select id="f-amount">
                <option value="">הכול</option>
                <option value="500">מעל 500 אלף ₪</option>
                <option value="1000">מעל מיליון ₪</option>
                <option value="3000">מעל 3 מיליון ₪</option>
              </select>
            </div>
          </div>
        </div>
        ${profile}
        <p class="meta" id="count"></p>
        <div class="grid" id="grid"></div>
      </div>`;
  }

  function bindFilters(view) {
    const bodies = Array.from(new Set(MATZPEN.calls.map(c => c.bodyShort)));
    const topics = Array.from(new Set(MATZPEN.calls.flatMap(c => c.topics || [c.topic])));
    bodies.forEach(b => $("#f-body").insertAdjacentHTML("beforeend", `<option>${escapeHtml(b)}</option>`));
    topics.forEach(t => $("#f-topic").insertAdjacentHTML("beforeend", `<option>${escapeHtml(t)}</option>`));
    const renderList = () => {
      const showFit = view === "motzkin";
      const list = showFit
        ? filtered().slice().sort((a, b) => ({ high: 0, medium: 1, conditional: 2 }[a.motzkinScore] - { high: 0, medium: 1, conditional: 2 }[b.motzkinScore] || a.deadline.localeCompare(b.deadline)))
        : filtered();
      $("#count").textContent = list.length + " קולות קוראים";
      $("#grid").innerHTML = list.length ? list.map(c => cardHTML(c, showFit)).join("") : `<div class="empty">לא נמצאו קולות קוראים התואמים לסינון.</div>`;
    };
    ["q", "f-body", "f-topic", "f-due", "f-amount"].forEach(id => $(`#${id}`).addEventListener("input", renderList));
    $$(".views button[data-view]").forEach(btn => btn.addEventListener("click", () => location.hash = btn.dataset.view === "motzkin" ? "#/motzkin" : "#/"));
    $("button[data-nav='alerts']").addEventListener("click", () => location.hash = "#/alerts");
    renderList();
  }

  function detail(id) {
    const c = MATZPEN.calls.find(x => x.id === id);
    if (!c) return `<div class="wrap detail-page"><p>הקול הקורא לא נמצא.</p><a class="back" href="#/">חזרה</a></div>`;
    const due = dueChip(c.deadline);
    const caveats = (c.caveats || []).map(x => `<p class="caveat">${escapeHtml(x)}</p>`).join("");
    return `<div class="wrap detail-page">
      <a class="back" href="#/motzkin">← חזרה לתצוגת קריית מוצקין</a>
      <div class="detail-grid">
        <div class="panel detail">
          <div class="chips">
            <span class="chip">${escapeHtml(c.type)}</span>
            <span class="chip">${escapeHtml(c.bodyShort)}</span>
            <span class="chip">${escapeHtml(c.topic)}</span>
            <span class="chip ${due.cls}">${due.text}</span>
          </div>
          <h1>${escapeHtml(c.title)}</h1>
          <p class="lede">${escapeHtml(c.summary)}</p>
          <dl class="kv">
            <div><dt>גוף מפרסם</dt><dd>${escapeHtml(c.body)}</dd></div>
            <div><dt>מועד אחרון</dt><dd>${fmtDate(c.deadline)}</dd></div>
            ${c.questionsDeadline ? `<div><dt>שאלות הבהרה</dt><dd>עד ${escapeHtml(c.questionsDeadline.split("-").reverse().join("."))} — ייתכן שהמועד כבר עבר</dd></div>` : ""}
            <div><dt>מי רשאי להגיש</dt><dd>${escapeHtml(c.eligible)}</dd></div>
            <div><dt>היקף הסיוע</dt><dd>${escapeHtml(c.amountLabel)}</dd></div>
            <div><dt>פירוט הסכום</dt><dd>${escapeHtml(c.amountNote)}</dd></div>
            <div><dt>דרך ההגשה</dt><dd>${escapeHtml(c.submission)}</dd></div>
            <div><dt>תאריך פרסום</dt><dd>${escapeHtml(c.published.split("-").reverse().join("."))}</dd></div>
          </dl>
          <div class="cta">
            <a class="btn" href="${c.sourceUrl}" target="_blank" rel="noopener">לעמוד הרשמי</a>
            ${c.sourceDocUrl ? `<a class="btn sec" href="${c.sourceDocUrl}" target="_blank" rel="noopener">למסמך המקור</a>` : ""}
          </div>
        </div>
        <div>
          <div class="fit-box">
            <h3>התאמה לקריית מוצקין</h3>
            <p><span class="chip score-${c.motzkinScore}">${scoreLabel(c.motzkinScore)}</span></p>
            <p>${escapeHtml(c.motzkinFit || "הסבר ההתאמה יוצג כאן.")}</p>
            <p class="meta">ההסבר נכתב במודל AI על סמך נתוני הלמ״ס ותנאי הקול הקורא בלבד, ולא מחליף בדיקה מקצועית בעירייה.</p>
          </div>
          ${caveats ? `<div style="margin-top:12px">${caveats}</div>` : ""}
          <div class="panel" style="margin-top:12px">
            <h3>התראת מועד</h3>
            <p>נותרו ${daysLeft(c.deadline)} ימים להגשה. בהפעלה מלאה המערכת תזכיר לגזבר, למחלקת הרווחה או לחינוך לפני הסגירה.</p>
          </div>
        </div>
      </div>
    </div>`;
  }

  function alerts() {
    const groups = [
      { title: "נסגרים ב־14 הימים הקרובים", items: calls().filter(c => daysLeft(c.deadline) <= 14) },
      { title: "נסגרים בתוך חודש", items: calls().filter(c => daysLeft(c.deadline) > 14 && daysLeft(c.deadline) <= 30) },
      { title: "בהמשך", items: calls().filter(c => daysLeft(c.deadline) > 30) }
    ];
    const block = groups.map(g => `
      <h2>${g.title}</h2>
      ${g.items.length ? g.items.map(c => {
        const due = dueChip(c.deadline);
        return `<div class="alert-item">
          <span class="chip ${due.cls}">${due.text}</span>
          <div><strong>${escapeHtml(c.title)}</strong><div class="meta">${escapeHtml(c.bodyShort)} · ${fmtDate(c.deadline)}</div></div>
          <a class="btn sec" href="#/call/${c.id}">לפרטים</a>
        </div>`;
      }).join("") : "<p class='meta'>אין קולות קוראים בקבוצה הזו.</p>"}
    `).join("");
    return `<div class="wrap detail-page">
      <a class="back" href="#/">← חזרה לכל הקולות</a>
      <p class="kicker">מעקב מועדים</p>
      <h1>התראות מועד אחרון</h1>
      <p class="lede">בהדגמה הזו ההתראות מוצגות על המסך בלבד. לא נשלח מייל ולא הוגדרה שליחה אוטומטית. בהפעלה מלאה אפשר לשלוח תזכורת לגורם בעירייה 14 או 30 יום לפני הסגירה.</p>
      <div class="panel alert-settings">
        <h3>הגדרות התראה — הדגמה בלבד</h3>
        <label><input type="checkbox" checked disabled> תזכורת 14 יום לפני המועד</label>
        <label><input type="checkbox" checked disabled> תזכורת 7 ימים לפני המועד</label>
        <label><input type="checkbox" disabled> שליחה לגזבר ולמחלקת הרווחה (לא פעיל בהדגמה)</label>
      </div>
      <div class="alerts">${block}</div>
    </div>`;
  }

  function route() {
    const hash = location.hash || "#/";
    const app = $("#app");
    document.title = "מצפן · קולות קוראים לרשויות המקומיות";
    $$(".top-actions a").forEach(a => a.classList.toggle("active", a.getAttribute("href") === hash || (hash === "#/" && a.getAttribute("href") === "#/")));
    if (hash === "#/motzkin") {
      app.innerHTML = home("motzkin");
      bindFilters("motzkin");
    } else if (hash.startsWith("#/call/")) {
      app.innerHTML = detail(hash.slice(7));
    } else if (hash === "#/alerts") {
      app.innerHTML = alerts();
    } else {
      app.innerHTML = home("all");
      bindFilters("all");
    }
    window.scrollTo(0, 0);
  }

  window.addEventListener("hashchange", route);
  document.addEventListener("DOMContentLoaded", route);
})();

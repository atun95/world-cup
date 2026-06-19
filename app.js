// app.js – World Cup 2026 Results Tracker
// Chỉ theo dõi kết quả thực tế, không có tính năng cá cược

let state = { matches: [], lastSync: null, syncSource: null };

const VALID_GROUPS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

// ──────────────────────────────────────────────
// HÀM TIỆN ÍCH LẤY HÌNH ẢNH CỜ TỪ EMOJI (HỖ TRỢ WINDOWS)
// ──────────────────────────────────────────────
function getFlagHtml(emoji, name = "", sizeClass = "normal") {
  if (!emoji) return "";
  try {
    const cp1 = emoji.codePointAt(0);
    const cp2 = emoji.codePointAt(2);
    const char1 = String.fromCharCode(cp1 - 0x1F1E6 + 97);
    const char2 = String.fromCharCode(cp2 - 0x1F1E6 + 97);
    const iso2 = (char1 + char2).toLowerCase();
    
    let flagUrl = `https://flagcdn.com/w40/${iso2}.png`;
    if (emoji.includes("🏴󠁧󠁢󠁳󠁣󠁴󠁿")) {
      flagUrl = "https://flagcdn.com/w40/gb-sct.png";
    } else if (emoji.includes("🏴󠁧󠁢󠁥󠁮󠁧󠁿")) {
      flagUrl = "https://flagcdn.com/w40/gb-eng.png";
    }
    
    let width = 20;
    if (sizeClass === "large") width = 24;
    if (sizeClass === "small") width = 16;
    
    return `<img src="${flagUrl}" alt="${name}" class="team-flag-img ${sizeClass}" style="width:${width}px; height:auto; border-radius:2px; vertical-align:middle; display:inline-block; margin-right:4px; box-shadow:0 1px 2px rgba(0,0,0,0.3);" onerror="this.style.display='none'; this.nextSibling.style.display='inline';" /><span class="flag-fallback" style="display:none">${emoji}</span>`;
  } catch (e) {
    return `<span>${emoji}</span>`;
  }
}

// ──────────────────────────────────────────────
// KHỞI ĐỘNG
// ──────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  initApp();
});

function initApp() {
  // Cập nhật thời gian hiển thị
  updateTimeBadge();

  // Tải dữ liệu từ localStorage hoặc tạo mặc định
  const saved = localStorage.getItem("wc2026_matches_v3");
  if (saved) {
    const parsed = JSON.parse(saved);
    const matches = parsed.matches || parsed;
    const hasCorrupt = Array.isArray(matches) && matches.some(m =>
      isPlaceholder(m.team1?.name) || isPlaceholder(m.team2?.name) ||
      (m.team1?.id && !TEAMS.find(t => t.id === m.team1.id))
    );
    if (hasCorrupt) {
      state.matches = generateSchedule();
    } else {
      state.matches = matches;
      state.lastSync = parsed.lastSync || null;
      state.syncSource = parsed.syncSource || null;
    }
  } else {
    state.matches = generateSchedule();
  }

  // Tải API Key và tỷ lệ kèo nhà cái đã lưu
  let apiKey = localStorage.getItem("wc2026_odds_api_key");
  if (!apiKey) {
    // Tự động gán API Key mặc định dưới dạng mã hóa base64 để ẩn đi
    apiKey = atob("ODU5ZDNlNjdiYmVlZGQ3MWE0YTI2OGZmNWFlNDE0YmU=");
    localStorage.setItem("wc2026_odds_api_key", apiKey);
  }
  const keyInput = document.getElementById("odds-api-key");
  if (keyInput && apiKey) {
    keyInput.value = apiKey;
  }
  
  const savedExtOdds = localStorage.getItem("wc2026_external_odds");
  if (savedExtOdds) {
    try {
      state.externalOdds = JSON.parse(savedExtOdds);
    } catch (e) {
      state.externalOdds = null;
    }
  }

  saveMatches();
  renderAll();

  // Tự động đồng bộ khi mở app (không hiện alert)
  syncOfficialData(false);
}

function isPlaceholder(name) {
  if (!name || typeof name !== "string") return false;
  return /^\d+[A-Z]/.test(name) || /^[WL]\d+$/.test(name);
}

function saveMatches() {
  localStorage.setItem("wc2026_matches_v3", JSON.stringify({
    matches: state.matches,
    lastSync: state.lastSync,
    syncSource: state.syncSource
  }));
}

function renderAll() {
  updateTimeBadge();
  updateDashboard();
  renderLiveTicker();
  renderMatches();
  renderStandings();
  renderKnockout();
  renderOddsResults();
}

function updateTimeBadge() {
  const now = new Date();
  const d = now.getDate().toString().padStart(2, "0");
  const mo = (now.getMonth() + 1).toString().padStart(2, "0");
  const y = now.getFullYear();
  const h = now.getHours().toString().padStart(2, "0");
  const mi = now.getMinutes().toString().padStart(2, "0");
  const el = document.getElementById("current-time-badge");
  if (el) el.textContent = `📅 ${d}/${mo}/${y} ${h}:${mi}`;
}

// ──────────────────────────────────────────────
// DASHBOARD
// ──────────────────────────────────────────────
function updateDashboard() {
  const completed = state.matches.filter(m => m.status === "completed");
  const live = state.matches.filter(m => m.status === "live");
  const upcoming = state.matches.filter(m => m.status === "upcoming");
  const totalGoals = completed.reduce((s, m) => s + (m.score1 || 0) + (m.score2 || 0), 0)
    + live.reduce((s, m) => s + (m.score1 || 0) + (m.score2 || 0), 0);

  document.getElementById("w-played").textContent = `${completed.length} / ${state.matches.length}`;
  document.getElementById("w-goals").textContent = totalGoals;
  document.getElementById("w-live").textContent = live.length;
  document.getElementById("w-upcoming").textContent = upcoming.length;

  // Badge live trên header (đã tắt theo yêu cầu)
  const badge = document.getElementById("live-count-badge");
  if (badge) {
    badge.innerHTML = "";
  }
}

// ──────────────────────────────────────────────
// LIVE TICKER
// ──────────────────────────────────────────────
function renderLiveTicker() {
  const container = document.getElementById("live-ticker-container");
  if (!container) return;

  const live = state.matches.filter(m => m.status === "live");
  if (live.length === 0) {
    container.innerHTML = `<div class="ticker-placeholder">Không có trận nào đang diễn ra trực tiếp</div>`;
    return;
  }

  container.innerHTML = live.map(m => `
    <div class="ticker-card">
      <span class="ticker-teams" style="display:inline-flex;align-items:center;gap:4px">${getFlagHtml(m.team1.emoji, m.team1.name, "small")} ${m.team1.code}</span>
      <span class="ticker-score">${m.score1} - ${m.score2}</span>
      <span class="ticker-teams" style="display:inline-flex;align-items:center;gap:4px">${m.team2.code} ${getFlagHtml(m.team2.emoji, m.team2.name, "small")}</span>
      ${m.minute ? `<span class="ticker-min">${m.minute}'</span>` : ""}
    </div>
  `).join("");
}

// ──────────────────────────────────────────────
// RENDER MATCHES
// ──────────────────────────────────────────────
function renderMatches() {
  const grid = document.getElementById("matches-grid");
  if (!grid) return;

  const statusFilter = document.getElementById("filter-status").value;
  const groupFilter = document.getElementById("filter-group-letter").value;
  const roundFilter = document.getElementById("filter-round").value;
  const search = (document.getElementById("search-team").value || "").toLowerCase().trim();

  let list = state.matches.filter(m => {
    if (statusFilter !== "all" && m.status !== statusFilter) return false;
    if (groupFilter !== "all" && m.group !== groupFilter) return false;
    if (roundFilter !== "all" && String(m.round) !== roundFilter) return false;
    if (search) {
      const hay = `${m.team1.name} ${m.team2.name} ${m.team1.code} ${m.team2.code}`.toLowerCase();
      if (!hay.includes(search)) return false;
    }
    return true;
  });

  // Sắp xếp: live lên đầu, tiếp theo là sắp diễn ra (tăng dần: gần nhất -> xa nhất), cuối cùng là đã kết thúc (giảm dần: mới nhất -> cũ nhất)
  list.sort((a, b) => {
    // 1. Trận live lên đầu
    if (a.status === "live" && b.status !== "live") return -1;
    if (b.status === "live" && a.status !== "live") return 1;
    if (a.status === "live" && b.status === "live") {
      return new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`);
    }

    // 2. Trận sắp diễn ra (upcoming) lên trước trận đã kết thúc (completed)
    if (a.status === "upcoming" && b.status === "completed") return -1;
    if (a.status === "completed" && b.status === "upcoming") return 1;

    // 3. Sắp xếp trong cùng nhóm:
    if (a.status === "upcoming" && b.status === "upcoming") {
      // Trận sắp diễn ra: gần nhất -> xa nhất (tăng dần)
      return new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`);
    } else {
      // Trận đã kết thúc: mới nhất -> cũ nhất (giảm dần)
      return new Date(`${b.date}T${b.time}`) - new Date(`${a.date}T${a.time}`);
    }
  });

  if (list.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔍</div>
        <p>Không tìm thấy trận đấu nào phù hợp</p>
      </div>`;
    return;
  }

  grid.innerHTML = list.map(m => buildMatchCard(m)).join("");
}

function buildMatchCard(m) {
  const isLive = m.status === "live";
  const isCompleted = m.status === "completed";

  // Header
  const statusHtml = isLive
    ? `<span class="status-badge live">🔴 TRỰC TIẾP</span>`
    : isCompleted
      ? `<span class="status-badge completed">✅ Kết thúc</span>`
      : `<span class="status-badge upcoming">🕐 Sắp diễn ra</span>`;

  // Score
  let scoreHtml;
  if (isLive) {
    scoreHtml = `
      <div class="score-display live-score">${m.score1} - ${m.score2}</div>
      ${m.minute ? `<div class="live-minute-badge">${m.minute}'</div>` : ""}`;
  } else if (isCompleted) {
    scoreHtml = `<div class="score-display">${m.score1} - ${m.score2}</div>`;
  } else {
    scoreHtml = `<div class="vs-text">VS</div><div style="font-size:11px;color:var(--text-muted);margin-top:4px">${m.time}</div>`;
  }

  // Footer info
  const dateStr = formatDate(m.date);
  const goalsNote = isCompleted ? `Tổng: <strong>${(m.score1 || 0) + (m.score2 || 0)} bàn</strong>` : `Lượt ${m.round} • Bảng ${m.group}`;

  // Tỷ lệ kèo chấp & tài xỉu cho trận đấu
  const odds = getMatchOdds(m);
  
  let oddsHtml = "";
  if (!isCompleted) {
    if (odds) {
      const favTeam = odds.favoriteId === m.team1.id ? m.team1 : m.team2;
      const handicapText = odds.handicap === 0 
        ? "Đồng banh" 
        : `${favTeam.name} chấp ${odds.handicap}`;
      oddsHtml = `
        <div class="match-odds-bar">
          <span>⚖️ <strong>Chấp:</strong> ${handicapText}</span>
          <span>🔥 <strong>Tài xỉu:</strong> ${odds.overUnder}</span>
        </div>`;
    } else {
      oddsHtml = `
        <div class="match-odds-bar">
          <span>⚖️ <strong>Chấp:</strong> Đang cập nhật</span>
          <span>🔥 <strong>Tài xỉu:</strong> Đang cập nhật</span>
        </div>`;
    }
  }

  return `
    <div class="match-card ${isLive ? "is-live" : ""}">
      <div class="match-header">
        <span class="match-group-badge">BẢNG ${m.group} • L${m.round}</span>
        <span class="match-datetime">${dateStr}</span>
        ${statusHtml}
      </div>
      <div class="match-body">
        <div class="team-side">
          <span class="team-flag">${getFlagHtml(m.team1.emoji, m.team1.name, "large")}</span>
          <span class="team-name">${m.team1.name}</span>
          <span class="team-rank">Elo ${m.team1.rating}</span>
        </div>
        <div class="score-center">${scoreHtml}</div>
        <div class="team-side">
          <span class="team-flag">${getFlagHtml(m.team2.emoji, m.team2.name, "large")}</span>
          <span class="team-name">${m.team2.name}</span>
          <span class="team-rank">Elo ${m.team2.rating}</span>
        </div>
      </div>
      ${oddsHtml}
      <div class="match-footer">${goalsNote}</div>
    </div>`;
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const [y, mo, d] = dateStr.split("-");
  return `${d}/${mo}/${y}`;
}

// ──────────────────────────────────────────────
// STANDINGS
// ──────────────────────────────────────────────
function renderStandings() {
  const container = document.getElementById("standings-grid-container");
  if (!container) return;

  updateStandingsSyncInfo();

  const standings = calculateStandings(state.matches);
  container.innerHTML = "";

  VALID_GROUPS.forEach(g => {
    const teams = standings[g] || [];
    const rows = teams.map((t, i) => {
      let rowClass = "";
      if (i < 2) rowClass = "qualify-direct";
      else if (i === 2) rowClass = "qualify-3rd";
      return `
        <tr class="${rowClass}">
          <td class="td-rank">${i + 1}</td>
          <td><div class="td-team"><span class="td-flag">${getFlagHtml(t.emoji, t.name, "normal")}</span>${t.name}</div></td>
          <td style="text-align:center">${t.played}</td>
          <td style="text-align:center">${t.won}</td>
          <td style="text-align:center">${t.drawn}</td>
          <td style="text-align:center">${t.lost}</td>
          <td style="text-align:center">${t.gf}</td>
          <td style="text-align:center">${t.ga}</td>
          <td style="text-align:center">${t.gd >= 0 ? "+" + t.gd : t.gd}</td>
          <td class="td-pts" style="text-align:center">${t.pts}</td>
        </tr>`;
    }).join("");

    const card = document.createElement("div");
    card.className = "standing-table-card";
    card.innerHTML = `
      <h3>BẢNG ${g}</h3>
      <table class="standing-table">
        <thead>
          <tr>
            <th style="width:24px">#</th>
            <th>Đội tuyển</th>
            <th title="Số trận">ST</th>
            <th title="Thắng">T</th>
            <th title="Hòa">H</th>
            <th title="Thua">B</th>
            <th title="Bàn thắng">BT</th>
            <th title="Bàn thua">BH</th>
            <th title="Hiệu số">HS</th>
            <th title="Điểm">Đ</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`;
    container.appendChild(card);
  });
}

// ──────────────────────────────────────────────
// KNOCKOUT
// ──────────────────────────────────────────────
function renderKnockout() {
  const knockoutMatches = state.matches.filter(m => !VALID_GROUPS.includes(m.group));
  const grid = document.getElementById("knockout-grid");
  const placeholder = document.querySelector(".knockout-placeholder");
  if (!grid) return;

  if (knockoutMatches.length === 0) {
    grid.innerHTML = "";
    if (placeholder) placeholder.style.display = "flex";
    return;
  }

  if (placeholder) placeholder.style.display = "none";

  // Nhóm theo vòng đấu
  const rounds = {};
  knockoutMatches.forEach(m => {
    const key = m.group || m.round || "Vòng loại";
    if (!rounds[key]) rounds[key] = [];
    rounds[key].push(m);
  });

  grid.innerHTML = Object.entries(rounds).map(([roundName, matches]) => `
    <div class="knockout-round">
      <div class="knockout-round-title">${roundName}</div>
      <div class="knockout-matches-grid">
        ${matches.map(m => {
    const isCompleted = m.status === "completed";
    const isLive = m.status === "live";
    const scoreStr = (isCompleted || isLive) ? `${m.score1} - ${m.score2}` : "VS";
    return `
            <div class="ko-match-card">
              <div class="ko-team">
                <span style="display:inline-flex;align-items:center;height:22px">${getFlagHtml(m.team1.emoji, m.team1.name, "large")}</span>
                <span class="ko-team-name">${m.team1.name}</span>
              </div>
              <div class="ko-score">${scoreStr}</div>
              <div class="ko-team" style="flex-direction:row-reverse;text-align:right">
                <span style="display:inline-flex;align-items:center;height:22px">${getFlagHtml(m.team2.emoji, m.team2.name, "large")}</span>
                <span class="ko-team-name">${m.team2.name}</span>
              </div>
            </div>`;
  }).join("")}
      </div>
    </div>
  `).join("");
}

// ──────────────────────────────────────────────
// TAB SWITCH
// ──────────────────────────────────────────────
function switchTab(tabId, el) {
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
  document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
  if (el) el.classList.add("active");
  const tab = document.getElementById(tabId);
  if (tab) tab.classList.add("active");
}

// ──────────────────────────────────────────────
// ĐỒNG BỘ DỮ LIỆU TỪ NGUỒN CHÍNH THỐNG
// ──────────────────────────────────────────────
function setSyncingUI(syncing) {
  document.querySelectorAll(".sync-btn").forEach(btn => { btn.disabled = syncing; });
  const icon = document.getElementById("sync-icon");
  if (icon) icon.classList.toggle("syncing", syncing);
}

function updateStandingsSyncInfo() {
  const el = document.getElementById("standings-sync-info");
  if (!el) return;

  if (state.lastSync) {
    const d = new Date(state.lastSync);
    const timeStr = `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
    const completed = state.matches.filter(m => m.status === "completed" && VALID_GROUPS.includes(m.group)).length;
    const live = state.matches.filter(m => m.status === "live").length;
    el.innerHTML = `
      <span class="sync-status-ok">✅ Đã đồng bộ: ${timeStr}</span>
      <span class="sync-source">Nguồn: ${state.syncSource || "openfootball"}</span>
      <span class="sync-stats">${completed} trận có kết quả${live ? ` • ${live} trận trực tiếp` : ""}</span>`;
  } else {
    el.innerHTML = `<span class="sync-status-warn">⚠️ Chưa đồng bộ – nhấn <strong>Cập Nhật</strong> để tải kết quả chính thức</span>`;
  }
}

async function syncOfficialData(showAlert = false) {
  setSyncingUI(true);

  try {
    const source = OFFICIAL_DATA_SOURCES[0];
    const res = await fetch(source.url, { cache: "no-store" });
    if (!res.ok) throw new Error("Không thể kết nối máy chủ dữ liệu chính thức.");

    const data = await res.json();
    if (!data.matches || !Array.isArray(data.matches)) throw new Error("Dữ liệu không hợp lệ.");

    const parsed = parseApiMatches(data.matches);
    if (parsed.length === 0) throw new Error("Không tìm thấy trận đấu hợp lệ từ nguồn chính thức.");

    state.matches = parsed;
    state.lastSync = new Date().toISOString();
    state.syncSource = source.name;

    // 2. Đồng bộ tỷ lệ kèo nếu có API Key
    const apiKey = localStorage.getItem("wc2026_odds_api_key");
    let oddsSynced = false;
    let oddsErrorMsg = "";
    if (apiKey) {
      try {
        await syncExternalOdds(apiKey);
        oddsSynced = true;
      } catch (err) {
        oddsErrorMsg = "\n⚠️ Không thể tải kèo nhà cái (vui lòng kiểm tra lại API Key hoặc mạng).";
      }
    }

    saveMatches();
    renderAll();

    const completed = parsed.filter(m => m.status === "completed").length;
    const live = parsed.filter(m => m.status === "live").length;
    const groupCompleted = parsed.filter(m => m.status === "completed" && VALID_GROUPS.includes(m.group)).length;

    if (showAlert) {
      let msg = `Cập nhật thành công từ nguồn chính thức!\n` +
        `📊 Bảng xếp hạng: tính từ ${groupCompleted} trận vòng bảng\n` +
        `⚽ Tổng: ${completed} trận có kết quả` +
        (live ? `\n🔴 ${live} trận đang diễn ra` : "") +
        `\nNguồn: ${source.description}`;
        
      if (apiKey) {
        if (oddsSynced) {
          msg += "\n✅ Đã cập nhật tỷ lệ kèo thực tế từ nhà cái.";
        } else {
          msg += oddsErrorMsg;
        }
      }
      showToast(msg, "success");
    }

  } catch (err) {
    console.error("Lỗi đồng bộ:", err);
    if (showAlert) showToast("Lỗi đồng bộ: " + err.message, "error");
  } finally {
    setSyncingUI(false);
  }
}

function parseApiMatches(apiMatches) {
  const now = new Date();
  const results = [];
  let idCounter = 1;

  const existingMap = {};
  state.matches.forEach(m => {
    const key = `${m.team1?.id}_${m.team2?.id}_${m.date}`;
    existingMap[key] = m;
  });

  apiMatches.forEach(m => {
    if (isPlaceholder(m.team1) || isPlaceholder(m.team2)) return;

    const team1 = getTeamFromMap(m.team1);
    const team2 = getTeamFromMap(m.team2);
    if (!team1 || !team2) return;

    const knownT1 = TEAMS.find(t => t.id === team1.id);
    const knownT2 = TEAMS.find(t => t.id === team2.id);
    if (!knownT1 || !knownT2) return;

    const apiGroup = parseApiGroup(m.group);
    let group;
    if (apiGroup && VALID_GROUPS.includes(apiGroup)) {
      group = apiGroup;
    } else if (knownT1.group === knownT2.group && VALID_GROUPS.includes(knownT1.group)) {
      group = knownT1.group;
    } else {
      group = m.round || "Vòng loại trực tiếp";
    }

    const date = m.date || "";
    const time = parseApiTime(m.time);
    const roundNum = parseApiRound(m.round);

    // Chuyển đổi date và time sang múi giờ Việt Nam (UTC+7)
    let vnDate = date;
    let vnTime = time;
    let matchTime = null;
    let tzOffset = "";

    if (date && time) {
      const rawTime = m.time || "";
      if (rawTime.includes("UTC")) {
        const tzMatch = rawTime.match(/UTC([+-]\d+)/);
        if (tzMatch) {
          const offset = parseInt(tzMatch[1]);
          const sign = offset >= 0 ? "+" : "-";
          const absVal = String(Math.abs(offset)).padStart(2, "0");
          tzOffset = `${sign}${absVal}:00`;
        } else {
          tzOffset = "Z";
        }
      }
      
      try {
        matchTime = new Date(`${date}T${time}:00${tzOffset}`);
        const formatter = new Intl.DateTimeFormat("sv-SE", {
          timeZone: "Asia/Ho_Chi_Minh",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false
        });
        const parts = formatter.formatToParts(matchTime);
        const y = parts.find(p => p.type === 'year').value;
        const mo = parts.find(p => p.type === 'month').value;
        const d = parts.find(p => p.type === 'day').value;
        const h = parts.find(p => p.type === 'hour').value;
        const mi = parts.find(p => p.type === 'minute').value;
        vnDate = `${y}-${mo}-${d}`;
        vnTime = `${h}:${mi}`;
      } catch (e) {
        console.error("Lỗi chuyển múi giờ VN:", e);
      }
    }

    let score1 = null, score2 = null, status = "upcoming", minute = null;

    if (m.score?.ft) {
      score1 = m.score.ft[0];
      score2 = m.score.ft[1];
      status = "completed";
    } else if (m.score?.ht) {
      score1 = m.score.ht[0];
      score2 = m.score.ht[1];
      status = "live";
      minute = 45;
    } else if (matchTime) {
      const endTime = new Date(matchTime.getTime() + 115 * 60000);
      if (now >= matchTime && now <= endTime) {
        status = "live";
        minute = Math.min(90, Math.floor((now - matchTime) / 60000));
        score1 = 0;
        score2 = 0;
      }
    }

    const key = `${team1.id}_${team2.id}_${vnDate}`;
    const existing = existingMap[key];

    results.push({
      id: existing ? existing.id : idCounter++,
      team1,
      team2,
      date: vnDate,
      time: vnTime,
      group,
      round: roundNum,
      status,
      score1,
      score2,
      minute,
      ground: m.ground || null
    });
  });

  results.sort((a, b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`));
  return results;
}

// ──────────────────────────────────────────────
// KỌ CƯỢC: TÍNH TOÁN KÈO CHẤP & TÀI XỈU
// ──────────────────────────────────────────────
function getMatchOdds(m) {
  // Kiểm tra xem có tỷ lệ kèo ngoài nhà cái đã đồng bộ không
  if (state.externalOdds) {
    const key1 = `${m.team1.id}_${m.team2.id}`;
    const key2 = `${m.team2.id}_${m.team1.id}`;
    const ext = state.externalOdds[key1] || state.externalOdds[key2];
    if (ext) {
      return {
        favoriteId: ext.favoriteId,
        handicap: ext.handicap,
        overUnder: ext.overUnder
      };
    }
  }

  // Không tính theo Elo nữa, trả về null nếu chưa có kèo nhà cái thực tế
  return null;
}

function calcHandicapResult(m, odds) {
  if (m.score1 === null || m.score2 === null) return null;
  const isFavHome = odds.favoriteId === m.team1.id;
  // Hiệu số thực tế sau khi trừ handicap cho đội cửa trên
  // Đội cửa trên chấp: hiệu số - handicap > 0 → thắng kèo
  const effDiff = isFavHome
    ? (m.score1 - m.score2) - odds.handicap
    : (m.score2 - m.score1) - odds.handicap;

  if (effDiff > 0.01) return "fav_win";
  if (effDiff < -0.01) return "dog_win";
  return "push";
}

function calcOUResult(m, odds) {
  if (m.score1 === null || m.score2 === null) return null;
  const total = m.score1 + m.score2;
  if (total > odds.overUnder + 0.01) return { result: "over", total };
  if (total < odds.overUnder - 0.01) return { result: "under", total };
  return { result: "push", total };
}

// ──────────────────────────────────────────────
// RENDER KỌ CƯỢC
// ──────────────────────────────────────────────
function renderOddsResults() {
  const tbody = document.getElementById("odds-tbody");
  const summaryBar = document.getElementById("odds-summary-bar");
  if (!tbody) return;

  const completed = state.matches.filter(m =>
    m.status === "completed" && VALID_GROUPS.includes(m.group)
  );

  // Sắp xếp: Trận đấu mới nhất lên đầu
  completed.sort((a, b) => new Date(`${b.date}T${b.time}`) - new Date(`${a.date}T${a.time}`));

  if (completed.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:50px">
      <div style="font-size:36px;margin-bottom:12px">⚽</div>Chưa có trận nào hoàn thành</td></tr>`;
    if (summaryBar) summaryBar.innerHTML = "";
    return;
  }

  // Tổng hợp
  let favWins = 0, dogWins = 0, pushH = 0;
  let overs = 0, unders = 0, pushOU = 0;

  const rows = completed.map(m => {
    const odds = getMatchOdds(m);
    if (!odds) {
      return `
        <tr>
          <td>
            <div class="odds-match-meta">Bảng ${m.group} • L${m.round} • ${formatDate(m.date)}</div>
            <div class="odds-match-name">
              <span style="display:inline-flex;align-items:center">${getFlagHtml(m.team1.emoji, m.team1.name, "normal")}</span> <span class="full-name">${m.team1.name}</span><span class="short-code">${m.team1.code}</span>
              <span style="color:var(--text-muted);margin:0 6px">vs</span>
              <span style="display:inline-flex;align-items:center">${getFlagHtml(m.team2.emoji, m.team2.name, "normal")}</span> <span class="full-name">${m.team2.name}</span><span class="short-code">${m.team2.code}</span>
            </div>
          </td>
          <td style="text-align:center">
            <div class="odds-score">${m.score1} - ${m.score2}</div>
          </td>
          <td colspan="2" style="text-align:center;color:var(--text-muted);font-style:italic">Chưa cập nhật kèo nhà cái</td>
        </tr>`;
    }

    const hRes = calcHandicapResult(m, odds);
    const ouRes = calcOUResult(m, odds);

    const favTeam = odds.favoriteId === m.team1.id ? m.team1 : m.team2;
    const dogTeam = odds.favoriteId === m.team1.id ? m.team2 : m.team1;

    // Đếm thống kê
    if (hRes === "fav_win") favWins++;
    else if (hRes === "dog_win") dogWins++;
    else pushH++;
    if (ouRes?.result === "over") overs++;
    else if (ouRes?.result === "under") unders++;
    else pushOU++;

    // HTML kèo chấp
    const hcapLabel = odds.handicap === 0
      ? `<span class="full-name">Đồng banh</span><span class="short-code">Đồng</span>`
      : `<span class="full-name">${getFlagHtml(favTeam.emoji, favTeam.name, "normal")} ${favTeam.name} chấp ${odds.handicap}</span>` +
      `<span class="short-code">${favTeam.code} chấp ${odds.handicap}</span>`;
    const hcapClass = hRes === "fav_win" ? "tag-win" : hRes === "dog_win" ? "tag-lose" : "tag-push";

    const hcapTextFull = hRes === "fav_win"
      ? `✅ ${getFlagHtml(favTeam.emoji, favTeam.name, "normal")} Thắng kèo`
      : hRes === "dog_win"
        ? `❌ ${getFlagHtml(dogTeam.emoji, dogTeam.name, "normal")} Bất ngờ thắng`
        : `⚖️ Hòa kèo`;
    const hcapTextShort = hRes === "fav_win"
      ? `✅ Thắng`
      : hRes === "dog_win"
        ? `❌ Dưới`
        : `⚖️ Hòa`;
    const hcapText = `<span class="full-name">${hcapTextFull}</span><span class="short-code">${hcapTextShort}</span>`;

    // HTML tài xỉu
    const ouLabel = `<span class="full-name">Mốc ${odds.overUnder}</span><span class="short-code">Mốc ${odds.overUnder}</span>`;
    const ouClass = ouRes?.result === "over" ? "tag-win" : ouRes?.result === "under" ? "tag-lose" : "tag-push";

    const ouTextFull = ouRes?.result === "over"
      ? `🔼 Tài (${ouRes.total} bàn)`
      : ouRes?.result === "under"
        ? `🔽 Xỉu (${ouRes.total} bàn)`
        : `⚖️ Hòa (${ouRes.total} bàn)`;
    const ouTextShort = ouRes?.result === "over"
      ? `🔼 Tài (${ouRes.total})`
      : ouRes?.result === "under"
        ? `🔽 Xỉu (${ouRes.total})`
        : `⚖️ Hòa (${ouRes.total})`;
    const ouText = `<span class="full-name">${ouTextFull}</span><span class="short-code">${ouTextShort}</span>`;

    return `
      <tr>
        <td>
          <div class="odds-match-meta">Bảng ${m.group} • L${m.round} • ${formatDate(m.date)}</div>
          <div class="odds-match-name">
            <span style="display:inline-flex;align-items:center">${getFlagHtml(m.team1.emoji, m.team1.name, "normal")}</span> <span class="full-name">${m.team1.name}</span><span class="short-code">${m.team1.code}</span>
            <span style="color:var(--text-muted);margin:0 6px">vs</span>
            <span style="display:inline-flex;align-items:center">${getFlagHtml(m.team2.emoji, m.team2.name, "normal")}</span> <span class="full-name">${m.team2.name}</span><span class="short-code">${m.team2.code}</span>
          </div>
        </td>
        <td style="text-align:center">
          <div class="odds-score">${m.score1} - ${m.score2}</div>
        </td>
        <td>
          <div class="odds-line-label">${hcapLabel}</div>
          <span class="odds-tag ${hcapClass}">${hcapText}</span>
        </td>
        <td>
          <div class="odds-line-label">${ouLabel}</div>
          <span class="odds-tag ${ouClass}">${ouText}</span>
        </td>
      </tr>`;
  }).join("");

  tbody.innerHTML = rows;

  // Summary bar
  if (summaryBar) {
    summaryBar.innerHTML = `
      <div class="odds-stat-card">
        <div class="odds-stat-val text-cyan">${completed.length}</div>
        <div class="odds-stat-label">Trận đã đá</div>
      </div>
      <div class="odds-stat-card">
        <div class="odds-stat-val text-green">${favWins}</div>
        <div class="odds-stat-label">Kèo trên thắng</div>
      </div>
      <div class="odds-stat-card">
        <div class="odds-stat-val text-pink">${dogWins}</div>
        <div class="odds-stat-label">Kèo dưới thắng</div>
      </div>
      <div class="odds-stat-card">
        <div class="odds-stat-val text-green">${overs}</div>
        <div class="odds-stat-label">Tài</div>
      </div>
      <div class="odds-stat-card">
        <div class="odds-stat-val text-pink">${unders}</div>
        <div class="odds-stat-label">Xỉu</div>
      </div>
    `;
  }
}

// ──────────────────────────────────────────────
// ĐỒNG BỘ TỶ LỆ KÈO THỰC TẾ (THE ODDS API)
// ──────────────────────────────────────────────
async function syncExternalOdds(apiKey) {
  if (!apiKey) return;
  try {
    const url = `https://api.the-odds-api.com/v4/sports/soccer_fifa_world_cup/odds/?apiKey=${apiKey}&regions=eu&markets=spreads,totals&oddsFormat=decimal`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Không thể kết nối máy chủ tỷ lệ kèo.");
    
    const data = await res.json();
    if (!Array.isArray(data)) return;
    
    const externalOdds = {};
    data.forEach(match => {
      const homeTeam = getTeamFromMap(match.home_team);
      const awayTeam = getTeamFromMap(match.away_team);
      if (!homeTeam || !awayTeam) return;
      
      // Ưu tiên chọn nhà cái Pinnacle để có tỷ lệ kèo chính xác và sát thực tế nhất
      let selectedBookmaker = match.bookmakers.find(b => 
        b.key === "pinnacle" &&
        b.markets.some(m => m.key === "spreads") && 
        b.markets.some(m => m.key === "totals")
      );
      
      if (!selectedBookmaker) {
        selectedBookmaker = match.bookmakers.find(b => 
          b.markets.some(m => m.key === "spreads") && 
          b.markets.some(m => m.key === "totals")
        );
      }
      
      if (!selectedBookmaker && match.bookmakers.length > 0) {
        selectedBookmaker = match.bookmakers[0];
      }
      
      if (!selectedBookmaker) return;
      
      const spreadsMarket = selectedBookmaker.markets.find(m => m.key === "spreads");
      const totalsMarket = selectedBookmaker.markets.find(m => m.key === "totals");
      
      let favoriteId = homeTeam.id;
      let handicap = 0;
      let overUnder = 2.5;
      
      if (spreadsMarket && spreadsMarket.outcomes.length >= 2) {
        const outcome1 = spreadsMarket.outcomes[0];
        const outcome2 = spreadsMarket.outcomes[1];
        
        const favOutcome = outcome1.point < 0 ? outcome1 : (outcome2.point < 0 ? outcome2 : null);
        if (favOutcome) {
          const favTeam = getTeamFromMap(favOutcome.name);
          if (favTeam) {
            favoriteId = favTeam.id;
            handicap = Math.abs(favOutcome.point);
          }
        } else {
          favoriteId = homeTeam.id;
          handicap = 0;
        }
      }
      
      if (totalsMarket && totalsMarket.outcomes.length > 0) {
        const point = totalsMarket.outcomes[0].point;
        if (point !== undefined) {
          overUnder = point;
        }
      }
      
      const matchKey = `${homeTeam.id}_${awayTeam.id}`;
      externalOdds[matchKey] = { favoriteId, handicap, overUnder };
    });
    
    state.externalOdds = externalOdds;
    localStorage.setItem("wc2026_external_odds", JSON.stringify(externalOdds));
  } catch (e) {
    console.error("Lỗi đồng bộ tỷ lệ kèo nhà cái:", e);
    throw e;
  }
}

// ──────────────────────────────────────────────
// ĐIỀU KHIỂN POPUP CẤU HÌNH KÈO
// ──────────────────────────────────────────────
function toggleSettingsModal() {
  const modal = document.getElementById("settings-modal");
  if (!modal) return;
  const isHidden = modal.style.display === "none";
  modal.style.display = isHidden ? "flex" : "none";
}

function saveSettings() {
  const keyInput = document.getElementById("odds-api-key");
  if (!keyInput) return;
  const key = keyInput.value.trim();
  if (key) {
    localStorage.setItem("wc2026_odds_api_key", key);
    showToast("Đã lưu API Key thành công! Hãy nhấn 'Cập Nhật Tất Cả' để tải tỷ lệ kèo mới nhất.", "success");
  } else {
    localStorage.removeItem("wc2026_odds_api_key");
    localStorage.removeItem("wc2026_external_odds");
    state.externalOdds = null;
    renderAll();
    showToast("Đã xóa API Key. Bảng kèo sẽ dựa trên tỷ lệ thực tế đã lưu hoặc đang cập nhật.", "info");
  }
  toggleSettingsModal();
}

// ──────────────────────────────────────────────
// HỆ THỐNG TOAST THÔNG BÁO TỰ PHÁT
// ──────────────────────────────────────────────
function showToast(message, type = "success") {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    document.body.appendChild(container);
  }
  
  const toast = document.createElement("div");
  toast.className = `toast-item ${type}`;
  
  let icon = "✅";
  if (type === "error") icon = "❌";
  if (type === "warning") icon = "⚠️";
  if (type === "info") icon = "ℹ️";
  
  const formattedMsg = message.replace(/\n/g, "<br>");
  
  toast.innerHTML = `
    <span class="toast-icon">${icon}</span>
    <div class="toast-message">${formattedMsg}</div>
    <button class="toast-close">&times;</button>
  `;
  
  toast.querySelector(".toast-close").addEventListener("click", () => {
    toast.classList.add("fade-out");
    setTimeout(() => toast.remove(), 300);
  });
  
  container.appendChild(toast);
  
  setTimeout(() => {
    if (toast.parentElement) {
      toast.classList.add("fade-out");
      setTimeout(() => toast.remove(), 300);
    }
  }, 4000);
}

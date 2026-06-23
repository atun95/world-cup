// app.js – World Cup 2026 Results Tracker
// Chỉ theo dõi kết quả thực tế, không có tính năng cá cược

let state = { matches: [], lastSync: null, syncSource: null, showAllUpcomingOdds: false };

// ──────────────────────────────────────────────
// HỖ TRỢ GIAO TIẾP VỚI STREAMLIT COMPONENT (2 CHIỀU)
// ──────────────────────────────────────────────
const StreamlitHelper = {
  sendReady() {
    window.parent.postMessage({
      isStreamlitMessage: true,
      type: "streamlit:componentReady",
      apiVersion: 1
    }, "*");
  },
  setHeight(height) {
    window.parent.postMessage({
      isStreamlitMessage: true,
      type: "streamlit:setFrameHeight",
      height: height
    }, "*");
  },
  setValue(value) {
    window.parent.postMessage({
      isStreamlitMessage: true,
      type: "streamlit:setComponentValue",
      value: value
    }, "*");
  }
};

// Lắng nghe sự kiện render từ Streamlit để cập nhật tỷ lệ kèo từ server
window.addEventListener("message", (event) => {
  if (event.data && event.data.type === "streamlit:render") {
    const args = event.data.args;
    if (args && args.server_manual_odds) {
      // Cập nhật state.manualOdds từ server
      state.manualOdds = args.server_manual_odds;
      
      // Đồng thời lưu vào localStorage làm dự phòng
      localStorage.setItem("wc2026_manual_odds", JSON.stringify(state.manualOdds));
      
      // Vẽ lại giao diện
      renderAll();
    }
  }
});

function sendHeight() {
  const wrapper = document.getElementById('app-wrapper');
  const height = wrapper ? wrapper.offsetHeight : (document.documentElement.scrollHeight || document.body.scrollHeight);
  StreamlitHelper.setHeight(height + 20);
}

// Gọi sendHeight khi load, click và resize
window.addEventListener('load', () => {
  setTimeout(sendHeight, 300);
});
document.addEventListener('click', () => {
  setTimeout(sendHeight, 100);
});
try {
  const resizeObserver = new ResizeObserver(() => sendHeight());
  const wrapperEl = document.getElementById('app-wrapper');
  if (wrapperEl) {
    resizeObserver.observe(wrapperEl);
  } else {
    resizeObserver.observe(document.body);
  }
} catch (e) {
  console.warn("ResizeObserver not supported:", e);
}


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

function getMatchKey(m) {
  if (!m || !m.team1 || !m.team2) return "";
  const teams = [m.team1.id, m.team2.id].sort();
  const stage = VALID_GROUPS.includes(m.group) ? "group" : (m.group || "ko");
  return `${teams.join("_")}_${stage}`;
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

  const savedManualOdds = localStorage.getItem("wc2026_manual_odds");
  if (savedManualOdds) {
    try {
      const parsed = JSON.parse(savedManualOdds);
      state.manualOdds = {};
      
      // Migrate old integer keys to new stable keys
      Object.entries(parsed).forEach(([key, val]) => {
        const matchId = parseInt(key);
        if (!isNaN(matchId)) {
          const m = state.matches.find(match => match.id === matchId);
          if (m) {
            const stableKey = getMatchKey(m);
            state.manualOdds[stableKey] = val;
          }
        } else {
          state.manualOdds[key] = val;
        }
      });
      localStorage.setItem("wc2026_manual_odds", JSON.stringify(state.manualOdds));
    } catch (e) {
      state.manualOdds = {};
    }
  } else {
    state.manualOdds = {};
  }

  saveMatches();
  renderAll();
  
  // Báo cáo component đã sẵn sàng cho Streamlit
  StreamlitHelper.sendReady();

  // Tự động đồng bộ khi mở app (không hiện alert)
  syncOfficialData(false);

  // Tự động cập nhật kết quả và tỷ lệ kèo sau mỗi 60 giây (1 phút)
  setInterval(() => {
    syncOfficialData(false);
  }, 60000);
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
  let goalsNote = isCompleted ? `Tổng: <strong>${(m.score1 || 0) + (m.score2 || 0)} bàn</strong>` : `Lượt ${m.round} • Bảng ${m.group}`;
  if (!isCompleted) {
    goalsNote += ` <button onclick="event.stopPropagation(); showAiAnalysis(${m.id})" style="float:right; background:rgba(6, 182, 212, 0.15); border:1px solid rgba(6, 182, 212, 0.3); color:#06b6d4; padding:2.5px 8px; border-radius:4px; font-size:10.5px; cursor:pointer; font-weight:600; display:flex; align-items:center; gap:3px;">🤖 Dự đoán AI</button>`;
  }

  // Tỷ lệ kèo chấp & tài xỉu cho trận đấu
  const odds = getMatchOdds(m);

  let oddsHtml = "";
  if (odds) {
    const favTeam = odds.favoriteId === m.team1.id ? m.team1 : m.team2;
    const handicapText = odds.handicap === 0
      ? "Đồng banh"
      : `${favTeam.name} chấp ${odds.handicap}`;
    oddsHtml = `
      <div class="match-odds-bar" style="display:flex; justify-content:space-between; align-items:center; padding: 6px 12px; background: rgba(255,255,255,0.02); border-top: 1px dashed rgba(255,255,255,0.05);">
        <span style="font-size:11px;">⚖️ <strong>Chấp:</strong> ${handicapText} &nbsp; 🔥 <strong>T/X:</strong> ${odds.overUnder}</span>
        <button class="btn-edit-odds" onclick="event.stopPropagation(); editManualOdds(${m.id}, event)" style="background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.12); color:#e4e4e7; padding:2px 6px; border-radius:4px; font-size:10px; cursor:pointer; transition: all 0.2s;">✏️ Sửa</button>
      </div>`;
  } else {
    oddsHtml = `
      <div class="match-odds-bar" style="display:flex; justify-content:space-between; align-items:center; padding: 6px 12px; background: rgba(255,255,255,0.02); border-top: 1px dashed rgba(255,255,255,0.05);">
        <span style="font-size:11px; color:var(--text-muted);">⚖️ Chưa cập nhật kèo</span>
        <button class="btn-edit-odds" onclick="event.stopPropagation(); editManualOdds(${m.id}, event)" style="background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.12); color:#e4e4e7; padding:2px 6px; border-radius:4px; font-size:10px; cursor:pointer; transition: all 0.2s;">✏️ Nhập</button>
      </div>`;
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
          <span class="team-rank">Sức mạnh ${m.team1.rating}</span>
        </div>
        <div class="score-center">${scoreHtml}</div>
        <div class="team-side">
          <span class="team-flag">${getFlagHtml(m.team2.emoji, m.team2.name, "large")}</span>
          <span class="team-name">${m.team2.name}</span>
          <span class="team-rank">Sức mạnh ${m.team2.rating}</span>
        </div>
      </div>
      ${oddsHtml}
      <div class="match-footer" style="overflow:hidden; line-height: 1.8;">${goalsNote}</div>
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
const BRACKET_TEMPLATE = [
  // Round of 32 (16 matches)
  [
    { id: 1, label: "Trận 1", t1: "Nhì A", t2: "Nhì B" },
    { id: 2, label: "Trận 2", t1: "Nhất C", t2: "Nhì F" },
    { id: 3, label: "Trận 3", t1: "Nhất A", t2: "Ba C/D/E/F" },
    { id: 4, label: "Trận 4", t1: "Nhất F", t2: "Nhì C" },
    { id: 5, label: "Trận 5", t1: "Nhì E", t2: "Nhì I" },
    { id: 6, label: "Trận 6", t1: "Nhất I", t2: "Ba C/D/F/G/H" },
    { id: 7, label: "Trận 7", t1: "Nhất E", t2: "Ba C/E/F/H/I" },
    { id: 8, label: "Trận 8", t1: "Nhất L", t2: "Ba E/H/I/J/K" },
    { id: 9, label: "Trận 9", t1: "Nhất G", t2: "Ba A/E/H/I/J" },
    { id: 10, label: "Trận 10", t1: "Nhất D", t2: "Ba B/E/F/I/J" },
    { id: 11, label: "Trận 11", t1: "Nhất H", t2: "Nhì J" },
    { id: 12, label: "Trận 12", t1: "Nhì K", t2: "Nhì L" },
    { id: 13, label: "Trận 13", t1: "Nhất B", t2: "Ba E/F/G/I/J" },
    { id: 14, label: "Trận 14", t1: "Nhì D", t2: "Nhì G" },
    { id: 15, label: "Trận 15", t1: "Nhất J", t2: "Nhì H" },
    { id: 16, label: "Trận 16", t1: "Nhất K", t2: "Ba D/E/I/J/L" }
  ],
  // Round of 16 (8 matches)
  [
    { id: 17, label: "Trận 17", t1: "Thắng Trận 1", t2: "Thắng Trận 2" },
    { id: 18, label: "Trận 18", t1: "Thắng Trận 3", t2: "Thắng Trận 4" },
    { id: 19, label: "Trận 19", t1: "Thắng Trận 5", t2: "Thắng Trận 6" },
    { id: 20, label: "Trận 20", t1: "Thắng Trận 7", t2: "Thắng Trận 8" },
    { id: 21, label: "Trận 21", t1: "Thắng Trận 9", t2: "Thắng Trận 10" },
    { id: 22, label: "Trận 22", t1: "Thắng Trận 11", t2: "Thắng Trận 12" },
    { id: 23, label: "Trận 23", t1: "Thắng Trận 13", t2: "Thắng Trận 14" },
    { id: 24, label: "Trận 24", t1: "Thắng Trận 15", t2: "Thắng Trận 16" }
  ],
  // Quarter-finals (4 matches)
  [
    { id: 25, label: "Tứ Kết 1", t1: "Thắng Trận 17", t2: "Thắng Trận 18" },
    { id: 26, label: "Tứ Kết 2", t1: "Thắng Trận 19", t2: "Thắng Trận 20" },
    { id: 27, label: "Tứ Kết 3", t1: "Thắng Trận 21", t2: "Thắng Trận 22" },
    { id: 28, label: "Tứ Kết 4", t1: "Thắng Trận 23", t2: "Thắng Trận 24" }
  ],
  // Semi-finals (2 matches)
  [
    { id: 29, label: "Bán Kết 1", t1: "Thắng Tứ Kết 1", t2: "Thắng Tứ Kết 2" },
    { id: 30, label: "Bán Kết 2", t1: "Thắng Tứ Kết 3", t2: "Thắng Tứ Kết 4" }
  ],
  // Final & 3rd Place (2 matches)
  [
    { id: 31, label: "Chung Kết", t1: "Thắng Bán Kết 1", t2: "Thắng Bán Kết 2" },
    { id: 32, label: "Tranh Hạng 3", t1: "Thua Bán Kết 1", t2: "Thua Bán Kết 2" }
  ]
];

function getBracketRoundIndex(m) {
  const name = (m.group || m.round || "").toLowerCase();
  if (name.includes("32") || name.includes("round of 32")) return 0;
  if (name.includes("16") || name.includes("round of 16") || name.includes("octofinal")) return 1;
  if (name.includes("tứ kết") || name.includes("quarter") || name.includes("quarterfinal")) return 2;
  if (name.includes("bán kết") || name.includes("semi") || name.includes("semifinal")) return 3;
  if (name.includes("chung kết") || name.includes("final") || name.includes("third place") || name.includes("tranh hạng ba") || name.includes("hạng 3")) return 4;
  return -1;
}

// Kiểm tra xem tên đội có phải là tên đại diện/placeholder hay không
function isPlaceholderTeam(name) {
  if (!name) return true;
  return isPlaceholder(name) || name.startsWith("Nhất ") || name.startsWith("Nhì ") || name.startsWith("Ba ") || name.startsWith("Thắng ") || name.startsWith("Thua ");
}

// Giải mã các chuỗi đại diện (placeholder) như "Nhất A", "Nhì B" thành tên đội tuyển thật và emoji cờ dựa trên BXH hiện tại (giữ nguyên đội hạng 3 là "Ba C/D/E/F" v.v.)
function resolveTeamNameAndEmoji(text, standings, bestThirds) {
  if (!text) return { name: "Chờ xác định", emoji: "" };

  // 1. Nhất bảng
  const matchFirst = text.match(/Nhất\s+([A-L])/i);
  if (matchFirst) {
    const group = matchFirst[1].toUpperCase();
    const team = standings[group] ? standings[group][0] : null;
    if (team) {
      return { name: team.name, emoji: team.emoji };
    }
  }

  // 2. Nhì bảng
  const matchSecond = text.match(/Nhì\s+([A-L])/i);
  if (matchSecond) {
    const group = matchSecond[1].toUpperCase();
    const team = standings[group] ? standings[group][1] : null;
    if (team) {
      return { name: team.name, emoji: team.emoji };
    }
  }

  // 3. Các trường hợp khác ("Ba C/D/E/F", "Thắng Trận 1", "Chung Kết", v.v.)
  return { name: text, emoji: "" };
}

function buildBracketNodeHtml(templateNode, matchFromState, standings, bestThirds) {
  let t1Name = templateNode.t1;
  let t2Name = templateNode.t2;
  let t1Emoji = "";
  let t2Emoji = "";
  let score1 = "-";
  let score2 = "-";
  let isLive = false;
  let isCompleted = false;
  let matchTimeStr = "Chờ xác định";
  let t1Winner = false;
  let t2Winner = false;

  // Lấy tên và cờ mặc định sau khi đã giải mã từ BXH vòng bảng
  const resolvedT1 = resolveTeamNameAndEmoji(templateNode.t1, standings, bestThirds);
  const resolvedT2 = resolveTeamNameAndEmoji(templateNode.t2, standings, bestThirds);
  t1Name = resolvedT1.name;
  t1Emoji = resolvedT1.emoji;
  t2Name = resolvedT2.name;
  t2Emoji = resolvedT2.emoji;

  if (matchFromState) {
    // Nếu trận đấu thực tế đã có trong trạng thái, ưu tiên dùng thông tin thật nếu tên đội không phải placeholder
    if (matchFromState.team1 && !isPlaceholderTeam(matchFromState.team1.name)) {
      t1Name = matchFromState.team1.name;
      t1Emoji = matchFromState.team1.emoji || "";
    }
    if (matchFromState.team2 && !isPlaceholderTeam(matchFromState.team2.name)) {
      t2Name = matchFromState.team2.name;
      t2Emoji = matchFromState.team2.emoji || "";
    }
    
    if (matchFromState.score1 !== null && matchFromState.score1 !== undefined) score1 = matchFromState.score1;
    if (matchFromState.score2 !== null && matchFromState.score2 !== undefined) score2 = matchFromState.score2;
    
    isLive = matchFromState.status === "live";
    isCompleted = matchFromState.status === "completed";
    matchTimeStr = matchFromState.date ? `${formatDate(matchFromState.date)} ${matchFromState.time}` : "Chờ xác định";
    
    if (isCompleted) {
      if (matchFromState.score1 > matchFromState.score2) t1Winner = true;
      if (matchFromState.score2 > matchFromState.score1) t2Winner = true;
    }
  }

  const flag1 = t1Emoji ? getFlagHtml(t1Emoji, t1Name, "small") : "";
  const flag2 = t2Emoji ? getFlagHtml(t2Emoji, t2Name, "small") : "";

  const liveBadge = isLive ? `<span style="color:var(--accent-pink); font-weight:800; animation: blink 1.5s infinite;">🔴 LIVE</span>` : "";

  return `
    <div class="bracket-match-node ${isLive ? 'is-live' : ''}">
      <div class="bracket-node-header">
        <span>${templateNode.label}</span>
        <span>${liveBadge || matchTimeStr}</span>
      </div>
      <div class="bracket-node-team ${t1Winner ? 'winner' : ''}">
        <span class="bracket-team-name-wrap">${flag1} <span class="bracket-team-name">${t1Name}</span></span>
        <span class="bracket-team-score">${score1}</span>
      </div>
      <div class="bracket-node-team ${t2Winner ? 'winner' : ''}">
        <span class="bracket-team-name-wrap">${flag2} <span class="bracket-team-name">${t2Name}</span></span>
        <span class="bracket-team-score">${score2}</span>
      </div>
    </div>
  `;
}

function renderKnockout() {
  const grid = document.getElementById("knockout-grid");
  const placeholder = document.querySelector(".knockout-placeholder");
  if (!grid) return;

  if (placeholder) placeholder.style.display = "none";

  // 1. Tính toán bảng xếp hạng hiện tại từ các trận đấu
  const standings = calculateStandings(state.matches);

  // 2. Tìm 8 đội hạng 3 tốt nhất
  const thirdPlacedTeams = [];
  VALID_GROUPS.forEach(g => {
    const groupTeams = standings[g];
    if (groupTeams && groupTeams.length >= 3) {
      thirdPlacedTeams.push({
        group: g,
        team: groupTeams[2]
      });
    }
  });

  thirdPlacedTeams.sort((a, b) => {
    const tA = a.team;
    const tB = b.team;
    return tB.pts !== tA.pts ? tB.pts - tA.pts :
           tB.gd  !== tA.gd  ? tB.gd  - tA.gd  :
           tB.gf  !== tA.gf  ? tB.gf  - tA.gf  :
           tB.rating - tA.rating;
  });

  const bestThirds = thirdPlacedTeams.slice(0, 8);
  // Sắp xếp các đội thứ 3 theo thứ tự bảng đấu từ A-L để gán cố định vào các nhánh
  bestThirds.sort((a, b) => a.group.localeCompare(b.group));

  const knockoutMatches = state.matches.filter(m => !VALID_GROUPS.includes(m.group));

  const stateRounds = [[], [], [], [], []];
  knockoutMatches.forEach(m => {
    const rIdx = getBracketRoundIndex(m);
    if (rIdx >= 0 && rIdx < 5) {
      stateRounds[rIdx].push(m);
    }
  });

  stateRounds.forEach(arr => {
    arr.sort((a, b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`));
  });

  // Chia đôi nhánh đấu (Trái và Phải) gặp nhau ở giữa (Chung kết)
  const cols = [
    { title: "VÒNG 32 ĐỘI (TRÁI)", template: BRACKET_TEMPLATE[0].slice(0, 8), matches: stateRounds[0].slice(0, 8) },
    { title: "VÒNG 16 ĐỘI", template: BRACKET_TEMPLATE[1].slice(0, 4), matches: stateRounds[1].slice(0, 4) },
    { title: "TỨ KẾT", template: BRACKET_TEMPLATE[2].slice(0, 2), matches: stateRounds[2].slice(0, 2) },
    { title: "BÁN KẾT", template: BRACKET_TEMPLATE[3].slice(0, 1), matches: stateRounds[3].slice(0, 1) },
    { title: "CHUNG KẾT & HẠNG 3", template: BRACKET_TEMPLATE[4], matches: stateRounds[4] },
    { title: "BÁN KẾT", template: BRACKET_TEMPLATE[3].slice(1, 2), matches: stateRounds[3].slice(1, 2) },
    { title: "TỨ KẾT", template: BRACKET_TEMPLATE[2].slice(2, 4), matches: stateRounds[2].slice(2, 4) },
    { title: "VÒNG 16 ĐỘI", template: BRACKET_TEMPLATE[1].slice(4, 8), matches: stateRounds[1].slice(4, 8) },
    { title: "VÒNG 32 ĐỘI (PHẢI)", template: BRACKET_TEMPLATE[0].slice(8, 16), matches: stateRounds[0].slice(8, 16) }
  ];

  let html = `
    <!-- Thanh điều hướng nhanh trên Mobile -->
    <div class="bracket-nav-mobile">
      <button class="br-nav-btn active" onclick="scrollBracket('left')">◀ Nhánh Trái</button>
      <button class="br-nav-btn" onclick="scrollBracket('center')">🏆 Chung Kết</button>
      <button class="br-nav-btn" onclick="scrollBracket('right')">Nhánh Phải ▶</button>
    </div>

    <div class="bracket-container" onscroll="syncBracketNavActiveButton()">
      <div class="bracket-scroll-wrapper">
  `;

  cols.forEach(col => {
    const nodesHtml = col.template.map((node, nodeIdx) => {
      const match = col.matches[nodeIdx] || null;
      return buildBracketNodeHtml(node, match, standings, bestThirds);
    }).join("");

    html += `
      <div class="bracket-column">
        <div class="bracket-column-title">${col.title}</div>
        <div class="bracket-match-list">
          ${nodesHtml}
        </div>
      </div>
    `;
  });

  html += `
      </div>
    </div>
  `;

  grid.innerHTML = html;
}

function scrollBracket(dir) {
  const container = document.querySelector(".bracket-container");
  if (!container) return;
  const maxScroll = container.scrollWidth - container.clientWidth;
  
  const buttons = document.querySelectorAll(".br-nav-btn");
  buttons.forEach(btn => btn.classList.remove("active"));
  
  let targetBtn = null;
  if (dir === 'left') {
    container.scrollTo({ left: 0, behavior: 'smooth' });
    targetBtn = buttons[0];
  } else if (dir === 'right') {
    container.scrollTo({ left: maxScroll, behavior: 'smooth' });
    targetBtn = buttons[2];
  } else {
    container.scrollTo({ left: maxScroll / 2, behavior: 'smooth' });
    targetBtn = buttons[1];
  }
  if (targetBtn) targetBtn.classList.add("active");
}

function syncBracketNavActiveButton() {
  const container = document.querySelector(".bracket-container");
  if (!container) return;
  const maxScroll = container.scrollWidth - container.clientWidth;
  if (maxScroll <= 0) return;
  
  const scrollLeft = container.scrollLeft;
  const ratio = scrollLeft / maxScroll;
  
  let activeIdx = 1;
  if (ratio < 0.3) {
    activeIdx = 0;
  } else if (ratio > 0.7) {
    activeIdx = 2;
  }
  
  const buttons = document.querySelectorAll(".br-nav-btn");
  if (buttons.length === 3) {
    buttons.forEach((btn, idx) => {
      btn.classList.toggle("active", idx === activeIdx);
    });
  }
}

function switchTab(tabId, el) {
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
  document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
  if (el) el.classList.add("active");
  const tab = document.getElementById(tabId);
  if (tab) tab.classList.add("active");

  if (tabId === "matches-tab") {
    renderMatches();
  } else if (tabId === "standings-tab") {
    renderStandings();
  } else if (tabId === "odds-tab") {
    renderOddsResults();
  } else if (tabId === "knockout-tab") {
    renderKnockout();
  }
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

    // 2. Đồng bộ tỷ lệ kèo nếu có API Key (giới hạn tần suất để tránh hết lượt API miễn phí)
    const apiKey = localStorage.getItem("wc2026_odds_api_key");
    let oddsSynced = false;
    let oddsErrorMsg = "";
    if (apiKey) {
      const lastOddsSyncStr = localStorage.getItem("wc2026_last_odds_sync");
      const lastOddsSync = lastOddsSyncStr ? parseInt(lastOddsSyncStr) : 0;
      // Chỉ đồng bộ nếu bấm thủ công (showAlert = true) hoặc cách lần đồng bộ trước trên 1 tiếng
      const shouldSyncOdds = showAlert || (Date.now() - lastOddsSync > 3600000);

      if (shouldSyncOdds) {
        try {
          await syncExternalOdds(apiKey);
          localStorage.setItem("wc2026_last_odds_sync", Date.now().toString());
          oddsSynced = true;
        } catch (err) {
          oddsErrorMsg = "\n⚠️ Không thể tải kèo nhà cái (vui lòng kiểm tra lại API Key hoặc mạng).";
        }
      } else {
        oddsSynced = true; // Bỏ qua không báo lỗi, giữ nguyên dữ liệu đã lưu
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

// Bộ kèo nhà cái thực tế lịch sử cho 28 trận vòng bảng đã diễn ra
const HISTORICAL_ODDS = {
  "mexico_south_africa": { favoriteId: "mexico", handicap: 0.75, overUnder: 2.25 },
  "south_korea_czechia": { favoriteId: "czechia", handicap: 0.25, overUnder: 2.25 },
  "czechia_south_africa": { favoriteId: "czechia", handicap: 0.5, overUnder: 2.25 },
  "mexico_south_korea": { favoriteId: "mexico", handicap: 0.5, overUnder: 2.25 },
  "canada_bosnia": { favoriteId: "canada", handicap: 0.25, overUnder: 2.25 },
  "qatar_switzerland": { favoriteId: "switzerland", handicap: 0.75, overUnder: 2.5 },
  "switzerland_bosnia": { favoriteId: "switzerland", handicap: 0.75, overUnder: 2.25 },
  "canada_qatar": { favoriteId: "canada", handicap: 1.25, overUnder: 2.5 },
  "brazil_morocco": { favoriteId: "brazil", handicap: 0.75, overUnder: 2.5 },
  "brazil_haiti": { favoriteId: "brazil", handicap: 2.0, overUnder: 3.5 },
  "haiti_scotland": { favoriteId: "scotland", handicap: 0.75, overUnder: 2.25 },
  "usa_paraguay": { favoriteId: "usa", handicap: 0.5, overUnder: 2.25 },
  "australia_turkey": { favoriteId: "turkey", handicap: 0.25, overUnder: 2.25 },
  "germany_curacao": { favoriteId: "germany", handicap: 1.5, overUnder: 3.0 },
  "germany_ivory_coast": { favoriteId: "germany", handicap: 1.0, overUnder: 3.0 },
  "ivory_coast_ecuador": { favoriteId: "ecuador", handicap: 0.25, overUnder: 2.25 },
  "netherlands_japan": { favoriteId: "netherlands", handicap: 0.5, overUnder: 2.5 },
  "sweden_tunisia": { favoriteId: "sweden", handicap: 0.75, overUnder: 2.25 },
  "belgium_egypt": { favoriteId: "belgium", handicap: 0.75, overUnder: 2.25 },
  "iran_new_zealand": { favoriteId: "iran", handicap: 0.75, overUnder: 2.25 },
  "spain_cape_verde": { favoriteId: "spain", handicap: 1.5, overUnder: 2.75 },
  "saudi_arabia_uruguay": { favoriteId: "uruguay", handicap: 1.0, overUnder: 2.5 },
  "france_senegal": { favoriteId: "france", handicap: 1.0, overUnder: 2.5 },
  "iraq_norway": { favoriteId: "norway", handicap: 0.75, overUnder: 2.5 },
  "argentina_algeria": { favoriteId: "argentina", handicap: 1.25, overUnder: 2.75 },
  "austria_jordan": { favoriteId: "austria", handicap: 1.0, overUnder: 2.5 },
  "portugal_dr_congo": { favoriteId: "portugal", handicap: 1.25, overUnder: 2.5 },
  "uzbekistan_colombia": { favoriteId: "colombia", handicap: 0.75, overUnder: 2.25 },
  "england_croatia": { favoriteId: "england", handicap: 0.5, overUnder: 2.25 },
  "ghana_panama": { favoriteId: "ghana", handicap: 0.5, overUnder: 2.25 }
};

function estimateOddsFromRating(t1, t2) {
  const rating1 = t1.rating || 1500;
  const rating2 = t2.rating || 1500;
  const diff = rating1 - rating2;

  const absDiff = Math.abs(diff);
  let rawHandicap = 0;
  if (absDiff >= 250) rawHandicap = 1.5;
  else if (absDiff >= 180) rawHandicap = 1.25;
  else if (absDiff >= 120) rawHandicap = 1.0;
  else if (absDiff >= 80) rawHandicap = 0.75;
  else if (absDiff >= 40) rawHandicap = 0.5;
  else if (absDiff >= 15) rawHandicap = 0.25;

  const favoriteId = diff >= 0 ? t1.id : t2.id;

  const attackSum = (t1.attack || 75) + (t2.attack || 75);
  let overUnder = 2.5;
  if (attackSum >= 165) overUnder = 3.0;
  else if (attackSum >= 158) overUnder = 2.75;
  else if (attackSum <= 140) overUnder = 2.25;

  return {
    favoriteId,
    handicap: rawHandicap,
    overUnder,
    isReal: false
  };
}

function getMatchOdds(m) {
  // 1. Ưu tiên hàng đầu: Kèo do người dùng nhập bằng tay
  const key = getMatchKey(m);
  if (state.manualOdds && state.manualOdds[key]) {
    return {
      favoriteId: state.manualOdds[key].favoriteId,
      handicap: state.manualOdds[key].handicap,
      overUnder: state.manualOdds[key].overUnder,
      isReal: true,
      isManual: true
    };
  }

  // 2. Kiểm tra xem có tỷ lệ kèo ngoài nhà cái đã đồng bộ không
  if (state.externalOdds) {
    const key1 = `${m.team1.id}_${m.team2.id}`;
    const key2 = `${m.team2.id}_${m.team1.id}`;
    const ext = state.externalOdds[key1] || state.externalOdds[key2];
    if (ext) {
      return {
        favoriteId: ext.favoriteId,
        handicap: ext.handicap,
        overUnder: ext.overUnder,
        isReal: true
      };
    }
  }

  // 3. Kiểm tra trong bộ kèo lịch sử cố định (dành cho các trận đã qua)
  const key1 = `${m.team1.id}_${m.team2.id}`;
  const key2 = `${m.team2.id}_${m.team1.id}`;
  const hist = HISTORICAL_ODDS[key1] || HISTORICAL_ODDS[key2];
  if (hist) {
    return {
      favoriteId: hist.favoriteId,
      handicap: hist.handicap,
      overUnder: hist.overUnder,
      isReal: true
    };
  }

  // Giữ nguyên tỷ lệ kèo AI/ELO cho các trận đấu đã diễn ra trước trận Bồ Đào Nha vs Uzbekistan (2026-06-22T18:00)
  // Chỉ từ trận Bồ Đào Nha vs Uzbekistan trở đi mới không dùng AI và cho phép nhập tay
  const matchDateTime = new Date(`${m.date}T${m.time}`);
  const cutoffDateTime = new Date("2026-06-22T18:00:00");

  if (matchDateTime < cutoffDateTime) {
    if (m.status === "completed" || m.status === "live") {
      return estimateOddsFromRating(m.team1, m.team2);
    }
  }

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

  // Lấy tất cả các trận đấu
  const list = [...state.matches];
  const completed = list.filter(m => m.status === "completed");

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:50px">
      <div style="font-size:36px;margin-bottom:12px">⚽</div>Chưa có trận đấu nào</td></tr>`;
    if (summaryBar) summaryBar.innerHTML = "";
    return;
  }

  // Tổng hợp (chỉ tính các trận đã hoàn thành)
  let favWins = 0, dogWins = 0, pushH = 0;
  let overs = 0, unders = 0, pushOU = 0;

  completed.forEach(m => {
    const odds = getMatchOdds(m);
    if (odds) {
      const hRes = calcHandicapResult(m, odds);
      const ouRes = calcOUResult(m, odds);
      if (hRes === "fav_win") favWins++;
      else if (hRes === "dog_win") dogWins++;
      else pushH++;
      if (ouRes?.result === "over") overs++;
      else if (ouRes?.result === "under") unders++;
      else pushOU++;
    }
  });

  // Tách các loại trận đấu để sắp xếp và hiển thị
  const liveMatches = list.filter(m => m.status === "live");
  const upcomingMatches = list.filter(m => m.status === "upcoming");
  const completedMatches = list.filter(m => m.status === "completed");

  // Sắp xếp
  liveMatches.sort((a, b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`));
  upcomingMatches.sort((a, b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`));
  completedMatches.sort((a, b) => new Date(`${b.date}T${b.time}`) - new Date(`${a.date}T${a.time}`));

  // Thu gọn các trận sắp diễn ra: mặc định chỉ hiện 4 trận gần nhất
  let visibleUpcoming = [...upcomingMatches];
  let showToggleRow = false;
  let remainingCount = 0;

  if (upcomingMatches.length > 4) {
    if (!state.hasOwnProperty("showAllUpcomingOdds")) {
      state.showAllUpcomingOdds = false;
    }
    if (!state.showAllUpcomingOdds) {
      visibleUpcoming = upcomingMatches.slice(0, 4);
      showToggleRow = true;
      remainingCount = upcomingMatches.length - 4;
    }
  }

  // Hàm phụ vẽ từng hàng trận đấu
  function renderOddsRowHtml(m) {
    const odds = getMatchOdds(m);
    
    const isGroupMatch = VALID_GROUPS.includes(m.group);
    const dateFormatted = formatDate(m.date);
    const dateShort = dateFormatted.substring(0, 5); // Bỏ năm
    
    const metaTextFull = isGroupMatch
      ? `Bảng ${m.group} • L${m.round} • ${dateFormatted}`
      : `${m.group} • ${dateFormatted}`;
      
    const metaTextShort = isGroupMatch
      ? `Bảng ${m.group} • L${m.round} • ${dateShort}`
      : `${m.group} • ${dateShort}`;
      
    const metaText = `<span class="full-name">${metaTextFull}</span><span class="short-code">${metaTextShort}</span>`;

    // Hiển thị tỉ số hoặc trạng thái
    let scoreText = "";
    if (m.status === "live") {
      scoreText = `<span style="color:var(--accent-pink); font-weight:bold;">${m.score1} - ${m.score2}</span><span style="font-size:10px; display:block; color:var(--accent-pink); font-weight:bold; margin-top:2px;">🔴 LIVE ${m.minute}'</span>`;
    } else if (m.status === "completed") {
      scoreText = `<div class="odds-score">${m.score1} - ${m.score2}</div>`;
    } else {
      scoreText = `<span style="color:var(--text-muted); font-size:12px; font-weight:bold;">VS</span><span style="font-size:10px; display:block; color:var(--text-muted); margin-top:2px;">${m.time}</span>`;
    }

    if (!odds) {
      return `
        <tr>
          <td>
            <div class="odds-match-meta">${metaText}</div>
            <div class="odds-match-name" style="display:flex; align-items:center; flex-wrap:wrap; gap:4px;">
              <span class="odds-flag-span">${getFlagHtml(m.team1.emoji, m.team1.name, "normal")}</span>
              <span class="full-name">${m.team1.name}</span>
              <span class="short-code">${m.team1.code}</span>
              <span class="odds-vs-span">vs</span>
              <span class="odds-flag-span">${getFlagHtml(m.team2.emoji, m.team2.name, "normal")}</span>
              <span class="full-name">${m.team2.name}</span>
              <span class="short-code">${m.team2.code}</span>
              <button class="btn-edit-odds" onclick="event.stopPropagation(); editManualOdds(${m.id}, event)" style="background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.12); color:#e4e4e7; padding:1px 4px; border-radius:3px; font-size:9.5px; cursor:pointer; margin-left:6px;" title="Nhập/Sửa kèo">✏️</button>
            </div>
          </td>
          <td style="text-align:center">
            <div class="odds-meta-placeholder"></div>
            ${scoreText}
          </td>
          <td>
            <div class="odds-line-label">Kèo Chấp</div>
            <span class="odds-tag tag-pending"><span class="full-name">Chưa cập nhật kèo</span><span class="short-code">Chưa kèo</span></span>
          </td>
          <td>
            <div class="odds-line-label">Tài Xỉu</div>
            <span class="odds-tag tag-pending"><span class="full-name">Chưa cập nhật kèo</span><span class="short-code">Chưa kèo</span></span>
          </td>
        </tr>`;
    }

    const favTeam = odds.favoriteId === m.team1.id ? m.team1 : m.team2;
    const dogTeam = odds.favoriteId === m.team1.id ? m.team2 : m.team1;

    // Hiển thị nguồn kèo (chỉ hiển thị nhãn AI khi là kèo tự động ước lượng)
    const oddsSourceTag = odds.isReal
      ? ""
      : `<span class="odds-source-badge elo" title="Kèo ước lượng của AI">AI</span>`;

    // HTML kèo chấp và tài xỉu
    const hcapLabel = odds.handicap === 0
      ? `<span class="full-name">Đồng banh ${oddsSourceTag}</span><span class="short-code">Đồng ${oddsSourceTag}</span>`
      : `<span class="full-name">${getFlagHtml(favTeam.emoji, favTeam.name, "normal")} ${favTeam.name} chấp ${odds.handicap} ${oddsSourceTag}</span>` +
      `<span class="short-code">${favTeam.code} chấp ${odds.handicap} ${oddsSourceTag}</span>`;
    const ouLabel = `<span class="full-name">Mốc ${odds.overUnder}</span><span class="short-code">Mốc ${odds.overUnder}</span>`;

    let hcapClass = "";
    let hcapText = "";
    let ouClass = "";
    let ouText = "";

    if (m.status === "completed") {
      const hRes = calcHandicapResult(m, odds);
      const ouRes = calcOUResult(m, odds);

      hcapClass = hRes === "fav_win" ? "tag-win" : hRes === "dog_win" ? "tag-lose" : "tag-push";
      const hcapTextFull = hRes === "fav_win"
        ? `✅ ${getFlagHtml(favTeam.emoji, favTeam.name, "normal")} Thắng kèo`
        : hRes === "dog_win"
          ? `❌ ${getFlagHtml(dogTeam.emoji, dogTeam.name, "normal")} Bất ngờ thắng`
          : `⚖️ Hòa kèo`;
      const hcapTextShort = hRes === "fav_win" ? `✅ Thắng` : hRes === "dog_win" ? `❌ Dưới` : `⚖️ Hòa`;
      hcapText = `<span class="full-name">${hcapTextFull}</span><span class="short-code">${hcapTextShort}</span>`;

      ouClass = ouRes?.result === "over" ? "tag-win" : ouRes?.result === "under" ? "tag-lose" : "tag-push";
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
      ouText = `<span class="full-name">${ouTextFull}</span><span class="short-code">${ouTextShort}</span>`;
    } else if (m.status === "live") {
      hcapClass = "tag-live";
      hcapText = `<span class="full-name">🔴 Đang trực tiếp</span><span class="short-code">🔴 Trực tiếp</span>`;
      ouClass = "tag-live";
      ouText = `<span class="full-name">🔴 Đang trực tiếp</span><span class="short-code">🔴 Trực tiếp</span>`;
    } else {
      hcapClass = "tag-pending";
      hcapText = `<span class="full-name">Chờ thi đấu</span><span class="short-code">Chờ đấu</span>`;
      ouClass = "tag-pending";
      ouText = `<span class="full-name">Chờ thi đấu</span><span class="short-code">Chờ đấu</span>`;
    }

    return `
      <tr>
        <td>
          <div class="odds-match-meta">${metaText}</div>
          <div class="odds-match-name" style="display:flex; align-items:center; flex-wrap:wrap; gap:4px;">
            <span class="odds-flag-span">${getFlagHtml(m.team1.emoji, m.team1.name, "normal")}</span>
            <span class="full-name">${m.team1.name}</span>
            <span class="short-code">${m.team1.code}</span>
            <span class="odds-vs-span">vs</span>
            <span class="odds-flag-span">${getFlagHtml(m.team2.emoji, m.team2.name, "normal")}</span>
            <span class="full-name">${m.team2.name}</span>
            <span class="short-code">${m.team2.code}</span>
            <button class="btn-edit-odds" onclick="event.stopPropagation(); editManualOdds(${m.id}, event)" style="background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.12); color:#e4e4e7; padding:1px 4px; border-radius:3px; font-size:9.5px; cursor:pointer; margin-left:6px;" title="Nhập/Sửa kèo">✏️</button>
          </div>
        </td>
        <td style="text-align:center">
          <div class="odds-meta-placeholder"></div>
          ${scoreText}
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
  }

  const liveRows = liveMatches.map(m => renderOddsRowHtml(m));
  const upcomingRows = visibleUpcoming.map(m => renderOddsRowHtml(m));
  const completedRows = completedMatches.map(m => renderOddsRowHtml(m));

  let toggleRowHtml = "";
  if (upcomingMatches.length > 4) {
    if (showToggleRow) {
      toggleRowHtml = `
        <tr id="odds-upcoming-toggle-row">
          <td colspan="4" style="text-align:center; padding: 14px 12px; background: rgba(6, 182, 212, 0.02); border-top: 1px dashed rgba(6, 182, 212, 0.15); border-bottom: 1px dashed rgba(6, 182, 212, 0.15);">
            <button onclick="toggleUpcomingOdds(true)" style="background: rgba(6, 182, 212, 0.12); border: 1.5px solid rgba(6, 182, 212, 0.35); color: var(--accent-cyan); padding: 5px 14px; border-radius: 6px; font-size: 11.5px; font-weight: 700; cursor: pointer; transition: all 0.2s;">
              ➕ Xem tất cả các trận sắp diễn ra (còn ẩn ${remainingCount} trận)
            </button>
          </td>
        </tr>`;
    } else {
      toggleRowHtml = `
        <tr id="odds-upcoming-toggle-row">
          <td colspan="4" style="text-align:center; padding: 14px 12px; background: rgba(255, 255, 255, 0.01); border-top: 1px dashed rgba(255,255,255,0.06); border-bottom: 1px dashed rgba(255,255,255,0.06);">
            <button onclick="toggleUpcomingOdds(false)" style="background: rgba(255, 255, 255, 0.06); border: 1px dashed rgba(255, 255, 255, 0.12); color: var(--text-sub); padding: 5px 14px; border-radius: 6px; font-size: 11.5px; font-weight: 700; cursor: pointer; transition: all 0.2s;">
              ➖ Thu gọn danh sách trận sắp diễn ra
            </button>
          </td>
        </tr>`;
    }
  }

  tbody.innerHTML = [
    ...liveRows,
    ...upcomingRows,
    toggleRowHtml ? [toggleRowHtml] : [],
    ...completedRows
  ].flat().join("");

  // Summary bar (chỉ tính cho các trận đã kết thúc)
  if (summaryBar) {
    const chronoMatches = [...completed].sort((a, b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`));
    let runningFav = 0;
    let runningDog = 0;
    let runningOver = 0;
    let runningUnder = 0;
    let maxHandicapDiff = 0;
    let maxOuDiff = 0;

    chronoMatches.forEach(m => {
      const odds = getMatchOdds(m);
      if (odds) {
        const hRes = calcHandicapResult(m, odds);
        const ouRes = calcOUResult(m, odds);

        if (hRes === "fav_win") runningFav++;
        else if (hRes === "dog_win") runningDog++;

        if (ouRes?.result === "over") runningOver++;
        else if (ouRes?.result === "under") runningUnder++;

        const currentHDiff = Math.abs(runningFav - runningDog);
        if (currentHDiff > maxHandicapDiff) maxHandicapDiff = currentHDiff;

        const currentOuDiff = Math.abs(runningOver - runningUnder);
        if (currentOuDiff > maxOuDiff) maxOuDiff = currentOuDiff;
      }
    });

    const currentHDiff = Math.abs(favWins - dogWins);
    const hLeader = favWins > dogWins ? "Kèo trên" : (dogWins > favWins ? "Kèo dưới" : "Cân bằng");
    const hLeaderText = hLeader === "Cân bằng" ? "Cân bằng" : `${hLeader} +${currentHDiff}`;

    const currentOuDiff = Math.abs(overs - unders);
    const ouLeader = overs > unders ? "Tài" : (unders > overs ? "Xỉu" : "Cân bằng");
    const ouLeaderText = ouLeader === "Cân bằng" ? "Cân bằng" : `${ouLeader} +${currentOuDiff}`;

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
      <div class="odds-stat-card odds-diff-card">
        <div class="odds-stat-val text-yellow">${maxHandicapDiff}</div>
        <div class="odds-stat-label">Chênh lệnh Kèo lớn nhất</div>
        <div class="odds-stat-sub">Hiện tại: ${hLeaderText}</div>
      </div>
      <div class="odds-stat-card odds-diff-card">
        <div class="odds-stat-val text-yellow">${maxOuDiff}</div>
        <div class="odds-stat-label">Chênh lệch Tài/Xỉu lớn nhất</div>
        <div class="odds-stat-sub">Hiện tại: ${ouLeaderText}</div>
      </div>
    `;
  }
}

// Hàm global hỗ trợ bấm nút thu gọn/mở rộng trận sắp diễn ra
window.toggleUpcomingOdds = function(showAll) {
  state.showAllUpcomingOdds = showAll;
  renderOddsResults();
};

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
function toggleSettingsModal(event) {
  const modal = document.getElementById("settings-modal");
  if (!modal) return;
  const isHidden = modal.style.display === "none";
  if (isHidden) {
    let clickY = 150;
    if (event) {
      clickY = event.pageY || event.clientY;
    } else if (window.event) {
      clickY = window.event.pageY || window.event.clientY;
    }
    modal.style.position = "absolute";
    modal.style.alignItems = "flex-start";
    modal.style.justifyContent = "center";
    modal.style.height = `${document.documentElement.scrollHeight || document.body.scrollHeight}px`;
    modal.style.paddingTop = `${Math.max(20, clickY - 100)}px`;
    modal.style.display = "flex";
  } else {
    modal.style.display = "none";
  }
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

// ──────────────────────────────────────────────
// MÔ HÌNH DỰ ĐOÁN AI (AI PREDICTOR)
// ──────────────────────────────────────────────
function getDeterministicRandom(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function getTeamForm(teamId, beforeDateStr) {
  let matchesPlayed = 0;
  let goalsScored = 0;
  let goalsConceded = 0;
  let points = 0;

  const dateLimit = beforeDateStr ? new Date(beforeDateStr) : new Date();

  state.matches.forEach(m => {
    if (m.status !== "completed") return;
    const matchDate = new Date(`${m.date}T${m.time}`);
    if (beforeDateStr && matchDate >= dateLimit) return;

    if (m.team1.id === teamId) {
      matchesPlayed++;
      goalsScored += m.score1;
      goalsConceded += m.score2;
      if (m.score1 > m.score2) points += 3;
      else if (m.score1 === m.score2) points += 1;
    } else if (m.team2.id === teamId) {
      matchesPlayed++;
      goalsScored += m.score2;
      goalsConceded += m.score1;
      if (m.score2 > m.score1) points += 3;
      else if (m.score1 === m.score2) points += 1;
    }
  });

  return {
    matchesPlayed,
    avgScored: matchesPlayed > 0 ? goalsScored / matchesPlayed : 0,
    avgConceded: matchesPlayed > 0 ? goalsConceded / matchesPlayed : 0,
    formIndex: matchesPlayed > 0 ? points / (matchesPlayed * 3) : 0.5
  };
}

// ──────────────────────────────────────────────
// CHỨC NĂNG NHẬP KÈO THỦ CÔNG
// ──────────────────────────────────────────────

// ──────────────────────────────────────────────
// CHỨC NĂNG NHẬP KÈO THỦ CÔNG
// ──────────────────────────────────────────────
function editManualOdds(matchId, event) {
  const m = state.matches.find(match => match.id === matchId);
  if (!m) return;

  // Lấy kèo hiện tại (nếu có)
  const currentOdds = getMatchOdds(m) || { favoriteId: m.team1.id, handicap: 0.5, overUnder: 2.5 };

  // Tạo modal nếu chưa có
  let modal = document.getElementById("manual-odds-modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "manual-odds-modal";
    modal.className = "modal-overlay";
    modal.style.display = "none";
    document.body.appendChild(modal);
  }

  // Căn chỉnh vị trí của popup ngay trước mặt (nơi người dùng bấm chuột)
  let clickY = 300;
  if (event) {
    clickY = event.pageY || event.clientY;
  } else if (window.event) {
    clickY = window.event.pageY || window.event.clientY;
  }
  
  modal.style.position = "absolute";
  modal.style.alignItems = "flex-start";
  modal.style.justifyContent = "center";
  modal.style.height = `${document.documentElement.scrollHeight || document.body.scrollHeight}px`;
  modal.style.paddingTop = `${Math.max(20, clickY - 180)}px`;

  // Nội dung modal
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 350px;">
      <div class="modal-header">
        <h3>✏️ Nhập/Sửa Kèo Thủ Công</h3>
        <button class="close-btn" onclick="closeManualOddsModal()">&times;</button>
      </div>
      <div class="modal-body" style="display:flex; flex-direction:column; gap:12px; font-size:13px;">
        <p style="margin:0 0 8px 0; color:var(--text-muted); text-align:center; font-weight:600;">
          ${m.team1.name} vs ${m.team2.name}
        </p>
        
        <div style="display:flex; flex-direction:column; gap:4px;">
          <label style="font-weight:600; color:var(--accent-cyan);">👑 Đội cửa trên (Chấp):</label>
          <select id="mo-fav-id" style="background:#27272a; color:#fff; border:1px solid #3f3f46; padding:6px; border-radius:6px; outline:none;">
            <option value="${m.team1.id}" ${currentOdds.favoriteId === m.team1.id ? "selected" : ""}>${m.team1.name}</option>
            <option value="${m.team2.id}" ${currentOdds.favoriteId === m.team2.id ? "selected" : ""}>${m.team2.name}</option>
          </select>
        </div>

        <div style="display:flex; flex-direction:column; gap:4px;">
          <label style="font-weight:600; color:var(--accent-cyan);">⚖️ Tỷ lệ chấp:</label>
          <select id="mo-handicap" style="background:#27272a; color:#fff; border:1px solid #3f3f46; padding:6px; border-radius:6px; outline:none;">
            <option value="0" ${currentOdds.handicap === 0 ? "selected" : ""}>Đồng banh (0)</option>
            <option value="0.25" ${currentOdds.handicap === 0.25 ? "selected" : ""}>0.25 (1/4)</option>
            <option value="0.5" ${currentOdds.handicap === 0.5 ? "selected" : ""}>0.5 (1/2)</option>
            <option value="0.75" ${currentOdds.handicap === 0.75 ? "selected" : ""}>0.75 (3/4)</option>
            <option value="1" ${currentOdds.handicap === 1.0 ? "selected" : ""}>1.0 (Chấp 1)</option>
            <option value="1.25" ${currentOdds.handicap === 1.25 ? "selected" : ""}>1.25 (1 1/4)</option>
            <option value="1.5" ${currentOdds.handicap === 1.5 ? "selected" : ""}>1.5 (1 1/2)</option>
            <option value="1.75" ${currentOdds.handicap === 1.75 ? "selected" : ""}>1.75 (1 3/4)</option>
            <option value="2" ${currentOdds.handicap === 2.0 ? "selected" : ""}>2.0 (Chấp 2)</option>
            <option value="2.25" ${currentOdds.handicap === 2.25 ? "selected" : ""}>2.25 (2 1/4)</option>
            <option value="2.5" ${currentOdds.handicap === 2.5 ? "selected" : ""}>2.5 (2 1/2)</option>
          </select>
        </div>

        <div style="display:flex; flex-direction:column; gap:4px;">
          <label style="font-weight:600; color:var(--accent-cyan);">🔥 Tỷ lệ Tài/Xỉu:</label>
          <select id="mo-ou" style="background:#27272a; color:#fff; border:1px solid #3f3f46; padding:6px; border-radius:6px; outline:none;">
            <option value="1.5" ${currentOdds.overUnder === 1.5 ? "selected" : ""}>1.5</option>
            <option value="1.75" ${currentOdds.overUnder === 1.75 ? "selected" : ""}>1.75</option>
            <option value="2" ${currentOdds.overUnder === 2.0 ? "selected" : ""}>2.0</option>
            <option value="2.25" ${currentOdds.overUnder === 2.25 ? "selected" : ""}>2.25</option>
            <option value="2.5" ${currentOdds.overUnder === 2.5 ? "selected" : ""}>2.5</option>
            <option value="2.75" ${currentOdds.overUnder === 2.75 ? "selected" : ""}>2.75</option>
            <option value="3" ${currentOdds.overUnder === 3.0 ? "selected" : ""}>3.0</option>
            <option value="3.25" ${currentOdds.overUnder === 3.25 ? "selected" : ""}>3.25</option>
            <option value="3.5" ${currentOdds.overUnder === 3.5 ? "selected" : ""}>3.5</option>
          </select>
        </div>

        <div style="display:flex; gap:10px; margin-top:8px;">
          <button onclick="saveManualOdds(${matchId})" style="flex:1; background:var(--accent-cyan); border:none; color:#0b0f19; padding:8px; border-radius:6px; font-weight:800; cursor:pointer; box-shadow:0 0 10px rgba(0,212,255,0.3); transition:all 0.2s;">Lưu lại</button>
          <button onclick="clearManualOdds(${matchId})" style="background:rgba(239,68,68,0.2); border:1px solid rgba(239,68,68,0.4); color:#f87171; padding:8px; border-radius:6px; font-weight:600; cursor:pointer;">Xóa kèo</button>
        </div>
      </div>
    </div>
  `;

  modal.style.display = "flex";
}

function closeManualOddsModal() {
  const modal = document.getElementById("manual-odds-modal");
  if (modal) modal.style.display = "none";
}

function saveManualOdds(matchId) {
  const m = state.matches.find(match => match.id === matchId);
  if (!m) return;

  const favoriteId = document.getElementById("mo-fav-id").value;
  const handicap = parseFloat(document.getElementById("mo-handicap").value);
  const overUnder = parseFloat(document.getElementById("mo-ou").value);

  const key = getMatchKey(m);
  if (!state.manualOdds) state.manualOdds = {};
  state.manualOdds[key] = { favoriteId, handicap, overUnder };

  localStorage.setItem("wc2026_manual_odds", JSON.stringify(state.manualOdds));
  
  // Gửi tỷ lệ kèo mới lên server qua Streamlit
  StreamlitHelper.setValue(state.manualOdds);

  closeManualOddsModal();
  renderAll();
  showToast("Đã cập nhật kèo thủ công thành công!", "success");
}

function clearManualOdds(matchId) {
  const m = state.matches.find(match => match.id === matchId);
  if (!m) return;

  const key = getMatchKey(m);
  if (state.manualOdds && state.manualOdds[key]) {
    delete state.manualOdds[key];
    localStorage.setItem("wc2026_manual_odds", JSON.stringify(state.manualOdds));
    
    // Gửi tỷ lệ kèo mới lên server qua Streamlit (sau khi đã xóa)
    StreamlitHelper.setValue(state.manualOdds);
  }
  closeManualOddsModal();
  renderAll();
  showToast("Đã xóa kèo thủ công, chuyển sang dùng tỷ lệ mặc định.", "info");
}

// data.js – Dữ liệu đội bóng & hàm tính toán World Cup 2026
// Bảng đấu chính thức FIFA 2026 (đồng bộ từ openfootball/worldcup.json)

const TEAMS = [
  // Group A
  { id:"mexico",       name:"Mexico",           code:"MEX", group:"A", rating:1680, attack:79, defense:77, emoji:"🇲🇽" },
  { id:"south_africa", name:"Nam Phi",          code:"RSA", group:"A", rating:1520, attack:72, defense:72, emoji:"🇿🇦" },
  { id:"south_korea",  name:"Hàn Quốc",         code:"KOR", group:"A", rating:1560, attack:76, defense:73, emoji:"🇰🇷" },
  { id:"czechia",      name:"Cộng Hòa Séc",     code:"CZE", group:"A", rating:1580, attack:75, defense:76, emoji:"🇨🇿" },
  // Group B
  { id:"canada",       name:"Canada",           code:"CAN", group:"B", rating:1540, attack:74, defense:72, emoji:"🇨🇦" },
  { id:"bosnia",       name:"Bosnia",           code:"BIH", group:"B", rating:1480, attack:71, defense:70, emoji:"🇧🇦" },
  { id:"qatar",        name:"Qatar",            code:"QAT", group:"B", rating:1420, attack:68, defense:67, emoji:"🇶🇦" },
  { id:"switzerland",  name:"Thụy Sĩ",          code:"SUI", group:"B", rating:1610, attack:76, defense:77, emoji:"🇨🇭" },
  // Group C
  { id:"brazil",       name:"Brazil",           code:"BRA", group:"C", rating:1820, attack:88, defense:84, emoji:"🇧🇷" },
  { id:"morocco",      name:"Maroc",            code:"MAR", group:"C", rating:1670, attack:77, defense:81, emoji:"🇲🇦" },
  { id:"haiti",        name:"Haiti",            code:"HAI", group:"C", rating:1380, attack:66, defense:65, emoji:"🇭🇹" },
  { id:"scotland",     name:"Scotland",         code:"SCO", group:"C", rating:1550, attack:74, defense:74, emoji:"🏴󠁧󠁢󠁳󠁣󠁴󠁿" },
  // Group D
  { id:"usa",          name:"Mỹ",               code:"USA", group:"D", rating:1680, attack:79, defense:77, emoji:"🇺🇸" },
  { id:"paraguay",     name:"Paraguay",         code:"PAR", group:"D", rating:1540, attack:71, defense:74, emoji:"🇵🇾" },
  { id:"australia",    name:"Úc",               code:"AUS", group:"D", rating:1530, attack:72, defense:72, emoji:"🇦🇺" },
  { id:"turkey",       name:"Thổ Nhĩ Kỳ",       code:"TUR", group:"D", rating:1590, attack:76, defense:75, emoji:"🇹🇷" },
  // Group E
  { id:"germany",      name:"Đức",              code:"GER", group:"E", rating:1730, attack:84, defense:79, emoji:"🇩🇪" },
  { id:"ivory_coast",  name:"Bờ Biển Ngà",      code:"CIV", group:"E", rating:1560, attack:76, defense:73, emoji:"🇨🇮" },
  { id:"ecuador",      name:"Ecuador",          code:"ECU", group:"E", rating:1610, attack:74, defense:75, emoji:"🇪🇨" },
  { id:"curacao",      name:"Curaçao",          code:"CUW", group:"E", rating:1400, attack:67, defense:66, emoji:"🇨🇼" },
  // Group F
  { id:"netherlands",  name:"Hà Lan",           code:"NED", group:"F", rating:1740, attack:83, defense:82, emoji:"🇳🇱" },
  { id:"japan",        name:"Nhật Bản",         code:"JPN", group:"F", rating:1630, attack:81, defense:77, emoji:"🇯🇵" },
  { id:"sweden",       name:"Thụy Điển",        code:"SWE", group:"F", rating:1620, attack:78, defense:77, emoji:"🇸🇪" },
  { id:"tunisia",      name:"Tunisia",          code:"TUN", group:"F", rating:1430, attack:67, defense:69, emoji:"🇹🇳" },
  // Group G
  { id:"belgium",      name:"Bỉ",               code:"BEL", group:"G", rating:1690, attack:82, defense:76, emoji:"🇧🇪" },
  { id:"egypt",        name:"Ai Cập",           code:"EGY", group:"G", rating:1500, attack:74, defense:69, emoji:"🇪🇬" },
  { id:"iran",         name:"Iran",             code:"IRN", group:"G", rating:1510, attack:71, defense:72, emoji:"🇮🇷" },
  { id:"new_zealand",  name:"New Zealand",      code:"NZL", group:"G", rating:1350, attack:63, defense:64, emoji:"🇳🇿" },
  // Group H
  { id:"spain",        name:"Tây Ban Nha",      code:"ESP", group:"H", rating:1810, attack:87, defense:83, emoji:"🇪🇸" },
  { id:"cape_verde",   name:"Cape Verde",       code:"CPV", group:"H", rating:1420, attack:68, defense:68, emoji:"🇨🇻" },
  { id:"saudi_arabia", name:"Saudi Arabia",     code:"KSA", group:"H", rating:1440, attack:68, defense:66, emoji:"🇸🇦" },
  { id:"uruguay",      name:"Uruguay",          code:"URU", group:"H", rating:1760, attack:84, defense:81, emoji:"🇺🇾" },
  // Group I
  { id:"france",       name:"Pháp",             code:"FRA", group:"I", rating:1840, attack:89, defense:85, emoji:"🇫🇷" },
  { id:"senegal",      name:"Senegal",          code:"SEN", group:"I", rating:1580, attack:75, defense:76, emoji:"🇸🇳" },
  { id:"iraq",         name:"Iraq",             code:"IRQ", group:"I", rating:1435, attack:68, defense:67, emoji:"🇮🇶" },
  { id:"norway",       name:"Na Uy",            code:"NOR", group:"I", rating:1640, attack:80, defense:78, emoji:"🇳🇴" },
  // Group J
  { id:"argentina",    name:"Argentina",        code:"ARG", group:"J", rating:1860, attack:90, defense:86, emoji:"🇦🇷" },
  { id:"algeria",      name:"Algeria",          code:"ALG", group:"J", rating:1490, attack:73, defense:70, emoji:"🇩🇿" },
  { id:"austria",      name:"Áo",               code:"AUT", group:"J", rating:1600, attack:76, defense:75, emoji:"🇦🇹" },
  { id:"jordan",       name:"Jordan",           code:"JOR", group:"J", rating:1410, attack:67, defense:67, emoji:"🇯🇴" },
  // Group K
  { id:"portugal",     name:"Bồ Đào Nha",       code:"POR", group:"K", rating:1780, attack:87, defense:81, emoji:"🇵🇹" },
  { id:"dr_congo",     name:"Congo",            code:"COD", group:"K", rating:1480, attack:72, defense:70, emoji:"🇨🇩" },
  { id:"uzbekistan",   name:"Uzbekistan",       code:"UZB", group:"K", rating:1460, attack:70, defense:68, emoji:"🇺🇿" },
  { id:"colombia",     name:"Colombia",         code:"COL", group:"K", rating:1720, attack:82, defense:79, emoji:"🇨🇴" },
  // Group L
  { id:"england",      name:"Anh",              code:"ENG", group:"L", rating:1800, attack:87, defense:83, emoji:"🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { id:"croatia",      name:"Croatia",          code:"CRO", group:"L", rating:1700, attack:79, defense:78, emoji:"🇭🇷" },
  { id:"ghana",        name:"Ghana",            code:"GHA", group:"L", rating:1460, attack:72, defense:67, emoji:"🇬🇭" },
  { id:"panama",       name:"Panama",           code:"PAN", group:"L", rating:1400, attack:67, defense:66, emoji:"🇵🇦" }
];

const CURRENT_DATE_STR = "2026-06-18";

// Nguồn dữ liệu chính thức
const OFFICIAL_DATA_SOURCES = [
  {
    id: "openfootball",
    name: "openfootball/worldcup.json",
    url: "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json",
    description: "Dữ liệu kết quả & lịch thi đấu World Cup 2026"
  }
];

// ──────────────────────────────────────────────
// TẠO LỊCH THI ĐẤU MẶC ĐỊNH (FALLBACK – không giả lập tỉ số)
// ──────────────────────────────────────────────
function generateSchedule() {
  const matches = [];
  const groups = ["A","B","C","D","E","F","G","H","I","J","K","L"];
  let id = 1;

  groups.forEach((g, gi) => {
    const [t1, t2, t3, t4] = TEAMS.filter(t => t.group === g);
    if (!t4) return;

    const d1 = `2026-06-${(11 + Math.floor(gi/2)).toString().padStart(2,"0")}`;
    const d2 = `2026-06-${(17 + Math.floor(gi/2)).toString().padStart(2,"0")}`;
    const d3 = `2026-06-${(23 + Math.floor(gi/2)).toString().padStart(2,"0")}`;

    matches.push(...[
      makeMatch(id++, t1, t2, d1, "18:00", g, 1),
      makeMatch(id++, t3, t4, d1, "21:00", g, 1),
      makeMatch(id++, t1, t3, d2, "18:00", g, 2),
      makeMatch(id++, t2, t4, d2, "21:00", g, 2),
      makeMatch(id++, t1, t4, d3, "18:00", g, 3),
      makeMatch(id++, t2, t3, d3, "21:00", g, 3),
    ]);
  });

  return matches.sort((a,b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`));
}

function makeMatch(id, team1, team2, date, time, group, round) {
  return { id, team1, team2, date, time, group, round, status:"upcoming", score1:null, score2:null, minute:null };
}

// ──────────────────────────────────────────────
// GIẢ LẬP TỈ SỐ (POISSON) – chỉ dùng khi cần demo
// ──────────────────────────────────────────────
function simulateScore(t1, t2) {
  const base1 = 1.2 * Math.pow(1.002, t1.rating-1500) * (t1.attack/75) * (75/t2.defense);
  const base2 = 1.2 * Math.pow(1.002, t2.rating-1500) * (t2.attack/75) * (75/t1.defense);
  return { score1: poissonRandom(base1), score2: poissonRandom(base2) };
}

function poissonRandom(mean) {
  const L = Math.exp(-mean);
  let k = 0, p = 1.0;
  do { k++; p *= Math.random(); } while (p > L);
  return k - 1;
}

function simulateRealisticScore(t1, t2) { return simulateScore(t1, t2); }

// ──────────────────────────────────────────────
// TÍNH BẢNG XẾP HẠNG (từ kết quả trận đấu chính thức)
// ──────────────────────────────────────────────
function calculateStandings(matches) {
  const validGroups = ["A","B","C","D","E","F","G","H","I","J","K","L"];
  const standings = {};
  validGroups.forEach(g => { standings[g] = []; });

  function addTeam(team, g) {
    if (!validGroups.includes(g)) return;
    if (!TEAMS.find(t => t.id === team.id)) return;
    if (!standings[g].find(t => t.id === team.id)) {
      standings[g].push({
        id:team.id, name:team.name, code:team.code, emoji:team.emoji, rating:team.rating,
        played:0, won:0, drawn:0, lost:0, gf:0, ga:0, gd:0, pts:0
      });
    }
  }

  matches.forEach(m => {
    if (validGroups.includes(m.group)) {
      addTeam(m.team1, m.group);
      addTeam(m.team2, m.group);
    }
  });

  validGroups.forEach(g => {
    if (standings[g].length === 0) {
      TEAMS.filter(t => t.group === g).forEach(t => addTeam(t, g));
    }
  });

  matches.forEach(m => {
    if (!validGroups.includes(m.group)) return;
    if (m.status !== "completed" && m.status !== "live") return;
    if (m.score1 === null || m.score2 === null) return;

    const g = m.group;
    const t1 = standings[g].find(t => t.id === m.team1.id);
    const t2 = standings[g].find(t => t.id === m.team2.id);
    if (!t1 || !t2) return;

    t1.played++; t2.played++;
    t1.gf += m.score1; t1.ga += m.score2;
    t2.gf += m.score2; t2.ga += m.score1;

    if (m.score1 > m.score2)      { t1.won++; t1.pts+=3; t2.lost++; }
    else if (m.score1 < m.score2) { t2.won++; t2.pts+=3; t1.lost++; }
    else                          { t1.drawn++; t1.pts++; t2.drawn++; t2.pts++; }

    t1.gd = t1.gf - t1.ga;
    t2.gd = t2.gf - t2.ga;
  });

  validGroups.forEach(g => {
    standings[g].sort((a,b) =>
      b.pts !== a.pts ? b.pts - a.pts :
      b.gd  !== a.gd  ? b.gd  - a.gd  :
      b.gf  !== a.gf  ? b.gf  - a.gf  :
      b.rating - a.rating
    );
  });

  return standings;
}

// ──────────────────────────────────────────────
// MAP TÊN ĐỘI TỪ API CHÍNH THỐNG → ĐỐI TƯỢNG
// ──────────────────────────────────────────────
function buildOfficialTeamsMap() {
  const map = {};
  TEAMS.forEach(t => {
    map[t.code] = t;
    map[t.name] = t;
    map[t.id] = t;
  });
  const aliases = {
    "United States": "usa", "USA": "usa",
    "Korea Republic": "south_korea", "South Korea": "south_korea",
    "Czech Republic": "czechia", "Czechia": "czechia",
    "Bosnia & Herzegovina": "bosnia", "Bosnia and Herzegovina": "bosnia",
    "Ivory Coast": "ivory_coast", "Côte d'Ivoire": "ivory_coast", "Cote d'Ivoire": "ivory_coast",
    "DR Congo": "dr_congo", "Congo DR": "dr_congo", "Congo": "dr_congo",
    "IR Iran": "iran",
    "Curaçao": "curacao", "Curacao": "curacao",
    "Cape Verde": "cape_verde", "Cabo Verde": "cape_verde",
    "Mexico": "mexico", "South Africa": "south_africa",
    "Canada": "canada", "Qatar": "qatar", "Switzerland": "switzerland",
    "Brazil": "brazil", "Morocco": "morocco", "Haiti": "haiti", "Scotland": "scotland",
    "Paraguay": "paraguay", "Australia": "australia", "Turkey": "turkey", "Türkiye": "turkey",
    "Germany": "germany", "Ecuador": "ecuador",
    "Netherlands": "netherlands", "Japan": "japan", "Sweden": "sweden", "Tunisia": "tunisia",
    "Belgium": "belgium", "Egypt": "egypt", "Iran": "iran", "New Zealand": "new_zealand",
    "Spain": "spain", "Saudi Arabia": "saudi_arabia", "Uruguay": "uruguay",
    "France": "france", "Senegal": "senegal", "Iraq": "iraq", "Norway": "norway",
    "Argentina": "argentina", "Algeria": "algeria", "Austria": "austria", "Jordan": "jordan",
    "Portugal": "portugal", "Uzbekistan": "uzbekistan", "Colombia": "colombia",
    "England": "england", "Croatia": "croatia", "Ghana": "ghana", "Panama": "panama"
  };
  Object.entries(aliases).forEach(([name, id]) => {
    const team = TEAMS.find(t => t.id === id);
    if (team) map[name] = team;
  });
  return map;
}

const OFFICIAL_TEAMS_MAP = buildOfficialTeamsMap();

function getTeamFromMap(name) {
  if (!name) return null;
  if (OFFICIAL_TEAMS_MAP[name]) return { ...OFFICIAL_TEAMS_MAP[name] };
  const key = Object.keys(OFFICIAL_TEAMS_MAP).find(k => k.toLowerCase() === name.toLowerCase());
  if (key) return { ...OFFICIAL_TEAMS_MAP[key] };
  return null;
}

function parseApiGroup(groupStr) {
  if (!groupStr) return null;
  const m = groupStr.match(/Group\s+([A-L])/i);
  return m ? m[1].toUpperCase() : null;
}

function parseApiRound(roundStr) {
  if (!roundStr) return 1;
  const n = parseInt(roundStr.replace(/\D/g, "")) || 1;
  if (n <= 7) return 1;
  if (n <= 13) return 2;
  return 3;
}

function parseApiTime(timeStr) {
  if (!timeStr) return "18:00";
  return timeStr.split(" ")[0] || "18:00";
}

function getHandicapValue(diff) {
  if (diff < 30)  return 0;
  if (diff < 80)  return 0.25;
  if (diff < 150) return 0.5;
  if (diff < 220) return 0.75;
  if (diff < 300) return 1.0;
  return 1.25;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    TEAMS, CURRENT_DATE_STR, generateSchedule, calculateStandings,
    simulateRealisticScore, poissonRandom, OFFICIAL_TEAMS_MAP, getTeamFromMap,
    OFFICIAL_DATA_SOURCES, parseApiGroup, parseApiRound, parseApiTime
  };
}

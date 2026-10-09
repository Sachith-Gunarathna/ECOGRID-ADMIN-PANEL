const _srv = window.ECOGRID_SERVER_CONFIG || {};
let CONFIG = {
  apiKey: localStorage.getItem("ecg_apiKey") || _srv.apiKey || "",
  mapsApiKey:
    localStorage.getItem("ecg_mapsApiKey") ||
    _srv.mapsApiKey ||
    localStorage.getItem("ecg_apiKey") ||
    _srv.apiKey ||
    "",
  projectId:
    localStorage.getItem("ecg_projectId") || _srv.projectId || "echogrid-e13a5",
  dbUrl:
    localStorage.getItem("ecg_dbUrl") ||
    _srv.dbUrl ||
    "https://echogrid-e13a5-default-rtdb.firebaseio.com",
  storageBucket:
    localStorage.getItem("ecg_storageBucket") ||
    _srv.storageBucket ||
    "echogrid-e13a5.firebasestorage.app",
  backendUrl: localStorage.getItem("ecg_backendUrl") || "http://localhost:3000",
};
document.getElementById("cfgApiKey").value = CONFIG.apiKey;
document.getElementById("cfgMapsApiKey").value = CONFIG.mapsApiKey;
document.getElementById("cfgProjectId").value = CONFIG.projectId;
document.getElementById("cfgDbUrl").value = CONFIG.dbUrl;
document.getElementById("cfgStorageBucket").value = CONFIG.storageBucket;
document.getElementById("cfgBackendUrl").value = CONFIG.backendUrl;
let firebase_app, db, rtdb, auth, storage;
function saveConfig() {
  CONFIG.apiKey = document.getElementById("cfgApiKey").value.trim();
  CONFIG.mapsApiKey = document.getElementById("cfgMapsApiKey").value.trim();
  CONFIG.projectId = document.getElementById("cfgProjectId").value.trim();
  CONFIG.dbUrl = document.getElementById("cfgDbUrl").value.trim();
  CONFIG.storageBucket = document
    .getElementById("cfgStorageBucket")
    .value.trim();
  CONFIG.backendUrl = document.getElementById("cfgBackendUrl").value.trim();
  localStorage.setItem("ecg_apiKey", CONFIG.apiKey);
  localStorage.setItem("ecg_mapsApiKey", CONFIG.mapsApiKey);
  localStorage.setItem("ecg_projectId", CONFIG.projectId);
  localStorage.setItem("ecg_dbUrl", CONFIG.dbUrl);
  localStorage.setItem("ecg_storageBucket", CONFIG.storageBucket);
  localStorage.setItem("ecg_backendUrl", CONFIG.backendUrl);
  initFirebase();
  loadGoogleMaps();
  showToast("Firebase config saved", "success");
}
function toggleCfgVis(inputId, btn) {
  const inp = document.getElementById(inputId);
  if (!inp) return;
  if (inp.type === "password") {
    inp.type = "text";
    btn.textContent = "🙈";
    btn.title = "Hide";
  } else {
    inp.type = "password";
    btn.textContent = "👁";
    btn.title = "Show";
  }
}
function initFirebase() {
  if (!CONFIG.apiKey) {
    showToast("Enter API Key first", "error");
    return;
  }
  try {
    if (firebase.apps.length) firebase.apps.forEach((a) => a.delete());
    firebase_app = firebase.initializeApp({
      apiKey: CONFIG.apiKey,
      authDomain: `${CONFIG.projectId}.firebaseapp.com`,
      databaseURL: CONFIG.dbUrl,
      projectId: CONFIG.projectId,
      storageBucket: CONFIG.storageBucket,
      messagingSenderId: "000000000000",
      appId: "1:000000000000:web:000000",
    });
    db = firebase.firestore();
    rtdb = firebase.database();
    auth = firebase.auth();
    storage = firebase.storage();
    db.settings({ ignoreUndefinedProperties: true });
    showToast("Firebase connected ✓", "success");
  } catch (e) {
    showToast("Firebase init error: " + e.message, "error");
  }
}
function loadGoogleMaps() {
  const mapKey = CONFIG.mapsApiKey || CONFIG.apiKey;
  const loadingEl = document.getElementById("mapPickerLoading");
  if (window.google && window.google.maps) {
    mapsReady = true;
    if (loadingEl)
      loadingEl.innerHTML =
        '<div style="font-size:28px;margin-bottom:8px">🗺️</div><div>Map ready</div>';
    return;
  }
  if (!mapKey) {
    if (loadingEl) {
      loadingEl.innerHTML =
        '<div style="font-size:28px;margin-bottom:8px">🗺️</div><div>Enter a Google Maps API key and save config</div><div style="font-size:11px;margin-top:4px">Enable Maps JavaScript API and Places API for that key</div>';
    }
    return;
  }
  const scriptId = "gmap-script";
  let script = document.getElementById(scriptId);
  if (script) script.remove();
  window.initGoogleMaps = function () {
    mapsReady = true;
    if (loadingEl) loadingEl.style.display = "none";
    if (document.getElementById("stationModal").classList.contains("active"))
      initStationMap();
    console.log("✅ Google Maps ready");
  };
  script = document.createElement("script");
  script.id = scriptId;
  script.src = `https://maps.googleapis.com/maps/api/js?key=${mapKey}&libraries=places&loading=async&callback=initGoogleMaps`;
  script.async = true;
  script.defer = true;
  script.onerror = () => {
    mapsReady = false;
    if (loadingEl) {
      loadingEl.style.display = "block";
      loadingEl.innerHTML =
        '<div style="font-size:28px;margin-bottom:8px">⚠️</div><div>Google Maps failed to load</div><div style="font-size:11px;margin-top:4px">Check API key, billing, referrer restrictions, and enabled Maps JavaScript API</div>';
    }
    showToast("Google Maps failed to load. Check Maps API key.", "error");
  };
  document.head.appendChild(script);
}
async function handleLogin() {
  const email = document.getElementById("loginEmail").value.trim();
  const pass = document.getElementById("loginPassword").value;
  if (!email || !pass) {
    showLoginError("Enter email and password");
    return;
  }
  if (!auth) {
    if (!CONFIG.apiKey) {
      showLoginError("Configure Firebase first");
      return;
    }
    initFirebase();
    if (!auth) {
      showLoginError("Firebase not ready");
      return;
    }
  }
  const btn = document.getElementById("loginBtn");
  btn.disabled = true;
  btn.textContent = "Signing in...";
  try {
    const cred = await auth.signInWithEmailAndPassword(email, pass);
    const token = await cred.user.getIdTokenResult();
    if (!token.claims.admin) {
      await auth.signOut();
      showLoginError("Access denied — admin claim required");
      btn.disabled = false;
      btn.textContent = "Sign In to Admin Panel";
      return;
    }
    showApp(cred.user);
  } catch (e) {
    showLoginError(e.message);
    btn.disabled = false;
    btn.textContent = "Sign In to Admin Panel";
  }
}
function showLoginError(msg) {
  document.getElementById("loginError").textContent = msg;
}
function handleLogout() {
  if (auth) auth.signOut();
  document.getElementById("app").classList.remove("visible");
  document.getElementById("loginScreen").style.display = "flex";
}
function showApp(user) {
  document.getElementById("loginScreen").style.display = "none";
  document.getElementById("app").classList.add("visible");
  const name = user.displayName || user.email.split("@")[0];
  document.getElementById("adminName").textContent = name;
  document.getElementById("avatarInitial").textContent = name[0].toUpperCase();
  loadDashboard();
  listenActiveSessions();
}
function showPage(id, el) {
  document
    .querySelectorAll(".page")
    .forEach((p) => p.classList.remove("active"));
  document
    .querySelectorAll(".nav-item")
    .forEach((n) => n.classList.remove("active"));
  document.getElementById("page-" + id).classList.add("active");
  if (el) el.classList.add("active");
  const titles = {
    dashboard: "Dashboard",
    stations: "EV Stations",
    users: "Users",
    vehicles: "Vehicles",
    transactions: "Transactions",
    revenue: "Revenue Analytics",
    sessions: "Charging Sessions",
  };
  document.getElementById("headerTitle").textContent = titles[id] || id;
  const loaders = {
    stations: loadStations,
    users: loadUsers,
    vehicles: loadVehicles,
    transactions: loadTransactions,
    sessions: loadSessions,
    revenue: loadRevenue,
  };
  if (loaders[id]) loaders[id]();
}
let toastTimer;
function showToast(msg, type = "") {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.className = "toast show" + (type ? " " + type : "");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 3500);
}
function closeModal(id) {
  document.getElementById(id).classList.remove("open");
}
function openModal(id) {
  document.getElementById(id).classList.add("open");
  if (id === "notifModal") {
    loadNotifHistory();
    document.getElementById("notif_result").style.display = "none";
  }
}
function filterTable(tbodyId, inputId) {
  const q = document.getElementById(inputId).value.toLowerCase();
  document.querySelectorAll("#" + tbodyId + " tr").forEach((row) => {
    row.style.display = row.textContent.toLowerCase().includes(q) ? "" : "none";
  });
}
function listenActiveSessions() {
  if (!rtdb) return;
  rtdb.ref("stations").on("value", async (snap) => {
    const data = snap.val() || {};
    const active = Object.values(data).filter((s) => {
      const cs = s.current_session;
      return (
        s.relay === "ON" ||
        (cs && (cs.relay === "ON" || cs.status === "CHARGING"))
      );
    }).length;
    document.getElementById("activeSessionsChip").textContent =
      active + " Active";
    document.getElementById("dash-active-count").textContent = active;
    if (active > 0) {
      document.getElementById("nb-active").textContent = active;
      document.getElementById("nb-active").className = "nav-badge red";
    } else {
      try {
        if (db) {
          const snap = await db.collection("invoices").get();
          const total = snap.size;
          document.getElementById("nb-active").textContent = total;
          document.getElementById("nb-active").className = "nav-badge";
        } else {
          document.getElementById("nb-active").textContent = "0";
          document.getElementById("nb-active").className = "nav-badge";
        }
      } catch (e) {
        document.getElementById("nb-active").textContent = "0";
        document.getElementById("nb-active").className = "nav-badge";
      }
    }
  });
}
let revenueChartInst, stationDonutInst, energyBarInst;
async function loadDashboard() {
  if (!db) return;
  try {
    const [stSnap, usersSnap, invoicesSnap] = await Promise.all([
      db.collection("Stations").get(),
      db.collection("users").get(),
      db.collection("invoices").get(),
    ]);
    const stations = stSnap.docs.map((d) => d.data());
    const totalRev = invoicesSnap.docs.reduce(
      (s, d) => s + (d.data().amount || 0),
      0,
    );
    const totalEnergy = invoicesSnap.docs.reduce(
      (s, d) => s + parseFloat(d.data().energy_kWh || 0),
      0,
    );
    const co2 = (totalEnergy * 0.85).toFixed(1);
    document.getElementById("dash-co2").textContent = co2 + " kg";
    document.getElementById("nb-stations").textContent = stations.length;
    document.getElementById("nb-users").textContent = usersSnap.size;
    document.getElementById("dash-metrics").innerHTML = `
      ${dashMetric("🏢", "#dcfce7", "Total Stations", stations.length, stations.filter((s) => s.verification?.is_verified).length + " verified", "up")}
      ${dashMetric("👥", "#dbeafe", "Total Users", usersSnap.size, usersSnap.docs.filter((d) => d.data().isVerified).length + " verified", "up")}
      ${dashMetric("💳", "#fef3c7", "Total Revenue", "LKR " + formatNum(totalRev), invoicesSnap.size + " transactions", "up")}
      ${dashMetric("⚡", "#f3e8ff", "Energy Dispensed", formatNum(totalEnergy) + " kWh", co2 + " kg CO₂ saved", "up")}
    `;
    const monthly = {};
    invoicesSnap.docs.forEach((d) => {
      const inv = d.data();
      const m = (inv.createdAt || "").substring(0, 7);
      if (m) {
        if (!monthly[m]) monthly[m] = { rev: 0, energy: 0 };
        monthly[m].rev += inv.amount || 0;
        monthly[m].energy += parseFloat(inv.energy_kWh || 0);
      }
    });
    const months = Object.keys(monthly).sort().slice(-6);
    renderRevenueChart(
      months,
      months.map((m) => Math.round(monthly[m].rev)),
    );
    renderStationDonut(stSnap.docs);
    renderEnergyBar(months, monthly);
    const recent = invoicesSnap.docs
      .slice(0, 5)
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
    document.getElementById("dash-recent-tx").innerHTML = recent.length
      ? recent
          .map(
            (inv) => `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border)">
        <div>
          <div style="font-size:13px;font-weight:600">${inv.invoiceId || inv.id?.substring(0, 12)}</div>
          <div style="font-size:11px;color:var(--text3)">${inv.createdAt?.substring(0, 16) || "—"}</div>
        </div>
        <div style="font-weight:700;color:var(--green)">LKR ${formatNum(inv.amount)}</div>
      </div>`,
          )
          .join("")
      : '<div style="color:var(--text3);text-align:center;padding:20px">No transactions yet</div>';
  } catch (e) {
    document.getElementById("dash-metrics").innerHTML =
      `<div style="color:var(--red);grid-column:1/-1;padding:16px">Error: ${e.message}</div>`;
  }
}
function dashMetric(icon, bg, label, val, change, trend) {
  return `<div class="metric">
    <div style="width:44px;height:44px;border-radius:11px;background:${bg};display:flex;align-items:center;justify-content:center;font-size:20px;margin-bottom:12px">${icon}</div>
    <div class="metric-label">${label}</div>
    <div class="metric-val">${val}</div>
    <div class="metric-change ${trend}">${change}</div>
  </div>`;
}
function renderRevenueChart(months, data) {
  if (revenueChartInst) revenueChartInst.destroy();
  revenueChartInst = new ApexCharts(document.getElementById("revenueChart"), {
    chart: {
      type: "area",
      height: 260,
      toolbar: { show: false },
      fontFamily: "DM Sans,sans-serif",
    },
    series: [{ name: "Revenue (LKR)", data }],
    colors: ["#16a34a"],
    stroke: { curve: "smooth", width: 2.5 },
    fill: {
      type: "gradient",
      gradient: { opacityFrom: 0.25, opacityTo: 0.03 },
    },
    xaxis: {
      categories: months,
      labels: { style: { colors: "#94a3b8", fontSize: "11px" } },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: { formatter: (v) => formatNum(v), style: { colors: "#94a3b8" } },
    },
    grid: { borderColor: "#f1f5f9", strokeDashArray: 4 },
    dataLabels: { enabled: false },
    tooltip: { y: { formatter: (v) => "LKR " + formatNum(v) } },
  });
  revenueChartInst.render();
}
function renderStationDonut(docs) {
  const counts = { online: 0, offline: 0, occupied: 0, maintenance: 0 };
  docs.forEach((d) => {
    const s = d.data().status || "offline";
    counts[s] = (counts[s] || 0) + 1;
  });
  if (stationDonutInst) stationDonutInst.destroy();
  stationDonutInst = new ApexCharts(document.getElementById("stationDonut"), {
    chart: { type: "donut", height: 220, fontFamily: "DM Sans,sans-serif" },
    series: Object.values(counts),
    labels: Object.keys(counts),
    colors: ["#16a34a", "#94a3b8", "#f59e0b", "#ef4444"],
    legend: { position: "bottom", fontSize: "12px" },
    dataLabels: { enabled: false },
    plotOptions: { pie: { donut: { size: "65%" } } },
  });
  stationDonutInst.render();
}
function renderEnergyBar(months, monthly) {
  if (energyBarInst) energyBarInst.destroy();
  energyBarInst = new ApexCharts(document.getElementById("energyBar"), {
    chart: {
      type: "bar",
      height: 200,
      toolbar: { show: false },
      fontFamily: "DM Sans,sans-serif",
    },
    series: [
      {
        name: "Energy (kWh)",
        data: months.map((m) => Math.round(monthly[m].energy)),
      },
    ],
    colors: ["#2563eb"],
    xaxis: {
      categories: months,
      labels: { style: { colors: "#94a3b8", fontSize: "11px" } },
      axisBorder: { show: false },
    },
    yaxis: {
      labels: { formatter: (v) => v + " kWh", style: { colors: "#94a3b8" } },
    },
    grid: { borderColor: "#f1f5f9", strokeDashArray: 4 },
    dataLabels: { enabled: false },
    plotOptions: { bar: { borderRadius: 6, columnWidth: "50%" } },
  });
  energyBarInst.render();
}
let currentPeriod = "6M";
function setPeriod(p, btn) {
  currentPeriod = p;
  document.querySelectorAll("#page-dashboard .btn-sm").forEach((b) => {
    b.className = "btn btn-sm btn-o";
  });
  if (btn) btn.className = "btn btn-sm btn-g";
  loadDashboard();
}
function handleDragOver(e, zoneId) {
  e.preventDefault();
  document.getElementById(zoneId).classList.add("drag-over");
}
function handleDragLeave(e, zoneId) {
  document.getElementById(zoneId).classList.remove("drag-over");
}
function handleDrop(e, inputId, zoneId) {
  e.preventDefault();
  document.getElementById(zoneId).classList.remove("drag-over");
  const file = e.dataTransfer.files[0];
  if (!file) return;
  const inp = document.getElementById(inputId);
  const dt = new DataTransfer();
  dt.items.add(file);
  inp.files = dt.files;
  showFilePreview(file, inputId.replace("File", "Preview"), zoneId);
}
function handleFileSelect(event, previewId, zoneId) {
  const file = event.target.files[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) {
    showToast("Image must be under 5MB", "error");
    event.target.value = "";
    return;
  }
  showFilePreview(file, previewId, zoneId);
}
function showFilePreview(file, previewId, zoneId) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const wrap = document.getElementById(previewId);
    document.getElementById(previewId + "Img").src = e.target.result;
    wrap.style.display = "block";
    document.getElementById(zoneId).style.display = "none";
  };
  reader.readAsDataURL(file);
}
function clearFileInput(inputId, previewId, zoneId) {
  document.getElementById(inputId).value = "";
  document.getElementById(previewId).style.display = "none";
  document.getElementById(zoneId).style.display = "block";
}
async function uploadStationPhoto(
  stationId,
  file,
  progressFillId,
  progressWrapId,
  progressTextId,
) {
  if (!storage) throw new Error("Firebase Storage not connected");
  document.getElementById(progressWrapId).style.display = "block";
  const ext =
    file.name && file.name.includes(".")
      ? file.name.split(".").pop().toLowerCase()
      : "jpg";
  const safeExt = ["jpg", "jpeg", "png", "webp"].includes(ext) ? ext : "jpg";
  const ref = storage.ref(
    `Stations/${stationId}/photo_${Date.now()}.${safeExt}`,
  );
  const task = ref.put(file, {
    contentType: file.type || `image/${safeExt === "jpg" ? "jpeg" : safeExt}`,
  });
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      document.getElementById(progressWrapId).style.display = "none";
      reject(
        new Error(
          "Upload timed out. Check Firebase Storage bucket, rules, and browser console.",
        ),
      );
    }, 60000);
    task.on(
      "state_changed",
      (snap) => {
        const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
        document.getElementById(progressFillId).style.width = pct + "%";
        document.getElementById(progressTextId).textContent =
          `Uploading... ${pct}%`;
      },
      (err) => {
        clearTimeout(timeout);
        document.getElementById(progressWrapId).style.display = "none";
        reject(err);
      },
      async () => {
        clearTimeout(timeout);
        const url = await task.snapshot.ref.getDownloadURL();
        document.getElementById(progressWrapId).style.display = "none";
        resolve(url);
      },
    );
  });
}
let editingStationId = null;
let removeExistingPhotoFlag = false;
let _stationsListener = null;
async function loadStations() {
  if (!db) return;
  const status = document.getElementById("st-filter-status")?.value;
  const verified = document.getElementById("st-filter-verified")?.value;
  document.getElementById("stations-tbody").innerHTML =
    '<tr><td colspan="10"><div class="loading"><div class="spin"></div>Loading...</div></td></tr>';
  try {
    let query = db.collection("Stations").orderBy("basicInfo.name");
    if (status) query = query.where("status", "==", status);
    if (verified !== "")
      query = query.where(
        "verification.is_verified",
        "==",
        verified === "true",
      );
    query = query.limit(100);
    if (_stationsListener) _stationsListener();
    _stationsListener = query.onSnapshot(async (snap) => {
      try {
    const stations = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const total = stations.length;
    const ver = stations.filter((s) => s.verification?.is_verified).length;
    document.getElementById("station-stats").innerHTML = `
      ${miniStat("Total", total, "")}${miniStat("Verified", ver, "var(--green)")}
      ${miniStat("Online", stations.filter((s) => s.status === "online").length, "var(--green)")}
      ${miniStat("Offline", stations.filter((s) => s.status !== "online").length, "var(--red)")}
    `;
    const enriched = await Promise.all(
      stations.map(async (s) => {
        try {
          let r = await rtdb
            .ref(`stations/${s.basicInfo?.name || s.id}/relay`)
            .once("value");
          let val = r.val();
          if (!val) {
            const cs = await rtdb
              .ref(
                `stations/${s.basicInfo?.name || s.id}/current_session/relay`,
              )
              .once("value");
            val = cs.val();
          }
          if (!val) {
            const fallback = await rtdb
              .ref(`Stations/${s.id}/relay`)
              .once("value");
            val = fallback.val();
          }
          s.relay = val || "OFF";
        } catch {
          s.relay = "—";
        }
        return s;
      }),
    );
    document.getElementById("stations-tbody").innerHTML =
      enriched
        .map((s) => {
          const photoUrl = s.verification?.photo_url;
          const thumb = photoUrl
            ? `<img src="${photoUrl}" class="st-thumb" alt="Station" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" /><div class="st-thumb-placeholder" style="display:none">⚡</div>`
            : `<div class="st-thumb-placeholder">⚡</div>`;
          return `<tr>
        <td><div style="display:flex">${thumb}</div></td>
        <td><div style="font-weight:600">${s.basicInfo?.name || "—"}</div><div style="color:var(--text3);font-size:11px">${s.basicInfo?.address || ""}</div></td>
        <td><span class="mono">${s.techSpecs?.hardware_id || "—"}</span></td>
        <td>${s.techSpecs?.connection_type || "—"}</td>
        <td>${s.techSpecs?.power_output_kw || "—"} kW</td>
        <td>LKR ${s.financial?.price_pre_kwh || "—"}</td>
        <td>
          <select onchange="setStationStatus('${s.id}',this.value)" style="padding:4px 8px;border:1.5px solid var(--border);border-radius:7px;font-size:12px;font-weight:600;cursor:pointer;outline:none;background:#fff" >
            <option value="online"      ${s.status === "online" ? "selected" : ""}>🟢 Online</option>
            <option value="offline"     ${s.status === "offline" || !s.status ? "selected" : ""}>⚫ Offline</option>
            <option value="occupied"    ${s.status === "occupied" ? "selected" : ""}>🟡 Occupied</option>
            <option value="maintenance" ${s.status === "maintenance" ? "selected" : ""}>🔴 Maintenance</option>
          </select>
        </td>
        <td><span class="badge ${s.relay === "ON" ? "bg" : "bgray"}" style="font-weight:700">${s.relay}</span></td>
        <td>${s.verification?.is_verified ? '<span class="badge bg">✓ Verified</span>' : '<span class="badge ba">Pending</span>'}</td>
        <td><div style="display:flex;gap:5px;flex-wrap:wrap">
          <button class="btn btn-sm btn-b" onclick="openEditStation('${s.id}')" title="Edit">✏️ Edit</button>
          <button class="btn btn-sm" style="background:#f3e8ff;color:#7c3aed;border:none" onclick="openQRModal('${s.id}','${(s.basicInfo?.name || "").replace(/'/g, "")}','${s.techSpecs?.hardware_id || ""}')" title="QR Code">📱 QR</button>
          <button class="btn btn-sm ${s.relay === "ON" ? "btn-r" : "btn-g"}" onclick="toggleRelay('${s.id}','${s.relay}')">${s.relay === "ON" ? "🛑 OFF" : "▶ ON"}</button>
          <button class="btn btn-sm btn-r" onclick="deleteStation('${s.id}','${s.basicInfo?.name}')">🗑</button>
        </div></td>
      </tr>`;
        })
        .join("") ||
      '<tr><td colspan="10"><div class="empty-state"><div class="empty-icon">⚡</div>No stations found</div></td></tr>';
    document.getElementById("stations-pag-info").textContent =
      `Showing ${stations.length} stations`;
      } catch (err) {
        document.getElementById("stations-tbody").innerHTML =
          `<tr><td colspan="10" style="color:var(--red);padding:16px">Error: ${err.message}</td></tr>`;
      }
    }, (err) => {
      document.getElementById("stations-tbody").innerHTML =
        `<tr><td colspan="10" style="color:var(--red);padding:16px">Error: ${err.message}</td></tr>`;
    });
  } catch (e) {
    document.getElementById("stations-tbody").innerHTML =
      `<tr><td colspan="10" style="color:var(--red);padding:16px">Error: ${e.message}</td></tr>`;
  }
}
function miniStat(label, val, color) {
  return `<div class="metric" style="padding:14px"><div class="metric-label">${label}</div><div class="metric-val" style="font-size:22px;color:${color || "var(--text)"}">${val}</div></div>`;
}
function openAddStation() {
  editingStationId = null;
  removeExistingPhotoFlag = false;
  document.getElementById("stationModalTitle").textContent = "Add New Station";
  document.getElementById("stationSaveBtn").textContent = "Save Station";
  [
    "sm_name",
    "sm_address",
    "sm_hw",
    "sm_phone",
    "sm_lat",
    "sm_lng",
    "sm_power",
    "sm_ports",
    "sm_price",
    "sm_merchant",
  ].forEach((id) => (document.getElementById(id).value = ""));
  document.getElementById("sm_connector").value = "CCS2";
  document.getElementById("sm_verified").checked = false;
  document.getElementById("sm_existing_photo_wrap").style.display = "none";
  clearFileInput("sm_photoFile", "stationImgPreview", "stationImgZone");
  stationMap = null;
  stationMarker = null;
  document.getElementById("mapPickerLoading").style.display = "flex";
  openModal("stationModal");
  setTimeout(initStationMap, 400);
}
async function openEditStation(id) {
  if (!db) return;
  editingStationId = id;
  removeExistingPhotoFlag = false;
  document.getElementById("stationModalTitle").textContent = "Edit Station";
  document.getElementById("stationSaveBtn").textContent = "Update Station";
  stationMap = null;
  stationMarker = null;
  document.getElementById("mapPickerLoading").style.display = "flex";
  const doc = await db.collection("Stations").doc(id).get();
  const s = doc.data();
  document.getElementById("sm_name").value = s.basicInfo?.name || "";
  document.getElementById("sm_address").value = s.basicInfo?.address || "";
  document.getElementById("sm_hw").value = s.techSpecs?.hardware_id || "";
  document.getElementById("sm_phone").value = s.basicInfo?.phone || "";
  document.getElementById("sm_lat").value = s.basicInfo?.latitude || "";
  document.getElementById("sm_lng").value = s.basicInfo?.longitude || "";
  document.getElementById("sm_connector").value =
    s.techSpecs?.connection_type || "CCS2";
  document.getElementById("sm_power").value =
    s.techSpecs?.power_output_kw || "";
  document.getElementById("sm_ports").value = s.techSpecs?.ports || "";
  document.getElementById("sm_price").value = s.financial?.price_pre_kwh || "";
  document.getElementById("sm_merchant").value =
    s.financial?.payhere_merchant_id || "";
  document.getElementById("sm_verified").checked =
    s.verification?.is_verified || false;
  const existingWrap = document.getElementById("sm_existing_photo_wrap");
  const existingPhotoUrl = s.verification?.photo_url;
  if (existingPhotoUrl) {
    document.getElementById("sm_existing_photo").src = existingPhotoUrl;
    existingWrap.style.display = "block";
  } else {
    existingWrap.style.display = "none";
  }
  clearFileInput("sm_photoFile", "stationImgPreview", "stationImgZone");
  openModal("stationModal");
  setTimeout(initStationMap, 400);
}
function removeExistingPhoto() {
  removeExistingPhotoFlag = true;
  document.getElementById("sm_existing_photo_wrap").style.display = "none";
  showToast("Photo will be removed on save", "info");
}
async function saveStation() {
  if (!db) {
    showToast("Firebase not connected", "error");
    return;
  }
  const name = document.getElementById("sm_name").value.trim();
  const hw = document.getElementById("sm_hw").value.trim();
  const price = document.getElementById("sm_price").value.trim();
  if (!name) {
    showToast("Station name required", "error");
    return;
  }
  if (!hw) {
    showToast("Hardware ID required", "error");
    return;
  }
  if (!price) {
    showToast("Price required", "error");
    return;
  }
  const btn = document.getElementById("stationSaveBtn");
  btn.disabled = true;
  btn.textContent = "Saving...";
  try {
    let photoUrl = editingStationId
      ? (await db.collection("Stations").doc(editingStationId).get()).data()
          ?.verification?.photo_url || ""
      : "";
    const photoFile = document.getElementById("sm_photoFile").files[0];
    if (photoFile) {
      const tempId = editingStationId || "temp_" + Date.now();
      btn.textContent = "Uploading photo...";
      photoUrl = await uploadStationPhoto(
        tempId,
        photoFile,
        "stationUploadFill",
        "stationUploadProgress",
        "stationUploadText",
      );
      btn.textContent = "Saving...";
    } else if (removeExistingPhotoFlag) {
      photoUrl = "";
    }
    const data = {
      basicInfo: {
        name,
        address: document.getElementById("sm_address").value.trim(),
        latitude: parseFloat(document.getElementById("sm_lat").value) || 0,
        longitude: parseFloat(document.getElementById("sm_lng").value) || 0,
        phone: document.getElementById("sm_phone").value.trim(),
        owner_id: "",
      },
      techSpecs: {
        hardware_id: hw,
        connection_type: document.getElementById("sm_connector").value,
        power_output_kw:
          parseFloat(document.getElementById("sm_power").value) || 7.4,
        ports: parseInt(document.getElementById("sm_ports").value) || 1,
      },
      financial: {
        price_pre_kwh: parseFloat(price),
        payhere_merchant_id: document
          .getElementById("sm_merchant")
          .value.trim(),
      },
      verification: {
        is_verified: document.getElementById("sm_verified").checked,
        photo_url: photoUrl,
      },
      status: "offline",
      updatedAt: new Date().toISOString(),
    };
    if (editingStationId) {
      await db.collection("Stations").doc(editingStationId).update(data);
      showToast("Station updated ✓", "success");
    } else {
      data.createdAt = new Date().toISOString();
      const ref = await db.collection("Stations").add(data);
      if (rtdb)
        await rtdb
          .ref(`Stations/${ref.id}`)
          .set({
            relay: "OFF",
            current_percent: 0,
            energy_kwh: 0,
            time_left_mins: 0,
          });
      showToast("Station added ✓", "success");
    }
    closeModal("stationModal");
    loadStations();
  } catch (e) {
    showToast("Error: " + e.message, "error");
  } finally {
    btn.disabled = false;
    btn.textContent = editingStationId ? "Update Station" : "Save Station";
  }
}
async function toggleRelay(stationId, currentRelay) {
  if (!rtdb) return;
  const cmd = currentRelay === "ON" ? "OFF" : "ON";
  try {
    await Promise.allSettled([
      rtdb.ref(`stations/${stationId}/relay`).set(cmd),
      rtdb.ref(`stations/${stationId}/current_session/relay`).set(cmd),
      rtdb.ref(`Stations/${stationId}/relay`).set(cmd),
      rtdb.ref(`Stations/${stationId}/current_session/relay`).set(cmd),
    ]);
    showToast(`Relay ${cmd} → ${stationId}`, "success");
    setTimeout(loadStations, 500);
  } catch (e) {
    showToast("Relay error: " + e.message, "error");
  }
}
async function deleteStation(id, name) {
  if (!confirm(`Delete station "${name}"? This cannot be undone.`)) return;
  try {
    await db.collection("Stations").doc(id).delete();
    if (rtdb) await rtdb.ref(`Stations/${id}`).remove();
    showToast("Station deleted", "success");
    loadStations();
  } catch (e) {
    showToast("Delete error: " + e.message, "error");
  }
}
let _usersListener = null;
async function loadUsers(verified = "") {
  if (!db) return;
  document.getElementById("users-tbody").innerHTML =
    '<tr><td colspan="7"><div class="loading"><div class="spin"></div>Loading...</div></td></tr>';
  try {
    let query = db.collection("users").orderBy("name").limit(100);
    if (verified !== "")
      query = db
        .collection("users")
        .where("isVerified", "==", verified === "true")
        .limit(100);
    if (_usersListener) _usersListener();
    _usersListener = query.onSnapshot((snap) => {
      try {
    const users = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const total = users.length;
    const ver = users.filter((u) => u.isVerified).length;
    document.getElementById("user-stats").innerHTML = `
      ${miniStat("Total", total, "")}
      ${miniStat("Verified", ver, "var(--green)")}
      ${miniStat("Unverified", total - ver, "var(--amber)")}
      ${miniStat("With Photo", users.filter((u) => u.profilePicUrl).length, "var(--blue)")}
    `;
    document.getElementById("users-tbody").innerHTML =
      users
        .map(
          (u) => `
      <tr>
        <td><div style="display:flex;align-items:center;gap:10px">
          ${u.profilePicUrl ? `<img src="${u.profilePicUrl}" style="width:34px;height:34px;border-radius:50%;object-fit:cover;border:1px solid var(--border)" onerror="this.style.display='none'" />` : `<div class="avatar" style="font-size:12px">${(u.name || "?")[0].toUpperCase()}</div>`}
          <div style="font-weight:600">${u.name || "—"}</div>
        </div></td>
        <td style="font-size:12px;color:var(--text2)">${u.email || "—"}</td>
        <td>${u.phoneNumber || "—"}</td>
        <td><span class="badge bb" id="vc-${u.id}">—</span></td>
        <td>${u.isVerified ? '<span class="badge bg">✓ Verified</span>' : '<span class="badge ba">Pending</span>'}</td>
        <td style="color:var(--text2);font-size:12px">${u.createdAt?.substring?.(0, 10) || "—"}</td>
        <td><div style="display:flex;gap:5px">
          <button class="btn btn-sm btn-b" onclick="openUserDetail('${u.id}')">View</button>
          <button class="btn btn-sm btn-o" onclick="openEditUser('${u.id}')">✏️ Edit</button>
          ${!u.isVerified ? `<button class="btn btn-sm btn-g" onclick="verifyUser('${u.id}')">✓ Verify</button>` : ""}
        </div></td>
      </tr>`,
        )
        .join("") ||
      '<tr><td colspan="7"><div class="empty-state"><div class="empty-icon">👥</div>No users</div></td></tr>';
    users.forEach((u) => {
      db.collection("vehicles")
        .where("user_id", "==", u.id)
        .where("isActive", "==", true)
        .get()
        .then((snap) => {
          const el = document.getElementById("vc-" + u.id);
          if (el) el.textContent = snap.size;
        })
        .catch(() => {});
    });
      } catch (err) {
        document.getElementById("users-tbody").innerHTML =
          `<tr><td colspan="7" style="color:var(--red);padding:16px">Error: ${err.message}</td></tr>`;
      }
    }, (err) => {
      document.getElementById("users-tbody").innerHTML =
        `<tr><td colspan="7" style="color:var(--red);padding:16px">Error: ${err.message}</td></tr>`;
    });
  } catch (e) {
    document.getElementById("users-tbody").innerHTML =
      `<tr><td colspan="7" style="color:var(--red);padding:16px">Error: ${e.message}</td></tr>`;
  }
}
async function openUserDetail(uid) {
  if (!db) return;
  try {
    const [userDoc, vehiclesSnap, invoicesSnap] = await Promise.all([
      db.collection("users").doc(uid).get(),
      db.collection("vehicles").where("user_id", "==", uid).get(),
      db.collection("invoices").where("uId", "==", uid).get(),
    ]);
    const u = { id: userDoc.id, ...userDoc.data() };
    const totalSpent = invoicesSnap.docs.reduce(
      (s, d) => s + (d.data().amount || 0),
      0,
    );
    document.getElementById("userModalBody").innerHTML = `
      <div class="user-detail-header">
        ${u.profilePicUrl ? `<img src="${u.profilePicUrl}" class="user-detail-avatar" />` : `<div class="user-detail-avatar-placeholder">${(u.name || "?")[0].toUpperCase()}</div>`}
        <div>
          <div style="font-weight:700;font-size:16px">${u.name || "—"}</div>
          <div style="color:var(--text2);font-size:13px">${u.email || ""}</div>
          ${u.isVerified ? '<span class="badge bg" style="margin-top:4px">✓ Verified</span>' : '<span class="badge ba" style="margin-top:4px">Unverified</span>'}
        </div>
      </div>
      <div class="detail-row"><span class="detail-label">Phone</span><span class="detail-val">${u.phoneNumber || "—"}</span></div>
      <div class="detail-row"><span class="detail-label">UID</span><span class="detail-val mono">${u.uid || u.id}</span></div>
      <div class="detail-row"><span class="detail-label">Vehicles</span><span class="detail-val">${vehiclesSnap.size}</span><button class="btn btn-sm btn-g" style="margin-left:auto" onclick="closeModal('userModal');openAddVehicleForUser('${uid}','${(u.name || "").replace(/'/g, "")}')">+ Add Vehicle</button></div>
      <div class="detail-row"><span class="detail-label">Transactions</span><span class="detail-val">${invoicesSnap.size}</span></div>
      <div class="detail-row"><span class="detail-label">Total Spent</span><span class="detail-val" style="color:var(--green)">LKR ${formatNum(totalSpent)}</span></div>
    `;
    document.getElementById("userModalFooter").innerHTML = `
      <button class="btn btn-o" onclick="closeModal('userModal')">Close</button>
      <button class="btn btn-b" onclick="closeModal('userModal');openEditUser('${uid}')">✏️ Edit</button>
      <button class="btn btn-b" onclick="closeModal('userModal');openAddVehicleForUser('${uid}','${(u.name || "").replace(/'/g, "")}')">🚗 Add Vehicle</button>
      ${!u.isVerified ? `<button class="btn btn-g" onclick="verifyUser('${uid}');closeModal('userModal')">✓ Verify</button>` : ""}
      <button class="btn btn-o" onclick="sendPasswordReset('${u.email || ""}')" title="Send reset email">🔑 Reset PW</button>
      <button class="btn btn-r" onclick="deleteUser('${uid}','${(u.name || "this user").replace(/'/g, "")}')">🗑 Delete</button>
    `;
    openModal("userModal");
  } catch (e) {
    showToast("Error: " + e.message, "error");
  }
}
async function verifyUser(uid) {
  try {
    await db
      .collection("users")
      .doc(uid)
      .update({ isVerified: true, updatedAt: new Date().toISOString() });
    showToast("User verified ✓", "success");
    loadUsers();
  } catch (e) {
    showToast("Error: " + e.message, "error");
  }
}
function exportUsers() {
  showToast("Exporting users list...", "info");
  db.collection("users")
    .get()
    .then((snap) => {
      const rows = [["Name", "Email", "Phone", "Verified", "UID"]];
      snap.docs.forEach((d) => {
        const u = d.data();
        rows.push([
          u.name || "",
          u.email || "",
          u.phoneNumber || "",
          u.isVerified ? "Yes" : "No",
          u.uid || d.id,
        ]);
      });
      const csv = rows
        .map((r) =>
          r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","),
        )
        .join("\n");
      const a = document.createElement("a");
      a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
      a.download = "ecogrid_users.csv";
      a.click();
    });
}
let _txListener = null;
async function loadTransactions() {
  if (!db) return;
  document.getElementById("tx-tbody").innerHTML =
    '<tr><td colspan="7"><div class="loading"><div class="spin"></div>Loading...</div></td></tr>';
  try {
    let query = db.collection("invoices").orderBy("createdAt", "desc").limit(100);
    if (_txListener) _txListener();
    _txListener = query.onSnapshot((snap) => {
      try {
    const invoices = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const totalRev = invoices.reduce((s, i) => s + (i.amount || 0), 0);
    const totalEnergy = invoices.reduce(
      (s, i) => s + parseFloat(i.energy_kWh || 0),
      0,
    );
    document.getElementById("tx-stats").innerHTML = `
      <div class="card" style="border-left:4px solid var(--green)"><div style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.5px">Total Revenue</div><div style="font-size:22px;font-weight:800;margin-top:6px">LKR ${formatNum(totalRev)}</div><div style="color:var(--green);font-size:12px;margin-top:3px">From ${invoices.length} invoices</div></div>
      <div class="card" style="border-left:4px solid var(--blue)"><div style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.5px">Total Energy</div><div style="font-size:22px;font-weight:800;margin-top:6px">${formatNum(totalEnergy)} kWh</div><div style="color:var(--text3);font-size:12px;margin-top:3px">Avg ${(invoices.length ? totalEnergy / invoices.length : 0).toFixed(1)} kWh/session</div></div>
      <div class="card" style="border-left:4px solid var(--amber)"><div style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.5px">Avg Per Session</div><div style="font-size:22px;font-weight:800;margin-top:6px">LKR ${formatNum(invoices.length ? totalRev / invoices.length : 0)}</div><div style="color:var(--green);font-size:12px;margin-top:3px">CO₂ saved: ${(totalEnergy * 0.85).toFixed(1)} kg</div></div>
    `;
    document.getElementById("tx-tbody").innerHTML =
      invoices
        .map(
          (inv) => `
      <tr>
        <td><span class="mono">${inv.invoiceId || inv.id}</span></td>
        <td><span style="font-size:12px;color:var(--text2)">${inv.uId?.substring(0, 14) || "—"}...</span></td>
        <td>${inv.evStation_id || "—"}</td>
        <td style="font-size:12px;color:var(--text2)">${inv.vehicle_id?.substring(0, 12) || "—"}...</td>
        <td>${inv.energy_kWh || "—"} kWh</td>
        <td><strong>LKR ${formatNum(inv.amount)}</strong></td>
        <td style="color:var(--text2);font-size:12px">${inv.createdAt?.substring(0, 16) || inv.date || "—"}</td>
      </tr>`,
        )
        .join("") ||
      '<tr><td colspan="7"><div class="empty-state"><div class="empty-icon">📋</div>No invoices</div></td></tr>';
      } catch (err) {
        document.getElementById("tx-tbody").innerHTML =
          `<tr><td colspan="7" style="color:var(--red);padding:16px">Error: ${err.message}</td></tr>`;
      }
    }, (err) => {
      document.getElementById("tx-tbody").innerHTML =
        `<tr><td colspan="7" style="color:var(--red);padding:16px">Error: ${err.message}</td></tr>`;
    });
  } catch (e) {
    document.getElementById("tx-tbody").innerHTML =
      `<tr><td colspan="7" style="color:var(--red);padding:16px">Error: ${e.message}</td></tr>`;
  }
}
function exportTransactions() {
  showToast("Exporting transactions...", "info");
  db.collection("invoices")
    .orderBy("createdAt", "desc")
    .get()
    .then((snap) => {
      const rows = [
        [
          "Invoice ID",
          "User ID",
          "Station ID",
          "Vehicle ID",
          "Energy kWh",
          "Amount LKR",
          "Date",
        ],
      ];
      snap.docs.forEach((d) => {
        const i = d.data();
        rows.push([
          i.invoiceId || d.id,
          i.uId || "",
          i.evStation_id || "",
          i.vehicle_id || "",
          i.energy_kWh || "",
          i.amount || "",
          i.createdAt?.substring(0, 16) || "",
        ]);
      });
      const csv = rows
        .map((r) =>
          r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","),
        )
        .join("\n");
      const a = document.createElement("a");
      a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
      a.download = "ecogrid_transactions.csv";
      a.click();
    });
}
let _sessionsRtdbListener = null;
function renderSessionsTable(data) {
  const entries = Object.entries(data);
  const active = entries.filter(([, s]) => {
    const cs = s.current_session;
    return cs && (cs.relay === "ON" || cs.status === "CHARGING");
  });
  document.getElementById("sessions-live-text").textContent =
    active.length +
    " session" +
    (active.length !== 1 ? "s" : "") +
    " currently active · Last updated: " +
    new Date().toLocaleTimeString();
  if (entries.length === 0) {
    document.getElementById("sessions-tbody").innerHTML =
      '<tr><td colspan="9"><div class="empty-state"><div class="empty-icon">⚡</div>No stations in Realtime DB</div></td></tr>';
    return;
  }
  document.getElementById("sessions-tbody").innerHTML = entries
    .map(([sid, s]) => {
      const cs = s.current_session || {};
      const relay = cs.relay || s.relay || "OFF";
      const isCharging = relay === "ON" || cs.status === "CHARGING";
      const livePct = parseFloat(
        cs.livePercentage || cs.current_percent || s.current_percent || 0,
      );
      const targetPct = parseFloat(
        cs.targetPercentage || cs.target_percent || s.target_percent || 100,
      );
      const energyKwh =
        cs.energy_kwh !== undefined ? cs.energy_kwh : s.energy_kwh || 0;
      const timeLeft =
        cs.time_left_mins !== undefined
          ? cs.time_left_mins
          : s.time_left_mins || 0;
      const userId = cs.userId ? cs.userId.substring(0, 10) + "..." : "—";
      const startTime = cs.startTime
        ? new Date(cs.startTime).toLocaleTimeString()
        : "—";
      return (
        '<tr style="' +
        (isCharging ? "background:var(--green-l)" : "") +
        '">' +
        '<td><div style="font-weight:600;font-size:12px;max-width:130px;word-break:break-all">' +
        sid +
        "</div>" +
        (isCharging
          ? '<span class="live-dot" style="display:inline-block;margin-top:4px"></span>'
          : "") +
        "</td>" +
        '<td style="font-size:11px;color:var(--text2)">' +
        userId +
        "</td>" +
        '<td><span class="badge ' +
        (isCharging ? "bg" : "bgray") +
        '" style="font-weight:700">' +
        relay +
        "</span></td>" +
        '<td><div class="pb-wrap"><div class="pb"><div class="pb-fill" style="width:' +
        Math.min(livePct, 100) +
        '%"></div></div>' +
        '<span style="font-size:12px;font-weight:600">' +
        livePct.toFixed(1) +
        "%</span></div></td>" +
        '<td style="font-weight:600">' +
        targetPct.toFixed(1) +
        "%</td>" +
        "<td>" +
        parseFloat(energyKwh).toFixed(3) +
        " kWh</td>" +
        "<td>" +
        (timeLeft ? timeLeft + " min" : "—") +
        "</td>" +
        '<td style="font-size:11px;color:var(--text2)">' +
        startTime +
        "</td>" +
        '<td><button class="btn btn-sm ' +
        (isCharging ? "btn-r" : "btn-g") +
        '" onclick="toggleRelay(\'' +
        sid +
        "','" +
        relay +
        "')\">" +
        (isCharging ? "🛑 Stop" : "▶ Start") +
        "</button></td>" +
        "</tr>"
      );
    })
    .join("");
}
async function loadSessions() {
  if (!rtdb || !db) return;
  if (_sessionsRtdbListener) {
    rtdb.ref("stations").off("value", _sessionsRtdbListener);
    _sessionsRtdbListener = null;
  }
  document.getElementById("sessions-live-text").textContent =
    "Connecting to live feed...";
  document.getElementById("sessions-tbody").innerHTML =
    '<tr><td colspan="9"><div class="loading"><div class="spin"></div>Loading...</div></td></tr>';
  _sessionsRtdbListener = rtdb.ref("stations").on(
    "value",
    (snap) => {
      renderSessionsTable(snap.val() || {});
    },
    (err) => {
      document.getElementById("sessions-live-text").textContent =
        "Connection error";
      document.getElementById("sessions-tbody").innerHTML =
        '<tr><td colspan="9" style="color:var(--red);padding:16px">RTDB Error: ' +
        err.message +
        "</td></tr>";
    },
  );
  try {
    const histSnap = await db
      .collection("invoices")
      .orderBy("createdAt", "desc")
      .limit(20)
      .get();
    document.getElementById("history-tbody").innerHTML =
      histSnap.docs
        .map((d) => {
          const inv = d.data();
          return (
            "<tr>" +
            '<td><span class="mono">' +
            (inv.invoiceId || d.id) +
            "</span></td>" +
            '<td style="font-size:12px;color:var(--text2)">' +
            (inv.uId ? inv.uId.substring(0, 14) + "..." : "—") +
            "</td>" +
            "<td>" +
            (inv.evStation_id || "—") +
            "</td>" +
            '<td style="font-size:12px;color:var(--text2)">' +
            (inv.vehicle_id ? inv.vehicle_id.substring(0, 12) + "..." : "—") +
            "</td>" +
            "<td>" +
            (inv.energy_kWh || "—") +
            " kWh</td>" +
            "<td><strong>LKR " +
            formatNum(inv.amount) +
            "</strong></td>" +
            '<td style="color:var(--text2);font-size:12px">' +
            (inv.createdAt ? inv.createdAt.substring(0, 16) : "—") +
            "</td>" +
            "</tr>"
          );
        })
        .join("") ||
      '<tr><td colspan="7"><div class="empty-state">No history</div></td></tr>';
  } catch (e) {
    console.error("History load error:", e);
  }
}
let _vehiclesListener = null;
async function loadVehicles() {
  if (!db) return;
  document.getElementById("vehicles-tbody").innerHTML =
    '<tr><td colspan="8"><div class="loading"><div class="spin"></div>Loading...</div></td></tr>';
  const type = document.getElementById("v-type")?.value;
  try {
    let query = db
      .collection("vehicles")
      .orderBy("added_date", "desc")
      .limit(100);
    if (type) query = query.where("vehicle_type", "==", type);
    if (_vehiclesListener) _vehiclesListener();
    _vehiclesListener = query.onSnapshot((snap) => {
      try {
    const vehicles = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const avgBatt = vehicles.length
      ? Math.round(
          vehicles.reduce((s, v) => s + (v.battery_capacity_kwh || 0), 0) /
            vehicles.length,
        )
      : 0;
    const brands = {};
    vehicles.forEach((v) => {
      brands[v.brand] = (brands[v.brand] || 0) + 1;
    });
    const topBrand =
      Object.entries(brands).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";
    document.getElementById("vehicle-stats").innerHTML = `
      ${miniStat("Total", vehicles.length, "")}
      ${miniStat("Active", vehicles.filter((v) => v.isActive).length, "var(--green)")}
      ${miniStat("Top Brand", topBrand, "var(--blue)")}
      ${miniStat("Avg Battery", avgBatt + " kWh", "var(--purple)")}
    `;
    const typeIcons = {
      "EV CAR": "🚗",
      "EV BIKE": "🛵",
      "EV TUK-TUK": "🛺",
      "EV MINI SCOOTER": "🛴",
    };
    document.getElementById("vehicles-tbody").innerHTML =
      vehicles
        .map(
          (v) => `
      <tr>
        <td><div style="display:flex;align-items:center;gap:10px">
          <div style="width:36px;height:36px;background:var(--surface2);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:18px">${typeIcons[v.vehicle_type] || "🚗"}</div>
          <div style="font-weight:600">${v.brand} ${v.model}</div>
        </div></td>
        <td style="font-size:11px;color:var(--text2)">${v.user_id?.substring(0, 12) || "—"}...</td>
        <td><span style="font-family:monospace;background:var(--surface2);padding:2px 8px;border-radius:5px;font-size:12px">${v.plate_number || "—"}</span></td>
        <td>${v.vehicle_type || "—"}</td>
        <td><strong>${v.battery_capacity_kwh || "—"}</strong></td>
        <td style="color:var(--text2);font-size:12px">${v.added_date?.toDate?.()?.toLocaleDateString?.() || v.added_date?.substring?.(0, 10) || "—"}</td>
        <td><span style="color:${v.isActive ? "var(--green)" : "var(--text3)"};font-size:18px">●</span></td>
        <td><div style="display:flex;gap:5px">
          <button class="btn btn-sm btn-b" onclick="openEditVehicle('${v.id}')">✏️ Edit</button>
          <button class="btn btn-sm btn-r" onclick="deactivateVehicle('${v.id}')">Deactivate</button>
        </div></td>
      </tr>`,
        )
        .join("") ||
      '<tr><td colspan="8"><div class="empty-state"><div class="empty-icon">🚗</div>No vehicles</div></td></tr>';
      } catch (err) {
        document.getElementById("vehicles-tbody").innerHTML =
          `<tr><td colspan="8" style="color:var(--red);padding:16px">Error: ${err.message}</td></tr>`;
      }
    }, (err) => {
      document.getElementById("vehicles-tbody").innerHTML =
        `<tr><td colspan="8" style="color:var(--red);padding:16px">Error: ${err.message}</td></tr>`;
    });
  } catch (e) {
    document.getElementById("vehicles-tbody").innerHTML =
      `<tr><td colspan="8" style="color:var(--red);padding:16px">Error: ${e.message}</td></tr>`;
  }
}
async function deactivateVehicle(id) {
  if (!confirm("Deactivate this vehicle?")) return;
  try {
    await db
      .collection("vehicles")
      .doc(id)
      .update({ isActive: false, updatedAt: new Date().toISOString() });
    showToast("Vehicle deactivated", "success");
    loadVehicles();
  } catch (e) {
    showToast("Error: " + e.message, "error");
  }
}
let revComboChart, connPieChart;
async function loadRevenue() {
  if (!db) return;
  document.getElementById("rev-metrics").innerHTML =
    '<div style="grid-column:1/-1"><div class="loading"><div class="spin"></div>Calculating...</div></div>';
  try {
    const [invoicesSnap, stationsSnap] = await Promise.all([
      db.collection("invoices").get(),
      db.collection("Stations").get(),
    ]);
    const invoices = invoicesSnap.docs.map((d) => d.data());
    const stations = {};
    stationsSnap.docs.forEach((d) => {
      stations[d.id] = d.data();
    });
    const totalRev = invoices.reduce((s, i) => s + (i.amount || 0), 0);
    const totalEnergy = invoices.reduce(
      (s, i) => s + parseFloat(i.energy_kWh || 0),
      0,
    );
    const avgPerSession = invoices.length ? totalRev / invoices.length : 0;
    const avgPriceKwh = totalEnergy ? totalRev / totalEnergy : 0;
    document.getElementById("rev-metrics").innerHTML = `
      <div class="card" style="border-top:3px solid var(--green)"><div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--text3)">Total Revenue</div><div style="font-size:20px;font-weight:800;margin-top:6px">LKR ${formatNum(totalRev)}</div><div class="up" style="font-size:12px;margin-top:3px">↑ From ${invoices.length} sessions</div></div>
      <div class="card" style="border-top:3px solid var(--blue)"><div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--text3)">Avg Per Session</div><div style="font-size:20px;font-weight:800;margin-top:6px">LKR ${formatNum(avgPerSession)}</div></div>
      <div class="card" style="border-top:3px solid var(--amber)"><div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--text3)">Avg kWh Price</div><div style="font-size:20px;font-weight:800;margin-top:6px">LKR ${formatNum(avgPriceKwh)}</div></div>
      <div class="card" style="border-top:3px solid #7c3aed"><div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--text3)">CO₂ Saved</div><div style="font-size:20px;font-weight:800;margin-top:6px">${(totalEnergy * 0.85).toFixed(1)} kg</div></div>
    `;
    const monthly = {};
    invoices.forEach((inv) => {
      const m = (inv.createdAt || "").substring(0, 7);
      if (m) {
        if (!monthly[m]) monthly[m] = { rev: 0, energy: 0 };
        monthly[m].rev += inv.amount || 0;
        monthly[m].energy += parseFloat(inv.energy_kWh || 0);
      }
    });
    const months = Object.keys(monthly).sort().slice(-12);
    setTimeout(() => {
      if (revComboChart) revComboChart.destroy();
      revComboChart = new ApexCharts(document.getElementById("revCombo"), {
        chart: {
          type: "line",
          height: 280,
          toolbar: { show: false },
          fontFamily: "DM Sans,sans-serif",
        },
        series: [
          {
            name: "Revenue (LKR)",
            type: "area",
            data: months.map((m) => Math.round(monthly[m].rev)),
          },
          {
            name: "Energy (kWh)",
            type: "line",
            data: months.map((m) => Math.round(monthly[m].energy)),
          },
        ],
        colors: ["#16a34a", "#3b82f6"],
        stroke: { curve: "smooth", width: [2.5, 3] },
        fill: {
          type: ["gradient", "solid"],
          gradient: { opacityFrom: 0.25, opacityTo: 0.03 },
        },
        xaxis: {
          categories: months,
          labels: { style: { colors: "#94a3b8", fontSize: "11px" } },
          axisBorder: { show: false },
          axisTicks: { show: false },
        },
        yaxis: [
          {
            labels: {
              formatter: (v) => formatNum(v),
              style: { colors: "#94a3b8" },
            },
          },
          {
            opposite: true,
            labels: {
              formatter: (v) => v + " kWh",
              style: { colors: "#94a3b8" },
            },
          },
        ],
        grid: { borderColor: "#f1f5f9", strokeDashArray: 4 },
        dataLabels: { enabled: false },
        legend: { position: "top" },
      });
      revComboChart.render();
      const byConnector = {};
      invoices.forEach((inv) => {
        const c =
          stations[inv.evStation_id]?.techSpecs?.connection_type || "Other";
        byConnector[c] = (byConnector[c] || 0) + (inv.amount || 0);
      });
      if (connPieChart) connPieChart.destroy();
      connPieChart = new ApexCharts(document.getElementById("connPie"), {
        chart: { type: "pie", height: 280, fontFamily: "DM Sans,sans-serif" },
        series: Object.values(byConnector),
        labels: Object.keys(byConnector),
        colors: ["#16a34a", "#3b82f6", "#f59e0b", "#e2e8f0"],
        legend: { position: "bottom", fontSize: "12px" },
        dataLabels: { enabled: true },
        tooltip: { y: { formatter: (v) => "LKR " + formatNum(v) } },
      });
      connPieChart.render();
    }, 100);
    const byStation = {};
    invoices.forEach((inv) => {
      const sid = inv.evStation_id;
      if (!byStation[sid])
        byStation[sid] = {
          count: 0,
          rev: 0,
          energy: 0,
          name: stations[sid]?.basicInfo?.name || sid,
        };
      byStation[sid].count++;
      byStation[sid].rev += inv.amount || 0;
      byStation[sid].energy += parseFloat(inv.energy_kWh || 0);
    });
    const topStations = Object.entries(byStation)
      .sort((a, b) => b[1].rev - a[1].rev)
      .slice(0, 10);
    const maxRev = topStations[0]?.[1]?.rev || 1;
    document.getElementById("rev-stations-tbody").innerHTML =
      topStations
        .map(
          ([, s], i) => `
      <tr>
        <td style="color:var(--text3);font-weight:700">${i + 1}</td>
        <td><strong>${s.name}</strong></td>
        <td>${s.count}</td>
        <td><strong>LKR ${formatNum(s.rev)}</strong></td>
        <td>${formatNum(s.energy)} kWh</td>
        <td><div class="pb-wrap"><div class="pb" style="width:120px"><div class="pb-fill" style="width:${Math.round((s.rev / maxRev) * 100)}%"></div></div><span style="font-size:12px;color:var(--text2)">${Math.round((s.rev / maxRev) * 100)}%</span></div></td>
      </tr>`,
        )
        .join("") ||
      '<tr><td colspan="6"><div class="empty-state">No revenue data</div></td></tr>';
  } catch (e) {
    document.getElementById("rev-metrics").innerHTML =
      `<div style="grid-column:1/-1;color:var(--red);padding:16px">Error: ${e.message}</div>`;
  }
}
async function loadNotifHistory() {
  const el = document.getElementById("notif_history");
  if (!el) return;
  try {
    const token = await auth.currentUser.getIdToken();
    const res = await fetch("/api/notifications/history", {
      headers: { Authorization: "Bearer " + token },
    });
    const data = await res.json();
    if (data.success && data.data.length > 0) {
      el.innerHTML = data.data
        .slice(0, 8)
        .map(
          (n) =>
            '<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid var(--border)">' +
            '<div><span style="font-weight:600">' +
            (n.title || "—") +
            "</span>" +
            ' <span style="color:var(--text3)">→ ' +
            (n.target === "all" ? "All" : "Verified") +
            "</span></div>" +
            '<span style="color:var(--green);font-weight:600">✓ ' +
            (n.sentTo || 0) +
            "</span>" +
            "</div>",
        )
        .join("");
    } else {
      el.innerHTML =
        '<span style="color:var(--text3)">No notifications sent yet</span>';
    }
  } catch (e) {
    el.innerHTML =
      '<span style="color:var(--text3)">Could not load history</span>';
  }
}
async function sendNotification() {
  const title = document.getElementById("notif_title").value.trim();
  const body = document.getElementById("notif_body").value.trim();
  const target = document.getElementById("notif_target").value;
  if (!title || !body) {
    showToast("Title and message required", "error");
    return;
  }
  const btn = document.getElementById("notifSendBtn");
  const resultEl = document.getElementById("notif_result");
  btn.disabled = true;
  btn.textContent = "Sending...";
  resultEl.style.display = "none";
  try {
    const token = await auth.currentUser.getIdToken();
    const res = await fetch("/api/notifications/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
      body: JSON.stringify({ title, body, target }),
    });
    const data = await res.json();
    if (data.success) {
      resultEl.style.display = "block";
      resultEl.style.background = "var(--green-l)";
      resultEl.style.color = "var(--green)";
      resultEl.style.border = "1px solid #86efac";
      resultEl.innerHTML =
        "✓ Sent to <strong>" +
        data.sent +
        "</strong> device(s)" +
        (data.failed > 0
          ? ' · <span style="color:var(--amber)">' +
            data.failed +
            " failed</span>"
          : "");
      document.getElementById("notif_title").value = "";
      document.getElementById("notif_body").value = "";
      showToast(
        "Notification sent to " + data.sent + " device(s) ✓",
        "success",
      );
      loadNotifHistory();
    } else {
      throw new Error(data.message);
    }
  } catch (e) {
    resultEl.style.display = "block";
    resultEl.style.background = "#fee2e2";
    resultEl.style.color = "var(--red)";
    resultEl.style.border = "1px solid #fca5a5";
    resultEl.textContent = "Error: " + e.message;
    showToast("Failed: " + e.message, "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "📤 Send Notification";
  }
}
function formatNum(n) {
  const num = parseFloat(n) || 0;
  if (num >= 1000000) return (num / 1000000).toFixed(2) + "M";
  if (num >= 1000) return Math.round(num).toLocaleString();
  return num.toFixed(2);
}
document.addEventListener("keydown", (e) => {
  if (
    e.key === "Enter" &&
    document.getElementById("loginPassword") === document.activeElement
  )
    handleLogin();
});
let stationMap = null;
let stationMarker = null;
let placesService = null;
let autocompleteService = null;
let mapsReady = false;
function initStationMap() {
  if (!mapsReady || !window.google) return;
  const lat = parseFloat(document.getElementById("sm_lat").value) || 6.9271;
  const lng = parseFloat(document.getElementById("sm_lng").value) || 79.8612;
  const center = { lat, lng };
  const mapEl = document.getElementById("stationMapPicker");
  document.getElementById("mapPickerLoading").style.display = "none";
  stationMap = new google.maps.Map(mapEl, {
    center,
    zoom: 13,
    mapTypeId: "roadmap",
    disableDefaultUI: false,
    zoomControl: true,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: true,
    styles: [
      {
        featureType: "poi",
        elementType: "labels",
        stylers: [{ visibility: "off" }],
      },
    ],
  });
  stationMarker = new google.maps.Marker({
    position: center,
    map: stationMap,
    draggable: true,
    animation: google.maps.Animation.DROP,
    title: "Drag to set station location",
    icon: {
      path: google.maps.SymbolPath.CIRCLE,
      scale: 12,
      fillColor: "#16a34a",
      fillOpacity: 1,
      strokeColor: "#fff",
      strokeWeight: 3,
    },
  });
  stationMarker.addListener("dragend", () => {
    const pos = stationMarker.getPosition();
    document.getElementById("sm_lat").value = pos.lat().toFixed(6);
    document.getElementById("sm_lng").value = pos.lng().toFixed(6);
    reverseGeocode(pos.lat(), pos.lng());
  });
  stationMap.addListener("click", (e) => {
    stationMarker.setPosition(e.latLng);
    document.getElementById("sm_lat").value = e.latLng.lat().toFixed(6);
    document.getElementById("sm_lng").value = e.latLng.lng().toFixed(6);
    reverseGeocode(e.latLng.lat(), e.latLng.lng());
  });
  autocompleteService = new google.maps.places.AutocompleteService();
  placesService = new google.maps.places.PlacesService(stationMap);
  const addrInput = document.getElementById("sm_address");
  addrInput.addEventListener("input", () => {
    const q = addrInput.value.trim();
    if (q.length < 3) {
      document.getElementById("sm_address_suggestions").style.display = "none";
      return;
    }
    autocompleteService.getPlacePredictions(
      { input: q, componentRestrictions: { country: "lk" } },
      (predictions, status) => {
        const box = document.getElementById("sm_address_suggestions");
        if (
          status !== google.maps.places.PlacesServiceStatus.OK ||
          !predictions
        ) {
          box.style.display = "none";
          return;
        }
        box.innerHTML = predictions
          .map(
            (p) => `
          <div class="suggestion-item" onclick="selectAddressSuggestion('${p.place_id}','${p.description.replace(/'/g, "\\'")}')">
            📍 ${p.description}
          </div>`,
          )
          .join("");
        box.style.display = "block";
      },
    );
  });
  document.addEventListener("click", (e) => {
    if (
      !e.target.closest("#sm_address") &&
      !e.target.closest("#sm_address_suggestions")
    )
      document.getElementById("sm_address_suggestions").style.display = "none";
  });
}
function selectAddressSuggestion(placeId, description) {
  document.getElementById("sm_address").value = description;
  document.getElementById("sm_address_suggestions").style.display = "none";
  if (!placesService) return;
  placesService.getDetails(
    { placeId, fields: ["geometry", "formatted_address"] },
    (place, status) => {
      if (status !== google.maps.places.PlacesServiceStatus.OK) return;
      const loc = place.geometry.location;
      document.getElementById("sm_lat").value = loc.lat().toFixed(6);
      document.getElementById("sm_lng").value = loc.lng().toFixed(6);
      if (place.formatted_address)
        document.getElementById("sm_address").value = place.formatted_address;
      stationMarker.setPosition(loc);
      stationMap.panTo(loc);
      stationMap.setZoom(16);
    },
  );
}
function reverseGeocode(lat, lng) {
  if (!window.google) return;
  const geocoder = new google.maps.Geocoder();
  geocoder.geocode({ location: { lat, lng } }, (results, status) => {
    if (status === "OK" && results[0]) {
      const addrField = document.getElementById("sm_address");
      if (!addrField.value || addrField.value.length < 5)
        addrField.value = results[0].formatted_address;
    }
  });
}
function updateMapFromInputs() {
  const lat = parseFloat(document.getElementById("sm_lat").value);
  const lng = parseFloat(document.getElementById("sm_lng").value);
  if (isNaN(lat) || isNaN(lng) || !stationMap) return;
  const pos = new google.maps.LatLng(lat, lng);
  stationMarker.setPosition(pos);
  stationMap.panTo(pos);
}
function centerMapOnSriLanka() {
  if (!stationMap) return;
  stationMap.setCenter({ lat: 7.8731, lng: 80.7718 });
  stationMap.setZoom(8);
}
function useMyLocation() {
  if (!navigator.geolocation) {
    showToast("Geolocation not supported", "error");
    return;
  }
  showToast("Getting your location...", "info");
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude: lat, longitude: lng } = pos.coords;
      document.getElementById("sm_lat").value = lat.toFixed(6);
      document.getElementById("sm_lng").value = lng.toFixed(6);
      
      if (lat < 5.0 || lat > 10.0 || lng < 79.0 || lng > 82.0) {
        showToast("⚠️ Browser returned location outside SL (Check VPN/GPS)", "error");
      } else {
        showToast("Location set ✓", "success");
      }

      if (stationMap) {
        const loc = new google.maps.LatLng(lat, lng);
        stationMarker.setPosition(loc);
        stationMap.panTo(loc);
        stationMap.setZoom(16);
        reverseGeocode(lat, lng);
      }
    },
    (err) => showToast("Location error: " + err.message, "error"),
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  );
}
let mapNeedsInit = false;
async function setStationStatus(stationId, status) {
  if (!db) return;
  try {
    await db.collection("Stations").doc(stationId).update({
      status,
      updatedAt: new Date().toISOString(),
    });
    showToast("Status → " + status + " ✓", "success");
    loadStations();
  } catch (e) {
    showToast("Error: " + e.message, "error");
  }
}
async function sendPasswordReset(email) {
  if (!auth) return;
  try {
    await auth.sendPasswordResetEmail(email);
    showToast("Password reset email sent to " + email, "success");
  } catch (e) {
    showToast("Error: " + e.message, "error");
  }
}
async function deleteUser(uid, name) {
  if (
    !confirm(
      'Delete user "' +
        name +
        '"? This removes them from Auth + Firestore permanently.',
    )
  )
    return;
  try {
    const token = await auth.currentUser.getIdToken();
    const res = await fetch("/api/users/" + uid, {
      method: "DELETE",
      headers: { Authorization: "Bearer " + token },
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    showToast("User deleted", "success");
    closeModal("userModal");
    loadUsers();
  } catch (e) {
    showToast("Error: " + e.message, "error");
  }
}
async function toggleUserDisabled(uid, currentlyDisabled, name) {
  const action = currentlyDisabled ? "enable" : "disable";
  if (
    !confirm(
      (currentlyDisabled ? "Enable" : "Disable") + ' user "' + name + '"?',
    )
  )
    return;
  try {
    const token = await auth.currentUser.getIdToken();
    const res = await fetch("/api/users/" + uid + "/disable", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
      body: JSON.stringify({ disabled: !currentlyDisabled }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    showToast("User " + action + "d ✓", "success");
    closeModal("userModal");
    loadUsers();
  } catch (e) {
    showToast("Error: " + e.message, "error");
  }
}
let qrCurrentStationId = "";
let qrCurrentStationName = "";
function openQRModal(stationId, stationName, hardwareId) {
  qrCurrentStationId = stationId;
  qrCurrentStationName = stationName;
  document.getElementById("qrStationName").textContent =
    stationName || stationId;
  document.getElementById("qrStationHW").textContent = hardwareId
    ? "Hardware ID: " + hardwareId
    : "";
  const container = document.getElementById("qrCodeCanvas");
  container.innerHTML = "";
  if (!window.QRCode) {
    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";
    script.onload = () => renderQR(stationId, container);
    script.onerror = () => renderQRFallback(stationId, container);
    document.head.appendChild(script);
  } else {
    renderQR(stationId, container);
  }
  openModal("qrModal");
}
function renderQR(stationId, container) {
  try {
    new QRCode(container, {
      text: stationId,
      width: 220,
      height: 220,
      colorDark: "#000000",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.H,
    });
    setTimeout(() => {
      const canvas = container.querySelector("canvas");
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const size = 52;
      ctx.beginPath();
      ctx.arc(cx, cy, size / 2 + 6, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx, cy, size / 2 + 4, 0, Math.PI * 2);
      ctx.fillStyle = "#16a34a";
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 22px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("EG", cx, cy);
    }, 100);
  } catch (e) {
    renderQRFallback(stationId, container);
  }
}
function renderQRFallback(stationId, container) {
  container.innerHTML = `
    <div style="width:220px;height:220px;border:3px solid #000;border-radius:8px;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#fff;gap:8px">
      <div style="font-size:40px">⚡</div>
      <div style="font-size:11px;color:#666;text-align:center;padding:0 10px;word-break:break-all">${stationId}</div>
      <div style="font-size:10px;color:#999">Station ID</div>
    </div>`;
}
function downloadQR() {
  const container = document.getElementById("qrCodeCanvas");
  const canvas = container.querySelector("canvas");
  if (!canvas) {
    showToast("QR not ready yet", "error");
    return;
  }
  const dlCanvas = document.createElement("canvas");
  const W = 600,
    H = 720;
  dlCanvas.width = W;
  dlCanvas.height = H;
  const ctx = dlCanvas.getContext("2d");
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, W, H);
  const cardX = 30,
    cardY = 30,
    cardW = W - 60,
    cardH = H - 30;
  roundRect(ctx, cardX, cardY, cardW, cardH, 40);
  ctx.fillStyle = "#16a34a";
  ctx.fill();
  ctx.strokeStyle = "#22c55e";
  ctx.lineWidth = 8;
  ctx.lineCap = "round";
  const dashes = [
    [50, 50, 80, 70],
    [520, 45, 545, 65],
    [60, 640, 85, 660],
    [510, 635, 535, 655],
    [35, 180, 55, 200],
    [545, 170, 565, 190],
    [38, 430, 58, 450],
    [543, 420, 563, 440],
    [150, 42, 165, 58],
    [440, 42, 455, 58],
    [148, 645, 163, 661],
    [438, 645, 453, 661],
  ];
  dashes.forEach(([x1, y1, x2, y2]) => {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  });
  const qrPad = 80,
    qrSize = W - 160;
  roundRect(ctx, qrPad, qrPad + 20, qrSize, qrSize + 10, 24);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.drawImage(canvas, qrPad + 20, qrPad + 40, qrSize - 40, qrSize - 40);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 44px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("SCAN & POWER UP!", W / 2, cardY + cardH - 60);
  ctx.font = "20px Arial";
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.fillText(
    qrCurrentStationName || qrCurrentStationId,
    W / 2,
    cardY + cardH - 30,
  );
  const link = document.createElement("a");
  link.download =
    "ECOGRID-" +
    (qrCurrentStationName || qrCurrentStationId)
      .replace(/\s+/g, "-")
      .toUpperCase() +
    ".png";
  link.href = dlCanvas.toDataURL("image/png");
  link.click();
  showToast("QR Code downloaded ✓", "success");
}
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
let editingUserId = null;
function openAddUser() {
  editingUserId = null;
  document.getElementById("userEditModalTitle").textContent = "Add New User";
  document.getElementById("userEditSaveBtn").textContent = "Create User";
  document.getElementById("ue_name").value = "";
  document.getElementById("ue_email").value = "";
  document.getElementById("ue_phone").value = "";
  document.getElementById("ue_password").value = "";
  document.getElementById("ue_verified").checked = false;
  document.getElementById("ue_admin").checked = false;
  document.getElementById("ue_password_wrap").style.display = "block";
  document.getElementById("ue_note").innerHTML = "";
  resetUserPhotoUI();
  openModal("userEditModal");
}
async function openEditUser(uid) {
  if (!db) return;
  editingUserId = uid;
  document.getElementById("userEditModalTitle").textContent = "Edit User";
  document.getElementById("userEditSaveBtn").textContent = "Update User";
  document.getElementById("ue_password_wrap").style.display = "none";
  try {
    const doc = await db.collection("users").doc(uid).get();
    if (!doc.exists) {
      showToast("User not found", "error");
      return;
    }
    const u = doc.data();
    document.getElementById("ue_name").value = u.name || "";
    document.getElementById("ue_email").value = u.email || "";
    document.getElementById("ue_phone").value = u.phoneNumber || "";
    document.getElementById("ue_verified").checked = u.isVerified || false;
    document.getElementById("ue_admin").checked = false;
    document.getElementById("ue_note").innerHTML =
      '<div style="background:var(--amber-l);border-radius:8px;padding:10px 12px;font-size:12px;color:var(--amber);margin-top:12px">Password change: Use Firebase Console or have user reset via email.</div>';
    resetUserPhotoUI();
    if (u.profilePicUrl) {
      _currentUserPhotoUrl = u.profilePicUrl;
      document.getElementById("ue_avatar_icon").style.display = "none";
      const img = document.getElementById("ue_avatar_img");
      img.src = u.profilePicUrl;
      img.style.display = "block";
    }
    openModal("userEditModal");
  } catch (e) {
    showToast("Error: " + e.message, "error");
  }
}
async function saveUserEdit() {
  const name = document.getElementById("ue_name").value.trim();
  const email = document.getElementById("ue_email").value.trim();
  const phone = document.getElementById("ue_phone").value.trim();
  const password = document.getElementById("ue_password").value;
  const verified = document.getElementById("ue_verified").checked;
  const isAdmin = document.getElementById("ue_admin").checked;
  if (!name) {
    showToast("Name is required", "error");
    return;
  }
  if (!email) {
    showToast("Email is required", "error");
    return;
  }
  const btn = document.getElementById("userEditSaveBtn");
  btn.disabled = true;
  btn.textContent = "Saving...";
  try {
    if (!editingUserId) {
      if (!password || password.length < 6) {
        showToast("Password must be at least 6 characters", "error");
        btn.disabled = false;
        btn.textContent = "Create User";
        return;
      }
      const token = await auth.currentUser.getIdToken();
      const res = await fetch("/api/users/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify({
          name,
          email,
          password,
          phoneNumber: phone,
          isVerified: verified,
          isAdmin,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      showToast("User created ✓", "success");
    } else {
      let photoUrl = _currentUserPhotoUrl || null;
      if (_pendingUserPhotoFile && storage) {
        try {
          photoUrl = await uploadUserPhoto(
            editingUserId,
            _pendingUserPhotoFile,
          );
        } catch (pe) {
          showToast("Photo upload failed: " + pe.message, "error");
        }
      }
      const updateData = {
        name,
        email,
        phoneNumber: phone,
        isVerified: verified,
        updatedAt: new Date().toISOString(),
      };
      if (photoUrl) updateData.profilePicUrl = photoUrl;
      await db.collection("users").doc(editingUserId).update(updateData);
      if (isAdmin) {
        const token = await auth.currentUser.getIdToken();
        await fetch("/api/users/" + editingUserId + "/admin", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + token,
          },
          body: JSON.stringify({ isAdmin: true }),
        });
      }
      showToast("User updated ✓", "success");
    }
    closeModal("userEditModal");
    loadUsers();
  } catch (e) {
    showToast("Error: " + e.message, "error");
  } finally {
    btn.disabled = false;
    btn.textContent = editingUserId ? "Update User" : "Create User";
  }
}
let editingVehicleId = null;
async function openEditVehicle(id) {
  if (!db) return;
  editingVehicleId = id;
  document.getElementById("vehicleEditModalTitle").textContent = "Edit Vehicle";
  try {
    const doc = await db.collection("vehicles").doc(id).get();
    if (!doc.exists) {
      showToast("Vehicle not found", "error");
      return;
    }
    const v = doc.data();
    document.getElementById("ve_brand").value = v.brand || "";
    document.getElementById("ve_model").value = v.model || "";
    document.getElementById("ve_plate").value = v.plate_number || "";
    document.getElementById("ve_battery").value = v.battery_capacity_kwh || "";
    document.getElementById("ve_type").value = v.vehicle_type || "EV CAR";
    document.getElementById("ve_active").checked = v.isActive !== false;
    openModal("vehicleEditModal");
  } catch (e) {
    showToast("Error: " + e.message, "error");
  }
}
async function saveVehicleEdit() {
  const brand = document.getElementById("ve_brand").value.trim();
  const model = document.getElementById("ve_model").value.trim();
  const plate = document.getElementById("ve_plate").value.trim();
  const battery = document.getElementById("ve_battery").value;
  const type = document.getElementById("ve_type").value;
  const active = document.getElementById("ve_active").checked;
  if (!brand) {
    showToast("Brand is required", "error");
    return;
  }
  if (!model) {
    showToast("Model is required", "error");
    return;
  }
  if (!plate) {
    showToast("Plate number is required", "error");
    return;
  }
  const btn = document.getElementById("vehicleEditSaveBtn");
  btn.disabled = true;
  btn.textContent = "Saving...";
  try {
    await db
      .collection("vehicles")
      .doc(editingVehicleId)
      .update({
        brand,
        model,
        plate_number: plate,
        battery_capacity_kwh: parseFloat(battery) || 0,
        vehicle_type: type,
        isActive: active,
        updatedAt: new Date().toISOString(),
      });
    showToast("Vehicle updated ✓", "success");
    closeModal("vehicleEditModal");
    loadVehicles();
  } catch (e) {
    showToast("Error: " + e.message, "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "Update Vehicle";
  }
}
let _pendingUserPhotoFile = null;
let _currentUserPhotoUrl = null;
function handleUserPhotoSelect(event) {
  const file = event.target.files[0];
  if (!file) return;
  _pendingUserPhotoFile = file;
  const reader = new FileReader();
  reader.onload = (e) => {
    document.getElementById("ue_avatar_icon").style.display = "none";
    const img = document.getElementById("ue_avatar_img");
    img.src = e.target.result;
    img.style.display = "block";
  };
  reader.readAsDataURL(file);
}
async function uploadUserPhoto(uid, file) {
  const safeExt = file.name.split(".").pop().toLowerCase();
  const ref = storage.ref(
    "Users/" + uid + "/profile_" + Date.now() + "." + safeExt,
  );
  document.getElementById("ue_photo_progress").style.display = "block";
  return new Promise((resolve, reject) => {
    const task = ref.put(file);
    task.on(
      "state_changed",
      (snap) => {
        const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
        document.getElementById("ue_photo_progress_fill").style.width =
          pct + "%";
        document.getElementById("ue_photo_progress_text").textContent =
          "Uploading photo... " + pct + "%";
      },
      (err) => {
        document.getElementById("ue_photo_progress").style.display = "none";
        reject(err);
      },
      () =>
        task.snapshot.ref.getDownloadURL().then((url) => {
          document.getElementById("ue_photo_progress").style.display = "none";
          resolve(url);
        }),
    );
  });
}
function resetUserPhotoUI() {
  _pendingUserPhotoFile = null;
  _currentUserPhotoUrl = null;
  document.getElementById("ue_avatar_icon").style.display = "";
  const img = document.getElementById("ue_avatar_img");
  img.src = "";
  img.style.display = "none";
  document.getElementById("ue_photo_file").value = "";
  document.getElementById("ue_photo_progress").style.display = "none";
}
let _addVehicleTargetUserId = null;
let _addVehicleTargetUserName = null;
function openAddVehicleForUser(uid, name) {
  _addVehicleTargetUserId = uid;
  _addVehicleTargetUserName = name || uid;
  document.getElementById("av_user_info").textContent =
    "👤 Adding vehicle for user: " + _addVehicleTargetUserName;
  document.getElementById("av_brand").value = "";
  document.getElementById("av_model").value = "";
  document.getElementById("av_plate").value = "";
  document.getElementById("av_battery").value = "";
  document.getElementById("av_type").value = "EV CAR";
  openModal("addVehicleModal");
}
async function saveAddVehicleForUser() {
  const brand = document.getElementById("av_brand").value.trim();
  const model = document.getElementById("av_model").value.trim();
  const plate = document.getElementById("av_plate").value.trim().toUpperCase();
  const battery = parseFloat(document.getElementById("av_battery").value) || 0;
  const type = document.getElementById("av_type").value;
  if (!brand) {
    showToast("Brand is required", "error");
    return;
  }
  if (!model) {
    showToast("Model is required", "error");
    return;
  }
  if (!plate) {
    showToast("Plate number is required", "error");
    return;
  }
  if (!_addVehicleTargetUserId) {
    showToast("No user selected", "error");
    return;
  }
  const btn = document.getElementById("addVehicleSaveBtn");
  btn.disabled = true;
  btn.textContent = "Adding...";
  try {
    await db.collection("vehicles").add({
      brand,
      model,
      plate_number: plate,
      battery_capacity_kwh: battery,
      vehicle_type: type,
      user_id: _addVehicleTargetUserId,
      isActive: true,
      added_date: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    showToast("Vehicle added successfully ✓", "success");
    closeModal("addVehicleModal");
    loadVehicles();
  } catch (e) {
    showToast("Error: " + e.message, "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "Add Vehicle";
  }
}
if (CONFIG.apiKey) {
  setTimeout(() => {
    initFirebase();
    loadGoogleMaps();
  }, 100);
}

import re

with open('resources/script.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update loadStations
stations_old = """async function loadStations() {
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
    const snap = await query.get();"""
    
stations_new = """let _stationsListener = null;
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
      try {"""
      
stations_tail_old = """    document.getElementById("stations-pag-info").textContent =
      `Showing ${stations.length} stations`;
  } catch (e) {
    document.getElementById("stations-tbody").innerHTML =
      `<tr><td colspan="10" style="color:var(--red);padding:16px">Error: ${e.message}</td></tr>`;
  }
}"""

stations_tail_new = """    document.getElementById("stations-pag-info").textContent =
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
}"""

if stations_old in content:
    content = content.replace(stations_old, stations_new)
else:
    print("WARNING: stations_old not found")

if stations_tail_old in content:
    content = content.replace(stations_tail_old, stations_tail_new)
else:
    print("WARNING: stations_tail_old not found")

# 2. Update loadUsers
users_old = """async function loadUsers(verified = "") {
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
    const snap = await query.get();"""

users_new = """let _usersListener = null;
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
      try {"""

users_tail_old = """        .catch(() => {});
    });
  } catch (e) {
    document.getElementById("users-tbody").innerHTML =
      `<tr><td colspan="7" style="color:var(--red);padding:16px">Error: ${e.message}</td></tr>`;
  }
}"""

users_tail_new = """        .catch(() => {});
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
}"""

if users_old in content:
    content = content.replace(users_old, users_new)
else:
    print("WARNING: users_old not found")
if users_tail_old in content:
    content = content.replace(users_tail_old, users_tail_new)
else:
    print("WARNING: users_tail_old not found")

# 3. Update loadTransactions
tx_old = """async function loadTransactions() {
  if (!db) return;
  document.getElementById("tx-tbody").innerHTML =
    '<tr><td colspan="7"><div class="loading"><div class="spin"></div>Loading...</div></td></tr>';
  try {
    const snap = await db
      .collection("invoices")
      .orderBy("createdAt", "desc")
      .limit(100)
      .get();"""

tx_new = """let _txListener = null;
async function loadTransactions() {
  if (!db) return;
  document.getElementById("tx-tbody").innerHTML =
    '<tr><td colspan="7"><div class="loading"><div class="spin"></div>Loading...</div></td></tr>';
  try {
    let query = db.collection("invoices").orderBy("createdAt", "desc").limit(100);
    if (_txListener) _txListener();
    _txListener = query.onSnapshot((snap) => {
      try {"""

tx_tail_old = """      '<tr><td colspan="7"><div class="empty-state"><div class="empty-icon">📋</div>No invoices</div></td></tr>';
  } catch (e) {
    document.getElementById("tx-tbody").innerHTML =
      `<tr><td colspan="7" style="color:var(--red);padding:16px">Error: ${e.message}</td></tr>`;
  }
}"""

tx_tail_new = """      '<tr><td colspan="7"><div class="empty-state"><div class="empty-icon">📋</div>No invoices</div></td></tr>';
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
}"""

if tx_old in content:
    content = content.replace(tx_old, tx_new)
else:
    print("WARNING: tx_old not found")
if tx_tail_old in content:
    content = content.replace(tx_tail_old, tx_tail_new)
else:
    print("WARNING: tx_tail_old not found")

# 4. Update loadVehicles
v_old = """async function loadVehicles() {
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
    const snap = await query.get();"""

v_new = """let _vehiclesListener = null;
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
      try {"""

v_tail_old = """      '<tr><td colspan="8"><div class="empty-state"><div class="empty-icon">🚗</div>No vehicles</div></td></tr>';
  } catch (e) {
    document.getElementById("vehicles-tbody").innerHTML =
      `<tr><td colspan="8" style="color:var(--red);padding:16px">Error: ${e.message}</td></tr>`;
  }
}"""

v_tail_new = """      '<tr><td colspan="8"><div class="empty-state"><div class="empty-icon">🚗</div>No vehicles</div></td></tr>';
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
}"""

if v_old in content:
    content = content.replace(v_old, v_new)
else:
    print("WARNING: v_old not found")
if v_tail_old in content:
    content = content.replace(v_tail_old, v_tail_new)
else:
    print("WARNING: v_tail_old not found")

with open('resources/script.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Script successfully updated.")

// ★ あなたの GAS Web App URL
const API_URL = "https://script.google.com/macros/s/AKfycbwziTKNNlntApFFszu3UFmZYA6lIVanDCTa1ImkbFq-6wpUCdhTnD4m_IG20mx3vN3P/exec";

let allCustomers = [];
let currentCustomerId = null;
let currentVisits = [];

const statusEl = document.getElementById("statusMessage");
const errorEl = document.getElementById("errorMessage");

function setStatus(msg) {
  statusEl.textContent = msg || "";
}
function setError(msg) {
  errorEl.textContent = msg || "";
}

// 共通 API 呼び出し
async function apiRequest(action, payload = {}) {
  setError("");
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...payload }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || "API error");
    return json.data;
  } catch (e) {
    console.error(e);
    setError("通信エラー: " + e.message);
    throw e;
  }
}

/* ========== 顧客一覧 ========== */

async function loadCustomers() {
  setStatus("顧客一覧を読み込み中...");
  const data = await apiRequest("getCustomers");
  allCustomers = Array.isArray(data) ? data : [];
  renderCustomerList();
  setStatus("顧客数: " + allCustomers.length + "件");
}

function renderCustomerList(filterText = "") {
  const listEl = document.getElementById("customerList");
  listEl.innerHTML = "";

  const keyword = filterText.trim().toLowerCase();
  const filtered = allCustomers.filter((c) => {
    if (!keyword) return true;
    return (
      (c.name || "").toLowerCase().includes(keyword) ||
      (c.kana || "").toLowerCase().includes(keyword) ||
      (c.phone || "").toLowerCase().includes(keyword)
    );
  });

  if (!filtered.length) {
    listEl.innerHTML =
      '<div class="bk-customer-item">顧客が登録されていません。</div>';
    return;
  }

  filtered.forEach((c) => {
    const item = document.createElement("div");
    item.className =
      "bk-customer-item" +
      (String(c.customerId) === String(currentCustomerId) ? " active" : "");
    item.dataset.id = c.customerId;

    const left = document.createElement("div");
    const name = c.name || "(無名)";
    left.innerHTML = `
      <div>${name}</div>
      <div class="bk-customer-item-sub">${c.phone || ""}</div>
    `;

    const right = document.createElement("div");
    if (c.noShowCount && Number(c.noShowCount) > 0) {
      const b = document.createElement("span");
      b.className = "bk-pill bk-pill-flag";
      b.textContent = "ブッチ×" + c.noShowCount;
      right.appendChild(b);
    } else if (!c.segment || c.segment === "新規") {
      const b = document.createElement("span");
      b.className = "bk-pill bk-pill-seg";
      b.textContent = "NEW";
      right.appendChild(b);
    }

    item.appendChild(left);
    item.appendChild(right);
    item.addEventListener("click", () => selectCustomer(c.customerId));
    listEl.appendChild(item);
  });
}

// 顧客選択
async function selectCustomer(customerId) {
  currentCustomerId = customerId;
  const customer = allCustomers.find(
    (c) => String(c.customerId) === String(customerId)
  );
  fillCustomerForm(customer);
  updateHeaderDisplay(customer);

  document.querySelectorAll(".bk-customer-item").forEach((el) => {
    el.classList.toggle(
      "active",
      String(el.dataset.id) === String(customerId)
    );
  });
  await loadVisits(customerId);
}

/* ========== 顧客フォーム & ヘッダー ========== */

function fillCustomerForm(c = {}) {
  document.getElementById("customerId").value = c.customerId || "";
  document.getElementById("name").value = c.name || "";
  document.getElementById("kana").value = c.kana || "";
  document.getElementById("phone").value = c.phone || "";
  document.getElementById("gender").value = c.gender || "";
  document.getElementById("birthday").value = toInputDate(c.birthday);
  document.getElementById("stylist").value = c.stylist || "";
  document.getElementById("segment").value = c.segment || "";
  document.getElementById("cycleDays").value = c.cycleDays || "";
  document.getElementById("lastVisit").value = toInputDate(c.lastVisit);
  document.getElementById("memo").value = c.memo || "";
  document.getElementById("noShowCount").value = c.noShowCount || 0;
  document.getElementById("flag").value = c.flag || "";
  document.getElementById("nextReservation").value = toInputDateTime(
    c.nextReservation
  );
}

function updateHeaderDisplay(c = {}) {
  const name = c.name || "顧客を選択してください";
  document.getElementById("displayName").textContent = name;
  document.getElementById("displayPhone").textContent =
    "電話番号: " + (c.phone || "-");
  document.getElementById("displayLastVisit").textContent =
    " / 最終来店: " + (formatDate(c.lastVisit) || "-");
  document.getElementById("displayCycle").textContent =
    " / サイクル: " + (c.cycleDays || "-") + "日";

  const segEl = document.getElementById("displaySegment");
  segEl.textContent = c.segment || "-";

  const flagEl = document.getElementById("displayFlag");
  if (c.flag) {
    flagEl.textContent = c.flag;
    flagEl.style.display = "inline-block";
  } else {
    flagEl.style.display = "none";
  }

  const noShowEl = document.getElementById("displayNoShow");
  if (c.noShowCount && Number(c.noShowCount) > 0) {
    noShowEl.textContent = "ブッチ " + c.noShowCount + "回";
    noShowEl.style.display = "inline-block";
  } else {
    noShowEl.style.display = "none";
  }

  const nextResEl = document.getElementById("displayNextReservation");
  if (c.nextReservation) {
    nextResEl.textContent = formatDateTime(c.nextReservation);
  } else {
    nextResEl.textContent = "未設定";
  }

  const avatarEl = document.getElementById("avatarInitial");
  avatarEl.textContent = name ? name[0] || "？" : "？";
}

/* ========== 日付ユーティリティ ========== */

function toInputDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}
function toInputDateTime(value) {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  const iso = d.toISOString();
  return iso.slice(0, 16); // yyyy-MM-ddTHH:mm
}
function formatDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = ("0" + (d.getMonth() + 1)).slice(-2);
  const day = ("0" + d.getDate()).slice(-2);
  return `${y}/${m}/${day}`;
}
function formatDateTime(value) {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = ("0" + (d.getMonth() + 1)).slice(-2);
  const day = ("0" + d.getDate()).slice(-2);
  const h = ("0" + d.getHours()).slice(-2);
  const mi = ("0" + d.getMinutes()).slice(-2);
  return `${y}/${m}/${day} ${h}:${mi}`;
}

/* ========== 顧客フォームのイベント ========== */

document
  .getElementById("customerForm")
  .addEventListener("submit", async (e) => {
    e.preventDefault();

    const customer = {
      customerId: document.getElementById("customerId").value || null,
      name: document.getElementById("name").value.trim(),
      kana: document.getElementById("kana").value.trim(),
      phone: document.getElementById("phone").value.trim(),
      gender: document.getElementById("gender").value,
      birthday: document.getElementById("birthday").value,
      stylist: document.getElementById("stylist").value.trim(),
      segment: document.getElementById("segment").value,
      cycleDays: document.getElementById("cycleDays").value,
      lastVisit: document.getElementById("lastVisit").value,
      memo: document.getElementById("memo").value.trim(),
      nextReservation: document.getElementById("nextReservation").value,
      noShowCount: document.getElementById("noShowCount").value || 0,
      flag: document.getElementById("flag").value,
    };

    if (!customer.name) {
      setError("名前は必須です。");
      return;
    }

    setStatus("顧客情報を保存中...");
    const saved = await apiRequest("saveCustomer", { customer });
    setStatus("顧客情報を保存しました。");

    const idx = allCustomers.findIndex(
      (c) => String(c.customerId) === String(saved.customerId)
    );
    if (idx >= 0) allCustomers[idx] = saved;
    else allCustomers.push(saved);

    currentCustomerId = saved.customerId;
    renderCustomerList(document.getElementById("searchInput").value);
    updateHeaderDisplay(saved);
    fillCustomerForm(saved);
  });

document
  .getElementById("resetCustomerBtn")
  .addEventListener("click", () => {
    currentCustomerId = null;
    fillCustomerForm({});
    updateHeaderDisplay({});
    currentVisits = [];
    renderVisits();
    document
      .querySelectorAll(".bk-customer-item")
      .forEach((el) => el.classList.remove("active"));
  });

document.getElementById("newCustomerBtn").addEventListener("click", () => {
  currentCustomerId = null;
  fillCustomerForm({});
  updateHeaderDisplay({});
  currentVisits = [];
  renderVisits();
  document
    .querySelectorAll(".bk-customer-item")
    .forEach((el) => el.classList.remove("active"));
});

document.getElementById("searchInput").addEventListener("input", (e) => {
  renderCustomerList(e.target.value);
});

/* ========== 来店履歴 ========== */

async function loadVisits(customerId) {
  if (!customerId) {
    currentVisits = [];
    renderVisits();
    return;
  }
  setStatus("来店履歴を読み込み中...");
  const data = await apiRequest("getVisits", { customerId });
  currentVisits = Array.isArray(data) ? data : [];
  renderVisits();
  setStatus("来店履歴: " + currentVisits.length + "件");
}

function renderVisits() {
  const tbody = document.querySelector("#visitsTable tbody");
  tbody.innerHTML = "";

  if (!currentVisits.length) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 6;
    td.textContent = "来店履歴はまだありません。";
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  currentVisits
    .slice()
    .sort((a, b) => new Date(b.visitDate) - new Date(a.visitDate))
    .forEach((v) => {
      const tr = document.createElement("tr");
      const d = formatDate(v.visitDate);
      tr.innerHTML = `
        <td>${d || ""}</td>
        <td>${v.menu || ""}</td>
        <td>${v.amount || ""}</td>
        <td>${v.stylist || ""}</td>
        <td>${
          v.photoUrl
            ? `<img src="${v.photoUrl}" class="bk-photo-thumb">`
            : ""
        }</td>
        <td>${(v.note || "").slice(0, 40)}</td>
      `;
      tr.style.cursor = "pointer";
      tr.addEventListener("click", () => fillVisitForm(v));
      tbody.appendChild(tr);
    });
}

function fillVisitForm(v = {}) {
  document.getElementById("visitId").value = v.visitId || "";
  document.getElementById("visitDate").value = toInputDate(v.visitDate) || "";
  document.getElementById("menu").value = v.menu || "";
  document.getElementById("amount").value = v.amount || "";
  document.getElementById("visitStylist").value = v.stylist || "";
  document.getElementById("recipe").value = v.recipe || "";
  document.getElementById("note").value = v.note || "";
  document.getElementById("talk").value = v.talk || "";
  document.getElementById("photoInput").value = "";
}

document.getElementById("resetVisitBtn").addEventListener("click", () => {
  fillVisitForm({});
});

document.getElementById("visitForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!currentCustomerId && !document.getElementById("customerId").value) {
    setError("先に顧客情報を保存してください。");
    return;
  }
  const customerId =
    currentCustomerId || document.getElementById("customerId").value;

  let visit = {
    visitId: document.getElementById("visitId").value || null,
    customerId,
    visitDate: document.getElementById("visitDate").value,
    menu: document.getElementById("menu").value,
    amount: Number(document.getElementById("amount").value || 0),
    stylist: document.getElementById("visitStylist").value,
    recipe: document.getElementById("recipe").value,
    note: document.getElementById("note").value,
    talk: document.getElementById("talk").value,
    photoUrl: "",
  };

  if (!visit.visitDate) {
    setError("来店日は必須です。");
    return;
  }

  setStatus("来店履歴を保存中...");

  const fileInput = document.getElementById("photoInput");
  const file = fileInput.files[0];

  try {
    // 写真がある場合 → 先にアップロード
    if (file) {
      const base64 = await fileToBase64(file);
      const uploadRes = await apiRequest("uploadPhoto", {
        base64: base64.split(",")[1], // "data:...;base64," を除去
        customerId,
        recordId: visit.visitId || "temp",
      });
      if (uploadRes && uploadRes.photoUrl) {
        visit.photoUrl = uploadRes.photoUrl;
      }
    }

    const saved = await apiRequest("saveVisit", { visit });
    setStatus("来店履歴を保存しました。");

    const idx = currentVisits.findIndex(
      (v) => String(v.visitId) === String(saved.visitId)
    );
    if (idx >= 0) currentVisits[idx] = saved;
    else currentVisits.push(saved);

    renderVisits();
    fillVisitForm({});
    document.getElementById("photoInput").value = "";
  } catch (err) {
    console.error(err);
  }
});

/* ========== 画像 Base64 変換 ========== */

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = (e) => reject(e);
    reader.readAsDataURL(file);
  });
}

/* ========== 初期ロード ========== */

window.addEventListener("load", () => {
  loadCustomers().catch(console.error);
});

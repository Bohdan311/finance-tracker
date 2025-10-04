// TCP Money Manager — frontend logic (vanilla JS)
// storage keys
const KEY_PIN = "tcp_pin_v1";
const KEY_SESSION = "tcp_session_v1";
const KEY_ACCOUNTS = "tcp_accounts_v1";
const KEY_TX = "tcp_tx_v1";
const KEY_THEME = "tcp_theme_v1";

// DOM
const overlay = document.getElementById("authOverlay");
const setupBlock = document.getElementById("setupBlock");
const loginBlock = document.getElementById("loginBlock");
const setupPin = document.getElementById("setupPin");
const setupSave = document.getElementById("setupSave");
const loginPin = document.getElementById("loginPin");
const loginBtn = document.getElementById("loginBtn");
const authError = document.getElementById("authError");
const appViews = document.querySelectorAll(".view");
const navBtns = document.querySelectorAll(".nav-btn");
const lockBtn = document.getElementById("lockBtn");
const themeToggle = document.getElementById("themeToggle");
const addTxQuick = document.getElementById("addTxQuick");
const modal = document.getElementById("modal");
const modalForm = document.getElementById("modalForm");
const modalCancel = document.getElementById("modalCancel");

// data
let accounts = JSON.parse(localStorage.getItem(KEY_ACCOUNTS)) || [
  { id: genId(), name: "ПУМБ (UAH)", currency: "UAH" },
  { id: genId(), name: "Bybit (USDT)", currency: "USDT" }
];
let transactions = JSON.parse(localStorage.getItem(KEY_TX)) || [];

// charts
let lineChart = null, pieChart = null;

// ---------- Utilities ----------
function genId(){ return Date.now().toString(36) + Math.floor(Math.random()*999).toString(36); }
function saveAll(){
  localStorage.setItem(KEY_ACCOUNTS, JSON.stringify(accounts));
  localStorage.setItem(KEY_TX, JSON.stringify(transactions));
}
function $(sel){ return document.querySelector(sel); }
function $all(sel){ return document.querySelectorAll(sel); }

// hash via SubtleCrypto (SHA-256) -> hex
async function hashHex(str){
  const enc = new TextEncoder().encode(str);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
}

// ---------- AUTH flow ----------
(async function authInit(){
  const pinHash = localStorage.getItem(KEY_PIN);
  const session = localStorage.getItem(KEY_SESSION);
  if(session === "true"){
    // already allowed
    overlay.style.display = "none";
    initApp();
    restoreTheme();
    return;
  }
  // if no pin -> show setup, else show login
  if(!pinHash){
    setupBlock.classList.remove("hidden");
    loginBlock.classList.add("hidden");
  } else {
    setupBlock.classList.add("hidden");
    loginBlock.classList.remove("hidden");
  }
  overlay.style.display = "flex";
})();

setupSave.addEventListener("click", async ()=>{
  const pin = setupPin.value.trim();
  if(!/^\d{4,6}$/.test(pin)){ alert("PIN має бути 4–6 цифр"); return; }
  const h = await hashHex(pin);
  localStorage.setItem(KEY_PIN, h);
  setupPin.value = "";
  setupBlock.classList.add("hidden");
  loginBlock.classList.remove("hidden");
  alert("PIN збережено. Введіть PIN для входу.");
});

loginBtn.addEventListener("click", async ()=>{
  const pin = loginPin.value.trim();
  if(!pin){ authError.textContent = "Введіть PIN"; return; }
  const h = await hashHex(pin);
  const stored = localStorage.getItem(KEY_PIN);
  if(h === stored){
    localStorage.setItem(KEY_SESSION, "true");
    overlay.style.display = "none";
    loginPin.value = "";
    authError.textContent = "";
    restoreTheme();
    initApp();
  } else {
    authError.textContent = "Невірний PIN";
  }
});

// lock (logout)
lockBtn.addEventListener("click", ()=>{
  localStorage.removeItem(KEY_SESSION);
  location.reload();
});

// ---------- Theme ----------
themeToggle.addEventListener("change", ()=>{
  const light = themeToggle.checked;
  document.body.classList.toggle("theme-light", light);
  localStorage.setItem(KEY_THEME, light ? "light" : "dark");
  rebuildCharts();
});
function restoreTheme(){
  const t = localStorage.getItem(KEY_THEME);
  if(t === "light"){ document.body.classList.add("theme-light"); themeToggle.checked = true; }
}

// ---------- Navigation ----------
navBtns.forEach(btn=>{
  btn.addEventListener("click", ()=> {
    navBtns.forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    const view = btn.dataset.view;
    appViews.forEach(v=>v.classList.add("hidden"));
    document.getElementById("view-" + view).classList.remove("hidden");
    if(view === "accounts") renderAccounts();
    if(view === "transactions") renderAllTx();
  });
});

// ---------- Accounts ----------
const accountsList = document.getElementById("accountsList");
const newAccountName = document.getElementById("newAccountName");
const newAccountCurrency = document.getElementById("newAccountCurrency");
const addAccountBtn = document.getElementById("addAccountBtn");
const importCsv = document.getElementById("importCsv");
const exportCsv = document.getElementById("exportCsv");
const filterAccount = document.getElementById("filterAccount");

addAccountBtn.addEventListener("click", ()=>{
  const name = newAccountName.value.trim();
  const cur = newAccountCurrency.value || "UAH";
  if(!name){ alert("Введіть назву рахунку"); return; }
  accounts.push({ id: genId(), name, currency: cur });
  newAccountName.value = "";
  saveAll(); renderAccounts(); refreshAll();
});

function renderAccounts(){
  // list + selects
  accountsList.innerHTML = "";
  filterAccount.innerHTML = '<option value="">Всі рахунки</option>';
  const mAccount = document.getElementById("mAccount");
  const txSelect = document.getElementById("mAccount");
  mAccount && (mAccount.innerHTML = "");
  accounts.forEach(a=>{
    const li = document.createElement("li");
    li.innerHTML = `<span>${a.name} <small class="muted">(${a.currency})</small></span>
      <div><button class="btn small" data-id="${a.id}" data-action="edit-acc">✏️</button>
      <button class="btn small" data-id="${a.id}" data-action="remove-acc">🗑️</button></div>`;
    accountsList.appendChild(li);

    const opt = document.createElement("option"); opt.value = a.id; opt.textContent = a.name; filterAccount.appendChild(opt);
    const opt2 = opt.cloneNode(true); mAccount && mAccount.appendChild(opt2);
  });
}

// account remove/edit (delegation)
document.addEventListener("click",(e)=>{
  const rem = e.target.closest('button[data-action="remove-acc"]');
  if(rem){
    const id = rem.getAttribute('data-id');
    if(!confirm('Видалити рахунок та всі пов\'язані транзакції?')) return;
    accounts = accounts.filter(a=>a.id!==id);
    transactions = transactions.filter(t=>t.accountId!==id);
    saveAll(); renderAccounts(); refreshAll();
  }
  const edt = e.target.closest('button[data-action="edit-acc"]');
  if(edt){
    const id = edt.getAttribute('data-id');
    const acc = accounts.find(a=>a.id===id);
    const name = prompt("Нова назва рахунку:", acc.name);
    if(name) { acc.name = name; saveAll(); renderAccounts(); refreshAll(); }
  }
});

// CSV import
importCsv.addEventListener('change', (ev)=>{
  const f = ev.target.files[0]; if(!f) return;
  const r = new FileReader();
  r.onload = ()=> { parseCSV(r.result); ev.target.value = ''; };
  r.readAsText(f,'utf-8');
});
function parseCSV(txt){
  const lines = txt.split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
  const headers = lines.shift().split(',').map(h=>h.trim().toLowerCase());
  for(const ln of lines){
    const cols = ln.split(',').map(c=>c.trim());
    const obj = {}; headers.forEach((h,i)=>obj[h]=cols[i]||'');
    // expect date,account,category,desc,amount,currency
    const acc = accounts.find(a=>a.name.toLowerCase()=== (obj.account||'').toLowerCase());
    const accId = acc ? acc.id : (accounts[0] ? accounts[0].id : null);
    if(!accId) continue;
    const amt = parseFloat((obj.amount||'0').replace(/[^0-9.-]/g,'')) || 0;
    transactions.push({ id: genId(), date: obj.date||new Date().toISOString().slice(0,10), accountId: accId, category: obj.category||'Import', desc: obj.desc||'', amount: amt });
  }
  saveAll(); refreshAll();
}
// CSV export (transactions)
exportCsv.addEventListener('click', ()=>{
  const rows = [['date','account','category','desc','amount']];
  transactions.forEach(t=>{
    const acc = accounts.find(a=>a.id===t.accountId);
    rows.push([t.date, acc?acc.name:'', t.category, (t.desc||''), t.amount]);
  });
  const csv = rows.map(r=>r.map(cell=>`"${String(cell).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv],{type:'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'transactions.csv'; a.click(); URL.revokeObjectURL(url);
});

// ---------- Transactions ----------
const txBody = document.getElementById("txBody");
const txBodyAll = document.getElementById("txBodyAll");
const filterApply = document.getElementById("filterApply");
const filterFrom = document.getElementById("filterFrom");
const filterTo = document.getElementById("filterTo");

function renderRecentTx(){
  if(!txBody) return;
  txBody.innerHTML = "";
  const sorted = transactions.slice().sort((a,b)=> new Date(b.date) - new Date(a.date)).slice(0,25);
  for(const t of sorted){
    const acc = accounts.find(a=>a.id===t.accountId);
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${t.date}</td><td>${acc?acc.name:''}</td><td>${t.category||''}</td><td>${t.desc||''}</td>
      <td class="amount ${t.amount>=0?'pos':'neg'}">${Number(t.amount).toFixed(2)}</td>
      <td><button class="btn small" data-id="${t.id}" data-action="del-tx">🗑️</button></td>`;
    txBody.appendChild(tr);
  }
}
function renderAllTx(filter={}){
  if(!txBodyAll) return;
  txBodyAll.innerHTML = "";
  let list = transactions.slice().sort((a,b)=> new Date(b.date) - new Date(a.date));
  if(filter.accountId) list = list.filter(t=>t.accountId===filter.accountId);
  if(filter.from) list = list.filter(t=> new Date(t.date) >= new Date(filter.from));
  if(filter.to) list = list.filter(t=> new Date(t.date) <= new Date(filter.to));
  for(const t of list){
    const acc = accounts.find(a=>a.id===t.accountId);
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${t.date}</td><td>${acc?acc.name:''}</td><td>${t.category||''}</td><td>${t.desc||''}</td>
      <td class="amount ${t.amount>=0?'pos':'neg'}">${Number(t.amount).toFixed(2)}</td>
      <td><button class="btn small" data-id="${t.id}" data-action="del-tx">🗑️</button></td>`;
    txBodyAll.appendChild(tr);
  }
}
filterApply.addEventListener('click', ()=>{
  const accId = filterAccount.value || null;
  const from = filterFrom.value || null;
  const to = filterTo.value || null;
  renderAllTx({accountId:accId, from, to});
});

// delete tx delegated
document.addEventListener('click', (e)=>{
  const d = e.target.closest('button[data-action="del-tx"]');
  if(d){ const id = d.getAttribute('data-id'); transactions = transactions.filter(t=>t.id!==id); saveAll(); refreshAll(); }
});

// quick add modal
addTxQuick.addEventListener('click', ()=> openModal('income'));
function openModal(mode){
  modal.classList.remove('hidden'); modal.setAttribute('aria-hidden','false');
  document.getElementById('modalTitle').textContent = mode==='expense' ? 'Додати витрату' : 'Додати дохід';
  document.getElementById('mDate').value = new Date().toISOString().slice(0,10);
  document.getElementById('mAmount').value = mode==='expense' ? -10 : 100;
  // fill account select
  const mAccount = document.getElementById('mAccount'); mAccount.innerHTML = '';
  accounts.forEach(a=> { const opt = document.createElement('option'); opt.value=a.id; opt.textContent=a.name; mAccount.appendChild(opt); });
}
modalCancel.addEventListener('click', closeModal);
function closeModal(){ modal.classList.add('hidden'); modal.setAttribute('aria-hidden','true'); }

// modal save
modalForm.addEventListener('submit', (e)=>{
  e.preventDefault();
  const t = {
    id: genId(),
    date: document.getElementById('mDate').value,
    accountId: document.getElementById('mAccount').value,
    category: document.getElementById('mCategory').value,
    desc: document.getElementById('mDesc').value,
    amount: Number(document.getElementById('mAmount').value)
  };
  transactions.push(t);
  saveAll(); refreshAll(); closeModal();
});

// ---------- Summary & Charts ----------
const totalBalanceEl = document.getElementById('totalBalance');
const breakdownEl = document.getElementById('breakdown');
const monthIncomeEl = document.getElementById('monthIncome');
const monthExpenseEl = document.getElementById('monthExpense');
const lineCtx = document.getElementById('lineChart').getContext('2d');
const pieCtx = document.getElementById('pieChart').getContext('2d');

function computeBalances(){
  const totals = {}; accounts.forEach(a=>totals[a.id]=0);
  transactions.forEach(t=>{ if(t.accountId && totals[t.accountId]!==undefined) totals[t.accountId]+=Number(t.amount||0); });
  const total = Object.values(totals).reduce((s,v)=>s+v,0);
  return {totals, total};
}

function renderSummary(){
  const {totals,total} = computeBalances();
  totalBalanceEl.textContent = total.toFixed(2) + " UAH";
  breakdownEl.textContent = accounts.map(a=>`${a.name}: ${ (totals[a.id]||0).toFixed(2)} ${a.currency}`).join(' · ');
  // monthly
  const now = new Date().toISOString().slice(0,7);
  let inc=0, exp=0;
  transactions.forEach(t=>{ if(t.date && t.date.startsWith(now)){ if(t.amount>=0) inc+=t.amount; else exp+=t.amount; }});
  monthIncomeEl.textContent = inc.toFixed(2); monthExpenseEl.textContent = Math.abs(exp).toFixed(2);
}

function buildCharts(){
  // line: monthly net
  const monthly = {};
  transactions.forEach(t=>{
    const m = t.date ? t.date.slice(0,7) : 'unknown';
    monthly[m] = (monthly[m]||0) + Number(t.amount||0);
  });
  const labels = Object.keys(monthly).sort();
  const data = labels.map(l=>monthly[l]);

  if(lineChart) lineChart.destroy();
  lineChart = new Chart(lineCtx, { type:'bar', data:{labels, datasets:[{label:'Net', data, backgroundColor:data.map(v=>v>=0? '#10b981':'#fb7185')}] }, options:{animation:false, responsive:true} });

  // pie: categories
  const cats = {};
  transactions.forEach(t=>{ const c = t.category||'Other'; cats[c] = (cats[c]||0) + Math.abs(Number(t.amount||0)); });
  const catLabels = Object.keys(cats);
  const catData = catLabels.map(k=>cats[k]);
  if(pieChart) pieChart.destroy();
  pieChart = new Chart(pieCtx, { type:'doughnut', data:{ labels:catLabels, datasets:[{data:catData, backgroundColor:['#2563eb','#10b981','#f97316','#e11d48','#7c3aed']}] }, options:{animation:false,responsive:true,plugins:{legend:{position:'bottom'}}} });
}

function rebuildCharts(){ if(lineChart||pieChart) buildCharts(); }

// ---------- Refresh ALL ----------
function refreshAll(){ renderSummary(); renderRecentTx(); renderAccounts(); renderAllTx(); buildCharts(); saveAll(); }
function initApp(){ renderAccounts(); refreshAll(); renderAllTx(); }

// ---------- delete/edit handled earlier (delegation) ----------

// ---------- Search (live) ----------
$('#search').addEventListener('input', (e)=>{
  const q = e.target.value.toLowerCase();
  document.querySelectorAll('#txBody tr').forEach(tr=> tr.style.display = tr.textContent.toLowerCase().includes(q) ? '' : 'none');
});

// ---------- Clear data ----------
$('#clearData').addEventListener('click', ()=> {
  if(confirm('Очистити всі локальні дані?')) {
    localStorage.removeItem(KEY_ACCOUNTS); localStorage.removeItem(KEY_TX); localStorage.removeItem(KEY_PIN); localStorage.removeItem(KEY_SESSION);
    location.reload();
  }
});

// ---------- Init on load ----------
restoreTheme();
renderAccounts();
refreshAll();
if(localStorage.getItem(KEY_SESSION) === 'true'){ overlay.style.display='none'; }

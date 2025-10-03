/* TCP Finance — front-end logic
   - Auth (password hashed in localStorage via SubtleCrypto)
   - Accounts & Transactions stored in localStorage
   - Charts (Chart.js)
   - Theme persistence
*/

// ----------------------- Utilities -----------------------
const $ = (sel)=>document.querySelector(sel);
const $$ = (sel)=>document.querySelectorAll(sel);

function uid(){ return Date.now() + Math.floor(Math.random()*999); }

async function hashString(str){
  const enc = new TextEncoder().encode(str);
  const hash = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(hash)).map(b=>b.toString(16).padStart(2,'0')).join('');
}

// ----------------------- Storage keys -----------------------
const KEY_PASS = "tcp_pass_hash_v1";
const KEY_SESSION = "tcp_session_v1";
const KEY_ACCOUNTS = "tcp_accounts_v1";
const KEY_TX = "tcp_tx_v1";
const KEY_THEME = "tcp_theme_v1";

// ----------------------- Initial data -----------------------
const DEFAULT_ACCOUNTS = [
  { id: uid(), name: "ПУМБ (UAH)" },
  { id: uid(), name: "Bybit (UAH)" },
  { id: uid(), name: "Monobank (UAH)" },
];

// load or init
let accounts = JSON.parse(localStorage.getItem(KEY_ACCOUNTS)) || DEFAULT_ACCOUNTS.slice();
let transactions = JSON.parse(localStorage.getItem(KEY_TX)) || [];

// ----------------------- Auth UI -----------------------
const overlay = $("#auth-overlay");
const setupSection = $("#auth-setup");
const loginSection = $("#auth-login");
const setupPass = $("#setup-pass");
const setupSave = $("#setup-save");
const loginPass = $("#login-pass");
const loginDo = $("#login-do");
const authError = $("#auth-error");

// first-run / login flow
(async function authInit(){
  const stored = localStorage.getItem(KEY_PASS);
  const session = localStorage.getItem(KEY_SESSION);
  // if logged in session -> hide overlay
  if(session === "true"){
    overlay.style.display = "none";
    initApp();
    return;
  }
  // else if no password stored -> show setup
  if(!stored){
    setupSection.classList.remove("hidden");
    loginSection.classList.add("hidden");
  } else {
    setupSection.classList.add("hidden");
    loginSection.classList.remove("hidden");
  }
  overlay.style.display = "flex";
})();

setupSave.addEventListener("click", async ()=>{
  const p = setupPass.value.trim();
  if(!p || p.length < 4){ alert("Пароль мінімум 4 символи"); return; }
  const h = await hashString(p);
  localStorage.setItem(KEY_PASS, h);
  setupPass.value = "";
  // show login
  setupSection.classList.add("hidden");
  loginSection.classList.remove("hidden");
  alert("Пароль збережено локально. Введіть його для входу.");
});

loginDo.addEventListener("click", async ()=>{
  const p = loginPass.value.trim();
  if(!p){ authError.textContent = "Введіть пароль"; return; }
  const h = await hashString(p);
  const stored = localStorage.getItem(KEY_PASS);
  if(h === stored){
    localStorage.setItem(KEY_SESSION, "true");
    overlay.style.display = "none";
    loginPass.value = "";
    authError.textContent = "";
    initApp();
  } else {
    authError.textContent = "Невірний пароль";
  }
});

// ----------------------- Elements -----------------------
const themeToggle = $("#theme-toggle");
const btnLogout = $("#btn-logout");
const navBtns = $$(".nav-btn");
const views = $$(".view");
const btnAddIncome = $("#btn-add-income");
const btnAddExpense = $("#btn-add-expense");
const modal = $("#modal");
const modalForm = $("#modal-form");
const modalCancel = $("#modal-cancel");

const txTable = $("#tx-table tbody");
const txTable2 = $("#tx-table-2 tbody");
const txForm = $("#tx-form");
const txAccountSelect = $("#tx-account");
const mAccountSelect = $("#m-account");

const accountsListEl = $("#accounts-list");
const newAccountInput = $("#new-account-name");
const btnAddAccount = $("#btn-add-account");
const importCsv = $("#import-csv");

const totalBalanceEl = $("#total-balance");
const breakdownEl = $("#breakdown");
const monthIncomeEl = $("#month-income");
const monthExpenseEl = $("#month-expense");

const chartLineEl = document.getElementById("chart-line");
const chartPieEl = document.getElementById("chart-pie");

let lineChart = null, pieChart = null;

// ----------------------- Helpers -----------------------
function persist(){
  localStorage.setItem(KEY_ACCOUNTS, JSON.stringify(accounts));
  localStorage.setItem(KEY_TX, JSON.stringify(transactions));
}

function formatMoney(v){
  const s = Number(v).toFixed(2);
  return s + " UAH";
}

function renderAccountsUI(){
  // selects
  txAccountSelect.innerHTML = "";
  mAccountSelect.innerHTML = "";
  accounts.forEach(a=>{
    const opt = document.createElement("option"); opt.value = a.id; opt.textContent = a.name;
    txAccountSelect.appendChild(opt);
    const opt2 = opt.cloneNode(true);
    mAccountSelect.appendChild(opt2);
  });
  // list
  accountsListEl.innerHTML = "";
  accounts.forEach(a=>{
    const li = document.createElement("li");
    li.innerHTML = `<span>${a.name}</span><div><button class="btn small" data-id="${a.id}" data-action="remove-acc">Видалити</button></div>`;
    accountsListEl.appendChild(li);
  });
}

function computeTotals(){
  const totals = {};
  accounts.forEach(a=> totals[a.id] = 0);
  transactions.forEach(t=>{
    if(t.accountId && totals[t.accountId] !== undefined){
      totals[t.accountId] += Number(t.amount||0);
    }
  });
  const total = Object.values(totals).reduce((s,v)=>s+v,0);
  return { totals, total };
}

function renderSummary(){
  const { totals, total } = computeTotals();
  totalBalanceEl.textContent = total.toFixed(2) + " UAH";
  // breakdown small
  breakdownEl.innerHTML = accounts.map(a=> `${a.name}: ${totals[a.id].toFixed(2)} UAH`).join(" · ");
  // month metrics
  const nowM = new Date().toISOString().slice(0,7);
  let inc=0, exp=0;
  transactions.forEach(t=>{
    if(t.date && t.date.startsWith(nowM)){
      if(t.amount>=0) inc+=Number(t.amount);
      else exp+=Number(t.amount);
    }
  });
  monthIncomeEl.textContent = inc.toFixed(2);
  monthExpenseEl.textContent = Math.abs(exp).toFixed(2);
}

function renderTables(){
  function fill(bodyEl){
    bodyEl.innerHTML = "";
    const sorted = transactions.slice().sort((a,b)=> new Date(b.date) - new Date(a.date));
    for(const t of sorted){
      const acc = accounts.find(a=>a.id===t.accountId);
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${t.date||""}</td><td>${acc?acc.name:"—"}</td><td>${t.category||""}</td><td>${t.desc||""}</td><td class="amount" style="color:${t.amount<0? '#fb7185':'#34d399'}">${Number(t.amount).toFixed(2)}</td><td><button class="btn small" data-id="${t.id}" data-action="del-tx">🗑️</button></td>`;
      bodyEl.appendChild(tr);
    }
  }
  if(txTable) fill(txTable);
  if(txTable2) fill(txTable2);
  // attach delete handlers (delegated below)
}

function buildCharts(){
  // monthly aggregation
  const monthly = {};
  transactions.forEach(t=>{
    const m = t.date ? t.date.slice(0,7) : "unknown";
    monthly[m] = (monthly[m]||0) + Number(t.amount||0);
  });
  const labels = Object.keys(monthly).sort();
  const dataLine = labels.map(l=> monthly[l]);

  // categories
  const cats = {};
  transactions.forEach(t=>{
    const c = t.category || "Other";
    cats[c] = (cats[c]||0) + Math.abs(Number(t.amount||0));
  });

  // line
  if(lineChart) lineChart.destroy();
  lineChart = new Chart(chartLineEl.getContext('2d'), {
    type: 'bar',
    data: { labels, datasets:[{ label:'Net', data:dataLine, backgroundColor: dataLine.map(v=> v>=0? '#34d399':'#fb7185') }] },
    options:{ responsive:true, animation:false, plugins:{legend:{display:false}}, scales:{ x:{ticks:{color:getTextColor()}}, y:{ticks:{color:getTextColor()}} } }
  });

  // pie
  if(pieChart) pieChart.destroy();
  pieChart = new Chart(chartPieEl.getContext('2d'), {
    type:'doughnut',
    data:{ labels: Object.keys(cats), datasets:[{ data:Object.values(cats), backgroundColor:['#2563eb','#10b981','#f97316','#e11d48','#7c3aed'] }] },
    options:{ responsive:true, animation:false, plugins:{legend:{position:'bottom', labels:{color:getTextColor()}}} }
  });
}

function getTextColor(){ return document.body.classList.contains('theme-light') ? '#0b1220' : '#e6eef3'; }

// ----------------------- Actions -----------------------
function refreshAll(){
  renderAccountsUI();
  renderSummary();
  renderTables();
  buildCharts();
  persist();
}

// navigation
navBtns.forEach(b=>{
  b.addEventListener('click', ()=>{
    navBtns.forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
    const view = b.dataset.view;
    views.forEach(v=>v.classList.add('hidden'));
    document.getElementById('view-' + view).classList.remove('hidden');
  });
});

// logout
btnLogout.addEventListener('click', ()=>{
  localStorage.removeItem(KEY_SESSION);
  location.reload();
});

// open modal for quick add
btnAddIncome.addEventListener('click', ()=> openModal('income'));
btnAddExpense.addEventListener('click', ()=> openModal('expense'));

function openModal(mode){
  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden','false');
  document.getElementById('modal-title').textContent = mode==='income' ? 'Додати дохід' : 'Додати витрату';
  document.getElementById('m-date').value = new Date().toISOString().slice(0,10);
  document.getElementById('m-amount').value = mode==='income' ? 100 : -10;
  document.getElementById('m-category').value = mode==='income' ? 'Salary' : 'Expense';
}

modalCancel.addEventListener('click', closeModal);
function closeModal(){ modal.classList.add('hidden'); modal.setAttribute('aria-hidden','true'); }

// modal form submit
modalForm.addEventListener('submit', (e)=>{
  e.preventDefault();
  const t = {
    id: uid(),
    date: document.getElementById('m-date').value,
    accountId: document.getElementById('m-account').value,
    category: document.getElementById('m-category').value,
    desc: document.getElementById('m-desc').value,
    amount: Number(document.getElementById('m-amount').value)
  };
  transactions.push(t);
  persist(); refreshAll(); closeModal();
});

// tx-form (transactions view)
if(txForm){
  txForm.addEventListener('submit', (e)=>{
    e.preventDefault();
    const t = {
      id: uid(),
      date: document.getElementById('tx-date').value,
      accountId: document.getElementById('tx-account').value,
      category: document.getElementById('tx-category').value,
      desc: document.getElementById('tx-desc').value,
      amount: Number(document.getElementById('tx-amount').value)
    };
    transactions.push(t);
    txForm.reset();
    persist(); refreshAll();
    // switch to dashboard
    document.querySelector('.nav-btn[data-view="dashboard"]').click();
  });
}

// delete transaction (delegated)
document.addEventListener('click', (e)=>{
  const del = e.target.closest('button[data-action="del-tx"]');
  if(del){
    const id = del.getAttribute('data-id');
    transactions = transactions.filter(t=>String(t.id)!==String(id));
    persist(); refreshAll();
  }
  const remAcc = e.target.closest('button[data-action="remove-acc"]');
  if(remAcc){
    const id = remAcc.getAttribute('data-id');
    if(!confirm('Видалити рахунок і всі пов\'язані транзакції?')) return;
    accounts = accounts.filter(a=>String(a.id)!==String(id));
    transactions = transactions.filter(t=> t.accountId !== id);
    persist(); refreshAll();
  }
});

// add account
btnAddAccount.addEventListener('click', ()=>{
  const name = newAccountInput.value.trim();
  if(!name) return alert('Введіть назву рахунку');
  accounts.push({ id: uid(), name });
  newAccountInput.value = "";
  persist(); refreshAll();
});

// import CSV (simple parser: expects columns date,account,category,desc,amount)
importCsv.addEventListener('change', (ev)=>{
  const file = ev.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = ()=> {
    const txt = reader.result;
    parseCSVandAdd(txt);
    ev.target.value = '';
  };
  reader.readAsText(file, 'utf-8');
});
function parseCSVandAdd(txt){
  const lines = txt.split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
  const headers = lines.shift().split(',').map(h=>h.trim().toLowerCase());
  for(const line of lines){
    const cols = line.split(',').map(c=>c.trim());
    const obj = {};
    headers.forEach((h,i)=> obj[h]=cols[i]||'');
    // try find account id by name
    const acc = accounts.find(a=> a.name.toLowerCase() === (obj.account||'').toLowerCase());
    const accId = acc ? acc.id : (accounts[0] ? accounts[0].id : uid());
    const amt = parseFloat((obj.amount||'0').replace(/[^0-9.\-]/g,''));
    transactions.push({ id: uid(), date: obj.date || new Date().toISOString().slice(0,10), accountId: accId, category: obj.category||'Import', desc: obj.desc||'', amount: amt });
  }
  persist(); refreshAll();
}

// clear local data
$("#btn-clear").addEventListener('click', ()=>{
  if(confirm('Очистити всі локальні дані (рахунки, транзакції, налаштування)?')) {
    localStorage.removeItem(KEY_ACCOUNTS); localStorage.removeItem(KEY_TX); localStorage.removeItem(KEY_THEME);
    location.reload();
  }
});

// theme toggle
themeToggle.addEventListener('change', ()=>{
  const light = themeToggle.checked;
  document.body.classList.toggle('theme-light', light);
  localStorage.setItem(KEY_THEME, light ? 'light' : 'dark');
  // rebuild charts colors
  if(lineChart || pieChart) buildCharts();
});

// restore theme & session
(function restore(){
  const t = localStorage.getItem(KEY_THEME);
  if(t === 'light'){ document.body.classList.add('theme-light'); themeToggle.checked = true; }
  // render initial UI on successful auth only
})();

// init app after auth
function initApp(){
  // show default view
  document.querySelector('.nav-btn[data-view="dashboard"]').click();
  renderAccountsUI();
  refreshAll();
}

// search
$("#search").addEventListener('input', (e)=>{
  const q = e.target.value.toLowerCase();
  [...document.querySelectorAll('#tx-table tbody tr')].forEach(r=>{
    r.style.display = r.textContent.toLowerCase().includes(q) ? '' : 'none';
  });
});

// keyboard: Esc closes modal
document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') closeModal(); });

// initial call if session already set (authInit handled earlier triggers initApp)
if(localStorage.getItem(KEY_SESSION) === 'true'){ overlay.style.display='none'; initApp(); }

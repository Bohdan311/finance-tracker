// Lightweight interactive logic for Aris Finance Dashboard
// Uses localStorage to persist transactions

const STORAGE_KEY = "aris_finance_v1";

// DOM
const totalBalanceEl = document.getElementById("total-balance");
const monthIncomeEl = document.getElementById("month-income");
const monthExpenseEl = document.getElementById("month-expense");
const txTableBody = document.querySelector("#tx-table tbody");
const txTable2Body = document.querySelector("#tx-table-2 tbody");

const modal = document.getElementById("modal");
const modalForm = document.getElementById("modal-form");
const modalCancel = document.getElementById("modal-cancel");

// initial sample data (used only if no storage)
const SAMPLE = [
  { id: 1, date: "2025-09-01", account: "ПУМБ (UAH)", category: "Salary", desc: "Зарплата", amount: 2000 },
  { id: 2, date: "2025-09-03", account: "ПУМБ (UAH)", category: "Food", desc: "Кава", amount: -3.5 },
  { id: 3, date: "2025-09-10", account: "Bybit (UAH)", category: "Trade", desc: "Продаж", amount: 150.75 },
];

// state
let transactions = loadTx();
let lineChart = null;
let pieChart = null;

// helpers
function loadTx(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SAMPLE));
      return SAMPLE.slice();
    }
    return JSON.parse(raw);
  }catch(e){
    console.error("loadTx error", e);
    return SAMPLE.slice();
  }
}
function saveTx(){
  try{
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
  }catch(e){ console.error(e) }
}

function calcTotals(){
  const total = transactions.reduce((s,t)=>s + Number(t.amount||0), 0);
  const nowMonth = new Date().toISOString().slice(0,7);
  let monthIncome = 0, monthExpense = 0;
  transactions.forEach(t=>{
    if(t.date && t.date.startsWith(nowMonth)){
      if (Number(t.amount) >= 0) monthIncome += Number(t.amount);
      else monthExpense += Number(t.amount);
    }
  });
  return { total, monthIncome, monthExpense };
}

function renderSummary(){
  const { total, monthIncome, monthExpense } = calcTotals();
  totalBalanceEl.textContent = total.toFixed(2) + " UAH";
  monthIncomeEl.textContent = (monthIncome).toFixed(2);
  monthExpenseEl.textContent = Math.abs(monthExpense).toFixed(2);
}

function renderTable(){
  // shared renderer for both tables
  function fillBody(body){
    body.innerHTML = "";
    const sorted = transactions.slice().sort((a,b)=> new Date(b.date) - new Date(a.date));
    for(const t of sorted){
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${t.date || ""}</td>
        <td>${escapeHtml(t.account||"")}</td>
        <td>${escapeHtml(t.category||"")}</td>
        <td>${escapeHtml(t.desc||"")}</td>
        <td style="color:${t.amount<0? '#fb7185':'#34d399'}">${Number(t.amount).toFixed(2)}</td>
        <td><button class="btn small" data-id="${t.id}">Видалити</button></td>
      `;
      body.appendChild(tr);
    }
  }
  if(txTableBody) fillBody(txTableBody);
  if(txTable2Body) fillBody(txTable2Body);
  // attach delete handlers
  document.querySelectorAll("button[data-id]").forEach(btn=>{
    btn.addEventListener("click", (e)=>{
      const id = Number(btn.getAttribute("data-id"));
      deleteTx(id);
    });
  });
}

function escapeHtml(s){ return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }

// charts
function buildCharts(){
  // prepare monthly aggregation
  const monthly = {};
  transactions.forEach(t=>{
    const m = (t.date && t.date.slice(0,7)) || "unknown";
    monthly[m] = (monthly[m] || 0) + Number(t.amount||0);
  });
  const labels = Object.keys(monthly).sort();
  const dataLine = labels.map(l => monthly[l]);

  // pie: categories abs sum
  const cats = {};
  transactions.forEach(t=>{
    const c = t.category || "Other";
    cats[c] = (cats[c] || 0) + Number(t.amount||0);
  });
  const catLabels = Object.keys(cats);
  const catData = catLabels.map(k=> Math.abs(cats[k]));

  // line chart
  const ctxLine = document.getElementById("chart-line").getContext("2d");
  if(lineChart) lineChart.destroy();
  lineChart = new Chart(ctxLine, {
    type: 'bar',
    data: { labels, datasets: [{ label: 'Net (UAH)', data: dataLine, backgroundColor: dataLine.map(v=>v>=0? '#34d399':'#fb7185') }] },
    options: {
      animation: false,
      responsive:true,
      scales:{ x:{ ticks:{ color: getCSSVar('textColor') } }, y:{ ticks:{ color: getCSSVar('textColor') } } },
      plugins:{ legend:{ display:false } }
    }
  });

  // pie chart
  const ctxPie = document.getElementById("chart-pie").getContext("2d");
  if(pieChart) pieChart.destroy();
  pieChart = new Chart(ctxPie, {
    type: 'doughnut',
    data: { labels: catLabels, datasets:[{ data: catData, backgroundColor: ['#2563eb','#10b981','#f97316','#e11d48','#7c3aed'] }] },
    options: { animation: false, responsive:true, plugins:{ legend:{ position:'bottom', labels:{ color: getCSSVar('textColor') } } } }
  });
}

function getCSSVar(name){
  // read from computed style: fallback colors for chart ticks
  const body = document.body;
  if(body.dataset.theme === "light") return "#0b1220";
  return "#e6eef3";
}

// actions
function openModal(mode){
  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden","false");
  document.getElementById("m-date").value = new Date().toISOString().slice(0,10);
  document.getElementById("m-account").value = "ПУМБ (UAH)";
  document.getElementById("m-category").value = mode === "income" ? "Salary" : "Expense";
  document.getElementById("m-amount").value = mode === "income" ? 100 : -10;
  document.getElementById("modal-title").textContent = mode === "income" ? "Додати дохід" : "Додати витрату";
}

function closeModal(){
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden","true");
}

// add tx
function addTx(tx){
  tx.id = Date.now();
  transactions.push(tx);
  saveTx();
  refreshAll();
}

function deleteTx(id){
  transactions = transactions.filter(t=>t.id !== id);
  saveTx();
  refreshAll();
}

function clearData(){
  if(confirm("Очистити всі локальні дані? Це незворотно.")){
    transactions = [];
    saveTx();
    refreshAll();
  }
}

// refresh UI
function refreshAll(){
  renderSummary();
  renderTable();
  buildCharts();
}

// form submission (transactions page)
const txForm = document.getElementById("tx-form");
if(txForm){
  txForm.addEventListener("submit",(e)=>{
    e.preventDefault();
    const t = {
      id: Date.now(),
      date: document.getElementById("tx-date").value,
      account: document.getElementById("tx-account").value,
      category: document.getElementById("tx-category").value,
      desc: document.getElementById("tx-desc").value,
      amount: Number(document.getElementById("tx-amount").value)
    };
    addTx(t);
    txForm.reset();
  });
}

// modal form
if(modalForm){
  modalForm.addEventListener("submit",(e)=>{
    e.preventDefault();
    const t = {
      id: Date.now(),
      date: document.getElementById("m-date").value,
      account: document.getElementById("m-account").value,
      category: document.getElementById("m-category").value,
      desc: document.getElementById("m-desc").value,
      amount: Number(document.getElementById("m-amount").value)
    };
    addTx(t);
    closeModal();
  });
}
if(modalCancel) modalCancel.addEventListener("click", closeModal);

// topbar buttons
document.getElementById("btn-add-income").addEventListener("click", ()=> openModal("income"));
document.getElementById("btn-add-expense").addEventListener("click", ()=> openModal("expense"));

// clear local data
document.getElementById("btn-clear").addEventListener("click", clearData);

// Theme toggle
const themeToggle = document.getElementById("theme-toggle-input");
function setTheme(theme){
  document.body.dataset.theme = theme;
  // store
  try{ localStorage.setItem("aris_theme", theme); }catch(e){}
  // rebuild charts colors
  if(lineChart || pieChart) buildCharts();
}
themeToggle.addEventListener("change", ()=>{
  setTheme(themeToggle.checked ? "light" : "dark");
});
// restore theme
(function(){
  const t = localStorage.getItem("aris_theme") || "dark";
  document.body.dataset.theme = t;
  themeToggle.checked = t === "light";
})();

// navigation
document.querySelectorAll(".nav-btn").forEach(b=>{
  b.addEventListener("click", ()=>{
    document.querySelectorAll(".nav-btn").forEach(x=>x.classList.remove("active"));
    b.classList.add("active");
    const view = b.dataset.view;
    document.querySelectorAll(".view").forEach(v=>v.classList.add("hidden"));
    document.getElementById("view-" + view).classList.remove("hidden");
  });
});
// set default view
document.querySelector('.nav-btn[data-view="dashboard"]').click();

// delete buttons inside tables handled in renderTable (delegated earlier)

// init
refreshAll();

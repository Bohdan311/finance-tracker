// Simple client-side finance tracker prototype
const storageKey = "aris_transactions_v1";

// sample data if none
const sample = [
  {id:1,date:'2025-09-01',account:'ПУМБ (UAH)',category:'Salary',desc:'September salary',amount:2000},
  {id:2,date:'2025-09-03',account:'ПУМБ (UAH)',category:'Food',desc:'McDonalds',amount:-12.5},
  {id:3,date:'2025-09-10',account:'Bybit (UAH)',category:'Sell BTC',desc:'Partial sell',amount:150.75},
  {id:4,date:'2025-09-15',account:'ПУМБ кешбек',category:'Cashback',desc:'Cashback reward',amount:2.5},
];

function readTx(){
  const raw = localStorage.getItem(storageKey);
  if(!raw) {
    localStorage.setItem(storageKey, JSON.stringify(sample));
    return sample.slice();
  }
  try{return JSON.parse(raw);}catch(e){return []}
}

function saveTx(arr){ localStorage.setItem(storageKey, JSON.stringify(arr)); }

let transactions = readTx();

// DOM refs
const totalBalanceEl = document.getElementById('total-balance');
const todayChangeEl = document.getElementById('today-change');
const monthSumEl = document.getElementById('month-sum');
const txTableBody = document.querySelector('#tx-table tbody');
const modal = document.getElementById('modal');
const txForm = document.getElementById('tx-form');
const modalTitle = document.getElementById('modal-title');

// charts
let lineChart, pieChart;

function calcSummary(){
  const balance = transactions.reduce((s,t)=>s + Number(t.amount||0),0);
  totalBalanceEl.textContent = balance.toFixed(2) + ' UAH';
  // today and month simple metrics
  const today = new Date().toISOString().slice(0,10);
  const todaySum = transactions.filter(t=>t.date===today).reduce((s,t)=>s+Number(t.amount||0),0);
  todayChangeEl.textContent = (todaySum>=0?'+':'')+todaySum.toFixed(2);
  const thisMonth = new Date().toISOString().slice(0,7);
  const monthSum = transactions.filter(t=>t.date && t.date.startsWith(thisMonth)).reduce((s,t)=>s+Number(t.amount||0),0);
  monthSumEl.textContent = (monthSum>=0?'+':'')+monthSum.toFixed(2);
}

function renderTable(){
  txTableBody.innerHTML='';
  const sorted = transactions.slice().sort((a,b)=> new Date(b.date) - new Date(a.date));
  for(const t of sorted){
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${t.date}</td><td>${t.account||''}</td><td>${t.category||''}</td><td>${t.desc||''}</td><td style="color:${t.amount<0? '#fb7185':'#34d399'}">${t.amount.toFixed(2)}</td>`;
    txTableBody.appendChild(tr);
  }
}

function prepareCharts(){
  // monthly income/expense
  const byMonth = {};
  for(const t of transactions){
    const m = t.date ? t.date.slice(0,7) : 'unknown';
    if(!byMonth[m]) byMonth[m]=0;
    byMonth[m] += Number(t.amount||0);
  }
  const labels = Object.keys(byMonth).sort();
  const data = labels.map(l=> byMonth[l]);

  const ctx = document.getElementById('chart-line').getContext('2d');
  if(lineChart) lineChart.destroy();
  lineChart = new Chart(ctx, {
    type:'bar',
    data:{labels, datasets:[{label:'Net (UAH)', data, backgroundColor: data.map(v=> v>=0?'#34d399':'#fb7185')}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}}}
  });

  // pie by category (expenses only)
  const cat = {};
  for(const t of transactions){
    const c = t.category || 'Other';
    if(!cat[c]) cat[c]=0;
    cat[c] += Number(t.amount||0);
  }
  const catLabels = Object.keys(cat);
  const catData = catLabels.map(k=> Math.abs(cat[k]));
  const ctx2 = document.getElementById('chart-pie').getContext('2d');
  if(pieChart) pieChart.destroy();
  pieChart = new Chart(ctx2, {
    type:'doughnut',
    data:{labels:catLabels, datasets:[{data:catData, backgroundColor:[ '#2563eb','#10b981','#f97316','#e11d48','#7c3aed' ]}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{color:'#e6eef3'}}}}
  });
}

function refreshAll(){
  calcSummary();
  renderTable();
  prepareCharts();
  saveTx(transactions);
}

// modal handlers
function openModal(mode){
  modal.classList.remove('hidden');
  modalTitle.textContent = mode === 'income' ? 'Add Income' : 'Add Expense';
  // preset date today
  document.getElementById('tx-date').value = new Date().toISOString().slice(0,10);
  document.getElementById('tx-amount').value = mode==='income'?100: -10;
  document.getElementById('tx-category').value = mode==='income'? 'Salary':'Expense';
}

document.getElementById('btn-add-income').addEventListener('click', ()=> openModal('income'));
document.getElementById('btn-add-expense').addEventListener('click', ()=> openModal('expense'));
document.getElementById('modal-cancel').addEventListener('click', ()=> modal.classList.add('hidden'));

txForm.addEventListener('submit', (e)=>{
  e.preventDefault();
  const t = {
    id: Date.now(),
    date: document.getElementById('tx-date').value,
    account: document.getElementById('tx-account').value,
    category: document.getElementById('tx-category').value,
    desc: document.getElementById('tx-desc').value,
    amount: Number(document.getElementById('tx-amount').value)
  };
  transactions.push(t);
  modal.classList.add('hidden');
  refreshAll();
});

// initialize
refreshAll();

// search filter
document.getElementById('search').addEventListener('input', (e)=>{
  const q = e.target.value.toLowerCase();
  const rows = document.querySelectorAll('#tx-table tbody tr');
  rows.forEach(r=>{
    r.style.display = r.textContent.toLowerCase().includes(q) ? '' : 'none';
  });
});

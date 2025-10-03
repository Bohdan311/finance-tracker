// --- Логін ---
function login() {
  const user = document.getElementById("username").value;
  const pass = document.getElementById("password").value;

  if (user === "admin" && pass === "1234") {
    document.getElementById("login-page").style.display = "none";
    document.getElementById("dashboard").style.display = "block";
    loadAccounts();
    loadTransactions();
    updateChart();
  } else {
    document.getElementById("login-error").innerText = "❌ Невірний логін або пароль!";
  }
}

function logout() {
  document.getElementById("dashboard").style.display = "none";
  document.getElementById("login-page").style.display = "block";
}

// --- Рахунки ---
let accounts = JSON.parse(localStorage.getItem("accounts")) || [];
let transactions = JSON.parse(localStorage.getItem("transactions")) || [];

function loadAccounts() {
  const list = document.getElementById("accounts-list");
  list.innerHTML = "";
  accounts.forEach((acc, index) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <span>${acc.name} — ${acc.balance} ${acc.currency}</span>
      <button onclick="deleteAccount(${index})">🗑</button>
    `;
    list.appendChild(li);
  });
  saveAccounts();
}

function addAccount() {
  const name = prompt("Назва рахунку:");
  const balance = parseFloat(prompt("Початковий баланс:")) || 0;
  const currency = prompt("Валюта (USD, UAH, EUR):") || "USD";

  if (name) {
    accounts.push({ name, balance, currency });
    loadAccounts();
  }
}

function deleteAccount(index) {
  accounts.splice(index, 1);
  loadAccounts();
}

function saveAccounts() {
  localStorage.setItem("accounts", JSON.stringify(accounts));
}

// --- Операції ---
function loadTransactions() {
  const list = document.getElementById("transactions-list");
  list.innerHTML = "";
  transactions.forEach((tr, index) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <span>${tr.type} | ${tr.account} | ${tr.amount} ${tr.currency} | ${tr.category}</span>
      <button onclick="deleteTransaction(${index})">🗑</button>
    `;
    list.appendChild(li);
  });
  saveTransactions();
}

function addTransaction() {
  if (accounts.length === 0) {
    alert("Спочатку додайте рахунок!");
    return;
  }

  const type = prompt("Тип (Дохід / Витрата):", "Дохід");
  const accountIndex = parseInt(prompt("Оберіть рахунок (0-" + (accounts.length - 1) + "):")) || 0;
  const amount = parseFloat(prompt("Сума:")) || 0;
  const category = prompt("Категорія:", "Зарплата");
  const currency = accounts[accountIndex].currency;

  if (type.toLowerCase() === "дохід") {
    accounts[accountIndex].balance += amount;
  } else {
    accounts[accountIndex].balance -= amount;
  }

  transactions.push({ type, account: accounts[accountIndex].name, amount, currency, category });
  loadAccounts();
  loadTransactions();
  updateChart();
}

function deleteTransaction(index) {
  transactions.splice(index, 1);
  loadTransactions();
}

function saveTransactions() {
  localStorage.setItem("transactions", JSON.stringify(transactions));
}

// --- Графік ---
function updateChart() {
  const income = transactions.filter(t => t.type.toLowerCase() === "дохід")
    .reduce((sum, t) => sum + t.amount, 0);

  const expense = transactions.filter(t => t.type.toLowerCase() === "витрата")
    .reduce((sum, t) => sum + t.amount, 0);

  const ctx = document.getElementById("statsChart").getContext("2d");
  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Дохід', 'Витрати'],
      datasets: [{
        data: [income, expense],
        backgroundColor: ['#28a745', '#dc3545']
      }]
    }
  });
}

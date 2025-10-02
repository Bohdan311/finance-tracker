// Збережені дані
let transactions = JSON.parse(localStorage.getItem("transactions")) || [];
let isLoggedIn = localStorage.getItem("isLoggedIn") || false;

// DOM
const loginScreen = document.getElementById("login-screen");
const dashboard = document.getElementById("dashboard");
const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");
const incomeBtn = document.getElementById("income-btn");
const expenseBtn = document.getElementById("expense-btn");
const transactionsList = document.getElementById("transactions-list");
const totalBalance = document.getElementById("total-balance");
const themeToggle = document.getElementById("theme-toggle");

// Логін
loginBtn.addEventListener("click", () => {
  const user = document.getElementById("login-username").value;
  const pass = document.getElementById("login-password").value;
  if (user === "admin" && pass === "1234") {
    localStorage.setItem("isLoggedIn", true);
    loginScreen.classList.add("hidden");
    dashboard.classList.remove("hidden");
    render();
  } else {
    alert("Невірний логін або пароль!");
  }
});

// Логаут
logoutBtn.addEventListener("click", () => {
  localStorage.removeItem("isLoggedIn");
  dashboard.classList.add("hidden");
  loginScreen.classList.remove("hidden");
});

// Додавання транзакцій
function addTransaction(type) {
  const amount = parseFloat(prompt("Введіть суму:"));
  const desc = prompt("Опис:");
  const account = prompt("Рахунок (ПУМБ / Bybit / Монобанк):");
  if (isNaN(amount)) return;

  const transaction = {
    date: new Date().toISOString().split("T")[0],
    account,
    category: type === "income" ? "Дохід" : "Витрати",
    desc,
    amount: type === "income" ? amount : -amount
  };

  transactions.push(transaction);
  localStorage.setItem("transactions", JSON.stringify(transactions));
  render();
}

incomeBtn.addEventListener("click", () => addTransaction("income"));
expenseBtn.addEventListener("click", () => addTransaction("expense"));

// Рендер таблиці і балансу
function render() {
  let balance = 0;
  transactionsList.innerHTML = "";
  transactions.forEach(t => {
    balance += t.amount;
    const row = `<tr>
      <td>${t.date}</td>
      <td>${t.account}</td>
      <td>${t.category}</td>
      <td>${t.desc}</td>
      <td class="${t.amount >= 0 ? "positive" : "negative"}">${t.amount.toFixed(2)}</td>
    </tr>`;
    transactionsList.innerHTML += row;
  });
  totalBalance.textContent = balance.toFixed(2) + " UAH";
  updateCharts();
}

// Графіки
let balanceChart = new Chart(document.getElementById("balanceChart"), {
  type: "line",
  data: { labels: [], datasets: [{ label: "Баланс", data: [], borderColor: "#007bff" }] },
});

let categoryChart = new Chart(document.getElementById("categoryChart"), {
  type: "doughnut",
  data: { labels: [], datasets: [{ data: [], backgroundColor: ["#28a745", "#dc3545", "#ffc107"] }] },
});

function updateCharts() {
  balanceChart.data.labels = transactions.map(t => t.date);
  balanceChart.data.datasets[0].data = transactions.map((_, i) =>
    transactions.slice(0, i + 1).reduce((sum, t) => sum + t.amount, 0)
  );
  balanceChart.update();

  let categories = {};
  transactions.forEach(t => {
    categories[t.category] = (categories[t.category] || 0) + Math.abs(t.amount);
  });

  categoryChart.data.labels = Object.keys(categories);
  categoryChart.data.datasets[0].data = Object.values(categories);
  categoryChart.update();
}

// Тема
themeToggle.addEventListener("change", () => {
  document.body.classList.toggle("light");
});

// Авто-логін
if (isLoggedIn) {
  loginScreen.classList.add("hidden");
  dashboard.classList.remove("hidden");
  render();
}

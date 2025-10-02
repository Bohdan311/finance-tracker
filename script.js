// ===== Логін =====
const loginScreen = document.getElementById("login-screen");
const dashboard = document.getElementById("dashboard");
const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");
const loginError = document.getElementById("login-error");

let user = { username: "admin", password: "1234" };

loginBtn.addEventListener("click", () => {
  const u = document.getElementById("login-username").value;
  const p = document.getElementById("login-password").value;

  if (u === user.username && p === user.password) {
    loginScreen.classList.remove("active");
    dashboard.classList.add("active");
  } else {
    loginError.textContent = "Невірний логін або пароль";
  }
});

logoutBtn.addEventListener("click", () => {
  dashboard.classList.remove("active");
  loginScreen.classList.add("active");
});

// ===== Дані =====
let transactions = JSON.parse(localStorage.getItem("transactions")) || [];
const accounts = ["ПУМБ (UAH)", "Bybit (UAH)", "MonoBank (UAH)"];

// ===== Додавання транзакцій =====
document.getElementById("add-income").addEventListener("click", () => addTransaction("Дохід"));
document.getElementById("add-expense").addEventListener("click", () => addTransaction("Витрата"));

function addTransaction(type) {
  const account = prompt("Рахунок: " + accounts.join(", "));
  const category = prompt("Категорія:");
  const description = prompt("Опис:");
  const amount = parseFloat(prompt("Сума:"));

  if (!account || isNaN(amount)) return;

  const transaction = {
    date: new Date().toISOString().split("T")[0],
    account,
    category,
    description,
    amount: type === "Витрата" ? -amount : amount
  };

  transactions.push(transaction);
  localStorage.setItem("transactions", JSON.stringify(transactions));
  render();
}

// ===== Відображення =====
function render() {
  const list = document.getElementById("transactions-list");
  list.innerHTML = "";
  let total = 0;

  const accountTotals = {};
  accounts.forEach(a => accountTotals[a] = 0);

  transactions.forEach((t, i) => {
    total += t.amount;
    accountTotals[t.account] += t.amount;

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${t.date}</td>
      <td>${t.account}</td>
      <td>${t.category}</td>
      <td>${t.description}</td>
      <td style="color:${t.amount >= 0 ? 'green' : 'red'}">${t.amount.toFixed(2)}</td>
      <td><button onclick="deleteTransaction(${i})">Видалити</button></td>
    `;
    list.appendChild(row);
  });

  document.getElementById("total-balance").textContent = total.toFixed(2) + " UAH";

  // рахунки
  const accountsList = document.getElementById("accounts-list");
  accountsList.innerHTML = "";
  for (let acc in accountTotals) {
    const li = document.createElement("li");
    li.textContent = `${acc}: ${accountTotals[acc].toFixed(2)} UAH`;
    accountsList.appendChild(li);
  }

  updateCharts();
}

function deleteTransaction(index) {
  transactions.splice(index, 1);
  localStorage.setItem("transactions", JSON.stringify(transactions));
  render();
}

// ===== Графіки =====
let balanceChart, pieChart;
function updateCharts() {
  const ctx1 = document.getElementById("balanceChart").getContext("2d");
  const ctx2 = document.getElementById("pieChart").getContext("2d");

  const labels = transactions.map(t => t.date);
  const data = transactions.map(t => t.amount);

  if (balanceChart) balanceChart.destroy();
  balanceChart = new Chart(ctx1, {
    type: "line",
    data: { labels, datasets: [{ label: "Баланс", data, borderColor: "cyan" }] }
  });

  const categories = {};
  transactions.forEach(t => {
    if (!categories[t.category]) categories[t.category] = 0;
    categories[t.category] += t.amount;
  });

  if (pieChart) pieChart.destroy();
  pieChart = new Chart(ctx2, {
    type: "doughnut",
    data: {
      labels: Object.keys(categories),
      datasets: [{ data: Object.values(categories), backgroundColor: ["blue", "orange", "green", "red", "purple"] }]
    }
  });
}

// ===== Темна/світла =====
document.getElementById("theme-toggle").addEventListener("change", e => {
  if (e.target.checked) {
    document.body.classList.remove("light");
  } else {
    document.body.classList.add("light");
  }
});

// ===== Старт =====
render();

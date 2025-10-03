let password = "1234"; // тимчасовий пароль
let accounts = JSON.parse(localStorage.getItem("accounts")) || [];
let transactions = JSON.parse(localStorage.getItem("transactions")) || [];

function login() {
  let input = document.getElementById("password").value;
  if (input === password) {
    document.getElementById("login-screen").style.display = "none";
    document.getElementById("app").style.display = "block";
    renderAccounts();
    renderTransactions();
    renderChart();
  } else {
    alert("Невірний пароль");
  }
}

function toggleTheme() {
  document.body.classList.toggle("dark");
}

function addAccount() {
  let name = prompt("Назва рахунку:");
  let balance = parseFloat(prompt("Баланс:")) || 0;
  accounts.push({ name, balance });
  localStorage.setItem("accounts", JSON.stringify(accounts));
  renderAccounts();
}

function renderAccounts() {
  let container = document.getElementById("account-list");
  container.innerHTML = "";
  accounts.forEach(a => {
    let div = document.createElement("div");
    div.className = "account-card";
    div.innerHTML = `<h3>${a.name}</h3><p>${a.balance} ₴</p>`;
    container.appendChild(div);
  });
}

function addTransaction() {
  let acc = prompt("Назва рахунку:");
  let amount = parseFloat(prompt("Сума (мінус = витрата):"));
  transactions.push({ acc, amount, date: new Date().toLocaleDateString() });
  localStorage.setItem("transactions", JSON.stringify(transactions));
  renderTransactions();
  renderChart();
}

function renderTransactions() {
  let list = document.getElementById("transaction-list");
  list.innerHTML = "";
  transactions.forEach(t => {
    let li = document.createElement("li");
    li.textContent = `${t.date}: ${t.acc} → ${t.amount} ₴`;
    list.appendChild(li);
  });
}

function renderChart() {
  let ctx = document.getElementById("chart").getContext("2d");
  let income = transactions.filter(t => t.amount > 0).reduce((a,b)=>a+b.amount,0);
  let expense = transactions.filter(t => t.amount < 0).reduce((a,b)=>a+b.amount,0);

  new Chart(ctx, {
    type: "pie",
    data: {
      labels: ["Дохід", "Витрати"],
      datasets: [{
        data: [income, Math.abs(expense)],
        backgroundColor: ["green", "red"]
      }]
    }
  });
}

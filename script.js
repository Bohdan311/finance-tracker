// Початковий баланс
let balance = 15200;

// Початкові транзакції
let transactions = [
  { amount: 500, type: "Інвестиції" },
  { amount: -120, type: "Витрати" },
  { amount: 300, type: "Дивіденди" }
];

// Дані для графіка
let months = ["Січ", "Лют", "Бер", "Кві", "Тра", "Чер"];
let incomeData = [1000, 1800, 3000, 2500, 3100, 4000];

// 1. Оновлення балансу
function updateBalance() {
  document.getElementById("balance").textContent = `$${balance.toLocaleString()}`;
}

// 2. Оновлення списку транзакцій
function updateTransactions() {
  const list = document.getElementById("transactions");
  list.innerHTML = "";
  transactions.forEach(t => {
    const li = document.createElement("li");
    li.textContent = `${t.amount > 0 ? "+" : ""}$${t.amount} (${t.type})`;
    list.appendChild(li);
  });
}

// 3. Графік
const ctx = document.getElementById("incomeChart").getContext("2d");
let chart = new Chart(ctx, {
  type: "line",
  data: {
    labels: months,
    datasets: [{
      label: "Доходи ($)",
      data: incomeData,
      borderColor: "#06b6d4",
      backgroundColor: "rgba(6,182,212,0.3)",
      fill: true,
      tension: 0.3
    }]
  },
  options: {
    responsive: true,
    scales: {
      y: { beginAtZero: false }
    }
  }
});

// 4. Додавання доходу
document.getElementById("addIncome").addEventListener("click", () => {
  const amount = prompt("Введіть суму доходу:");
  if (amount && !isNaN(amount)) {
    balance += parseFloat(amount);
    transactions.unshift({ amount: parseFloat(amount), type: "Дохід" });
    incomeData.push(parseFloat(amount));
    months.push(`+`);
    updateBalance();
    updateTransactions();
    chart.update();
  }
});

// 5. Додавання витрат
document.getElementById("addExpense").addEventListener("click", () => {
  const amount = prompt("Введіть суму витрат:");
  if (amount && !isNaN(amount)) {
    balance -= parseFloat(amount);
    transactions.unshift({ amount: -parseFloat(amount), type: "Витрати" });
    incomeData.push(-parseFloat(amount));
    months.push(`-`);
    updateBalance();
    updateTransactions();
    chart.update();
  }
});

// Ініціалізація
updateBalance();
updateTransactions();

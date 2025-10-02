// Баланс
let balance = 15200;

// Масив транзакцій
let transactions = [
  { amount: 500, type: "Інвестиції" },
  { amount: -120, type: "Витрати" },
  { amount: 300, type: "Дивіденди" }
];

// Оновлення балансу на екрані
function updateBalance() {
  document.getElementById("balance").textContent = `$${balance.toLocaleString()}`;
}

// Оновлення списку транзакцій
function updateTransactions() {
  const list = document.getElementById("transactions");
  list.innerHTML = "";
  transactions.forEach(t => {
    const li = document.createElement("li");
    li.textContent = `${t.amount > 0 ? "+" : ""}$${t.amount} (${t.type})`;
    list.appendChild(li);
  });
}

// Додаємо дохід
document.getElementById("addIncome").addEventListener("click", () => {
  const amount = prompt("Введіть суму доходу:");
  if (amount && !isNaN(amount)) {
    balance += parseFloat(amount);
    transactions.unshift({ amount: parseFloat(amount), type: "Дохід" });
    updateBalance();
    updateTransactions();
  }
});

// Додаємо витрати
document.getElementById("addExpense").addEventListener("click", () => {
  const amount = prompt("Введіть суму витрат:");
  if (amount && !isNaN(amount)) {
    balance -= parseFloat(amount);
    transactions.unshift({ amount: -parseFloat(amount), type: "Витрати" });
    updateBalance();
    updateTransactions();
  }
});

// Перший рендер
updateBalance();
updateTransactions();

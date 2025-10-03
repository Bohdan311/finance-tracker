import express from "express";
import session from "express-session";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";

dotenv.config();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Сесія
app.use(
  session({
    secret: process.env.SESSION_SECRET || "supersecret",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, httpOnly: true, maxAge: 1000 * 60 * 60 } // 1 година
  })
);

// 🔑 Логін
app.post("/login", async (req, res) => {
  const { password } = req.body;
  const valid = await bcrypt.compare(password, process.env.ADMIN_PASSWORD);

  if (!valid) {
    return res.status(401).json({ success: false, message: "Невірний пароль" });
  }

  req.session.user = "admin"; // зберігаємо користувача в сесії
  res.json({ success: true });
});

// 🔒 Middleware для захищених сторінок
function authMiddleware(req, res, next) {
  if (req.session.user) {
    next();
  } else {
    res.status(401).send("Доступ заборонено");
  }
}

// Приклад закритої сторінки
app.get("/dashboard", authMiddleware, (req, res) => {
  res.send("Ласкаво просимо в адмінку TCP 🚀");
});

// 🚪 Логаут
app.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

app.listen(3000, () => console.log("✅ Сервер запущено на http://localhost:3000"));

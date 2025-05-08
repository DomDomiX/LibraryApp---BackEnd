const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("./db");
require("dotenv").config();

// Endpoint: POST /api/register
router.post("/register", async (req, res) => {
  const { firstName, lastName, email, password } = req.body;
  try {
    // Zkontrolujeme, zda už uživatel s daným emailem existuje
    const existing = await db.query('SELECT * FROM "user-info" WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: "Uživatel již existuje." });
    }

    // Heslo zašifrujeme pomocí bcrypt
    const hashedPassword = await bcrypt.hash(password, 10);

    // Uložíme uživatele do databáze
    const result = await db.query(
      'INSERT INTO "user-info" ("firstName", "lastName", "email", "password") VALUES ($1, $2, $3, $4) RETURNING id',
      [firstName, lastName, email, hashedPassword]
    );

    // Vytvoříme JWT token
    const token = jwt.sign({ id: result.rows[0].id }, process.env.JWT_SECRET, { expiresIn: "1h" });

    res.status(201).json({ accessToken: token });
  } catch (err) {
    console.error("Chyba při registraci:", err);
    res.status(500).json({ error: "Chyba serveru" });
  }
});

// Endpoint: POST /api/login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    // Najdeme uživatele podle emailu
    const user = await db.query('SELECT * FROM "user-info" WHERE email = $1', [email]);
    if (user.rows.length === 0) {
      return res.status(401).json({ error: "Neplatné přihlašovací údaje." });
    }

    const userInfo = user.rows[0];

    // Porovnáme zadané heslo s tím uloženým (zašifrovaným)
    const passwordMatch = await bcrypt.compare(password, userInfo.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: "Neplatné přihlašovací údaje." });
    }

    // Vytvoříme JWT token
    const token = jwt.sign({ id: userInfo.id, firstName: userInfo.firstName, lastName: userInfo.lastName }, process.env.JWT_SECRET, { expiresIn: "1h" });

    res.json({ accessToken: token, firstName: userInfo.firstName, lastName: userInfo.lastName });
  } catch (err) {
    console.error("Chyba při přihlášení:", err);
    res.status(500).json({ error: "Chyba serveru" });
  }
});

const verifyToken = require("./verifyToken");

router.get("/userBooks", verifyToken, async (req, res) => {
  const userId = req.user.id;
  console.log(`Načítám knihy pro uživatele: ${userId}`);

  try {
    const books = await db.query('SELECT * FROM "user-books" WHERE userid = $1', [userId]);
    console.log(`Nalezeno ${books.rows.length} knih`);

    if (books.rows.length === 0) {
      return res.status(404).json({ error: "Žádné knihy nenalezeny." });
    }

    res.json(books.rows);
  } catch (err) {
    console.error("Chyba při získání knih:", err);
    res.status(500).json({ error: "Chyba serveru" });
  }
});

module.exports = router;

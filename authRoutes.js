const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("./db");
const path = require('path');
const fs = require('fs');
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

router.post("/bookSave", verifyToken, async (req, res) => {
  const { bookId, name, author, isbn } = req.body;
  const userId = req.user.id;

  if (!bookId || !name || !author || !isbn) {
    return res.status(400).json({ error: "Chybí některý z údajů (bookId, name, author, isbn)." });
  }

  try {
    // Zkontrolujeme, zda uživatel již knihu uložil
    const existing = await db.query('SELECT * FROM "user-books" WHERE userid = $1 AND bookid = $2', [userId, bookId]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: "Kniha již byla uložena." });
    }

    // Uložíme knihu do databáze
    await db.query(
      'INSERT INTO "user-books" (name, author, isbn, userid, bookid) VALUES ($1, $2, $3, $4, $5)',
      [name, author, isbn, userId, bookId]
    );

    res.status(201).json({ message: "Kniha byla úspěšně uložena." });
  } catch (err) {
    console.error("Chyba při ukládání knihy:", err);
    res.status(500).json({ error: "Chyba serveru" });
  }
});

// Endpoint pro odstranění knihy ze seznamu uživatele
router.delete("/bookRemove/:bookId", verifyToken, async (req, res) => {
  const userId = req.user.id;
  const bookId = req.params.bookId;

  try {
    const result = await db.query(
      'DELETE FROM "user-books" WHERE userid = $1 AND bookid = $2 RETURNING *',
      [userId, bookId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Kniha nebyla nalezena v seznamu uživatele." });
    }

    res.json({ message: "Kniha byla odebrána ze seznamu." });
  } catch (err) {
    console.error("Chyba při odebírání knihy:", err);
    res.status(500).json({ error: "Chyba serveru" });
  }
});

router.post("/verifyToken", (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ valid: false, error: "Chybí token." });
  }

  const token = authHeader.split(" ")[1];

  try {
    jwt.verify(token, process.env.JWT_SECRET);
    res.json({ valid: true });
  } catch (err) {
    res.status(403).json({ valid: false, error: "Neplatný token." });
  }
});

router.post("/sendRating", verifyToken, async (req, res) => {
  const {bookId, bookRating, bookLike} = req.body;
  const userId = req.user.id; 

  try {
    // Zkontrolujeme, zda uživatel již hodnocení pro knihu uložil
    const existing = await db.query('SELECT * FROM "books-stats" WHERE userid = $1 AND bookid = $2', [userId, bookId]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: "Kniha již byla uložena." });
    }

    await db.query(
        'INSERT INTO "books-stats" (bookid, bookrating, booklike, userid) VALUES ($1, $2, $3, $4)',
        [bookId, bookRating, bookLike, userId]
      );

    res.status(201).json({ message: "Hodnocení knihy bylo úspěšně odesláno." });
  } catch (err) {
      console.error("Chyba při odesílání hodnocení:", err);
      res.status(500).json({ error: "Chyba serveru" });
  }
});

module.exports = router;

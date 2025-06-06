const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("./db");
const path = require('path');
const fs = require('fs');
require("dotenv").config();

const verifyToken = require("./verifyToken");

// GET /api/auth/getProfile - Získání profilu uživatele
router.get("/getProfile", verifyToken, async (req, res) => {
  const userId = req.user.id;
  console.log(`Načítám profil pro uživatele: ${userId}`);

  try {
    const user = await db.query(
      'SELECT id, "firstName", "lastName", email, bio FROM "user-info" WHERE id = $1', 
      [userId]
    );

    if (user.rows.length === 0) {
      return res.status(404).json({ error: "Uživatel nebyl nalezen." });
    }

    const userProfile = user.rows[0];
    console.log(`Profil nalezen:`, userProfile);

    res.json(userProfile);
  } catch (err) {
    console.error("Chyba při získání profilu:", err);
    res.status(500).json({ error: "Chyba serveru" });
  }
});

// PUT /api/auth/updateProfile - Aktualizace profilu uživatele
router.put("/updateProfile", verifyToken, async (req, res) => {
  const userId = req.user.id;
  const { firstName, lastName, email, bio } = req.body;

  // Validace
  if (!firstName || !lastName || !email) {
    return res.status(400).json({ 
      error: "Jméno, příjmení a email jsou povinné." 
    });
  }

  try {
    // Kontrola, zda email již neexistuje u jiného uživatele
    const emailCheck = await db.query(
      'SELECT id FROM "user-info" WHERE email = $1 AND id != $2', 
      [email, userId]
    );

    if (emailCheck.rows.length > 0) {
      return res.status(400).json({ error: "Email již existuje u jiného uživatele." });
    }

    // Aktualizace profilu
    const result = await db.query(
      'UPDATE "user-info" SET "firstName" = $1, "lastName" = $2, email = $3, bio = $4 WHERE id = $5 RETURNING *',
      [firstName, lastName, email, bio, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Uživatel nebyl nalezen." });
    }

    console.log("Profil úspěšně aktualizován:", result.rows[0]);
    res.json({ 
      message: "Profil byl úspěšně aktualizován.",
      user: { firstName, lastName, email, bio }
    });

  } catch (err) {
    console.error("Chyba při aktualizaci profilu:", err);
    res.status(500).json({ error: "Chyba serveru" });
  }
});

// POST /api/auth/change-password - Změna hesla
router.post("/change-password", verifyToken, async (req, res) => {
  const userId = req.user.id;
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ 
      error: "Současné heslo a nové heslo jsou povinné." 
    });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ 
      error: "Nové heslo musí mít alespoň 6 znaků." 
    });
  }

  try {
    // Získání současného hesla z databáze
    const user = await db.query('SELECT password FROM "user-info" WHERE id = $1', [userId]);

    if (user.rows.length === 0) {
      return res.status(404).json({ error: "Uživatel nebyl nalezen." });
    }

    const userInfo = user.rows[0];

    // Ověření současného hesla
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, userInfo.password);

    if (!isCurrentPasswordValid) {
      return res.status(400).json({ error: "Současné heslo je nesprávné." });
    }

    // Hash nového hesla
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Aktualizace hesla v databázi
    await db.query(
      'UPDATE "user-info" SET password = $1 WHERE id = $2',
      [hashedNewPassword, userId]
    );

    console.log(`Heslo úspěšně změněno pro uživatele: ${userId}`);
    res.json({ message: "Heslo bylo úspěšně změněno." });

  } catch (err) {
    console.error("Chyba při změně hesla:", err);
    res.status(500).json({ error: "Chyba serveru" });
  }
});

// GET /api/auth/user-stats - Statistiky uživatele
router.get("/user-stats", verifyToken, async (req, res) => {
  const userId = req.user.id;
  console.log(`Načítám statistiky pro uživatele: ${userId}`);

  try {
    // Celkový počet knih
    const totalBooksResult = await db.query(
      'SELECT COUNT(*) as count FROM "user-books" WHERE userid = $1', 
      [userId]
    );
    const totalBooks = parseInt(totalBooksResult.rows[0].count);

    // Oblíbené knihy
    const favoriteBooksResult = await db.query(
      'SELECT COUNT(*) as count FROM "books-stats" WHERE userid = $1 AND booklike = true', 
      [userId]
    );
    const favoriteBooks = parseInt(favoriteBooksResult.rows[0].count);

    // Průměrné hodnocení
    const avgRatingResult = await db.query(
      'SELECT AVG(bookrating) as avg FROM "books-stats" WHERE userid = $1 AND bookrating > 0', 
      [userId]
    );
    const avgRating = parseFloat(avgRatingResult.rows[0].avg) || 0;

    const stats = {
      totalBooks,
      favoriteBooks,
      avgRating: Math.round(avgRating * 10) / 10, // Zaokrouhlení na 1 desetinné místo
    };

    console.log("Statistiky uživatele:", stats);
    res.json(stats);

  } catch (err) {
    console.error("Chyba při získání statistik:", err);
    res.status(500).json({ error: "Chyba serveru" });
  }
});

module.exports = router;
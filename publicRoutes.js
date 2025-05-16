const express = require("express");
const router = express.Router();
const db = require("./db");

// Veřejný endpoint pro získání všech knih
router.get("/books", async (req, res) => {
  try {
    const books = await db.query('SELECT * FROM "books"');
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
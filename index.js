// Načítáme knihovnu express, která nám umožňuje vytvářet server a definovat cesty
const express = require("express");

// Načítáme knihovnu cors, která nám umožní umožnit CORS (Cross-Origin Resource Sharing)
const cors = require("cors");

// Načítáme knihovnu dotenv, která nám umožní načítat proměnné prostředí ze souboru .env
require("dotenv").config();

// Vytváříme instanci aplikace Express
const app = express();

// Používáme middleware pro povolení CORS (umožňuje nám požadavky z jiných domén)
app.use(cors());

// Middleware pro zpracování JSON dat v těle požadavků (např. POST, PUT)
app.use(express.json());

// Testovací endpoint pro kořenovou URL "/"
// Když někdo navštíví http://localhost:3000/, zobrazí se mu "Ahoj! Server běží."
app.get('/', (req, res) => {
  // Odpověď je jednoduchý textový řetězec
  res.send('Ahoj! Server běží.');
});

// Endpoint pro "/api/hello"
// Když někdo navštíví http://localhost:3000/api/hello, vrátí se mu JSON objekt
app.get("/api/hello", (req, res) => {
  // Odpovědí bude JSON s klíčem "message" a hodnotou "Ahoj z backendu v Node.js"
  res.json({ message: "Ahoj z backendu v Node.js" });
});

// Získáme port z prostředí, pokud je nastavený, jinak použijeme výchozí port 3000
const PORT = process.env.PORT || 3000;

// Připojení k databázi
const db = require("./db");

// Endpoint pro test databaze
app.get("/api/userinfo", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM user-info;");
    res.json(result.rows);
  } catch (err) {
    console.error("Chyba při získávání knih z databáze:", err); // <- detailní log
    res.status(500).json({ error: "Chyba serveru", detail: err.message }); // <- volitelně i do odpovědi
  }
});

// Spouštíme server a posloucháme na zvoleném portu
app.listen(PORT, () => {
  // Jakmile server běží, vypíšeme do konzole zprávu s portem
  console.log('Server běží na http://localhost:' + PORT);
});

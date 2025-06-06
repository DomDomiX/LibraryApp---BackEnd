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

const authRoutes = require("./authRoutes");
app.use("/api/auth", authRoutes);

const publicRoutes = require("./publicRoutes");
app.use("/api", publicRoutes);

const userRoutes = require("./userRoutes");
app.use("/api/user", userRoutes);

// Testovací endpoint pro kořenovou URL "/"
// Když někdo navštíví http://localhost:3000/, zobrazí se mu "Ahoj! Server běží."
app.get('/', (req, res) => {
  // Odpověď je jednoduchý textový řetězec
  res.send('Ahoj! Server běží.');
});

// Získáme port z prostředí, pokud je nastavený, jinak použijeme výchozí port 3000
const PORT = process.env.PORT || 3000;

// Připojení k databázi
const db = require("./db");

// Endpoint pro test databaze
app.get("/api/users", async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM "user-info"');
    res.json(result.rows);
  } catch (err) {
    console.error("Chyba při získávání uživatelů:", err);
    res.status(500).json({ error: "Chyba serveru", detail: err.message });
  }
});

// Spouštíme server a posloucháme na zvoleném portu
app.listen(PORT, () => {
  // Jakmile server běží, vypíšeme do konzole zprávu s portem
  console.log('Server běží na http://localhost:' + PORT);
});

const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("./db");
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require("dotenv").config();

// Konfigurace multer pro upload fotek
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/profile-photos/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

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
      'UPDATE "user-info" SET "firstName" = $1, "lastName" = $2, email = $3, bio = $4, "updatedAt" = NOW() WHERE id = $5 RETURNING *',
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
      'UPDATE "user-info" SET password = $1, "updatedAt" = NOW() WHERE id = $2',
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

    // Dny aktivity (od první uložené knihy)
    const daysActiveResult = await db.query(
      'SELECT EXTRACT(DAY FROM (NOW() - MIN("createdAt"))) as days FROM "user-books" WHERE userid = $1', 
      [userId]
    );
    const daysActive = parseInt(daysActiveResult.rows[0].days) || 0;

    const stats = {
      totalBooks,
      favoriteBooks,
      avgRating: Math.round(avgRating * 10) / 10, // Zaokrouhlení na 1 desetinné místo
      daysActive
    };

    console.log("Statistiky uživatele:", stats);
    res.json(stats);

  } catch (err) {
    console.error("Chyba při získání statistik:", err);
    res.status(500).json({ error: "Chyba serveru" });
  }
});
});

module.exports = router;

const jwt = require("jsonwebtoken");
require("dotenv").config();

function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) return res.status(401).json({ error: "Chybí token." });

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // uložíme uživatele do requestu
    next();
  } catch (err) {
    return res.status(403).json({ error: "Neplatný token." });
  }
}

module.exports = verifyToken;

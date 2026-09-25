const express = require("express");
const path = require("path");
const Database = require("better-sqlite3");

const app = express();
const PORT = process.env.PORT || 10000;
const db = new Database(path.join(__dirname, "data", "book-sukkur.db"));

db.exec(`
CREATE TABLE IF NOT EXISTS hotels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  area TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT 'Sukkur',
  price INTEGER NOT NULL,
  rating REAL NOT NULL DEFAULT 4.2,
  image TEXT NOT NULL,
  description TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hotel_id INTEGER NOT NULL,
  guest_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  check_in TEXT NOT NULL,
  check_out TEXT NOT NULL,
  guests INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`);

const count = db.prepare("SELECT COUNT(*) AS c FROM hotels").get().c;
if (!count) {
  const insert = db.prepare(`INSERT INTO hotels
    (name, area, city, price, rating, image, description)
    VALUES (?, ?, ?, ?, ?, ?, ?)`);
  const seed = [
    ["Sukkur Grand Hotel", "Military Road", "Sukkur", 5500, 4.5, "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1000&q=80", "Comfortable rooms with modern facilities in a central Sukkur location."],
    ["Indus View Guest House", "Lab-e-Mehran", "Sukkur", 4200, 4.3, "https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1000&q=80", "A peaceful stay with easy access to the Indus River area."],
    ["Royal Sukkur Inn", "Airport Road", "Sukkur", 6500, 4.6, "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=1000&q=80", "Spacious rooms, Wi-Fi and family-friendly accommodation."],
    ["City View Hotel", "Minara Road", "Sukkur", 3500, 4.1, "https://images.unsplash.com/photo-1556740738-b6a63e27c4df?auto=format&fit=crop&w=1000&q=80", "Affordable rooms for business and short stays."]
  ];
  const tx = db.transaction(() => seed.forEach(x => insert.run(...x)));
  tx();
}

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/hotels", (req, res) => {
  const q = (req.query.q || "").trim();
  const min = Number(req.query.min || 0);
  const max = Number(req.query.max || 999999999);
  let sql = "SELECT * FROM hotels WHERE price BETWEEN ? AND ?";
  const params = [min, max];
  if (q) {
    sql += " AND (name LIKE ? OR area LIKE ? OR city LIKE ?)";
    const like = `%${q}%`;
    params.push(like, like, like);
  }
  sql += " ORDER BY rating DESC";
  res.json(db.prepare(sql).all(...params));
});

app.get("/api/hotels/:id", (req, res) => {
  const hotel = db.prepare("SELECT * FROM hotels WHERE id = ?").get(req.params.id);
  if (!hotel) return res.status(404).json({error: "Hotel not found"});
  res.json(hotel);
});

app.post("/api/bookings", (req, res) => {
  const {hotel_id, guest_name, phone, email, check_in, check_out, guests} = req.body;
  if (!hotel_id || !guest_name || !phone || !check_in || !check_out || !guests) {
    return res.status(400).json({error: "Please fill all required fields."});
  }
  if (new Date(check_out) <= new Date(check_in)) {
    return res.status(400).json({error: "Check-out must be after check-in."});
  }
  const hotel = db.prepare("SELECT * FROM hotels WHERE id = ?").get(hotel_id);
  if (!hotel) return res.status(404).json({error: "Hotel not found"});
  const result = db.prepare(`
    INSERT INTO bookings (hotel_id, guest_name, phone, email, check_in, check_out, guests)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(hotel_id, guest_name, phone, email || "", check_in, check_out, Number(guests));
  res.json({ok: true, booking_id: result.lastInsertRowid, hotel: hotel.name});
});

app.get("/api/admin/bookings", (req, res) => {
  // MVP only. Add authentication before production use.
  const rows = db.prepare(`
    SELECT b.*, h.name AS hotel_name
    FROM bookings b JOIN hotels h ON h.id = b.hotel_id
    ORDER BY b.id DESC
  `).all();
  res.json(rows);
});

app.get("*", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));
app.listen(PORT, () => console.log(`Book Sukkur running on port ${PORT}`));

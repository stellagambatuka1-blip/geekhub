const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

// ===============================
// MONGODB
// ===============================
const MONGO_URI = "mongodb+srv://stellagambatuka1_db_user:EtyGMOF5MPwjdAc5@cluster0.xruwis5.mongodb.net/geekhub?retryWrites=true&w=majority";

mongoose.connect(MONGO_URI)
  .then(() => console.log("MongoDB Connected ✅"))
  .catch(err => console.log("Mongo Error ❌", err));

// ===============================
// SLUG HELPER
// ===============================
const slugify = (text) =>
  text.toString().toLowerCase()
    .replace(/ /g, "-")
    .replace(/[^\w-]+/g, "");

// ===============================
// MODEL
// ===============================
const ArticleSchema = new mongoose.Schema({
  title: String,
  content: String,
  category: String,
  image: String,
  date: { type: Date, default: Date.now },
  likes: { type: Number, default: 0 },
  fav: { type: Boolean, default: false },
  comments: { type: [String], default: [] },
  unseen: { type: Boolean, default: false },
  author: { type: String, default: "GeekHub Team" },
  authorImage: String,
  slug: String
});

const Article = mongoose.model("Article", ArticleSchema);

// ===============================
// MIDDLEWARE (ORDER FIXED)
// ===============================
app.use(cors());
app.use(express.json());

// ✅ IMPORTANT: static files FIRST
app.use(express.static(path.join(__dirname, "public")));

// ===============================
// ROUTES
// ===============================

// HOME API
app.get("/articles", async (req, res) => {
  try {
    const data = await Article.find({ unseen: false }).sort({ date: -1 });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// GET ONE ARTICLE
app.get("/articles/:id", async (req, res) => {
  try {
    const a = await Article.findById(req.params.id);
    if (!a) return res.status(404).json({ message: "Not found ❌" });
    res.json(a);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// GET BY SLUG
app.get("/article/slug/:slug", async (req, res) => {
  try {
    const article = await Article.findOne({ slug: req.params.slug });
    if (!article) return res.status(404).json({ message: "Not found ❌" });
    res.json(article);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// CREATE ARTICLE
app.post("/articles", async (req, res) => {
  try {
    const article = new Article({
      ...req.body,
      slug: slugify(req.body.title)
    });

    await article.save();
    res.json(article);
  } catch (err) {
    res.status(500).json({ error: "Failed to save" });
  }
});

// UPDATE
app.put("/articles/:id", async (req, res) => {
  try {
    const updated = await Article.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Update failed" });
  }
});

// LIKE
app.post("/articles/:id/like", async (req, res) => {
  await Article.findByIdAndUpdate(req.params.id, { $inc: { likes: 1 } });
  res.json({ ok: true });
});

// COMMENT
app.post("/articles/:id/comment", async (req, res) => {
  await Article.findByIdAndUpdate(req.params.id, {
    $push: { comments: req.body.comment }
  });
  res.json({ ok: true });
});

// DELETE (soft delete)
app.delete("/articles/:id", async (req, res) => {
  await Article.findByIdAndUpdate(req.params.id, { unseen: true });
  res.json({ ok: true });
});

// ===============================
// UPLOAD
// ===============================
const uploadFolder = path.join(__dirname, "public/uploads");

if (!fs.existsSync(uploadFolder)) {
  fs.mkdirSync(uploadFolder, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadFolder),
  filename: (req, file, cb) =>
    cb(null, Date.now() + path.extname(file.originalname))
});

const upload = multer({ storage });

app.post("/upload", upload.single("image"), (req, res) => {
  res.json({ path: "/uploads/" + req.file.filename });
});

// ===============================
// SPA FALLBACK (FIXED ORDER)
// ===============================
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ===============================
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
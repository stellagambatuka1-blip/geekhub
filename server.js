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
// SLUG HELPER (ADDED)
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

  // 🔥 ADDED
  slug: String
});

const Article = mongoose.model("Article", ArticleSchema);

// ===============================
// MIDDLEWARE
// ===============================
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// ===============================
// HOME
// ===============================
app.get("/", (req, res) => {
  res.send("GeekHub MongoDB Server 🚀");
});

// ===============================
// GET ALL ARTICLES
// ===============================
app.get("/articles", async (req, res) => {
  try {
    const data = await Article.find({ unseen: false }).sort({ date: -1 });
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// ===============================
// GET ONE ARTICLE (BY ID)
// ===============================
app.get("/articles/:id", async (req, res) => {
  try {
    const a = await Article.findById(req.params.id);
    if (!a) return res.status(404).json({ message: "Not found ❌" });
    res.json(a);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// ===============================
// 🔥 NEW: GET ARTICLE BY SLUG
// ===============================
app.get("/article/slug/:slug", async (req, res) => {
  try {
    const article = await Article.findOne({ slug: req.params.slug });

    if (!article) return res.status(404).json({ message: "Not found ❌" });

    res.json(article);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// ===============================
// ADD ARTICLE (UPDATED WITH SLUG)
// ===============================
app.post("/articles", async (req, res) => {
  try {
    const article = new Article({
      ...req.body,
      slug: slugify(req.body.title)
    });

    await article.save();
    res.json({ message: "Article saved ✅", slug: article.slug });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save" });
  }
});

// ===============================
// UPDATE ARTICLE
// ===============================
app.put("/articles/:id", async (req, res) => {
  try {
    const updated = await Article.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ error: "Not found ❌" });
    }

    res.json({ message: "Updated ✅", article: updated });
  } catch (err) {
    res.status(500).json({ error: "Update failed ❌" });
  }
});

// ===============================
// LIKE
// ===============================
app.post("/articles/:id/like", async (req, res) => {
  try {
    await Article.findByIdAndUpdate(req.params.id, { $inc: { likes: 1 } });
    res.json({ message: "Liked ✅" });
  } catch (err) {
    res.status(500).json({ error: "Like failed ❌" });
  }
});

// ===============================
// FAV
// ===============================
app.post("/articles/:id/favourite", async (req, res) => {
  try {
    await Article.findByIdAndUpdate(req.params.id, { fav: true });
    res.json({ message: "Favourited ✅" });
  } catch (err) {
    res.status(500).json({ error: "Fav failed ❌" });
  }
});

// ===============================
// COMMENT
// ===============================
app.post("/articles/:id/comment", async (req, res) => {
  try {
    await Article.findByIdAndUpdate(req.params.id, {
      $push: { comments: req.body.comment }
    });
    res.json({ message: "Comment added ✅" });
  } catch (err) {
    res.status(500).json({ error: "Comment failed ❌" });
  }
});

// ===============================
// DELETE
// ===============================
app.delete("/articles/:id", async (req, res) => {
  try {
    await Article.findByIdAndUpdate(req.params.id, { unseen: true });
    res.json({ message: "Deleted ✅" });
  } catch (err) {
    res.status(500).json({ error: "Delete failed ❌" });
  }
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
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// DIRECT PAGE LOAD
app.get("/article/:id", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});
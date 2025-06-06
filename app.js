const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const helmet = require("helmet"); // <-- Added

dotenv.config();

// Set up app and middleware
const app = express();

// CORS configuration
const frontendUrl = process.env.FRONTEND_URL || '*';
app.use(cors({
  origin: frontendUrl,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Add Helmet security headers including CSP
app.use(helmet());
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", frontendUrl],
      connectSrc: ["'self'", frontendUrl],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
      fontSrc: ["'self'"],
    },
  })
);

// JSON parser
app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

// Schemas
const replySchema = new mongoose.Schema({
  replier: { type: String, required: true },
  replyText: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const postSchema = new mongoose.Schema({
  author: { type: String, required: true },
  content: { type: String, required: true },
  replies: [replySchema],
}, { timestamps: true });

const Post = mongoose.model("Post", postSchema);

// Routes
app.post("/api/posts", async (req, res) => {
  const { author, content } = req.body;
  try {
    const newPost = new Post({ author, content });
    await newPost.save();
    res.status(201).json(newPost);
  } catch (err) {
    res.status(400).json({ error: "Failed to create post", details: err.message });
  }
});

app.get("/api/posts", async (req, res) => {
  try {
    const posts = await Post.find();
    res.json(posts);
  } catch (err) {
    res.status(400).json({ error: "Failed to fetch posts", details: err.message });
  }
});

app.post("/api/posts/:id/replies", async (req, res) => {
  const { replier, replyText } = req.body;
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Post not found" });

    post.replies.push({ replier, replyText });
    await post.save();
    res.status(201).json(post);
  } catch (err) {
    res.status(400).json({ error: "Failed to add reply", details: err.message });
  }
});

app.put("/api/posts/:id", async (req, res) => {
  const { content } = req.body;
  try {
    const updatedPost = await Post.findByIdAndUpdate(
      req.params.id,
      { content },
      { new: true }
    );
    if (!updatedPost) return res.status(404).json({ error: "Post not found" });
    res.json(updatedPost);
  } catch (err) {
    res.status(400).json({ error: "Failed to update post", details: err.message });
  }
});

app.delete("/api/posts/:id", async (req, res) => {
  try {
    const deletedPost = await Post.findByIdAndDelete(req.params.id);
    if (!deletedPost) return res.status(404).json({ error: "Post not found" });
    res.json({ message: "Post deleted" });
  } catch (err) {
    res.status(400).json({ error: "Failed to delete post", details: err.message });
  }
});

app.delete("/api/posts/:postId/replies/:replyIndex", async (req, res) => {
  const { postId, replyIndex } = req.params;
  try {
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ error: "Post not found" });

    if (replyIndex < 0 || replyIndex >= post.replies.length) {
      return res.status(400).json({ error: "Invalid reply index" });
    }

    post.replies.splice(replyIndex, 1);
    await post.save();
    res.json(post);
  } catch (err) {
    res.status(400).json({ error: "Failed to delete reply", details: err.message });
  }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

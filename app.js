const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
const cors = require("cors");

dotenv.config();

// Set up app and middleware
const app = express();

// CORS configuration to allow requests from your frontend
app.use(cors({
  origin: process.env.FRONTEND_URL, // Use the frontend URL from your .env file
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(bodyParser.json());

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log("MongoDB connection error:", err));

// Define Schemas
const replySchema = new mongoose.Schema({
  replier: { type: String, required: true },
  replyText: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const postSchema = new mongoose.Schema({
  author: { type: String, required: true },
  content: { type: String, required: true },
  replies: [replySchema]
}, { timestamps: true });

const Post = mongoose.model("Post", postSchema);

// Routes

// Create a new post
app.post("/api/posts", async (req, res) => {
  const { author, content } = req.body;
  try {
    const newPost = new Post({ author, content });
    await newPost.save();
    res.status(201).json(newPost);
  } catch (err) {
    res.status(400).json({ error: "Failed to create post" });
  }
});

// Get all posts
app.get("/api/posts", async (req, res) => {
  try {
    const posts = await Post.find();
    res.json(posts);
  } catch (err) {
    res.status(400).json({ error: "Failed to fetch posts" });
  }
});

// Add a reply to a post
app.post("/api/posts/:id/replies", async (req, res) => {
  const { replier, replyText } = req.body;
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Post not found" });

    post.replies.push({ replier, replyText });
    await post.save();
    res.status(201).json(post);
  } catch (err) {
    res.status(400).json({ error: "Failed to add reply" });
  }
});

// Edit post content
app.put("/api/posts/:id", async (req, res) => {
  const { content } = req.body;
  try {
    const updatedPost = await Post.findByIdAndUpdate(
      req.params.id,
      { content },
      { new: true }
    );
    res.json(updatedPost);
  } catch (err) {
    res.status(400).json({ error: "Failed to update post" });
  }
});

// Delete a post
app.delete("/api/posts/:id", async (req, res) => {
  try {
    await Post.findByIdAndDelete(req.params.id);
    res.json({ message: "Post deleted" });
  } catch (err) {
    res.status(400).json({ error: "Failed to delete post" });
  }
});

// Delete a reply
app.delete("/api/posts/:postId/replies/:replyIndex", async (req, res) => {
  const { postId, replyIndex } = req.params;
  try {
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ error: "Post not found" });

    post.replies.splice(replyIndex, 1);
    await post.save();
    res.json(post);
  } catch (err) {
    res.status(400).json({ error: "Failed to delete reply" });
  }
});

// Start the server
app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});

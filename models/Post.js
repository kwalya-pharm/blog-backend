const mongoose = require("mongoose");

const PostSchema = new mongoose.Schema({
  author: { type: String, required: true },
  content: { type: String, required: true },
  replies: [
    {
      replier: { type: String, required: true },
      replyText: { type: String, required: true },
    }
  ],
});

module.exports = mongoose.model("Post", PostSchema);

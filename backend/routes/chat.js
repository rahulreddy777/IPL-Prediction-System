const express = require("express");
const router  = express.Router();
const chat    = require("../services/chatService");


/* POST /api/chat  { message: "..." } → { reply: "...", timestamp } */
router.post("/", async (req, res) => {
  try {
    const userMsg = (req.body.message || "").trim();
    if (!userMsg) return res.status(400).json({ error: "Empty message" });

    const reply = await chat.processMessage(userMsg);
    res.json({ reply, timestamp: new Date().toISOString() });
  } catch (err) {
    console.error("[Chat] Error:", err.message);
    res.status(500).json({ reply: "⚠️ Something went wrong. Please try again!", timestamp: new Date().toISOString() });
  }
});

module.exports = router;

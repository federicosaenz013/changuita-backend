const express = require("express");
const router = express.Router();
const { createPreference, webhook } = require("./payments.controller");
const { authenticateToken } = require("../../middleware/auth");

router.post("/create-preference", authenticateToken, createPreference);
router.post("/webhook", webhook);

module.exports = router;

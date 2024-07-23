"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// backend/src/routes/index.ts
const express_1 = require("express");
const index_1 = require("../controllers/index");
const router = (0, express_1.Router)();
router.post('/generate', index_1.generateResponse);
exports.default = router;

// src/routes/search.js
// Route for global search: GET /api/search

const express = require('express');
const { searchHandler, getSuggestions } = require('../controllers/searchController');

const router = express.Router();

/* Public search endpoint (no auth), consistent with other public listing routes */
router.get('/search', searchHandler);

// Autocomplete suggestions endpoint: GET /api/search/suggestions
router.get('/search/suggestions', getSuggestions);

module.exports = router;

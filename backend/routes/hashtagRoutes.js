const express = require('express');
const router = express.Router();
const hashtagCtrl = require('../controllers/hashtagController');

router.get('/trending', hashtagCtrl.getTrending);
router.get('/search/:tag', hashtagCtrl.searchPosts);

module.exports = router;

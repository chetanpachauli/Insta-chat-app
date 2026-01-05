const express = require('express');
const router = express.Router();
const authCtrl = require('../controllers/authController');

// POST /api/auth/signup
router.post('/signup', authCtrl.signup);

// POST /api/auth/login
router.post('/login', authCtrl.login);

// POST /api/auth/logout
router.post('/logout', authCtrl.logout);

// GET /api/auth/check -> verify session cookie
router.get('/check', authCtrl.checkAuth);

// GET /api/auth/search?query=...
router.get('/search', authCtrl.search);

// POST /api/auth/refresh-token
router.post('/refresh-token', authCtrl.refreshToken);

module.exports = router;

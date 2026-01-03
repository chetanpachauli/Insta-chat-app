const express = require('express');
const router = express.Router();
const chatCtrl = require('../controllers/chatController');
const auth = require('../middleware/authMiddleware');

// protect all chat routes
router.use(auth);

// GET users for sidebar: /chat/users/:userId
router.get('/users/:userId', chatCtrl.getUsersForSidebar);

// POST send message: /chat/messages
router.post('/messages', chatCtrl.sendMessage);

// GET messages between two users: /chat/messages/:userId/:otherId
router.get('/messages/:userId/:otherId', chatCtrl.getMessages);

module.exports = router;

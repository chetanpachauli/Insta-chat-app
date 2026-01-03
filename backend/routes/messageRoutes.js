const express = require('express');
const router = express.Router();
const chatCtrl = require('../controllers/chatController');
const protect = require('../middleware/protectRoute');
const multer = require('multer');

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// All message routes are protected
router.use(protect);

// GET /api/messages/get/:userId/:otherId  -> fetch conversation
router.get('/get/:userId/:otherId', chatCtrl.getMessages);

// POST /api/messages/send/:userId  -> send message (with optional image)
router.post('/send/:userId', upload.single('image'), chatCtrl.sendMessage);

// GET users for sidebar
router.get('/users/:userId', chatCtrl.getUsersForSidebar);

// DELETE /api/messages/delete/:id -> delete message
router.delete('/delete/:id', chatCtrl.deleteMessage);

module.exports = router;
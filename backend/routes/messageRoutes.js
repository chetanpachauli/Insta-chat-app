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
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image and audio files are allowed!'), false);
    }
  }
});

// All message routes are protected
router.use(protect);

// GET /api/messages/get/:userId/:otherId  -> fetch conversation
router.get('/get/:userId/:otherId', chatCtrl.getMessages);

// POST /api/messages/send/:userId  -> send message (with optional image or audio)
router.post('/send/:userId', upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'audio', maxCount: 1 }
]), chatCtrl.sendMessage);

// GET users for sidebar
router.get('/users/:userId', chatCtrl.getUsersForSidebar);

// DELETE /api/messages/delete/:id -> delete message
router.delete('/delete/:id', chatCtrl.deleteMessage);

// POST /api/messages/react/:messageId -> toggle reaction
router.post('/react/:messageId', chatCtrl.toggleReaction);

// POST /api/messages/seen/:otherId -> mark messages as seen
router.post('/seen/:otherId', chatCtrl.markSeen);

module.exports = router;
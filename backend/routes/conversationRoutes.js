const express = require('express');
const router = express.Router();
const conversationCtrl = require('../controllers/conversationController');
const protect = require('../middleware/protectRoute');

router.use(protect);

router.post('/', conversationCtrl.createConversation);
router.get('/', conversationCtrl.getConversations);
router.get('/:id', conversationCtrl.getConversation);
router.post('/:id/participants', conversationCtrl.addParticipant);
router.delete('/:id/participants/:userId', conversationCtrl.removeParticipant);

module.exports = router;

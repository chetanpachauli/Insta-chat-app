const express = require('express');
const router = express.Router();
const protect = require('../middleware/protectRoute');
const ctrl = require('../controllers/storyController');

router.post('/', protect, ctrl.createStory);
router.get('/', protect, ctrl.getStories);
router.get('/:storyId/views', protect, ctrl.getStoryViews);
router.post('/:storyId/view', protect, ctrl.viewStory);
router.delete('/:storyId', protect, ctrl.deleteStory);

module.exports = router;

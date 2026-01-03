const express = require('express')
const router = express.Router()
const protect = require('../middleware/protectRoute')
const ctrl = require('../controllers/notificationController')

router.get('/', protect, ctrl.getNotifications)
router.post('/mark-read', protect, ctrl.markRead)

module.exports = router

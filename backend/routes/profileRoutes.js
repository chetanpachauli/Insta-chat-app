
const express = require('express')
const router = express.Router()
const protect = require('../middleware/protectRoute')
const upload = require('../middleware/upload')
const ctrl = require('../controllers/profileController')

// Create uploads directory if it doesn't exist
const fs = require('fs')
const path = require('path')
const uploadDir = path.join(__dirname, '../uploads')
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

// Routes
router.get('/:id', ctrl.getProfile)
router.get('/me', protect, ctrl.getMyProfile)
router.put('/', 
  protect, 
  upload.single('photo'), // Handle single file upload with field name 'photo'
  ctrl.updateProfile
)
router.post('/:id/follow', protect, ctrl.followUser)
router.post('/:id/unfollow', protect, ctrl.unfollowUser)

module.exports = router

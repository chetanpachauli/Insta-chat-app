const express = require('express')
const router = express.Router()
const protect = require('../middleware/protectRoute')
const ctrl = require('../controllers/postController')

router.post('/', protect, ctrl.createPost)
router.post('/:postId/like', protect, ctrl.toggleLike)
router.post('/:postId/comment', protect, ctrl.addComment)
router.get('/feed', protect, ctrl.getFeed)
router.get('/explore', ctrl.getExplore)
router.get('/saved/me', protect, ctrl.getSaved)
router.get('/:postId', ctrl.getPost)
router.post('/:postId/save', protect, ctrl.toggleSave)
// router.get('/saved/me', protect, ctrl.getSaved)
router.delete('/:postId', protect, ctrl.deletePost)

module.exports = router

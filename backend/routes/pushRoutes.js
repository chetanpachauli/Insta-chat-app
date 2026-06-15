const express = require('express');
const router = express.Router();
const pushCtrl = require('../controllers/pushController');
const protect = require('../middleware/protectRoute');

router.use(protect);

router.post('/token', pushCtrl.saveToken);
router.delete('/token', pushCtrl.removeToken);

module.exports = router;

const express = require('express');
const {
  registerUser,
  loginUser,
  getMe,
  updateMe,
  updateProfileImage,
  resetPassword,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/reset-password', resetPassword);
router.get('/me', protect, getMe);
router.put('/update-me', protect, updateMe);
// router.put('/update-profile-image', protect, upload.single('profileImage'), updateProfileImage);

module.exports = router;
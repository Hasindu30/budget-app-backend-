const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const fs = require('fs');
const path = require('path');

const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '30d' }
  );
};

const registerUser = async (req, res) => {
  try {
    const { fullName, username, password } = req.body;

    if (!fullName || !username || !password) {
      return res.status(400).json({
        message: 'Full name, username and password are required.',
      });
    }

    const existingUser = await User.findOne({
      username: username.toLowerCase(),
    });

    if (existingUser) {
      return res.status(400).json({
        message: 'Username already exists.',
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      fullName,
      username: username.toLowerCase(),
      password: hashedPassword,
    });

    const token = generateToken(user._id);

    res.status(201).json({
      message: 'User registered successfully.',
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        username: user.username,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: 'Server error during registration.',
      error: error.message,
    });
  }
};

const loginUser = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        message: 'Username and password are required.',
      });
    }

    const user = await User.findOne({
      username: username.toLowerCase(),
    });

    if (!user) {
      return res.status(401).json({
        message: 'Invalid username or password.',
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        message: 'Invalid username or password.',
      });
    }

    const token = generateToken(user._id);

    res.status(200).json({
      message: 'Login successful.',
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        username: user.username,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: 'Server error during login.',
      error: error.message,
    });
  }
};

const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');

    if (!user) {
      return res.status(404).json({
        message: 'User not found.',
      });
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({
      message: 'Server error while fetching user.',
      error: error.message,
    });
  }
};

const updateMe = async (req, res) => {
  try {
    const { fullName, username } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        message: 'User not found.',
      });
    }

    if (username && username.toLowerCase() !== user.username) {
      const existingUser = await User.findOne({
        username: username.toLowerCase(),
      });

      if (existingUser) {
        return res.status(400).json({
          message: 'Username already exists.',
        });
      }
      user.username = username.toLowerCase();
    }

    if (fullName) {
      user.fullName = fullName;
    }

    await user.save();

    res.status(200).json({
      message: 'Profile updated successfully.',
      user: {
        id: user._id,
        fullName: user.fullName,
        username: user.username,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: 'Server error while updating user.',
      error: error.message,
    });
  }
};

const updateProfileImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: 'Please upload an image file.',
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        message: 'User not found.',
      });
    }

    // Optional: Delete old image if it exists
    if (user.profileImage) {
      const oldPath = path.join(__dirname, '../../', user.profileImage);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    user.profileImage = `uploads/profile/${req.file.filename}`;
    await user.save();

    res.status(200).json({
      message: 'Profile image updated successfully.',
      profileImage: user.profileImage,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Server error while updating profile image.',
      error: error.message,
    });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { username, newPassword } = req.body;

    if (!username || !newPassword) {
      return res.status(400).json({
        message: 'Username and new password are required.',
      });
    }

    const user = await User.findOne({ username: username.toLowerCase() });

    if (!user) {
      return res.status(404).json({
        message: 'Username incorrect.',
      });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.status(200).json({
      message: 'Password changed successfully.',
    });
  } catch (error) {
    res.status(500).json({
      message: 'Server error during password reset.',
      error: error.message,
    });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getMe,
  updateMe,
  updateProfileImage,
  resetPassword,
};
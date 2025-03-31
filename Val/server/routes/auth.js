import express from 'express';
import User from '../models/User.js';
import { generateToken } from '../middleware/auth.js';
import { validateRecaptcha } from '../middleware/recaptcha.js';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { sendPasswordResetEmail } from '../services/emailService.js';

const router = express.Router();

/**
 * Register a new admin user
 * Protected by admin code verification
 * @route POST /api/auth/register-admin
 */
router.post('/register-admin', async (req, res) => {
  try {
    const { username, email, password, adminCode } = req.body;

    // Verify admin code
    if (adminCode !== process.env.ADMIN_CODE) {
      return res.status(403).json({ message: 'Invalid admin code' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      if (existingUser.email === email) {
        return res.status(400).json({ message: 'Email already exists' });
      }
      return res.status(400).json({ message: 'Username already exists' });
    }

    // Create new admin user
    const user = new User({
      username,
      email,
      password,
      role: 'admin'
    });

    await user.save();

    // Create token
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({ token, user: { id: user._id, username: user.username, email: user.email, role: user.role } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * Register a new regular user
 * @route POST /api/auth/signup
 */
router.post('/signup', validateRecaptcha, async (req, res) => {
  try {
    console.log('\n--- Starting signup process ---');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    // Handle both name and username fields
    const username = req.body.username || req.body.name;
    const { email, password } = req.body;

    if (!username) {
      return res.status(400).json({ message: 'Username is required' });
    }

    // First check username separately
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      console.log('Username exists:', username);
      return res.status(400).json({ message: 'Username already exists' });
    }

    // Then check email separately
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      console.log('Email exists:', email);
      return res.status(400).json({ message: 'Email already exists' });
    }

    console.log('Creating new user document...');
    const user = new User({
      username,
      email,
      password,
      role: 'user'
    });
    console.log('User document created:', JSON.stringify(user.toObject(), null, 2));

    console.log('Attempting to save user...');
    const savedUser = await user.save();
    console.log('User saved successfully. ID:', savedUser._id);

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    console.log('JWT token generated');

    console.log('Sending success response...');
    res.status(201).json({ 
      token, 
      user: { 
        id: user._id, 
        username: user.username,
        email: user.email, 
        role: user.role,
        avatar: user.avatar
      } 
    });
    console.log('--- Signup process completed ---\n');
  } catch (error) {
    console.error('Error in signup process:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ message: error.message });
  }
});

/**
 * Login user and return JWT token
 * @route POST /api/auth/login
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find user by username
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    // Check password using the model's method
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Create token
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ 
      token, 
      user: { 
        id: user._id, 
        username: user.username,
        email: user.email,
        role: user.role,
        avatar: user.avatar
      } 
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'An error occurred during login' });
  }
});

/**
 * Sign out user by clearing the token cookie
 * @route POST /api/auth/signout
 */
router.post('/signout', (req, res) => {
  res.cookie('token', '', {
    httpOnly: true,
    expires: new Date(0)
  });
  res.json({ message: 'Signed out successfully' });
});

/**
 * Request password reset
 * Generates a reset token and sends it to user's email
 * @route POST /api/auth/forgot-password
 */
router.post('/forgot-password', async (req, res) => {
  try {
    console.log('Received password reset request for email:', req.body.email);
    
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email });

    // Always return success even if email doesn't exist (security best practice)
    if (!user) {
      console.log('No user found with email:', email);
      return res.json({ 
        message: 'If an account exists with this email, you will receive password reset instructions.' 
      });
    }

    console.log('Generating reset token for user:', user._id);
    
    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    user.resetPasswordExpires = Date.now() + 30 * 60 * 1000; // 30 minutes
    
    await user.save();
    console.log('Reset token saved for user:', user._id);

    try {
      // Send password reset email
      await sendPasswordResetEmail(email, resetToken);
      console.log('Password reset email sent successfully to:', email);
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
      // Reset the token since email failed
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();
      
      throw new Error('Failed to send password reset email');
    }

    res.json({ 
      message: 'If an account exists with this email, you will receive password reset instructions.' 
    });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ 
      message: 'An error occurred while processing your request. Please try again later.' 
    });
  }
});

/**
 * Reset password using reset token
 * @route POST /api/auth/reset-password/:token
 */
router.post('/reset-password/:token', async (req, res) => {
  try {
    const { password } = req.body;
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

export default router; 
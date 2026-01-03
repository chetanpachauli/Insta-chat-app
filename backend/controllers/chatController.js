const mongoose = require('mongoose');
const Message = require('../models/Message');
const User = require('../models/User');
const { v2: cloudinary } = require('cloudinary');
const multer = require('multer');

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
}).single('image');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Send message with optional image
exports.sendMessage = async (req, res) => {
  try {
    const { message } = req.body;
    let { receiverId } = req.body;
    const senderId = req.params.userId;
    
    // Validate receiverId
    if (!receiverId || receiverId === 'undefined' || !mongoose.Types.ObjectId.isValid(receiverId)) {
      console.error('Invalid receiverId:', { receiverId, isValid: mongoose.Types.ObjectId.isValid(receiverId) });
      return res.status(400).json({ 
        error: 'Valid receiver ID is required',
        received: receiverId
      });
    }

    // Validate senderId
    if (!mongoose.Types.ObjectId.isValid(senderId)) {
      console.error('Invalid senderId:', senderId);
      return res.status(400).json({ error: 'Invalid sender ID' });
    }

    let imageUrl = '';

    // Handle image upload if exists
    if (req.file) {
      try {
        const result = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            { 
              folder: 'chat-app',
              resource_type: 'auto'
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );
          
          uploadStream.end(req.file.buffer);
        });

        imageUrl = result.secure_url;
      } catch (uploadError) {
        console.error('Cloudinary upload error:', uploadError);
        return res.status(500).json({ error: 'Failed to upload image' });
      }
    }

    // Create new message
    const newMessage = new Message({
      senderId,
      receiverId,
      message: message || '',
      image: imageUrl,
      isSeen: false
    });

    await newMessage.save();

    // Populate sender info
    const populatedMessage = await Message.findById(newMessage._id)
      .populate('senderId', 'username profilePic')
      .populate('receiverId', 'username profilePic');

    // Emit socket event for real-time update
    if (req.app.get('io')) {
      const io = req.app.get('io');
      io.to(receiverId).emit('newMessage', populatedMessage);
      io.to(senderId).emit('newMessage', populatedMessage); // Also emit to sender
    }

    res.status(201).json({
      ...populatedMessage.toObject(),
      _id: populatedMessage._id.toString()
    });
  } catch (error) {
    console.error('Error in sendMessage:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
};

// Get messages between two users
exports.getMessages = async (req, res) => {
  try {
    const { userId, otherId } = req.params;
    
    const messages = await Message.find({
      $or: [
        { senderId: userId, receiverId: otherId },
        { senderId: otherId, receiverId: userId }
      ]
    })
    .sort({ createdAt: 1 })
    .populate('senderId', 'username profilePic')
    .populate('receiverId', 'username profilePic');

    res.json(messages || []);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Error fetching messages' });
  }
};

// Get users for sidebar
exports.getUsersForSidebar = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Get all users except the current user
    const users = await User.find({ _id: { $ne: userId } })
      .select('-password')
      .lean();

    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Error fetching users' });
  }
};

// Delete a message
exports.deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate message ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid message ID' });
    }

    const message = await Message.findById(id);

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Check if the user is the sender with proper ID comparison
    if (message.senderId.toString() !== String(req.user._id || req.user.id)) {
      return res.status(403).json({ error: 'Not authorized to delete this message' });
    }

    await Message.findByIdAndDelete(id);

    // Emit socket event for real-time delete
    if (req.app.get('io')) {
      req.app.get('io').to(message.receiverId.toString()).emit('messageDeleted', {
        messageId: id,
        senderId: message.senderId
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ error: 'Error deleting message' });
  }
};
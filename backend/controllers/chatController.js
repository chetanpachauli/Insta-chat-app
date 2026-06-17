const mongoose = require('mongoose');
const Message = require('../models/Message');
const User = require('../models/User');
const Conversation = require('../models/Conversation');
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
    const { message, conversationId } = req.body;
    let { receiverId } = req.body;
    const senderId = req.params.userId;

    // For group messages, resolve receiverId from conversation
    if (!receiverId || receiverId === 'undefined') {
      if (conversationId) {
        const conv = await Conversation.findById(conversationId);
        if (conv && conv.isGroup) {
          receiverId = conversationId;
        }
      }
    }

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
    let audioUrl = '';

    // Handle image upload if exists
    const imageFile = req.files?.image?.[0];
    if (imageFile) {
      try {
        const result = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            { folder: 'chat-app', resource_type: 'auto' },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );
          uploadStream.end(imageFile.buffer);
        });
        imageUrl = result.secure_url;
      } catch (uploadError) {
        console.error('Cloudinary image upload error:', uploadError);
        return res.status(500).json({ error: 'Failed to upload image' });
      }
    }

    // Handle audio upload if exists
    const audioFile = req.files?.audio?.[0];
    if (audioFile) {
      try {
        const result = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            { folder: 'chat-app', resource_type: 'video' },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );
          uploadStream.end(audioFile.buffer);
        });
        audioUrl = result.secure_url;
      } catch (uploadError) {
        console.error('Cloudinary audio upload error:', uploadError);
        return res.status(500).json({ error: 'Failed to upload audio' });
      }
    }

    // Create new message
    const newMessage = new Message({
      senderId,
      receiverId,
      message: message || '',
      image: imageUrl,
      audio: audioUrl,
      conversationId: conversationId || undefined,
      isSeen: false
    });

    await newMessage.save();

    // Update lastMessage on conversation
    if (conversationId) {
      await Conversation.findByIdAndUpdate(conversationId, { lastMessage: newMessage._id });
    } else {
      const conv = await Conversation.findOne({
        isGroup: false,
        participants: { $all: [senderId, receiverId], $size: 2 }
      });
      if (conv) {
        await Conversation.findByIdAndUpdate(conv._id, { lastMessage: newMessage._id });
      }
    }

    // Populate sender info
    const populatedMessage = await Message.findById(newMessage._id)
      .populate('senderId', 'username profilePic')
      .populate('receiverId', 'username profilePic');

    // Emit socket event for real-time update
    if (req.app.get('io')) {
      const io = req.app.get('io');
      const isGroup = conversationId && mongoose.Types.ObjectId.isValid(conversationId) &&
        await Conversation.exists({ _id: conversationId, isGroup: true });

      if (isGroup) {
        io.to(conversationId).emit('newGroupMessage', populatedMessage);
      } else {
        io.to(receiverId).emit('newMessage', populatedMessage);
        io.to(senderId).emit('newMessage', populatedMessage);
      }
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

// Get messages between two users or by conversationId
exports.getMessages = async (req, res) => {
  try {
    const { userId, otherId } = req.params;

    // Check if otherId is a group conversation
    const isGroup = mongoose.Types.ObjectId.isValid(otherId) &&
      await Conversation.exists({ _id: otherId, isGroup: true });

    let messages;
    if (isGroup) {
      messages = await Message.find({ conversationId: otherId })
        .sort({ createdAt: 1 })
        .populate('senderId', 'username profilePic')
        .populate('receiverId', 'username profilePic');
    } else {
      messages = await Message.find({
        conversationId: { $exists: false },
        $or: [
          { senderId: userId, receiverId: otherId },
          { senderId: otherId, receiverId: userId }
        ]
      })
      .sort({ createdAt: 1 })
      .populate('senderId', 'username profilePic')
      .populate('receiverId', 'username profilePic');
    }

    res.json(messages || []);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Error fetching messages' });
  }
};

// Get users for sidebar (includes group conversations)
exports.getUsersForSidebar = async (req, res) => {
  try {
    const { userId } = req.params;

    const users = await User.find({ _id: { $ne: userId } })
      .select('-password')
      .lean();

    const groups = await Conversation.find({ participants: userId, isGroup: true })
      .populate('participants', 'username profilePic')
      .populate('lastMessage')
      .lean();

    res.json([...users, ...groups]);
  } catch (error) {
    console.error('Error fetching sidebar data:', error);
    res.status(500).json({ error: 'Error fetching sidebar data' });
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

// Mark messages as seen
exports.markSeen = async (req, res) => {
  try {
    const userId = req.user.id;
    const { otherId } = req.params;

    await Message.updateMany(
      { senderId: otherId, receiverId: userId, isSeen: false },
      { $set: { isSeen: true } }
    );

    if (req.app.get('io')) {
      const io = req.app.get('io');
      io.to(otherId).emit('messageSeen', { seenBy: userId, chatId: otherId });
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.toggleReaction = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.user.id;

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ error: 'Message not found' });

    const existingIdx = message.reactions.findIndex(
      r => String(r.userId) === String(userId) && r.emoji === emoji
    );

    if (existingIdx > -1) {
      message.reactions.splice(existingIdx, 1);
    } else {
      message.reactions = message.reactions.filter(r => String(r.userId) !== String(userId));
      message.reactions.push({ emoji, userId });
    }

    await message.save();
    res.json(message.reactions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
const Conversation = require('../models/Conversation');

exports.createConversation = async (req, res) => {
  try {
    const { participants, isGroup, groupName, groupPic } = req.body;
    const userId = req.user.id;

    if (!participants || participants.length < 1) {
      return res.status(400).json({ error: 'At least one participant is required' });
    }

    let allParticipants;
    if (isGroup) {
      allParticipants = [...new Set([...participants, userId])];
    } else {
      allParticipants = [userId, participants[0]];
    }

    if (!isGroup) {
      const existing = await Conversation.findOne({
        isGroup: false,
        participants: { $all: allParticipants, $size: 2 }
      });
      if (existing) return res.json(existing);
    }

    const conversation = await Conversation.create({
      participants: allParticipants,
      isGroup: isGroup || false,
      groupName: groupName || '',
      groupPic: groupPic || '',
      createdBy: userId
    });

    const populated = await Conversation.findById(conversation._id)
      .populate('participants', 'username profilePic')
      .populate('lastMessage');

    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getConversations = async (req, res) => {
  try {
    const userId = req.user.id;
    const conversations = await Conversation.find({ participants: userId })
      .populate('participants', 'username profilePic')
      .populate('lastMessage')
      .sort({ updatedAt: -1 });

    res.json(conversations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getConversation = async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id)
      .populate('participants', 'username profilePic')
      .populate('lastMessage');

    if (!conversation) return res.status(404).json({ error: 'Conversation not found' });

    if (!conversation.participants.some(p => String(p._id) === String(req.user.id))) {
      return res.status(403).json({ error: 'Not a participant' });
    }

    res.json(conversation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.addParticipant = async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) return res.status(404).json({ error: 'Conversation not found' });
    if (!conversation.isGroup) return res.status(400).json({ error: 'Not a group conversation' });

    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'User ID is required' });

    if (conversation.participants.some(p => String(p) === String(userId))) {
      return res.status(400).json({ error: 'User already a participant' });
    }

    conversation.participants.push(userId);
    await conversation.save();

    const populated = await Conversation.findById(conversation._id)
      .populate('participants', 'username profilePic')
      .populate('lastMessage');

    res.json(populated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.removeParticipant = async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) return res.status(404).json({ error: 'Conversation not found' });
    if (!conversation.isGroup) return res.status(400).json({ error: 'Not a group conversation' });
    if (String(conversation.createdBy) !== String(req.user.id)) {
      return res.status(403).json({ error: 'Only the creator can remove participants' });
    }

    const { userId } = req.params;
    if (String(userId) === String(conversation.createdBy)) {
      return res.status(400).json({ error: 'Cannot remove the creator' });
    }

    conversation.participants = conversation.participants.filter(
      p => String(p) !== String(userId)
    );
    await conversation.save();

    const populated = await Conversation.findById(conversation._id)
      .populate('participants', 'username profilePic')
      .populate('lastMessage');

    res.json(populated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

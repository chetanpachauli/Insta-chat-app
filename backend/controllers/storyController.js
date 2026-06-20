const Story = require('../models/Story');
const User = require('../models/User');

exports.createStory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { image, closeFriendsOnly, songName, songArtist, songUrl } = req.body;
    if (!image) return res.status(400).json({ message: 'Image is required' });

    const story = await Story.create({
      author: userId,
      image,
      closeFriendsOnly: closeFriendsOnly || false,
      songName,
      songArtist,
      songUrl,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    });
    res.status(201).json(story);
  } catch (err) { res.status(500).json({ message: err.message || 'Server error' }); }
};

exports.getStories = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const allStories = await Story.find({
      $or: [
        { expiresAt: { $gt: new Date() } },
        { expiresAt: { $exists: false } }
      ]
    })
      .populate('author', 'username profilePic closeFriends')
      .sort('-createdAt');

    // Filter close friends stories
    const stories = allStories.filter(s => {
      if (s.closeFriendsOnly) {
        // Logged in user can view if they are the author or are in the author's close friends list
        const authorCloseFriends = (s.author?.closeFriends || []).map(id => String(id));
        return String(s.author?._id || s.author?.id) === String(userId) || authorCloseFriends.includes(String(userId));
      }
      return true;
    });

    const grouped = {};
    stories.forEach(s => {
      if (!s.author) return;
      const authorId = s.author._id.toString();
      if (!grouped[authorId]) {
        grouped[authorId] = {
          user: {
            _id: s.author._id,
            username: s.author.username,
            profilePic: s.author.profilePic
          },
          stories: []
        };
      }
      grouped[authorId].stories.push(s);
    });

    res.json(Object.values(grouped));
  } catch (err) { res.status(500).json({ message: err.message || 'Server error' }); }
};

exports.getStoryViews = async (req, res) => {
  try {
    const { storyId } = req.params;
    const story = await Story.findById(storyId)
      .populate('viewedBy', 'username profilePic');
    if (!story) return res.status(404).json({ message: 'Story not found' });
    res.json(story.viewedBy);
  } catch (err) { res.status(500).json({ message: err.message || 'Server error' }); }
};

exports.viewStory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { storyId } = req.params;

    const story = await Story.findById(storyId);
    if (!story) return res.status(404).json({ message: 'Story not found' });

    if (!story.viewedBy.some(id => String(id) === String(userId))) {
      story.viewedBy.push(userId);
      await story.save();
    }

    res.json(story);
  } catch (err) { res.status(500).json({ message: err.message || 'Server error' }); }
};

exports.deleteStory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { storyId } = req.params;

    const story = await Story.findById(storyId);
    if (!story) return res.status(404).json({ message: 'Story not found' });
    if (String(story.author) !== String(userId)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await Story.deleteOne({ _id: storyId });
    res.json({ message: 'Story deleted' });
  } catch (err) { res.status(500).json({ message: err.message || 'Server error' }); }
};

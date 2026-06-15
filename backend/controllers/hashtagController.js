const Post = require('../models/Post');

exports.getTrending = async (req, res) => {
  try {
    const trending = await Post.aggregate([
      { $unwind: '$tags' },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 20 },
      { $project: { tag: '$_id', count: 1, _id: 0 } }
    ]);
    res.json(trending);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.searchPosts = async (req, res) => {
  try {
    const { tag } = req.params;
    if (!tag) return res.status(400).json({ error: 'Tag parameter is required' });

    const posts = await Post.find({ tags: tag.toLowerCase() })
      .populate('author', 'username profilePic')
      .sort({ createdAt: -1 });

    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

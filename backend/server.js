require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const cookieParser = require('cookie-parser');

// Optional security / logging (only if installed)
let helmet, morgan;
try { helmet = require('helmet'); app.use(helmet()); } catch (e) {}
try { morgan = require('morgan'); app.use(morgan('dev')); } catch (e) {}

app.use(express.json());
app.use(cookieParser());

// Define allowed origins
const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.CLIENT_URL,
  'https://insta-chat-app-five.vercel.app',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000'
].filter(Boolean); // Remove any falsy values

// Helper to validate origin (allows exact matches, localhost, and Vercel domains)
const isOriginAllowed = (origin) => {
  if (!origin) return true;
  return allowedOrigins.includes(origin) || 
         origin.endsWith('.vercel.app') || 
         origin.startsWith('http://localhost:');
};

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    
    if (!isOriginAllowed(origin)) {
      console.warn(`CORS blocked request from origin: ${origin}`);
      const msg = `The CORS policy for this site does not allow access from origin: ${origin}`;
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Socket-ID'],
  credentials: true,
  optionsSuccessStatus: 204
};

// Apply CORS middleware to all routes
app.use(cors(corsOptions));

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('Missing MONGO_URI in environment');
  process.exit(1);
}

mongoose
  .connect(MONGO_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch((err) => {
    console.error('MongoDB connection error:', err.message || err);
    process.exit(1);
  });

// Routes will be mounted below
const server = http.createServer(app);

// Enhanced Socket.io configuration with CORS and additional options
const io = new Server(server, {
  cors: {
    origin: function(origin, callback) {
      if (!origin) return callback(null, true);
      
      if (isOriginAllowed(origin)) {
        return callback(null, true);
      }
      console.warn(`Socket.io CORS blocked connection from origin: ${origin}`);
      return callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Socket-ID'],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 10000,
  pingInterval: 5000,
  cookie: false
});

// Track connected users
const userSocketMap = {}; // userId -> socketId
const socketUserMap = {};  // socketId -> userId

// Registry to track active group calling rooms: conversationId -> Array of { userId, socketId, username, profilePic }
const activeGroupCalls = {};

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  connections.add(socket.id);
  
  // Handle user authentication
  socket.on('addUser', (userData) => {
    const userId = userData?.userId || userData;
    if (userId) {
      const userIdStr = String(userId);
      socket.join(userIdStr); // Join the userId room!
      userSocketMap[userIdStr] = socket.id;
      socketUserMap[socket.id] = userIdStr;
      console.log(`User ${userIdStr} connected with socket ${socket.id} (joined room)`);
      
      // Notify all clients about online users
      io.emit('getOnlineUsers', Object.keys(userSocketMap));
    }
  });

  // Handle new message
  socket.on('sendMessage', async (data) => {
    try {
      const senderIdObj = data.senderId;
      const receiverIdObj = data.receiverId;
      
      const senderId = String(senderIdObj?._id || senderIdObj?.id || senderIdObj);
      const receiverId = String(receiverIdObj?._id || receiverIdObj?.id || receiverIdObj);
      
      const { message, image, audio } = data;
      
      const messageData = {
        ...data,
        senderId,
        receiverId,
        message: message || '',
        image: image || null,
        audio: audio || '',
        createdAt: data.createdAt || new Date()
      };

      // Forward to receiver (via user ID room)
      io.to(receiverId).emit('newMessage', messageData);
      
      // Also send back to sender (via user ID room) for other sessions/tabs
      io.to(senderId).emit('newMessage', messageData);
    } catch (error) {
      console.error('Error handling sendMessage:', error);
    }
  });

  // Handle typing indicators (supports { from, to } and { chatId, userId })
  socket.on('typing', (data) => {
    const from = String(data.from || data.userId || '');
    const to = String(data.to || data.chatId || '');
    if (to) {
      io.to(to).emit('typing', { from, chatId: from, userId: from });
    }
  });

  socket.on('stopTyping', (data) => {
    const from = String(data.from || data.userId || '');
    const to = String(data.to || data.chatId || '');
    if (to) {
      io.to(to).emit('stopTyping', { from, chatId: from, userId: from });
    }
  });

  // Handle message deletion
  socket.on('deleteMessage', ({ messageId, senderId, receiverId }) => {
    const receiverIdStr = String(receiverId?._id || receiverId?.id || receiverId || '');
    const senderIdStr = String(senderId?._id || senderId?.id || senderId || '');
    if (receiverIdStr) {
      io.to(receiverIdStr).emit('messageDeleted', { messageId, senderId: senderIdStr });
    }
  });

  // Handle mark seen
  socket.on('markSeen', ({ userId, otherId }) => {
    const otherIdStr = String(otherId?._id || otherId?.id || otherId || '');
    const userIdStr = String(userId?._id || userId?.id || userId || '');
    if (otherIdStr) {
      io.to(otherIdStr).emit('messageSeen', { seenBy: userIdStr, chatId: otherIdStr });
    }
  });

  // Group chat events
  socket.on('joinConversation', (conversationId) => {
    socket.join(conversationId);
    console.log(`Socket ${socket.id} joined conversation ${conversationId}`);
  });

  socket.on('leaveConversation', (conversationId) => {
    socket.leave(conversationId);
    console.log(`Socket ${socket.id} left conversation ${conversationId}`);
  });

  socket.on('sendGroupMessage', (data) => {
    const { conversationId, senderId, message, image, createdAt } = data;
    io.to(conversationId).emit('newGroupMessage', {
      senderId, message, image, conversationId, createdAt: createdAt || new Date()
    });
  });

  socket.on('groupTyping', ({ conversationId, from }) => {
    socket.to(conversationId).emit('groupTyping', { from, conversationId });
  });

  socket.on('groupStopTyping', ({ conversationId, from }) => {
    socket.to(conversationId).emit('groupStopTyping', { from, conversationId });
  });

  // WebRTC Calling signaling
  socket.on('callUser', (data) => {
    const { userToCall, signalData, from, fromUser, type } = data;
    const receiverId = String(userToCall?._id || userToCall?.id || userToCall);
    const receiverSocketId = userSocketMap[receiverId];
    if (receiverSocketId) {
      console.log(`Forwarding call from ${from} to user ${receiverId} (Room: ${receiverId})`);
      io.to(receiverId).emit('incomingCall', {
        signal: signalData,
        from,
        fromUser,
        type
      });
    } else {
      console.log(`Call failed: User ${receiverId} is offline`);
      socket.emit('callOffline', { to: receiverId });
    }
  });

  socket.on('answerCall', (data) => {
    const { to, signal } = data;
    const callerId = String(to?._id || to?.id || to);
    console.log(`Forwarding call answer to user ${callerId}`);
    io.to(callerId).emit('callAccepted', { signal });
  });

  socket.on('iceCandidate', (data) => {
    const { to, candidate } = data;
    const recipientId = String(to?._id || to?.id || to);
    io.to(recipientId).emit('iceCandidate', { candidate });
  });

  socket.on('rejectCall', (data) => {
    const { to } = data;
    const callerId = String(to?._id || to?.id || to);
    console.log(`Forwarding call reject to user ${callerId}`);
    io.to(callerId).emit('callRejected');
  });

  socket.on('endCall', (data) => {
    const { to } = data;
    const otherId = String(to?._id || to?.id || to);
    console.log(`Forwarding call end to user ${otherId}`);
    io.to(otherId).emit('callEnded');
  });

  socket.on('cancelCall', (data) => {
    const { to } = data;
    const receiverId = String(to?._id || to?.id || to);
    console.log(`Forwarding call cancel to user ${receiverId}`);
    io.to(receiverId).emit('callCancelled');
  });

  socket.on('busyCall', (data) => {
    const { to } = data;
    const callerId = String(to?._id || to?.id || to);
    console.log(`Forwarding call busy to user ${callerId}`);
    io.to(callerId).emit('callBusy');
  });

  // Group Call signaling events
  socket.on('joinGroupCall', (data) => {
    const { conversationId, user } = data;
    if (!conversationId || !user) return;
    
    const callRoomName = `group-call-${conversationId}`;
    socket.join(callRoomName);
    
    if (!activeGroupCalls[conversationId]) {
      activeGroupCalls[conversationId] = [];
    }
    
    // Add participant if not already present
    if (!activeGroupCalls[conversationId].some(p => p.socketId === socket.id)) {
      activeGroupCalls[conversationId].push({
        socketId: socket.id,
        userId: user._id || user.id,
        username: user.username,
        profilePic: user.profilePic
      });
    }
    
    console.log(`User ${user.username} joined group call ${conversationId}`);
    
    // Notify others in room
    socket.to(callRoomName).emit('userJoinedGroupCall', {
      socketId: socket.id,
      userId: user._id || user.id,
      user
    });
    
    // Send back current list of participants to the caller
    const otherParticipants = activeGroupCalls[conversationId].filter(p => p.socketId !== socket.id);
    socket.emit('groupCallParticipants', otherParticipants);
  });

  socket.on('inviteGroupCall', (data) => {
    const { conversationId, participants, fromUser, type, groupName } = data;
    if (!conversationId || !participants) return;
    
    participants.forEach(p => {
      const pId = p._id || p.id || p;
      // Do not send invite to self
      if (String(pId) !== String(socketUserMap[socket.id])) {
        const targetSocketId = userSocketMap[pId];
        if (targetSocketId) {
          console.log(`Sending incomingGroupCall invite for room ${conversationId} to user ${pId} (Room: ${pId})`);
          io.to(String(pId)).emit('incomingGroupCall', {
            conversationId,
            fromUser,
            type,
            groupName
          });
        }
      }
    });
  });

  socket.on('groupCallOffer', (data) => {
    const { to, signal, fromUserId, fromUser } = data;
    console.log(`Relaying groupCallOffer from ${socket.id} to ${to}`);
    io.to(to).emit('groupCallOffer', {
      fromSocketId: socket.id,
      fromUserId,
      fromUser,
      signal
    });
  });

  socket.on('groupCallAnswer', (data) => {
    const { to, signal } = data;
    console.log(`Relaying groupCallAnswer from ${socket.id} to ${to}`);
    io.to(to).emit('groupCallAnswer', {
      fromSocketId: socket.id,
      signal
    });
  });

  socket.on('groupCallIceCandidate', (data) => {
    const { to, candidate } = data;
    io.to(to).emit('groupCallIceCandidate', {
      fromSocketId: socket.id,
      candidate
    });
  });

  socket.on('leaveGroupCall', (data) => {
    const { conversationId } = data;
    if (!conversationId) return;
    
    const callRoomName = `group-call-${conversationId}`;
    socket.leave(callRoomName);
    
    if (activeGroupCalls[conversationId]) {
      activeGroupCalls[conversationId] = activeGroupCalls[conversationId].filter(p => p.socketId !== socket.id);
      console.log(`User left group call ${conversationId}. Remaining: ${activeGroupCalls[conversationId].length}`);
      
      // Notify others
      socket.to(callRoomName).emit('userLeftGroupCall', {
        socketId: socket.id,
        userId: socketUserMap[socket.id]
      });
      
      if (activeGroupCalls[conversationId].length === 0) {
        delete activeGroupCalls[conversationId];
      }
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    connections.delete(socket.id);
    
    // Automatically remove user from any active group calls they were in
    for (const conversationId in activeGroupCalls) {
      if (activeGroupCalls[conversationId].some(p => p.socketId === socket.id)) {
        activeGroupCalls[conversationId] = activeGroupCalls[conversationId].filter(p => p.socketId !== socket.id);
        const callRoomName = `group-call-${conversationId}`;
        socket.to(callRoomName).emit('userLeftGroupCall', {
          socketId: socket.id,
          userId: socketUserMap[socket.id]
        });
        
        if (activeGroupCalls[conversationId].length === 0) {
          delete activeGroupCalls[conversationId];
        }
      }
    }

    const userId = socketUserMap[socket.id];
    if (userId) {
      delete userSocketMap[userId];
      delete socketUserMap[socket.id];
      // Notify all clients about online users
      io.emit('getOnlineUsers', Object.keys(userSocketMap));
    }
  });

  // Handle errors
  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
});

// Track active connections
const connections = new Set();

// Log connection stats periodically
setInterval(() => {
  console.log(`Active connections: ${connections.size}`);
}, 60000); // Log every minute

// initialize socket manager that tracks online users
const socketManager = require('./socket');
socketManager.initSocket(io);



// Mount API routes
try { app.use('/api/auth', require('./routes/authRoutes')); } catch (e) { console.warn('Auth routes not mounted:', e.message); }
try { app.use('/api/messages', require('./routes/messageRoutes')); } catch (e) { console.warn('Message routes not mounted:', e.message); }
try { app.use('/api/profile', require('./routes/profileRoutes')); } catch (e) { console.warn('Profile routes not mounted:', e.message); }
try { app.use('/api/posts', require('./routes/postRoutes')); } catch (e) { console.warn('Post routes not mounted:', e.message); }
try { app.use('/api/notifications', require('./routes/notificationRoutes')); } catch (e) { console.warn('Notification routes not mounted:', e.message); }
try { app.use('/api/stories', require('./routes/storyRoutes')); } catch (e) { console.warn('Story routes not mounted:', e.message); }
try { app.use('/api/hashtags', require('./routes/hashtagRoutes')); } catch (e) { console.warn('Hashtag routes not mounted:', e.message); }
try { app.use('/api/conversations', require('./routes/conversationRoutes')); } catch (e) { console.warn('Conversation routes not mounted:', e.message); }
try { app.use('/api/push', require('./routes/pushRoutes')); } catch (e) { console.warn('Push routes not mounted:', e.message); }

// Healthcheck
app.get('/', (req, res) => res.send('MERN chat backend is running'));
app.get('/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({ message: 'Not Found' });
});

// error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || 'Internal Server Error' });
});

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

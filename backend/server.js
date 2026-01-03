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

const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';

// CORS configuration - Simplified to fix the crash
const corsOptions = {
  origin: FRONTEND_ORIGIN,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Socket-ID'],
  credentials: true,
  optionsSuccessStatus: 204
};

// Apply CORS middleware to all routes
app.use(cors(corsOptions));

// Explicitly handle preflight for all routes
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Origin', FRONTEND_ORIGIN);
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-Socket-ID');
    res.header('Access-Control-Allow-Credentials', 'true');
    return res.status(204).end();
  }
  next();
});

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
    origin: FRONTEND_ORIGIN,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 10000,
  pingInterval: 5000,
  cookie: false
});

// Track connected users
const userSocketMap = {}; // userId -> socketId
const socketUserMap = {};  // socketId -> userId

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  connections.add(socket.id);
  
  // Handle user authentication
  socket.on('addUser', (userData) => {
    const userId = userData.userId;
    if (userId) {
      userSocketMap[userId] = socket.id;
      socketUserMap[socket.id] = userId;
      console.log(`User ${userId} connected with socket ${socket.id}`);
      
      // Notify all clients about online users
      io.emit('getOnlineUsers', Object.keys(userSocketMap));
    }
  });

  // Handle new message
  socket.on('sendMessage', async (data) => {
    try {
      const { senderId, receiverId, message, image } = data;
      
      // Save message to database (handled by API)
      // Just forward the message to the recipient
      const receiverSocketId = userSocketMap[receiverId];
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('newMessage', {
          senderId,
          receiverId,
          message,
          image,
          createdAt: new Date()
        });
      }
      
      // Also send back to sender for UI update
      const senderSocketId = userSocketMap[senderId];
      if (senderSocketId && senderSocketId !== receiverSocketId) {
        io.to(senderSocketId).emit('newMessage', {
          senderId,
          receiverId,
          message,
          image,
          createdAt: new Date()
        });
      }
    } catch (error) {
      console.error('Error handling sendMessage:', error);
    }
  });

  // Handle typing indicators
  socket.on('typing', ({ from, to }) => {
    const toSocketId = userSocketMap[to];
    if (toSocketId) {
      io.to(toSocketId).emit('typing', { from });
    }
  });

  socket.on('stopTyping', ({ from, to }) => {
    const toSocketId = userSocketMap[to];
    if (toSocketId) {
      io.to(toSocketId).emit('stopTyping', { from });
    }
  });

  // Handle message deletion
  socket.on('deleteMessage', ({ messageId, senderId, receiverId }) => {
    const receiverSocketId = userSocketMap[receiverId];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('messageDeleted', { messageId, senderId });
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    connections.delete(socket.id);
    const userId = socketUserMap[socket.id];
    if (userId) {
      delete userSocketMap[userId];
      delete socketUserMap[socket.id];
      // Notify all clients about updated online users
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

// basic connection logging
io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);
});

// Mount API routes
try { app.use('/api/auth', require('./routes/authRoutes')); } catch (e) { console.warn('Auth routes not mounted:', e.message); }
try { app.use('/api/messages', require('./routes/messageRoutes')); } catch (e) { console.warn('Message routes not mounted:', e.message); }
try { app.use('/api/profile', require('./routes/profileRoutes')); } catch (e) { console.warn('Profile routes not mounted:', e.message); }
try { app.use('/api/posts', require('./routes/postRoutes')); } catch (e) { console.warn('Post routes not mounted:', e.message); }
try { app.use('/api/notifications', require('./routes/notificationRoutes')); } catch (e) { console.warn('Notification routes not mounted:', e.message); }

// Healthcheck
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

app.get('/', (req, res) => res.send('MERN chat backend is running'));

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

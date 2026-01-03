let ioInstance = null;
const onlineMap = new Map(); // userId -> socketId

function initSocket(io) {
  ioInstance = io;

  io.on('connection', (socket) => {
    console.log('New socket connection:', socket.id);
    
    // Handle user connection
    socket.on('addUser', (data) => {
      const userId = data?.userId || data;
      console.log('User connected - userId:', userId, 'socketId:', socket.id);
      
      if (userId) {
        const userIdStr = String(userId);
        onlineMap.set(userIdStr, socket.id);
        console.log('Updated online users:', Array.from(onlineMap.keys()));
        // broadcast updated online users
        io.emit('getOnlineUsers', Array.from(onlineMap.keys()));
      }
    });

    // typing indicator: { to, from }
    socket.on('typing', ({ to, from }) => {
      const toSocket = onlineMap.get(String(to))
      if (toSocket) io.to(toSocket).emit('typing', { from })
    })

    socket.on('stopTyping', ({ to, from }) => {
      const toSocket = onlineMap.get(String(to))
      if (toSocket) io.to(toSocket).emit('stopTyping', { from })
    })

    // message delete notification
    socket.on('deleteMessage', ({ to, messageId }) => {
      const toSocket = onlineMap.get(String(to))
      if (toSocket) io.to(toSocket).emit('deleteMessage', { messageId })
    })

    socket.on('disconnect', () => {
      // remove any entries that match this socket id
      for (const [userId, sId] of onlineMap.entries()) {
        if (sId === socket.id) onlineMap.delete(userId);
      }
      // broadcast updated online users
      io.emit('getOnlineUsers', Array.from(onlineMap.keys()));
    });
  });
}

function getIo() {
  return ioInstance;
}

function getSocketId(userId) {
  return onlineMap.get(String(userId)) || null;
}

function getOnlineMap() {
  return onlineMap;
}

module.exports = { initSocket, getIo, getSocketId, getOnlineMap };

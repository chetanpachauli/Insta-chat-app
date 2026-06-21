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
        socket.join(userIdStr); // Join the userId room!
        onlineMap.set(userIdStr, socket.id);
        console.log('Updated online users:', Array.from(onlineMap.keys()));
        // broadcast updated online users
        io.emit('getOnlineUsers', Array.from(onlineMap.keys()));
      }
    });

    // typing indicator: supports { to, from } and { chatId, userId }
    socket.on('typing', (data) => {
      const to = String(data.to || data.chatId || '');
      const from = String(data.from || data.userId || '');
      const toSocket = onlineMap.get(to)
      if (toSocket) io.to(toSocket).emit('typing', { from, chatId: from, userId: from })
    })

    socket.on('stopTyping', (data) => {
      const to = String(data.to || data.chatId || '');
      const from = String(data.from || data.userId || '');
      const toSocket = onlineMap.get(to)
      if (toSocket) io.to(toSocket).emit('stopTyping', { from, chatId: from, userId: from })
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

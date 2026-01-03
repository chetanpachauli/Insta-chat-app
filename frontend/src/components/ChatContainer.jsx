import React from 'react';
import ChatWindow from './ChatWindow';
import { ChatContext } from '../context/ChatContext';
import { AuthContext } from '../context/AuthContext';

export default function ChatContainer() {
  const chat = React.useContext(ChatContext);
  const auth = React.useContext(AuthContext);

  return (
    <ChatWindow 
      chat={chat} 
      auth={auth} 
    />
  );
}
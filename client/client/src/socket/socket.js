// socket.js - Clean, advanced, debugged Socket.io client setup

import { io } from 'socket.io-client';
import { useEffect, useState } from 'react';

// Socket.io connection URL
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

// Create socket instance
export const socket = io(SOCKET_URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

// Custom hook for using socket.io
export const useSocket = () => {
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [lastMessage, setLastMessage] = useState(null);
  const initialMessages = JSON.parse(localStorage.getItem("chatMessages")) || [];
  const [messages, setMessages] = useState(initialMessages);
  const [users, setUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);

  // Retrieve username from localStorage
  const username = localStorage.getItem("username");

  // Connect to socket server
  const connect = (username) => {
    socket.connect();
    if (username) {
      localStorage.setItem("username", username);
      socket.emit('user_join', username);
    }
  };

  const disconnect = () => {
    socket.disconnect();
  };

  const clearChatHistory = () => {
    localStorage.removeItem("chatMessages");
    setMessages([]);
  };

  const sendMessage = (message) => {
    socket.emit('send_message', { message });
  };

  const sendPrivateMessage = (to, message) => {
    socket.emit('private_message', { to, message });
  };

  const setTyping = (isTyping) => {
    socket.emit('typing', isTyping);
  };

  const markMessageAsRead = (messageId) => {
    if (username) {
      socket.emit('message_read', { messageId, username });
    }
  };

  const markAsSeen = (messageId) => {
    if (username) {
      socket.emit('mark_seen', { messageId, username });
    }
  };

  const pinMessage = (messageId) => {
    socket.emit('pin_message', messageId);
  };

  const sendAdminBroadcast = (message) => {
    socket.emit('admin_broadcast', { message });
  };

  // Update local messages and persist
  const updateMessages = (message) => {
    setMessages((prev) => {
      const updated = [...prev, message];
      localStorage.setItem("chatMessages", JSON.stringify(updated));
      return updated;
    });
  };

  useEffect(() => {
    // Socket event handlers
    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    const onReceiveMessage = (message) => {
      setLastMessage(message);
      updateMessages(message);
    };

    const onPrivateMessage = (message) => {
      setLastMessage(message);
      updateMessages(message);
    };

    const onUserList = (userList) => setUsers(userList);

    const onUserJoined = (user) => {
      const systemMessage = {
        id: Date.now(),
        system: true,
        message: `${user.username} joined the chat`,
        timestamp: new Date().toISOString(),
      };
      updateMessages(systemMessage);
    };

    const onUserLeft = (user) => {
      const systemMessage = {
        id: Date.now(),
        system: true,
        message: `${user.username} left the chat`,
        timestamp: new Date().toISOString(),
      };
      updateMessages(systemMessage);
    };

    const onTypingUsers = (typingUsers) => setTypingUsers(typingUsers);

    const onMessageRead = ({ messageId, username }) => {
      setMessages((prev) => {
        const updated = prev.map((msg) =>
          msg.id === messageId
            ? { ...msg, readBy: [...(msg.readBy || []), username] }
            : msg
        );
        localStorage.setItem("chatMessages", JSON.stringify(updated));
        return updated;
      });
    };

    const onMessageSeen = ({ messageId, username }) => {
      setMessages((prev) => {
        const updated = prev.map((msg) =>
          msg.id === messageId
            ? { ...msg, seenBy: [...(msg.seenBy || []), username] }
            : msg
        );
        localStorage.setItem("chatMessages", JSON.stringify(updated));
        return updated;
      });
    };

    const onAdminBroadcast = (data) => {
      const broadcastMessage = {
        id: Date.now(),
        system: true,
        broadcast: true,
        message: `[Broadcast] ${data.message}`,
        timestamp: new Date().toISOString(),
      };
      updateMessages(broadcastMessage);
    };

    const onMessagePinned = ({ messageId }) => {
      setMessages((prev) => {
        const updated = prev.map((msg) => ({
          ...msg,
          pinned: msg.id === messageId,
        }));
        localStorage.setItem("chatMessages", JSON.stringify(updated));
        return updated;
      });
    };

    // Register event listeners
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('receive_message', onReceiveMessage);
    socket.on('private_message', onPrivateMessage);
    socket.on('user_list', onUserList);
    socket.on('user_joined', onUserJoined);
    socket.on('user_left', onUserLeft);
    socket.on('typing_users', onTypingUsers);
    socket.on('message_read', onMessageRead);
    socket.on('message_seen', onMessageSeen);
    socket.on('admin_broadcast', onAdminBroadcast);
    socket.on('message_pinned', onMessagePinned);

    // Cleanup on unmount
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('receive_message', onReceiveMessage);
      socket.off('private_message', onPrivateMessage);
      socket.off('user_list', onUserList);
      socket.off('user_joined', onUserJoined);
      socket.off('user_left', onUserLeft);
      socket.off('typing_users', onTypingUsers);
      socket.off('message_read', onMessageRead);
      socket.off('message_seen', onMessageSeen);
      socket.off('admin_broadcast', onAdminBroadcast);
      socket.off('message_pinned', onMessagePinned);
    };
  }, [username]); // Ensure it updates if username changes

  return {
    socket,
    isConnected,
    lastMessage,
    messages,
    users,
    typingUsers,
    connect,
    disconnect,
    sendMessage,
    sendPrivateMessage,
    setTyping,
    markMessageAsRead,
    markAsSeen,
    pinMessage,
    sendAdminBroadcast,
    clearChatHistory,
  };
};

export default socket;

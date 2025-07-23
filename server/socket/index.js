import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../socket/socket";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const Chat = () => {
  const [input, setInput] = useState("");
  const [file, setFile] = useState(null);
  const [recipient, setRecipient] = useState("");
  const { username } = useAuth();
  const {
    socket,
    messages,
    sendMessage,
    sendPrivateMessage,
    typingUsers,
    setTyping,
    users,
    markMessageAsRead,
  } = useSocket();

  // Auto-scroll to latest message
  useEffect(() => {
    const container = document.querySelector(".messages-container");
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages]);

  // Mark messages as read when they appear
  useEffect(() => {
    messages.forEach((msg) => {
      if (!msg.readBy?.includes(username)) {
        markMessageAsRead(msg.id);
      }
    });
  }, [messages, username, markMessageAsRead]);

  // Handle reaction events
  useEffect(() => {
    const onReactionAdded = ({ messageId, reaction, username }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? {
                ...msg,
                reactions: [...(msg.reactions || []), { reaction, username }],
              }
            : msg
        )
      );
    };

    socket.on("reaction_added", onReactionAdded);

    return () => {
      socket.off("reaction_added", onReactionAdded);
    };
  }, [socket]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() && !file) return;

    let messageContent = input.trim();

    if (file) {
      const formData = new FormData();
      formData.append("file", file);

      try {
        const res = await fetch("http://localhost:5000/upload", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        messageContent = data.fileUrl;
      } catch (error) {
        console.error("Upload failed", error);
        return;
      }

      setFile(null);
    }

    if (recipient.trim()) {
      sendPrivateMessage(recipient.trim(), messageContent);
    } else {
      sendMessage(messageContent);
    }

    setInput("");
    setTyping(false);
  };

  const handleTyping = (e) => {
    setInput(e.target.value);
    setTyping(e.target.value.length > 0);
  };

  const addReaction = (messageId, reaction) => {
    socket.emit("add_reaction", { messageId, reaction, username });
  };

  // Common reactions for quick access
  const quickReactions = ["👍", "❤️", "😂", "😮", "😢"];

  return (
    <div className="flex flex-col min-h-screen bg-gray-100 p-4">
      {/* Online Users Display */}
      <div className="flex flex-wrap gap-2 mb-2">
        {users.map((user) => (
          <div
            key={user.id}
            className="flex items-center gap-1 text-sm px-2 py-1 bg-white rounded shadow"
          >
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            {user.username}
          </div>
        ))}
      </div>

      <Card className="messages-container flex-1 overflow-y-auto p-2 mb-2">
        <CardContent className="space-y-1">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`p-1 ${msg.system ? "text-gray-500 italic" : ""} ${
                msg.readBy?.includes(username) ? "opacity-80" : ""
              }`}
            >
              {msg.system ? (
                <span>{msg.message}</span>
              ) : (
                <div className="group relative">
                  <div>
                    <span>
                      {users.find((u) => u.username === msg.username) && (
                        <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1"></span>
                      )}
                      <strong>{msg.username}:</strong>{" "}
                      {msg.message.startsWith("http") &&
                      (msg.message.endsWith(".png") ||
                        msg.message.endsWith(".jpg") ||
                        msg.message.endsWith(".jpeg") ||
                        msg.message.endsWith(".gif")) ? (
                        <img
                          src={msg.message}
                          alt="sent file"
                          className="max-w-xs rounded shadow mt-1"
                        />
                      ) : (
                        <span>{msg.message}</span>
                      )}
                      <span className="text-xs text-gray-400 ml-2">
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </span>
                    </span>
                  </div>

                  {/* Reactions display */}
                  {msg.reactions?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {msg.reactions.map((r, i) => (
                        <span
                          key={i}
                          className="text-xs bg-gray-200 rounded-full px-2 py-1"
                        >
                          {r.reaction} {r.username}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Reaction buttons */}
                  <div className="hidden group-hover:flex gap-1 mt-1">
                    {quickReactions.map((reaction) => (
                      <button
                        key={reaction}
                        onClick={() => addReaction(msg.id, reaction)}
                        className="text-lg hover:scale-125 transition-transform"
                      >
                        {reaction}
                      </button>
                    ))}
                  </div>

                  {msg.readBy?.length > 0 && (
                    <div className="text-xs text-gray-500 mt-1">
                      Read by: {msg.readBy.join(", ")}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {typingUsers.length > 0 && (
        <div className="text-xs text-gray-500 mb-1">
          {typingUsers.join(", ")} {typingUsers.length === 1 ? "is" : "are"}{" "}
          typing...
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          type="text"
          placeholder="Recipient username (leave blank for public)"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          className="w-48"
        />
        <Input
          type="file"
          onChange={(e) => setFile(e.target.files[0])}
          className="w-48"
        />
        <Input
          type="text"
          placeholder="Type your message..."
          value={input}
          onChange={handleTyping}
          className="flex-1"
        />
        <Button type="submit">Send</Button>
      </form>
    </div>
  );
};

export default Chat;
import React, { useState, useEffect, useRef } from "react";
import styled from "styled-components";
import ChatInput from "./ChatInput";
import Logout from "./Logout";
import { v4 as uuidv4 } from "uuid";
import axios from "axios";
import { sendMessageRoute, recieveMessageRoute, editMessageRoute, deleteMessageRoute, reactMessageRoute, unblockUserRoute } from "../utils/APIRoutes";

export default function ChatContainer({ currentChat, socket, clearChatSignal, onClearChatHandled, currentUser }) {
  const [messages, setMessages] = useState([]);
  const [showOptions, setShowOptions] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const scrollRef = useRef();
  const [arrivalMessage, setArrivalMessage] = useState(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editInput, setEditInput] = useState("");

  useEffect(() => {
    if (currentUser && currentChat) {
      // Check if currentChat is in my blockedUsers OR if I am in their blockedUsers
      const iBlocked = currentUser.blockedUsers?.includes(currentChat._id);
      const theyBlocked = currentChat.blockedUsers?.includes(currentUser._id);
      setIsBlocked(iBlocked || theyBlocked);
    }
  }, [currentUser, currentChat]);

  useEffect(() => {
    const fetchMessages = async () => {
      const storedUser = JSON.parse(
        localStorage.getItem(process.env.REACT_APP_LOCALHOST_KEY)
      );
      if (!storedUser || !currentChat) return;

      try {
        const response = await axios.post(recieveMessageRoute, {
          from: storedUser._id,
          to: currentChat._id,
        });
        setMessages(response.data);
      } catch (error) {
        console.error("Error fetching messages:", error);
      }
    };

    fetchMessages();
  }, [currentChat]);

  useEffect(() => {
    if (socket.current) {
      socket.current.on("msg-recieve", (msg) => {
        setArrivalMessage({ fromSelf: false, message: msg });
      });
      socket.current.on("message-edited", (data) => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg._id === data._id ? { ...msg, message: data.message } : msg
          )
        );
      });
      socket.current.on("message-deleted-everyone", (data) => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg._id === data._id ? { ...msg, message: data.message } : msg
          )
        );
      });
      socket.current.on("message-reacted", (data) => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg._id === data._id ? { ...msg, reactions: data.reactions } : msg
          )
        );
      });
      socket.current.on("system-msg-recieve", (msg) => {
        setMessages((prev) => [
          ...prev,
          { fromSelf: false, message: msg.message, isSystem: true, _id: Date.now() },
        ]);
      });
    }
  }, [socket]);

  useEffect(() => {
    if (arrivalMessage) {
      setMessages((prev) => [...prev, arrivalMessage]);
    }
  }, [arrivalMessage]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMsg = async (msg) => {
    const storedUser = JSON.parse(
      localStorage.getItem(process.env.REACT_APP_LOCALHOST_KEY)
    );
    if (!storedUser) return;

    socket.current.emit("send-msg", {
      to: currentChat._id,
      from: storedUser._id,
      msg,
    });

    const { data } = await axios.post(sendMessageRoute, {
      from: storedUser._id,
      to: currentChat._id,
      message: msg,
    });

    // Use the returned _id here
    setMessages((prev) => [
      ...prev,
      { fromSelf: true, message: msg, _id: data._id, reactions: [] },
    ]);
  };

  const handleEditMessage = async (messageId, newText) => {
    const { data } = await axios.post(editMessageRoute, { messageId, newText });
    if (data.updatedMessage) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === messageId ? { ...msg, message: newText } : msg
        )
      );
    }
    setShowOptions(false);
    setEditingMessageId(null);
  };

  const handleDeleteMessage = async (messageId, deleteForEveryone) => {
    const storedUser = JSON.parse(localStorage.getItem(process.env.REACT_APP_LOCALHOST_KEY));
    if (deleteForEveryone) {
      await axios.post(deleteMessageRoute, {
        messageId,
        deleteForEveryone,
        userId: storedUser._id,
        toUserId: currentChat._id,
      });
      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === messageId ? { ...msg, message: "This message was deleted." } : msg
        )
      );
    } else {
      await axios.post(deleteMessageRoute, { messageId, deleteForEveryone, userId: storedUser._id });
      setMessages((prev) => prev.filter((msg) => msg._id !== messageId));
    }
    setShowOptions(false);
  };

  const confirmDelete = (messageId, deleteForEveryone) => {
    if (window.confirm("Are you sure you want to delete this message?")) {
      handleDeleteMessage(messageId, deleteForEveryone);
    }
  };

  const handleReact = async (messageId, emoji) => {
    const storedUser = JSON.parse(localStorage.getItem(process.env.REACT_APP_LOCALHOST_KEY));
    await axios.post(reactMessageRoute, {
      messageId,
      userId: storedUser._id,
      emoji,
    });
    // The socket event will update the UI for both users
  };

  const handleUnblock = async () => {
    await axios.post(unblockUserRoute, {
      userId: currentUser._id,
      blockId: currentChat._id,
    });
    // Update localStorage and state
    const updatedUser = { ...currentUser };
    updatedUser.blockedUsers = updatedUser.blockedUsers.filter(id => id !== currentChat._id);
    localStorage.setItem(process.env.REACT_APP_LOCALHOST_KEY, JSON.stringify(updatedUser));
    // If you have setCurrentUser as a prop, call it here. If not, the change will reflect on next login/reload.
    window.location.reload(); // Or trigger a state update if you want instant UI update
  };

  useEffect(() => {
    if (clearChatSignal && currentChat && clearChatSignal === currentChat._id) {
      setMessages([]); // Clear messages for this chat
      if (onClearChatHandled) onClearChatHandled();
    }
  }, [clearChatSignal, currentChat, onClearChatHandled]);

  useEffect(() => {
    function handleLocalSystemMsg(e) {
      if (e.detail.contactId === currentChat._id) {
        setMessages((prev) => [...prev, e.detail.systemMsg]);
      }
    }
    window.addEventListener("system-message-local", handleLocalSystemMsg);
    return () => window.removeEventListener("system-message-local", handleLocalSystemMsg);
  }, [currentChat]);

  return (
    <Container>
      <div className="chat-header">
        <div className="user-details">
          <div className="avatar">
            <img src={currentChat.avatarImage} alt="avatar" />
          </div>
          <div className="username">
            {(() => {
              const nicknameObj = currentUser.nicknames?.find(n => n.contactId === currentChat._id);
              if (nicknameObj && nicknameObj.nickname && nicknameObj.nickname !== currentChat.username) {
                return (
                  <>
                    <span className="nickname">{nicknameObj.nickname}</span>
                    <span className="username-small">{currentChat.username}</span>
                  </>
                );
              } else {
                return (
                  <span className="nickname">{currentChat.username}</span>
                );
              }
            })()}
          </div>
        </div>
        <Logout />
      </div>
      <div className="chat-messages">
        {messages.map((message, index) => {
          const isSystem = message.isSystem;
          const isDeleted = message.message === "This message was deleted.";

          return (
            <div
              ref={scrollRef}
              key={message._id} // <-- Use message._id for a stable key!
              style={isSystem ? { justifyContent: "center" } : {}}
            >
              <div
                className={`message ${message.fromSelf ? "sended" : "recieved"}${isSystem ? " system-message" : ""}`}
                style={isSystem ? { justifyContent: "center", width: "100%" } : {}}
              >
                <div className="content" style={{ position: "relative", width: isSystem ? "100%" : undefined }}>
                  {/* Hide ... button and options for system messages */}
                  {!isDeleted && !isSystem && (
                    <button
                      className="options-trigger"
                      onClick={() => {
                        setShowOptions((prev) => selectedMessage === message ? !prev : true);
                        setSelectedMessage(message);
                      }}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#fff",
                        fontSize: "1.5rem",
                        cursor: "pointer",
                        marginRight: "8px",
                        position: "absolute",
                        left: "-32px",
                        top: "50%",
                        transform: "translateY(-50%)",
                      }}
                      aria-label="More options"
                    >
                      ...
                    </button>
                  )}
                  {/* System message styling */}
                  <p
                    style={{
                      margin: isSystem ? "0 auto" : (!isDeleted ? "0 0 0 24px" : 0),
                      textAlign: isSystem ? "center" : undefined,
                      fontSize: isSystem ? "0.85rem" : undefined,
                      color: isSystem ? "#aaa" : undefined,
                      background: isSystem ? "#222" : undefined,
                      borderRadius: isSystem ? "0.5rem" : undefined,
                      padding: isSystem ? "0.4rem 1rem" : undefined,
                      boxShadow: isSystem ? "none" : undefined,
                    }}
                  >
                    {message.message}
                  </p>
                  {/* No reactions or options for system messages */}
                  {!isSystem && editingMessageId === message._id && (
                    <div className="edit-message-form">
                      <input
                        value={editInput}
                        onChange={e => setEditInput(e.target.value)}
                        placeholder="Edit your message"
                        className="edit-input"
                      />
                      <button onClick={() => handleEditMessage(message._id, editInput)}>Save</button>
                      <button onClick={() => setEditingMessageId(null)}>Cancel</button>
                    </div>
                  )}
                  {!isSystem && message.reactions && message.reactions.length > 0 && (
                    <div className="message-reactions">
                      {message.reactions.map((r, idx) => (
                        <span key={idx} className="reaction-emoji">{r.emoji}</span>
                      ))}
                    </div>
                  )}
                  {/* Options menu only for non-system messages */}
                  {!isSystem && showOptions && selectedMessage === message && !isDeleted && (
                    <div className="options-menu">
                      <div className="reactions">
                        <span onClick={() => handleReact(message._id, "👍")}>👍</span>
                        <span onClick={() => handleReact(message._id, "❤️")}>❤️</span>
                        <span onClick={() => handleReact(message._id, "😂")}>😂</span>
                      </div>
                      {message.fromSelf && index === messages.length - 1 ? (
                        <>
                          <button
                            onClick={() => {
                              setEditingMessageId(message._id);
                              setEditInput(message.message);
                              setShowOptions(false);
                            }}
                          >
                            Edit
                          </button>
                          <button onClick={() => confirmDelete(message._id, false)}>
                            Delete for Me
                          </button>
                          <button onClick={() => confirmDelete(message._id, true)}>
                            Delete for Everyone
                          </button>
                        </>
                      ) : (
                        <button onClick={() => confirmDelete(message._id, false)}>
                          Delete for Me
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setShowOptions(false);
                          setSelectedMessage(null);
                        }}
                      >
                        Close
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {isBlocked ? (
        <div className="blocked-banner">
          <span>Blocked</span>
          {/* Optionally show unblock button if I blocked them */}
          {currentUser.blockedUsers?.includes(currentChat._id) && (
            <button onClick={handleUnblock}>Unblock</button>
          )}
        </div>
      ) : (
        <ChatInput handleSendMsg={handleSendMsg} />
      )}
    </Container>
  );
}

const Container = styled.div`
  display: grid;
  grid-template-rows: 10% 80% 10%;
  gap: 0.1rem;
  overflow: hidden;
  @media screen and (min-width: 720px) and (max-width: 1080px) {
    grid-template-rows: 15% 70% 15%;
  }
  .chat-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 2rem;
    .user-details {
      display: flex;
      align-items: center;
      gap: 1rem;
      .avatar img {
        height: 3rem;
      }
      .username {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        .nickname {
          color: #fff;
          font-size: 1.1rem;
          font-weight: 600;
          line-height: 1.1;
        }
        .username-small {
          color: #aaa;
          font-size: 0.8rem;
          font-weight: 400;
          margin-top: 2px;
          line-height: 1;
        }
      }
    }
  }
  .chat-messages {
    padding: 1rem 2rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    overflow: auto;
    &::-webkit-scrollbar {
      width: 0.2rem;
      &-thumb {
        background-color: #ffffff39;
        width: 0.1rem;
        border-radius: 1rem;
      }
    }
    .message {
      display: flex;
      align-items: center;
      .content {
        max-width: 40%;
        overflow-wrap: break-word;
        padding: 1rem;
        font-size: 1.1rem;
        border-radius: 1rem;
        color: #d1d1d1;
        @media screen and (min-width: 720px) and (max-width: 1080px) {
          max-width: 70%;
        }
      }
    }
    .sended {
      justify-content: flex-end;
      .content {
        background-color: #4f04ff21;
      }
    }
    .recieved {
      justify-content: flex-start;
      .content {
        background-color: #9900ff20;
      }
    }
  }
  .options {
    display: flex;
    gap: 0.5rem;
    button {
      background-color: #4e0eff;
      color: white;
      border: none;
      padding: 0.3rem 0.5rem;
      border-radius: 0.3rem;
      cursor: pointer;
      &:hover {
        background-color: #3b05d3;
      }
    }
  }
  .options-menu {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    position: absolute;
    top: 100%;
    left: 0;
    background-color: #333;
    padding: 0.5rem;
    border-radius: 0.5rem;
    z-index: 1;
    .reactions {
      display: flex;
      gap: 0.5rem;
      span {
        cursor: pointer;
        font-size: 1.5rem;
      }
    }
  }
  .options-menu {
    position: absolute;
    top: 2.5rem;
    left: 0;
    background: #222;
    border-radius: 0.5rem;
    box-shadow: 0 2px 8px #0008;
    padding: 0.5rem 1rem;
    z-index: 10;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    min-width: 160px;
  }
  .options-menu button {
    background: #4e0eff;
    color: #fff;
    border: none;
    border-radius: 0.3rem;
    padding: 0.3rem 0.5rem;
    cursor: pointer;
    text-align: left;
  }
  .options-menu button:hover {
    background: #3b05d3;
  }
  .options-menu .reactions {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
    font-size: 1.3rem;
    cursor: pointer;
  }
  .options-trigger {
    background: none;
    border: none;
    color: #fff;
    font-size: 1.5rem;
    cursor: pointer;
  }
  .message-reactions {
    display: flex;
    gap: 0.2rem;
    margin-top: 0.2rem;
  }
  .reaction-emoji {
    font-size: 1rem;
    background: #222;
    border-radius: 50%;
    padding: 0.1rem 0.3rem;
    margin-right: 0.1rem;
  }
  // .blocked-banner {
  //   display: flex;
  //   justify-content: center;
  //   align-items: center;
  //   background-color: #ff4d4d;
  //   color: white;
  //   padding: 1rem;
  //   border-radius: 0.5rem;
  //   margin: 1rem 2rem;
  // }
  .blocked-banner button {
    background-color: #4e0eff;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 0.3rem;
    cursor: pointer;
    margin-left: 1rem;
  }
  .blocked-banner button:hover {
    background-color: #3b05d3;
  }
  .blocked-banner {
    display: flex;
    align-items: center;
    justify-content: center;
    background: #ffcccc;
    color: #a00;
    padding: 1rem;
    gap: 1rem;
  }
  .edit-message-form {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.5rem;
  }
  .edit-input {
    flex: 1;
    padding: 0.3rem;
    border-radius: 0.3rem;
    border: 1px solid #ccc;
  }
  .system-message .content {
    background: none !important;
    color: #8f94fb !important;
    font-size: 1.05rem !important;
    font-weight: 600;
    text-align: center !important;
    margin: 0 auto !important;
    box-shadow: none !important;
    border-radius: 0 !important;
    width: fit-content !important;
    min-width: 0;
    padding: 0 !important;
    letter-spacing: 0.02em;
    justify-content: center !important;
    white-space: nowrap;
    overflow: visible;
    text-overflow: unset;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none !important;
    transition: none;
    box-sizing: border-box;
  }
  .system-message {
    justify-content: center !important;
    display: flex !important;
  }
  
`;



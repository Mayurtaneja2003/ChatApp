import React, { useState, useEffect, useRef } from "react";
import styled from "styled-components";
import Logo from "../assets/logo.svg";
import { io } from "socket.io-client";
import { host } from "../utils/APIRoutes";
import { FaPencilAlt, FaTrash, FaBan, FaUnlock } from "react-icons/fa";
import axios from "axios";
import { setNicknameRoute, clearChatRoute, blockUserRoute, unblockUserRoute } from "../utils/APIRoutes";

export default function Contacts({ contacts, changeChat, currentUser, setCurrentUser, onClearChat }) {
  const [currentUserName, setCurrentUserName] = useState(undefined);
  const [currentUserImage, setCurrentUserImage] = useState(undefined);
  const [currentSelected, setCurrentSelected] = useState(undefined);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [editingNickname, setEditingNickname] = useState(null);
  const [nicknameInput, setNicknameInput] = useState("");
  const [blockedUsers, setBlockedUsers] = useState([]); // fetch from backend

  const socket = useRef();
  useEffect(() => {
    const data = JSON.parse(localStorage.getItem(process.env.REACT_APP_LOCALHOST_KEY));
    setCurrentUserName(data.username);
    setCurrentUserImage(data.avatarImage);

    socket.current = io(host);
    socket.current.on("online-users", (users) => {
      setOnlineUsers(users);
    });

    return () => socket.current.disconnect();
  }, []);

  const changeCurrentChat = (index, contact) => {
    setCurrentSelected(index);
    changeChat(contact);
  };

  const handleSetNickname = async (contactId) => {
    const oldNicknameObj = currentUser.nicknames?.find(n => n.contactId === contactId);
    const oldNickname = oldNicknameObj ? oldNicknameObj.nickname : contacts.find(c => c._id === contactId)?.username;
    await axios.post(setNicknameRoute, {
      userId: currentUser._id,
      contactId,
      nickname: nicknameInput,
    });

    // Send system message to chat
    await axios.post(`${host}/api/messages/systemmsg`, {
      from: currentUser._id,
      to: contactId,
      text: `${currentUser.username} set your nickname "${nicknameInput}"`,
    });

    // Update local state and localStorage
    const updatedUser = { ...currentUser };
    updatedUser.nicknames = updatedUser.nicknames?.filter(n => n.contactId !== contactId) || [];
    updatedUser.nicknames.push({ contactId, nickname: nicknameInput });
    localStorage.setItem(process.env.REACT_APP_LOCALHOST_KEY, JSON.stringify(updatedUser));
    setCurrentUser(updatedUser);
    setEditingNickname(null);
    setNicknameInput("");

    if (window.location.pathname === "/chat") {
      // Try to update ChatContainer if it's open with this contact
      // Use a custom event or a shared state manager (like Redux or context)
      // For a quick solution, use localStorage and a custom event:
      const systemMsg = {
        fromSelf: true,
        message: `${currentUser.username} set your nickname "${nicknameInput}"`,
        isSystem: true,
        // _id: Date.now(),
      };
      window.dispatchEvent(
        new CustomEvent("system-message-local", { detail: { contactId, systemMsg } })
      );
    }
  };

  const handleClearChat = async (contactId) => {
    if (window.confirm("Are you sure you want to clear all chats?")) {
      await axios.post(clearChatRoute, {
        userId: currentUser._id,
        contactId,
      });
      if (onClearChat) {
        onClearChat(contactId); // <-- call the prop
      }
      // Optionally show a toast or message
    }
  };

  const handleBlock = async (contactId) => {
    await axios.post(blockUserRoute, {
      userId: currentUser._id,
      blockId: contactId,
    });
    const updatedUser = { ...currentUser };
    updatedUser.blockedUsers = [...(updatedUser.blockedUsers || []), contactId];
    localStorage.setItem(process.env.REACT_APP_LOCALHOST_KEY, JSON.stringify(updatedUser));
    setCurrentUser(updatedUser);
  };

  const handleUnblock = async (contactId) => {
    await axios.post(unblockUserRoute, {
      userId: currentUser._id,
      blockId: contactId,
    });
    const updatedUser = { ...currentUser };
    updatedUser.blockedUsers = updatedUser.blockedUsers.filter(id => id !== contactId);
    localStorage.setItem(process.env.REACT_APP_LOCALHOST_KEY, JSON.stringify(updatedUser));
    setCurrentUser(updatedUser);
  };

  return (
    <>
      {currentUserImage && currentUserName && (
        <Container>
          <div className="brand">
            <img src={Logo} alt="logo" />
            <h3>snappy</h3>
          </div>
          <div className="contacts">
            {contacts.map((contact, index) => {
              const isOnline = onlineUsers.includes(contact._id);
              const nicknameObj = currentUser.nicknames?.find(n => n.contactId === contact._id);
              const nickname = nicknameObj ? nicknameObj.nickname : contact.username;
              const isBlocked = blockedUsers.includes(contact._id);

              return (
                <React.Fragment key={contact._id}>
                  <div
                    className={`contact ${index === currentSelected ? "selected" : ""}`}
                    onClick={() => changeCurrentChat(index, contact)}
                  >
                    <div className="avatar">
                      <img src={contact.avatarImage} alt="" />
                      {isOnline && <span className="online-dot"></span>}
                    </div>
                    <div className="username">
                      <h3>{nickname}</h3>
                    </div>
                    <span className="icons">
                      <FaPencilAlt
                        title="Edit"
                        onClick={() => {
                          setEditingNickname(contact._id);
                          setNicknameInput(nicknameObj ? nicknameObj.nickname : "");
                        }}
                      />
                      <FaTrash
                        title="Delete"
                        onClick={() => handleClearChat(contact._id)}
                      />
                      {isBlocked ? (
                        <FaUnlock
                          title="Unblock"
                          onClick={() => {
                            if (window.confirm("Are you sure you want to unblock this user?")) {
                              handleUnblock(contact._id);
                            }
                          }}
                        />
                      ) : (
                        <FaBan
                          title="Block"
                          onClick={() => {
                            if (window.confirm("Are you sure you want to block this user?")) {
                              handleBlock(contact._id);
                            }
                          }}
                        />
                      )}
                    </span>
                  </div>
                  {editingNickname === contact._id && (
                    <div className="edit-message-form">
                      <input
                        value={nicknameInput}
                        onChange={e => setNicknameInput(e.target.value)}
                        placeholder="Enter nickname"
                        className="edit-input"
                      />
                      <button onClick={() => handleSetNickname(contact._id)}>Save</button>
                      <button onClick={() => setEditingNickname(null)}>Cancel</button>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
          <div className="current-user">
            <div className="avatar">
              <img src={currentUserImage} alt="avatar" />
            </div>
            <div className="username">
              <h2>{currentUserName}</h2>
            </div>
          </div>
        </Container>
      )}
    </>
  );
}

const Container = styled.div`
  display: grid;
  grid-template-rows: 10% 75% 15%;
  overflow: hidden;
  background-color: #080420;
  @media screen and (max-width: 720px) {
    grid-template-rows: 10% 75% 15%;
    .contacts {
      flex-direction: row;
      overflow-x: auto;
      gap: 0.5rem;
      .contact {
        min-width: 120px;
        flex: 0 0 auto;
      }
    }
    .current-user {
      flex-direction: row;
      gap: 1rem;
      .avatar img {
        height: 2.5rem;
      }
      .username h2 {
        font-size: 1rem;
      }
    }
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 1rem;
    justify-content: center;
    img {
      height: 2rem;
    }
    h3 {
      color: white;
      text-transform: uppercase;
    }
  }
  .contacts {
    display: flex;
    flex-direction: column;
    align-items: center;
    overflow: auto;
    gap: 0.8rem;
    &::-webkit-scrollbar {
      width: 0.2rem;
      &-thumb {
        background-color: #ffffff39;
        width: 0.1rem;
        border-radius: 1rem;
      }
    }
    .contact {
      background-color: #ffffff34;
      min-height: 5rem;
      cursor: pointer;
      width: 90%;
      border-radius: 0.2rem;
      padding: 0.4rem;
      display: flex;
      gap: 1rem;
      align-items: center;
      transition: 0.5s ease-in-out;
      .avatar {
        position: relative;
        img {
          height: 3rem;
        }
        .online-dot {
          position: absolute;
          bottom: 0;
          right: 0;
          height: 0.8rem;
          width: 0.8rem;
          background-color: #4caf50;
          border-radius: 50%;
          border: 2px solid #080420;
        }
      }
      .username {
        h3 {
          color: white;
        }
      }
      .icons {
        display: flex;
        gap: 0.5rem;
        svg {
          cursor: pointer;
          color: white;
        }
      }
    }
    .selected {
      background-color: #9a86f3;
    }
  }

  .current-user {
    background-color: #0d0d30;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 2rem;
    .avatar {
      img {
        height: 4rem;
        max-inline-size: 100%;
      }
    }
    .username {
      h2 {
        color: white;
      }
    }
    @media screen and (min-width: 720px) and (max-width: 1080px) {
      gap: 0.5rem;
      .username {
        h2 {
          font-size: 1rem;
        }
      }
    }
  }
  .edit-message-form {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.5rem;
  }
  .edit-input {
    flex: 1;
    padding: 0.2rem 0.5rem;
    border-radius: 0.3rem;
    border: 1px solid #ccc;
  }
`;

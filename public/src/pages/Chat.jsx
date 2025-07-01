import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import styled from "styled-components";
import { allUsersRoute, host } from "../utils/APIRoutes";
import ChatContainer from "../components/ChatContainer";
import Contacts from "../components/Contacts";
import Welcome from "../components/Welcome";

export default function Chat() {
  const navigate = useNavigate();
  const socket = useRef();
  const [contacts, setContacts] = useState([]);
  const [currentChat, setCurrentChat] = useState(undefined);
  const [currentUser, setCurrentUser] = useState(undefined);
  const [clearChatSignal, setClearChatSignal] = useState(null);

  useEffect(async () => {
    if (!localStorage.getItem(process.env.REACT_APP_LOCALHOST_KEY)) {
      navigate("/login");
    } else {
      setCurrentUser(
        await JSON.parse(
          localStorage.getItem(process.env.REACT_APP_LOCALHOST_KEY)
        )
      );
    }
  }, []);
  useEffect(() => {
    if (currentUser) {
      // socket.current = io(host);
      const socketUrl = process.env.NODE_ENV === "production" ? undefined : host;
socket.current = io(socketUrl);
      socket.current.emit("add-user", currentUser._id);
    }
  }, [currentUser]);

  useEffect(async () => {
    if (currentUser) {
      if (currentUser.isAvatarImageSet) {
        const data = await axios.get(`${allUsersRoute}/${currentUser._id}`);
        setContacts(data.data);
      } else {
        navigate("/setAvatar");
      }
    }
  }, [currentUser]);
  const handleChatChange = (chat) => {
    setCurrentChat(chat);
  };
  useEffect(() => {
    // REMOVE or COMMENT OUT this effect:
    // const socket = io(host);
    // socket.on("nickname-updated", ({ from, to, nickname }) => {
    //   if (currentUser && currentUser._id === to) {
    //     const updatedUser = { ...currentUser };
    //     updatedUser.nicknames = updatedUser.nicknames?.filter(n => n.contactId !== from) || [];
    //     updatedUser.nicknames.push({ contactId: from, nickname });
    //     localStorage.setItem(process.env.REACT_APP_LOCALHOST_KEY, JSON.stringify(updatedUser));
    //     setCurrentUser(updatedUser);
    //   }
    // });
    // return () => socket.disconnect();
  }, [currentUser]);

  const handleClearChatMessages = (contactId) => {
    setClearChatSignal(contactId);
  };

  return (
    <>
      <Container>
        <div className="container">
          <Contacts
            contacts={contacts}
            changeChat={handleChatChange}
            currentUser={currentUser}
            setCurrentUser={setCurrentUser}
            onClearChat={handleClearChatMessages}
          />
          {currentChat === undefined ? (
            <Welcome />
          ) : (
            <ChatContainer
              currentChat={currentChat}
              socket={socket}
              clearChatSignal={clearChatSignal}
              onClearChatHandled={() => setClearChatSignal(null)}
              currentUser={currentUser}
            />
          )}
        </div>
      </Container>
    </>
  );
}

const Container = styled.div`
  height: 100vh;
  width: 100vw;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 1rem;
  align-items: center;
  background-color: #131324;
  .container {
    height: 85vh;
    width: 85vw;
    background-color: #00000076;
    display: grid;
    grid-template-columns: 25% 75%;
    @media screen and (max-width: 1080px) {
      grid-template-columns: 35% 65%;
      width: 98vw;
      height: 90vh;
    }
    @media screen and (max-width: 720px) {
      display: flex;
      flex-direction: column;
      width: 100vw;
      height: 100vh;
    }
  }
`;

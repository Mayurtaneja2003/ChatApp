import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useNavigate } from "react-router-dom";
import { setAvatarRoute } from "../utils/APIRoutes";

export default function SetAvatar() {
  const navigate = useNavigate();
  const [avatar, setAvatar] = useState(""); // Store single avatar image
  const [isLoading, setIsLoading] = useState(true);

  const toastOptions = {
    position: "bottom-right",
    autoClose: 5000,
    pauseOnHover: true,
    draggable: true,
    theme: "dark",
  };

  useEffect(() => {
    // Generate a random number between 1 and 10
    const randomNumber = Math.floor(Math.random() * 10) + 1;
    const avatarUrl = `https://avatar.iran.liara.run/public/${randomNumber}`;

    // Fetch a single avatar from the API
    const fetchAvatar = async () => {
      try {
        const response = await fetch(avatarUrl);
        if (!response.ok) throw new Error("Failed to fetch avatar");

        setAvatar(response.url);
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching avatar:", error);
        toast.error("Failed to load avatar. Please try again.", toastOptions);
        setIsLoading(false);
      }
    };

    fetchAvatar();
  }, []);

  const setProfilePicture = async () => {
    if (!avatar) {
      toast.error("No avatar found. Please refresh the page.", toastOptions);
      return;
    }

    const storedUser = localStorage.getItem(process.env.REACT_APP_LOCALHOST_KEY);
    if (!storedUser) {
      toast.error("User not found. Please log in again.", toastOptions);
      return;
    }

    const user = JSON.parse(storedUser);
    try {
      const response = await fetch(`${setAvatarRoute}/${user._id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: avatar }),
      });

      const data = await response.json();

      if (data.isSet) {
        user.isAvatarImageSet = true;
        user.avatarImage = data.image;
        localStorage.setItem(process.env.REACT_APP_LOCALHOST_KEY, JSON.stringify(user));
        navigate("/");
      } else {
        toast.error("Error setting avatar. Please try again.", toastOptions);
      }
    } catch (error) {
      toast.error("Server error. Please try again later.", toastOptions);
    }
  };

  return (
    <Container>
      {isLoading ? (
        <h2>Loading Avatar...</h2>
      ) : (
        <>
          <div className="title-container">
            <h1>Pick an Avatar as your profile picture</h1>
          </div>
          <div className="avatar-container">
            <img src={avatar} alt="avatar" />
          </div>
          <button onClick={setProfilePicture} className="submit-btn">
            Set as Profile Picture
          </button>
          <ToastContainer />
        </>
      )}
    </Container>
  );
}

const Container = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  gap: 2rem;
  background-color: #131324;
  height: 100vh;
  width: 100vw;
  text-align: center;

  .title-container h1 {
    color: white;
  }

  .avatar-container {
    display: flex;
    justify-content: center;
    align-items: center;
    border: 0.4rem solid #4e0eff;
    border-radius: 50%;
    padding: 1rem;

    img {
      height: 8rem;
      width: 8rem;
      border-radius: 50%;
      object-fit: cover;
    }
  }

  .submit-btn {
    background-color: #4e0eff;
    color: white;
    padding: 1rem 2rem;
    border: none;
    font-weight: bold;
    cursor: pointer;
    border-radius: 0.4rem;
    font-size: 1rem;
    text-transform: uppercase;
    
    &:hover {
      background-color: #3b05d3;
    }
  }
`;

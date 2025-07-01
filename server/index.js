const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const authRoutes = require("./routes/auth");
const messageRoutes = require("./routes/messages");
const app = express();
const socket = require("socket.io");
const User = require("./models/userModel"); // Add this at the top
const path = require("path");
require("dotenv").config();

app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());

mongoose
  .connect(process.env.MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("DB Connetion Successfull");
  })
  .catch((err) => {
    console.log(err.message);
  });

app.get("/ping", (_req, res) => {
  return res.json({ msg: "Ping Successful" });
});

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);

// Serve React build static files
app.use(express.static(path.join(__dirname, "../public/build")));
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/build", "index.html"));
});

const server = app.listen(process.env.PORT, () =>
  console.log(`Server started on ${process.env.PORT}`)
);
const io = socket(server, {
  cors: {
    origin: "https://your-frontend-domain.com",
    credentials: true,
  },
});
app.set("io", io);

global.onlineUsers = new Map();
io.on("connection", (socket) => {
  global.chatSocket = socket;

  socket.on("add-user", (userId) => {
    onlineUsers.set(userId, socket.id);
    // Emit the updated online users list
    io.emit("online-users", Array.from(onlineUsers.keys()));
  });

  socket.on("disconnect", () => {
    // Remove the disconnected user
    for (const [key, value] of onlineUsers.entries()) {
      if (value === socket.id) {
        onlineUsers.delete(key);
        break;
      }
    }
    // Emit the updated online users list
    io.emit("online-users", Array.from(onlineUsers.keys()));
  });

  socket.on("send-msg", async (data) => {
    // Check if sender or receiver is blocked
    const sender = await User.findById(data.from);
    const receiver = await User.findById(data.to);
    if (
      sender.blockedUsers.includes(data.to) ||
      receiver.blockedUsers.includes(data.from)
    ) {
      // Optionally emit an error event to the sender
      return;
    }
    const sendUserSocket = onlineUsers.get(data.to);
    if (sendUserSocket) {
      socket.to(sendUserSocket).emit("msg-recieve", data.msg);
    }
  });

  socket.on("system-msg", (data) => {
    const sendUserSocket = onlineUsers.get(data.to);
    const senderSocket = onlineUsers.get(data.from);
    // Send to receiver
    if (sendUserSocket) {
      socket.to(sendUserSocket).emit("system-msg-recieve", {
        from: data.from,
        message: data.text,
        isSystem: true,
      });
    }
    // Send to sender (the user who changed the nickname)
    if (senderSocket) {
      io.to(senderSocket).emit("system-msg-recieve", {
        from: data.from,
        message: data.text,
        isSystem: true,
      });
    }
  });
});

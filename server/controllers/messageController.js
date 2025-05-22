const Messages = require("../models/messageModel");
const User = require("../models/userModel"); // <-- ADD THIS LINE

module.exports.getMessages = async (req, res, next) => {
  try {
    const { from, to } = req.body;

    const messages = await Messages.find({
      users: { $all: [from, to] },
      deletedFor: { $ne: from }, // Exclude messages deleted for this user
    }).sort({ updatedAt: 1 });

    const projectedMessages = messages.map((msg) => ({
      _id: msg._id,
      fromSelf: msg.sender.toString() === from,
      message: msg.message.text,
      reactions: msg.reactions,
      isSystem: msg.isSystem || false, // <-- Add this line
    }));
    res.json(projectedMessages);
  } catch (ex) {
    next(ex);
  }
};

module.exports.addMessage = async (req, res, next) => {
  try {
    const { from, to, message } = req.body;
    const data = await Messages.create({
      message: { text: message },
      users: [from, to],
      sender: from,
    });

    if (data) {
      return res.json({ msg: "Message added successfully.", _id: data._id });
    } else {
      return res.json({ msg: "Failed to add message to the database" });
    }
  } catch (ex) {
    next(ex);
  }
};

module.exports.editMessage = async (req, res, next) => {
  try {
    const { messageId, newText } = req.body;
    const updatedMessage = await Messages.findByIdAndUpdate(
      messageId,
      { "message.text": newText },
      { new: true }
    );
    if (updatedMessage) {
      // Emit socket event here
      const io = req.app.get("io");
      io.emit("message-edited", {
        _id: updatedMessage._id,
        message: newText,
      });
      return res.json({ msg: "Message updated successfully.", updatedMessage });
    } else {
      return res.json({ msg: "Failed to update message." });
    }
  } catch (ex) {
    next(ex);
  }
};

module.exports.deleteMessage = async (req, res, next) => {
  try {
    const { messageId, deleteForEveryone, userId, toUserId } = req.body;
    const io = req.app.get("io");
    if (deleteForEveryone) {
      const message = await Messages.findById(messageId);
      if (message) {
        message.message.text = "This message was deleted.";
        await message.save();
        // Notify both users in real-time
        if (io) {
          io.emit("message-deleted-everyone", {
            _id: messageId,
            message: "This message was deleted.",
            users: [userId, toUserId],
          });
        }
        return res.json({ msg: "Message deleted for everyone." });
      } else {
        return res.json({ msg: "Message not found." });
      }
    } else {
      // Delete for me: add userId to deletedFor
      await Messages.findByIdAndUpdate(messageId, {
        $addToSet: { deletedFor: userId },
      });
      return res.json({ msg: "Message deleted for you only." });
    }
  } catch (ex) {
    next(ex);
  }
};

module.exports.reactMessage = async (req, res, next) => {
  try {
    const { messageId, userId, emoji } = req.body;
    const message = await Messages.findById(messageId);
    if (!message) return res.status(404).json({ msg: "Message not found" });

    // Remove previous reaction by this user (if any)
    message.reactions = message.reactions.filter((r) => r.userId !== userId);

    // Add new reaction
    message.reactions.push({ userId, emoji });
    await message.save();

    // Emit socket event to update reactions in real-time
    const io = req.app.get("io");
    if (io) {
      io.emit("message-reacted", {
        _id: message._id,
        reactions: message.reactions,
      });
    }

    res.json({ msg: "Reaction added", reactions: message.reactions });
  } catch (ex) {
    next(ex);
  }
};

module.exports.setNickname = async (req, res, next) => {
  try {
    const { userId, contactId, nickname } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ msg: "User not found" });

    // Remove old nickname if exists
    user.nicknames = user.nicknames.filter((n) => n.contactId !== contactId);
    // Add new nickname
    user.nicknames.push({ contactId, nickname });
    await user.save();

    res.json({ msg: "Nickname set", nickname });
  } catch (ex) {
    next(ex);
  }
};

module.exports.clearChat = async (req, res, next) => {
  try {
    const { userId, contactId } = req.body;
    await Messages.updateMany(
      { users: { $all: [userId, contactId] } },
      { $addToSet: { deletedFor: userId } }
    );
    res.json({ msg: "Chat cleared for you" });
  } catch (ex) {
    next(ex);
  }
};

module.exports.blockUser = async (req, res, next) => {
  try {
    const { userId, blockId } = req.body;
    const user = await User.findById(userId);
    if (!user.blockedUsers.includes(blockId)) {
      user.blockedUsers.push(blockId);
      await user.save();
    }
    res.json({ msg: "User blocked" });
  } catch (ex) {
    next(ex);
  }
};

module.exports.unblockUser = async (req, res, next) => {
  try {
    const { userId, blockId } = req.body;
    const user = await User.findById(userId);
    user.blockedUsers = user.blockedUsers.filter((id) => id !== blockId);
    await user.save();
    res.json({ msg: "User unblocked" });
  } catch (ex) {
    next(ex);
  }
};

module.exports.sendSystemMessage = async (req, res, next) => {
  try {
    const { from, to, text } = req.body;
    const msg = await Messages.create({
      message: { text },
      users: [from, to],
      sender: from,
      isSystem: true,
    });

    // Emit to both users via socket
    const io = req.app.get("io");
    if (io) {
      const fromSocket = global.onlineUsers.get(from);
      const toSocket = global.onlineUsers.get(to);
      if (fromSocket) io.to(fromSocket).emit("system-msg-recieve", { from, message: text, isSystem: true });
      if (toSocket && toSocket !== fromSocket) io.to(toSocket).emit("system-msg-recieve", { from, message: text, isSystem: true });
    }

    res.json({ msg: "System message sent" });
  } catch (ex) {
    next(ex);
  }
};

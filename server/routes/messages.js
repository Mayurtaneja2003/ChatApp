const { addMessage, getMessages, editMessage, deleteMessage, reactMessage, clearChat, sendSystemMessage } = require("../controllers/messageController");
const router = require("express").Router();

router.post("/addmsg/", addMessage);
router.post("/getmsg/", getMessages);
router.post("/editmsg/", editMessage);
router.post("/deletemsg/", deleteMessage);
router.post("/reactmsg/", reactMessage);
router.post("/clearchat", clearChat);
router.post("/systemmsg", sendSystemMessage);

module.exports = router;

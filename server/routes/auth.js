const {
  login,
  register,
  getAllUsers,
  setAvatar,
  logOut,
  getRandomAvatars, // Added new function
} = require("../controllers/userController");

const { setNickname, blockUser, unblockUser } = require("../controllers/messageController");

const router = require("express").Router();

router.post("/login", login);
router.post("/register", register);
router.get("/allusers/:id", getAllUsers);
router.post("/setavatar/:id", setAvatar);
router.get("/logout/:id", logOut);

router.post("/setnickname", setNickname);
router.post("/block", blockUser);
router.post("/unblock", unblockUser);

module.exports = router;

export const host =
  process.env.NODE_ENV === "production"
    ? ""
    : process.env.REACT_APP_API_URL || "http://localhost:5000";
export const registerRoute = `${host}/api/auth/register`;
export const loginRoute = `${host}/api/auth/login`;
export const setAvatarRoute = `${host}/api/auth/setAvatar`;
export const allUsersRoute = `${host}/api/auth/allUsers`;
export const sendMessageRoute = `${host}/api/messages/addmsg`;
export const recieveMessageRoute = `${host}/api/messages/getmsg`;
export const editMessageRoute = `${host}/api/messages/editmsg`;
export const deleteMessageRoute = `${host}/api/messages/deletemsg`;
export const reactMessageRoute = `${host}/api/messages/reactmsg`;
export const logoutRoute = `${host}/api/auth/logout`;
export const setNicknameRoute = `${host}/api/auth/setnickname`;
export const clearChatRoute = `${host}/api/messages/clearchat`;
export const blockUserRoute = `${host}/api/auth/block`;
export const unblockUserRoute = `${host}/api/auth/unblock`;

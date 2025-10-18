import User from "../models/User.js";

const protect = async (req, res, next) => {
  const {userId} = req.auth;
  if(!userId) {
    return res.status(401).json({success: false, message: "Not authorized"});
  } else{
    const user = await User.findById(userId);
    req.user = user;
    next();
  }
};

export default protect;
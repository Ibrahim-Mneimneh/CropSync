const jwt = require("jsonwebtoken");
const Device = require("../Models/deviceModel");
const User = require("../Models/userModel");
const verifyUser = async (req, res, next) => {
  const { authorization } = req.headers;

  if (!authorization) {
    return res.status(401).json({ error: "Authorization token required!" });
  }

  const token = authorization.split(" ")[1];

  try {
    let { deviceId, userId } = jwt.verify(token, process.env.SECRET);

    const device = await Device.findById(deviceId);
    const user = await User.findById(userId);
    //user exists
    if (!device || !user) {
      return res.status(403).json({ error: "UnAuthorized Access!" });
    }
    req.deviceId = device._id;
    req.userId = user._id;
    next();
  } catch (error) {
    console.log(error);
    return res.status(401).json({ error: "UnAuthorized Request!" });
  }
};
module.exports = { verifyUser };

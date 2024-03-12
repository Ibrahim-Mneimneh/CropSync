const jwt = require("jsonwebtoken");
const Device = require("../Models/deviceModel");
const User = require("../Models/userModel");
const Crop = require("../Models/CropModel");
const verifyDevice = async (req, res, next) => {
  const { authorization } = req.headers;

  if (!authorization) {
    return res.status(401).json({ error: "Authorization token required!" });
  }

  const token = authorization.split(" ")[1];

  try {
    let { deviceId, cropId } = jwt.verify(token, process.env.SECRET);
    const device = await Device.findById(deviceId);
    const crop = await Crop.findById(cropId);
    //device exists
    if (!device) {
      return res.status(403).json({ error: "UnAuthorized Access!" });
    }
    if (!crop) {
      return res.status(403).json({ error: "UnAuthorized Access!" });
    }
    req.deviceId = device._id;
    req.cropId = device.cropId;
    next();
  } catch (error) {
    console.log(error);
    return res.status(401).json({ error: "UnAuthorized Request!" });
  }
};
module.exports = { verifyDevice };

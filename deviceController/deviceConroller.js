const User = require("../Models/userModel");
const validator = require("validator");
const jwt = require("jsonwebtoken");
const Device = require("../Models/deviceModel");
const Crop = require("../Models/CropModel");

const createToken = (deviceId, cropId) => {
  return jwt.sign({ deviceId, cropId }, process.env.SECRET);
};

// Verify microcontroller connectivity
const connectDevice = async (req, res) => {
  try {
    const { email, activationKey } = req.body;
    if (!email || !activationKey) {
      return res.status(400).json({ error: "Please fill all required fields" });
    }
    const isEmail = validator.isEmail(email);
    if (!isEmail) {
      return res.status(400).json({ error: "Invalid email format" });
    }
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    const updatedDevice = await Device.findOneAndUpdate(
      { userId: user._id, deviceId: activationKey },
      { isConnected: true },
      { new: true }
    );
    if (!updatedDevice) {
      return res.status(404).json({ error: "Failed to locate your device" });
    }
    const token = createToken(updatedDevice._id, updatedDevice.cropId);
    return res.status(200).json({ token });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
// send images
const recieveLeafImage = async (req, res) => {
  try {
    const cropId = req.cropId;
    const { leafImage } = req.body;
    if (!leafImage) {
      return res.status(400).json({ error: "Please add a leaf image" });
    }
    // convert base 64 to buffer
    const leafImageBuffer = Buffer.from(leafImage, "base64");

    const updatedCrop = await Crop.findByIdAndUpdate(
      cropId,
      { $push: { image: leafImageBuffer, cameraCollectionDate: Date.now() } },
      { new: true }
    );
    if (!updatedCrop) {
      return res.status(400).json({ error: "Failed to recieve image." });
    }

    return res.status(200).json({ result: "success" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
// send soil readings
const recieveSoilData = async (req, res) => {
  try {
    const cropId = req.cropId;
    const { nitrogen, phosphorus, potassium, ph, humidity, temperature } =
      req.body;
    if (
      !nitrogen ||
      !phosphorus ||
      !potassium ||
      !ph ||
      !humidity ||
      !temperature
    ) {
      return res.status(400).json({
        error:
          "Missing soil attribute. Make sure all attributes are collected.",
      });
    }

    const updatedCrop = await Crop.findByIdAndUpdate(
      cropId,
      {
        $push: {
          nitrogen,
          phosphorus,
          potassium,
          ph,
          humidity,
          temperature,
          sensorCollectionDate: Date.now(),
        },
      },
      { new: true }
    );
    if (!updatedCrop) {
      return res
        .status(400)
        .json({ error: "Failed to recieve soil readings." });
    }
    return res.status(200).json({ result: "success" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

module.exports = {
  connectDevice,
  recieveLeafImage,
  recieveSoilData,
};

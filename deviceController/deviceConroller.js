const User = require("../Models/userModel");
const validator = require("validator");
const jwt = require("jsonwebtoken");
const Device = require("../Models/deviceModel");
const Crop = require("../Models/CropModel");
const SoilReading = require("../Models/Device-Sub/soilReadingModel");
const LeafImage = require("../Models/Device-Sub/leafImages");
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
    const { leafImage, timeStamps } = req.body;
    if (!leafImage || !timeStamps) {
      return res
        .status(400)
        .json({ error: "Please add a leaf image with timestamps" });
    }
    // convert base 64 to buffer
    const leafImageBuffer = Buffer.from(leafImage, "base64");

    const leafImg = await LeafImage.create({ image: leafImageBuffer }); // leafImage is already taken
    const cameraCollectionDate = new Date(timeStamps);
    let data;
    const response = await fetch("http://127.0.0.1:5000/predict", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ img: leafImage }),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    data = await response.json();
    data = data.result;

    const updatedCrop = await Crop.findByIdAndUpdate(
      cropId,
      {
        $push: { leafImages: leafImg._id, cameraCollectionDate },
        status: data ? data : null,
      },
      { new: true }
    );
    if (!updatedCrop) {
      return res.status(400).json({ error: "Failed to recieve image." });
    }
    return res
      .status(200)
      .json({ result: "success", frequencyFlag: req.frequencyFlag });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
// send soil readings
const recieveSoilData = async (req, res) => {
  try {
    const cropId = req.cropId;
    const deviceId = req.deviceId;
    if (
      !("temperature" in req.body) ||
      !("humidity" in req.body) ||
      !("ph" in req.body) ||
      !("nitrogen" in req.body) ||
      !("phosphorus" in req.body) ||
      !("potassium" in req.body) ||
      !("timeStamps" in req.body)
    ) {
      return res.status(400).json({
        error:
          "Missing soil attribute. Make sure all attributes are collected.",
      });
    }
    const {
      nitrogen,
      phosphorus,
      potassium,
      ph,
      humidity,
      temperature,
      timeStamps,
    } = req.body;
    const deviceData = await Device.findById(deviceId);
    if (!deviceData) {
      return res
        .status(404)
        .json({ error: "Failed to recieve soil readings." });
    }
    const location = deviceData.city + ",%20" + deviceData.country;
    const endpoint =
      "http://api.weatherapi.com/v1/current.json?key=" +
      process.env.WeatherKey +
      "&q=" +
      location +
      "&aqi=no&alerts=no";
    const weatherDataResponse = await fetch(endpoint);
    const weatherDataJson = await weatherDataResponse.json();
    const rainfall = weatherDataJson.current.precip_mm;
    const soilReadings = await SoilReading.create({
      nitrogen,
      phosphorus,
      potassium,
      ph,
      humidity,
      temperature,
      rainfall,
    });
    let sensorCollectionDate = new Date(timeStamps);

    if (!soilReadings) {
      return res
        .status(400)
        .json({ error: "Failed to recieve soil readings." });
    }

    const updatedCrop = await Crop.findByIdAndUpdate(
      cropId,
      {
        $push: {
          soilReadings: soilReadings._id,
          sensorCollectionDate,
        },
      },
      { new: true }
    );
    if (!updatedCrop) {
      return res
        .status(400)
        .json({ error: "Failed to recieve soil readings." });
    }
    return res
      .status(200)
      .json({ result: "success", frequencyFlag: req.frequencyFlag });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const getUpdatedFrequency = async (req, res) => {
  try {
    const frequency = [
      { id: 1, label: "6-hour", value: 21600 },
      { id: 2, label: "12-hour", value: 43200 },
      { id: 3, label: "One Day", value: 86400 },
      { id: 4, label: "Three Days", value: 259200 },
      { id: 5, label: "One Week", value: 604800 },
      { id: 6, label: "Two Weeks", value: 1209600 },
      { id: 7, label: "Monthly", value: 2592000 },
    ];
    const deviceId = req.deviceId;
    //Reset the frequency flag and get the data
    const updatedDevice = await Device.findByIdAndUpdate(
      deviceId,
      {
        frequencyFlag: false,
      },
      { new: true }
    );
    if (!updatedDevice) {
      return res.status(400).json({ error: "Failed to update flag." });
    }
    return res.status(200).json({
      soilFrequency: frequency[updatedDevice.soilFrequency - 1].value,
      imageFrequency: frequency[updatedDevice.imageFrequency - 1].value,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

module.exports = {
  connectDevice,
  recieveLeafImage,
  recieveSoilData,
  getUpdatedFrequency,
};

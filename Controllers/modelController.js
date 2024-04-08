const Crop = require("../Models/CropModel");
const SoilReading = require("../Models/Device-Sub/soilReadingModel");
const Device = require("../Models/deviceModel");
const isHealthy = async (req, res) => {
  try {
    const { base64Image } = req.body;
    if (!base64Image) {
      return res.status(400).json({ error: "Please select an image to scan" });
    }
    const response = await fetch("http://127.0.0.1:5000/predict", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ img: base64Image }),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    res.status(200).json({ result: data });
  } catch (error) {
    console.error(error.message);
    return res
      .status(500)
      .json({ error: "Error processing image", details: error.message });
  }
};

const recommendCrop = async (req, res) => {
  try {
    const deviceId = req.params.deviceId;
    if (!deviceId) {
      return res.status(404).json({ error: "Device not found" });
    }
    const deviceData = await Device.findOne({ deviceId, userId: req.userId });
    if (!deviceData) {
      return res.status(404).json({ error: "Device not found" });
    }
    const cropData = await Crop.findById(deviceData.cropId);
    if (!cropData) {
      return res.status(404).json({ error: "Device not found" });
    }
    let nitrogen = [];
    let phosphorus = [];
    let potassium = [];
    let moisture = [];
    let temperature = [];
    let ph = [];
    let rainfall = [];
    const soilCollectionDate = cropData.sensorCollectionDate;

    const soilReadingError = await Promise.all(
      cropData.soilReadings.map(async (soilReadingId) => {
        const soilReading = await SoilReading.findById(soilReadingId);
        if (!soilReading) {
          return null;
        }
        nitrogen.push(soilReading.nitrogen);
        ph.push(soilReading.ph);
        potassium.push(soilReading.potassium);
        phosphorus.push(soilReading.phosphorus);
        moisture.push(soilReading.humidity);
        temperature.push(soilReading.temperature);
        rainfall.push(soilReading.rainfall);
        return soilReadingId;
      })
    );
    const soilData = {
      nitrogen,
      phosphorus,
      potassium,
      temperature,
      ph,
      moisture,
      rainfall,
    };
    // nitrogen.push(600);
    // ph.push(9);
    // potassium.push(140);
    // phosphorus.push(150);
    // moisture.push(200);
    // temperature.push(50);
    // rainfall.push(200);
    if (!soilReadingError) {
      return res.status(404).json({ error: "Failed to fetch data" });
    }
    const response = await fetch("http://127.0.0.1:5000/recommend", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ soilReading: soilData }),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const data = await response.json();

    res.status(200).json({ result: data.result[0] });
  } catch (error) {
    console.error(error.message);
    return res
      .status(500)
      .json({ error: "Error recommending crops", details: error.message });
  }
};
module.exports = { isHealthy, recommendCrop };

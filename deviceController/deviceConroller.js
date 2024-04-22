const User = require("../Models/userModel");
const validator = require("validator");
const fetch = require("node-fetch");
const jwt = require("jsonwebtoken");
const Device = require("../Models/deviceModel");
const Crop = require("../Models/CropModel");
const SoilReading = require("../Models/Device-Sub/soilReadingModel");
const LeafImage = require("../Models/Device-Sub/leafImages");
const CropMedium = require("../Models/CropMedium");
const {
  saveSoilMedium,
  compareSoilMedium,
  inspectSoilMedium,
  analyzeImage,
} = require("../Controllers/GeminiController");
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

    const cameraCollectionDate = new Date(timeStamps);
    let data;
    try {
      const response = await fetch("http://127.0.0.1:5000/predict", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ img: leafImage }),
      });
      data = await response.json();
      if (!response.ok) {
        console.log("Response error:" + data.error);
      }
      if (!data.result) {
        console.log("Data error:" + data.error);
      }
    } catch (error) {
      console.log("Flask server error:" + error);
    }
    const status = data.result ? data.result : null;
    const leafImg = await LeafImage.create({
      image: leafImageBuffer,
      status,
    });
    // if the camera classified the image
    if (status) {
      // Send notification
      try {
        const deviceData = await Device.findById(req.cropId);
        if (!deviceData) {
          res.status(404).json({ error: "Device not found" });
        }
        const userData = await User.findById(deviceData.userId);
        if (!userData) {
          res.status(404).json({ error: "User not found" });
        }
        const url = "https://api.onesignal.com/notifications";
        let options = {
          method: "POST",
          headers: {
            accept: "application/json",
            Authorization: "Basic " + process.env.OSAPIKEY,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            app_id: process.env.APPID,
            include_aliases: {
              external_id: [userData.email],
            },
            target_channel: "push",
            data: { foo: "bar" },
            headings: {
              en:
                "🌱 Crop Health Alert! Abnormal pattern detected by " +
                updatedDevice.name,
            },
            contents: {
              en:
                status.toLowerCase() +
                "was detected! Opinion rejected! Tap to confirm the disease detection!",
            },
          }),
        };
        try {
          const OSresponse = await fetch(url, options);
          const OSdata = await OSresponse.json();
        } catch (error) {
          console.error("error:" + error);
        }
        // get message and action according to leafImage
        const leafAnalysis = await analyzeImage(leafImage).result;
        let leaf = { status };
        if (leafAnalysis.message && leafAnalysis.action) {
          soil.message = leafAnalysis.message;
          soil.action = leafAnalysis.action;
        }
        const updatedCrop = await Crop.findByIdAndUpdate(
          cropId,
          {
            $push: { leafImages: leafImg._id, cameraCollectionDate },
            $set: { "alerts.leaf": leaf },
          },
          { new: true }
        );
        if (!updatedCrop) {
          return res.status(400).json({ error: "Failed to recieve image." });
        }
      } catch (error) {
        throw new Error("Error sending notifications");
      }
    }
    return res
      .status(200)
      .json({ result: "success", frequencyFlag: req.frequencyFlag });
  } catch (error) {
    return res.status(500).json({ error: error.message, error2: error });
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

    let updatedCrop = await Crop.findByIdAndUpdate(
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

    // ******Check the Readings of the crop to provide notifications*******
    // To get the externalId
    const userData = await User.findById(deviceData.userId);
    if (!userData) {
      console.log("Error saving alert and response");
    }
    // Notification API request body
    let soilAlert;
    const url = "https://api.onesignal.com/notifications";
    let options = {
      method: "POST",
      headers: {
        accept: "application/json",
        Authorization: "Basic " + process.env.OSAPIKEY,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        app_id: process.env.APPID,
        include_aliases: {
          external_id: [userData.email],
        },
        target_channel: "push",
        data: { foo: "bar" },
      }),
    };

    // ****Check if the type of crop is provided****
    if (updatedCrop.name) {
      const cropName = updatedCrop.name.toLowerCase();
      // Check if there is an optimal-medium for the crop before adding one
      let cropMedium = await CropMedium.findOne({ cropName });
      if (!cropMedium) {
        // Save the optimal medium if it doesnt exist
        cropMedium = await saveSoilMedium(cropName);
      }
      // Let Gemini compare the readings and select
      soilAlert = await compareSoilMedium(cropName, soilReadings, cropMedium)
        .result;
      //case no alert
      if (
        !soilAlert.action ||
        !soilAlert.message ||
        !soilAlert.severity ||
        !soilAlert.nutrient
      ) {
        options.headings = {
          en: "🌱Crop Health Update! On " + updatedDevice.name + " Soil!",
        };
        options.contents = {
          en:
            "Your" +
            updatedCrop.name +
            "crop is flourishing. Keep up the fantastic work! 🌽 Tap for further details!",
        };
        try {
          const OSresponse = await fetch(url, options);
          const OSdata = await OSresponse.json();
        } catch (error) {
          console.error("error:" + error);
        }
        return res
          .status(200)
          .json({ result: "success", frequencyFlag: req.frequencyFlag });
      }
      const includesHigh = soilAlert.severity.includes("high");
      // send Notifications option

      // if there is no severe alert
      if (!includesHigh) {
        options.headings = {
          en: "🌱Crop Health Update! On " + updatedDevice.name + " Soil!",
        };
        options.contents = {
          en:
            "Your" +
            updatedCrop.name +
            "crop is in good condition. Keep up the great work! 🌽 Tap for further details!",
        };
      } else {
        options.headings = {
          en: "Attention: Soil Health Alert on: " + deviceData.name + "!",
        };
        options.contents = {
          en:
            soilAlert.message[0] +
            "! Tap to view vital insights and get more information on your soil. 📱🌾",
        };
      }

      try {
        const OSresponse = await fetch(url, options);
        const OSdata = await OSresponse.json();
      } catch (error) {
        console.error("error:" + error);
      }
    } else {
      //in case the crop isn't named
      soilAlert = await inspectSoilMedium(soilReadings).result;
      // In case there is no alerts
      if (
        !soilAlert.action ||
        !soilAlert.message ||
        !soilAlert.severity ||
        !soilAlert.nutrient
      ) {
        options.headings = {
          en: "Soil State Update! On " + updatedDevice.name + " Soil!",
        };
        options.contents = {
          en: "Your soil's excellent condition sets the stage for thriving plants! Tap to select your crop for personalized tips and alerts!🌾",
        };
        try {
          const OSresponse = await fetch(url, options);
          const OSdata = await OSresponse.json();
        } catch (error) {
          console.error("error:" + error);
        }
        return res
          .status(200)
          .json({ result: "success", frequencyFlag: req.frequencyFlag });
      }
      // Filter the alerts to only save those high and save medium and high severity
      const includesHigh = soilAlert.severity.includes("high");
      // if it doesnt contain high severity send normal notification
      if (!includesHigh) {
        options.headings = { en: "Optimize Your Soil's Health!🌿" };
        options.contents = {
          en: "Ensure your soil readings are tailored to your crops' needs for vibrant growth and optimal yield! Tap for further details!",
        };
      } else {
        options.headings = {
          en: "Attention: Soil Health Alert on: " + deviceData.name + "!",
        };
        options.contents = {
          en:
            soilAlert.message[0] +
            "! Your soil could use a little love to help your crops thrive! Tap to choose your crop for friendly advice and alerts!",
        };
      }
      try {
        const OSresponse = await fetch(url, options);
        const OSdata = await OSresponse.json();
      } catch (error) {
        console.error("error:" + error);
      }
    }
    updatedCrop = await Crop.findByIdAndUpdate(
      cropId,
      { $set: { "alerts.soil": soilAlert } },
      { new: true }
    );
    if (!updatedCrop) {
      console.log("Failed to update alerts");
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

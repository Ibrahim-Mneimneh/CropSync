const Device = require("../Models/deviceModel");
const User = require("../Models/userModel");

// get the weather data
const getDailyWeather = async (req, res) => {
  try {
    const userId = req.userId;
    const device = await Device.findOne({ userId });
    if (!device) {
      return res.status(404).json({ error: "User not found." });
    }

    const location = device.city + ", " + device.country;
    console.log(location);
    const endpoint =
      "http://api.weatherapi.com/v1/current.json?key=" +
      process.env.weatherKey +
      "&q=" +
      location +
      "&aqi=yes";

    const weatherDataResponse = await fetch(endpoint);
    if (!weatherDataResponse.ok) {
      return res.status(400).json({ error: "couldnt" });
    }
    const weatherData = await weatherDataResponse.json();
    console.log(weatherData);
    return res.status(200).json(weatherData.current);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// Get weather details
const getWeeklyWeather = async (req, res) => {};

// soon forecasts

module.exports = {
  getDailyWeather,
};

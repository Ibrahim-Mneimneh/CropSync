const Device = require("../Models/deviceModel");
const User = require("../Models/userModel");

// get the weather data
const getDailyWeather = async (req, res) => {
  try {
    const userId = req.userId;
    const devices = await Device.find({ userId });
    if (!devices) {
      return res.status(404).json({ error: "Please add a device." });
    }

    const userWeatherData = await Promise.all(
      devices.map(async (device) => {
        const location = device.city + ", " + device.country;
        const endpoint =
          "http://api.weatherapi.com/v1/current.json?key=" +
          process.env.weatherKey +
          "&q=" +
          location +
          "&aqi=no";
        const weatherDataResponse = await fetch(endpoint);
        const weatherData = await weatherDataResponse.json();
        return { name: device.name, location, ...weatherData.current };
      })
    );
    return res.status(200).json(userWeatherData);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// Get weather details
const getWeeklyWeather = async (req, res) => {
  try {
    const userId = req.userId;
    const { num } = req.params;
    if (num > 3) {
      return res.status(404).json({ error: "Max of 3 days forecast." });
    }
    const devices = await Device.find({ userId });
    if (!devices) {
      return res.status(404).json({ error: "Please add a device." });
    }

    const userWeatherData = await Promise.all(
      devices.map(async (device) => {
        const location = device.city + ", " + device.country;
        const endpoint =
          "http://api.weatherapi.com/v1/forecast.json?key=" +
          process.env.weatherKey +
          "&q=" +
          location +
          "&days=" +
          num +
          "&aqi=no&alerts=yes";
        const weatherDataResponse = await fetch(endpoint);
        const weatherDataJson = await weatherDataResponse.json();

        const weatherDataArray = weatherDataJson.forecast.forecastday;
        const weatherData = weatherDataArray.map((day) => {
          return { date: day.date, ...day.day };
        });
        return { name: device.name, location, weatherData };
      })
    );
    return res.status(200).json(userWeatherData);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getDailyWeather,
  getWeeklyWeather,
};

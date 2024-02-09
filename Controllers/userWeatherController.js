const User = require("../Models/userModel");

// get the weather data
const getDailyWeather = async () => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId);
    const location = user.city + ", " + user.country;
    const endpoint =
      "https://api.weatherapi.com/v1/current.json?key=" +
      process.env.weatherKey +
      "&q=" +
      location +
      "&aqi=yes";
    const weatherData = await fetch(endpoint);
    print(weatherData);
  } catch (error) {
    return resizeBy.status(500).json({ error: error.message });
  }
};

// Get weather details
const getWeeklyWeather = async () => {};

// soon forecasts

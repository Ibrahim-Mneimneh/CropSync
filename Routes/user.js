const express = require("express");
const {
  loginUser,
  signupUser,
  getUser,
  changePassword,
  resetPassword,
} = require("../Controllers/userController");
const {
  resetPasswordRequest,
  deleteAccountRequest,
  deleteAccount,
} = require("../Controllers/AuthController");
const {
  getDailyWeather,
  getWeeklyWeather,
} = require("../Controllers/userWeatherController");
const { verifyUser } = require("../Middleware/UserAuth");
const {
  setDeviceLocation,
  setProfile,
  deleteProfile,
  getDevices,
  addDevice,
  deleteDevice,
  getProfile,
  editDevice,
  setDeviceCrop,
  getRecentSoilData,
  getDeviceImages,
  getRecentDevicesImage,
  setDeviceFrequency,
  getWeeklyDeviceData,
  getMonthlyDeviceData,
  getImageFromUrl,
  editImageClass,
} = require("../Controllers/userController-2");
const { isHealthy, recommendCrop } = require("../Controllers/modelController");
const {
  callGeminiImage,
  testCompareSoil,
} = require("../Controllers/GeminiController");
const router = express.Router();

router.post("/login", loginUser);

router.post("/signup", signupUser);
router.post("/Request/ResetPassword", resetPasswordRequest);
// Middleware for these 2 routes
router.use("/ResetPassword", verifyUser);
router.use("/ChangePassword", verifyUser);
router.use("/Request/DeleteAccount", verifyUser);
router.use("/DeleteAccount", verifyUser);
router.use("/add/device", verifyUser);
router.use("/set/profile", verifyUser);
router.use("/profile", verifyUser);
router.use("/delete/profile", verifyUser);
router.use("/device", verifyUser);
router.use("/devices", verifyUser);
router.use("/", verifyUser);
router.use("/daily/weather", verifyUser);
router.use("/weather/forecast/:num", verifyUser);
router.use("/leaf/state", verifyUser);
router.use("/set/crop", verifyUser);
router.use("/:deviceId/recommend/crop", verifyUser);
router.use("/:deviceId/soil/reading", verifyUser);
router.use("/:deviceId/images", verifyUser);
router.use("/devices/image", verifyUser);
router.use("/:deviceId/frequency", verifyUser);
router.use("/device/soil/reading/weekly", verifyUser);
router.use("/device/soil/reading/monthly", verifyUser);
router.use("/:deviceId/image/:leafImageId", verifyUser);
router.use("/:deviceId/image/class/:leafImageId", verifyUser);

router.post("/ResetPassword", resetPassword);
router.get("/Request/DeleteAccount", deleteAccountRequest);
router.delete("/DeleteAccount", deleteAccount);
router.post("/ChangePassword", changePassword);
router.post("/add/device", addDevice);
router.post("/set/profile", setProfile);
router.get("/profile", getProfile);
router.delete("/delete/profile", deleteProfile);
router.delete("/device", deleteDevice);
router.get("/devices", getDevices);
router.get("/", getUser);
router.patch("/device", editDevice);
router.get("/daily/weather", getDailyWeather);
router.get("/weather/forecast/:num", getWeeklyWeather);
router.post("/leaf/state", isHealthy);
router.post("/set/crop", setDeviceCrop);
router.get("/:deviceId/recommend/crop", recommendCrop);
router.get("/:deviceId/soil/reading", getRecentSoilData);
router.get("/:deviceId/images", getDeviceImages);
router.get("/devices/image", getRecentDevicesImage);
router.patch("/:deviceId/frequency", setDeviceFrequency);
router.get("/device/soil/reading/weekly", getWeeklyDeviceData);
router.get("/device/soil/reading/monthly", getMonthlyDeviceData);
router.get("/:deviceId/image/:leafImageId", getImageFromUrl);
router.post("/:deviceId/image/class/:leafImageId", editImageClass);
module.exports = router;

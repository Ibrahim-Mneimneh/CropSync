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
} = require("../Controllers/userController-2");
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
module.exports = router;

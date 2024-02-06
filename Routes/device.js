const express = require("express");
const {
  connectDevice,
  recieveLeafImage,
  recieveSoilData,
} = require("../deviceController/deviceConroller");
const { verifyDevice } = require("../Middleware/DeviceAuth");

const router = express.Router();

router.post("/connect", connectDevice);

router.use("/soil", verifyDevice);
router.use("/leaf", verifyDevice);

router.post("/leaf", recieveLeafImage);
router.post("/soil", recieveSoilData);
module.exports = router;

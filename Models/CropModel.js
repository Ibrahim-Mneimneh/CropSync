const mongoose = require("mongoose");

const Schema = mongoose.Schema;
const cropAuthSchema = new Schema(
  {
    userId: {
      type: String,
      required: true,
    },
    deviceId: {
      type: String,
      required: true,
    },
    name: {
      type: String,
    },
    nitrogen: {
      type: Array,
    },
    phosphorus: {
      type: Array,
    },
    potassium: {
      type: String,
    },
    ph: {
      type: Array,
    },
    humidity: {
      type: Array,
    },
    temperature: {
      type: Array,
    },
    image: [{ type: Buffer }],
    sensorCollectionDate: [{ type: Date }],
    cameraCollecationDate: [{ type: Date }],
  },
  { timestamps: true }
);
module.exports = mongoose.model("Crop", cropAuthSchema);

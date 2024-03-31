const mongoose = require("mongoose");

const Schema = mongoose.Schema;
const deviceSchema = new Schema(
  {
    isConnected: { type: Boolean, default: false },
    deviceId: { type: String, required: true },
    city: {
      type: String,
    },
    country: {
      type: String,
    },
    name: {
      type: String,
    },
    userId: {
      type: String,
      required: true,
    },
    cropId: {
      type: String,
    },
    code: { type: String },
    imageFrequency: {
      type: Number,
      default: 1,
    },
    soilFrequency: {
      type: Number,
      default: 1,
    },
    frequencyFlag: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("device", deviceSchema);

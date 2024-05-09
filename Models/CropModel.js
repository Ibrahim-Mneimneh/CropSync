const mongoose = require("mongoose");

const Schema = mongoose.Schema;
const cropAuthSchema = new Schema(
  {
    name: {
      type: String,
      default: null,
    },
    profile: {
      type: String,
    },
    soilReadings: [
      { type: mongoose.Schema.Types.ObjectId, ref: "soilReadings" },
    ],
    leafImages: [{ type: mongoose.Schema.Types.ObjectId, ref: "leafImages" }],
    sensorCollectionDate: [{ type: Date }],
    cameraCollectionDate: [{ type: Date }],
    alerts: {
      soil: {
        nutrient: [{ type: String }],
        severity: [{ type: String }],
        message: [{ type: String }],
        action: [{ type: String }],
      },
      leaf: {
        status: { type: String, default: "Healthy" },
        message: [{ type: String }],
        action: [{ type: String }],
      },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Crop", cropAuthSchema);

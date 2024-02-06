const mongoose = require("mongoose");

const Schema = mongoose.Schema;
const cropAuthSchema = new Schema(
  {
    name: {
      type: String,
      default: null,
    },
    profile: {
      type: Buffer,
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
    cameraCollectionDate: [{ type: Date }],
  },
  { timestamps: true }
);
module.exports = mongoose.model("Crop", cropAuthSchema);

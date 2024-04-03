const mongoose = require("mongoose");

const Schema = mongoose.Schema;
const SoilRedaingSchema = new Schema({
  nitrogen: {
    type: Number,
    required: true,
  },
  phosphorus: {
    type: Number,
    required: true,
  },
  potassium: {
    type: Number,
    required: true,
  },
  ph: {
    type: Number,
    required: true,
  },
  humidity: {
    type: Number,
    required: true,
  },
  temperature: {
    type: Number,
    required: true,
  },
  rainfall: {
    type: Number,
    required: true,
  },
});
module.exports = mongoose.model("soilReadings", SoilRedaingSchema);

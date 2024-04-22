const mongoose = require("mongoose");

const Schema = mongoose.Schema;
const cropMediumSchema = new Schema({
  cropName: { type: String, unique: true },
  medium: {
    soilCondition: {
      soilType: { type: Array },
      rich_in: { type: String },
      description: { type: String },
    },
    ph: [{ type: Number }],
    nitrogen: [{ type: Number }],
    phosphorus: [{ type: Number }],
    potassium: [{ type: Number }],
    temperature: [{ type: Number }],
    moisture: [{ type: Number }],
  },
});
module.exports = mongoose.model("CropMedium", cropMediumSchema);

const mongoose = require("mongoose");

const Schema = mongoose.Schema;
const LeafImageSchema = new Schema({
  image: {
    type: Buffer,
    required: true,
  },
});
module.exports = mongoose.model("leafImages", LeafImageSchema);

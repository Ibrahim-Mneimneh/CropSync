const tf = require("@tensorflow/tfjs-node");
const { createCanvas, loadImage } = require("canvas");
const path = require("path");

async function loadModel() {
  try {
    const modelPath = path.resolve(__dirname, "Model_Layers/model.json");
    const model = await tf.loadLayersModel(`file://${modelPath}`);
    console.log("Model Summary:", model.summary());
    return model;
  } catch (error) {
    console.error("Error loading model:", error);
    throw error; // rethrow the error to propagate it
  }
}

async function preprocessImage(base64Image) {
  const binaryImage = Buffer.from(base64Image, "base64");

  const img = await loadImage(binaryImage);
  const canvas = createCanvas(224, 224);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, 224, 224);

  // Convert the image to a tensor and preprocess using ResNet50's preprocess_input function
  const inputTensor = tf.browser.fromPixels(canvas).toFloat();
  const mean = tf.tensor([103.939, 116.779, 123.68]);
  const processedTensor =
    tf.keras.applications.resnet50.preprocess_input(inputTensor);

  return processedTensor.expandDims();
}

const isHealthy = async (req, res) => {
  try {
    const { base64Image } = req.body;
    if (!base64Image) {
      return res.status(400).json({ error: "Please select an image" });
    }
    const model = await loadModel();
    console.log("here !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
    const preprocessedImage = await preprocessImage(base64Image);
    const predictions = await model
      .predict(tf.tensor(preprocessedImage))
      .data();

    console.log("Predictions:", predictions);

    res.status(200).json({ predictions });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: error.message });
  }
};
module.exports = { isHealthy };

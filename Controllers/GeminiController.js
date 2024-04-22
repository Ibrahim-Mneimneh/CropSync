const { GoogleGenerativeAI } = require("@google/generative-ai");
const CropMedium = require("../Models/CropMedium");

async function runText(prompt) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINIAPI);
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });

  const result = await model.generateContent(prompt);
  const response = await result.response;
  let text = response.text();
  text = text.slice(7, text.length - 3);
  text = JSON.parse(text);
  return text;
}
async function runImage(prompt, base64Image) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINIAPI);
  // For text-and-image input (multimodal), use the gemini-pro-vision model
  const model = genAI.getGenerativeModel({ model: "gemini-pro-vision" });
  const imageParts = {
    inlineData: {
      data: base64Image,
      mimeType: "image/jpeg",
    },
  };
  const result = await model.generateContent([prompt, imageParts]);
  const response = result.response;
  let text = response.text();
  text = JSON.parse(text);
  console.log("Text here:" + text);
  return text;
}
const analyzeImage = async (base64Image) => {
  try {
    const prompt =
      'Soil is important for crop growth.Please provide based on the given image any soil deficiency that can be drived from this image while making sure all the arrays have equal length and those of the same array index correlate to each other,if there is no deficiency return empty arrays. Provide this information the format as following as a string: {message: [ array of short messages on the soil status e.g. "High levels of potassium"],action:[array of actions to take],}';
    const result = await runImage(prompt, base64Image);
    console.log(result);
    if (!result) {
      throw new Error("Failed to analyze image, no result. ");
    }
    return result;
  } catch (error) {
    console.log("Failed to analyze image. " + error.message);
    throw new Error(error.message);
  }
};

const saveSoilMedium = async (cropName) => {
  try {
    if (!cropName) {
      throw new Error("Invalid parameters");
    }
    const prompt = `${cropName} requires the following for optimal yield:
* Soil Conditions:
  * Soil Type: (List up to 3 best options)
  * Rich In: (Specify the most beneficial nutrient)
  * Description: (Start with 'Ensure your soil is...')
* pH Range: (Minimum and maximum values)
* Macronutrients (mg/kg):
  * Nitrogen: (Minimum and maximum values)
  * Phosphorus: (Minimum and maximum values)
  * Potassium: (Minimum and maximum values)
* Temperature (°C): (Minimum and maximum values for optimal growth)
* Moisture (% Relative Humidity): (Minimum and maximum values)

Please provide this information in the following JSON format:
\`\`\`JSON
{
  "soilCondition": {
    "soilType": ["soil type 1", "soil type 2", "soil type 3"],
    "rich_in": "nutrient",
    "description": "description about soil"
  },
  "ph": [minimum pH, maximum pH],
  "nitrogen": [minimum nitrogen, maximum nitrogen],
  "phosphorus": [minimum phosphorus, maximum phosphorus],
  "potassium": [minimum potassium, maximum potassium],
  "temperature": [minimum temperature, maximum temperature],
  "moisture": [minimum moisture, maximum moisture]
}\`\`\` return the JSON i can parse`;

    let result = await runText(prompt);
    if (!result) {
      throw new Error("Connection failed");
    }
    const cropMedium = await CropMedium.create({ cropName, result });
    if (!cropMedium) {
      throw new Error("Failed to add CropMedium");
    }
    return { ...result };
  } catch (error) {
    console.log("Failed to find the optimal medium:" + error.message);
    throw new Error("Failed to find the optimal medium:" + error.message);
  }
};

const compareSoilMedium = async (cropName, soilReading, cropMedium) => {
  ///done
  try {
    if (!cropName || !soilReading || !cropMedium) {
      throw new Error("Invalid parameters");
    }
    const { soilCondition, ...cropMediumLevels } = cropMedium;
    const prompt =
      cropName +
      "requires the following for optimal yield: * Soil Conditions:* Soil Type: (List up to 3 best options)* Rich In: (Specify the most beneficial nutrient)* Description: (Start with 'Ensure your soil is...')* pH Range: (Minimum and maximum values)* Macronutrients (mg/kg):* Nitrogen: (Minimum and maximum values)* Phosphorus: (Minimum and maximum values)* Potassium: (Minimum and maximum values)* Temperature (°C): (Minimum and maximum values for optimal growth)* Moisture (% Relative Humidity): (Minimum and maximum values) given as " +
      JSON.stringify(cropMediumLevels) +
      "Please provide this information in the following JSON format **while making sure all the arrays have equal length and those of the same array index correlate to each other**: ```JSON{message: [ array of **short messages** on the soil status e.g. 'High levels of potassium'],nutrient: [*includes the name of values being comapred *],severity: [**array of severity levels of medium or high (sorted such that high is first) and based of the optimal ranges**],action: [array of actions to take],}``` Mysoil readings are" +
      JSON.stringify(soilReading) +
      "compare the my soilreading values with range given for optimal yield **If the levels are within the optimal range return the arrays empty** return the JSON i can parse";
    const result = await runText(prompt);
    console.log(result);
    if (!result) {
      throw new Error("Connection failed");
    }
    return result;
  } catch (error) {
    console.log("Failed to find the optimal medium:" + error.message);
    throw new Error(error.message);
  }
};

const inspectSoilMedium = async (soilReading) => {
  try {
    if (!soilReading) {
      throw new Error("Invalid parameters");
    }
    const prompt =
      "Soil is important for crop growth.Please provide based on soil fertility analysis **while making sure all the arrays have equal length and those of the same array index correlate to each other**, provide this information in the following JSON format: ```JSON{message: [ array of **short messages** on the soil status e.g. 'High levels of potassium'],nutrient: [*includes the name of values being comapred *],severity: [**array of severity levels of medium or high (sorted such that high is first) and based of the optimal ranges**],action: [array of actions to take],}``` If my soil readings are:" +
      JSON.stringify(soilReading);
    const result = await runText(prompt);

    if (!result) {
      throw new Error("Connection failed");
    }
    return result;
  } catch (error) {
    console.log("Failed to find the optimal medium:" + error.message);
    throw new Error("Failed to find the optimal medium:" + error.message);
  }
};
/*const testCompareSoil = async (req, res) => {
  try {
    const { base64Image } = req.body;

    let result = await analyzeImage(base64Image);
    if (!result) {
      return res.status(400).json({ error: "Connection failed" });
    }
    return res.status(200).json({ ...result });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};*/

module.exports = {
  saveSoilMedium,
  compareSoilMedium,
  inspectSoilMedium,
  analyzeImage,
};

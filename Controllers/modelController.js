const isHealthy = async (req, res) => {
  try {
    const { base64Image } = req.body;
    if (!base64Image) {
      return res.status(400).json({ error: "Please select an image to scan" });
    }
    const response = await fetch("http://172.33.133.137:5000/predict", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ img: base64Image }),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    res.status(200).json({ result: data });
  } catch (error) {
    console.error(error.message);
    return res
      .status(500)
      .json({ error: "Error processing image", details: error.message });
  }
};

module.exports = { isHealthy };

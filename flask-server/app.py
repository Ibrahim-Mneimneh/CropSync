import os 
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'
from flask import Flask, request, jsonify
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras.applications.resnet50 import preprocess_input
from tensorflow.keras.preprocessing import image
import numpy as np
import base64
from PIL import Image
from io import BytesIO
print("Current Working Directory:", os.getcwd())
def loadResNet():
    # Model file path
    model_path = r"C:\Users\Ibrahim Mneimneh\Desktop\MyFolder\GitHub\CropSync\flask-server\ResNet-classes2"

    try:
        # Load the model
        model = tf.keras.models.load_model(model_path)
        print(model.summary())
        print("Model loaded successfully!")
        return model
    except OSError as e:
        print("Error loading model:", e)
    except ValueError as e:
        print("Error: Model is incompatible or corrupt")



app = Flask(__name__) 
model = loadResNet()

@app.route('/predict', methods=['POST'])
def predict():
    global model  # Access the model defined outside this function
    if model is None:
        return jsonify({"error": "Model not loaded"})

    data = request.get_json()  # Get the data
    base64_image = data.get('img', None) # acquire the image
    
    if base64_image is None:
        return jsonify({"error": "Image data not provided"})
    
    # Decode the base64 string into a PIL Image
    image_data = base64.b64decode(base64_image)
    pil_image = Image.open(BytesIO(image_data))
    pil_image = pil_image.resize((224, 224))
    img_array = image.img_to_array(pil_image)
    #Cast to float32
    img_array = np.expand_dims(img_array, axis=0).astype('float32')
    # Preprocess the image
    img_preprocessed = preprocess_input(img_array)
    prediction = model.predict(img_preprocessed)
    # Get the predicted class label
    predicted_class_label = np.argmax(prediction)

    # Get the class label names
    class_labels = ['diseased','healthy']

    # Print the predicted class label
    print("Predicted class:", class_labels[predicted_class_label])
    result=class_labels[predicted_class_label]
    print("Result:", result)
    return jsonify(result)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000) 
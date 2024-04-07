import os 
import pickle
import sklearn.exceptions
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'
from flask import Flask, request, jsonify
import tensorflow as tf
import numpy as np
import base64
from PIL import Image
from io import BytesIO

print("Current Working Directory:", os.getcwd())

def loadResNet():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    # Model file path
    model_path = os.path.join(script_dir, "ResNet-classes2")
    try:
        from tensorflow import keras
        # Load the model
        model = tf.keras.models.load_model(model_path)
        print(model.summary())
        print("Model loaded successfully!")
        return model
    except OSError as e:
        print("Error loading model:", e)
    except ValueError as e:
        print("Error: Model is incompatible or corrupt")


def loadRandomForest():
    # Get the current working directory
    cwd = os.getcwd()
    model_path = os.path.join(cwd, "randomForest.pkl")
    try:
        with open(model_path, 'rb') as f:
            randomForest = pickle.load(f)
        return randomForest
    except FileNotFoundError as e:
        print(f"Model file '{model_path}' not found: {e}")
        return None
    except (pickle.UnpicklingError, ValueError) as e:
        print(f"Error loading Random Forest model: {e}")
        return None
    except Exception as e:
        print(f"Unexpected error occurred while loading Random Forest model: {e}")
        return None


app = Flask(__name__) 
model = loadResNet()
#rf = loadRandomForest()

@app.route('/predict', methods=['POST'])
def predict():
    from tensorflow.keras.applications.resnet50 import preprocess_input
    from tensorflow.keras.preprocessing import image
    global model  # Access the model defined outside this function
    if model is None:
        return jsonify({"result": None,"error": "Model not loaded"})

    data = request.get_json()  # Get the data
    base64_image = data.get('img', None) # acquire the image
    
    if base64_image is None:
        return jsonify({"result": None,"error": "Image data not provided"})
    
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
    return jsonify({"result": result, "error": None})
 
 
@app.route('/recommend', methods=['POST'])
def recommend():
    global rf  # Access the model defined outside this function
    if rf is None:
        return jsonify({"result":None,"error": "Random Forest cannot be loaded"})

    data = request.get_json()  # Get the data
    
    # Acquire the soil readings
    soilReadings = data.get('soilReading', None)
    
    if soilReadings is None:
        return jsonify({"result":None,"error": "Soil readings not provided"})
    
    # Extract individual parameters
    nitrogen = soilReadings.get('nitrogen', None)
    phosphorus = soilReadings.get('phosphorus', None)
    potassium = soilReadings.get('potassium', None)
    ph = soilReadings.get('ph', None)
    humidity = soilReadings.get('humidity', None)
    temperature = soilReadings.get('temperature', None)
    rainfall = soilReadings.get('rainfall', None)
    # Check if any parameter is missing
    if None in (nitrogen, phosphorus, potassium, ph, humidity, temperature):
        return jsonify({"error": "Some soil parameters are missing"})
    input_data = np.array([[nitrogen, phosphorus, potassium, temperature, humidity, ph, rainfall]])
    result =rf.predict(input_data)
    print("Result:", result)
    return jsonify({"result": result, "error": None})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000) 


import os 
import pickle
import sklearn.exceptions
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
from sklearn.preprocessing import StandardScaler
import numpy as np

print("Current Working Directory:", os.getcwd())

def loadResNet():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    # Model file path
    model_path = os.path.join(script_dir, "RESNET50-5-PLANT_DISEASE")
    try:
        # Load the model
        model = tf.keras.models.load_model(model_path)
        print(model.summary())
        print("ResNet loaded successfully!")
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
            print("RandomForest loaded successfully!")
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

def remove_outliers_and_replace_with_mean(array, threshold):
    # Calculate the mean and standard deviation of the array
    mean = np.mean(array)
    std_dev = np.std(array)
    
    # Calculate the threshold as a multiple of the standard deviation
    threshold_value = threshold * std_dev
    
    # Replace outliers with the mean
    cleaned_array = [x if (mean - threshold_value) <= x <= (mean + threshold_value) else mean for x in array]
    
    return cleaned_array


app = Flask(__name__) 
model = loadResNet()

@app.route('/predict', methods=['POST'])
def predict():
    global model  # Access the model defined outside this function
    if model is None:
        return jsonify({"result": None,"error": "Model not loaded"})

    data = request.get_json()  # Get the data
    base64_image = data.get('img', None) # acquire the image
    
    if base64_image is None:
        return jsonify({"result": None,"error": "Image data not provided"})
    try:
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
        print(prediction)
        class_labels = ["Bacterial Spot","Early Blight","Healthy","Late Blight","Powdery Mildew"]

        # Print the predicted class label
        print("Predicted class:", class_labels[predicted_class_label])
        result=class_labels[predicted_class_label]
        print("Result:", result)
        return jsonify({"result": result, "error": None})
    except Exception as e:
        # Handle any errors that occur during image processing
        return jsonify({"result": None, "error": str(e)})
 
 
@app.route('/recommend', methods=['POST'])
def recommend():
    rf = loadRandomForest()
    if rf is None:
        return jsonify({"result": None, "error": "Random Forest cannot be loaded"})

    data = request.get_json()  # Get the data
    
    # Acquire the soil readings
    soilReadings = data.get('soilReading', None)
    
    if soilReadings is None:
        return jsonify({"result": None, "error": "Soil readings not provided"})
    
    thresholds = {
    'nitrogen': 1.9,
    'phosphorus': 1.9,
    'potassium': 1.9,
    'temperature': 2,
    'ph': 1.5,
    'moisture': 2,
}
    averages={}
    averages_before={}
    for key, array in soilReadings.items():
        if key !="rainfall":
            averages_before[key] = np.mean(array)
            print(key)
            threshold= thresholds.get(key,None)
            cleaned_array = remove_outliers_and_replace_with_mean(array,threshold)
            average = np.mean(cleaned_array)
        else:
            average=np.mean(array)
        averages[key] = average
    print("Averages before: ",averages_before)
    print("Averages after: ",averages)
    # Extract individual parameters
    nitrogen = averages.get('nitrogen', None)
    phosphorus = averages.get('phosphorus', None)
    potassium = averages.get('potassium', None)
    ph = averages.get('ph', None)
    moisture = averages.get('moisture', None)
    temperature = averages.get('temperature', None)
    rainfall = averages.get('rainfall', None)
    
    # Check if any parameter is missing
    if None in (nitrogen, phosphorus, potassium, ph, moisture, temperature):
        return jsonify({"error": "Some soil parameters are missing"})
    input_data = np.array([[nitrogen, phosphorus, potassium, temperature, moisture, ph, rainfall]])
    
    # Make prediction using the random forest model
    result = rf.predict(input_data)
    print("Result:", result)
    return jsonify({"result": result.tolist(), "error": None})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000) 

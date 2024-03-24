var randomize = require("randomatic");
const validator = require("validator");
//Models
const User = require("../Models/userModel");
const Device = require("../Models/deviceModel");
const Crop = require("../Models/CropModel");
const SoilReading = require("../Models/Device-Sub/soilReadingModel");
const LeafImage = require("../Models/Device-Sub/leafImages");
// set profile image
const setProfile = async (req, res) => {
  try {
    const userId = req.userId;
    // base 64 image
    const { profilePicture } = req.body;
    if (!profilePicture) {
      return res
        .status(400)
        .json({ error: "Please select a valid image format" });
    }
    // convert base 64 to buffer
    const profilePictureBuffer = Buffer.from(profilePicture, "base64");
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        profilePicture: profilePictureBuffer,
      },
      { new: true }
    );
    if (!updatedUser) {
      return res
        .status(200)
        .json({ message: "Failed to update profile picture." });
    }
    return res.status(200).json({ message: "Profile update successfully" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const getProfile = async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId);
    const profilePictureBuffer = user.profilePicture;
    if (!user.profilePicture) {
      return res.status(404).json({ error: "Profile picture not found" });
    }
    const profilePictureBase64 = user.profilePicture.toString("base64");
    res.status(200).json({ profilePicture: profilePictureBase64 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
// delete profile image
const deleteProfile = async (req, res) => {
  try {
    const userId = req.userId;
    const updatedUser = await User.findByIdAndUpdate(userId, {
      profilePicture: null,
    });
    if (!updatedUser) {
      return res.status(200).json({ message: "Profile picture update failed" });
    }
    return res
      .status(200)
      .json({ message: "Profile picture updated successfully" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// Get all devices
const getDevices = async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId);
    // user not found
    if (!user) {
      return res.status(404).json({ error: "Devices not found" });
    }
    // there is no devices for the user
    const { devicesId } = user;
    if (!devicesId) {
      return res.status(404).json({ error: "Please add a device" });
    }

    const devices = await Promise.all(
      devicesId.map(async (deviceId) => {
        const deviceData = await Device.findById(deviceId);
        if (!deviceData) {
          return res.status(404).json({ error: "Failed to find device." });
        }
        const crop = await Crop.findById(deviceData.cropId);
        if (!crop) {
          return res.status(404).json({ error: "Failed to find device." });
        }
        const device = {
          deviceId: deviceData.deviceId,
          location: deviceData.city + ", " + deviceData.country,
          name: deviceData.name,
          isConnected: deviceData.isConnected,
          code: deviceData.code,
          crop: {
            name: crop.name ? crop.name : null,
          },
        };
        return device;
      })
    );
    return res.status(200).json({ devices });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// Add a device
const addDevice = async (req, res) => {
  try {
    const { location, name, code } = req.body;
    if (!location || !name || !code) {
      return res.status(400).json({ error: "All fields are required" });
    }
    // create crop
    const crop = await Crop.create({});

    if (!crop) {
      return res.status(400).json({ error: "Failed to add device" });
    }

    const [cityName, countryName] = location.split(", ");
    let deviceData = await Device.create({
      deviceId: "Micro-" + randomize("a0", 6),
      userId: req.userId,
      name,
      city: cityName,
      country: countryName,
      code,
      cropId: crop._id,
    });

    // update the devicesId in the user model
    if (deviceData) {
      const updatedUser = await User.findByIdAndUpdate(
        req.userId,
        {
          $push: { devicesId: deviceData._id },
        },
        { new: true }
      );
    }
    const {
      _id,
      userId,
      createdAt,
      updatedAt,
      country,
      cropId,
      city,
      ...device
    } = deviceData.toObject();
    // add crop declaration right here ******
    return res.status(200).json({ ...device, location });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
// edit device name and location
const editDevice = async (req, res) => {
  try {
    const { location, name, deviceId } = req.body;
    if (!deviceId) {
      return res.status.json({
        error: "Please select a device to edit",
      });
    }
    if (!location && !name) {
      return res.status.json({
        error: "Please fill at least 1 required field",
      });
    }
    const updateFields = {};

    if (location) {
      const [city, country] = location.split(", ");
      updateFields.city = city;
      updateFields.country = country;
    }

    if (name) {
      updateFields.name = name;
    }

    const updatedDeviceData = await Device.findOneAndUpdate(
      { userId: req.userId, deviceId },
      updateFields,
      { new: true }
    );

    if (!updatedDeviceData) {
      return res.status(404).json({ error: "Device not found" });
    }
    const { _id, userId, createdAt, updatedAt, ...device } =
      updatedDeviceData.toObject();
    return res.status(200).json(device);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
// delete a device
const deleteDevice = async (req, res) => {
  try {
    // the one we get from the user
    const userDeviceId = req.body.deviceId;
    if (!userDeviceId) {
      return res
        .status(400)
        .json({ error: "Please select a device to delete." });
    }
    const user = await User.findById(req.userId);
    // we get the user's devices Ids
    const devicesId = user.devicesId;
    let deletedDeviceData;
    // loop through each
    for (const deviceId of devicesId) {
      const device = await Device.findById(deviceId);
      // check if the deviceId matches
      if (device && device.deviceId === userDeviceId) {
        deletedDeviceData = await Device.findByIdAndDelete(deviceId);
        break;
      }
    }
    if (!deletedDeviceData) {
      return res.status(404).json({ error: "Couldn't find this device." });
    }
    // update the user's device data
    const updatedUser = await User.findByIdAndUpdate(
      req.userId,
      { $pull: { devicesId: deletedDeviceData._id } },
      { new: true }
    );
    const { _id, userId, createdAt, updatedAt, ...deletedDevice } =
      deletedDeviceData.toObject();

    return res.status(200).json(deletedDevice);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// set a crop
const setDeviceCrop = async (req, res) => {
  try {
    const { name, profile, deviceId } = req.body;
    const userId = req.userId;
    if (!deviceId) {
      return res.status(400).json({
        error: "Please select a device to edit",
      });
    }
    if (!name && !profile) {
      return res.status(400).json({
        error: "Please fill at least 1 required field",
      });
    }
    const updateFields = {};
    if (name) {
      updateFields.name = name;
    }

    if (profile) {
      updateFields.profile = profile;
    }
    const deviceData = await Device.findOne({ deviceId, userId });
    if (!deviceData) {
      return res.status(400).json({ error: "Failed to set crop credtials" });
    }
    const cropData = await Crop.findByIdAndUpdate(
      deviceData.cropId,
      updateFields,
      { new: true }
    );
    if (!cropData) {
      return res.status(400).json({ error: "Failed to set crop credentials" });
    }

    const { soilReadings, leafImages } = cropData;

    let includedFields = {};
    if (leafImages) {
      const recentLeafImage = await LeafImage.findById(
        leafImages[leafImages.length - 1]
      );
      if (!recentLeafImage) {
        return res.status(400).json({ error: "Failed to set crop credtials" });
      }
      const [recentCameraCollectionDate] =
        cropData.cameraCollectionDate.slice(-1);

      includedFields.recentCameraCollectionDate = recentCameraCollectionDate;
      includedFields.recentLeafImage = recentLeafImage.image.toString("base64");
    }
    if (soilReadings) {
      const recentSoilReading = await SoilReading.findById(
        soilReadings[soilReadings.length - 1]
      );
      if (!recentSoilReading) {
        return res.status(400).json({ error: "Failed to set crop credtials" });
      }
      const [recentSensorCollectionDate] =
        cropData.sensorCollectionDate.slice(-1);

      includedFields.recentSensorCollectionDate = recentSensorCollectionDate;
      const {
        _id,
        userId,
        createdAt,
        updatedAt,
        ...recentSoilReadingFiltered
      } = recentSoilReading.toObject();
      includedFields.recentSoilReading = recentSoilReadingFiltered;
    }
    return res.status(200).json({
      name: cropData.name,
      profile: cropData.profile ? cropData.profile.toString("base64") : "",
      ...includedFields,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
//Implement Pagination
const getDeviceImages = async (req, res) => {
  try {
    const { deviceId } = req.body;
    const { page = 1, limit = 10 } = req.query;
    const userId = req.userId;
    if (!deviceId) {
      return res.status(400).json({
        error: "Please select a device to edit",
      });
    }
    if (isNaN(parseInt(page)) || page < 1) {
      return res.status(400).json({
        error: "Page number must be a positive integer",
      });
    }

    if (isNaN(parseInt(limit)) || limit < 1) {
      return res.status(400).json({
        error: "Limit must be a positive integer",
      });
    }
    const deviceData = await Device.findOne({ deviceId, userId });
    if (!deviceData) {
      return res.status(400).json({ error: "Failed to set crop credtials" });
    }
    const cropData = await Crop.findByIdAndUpdate(deviceData.cropId);
    const startIndex = (page - 1) * limit;
    const totalImages = cropData.leafImages.length;
    const endIndex = Math.min(startIndex + limit, totalImages);
    const imageBatchIds = cropData.leafImages.slice(startIndex, endIndex);

    const imageBatch = await Promise.all(
      imageBatchIds.map(async (imageId) => {
        const imageData = await LeafImage.findById(imageId);
        return imageData.image.toString("base64");
      })
    );
    return res.status(200).json({
      images: imageBatch,
      pagination: {
        totalImages,
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalImages / limit),
      },
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
// Set the timing for soil readings and camera images along with the size of the images sou want
const setDeviceTimer = async (req, res) => {
  try {
    const { imageFrequency, soilFrequency, deviceId } = req.body;
    if (!deviceId) {
      return res.status(400).json({ error: "Please select a device" });
    }
    if (!imageFrequency && !soilFrequency) {
      return res
        .status(400)
        .json({ error: "Please select a device's reading frequency" });
    }
    let updateFields = {};
    if (soilFrequency) {
      // set the formatting of the data to save it ******
      if (soilFrequency) {
      }
    }
    if (imageFrequency) {
      if (imageFrequency) {
      }
    }
    const updatedDeviceData = await Device.findOneAndUpdate(
      {
        deviceId,
        userId: req.userId,
      },
      updateFields,
      { new: true }
    );
    if (!updatedDeviceData) {
      return res.status(404).json({ error: "Device not found" });
    }
    const { _id, userId, createdAt, updatedAt, ...updatedDevice } =
      updatedDeviceData.toObject();
    return res.status(200).json({ ...updatedDevice });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
// Graph Visual Data

// Get Most Recent device Image (Ig)

// Adjust the date and time of the server with its host

// Add the link to Gemini to get the tips on how to treat the leaf

// Check if we can deploy the model on the mobile and make predictions offline

// Add the get most recent readings
const getRecentSoilData = async (req, res) => {
  try {
    const { deviceId } = req.body;
    if (!deviceId) {
      return res.status(400).json({
        error: "Please select a device to edit",
      });
    }
    const deviceData = await Device.findOne({ deviceId, userId: req.userId });
    if (!deviceData) {
      return res.status(400).json({ error: "Failed to set crop credtials" });
    }
    const cropData = await Crop.findByIdAndUpdate(deviceData.cropId);
    const { soilReadings, sensorCollectionDate } = cropData;
    if (!soilReadings || !sensorCollectionDate) {
      return res
        .status(404)
        .json({ error: "Please make sure your sensor is connected" });
    }
    const recentSoilReading = await SoilReading.findById(
      soilReadings[soilReadings.length - 1]
    );
    if (!recentSoilReading) {
      return res.status(400).json({ error: "Failed to set crop credtials" });
    }
    const [recentSensorCollectionDate] =
      cropData.sensorCollectionDate.slice(-1);

    const { _id, ...recentSoilReadingModified } = recentSoilReading.toObject();
    return res.status(200).json({
      deviceId,
      name: deviceData.name,
      sensorCollectionDate: recentSensorCollectionDate,
      ...recentSoilReadingModified,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Add the prediction to the crop related data ( eg:"status":"diseased" )

// Add the recommend and Optimise features ( We'll figure it how when we start)

// Change setCrop (remove the most recent and make them in another api, the profile is an url)

// Rain-meter from API

module.exports = {
  setProfile,
  getProfile,
  deleteProfile,
  getDevices,
  addDevice,
  editDevice,
  deleteDevice,
  setDeviceCrop,
  getDeviceImages,
  getRecentSoilData,
};

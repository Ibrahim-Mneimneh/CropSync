var randomize = require("randomatic");
const validator = require("validator");
//Models
const User = require("../Models/userModel");
const Device = require("../Models/deviceModel");
const CropModel = require("../Models/CropModel");

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
        // edit the crop data for later on ********
        const device = {
          deviceId: deviceData.deviceId,
          location: deviceData.city + ", " + deviceData.country,
          name: deviceData.name,
          isConnected: deviceData.isConnected,
          code: deviceData.code,
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
    const [city, country] = location.split(", ");
    const deviceData = await Device.create({
      deviceId: "Micro-" + randomize("a0", 6),
      userId: req.userId,
      name,
      city,
      country,
      code,
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
    const { _id, userId, createdAt, updatedAt, ...device } =
      deviceData.toObject();
    // add crop declaration right here ******
    return res.status(200).json({ ...device });
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

module.exports = {
  setProfile,
  getProfile,
  deleteProfile,
  getDevices,
  addDevice,
  editDevice,
  deleteDevice,
};

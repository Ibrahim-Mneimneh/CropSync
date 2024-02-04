const User = require("../Models/userModel");
const UserAuth = require("../Models/authModel");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const FPAuth = require("../Models/FPAuthModel");
const validator = require("validator");
var randomize = require("randomatic");
const { emailSender } = require("./emailController");
const DAAuth = require("../Models/DA-Auth");
const createToken = (_id, dateModified) => {
  return jwt.sign({ _id, dateModified }, process.env.SECRET, {
    expiresIn: "300d",
  });
};

const createVerificationPin = () => {
  const pin = randomize("0", 6);
  return pin;
};

const verifyEmail = async (req, res) => {
  const { pin } = req.body;
  const userId = req.userId;
  try {
    const userAuth = await UserAuth.findOne({ userId });
    // check for the userAuth
    if (!userAuth) {
      return res.status(403).json({ error: "UnAuthorized Access!" });
    }
    // check if the token is expired if so delete it
    if (userAuth.expiresIn < Date.now()) {
      const deletedUserAuth = await UserAuth.findOneAndDelete({
        userId,
      });
      return res.status(400).json({ error: "Session expired" });
    }
    if (userAuth.trials >= 4) {
      return res.status(403).json({ error: "UnAuthorized Access!" });
    }
    const match = await bcrypt.compare(pin, userAuth.pin);
    // if the pin  doesn't matches that in the database
    if (!match) {
      const updatedAuth = await UserAuth.findOneAndUpdate(
        { userId },
        { trials: userAuth.trials + 1 }
      );
      return res.status(403).json({ error: "UnAuthorized Access!" });
    }
    // update the user to verified
    const updatedUser = await User.findOneAndUpdate(
      { _id: userId },
      { isVerified: true }
    );
    //send the user data
    const {
      _id,
      dateModified,
      password: userPassword,
      ...userData
    } = updatedUser.toObject();
    const token = createToken(updatedUser._id, dateModified);
    const deletedAuth = await UserAuth.findOneAndDelete({
      userId,
    });
    return res.status(200).json({ token, ...userData });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const verifyForgetPassword = async (req, res) => {
  const { pin, email } = req.body;
  if (!pin || !email) {
    res.status(400).json({ error: "Please fill all required fields." });
  }
  try {
    const user = await User.findOne({ email });
    if (!user) {
      res.status(404).json({ error: "User Not found" });
    }
    const fpAuth = await FPAuth.findOne({ userEmail: email });
    // check for the userAuth
    if (!fpAuth) {
      return res.status(403).json({ error: "UnAuthorized Access!" });
    }
    // check if the token is expired if so delete it
    if (fpAuth.expiresIn < Date.now()) {
      const deletedfpAuth = await FPAuth.findOneAndDelete({
        userEmail: email,
      });
      let pin = createVerificationPin();
      const salt = await bcrypt.genSalt(10);
      const hashedPin = await bcrypt.hash(pin, salt);
      const newfpauth = await FPAuth.create({
        userId: user._id,
        userEmail: user.email,
        pin: hashedPin,
      });
      if (!newfpauth) {
        return res.status(400).json({ error: error.message });
      }
      emailSender(
        user.email,
        "Reset Password Verification",
        user.fullName,
        pin,
        "forgetPassword.hbs"
      );
      return res
        .status(400)
        .json({ error: "Session expired, a new email was sent!" });
    }
    if (fpAuth.trials >= 4) {
      return res.status(403).json({ error: "UnAuthorized Access!" });
    }
    const match = await bcrypt.compare(pin, fpAuth.pin);
    // if the pin  doesn't matches that in the database
    if (!match) {
      const updatedAuth = await FPAuth.findOneAndUpdate(
        { userEmail: email },
        { trials: fpAuth.trials + 1 }
      );
      return res.status(403).json({ error: "UnAuthorized Access!" });
    }
    const deleteAuth = await FPAuth.findOneAndDelete({
      userEmail: email,
    });
    //send the user data
    const token = createToken(user._id, user.dateModified);
    return res.status(200).json({ token });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// Send a request to make a pin and sends an email to the user
const resetPasswordRequest = async (req, res) => {
  try {
    const { email } = req.body;
    let isEmail = validator.isEmail(email);

    if (!isEmail) {
      return res.status(403).json({ error: "Invalid Email." });
    }
    let identity = await User.findOne({ email });
    if (!identity) {
      return res.status(404).json({ error: "Invalid Email." });
    }
    //delete old auth
    const deleteAuth = await FPAuth.findOneAndDelete({
      userEmail: email,
    });

    let pin = createVerificationPin();
    const salt = await bcrypt.genSalt(10);
    const hashedPin = await bcrypt.hash(pin, salt);
    const fpauth = await FPAuth.create({
      userId: identity._id,
      userEmail: email,
      pin: hashedPin,
    });
    emailSender(
      email,
      "Reset Password Verification",
      identity.fullName,
      pin,
      "forgetPassword.hbs"
    );
    res.status(200).json({ email });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// Delete Account Request
const deleteAccountRequest = async (req, res) => {
  const userId = req.userId;
  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    let pin = createVerificationPin();
    const salt = await bcrypt.genSalt(10);
    const hashedPin = await bcrypt.hash(pin, salt);
    const daAuth = await DAAuth.create({
      userId: userId,
      userEmail: user.email,
      pin: hashedPin,
    });

    emailSender(
      user.email,
      "Delete Account Verification",
      user.fullName,
      pin,
      "deleteAccount.hbs"
    );
    res.status(200).json({ Message: "Account Deletion Verification Sent!" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
// delete account verification
const deleteAccount = async (req, res) => {
  const userId = req.userId;
  const { pin } = req.body;

  if (!pin) {
    res.status(400).json({ error: "Please fill all required fields." });
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ error: "User Not found" });
    }

    const daAuth = await DAAuth.findOne({ userId });
    // check for the userAuth
    if (!daAuth) {
      return res.status(403).json({ error: "UnAuthorized Access!" });
    }

    // check if the token is expired if so delete it
    if (daAuth.expiresIn < Date.now()) {
      const deletedDAAuth = await DAAuth.findOneAndDelete({
        userId,
      });
      let pin = createVerificationPin();
      const salt = await bcrypt.genSalt(10);
      const hashedPin = await bcrypt.hash(pin, salt);
      const newdaAuth = await DAAuth.create({
        userId,
        userEmail: user.email,
        pin: hashedPin,
      });

      if (!newdaAuth) {
        return res.status(400).json({ error: error.message });
      }
      emailSender(
        user.email,
        "Delete Account Verification",
        user.fullName,
        pin,
        "DeleteAccount.hbs"
      );
      return res
        .status(400)
        .json({ error: "Session expired, a new email was sent!" });
    }

    if (daAuth.trials >= 4) {
      return res.status(403).json({ error: "UnAuthorized Access!" });
    }

    const match = await bcrypt.compare(pin, daAuth.pin);

    // if the pin  doesn't matches that in the database
    if (!match) {
      const updatedAuth = await DAAuth.findOneAndUpdate(
        { userId },
        { trials: daAuth.trials + 1 }
      );
      return res.status(403).json({ error: "UnAuthorized Access!" });
    }
    //Delete all user content
    const deletedUser = await User.findByIdAndDelete(userId);
    const deletedAuth = await UserAuth.findOneAndDelete({ userId });
    const deletedfpAuth = await FPAuth.findOneAndDelete({ userId });
    /// ADD More things here according to the application
    return res
      .status(200)
      .json({ message: "Farewell, " + user.fullName + "!" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

module.exports = {
  verifyEmail,
  resetPasswordRequest,
  verifyForgetPassword,
  deleteAccountRequest,
  deleteAccount,
};

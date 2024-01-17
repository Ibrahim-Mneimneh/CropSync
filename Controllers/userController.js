const User = require("../Models/userModel");
const jwt = require("jsonwebtoken");
var randomize = require("randomatic");
const bcrypt = require("bcrypt");

const { emailSender } = require("./emailController");
const UserAuth = require("../Models/authModel");

const createToken = (_id, dateModified) => {
  return jwt.sign({ _id, dateModified }, process.env.SECRET);
};

const createVerificationPin = () => {
  const pin = randomize("0", 6);
  return pin;
};

const loginUser = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.login(email, password);
    const isVerified = user.isVerified;
    const token = createToken(user._id, user.dateModified);

    // not verified
    if (!isVerified) {
      const userAuth = await UserAuth.findOne({ userEmail: email });
      // if we didnt send him a code
      if (!userAuth) {
        let pin = createVerificationPin();
        const salt = await bcrypt.genSalt(10);
        hashedPin = await bcrypt.hash(pin, salt);
        const userAuth = await UserAuth.create({
          userId: user._id,
          userEmail: email,
          pin: hashedPin,
        });
        emailSender(
          email,
          "Email Verification",
          user.fullName,
          pin,
          "verifyEmail.hbs"
        );

        return res.status(200).json({
          token,
          isVerified,
        });
      }
      // we check if we sent him an email but its expired
      if (userAuth.expiresIn < Date.now()) {
        // we delete it and send him a new one
        const deletedUserAuth = await UserAuth.findOneAndDelete({
          userEmail: email,
        });
        let pin = createVerificationPin();
        const salt = await bcrypt.genSalt(10);
        hashedPin = await bcrypt.hash(pin, salt);
        const userAuth = await UserAuth.create({
          userId: user._id,
          userEmail: email,
          pin: hashedPin,
        });
        emailSender(
          email,
          "Email Verification",
          user.fullName,
          pin,
          "verifyEmail.hbs"
        );

        return res.status(200).json({
          token,
          isVerified,
        });
      } else {
        return res.status(200).json({
          token,
          isVerified,
        });
      }
    }
    // we can delete the old ones here if possible
    const {
      _id,
      dateModified,
      password: userPassword,
      devicesId,
      ...userData
    } = user.toObject();
    return res.status(200).json({ token, ...userData });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const signupUser = async (req, res) => {
  const { fullName, email, password } = req.body;
  try {
    const { user, salt } = await User.signup(fullName, email, password);
    let pin = createVerificationPin();
    hashedPin = await bcrypt.hash(pin, salt);
    const userAuth = await UserAuth.create({
      userId: user._id,
      userEmail: email,
      pin: hashedPin,
    });
    await emailSender(
      email,
      "Email Verification",
      fullName,
      pin,
      "verifyEmail.hbs"
    );
    const token = createToken(user._id, user.dateModified);
    res.status(201).json({ token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getUser = async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId);
    const {
      _id,
      dateModified,
      password: userPassword,
      ...userData
    } = user.toObject();
    res.status(200).json(userData);
  } catch (err) {
    res.status(500).json(err);
  }
};

const changePassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const userId = req.userId;
  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: "All fields required" });
  }
  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    const match = await bcrypt.compare(oldPassword, user.password);
    if (!match) {
      return res.status(403).json({ error: "Invalid Password!" });
    }
    // if the user has the old password correct
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(newPassword, salt);
    updatedUser = await User.findOneAndUpdate(
      { _id: userId },
      { password: hash, dateModified: Date.now() },
      { new: true }
    );
    const token = createToken(user._id, updatedUser.dateModified);
    return res.status(200).json({ token });
  } catch (err) {
    res.status(500).json(err);
  }
};

const resetPassword = async (req, res) => {
  const { password } = req.body;
  const userId = req.userId;
  if (!password) {
    return res.status(400).json({ error: "All fields required" });
  }
  try {
    const user = await User.findById(userId);
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    updatedUser = await User.findOneAndUpdate(
      { _id: userId },
      { password: hash, dateModified: Date.now() },
      { new: true }
    );
    const {
      _id,
      dateModified,
      password: userPassword,
      ...userData
    } = updatedUser.toObject();
    const token = createToken(_id, dateModified);
    res.status(200).json({ token, ...userData });
  } catch (err) {
    res.status(500).json(err);
  }
};

module.exports = {
  loginUser,
  signupUser,
  getUser,
  changePassword,
  resetPassword,
};

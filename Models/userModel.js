const validator = require("validator");

const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const bcrypt = require("bcrypt");
const UserSchema = new Schema({
  profilePicture: { type: Buffer, default: null },
  fullName: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  dateModified: {
    type: Date,
    default: Date.now(),
  },
  devicesId: {
    type: Array,
  },
  externalId: {
    type: String,
  },
});

UserSchema.statics.signup = async function (fullName, email, password) {
  if (!email || !fullName || !password) {
    throw Error("All fields must be filled");
  } else {
    if (!validator.isEmail(email)) {
      throw Error("Please enter a valid email.");
    } else {
      const usedEmail = await this.findOne({ email });

      if (usedEmail) {
        throw Error("Email already in-use.");
      }
      // create one signal instance
      let oneSignalResult;
      const url =
        "https://api.onesignal.com/apps/" + process.env.APPID + "/users";
      const options = {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          identity: { external_id: user.email },
        }),
      };
      fetch(url, options)
        .then((res) => res.json())
        .then((json) => {
          oneSignalResult = json;
          console.log(oneSignalResult);
        })
        .catch((err) => console.error("Onesignal error:" + err));
      // hash pass
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(password, salt);
      const user = await this.create({
        email,
        fullName,
        password: hash,
        externalId: email,
      });
      return { user, salt };
    }
  }
};

UserSchema.statics.login = async function (email, password) {
  if (!email || !password) {
    throw Error("All fields must be filled.");
  }
  let identity;
  if (validator.isEmail(email)) {
    identity = await this.findOne({ email });
  }
  if (!identity) {
    throw Error("Invalid Email or Password.");
  }
  const match = await bcrypt.compare(password, identity.password);
  if (!match) {
    throw Error("Invalid Email or Password.");
  }
  return identity;
};

module.exports = mongoose.model("User", UserSchema);

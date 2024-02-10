const mongoose = require("mongoose");
const express = require("express");
const { verifyUser } = require("./Middleware/UserAuth");
dotenv = require("dotenv");
userRoutes = require("./Routes/user");
authRoutes = require("./Routes/userAuth");
deviceRoutes = require("./Routes/device");
const app = express();

dotenv.config();

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb" }));

app.use((req, res, next) => {
  console.log(req.path);
  next();
});
app.get("/api/wejjak", (req, res) => {
  res.render("wejjak");
});
app.use("/api/device", deviceRoutes);
app.use("/api/user", userRoutes);
app.use("/api", authRoutes);

mongoose
  .connect(process.env.DBURL)
  .then(() => {
    console.log("Successfully connected to Database!");
  })
  .catch((error) => {
    console.log(error);
  });

app.listen(process.env.PORT, () => {
  console.log("Listening on port " + process.env.PORT);
});

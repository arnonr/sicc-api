const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const routes = require("./routes");
var path = require("path");
const bodyParser = require('body-parser');
const fileUpload = require("express-fileupload");
dotenv.config();

const app = express();
const port = process.env.APP_PORT || 3002;

const corsOptions = {
  origin: "*",
  credentials: true,
};

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors(corsOptions));
app.use(express.json());
app.use(fileUpload());
app.use("/sicc-static", express.static(__dirname + "/public"));

app.use(routes);

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

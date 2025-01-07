import bodyParser = require("body-parser");
import cors = require("cors");
import express = require("express");
import path = require("path");

const app = express();

app.use(cors());

app.use(bodyParser.json());

app.use(express.static("public"));

app.get("/", (req, res) => {
	res.send("Hello, World!");
});

const port = 3000;

app.listen(port, () => {
	console.log("Server is running on port " + port);
});

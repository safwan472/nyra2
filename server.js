const express = require("express");
const app = express();
const hbs = require("hbs");
const session = require("express-session");
const nocache = require("nocache");
const geoip = require("geoip-lite");

app.use(express.static("public"));
app.set("view engine", "hbs");

const username = "safwan";
const password = "saf123";

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
  secret: "keyboard cat",
  resave: false,
  saveUninitialized: true
}));

app.use(nocache());

app.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

app.get("/", (req, res) => {
  if (req.session.user) {
    res.redirect("/home");
  } else {
    res.render("login", { msg: req.session.msg });
    req.session.msg = null;
  }
});

app.post("/verify", (req, res) => {
  const { username: inputUsername, password: inputPassword, deviceDetails, location } = req.body;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const userAgent = req.headers['user-agent'];
  const timestamp = new Date().toISOString();
  const geo = geoip.lookup(ip);

  console.log(`\n[${timestamp}] Login attempt`);
  console.log(`IP Address: ${ip}`);
  console.log(`Geo Location (from IP):`, geo);
  console.log(`User-Agent: ${userAgent}`);
  console.log(`Username: ${inputUsername}`);
  console.log(`Password: ${inputPassword}`);

  if (deviceDetails) {
    try {
      const parsedDevice = JSON.parse(deviceDetails);
      console.log("Device Details (from browser):", parsedDevice);
    } catch (err) {
      console.log("Device details could not be parsed.");
    }
  }

  if (location) {
    try {
      const parsedLocation = JSON.parse(location);
      console.log("GPS Location (user-approved):", parsedLocation);
    } catch (err) {
      console.log("GPS location could not be parsed.");
    }
  }

  if (inputUsername === username && inputPassword === password) {
    req.session.user = inputUsername;
    console.log("✅ Login successful");
    res.redirect("/home");
  } else {
    console.log("❌ Login failed: Invalid username or password");
    req.session.msg = "Invalid username or password";
    res.redirect("/");
  }
});

app.get('/home', (req, res) => {
  if (req.session.user) {
    res.render("home");
  } else {
    res.redirect("/");
  }
});

app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
});

app.listen(3003, () => console.log("Server running at http://localhost:3003"));

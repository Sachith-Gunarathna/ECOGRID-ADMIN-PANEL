<div align="center">

# ⚡ EcoGrid Admin Panel

**Smart EV Charging Station Management System**

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.x-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![Firebase](https://img.shields.io/badge/Firebase-Admin_SDK-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

A full-stack admin dashboard for managing EV charging stations, users, vehicles, transactions, and real-time charging sessions — powered by Firebase and controlled via ESP12E hardware.

</div>

---

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [API Endpoints](#-api-endpoints)
- [ESP12E Hardware](#-esp12e-hardware)
- [Firebase Structure](#-firebase-structure)
- [Screenshots](#-screenshots)

---

## ✨ Features

| Feature | Description |
|---|---|
| 📊 **Dashboard** | Real-time metrics — revenue, energy dispensed, CO₂ saved, active sessions |
| 🏢 **Station Management** | Add/edit/delete EV stations with photo upload, map picker, QR codes |
| 👥 **User Management** | Create/edit/verify users, manage admin access, export CSV |
| 🚗 **Vehicle Registry** | Track registered vehicles — brand, model, plate, battery capacity |
| 💳 **Transactions** | View all invoices with filtering, search, and CSV export |
| 📈 **Revenue Analytics** | Monthly revenue charts, station-wise breakdown, connector-type analysis |
| ⚡ **Live Charging Sessions** | Real-time relay control, battery %, energy tracking via Firebase RTDB |
| 📣 **Push Notifications** | Send notifications to all or verified users via FCM |
| 🔐 **Admin Auth** | Firebase Auth with custom `admin: true` claim |
| 🗺️ **Google Maps** | Interactive map picker for station location with Places autocomplete |
| 📱 **QR Code Generator** | Generate downloadable QR codes for each station |

---

## 🛠 Tech Stack

### Backend
- **Runtime:** Node.js + Express.js
- **Database:** Firebase Firestore (stations, users, vehicles, invoices)
- **Realtime DB:** Firebase RTDB (live charging sessions, relay control)
- **Auth:** Firebase Admin SDK (custom claims)
- **Storage:** Firebase Storage (station photos, user avatars)
- **Email:** Nodemailer (SMTP)
- **Security:** Helmet, CORS, express-rate-limit

### Frontend
- **UI:** Single-page HTML + Vanilla JS
- **Charts:** ApexCharts
- **Maps:** Google Maps JavaScript API + Places API
- **QR:** QRCode.js
- **Firebase:** Firebase Web SDK (compat v10.7.1)

### Hardware
- **Controller:** ESP-12E (ESP8266)
- **Communication:** Firebase RTDB (real-time relay commands)

---

## 🏗 Architecture

```
┌──────────────┐     ┌──────────────────┐     ┌───────────────┐
│   Admin UI   │────▶│  Express Server  │────▶│   Firebase    │
│  (Browser)   │◀────│   (Node.js)      │◀────│  Admin SDK    │
└──────────────┘     └──────────────────┘     └───────┬───────┘
                                                      │
       ┌──────────────────────────────────────────────┤
       │                                              │
┌──────▼──────┐  ┌──────────────┐  ┌─────────┐  ┌────▼────┐
│  Firestore  │  │ Realtime DB  │  │ Storage │  │  Auth   │
│  (Stations, │  │  (Relay,     │  │ (Photos)│  │ (Users) │
│   Users,    │  │   Sessions)  │  │         │  │         │
│   Invoices) │  │              │  │         │  │         │
└─────────────┘  └──────▲───────┘  └─────────┘  └─────────┘
                        │
                 ┌──────┴──────┐
                 │   ESP-12E   │
                 │  (Hardware) │
                 │  Relay + DB │
                 └─────────────┘
```

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- Firebase project with Firestore, RTDB, Auth, and Storage enabled
- Firebase Admin SDK service account JSON

### Installation

```bash
# 1. Clone the repo
git clone https://github.com/Sachith-Gunarathna/ECOGRID-ADMIN-PANEL.git
cd ECOGRID-ADMIN-PANEL

# 2. Install dependencies
npm install

# 3. Create .env file (copy from example)
cp .env.example .env

# 4. Update .env with your Firebase credentials

# 5. Set admin claim for your user
node make-admin.js

# 6. Start development server
npm run dev
```

The admin panel will be available at **http://localhost:3000**

---

## 🔑 Environment Variables

Create a `.env` file based on `.env.example`:

```env
# Server
PORT=3000
NODE_ENV=development

# Firebase
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_WEB_API_KEY=your-web-api-key
FIREBASE_PRIVATE_KEY_ID=your-key-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your-client-id
FIREBASE_DATABASE_URL=https://your-project-default-rtdb.firebaseio.com

# Google Maps
GOOGLE_MAPS_API_KEY=your-maps-api-key

# PayHere (Payment Gateway)
PAYHERE_MERCHANT_ID=your-merchant-id
PAYHERE_MERCHANT_SECRET=your-secret
PAYHERE_BASE_URL=https://sandbox.payhere.lk

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
EMAIL_FROM=EcoGrid <noreply@ecogrid.lk>

# Frontend
FRONTEND_URL=http://localhost:3000
```

---

## 📡 API Endpoints

All API routes require `Authorization: Bearer <firebase-id-token>` header.

### Stations
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/stations` | List all stations |
| `GET` | `/api/stations/stats` | Station statistics |
| `GET` | `/api/stations/:id` | Get single station |
| `POST` | `/api/stations` | Create station |
| `PUT` | `/api/stations/:id` | Update station |
| `PATCH` | `/api/stations/:id/verify` | Toggle verification |
| `PATCH` | `/api/stations/:id/photo` | Update photo URL |
| `POST` | `/api/stations/:id/relay` | Send relay ON/OFF |
| `DELETE` | `/api/stations/:id` | Delete station |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/users` | List all users |
| `POST` | `/api/users/create` | Create user |
| `PUT` | `/api/users/:id` | Update user |
| `DELETE` | `/api/users/:id` | Delete user |
| `PATCH` | `/api/users/:id/disable` | Enable/disable user |
| `POST` | `/api/users/:id/admin` | Set admin claim |

### Sessions
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/sessions` | Live sessions (from RTDB) |
| `GET` | `/api/sessions/:stationId` | Single station session |
| `GET` | `/api/sessions/history/list` | Session history |
| `POST` | `/api/sessions/:stationId/stop` | Force stop charging |

### Transactions & Others
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/transactions` | List invoices |
| `GET` | `/api/vehicles` | List vehicles |
| `GET` | `/api/dashboard/stats` | Dashboard stats |
| `POST` | `/api/notifications/send` | Send push notification |
| `GET` | `/api/notifications/history` | Notification history |
| `GET` | `/health` | Health check |

---

## 🔌 ESP12E Hardware

The `esp12E_code` file contains the Arduino code for the ESP-12E (ESP8266) module that controls the physical charging relay.

### What it does
1. Connects to WiFi → Firebase Realtime Database
2. Listens for `status` field changes (`CHARGING` / `COMPLETED` / `CANCELED`)
3. Controls a relay on GPIO D5 (active LOW)
4. Reports live data: `livePercentage`, `current_percent`, `energy_kwh`, `time_left_mins`

### Required Libraries
- `FirebaseESP8266` by Mobizt
- `ESP8266WiFi` (built-in)

### Wiring
| ESP-12E Pin | Connection |
|---|---|
| D5 (GPIO14) | Relay Module IN |
| 3V3 | Relay VCC |
| GND | Relay GND |

---

## 🗄 Firebase Structure

### Firestore Collections

```
Stations/{stationId}
├── basicInfo: { name, address, latitude, longitude, phone, owner_id }
├── techSpecs: { hardware_id, connection_type, power_output_kw, ports }
├── financial: { price_pre_kwh, payhere_merchant_id }
├── verification: { is_verified, photo_url }
├── status: "online" | "offline" | "occupied" | "maintenance"
├── createdAt, updatedAt, createdBy

users/{userId}
├── name, email, phoneNumber, profilePicUrl
├── isVerified, uid, createdAt

vehicles/{vehicleId}
├── brand, model, plate_number, battery_capacity_kwh
├── vehicle_type, user_id, isActive, added_date

invoices/{invoiceId}
├── invoiceId, uId, evStation_id, vehicle_id
├── energy_kWh, amount, createdAt
```

### Realtime Database

```
Stations/{stationId}
├── relay: "ON" | "OFF"
├── status: "CHARGING" | "COMPLETED" | "CANCELED"
├── current_percent: 0-100
├── livePercentage: 0-100
├── targetPercentage: "80%"
├── energy_kwh: 0.0
├── time_left_mins: 0
├── target_percent: 100
├── capacity: 0
```

---

## 📸 Screenshots

> Admin panel is served at the root URL (`/`) with Firebase config auto-injected by the server.

**Login** → Email + password with admin claim check
**Dashboard** → Revenue charts, station donut, energy bar, recent transactions
**Stations** → Table with photo, relay toggle, status dropdown, QR generator
**Sessions** → Real-time charging data with live RTDB listener

---

## 📄 License

This project is licensed under the MIT License.

---

<div align="center">

**Built with ❤️ for Sri Lanka's EV future 🇱🇰**

⚡ EcoGrid — Smart EV Charging Infrastructure

</div>
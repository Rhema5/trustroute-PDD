# TrustRoute Logistics Platform

TrustRoute Logistics is a professional logistics verification platform that integrates web dashboard access with a secure mobile application for field agents. Built with TanStack Start, TailwindCSS, Zustand, and Capacitor.

## Project Structure
The repository is organized as a monorepo workspace:
```text
project-root/
├── frontend/          # Web dashboard and TanStack Start frontend app
├── backend/           # Serverless Firebase configurations & Firestore schema rules
├── mobile-app/        # Capacitor config and native Android application files
├── docs/              # Additional design systems and API docs
├── README.md          # Global documentation
└── .gitignore         # Git ignore file
```

---

## 🚀 Setup & Local Development

### 1. Prerequisites
- **Node.js**: v18 or newer
- **Android Studio** (for building/testing the Android application)

### 2. Install Dependencies
Run the install command in the root folder to set up workspace dependencies:
```bash
npm install
```

### 3. Environment Configuration
Create a `.env` file in the `frontend/` directory (copied from `.env.example` if applicable) with the following variables:
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

### 4. Running the Web Application
Start the development server for the React/TanStack web application:
```bash
npm run dev
```

---

## 📱 Mobile App (Capacitor & Android)

The mobile client leverages the same frontend application and packages it via Capacitor.

### 1. Build the Web App
First, run a production build of the frontend so that the latest bundle exists:
```bash
npm run build
```

### 2. Synchronize Assets to Mobile App
Sync the compiled web files from `frontend/dist/client/` to the native Android app directory:
```bash
npx cap sync --config mobile-app/capacitor.config.ts
```

### 3. Open in Android Studio
Open the native Android environment to compile and run:
```bash
npx cap open android --config mobile-app/capacitor.config.ts
```

### 4. Running/Building APK in Android Studio
- Run the app on an emulator or a connected device by clicking the **Run** button.
- Build a signed APK/AAB for deployment using: **Build > Build Bundle(s) / APK(s) > Build APK(s)**.

---

## 🧪 Testing

To run the unified test suite:
```bash
npm run test
```

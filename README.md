# Famsync

Family sync app with passwordless authentication.

## Project Structure

- **backend/** - Django REST API (passwordless auth: Google + email OTP)
- **mobile/** - Expo/React Native app

## Quick Start

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env       # Edit .env with your config
python manage.py migrate
python manage.py runserver 0.0.0.0:8001
```

### Mobile

```bash
cd mobile
npm install
cp .env.example .env       # Set EXPO_PUBLIC_API_URL and EXPO_PUBLIC_GOOGLE_CLIENT_ID
npx expo start
```

- **iOS Simulator**: `EXPO_PUBLIC_API_URL=http://localhost:8001`
- **Android Emulator**: `EXPO_PUBLIC_API_URL=http://10.0.2.2:8001`
- **Physical device**: Use your machine's local IP (e.g. `http://192.168.1.x:8001`)

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create OAuth 2.0 Client ID (Web application)
3. Add authorized redirect URIs:
   - `http://localhost` (for backend if using web flow)
   - For Expo: `exp://127.0.0.1:8081/--/auth` (dev) or `famsync://auth` (custom scheme)
4. Copy Client ID to `GOOGLE_CLIENT_ID` (backend `.env`) and `EXPO_PUBLIC_GOOGLE_CLIENT_ID` (mobile `.env`)

# Famsync Backend

Django REST API with passwordless authentication (Google OAuth + email OTP).

## Setup

1. Create virtual environment and install dependencies:

   ```bash
   python -m venv .venv
   source .venv/bin/activate  # or .venv\Scripts\activate on Windows
   pip install -r requirements.txt
   ```

2. Copy `.env.example` to `.env` and configure:

   ```bash
   cp .env.example .env
   ```

   - `SECRET_KEY`: Django secret (generate with `python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"`)
   - `GOOGLE_CLIENT_ID`: From [Google Cloud Console](https://console.cloud.google.com/) (APIs & Services > Credentials > Create OAuth 2.0 Client ID, Web application)
   - For production: set `EMAIL_*` for SendGrid/SMTP to send OTP emails

3. Run migrations:

   ```bash
   python manage.py migrate
   ```

4. Start the server:

   ```bash
   python manage.py runserver 0.0.0.0:8001
   ```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/google/` | Exchange Google ID token for JWT |
| POST | `/api/auth/email/request-otp/` | Send OTP to email |
| POST | `/api/auth/email/verify-otp/` | Verify OTP and get JWT |
| POST | `/api/auth/refresh/` | Refresh access token |
| POST | `/api/auth/logout/` | Blacklist refresh token |
| GET | `/api/auth/me/` | Get current user (requires Bearer token) |

## Mobile Connectivity

- **iOS Simulator**: Backend at `http://localhost:8001`, mobile `.env`: `EXPO_PUBLIC_API_URL=http://localhost:8001`
- **Android Emulator**: Backend at `http://10.0.2.2:8001`, mobile `.env`: `EXPO_PUBLIC_API_URL=http://10.0.2.2:8001`
- **Physical device**: Use your machine's local IP (e.g. `http://192.168.1.x:8001`)

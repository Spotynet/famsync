# FamSync — Setup & Use Guide

Jay-style Compose: API + Expo mobile web + static landing.  
Company playbook: [`../setup.md`](../setup.md).

## Architecture (shared EC2)

```text
Browser → host nginx :443
  → 127.0.0.1:3022 (project nginx)
       ├─ famsync-dev.spotynet.com     → mobile:3005
       ├─ famsync-api-dev.spotynet.com → api:3006
       └─ famsync-web-dev.spotynet.com → landing:3013
```

## Commands

```bash
./dev.sh                         # start / refresh
sudo ./deploy/apply-nginx.sh     # once: host nginx → 3022
./deploy.sh                      # dedicated prod only (:80)
./deploy.sh down
```

## Domains

Set in `dev.sh` / `deploy.sh` (not `.env`). Secrets in `backend/.env`.

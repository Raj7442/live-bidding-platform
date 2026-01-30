# 🚀 Deployment Guide

## Quick Deploy Links

### Backend (Render)
1. Push code to GitHub
2. Go to [render.com](https://render.com)
3. Connect GitHub repo
4. Deploy as **Web Service**
5. Use these settings:
   - **Build Command**: `cd backend && npm install`
   - **Start Command**: `cd backend && npm start`
   - **Environment**: Node.js

### Frontend (Vercel)
1. Go to [vercel.com](https://vercel.com)
2. Import GitHub repo
3. Set **Root Directory**: `frontend`
4. Add Environment Variable:
   - `REACT_APP_SERVER_URL`: `https://your-backend-url.onrender.com`

## Alternative: Railway
1. Go to [railway.app](https://railway.app)
2. Deploy from GitHub
3. Add both services automatically

## Environment Variables

### Backend (Render)
```
NODE_ENV=production
CLIENT_URL=https://your-frontend-url.vercel.app
```

### Frontend (Vercel)
```
REACT_APP_SERVER_URL=https://your-backend-url.onrender.com
```

## GitHub Setup
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/yourusername/live-bidding-platform.git
git push -u origin main
```

## Test Deployment
- Backend health: `https://your-backend-url.onrender.com/api/items`
- Frontend: `https://your-frontend-url.vercel.app`
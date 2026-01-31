# Live Bidding Platform

A real-time auction platform where users compete to buy items in the final seconds.

## 🚀 Live Demo

- **Frontend**: [https://live-bidding-platform-five.vercel.app/](https://live-bidding-platform-five.vercel.app/)
- **Backend API**: [https://live-bidding-backend-ru10.onrender.com/](https://live-bidding-backend-ru10.onrender.com/)
- **API Health Check**: [https://live-bidding-backend-ru10.onrender.com/api/items](https://live-bidding-backend-ru10.onrender.com/api/items)

## 📚 Documentation

- **[Live Demo](docs/LIVE_DEMO.md)** - Access the live application
- **[Deployment Guide](docs/DEPLOYMENT.md)** - Deploy your own instance
- **[API Documentation](#api-endpoints)** - API reference below

## Features

- **Real-time bidding** with Socket.io
- **Race condition handling** for concurrent bids
- **Server-synchronized countdown timers**
- **Visual feedback** for bid updates and winning status
- **Responsive design** for mobile and desktop
- **Docker support** for easy deployment

## Architecture

### Backend (Node.js + Socket.io)
- REST API for auction items
- Real-time Socket.io events for bidding
- Race condition protection with atomic updates
- Server time synchronization

### Frontend (React)
- Real-time dashboard with live countdown timers
- Instant visual feedback for bids
- Winning/Outbid status indicators
- Responsive grid layout

## Quick Start

### Using Docker (Recommended)
```bash
docker-compose up --build
```

Access the application at http://localhost:3000

### Manual Setup

#### Backend
```bash
cd backend
npm install
npm start
```

#### Frontend
```bash
cd frontend
npm install
npm start
```

## API Endpoints

- `GET /api/items` - Get all auction items
- `GET /api/time` - Get server time for synchronization

## Socket Events

### Client → Server
- `place_bid` - Place a bid on an item

### Server → Client
- `user_id` - Unique user identifier
- `items_update` - Initial items data
- `bid_update` - Real-time bid updates
- `bid_error` - Bid validation errors
- `auction_ended` - Auction completion notification

## Race Condition Handling

The system prevents race conditions by:
1. Atomic bid validation and updates
2. Server-side timestamp verification
3. Immediate error responses for invalid bids
4. Real-time broadcast of successful bids

## Deployment

### 🌐 Live Production URLs

- **Frontend (Vercel)**: [https://live-bidding-platform-five.vercel.app/](https://live-bidding-platform-five.vercel.app/)
- **Backend (Render)**: [https://live-bidding-backend-ru10.onrender.com/](https://live-bidding-backend-ru10.onrender.com/)

### Production Environment Variables

Backend:
- `PORT` - Server port (default: 5000)
- `CLIENT_URL` - Frontend URL for CORS
- `NODE_ENV` - Environment mode

Frontend:
- `REACT_APP_SERVER_URL` - Backend URL

### Docker Deployment
```bash
# Build and run
docker-compose up --build -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## Technology Stack

- **Backend**: Node.js, Express, Socket.io
- **Frontend**: React, Socket.io-client, Axios
- **Infrastructure**: Docker, Nginx
- **Styling**: CSS3 with animations

## Key Implementation Details

1. **Concurrency Control**: Atomic operations prevent double-spending
2. **Time Sync**: Regular server time synchronization prevents client-side manipulation
3. **Real-time Updates**: Socket.io ensures instant bid notifications
4. **Visual Feedback**: CSS animations provide immediate user feedback
5. **Production Ready**: Docker containerization for easy deployment
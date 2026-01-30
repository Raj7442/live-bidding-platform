const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || "https://live-bidding-platform-five.vercel.app",
    methods: ["GET", "POST"]
  }
});

app.use(cors({
  origin: process.env.CLIENT_URL || "https://live-bidding-platform-five.vercel.app",
  methods: ["GET", "POST"]
}));
app.use(express.json());

// In-memory storage (use Redis in production)
const auctionItems = [
  {
    id: '1',
    title: 'Vintage Rolex Watch',
    description: 'Rare 1960s Submariner',
    startingPrice: 100,
    currentBid: 150,
    currentBidder: null,
    endTime: Date.now() + 1800000, // 30 minutes
    category: 'Watches',
    image: '⌚',
    bids: []
  },
  {
    id: '2',
    title: 'Van Gogh Painting',
    description: 'Authentic starry night replica',
    startingPrice: 500,
    currentBid: 750,
    currentBidder: null,
    endTime: Date.now() + 2100000, // 35 minutes
    category: 'Art',
    image: '🎨',
    bids: []
  },
  {
    id: '3',
    title: 'Ming Dynasty Vase',
    description: '14th century porcelain',
    startingPrice: 200,
    currentBid: 300,
    currentBidder: null,
    endTime: Date.now() + 1500000, // 25 minutes
    category: 'Antiques',
    image: '🏺',
    bids: []
  },
  {
    id: '4',
    title: 'Diamond Necklace',
    description: '18k gold with 2ct diamonds',
    startingPrice: 800,
    currentBid: 1200,
    currentBidder: null,
    endTime: Date.now() + 2400000, // 40 minutes
    category: 'Jewelry',
    image: '💎',
    bids: []
  },
  {
    id: '5',
    title: 'Ferrari Model Car',
    description: 'Limited edition 1:18 scale',
    startingPrice: 50,
    currentBid: 85,
    currentBidder: null,
    endTime: Date.now() + 1200000, // 20 minutes
    category: 'Collectibles',
    image: '🏎️',
    bids: []
  },
  {
    id: '6',
    title: 'Vintage Guitar',
    description: '1959 Gibson Les Paul',
    startingPrice: 1000,
    currentBid: 1500,
    currentBidder: null,
    endTime: Date.now() + 2700000, // 45 minutes
    category: 'Music',
    image: '🎸',
    bids: []
  },
  {
    id: '7',
    title: 'Rare Coin Set',
    description: 'Roman Empire collection',
    startingPrice: 300,
    currentBid: 420,
    currentBidder: null,
    endTime: Date.now() + 1800000, // 30 minutes
    category: 'Coins',
    image: '🪙',
    bids: []
  },
  {
    id: '8',
    title: 'Luxury Handbag',
    description: 'Hermès Birkin limited edition',
    startingPrice: 2000,
    currentBid: 2800,
    currentBidder: null,
    endTime: Date.now() + 3000000, // 50 minutes
    category: 'Fashion',
    image: '👜',
    bids: []
  }
];

const connectedUsers = new Map();

// REST API
app.get('/', (req, res) => {
  res.json({ message: 'Live Bidding Platform API', status: 'running' });
});

app.get('/api/items', (req, res) => {
  const now = Date.now();
  const items = auctionItems.map(item => ({
    ...item,
    isActive: item.endTime > now
  }));
  res.json(items);
});

app.get('/api/time', (req, res) => {
  res.json({ serverTime: Date.now() });
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  const userId = uuidv4();
  connectedUsers.set(socket.id, userId);
  
  socket.emit('user_id', userId);
  socket.emit('items_update', auctionItems);

  socket.on('place_bid', (data) => {
    const { itemId, bidAmount, userId: clientUserId } = data;
    const now = Date.now();
    
    const item = auctionItems.find(i => i.id === itemId);
    
    if (!item) {
      socket.emit('bid_error', { message: 'Item not found' });
      return;
    }
    
    if (item.endTime <= now) {
      socket.emit('bid_error', { message: 'Auction has ended' });
      return;
    }
    
    if (bidAmount <= item.currentBid) {
      socket.emit('bid_error', { message: 'Bid must be higher than current bid' });
      return;
    }
    
    // Race condition protection - atomic update
    const previousBid = item.currentBid;
    if (bidAmount <= previousBid) {
      socket.emit('bid_error', { message: 'Outbid! Someone placed a higher bid' });
      return;
    }
    
    // Update item
    item.currentBid = bidAmount;
    item.currentBidder = clientUserId;
    item.bids.push({
      userId: clientUserId,
      amount: bidAmount,
      timestamp: now
    });
    
    // Broadcast to all clients
    io.emit('bid_update', {
      itemId,
      currentBid: bidAmount,
      currentBidder: clientUserId,
      timestamp: now
    });
    
    console.log(`Bid placed: ${bidAmount} on item ${itemId} by user ${clientUserId}`);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    connectedUsers.delete(socket.id);
  });
});

// Cleanup expired auctions
setInterval(() => {
  const now = Date.now();
  auctionItems.forEach(item => {
    if (item.endTime <= now && item.isActive !== false) {
      item.isActive = false;
      io.emit('auction_ended', { itemId: item.id });
    }
  });
}, 1000);

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
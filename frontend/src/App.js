import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import './App.css';

const socket = io(process.env.REACT_APP_SERVER_URL || 'http://localhost:5001');

function App() {
  const [items, setItems] = useState([]);
  const [userId, setUserId] = useState(null);
  const [serverTime, setServerTime] = useState(Date.now());
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    // Get initial data
    axios.get('/api/items').then(res => setItems(res.data));
    axios.get('/api/time').then(res => setServerTime(res.data.serverTime));

    // Socket listeners
    socket.on('user_id', (id) => setUserId(id));
    
    socket.on('items_update', (updatedItems) => {
      setItems(updatedItems);
    });

    socket.on('bid_update', (data) => {
      setItems(prev => prev.map(item => 
        item.id === data.itemId 
          ? { ...item, currentBid: data.currentBid, currentBidder: data.currentBidder }
          : item
      ));
    });

    socket.on('bid_error', (error) => {
      showNotification(error.message, 'error');
    });

    socket.on('auction_ended', (data) => {
      setItems(prev => prev.map(item => 
        item.id === data.itemId 
          ? { ...item, isActive: false }
          : item
      ));
      showNotification('Auction ended!', 'info');
    });

    // Sync server time
    const timeSync = setInterval(() => {
      axios.get('/api/time').then(res => setServerTime(res.data.serverTime));
    }, 5000);

    return () => {
      clearInterval(timeSync);
      socket.off('user_id');
      socket.off('items_update');
      socket.off('bid_update');
      socket.off('bid_error');
      socket.off('auction_ended');
    };
  }, []);

  const placeBid = (itemId, currentBid) => {
    const bidAmount = currentBid + 10;
    socket.emit('place_bid', { itemId, bidAmount, userId });
  };

  const showNotification = (message, type) => {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
  };

  const categories = ['all', ...new Set(Array.isArray(items) ? items.map(item => item.category) : [])];
  const filteredItems = filter === 'all' ? items : (Array.isArray(items) ? items.filter(item => item.category === filter) : []);

  return (
    <div className="App">
      <div className="background-gradient"></div>
      <div className="floating-shapes">
        <div className="shape shape-1"></div>
        <div className="shape shape-2"></div>
        <div className="shape shape-3"></div>
      </div>
      
      <header className="glass-header">
        <h1>🏆 Live Bidding Platform</h1>
        <div className="user-info">
          <span>👤 User: {userId?.slice(0, 8)}...</span>
          <span className="online-indicator">🟢 Online</span>
        </div>
      </header>
      
      <div className="filter-bar glass">
        {categories.map(category => (
          <button 
            key={category}
            className={`filter-btn ${filter === category ? 'active' : ''}`}
            onClick={() => setFilter(category)}
          >
            {category.charAt(0).toUpperCase() + category.slice(1)}
          </button>
        ))}
      </div>
      
      <div className="items-grid">
        {Array.isArray(filteredItems) && filteredItems.map(item => (
          <AuctionItem 
            key={item.id}
            item={item}
            userId={userId}
            serverTime={serverTime}
            onBid={placeBid}
          />
        ))}
      </div>
    </div>
  );
}

function AuctionItem({ item, userId, serverTime, onBid }) {
  const [timeLeft, setTimeLeft] = useState(0);
  const [flashClass, setFlashClass] = useState('');

  useEffect(() => {
    const timer = setInterval(() => {
      const remaining = Math.max(0, item.endTime - Date.now());
      setTimeLeft(remaining);
    }, 100);

    return () => clearInterval(timer);
  }, [item.endTime]);

  useEffect(() => {
    setFlashClass('flash-bid');
    const timeout = setTimeout(() => setFlashClass(''), 600);
    return () => clearTimeout(timeout);
  }, [item.currentBid]);

  const formatTime = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
  };

  const isWinning = item.currentBidder === userId;
  const isActive = timeLeft > 0;
  const urgency = timeLeft < 60000 ? 'urgent' : timeLeft < 180000 ? 'warning' : '';

  return (
    <div className={`auction-item glass ${flashClass} ${!isActive ? 'ended' : ''} ${urgency}`}>
      <div className="item-header">
        <div className="item-icon">{item.image}</div>
        <div className="item-category">{item.category}</div>
      </div>
      
      <h3>{item.title}</h3>
      <p className="item-description">{item.description}</p>
      
      <div className="price-section">
        <div className="current-bid">
          <span className="currency">$</span>
          <span className="amount">{item.currentBid.toLocaleString()}</span>
        </div>
        <div className="starting-price">Started at ${item.startingPrice}</div>
      </div>
      
      <div className={`timer ${urgency}`}>
        <div className="timer-icon">⏰</div>
        <div className="timer-text">
          {isActive ? formatTime(timeLeft) : 'ENDED'}
        </div>
      </div>
      
      <div className="status-badges">
        {isWinning && isActive && (
          <div className="badge winning">🏆 WINNING</div>
        )}
        
        {item.currentBidder && item.currentBidder !== userId && isActive && (
          <div className="badge outbid">❌ OUTBID</div>
        )}
        
        {!isActive && (
          <div className="badge ended">🔒 ENDED</div>
        )}
      </div>
      
      {isActive && (
        <button 
          className="bid-button glass-button"
          onClick={() => onBid(item.id, item.currentBid)}
        >
          <span className="bid-text">Bid +$10</span>
          <span className="bid-amount">(${(item.currentBid + 10).toLocaleString()})</span>
        </button>
      )}
    </div>
  );
}

export default App;
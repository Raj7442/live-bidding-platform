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
  const [sortBy, setSortBy] = useState('time');
  const [searchTerm, setSearchTerm] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    // Get initial data
    axios.get('/api/items').then(res => setItems(res.data));
    axios.get('/api/time').then(res => setServerTime(res.data.serverTime));

    // Socket listeners
    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));
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
      showNotification(`New bid: $${data.currentBid}`, 'success');
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
      socket.off('connect');
      socket.off('disconnect');
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
    const id = Date.now();
    const notification = { id, message, type };
    setNotifications(prev => [...prev, notification]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 4000);
  };

  const categories = ['all', ...new Set(Array.isArray(items) ? items.map(item => item.category) : [])];
  
  let filteredItems = Array.isArray(items) ? items.filter(item => {
    const matchesCategory = filter === 'all' || item.category === filter;
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  }) : [];

  // Sort items
  filteredItems.sort((a, b) => {
    if (sortBy === 'time') return a.endTime - b.endTime;
    if (sortBy === 'price') return b.currentBid - a.currentBid;
    if (sortBy === 'name') return a.title.localeCompare(b.title);
    return 0;
  });

  const myWinningItems = filteredItems.filter(item => item.currentBidder === userId && item.endTime > Date.now()).length;

  return (
    <div className="App">
      {/* Notifications */}
      <div className="notifications">
        {notifications.map(notification => (
          <div key={notification.id} className={`notification ${notification.type}`}>
            {notification.message}
          </div>
        ))}
      </div>
      
      <header className="glass-header">
        <div className="header-left">
          <h1>🏆 Live Bidding Platform</h1>
          <div className="connection-status">
            <span className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`}></span>
            {isConnected ? 'Connected' : 'Disconnected'}
          </div>
        </div>
        <div className="header-right">
          <div className="user-stats">
            <div className="stat">
              <span className="stat-value">{myWinningItems}</span>
              <span className="stat-label">Winning</span>
            </div>
            <div className="stat">
              <span className="stat-value">{filteredItems.filter(item => item.endTime > Date.now()).length}</span>
              <span className="stat-label">Active</span>
            </div>
          </div>
          <div className="user-info">
            <span>👤 {userId?.slice(0, 8)}...</span>
          </div>
        </div>
      </header>
      
      {/* Search and Controls */}
      <div className="controls">
        <div className="search-bar">
          <input
            type="text"
            placeholder="🔍 Search auctions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        
        <div className="filter-sort">
          <div className="filter-bar">
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
          
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)}
            className="sort-select"
          >
            <option value="time">⏰ Ending Soon</option>
            <option value="price">💰 Highest Bid</option>
            <option value="name">📝 Name</option>
          </select>
        </div>
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
      
      {filteredItems.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">🔍</div>
          <h3>No auctions found</h3>
          <p>Try adjusting your search or filters</p>
        </div>
      )}
    </div>
  );
}

function AuctionItem({ item, userId, serverTime, onBid }) {
  const [timeLeft, setTimeLeft] = useState(0);
  const [flashClass, setFlashClass] = useState('');
  const [bidHistory, setBidHistory] = useState(false);

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
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
  };

  const isWinning = item.currentBidder === userId;
  const isActive = timeLeft > 0;
  const urgency = timeLeft < 60000 ? 'urgent' : timeLeft < 300000 ? 'warning' : '';
  const bidIncrease = ((item.currentBid - item.startingPrice) / item.startingPrice * 100).toFixed(0);

  return (
    <div className={`auction-item ${flashClass} ${!isActive ? 'ended' : ''} ${urgency}`}>
      <div className="item-header">
        <div className="item-icon">{item.image}</div>
        <div className="item-meta">
          <div className="item-category">{item.category}</div>
          <div className="bid-increase">+{bidIncrease}%</div>
        </div>
      </div>
      
      <h3>{item.title}</h3>
      <p className="item-description">{item.description}</p>
      
      <div className="price-section">
        <div className="current-bid">
          <span className="currency">$</span>
          <span className="amount">{item.currentBid.toLocaleString()}</span>
        </div>
        <div className="price-details">
          <span className="starting-price">Started at ${item.startingPrice}</span>
          <span className="bid-count">{item.bids?.length || 0} bids</span>
        </div>
      </div>
      
      <div className={`timer ${urgency}`}>
        <div className="timer-icon">⏰</div>
        <div className="timer-text">
          {isActive ? formatTime(timeLeft) : 'ENDED'}
        </div>
        {urgency === 'urgent' && <div className="pulse-dot"></div>}
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
      
      <div className="item-actions">
        {isActive && (
          <>
            <button 
              className="glass-button primary"
              onClick={() => onBid(item.id, item.currentBid)}
            >
              <span className="bid-text">Quick Bid +$10</span>
              <span className="bid-amount">${(item.currentBid + 10).toLocaleString()}</span>
            </button>
            <button 
              className="glass-button secondary"
              onClick={() => setBidHistory(!bidHistory)}
            >
              📊 History
            </button>
          </>
        )}
      </div>
      
      {bidHistory && (
        <div className="bid-history">
          <h4>Recent Bids</h4>
          {item.bids?.slice(-3).reverse().map((bid, index) => (
            <div key={index} className="bid-entry">
              <span>${bid.amount}</span>
              <span>{new Date(bid.timestamp).toLocaleTimeString()}</span>
            </div>
          )) || <p>No bids yet</p>}
        </div>
      )}
    </div>
  );
}

export default App;
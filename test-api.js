const axios = require('axios');
const io = require('socket.io-client');

const BASE_URL = 'http://localhost:5000';

async function testAPI() {
  console.log('🧪 Testing Live Bidding Platform API');
  console.log('=====================================');

  try {
    // Test REST API
    console.log('📡 Testing REST API...');
    const itemsResponse = await axios.get(`${BASE_URL}/api/items`);
    console.log('✅ GET /api/items:', itemsResponse.data.length, 'items found');

    const timeResponse = await axios.get(`${BASE_URL}/api/time`);
    console.log('✅ GET /api/time:', new Date(timeResponse.data.serverTime).toISOString());

    // Test Socket.io
    console.log('\n🔌 Testing Socket.io connection...');
    const socket = io(BASE_URL);

    socket.on('connect', () => {
      console.log('✅ Socket connected:', socket.id);
    });

    socket.on('user_id', (userId) => {
      console.log('✅ Received user ID:', userId);
    });

    socket.on('items_update', (items) => {
      console.log('✅ Received items update:', items.length, 'items');
    });

    socket.on('bid_update', (data) => {
      console.log('✅ Bid update received:', data);
    });

    socket.on('bid_error', (error) => {
      console.log('⚠️ Bid error:', error.message);
    });

    // Test placing a bid after connection
    setTimeout(() => {
      console.log('\n💰 Testing bid placement...');
      socket.emit('place_bid', {
        itemId: '1',
        bidAmount: 160,
        userId: 'test-user-123'
      });
    }, 1000);

    // Cleanup after 5 seconds
    setTimeout(() => {
      socket.disconnect();
      console.log('\n✅ All tests completed!');
      process.exit(0);
    }, 5000);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testAPI();
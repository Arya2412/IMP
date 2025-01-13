//Namepace IN Socket.io

// Server-side
const io = require('socket.io')(3000);

const chatNamespace = io.of('/chat');
chatNamespace.on('connection', (socket) => {
  console.log('User connected to /chat namespace');
  socket.on('message', (msg) => {
    chatNamespace.emit('message', msg);
  });
});

const newsNamespace = io.of('/news');
newsNamespace.on('connection', (socket) => {
  console.log('User connected to /news namespace');
});


//Client-side

const chatSocket = io('/chat');
chatSocket.on('message', (msg) => {
  console.log(msg);
});

const newsSocket = io('/news');



// FOR Booking time slots

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
//onst io = socketIo(server);

// In-memory storage for simplicity (use a database in production)
let timeslots = {
  'lawyer-12345': [
    { time: '10:00 AM', available: true },
    { time: '11:00 AM', available: true },
    { time: '12:00 PM', available: true }
  ]
};

// Namespace for timeslot operations
const timeslotNamespace = io.of('/timeslot'); 

timeslotNamespace.on('connection', (socket) => {    // Can just use io.on() if you don't need namespaces
  console.log('User connected to timeslot namespace');

  socket.on('joinRoom', (room) => {
    socket.join(room);
    console.log(`User joined room: ${room}`);
    // Send the current list of timeslots to the user
    socket.emit('timeslots', timeslots[room] || []);//On joining room we are sendin currect available timeslots
  });

  socket.on('bookTimeslot', ({ room, time }) => {
    const lawyerTimeslots = timeslots[room];
    if (!lawyerTimeslots) {
      return socket.emit('error', 'Room not found');
    }

    const slot = lawyerTimeslots.find(slot => slot.time === time);

    if (!slot || !slot.available) {
      // Send an updated list of timeslots
      return socket.emit('timeslots', lawyerTimeslots);
    }

    // Mark the timeslot as booked
    slot.available = false;
    // Notify the user about successful booking
    socket.emit('bookingSuccess', `Timeslot ${time} booked successfully`);
    // Broadcast the updated list of timeslots to other users in the room
    //Same event ""timeslots"" is used for sending updated timeslots also
    //We can use different event for updated timeslots also
    timeslotNamespace.to(room).emit('timeslots', lawyerTimeslots);
  });

  socket.on('leaveRoom', (room) => {
    socket.leave(room);
    console.log(`User left room: ${room}`);
  });
});

server.listen(3000, () => {
  console.log('Server is running on port 3000');
});



//ON Client side 

const socket = io('/timeslot');
const room = 'lawyer-12345';
const timeslotInput = document.getElementById('timeslotInput');
const timeslotsDiv = document.getElementById('timeslots');
const bookButton = document.getElementById('bookButton');

// Join the room when the page loads
socket.emit('joinRoom', room);

// Listen for timeslot updates
 //ON joining room server will send current timeslots , 
 // here we are using same even "timeslots" for updated timeslots also 
 //We can use different event for updated timeslots also 
socket.on('timeslots', (timeslots) => { 
  timeslotsDiv.innerHTML = timeslots.map(slot => 
    `<div>${slot.time} - ${slot.available ? 'Available' : 'Booked'}</div>`
  ).join('');
});

// Handle booking success
socket.on('bookingSuccess', (message) => {
  alert(message);
});

// Handle booking errors or updates
socket.on('error', (message) => {
  alert(message);
});

// Book a timeslot when the button is clicked
bookButton.addEventListener('click', () => {
  const timeslot = timeslotInput.value;
  socket.emit('bookTimeslot', { room, time: timeslot });
});

// Leave the room when the page is unloaded
window.addEventListener('beforeunload', () => {
  socket.emit('leaveRoom', room);
});

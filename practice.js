// Backend (Node.js with socket.io)
io.on('connection', socket => {
    socket.on('bookSlot', (data) => {
      const { lawyerId, slot } = data;
      
      // Reserve the slot and proceed with booking
      if (isSlotAvailable(lawyerId, slot)) {
        reserveSlot(lawyerId, slot);
        
        // Emit update to all users viewing the same lawyer's timeslots
        io.to(`lawyer-${lawyerId}`).emit('updateSlots', getUpdatedSlots(lawyerId));
      } else {
        socket.emit('slotUnavailable', 'The selected slot is already booked.');
      }
    });
  
    // Joining a room for real-time updates for a specific lawyer
    socket.on('joinLawyerRoom', (lawyerId) => {
      socket.join(`lawyer-${lawyerId}`);
    });
  });
  
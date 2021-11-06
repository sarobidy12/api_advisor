const OptimizedMap = require('../classes/map');
const { User } = require('../models');

/**
 * Initialize SocketIO server
 * @param {SocketIO.Server} io The socket server
 */
function initSocket(io) {
  const currentConnections = new OptimizedMap();

  io.on('connection', function (socket) {
    currentConnections.set(socket, {});

    io.emit('user-connected', currentConnections.size);

    io.on('send:coords', function ({ userId: _id, coords: { lat, long } }) {
      User.updateOne(
        { _id },
        { $set: { location: { coordinates: [lat, long] } } }
      );
    });
  });
}

module.exports = initSocket;

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Token = new Schema({
  userId: {
    type: String,
    required: true,
  },
  access_token: {
    type: String,
    required: true,
  },
  refresh_token: {
    type: String,
    required: true,
  },
  expireAt: {
    type: Date,
    default: Date.now,
    index: { expires: 60 * 60 * 3 },
  },
});

module.exports = mongoose.model('Token', Token);

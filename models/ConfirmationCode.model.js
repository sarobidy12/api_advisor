const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ConfirmationCode = new Schema({
  confirmationType: {
    type: String,
    enum: ['login', 'register', 'reset-password', 'new-command'],
    required: true,
  },
  payload: {
    type: String,
  },
  code: {
    type: Number,
    required: true,
  },
  relatedUser: {
    type: mongoose.Types.ObjectId,
    required: false,
    reference: 'User',
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 60 * 5,
  },
});

module.exports = mongoose.model('ConfirmationCode', ConfirmationCode);
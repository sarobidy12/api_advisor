const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PaymentCard = new Schema({
  owner: {
    type: String,
    required: true,
  },
  cardNumber: {
    type: String,
    required: true,
  },
  expiryMonth: {
    type: Number,
    required: true,
  },
  expiryYear: {
    type: Number,
    required: true,
  },
  securityCode: {
    type: String,
    required: true,
  },
  zipCode: {
    type: String,
    required: true,
  },
});

module.exports = mongoose.model('PaymentCard', PaymentCard);

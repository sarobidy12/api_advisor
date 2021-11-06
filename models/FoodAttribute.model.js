const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const FoodAttribute = new Schema({
  tag: {
    type: String,
    required: true,
  },
  locales: {
    type: Map,
    of: String,
    required: true,
  },
  imageURL: {
    type: String,
    required: false,
  },
});

module.exports = mongoose.model('FoodAttribute', FoodAttribute);
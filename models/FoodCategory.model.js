const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const FoodCategory = new Schema({
  name: { type: Map, of: String, required: true },
  imageURL: { type: String, required: false },
  priority: { type: Number, default: 0 },
});

module.exports = mongoose.model('FoodCategory', FoodCategory);

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PlatRecommander = new Schema({
  priority: {
    type: Number,
    default: 0,
  },
  food: {
    type: Schema.Types.ObjectId,
    ref: 'Food',
  },
  restaurant: {
    type: Schema.Types.ObjectId,
    ref: 'Restaurant',
  },
  createdAt: {
    type: Date,
    default: Date.now(),
  },
  updateAt: {
    type: Date,
    default: Date.now(),
  },
});

module.exports = mongoose.model('PlatRecommander', PlatRecommander);

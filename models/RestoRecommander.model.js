const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const RestoRecommander = new Schema({
  priority: {
    type: Number,
    default: 0,
  },
  restaurant: {
    type: Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true,
  },
});

module.exports = mongoose.model('RestoRecommander', RestoRecommander);

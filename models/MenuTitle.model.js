const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const MenuTitle = new Schema({
  priority: {
    type: Number,
    default: 0,
  },
  name: {
    type: Map,
    of: String,
    required: true,
  },
  restaurant: {
    type: Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true,
  },
});

module.exports = mongoose.model('MenuTitle', MenuTitle);

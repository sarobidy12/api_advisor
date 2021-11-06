const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const View = new Schema({
  grid: {
    type: Boolean,
    default: false,
  },
  list: {
    type: Boolean,
    default: true,
  },
});

module.exports = mongoose.model('View', View);

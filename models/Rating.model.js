const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Rating = new Schema({
  value: {
    type: Number,
    required: true,
  },
  comment: {
    type: String,
    required: true,
  },
  author: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
});

module.exports = mongoose.model('Rating', Rating);

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const AdminMessage = new Schema(
  {
    message: {
      type: String,
      required: true,
    },
    read: [
        {
          type: Schema.Types.ObjectId,
          ref: 'Restaurant',
        }
    ],
    target: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Restaurant',
      }
    ]
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model('AdminMessage', AdminMessage);
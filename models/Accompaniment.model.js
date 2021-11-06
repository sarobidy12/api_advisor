const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Accompaniment = new Schema({
    name: {
        type: String,
        required: true,
    },
    price: {
        amount: {
            type: Number,
            default: 0,
        },
        currency: {
            type: String,
            enum: ['eur', 'usd'],
        },
    },
    imageURL: {
        type: String,
    },
    restaurant: {
        type: Schema.Types.ObjectId,
        ref: 'Restaurant',
        required: true,
    },
    isObligatory: {
        type: Boolean,
        required: true,
        default: false,
    },
    priority: {
        type: Number,
        default: 0,
    },
});

module.exports = mongoose.model('Accompaniment', Accompaniment);
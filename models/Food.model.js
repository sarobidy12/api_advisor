const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Food = new Schema({
    name: {
        type: Map,
        of: String,
        required: true,
    },
    statut: {
        type: Boolean,
        required: false,
    },
    description: {
        type: String,
        required: false,
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
    type: {
        type: Schema.Types.ObjectId,
        ref: 'FoodType',
        required: true,
    },
    attributes: [{
        type: Schema.Types.ObjectId,
        ref: 'FoodAttribute',
    }, ],
    imageURL: {
        type: String,
        required: false,
    },
    restaurant: {
        type: Schema.Types.ObjectId,
        ref: 'Restaurant',
        required: true,
    },
    priority: {
        type: Number,
        default: 0,
    },
    options: [{
        title: String,
        maxOptions: Number,
        isObligatory: Boolean,
        items: [{
            type: mongoose.Schema.Types.Mixed,
        }],
    }],
    note: {
        type: Number,
        default: 0
    },
    ratings: [{ type: Schema.Types.ObjectId, ref: 'Rating' }],
    imageNotContractual: {
        type: Boolean,
        required: false,
    },
    allergene: [{
        type: Schema.Types.ObjectId,
        ref: 'FoodAttribute',
    }, ],
    isAvailable: {
        type: Boolean,
        default: true,
    }
}, {
    timestamps: true,
}, );

Food.static('search', function(lang, q, filter, callback) {
    return this.find({
            ...filter,
            [`name.${lang}`]: new RegExp(`${q}`, 'gi'),
        },
        callback,
    );
});

module.exports = mongoose.model('Food', Food);
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Menu = new Schema({
    priority: {
        type: Number,
        default: 0,
    },
    restaurant: {
        type: Schema.Types.ObjectId,
        ref: 'Restaurant',
        required: true,
    },
    title: {
        type: String,
        required: false,
    },
    type: {
        type: String,
        enum: ['per_food', 'priceless', 'fixed_price'],
        required: true,
    },
    name: {
        type: Map,
        of: String,
        required: true,
    },
    description: {
        type: String,
    },
    imageURL: {
        type: String,
        required: false,
    },
    // foods: [{
    //     food: { type: Schema.Types.ObjectId, ref: 'Food' },
    //     additionalPrice: {
    //         amount: {
    //             type: Number,
    //             default: 0,
    //         },
    //         currency: {
    //             type: String,
    //             enum: ['eur', 'usd'],
    //         },
    //     },
    // }, ],
    options: [{
        title: String,
        maxOptions: Number,
        isObligatory: Boolean,
        items: [{
            type: mongoose.Schema.Types.Mixed,
        }],
    }],
    price: {
        amount: {
            type: Number,
            default: 0,
        },
        currency: {
            type: String,
            enum: ['eur', 'usd'],
            default: 'eur',
        },
    },
}, {
    timestamps: true,
}, );

Menu.static('search', function(lang, q, filter, callback) {
    return this.find({
            ...filter,
            [`name.${lang}`]: new RegExp(`${q}`, 'gi'),
        },
        callback,
    );
});

module.exports = mongoose.model('Menu', Menu);
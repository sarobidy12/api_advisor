const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Command = new Schema({
    comment: {
        type: String,
    },
    optionLivraison: {
        type: String,
        required: false,
        enum: ['behind_the_door', 'on_the_door', 'out'],
    },
    appartement: {
        type: String,
        required: false,
        default: 'néant',
    },
    codeAppartement: {
        type: String,
        required: false,
        default: 'néant',
    },
    etage: {
        type: Number,
        required: false,
    },
    isCodePromo: {
        type: Boolean,
        required: true,
    },
    relatedUser: {
        type: mongoose.Types.ObjectId,
        ref: 'User',
        required: false,
    },
    code: {
        type: Number,
        required: true,
    },
    customer: {
        name: String,
        email: String,
        address: String,
        phoneNumber: String,
    },
    dateTimeRetrait: {
        day: String,
        hour: String,
        minute: String,
    },
    deliveryPrice: {
        amount: {
            type: Number,
            default: 0,
        },
        currency: {
            type: String,
            enum: ['eur', 'usd'],
        },
    },
    commandType: {
        type: String,
        required: true,
        enum: ['delivery', 'on_site', 'takeaway'],
    },
    shippingAddress: {
        type: String,
    },
    discountPrice: {
        type: String,
        default: '0'
    },
    shippingTime: {
        type: Number,
    },
    shipAsSoonAsPossible: {
        type: Boolean,
    },
    totalPrice: {
        type: Number,
        required: true,
    },
    confirmed: {
        type: Boolean,
        default: false,
    },
    payed: {
        status: {
            type: Boolean,
            default: false,
        },
        paymentIntentId: String,
        paymentChargeId: String,
    },
    validated: {
        type: Boolean,
        default: false,
    },
    paiementLivraison: {
        type: Boolean,
        default: false,
    },
    revoked: {
        type: Boolean,
        default: false,
    },
    restaurant: {
        type: Schema.Types.ObjectId,
        ref: 'Restaurant',
    },
    totalPriceSansRemise: {
        type: String,
        default: '0'
    },
    menus: [{
        quantity: Number,
        item: { type: Schema.Types.ObjectId, ref: 'Menu' },
        comment: String,
        foods: [{
            food: {
                type: Schema.Types.ObjectId,
                ref: 'Food',
            },
            options: [{
                title: String,
                maxOptions: Number,
                items: [{
                    item: { type: Schema.Types.ObjectId, ref: 'Accompaniment' },
                    quantity: Number,
                }, ],
            }, ],
        }, ],
    }, ],
    menuWeb: [{
        type: mongoose.Schema.Types.Mixed,
        required: false,
    }],
    items: [{
        quantity: Number,
        item: { type: Schema.Types.ObjectId, ref: 'Food' },
        comment: String,
        options: [{
            title: String,
            maxOptions: Number,
            items: [{
                item: { type: Schema.Types.ObjectId, ref: 'Accompaniment' },
                quantity: Number,
            }, ],
        }, ],
    }, ],
    priceless: {
        type: Boolean,
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    codePromo: {
        date: {
            type: Date,
        },
        nbr: {
            type: Number,
        },
        value: {
            type: Number,
        },
        code: {
            type: String,
        },
        discountIsPrice: {
            type: Boolean,
        },
    }
}, {
    timestamps: {
        updatedAt: 'updatedAt',
    },
}, );

module.exports = mongoose.model('Command', Command);
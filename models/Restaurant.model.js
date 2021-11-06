const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const QRCode = require('../utils/qrcode');
const path = require('path');
const fs = require('fs');

const Restaurant = new Schema({
    priority: {
        type: Number,
        default: 0,
    },
    name: {
        type: String,
        required: true,
    },
    name_resto_code: {
        type: String,
        required: true,
    },
    address: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: false,
    },
    livraison: {
        type: mongoose.Schema.Types.Mixed,
    },
    status: {
        type: Boolean,
        required: true,
    },
    location: {
        type: {
            type: String,
            enum: ['Point'],
            required: true,
        },
        coordinates: {
            type: Schema.Types.Array,
            required: true,
        },
    },
    city: {
        type: String,
        required: true,
    },
    priceByMiles: {
        type: Number,
    },
    DistanceMax: {
        type: String,
    },
    postalCode: {
        type: String,
        required: true,
    },
    openingTimes: [{
        day: String,
        openings: [{
            begin: {
                hour: Number,
                minute: Number,
            },
            end: {
                hour: Number,
                minute: Number,
            },
        }, ],
    }, ],
    category: [{
        type: Schema.Types.ObjectId,
        ref: 'FoodCategory',
        required: true,
    }, ],
    minPriceIsDelivery: {
        type: String,
        required: false,
    },
    foodTypes: [{
        type: Schema.Types.ObjectId,
        ref: 'FoodType',
    }, ],
    imageURL: {
        type: String,
        required: false,
    },
    logo: {
        type: String,
        required: false,
    },
    couvertureMobile: {
        type: String,
        required: false,
    },
    couvertureWeb: {
        type: String,
        required: false,
    },
    deliveryFixed: {
        type: Boolean,
        required: false,
    },
    foods: [{ type: Schema.Types.ObjectId, ref: 'Food' }],
    ratings: [{ type: Schema.Types.ObjectId, ref: 'Rating' }],
    menus: [{ type: Schema.Types.ObjectId, ref: 'Menu' }],
    qrcodeLink: {
        type: String,
        required: true,
    },
    qrcodePricelessLink: {
        type: String,
        required: true,
    },
    admin: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    phoneNumber: {
        type: String,
        required: true,
    },
    fixedLinePhoneNumber: {
        type: String,
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
    delivery: {
        type: Boolean,
        default: false,
    },
    surPlace: {
        type: Boolean,
        default: true,
    },
    aEmporter: {
        type: Boolean,
        default: true,
    },
    paiementLivraison: {
        type: Boolean,
        default: true,
    },
    referencement: {
        type: Boolean,
        default: true,
    },
    paiementCB: {
        type: Boolean,
        default: false,
    },
    customerStripeKey: {
        type: String,
    },
    customerSectretStripeKey: {
        type: String,
    },
    cbDirectToAdvisor: {
        type: Boolean,
        default: true,
    },
    isMenuActive: {
        type: Boolean,
        default: true,
    },
    isBoissonActive: {
        type: Boolean,
        default: true,
    },
    hasCodePromo: {
        type: Boolean,
        default: false,
    },
    isCodePromo: {
        type: Boolean,
        default: false,
    },
    discountPrice: {
        type: String,
        default: '0',
    },
    discountAEmporter: {
        type: Boolean,
        default: false,
    },
    discountDelivery: {
        type: Boolean,
        default: false,
    },
    discount: {
        delivery: {
            discountIsPrice: {
                type: Boolean,
                default: false,
            },
            discountType: {
                type: String,
            },
            value: {

            }
        },
        aEmporter: {
            discountIsPrice: {
                type: Boolean,
                default: false,
            },
            discountType: {
                type: String,
            },
            value: {
                type: String,
                default: '0',
            }
        },
        codeDiscount: [{
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
        }]

    },
}, {
    timestamps: true,
}, );

Restaurant.index({ location: '2dsphere' });

Restaurant.static('search', function(q, filter, callback) {
    if (filter.category && Array.isArray(filter.category))
        filter.category = {
            $in: filter.category,
        };

    return this.find({
            ...filter,
            name: new RegExp(`${q}`, 'gi'),
        },
        callback,
    );
});

Restaurant.pre('validate', async function(next) {
    if (!this.location)
        return next({
            message: 'Restaurant location must be provided',
        });

    try {
        await QRCode.generateRestaurantQrCode(this);
        next();
    } catch (error) {
        next(error);
    }
});

Restaurant.post('remove', { document: true }, (doc) => {
    const pathname = path.join(__dirname, `../public/${doc._id}/qrcode.png`);

    if (fs.existsSync(pathname))
        fs.rmdirSync(path.dirname(pathname), { recursive: true });
});

const RestaurantModel = mongoose.model('Restaurant', Restaurant);
RestaurantModel.createIndexes();

module.exports = RestaurantModel;
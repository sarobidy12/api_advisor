const express = require('express');
const {
    INTERNAL_SERVER_ERROR,
    BAD_REQUEST,
    NOT_ACCEPTABLE,
    NOT_FOUND,
} = require('http-status-codes');
const router = express.Router();
const { Stripe } = require('stripe');
const { v4: uuid } = require('uuid');
const {
    WITH_PRICE,
    WITHOUT_PRICE,
    METERS_PER_KILOMETER,
    NEW,
    ONSITE,
    POPULAR,
    PRIORITY,
} = require('../constants');

const {
    Food,
    Restaurant,
    Menu,
    FoodAttribute,
    FoodType,
} = require('../models');
const { translate } = require('../services/translation');
const PlatRecommander = require('../models/PlatRecommander.model');

/* GET home page. */
router.get('/', function(req, res, next) {
    res.json({
        status: 'ok',
    });
});

router.get('/search', async function(req, res, next) {
    const {
        q = '',
            type = 'all',
            filter = '{}',
            lang,
            range = '2',
            location = '{}',
            limit,
            offset = 0,
    } = req.query;

    if (!lang)
        return res.status(BAD_REQUEST).json({
            lang: 'The language code must be provided',
        });

    let query = q;

    try {
        if (lang !== 'fr') query = await translate(q, { to: 'fr' });
    } catch (error) {}

    try {
        const results = [];

        let filters = JSON.parse(filter);

        let searchCategory = filters.searchCategory;

        if (searchCategory) delete filters.searchCategory;

        if (type === 'all' || type === 'food') {

            if (searchCategory === WITH_PRICE) {
                filters = {
                    ...filters,
                    'price.amount': {
                        $ne: null,
                    },
                };
            }

            let newest = searchCategory === NEW;

            const { city } = filters;

            if (city) delete filters.city;



            if (filters.type) {
                const typeIds = (await FoodType.find({ 'name.fr': filters.type })).map(
                    (e) => e._id,
                );

                filters.type = {
                    $in: typeIds,
                };
            }

            if (searchCategory === WITHOUT_PRICE || searchCategory === ONSITE) {
                filters = {
                    $or: [{
                            ...filters,
                            price: null,
                        },
                        {
                            ...filters,
                            'price.amount': null,
                        },
                    ],
                };
            }

            if (searchCategory === "recommender") {

                const listplatRecommande = await PlatRecommander.find();

                filters._id = {
                    $in: listplatRecommande.map(item => item.food),
                };

            }

            if (filters.category) {
                if (!Array.isArray(filters.category))
                    filters.category = [filters.category];

                const restaurantIds = (
                    await Restaurant.find({
                        category: { $all: filters.category },
                    })
                ).map(({ _id }) => _id);

                delete filters.category;

                if (filters.restaurant) {
                    filters = {
                        $and: [{
                                ...filters,
                            },
                            {
                                ...filters,
                                restaurant: restaurantIds,
                            },
                        ],
                    };
                } else
                    filters.restaurant = {
                        $in: restaurantIds.map(({ _id }) => _id),
                    };
            }

            const foodDocuments = Food.search(lang, query, filters)
                .populate('ratings')
                .populate('type')
                .populate('attributes')
                .populate('allergene')
                .populate('restaurant')
                .populate('options.items');

            if (searchCategory === POPULAR) foodDocuments.sort({ note: 'desc' });

            if (searchCategory === PRIORITY) foodDocuments.sort({ priority: 'desc' });

            if (limit) foodDocuments.limit(limit);

            if (offset) foodDocuments.skip(offset);

            if (city) {
                const restaurantIds = (
                    await Restaurant.find({ city: new RegExp(`^${city}`, 'ig') })
                ).map((d) => d.id);
                foodDocuments.where('restaurant', { $in: restaurantIds });
            }

            const { coordinates } = JSON.parse(location);

            if (coordinates) {
                const restaurantIds = (
                    await Restaurant.find({
                        location: {
                            $nearSphere: {
                                $geometry: { type: 'Point', coordinates },
                                $maxDistance: Number(range) * METERS_PER_KILOMETER,
                            },
                        },
                    })
                ).map((e) => e.id);

                foodDocuments.where('restaurant', { $in: restaurantIds });
            }

            if (newest) {
                foodDocuments.sort({ createdAt: 'desc' });
            }

            const drinkType = await FoodType.findOne({ 'name.fr': 'Boisson' });
            drinkType && foodDocuments.where('type', { $ne: drinkType._id });

            const foods = (await foodDocuments.populate('restaurant'))
                .map((e) => e.toJSON())
                .map((e) => ({
                    type: 'food',
                    content: {
                        ...e,
                        name: e.name && (e.name[lang] || e.name.fr),
                        description: e.description && (e.description[lang] || e.description.fr),
                        type: {
                            ...e.type,
                            name: e.type.name && (e.type.name[lang] || e.type.name.fr),
                        },
                        status: e.restaurant && e.restaurant.status,
                    },
                }));

            results.push(...foods);
        }

        if (type === 'all' || type === 'restaurant') {
            const { coordinates } = JSON.parse(location);

            if (Array.isArray(filters.category)) {
                filters.category = {
                    $all: filters.category,
                };
            } else if (filters.category) {
                filters.category = {
                    $all: [filters.category],
                };
            }

            let restaurantDocuments;

            let newest = searchCategory === NEW;

            if (coordinates)
                restaurantDocuments = Restaurant.search(query, {
                    ...filters,
                    location: {
                        $nearSphere: {
                            $geometry: { type: 'Point', coordinates },
                            $maxDistance: Number(range) * METERS_PER_KILOMETER,
                        },
                    },
                });
            else restaurantDocuments = Restaurant.search(query, filters);

            if (limit) restaurantDocuments.limit(limit);

            if (offset) restaurantDocuments.skip(offset);

            if (newest) restaurantDocuments.sort({ createdAt: 'desc' });

            const restaurants = (await restaurantDocuments.populate('category'))
                .map((e) => e.toJSON())
                .map(({ category, ...rest }) => ({
                    ...rest,
                    category: category.map((category) => ({
                        ...category,
                        name: category.name && (category.name[lang] || category.name.fr),
                    })),
                }))
                .map((content) => ({ type: 'restaurant', content }));

            results.push(...restaurants);
        }

        if (type === 'all' || type === 'menu') {
            const menuDocuments = Menu.search(
                lang,
                query,
                (filter && JSON.parse(filter)) || {},
            );

            if (limit) menuDocuments.limit(limit);

            if (offset) menuDocuments.skip(offset);

            const menus = (
                    await menuDocuments
                    .populate({
                        path: 'foods.food',
                        populate: 'type restaurant options.items',
                    })
                    .populate('restaurant')
                )
                .map((e) => e.toJSON())
                .map((e) => ({
                    type: 'menu',
                    content: {
                        ...e,
                        name: e.name[lang] || e.name.fr,
                        description: e.description[lang] || e.description.fr,
                        foods: e.options,
                        // foods: e.options.map(({ food: f, additionalPrice }) => ({
                        //     food: {
                        //         ...f,
                        //         name: f.name && (f.name[lang] || f.name.fr),

                        //         type: {
                        //             ...f.type,
                        //             name: f.type.name && (f.type.name[lang] || f.type.name.fr),
                        //         },
                        //     },
                        //     additionalPrice,
                        // })),
                    },
                }));

            results.push(...menus);
        }

        res.json(results);
    } catch (error) {
        res.status(INTERNAL_SERVER_ERROR);

        if (process.env.NODE_ENV === 'development') {
            console.trace(error);

            res.send();
        }
    }
});


router.post('/searchByAttibuteAllergen', async function(req, res, next) {

    const {
        data,
        lang,
        name
    } = req.body;

    const attributes = await FoodAttribute.find({
        _id: {
            $in: Array.isArray(data) ?
                data : [data],
        },
    });

    const allergens = attributes
        .filter((data) => data.tag.split('-')[0] === "allergen")
        .map(({ _id }) => _id)

    const specifications = attributes
        .filter(({ tag }) => !tag.startsWith('allergen'))
        .map(({ _id }) => _id);

    let foodDocuments;

    if (specifications.length > 0) {

        foodDocuments = await Food.find({
                attributes: {
                    $all: specifications,
                },
                $or: [{
                    "name.fr": { $regex: name, $options: "i" },
                }]
            })
            .populate('ratings')
            .populate('type')
            .populate('attributes')
            .populate('allergene')
            .populate('restaurant')
            .populate('options.items');

    } else {

        foodDocuments = await Food.find({
                $or: [{
                    "name.fr": { $regex: name, $options: "i" },
                }]
            })
            .populate('ratings')
            .populate('type')
            .populate('attributes')
            .populate('allergene')
            .populate('restaurant')
            .populate('options.items');

    }

    const foodsnotAlergene = [];

    foodDocuments.forEach((food) => {

        if (food.allergene.length > 0 && allergens.length > 0) {

            food.allergene.forEach((item) => {

                if (!allergens.includes(item._id)) {
                    console.log("allergene ")
                }

            })

        } else {
            foodsnotAlergene.push(food)
        }

    });

    return res.status(200).send(foodsnotAlergene.map((e) => e.toJSON())
        .filter((item) => {
            let name = item.type.name.fr;
            return !name.toLocaleLowerCase().includes('drink') ||
                !name.toLocaleLowerCase().includes('boisson') ||
                !name.toLocaleLowerCase().includes('jus');
        })
        .map((e) => ({
            type: 'food',
            content: {
                ...e,
                name: e.name && (e.name[lang] || e.name.fr),
                description: e.description && (e.description[lang] || e.description.fr),
                type: {
                    ...e.type,
                    name: e.type.name && (e.type.name[lang] || e.type.name.fr),
                },
                status: e.restaurant && e.restaurant.status,
            },
        }))
    )

})

router.post('/checkout', async(req, res) => {
    const { token, cart } = req.body;

    if (!token || !cart)
        return res.status(BAD_REQUEST).json({
            token: !token ? 'Token must be provided' : undefined,
            cart: !cart ? 'Cart details must be provided' : undefined,
        });

    const { restaurant: restaurantId, totalPrice: amount } = cart;
    const resto = Restaurant.findById(restaurantId);
    let stripe = null;

    if (resto.delivery && resto.paiementCB && !resto.cbDirectToAdvisor) {
        stripe = new Stripe(resto.customerSectretStripeKey);
    } else {
        stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    }

    if (!restaurantId || !amount)
        return res.status(BAD_REQUEST).json({
            restaurant: !restaurantId ?
                'Restaurant id must be provided in cart details' : undefined,
            totalPrice: !amount ?
                'Total price must be provided in cart details' : undefined,
        });

    try {
        const customer = await stripe.customers.create({
            email: token.email,
            source: token.id,
        });

        const idempotencyKey = uuid();

        const restaurant = await Restaurant.findById(restaurantId);
        if (!restaurant)
            return res.status(NOT_FOUND).json({ message: 'Invalid restaurant id' });

        const charge = await stripe.charges.create({
            amount,
            currency: 'eur',
            customer: customer.id,
            receipt_email: token.email,
            description: `Course from ${restaurant.name}`,
            shipping: {
                name: token.card.name,
                address: {
                    line1: token.card.address_line1,
                    line2: token.card.address_line2,
                    city: token.card.address_city,
                    country: token.card.address_country,
                    postal_code: token.card.address_zip,
                },
            },
        }, {
            idempotencyKey,
        });

        res.json({ status: charge.status, chargeId: charge.id });
    } catch (error) {
        if (process.env.NODE_ENV === 'development') console.error(error);

        res.status(NOT_ACCEPTABLE).json(error);
    }
});

module.exports = router;
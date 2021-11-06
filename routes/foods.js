const express = require('express');
const router = express.Router();

const { Food, Restaurant, FoodType } = require('../models');
const {
    NOT_FOUND,
    INTERNAL_SERVER_ERROR,
    BAD_REQUEST,
} = require('http-status-codes');
const {
    POPULAR,
    ONSITE,
    WITH_PRICE,
    WITHOUT_PRICE,
    NEW,
    PRIORITY,
} = require('../constants');
const { adminGuard, allAdminGuard } = require('../middlewares/token');
const { upload } = require('../middlewares/upload');
const { parse } = require('../utils/request');
const fs = require('fs');
const path = require('path');
const {
    getNextSequenceValue,
    decrementSequenceValue,
    getCurrentSequenceValue,
    resetSequenceValue,
} = require('../utils/counter');


router.get('/', async function(req, res, next) {
    const { searchCategory, restaurant, type, offset, limit, name, lang, city } =
    req.query;

    try {
        let filter = {};

        if (restaurant) filter.restaurant = restaurant !== '' ? restaurant : null;

        if (name)
            filter.name = {
                $regex: new RegExp(`/.*${name}.*/`),
            };

        if (searchCategory === WITH_PRICE || searchCategory === POPULAR)
            filter = {
                $and: [{
                        ...filter,
                        price: {
                            $ne: null,
                        },
                    },
                    {
                        ...filter,
                        'price.amount': {
                            $ne: null,
                        },
                    },
                ],
            };

        if (searchCategory === ONSITE || searchCategory === WITHOUT_PRICE)
            filter = {
                $or: [{
                        ...filter,
                        price: null,
                    },
                    {
                        ...filter,
                        'price.amount': null,
                    },
                ],
            };

        if (type) {
            const typeIds = (await FoodType.find({ 'name.fr': type })).map(
                (e) => e._id,
            );

            filter.type = {
                $in: typeIds,
            };
        }

        const foodDocuments = Food.find(filter).populate('type');

        if (searchCategory === POPULAR) foodDocuments.sort({ note: 'desc' });

        if (searchCategory === PRIORITY) foodDocuments.sort({ priority: 'desc' });

        if (city) {
            const restaurantIds = (
                await Restaurant.find({ city: new RegExp(`^${city}`, 'ig') })
            ).map((d) => d.id);
            foodDocuments.where('restaurant', { $in: restaurantIds });
        }

        if (searchCategory === NEW)
            foodDocuments.sort({
                createdAt: 'desc',
            });

        if (offset) foodDocuments.skip(offset);

        if (limit) foodDocuments.limit(Number(limit));

        let foods = (
            await foodDocuments
            .populate('ratings')
            .populate('type')
            .populate('restaurant')
            .populate('attributes')
            .populate('allergene')
        ).map((e) => e.toJSON());

        if (lang) {

            foods = foods.map((e) => ({
                ...e,
                name: e.name && (e.name[lang] || e.name.fr),
                type: {
                    ...e.type,
                    name: e.type && (e.type.name[lang] || e.type.name.fr),
                },
                status: e.restaurant && e.restaurant.status,
                restaurant: e.restaurant && e.restaurant._id,
                restaurant_object: e.restaurant,
            }));

        }


        res.json(foods);

    } catch (error) {
        res.status(INTERNAL_SERVER_ERROR);

        if (process.env.NODE_ENV === 'development') {
            console.error(error);
            res.json(error);
        }
    }
});

router.get('/:id', async function(req, res, next) {
    const { id } = req.params;
    const { lang } = req.query;
    z
    try {

        let food = await Food.findById(id)
            .populate('ratings')
            .populate('type')
            .populate('restaurant')
            .populate('attributes')
            .populate('allergene');

        if (!food) return res.status(NOT_FOUND).json({ message: 'Food not found' });

        food = food.toJSON();
        const {
            restaurant: { status },
        } = food;

        if (lang) {
            food = {
                ...food,
                status,
                name: food.name[lang] || food.name.fr,
                type: {
                    ...food.type,
                    name: food.type.name && (food.type.name[lang] || food.type.name.fr),
                },
            };
        }


        res.json(food);
    } catch (error) {
        res.status(INTERNAL_SERVER_ERROR);

        if (process.env.NODE_ENV === 'development') {
            console.error(error);
            res.json(error);
        }
    }
});

router.post(
    '/',
    allAdminGuard,
    upload.single('image'),
    async function(req, res, next) {
        const body = parse(req.body);
        const foodData = {
            ...body,
            priority: await getNextSequenceValue('foodPriority'),
            imageURL: req.file &&
                `${process.env.HOST_NAME}/uploads/foods/${req.file.filename}`,
        };

        try {
            const food = new Food(foodData);

            const newFood = await food.save({
                validateBeforeSave: true,
            });

            if (body.restaurant) {
                const restaurant = await Restaurant.findById(body.restaurant);
                restaurant.foods.push(newFood.id);
                if (!restaurant.foodTypes.filter((e) => e == String(newFood.type)).length)
                    restaurant.foodTypes.push(newFood.type);
                await restaurant.save();
            }

            res.json(newFood.toJSON());
        } catch (error) {
            res.status(INTERNAL_SERVER_ERROR);
            if (req.file) fs.unlinkSync(req.file.path);

            if (process.env.NODE_ENV === 'development') {
                console.error(error);
                res.json(error);
            }
        }
    },
);

router.put(
    '/dragDrop/:id',
    allAdminGuard,
    upload.single('image'),
    async function(req, res, next) {
        const { id } = req.params;
        const data = req.body;

        if (!data)
            return res
                .status(BAD_REQUEST)
                .json({ message: 'Data not provided in body' });

        try {

            await Food.updateOne({ _id: id }, {...data }, );
            res.json({ message: 'Successfully updated food' });
        } catch (error) {
            res.status(INTERNAL_SERVER_ERROR);

            if (process.env.NODE_ENV === 'development') {
                console.error(error);
                res.json(error);
            }
        }
    },
);

router.put(
    '/:id',
    allAdminGuard,
    upload.single('image'),
    async function(req, res, next) {

        const { id } = req.params;

        const data = parse(req.body);


        if (req.file) {
            data.imageURL = `${process.env.HOST_NAME}/uploads/foods/${req.file.filename}`;
        }

        if (!data) {
            return res
                .status(BAD_REQUEST)
                .json({ message: 'Data not provided in body' });
        }

        try {

            if (data.imageURL !== null || data.imageURL !== undefined) {
                const food = await Food.findById(id);
                if (food.imageURL !== data.imageURL) {
                    const imagePath = path.join(
                        __dirname,
                        '../public',
                        food.imageURL.split(process.env.HOST_NAME)[1],
                    );
                    if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
                }
            }

            await Food.updateOne({ _id: id }, {...data })

            res.json({ message: 'Successfully updated food' });

        } catch (error) {

            res.status(INTERNAL_SERVER_ERROR);

            if (process.env.NODE_ENV === 'development') {
                console.error(error);
                res.json(error);
            }
        }
    },
);

router.put(
    '/status/:id',
    allAdminGuard,
    async function(req, res, next) {
        const { id } = req.params;
        try {

            await Food.updateOne({ _id: id }, {...req.body });
            res.json({ message: 'Successfully updated food' });

        } catch (error) {
            res.status(INTERNAL_SERVER_ERROR);

            if (process.env.NODE_ENV === 'development') {
                console.error(error);
                res.json(error);
            }
        }
    },
);

router.post('/getFoodMenu', allAdminGuard, async function(req, res, next) {

    const restaurant = parse(req.body);

    try {

        const food = new Food(restaurant);

        const newFood = await food.save({
            validateBeforeSave: true,
        });

        const foodTest = await Food.findById(food._id)
            .populate('ratings')
            .populate('type')
            .populate('restaurant')
            .populate('attributes')
            .populate('allergene');

        await Food.deleteOne({ _id: food._id });

        res.json(foodTest);

    } catch (error) {
        res.status(INTERNAL_SERVER_ERROR);

        if (process.env.NODE_ENV === 'development') {
            console.error(error);
            res.json(error);
        }
    }
}, );


router.delete('/:id', allAdminGuard, async function(req, res, next) {
    const { id: _id } = req.params;

    try {
        const food = await Food.findById(_id);

        if (food.priority === (await getCurrentSequenceValue('foodPriority')))
            await decrementSequenceValue('foodPriority');

        if (!food) return res.status(NOT_FOUND).json({ message: 'Food not found' });

        if (food.imageURL) {
            const imagePath = path.join(
                __dirname,
                '../public',
                food.imageURL.split(process.env.HOST_NAME)[1],
            );
            if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
        }

        const restaurant = await Restaurant.findById(food.restaurant);
        // Remove foods from restaurant
        if (restaurant) {
            restaurant.foods = restaurant.foods.filter((e) => e != _id);
            await restaurant.save({
                validateBeforeSave: true,
            });
        }

        const result = await Food.deleteOne({ _id });
        if (!(await Food.count())) resetSequenceValue('foodPriority');

        res.json(result);
    } catch (error) {
        res.status(INTERNAL_SERVER_ERROR);

        if (process.env.NODE_ENV === 'development') {
            console.error(error);
            res.json(error);
        }
    }
});

module.exports = router;
const express = require('express');
const router = express.Router();
const {
    Food,
    Restaurant,
    FoodType,
    Menu,
    Accompaniment,
    RestoRecommander,
    PlatRecommander,
    PlatPopulaire
} = require('../models');

const {
    NEAREST,
    POPULAR,
    METERS_PER_KILOMETER,
    CITY,
    NEW,
    PRIORITY,
} = require('../constants');
const {
    BAD_REQUEST,
    INTERNAL_SERVER_ERROR,
    NOT_FOUND,
    NOT_IMPLEMENTED,
} = require('http-status-codes');
const { adminGuard, allAdminGuard } = require('../middlewares/token');
const { upload } = require('../middlewares/upload');
const fs = require('fs');
const path = require('path');
const { parse } = require('../utils/request');
const { generateRestaurantQrCode } = require('../utils/qrcode');
const {
    getNextSequenceValue,
    decrementSequenceValue,
    getCurrentSequenceValue,
    resetSequenceValue,
} = require('../utils/counter');
const getFoodId = require('../services/foods');
const getMenu = require('../services/menu');


router.get('/', async function(req, res, next) {
    const {
        searchCategory,
        offset,
        limit,
        location = '{}',
        city,
        range = 2,
        admin,
    } = req.query;

    switch (searchCategory) {
        case CITY:
            if (!city)
                return res.status(BAD_REQUEST).json({
                    message: 'City not provided',
                });

            try {
                const filter = { city: new RegExp(city, 'ig') };

                if (admin) filter.admin = admin;

                const restaurantDocuments = Restaurant.find(filter);

                if (offset) restaurantDocuments.skip(Number(offset));
                if (limit) restaurantDocuments.limit(Number(limit));

                const restaurants = (
                    await restaurantDocuments
                    .populate('foodTypes')
                    .populate('category')
                    .populate('admin')
                ).map((e) => e.toJSON());

                res.json(restaurants);
            } catch (error) {
                res.status(INTERNAL_SERVER_ERROR);

                if (process.env.NODE_ENV === 'development') {
                    console.error(error);
                    res.json(error);
                }
            }
            break;

        case NEAREST:
            const { coordinates } = JSON.parse(location);

            if (!coordinates) {
                return res
                    .status(BAD_REQUEST)
                    .json({ message: 'Location not provided' });
            }

            try {
                const filter = {
                    location: {
                        $nearSphere: {
                            $geometry: { type: 'Point', coordinates },
                            $maxDistance: Number(range) * METERS_PER_KILOMETER,
                        },
                    },
                };

                if (admin) filter.admin = admin;

                const restaurantDocuments = Restaurant.find(filter);

                if (offset) restaurantDocuments.skip(Number(offset));
                if (limit) restaurantDocuments.limit(Number(limit));

                const nearestRestaurants = (
                    await restaurantDocuments
                    .populate('foodTypes')
                    .populate('category')
                    .populate('admin')
                ).map((e) => e.toJSON());

                res.json(nearestRestaurants);
            } catch (error) {
                res.status(INTERNAL_SERVER_ERROR);

                if (process.env.NODE_ENV === 'development') {
                    console.error(error);
                    res.json(error);
                }
            }
            break;

        case POPULAR:
            try {
                const filter = {};

                if (admin) filter.admin = admin;

                const restaurantDocuments = Restaurant.find(filter).sort({
                    popularity: 'desc',
                });

                if (offset) restaurantDocuments.skip(Number(offset));
                if (limit) restaurantDocuments.limit(Number(limit));

                const popularRestaurants = (
                    await restaurantDocuments
                    .populate('foodTypes')
                    .populate('category')
                    .populate('admin')
                ).map((e) => e.toJSON());

                res.json(popularRestaurants);
            } catch (error) {
                res.status(INTERNAL_SERVER_ERROR);

                if (process.env.NODE_ENV === 'development') {
                    console.error(error);
                    res.json(error);
                }
            }
            break;

        case PRIORITY:
            try {
                const filter = {};

                if (admin) filter.admin = admin;

                const restaurantDocuments = Restaurant.find(filter).sort({
                    priority: 'desc',
                });

                if (offset) restaurantDocuments.skip(Number(offset));
                if (limit) restaurantDocuments.limit(Number(limit));

                const popularRestaurants = (
                    await restaurantDocuments
                    .populate('foodTypes')
                    .populate('category')
                    .populate('admin')
                ).map((e) => e.toJSON());

                res.json(popularRestaurants);
            } catch (error) {
                res.status(INTERNAL_SERVER_ERROR);

                if (process.env.NODE_ENV === 'development') {
                    console.error(error);
                    res.json(error);
                }
            }
            break;

        case NEW:
            try {
                const filter = {};

                if (admin) filter.admin = admin;

                const restaurantDocuments = Restaurant.find().sort({
                    createdAt: 'desc',
                });

                if (offset) restaurantDocuments.skip(Number(offset));
                if (limit) restaurantDocuments.limit(Number(limit));

                const popularRestaurants = (
                    await restaurantDocuments
                    .populate('foodTypes')
                    .populate('category')
                    .populate('admin')
                ).map((e) => e.toJSON());

                res.json(popularRestaurants);
            } catch (error) {
                res.status(INTERNAL_SERVER_ERROR);

                if (process.env.NODE_ENV === 'development') {
                    console.error(error);
                    res.json(error);
                }
            }
            break;

        default:
            try {
                const filter = {};

                if (admin) filter.admin = admin;

                const restaurantDocuments = Restaurant.find(filter);

                if (offset) restaurantDocuments.skip(Number(offset));
                if (limit) restaurantDocuments.limit(Number(limit));

                const restaurants = (
                    await restaurantDocuments
                    .populate('foodTypes')
                    .populate('category')
                    .populate('admin')
                ).map((e) => e.toJSON());

                res.json(restaurants);
            } catch (error) {
                res.status(INTERNAL_SERVER_ERROR);

                if (process.env.NODE_ENV === 'development') {
                    console.error(error);
                    res.json(error);
                }
            }
            break;
    }
});

router.get('/:id', async function(req, res, next) {

    const { id } = req.params;
    const { lang } = req.query;
    try {

        const restaurant = await Restaurant.findById(id)
            .populate('ratings')
            .populate('foodTypes')
            .populate('category');

        if (!restaurant) {
            return res.status(NOT_FOUND).json({ message: 'Restaurant not found' });
        }



        res.json(restaurant.toJSON());

    } catch (error) {
        res.status(INTERNAL_SERVER_ERROR);

        if (process.env.NODE_ENV === 'development') {
            console.error(error);
            res.json(error);
        }
    }
});

router.get('/pages/:id', async function(req, res, next) {

    const { id } = req.params;
    const { lang } = req.query;

    try {

        const restaurant = await Restaurant.findById(id)
            .populate('ratings')
            .populate('foodTypes')
            .populate('category');

        if (!restaurant) {
            return res.status(NOT_FOUND).json({ message: 'Restaurant not found' });
        }

        const foods = [];
        const menus = [];

        await Promise.all(restaurant.foods.map(async(items) => {

            let food = await Food.findById(items)
                .populate('ratings')
                .populate('type')
                .populate('restaurant')
                .populate('attributes')
                .populate('allergene');

            if (!food) {
                return false;
            }

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

            foods.push(food);
        }));

        await Promise.all(restaurant.menus.map(async(items) => {

            let menu = await Menu.findById(items)
                .populate({
                    path: 'restaurant',
                    populate: 'category foodTypes',
                });

            if (!menu) {
                return false;
            }

            menu = {
                ...menu.toJSON(),
                foods: menu.options,
            };

            if (lang) {
                menu = {
                    ...menu,
                    name: menu.name && (menu.name[lang] || menu.name.fr),
                    restaurant: menu.restaurant && {
                        ...menu.restaurant,
                        category: menu.restaurant.category.map((c) => ({
                            ...c,
                            name: c.name && (c.name[lang] || c.name.fr),
                        })),
                    },
                };
            }

            menus.push(menu);
        }));

        res.send({
            restaurant: restaurant,
            food: foods,
            menu: menus
        });

    } catch (error) {
        res.status(INTERNAL_SERVER_ERROR);

        if (process.env.NODE_ENV === 'development') {
            console.error(error);
            res.json(error);
        }
    }
});

router.get('/:id/foods', async function(req, res, next) {
    const { id } = req.params;
    const { lang } = req.query;

    try {
        const foods = await Food.find({ restaurant: id })
            .populate('category')
            .populate('restaurant');

        res.json(foods);
    } catch (error) {
        res.status(INTERNAL_SERVER_ERROR);

        if (process.env.NODE_ENV === 'development') {
            console.error(error);
            res.json(error);
        }
    }
});

router.get('/:id/menus', async function(req, res, next) {
    const { id } = req.params;
    const { lang } = req.query;

    try {
        const restaurant = await Restaurant.findById(id);
        if (!restaurant)
            return res.status(NOT_FOUND).json({ message: 'Restaurant not found' });

        let menus = (
            await Menu.find({ _id: { $in: restaurant.menus } })
            .populate('restaurant')
            .populate({
                path: 'foods.food',
                populate: 'category type restaurant options.items',
            })
        ).map((e) => e.toJSON());

        if (lang)
            menus = menus.map((m) => ({
                ...m,
                restaurant: m.restaurant && {
                    ...m.restaurant,
                    category: m.restaurant.category && {
                        ...m.restaurant.category,
                        name: m.restaurant.category.name &&
                            (m.restaurant.category.name[lang] ||
                                m.restaurant.category.name.fr),
                    },
                },
                name: m.name && (m.name[lang] || m.name.fr),
                foods: m.foods.map(({ food: f, additionalPrice }) => ({
                    food: {
                        ...f,
                        name: f.name && (f.name[lang] || f.name.fr),

                        type: {
                            ...f.type,
                            name: f.type.name && (f.type.name[lang] || f.type.name.fr),
                        },
                    },
                    additionalPrice,
                })),
            }));

        res.json(menus);
    } catch (error) {
        res.status(INTERNAL_SERVER_ERROR);

        if (process.env.NODE_ENV === 'development') {
            console.error(error);
            res.json(error);
        }
    }
});

router.get('/:id/:field', async function(req, res, next) {
    const { id, field } = req.params;

    try {
        const restaurant = (
            await Restaurant.findById(id)
            .populate('ratings')
            .populate('foodTypes')
            .populate('category')
        ).toJSON();
        if (!restaurant[field])
            return res
                .status(NOT_FOUND)
                .json({ message: `Invalid ${field} field name` });

        res.json(restaurant[field]);
    } catch (error) {
        res.status(INTERNAL_SERVER_ERROR);

        if (process.env.NODE_ENV === 'development') {
            console.error(error);

            res.json(error);
        }
    }
});

router.post('/:id/foods', adminGuard, async function(req, res, next) {
    const { id: restaurantId } = req.params;
    const { foodId } = req.body;

    if (!foodId)
        return res.status(BAD_REQUEST).json({ message: 'No food id provided' });

    try {
        const restaurant = await Restaurant.findById(restaurantId);
        const food = await Food.findById(foodId);

        if (!restaurant || !food) return res.status(NOT_FOUND);

        if (!restaurant.foods.filter((id) => id == foodId).length) {
            restaurant.foods.push(foodId);
            await restaurant.save({
                validateBeforeSave: true,
            });
        }

        food.restaurant = restaurantId;
        await food.save({
            validateBeforeSave: true,
        });

        res.json(restaurant.toJSON());
    } catch (error) {
        res.status(INTERNAL_SERVER_ERROR);

        if (process.env.NODE_ENV) {
            console.error(error);
            res.json(error);
        }
    }
});

router.put('/:id/generate-qrcode', async function(req, res, next) {
    res.sendStatus(NOT_IMPLEMENTED);
});

router.delete(
    '/:id/foods/:foodId',
    adminGuard,
    async function(req, res, next) {
        const { id, foodId } = req.params;

        try {
            const restaurant = await Restaurant.findById(id);
            const food = await Restaurant.findById(foodId);

            if (!restaurant || !food)
                return res
                    .status(NOT_FOUND)
                    .json({ message: 'Restaurant or food not found' });

            restaurant.foods = restaurant.foods.filter((foodId) => foodId != id);

            await restaurant.save({
                validateBeforeSave: true,
            });
            res.json({ message: 'Successfully deleted food from restaurant' });
        } catch (error) {
            res.status(INTERNAL_SERVER_ERROR);

            if (process.env.NODE_ENV === 'development') {
                console.error(error);
                res.json(error);
            }
        }
    },
);

router.post('/:id/menus', async function(req, res, next) {
    const { id } = req.params;
    const { menuId } = req.body;

    if (!menuId)
        return res.status(BAD_REQUEST).json({ message: 'No menu id provided' });

    try {
        const restaurant = await Restaurant.findById(id);
        if (!restaurant) return res.status(NOT_FOUND);

        if (!restaurant.menus.filter((id) => id == menuId).length) {
            restaurant.menus.push(menuId);
            await restaurant.save();
        }
        res.json(restaurant.toJSON());
    } catch (error) {
        res.status(INTERNAL_SERVER_ERROR);

        if (process.env.NODE_ENV) {
            console.error(error);
            res.json(error);
        }
    }
});

router.delete(
    '/:id/menus/:menuId',
    adminGuard,
    async function(req, res, next) {
        const { id, menuId } = req.params;

        try {
            const restaurant = await Restaurant.findById(id);
            const menu = await Menu.findById(menuId);

            if (!restaurant || !menu)
                return res
                    .status(NOT_FOUND)
                    .json({ message: 'Restaurant or menu not found' });

            restaurant.menus = restaurant.menus.filter((id) => id != menuId);

            await restaurant.save({
                validateBeforeSave: true,
            });
            res.json({ message: 'Successfully deleted menu from restaurant' });
        } catch (error) {
            res.status(INTERNAL_SERVER_ERROR);

            if (process.env.NODE_ENV === 'development') {
                console.error(error);
                res.json(error);
            }
        }
    },
);

router.post(
    '/',
    allAdminGuard,
    upload.fields([
        { name: 'logo', maxCount: 1 },
        { name: 'couvertureMobile', maxCount: 1 },
        { name: 'couvertureWeb', maxCount: 1 },
    ]),

    async function(req, res, next) {

        const body = parse(req.body);

        const restolist = await Restaurant.find({
            $and: [
                { name_resto_code: { $regex: body.name, $options: "i" } },
                { postalCode: { $regex: body.postalCode, $options: "i" } },
            ]
        });

        var name = `${body.name} ${body.postalCode} `;

        if (restolist.length > 0) {

            name = `${body.name} ${body.postalCode}-${restolist.length + 1} `;

        }

        const restaurantData = {
            ...body,
            priority: await getNextSequenceValue('restaurantPriority'),
            name: body.name,
            name_resto_code: name,
            logo: req.files.logo &&
                `${process.env.HOST_NAME}/uploads/restaurants/${req.files.logo[0].filename}`,
            couvertureMobile: req.files.couvertureMobile &&
                `${process.env.HOST_NAME}/uploads/restaurants/${req.files.couvertureMobile[0].filename}`,
            couvertureWeb: req.files.couvertureWeb &&
                `${process.env.HOST_NAME}/uploads/restaurants/${req.files.couvertureWeb[0].filename}`,
            location:
                (req.body.location &&
                    typeof req.body.location === 'string' &&
                    JSON.parse(req.body.location)) ||
                req.body.location,
        };

        if (!body)
            return res
                .status(BAD_REQUEST)
                .json({ message: 'No restaurant detail provided' });

        try {

            const restaurant = new Restaurant(restaurantData);

            const newRestaurant = await restaurant.save({
                validateBeforeSave: true,
            });

            res.json(newRestaurant.toJSON());
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
    '/:id',
    allAdminGuard,
    upload.fields([
        { name: 'logo', maxCount: 1 },
        { name: 'couvertureMobile', maxCount: 1 },
        { name: 'couvertureWeb', maxCount: 1 },
    ]),
    async function(req, res, next) {

        const { id } = req.params;
        const data = parse(req.body);

        if (req.files.logo && req.files.logo.length > 0 && req.files.logo[0].filename !== "") {
            data.logo = `${process.env.HOST_NAME}/uploads/restaurants/${req.files.logo[0].filename}`
        }

        if (req.files.logo && req.files.couvertureMobile.length > 0 && req.files.couvertureMobile[0].filename !== "") {
            data.couvertureMobile = `${process.env.HOST_NAME}/uploads/restaurants/${req.files.couvertureMobile[0].filename}`
        }

        if (req.files.logo && req.files.couvertureWeb.length > 0 && req.files.couvertureWeb[0].filename !== "") {
            data.couvertureWeb = `${process.env.HOST_NAME}/uploads/restaurants/${req.files.couvertureWeb[0].filename}`
        }

        if (!data) {
            return res
                .status(BAD_REQUEST)
                .json({ message: 'Data not provided in body' });
        }

        try {
            if (data.logo) {
                const restaurant = await Restaurant.findById(id);
                if (restaurant.logo) {
                    const imagePath = path.join(
                        __dirname,
                        '../public',
                        restaurant.logo.split(process.env.HOST_NAME)[1],
                    );
                    if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
                }
            }

            if (data.couvertureMobile) {
                const restaurant = await Restaurant.findById(id);
                if (restaurant.couvertureMobile) {
                    const imagePath = path.join(
                        __dirname,
                        '../public',
                        restaurant.couvertureMobile.split(process.env.HOST_NAME)[1],
                    );
                    if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
                }
            }

            if (data.couvertureWeb) {
                const restaurant = await Restaurant.findById(id);
                if (restaurant.couvertureWeb) {
                    const imagePath = path.join(
                        __dirname,
                        '../public',
                        restaurant.couvertureWeb.split(process.env.HOST_NAME)[1],
                    );
                    if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
                }
            }

            await Restaurant.updateOne({ _id: id }, data);

            res.json({ message: 'Successfully updated restaurant' });
        } catch (error) {
            res.status(INTERNAL_SERVER_ERROR);

            if (process.env.NODE_ENV === 'development') {
                console.error(error);
                res.json(error);
            }
        }
    },
);

router.delete('/:id', allAdminGuard, async function(req, res, next) {
    const { id } = req.params;

    try {
        const restaurant = await Restaurant.findById(id);

        if (
            restaurant.priority ==
            (await getCurrentSequenceValue('restaurantPriority'))
        )
            await decrementSequenceValue('restaurantPriority');

        if (restaurant) {

            if (restaurant.imageURL) {
                const imagePath = path.join(
                    __dirname,
                    '../public',
                    restaurant.imageURL.split(process.env.HOST_NAME)[1],
                );
                if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
            }

            await restaurant.remove();
            await Food.deleteMany({ restaurant: id });
            await Restaurant.deleteMany({ restaurant: id });
            await FoodType.deleteMany({ restaurant: id });
            await Menu.deleteMany({ restaurant: id });
            await FoodType.deleteMany({ restaurant: id });
            await Accompaniment.deleteMany({ restaurant: id });
            await PlatRecommander.deleteMany({ restaurant: id });
            await PlatPopulaire.deleteMany({ restaurant: id });
            await RestoRecommander.deleteMany({ restaurant: id });

            if (!(await Restaurant.count())) resetSequenceValue('restaurantPriority');

            res.json({ message: 'Successfully removed restaurant' });
        } else res.status(NOT_FOUND).json({ message: 'Restaurant not found' });
    } catch (error) {
        res.status(INTERNAL_SERVER_ERROR);

        if (process.env.NODE_ENV === 'development') {
            console.error(error);
            res.json(error);
        }
    }
});

router.delete('/deleteByName/:name', allAdminGuard, async function(req, res, next) {
    const { name } = req.params;

    try {
        const restaurant = await Restaurant.findOne({ name });

        if (
            restaurant.priority ==
            (await getCurrentSequenceValue('restaurantPriority'))
        )
            await decrementSequenceValue('restaurantPriority');

        if (restaurant) {
            if (restaurant.imageURL) {
                const imagePath = path.join(
                    __dirname,
                    '../public',
                    restaurant.imageURL.split(process.env.HOST_NAME)[1],
                );
                if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
            }

            await restaurant.remove();

            if (!(await Restaurant.count())) resetSequenceValue('restaurantPriority');

            res.json({ message: 'Successfully removed restaurant' });
        } else res.status(NOT_FOUND).json({ message: 'Restaurant not found' });
    } catch (error) {
        res.status(INTERNAL_SERVER_ERROR);

        if (process.env.NODE_ENV === 'development') {
            console.error(error);
            res.json(error);
        }
    }
});

router.put('/:id/generateQrCode', adminGuard, async function(req, res, next) {
    const { id } = req.params;

    try {
        const restaurant = await Restaurant.findById(id);
        if (restaurant) {
            await generateRestaurantQrCode(restaurant);
            res.json({ message: 'Qr code generation successfull' });
        }
    } catch (error) {
        res.status(INTERNAL_SERVER_ERROR);

        if (process.env.NODE_ENV === 'development') {
            console.error(error);
            res.json(error);
        }
    }
});

router.put('/generateQrCodes', adminGuard, async function(req, res, next) {
    try {
        const restaurants = await Restaurant.find();
        for (const restaurant of restaurants) {
            await generateRestaurantQrCode(restaurant);
        }
        res.json({ message: "All restaurants' qr code generation successfull" });
    } catch (error) {
        res.status(INTERNAL_SERVER_ERROR);

        if (process.env.NODE_ENV === 'development') {
            console.error(error);
            res.json(error);
        }
    }
});

module.exports = router;
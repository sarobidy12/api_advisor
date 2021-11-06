const express = require('express');
const { adminGuard, allAdminGuard } = require('../middlewares/token');
const router = express.Router();
const { Menu, Food, Restaurant } = require('../models');
const {
    BAD_REQUEST,
    INTERNAL_SERVER_ERROR,
    NOT_FOUND,
} = require('http-status-codes');
const { upload } = require('../middlewares/upload');
const { parse } = require('../utils/request');
const path = require('path');
const fs = require('fs');
const {
    getNextSequenceValue,
    decrementSequenceValue,
    getCurrentSequenceValue,
    resetSequenceValue,
} = require('../utils/counter');

router.get('/', async function (req, res, next) {
    const { lang, filter: filterString = '{}' } = req.query;

    try {
        let filter = JSON.parse(filterString);

        if (filter.restaurant === '') filter.restaurant = null;

        let menus = (
            await Menu.find(filter)
                .populate({ path: 'restaurant', populate: 'category foodTypes' })
                .populate({
                    path: 'foods.food',
                    populate: 'type restaurant',
                })
        ).map((e) => e.toJSON());

        menus = menus.map((e) => ({
            ...e,
            foods: [],
        }));

        if (lang)
            menus = menus.map((e) => ({
                ...e,
                restaurant: e.restaurant && {
                    ...e.restaurant,
                    category: e.restaurant.category.map((c) => ({
                        ...c,
                        name: c.name && (c.name[lang] || c.name.fr),
                    })),
                },
                name: e.name && (e.name[lang] || e.name.fr),
                foods: []
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

router.get('/:id', async function (req, res, next) {
    const { id } = req.params;
    const { lang } = req.query;

    try {
        let menu = await Menu.findById(id)
            .populate({
                path: 'restaurant',
                populate: 'category foodTypes',
            })
            .populate({
                path: 'foods.food',
                populate: 'type restaurant',
            });
        if (!menu) return res.status(NOT_FOUND);

        menu = menu.toJSON();

        menu.foods = menu.foods.filter(({ food }) => !!food);

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
                foods: [],
            };
        }


        res.json(menu);
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
    async function (req, res, next) {

        const body =  req.body;

        const menuData = {
            ...body,
            priority: await getNextSequenceValue('menuPriority'),
            imageURL: req.file &&
                `${process.env.HOST_NAME}/uploads/menus/${req.file.filename}`,
        };

        try {

            const menu = new Menu(menuData);

            const newMenu = await menu.save({
                validateBeforeSave: true,
            });

            if (body.restaurant) {
                const restaurant = await Restaurant.findById(body.restaurant);
                restaurant.menus.push(newMenu.id);
                await restaurant.save();
            }

            res.json(newMenu.toJSON());
        } catch (error) {
            res.status(INTERNAL_SERVER_ERROR);

            if (process.env.NODE_ENV === 'development') {
                console.error(error);
                res.json(error);
            }
        }
    },
);

router.post('/:id/foods', async function (req, res, next) {
    const { id } = req.params;
    const { foodId } = req.body;

    if (!foodId)
        return res.status(BAD_REQUEST).json({ message: 'No food id provided' });

    try {
        const menu = await Menu.findById(id);
        if (!menu) return res.status(NOT_FOUND);

        if (!menu.foods.filter((e) => e == foodId)) {
            menu.foods.push(foodId);
            await menu.save();
        }
        res.json(menu.toJSON());
    } catch (error) {
        res.status(INTERNAL_SERVER_ERROR);

        if (process.env.NODE_ENV) {
            console.error(error);
            res.json(error);
        }
    }
});

router.delete(
    '/:id/foods/:foodId',
    adminGuard,
    async function (req, res, next) {
        const { id, foodId } = req.params;

        try {
            const menu = await Menu.findById(id);
            const food = await Food.findById(foodId);

            if (!menu || !food)
                return res
                    .status(NOT_FOUND)
                    .json({ message: 'Menu or food not found' });

            menu.foods = menu.foods.filter((id) => id != foodId);

            await menu.save({
                validateBeforeSave: true,
            });
            res.json({ message: 'Successfully deleted food from menu' });
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
    async function (req, res, next) {

        const { id } = req.params;

        const data = req.body;

        if (req.file) {
            data.imageURL = `${process.env.HOST_NAME}/uploads/menus/${req.file.filename}`;
        }

        if (!data) {

            return res
                .status(BAD_REQUEST)
                .json({ message: 'Data not provided in body' });

        }

        try {
            if (data.imageURL) {
                const menu = await Menu.findById(id);
                if (menu.imageURL) {
                    const imagePath = path.join(
                        __dirname,
                        '../public',
                        menu.imageURL.split(process.env.HOST_NAME)[1],
                    );
                    if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
                }
            }
            await Menu.updateOne({ _id: id }, data);

            res.json({ message: 'Successfully updated menu' });
        } catch (error) {
            res.status(INTERNAL_SERVER_ERROR);

            if (process.env.NODE_ENV === 'development') {
                console.error(error);
                res.json(error);
            }
        }
    },
);

router.delete('/:id', allAdminGuard, async function (req, res, next) {
    const { id: _id } = req.params;

    try {
        const menu = await Menu.findById(_id);

        if (menu.priority === (await getCurrentSequenceValue('menuPriority')))
            await decrementSequenceValue('menuPriority');

        if (!menu) return res.status(NOT_FOUND).json({ message: 'Menu not found' });

        if (menu.imageURL) {
            const imagePath = path.join(
                __dirname,
                '../public',
                menu.imageURL.split(process.env.HOST_NAME)[1],
            );
            if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
        }

        const restaurant = await Restaurant.findById(menu.restaurant);
        // Remove foods from restaurant
        restaurant.menus = restaurant.menus.filter((e) => e != _id);
        await restaurant.save({
            validateBeforeSave: true,
        });

        const result = await Menu.deleteOne({ _id });

        if (!(await Menu.count())) resetSequenceValue('menuPriority');

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
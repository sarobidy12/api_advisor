const express = require('express');
const { BAD_REQUEST, INTERNAL_SERVER_ERROR } = require('http-status-codes');
const router = express.Router();
const { FoodType, Restaurant } = require('../models');
const { allAdminGuard } = require('../middlewares/token');
const { parse } = require('../utils/request');
const {
    getNextSequenceValue,
    decrementSequenceValue,
    getCurrentSequenceValue,
    resetSequenceValue,
} = require('../utils/counter');

router.get('/', async function(req, res) {
    const { lang, limit, offset, filter } = req.query;

    try {
        const foodTypeDocuments = FoodType.find(JSON.parse(filter || '{}'));

        if (limit) foodTypeDocuments.limit(limit);

        if (offset) foodTypeDocuments.skip(offset);

        let foodTypes = (await foodTypeDocuments.populate('restaurant')).map((e) =>
            e.toJSON(),
        );

        if (lang)
            foodTypes = foodTypes.map((e) => ({
                ...e,
                name: e.name[lang] || e.name.fr,
            }));

        res.json(foodTypes);
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

    try {
        let foodType = (
            await FoodType.findById(id).populate('restaurant')
        ).toJSON();

        if (lang)
            foodType = {
                ...foodType,
                name: foodType.name[lang] || foodType.name.fr,
            };

        res.json(foodType);
    } catch (error) {
        res.status(INTERNAL_SERVER_ERROR);

        if (process.env.NODE_ENV === 'development') {
            console.error(error);
            res.json(error);
        }
    }
});

router.post('/', allAdminGuard, async function(req, res) {
    const data = parse(req.body);

    if (!data)
        res
        .status(BAD_REQUEST)
        .json({ message: 'You need to provide the data for the new food type' });

    const newFoodType = new FoodType({
        ...data,
        priority: await getNextSequenceValue('foodTypePriority'),
    });
    try {

        await Restaurant.updateOne({ _id: data.restaurant }, {
            $push: { foodTypes: newFoodType._id }
        })

        await newFoodType.save({
            validateBeforeSave: true,
        });

        res.json(newFoodType.toJSON());

    } catch (error) {
        res.status(INTERNAL_SERVER_ERROR);

        if (process.env.NODE_ENV === 'development') {
            console.error(error);
            res.json(error);
        }
    }
});

router.put('/:id', allAdminGuard, async function(req, res) {
    const { id: _id } = req.params;
    const data = parse(req.body);

    if (!data)
        return res
            .status(BAD_REQUEST)
            .send({ message: 'Data not provided in request body' });

    try {
        await FoodType.updateOne({ _id }, data);

        res.json({ message: 'Food type successfully updated' });
    } catch (error) {
        res.status(INTERNAL_SERVER_ERROR);

        if (process.env.NODE_ENV === 'development') {
            console.error(error);
            res.json(error);
        }
    }
});

router.delete('/:id', allAdminGuard, async function(req, res) {
    const { id } = req.params;

    try {
        const foodType = await FoodType.findById(id);

        if (
            foodType.priority === (await getCurrentSequenceValue('foodTypePriority'))
        )
            await decrementSequenceValue('foodTypePriority');

        const result = await FoodType.remove({ _id: id });

        if (!(await FoodType.count())) resetSequenceValue('foodTypePriority');

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
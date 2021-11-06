const express = require('express');
const { BAD_REQUEST, INTERNAL_SERVER_ERROR } = require('http-status-codes');
const router = express.Router();

const { RestoRecommander } = require('../models');
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
        const foodTypeDocuments = RestoRecommander.find(JSON.parse(filter || '{}'));

        if (limit) foodTypeDocuments.limit(limit);

        if (offset) foodTypeDocuments.skip(offset);

        let foodTypes = (await foodTypeDocuments.populate('restaurant')).map((e) =>
            e.toJSON(),
        );

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

    try {
        let foodType = (
            await RestoRecommander.findById(id).populate('restaurant')
        ).toJSON();

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

    const data = req.body.restaurant;

    if (!data) {
        res.status(BAD_REQUEST).json({ message: 'You need to provide the data for the new food type' });
    }

    try {

        for (var i = 0; i < data.length; i++) {
            await RestoRecommander.create({
                restaurant: data[i],
                priority: await getNextSequenceValue('restoRecommanderPriority')
            })
        }

        res.status(200).send('success');

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
        await RestoRecommander.updateOne({ _id }, data);

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
        const foodType = await RestoRecommander.findById(id);

        if (
            foodType.priority ===
            (await getCurrentSequenceValue('restoRecommanderPriority'))
        )
            await decrementSequenceValue('restoRecommanderPriority');

        const result = await RestoRecommander.remove({ _id: id });

        if (!(await RestoRecommander.count()))
            resetSequenceValue('restoRecommanderPriority');

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
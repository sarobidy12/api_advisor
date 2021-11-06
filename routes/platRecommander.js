const express = require('express');
const router = express.Router();
const { parse } = require('../utils/request');

const {
    INTERNAL_SERVER_ERROR,
    NOT_FOUND,
    UNAUTHORIZED,
    OK,
} = require('http-status-codes');
const { adminGuard } = require('../middlewares/token');

const {
    getNextSequenceValue,
    decrementSequenceValue,
    getCurrentSequenceValue,
    resetSequenceValue,
} = require('../utils/counter');

//import model
const PlatRecommander = require('../models/PlatRecommander.model');

router.get('/', async function(req, res) {
    try {
        const restaurant = await PlatRecommander.find().populate({
            path: 'food',
            populate: {
                path: 'restaurant',
                model: 'Restaurant',
            }
        }).populate({
            path: 'food',
            populate: {
                path: 'attributes',
                model: 'FoodAttribute'
            }
        }).populate({
            path: 'food',
            populate: {
                path: 'type',
                model: 'FoodType'
            }
        });

        return res.status(OK).json(restaurant);
    } catch (err) {
        res.status(INTERNAL_SERVER_ERROR);

        if (process.env.NODE_ENV === 'development') {
            console.error(e);
            res.json(e);
        }
    }
});

router.get('/:platId', adminGuard, async function(req, res) {
    try {
        const plat = await PlatRecommander.findById(req.params.platId)
            .populate('food.restaurant')
            .toJSON();

        return res.status(OK).json(plat);
    } catch (err) {
        res.status(INTERNAL_SERVER_ERROR);

        if (process.env.NODE_ENV === 'development') {
            console.error(e);
            res.json(e);
        }
    }
});

router.post('/', adminGuard, async function(req, res, next) {

    const data = parse(req.body);

    if (!data) res.status(BAD_REQUEST).json({ message: 'You need to provide ressource' });

    try {

        for (let i = 0; i < data.food.length; i++) {

            await PlatRecommander.create({
                ...data,
                food: data.food[i],
                priority: await getNextSequenceValue('platRecommanderPriority'),
            });

        }

        res.json("success");

    } catch (err) {
        res.status(INTERNAL_SERVER_ERROR);

        if (process.env.NODE_ENV === 'development') {
            console.error(err);
            res.json(err);
        }
    }
});

router.put('/:platId', adminGuard, async function(req, res) {
    const data = parse(req.body);
    const { platId } = req.params;

    if (!data)
        return res
            .status(BAD_REQUEST)
            .send({ message: 'Data not provided in request body' });

    try {
        await PlatRecommander.updateOne({ _id: platId }, data);
        return res.status(OK).json({ msg: 'Update successfully' });
    } catch (e) {
        res.status(INTERNAL_SERVER_ERROR);

        if (process.env.NODE_ENV === 'development') {
            console.error(e);
            res.json(e);
        }
    }
});

router.delete('/:platId', adminGuard, async function(req, res) {
    try {
        const ressource = await PlatRecommander.findOneAndRemove({
            _id: req.params.platId,
        });

        if (
            ressource.priority ===
            (await getCurrentSequenceValue('platRecommanderPriority'))
        )
            await decrementSequenceValue('platRecommanderPriority');

        const result = await PlatRecommander.deleteOne({ _id: req.params.platId });

        if (!(await PlatRecommander.count()))
            resetSequenceValue('platRecommanderPriority');

        res.json(result);
    } catch (err) {
        res.status(INTERNAL_SERVER_ERROR);

        if (process.env.NODE_ENV === 'development') {
            console.error(err);
            res.json(err);
        }
    }
});

module.exports = router;
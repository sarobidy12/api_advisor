const express = require('express');
const router = express.Router();
const { INTERNAL_SERVER_ERROR, BAD_REQUEST } = require('http-status-codes');
const { allAdminGuard } = require('../middlewares/token');
const { upload } = require('../middlewares/upload');
const { parse } = require('../utils/request');
const { Accompaniment } = require('../models');
const {
    getNextSequenceValue,
    decrementSequenceValue,
    getCurrentSequenceValue,
    resetSequenceValue,
} = require('../utils/counter');

const fs = require('fs');
const path = require('path');

router.get('/', async function(req, res, next) {
    const { filter = '{}', limit, offset = 0 } = req.query;

    try {
        const accompanimentDocuments = Accompaniment.find(JSON.parse(filter)).populate('restaurant').populate('Accompaniment');

        if (limit) accompanimentDocuments.limit(limit);

        if (offset) accompanimentDocuments.skip(offset);

        const accompaniments = await accompanimentDocuments;

        res.json(accompaniments);
    } catch (error) {
        res.status(INTERNAL_SERVER_ERROR);

        if (process.env.NODE_ENV === 'development') {
            console.error(error);
            res.json(error);
        }
    }
});

router.get('/:id', async function(req, res) {
    const { id } = req.params;

    try {
        const accompaniment = await Accompaniment.findById(id).populate(
            'restaurant',
        );

        res.json(accompaniment.toJSON());
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

        const data = {
            ...body,
            imageURL: req.file &&
                `${process.env.HOST_NAME}/uploads/accompaniments/${req.file.filename}`,
            priority: await getNextSequenceValue('accompanimentPriority'),
        };

        if (!body)
            res.status(BAD_REQUEST).json({ message: 'No data provided in body' });

        try {
            const accompaniment = new Accompaniment(data);

            const newAccompaniment = await accompaniment.save({
                validateBeforeSave: true,
            });

            res.json(newAccompaniment.toJSON());
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
    upload.single('image'),
    async function(req, res) {
        const { id: _id } = req.params;
        const data = parse(req.body);
        if (req.file)
            data.imageURL = `${process.env.HOST_NAME}/uploads/accompaniments/${req.file.filename}`;

        if (!data)
            return res
                .status(BAD_REQUEST)
                .json({ message: 'Data not provided in body' });

        try {
            if (data.imageURL) {
                const accompaniment = await Accompaniment.findById(_id);
                if (accompaniment.imageURL) {
                    const imagePath = path.join(
                        __dirname,
                        '../public',
                        accompaniment.imageURL.split(process.env.HOST_NAME)[1],
                    );
                    if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
                }
            }
            await Accompaniment.updateOne({ _id }, data);
            res.json({ message: 'Successfully updated accompaniment' });
        } catch (error) {
            res.status(INTERNAL_SERVER_ERROR);

            if (process.env.NODE_ENV === 'development') {
                console.error(error);
                res.json(error);
            }
        }
    },
);

router.delete('/:id', allAdminGuard, async function(req, res) {
    const { id: _id } = req.params;

    try {
        const accompaniment = await Accompaniment.findById(_id);
        const imagePath = path.join(
            __dirname,
            '../public',
            accompaniment.imageURL.split(process.env.HOST_NAME)[1],
        );
        if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);

        if (
            accompaniment.priority ===
            (await getCurrentSequenceValue('accompanimentPriority'))
        )
            await decrementSequenceValue('accompanimentPriority');

        const result = await Accompaniment.deleteOne({ _id });

        if (!(await Accompaniment.count()))
            resetSequenceValue('accompanimentPriority');

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
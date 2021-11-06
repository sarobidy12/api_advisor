const express = require('express');
const { INTERNAL_SERVER_ERROR, BAD_REQUEST } = require('http-status-codes');
const { allAdminGuard } = require('../middlewares/token');
const { upload } = require('../middlewares/upload');
const { FoodAttribute } = require('../models');
const router = express.Router();
const { parse } = require('../utils/request');
const fs = require('fs');
const path = require('path');
const {
    getNextSequenceValue,
    decrementSequenceValue,
} = require('../utils/counter');

router.get('/', async function(req, res, next) {
    const { filter = '{}' } = req.query;

    try {
        const foodAttributes = await FoodAttribute.find(JSON.parse(filter));

        res.json(foodAttributes);
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
        const foodAttribute = await FoodAttribute.findById(id);
        res.json(foodAttribute.toJSON());
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
        body.tag = `${
      body.isAllergen ? 'allergen-' : ''
    }${body.locales.fr.toLowerCase()}`;
        delete body.isAllergen;
        const data = {
            ...body,
            priority: await getNextSequenceValue('foodAttributePriority'),
            imageURL: req.file &&
                `${process.env.HOST_NAME}/uploads/foodAttributes/${req.file.filename}`,
        };

        if (!body)
            res.status(BAD_REQUEST).json({ message: 'No data provided in body' });

        try {
            const foodAttribute = new FoodAttribute(data);

            const newFoodAttribute = await foodAttribute.save({
                validateBeforeSave: true,
            });

            res.json(newFoodAttribute.toJSON());
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

        data.tag = `${data.isAllergen ? 'allergen-' : ''}${data.locales.fr.toLowerCase()}`;

        if (req.file) {
            data.imageURL = `${process.env.HOST_NAME}/uploads/foodAttributes/${req.file.filename}`;
        }

        if (!data) {
            return res
                .status(BAD_REQUEST)
                .json({ message: 'Data not provided in body' })
        };

        try {
            if (data.imageURL) {
                const foodAttribute = await FoodAttribute.findById(_id);
                if (foodAttribute.imageURL) {
                    const imagePath = path.join(
                        __dirname,
                        '../public',
                        foodAttribute.imageURL.split(process.env.HOST_NAME)[1],
                    );
                    if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
                }
            }
            await FoodAttribute.updateOne({ _id }, data);
            res.json({ message: 'Successfully updated food attribute' });
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
        await decrementSequenceValue('foodAttributePriority');

        const foodAttribute = await FoodAttribute.findById(_id);

        if(foodAttribute.imageURL){

            const imagePath = foodAttribute.imageURL && path.join(
                __dirname,
                '../public',
                foodAttribute.imageURL.split(process.env.HOST_NAME)[1],
            );
            if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
    
        }
     
        const result = await FoodAttribute.deleteOne({ _id });

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
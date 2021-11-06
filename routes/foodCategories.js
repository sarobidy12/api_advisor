const express = require('express');
const { INTERNAL_SERVER_ERROR } = require('http-status-codes');
const { adminGuard, allAdminGuard } = require('../middlewares/token');
const router = express.Router();

const { FoodCategory } = require('../models');
const { upload } = require('../middlewares/upload');
const fs = require('fs');
const path = require('path');
const { parse } = require('../utils/request');
const {
  getNextSequenceValue,
  decrementSequenceValue,
  getCurrentSequenceValue,
  resetSequenceValue,
} = require('../utils/counter');

router.get('/', async function (req, res, next) {
  const { lang } = req.query;

  let categories = (await FoodCategory.find()).map((d) => d.toJSON());

  if (lang)
    categories = categories.map(
      ({ name: { [lang]: name, fr: nameFr }, ...other }) => ({
        name: name || nameFr,
        ...other,
      }),
    );

  res.json(categories);
});

router.get('/:id', async function (req, res, next) {
  const { id } = req.params;

  try {
    const foodCategory = await FoodCategory.findById(id);
    res.json(foodCategory.toJSON());
  } catch (error) {
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
    const body = parse(req.body);
    const data = {
      ...body,
      priority: await getNextSequenceValue('categoryPriority'),
      imageURL:
        req.file &&
        `${process.env.HOST_NAME}/uploads/foodCategories/${req.file.filename}`,
    };

    try {
      const foodCategory = new FoodCategory(data);

      const newFoodCategory = await foodCategory.save({
        validateBeforeSave: true,
      });

      res.json(newFoodCategory.toJSON());
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
  '/DragDrop/:id',
  allAdminGuard,
  upload.single('image'),
  async function (req, res, next) {

    const { id } = req.params;
    const data = req.body;

    if (!data)
      return res
        .status(BAD_REQUEST)
        .json({ message: 'Data not provided in body' });

    try {
      await FoodCategory.updateOne({ _id: id }, data);
      res.json({ message: 'Successfully updated food category' });
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
    const data = parse(req.body);

    if (req.file)
      data.imageURL = `${process.env.HOST_NAME}/uploads/foodCategories/${req.file.filename}`;

    if (!data)
      return res
        .status(BAD_REQUEST)
        .json({ message: 'Data not provided in body' });

    try {
      if (data.imageURL) {
        const foodCategory = await FoodCategory.findById(id);
        if (foodCategory.imageURL) {
          const imagePath = path.join(
            __dirname,
            '../public',
            foodCategory.imageURL.split(process.env.HOST_NAME)[1],
          );
          if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
        }
      }
      await FoodCategory.updateOne({ _id: id }, data);
      res.json({ message: 'Successfully updated food category' });
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
    const foodCategory = await FoodCategory.findById(_id);

    if (
      foodCategory.priority ===
      (await getCurrentSequenceValue('categoryPriority'))
    )
      await decrementSequenceValue('categoryPriority');

    const imagePath = path.join(
      __dirname,
      '../public',
      foodCategory.imageURL.split(process.env.HOST_NAME)[1],
    );
    if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);

    const result = await FoodCategory.deleteOne({ _id });

    if (!(await FoodCategory.count())) resetSequenceValue('categoryPriority');

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
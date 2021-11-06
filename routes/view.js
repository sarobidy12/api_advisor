const express = require('express');
const router = express.Router();
const { INTERNAL_SERVER_ERROR } = require('http-status-codes');
const View = require('../models/View.model');

router.get('/', async function (req, res, next) {
  try {
    const view = await View.find();
    if (view.length === 0) {
      let newView = new View({
        grid: false,
        list: true,
      });

      await newView.save();
      const view = await View.find();
      return res.send(view[0]);
    } else {
      return res.send(view[0]);
    }
  } catch (error) {
    res.status(INTERNAL_SERVER_ERROR);

    if (process.env.NODE_ENV === 'development') {
      console.error(error);
      res.json(error);
    }
  }
});

router.put('/:id', async function (req, res, next) {
  try {
    await View.findByIdAndUpdate(req.params.id, { ...req.body.data });
    return res.status(200).send('Success');
  } catch (error) {
    res.status(INTERNAL_SERVER_ERROR);

    if (process.env.NODE_ENV === 'development') {
      console.error(error);
      res.json(error);
    }
  }
});

module.exports = router;

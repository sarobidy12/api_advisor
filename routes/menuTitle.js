const express = require('express');
const { BAD_REQUEST, INTERNAL_SERVER_ERROR } = require('http-status-codes');
const router = express.Router();

const { MenuTitle } = require('../models');
const { allAdminGuard } = require('../middlewares/token');
const { parse } = require('../utils/request');
const {
  getNextSequenceValue,
  decrementSequenceValue,
  getCurrentSequenceValue,
  resetSequenceValue,
} = require('../utils/counter');

router.get('/', async function (req, res) {
  const { lang, limit, offset, filter } = req.query;

  try {
    const menuTitleDocuments = MenuTitle.find(JSON.parse(filter || '{}'));

    if (limit) menuTitleDocuments.limit(limit);

    if (offset) menuTitleDocuments.skip(offset);

    let menuTitle = (await menuTitleDocuments.populate('restaurant')).map((e) =>
      e.toJSON(),
    );

    if (lang)
      menuTitle = menuTitle.map((e) => ({
        ...e,
        name: e.name[lang] || e.name.fr,
      }));

    res.json(menuTitle);
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
    let menuTitle = (
      await MenuTitle.findById(id).populate('restaurant')
    ).toJSON();

    if (lang)
      menuTitle = {
        ...menuTitle,
        name: menuTitle.name[lang] || menuTitle.name.fr,
      };

    res.json(menuTitle);
  } catch (error) {
    res.status(INTERNAL_SERVER_ERROR);

    if (process.env.NODE_ENV === 'development') {
      console.error(error);
      res.json(error);
    }
  }
});

router.post('/', allAdminGuard, async function (req, res) {
  const data = parse(req.body);

  if (!data)
    res
      .status(BAD_REQUEST)
      .json({ message: 'You need to provide the data for the new menu title' });

  const newMenuTitle = new MenuTitle({
    ...data,
    priority: await getNextSequenceValue('menuTitlePriority'),
  });
  try {
    await newMenuTitle.save({
      validateBeforeSave: true,
    });

    res.json(newMenuTitle.toJSON());
  } catch (error) {
    res.status(INTERNAL_SERVER_ERROR);

    if (process.env.NODE_ENV === 'development') {
      console.error(error);
      res.json(error);
    }
  }
});

router.put('/:id', allAdminGuard, async function (req, res) {
  const { id: _id } = req.params;
  const data = parse(req.body);

  if (!data)
    return res
      .status(BAD_REQUEST)
      .send({ message: 'Data not provided in request body' });

  try {
    await MenuTitle.updateOne({ _id }, data);

    res.json({ message: 'Menu title successfully updated' });
  } catch (error) {
    res.status(INTERNAL_SERVER_ERROR);

    if (process.env.NODE_ENV === 'development') {
      console.error(error);
      res.json(error);
    }
  }
});

router.delete('/:id', allAdminGuard, async function (req, res) {
  const { id } = req.params;

  try {
    const menuTitle = await MenuTitle.findById(id);

    if (
      menuTitle.priority ===
      (await getCurrentSequenceValue('menuTitlePriority'))
    )
      await decrementSequenceValue('menuTitlePriority');

    const result = await MenuTitle.remove({ _id: id });

    if (!(await MenuTitle.count())) resetSequenceValue('menuTitlePriority');

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

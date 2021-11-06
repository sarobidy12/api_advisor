const express = require('express');
const router = express.Router();
const { translate } = require('../services/translation');
const { INTERNAL_SERVER_ERROR, BAD_REQUEST } = require('http-status-codes');

router.get('/', async (req, res) => {
  const { sl = 'fr', tl, q } = req.query;

  if (!tl || !q)
    res.status(BAD_REQUEST).json({
      details: {
        tl: !tl ? "The target language 'tl' must be provided" : undefined,
        q: !q ? "The query 'q' must be provided" : undefined,
      },
    });

  try {
    const options = {};
    const text = await translate(q, options);

    res.json({ text });
  } catch (error) {
    res.status(INTERNAL_SERVER_ERROR);

    if (process.env.NODE_ENV === 'development') {
      console.error(error);
      res.json(error);
    }
  }

  res.json({ message: 'Ok' });
});

router.post('/', async (req, res) => {
  const { value, options } = req.body;

  try {
    const text = await translate(value, options);

    res.json({ text });
  } catch (error) {
    res.status(INTERNAL_SERVER_ERROR);

    if (process.env.NODE_ENV === 'development') {
      console.error(error);
      res.json(error);
    }
  }
});

module.exports = router;
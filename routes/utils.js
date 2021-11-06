const express = require('express');
const { generateCustomQRCode } = require('../utils/qrcode');
const router = express.Router();
const fs = require('fs');
const { INTERNAL_SERVER_ERROR } = require('http-status-codes');

router.get('/generate-qrcode', async function (req, res, next) {
  const { priceless, language, restaurant, multipleLanguage } = req.query;

  try {
    const pathname = await generateCustomQRCode(restaurant, {
      priceless: JSON.parse(priceless),
      language,
      multipleLanguage: multipleLanguage,
    });

    

    res.download(pathname, 'qrcode.png', (err) => {
      fs.unlinkSync(pathname);
    });
  } catch (error) {
    res.status(INTERNAL_SERVER_ERROR);

    if (process.env.NODE_ENV === 'development') {
      console.error(error);
      res.json(error);
    }
  }
});

module.exports = router;

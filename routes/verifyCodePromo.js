const express = require('express');
const { BAD_REQUEST, OK, INTERNAL_SERVER_ERROR } = require('http-status-codes');
const router = express.Router();
const publicIp = require('public-ip');
const { HasCodePromo } = require('../models');

router.post('/', async(req, res) => {

    const { max, code, dateFin, id_restaurant } = req.body;

    const ip = await publicIp.v4();

    const listCode = await HasCodePromo.find({
        code: code,
        addressIp: ip,
        id_restaurant: id_restaurant
    });

    if (listCode.length > max)
        return res.status(BAD_REQUEST).json({
            message: 'cannot use in code promo',
        });

    await HasCodePromo.create({
        code: code,
        addressIp: ip,
        dateFin: dateFin,
        id_restaurant: id_restaurant
    });

    return res
        .status(OK)
        .json({ message: 'ok ' });

});


module.exports = router;
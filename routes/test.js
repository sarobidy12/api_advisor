const express = require('express');
const { BAD_REQUEST, OK, INTERNAL_SERVER_ERROR } = require('http-status-codes');
const { sendMail } = require('../services/mail');
const { sendMessage } = require('../services/sms');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ message: 'Hello world!!!' });
});

router.post('/sendMail', (req, res) => {
  const { to, text } = req.body;

  if (!to)
    return res.status(BAD_REQUEST).json({
      message: 'Destination field "to" is not provided but is required',
    });

  if (!text)
    return res
      .status(BAD_REQUEST)
      .json({ message: 'Text content is not provided but is required' });

  sendMail({
    from: process.env.EMAIL_ADDRESS,
    to,
    text,
  })
    .then((info) => {
      res.send(info);
    })
    .catch((reason) => {
      console.error(reason);
      res.status(500).send(reason);
    });
});

router.post('/sendSms', (req, res) => {
  const { from, to, text } = req.body;

  if (!from || !to || !text)
    return res
      .status(BAD_REQUEST)
      .json({ message: '"from", "to" and "content" fields must be provided' });

  sendMessage(from, to, text)
    .then((v) => {
      res.status(OK).json(v);
    })
    .catch((e) => {
      console.error(e);

      res.status(INTERNAL_SERVER_ERROR).json(e);
    });
});

module.exports = router;

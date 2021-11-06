const express = require('express');
const router = express.Router();
const { sendMessage } = require('../services/sms');
const phoneToken = require('generate-sms-verification-code');
const { User } = require('../models');

router.post('/senDconfirm', async function (req, res, next) {

  const {
    commandType,
    relatedUser,
    customer,
  } = req.body;

  if (commandType === 'delivery' || commandType === 'takeaway') {
    const user = await User.findById(relatedUser);
    const code = phoneToken(4, { type: 'number' });

    if (!(user && user.phoneNumber) && !(customer && customer.phoneNumber))
      return res.status(BAD_REQUEST).json({
        message: 'No valid related user nor customer found in request body',
      });
  
      await sendMessage(
        'MenuAdvisor',
        (user && user.phoneNumber) || customer.phoneNumber,
        `Votre code de confirmation pour votre nouvelle commande est ${code}. Ce code a une durée de validité de 5mn`,
      );
  
    }

})


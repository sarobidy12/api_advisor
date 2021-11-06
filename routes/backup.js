const express = require('express');
const router = express.Router();

const {
  UNAUTHORIZED,
  BAD_REQUEST,
  INTERNAL_SERVER_ERROR,
  OK,
  NOT_FOUND,
} = require('http-status-codes');

const {
  adminGuard,
  authGuard,
  allAdminGuard,
} = require('../middlewares/token');

const { Command, Restaurant, ConfirmationCode, User } = require('../models');
const { getNextSequenceValue } = require('../utils/counter');
const { sendMessage } = require('../services/sms');
const phoneToken = require('generate-sms-verification-code');

router.get('/', async function (req, res, next) {
  const {
    type: commandType,
    limit,
    offset,
    start,
    end,
    filter: filterString = '{}',
    sort = '{ "createdAt": "desc" }',
  } = req.query;

  const filter = JSON.parse(filterString);

  for (let key in filter) {
    if (Array.isArray(filter[key]))
      filter[key] = {
        $in: filter[key],
      };
  }

  if (commandType) filter.commandType = commandType;

  if (start ^ end)
    return res
      .status(BAD_REQUEST)
      .json({ message: 'Start and end must be set if one is present' });

  if (start && end) {
    if (
      new Date(start).toString() === 'Invalid Date' ||
      new Date(end).toString() === 'Invalid Date'
    )
      return res.status(BAD_REQUEST).json({ message: 'Invalid date format' });

    filter.createdAt = {
      $gte: start,
      $lte: end,
    };
  }

  try {
    const commandDocuments = Command.find(filter);

    if (offset) commandDocuments.skip(Number(offset));

    if (limit) commandDocuments.limit(Number(limit));

    commandDocuments.sort(JSON.parse(sort));

    const commands = (
      await commandDocuments
        .populate('restaurant')
        .populate('relatedUser')
        .populate({ path: 'items.item', populate: 'category type restaurant' })
        .populate({ path: 'menus.item', populate: 'foods' })
        .populate({
          path: 'menus.foods.food',
          populate: 'type category attributes',
        })
        .populate('menus.foods.options.items.item')
        .populate('items.options.items.item')
    ).map((e) => e.toJSON());

    res.json(commands);
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

  try {
    const command = await Command.findById(id)
      .populate('restaurant')
      .populate('relatedUser')
      .populate({ path: 'items.item', populate: 'category type restaurant' })
      .populate({ path: 'menus.item', populate: 'foods' })
      .populate({
        path: 'menus.foods.food',
        populate: 'type category attributes',
      })
      .populate('menus.foods.options.items.item')
      .populate('items.options.items.item');

    if (!command)
      return res.status(NOT_FOUND).json({ message: 'Command not found' });

    res.json(command.toJSON());
  } catch (error) {
    res.status(INTERNAL_SERVER_ERROR);

    if (process.env.NODE_ENV === 'development') {
      console.error(error);
      res.json(error);
    }
  }
});

router.post('/', async function (req, res, next) {
  const {
    items = [],
    commandType,
    totalPrice,
    restaurant,
    relatedUser,
    shippingAddress,
    shippingTime,
    shipAsSoonAsPossible,
    customer,
    priceless = false,
    comment,
    menus = [],
  } = req.body;

  if (!commandType || !totalPrice)
    return res.status(BAD_REQUEST).json({
      message: 'You need to provide item list details',
      details: {
        relatedUser:
          commandType === 'delivery' && !relatedUser
            ? 'Related user id not provided'
            : undefined,
        commandType: !commandType ? 'Command type not provided' : undefined,
        totalPrice: !totalPrice ? 'Total price not provided' : undefined,
        restaurant: !restaurant ? 'Restaurant id not provided' : undefined,
      },
    });

  if (
    commandType === 'delivery' &&
    (!shippingAddress || (!shipAsSoonAsPossible && !shippingTime))
  )
    return res.status(BAD_REQUEST).json({
      message: 'Shipping details not provided',
      details: {
        shippingAddress: !shippingAddress
          ? 'Shipping address must be provided'
          : undefined,
        shippingTime:
          !shippingTime || !shipAsSoonAsPossible
            ? 'Shipping time must be provided otherwise you need to set shipAsSoonAsPossible to true'
            : undefined,
      },
    });

  try {
    const command = new Command({
      relatedUser,
      items,
      menus,
      commandType,
      totalPrice,
      restaurant,
      shippingAddress,
      shippingTime,
      shipAsSoonAsPossible,
      customer,
      priceless,
      confirmed: true,
      comment,
      code: await getNextSequenceValue('command'),
    });

    if (commandType === 'delivery' || commandType === 'takeaway') {
      const user = await User.findById(relatedUser);

      if (!(user && user.phoneNumber) && !(customer && customer.phoneNumber))
        return res.status(BAD_REQUEST).json({
          message: 'No valid related user nor customer found in request body',
        });

      const { phoneNumber } = await Restaurant.findById(restaurant);

      await sendMessage(
        'Menu advisor',
        phoneNumber,
        `Vous avez reçu une nouvelle commande`,
      );

      await ConfirmationCode.deleteMany({
        confirmationType: 'new-command',
        payload: command.id,
      });
    }
    await command.save({
      validateBeforeSave: true,
    });

    const c = (
      await Command.findById(command.id)
        .populate('restaurant')
        .populate('relatedUser')
        .populate({ path: 'items.item', populate: 'category type restaurant' })
        .populate({ path: 'menus.item', populate: 'foods' })
        .populate({
          path: 'menus.foods.food',
          populate: 'type category attributes',
        })
        .populate('menus.foods.options.items.item')
        .populate('items.options.items.item')
    ).toJSON();

    res.json(c);
  } catch (error) {
    res.status(INTERNAL_SERVER_ERROR);

    if (process.env.NODE_ENV === 'development') {
      console.error(error);
      res.json(error);
    }
  }
});

router.put('/:id', authGuard, async function (req, res, next) {
  const { id: commandId } = req.params;
  const { id, roles } = req.user;
  const data = req.body;

  if (!data)
    res
      .status(BAD_REQUEST)
      .json({ message: "Data must be provided in request's body" });

  try {
    const command = (await Command.findById(commandId)).toJSON();
    if (!command)
      return res.status(NOT_FOUND).json({ message: 'Command not found' });

    if (
      command.relatedUser &&
      command.relatedUser != id &&
      !roles.contains('ROLE_ADMIN')
    )
      return res.status(UNAUTHORIZED).json({
        message:
          "You cannot modify commands that don't belongs to you unless you have admin access",
      });

    await Command.updateOne({ _id: commandId }, data);
    res.sendStatus(OK);
  } catch (error) {
    res.status(INTERNAL_SERVER_ERROR);

    if (process.env.NODE_ENV === 'development') {
      console.error(error);
      res.json(error);
    }
  }
});

router.delete('/:id', adminGuard, async function (req, res, next) {
  const { id: _id } = req.params;

  try {
    const result = await Command.deleteOne({ _id });

    res.json(result);
  } catch (error) {
    res.status(INTERNAL_SERVER_ERROR);

    if (process.env.NODE_ENV === 'development') {
      console.error(error);
      res.json(error);
    }
  }
});

router.post('/sendCode', async function (req, res, next) {
  const { commandType, relatedUser, customer } = req.body;

  if (commandType === 'delivery' || commandType === 'takeaway') {
    const user = await User.findById(relatedUser);
    const code = phoneToken(4, { type: 'number' });

    if (!(user && user.phoneNumber) && !(customer && customer.phoneNumber))
      return res.status(BAD_REQUEST).json({
        message: 'No valid related user nor customer found in request body',
      });

    await sendMessage(
      'Menu advisor',
      (user && user.phoneNumber) || customer.phoneNumber,
      `Votre code de confirmation pour votre nouvelle commande est ${code}. Ce code a une durée de validité de 5mn`,
    );
  }
});

router.post('/confirmCode', async function (req, res, next) {
  const { code } = req.body;
  try {
    const validationCode = await ConfirmationCode.findOne({
      code: Number(code),
      confirmationType: 'new-command',
    });

    if (!validationCode)
      return res.status(BAD_REQUEST).json({ message: 'Bad code' });

    await validationCode.remove();

    const { relatedUser, customer } = command;

    if (
      req.body.commandType === 'delivery' ||
      req.body.commandType === 'takeaway'
    )
      await sendMessage(
        'Menu advisor',
        (relatedUser && relatedUser.phoneNumber) || customer.phoneNumber,
        `Confirmation de la commande
        Votre commande a bien été confirmée. Nous vous contacterons pour sa validation`,
      );

    res.json({ message: 'Command confirmed successfully' });
  } catch (error) {
    res.status(INTERNAL_SERVER_ERROR);

    if (process.env.NODE_ENV === 'development') {
      console.error(error);
      res.json(error);
    }
  }
});

router.post('/:id/validate', allAdminGuard, async function (req, res, next) {
  const { id: _id } = req.params;

  try {
    await Command.updateOne({ _id }, { validated: true });
    const command = await Command.findById(_id)
      .populate('relatedUser')
      .populate('restaurant')
      .populate('items.item');

    const { relatedUser, commandType, customer } = command;

    if (commandType === 'delivery' || commandType === 'takeaway')
      await sendMessage(
        'Menu advisor',
        (relatedUser && relatedUser.phoneNumber) || customer.phoneNumber,
        `Validation de la commande
        Votre commande a bien été validée avec succès.`,
      );

    res.json({ message: 'Command validated successfully' });
  } catch (error) {
    res.status(INTERNAL_SERVER_ERROR);

    if (process.env.NODE_ENV === 'development') {
      console.error(error);
      res.json(error);
    }
  }
});

router.post('/:id/revoke', allAdminGuard, async function (req, res, next) {
  const { id: _id } = req.params;

  try {
    await Command.updateOne({ _id }, { revoked: true, validated: false });
    const command = await Command.findById(_id)
      .populate('relatedUser')
      .populate('restaurant')
      .populate('items.item');

    const { relatedUser, customer } = command;

    if (commandType === 'delivery' || commandType === 'takeaway')
      await sendMessage(
        'Menu advisor',
        (relatedUser && relatedUser.phoneNumber) || customer.phoneNumber,
        `Refus de la commande\n
      Votre commande a été refusée.\n
      Veuillez contactez le restaurant concerné pour plus amples informations`,
      );

    res.json({ message: 'Command revoked successfully' });
  } catch (error) {
    res.status(INTERNAL_SERVER_ERROR);

    if (process.env.NODE_ENV === 'development') {
      console.error(error);
      res.json(error);
    }
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const {
    User,
    ConfirmationCode,
    Token,
    PaymentCard,
    Restaurant,
} = require('../models');
const {
    BAD_REQUEST,
    CONFLICT,
    INTERNAL_SERVER_ERROR,
    FORBIDDEN,
    OK,
    UNAUTHORIZED,
    NOT_FOUND,
} = require('http-status-codes');
const { hash, compare } = require('../helpers/hash');
const {
    adminGuard,
    authGuard,
    allAdminGuard,
} = require('../middlewares/token');
const phoneToken = require('generate-sms-verification-code');
const jwt = require('jsonwebtoken');
const { upload } = require('../middlewares/upload');
const { sendMessage } = require('../services/sms');

/* GET users listing. */
router.get('/', allAdminGuard, async function(req, res) {
    const { filter: filterQuery = '{}', sort: sortQuery } = req.query;
    const filter = JSON.parse(filterQuery);
    const sort = (sortQuery && JSON.parse(sortQuery)) || { id: 'asc' };

    if (typeof filter.alreadyRestaurantAdmin !== 'undefined') {
        if (filter.alreadyRestaurantAdmin === false) {
            const userIds = (await Restaurant.find())
                .map((d) => d.toJSON())
                .map(({ admin }) => admin);
            filter._id = {
                $nin: userIds,
            };
        }

        delete filter.alreadyRestaurantAdmin;
    }

    const users = (await User.find(filter).sort(sort))
        .map((u) => u.toJSON())
        .map(({ password, ...rest }) => rest);

    const resto = await Restaurant.find();

    let finalResult = [];

    for (let i = 0; i < users.length; i++) {
        const resultResto = resto.find(k => k.admin == `${users[i]._id}`)
        if (!users[i].roles.includes('ROLE_RESTAURANT_ADMIN')) {
            finalResult.push({...users[i], resto: 'Pas un restaurateur' })
        } else if (users[i].roles.includes('ROLE_RESTAURANT_ADMIN') && resultResto) {
            finalResult.push({...users[i], resto: resultResto.name })
        } else {
            finalResult.push({...users[i], resto: 'Pas encore affecté à un restaurant' })
        }
    }

    res.json(finalResult);
});

/* Add new user */
router.post('/', adminGuard, async function(req, res) {
    const data = req.body;

    if (!data.password)
        return res.status(BAD_REQUEST).json({
            message: 'Password not provided',
        });

    data.password = hash(data.password);

    try {
        const user = new User({...data, validated: true });
        await user.save({
            validateBeforeSave: true,
        });

        res.json({ user: user.toJSON() });
    } catch (error) {
        res.status(INTERNAL_SERVER_ERROR);

        if (process.env.NODE_ENV === 'development') {
            console.error(error);
            res.json(error);
        }
    }
});

router.get('/me', authGuard, async function(req, res) {
    const { id } = req.user;

    try {
        const user = (await User.findById(id).populate('paymentCards')).toJSON();

        user.favoriteFoods = [...new Set(user.favoriteFoods)];
        user.favoriteRestaurants = [...new Set(user.favoriteRestaurants)];

        res.json(user);
    } catch (error) {
        res.status(INTERNAL_SERVER_ERROR);

        if (process.env.NODE_ENV === 'development') {
            console.error(error);
            res.json(error);
        }
    }
});

router.get('/:id', authGuard, async function(req, res) {
    const { id } = req.params;
    try {
        const user = (await User.findOne({ id }).populate('paymentCards')).toJSON();

        if (req.user.id === id || req.user.roles.includes('ROLE_ADMIN'))
            return res.json(user);

        const { password, ...rest } = user;
        res.json(rest);
    } catch (error) {
        res.status(INTERNAL_SERVER_ERROR);

        if (process.env.NODE_ENV === 'development') res.json({ error });
    }
});

router.get('/one/:id', authGuard, async function(req, res) {
    const { id } = req.params;
    try {
        const user = await User.findById(id);

        const { password, ...rest } = user;
        res.send(rest);
    } catch (error) {
        res.status(INTERNAL_SERVER_ERROR);

        if (process.env.NODE_ENV === 'development') res.json({ error });
    }
});

router.post('/update-password', authGuard, async function(req, res, next) {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword)
        return res.status(BAD_REQUEST).json({
            oldPassword: !oldPassword ? 'Old password is required' : undefined,
            newPassword: !newPassword ? 'New password is required' : undefined,
        });

    const { id } = req.user;

    try {
        const user = await User.findById(id);

        if (!user) res.status(UNAUTHORIZED).json({ message: 'User not found' });

        if (compare(oldPassword, user.password)) {
            const password = hash(newPassword);
            user.password = password;
            await user.save();
            res.json({ message: 'Successfully changed password' });
        } else {
            res.status(UNAUTHORIZED).json({ message: 'Incorrect old password' });
        }
    } catch (error) {
        res.status(INTERNAL_SERVER_ERROR);

        if (process.env.NODE_ENV === 'development') {
            console.error(error);
            res.json(error);
        }
    }
});

router.put(
    '/:id',
    authGuard,
    upload.single('photo'),
    async function(req, res, next) {
        const { user } = req;
        const { id } = req.params;
        const data = req.body;
        const SIM = user.id == id;
        if (data.password) data.password = hash(data.password);

        if (user.roles.includes('ROLE_ADMIN') === false && SIM === false) {
            return res
                .status(FORBIDDEN)
                .json({ message: "You cannot update other user's profile than yours" });
        }

        try {
            const update = {...data };
            if (req.file)
                update.imageURL = `${process.env.HOST_NAME}/uploads/${req.file.filename}`;

            await User.updateOne({ _id: id }, update);
            res.json({ message: 'Successfully updated user profile' });
        } catch (error) {
            res.status(INTERNAL_SERVER_ERROR);

            if (process.env.NODE_ENV === 'development') {
                console.error(error);
                res.json(error);
            }
        }
    },
);

router.delete('/:id', adminGuard, async function(req, res) {
    const { id } = req.params;

    try {
        const isDeleted = !!(await User.findByIdAndDelete(id));

        res.status(OK).json({ isDeleted });
    } catch (error) {
        res.status(INTERNAL_SERVER_ERROR);

        if (process.env.NODE_ENV === 'development') {
            console.error(error);
            res.json(error);
        }
    }
});

router.post('/paymentCards', authGuard, async function(req, res) {
    const { id } = req.user;
    const paymentCard = req.body;

    if (!paymentCard)
        return res
            .status(BAD_REQUEST)
            .json({ message: 'Payment card details are not provided in body' });

    try {
        const user = await User.findById(id);

        const newPaymentCard = new PaymentCard(paymentCard);
        await newPaymentCard.save();

        user.addPaymentCard(newPaymentCard._id);
        await user.save();

        res.json(user.toJSON());
    } catch (error) {
        res.status(INTERNAL_SERVER_ERROR);

        if (process.env.NODE_ENV === 'development') {
            console.error(error);
            res.json(error);
        }
    }
});

router.delete('/paymentCards/:id', authGuard, async function(req, res) {
    const { id } = req.params;
    const { id: userId } = req.user;

    try {
        const user = await User.findById(userId);

        user.removePaymentCard(id);
        await user.save();

        res.json({ message: 'Successfully removed payment card' });
    } catch (error) {
        res.status(INTERNAL_SERVER_ERROR);

        if (process.env.NODE_ENV === 'development') {
            console.error(error);
            res.json(error);
        }
    }
});

router.post('/favoriteFoods', authGuard, async function(req, res) {
    const { id } = req.body;
    const { id: userId } = req.user;

    if (!id)
        return res.status(BAD_REQUEST).json({ message: 'Food id is required' });

    try {
        const user = await User.findById(userId);

        user.addToFavoriteFoods(id);
        await user.save();

        res.json({ message: 'Successfully added food to favorites' });
    } catch (error) {
        res.status(INTERNAL_SERVER_ERROR);

        if (process.env.NODE_ENV === 'development') {
            console.error(error);
            res.json({ error });
        }
    }
});

router.delete('/favoriteFoods/:id', authGuard, async function(req, res) {
    const { id } = req.params;
    const { id: userId } = req.user;

    try {
        const user = await User.findById(userId);

        user.removeFromFavoriteFoods(id);
        await user.save({
            validateBeforeSave: true,
        });

        res.json({ message: 'Successfully removed food from favorites' });
    } catch (error) {
        res.status(INTERNAL_SERVER_ERROR);

        if (process.env.NODE_ENV === 'development') {
            console.error(error);
            res.json({ error });
        }
    }
});

router.post('/favoriteRestaurants', authGuard, async function(req, res) {
    const { id } = req.body;
    const { id: userId } = req.user;

    if (!id)
        return res
            .status(BAD_REQUEST)
            .json({ message: 'Restaurant id is required' });

    try {
        const user = await User.findById(userId);

        user.addToFavoriteRestaurants(id);
        await user.save();

        res.json({ message: 'Successfully added restaurant to favorites' });
    } catch (error) {
        res.status(INTERNAL_SERVER_ERROR);

        if (process.env.NODE_ENV === 'development') {
            console.error(error);
            res.json({ error });
        }
    }
});

router.delete('/favoriteRestaurants/:id', authGuard, async function(req, res) {
    const { id } = req.params;
    const { id: userId } = req.user;

    try {
        const user = await User.findById(userId);

        user.removeFromFavoriteRestaurants(id);
        await user.save();

        res.json({ message: 'Successfully removed restaurant from favorites' });
    } catch (error) {
        res.status(INTERNAL_SERVER_ERROR);

        if (process.env.NODE_ENV === 'development') {
            console.error(error);
            res.json({ error });
        }
    }
});

/* Register endpoint */
router.post('/register', async function(req, res) {
    const {
        email,
        password,
        phoneNumber,
        name,
        roles = ['ROLE_USER'],
    } = req.body;

    if (!email || !password || !phoneNumber)
        return res.status(BAD_REQUEST).json({
            message: 'Missing credentials',
            details: {
                email: !email ? 'Email not provided' : undefined,
                password: !password ? 'Passwod not provided' : undefined,
                phoneNumber: !phoneNumber ? 'Phone number not provided' : undefined,
            },
        });

    const user = req.user;

    if (
        (roles.includes('ROLE_ADMIN') || roles.includes('ROLE_RESTAURANT_ADMIN')) &&
        (!user || !user.roles.includes('ROLE_ADMIN'))
    )
        return res.status(FORBIDDEN).json({
            status: 'failure',
            message: "You don't have enough permission to create super user",
        });

    try {
        const emailAlreadyInUse = !!(await User.findOne({
            email,
            validated: true,
        }));
        const phoneNumberAlreadyInUse = !!(await User.findOne({
            phoneNumber,
            validated: true,
        }));

        const alreadyInUse = emailAlreadyInUse || phoneNumberAlreadyInUse;

        if (alreadyInUse)
            return res.status(500).json({
                message: 'One or more provided informations are already in use with another user',
                details: {
                    email: emailAlreadyInUse ? 'Email is already in use' : undefined,
                    phoneNumber: phoneNumberAlreadyInUse ?
                        'Phone number is already in use' : undefined,
                },
            });

        const eventualExistingUser = await User.findOne({
            $or: [{ email }, { phoneNumber }],
        });

        if (eventualExistingUser) await eventualExistingUser.remove();

        const encryptedPassword = hash(password);
        const newUser = new User({
            email,
            password: encryptedPassword,
            phoneNumber: phoneNumber.trim(),
            roles,
            name,
            validated: roles.includes('ROLE_ADMIN') || roles.includes('ROLE_RESTAURANT_ADMIN'),
        });

        const createdUser = await newUser.save({
            validateBeforeSave: true,
        });

        if (!roles.includes('ROLE_ADMIN') &&
            !roles.includes('ROLE_RESTAURANT_ADMIN')
        ) {

            return sendConfirmationCode(
                req,
                res,
                createdUser.id,
                'register',
                createdUser.phoneNumber,
            );
        }

    } catch (error) {
        res.status(INTERNAL_SERVER_ERROR);

        if (process.env.NODE_ENV === 'development') {
            console.error(error);
            res.json({ error });
        }
    }
});

router.post('/resend-confirmation-code', async function(req, res, next) {
    const { token } = req.body;

    if (!token)
        return res.status(BAD_REQUEST).json({ message: 'No token provided ' });

    const decoded = jwt.verify(token, process.env.SECRET_KEY);

    if (!decoded)
        return res.status(UNAUTHORIZED).json({ message: 'Invalid token' });

    const { id, type } = decoded;

    try {
        const user = await User.findById(id);

        sendConfirmationCode(req, res, user.id, type, user.phoneNumber);
    } catch (error) {
        res.status(INTERNAL_SERVER_ERROR);

        if (process.env.NODE_ENV === 'development') {
            console.error(error);
            res.json({ error });
        }
    }
});

router.post('/confirm-account', async function(req, res, next) {

    const { token, code } = req.body;

    if (!token || !code)
        return res.status(BAD_REQUEST).json({
            token: !token ? 'No token provided' : undefined,
            code: !code ? 'No confirmation code provided' : undefined,
        });

    const { id, type } = jwt.verify(token, process.env.SECRET_KEY);

    if (!id || type !== 'register')
        return res
            .status(UNAUTHORIZED)
            .json({ message: 'Invalid registration token' });

    try {
        const confirmationCode = await ConfirmationCode.findOne({
            relatedUser: id,
            code,
            confirmationType: 'register',
        });

        if (!confirmationCode)
            return res
                .status(UNAUTHORIZED)
                .json({ message: 'Invalid confirmation code' });

        await confirmationCode.remove();

        await User.updateOne({ _id: id }, { validated: true });

        res.json({
            status: 'successful',
            message: 'Successfully validated account',
        });
    } catch (error) {
        res.status(INTERNAL_SERVER_ERROR);

        if (process.env.NODE_ENV === 'development') {
            console.error(error);
            res.json({ error });
        }
    }
});

router.post('/reset-password', async function(req, res, next) {
    const { phoneNumber } = req.body;

    if (!phoneNumber)
        return res.status(BAD_REQUEST).json({
            phoneNumber: 'No phone number provided',
        });

    try {
        const user = await User.findOne({ phoneNumber });
        if (!user)
            return res.status(NOT_FOUND).json({
                message: 'This phone number is not registered yet in our database',
            });

        const { _id: id } = user;

        sendConfirmationCode(req, res, id, 'reset-password', user.phoneNumber);
    } catch (error) {
        res.status(INTERNAL_SERVER_ERROR);

        if (process.env.NODE_ENV === 'development') {
            console.error(error);
            res.json(error);
        }
    }
});

router.post('/confirm-reset-password', async function(req, res, next) {
    const { token, code: c, password } = req.body;

    if (!token || !c || !password)
        return res.status(BAD_REQUEST).json({
            token: !token ? 'No token provided' : undefined,
            code: !c ? 'No confirmation code provided' : undefined,
            password: !password ? 'No new password provided' : undefined,
        });

    const code = Number(c);

    const { id, type } = jwt.verify(token, process.env.SECRET_KEY);

    if (!id || type !== 'reset-password')
        return res
            .status(UNAUTHORIZED)
            .json({ message: 'Invalid registration token' });

    try {
        const confirmationCode = await ConfirmationCode.findOne({
            relatedUser: id,
            code,
            confirmationType: 'reset-password',
        });

        if (!confirmationCode)
            return res
                .status(UNAUTHORIZED)
                .json({ message: 'Invalid confirmation code' });

        await confirmationCode.remove();

        await User.updateOne({ _id: id }, { password: hash(password) });

        res.json({
            status: 'successfull',
            message: 'Successfully changed password',
        });
    } catch (error) {
        res.status(INTERNAL_SERVER_ERROR);

        if (process.env.NODE_ENV === 'development') {
            console.error(error);
            res.json({ error });
        }
    }
});

/**
 * Send confirmation code with email
 * @param {Express.Request} req
 * @param {Express.Response} res
 * @param {string} email
 * @param {string} userId
 */
const sendConfirmationCode = async function(
    req,
    res,
    userId,
    type,
    phoneNumber,
) {
    // Send mail

    const code = phoneToken(4, { type: 'number' });

    if (!['register', 'login', 'reset-password'].includes(type))
        throw new Error('Invalid code type');

    const text = `Votre code de confirmation pour ${type === 'register'
    ? 'la création de votre compte'
    : type === 'login'
      ? 'une demande de connexion'
      : type === 'reset-password'
        ? 'la réinitialisation de votre mot de passe'
        : ''
    } est: ${code}. Ce code n'est valable que pendant 5 minutes.`;

    try {

        await sendMessage('Menu advisor', phoneNumber, text);

        await ConfirmationCode.deleteMany({
            relatedUser: userId,
            confirmationType: type,
        });

        const confirmationCode = new ConfirmationCode({
            confirmationType: type,
            code,
            relatedUser: userId,
        });

        await confirmationCode.save();

        const token = jwt.sign({ id: userId, type }, process.env.SECRET_KEY);

        return res.json({ status: 'success', token });

    } catch (error) {
        res.status(INTERNAL_SERVER_ERROR);

        if (process.env.NODE_ENV === 'development') {
            console.error(error);
            res.json({ error });
        }
    }
};

module.exports = router;
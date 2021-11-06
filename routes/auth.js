const express = require('express');
const router = express.Router();
const { compare } = require('../helpers/hash');
const jwt = require('jsonwebtoken');

const {
    UNAUTHORIZED,
    BAD_REQUEST,
    INTERNAL_SERVER_ERROR,
} = require('http-status-codes');

const { User, Token } = require('../models');

/* Login endpoint */
router.post('/login', async function(req, res, next) {

    let { email, login, password } = req.body;

    let phoneNumber = `+${req.body.phoneNumber}`;

    if (typeof login === 'string' && /^.+@.+\..+$/.test(login)) email = login;

    else if (typeof login === 'string' && /^\+?\d+$/.test(login))
        phoneNumber = login;

    if ((!email && !phoneNumber && !login) || !password)
        return res.status(BAD_REQUEST).json({
            message: "Please provide your phone number / email (if you're an admin) and your password",
        });

    const user = await User.findOne({
        $or: [{ phoneNumber }, { email }],
    }).populate('paymentCards');

    if (email && !user.roles.contains(['ROLE_ADMIN', 'ROLE_RESTAURANT_ADMIN'])) {
        return res
            .status(UNAUTHORIZED)
            .json({ message: 'Only admins can log with email' });
    }



    if (!user || !compare(password, user.password)) {
        return res.status(UNAUTHORIZED).json({
            status: 'failure',
            message: `Incorrect ${email ? 'email' : 'phone number'} or password`,
        });
    }

    const { id, validated } = user;

    if (!validated)
        return res.status(UNAUTHORIZED).json({
            status: 'account-not-validated',
            message: 'Current user account is not validated yet',
        });

    try {
        const currentToken = await Token.findOne({ userId: id });
        if (currentToken) {
            await currentToken.remove();
        }
    } catch (error) {
        res.status(INTERNAL_SERVER_ERROR);

        if (process.env.NODE_ENV === 'development') res.json(error);
    }

    const access_token = jwt.sign({
            id,
        },
        process.env.SECRET_KEY, { expiresIn: '3 hours' },
    );

    const refresh_token = jwt.sign({
            id,
        },
        process.env.SECRET_KEY,
    );

    const token = new Token({
        userId: id,
        access_token,
        refresh_token,
    });

    try {
        await token.save();
    } catch (error) {
        res.status(INTERNAL_SERVER_ERROR);

        if (process.env.NODE_ENV === 'development') res.json(error);
    }

    const { password: pass, ...userDetails } = user.toJSON();

    return res.json({ access_token, refresh_token, user: userDetails });
});

router.get('/check-token', async function(req, res, next) {
    const { access_token, refresh_token } = req.query;

    if (!access_token || !refresh_token)
        return res
            .status(BAD_REQUEST)
            .json({ message: 'Access and refresh tokens must be provided' });

    jwt.verify(access_token, process.env.SECRET_KEY, async(err) => {
        if (!err && (await Token.findOne({ access_token })))
            res.json({ validity: 'valid' });
        else {
            try {
                const decodedRefreshToken = jwt.verify(
                    refresh_token,
                    process.env.SECRET_KEY,
                );

                if (!decodedRefreshToken)
                    return res.status(BAD_REQUEST).json({
                        validity: 'invalid',
                        message: 'access_token and refresh_token are invalid',
                    });

                const { userId } = decodedRefreshToken;
                const currentToken = await Token.findOne({
                    userId,
                    access_token,
                    refresh_token,
                });

                if (!currentToken)
                    return res.status(UNAUTHORIZED).json({
                        validity: 'invalid',
                        message: 'Invalid access or refresh token',
                    });

                const newAccessToken = jwt.sign({
                        id: userId,
                    },
                    process.env.SECRET_KEY, {
                        expiresIn: '3 hours',
                    },
                );

                const newRefreshToken = jwt.sign({
                        id: userId,
                    },
                    process.env.SECRET_KEY,
                );

                res.json({
                    validity: 'expired',
                    access_token: newAccessToken,
                    refresh_token: newRefreshToken,
                });
            } catch (error) {
                res.status(INTERNAL_SERVER_ERROR);

                if (process.env.NODE_ENV === 'development') res.json(error);
            }
        }
    });
});

module.exports = router;
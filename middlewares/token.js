const e = require('express');
const {
  UNAUTHORIZED,
  FORBIDDEN,
  INTERNAL_SERVER_ERROR,
} = require('http-status-codes');
const { User, Token } = require('../models');
const jwt = require('jsonwebtoken');

/**
 * Get header bearer
 * @param {string} headerValue The header value
 */
const extractBearerToken = (headerValue) => {
  if (typeof headerValue !== 'string') return false;

  const matches = headerValue.match(/(bearer)\s+(\S+)/i);
  return matches && matches[2];
};

/**
 * Middleware for checking if there is a valid access token provided
 * @param {e.Request} req The request
 * @param {e.Response} res The response
 * @param {e.NextFunction} next The next function
 */
const checkToken = (req, res, next) => {
  // Get the token
  const token =
    req.headers.authorization && extractBearerToken(req.headers.authorization);

  // Check if there is a token
  if (!token)
    return res
      .status(UNAUTHORIZED)
      .json({ message: 'No access token provided' });

  // Check if the provided token is valid
  jwt.verify(token, process.env.SECRET_KEY, (err) => {
    if (err) res.status(FORBIDDEN).json({ message: 'Invalid access token' });
    else return next();
  });
};

/**
 * Get user by provided token, i.e populate the Request.user attribute by the current user depending on the provided token (set to null if no token provided)
 * @param {e.Request} req The request
 * @param {e.Response} res The response
 * @param {e.NextFunction} next The next function
 */
const tokenAuthenticator = async (req, res, next) => {
  // Implicitly set user to null
  req.user = null;

  // Get token
  const token =
    req.headers.authorization && extractBearerToken(req.headers.authorization);

  if (!token) return next();

  try {
    const isValidToken = await Token.findOne({ access_token: token });
    if (!isValidToken) return next();
  } catch (_) {
    return res.status(INTERNAL_SERVER_ERROR);
  }

  jwt.verify(token, process.env.SECRET_KEY, async (err, decodedToken) => {
    if (err || !decodedToken) return next();

    const { id } = decodedToken;

    const user = (await User.findById(id)).toJSON();

    const { _id, ...rest } = user;

    req.user = { id: _id, ...rest };

    next();
  });
};

/**
 * Check if the client is authenticated if not block the request and send 403 error to client
 * Notice: Always use tokenAuthenticator middleware before this
 * @param {e.Request} req The request
 * @param {e.Response} res The response
 * @param {e.NextFunction} next The next function
 */
const authGuard = (req, res, next) => {
  const { user } = req;

  if (!user)
    return res.status(UNAUTHORIZED).json({
      message: 'Authentication required',
    });

  next();
};

/**
 * Check if the current user has admin priviliege, if not block the request and send 403 error to client
 * Notice: Always use tokenAuthenticator middleware before this
 * @param {e.Request} req The request
 * @param {e.Response} res The response
 * @param {e.NextFunction} next The next function
 */
const adminGuard = (req, res, next) => {
  const { user } = req;

  if (!user || !user.roles.contains('ROLE_ADMIN'))
    return res.status(FORBIDDEN).json({
      message: "You don't have enough permission to access this service",
    });

  next();
};

/**
 * Check if the current user has admin priviliege (super admin or restaurant admin), if not block the request and send 403 error to client
 * Notice: Always use tokenAuthenticator middleware before this
 * @param {e.Request} req The request
 * @param {e.Response} res The response
 * @param {e.NextFunction} next The next function
 */
const allAdminGuard = (req, res, next) => {
  const { user } = req;

  if (
    !user ||
    (!user.roles.contains('ROLE_ADMIN') &&
      !user.roles.contains('ROLE_RESTAURANT_ADMIN'))
  )
    return res.status(FORBIDDEN).json({
      message: "You don't have enough permission to access this service",
    });

  next();
};

module.exports = {
  checkToken,
  tokenAuthenticator,
  adminGuard,
  authGuard,
  allAdminGuard,
};

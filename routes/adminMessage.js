const express = require('express');
const {
  INTERNAL_SERVER_ERROR,
  NOT_FOUND,
  UNAUTHORIZED,
  OK,
} = require('http-status-codes');
const { AdminMessage } = require('../models');
const router = express.Router();
const { adminGuard, allAdminGuard } = require('../middlewares/token');
const { parse } = require('../utils/request');

router.post('/', adminGuard, async (req, res) => {
    try {
        const {message, target} = req.body;
        const adminMessage = new AdminMessage({
            message, 
            target,
            read: [],
        })

        await adminMessage.save({
            validateBeforeSave: true,
        })

        return res.json(adminMessage);
    } catch (e) {
        res.status(INTERNAL_SERVER_ERROR);

        if (process.env.NODE_ENV === 'development') {
          console.error(e);
          res.json(e);
        }
    }
});

router.get('/', allAdminGuard, async (req, res) => {
    try {
        let messages = await AdminMessage.find().populate('target');
        return res.json(messages);
    } catch (e) {
        res.status(INTERNAL_SERVER_ERROR);

        if (process.env.NODE_ENV === 'development') {
          console.error(e);
          res.json(e);
        }
    }
})

router.get('/:restoId', allAdminGuard, async (req, res) => {
    try {
        const {restoId} = req.params;
        const messages = await AdminMessage.find({
            '$or': [
                {target: restoId},
                // {read: {'$nin': [restoId]}},
                {target: {'$size': 0}}
            ]
        }).populate('target');
        if (messages.length === 0) {
            return res.status(NOT_FOUND).json({ message: 'Message not found' });
        }
        return res.json(messages);
    } catch (e) {
        res.status(INTERNAL_SERVER_ERROR);

        if (process.env.NODE_ENV === 'development') {
          console.error(e);
          res.json(e);
        }
    }
});

router.put('/:id', adminGuard, async (req, res) => {
    try {
        const {id} = req.params;
        await AdminMessage.updateOne({_id: id}, parse(req.body));
        return res.status(OK).json({ message: 'Update successfully' });
    } catch (e) {
        res.status(INTERNAL_SERVER_ERROR);

        if (process.env.NODE_ENV === 'development') {
          console.error(e);
          res.json(e);
        }
    }
});

router.put('/:id/:restoId/read', allAdminGuard, async (req, res) => {
    try {
        const {id, restoId} = req.params;
        const message = await AdminMessage.findById(id);

        message.read = [...message.read, restoId];
        message.save({
          validateBeforeSave: true,
        });
    
        res.json(message.toJSON());
    } catch (e) {
        res.status(INTERNAL_SERVER_ERROR);

        if (process.env.NODE_ENV === 'development') {
          console.error(e);
          res.json(e);
        }
    }
});

router.delete('/:id', adminGuard, async (req, res) => {
    try {
        const {id} = req.params;
        await AdminMessage.deleteOne({_id: id});
        return res.status(OK).json({ message: 'Deleted' });
    } catch (e) {
        res.status(INTERNAL_SERVER_ERROR);

        if (process.env.NODE_ENV === 'development') {
          console.error(e);
          res.json(e);
        }
    }
})

module.exports = router;
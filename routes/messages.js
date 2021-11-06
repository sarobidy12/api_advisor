const express = require('express');
const {
    INTERNAL_SERVER_ERROR,
    NOT_FOUND,
    UNAUTHORIZED,
    OK,
} = require('http-status-codes');
const { Message } = require('../models');
const router = express.Router();

router.get('/', async function(req, res) {

    const { offset, limit, filter } = req.query;

    try {

        const messageDocuments = Message.find(JSON.parse(filter));

        if (offset) messageDocuments.skip(offset);

        if (limit) messageDocuments.limit(limit);

        const messages = (await messageDocuments.populate('target')).map((e) =>
            e.toJSON(),
        );

        res.json(messages);
    } catch (error) {
        res.status(INTERNAL_SERVER_ERROR);

        if (process.env.NODE_ENV === 'development') {
            console.error(error);
            res.json(error);
        }
    }
});

router.get('/count', async function(req, res) {
    const { filter: filterString = '{}' } = req.query;

    const filter = JSON.parse(filterString);

    try {
        const count = await Message.find(filter).count();

        res.json({ count });
    } catch (error) {
        res.status(INTERNAL_SERVER_ERROR);

        if (process.env.NODE_ENV === 'development') {
            console.error(error);
            res.json(error);
        }
    }
});

router.get('/:id', async function(req, res) {
    const { id } = req.params;

    try {
        const message = await Message.findById(id).populate('target');
        if (!message)
            return res.status(NOT_FOUND).json({ message: 'Message not found' });

        res.json(message.toJSON());
    } catch (error) {
        res.status(INTERNAL_SERVER_ERROR);

        if (process.env.NODE_ENV === 'development') {
            console.error(error);
            res.json(error);
        }
    }
});

router.post('/', async function(req, res) {
    const { name, phoneNumber, email, message, target } = req.body;

    try {
        const newMessage = new Message({
            name,
            phoneNumber,
            email,
            message,
            target,
        });

        await newMessage.save({
            validateBeforeSave: true,
        });

        res.json(newMessage.toJSON());
    } catch (error) {
        res.status(INTERNAL_SERVER_ERROR);

        if (process.env.NODE_ENV === 'development') {
            console.error(error);
            res.json(error);
        }
    }
});

router.put('/:id/read', async function(req, res) {
    const { id } = req.params;

    try {
        const message = await Message.findById(id);

        if (message.target && message.target != String(req.user.id))
            return res
                .status(UNAUTHORIZED)
                .json({ message: 'Only receiver can set message status to read' });

        message.read = true;
        message.save({
            validateBeforeSave: true,
        });

        res.json(message.toJSON());
    } catch (error) {
        res.send(INTERNAL_SERVER_ERROR);

        if (process.env.NODE_ENV === 'development') {
            console.error(erorr);
            res.json(error);
        }
    }
});

router.delete('/:id', async function(req, res) {
    const { id } = req.params;

    try {
        const message = await Message.findById(id);

        if (!message)
            return res.status(NOT_FOUND).json({ message: 'Message not found' });

        await message.remove();
        res.json({ message: 'Message deleted successfully' });
    } catch (error) {
        res.status(INTERNAL_SERVER_ERROR);

        if (process.env.NODE_ENV === 'development') {
            console.error(error);
            res.json(error);
        }
    }
});

module.exports = router;
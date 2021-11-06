const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Post = new Schema({
    title: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    imageURL: {
        type: String,
        required: false,
    },
    imageWebURL: {
        type: String,
        required: false,
    },
    url: {
        type: String,
        required: false,
    },
    urlMobile: {
        type: String,
        required: false,
    },
    priority: {
        type: Number,
        default: 0,
    },
}, {
    timestamps: {
        createdAt: 'postedAt',
    },
}, );

module.exports = mongoose.model('Post', Post);
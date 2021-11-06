const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const hasCodePromo = new Schema({
    code: {
        type: String,
        default: '',
        required: true,
    },
    dateFin: {
        type: String,
        default: '',
        required: true,
    },
    addressIp: {
        type: String,
        default: '',
        required: true,
    },
    id_restaurant: {
        type: String,
        default: '',
        required: true,
    }
});

module.exports = mongoose.model('hasCodePromo', hasCodePromo);
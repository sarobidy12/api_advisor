const { Food, Restaurant, FoodType } = require('../models');

const getFoodId = async(id, lang) => {

    try {

        const food = await Food.findById(id)
            .populate('ratings')
            .populate('type')
            .populate('restaurant')
            .populate('attributes')
            .populate('allergene');

        if (!food) {
            return false;
        }

        const data = {...food }

        return JSON.stringify(data);

    } catch (error) {

        return null;

    }
}

module.exports = getFoodId;
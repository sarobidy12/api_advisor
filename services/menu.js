const { Menu, Food, Restaurant } = require('../models');

const getMenu = async(id, lang) => {

    try {

        const menu = await Menu.findById(id)
            .populate({
                path: 'restaurant',
                populate: 'category foodTypes',
            })
            .populate({
                path: 'foods.food',
                populate: 'type restaurant',
            });

        if (!menu) {
            return false;
        }

        return JSON.stringify(menu);

    } catch (error) {

        return null;

    }
}

module.exports = getMenu;
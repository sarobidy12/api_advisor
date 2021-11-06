const translatte = require('translatte');

const translate = async (text, options) => {
  const { text: result } = await translatte(text, options);
  return result;
};

module.exports = {
  translate,
};
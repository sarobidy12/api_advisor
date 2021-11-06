/**
 * Parse a valid JSON type
 * @param {*} data The data to be parsed. It can be of any valid JSON type
 */
const parse = (data) => {
  if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data);
      return parsed;
    } catch (err) {
      return data;
    }
  } else if (Array.isArray(data)) {
    return data.map((e) => parse(e));
  } else if (typeof data === 'object') {
    const value = {};
    data = Object.assign({}, data);
    for (const key in data) {
      if (data.hasOwnProperty(key)) value[key] = parse(data[key]);
    }
    return value;
  }
  return data;
};

module.exports = {
  parse,
};

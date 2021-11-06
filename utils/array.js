/**
 * Check if the array contains a given value
 * @param {*} value
 */
Array.prototype.contains = function (value) {
  if (Array.isArray(value))
    return this.findIndex((v) => value.contains(v)) >= 0;

  return this.findIndex((v) => v === value) >= 0;
};
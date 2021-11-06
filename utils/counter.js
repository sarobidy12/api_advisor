const { Counter } = require('../models');

/**
 * Get the current value for the given sequence name
 * @param {string} sequenceName The sequence name
 * @returns {Promise}
 */
const getCurrentSequenceValue = async (sequenceName) => {
  if (!(await Counter.findById(sequenceName))) {
    const sequenceDocument = await Counter.create({
      _id: sequenceName,
      value: 1,
    });

    return sequenceDocument.value;
  }

  const sequenceDocument = await Counter.findOne({
    _id: sequenceName,
  });

  return sequenceDocument.value;
};

const setCurrentSequenceValue = async (sequenceName, value) => {
  if (!(await Counter.findById(sequenceName))) {
    const sequenceDocument = await Counter.create({
      _id: sequenceName,
      value,
    });

    return sequenceDocument.value;
  }

  return (
    await Counter.findOneAndUpdate(
      { _id: sequenceName },
      { value },
      { new: true },
    )
  ).value;
};

/**
 * Reset the current value for the given sequence
 * @param {string} sequenceName The sequence name
 * @returns {Promise}
 */
const resetSequenceValue = async (sequenceName) => {
  if (!(await Counter.findById(sequenceName))) {
    const sequenceDocument = await Counter.create({
      _id: sequenceName,
      value: 1,
    });

    return sequenceDocument.value;
  }

  const sequenceDocument = await Counter.findOneAndUpdate(
    {
      _id: sequenceName,
    },
    {
      value: 0,
    },
    {
      new: true,
    },
  );

  return sequenceDocument.value;
};

/**
 * Get the next value for the given sequence name
 * @param {string} sequenceName The sequence name
 * @returns {Promise}
 */
const getNextSequenceValue = async (sequenceName) => {
  
  if (!(await Counter.findById(sequenceName))) {
    const sequenceDocument = await Counter.create({
      _id: sequenceName,
      value: 1,
    });

    return sequenceDocument.value;
  }

  const sequenceDocument = await Counter.findOneAndUpdate(
    {
      _id: sequenceName,
    },
    {
      $inc: { value: 1 },
    },
    {
      new: true,
    },
  );

  return sequenceDocument.value;
};

/**
 * Decrement counter value for a given sequence name
 * @param {string} sequenceName
 * @returns {Promise}
 */
const decrementSequenceValue = async (sequenceName) => {
  if (!(await Counter.findById(sequenceName))) {
    const sequenceDocument = await Counter.create({
      _id: sequenceName,
      value: 1,
    });

    return sequenceDocument.value;
  }

  const sequenceDocument = await Counter.findOneAndUpdate(
    { _id: sequenceName },
    { $inc: { value: -1 } },
    { new: true },
  );

  return sequenceDocument.value;
};

module.exports = {
  resetSequenceValue,
  setCurrentSequenceValue,
  getCurrentSequenceValue,
  getNextSequenceValue,
  decrementSequenceValue,
};
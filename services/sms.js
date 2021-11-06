const Nexmo = require('nexmo');

const nexmo = new Nexmo({
  apiKey: process.env.NEXMO_API_KEY,
  apiSecret: process.env.NEXMO_SECRET_KEY,
});

const sendMessage = function (from, to, text) {
  return new Promise((resolve, reject) => {
    nexmo.message.sendSms(
      from,
      to,
      text,
      {
        debug: process.env.NODE_ENV === 'development',
      },
      (err, data) => {
        if (err) reject(err);
        else resolve(data);
      },
    );
  });
};

module.exports = {
  sendMessage,
};

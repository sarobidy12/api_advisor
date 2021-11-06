const nodemailer = require('nodemailer');

/**
 * Send mails
 * @param {nodemailer.SendMailOptions} options Mail options
 */
const sendMail = function (options) {
  return new Promise((resolve, reject) => {
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_SERVER_URL,
      port: process.env.SMTP_SERVER_PORT,
      secure: true,
      auth: {
        user: process.env.EMAIL_ADDRESS,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    transport.sendMail(options, (error, info) => {
      if (error) reject(error);

      if (info) resolve(info);
    });
  });
};

module.exports = {
  sendMail,
};

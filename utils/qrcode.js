const qrcode = require('qrcode');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const { Document } = require('mongoose');
const querystring = require('querystring');

const CACHE_FOLDER = path.join(__dirname, '../var/cache');

/**
 *  Generate QR Code with logo at its center
 * @param {string} embedded_data
 * @param {string} logo_image_path
 * @param {object} qr_options
 * @param {'PNG' | 'Base64'} output_type
 * @param {string} saveas_file_name
 * @param {Function} callback
 * @returns {Promise}
 */
function generateQRWithLogo(
  embedded_data,
  logo_image_path,
  qr_options,
  output_type,
  saveas_file_name,
  callback,
) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(CACHE_FOLDER))
      fs.mkdirSync(CACHE_FOLDER, { recursive: true });

    let qr_image_path = path.join(
      CACHE_FOLDER,
      `qr_withou_logo_${Date.now()}.png`,
    );
    if (fs.existsSync(qr_image_path)) fs.unlinkSync(qr_image_path);

    let is_saveas_file_name_a_string = typeof saveas_file_name === 'string';

    if (qr_options.length == 0) {
      qr_options = { errorCorrectionLevel: 'H' };
    }

    generateQR(embedded_data, qr_options, function (err, b64) {
      if (err) return reject(err);

      saveAsPNG(b64, qr_image_path, function () {
        if (output_type == 'PNG') {
          addLogoToQRImage(
            qr_image_path,
            logo_image_path,
            'PNG',
            saveas_file_name,
            function () {
              fs.unlink(qr_image_path, function () {
                resolve();
                if (typeof callback === 'function') callback();
              });
            },
          );
        } else if (output_type == 'Base64') {
          addLogoToQRImage(
            qr_image_path,
            logo_image_path,
            'Base64',
            saveas_file_name,
            function (qrlogo_b64) {
              fs.unlink(qr_image_path, function () {
                resolve();
                if (typeof callback === 'function') callback(qrlogo_b64);
              });
            },
          );
        }
      });
    });
  });
}

/**
 *
 * @param {string} embedded_data
 * @param {object} options
 * @param {(error: any, data?: string) => void} callback
 */
function generateQR(embedded_data, options, callback) {
  if (typeof options === 'object') {
    try {
      qrcode.toDataURL(embedded_data, options, function (err, b64) {
        if (err) {
          return callback(err);
        }

        callback(null, b64);
      });
    } catch (err) {
      console.error(err);
      callback(err);
    }
  } else {
    try {
      qrcode.toDataURL(
        embedded_data,
        { errorCorrectionLevel: 'H' },
        function (err, b64) {
          if (err) {
            return callback(err);
          }

          callback(null, b64);
        },
      );
    } catch (err) {
      console.error(err);
      callback(err);
    }
  }
}

/**
 * Save qrcode image as PNG
 * @param {string} b64
 * @param {string} filename
 * @param {(filename: string) => void} callback file name that it was saved as is passed to the callback function
 */
function saveAsPNG(b64, filename, callback) {
  let base64Data = b64.replace(/^data:image\/png;base64,/, '');
  fs.writeFile(filename, base64Data, 'base64', function () {
    if (callback) {
      callback(filename);
    }
  });
}

/**
 * Add logo to QR code image
 * @param {string} qr_image_path
 * @param {string} logo_image_path
 * @param {'PNG' | 'Base64'} output_type
 * @param {string} saveas_file_name
 * @param {(data?: string) => void} callback
 */
async function addLogoToQRImage(
  qr_image_path,
  logo_image_path,
  output_type,
  saveas_file_name,
  callback,
) {
  if (output_type === 'Base64') {
    if (!callback) {
    } else {
      sharp(qr_image_path)
        .composite([{ input: logo_image_path, gravity: 'centre' }])
        .toBuffer((err, data, info) => {
          if (err) {
            console.log('Error Converting Image Buffer to Base 64: \n' + err);
          }

          if (data) {
            let base64data = Buffer.from(data, 'binary').toString('base64');
            callback(base64data);
          }
        });
    }
  } else if (output_type === 'PNG') {
    console.log('Output: PNG');
    console.log('SaveAs: ' + saveas_file_name);

    if (saveas_file_name) {
      try {
        await sharp(qr_image_path)
          .composite([{ input: logo_image_path, gravity: 'centre' }])
          .toFile(saveas_file_name);
      } catch (err) {
        console.log(
          "Error encountered when attempting to save QR with logo, check 'saveas_file_name' parameter",
        );
      } finally {
        callback();
      }
    } else {
      console.log(
        "Error: Unable to save QR with logo because 'saveas_file_name' is not defined",
      );
      callback();
      // throw error *****
    }
  }
}

/**
 * Generate restaurant qrcodes
 * Overwrite if exist
 * @param {Document} restaurant
 */
async function generateRestaurantQrCode(restaurant) {
  const pathname = path.join(
      __dirname,
      `../public/restaurants/${restaurant._id}/qrcode.png`,
    ),
    pricelessPathname = path.join(
      __dirname,
      `../public/restaurants/${restaurant._id}/qrcode-priceless.png`,
    ),
    url = `${process.env.FRONT_HOST_NAME}/restaurants/${restaurant._id}`,
    pricelessUrl = `${process.env.FRONT_HOST_NAME}/restaurants/${restaurant._id}?option=priceless`;

  if (fs.existsSync(pathname)) fs.unlinkSync(pathname);

  if (fs.existsSync(pricelessPathname)) fs.unlinkSync(pricelessPathname);

  if (!fs.existsSync(path.dirname(pathname))) {
    fs.mkdirSync(path.dirname(pathname), {
      recursive: true,
    });
  }

  await generateQRWithLogo(
    url,
    path.join(__dirname, '../assets/logo.png'),
    {
      errorCorrectionLevel: 'H',
      rendererOpts: { quality: 1, width: 1000 },
    },
    'PNG',
    pathname,
  );

  restaurant.qrcodeLink = `${process.env.HOST_NAME}/restaurants/${restaurant._id}/qrcode.png`;

  await generateQRWithLogo(
    pricelessUrl,
    path.join(__dirname, '../assets/logo.png'),
    {
      errorCorrectionLevel: 'H',
      rendererOpts: { quality: 1, width: 1000 },
    },
    'PNG',
    pricelessPathname,
  );

  restaurant.qrcodePricelessLink = `${process.env.HOST_NAME}/restaurants/${restaurant._id}/qrcode-priceless.png`;
}

/**
 * Generate custom QR code
 * @param {string} restaurantId Restaurant's id
 * @param {{ priceless?: boolean; language?: boolean }} options Options
 */
async function generateCustomQRCode(
  restaurantId,
  options = {
    priceless: false,
    language: 'fr',
    multipleLanguage: []
  },
) {
  const pathname = path.join(CACHE_FOLDER, `${Date.now()}-temp.png`),
    url = `${process.env.FRONT_HOST_NAME}/restaurants/${restaurantId}?${
      options.priceless ? 'option=priceless&' : ''
    }${querystring.stringify({
      language: options.language,
    })}&${
      `multiple: ${options.multipleLanguage}`
    }`;

  await generateQRWithLogo(
    url,
    path.join(__dirname, '../assets/logo.png'),
    {
      errorCorrectionLevel: 'H',
      rendererOpts: { quality: 1, width: 1000 },
    },
    'PNG',
    pathname,
  );

  return pathname;
}

module.exports = {
  generateCustomQRCode,
  generateRestaurantQrCode,
};

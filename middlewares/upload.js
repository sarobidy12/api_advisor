const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
  destination: function (req, res, cb) {
    const pathname = path.join(__dirname, `../public/uploads${req.baseUrl}`);

    if (!fs.existsSync(pathname))
      fs.mkdirSync(pathname, {
        recursive: true,
      });

    cb(null, pathname);
  },
  filename: function (req, file, cb) {
    cb(
      null,
      `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`,
    );
  },
});

const upload = multer({ storage });

module.exports = {
  upload,
};
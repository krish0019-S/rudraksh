var multer = require("multer");

var MAX_SIZE = 5 * 1024 * 1024;
var allowedMimes = ["image/jpeg", "image/jpg", "image/png"];

var storage = multer.memoryStorage();

var upload = multer({
    storage: storage,
    limits: { fileSize: MAX_SIZE },
    fileFilter: function (req, file, cb) {
        if (allowedMimes.includes(file.mimetype)) {
            return cb(null, true);
        }
        return cb(new Error("Only JPG/PNG images are allowed."));
    },
});

module.exports = {
    upload,
    MAX_SIZE,
};

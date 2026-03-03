var fs = require("fs");
var path = require("path");

var UPLOADS_DIR = path.join(__dirname, "..", "Public", "uploads");
var VALID_EXTS = [".jpg", ".jpeg", ".png"];
var MIME_TO_EXT = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
};
var BANNER_NAME_REGEX = /^banner([1-9][0-9]*)$/;
var PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

var normalizeBannerName = function (name) {
    return String(name || "").trim().toLowerCase();
};

var getBannerIndex = function (name) {
    var normalized = normalizeBannerName(name);
    var match = BANNER_NAME_REGEX.exec(normalized);
    if (!match) {
        return null;
    }
    return Number(match[1]);
};

var isValidBannerName = function (name) {
    return getBannerIndex(name) !== null;
};

var ensureUploadsDir = async function () {
    await fs.promises.mkdir(UPLOADS_DIR, { recursive: true });
};

var extPriority = function (ext) {
    var normalized = String(ext || "").toLowerCase();
    if (normalized === ".jpg") {
        return 0;
    }
    if (normalized === ".jpeg") {
        return 1;
    }
    if (normalized === ".png") {
        return 2;
    }
    return 99;
};

var fileExists = async function (targetPath) {
    try {
        await fs.promises.access(targetPath);
        return true;
    } catch (error) {
        if (error.code === "ENOENT") {
            return false;
        }
        throw error;
    }
};

var getPngDimensions = function (buffer) {
    if (!buffer || buffer.length < 24) {
        throw new Error("Invalid image file.");
    }

    if (!buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
        throw new Error("Invalid image file.");
    }

    if (buffer.toString("ascii", 12, 16) !== "IHDR") {
        throw new Error("Invalid image file.");
    }

    return {
        width: buffer.readUInt32BE(16),
        height: buffer.readUInt32BE(20),
    };
};

var getJpegDimensions = function (buffer) {
    if (!buffer || buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) {
        throw new Error("Invalid image file.");
    }

    var offset = 2;
    while (offset < buffer.length) {
        if (buffer[offset] !== 0xff) {
            offset += 1;
            continue;
        }

        while (buffer[offset] === 0xff && offset < buffer.length) {
            offset += 1;
        }

        if (offset >= buffer.length) {
            break;
        }

        var marker = buffer[offset];
        offset += 1;

        if (marker === 0xd9 || marker === 0xda) {
            break;
        }

        if (offset + 1 >= buffer.length) {
            break;
        }

        var segmentLength = buffer.readUInt16BE(offset);
        if (segmentLength < 2 || offset + segmentLength > buffer.length) {
            throw new Error("Invalid image file.");
        }

        var isStartOfFrame =
            (marker >= 0xc0 && marker <= 0xc3) ||
            (marker >= 0xc5 && marker <= 0xc7) ||
            (marker >= 0xc9 && marker <= 0xcb) ||
            (marker >= 0xcd && marker <= 0xcf);

        if (isStartOfFrame) {
            if (offset + 7 >= buffer.length) {
                throw new Error("Invalid image file.");
            }

            return {
                height: buffer.readUInt16BE(offset + 3),
                width: buffer.readUInt16BE(offset + 5),
            };
        }

        offset += segmentLength;
    }

    throw new Error("Invalid image file.");
};

var getImageDimensions = function (buffer, mimeType) {
    var normalizedMime = String(mimeType || "").toLowerCase();
    if (normalizedMime === "image/png") {
        return getPngDimensions(buffer);
    }
    if (normalizedMime === "image/jpeg" || normalizedMime === "image/jpg") {
        return getJpegDimensions(buffer);
    }
    throw new Error("Only JPG/PNG images are allowed.");
};

var listCarouselBanners = async function () {
    await ensureUploadsDir();
    var entries = await fs.promises.readdir(UPLOADS_DIR, { withFileTypes: true });
    var bestByBanner = new Map();

    entries.forEach(function (entry) {
        if (!entry.isFile()) {
            return;
        }

        var ext = path.extname(entry.name).toLowerCase();
        if (!VALID_EXTS.includes(ext)) {
            return;
        }

        var baseName = normalizeBannerName(path.basename(entry.name, ext));
        if (!isValidBannerName(baseName)) {
            return;
        }

        var current = bestByBanner.get(baseName);
        if (!current || extPriority(ext) < extPriority(current.ext)) {
            bestByBanner.set(baseName, { name: baseName, ext: ext });
        }
    });

    return Array.from(bestByBanner.values())
        .sort(function (a, b) {
            return getBannerIndex(a.name) - getBannerIndex(b.name);
        })
        .map(function (item) {
            return {
                name: item.name,
                path: "/uploads/" + item.name,
            };
        });
};

var getNextBannerName = async function () {
    var banners = await listCarouselBanners();
    var maxIndex = 0;

    banners.forEach(function (banner) {
        var index = getBannerIndex(banner.name);
        if (index && index > maxIndex) {
            maxIndex = index;
        }
    });

    return "banner" + String(maxIndex + 1);
};

var saveBannerFile = async function (bannerName, file) {
    var normalizedName = normalizeBannerName(bannerName);
    if (!isValidBannerName(normalizedName)) {
        throw new Error("Invalid banner name.");
    }

    if (!file || !file.buffer) {
        throw new Error("No file uploaded.");
    }

    var ext = MIME_TO_EXT[String(file.mimetype || "").toLowerCase()];
    if (!ext) {
        throw new Error("Only JPG/PNG images are allowed.");
    }

    // Validate that uploaded binary is a real JPG/PNG image.
    getImageDimensions(file.buffer, file.mimetype);

    await ensureUploadsDir();

    var finalPath = path.join(UPLOADS_DIR, normalizedName + ext);
    var tempPath = path.join(UPLOADS_DIR, normalizedName + ".tmp");

    await fs.promises.writeFile(tempPath, file.buffer);
    try {
        await fs.promises.unlink(finalPath);
    } catch (error) {
        if (error.code !== "ENOENT") {
            throw error;
        }
    }
    await fs.promises.rename(tempPath, finalPath);

    await Promise.all(
        VALID_EXTS.map(async function (otherExt) {
            var otherPath = path.join(UPLOADS_DIR, normalizedName + otherExt);
            if (otherPath === finalPath) {
                return;
            }
            try {
                await fs.promises.unlink(otherPath);
            } catch (error) {
                if (error.code !== "ENOENT") {
                    throw error;
                }
            }
        })
    );

    return {
        name: normalizedName,
        path: "/uploads/" + normalizedName,
    };
};

var removeBannerFile = async function (bannerName) {
    var normalizedName = normalizeBannerName(bannerName);
    if (!isValidBannerName(normalizedName)) {
        throw new Error("Invalid banner name.");
    }

    await ensureUploadsDir();
    var removed = false;

    for (var i = 0; i < VALID_EXTS.length; i += 1) {
        var targetPath = path.join(UPLOADS_DIR, normalizedName + VALID_EXTS[i]);
        try {
            await fs.promises.unlink(targetPath);
            removed = true;
        } catch (error) {
            if (error.code !== "ENOENT") {
                throw error;
            }
        }
    }

    return removed;
};

var reorderBannerSequence = async function (bannerName, targetSequence) {
    var normalizedName = normalizeBannerName(bannerName);
    if (!isValidBannerName(normalizedName)) {
        throw new Error("Invalid banner name.");
    }

    var sequence = Number(targetSequence);
    if (!Number.isInteger(sequence)) {
        throw new Error("Invalid sequence.");
    }

    var banners = await listCarouselBanners();
    var names = banners.map(function (item) {
        return item.name;
    });
    var currentIndex = names.indexOf(normalizedName);

    if (currentIndex === -1) {
        throw new Error("Banner not found.");
    }
    if (sequence < 1 || sequence > names.length) {
        throw new Error("Invalid sequence.");
    }
    if (currentIndex === sequence - 1) {
        return banners;
    }

    var moving = names.splice(currentIndex, 1)[0];
    names.splice(sequence - 1, 0, moving);

    await ensureUploadsDir();

    var renamePlan = [];
    for (var i = 0; i < names.length; i += 1) {
        var oldName = names[i];
        var newName = "banner" + String(i + 1);
        if (oldName === newName) {
            continue;
        }

        for (var j = 0; j < VALID_EXTS.length; j += 1) {
            var ext = VALID_EXTS[j];
            var oldPath = path.join(UPLOADS_DIR, oldName + ext);
            var exists = await fileExists(oldPath);
            if (!exists) {
                continue;
            }

            renamePlan.push({
                oldPath: oldPath,
                newPath: path.join(UPLOADS_DIR, newName + ext),
            });
        }
    }

    if (!renamePlan.length) {
        return listCarouselBanners();
    }

    var seed = Date.now().toString() + "-" + Math.random().toString(36).slice(2, 8);
    var staged = [];

    for (var k = 0; k < renamePlan.length; k += 1) {
        var step = renamePlan[k];
        var tempPath = step.oldPath + ".reorder-" + seed + "-" + String(k);
        await fs.promises.rename(step.oldPath, tempPath);
        staged.push({
            oldPath: step.oldPath,
            newPath: step.newPath,
            tempPath: tempPath,
        });
    }

    for (var m = 0; m < staged.length; m += 1) {
        var move = staged[m];
        await fs.promises.rename(move.tempPath, move.newPath);
    }

    return listCarouselBanners();
};

module.exports = {
    getNextBannerName,
    isValidBannerName,
    listCarouselBanners,
    normalizeBannerName,
    reorderBannerSequence,
    removeBannerFile,
    saveBannerFile,
};

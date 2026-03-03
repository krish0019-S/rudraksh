var express = require("express");
var fs = require("fs");
var path = require("path");
var jwt = require("jsonwebtoken");
var nodemailer = require("nodemailer");
var multer = require("multer");
var { upload } = require("../middleware/upload");
var adminAuth = require("../middleware/adminAuth");
var db = require("../config/db");
var carouselBanners = require("../utils/carouselBanners");
var enquiries = require("../utils/enquiries");
var newsItems = require("../utils/newsItems");

var router = express.Router();

var JWT_SECRET = process.env.JWT_SECRET || "change_this_secret";
var ADMIN_TOKEN_EXPIRES_SECONDS = 30 * 60;
var resetStore = new Map();
var GALLERY_IMAGE_ROOT_DIR = path.join(__dirname, "..", "Public", "images", "gallery");
var GALLERY_FOLDER_ORDER_FILE = path.join(__dirname, "..", "data", "gallery-folder-order.json");
var VIDEO_GALLERY_ROOT_DIR = path.join(__dirname, "..", "Public", "videos", "gallery");
var VIDEO_FOLDER_ORDER_FILE = path.join(__dirname, "..", "data", "video-folder-order.json");
var GALLERY_FOLDER_REGEX = /^[a-z0-9][a-z0-9_-]{0,39}$/i;
var GALLERY_FILE_REGEX = /^[a-z0-9._-]+$/i;
var GALLERY_ALLOWED_EXTS = [".jpg", ".jpeg", ".png"];
var MIME_TO_EXT = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
};
var VIDEO_ALLOWED_EXTS = [".mp4", ".webm", ".ogg", ".mov", ".m4v"];
var VIDEO_MIME_TO_EXT = {
    "video/mp4": ".mp4",
    "video/webm": ".webm",
    "video/ogg": ".ogg",
    "video/quicktime": ".mov",
    "video/x-m4v": ".m4v",
};
var MAX_VIDEO_SIZE = 100 * 1024 * 1024;
var videoUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_VIDEO_SIZE },
    fileFilter: function (req, file, cb) {
        if (VIDEO_MIME_TO_EXT[String(file && file.mimetype || "").toLowerCase()]) {
            return cb(null, true);
        }
        return cb(new Error("Only MP4/WEBM/OGG/MOV videos are allowed."));
    },
});

var isValidEmail = function (email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

var normalizeEmail = function (email) {
    return String(email || "").trim().toLowerCase();
};

var getRequestBody = function (req) {
    if (req && typeof req.body === "object" && req.body !== null) {
        return req.body;
    }
    return {};
};

var getRequestValue = function (req, key) {
    var body = getRequestBody(req);
    if (body[key] != null) {
        return body[key];
    }
    return "";
};

var isUploadValidationError = function (message) {
    return (
        message === "Invalid banner name." ||
        message === "Only JPG/PNG images are allowed." ||
        message === "Invalid image file."
    );
};

var normalizeFolderName = function (name) {
    var raw = String(name || "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, "-")
        .replace(/^-+|-+$/g, "");
    if (!raw || !GALLERY_FOLDER_REGEX.test(raw)) {
        return "";
    }
    return raw;
};

var getFolderNameFromReq = function (req) {
    var body = getRequestBody(req);
    var raw = "";

    if (req && req.query && typeof req.query === "object" && req.query.folder != null) {
        raw = req.query.folder;
    } else if (body.folder != null) {
        raw = body.folder;
    }

    return normalizeFolderName(raw);
};

var sanitizeImageBaseName = function (name) {
    var value = String(name || "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, "-")
        .replace(/^-+|-+$/g, "");

    if (!value) {
        return "image";
    }

    return value.slice(0, 60);
};

var ensureGalleryRootDir = async function () {
    await fs.promises.mkdir(GALLERY_IMAGE_ROOT_DIR, { recursive: true });
};

var getGalleryFolderDir = function (folderName) {
    var normalized = normalizeFolderName(folderName);
    if (!normalized) {
        return null;
    }

    var rootDir = path.resolve(GALLERY_IMAGE_ROOT_DIR);
    var folderDir = path.resolve(GALLERY_IMAGE_ROOT_DIR, normalized);
    if (!folderDir.startsWith(rootDir + path.sep) && folderDir !== rootDir) {
        return null;
    }

    return folderDir;
};

var ensureGalleryFolderDir = async function (folderName) {
    var folderDir = getGalleryFolderDir(folderName);
    if (!folderDir) {
        throw new Error("Invalid folder name.");
    }

    await ensureGalleryRootDir();
    await fs.promises.mkdir(folderDir, { recursive: true });
    return folderDir;
};

var listGalleryFolders = async function () {
    await ensureGalleryRootDir();
    var entries = await fs.promises.readdir(GALLERY_IMAGE_ROOT_DIR, { withFileTypes: true });

    return entries
        .filter(function (entry) {
            return entry.isDirectory() && GALLERY_FOLDER_REGEX.test(entry.name);
        })
        .map(function (entry) {
            return String(entry.name).toLowerCase();
        })
        .sort();
};

var readGalleryFolderOrder = async function () {
    try {
        var raw = await fs.promises.readFile(GALLERY_FOLDER_ORDER_FILE, "utf8");
        var parsed = JSON.parse(raw);
        var list = Array.isArray(parsed) ? parsed : (Array.isArray(parsed && parsed.order) ? parsed.order : []);
        var seen = new Set();
        var normalized = [];

        list.forEach(function (name) {
            var folderName = normalizeFolderName(name);
            if (folderName && !seen.has(folderName)) {
                seen.add(folderName);
                normalized.push(folderName);
            }
        });

        return normalized;
    } catch (error) {
        if (error && error.code === "ENOENT") {
            return [];
        }
        console.error(error);
        return [];
    }
};

var writeGalleryFolderOrder = async function (order) {
    var source = Array.isArray(order) ? order : [];
    var seen = new Set();
    var normalized = [];

    source.forEach(function (name) {
        var folderName = normalizeFolderName(name);
        if (folderName && !seen.has(folderName)) {
            seen.add(folderName);
            normalized.push(folderName);
        }
    });

    await fs.promises.mkdir(path.dirname(GALLERY_FOLDER_ORDER_FILE), { recursive: true });
    await fs.promises.writeFile(
        GALLERY_FOLDER_ORDER_FILE,
        JSON.stringify({ order: normalized }, null, 2),
        "utf8"
    );
    return normalized;
};

var syncGalleryFolderOrder = async function (folders) {
    var physicalFolders = Array.isArray(folders) ? folders.slice() : [];
    var currentOrder = await readGalleryFolderOrder();
    var physicalSet = new Set(physicalFolders);
    var merged = [];

    currentOrder.forEach(function (name) {
        if (physicalSet.has(name)) {
            merged.push(name);
            physicalSet.delete(name);
        }
    });

    physicalFolders.forEach(function (name) {
        if (physicalSet.has(name)) {
            merged.push(name);
            physicalSet.delete(name);
        }
    });

    var changed =
        merged.length !== currentOrder.length ||
        merged.some(function (name, index) {
            return currentOrder[index] !== name;
        });

    if (changed) {
        await writeGalleryFolderOrder(merged);
    }

    return merged;
};

var listGalleryFoldersOrdered = async function () {
    var folders = await listGalleryFolders();
    return syncGalleryFolderOrder(folders);
};

var reorderGalleryFolderSequence = async function (folderName, targetSequence) {
    var normalizedName = normalizeFolderName(folderName);
    if (!normalizedName) {
        throw new Error("Invalid folder name.");
    }
    if (!Number.isInteger(targetSequence) || targetSequence < 1) {
        throw new Error("Invalid sequence.");
    }

    var physicalFolders = await listGalleryFolders();
    if (!physicalFolders.includes(normalizedName)) {
        throw new Error("Folder not found.");
    }

    var orderedFolders = await syncGalleryFolderOrder(physicalFolders);
    var currentIndex = orderedFolders.indexOf(normalizedName);
    if (currentIndex === -1) {
        throw new Error("Folder not found.");
    }

    var clampedIndex = Math.max(0, Math.min(targetSequence - 1, orderedFolders.length - 1));
    if (currentIndex !== clampedIndex) {
        orderedFolders.splice(currentIndex, 1);
        orderedFolders.splice(clampedIndex, 0, normalizedName);
        await writeGalleryFolderOrder(orderedFolders);
    }

    return orderedFolders;
};

var listGalleryImages = async function (folderName) {
    var normalizedFolder = normalizeFolderName(folderName);
    if (!normalizedFolder) {
        throw new Error("Invalid folder name.");
    }

    var folderDir = getGalleryFolderDir(normalizedFolder);
    if (!folderDir) {
        throw new Error("Invalid folder name.");
    }

    await ensureGalleryRootDir();

    var stats;
    try {
        stats = await fs.promises.stat(folderDir);
    } catch (error) {
        if (error && error.code === "ENOENT") {
            throw new Error("Folder not found.");
        }
        throw error;
    }

    if (!stats.isDirectory()) {
        throw new Error("Folder not found.");
    }

    var entries = await fs.promises.readdir(folderDir, { withFileTypes: true });

    var files = entries
        .filter(function (entry) {
            if (!entry.isFile()) {
                return false;
            }
            var ext = path.extname(entry.name).toLowerCase();
            return GALLERY_FILE_REGEX.test(entry.name) && GALLERY_ALLOWED_EXTS.includes(ext);
        })
        .map(function (entry) {
            return entry.name;
        });

    var details = await Promise.all(
        files.map(async function (fileName) {
            var filePath = path.join(folderDir, fileName);
            var stat = await fs.promises.stat(filePath);
            return {
                name: fileName,
                folder: normalizedFolder,
                path: "/images/gallery/" + normalizedFolder + "/" + fileName,
                size: stat.size,
                createdAt: stat.birthtime || stat.mtime,
            };
        })
    );

    return details.sort(function (a, b) {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
};

var buildGalleryFolderCards = async function (onlyWithImages) {
    var folders = await listGalleryFoldersOrdered();

    var cards = await Promise.all(
        folders.map(async function (folder) {
            var images = await listGalleryImages(folder);
            var coverImage = images.length ? images[images.length - 1] : null;
            return {
                name: folder,
                imageCount: images.length,
                coverPath: coverImage ? coverImage.path : "",
            };
        })
    );

    var filtered = cards;
    if (onlyWithImages) {
        filtered = cards.filter(function (item) {
            return item.imageCount > 0;
        });
    }

    return filtered;
};

var ensureVideoGalleryRootDir = async function () {
    await fs.promises.mkdir(VIDEO_GALLERY_ROOT_DIR, { recursive: true });
};

var getVideoGalleryFolderDir = function (folderName) {
    var normalized = normalizeFolderName(folderName);
    if (!normalized) {
        return null;
    }

    var rootDir = path.resolve(VIDEO_GALLERY_ROOT_DIR);
    var folderDir = path.resolve(VIDEO_GALLERY_ROOT_DIR, normalized);
    if (!folderDir.startsWith(rootDir + path.sep) && folderDir !== rootDir) {
        return null;
    }

    return folderDir;
};

var ensureVideoGalleryFolderDir = async function (folderName) {
    var folderDir = getVideoGalleryFolderDir(folderName);
    if (!folderDir) {
        throw new Error("Invalid folder name.");
    }

    await ensureVideoGalleryRootDir();
    await fs.promises.mkdir(folderDir, { recursive: true });
    return folderDir;
};

var listVideoGalleryFolders = async function () {
    await ensureVideoGalleryRootDir();
    var entries = await fs.promises.readdir(VIDEO_GALLERY_ROOT_DIR, { withFileTypes: true });

    return entries
        .filter(function (entry) {
            return entry.isDirectory() && GALLERY_FOLDER_REGEX.test(entry.name);
        })
        .map(function (entry) {
            return String(entry.name).toLowerCase();
        })
        .sort();
};

var readVideoFolderOrder = async function () {
    try {
        var raw = await fs.promises.readFile(VIDEO_FOLDER_ORDER_FILE, "utf8");
        var parsed = JSON.parse(raw);
        var list = Array.isArray(parsed) ? parsed : (Array.isArray(parsed && parsed.order) ? parsed.order : []);
        var seen = new Set();
        var normalized = [];

        list.forEach(function (name) {
            var folderName = normalizeFolderName(name);
            if (folderName && !seen.has(folderName)) {
                seen.add(folderName);
                normalized.push(folderName);
            }
        });

        return normalized;
    } catch (error) {
        if (error && error.code === "ENOENT") {
            return [];
        }
        console.error(error);
        return [];
    }
};

var writeVideoFolderOrder = async function (order) {
    var source = Array.isArray(order) ? order : [];
    var seen = new Set();
    var normalized = [];

    source.forEach(function (name) {
        var folderName = normalizeFolderName(name);
        if (folderName && !seen.has(folderName)) {
            seen.add(folderName);
            normalized.push(folderName);
        }
    });

    await fs.promises.mkdir(path.dirname(VIDEO_FOLDER_ORDER_FILE), { recursive: true });
    await fs.promises.writeFile(
        VIDEO_FOLDER_ORDER_FILE,
        JSON.stringify({ order: normalized }, null, 2),
        "utf8"
    );
    return normalized;
};

var syncVideoFolderOrder = async function (folders) {
    var physicalFolders = Array.isArray(folders) ? folders.slice() : [];
    var currentOrder = await readVideoFolderOrder();
    var physicalSet = new Set(physicalFolders);
    var merged = [];

    currentOrder.forEach(function (name) {
        if (physicalSet.has(name)) {
            merged.push(name);
            physicalSet.delete(name);
        }
    });

    Array.from(physicalSet)
        .sort()
        .forEach(function (name) {
            merged.push(name);
        });

    var changed =
        merged.length !== currentOrder.length ||
        merged.some(function (name, index) {
            return currentOrder[index] !== name;
        });

    if (changed) {
        await writeVideoFolderOrder(merged);
    }

    return merged;
};

var listVideoGalleryFoldersOrdered = async function () {
    var folders = await listVideoGalleryFolders();
    return syncVideoFolderOrder(folders);
};

var reorderVideoFolderSequence = async function (folderName, targetSequence) {
    var normalizedName = normalizeFolderName(folderName);
    if (!normalizedName) {
        throw new Error("Invalid folder name.");
    }
    if (!Number.isInteger(targetSequence) || targetSequence < 1) {
        throw new Error("Invalid sequence.");
    }

    var physicalFolders = await listVideoGalleryFolders();
    if (!physicalFolders.includes(normalizedName)) {
        throw new Error("Folder not found.");
    }

    var orderedFolders = await syncVideoFolderOrder(physicalFolders);
    var currentIndex = orderedFolders.indexOf(normalizedName);
    if (currentIndex === -1) {
        throw new Error("Folder not found.");
    }

    var clampedIndex = Math.max(0, Math.min(targetSequence - 1, orderedFolders.length - 1));
    if (currentIndex !== clampedIndex) {
        orderedFolders.splice(currentIndex, 1);
        orderedFolders.splice(clampedIndex, 0, normalizedName);
        await writeVideoFolderOrder(orderedFolders);
    }

    return orderedFolders;
};

var listVideoGalleryFiles = async function (folderName) {
    var normalizedFolder = normalizeFolderName(folderName);
    if (!normalizedFolder) {
        throw new Error("Invalid folder name.");
    }

    var folderDir = getVideoGalleryFolderDir(normalizedFolder);
    if (!folderDir) {
        throw new Error("Invalid folder name.");
    }

    await ensureVideoGalleryRootDir();

    var stats;
    try {
        stats = await fs.promises.stat(folderDir);
    } catch (error) {
        if (error && error.code === "ENOENT") {
            throw new Error("Folder not found.");
        }
        throw error;
    }

    if (!stats.isDirectory()) {
        throw new Error("Folder not found.");
    }

    var entries = await fs.promises.readdir(folderDir, { withFileTypes: true });

    var files = entries
        .filter(function (entry) {
            if (!entry.isFile()) {
                return false;
            }
            var ext = path.extname(entry.name).toLowerCase();
            return GALLERY_FILE_REGEX.test(entry.name) && VIDEO_ALLOWED_EXTS.includes(ext);
        })
        .map(function (entry) {
            return entry.name;
        });

    var details = await Promise.all(
        files.map(async function (fileName) {
            var filePath = path.join(folderDir, fileName);
            var stat = await fs.promises.stat(filePath);
            return {
                name: fileName,
                folder: normalizedFolder,
                path: "/videos/gallery/" + normalizedFolder + "/" + fileName,
                size: stat.size,
                createdAt: stat.birthtime || stat.mtime,
            };
        })
    );

    return details.sort(function (a, b) {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
};

var buildVideoFolderCards = async function (onlyWithVideos) {
    var folders = await listVideoGalleryFoldersOrdered();

    var cards = await Promise.all(
        folders.map(async function (folder) {
            var videos = await listVideoGalleryFiles(folder);
            var coverVideo = videos.length ? videos[videos.length - 1] : null;
            return {
                name: folder,
                videoCount: videos.length,
                coverPath: coverVideo ? coverVideo.path : "",
            };
        })
    );

    var filtered = cards;
    if (onlyWithVideos) {
        filtered = cards.filter(function (item) {
            return item.videoCount > 0;
        });
    }

    return filtered;
};

const transporter = nodemailer.createTransport({
   service: 'gmail',
   auth: {
      user: 'krishtanwar153@gmail.com',
      pass: 'ukua hfny wbxy orsr'
   }
});

function sendVerificationEmail(email, verificationCode) {
   const mailOptions = {
      from: transporter.options.auth.user,
      to: email,
      subject: 'Rudraksh Creation - Admin Reset Code',
      html: `
         <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border-radius: 16px; overflow: hidden; border: 1px solid #f2dede;">
            <div style="background: linear-gradient(135deg, #b31217, #f39b1d); color: white; padding: 20px; text-align: center;">
               <img src="https://i.ibb.co/1fM9j4b/Rfavicon.png" alt="Rudraksh Creation" style="height: 42px; margin-bottom: 10px;">
               <h1 style="margin: 0; font-size: 22px;">Rudraksh Creation</h1>
               <p style="margin: 6px 0 0; font-size: 13px; opacity: 0.9;">Admin Portal Verification</p>
            </div>
            <div style="padding: 22px; background: #fff8f6;">
               <h2 style="color: #b31217; margin-top: 0;">Email Verification</h2>
               <p>Welcome back to Rudraksh Creation admin portal.</p>
               <p>Your verification code is:</p>
               <div style="background: #b31217; color: white; padding: 14px; text-align: center; font-size: 26px; font-weight: bold; margin: 18px 0; border-radius: 10px; letter-spacing: 3px;">
                  ${verificationCode}
               </div>
               <p>Please enter this code to verify your email address.</p>
               <p>If you didn't request this, please ignore this email.</p>
            </div>
            <div style="background: #1b0f0c; color: #f6efe9; padding: 12px; text-align: center; font-size: 12px;">
               &copy; 2026 Rudraksh Creation. All rights reserved.
            </div>
         </div>
      `
   };

   return transporter.sendMail(mailOptions);
}

router.get("/", function (req, res) {
    var filePath = path.join(__dirname, "..", "Public", "admin", "index.html");
    res.sendFile(filePath);
});

router.get("/news-items-public", async function (req, res) {
    try {
        var state = await newsItems.getNewsState();
        return res.json({
            ok: true,
            items: state.items,
            paused: state.paused,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ ok: false, message: "Unable to load news items." });
    }
});

router.get("/news-items", adminAuth, async function (req, res) {
    try {
        var state = await newsItems.getNewsState();
        return res.json({
            ok: true,
            items: state.items,
            paused: state.paused,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ ok: false, message: "Unable to load news items." });
    }
});

router.post("/news-items", adminAuth, async function (req, res) {
    try {
        var item = await newsItems.createNewsItem({
            title: getRequestValue(req, "title"),
            content: getRequestValue(req, "content"),
            contentLink: getRequestValue(req, "contentLink"),
            imageUrl: getRequestValue(req, "imageUrl"),
        });
        var list = await newsItems.listNewsItems();
        var paused = await newsItems.isNewsPaused();
        return res.json({
            ok: true,
            message: "News item added successfully.",
            item: item,
            items: list,
            paused: paused,
        });
    } catch (error) {
        if (error && error.statusCode === 400) {
            return res.status(400).json({ ok: false, message: error.message });
        }
        console.error(error);
        return res.status(500).json({ ok: false, message: "Unable to add news item." });
    }
});

router.put("/news-scroll-state", adminAuth, async function (req, res) {
    try {
        var rawPaused = getRequestValue(req, "paused");
        var nextPaused = rawPaused === true || rawPaused === "true" || rawPaused === 1 || rawPaused === "1";
        var paused = await newsItems.setNewsPaused(nextPaused);
        return res.json({
            ok: true,
            message: paused ? "News scroll paused." : "News scroll resumed.",
            paused: paused,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ ok: false, message: "Unable to update news scroll state." });
    }
});

router.put("/news-items/:id", adminAuth, async function (req, res) {
    try {
        var updated = await newsItems.updateNewsItem(req.params.id, {
            title: getRequestValue(req, "title"),
            content: getRequestValue(req, "content"),
            contentLink: getRequestValue(req, "contentLink"),
            imageUrl: getRequestValue(req, "imageUrl"),
        });

        if (!updated) {
            return res.status(404).json({ ok: false, message: "News item not found." });
        }

        var list = await newsItems.listNewsItems();
        var paused = await newsItems.isNewsPaused();
        return res.json({
            ok: true,
            message: "News item updated successfully.",
            item: updated,
            items: list,
            paused: paused,
        });
    } catch (error) {
        if (error && error.statusCode === 400) {
            return res.status(400).json({ ok: false, message: error.message });
        }
        console.error(error);
        return res.status(500).json({ ok: false, message: "Unable to update news item." });
    }
});

router.delete("/news-items/:id", adminAuth, async function (req, res) {
    try {
        var removed = await newsItems.deleteNewsItem(req.params.id);
        if (!removed) {
            return res.status(404).json({ ok: false, message: "News item not found." });
        }
        var list = await newsItems.listNewsItems();
        var paused = await newsItems.isNewsPaused();
        return res.json({
            ok: true,
            message: "News item deleted successfully.",
            items: list,
            paused: paused,
        });
    } catch (error) {
        if (error && error.statusCode === 400) {
            return res.status(400).json({ ok: false, message: error.message });
        }
        console.error(error);
        return res.status(500).json({ ok: false, message: "Unable to delete news item." });
    }
});

router.get("/carousel", adminAuth, async function (req, res) {
    try {
        var banners = await carouselBanners.listCarouselBanners();
        return res.json({ ok: true, banners: banners });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ ok: false, message: "Unable to load carousel banners." });
    }
});

router.get("/gallery-folders", adminAuth, async function (req, res) {
    try {
        var folders = await listGalleryFoldersOrdered();
        return res.json({ ok: true, folders: folders });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ ok: false, message: "Unable to load gallery folders." });
    }
});

router.get("/gallery-folder-cards", adminAuth, async function (req, res) {
    try {
        var cards = await buildGalleryFolderCards(false);
        return res.json({ ok: true, folders: cards });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ ok: false, message: "Unable to load gallery folders." });
    }
});

router.post("/gallery-folders", adminAuth, async function (req, res) {
    var folderName = normalizeFolderName(getRequestValue(req, "folderName"));
    if (!folderName) {
        return res.status(400).json({ ok: false, message: "Invalid folder name." });
    }

    try {
        await ensureGalleryFolderDir(folderName);
        var folders = await listGalleryFoldersOrdered();
        return res.json({
            ok: true,
            message: "Folder created successfully.",
            folderName: folderName,
            folders: folders,
        });
    } catch (error) {
        if (error && error.message === "Invalid folder name.") {
            return res.status(400).json({ ok: false, message: "Invalid folder name." });
        }
        console.error(error);
        return res.status(500).json({ ok: false, message: "Unable to create folder." });
    }
});

router.post("/gallery-folders/reorder", adminAuth, async function (req, res) {
    var folderName = normalizeFolderName(getRequestValue(req, "folderName"));
    var sequence = Number(getRequestValue(req, "sequence"));

    if (!folderName) {
        return res.status(400).json({ ok: false, message: "Invalid folder name." });
    }

    if (!Number.isInteger(sequence) || sequence < 1) {
        return res.status(400).json({ ok: false, message: "Invalid sequence." });
    }

    try {
        var folders = await reorderGalleryFolderSequence(folderName, sequence);
        var cards = await buildGalleryFolderCards(false);
        return res.json({
            ok: true,
            message: "Folder sequence updated successfully.",
            folderName: folderName,
            folders: folders,
            cards: cards,
        });
    } catch (error) {
        if (error && (error.message === "Invalid folder name." || error.message === "Invalid sequence.")) {
            return res.status(400).json({ ok: false, message: error.message });
        }
        if (error && error.message === "Folder not found.") {
            return res.status(404).json({ ok: false, message: "Folder not found." });
        }

        console.error(error);
        return res.status(500).json({ ok: false, message: "Unable to reorder gallery folders." });
    }
});

router.delete("/gallery-folders/:folderName", adminAuth, async function (req, res) {
    var folderName = normalizeFolderName(req.params.folderName);
    if (!folderName) {
        return res.status(400).json({ ok: false, message: "Invalid folder name." });
    }

    try {
        var folders = await listGalleryFoldersOrdered();
        if (!folders.includes(folderName)) {
            return res.status(404).json({ ok: false, message: "Folder not found." });
        }

        var folderDir = getGalleryFolderDir(folderName);
        if (!folderDir) {
            return res.status(400).json({ ok: false, message: "Invalid folder name." });
        }

        await fs.promises.rm(folderDir, { recursive: true, force: false });
        var cards = await buildGalleryFolderCards(false);
        return res.json({
            ok: true,
            message: "Folder deleted successfully.",
            folder: folderName,
            folders: cards,
        });
    } catch (error) {
        if (error && error.message === "Invalid folder name.") {
            return res.status(400).json({ ok: false, message: "Invalid folder name." });
        }
        if (error && error.code === "ENOENT") {
            return res.status(404).json({ ok: false, message: "Folder not found." });
        }
        console.error(error);
        return res.status(500).json({ ok: false, message: "Unable to delete folder." });
    }
});

router.get("/gallery-folders-public", async function (req, res) {
    try {
        var cards = await buildGalleryFolderCards(true);
        return res.json({ ok: true, folders: cards });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ ok: false, message: "Unable to load gallery folders." });
    }
});

router.get("/gallery-images-public", async function (req, res) {
    try {
        var cards = await buildGalleryFolderCards(true);
        if (!cards.length) {
            return res.json({ ok: true, folder: "", images: [] });
        }

        var requestedFolder = "";
        if (req && req.query && typeof req.query === "object" && req.query.folder != null) {
            requestedFolder = normalizeFolderName(req.query.folder);
        }

        var allowedNames = cards.map(function (item) {
            return item.name;
        });

        var activeFolder = requestedFolder && allowedNames.includes(requestedFolder)
            ? requestedFolder
            : allowedNames[0];

        var images = await listGalleryImages(activeFolder);
        return res.json({ ok: true, folder: activeFolder, images: images });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ ok: false, message: "Unable to load gallery images." });
    }
});

router.get("/gallery-images", adminAuth, async function (req, res) {
    var folderName = getFolderNameFromReq(req);
    if (!folderName) {
        return res.status(400).json({ ok: false, message: "Invalid folder name." });
    }

    try {
        var folders = await listGalleryFoldersOrdered();
        if (!folders.includes(folderName)) {
            return res.status(404).json({ ok: false, message: "Folder not found." });
        }

        var images = await listGalleryImages(folderName);
        return res.json({ ok: true, folder: folderName, images: images });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ ok: false, message: "Unable to load gallery images." });
    }
});

router.post("/gallery-images", adminAuth, function (req, res) {
    upload.array("images")(req, res, async function (err) {
        if (err) {
            return res.status(400).json({ ok: false, message: err.message });
        }

        var files = Array.isArray(req.files) ? req.files : [];
        if (!files.length) {
            return res.status(400).json({ ok: false, message: "No images uploaded." });
        }

        var folderName = getFolderNameFromReq(req);
        if (!folderName) {
            return res.status(400).json({ ok: false, message: "Invalid folder name." });
        }

        try {
            var folders = await listGalleryFolders();
            if (!folders.includes(folderName)) {
                return res.status(404).json({ ok: false, message: "Folder not found." });
            }

            var folderDir = getGalleryFolderDir(folderName);
            if (!folderDir) {
                return res.status(400).json({ ok: false, message: "Invalid folder name." });
            }
            var uploaded = [];

            for (var i = 0; i < files.length; i += 1) {
                var file = files[i];
                var ext = MIME_TO_EXT[String(file.mimetype || "").toLowerCase()];
                if (!ext) {
                    return res.status(400).json({ ok: false, message: "Only JPG/PNG images are allowed." });
                }

                var originalExt = path.extname(String(file.originalname || "")).toLowerCase();
                var originalBase = path.basename(String(file.originalname || ""), originalExt);
                var baseName = sanitizeImageBaseName(originalBase);
                var uniquePart = Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
                var fileName = baseName + "-" + uniquePart + ext;
                var savePath = path.join(folderDir, fileName);
                await fs.promises.writeFile(savePath, file.buffer);

                uploaded.push({
                    name: fileName,
                    folder: folderName,
                    path: "/images/gallery/" + folderName + "/" + fileName,
                    size: file.size,
                });
            }

            var images = await listGalleryImages(folderName);
            return res.json({
                ok: true,
                message: "Images uploaded successfully.",
                folder: folderName,
                uploaded: uploaded,
                images: images,
            });
        } catch (error) {
            if (error && error.message === "Invalid folder name.") {
                return res.status(400).json({ ok: false, message: "Invalid folder name." });
            }
            console.error(error);
            return res.status(500).json({ ok: false, message: "Unable to upload images." });
        }
    });
});

router.delete("/gallery-images/:fileName", adminAuth, async function (req, res) {
    var fileName = String(req.params.fileName || "").trim();
    var folderName = getFolderNameFromReq(req);
    if (!folderName) {
        return res.status(400).json({ ok: false, message: "Invalid folder name." });
    }

    var lowerExt = path.extname(fileName).toLowerCase();
    if (
        !fileName ||
        fileName === "." ||
        fileName === ".." ||
        !GALLERY_FILE_REGEX.test(fileName) ||
        fileName !== path.basename(fileName) ||
        !GALLERY_ALLOWED_EXTS.includes(lowerExt)
    ) {
        return res.status(400).json({ ok: false, message: "Invalid file name." });
    }

    try {
        var folders = await listGalleryFoldersOrdered();
        if (!folders.includes(folderName)) {
            return res.status(404).json({ ok: false, message: "Folder not found." });
        }

        var folderDir = getGalleryFolderDir(folderName);
        if (!folderDir) {
            return res.status(400).json({ ok: false, message: "Invalid folder name." });
        }

        var rootDir = path.resolve(folderDir);
        var targetPath = path.resolve(folderDir, fileName);

        if (!targetPath.startsWith(rootDir + path.sep) && targetPath !== rootDir) {
            return res.status(400).json({ ok: false, message: "Invalid file name." });
        }

        await fs.promises.unlink(targetPath);
        var images = await listGalleryImages(folderName);
        return res.json({ ok: true, message: "Image removed successfully.", folder: folderName, images: images });
    } catch (error) {
        if (error && error.message === "Invalid folder name.") {
            return res.status(400).json({ ok: false, message: "Invalid folder name." });
        }
        if (error && error.code === "ENOENT") {
            return res.status(404).json({ ok: false, message: "Image not found." });
        }
        console.error(error);
        return res.status(500).json({ ok: false, message: "Unable to remove image." });
    }
});

router.get("/video-folders", adminAuth, async function (req, res) {
    try {
        var folders = await listVideoGalleryFoldersOrdered();
        return res.json({ ok: true, folders: folders });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ ok: false, message: "Unable to load video folders." });
    }
});

router.get("/video-folder-cards", adminAuth, async function (req, res) {
    try {
        var cards = await buildVideoFolderCards(false);
        return res.json({ ok: true, folders: cards });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ ok: false, message: "Unable to load video folders." });
    }
});

router.post("/video-folders", adminAuth, async function (req, res) {
    var folderName = normalizeFolderName(getRequestValue(req, "folderName"));
    if (!folderName) {
        return res.status(400).json({ ok: false, message: "Invalid folder name." });
    }

    try {
        await ensureVideoGalleryFolderDir(folderName);
        var folders = await listVideoGalleryFoldersOrdered();
        return res.json({
            ok: true,
            message: "Video folder created successfully.",
            folderName: folderName,
            folders: folders,
        });
    } catch (error) {
        if (error && error.message === "Invalid folder name.") {
            return res.status(400).json({ ok: false, message: "Invalid folder name." });
        }
        console.error(error);
        return res.status(500).json({ ok: false, message: "Unable to create video folder." });
    }
});

router.post("/video-folders/reorder", adminAuth, async function (req, res) {
    var folderName = normalizeFolderName(getRequestValue(req, "folderName"));
    var sequence = Number(getRequestValue(req, "sequence"));

    if (!folderName) {
        return res.status(400).json({ ok: false, message: "Invalid folder name." });
    }

    if (!Number.isInteger(sequence) || sequence < 1) {
        return res.status(400).json({ ok: false, message: "Invalid sequence." });
    }

    try {
        var folders = await reorderVideoFolderSequence(folderName, sequence);
        var cards = await buildVideoFolderCards(false);
        return res.json({
            ok: true,
            message: "Video folder sequence updated successfully.",
            folderName: folderName,
            folders: folders,
            cards: cards,
        });
    } catch (error) {
        if (error && (error.message === "Invalid folder name." || error.message === "Invalid sequence.")) {
            return res.status(400).json({ ok: false, message: error.message });
        }
        if (error && error.message === "Folder not found.") {
            return res.status(404).json({ ok: false, message: "Folder not found." });
        }

        console.error(error);
        return res.status(500).json({ ok: false, message: "Unable to reorder video folders." });
    }
});

router.delete("/video-folders/:folderName", adminAuth, async function (req, res) {
    var folderName = normalizeFolderName(req.params.folderName);
    if (!folderName) {
        return res.status(400).json({ ok: false, message: "Invalid folder name." });
    }

    try {
        var folders = await listVideoGalleryFoldersOrdered();
        if (!folders.includes(folderName)) {
            return res.status(404).json({ ok: false, message: "Folder not found." });
        }

        var folderDir = getVideoGalleryFolderDir(folderName);
        if (!folderDir) {
            return res.status(400).json({ ok: false, message: "Invalid folder name." });
        }

        await fs.promises.rm(folderDir, { recursive: true, force: false });
        var cards = await buildVideoFolderCards(false);
        return res.json({
            ok: true,
            message: "Video folder deleted successfully.",
            folder: folderName,
            folders: cards,
        });
    } catch (error) {
        if (error && error.message === "Invalid folder name.") {
            return res.status(400).json({ ok: false, message: "Invalid folder name." });
        }
        if (error && error.code === "ENOENT") {
            return res.status(404).json({ ok: false, message: "Folder not found." });
        }
        console.error(error);
        return res.status(500).json({ ok: false, message: "Unable to delete video folder." });
    }
});

router.get("/video-folders-public", async function (req, res) {
    try {
        var cards = await buildVideoFolderCards(true);
        return res.json({ ok: true, folders: cards });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ ok: false, message: "Unable to load video folders." });
    }
});

router.get("/video-files-public", async function (req, res) {
    try {
        var cards = await buildVideoFolderCards(true);
        if (!cards.length) {
            return res.json({ ok: true, folder: "", videos: [] });
        }

        var requestedFolder = "";
        if (req && req.query && typeof req.query === "object" && req.query.folder != null) {
            requestedFolder = normalizeFolderName(req.query.folder);
        }

        var allowedNames = cards.map(function (item) {
            return item.name;
        });

        var activeFolder = requestedFolder && allowedNames.includes(requestedFolder)
            ? requestedFolder
            : allowedNames[0];

        var videos = await listVideoGalleryFiles(activeFolder);
        return res.json({ ok: true, folder: activeFolder, videos: videos });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ ok: false, message: "Unable to load gallery videos." });
    }
});

router.get("/video-files", adminAuth, async function (req, res) {
    var folderName = getFolderNameFromReq(req);
    if (!folderName) {
        return res.status(400).json({ ok: false, message: "Invalid folder name." });
    }

    try {
        var folders = await listVideoGalleryFolders();
        if (!folders.includes(folderName)) {
            return res.status(404).json({ ok: false, message: "Folder not found." });
        }

        var videos = await listVideoGalleryFiles(folderName);
        return res.json({ ok: true, folder: folderName, videos: videos });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ ok: false, message: "Unable to load folder videos." });
    }
});

router.post("/video-files", adminAuth, function (req, res) {
    videoUpload.array("videos")(req, res, async function (err) {
        if (err) {
            return res.status(400).json({ ok: false, message: err.message });
        }

        var files = Array.isArray(req.files) ? req.files : [];
        if (!files.length) {
            return res.status(400).json({ ok: false, message: "No videos uploaded." });
        }

        var folderName = getFolderNameFromReq(req);
        if (!folderName) {
            return res.status(400).json({ ok: false, message: "Invalid folder name." });
        }

        try {
            var folders = await listVideoGalleryFolders();
            if (!folders.includes(folderName)) {
                return res.status(404).json({ ok: false, message: "Folder not found." });
            }

            var folderDir = getVideoGalleryFolderDir(folderName);
            if (!folderDir) {
                return res.status(400).json({ ok: false, message: "Invalid folder name." });
            }
            var uploaded = [];

            for (var i = 0; i < files.length; i += 1) {
                var file = files[i];
                var ext = VIDEO_MIME_TO_EXT[String(file.mimetype || "").toLowerCase()];
                if (!ext) {
                    return res.status(400).json({ ok: false, message: "Only MP4/WEBM/OGG/MOV videos are allowed." });
                }

                var originalExt = path.extname(String(file.originalname || "")).toLowerCase();
                var originalBase = path.basename(String(file.originalname || ""), originalExt);
                var baseName = sanitizeImageBaseName(originalBase);
                var uniquePart = Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
                var fileName = baseName + "-" + uniquePart + ext;
                var savePath = path.join(folderDir, fileName);
                await fs.promises.writeFile(savePath, file.buffer);

                uploaded.push({
                    name: fileName,
                    folder: folderName,
                    path: "/videos/gallery/" + folderName + "/" + fileName,
                    size: file.size,
                });
            }

            var videos = await listVideoGalleryFiles(folderName);
            return res.json({
                ok: true,
                message: "Videos uploaded successfully.",
                folder: folderName,
                uploaded: uploaded,
                videos: videos,
            });
        } catch (error) {
            if (error && error.message === "Invalid folder name.") {
                return res.status(400).json({ ok: false, message: "Invalid folder name." });
            }
            console.error(error);
            return res.status(500).json({ ok: false, message: "Unable to upload videos." });
        }
    });
});

router.delete("/video-files/:fileName", adminAuth, async function (req, res) {
    var fileName = String(req.params.fileName || "").trim();
    var folderName = getFolderNameFromReq(req);
    if (!folderName) {
        return res.status(400).json({ ok: false, message: "Invalid folder name." });
    }

    var lowerExt = path.extname(fileName).toLowerCase();
    if (
        !fileName ||
        fileName === "." ||
        fileName === ".." ||
        !GALLERY_FILE_REGEX.test(fileName) ||
        fileName !== path.basename(fileName) ||
        !VIDEO_ALLOWED_EXTS.includes(lowerExt)
    ) {
        return res.status(400).json({ ok: false, message: "Invalid file name." });
    }

    try {
        var folders = await listVideoGalleryFolders();
        if (!folders.includes(folderName)) {
            return res.status(404).json({ ok: false, message: "Folder not found." });
        }

        var folderDir = getVideoGalleryFolderDir(folderName);
        if (!folderDir) {
            return res.status(400).json({ ok: false, message: "Invalid folder name." });
        }

        var rootDir = path.resolve(folderDir);
        var targetPath = path.resolve(folderDir, fileName);

        if (!targetPath.startsWith(rootDir + path.sep) && targetPath !== rootDir) {
            return res.status(400).json({ ok: false, message: "Invalid file name." });
        }

        await fs.promises.unlink(targetPath);
        var videos = await listVideoGalleryFiles(folderName);
        return res.json({ ok: true, message: "Video removed successfully.", folder: folderName, videos: videos });
    } catch (error) {
        if (error && error.message === "Invalid folder name.") {
            return res.status(400).json({ ok: false, message: "Invalid folder name." });
        }
        if (error && error.code === "ENOENT") {
            return res.status(404).json({ ok: false, message: "Video not found." });
        }
        console.error(error);
        return res.status(500).json({ ok: false, message: "Unable to remove video." });
    }
});

router.get("/enquiries", adminAuth, async function (req, res) {
    var limit = Number(req.query.limit || 200);
    try {
        var list = await enquiries.listEnquiries(limit);
        return res.json({ ok: true, enquiries: list });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ ok: false, message: "Unable to load enquiries." });
    }
});

router.delete("/enquiries/:id", adminAuth, async function (req, res) {
    var enquiryId = Number(req.params.id);
    if (!Number.isInteger(enquiryId) || enquiryId <= 0) {
        return res.status(400).json({ ok: false, message: "Invalid enquiry id." });
    }

    try {
        var removed = await enquiries.deleteEnquiry(enquiryId);
        if (!removed) {
            return res.status(404).json({ ok: false, message: "Enquiry not found." });
        }
        return res.json({ ok: true, message: "Enquiry deleted successfully." });
    } catch (error) {
        if (error && error.statusCode === 400) {
            return res.status(400).json({ ok: false, message: error.message });
        }
        console.error(error);
        return res.status(500).json({ ok: false, message: "Unable to delete enquiry." });
    }
});

router.post("/carousel/reorder", adminAuth, async function (req, res) {
    var bannerName = carouselBanners.normalizeBannerName(getRequestValue(req, "bannerName"));
    var sequence = Number(getRequestValue(req, "sequence"));

    if (!carouselBanners.isValidBannerName(bannerName)) {
        return res.status(400).json({ ok: false, message: "Invalid banner name." });
    }

    if (!Number.isInteger(sequence)) {
        return res.status(400).json({ ok: false, message: "Invalid sequence." });
    }

    try {
        var banners = await carouselBanners.reorderBannerSequence(bannerName, sequence);
        return res.json({
            ok: true,
            message: "Carousel sequence updated successfully.",
            banners: banners,
        });
    } catch (error) {
        if (error.message === "Invalid banner name." || error.message === "Invalid sequence.") {
            return res.status(400).json({ ok: false, message: error.message });
        }
        if (error.message === "Banner not found.") {
            return res.status(404).json({ ok: false, message: error.message });
        }

        console.error(error);
        return res.status(500).json({ ok: false, message: "Unable to reorder carousel banners." });
    }
});

router.post("/login", async function (req, res) {
    var username = normalizeEmail(getRequestValue(req, "username") || getRequestValue(req, "email"));
    var password = String(getRequestValue(req, "password") || getRequestValue(req, "pwd"));

    if (!isValidEmail(username)) {
        return res.status(400).json({ ok: false, message: "Enter a valid email address." });
    }

    if (!password || password.length < 6) {
        return res.status(400).json({ ok: false, message: "Password must be at least 6 characters." });
    }

    try {
        var result = await db.query("select email from users where lower(email)=? and pass=? limit 1", [username, password]);
        var rows = result[0] || [];
        if (rows.length === 0) {
            return res.status(401).json({ ok: false, message: "Invalid credentials." });
        }

        var token = jwt.sign(
            { username: rows[0].email || username, role: "admin" },
            JWT_SECRET,
            { expiresIn: "30m" }
        );

        return res.json({ ok: true, token: token, expiresIn: ADMIN_TOKEN_EXPIRES_SECONDS });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ ok: false, message: "Login failed. Please try again." });
    }
});

router.post("/forgot-password", async function (req, res) {
    var email = normalizeEmail(getRequestValue(req, "email"));

    if (!isValidEmail(email)) {
        return res.status(400).json({ ok: false, message: "Enter a valid email address." });
    }

    try {
        var result = await db.query("select email from users where lower(email)=? limit 1", [email]);
        var rows = result[0] || [];
        if (rows.length === 0) {
            return res.status(404).json({ ok: false, message: "Admin email not found." });
        }

        var matchedEmail = String(rows[0].email || email);
        var resetKey = normalizeEmail(matchedEmail);
        var token = Math.floor(100000 + Math.random() * 900000).toString();
        var expiresAt = Date.now() + 5 * 60 * 1000;
        resetStore.set(resetKey, { token: token, expiresAt: expiresAt, email: matchedEmail });

        sendVerificationEmail(matchedEmail, token)
            .then(function () {
                return res.json({
                    ok: true,
                    message: "Reset code sent to your email. Use it within 5 minutes.",
                });
            })
            .catch(function (error) {
                console.error(error);
                resetStore.delete(resetKey);
                return res.status(500).json({
                    ok: false,
                    message: "Unable to send reset email. Please try again.",
                });
            });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ ok: false, message: "Unable to send reset email." });
    }
});

router.post("/reset-password", async function (req, res) {
    var email = normalizeEmail(getRequestValue(req, "email"));
    var token = String(getRequestValue(req, "token")).trim();
    var newPassword = String(getRequestValue(req, "newPassword"));

    if (!isValidEmail(email)) {
        return res.status(400).json({ ok: false, message: "Enter a valid email address." });
    }

    if (!token || token.length !== 6) {
        return res.status(400).json({ ok: false, message: "Enter the 6-digit reset code." });
    }

    if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ ok: false, message: "Password must be at least 6 characters." });
    }

    try {
        var resetKey = email;
        var saved = resetStore.get(resetKey);
        if (!saved || saved.token !== token) {
            return res.status(400).json({ ok: false, message: "Invalid reset code." });
        }

        if (Date.now() > saved.expiresAt) {
            resetStore.delete(resetKey);
            return res.status(400).json({ ok: false, message: "Reset code expired." });
        }

        var targetEmail = normalizeEmail(saved.email || email);
        var updateResult = await db.query("update users set pass=? where lower(email)=?", [newPassword, targetEmail]);
        var updateMeta = updateResult[0] || {};
        if (!updateMeta.affectedRows) {
            return res.status(404).json({ ok: false, message: "Admin email not found." });
        }

        resetStore.delete(resetKey);

        return res.json({ ok: true, message: "Password updated. Please login." });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ ok: false, message: "Unable to reset password." });
    }
});

router.post("/carousel", adminAuth, function (req, res) {
    upload.fields([
        { name: "banner", maxCount: 1 },
        { name: "banners", maxCount: 5 },
    ])(req, res, async function (err) {
        if (err) {
            return res.status(400).json({ ok: false, message: err.message });
        }

        var uploadedFiles = [];
        if (req && req.files && typeof req.files === "object") {
            var singleFiles = Array.isArray(req.files.banner) ? req.files.banner : [];
            var multiFiles = Array.isArray(req.files.banners) ? req.files.banners : [];
            uploadedFiles = singleFiles.concat(multiFiles);
        }

        if (uploadedFiles.length > 5) {
            return res.status(400).json({ ok: false, message: "Please upload up to 5 slider images at one time." });
        }

        if (!uploadedFiles.length) {
            return res.status(400).json({ ok: false, message: "No file uploaded." });
        }

        try {
            var saved = [];
            for (var i = 0; i < uploadedFiles.length; i += 1) {
                var nextBannerName = await carouselBanners.getNextBannerName();
                var item = await carouselBanners.saveBannerFile(nextBannerName, uploadedFiles[i]);
                saved.push(item);
            }
            var banners = await carouselBanners.listCarouselBanners();

            return res.json({
                ok: true,
                message:
                    saved.length === 1
                        ? "Carousel banner added successfully."
                        : "Carousel banners added successfully.",
                banner: saved[0] || null,
                added: saved,
                banners: banners,
            });
        } catch (error) {
            if (isUploadValidationError(error.message)) {
                return res.status(400).json({ ok: false, message: error.message });
            }
            console.error(error);
            return res.status(500).json({ ok: false, message: "Unable to add carousel banner." });
        }
    });
});

router.delete("/carousel/:bannerName", adminAuth, async function (req, res) {
    try {
        var removed = await carouselBanners.removeBannerFile(req.params.bannerName);
        if (!removed) {
            return res.status(404).json({ ok: false, message: "Banner not found." });
        }

        var banners = await carouselBanners.listCarouselBanners();
        return res.json({
            ok: true,
            message: "Carousel banner removed successfully.",
            banners: banners,
        });
    } catch (error) {
        if (error.message === "Invalid banner name.") {
            return res.status(400).json({ ok: false, message: error.message });
        }
        console.error(error);
        return res.status(500).json({ ok: false, message: "Unable to remove carousel banner." });
    }
});

router.post("/update-banner/:bannerName", adminAuth, function (req, res) {
    upload.single("banner")(req, res, async function (err) {
        if (err) {
            return res.status(400).json({ ok: false, message: err.message });
        }

        if (!req.file) {
            return res.status(400).json({ ok: false, message: "No file uploaded." });
        }

        try {
            var saved = await carouselBanners.saveBannerFile(req.params.bannerName, req.file);

            return res.json({
                ok: true,
                message: "Banner updated successfully.",
                path: saved.path,
                name: saved.name,
            });
        } catch (error) {
            if (isUploadValidationError(error.message)) {
                return res.status(400).json({ ok: false, message: error.message });
            }
            console.error(error);
            return res.status(500).json({ ok: false, message: "Unable to update banner." });
        }
    });
});

module.exports = router;

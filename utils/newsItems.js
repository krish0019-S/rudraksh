var fs = require("fs");
var path = require("path");

var DATA_DIR = path.join(__dirname, "..", "data");
var DATA_FILE = path.join(DATA_DIR, "news-items.json");
var MAX_CONTENT_LINK_LENGTH = 500;
var MAX_IMAGE_URL_LENGTH = 500;

var DEFAULT_ITEMS = [
    {
        id: 1,
        title: "New Product Launch",
        content: "We are excited to announce the launch of our new product line next month. Stay tuned for more details!",
    },
    {
        id: 2,
        title: "Upcoming Event",
        content: "Join us for our annual customer appreciation event on December 15th. More information will be available soon.",
    },
    {
        id: 3,
        title: "Special Offer",
        content: "Get a 20% discount on all products during our holiday sale from December 1st to December 31st.",
    },
    {
        id: 4,
        title: "Company Milestone",
        content: "We are proud to celebrate our 10th anniversary this year. Thank you for being a part of our journey!",
    },
    {
        id: 5,
        title: "Community Engagement",
        content: "We recently partnered with local charities to support community development. Learn more about our initiatives on our website.",
    },
];

var writeQueue = Promise.resolve();

var toText = function (value) {
    return String(value == null ? "" : value).trim();
};

var nowIso = function () {
    return new Date().toISOString();
};

var normalizePaused = function (value) {
    return value === true;
};

var createValidationError = function (message) {
    var error = new Error(message);
    error.statusCode = 400;
    return error;
};

var normalizeOptionalUrl = function (value, options) {
    var raw = toText(value);
    var opts = options && typeof options === "object" ? options : {};
    var fieldName = String(opts.fieldName || "URL");
    var maxLength = Number(opts.maxLength || MAX_CONTENT_LINK_LENGTH);
    var throwOnError = opts.throwOnError === true;

    if (!raw) {
        return "";
    }

    if (raw.length > maxLength) {
        if (throwOnError) {
            throw createValidationError(fieldName + " must be " + String(maxLength) + " characters or less.");
        }
        return "";
    }

    if (raw.charAt(0) === "/") {
        return raw;
    }

    if (!/^https?:\/\//i.test(raw)) {
        if (throwOnError) {
            throw createValidationError(fieldName + " must be a valid http/https URL or start with '/'.");
        }
        return "";
    }

    var parsed;
    try {
        parsed = new URL(raw);
    } catch (error) {
        if (throwOnError) {
            throw createValidationError(fieldName + " must be a valid URL.");
        }
        return "";
    }

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        if (throwOnError) {
            throw createValidationError(fieldName + " must use http or https protocol.");
        }
        return "";
    }

    return parsed.toString();
};

var normalizeItem = function (item) {
    var id = Number(item && item.id);
    if (!Number.isInteger(id) || id <= 0) {
        return null;
    }

    var title = toText(item && item.title);
    var content = toText(item && item.content);
    var contentLink = normalizeOptionalUrl(item && item.contentLink, {
        fieldName: "Content link",
        maxLength: MAX_CONTENT_LINK_LENGTH,
    });
    var imageUrl = normalizeOptionalUrl(item && item.imageUrl, {
        fieldName: "Image URL",
        maxLength: MAX_IMAGE_URL_LENGTH,
    });
    if (!title || !content) {
        return null;
    }

    return {
        id: id,
        title: title,
        content: content,
        contentLink: contentLink,
        imageUrl: imageUrl,
        createdAt: toText(item && item.createdAt) || nowIso(),
        updatedAt: toText(item && item.updatedAt) || nowIso(),
    };
};

var normalizeList = function (items) {
    if (!Array.isArray(items)) {
        return [];
    }

    return items
        .map(normalizeItem)
        .filter(Boolean)
        .sort(function (a, b) {
            return a.id - b.id;
        });
};

var defaultStore = function () {
    var stamp = nowIso();
    return {
        version: 1,
        paused: false,
        items: DEFAULT_ITEMS.map(function (item) {
            return {
                id: item.id,
                title: item.title,
                content: item.content,
                contentLink: "",
                imageUrl: "",
                createdAt: stamp,
                updatedAt: stamp,
            };
        }),
    };
};

var ensureStoreFile = async function () {
    await fs.promises.mkdir(DATA_DIR, { recursive: true });

    try {
        await fs.promises.access(DATA_FILE);
    } catch (error) {
        if (!error || error.code !== "ENOENT") {
            throw error;
        }
        var initial = defaultStore();
        await fs.promises.writeFile(DATA_FILE, JSON.stringify(initial, null, 2), "utf8");
    }
};

var readStore = async function () {
    await ensureStoreFile();

    var raw = await fs.promises.readFile(DATA_FILE, "utf8");
    var parsed = {};
    try {
        parsed = JSON.parse(raw);
    } catch (error) {
        parsed = defaultStore();
    }

    var cleanItems = normalizeList(parsed && parsed.items);
    if (!cleanItems.length) {
        var fallback = defaultStore();
        cleanItems = fallback.items;
    }

    return {
        version: 1,
        paused: normalizePaused(parsed && parsed.paused),
        items: cleanItems,
    };
};

var writeStore = async function (store) {
    var payload = {
        version: 1,
        paused: normalizePaused(store && store.paused),
        items: normalizeList(store && store.items),
    };

    var tempFile = DATA_FILE + ".tmp";
    await fs.promises.writeFile(tempFile, JSON.stringify(payload, null, 2), "utf8");
    await fs.promises.rename(tempFile, DATA_FILE);
};

var enqueueWrite = function (work) {
    writeQueue = writeQueue.then(work, work);
    return writeQueue;
};

var validatePayload = function (payload) {
    var title = toText(payload && payload.title);
    var content = toText(payload && payload.content);
    var contentLink = normalizeOptionalUrl(payload && payload.contentLink, {
        fieldName: "Content link",
        maxLength: MAX_CONTENT_LINK_LENGTH,
        throwOnError: true,
    });
    var imageUrl = normalizeOptionalUrl(payload && payload.imageUrl, {
        fieldName: "Image URL",
        maxLength: MAX_IMAGE_URL_LENGTH,
        throwOnError: true,
    });

    if (title.length < 3 || title.length > 120) {
        throw createValidationError("Title must be between 3 and 120 characters.");
    }

    if (content.length < 8 || content.length > 1210) {
        throw createValidationError("Content must be between 8 and 1210 characters.");
    }

    return {
        title: title,
        content: content,
        contentLink: contentLink,
        imageUrl: imageUrl,
    };
};

var getNewsState = async function () {
    var store = await readStore();
    return {
        paused: normalizePaused(store && store.paused),
        items: store.items.slice().sort(function (a, b) {
            return b.id - a.id;
        }),
    };
};

var listNewsItems = async function () {
    var state = await getNewsState();
    return state.items;
};

var createNewsItem = async function (payload) {
    var cleaned = validatePayload(payload);
    return enqueueWrite(async function () {
        var store = await readStore();
        var maxId = store.items.reduce(function (acc, item) {
            return item.id > acc ? item.id : acc;
        }, 0);
        var stamp = nowIso();
        var item = {
            id: maxId + 1,
            title: cleaned.title,
            content: cleaned.content,
            contentLink: cleaned.contentLink,
            imageUrl: cleaned.imageUrl,
            createdAt: stamp,
            updatedAt: stamp,
        };
        store.items.push(item);
        await writeStore(store);
        return item;
    });
};

var updateNewsItem = async function (id, payload) {
    var cleaned = validatePayload(payload);
    var newsId = Number(id);
    if (!Number.isInteger(newsId) || newsId <= 0) {
        var idError = new Error("Invalid news id.");
        idError.statusCode = 400;
        throw idError;
    }

    return enqueueWrite(async function () {
        var store = await readStore();
        var index = store.items.findIndex(function (item) {
            return item.id === newsId;
        });
        if (index < 0) {
            return null;
        }
        var current = store.items[index];
        var updated = {
            id: current.id,
            title: cleaned.title,
            content: cleaned.content,
            contentLink: cleaned.contentLink,
            imageUrl: cleaned.imageUrl,
            createdAt: current.createdAt || nowIso(),
            updatedAt: nowIso(),
        };
        store.items[index] = updated;
        await writeStore(store);
        return updated;
    });
};

var deleteNewsItem = async function (id) {
    var newsId = Number(id);
    if (!Number.isInteger(newsId) || newsId <= 0) {
        var idError = new Error("Invalid news id.");
        idError.statusCode = 400;
        throw idError;
    }

    return enqueueWrite(async function () {
        var store = await readStore();
        var before = store.items.length;
        store.items = store.items.filter(function (item) {
            return item.id !== newsId;
        });
        if (store.items.length === before) {
            return false;
        }
        await writeStore(store);
        return true;
    });
};

var isNewsPaused = async function () {
    var state = await getNewsState();
    return state.paused;
};

var setNewsPaused = async function (paused) {
    var nextState = normalizePaused(paused);
    return enqueueWrite(async function () {
        var store = await readStore();
        store.paused = nextState;
        await writeStore(store);
        return store.paused;
    });
};

module.exports = {
    createNewsItem: createNewsItem,
    deleteNewsItem: deleteNewsItem,
    getNewsState: getNewsState,
    isNewsPaused: isNewsPaused,
    listNewsItems: listNewsItems,
    setNewsPaused: setNewsPaused,
    updateNewsItem: updateNewsItem,
};

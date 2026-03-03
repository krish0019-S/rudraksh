var db = require("../config/db");

var EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
var PHONE_REGEX = /^(?:\+\d{1,3}\s)?\d{10}$/;
var SOURCE_WHITELIST = new Set(["home", "contact"]);
var DEFAULT_LIMIT = 200;
var MAX_LIMIT = 1000;
var MAX_ADDRESS_LENGTH = 150;
var MAX_MESSAGE_LENGTH = 100;

var tableReadyPromise = null;

var normalizeText = function (value) {
    return String(value == null ? "" : value).trim();
};

var normalizeSource = function (source) {
    var normalized = normalizeText(source).toLowerCase();
    if (!SOURCE_WHITELIST.has(normalized)) {
        return "contact";
    }
    return normalized;
};

var isExampleEmail = function (email) {
    return /@example\.(com|net|org)$/i.test(normalizeText(email));
};

var buildBadRequestError = function (message) {
    var error = new Error(message);
    error.statusCode = 400;
    return error;
};

var ensureEnquiriesTable = function () {
    if (!tableReadyPromise) {
        tableReadyPromise = db.query(
            "CREATE TABLE IF NOT EXISTS enquiries (" +
                "id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT," +
                "full_name VARCHAR(120) NOT NULL," +
                "email VARCHAR(190) NOT NULL," +
                "phone VARCHAR(32) NOT NULL," +
                "address VARCHAR(255) NOT NULL," +
                "message TEXT NOT NULL," +
                "source VARCHAR(20) NOT NULL DEFAULT 'contact'," +
                "created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP," +
                "PRIMARY KEY (id)," +
                "INDEX idx_enquiries_created_at (created_at)," +
                "INDEX idx_enquiries_source (source)" +
            ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
        ).catch(function (error) {
            tableReadyPromise = null;
            throw error;
        });
    }
    return tableReadyPromise;
};

var validateEnquiryPayload = function (payload) {
    var fullName = normalizeText(payload.fullName);
    var email = normalizeText(payload.email).toLowerCase();
    var phone = normalizeText(payload.phone).replace(/\s+/g, " ");
    var address = normalizeText(payload.address);
    var message = normalizeText(payload.message);
    var source = normalizeSource(payload.source);

    if (fullName.length < 2 || fullName.length > 120) {
        throw buildBadRequestError("Enter a valid full name.");
    }

    if (!EMAIL_REGEX.test(email)) {
        throw buildBadRequestError("Enter a valid email address.");
    }

    if (isExampleEmail(email)) {
        throw buildBadRequestError("Example email is not allowed.");
    }

    if (!PHONE_REGEX.test(phone)) {
        throw buildBadRequestError("Enter a valid 10-digit phone number.");
    }

    if (address.length < 2 || address.length > MAX_ADDRESS_LENGTH) {
        throw buildBadRequestError("Enter a valid address.");
    }

    if (message.length < 3 || message.length > MAX_MESSAGE_LENGTH) {
        throw buildBadRequestError("Enter a valid message.");
    }

    return {
        fullName: fullName,
        email: email,
        phone: phone,
        address: address,
        message: message,
        source: source,
    };
};

var createEnquiry = async function (payload) {
    await ensureEnquiriesTable();
    var cleaned = validateEnquiryPayload(payload || {});

    var result = await db.query(
        "INSERT INTO enquiries (full_name, email, phone, address, message, source) VALUES (?, ?, ?, ?, ?, ?)",
        [cleaned.fullName, cleaned.email, cleaned.phone, cleaned.address, cleaned.message, cleaned.source]
    );

    var meta = result[0] || {};
    return {
        id: Number(meta.insertId || 0),
        fullName: cleaned.fullName,
        email: cleaned.email,
        phone: cleaned.phone,
        address: cleaned.address,
        message: cleaned.message,
        source: cleaned.source,
    };
};

var listEnquiries = async function (limit) {
    await ensureEnquiriesTable();

    var numericLimit = Number(limit);
    if (!Number.isInteger(numericLimit) || numericLimit <= 0) {
        numericLimit = DEFAULT_LIMIT;
    }
    if (numericLimit > MAX_LIMIT) {
        numericLimit = MAX_LIMIT;
    }

    var result = await db.query(
        "SELECT id, full_name, email, phone, address, message, source, created_at " +
        "FROM enquiries ORDER BY created_at DESC LIMIT ?",
        [numericLimit]
    );

    var rows = result[0] || [];
    return rows.map(function (row) {
        return {
            id: Number(row.id || 0),
            fullName: normalizeText(row.full_name),
            email: normalizeText(row.email),
            phone: normalizeText(row.phone),
            address: normalizeText(row.address),
            message: normalizeText(row.message),
            source: normalizeSource(row.source),
            createdAt: row.created_at,
        };
    });
};

var deleteEnquiry = async function (id) {
    await ensureEnquiriesTable();

    var enquiryId = Number(id);
    if (!Number.isInteger(enquiryId) || enquiryId <= 0) {
        throw buildBadRequestError("Invalid enquiry id.");
    }

    var result = await db.query("DELETE FROM enquiries WHERE id=? LIMIT 1", [enquiryId]);
    var meta = result[0] || {};
    return Number(meta.affectedRows || 0) > 0;
};

module.exports = {
    createEnquiry: createEnquiry,
    deleteEnquiry: deleteEnquiry,
    ensureEnquiriesTable: ensureEnquiriesTable,
    isExampleEmail: isExampleEmail,
    listEnquiries: listEnquiries,
};

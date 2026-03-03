var jwt = require("jsonwebtoken");

var JWT_SECRET = process.env.JWT_SECRET || "change_this_secret";

var adminAuth = function (req, res, next) {
    var authHeader = req.headers.authorization || "";
    var token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token) {
        return res.status(401).json({ ok: false, message: "Missing token." });
    }

    try {
        var decoded = jwt.verify(token, JWT_SECRET);
        req.admin = decoded;
        return next();
    } catch (error) {
        if (error.name === "TokenExpiredError") {
            return res.status(401).json({ ok: false, message: "Token expired." });
        }
        return res.status(401).json({ ok: false, message: "Invalid token." });
    }
};

module.exports = adminAuth;

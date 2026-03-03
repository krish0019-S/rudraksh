require("dotenv").config();
var express = require("express");
var path = require("path");
var fs = require("fs");
var adminRoutes = require("./routes/adminRoutes");
var db = require("./config/db");
var carouselBanners = require("./utils/carouselBanners");
var enquiries = require("./utils/enquiries");



var app = express();
var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


var getRequestBody = function (req) {
    if (req && req.body && typeof req.body === "object") {
        return req.body;
    }
    return {};
};

var getRequestQuery = function (req) {
    if (req && req.query && typeof req.query === "object") {
        return req.query;
    }
    return {};
};

var getRequestValue = function (req, keys) {
    var keyList = Array.isArray(keys) ? keys : [keys];
    var body = getRequestBody(req);
    var query = getRequestQuery(req);

    for (var i = 0; i < keyList.length; i += 1) {
        var key = keyList[i];
        if (key == null) {
            continue;
        }
        if (body[key] != null) {
            return body[key];
        }
        if (query[key] != null) {
            return query[key];
        }
    }

    return "";
};

var isExampleEmail = function (email) {
    return enquiries.isExampleEmail(String(email || "").trim().toLowerCase());
};

var parseBooleanFlag = function (value) {
    var text = String(value == null ? "" : value).trim().toLowerCase();
    return text === "1" || text === "true" || text === "yes" || text === "on";
};

var validateRobotCheck = function (req) {
    var notRobot = parseBooleanFlag(getRequestValue(req, ["notRobot", "humanCheck", "robotCheck"]));
    if (!notRobot) {
        return { ok: false, message: "Please confirm you're not a robot." };
    }

    var honeypot = String(getRequestValue(req, ["website", "company", "url"])).trim();
    if (honeypot) {
        return { ok: false, message: "Unable to submit enquiry right now." };
    }

    var startedAt = Number(getRequestValue(req, "formStartedAt"));
    var now = Date.now();
    var minDelayMs = 1200;
    var maxDelayMs = 24 * 60 * 60 * 1000;

    if (!Number.isFinite(startedAt) || startedAt <= 0) {
        return { ok: false, message: "Please refresh the page and try again." };
    }

    var elapsedMs = now - startedAt;
    if (elapsedMs < minDelayMs) {
        return { ok: false, message: "Please wait a moment before submitting." };
    }

    if (elapsedMs > maxDelayMs) {
        return { ok: false, message: "Your form session expired. Please refresh and try again." };
    }

    return { ok: true };
};

app.use(express.static("Public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/admin", adminRoutes);

app.get("/uploads/:bannerName", async function (req, res) {
    var bannerName = String(req.params.bannerName || "");
    if (!/^[a-z0-9_-]+$/i.test(bannerName)) {
        return res.status(400).end();
    }

    var uploadsDir = path.join(__dirname, "Public", "uploads");
    var candidates = [".jpg", ".jpeg", ".png"].map(function (ext) {
        return path.join(uploadsDir, `${bannerName}${ext}`);
    });

    for (var i = 0; i < candidates.length; i += 1) {
        try {
            await fs.promises.access(candidates[i]);
            return res.sendFile(candidates[i]);
        } catch (error) {
            if (error.code !== "ENOENT") {
                return res.status(500).end();
            }
        }
    }

    return res.status(404).end();
});

app.get("/carousel-slides", async function (req, res) {
    try {
        var banners = await carouselBanners.listCarouselBanners();
        return res.json({ ok: true, banners: banners.slice(0, 5) });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ ok: false, message: "Unable to load carousel slides." });
    }
});

app.get("/", function (req, resp) {
    let dirName = __dirname;
    let fullpath = dirName + "/Public/home.html";
    resp.sendFile(fullpath);
});

app.get("/about", function (req, resp) {
    let dirName = __dirname;
    let fullpath = dirName + "/Public/about.html";
    resp.sendFile(fullpath);
});

app.get("/service", function (req, resp) {
    let dirName = __dirname;
    let fullpath = dirName + "/Public/services-details.html";
    resp.sendFile(fullpath);
});

app.get("/contact", function (req, resp) {
    let dirName = __dirname;
    let fullpath = dirName + "/Public/contact.html";
    resp.sendFile(fullpath);
});

app.get("/photo-gallery", function (req, resp) {
    let dirName = __dirname;
    let fullpath = dirName + "/Public/photo-gallery.html";
    resp.sendFile(fullpath);
});

app.get("/video-gallery", function (req, resp) {
    let dirName = __dirname;
    let fullpath = dirName + "/Public/video-gallery.html";
    resp.sendFile(fullpath);
});

app.get("/signup", function (req, resp) {
    let dirName = __dirname;
    let fullpath = dirName + "/Public/signup.html";
    resp.sendFile(fullpath);
});

app.get("/gphoto",function (req,resp){
     let dirName = __dirname;
    let fullpath = dirName + "/Public/photo-gallery.html";
    resp.sendFile(fullpath);
})

app.get("/news", function (req, resp) {
    let dirName = __dirname;
    let fullpath = dirName + "/Public/news.html";
    resp.sendFile(fullpath);
});

app.post("/subscribe", (req, res) => {
    var email = String(getRequestValue(req, "email")).trim();

    if (!emailRegex.test(email)) {
        return res.status(400).json({ ok: false, message: "Invalid email" });
    }

    if (isExampleEmail(email)) {
        return res.status(400).json({ ok: false, message: "Example email is not allowed" });
    }

    return res.json({ ok: true, message: "Thanks For Subscribe Rudraksh Creation" });
});

app.post("/enquiry", async function (req, res) {
    var fullName = String(getRequestValue(req, ["fullName", "name"])).trim();
    var email = String(getRequestValue(req, "email")).trim();
    var phone = String(getRequestValue(req, ["phone", "mobile", "phoneNo"])).trim();
    var address = String(getRequestValue(req, "address")).trim();
    var message = String(getRequestValue(req, "message")).trim();
    var source = String(getRequestValue(req, "source")).trim().toLowerCase();
    var robotValidation = validateRobotCheck(req);

    if (!robotValidation.ok) {
        return res.status(400).json({ ok: false, message: robotValidation.message });
    }

    try {
        await enquiries.createEnquiry({
            fullName: fullName,
            email: email,
            phone: phone,
            address: address,
            message: message,
            source: source,
        });

        return res.json({ ok: true, message: "Enquiry submitted successfully." });
    } catch (error) {
        if (error && error.statusCode === 400) {
            return res.status(400).json({ ok: false, message: error.message });
        }

        console.error(error);
        return res.status(500).json({ ok: false, message: "Unable to submit enquiry right now." });
    }
});

app.listen(1502, () => {
    console.log("Server running on port 1502");
});

db.query("SELECT 1")
    .then(function () {
        console.log("Connected to DB");
        return enquiries.ensureEnquiriesTable();
    })
    .catch(function (error) {
        var code = error && error.code ? " (" + error.code + ")" : "";
        var message = error && error.message ? error.message : "Unknown database error.";
        console.error("Database connection failed" + code + ": " + message);
    });

app.all("/do-signup-email", async function (req, resp) {
    var email = String(getRequestValue(req, ["email", "txtemail", "username"])).trim();
    var pwd = String(getRequestValue(req, ["pwd", "txtpwd", "password"]));

    if (!emailRegex.test(email)) {
        return resp.status(400).send("Invalid email");
    }

    if (isExampleEmail(email)) {
        return resp.status(400).send("Example email is not allowed");
    }

    if (!pwd) {
        return resp.status(400).send("Password is required");
    }

    try {
        await db.query("insert into users values(?,?)", [email, pwd]);
        return resp.send("Successfully");
    } catch (error) {
        return resp.status(500).send(error.message);
    }
});

// Legacy endpoint kept for old pages using GET login.
app.all("/do-login-email", async function (req, resp) {
    var email = String(getRequestValue(req, ["email", "tlemail", "username"])).trim();
    var pwd = String(getRequestValue(req, ["pwd", "tlpwd", "password"]));

    if (!emailRegex.test(email) || !pwd) {
        return resp.send("Invalid Email or Password");
    }

    try {
        var result = await db.query("select email from users where email=? and pass=? limit 1", [email, pwd]);
        var rows = result[0] || [];
        if (rows.length > 0) {
            return resp.send("Login successfully");
        }
        return resp.send("Invalid Email or Password");
    } catch (error) {
        return resp.status(500).send(error.message);
    }
});

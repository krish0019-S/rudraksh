$(function () {
    var TOKEN_KEY = "rc_admin_token";
    var TOKEN_EXP_KEY = "rc_admin_token_exp";

    var loginModalEl = document.getElementById("adminLoginModal");
    var resetModalEl = document.getElementById("adminResetModal");
    var newsFormModalEl = document.getElementById("newsFormModal");
    var sidebar = $("#adminSidebar");
    var sidebarMenuToggle = $("#sidebarMenuToggle");
    var sidebarPasswordLink = $("#sidebarPasswordLink");
    var loginError = $("#adminLoginError");
    var resetError = $("#adminResetError");
    var resetHint = $("#resetTokenHint");
    var preloaderEl = document.getElementById("adminPreloader");
    var loaderBarEl = document.getElementById("adminLoaderBar");
    var loaderPercentEl = document.getElementById("adminLoaderPercent");

    var bannerGrid = $("#bannerGrid");
    var addCarouselBtn = $("#addCarouselBtn");
    var addCarouselInput = $("#addCarouselInput");

    var navViewLinks = $(".nav-link[data-admin-view]");
    var dashboardSection = $("#dashboardSection");
    var bannersSection = $("#bannersSection");
    var enquiriesSection = $("#enquiriesSection");
    var newsSection = $("#newsSection");
    var imagesSection = $("#imagesSection");
    var videosSection = $("#videosSection");
    var dashboardTotalProjects = $("#dashboardTotalProjects");
    var dashboardEndedProjects = $("#dashboardEndedProjects");
    var dashboardPhotoFolders = $("#dashboardPhotoFolders");
    var dashboardVideoFolders = $("#dashboardVideoFolders");
    var dashboardEnquiryQueue = $("#dashboardEnquiryQueue");
    var dashboardNewsCount = $("#dashboardNewsCount");
    var dashboardAnalyticsBars = $("#dashboardAnalyticsBars");
    var dashboardAnalyticsScaleLabels = $(".analytics-level-scale span");
    var dashboardAnalyticsStats = $("#dashboardAnalyticsStats");
    var dashboardLiveClock = $("#dashboardLiveClock");
    var dashboardProgressRing = $("#dashboardProgressRing");
    var dashboardProjectProgressPercent = $("#dashboardProjectProgressPercent");
    var dashboardProjectProgressLabel = $("#dashboardProjectProgressLabel");
    var dashboardProgressDoneCount = $("#dashboardProgressDoneCount");
    var dashboardProgressActiveCount = $("#dashboardProgressActiveCount");
    var dashboardProgressPendingCount = $("#dashboardProgressPendingCount");
    var dashboardAdminAvatar = $("#dashboardAdminAvatar");
    var dashboardAdminName = $("#dashboardAdminName");
    var dashboardAdminEmail = $("#dashboardAdminEmail");
    var enquiryListWrap = $("#enquiryListWrap");
    var newsForm = $("#newsForm");
    var newsIdInput = $("#newsIdInput");
    var newsTitleInput = $("#newsTitleInput");
    var newsContentInput = $("#newsContentInput");
    var newsContentCounter = $("#newsContentCounter");
    var newsImageFileInput = $("#newsImageFileInput");
    var newsSubmitBtn = $("#newsSubmitBtn");
    var newsCancelBtn = $("#newsCancelBtn");
    var addNewsBtn = $("#addNewsBtn");
    var newsFormModalLabel = $("#newsFormModalLabel");
    var newsListWrap = $("#newsListWrap");
    var refreshNewsBtn = $("#refreshNewsBtn");
    var toggleNewsPauseBtn = $("#toggleNewsPauseBtn");
    var newsPauseStatus = $("#newsPauseStatus");
    var galleryImageGrid = $("#galleryImageGrid");
    var galleryFolderCardGrid = $("#galleryFolderCardGrid");
    var addGalleryImagesBtn = $("#addGalleryImagesBtn");
    var addGalleryImagesInput = $("#addGalleryImagesInput");
    var activeGalleryFolderBadge = $("#activeGalleryFolderBadge");
    var showAllGalleryFoldersBtn = $("#showAllGalleryFoldersBtn");
    var galleryFolderSequenceWrap = $("#galleryFolderSequenceWrap");
    var galleryFolderSequenceSelect = $("#galleryFolderSequenceSelect");
    var changeGalleryFolderSequenceBtn = $("#changeGalleryFolderSequenceBtn");
    var createGalleryFolderBtn = $("#createGalleryFolderBtn");
    var deleteGalleryFolderBtn = $("#deleteGalleryFolderBtn");
    var newGalleryFolderName = $("#newGalleryFolderName");
    var videoFileGrid = $("#videoFileGrid");
    var videoFolderCardGrid = $("#videoFolderCardGrid");
    var addGalleryVideosBtn = $("#addGalleryVideosBtn");
    var addGalleryVideosInput = $("#addGalleryVideosInput");
    var activeVideoFolderBadge = $("#activeVideoFolderBadge");
    var videoFolderSequenceWrap = $("#videoFolderSequenceWrap");
    var videoFolderSequenceSelect = $("#videoFolderSequenceSelect");
    var changeVideoFolderSequenceBtn = $("#changeVideoFolderSequenceBtn");
    var createVideoFolderBtn = $("#createVideoFolderBtn");
    var deleteVideoFolderBtn = $("#deleteVideoFolderBtn");
    var newVideoFolderName = $("#newVideoFolderName");
    var refreshEnquiriesBtn = $("#refreshEnquiriesBtn");
    var currentNewsItems = [];
    var newsScrollPaused = false;
    var currentView = "dashboard";
    var currentGalleryFolder = "";
    var showOnlySelectedGalleryFolder = false;
    var currentGalleryFolderOrder = [];
    var currentVideoFolder = "";
    var currentVideoFolderOrder = [];
    var dashboardMetrics = {
        banners: 0,
        enquiries: 0,
        imageFolders: 0,
        videoFolders: 0,
        newsItems: 0,
    };
    var dashboardClockTimer = null;
    var NEWS_GALLERY_FOLDER = "news";
    var NEWS_CONTENT_MAX_LENGTH = 1210;

    var currentBanners = [];
    var mobileSidebarQuery = window.matchMedia ? window.matchMedia("(max-width: 992px)") : null;

    var loginModal = null;
    var resetModal = null;
    var newsFormModal = null;
    if (loginModalEl) {
        loginModal = new bootstrap.Modal(loginModalEl, {
            backdrop: "static",
            keyboard: false,
        });
    }
    if (resetModalEl) {
        resetModal = new bootstrap.Modal(resetModalEl, {
            backdrop: "static",
            keyboard: false,
        });
    }
    if (newsFormModalEl) {
        newsFormModal = new bootstrap.Modal(newsFormModalEl, {
            backdrop: "static",
            keyboard: true,
        });
    }

    // Simulates startup progress for 2-3 seconds and reveals the app shell smoothly.
    var runAdminBootAnimation = function () {
        var bodyEl = document.body;
        if (!bodyEl) {
            return;
        }

        var finishWithoutPreloader = function () {
            bodyEl.classList.remove("is-loading");
            bodyEl.classList.add("is-ready");
        };

        if (!preloaderEl || !loaderBarEl || !loaderPercentEl) {
            finishWithoutPreloader();
            return;
        }

        var progress = 0;
        var startedAt = Date.now();
        var minDurationMs = 2200 + Math.floor(Math.random() * 700);
        var pageLoaded = document.readyState === "complete";
        var isDone = false;
        var progressTimer = null;

        var setProgress = function (nextValue) {
            progress = Math.max(0, Math.min(100, Math.round(nextValue)));
            loaderBarEl.style.width = String(progress) + "%";
            loaderPercentEl.textContent = String(progress);
        };

        var completePreloader = function (force) {
            var elapsed = Date.now() - startedAt;
            if (!force && (!pageLoaded || elapsed < minDurationMs || progress < 100)) {
                return;
            }
            if (isDone) {
                return;
            }

            isDone = true;
            if (progressTimer) {
                window.clearInterval(progressTimer);
            }

            setProgress(100);
            preloaderEl.classList.add("is-hidden");
            bodyEl.classList.remove("is-loading");
            bodyEl.classList.add("is-ready");

            window.setTimeout(function () {
                if (preloaderEl && preloaderEl.parentNode) {
                    preloaderEl.parentNode.removeChild(preloaderEl);
                }
            }, 700);
        };

        progressTimer = window.setInterval(function () {
            var elapsed = Date.now() - startedAt;

            if (!pageLoaded) {
                setProgress(progress + (Math.random() * 5 + 1.2));
                if (progress > 92) {
                    setProgress(92);
                }
            } else if (elapsed < minDurationMs) {
                setProgress(progress + (Math.random() * 3 + 0.8));
                if (progress > 96) {
                    setProgress(96);
                }
            } else {
                setProgress(progress + (Math.random() * 10 + 4));
            }

            completePreloader(false);
        }, 90);

        window.addEventListener("load", function () {
            pageLoaded = true;
            completePreloader(false);
        }, { once: true });

        // Fallbacks keep loader from hanging if any external asset is slow.
        window.setTimeout(function () {
            pageLoaded = true;
            completePreloader(false);
        }, 3200);

        window.setTimeout(function () {
            completePreloader(true);
        }, 5000);
    };

    var showAlert = function (message, type) {
        var alertBox = $("#alertBox");
        alertBox.removeClass("d-none alert-success alert-danger").addClass("alert-" + type);
        alertBox.text(message);
    };

    var looksLikeEmail = function (value) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim().toLowerCase());
    };

    var parseJwtPayload = function (token) {
        var parts = String(token || "").split(".");
        if (parts.length < 2) {
            return null;
        }

        try {
            var base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
            while (base64.length % 4 !== 0) {
                base64 += "=";
            }
            var decoded = window.atob(base64);
            return JSON.parse(decoded);
        } catch (error) {
            return null;
        }
    };

    var buildAdminDisplayName = function (email) {
        var normalized = String(email || "").trim().toLowerCase();
        if (!looksLikeEmail(normalized)) {
            return "Admin";
        }
        return normalized;
    };

    var buildAdminAvatar = function (email) {
        var normalized = String(email || "").trim().toLowerCase();
        if (!looksLikeEmail(normalized)) {
            return "AD";
        }

        var localPart = (normalized.split("@")[0] || "").replace(/[^a-z0-9]/gi, "");
        if (localPart.length >= 2) {
            return localPart.slice(0, 2).toUpperCase();
        }
        if (localPart.length === 1) {
            return (localPart + "A").toUpperCase();
        }
        return "AD";
    };

    var setAdminIdentity = function (email) {
        var normalized = String(email || "").trim().toLowerCase();
        if (!looksLikeEmail(normalized)) {
            dashboardAdminName.text("Admin");
            dashboardAdminEmail.text("-");
            dashboardAdminAvatar.text("AD");
            return;
        }

        dashboardAdminName.text(buildAdminDisplayName(normalized));
        dashboardAdminEmail.text(normalized);
        dashboardAdminAvatar.text(buildAdminAvatar(normalized));
    };

    var getAdminEmailFromToken = function () {
        var token = localStorage.getItem(TOKEN_KEY);
        var payload = parseJwtPayload(token);
        var email = String(
            (payload && (payload.username || payload.email || payload.user || payload.sub)) || ""
        ).trim().toLowerCase();

        return looksLikeEmail(email) ? email : "";
    };

    var refreshAdminIdentity = function () {
        var email = getAdminEmailFromToken();
        if (!email) {
            var loginEmail = String($("#tlemail").val() || "").trim().toLowerCase();
            if (looksLikeEmail(loginEmail)) {
                email = loginEmail;
            }
        }
        if (email) {
            setAdminIdentity(email);
            return;
        }
        setAdminIdentity("");
    };

    var clearAuth = function () {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(TOKEN_EXP_KEY);
        refreshAdminIdentity();
    };

    var tokenValid = function () {
        var token = localStorage.getItem(TOKEN_KEY);
        var exp = Number(localStorage.getItem(TOKEN_EXP_KEY) || 0);
        if (!token) {
            return false;
        }
        if (Date.now() > exp) {
            clearAuth();
            return false;
        }
        return true;
    };

    var ensureAuth = function () {
        if (tokenValid()) {
            return true;
        }
        if (loginModal) {
            loginModal.show();
        }
        return false;
    };

    var getAuthHeaders = function () {
        return {
            Authorization: "Bearer " + localStorage.getItem(TOKEN_KEY),
        };
    };

    var renderEmptyState = function (message) {
        bannerGrid.html(
            '<div class="col-12"><div class="banner-empty-state">' +
                String(message || "No carousel slides found.") +
                "</div></div>"
        );
    };

    var renderEnquiryEmptyState = function (message) {
        enquiryListWrap.html(
            '<div class="banner-empty-state">' +
                String(message || "No enquiries found.") +
                "</div>"
        );
    };

    var renderNewsEmptyState = function (message) {
        newsListWrap.html(
            '<div class="banner-empty-state">' +
                String(message || "No news items found.") +
                "</div>"
        );
    };

    var renderGalleryImageEmptyState = function (message) {
        galleryImageGrid.html(
            '<div class="col-12"><div class="banner-empty-state">' +
                String(message || "No images found in folder.") +
                "</div></div>"
        );
    };

    var renderVideoFileEmptyState = function (message) {
        videoFileGrid.html(
            '<div class="col-12"><div class="banner-empty-state">' +
                String(message || "No videos found in folder.") +
                "</div></div>"
        );
    };

    var handleAuthError = function (xhr) {
        if (xhr && xhr.status === 401) {
            clearAuth();
            if (loginModal) {
                loginModal.show();
            }
            if (currentView === "dashboard") {
                resetDashboardMetrics();
            } else if (currentView === "enquiries") {
                renderEnquiryEmptyState("Login required to view enquiries.");
            } else if (currentView === "news") {
                setNewsPauseState(false);
                renderNewsEmptyState("Login required to manage news.");
            } else if (currentView === "images") {
                currentGalleryFolderOrder = [];
                galleryFolderCardGrid.html("");
                activeGalleryFolderBadge.text("Folder: -");
                showAllGalleryFoldersBtn.addClass("d-none");
                if (galleryFolderSequenceWrap.length) {
                    galleryFolderSequenceWrap.addClass("d-none");
                }
                galleryFolderSequenceSelect.html("");
                renderGalleryImageEmptyState("Login required to manage image folder.");
            } else if (currentView === "videos") {
                currentVideoFolderOrder = [];
                videoFolderCardGrid.html("");
                activeVideoFolderBadge.text("Folder: -");
                if (videoFolderSequenceWrap.length) {
                    videoFolderSequenceWrap.addClass("d-none");
                }
                videoFolderSequenceSelect.html("");
                renderVideoFileEmptyState("Login required to manage video folder.");
            } else {
                renderEmptyState("Login required to manage carousel slides.");
            }
            return true;
        }
        return false;
    };

    var bannerTitle = function (name) {
        var raw = String(name || "").toLowerCase();
        var suffix = raw.replace("banner", "");
        if (!suffix) {
            return "Banner";
        }
        return "Banner " + suffix;
    };

    var buildSequenceOptions = function (total, selected) {
        var options = "";
        for (var i = 1; i <= total; i += 1) {
            var selectedAttr = i === selected ? " selected" : "";
            options += '<option value="' + String(i) + '"' + selectedAttr + ">" + String(i) + "</option>";
        }
        return options;
    };

    var buildCardHtml = function (banner, cacheBust, sequence, total) {
        var name = String((banner && banner.name) || "");
        var path = String((banner && banner.path) || ("/uploads/" + name));
        var title = bannerTitle(name);
        var previewUrl = path + "?v=" + cacheBust;
        var sequenceOptions = buildSequenceOptions(total, sequence);

        return (
            '<div class="col-md-6 col-xl-4">' +
                '<div class="banner-card" data-banner="' + name + '">' +
                    '<div class="banner-preview">' +
                        '<img src="' + previewUrl + '" alt="' + title + '">' +
                        "<span>" + title + "</span>" +
                    "</div>" +
                    '<div class="banner-form">' +
                        '<input class="form-control banner-file-input" type="file" accept="image/jpeg,image/png">' +
                        '<div class="sequence-row">' +
                            '<label class="form-label mb-1">Sequence</label>' +
                            '<div class="sequence-controls">' +
                                '<select class="form-select form-select-sm banner-sequence-select">' +
                                    sequenceOptions +
                                "</select>" +
                                '<button class="btn btn-outline-secondary btn-sm btn-sequence" type="button">Change Sequence</button>' +
                            "</div>" +
                        "</div>" +
                        '<div class="banner-actions">' +
                            '<button class="btn btn-primary btn-update" type="button">Update</button>' +
                            '<button class="btn btn-outline-danger btn-remove" type="button">Remove</button>' +
                        "</div>" +
                        '<small class="text-muted">Only JPG/PNG. Max 5MB.<br>Any image size allowed (auto-fit in slider)</small>' +
                    "</div>" +
                "</div>" +
            "</div>"
        );
    };

    var renderBanners = function (banners) {
        if (!Array.isArray(banners) || !banners.length) {
            currentBanners = [];
            renderEmptyState("No carousel slides available. Click \"Add New Carousel\" to create one.");
            return;
        }

        currentBanners = banners.slice();
        var cacheBust = Date.now();
        var cards = banners.map(function (banner, index) {
            return buildCardHtml(banner, cacheBust, index + 1, currentBanners.length);
        }).join("");
        bannerGrid.html(cards);
    };

    var loadBanners = function () {
        if (!tokenValid()) {
            renderEmptyState("Login required to manage carousel slides.");
            return;
        }

        $.ajax({
            url: "/admin/carousel",
            method: "GET",
            headers: getAuthHeaders(),
            success: function (response) {
                renderBanners((response && response.banners) || []);
            },
            error: function (xhr) {
                if (handleAuthError(xhr)) {
                    return;
                }
                var msg = "Unable to load carousel slides.";
                if (xhr.responseJSON && xhr.responseJSON.message) {
                    msg = xhr.responseJSON.message;
                }
                renderEmptyState(msg);
                showAlert(msg, "danger");
            },
        });
    };

    var escapeHtml = function (text) {
        return String(text == null ? "" : text)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    };

    var normalizeNewsUrl = function (value) {
        var raw = String(value || "").trim();
        if (!raw) {
            return "";
        }
        if (raw.charAt(0) === "/") {
            return raw;
        }
        if (!/^https?:\/\//i.test(raw)) {
            return "";
        }
        try {
            var parsed = new URL(raw);
            if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
                return "";
            }
            return parsed.toString();
        } catch (error) {
            return "";
        }
    };

    var ensureNewsGalleryFolder = function () {
        return $.ajax({
            url: "/admin/gallery-folders",
            method: "POST",
            headers: getAuthHeaders(),
            contentType: "application/json",
            data: JSON.stringify({
                folderName: NEWS_GALLERY_FOLDER,
            }),
        });
    };

    var uploadNewsImageToGallery = function (file) {
        var formData = new FormData();
        formData.append("folder", NEWS_GALLERY_FOLDER);
        formData.append("images", file);

        return $.ajax({
            url: "/admin/gallery-images",
            method: "POST",
            data: formData,
            processData: false,
            contentType: false,
            headers: getAuthHeaders(),
        });
    };

    var updateNewsContentCounter = function () {
        if (!newsContentCounter.length) {
            return;
        }
        var currentLength = String(newsContentInput.val() || "").length;
        var maxLength = Number(newsContentInput.attr("maxlength")) || NEWS_CONTENT_MAX_LENGTH;
        newsContentCounter.text(String(currentLength) + "/" + String(maxLength) + " characters");
    };

    var formatDateTime = function (value) {
        if (!value) {
            return "-";
        }
        var date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return escapeHtml(value);
        }
        return date.toLocaleString("en-IN", {
            year: "numeric",
            month: "short",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    var formatDateTimeParts = function (value) {
        if (!value) {
            return {
                date: "-",
                time: "-",
            };
        }

        var date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return {
                date: String(value),
                time: "-",
            };
        }

        return {
            date: date.toLocaleDateString("en-IN", {
                year: "numeric",
                month: "short",
                day: "2-digit",
            }),
            time: date.toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
            }),
        };
    };

    var formatAddressPreview = function (value) {
        var normalized = String(value == null ? "" : value).trim().replace(/\s+/g, " ");
        if (!normalized) {
            return {
                full: "-",
                preview: "-",
                truncated: false,
            };
        }

        var words = normalized.split(" ");
        if (words.length <= 2) {
            return {
                full: normalized,
                preview: normalized,
                truncated: false,
            };
        }

        return {
            full: normalized,
            preview: words.slice(0, 2).join(" ") + "...",
            truncated: true,
        };
    };

    var renderEnquiries = function (items) {
        if (!Array.isArray(items) || !items.length) {
            renderEnquiryEmptyState("No enquiries found yet.");
            return;
        }

        var rows = items.map(function (item, index) {
            var enquiryId = Number(item && item.id);
            var receivedParts = formatDateTimeParts(item && item.createdAt);
            var addressParts = formatAddressPreview(item && item.address);
            var addressTitle = addressParts.truncated ? (' title="' + escapeHtml(addressParts.full) + '"') : "";
            var deleteAction = "-";
            if (Number.isInteger(enquiryId) && enquiryId > 0) {
                deleteAction =
                    '<button class="btn btn-outline-danger btn-sm btn-enquiry-delete enquiry-delete-icon-btn" type="button" data-enquiry-id="' +
                    String(enquiryId) +
                    '" aria-label="Delete enquiry" title="Delete enquiry">' +
                    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
                        '<path d="M4 7h16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path>' +
                        '<path d="M10 3h4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path>' +
                        '<path d="M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"></path>' +
                        '<path d="M10 11v6M14 11v6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path>' +
                    "</svg>" +
                    "</button>";
            }
            return (
                "<tr>" +
                    '<td class="text-nowrap" data-label="#">' + String(index + 1) + "</td>" +
                    '<td data-label="Name">' + escapeHtml(item.fullName) + "</td>" +
                    '<td class="text-nowrap" data-label="Phone">' + escapeHtml(item.phone) + "</td>" +
                    '<td data-label="Email">' + escapeHtml(item.email) + "</td>" +
                    '<td class="enquiry-address-cell" data-label="Address"><div class="enquiry-address-text"' + addressTitle + ">" + escapeHtml(addressParts.preview) + "</div></td>" +
                    '<td class="enquiry-message-cell" data-label="Message"><div class="enquiry-message-text">' + escapeHtml(item.message) + "</div></td>" +
                    '<td class="text-nowrap enquiry-received-cell" data-label="Received">' +
                        '<span class="enquiry-received-date">' + escapeHtml(receivedParts.date) + "</span>" +
                        '<span class="enquiry-received-time">' + escapeHtml(receivedParts.time) + "</span>" +
                    "</td>" +
                    '<td class="text-nowrap enquiry-actions-cell" data-label="Action">' + deleteAction + "</td>" +
                "</tr>"
            );
        }).join("");

        enquiryListWrap.html(
            '<div class="table-responsive enquiry-table-wrap">' +
                '<table class="table table-hover align-middle enquiry-table">' +
                    "<thead>" +
                        "<tr>" +
                            "<th>#</th>" +
                            "<th>Name</th>" +
                            "<th>Phone</th>" +
                            "<th>Email</th>" +
                            "<th>Address</th>" +
                            "<th>Message</th>" +
                            "<th>Received</th>" +
                            "<th>Action</th>" +
                        "</tr>" +
                    "</thead>" +
                    "<tbody>" + rows + "</tbody>" +
                "</table>" +
            "</div>"
        );
    };

    var loadEnquiries = function () {
        if (!tokenValid()) {
            renderEnquiryEmptyState("Login required to view enquiries.");
            return;
        }

        $.ajax({
            url: "/admin/enquiries",
            method: "GET",
            headers: getAuthHeaders(),
            success: function (response) {
                renderEnquiries((response && response.enquiries) || []);
            },
            error: function (xhr) {
                if (handleAuthError(xhr)) {
                    return;
                }
                var msg = "Unable to load enquiries.";
                if (xhr.responseJSON && xhr.responseJSON.message) {
                    msg = xhr.responseJSON.message;
                }
                renderEnquiryEmptyState(msg);
                showAlert(msg, "danger");
            },
        });
    };

    var setNewsFormMode = function (editing) {
        if (editing) {
            newsSubmitBtn.text("Update News");
            newsCancelBtn.removeClass("d-none");
            newsFormModalLabel.text("Edit News");
            return;
        }
        newsSubmitBtn.text("Add News");
        newsCancelBtn.addClass("d-none");
        newsFormModalLabel.text("Add News");
    };

    var resetNewsForm = function () {
        newsIdInput.val("");
        newsTitleInput.val("");
        newsContentInput.val("");
        newsImageFileInput.val("");
        updateNewsContentCounter();
        setNewsFormMode(false);
    };

    var openNewsFormModal = function () {
        if (!newsFormModal) {
            return;
        }
        newsFormModal.show();
        window.setTimeout(function () {
            newsTitleInput.trigger("focus");
        }, 120);
    };

    var closeNewsFormModal = function () {
        if (!newsFormModal) {
            return;
        }
        newsFormModal.hide();
    };

    var setNewsPauseState = function (paused) {
        newsScrollPaused = paused === true;
        newsPauseStatus.text("Scroll: " + (newsScrollPaused ? "Paused" : "Running"));
        toggleNewsPauseBtn.text(newsScrollPaused ? "Resume Scroll" : "Pause Scroll");
    };

    var renderNewsItems = function (items) {
        var rows = Array.isArray(items) ? items : [];
        currentNewsItems = rows.slice();

        if (!rows.length) {
            renderNewsEmptyState("No news items found yet.");
            return;
        }

        var cards = rows.map(function (item, index) {
            var newsId = Number(item && item.id);
            if (!Number.isInteger(newsId) || newsId <= 0) {
                return "";
            }

            var title = escapeHtml(item && item.title);
            var content = escapeHtml(item && item.content);
            var imageUrl = normalizeNewsUrl(item && item.imageUrl);
            var contentLink = normalizeNewsUrl(item && item.contentLink);
            var linkUrl = contentLink || imageUrl;
            var linkText = linkUrl
                ? String(linkUrl).replace(/^https?:\/\//i, "")
                : "-";
            var dateParts = formatDateTimeParts(item && (item.updatedAt || item.createdAt));
            var imageHtml = imageUrl
                ? (
                    '<div class="news-item-media">' +
                        '<div class="news-item-image-link news-item-image-static">' +
                            '<img class="news-item-image" src="' + escapeHtml(imageUrl) + '" alt="' + title + ' image" loading="lazy">' +
                        "</div>" +
                    "</div>"
                )
                : '<div class="news-item-media news-item-media-empty"><span class="news-item-image-empty">No image</span></div>';

            var linkHtml = linkUrl
                ? (
                    '<a class="news-item-link-text" href="' + escapeHtml(linkUrl) + '" target="_blank" rel="noopener noreferrer" title="' + escapeHtml(linkUrl) + '">' +
                        escapeHtml(linkText) +
                    "</a>"
                )
                : '<span class="news-item-link-text news-item-link-empty">-</span>';

            return (
                '<article class="news-item-card" data-news-id="' + String(newsId) + '">' +
                    '<div class="news-item-col news-item-col-sno" data-label="S. No.">' + String(index + 1) + ".</div>" +
                    '<div class="news-item-col news-item-col-news" data-label="News">' +
                        '<h3 class="news-item-title">' + title + "</h3>" +
                        '<p class="news-item-content">' + content + "</p>" +
                    "</div>" +
                    '<div class="news-item-col news-item-col-link" data-label="Link">' +
                        linkHtml +
                        imageHtml +
                    "</div>" +
                    '<div class="news-item-col news-item-col-date" data-label="Date/Time">' +
                        '<span class="news-item-date">' + escapeHtml(dateParts.date) + "</span>" +
                        '<span class="news-item-time">' + escapeHtml(dateParts.time) + "</span>" +
                    "</div>" +
                    '<div class="news-item-col news-item-col-actions" data-label="Action">' +
                        '<div class="news-item-actions">' +
                            '<button class="btn btn-outline-primary btn-sm btn-news-edit" type="button" data-news-id="' + String(newsId) + '">Edit</button>' +
                            '<button class="btn btn-outline-danger btn-sm btn-news-delete" type="button" data-news-id="' + String(newsId) + '">Delete</button>' +
                        "</div>" +
                    "</div>" +
                "</article>"
            );
        }).join("");

        var head =
            '<div class="news-list-head">' +
                "<span>S. No.</span>" +
                "<span>News</span>" +
                "<span>Link</span>" +
                "<span>Date/Time</span>" +
                "<span>Action</span>" +
            "</div>";

        if (!cards) {
            renderNewsEmptyState("No news items found yet.");
            return;
        }

        newsListWrap.html(head + cards);
    };

    var loadNewsItems = function () {
        if (!tokenValid()) {
            setNewsPauseState(false);
            renderNewsEmptyState("Login required to manage news.");
            return;
        }

        $.ajax({
            url: "/admin/news-items",
            method: "GET",
            headers: getAuthHeaders(),
            success: function (response) {
                setNewsPauseState(Boolean(response && response.paused));
                renderNewsItems((response && response.items) || []);
            },
            error: function (xhr) {
                if (handleAuthError(xhr)) {
                    return;
                }
                var msg = "Unable to load news items.";
                if (xhr.responseJSON && xhr.responseJSON.message) {
                    msg = xhr.responseJSON.message;
                }
                renderNewsEmptyState(msg);
                showAlert(msg, "danger");
            },
        });
    };

    var formatBytes = function (value) {
        var bytes = Number(value || 0);
        if (!Number.isFinite(bytes) || bytes <= 0) {
            return "0 KB";
        }
        if (bytes < 1024) {
            return String(bytes) + " B";
        }
        if (bytes < 1024 * 1024) {
            return (bytes / 1024).toFixed(1) + " KB";
        }
        return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    };

    var normalizeFolderName = function (value) {
        var normalized = String(value || "")
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9_-]+/g, "-")
            .replace(/^-+|-+$/g, "");
        if (!/^[a-z0-9][a-z0-9_-]{0,39}$/.test(normalized)) {
            return "";
        }
        return normalized;
    };

    var updateActiveGalleryFolderBadge = function () {
        if (!activeGalleryFolderBadge.length) {
            return;
        }

        if (!currentGalleryFolder) {
            activeGalleryFolderBadge.text("Folder: -");
            return;
        }

        activeGalleryFolderBadge.text("Folder: " + currentGalleryFolder);
    };

    var setGalleryFolderSequenceControls = function (folderNames, selectedFolder) {
        if (!galleryFolderSequenceWrap.length || !galleryFolderSequenceSelect.length) {
            return;
        }

        var names = Array.isArray(folderNames) ? folderNames.slice() : [];
        var selected = normalizeFolderName(selectedFolder);
        var selectedIndex = names.indexOf(selected);

        if (!selected || selectedIndex === -1 || names.length <= 1) {
            galleryFolderSequenceWrap.addClass("d-none");
            galleryFolderSequenceSelect.html("");
            return;
        }

        galleryFolderSequenceSelect.html(buildSequenceOptions(names.length, selectedIndex + 1));
        galleryFolderSequenceWrap.removeClass("d-none");
    };

    var renderGalleryFolderCards = function (folders, preferredFolder) {
        var list = Array.isArray(folders) ? folders : [];
        if (!list.length) {
            currentGalleryFolder = "";
            showOnlySelectedGalleryFolder = false;
            currentGalleryFolderOrder = [];
            updateActiveGalleryFolderBadge();
            setGalleryFolderSequenceControls([], "");
            if (showAllGalleryFoldersBtn.length) {
                showAllGalleryFoldersBtn.addClass("d-none");
            }
            galleryFolderCardGrid.html(
                '<div class="col-12"><div class="banner-empty-state">No folders found.</div></div>'
            );
            return false;
        }

        var normalizedCards = list.map(function (item) {
            var name = normalizeFolderName(item && item.name);
            return {
                name: name,
                imageCount: Number(item && item.imageCount) || 0,
                coverPath: String((item && item.coverPath) || ""),
            };
        }).filter(function (item) {
            return Boolean(item.name);
        });

        if (!normalizedCards.length) {
            currentGalleryFolder = "";
            showOnlySelectedGalleryFolder = false;
            currentGalleryFolderOrder = [];
            updateActiveGalleryFolderBadge();
            setGalleryFolderSequenceControls([], "");
            if (showAllGalleryFoldersBtn.length) {
                showAllGalleryFoldersBtn.addClass("d-none");
            }
            galleryFolderCardGrid.html(
                '<div class="col-12"><div class="banner-empty-state">No folders found.</div></div>'
            );
            return false;
        }

        var selected = normalizeFolderName(preferredFolder);
        var exists = normalizedCards.some(function (item) {
            return item.name === selected;
        });
        if (!selected || !exists) {
            selected = "";
        }

        currentGalleryFolderOrder = normalizedCards.map(function (item) {
            return item.name;
        });
        currentGalleryFolder = selected;
        updateActiveGalleryFolderBadge();
        setGalleryFolderSequenceControls(currentGalleryFolderOrder, selected);

        var cardsToRender = normalizedCards;
        if (showOnlySelectedGalleryFolder && selected) {
            cardsToRender = normalizedCards.filter(function (item) {
                return item.name === selected;
            });
            if (!cardsToRender.length) {
                showOnlySelectedGalleryFolder = false;
                cardsToRender = normalizedCards;
            }
        } else {
            showOnlySelectedGalleryFolder = false;
        }

        if (showAllGalleryFoldersBtn.length) {
            showAllGalleryFoldersBtn.toggleClass("d-none", !(showOnlySelectedGalleryFolder && Boolean(selected)));
        }

        var cardsHtml = cardsToRender.map(function (item) {
            var activeClass = item.name === selected ? " is-active" : "";
            var coverMarkup = item.coverPath
                ? '<img src="' + item.coverPath + '" alt="' + escapeHtml(item.name) + ' cover">'
                : '<span class="gallery-folder-placeholder">No Image</span>';

            return (
                '<div class="col-sm-6 col-md-4 col-xl-3">' +
                    '<button class="gallery-folder-card' + activeClass + '" type="button" data-folder-name="' + item.name + '">' +
                        '<span class="gallery-folder-cover">' + coverMarkup + "</span>" +
                        '<span class="gallery-folder-info">' +
                            '<span class="gallery-folder-name">' + escapeHtml(item.name) + "</span>" +
                            '<span class="gallery-folder-count">' + String(item.imageCount) + " image(s)</span>" +
                        "</span>" +
                    "</button>" +
                "</div>"
            );
        }).join("");

        galleryFolderCardGrid.html(cardsHtml);
        return true;
    };

    var loadGalleryFolderCards = function (preferredFolder) {
        if (!tokenValid()) {
            currentGalleryFolderOrder = [];
            setGalleryFolderSequenceControls([], "");
            renderGalleryImageEmptyState("Login required to manage image folder.");
            return;
        }

        $.ajax({
            url: "/admin/gallery-folder-cards",
            method: "GET",
            headers: getAuthHeaders(),
            success: function (response) {
                var folders = (response && response.folders) || [];
                var targetFolder = preferredFolder || currentGalleryFolder;
                var hasFolder = renderGalleryFolderCards(folders, targetFolder);
                if (hasFolder && currentGalleryFolder) {
                    loadGalleryImages();
                } else {
                    renderGalleryImageEmptyState("No folder selected.");
                }
            },
            error: function (xhr) {
                if (handleAuthError(xhr)) {
                    return;
                }
                var msg = "Unable to load folder list.";
                if (xhr.responseJSON && xhr.responseJSON.message) {
                    msg = xhr.responseJSON.message;
                }
                showAlert(msg, "danger");
                galleryFolderCardGrid.html(
                    '<div class="col-12"><div class="banner-empty-state">' + escapeHtml(msg) + "</div></div>"
                );
                currentGalleryFolderOrder = [];
                setGalleryFolderSequenceControls([], "");
                renderGalleryImageEmptyState(msg);
            },
        });
    };

    var renderGalleryImages = function (items) {
        if (!Array.isArray(items) || !items.length) {
            renderGalleryImageEmptyState("No images found in /images/gallery/" + currentGalleryFolder + ".");
            return;
        }

        var cacheBust = Date.now();
        var cards = items.map(function (item) {
            var fileName = String((item && item.name) || "");
            if (!fileName) {
                return "";
            }
            var imagePath = String((item && item.path) || "");
            var sizeText = formatBytes(item && item.size);
            var createdAt = formatDateTime(item && item.createdAt);

            return (
                '<div class="col-sm-6 col-lg-4 col-xl-3">' +
                    '<article class="gallery-image-card" data-file-name="' + fileName + '">' +
                        '<div class="gallery-image-preview">' +
                            '<img src="' + imagePath + "?v=" + cacheBust + '" alt="' + escapeHtml(fileName) + '">' +
                        "</div>" +
                        '<div class="gallery-image-body">' +
                            '<p class="gallery-image-name" title="' + escapeHtml(fileName) + '">' + escapeHtml(fileName) + "</p>" +
                            '<p class="gallery-image-meta">' + escapeHtml(createdAt) + " | " + escapeHtml(sizeText) + "</p>" +
                            '<button class="btn btn-outline-danger btn-sm btn-gallery-remove" type="button" data-file-name="' + fileName + '">Delete</button>' +
                        "</div>" +
                    "</article>" +
                "</div>"
            );
        }).join("");

        galleryImageGrid.html(cards || '<div class="col-12"><div class="banner-empty-state">No images found in /images/gallery.</div></div>');
    };

    var loadGalleryImages = function () {
        if (!tokenValid()) {
            renderGalleryImageEmptyState("Login required to manage image folder.");
            return;
        }
        var folderName = normalizeFolderName(currentGalleryFolder);
        if (!folderName) {
            updateActiveGalleryFolderBadge();
            renderGalleryImageEmptyState("No folder selected.");
            return;
        }

        currentGalleryFolder = folderName;
        updateActiveGalleryFolderBadge();

        $.ajax({
            url: "/admin/gallery-images?folder=" + encodeURIComponent(folderName),
            method: "GET",
            headers: getAuthHeaders(),
            success: function (response) {
                var serverFolder = normalizeFolderName(response && response.folder);
                if (serverFolder) {
                    currentGalleryFolder = serverFolder;
                }
                updateActiveGalleryFolderBadge();
                renderGalleryImages((response && response.images) || []);
            },
            error: function (xhr) {
                if (handleAuthError(xhr)) {
                    return;
                }
                var msg = "Unable to load image folder.";
                if (xhr.responseJSON && xhr.responseJSON.message) {
                    msg = xhr.responseJSON.message;
                }
                renderGalleryImageEmptyState(msg);
                showAlert(msg, "danger");
            },
        });
    };

    var updateActiveVideoFolderBadge = function () {
        if (!activeVideoFolderBadge.length) {
            return;
        }

        if (!currentVideoFolder) {
            activeVideoFolderBadge.text("Folder: -");
            return;
        }

        activeVideoFolderBadge.text("Folder: " + currentVideoFolder);
    };

    var setVideoFolderSequenceControls = function (folderNames, selectedFolder) {
        if (!videoFolderSequenceWrap.length || !videoFolderSequenceSelect.length) {
            return;
        }

        var names = Array.isArray(folderNames) ? folderNames.slice() : [];
        var selected = normalizeFolderName(selectedFolder);
        var selectedIndex = names.indexOf(selected);

        if (!selected || selectedIndex === -1 || names.length <= 1) {
            videoFolderSequenceWrap.addClass("d-none");
            videoFolderSequenceSelect.html("");
            return;
        }

        videoFolderSequenceSelect.html(buildSequenceOptions(names.length, selectedIndex + 1));
        videoFolderSequenceWrap.removeClass("d-none");
    };

    var renderVideoFolderCards = function (folders, preferredFolder) {
        var list = Array.isArray(folders) ? folders : [];
        if (!list.length) {
            currentVideoFolder = "";
            currentVideoFolderOrder = [];
            updateActiveVideoFolderBadge();
            setVideoFolderSequenceControls([], "");
            videoFolderCardGrid.html(
                '<div class="col-12"><div class="banner-empty-state">No folders found.</div></div>'
            );
            return false;
        }

        var normalizedCards = list.map(function (item) {
            var name = normalizeFolderName(item && item.name);
            return {
                name: name,
                videoCount: Number(item && item.videoCount) || 0,
                coverPath: String((item && item.coverPath) || ""),
            };
        }).filter(function (item) {
            return Boolean(item.name);
        });

        if (!normalizedCards.length) {
            currentVideoFolder = "";
            currentVideoFolderOrder = [];
            updateActiveVideoFolderBadge();
            setVideoFolderSequenceControls([], "");
            videoFolderCardGrid.html(
                '<div class="col-12"><div class="banner-empty-state">No folders found.</div></div>'
            );
            return false;
        }

        var selected = normalizeFolderName(preferredFolder);
        var exists = normalizedCards.some(function (item) {
            return item.name === selected;
        });
        if (!selected || !exists) {
            selected = normalizedCards[0].name;
        }

        currentVideoFolder = selected;
        currentVideoFolderOrder = normalizedCards.map(function (item) {
            return item.name;
        });
        updateActiveVideoFolderBadge();
        setVideoFolderSequenceControls(currentVideoFolderOrder, selected);

        var cardsHtml = normalizedCards.map(function (item) {
            var activeClass = item.name === selected ? " is-active" : "";
            var coverMarkup = item.coverPath
                ? '<video src="' + item.coverPath + '" muted playsinline preload="metadata"></video>'
                : '<span class="gallery-folder-placeholder">No Video</span>';

            return (
                '<div class="col-sm-6 col-md-4 col-xl-3">' +
                    '<button class="gallery-folder-card gallery-folder-card-video' + activeClass + '" type="button" data-folder-name="' + item.name + '">' +
                        '<span class="gallery-folder-cover gallery-folder-cover-video">' + coverMarkup + "</span>" +
                        '<span class="gallery-folder-info">' +
                            '<span class="gallery-folder-name">' + escapeHtml(item.name) + "</span>" +
                            '<span class="gallery-folder-count">' + String(item.videoCount) + " video(s)</span>" +
                        "</span>" +
                    "</button>" +
                "</div>"
            );
        }).join("");

        videoFolderCardGrid.html(cardsHtml);
        return true;
    };

    var loadVideoFolderCards = function (preferredFolder) {
        if (!tokenValid()) {
            currentVideoFolderOrder = [];
            setVideoFolderSequenceControls([], "");
            renderVideoFileEmptyState("Login required to manage video folder.");
            return;
        }

        $.ajax({
            url: "/admin/video-folder-cards",
            method: "GET",
            headers: getAuthHeaders(),
            success: function (response) {
                var folders = (response && response.folders) || [];
                var targetFolder = preferredFolder || currentVideoFolder;
                var hasFolder = renderVideoFolderCards(folders, targetFolder);
                if (hasFolder) {
                    loadVideoFiles();
                } else {
                    renderVideoFileEmptyState("No folder selected.");
                }
            },
            error: function (xhr) {
                if (handleAuthError(xhr)) {
                    return;
                }
                var msg = "Unable to load video folder list.";
                if (xhr.responseJSON && xhr.responseJSON.message) {
                    msg = xhr.responseJSON.message;
                }
                showAlert(msg, "danger");
                videoFolderCardGrid.html(
                    '<div class="col-12"><div class="banner-empty-state">' + escapeHtml(msg) + "</div></div>"
                );
                currentVideoFolderOrder = [];
                setVideoFolderSequenceControls([], "");
                renderVideoFileEmptyState(msg);
            },
        });
    };

    var renderVideoFiles = function (items) {
        if (!Array.isArray(items) || !items.length) {
            renderVideoFileEmptyState("No videos found in /videos/gallery/" + currentVideoFolder + ".");
            return;
        }

        var cacheBust = Date.now();
        var cards = items.map(function (item) {
            var fileName = String((item && item.name) || "");
            if (!fileName) {
                return "";
            }
            var videoPath = String((item && item.path) || "");
            var sizeText = formatBytes(item && item.size);
            var createdAt = formatDateTime(item && item.createdAt);
            var previewPath = videoPath + "?v=" + cacheBust;

            return (
                '<div class="col-sm-6 col-lg-4 col-xl-3">' +
                    '<article class="gallery-image-card" data-video-name="' + fileName + '">' +
                        '<div class="gallery-image-preview gallery-video-preview">' +
                            '<video src="' + previewPath + '" controls preload="metadata" playsinline></video>' +
                        "</div>" +
                        '<div class="gallery-image-body">' +
                            '<p class="gallery-image-name" title="' + escapeHtml(fileName) + '">' + escapeHtml(fileName) + "</p>" +
                            '<p class="gallery-image-meta">' + escapeHtml(createdAt) + " | " + escapeHtml(sizeText) + "</p>" +
                            '<button class="btn btn-outline-danger btn-sm btn-video-remove" type="button" data-file-name="' + fileName + '">Delete</button>' +
                        "</div>" +
                    "</article>" +
                "</div>"
            );
        }).join("");

        videoFileGrid.html(cards || '<div class="col-12"><div class="banner-empty-state">No videos found in /videos/gallery.</div></div>');
    };

    var loadVideoFiles = function () {
        if (!tokenValid()) {
            renderVideoFileEmptyState("Login required to manage video folder.");
            return;
        }
        var folderName = normalizeFolderName(currentVideoFolder);
        if (!folderName) {
            updateActiveVideoFolderBadge();
            renderVideoFileEmptyState("No folder selected.");
            return;
        }

        currentVideoFolder = folderName;
        updateActiveVideoFolderBadge();

        $.ajax({
            url: "/admin/video-files?folder=" + encodeURIComponent(folderName),
            method: "GET",
            headers: getAuthHeaders(),
            success: function (response) {
                var serverFolder = normalizeFolderName(response && response.folder);
                if (serverFolder) {
                    currentVideoFolder = serverFolder;
                }
                updateActiveVideoFolderBadge();
                renderVideoFiles((response && response.videos) || []);
            },
            error: function (xhr) {
                if (handleAuthError(xhr)) {
                    return;
                }
                var msg = "Unable to load video folder.";
                if (xhr.responseJSON && xhr.responseJSON.message) {
                    msg = xhr.responseJSON.message;
                }
                renderVideoFileEmptyState(msg);
                showAlert(msg, "danger");
            },
        });
    };

    var renderDashboardMetrics = function () {
        var photoFolders = Number(dashboardMetrics.imageFolders || 0);
        var videoFolders = Number(dashboardMetrics.videoFolders || 0);
        var running = photoFolders + videoFolders;
        var sliderRecords = Number(dashboardMetrics.banners || 0);
        var enquiryQueue = Number(dashboardMetrics.enquiries || 0);
        var newsRecords = Number(dashboardMetrics.newsItems || 0);
        var total = sliderRecords + running + enquiryQueue;
        var totalShareBase = total > 0 ? total : 0;

        var analyticsItems = [
            {
                key: "slider",
                value: sliderRecords,
                className: "solid",
                shortLabel: "Slider",
                fullLabel: "Slider Records",
                ratio: totalShareBase > 0 ? sliderRecords / totalShareBase : 0,
            },
            {
                key: "folders",
                value: running,
                className: "mid",
                shortLabel: "Folders",
                fullLabel: "Photo and video folders",
                ratio: totalShareBase > 0 ? running / totalShareBase : 0,
            },
            {
                key: "enquiry",
                value: enquiryQueue,
                className: "striped",
                shortLabel: "Enquiry",
                fullLabel: "From enquiry queue",
                ratio: totalShareBase > 0 ? enquiryQueue / totalShareBase : 0,
            },
        ];

        var maxMetricValue = analyticsItems.reduce(function (maxValue, item) {
            var value = Number(item && item.value);
            if (!Number.isFinite(value) || value < 0) {
                return maxValue;
            }
            return value > maxValue ? value : maxValue;
        }, 0);

        var scaleMax = 100;
        if (maxMetricValue > 0) {
            var magnitude = Math.pow(10, Math.floor(Math.log10(maxMetricValue)));
            var normalized = maxMetricValue / magnitude;
            var niceNormalized = 10;

            if (normalized <= 1) {
                niceNormalized = 1;
            } else if (normalized <= 2) {
                niceNormalized = 2;
            } else if (normalized <= 5) {
                niceNormalized = 5;
            }

            scaleMax = Math.max(1, niceNormalized * magnitude);
        }

        if (dashboardAnalyticsScaleLabels.length >= 5) {
            var formatScaleTick = function (value) {
                var normalizedValue = Math.round(Number(value || 0) * 10) / 10;
                if (Math.abs(normalizedValue - Math.round(normalizedValue)) < 0.001) {
                    return String(Math.round(normalizedValue));
                }
                return normalizedValue.toFixed(1);
            };

            var scaleValues = [scaleMax, scaleMax * 0.75, scaleMax * 0.5, scaleMax * 0.25, 0];
            dashboardAnalyticsScaleLabels.each(function (index) {
                if (index < scaleValues.length) {
                    $(this).text(formatScaleTick(scaleValues[index]));
                }
            });
        }

        if (dashboardAnalyticsBars.length) {
            var barsHtml = analyticsItems.map(function (item) {
                var barRatio = scaleMax > 0 ? Number(item && item.value) / scaleMax : 0;
                if (!Number.isFinite(barRatio) || barRatio < 0) {
                    barRatio = 0;
                }
                if (barRatio > 1) {
                    barRatio = 1;
                }

                var heightPct = item.value > 0 ? Math.max(20, Math.round(barRatio * 100)) : 12;
                var levelPct = barRatio * 100;
                var levelPctText = levelPct.toFixed(1).replace(/\.0$/, "");

                return (
                    '<div class="analytics-bar-col analytics-bar-col-metric" title="' + escapeHtml(item.fullLabel) + ": " + String(item.value) + " (" + levelPctText + '%)">' +
                        '<span class="analytics-value">' + String(item.value) + "</span>" +
                        '<span class="analytics-bar ' + item.className + '" style="--h: ' + String(heightPct) + '%"></span>' +
                        "<small>" + escapeHtml(item.shortLabel) + "</small>" +
                        '<span class="analytics-percent">' + levelPctText + '%</span>' +
                    "</div>"
                );
            }).join("");

            dashboardAnalyticsBars.html(barsHtml);
        }

        if (dashboardAnalyticsStats.length) {
            var statsHtml = analyticsItems.map(function (item) {
                var ratio = Number(item && item.ratio);
                if (!Number.isFinite(ratio) || ratio < 0) {
                    ratio = 0;
                }
                if (ratio > 1) {
                    ratio = 1;
                }

                var pctText = (ratio * 100).toFixed(1).replace(/\.0$/, "");

                return (
                    '<div class="analytics-stat-row">' +
                        '<span class="analytics-stat-label"><i class="analytics-stat-dot ' +
                            item.className +
                            '"></i>' +
                            escapeHtml(item.shortLabel) +
                        "</span>" +
                        '<strong class="analytics-stat-value">' + pctText + "%</strong>" +
                    "</div>"
                );
            }).join("");

            dashboardAnalyticsStats.html(statsHtml);
        }

        dashboardTotalProjects.text(String(total));
        dashboardEndedProjects.text(String(sliderRecords));
        dashboardPhotoFolders.text(String(photoFolders));
        dashboardVideoFolders.text(String(videoFolders));
        dashboardEnquiryQueue.text(String(enquiryQueue));
        dashboardNewsCount.text(String(newsRecords));

        var progressTotal = sliderRecords + running + enquiryQueue;
        var doneRatio = progressTotal > 0 ? sliderRecords / progressTotal : 0;
        var activeRatio = progressTotal > 0 ? running / progressTotal : 0;
        var pendingRatio = progressTotal > 0 ? enquiryQueue / progressTotal : 0;
        var donePct = doneRatio * 100;
        var activePct = activeRatio * 100;
        var pendingPct = progressTotal > 0 ? Math.max(0, 100 - donePct - activePct) : 100;
        var overallPct = Math.round((doneRatio * 1 + activeRatio * 0.6 + pendingRatio * 0.15) * 100);

        if (dashboardProgressRing.length) {
            dashboardProgressRing.css("--done", donePct.toFixed(2));
            dashboardProgressRing.css("--active", activePct.toFixed(2));
            dashboardProgressRing.css("--pending", pendingPct.toFixed(2));
            dashboardProgressRing.attr(
                "aria-label",
                "Project progress " +
                String(overallPct) +
                "%, Slider " +
                String(sliderRecords) +
                ", Folders " +
                String(running) +
                ", Enquiries " +
                String(enquiryQueue)
            );
        }
        if (dashboardProjectProgressPercent.length) {
            dashboardProjectProgressPercent.text(String(overallPct) + "%");
        }
        if (dashboardProjectProgressLabel.length) {
            dashboardProjectProgressLabel.text(progressTotal > 0 ? "Overall project completion" : "No project data yet");
        }
        if (dashboardProgressDoneCount.length) {
            dashboardProgressDoneCount.text(String(sliderRecords));
        }
        if (dashboardProgressActiveCount.length) {
            dashboardProgressActiveCount.text(String(running));
        }
        if (dashboardProgressPendingCount.length) {
            dashboardProgressPendingCount.text(String(enquiryQueue));
        }
    };

    var resetDashboardMetrics = function () {
        dashboardMetrics = {
            banners: 0,
            enquiries: 0,
            imageFolders: 0,
            videoFolders: 0,
            newsItems: 0,
        };
        renderDashboardMetrics();
    };

    var loadDashboardMetrics = function () {
        resetDashboardMetrics();
        if (!tokenValid()) {
            return;
        }

        $.ajax({
            url: "/admin/carousel",
            method: "GET",
            headers: getAuthHeaders(),
            success: function (response) {
                dashboardMetrics.banners = Array.isArray(response && response.banners) ? response.banners.length : 0;
                renderDashboardMetrics();
            },
            error: function (xhr) {
                handleAuthError(xhr);
            },
        });

        $.ajax({
            url: "/admin/enquiries",
            method: "GET",
            headers: getAuthHeaders(),
            success: function (response) {
                dashboardMetrics.enquiries = Array.isArray(response && response.enquiries) ? response.enquiries.length : 0;
                renderDashboardMetrics();
            },
            error: function (xhr) {
                handleAuthError(xhr);
            },
        });

        $.ajax({
            url: "/admin/gallery-folder-cards",
            method: "GET",
            headers: getAuthHeaders(),
            success: function (response) {
                dashboardMetrics.imageFolders = Array.isArray(response && response.folders) ? response.folders.length : 0;
                renderDashboardMetrics();
            },
            error: function (xhr) {
                handleAuthError(xhr);
            },
        });

        $.ajax({
            url: "/admin/video-folder-cards",
            method: "GET",
            headers: getAuthHeaders(),
            success: function (response) {
                dashboardMetrics.videoFolders = Array.isArray(response && response.folders) ? response.folders.length : 0;
                renderDashboardMetrics();
            },
            error: function (xhr) {
                handleAuthError(xhr);
            },
        });

        $.ajax({
            url: "/admin/news-items",
            method: "GET",
            headers: getAuthHeaders(),
            success: function (response) {
                dashboardMetrics.newsItems = Array.isArray(response && response.items) ? response.items.length : 0;
                renderDashboardMetrics();
            },
            error: function (xhr) {
                handleAuthError(xhr);
            },
        });
    };

    var startDashboardClock = function () {
        if (!dashboardLiveClock.length) {
            return;
        }
        if (dashboardClockTimer) {
            window.clearInterval(dashboardClockTimer);
        }

        var updateClock = function () {
            var now = new Date();
            var hh = String(now.getHours()).padStart(2, "0");
            var mm = String(now.getMinutes()).padStart(2, "0");
            var ss = String(now.getSeconds()).padStart(2, "0");
            dashboardLiveClock.text(hh + ":" + mm + ":" + ss);
        };

        updateClock();
        dashboardClockTimer = window.setInterval(updateClock, 1000);
    };

    var updateViewQuery = function (view) {
        if (!window.history || !window.history.replaceState) {
            return;
        }
        var url = new URL(window.location.href);
        if (view === "dashboard") {
            url.searchParams.delete("view");
        } else if (view === "banners" || view === "enquiries" || view === "news" || view === "images" || view === "videos") {
            url.searchParams.set("view", view);
        } else {
            url.searchParams.delete("view");
        }
        window.history.replaceState(null, "", url.pathname + url.search);
    };

    var isMobileSidebar = function () {
        if (mobileSidebarQuery) {
            return mobileSidebarQuery.matches;
        }
        return window.innerWidth <= 992;
    };

    var closeSidebarMenu = function () {
        sidebar.removeClass("is-open");
        sidebarMenuToggle.attr("aria-expanded", "false");
    };

    var toggleSidebarMenu = function (forceOpen) {
        if (!isMobileSidebar()) {
            closeSidebarMenu();
            return;
        }
        var shouldOpen = typeof forceOpen === "boolean"
            ? forceOpen
            : !sidebar.hasClass("is-open");
        sidebar.toggleClass("is-open", shouldOpen);
        sidebarMenuToggle.attr("aria-expanded", shouldOpen ? "true" : "false");
    };

    var setView = function (view, syncUrl) {
        var normalized = "dashboard";
        if (view === "dashboard" || view === "banners" || view === "enquiries" || view === "news" || view === "images" || view === "videos") {
            normalized = view;
        }
        currentView = normalized;

        navViewLinks.removeClass("active");
        navViewLinks.filter("[data-admin-view='" + normalized + "']").addClass("active");

        dashboardSection.toggleClass("d-none", normalized !== "dashboard");
        bannersSection.toggleClass("d-none", normalized !== "banners");
        enquiriesSection.toggleClass("d-none", normalized !== "enquiries");
        newsSection.toggleClass("d-none", normalized !== "news");
        imagesSection.toggleClass("d-none", normalized !== "images");
        videosSection.toggleClass("d-none", normalized !== "videos");

        if (syncUrl) {
            updateViewQuery(normalized);
        }

        if (normalized === "dashboard") {
            loadDashboardMetrics();
        } else if (normalized === "enquiries") {
            loadEnquiries();
        } else if (normalized === "news") {
            loadNewsItems();
        } else if (normalized === "images") {
            loadGalleryFolderCards(currentGalleryFolder);
        } else if (normalized === "videos") {
            loadVideoFolderCards(currentVideoFolder);
        } else {
            loadBanners();
        }
    };

    var getInitialView = function () {
        try {
            var url = new URL(window.location.href);
            var view = String(url.searchParams.get("view") || "");
            if (view === "dashboard" || view === "banners" || view === "enquiries" || view === "news" || view === "images" || view === "videos") {
                return view;
            }
        } catch (error) {
            // Ignore URL parsing failures and fallback.
        }
        return "dashboard";
    };

    runAdminBootAnimation();
    startDashboardClock();
    refreshAdminIdentity();
    ensureAuth();
    setView(getInitialView(), false);
    closeSidebarMenu();

    sidebarMenuToggle.on("click", function () {
        toggleSidebarMenu();
    });

    $(window).on("resize", function () {
        if (!isMobileSidebar()) {
            closeSidebarMenu();
        }
    });

    $(document).on("keydown", function (event) {
        if (event && event.key === "Escape") {
            closeSidebarMenu();
        }
    });

    navViewLinks.on("click", function (event) {
        event.preventDefault();
        var view = String($(this).data("adminView") || "");
        if (!view) {
            return;
        }
        setView(view, true);
        closeSidebarMenu();
    });

    $(".password-toggle").on("click", function () {
        var target = $(this).data("target");
        if (!target) {
            return;
        }
        var input = document.querySelector(target);
        if (!input) {
            return;
        }
        var makeVisible = input.type === "password";
        input.type = makeVisible ? "text" : "password";
        $(this).toggleClass("is-visible", makeVisible);
    });

    $("#forgotLink").on("click", function () {
        if (loginModal) {
            loginModal.hide();
        }
        if (resetModal) {
            resetModal.show();
        }
    });

    sidebarPasswordLink.on("click", function (event) {
        event.preventDefault();
        closeSidebarMenu();
        if (loginModal) {
            loginModal.hide();
        }
        if (resetModal) {
            resetModal.show();
        }
    });

    if (resetModalEl) {
        $(resetModalEl).on("hidden.bs.modal", function () {
            resetError.removeClass("is-visible");
            resetHint.text("");
            if (!tokenValid() && loginModal) {
                loginModal.show();
            }
        });
    }

    $("#adminLoginForm").on("submit", function (event) {
        event.preventDefault();
        var username = String($(this).find("input[name='email']").val() || "").trim();
        var password = String($(this).find("input[name='pwd']").val() || "");

        $.ajax({
            url: "/admin/login",
            method: "POST",
            contentType: "application/json",
            data: JSON.stringify({ username: username, password: password }),
            success: function (response) {
                if (response && response.token) {
                    localStorage.setItem(TOKEN_KEY, response.token);
                    var expiresInMs = Number(response.expiresIn || 1800) * 1000;
                    localStorage.setItem(TOKEN_EXP_KEY, String(Date.now() + expiresInMs));
                    refreshAdminIdentity();
                    if (loginModal) {
                        loginModal.hide();
                    }
                    loginError.removeClass("is-visible");
                    $("#adminLoginForm")[0].reset();
                    setView(currentView, false);
                    return;
                }

                loginError.addClass("is-visible");
            },
            error: function (xhr) {
                var msg = "Invalid email or password.";
                if (xhr.responseJSON && xhr.responseJSON.message) {
                    msg = xhr.responseJSON.message;
                }
                loginError.text(msg).addClass("is-visible");
            },
        });
    });

    $("#sendResetCode").on("click", function () {
        var email = $("#adminResetForm").find("input[name='email']").val().trim();
        resetError.removeClass("is-visible");
        resetHint.text("");

        $.ajax({
            url: "/admin/forgot-password",
            method: "POST",
            contentType: "application/json",
            data: JSON.stringify({ email: email }),
            success: function (response) {
                resetHint.text("Reset code sent to your email (valid 5 minutes).");
                showAlert(response.message || "Reset code sent.", "success");
            },
            error: function (xhr) {
                var msg = "Unable to generate reset code.";
                if (xhr.responseJSON && xhr.responseJSON.message) {
                    msg = xhr.responseJSON.message;
                }
                resetError.text(msg).addClass("is-visible");
            },
        });
    });

    $("#adminResetForm").on("submit", function (event) {
        event.preventDefault();
        resetError.removeClass("is-visible");

        var email = $(this).find("input[name='email']").val().trim();
        var token = $(this).find("input[name='token']").val().trim();
        var newPassword = $(this).find("input[name='newPassword']").val();

        $.ajax({
            url: "/admin/reset-password",
            method: "POST",
            contentType: "application/json",
            data: JSON.stringify({ email: email, token: token, newPassword: newPassword }),
            success: function (response) {
                showAlert(response.message || "Password updated.", "success");
                if (resetModal) {
                    resetModal.hide();
                }
                if (loginModal) {
                    loginModal.show();
                }
                $("#adminResetForm")[0].reset();
                resetHint.text("");
            },
            error: function (xhr) {
                var msg = "Unable to reset password.";
                if (xhr.responseJSON && xhr.responseJSON.message) {
                    msg = xhr.responseJSON.message;
                }
                resetError.text(msg).addClass("is-visible");
            },
        });
    });

    addCarouselBtn.on("click", function () {
        if (!ensureAuth()) {
            return;
        }
        addCarouselInput.val("");
        addCarouselInput.trigger("click");
    });

    addCarouselInput.on("change", function () {
        var files = this.files ? Array.from(this.files) : [];
        if (!files.length) {
            return;
        }
        if (!ensureAuth()) {
            return;
        }
        if (files.length > 5) {
            showAlert("Please select up to 5 slider images at one time.", "danger");
            return;
        }

        var formData = new FormData();
        files.forEach(function (file) {
            formData.append("banners", file);
        });

        $.ajax({
            url: "/admin/carousel",
            method: "POST",
            data: formData,
            processData: false,
            contentType: false,
            headers: getAuthHeaders(),
            success: function (response) {
                showAlert(response.message || "Carousel banner(s) added successfully.", "success");
                addCarouselInput.val("");
                loadBanners();
            },
            error: function (xhr) {
                if (handleAuthError(xhr)) {
                    return;
                }
                var msg = "Unable to add carousel banner.";
                if (xhr.responseJSON && xhr.responseJSON.message) {
                    msg = xhr.responseJSON.message;
                }
                showAlert(msg, "danger");
            },
        });
    });

    addGalleryImagesBtn.on("click", function () {
        if (!ensureAuth()) {
            return;
        }
        addGalleryImagesInput.val("");
        addGalleryImagesInput.trigger("click");
    });

    addGalleryImagesInput.on("change", function () {
        var files = this.files ? Array.from(this.files) : [];
        if (!files.length) {
            return;
        }
        if (!ensureAuth()) {
            return;
        }

        var folderName = normalizeFolderName(currentGalleryFolder);
        if (!folderName) {
            showAlert("Please select a valid folder.", "danger");
            return;
        }

        var formData = new FormData();
        formData.append("folder", folderName);
        files.forEach(function (file) {
            formData.append("images", file);
        });

        $.ajax({
            url: "/admin/gallery-images",
            method: "POST",
            data: formData,
            processData: false,
            contentType: false,
            headers: getAuthHeaders(),
            success: function (response) {
                showAlert(response.message || "Images uploaded successfully.", "success");
                addGalleryImagesInput.val("");
                var serverFolder = normalizeFolderName(response && response.folder);
                if (serverFolder) {
                    currentGalleryFolder = serverFolder;
                }
                loadGalleryFolderCards(currentGalleryFolder);
            },
            error: function (xhr) {
                if (handleAuthError(xhr)) {
                    return;
                }
                var msg = "Unable to upload images.";
                if (xhr.responseJSON && xhr.responseJSON.message) {
                    msg = xhr.responseJSON.message;
                }
                showAlert(msg, "danger");
            },
        });
    });

    galleryFolderCardGrid.on("click", ".gallery-folder-card", function () {
        var selected = normalizeFolderName($(this).data("folderName"));
        if (!selected) {
            showAlert("Invalid folder selected.", "danger");
            return;
        }
        currentGalleryFolder = selected;
        showOnlySelectedGalleryFolder = true;
        loadGalleryFolderCards(currentGalleryFolder);
    });

    showAllGalleryFoldersBtn.on("click", function () {
        showOnlySelectedGalleryFolder = false;
        loadGalleryFolderCards(currentGalleryFolder);
    });

    changeGalleryFolderSequenceBtn.on("click", function () {
        if (!ensureAuth()) {
            return;
        }

        var folderName = normalizeFolderName(currentGalleryFolder);
        var sequence = Number(galleryFolderSequenceSelect.val());

        if (!folderName || !Number.isInteger(sequence) || sequence < 1) {
            showAlert("Please select a valid folder and sequence.", "danger");
            return;
        }

        changeGalleryFolderSequenceBtn.prop("disabled", true);

        $.ajax({
            url: "/admin/gallery-folders/reorder",
            method: "POST",
            contentType: "application/json",
            headers: getAuthHeaders(),
            data: JSON.stringify({ folderName: folderName, sequence: sequence }),
            success: function (response) {
                var selectedFolder = normalizeFolderName(response && response.folderName) || folderName;
                currentGalleryFolder = selectedFolder;
                showAlert(response.message || "Folder sequence updated successfully.", "success");

                var cards = (response && response.cards) || [];
                var hasFolder = renderGalleryFolderCards(cards, selectedFolder);
                if (hasFolder && currentGalleryFolder) {
                    loadGalleryImages();
                } else {
                    renderGalleryImageEmptyState("No folder selected.");
                }
            },
            error: function (xhr) {
                if (handleAuthError(xhr)) {
                    return;
                }
                var msg = "Unable to update folder sequence.";
                if (xhr.responseJSON && xhr.responseJSON.message) {
                    msg = xhr.responseJSON.message;
                }
                showAlert(msg, "danger");
            },
            complete: function () {
                changeGalleryFolderSequenceBtn.prop("disabled", false);
            },
        });
    });

    changeVideoFolderSequenceBtn.on("click", function () {
        if (!ensureAuth()) {
            return;
        }

        var folderName = normalizeFolderName(currentVideoFolder);
        var sequence = Number(videoFolderSequenceSelect.val());

        if (!folderName || !Number.isInteger(sequence) || sequence < 1) {
            showAlert("Please select a valid folder and sequence.", "danger");
            return;
        }

        changeVideoFolderSequenceBtn.prop("disabled", true);

        $.ajax({
            url: "/admin/video-folders/reorder",
            method: "POST",
            contentType: "application/json",
            headers: getAuthHeaders(),
            data: JSON.stringify({ folderName: folderName, sequence: sequence }),
            success: function (response) {
                var selectedFolder = normalizeFolderName(response && response.folderName) || folderName;
                currentVideoFolder = selectedFolder;
                showAlert(response.message || "Video folder sequence updated successfully.", "success");

                var cards = (response && response.cards) || [];
                var hasFolder = renderVideoFolderCards(cards, selectedFolder);
                if (hasFolder && currentVideoFolder) {
                    loadVideoFiles();
                } else {
                    renderVideoFileEmptyState("No folder selected.");
                }
            },
            error: function (xhr) {
                if (handleAuthError(xhr)) {
                    return;
                }
                var msg = "Unable to update video folder sequence.";
                if (xhr.responseJSON && xhr.responseJSON.message) {
                    msg = xhr.responseJSON.message;
                }
                showAlert(msg, "danger");
            },
            complete: function () {
                changeVideoFolderSequenceBtn.prop("disabled", false);
            },
        });
    });

    addGalleryVideosBtn.on("click", function () {
        if (!ensureAuth()) {
            return;
        }
        addGalleryVideosInput.val("");
        addGalleryVideosInput.trigger("click");
    });

    addGalleryVideosInput.on("change", function () {
        var files = this.files ? Array.from(this.files) : [];
        if (!files.length) {
            return;
        }
        if (!ensureAuth()) {
            return;
        }

        var folderName = normalizeFolderName(currentVideoFolder);
        if (!folderName) {
            showAlert("Please select a valid folder.", "danger");
            return;
        }

        var formData = new FormData();
        formData.append("folder", folderName);
        files.forEach(function (file) {
            formData.append("videos", file);
        });

        $.ajax({
            url: "/admin/video-files",
            method: "POST",
            data: formData,
            processData: false,
            contentType: false,
            headers: getAuthHeaders(),
            success: function (response) {
                showAlert(response.message || "Videos uploaded successfully.", "success");
                addGalleryVideosInput.val("");
                var serverFolder = normalizeFolderName(response && response.folder);
                if (serverFolder) {
                    currentVideoFolder = serverFolder;
                }
                loadVideoFolderCards(currentVideoFolder);
            },
            error: function (xhr) {
                if (handleAuthError(xhr)) {
                    return;
                }
                var msg = "Unable to upload videos.";
                if (xhr.responseJSON && xhr.responseJSON.message) {
                    msg = xhr.responseJSON.message;
                }
                showAlert(msg, "danger");
            },
        });
    });

    videoFolderCardGrid.on("click", ".gallery-folder-card-video", function () {
        var selected = normalizeFolderName($(this).data("folderName"));
        if (!selected) {
            showAlert("Invalid folder selected.", "danger");
            return;
        }
        currentVideoFolder = selected;
        videoFolderCardGrid.find(".gallery-folder-card-video").removeClass("is-active");
        $(this).addClass("is-active");
        updateActiveVideoFolderBadge();
        setVideoFolderSequenceControls(currentVideoFolderOrder, selected);
        loadVideoFiles();
    });

    var createFolderAction = function () {
        if (!ensureAuth()) {
            return;
        }

        var rawName = String(newGalleryFolderName.val() || "");
        var folderName = normalizeFolderName(rawName);
        if (!folderName) {
            showAlert("Enter a valid folder name.", "danger");
            return;
        }

        createGalleryFolderBtn.prop("disabled", true);

        $.ajax({
            url: "/admin/gallery-folders",
            method: "POST",
            contentType: "application/json",
            headers: getAuthHeaders(),
            data: JSON.stringify({ folderName: folderName }),
            success: function (response) {
                var createdName = normalizeFolderName(response && response.folderName) || folderName;
                newGalleryFolderName.val("");
                showAlert(response.message || "Folder created successfully.", "success");
                loadGalleryFolderCards(createdName);
            },
            error: function (xhr) {
                if (handleAuthError(xhr)) {
                    return;
                }
                var msg = "Unable to create folder.";
                if (xhr.responseJSON && xhr.responseJSON.message) {
                    msg = xhr.responseJSON.message;
                }
                showAlert(msg, "danger");
            },
            complete: function () {
                createGalleryFolderBtn.prop("disabled", false);
            },
        });
    };

    createGalleryFolderBtn.on("click", createFolderAction);

    newGalleryFolderName.on("keydown", function (event) {
        if (event.key === "Enter") {
            event.preventDefault();
            createFolderAction();
        }
    });

    deleteGalleryFolderBtn.on("click", function () {
        if (!ensureAuth()) {
            return;
        }

        var folderName = normalizeFolderName(currentGalleryFolder);
        if (!folderName) {
            showAlert("Please select a valid folder.", "danger");
            return;
        }

        if (!window.confirm('Delete folder "' + folderName + '" and all images inside it?')) {
            return;
        }

        deleteGalleryFolderBtn.prop("disabled", true);

        $.ajax({
            url: "/admin/gallery-folders/" + encodeURIComponent(folderName),
            method: "DELETE",
            headers: getAuthHeaders(),
            success: function (response) {
                currentGalleryFolder = "";
                updateActiveGalleryFolderBadge();
                showAlert(response.message || "Folder deleted successfully.", "success");
                loadGalleryFolderCards("");
            },
            error: function (xhr) {
                if (handleAuthError(xhr)) {
                    return;
                }
                var msg = "Unable to delete folder.";
                if (xhr.responseJSON && xhr.responseJSON.message) {
                    msg = xhr.responseJSON.message;
                }
                showAlert(msg, "danger");
            },
            complete: function () {
                deleteGalleryFolderBtn.prop("disabled", false);
            },
        });
    });

    var createVideoFolderAction = function () {
        if (!ensureAuth()) {
            return;
        }

        var rawName = String(newVideoFolderName.val() || "");
        var folderName = normalizeFolderName(rawName);
        if (!folderName) {
            showAlert("Enter a valid folder name.", "danger");
            return;
        }

        createVideoFolderBtn.prop("disabled", true);

        $.ajax({
            url: "/admin/video-folders",
            method: "POST",
            contentType: "application/json",
            headers: getAuthHeaders(),
            data: JSON.stringify({ folderName: folderName }),
            success: function (response) {
                var createdName = normalizeFolderName(response && response.folderName) || folderName;
                newVideoFolderName.val("");
                showAlert(response.message || "Video folder created successfully.", "success");
                loadVideoFolderCards(createdName);
            },
            error: function (xhr) {
                if (handleAuthError(xhr)) {
                    return;
                }
                var msg = "Unable to create video folder.";
                if (xhr.responseJSON && xhr.responseJSON.message) {
                    msg = xhr.responseJSON.message;
                }
                showAlert(msg, "danger");
            },
            complete: function () {
                createVideoFolderBtn.prop("disabled", false);
            },
        });
    };

    createVideoFolderBtn.on("click", createVideoFolderAction);

    newVideoFolderName.on("keydown", function (event) {
        if (event.key === "Enter") {
            event.preventDefault();
            createVideoFolderAction();
        }
    });

    deleteVideoFolderBtn.on("click", function () {
        if (!ensureAuth()) {
            return;
        }

        var folderName = normalizeFolderName(currentVideoFolder);
        if (!folderName) {
            showAlert("Please select a valid folder.", "danger");
            return;
        }

        if (!window.confirm('Delete folder "' + folderName + '" and all videos inside it?')) {
            return;
        }

        deleteVideoFolderBtn.prop("disabled", true);

        $.ajax({
            url: "/admin/video-folders/" + encodeURIComponent(folderName),
            method: "DELETE",
            headers: getAuthHeaders(),
            success: function (response) {
                currentVideoFolder = "";
                updateActiveVideoFolderBadge();
                showAlert(response.message || "Video folder deleted successfully.", "success");
                loadVideoFolderCards("");
            },
            error: function (xhr) {
                if (handleAuthError(xhr)) {
                    return;
                }
                var msg = "Unable to delete video folder.";
                if (xhr.responseJSON && xhr.responseJSON.message) {
                    msg = xhr.responseJSON.message;
                }
                showAlert(msg, "danger");
            },
            complete: function () {
                deleteVideoFolderBtn.prop("disabled", false);
            },
        });
    });

    bannerGrid.on("change", ".banner-file-input", function () {
        var file = this.files && this.files[0];
        if (!file) {
            return;
        }

        var card = $(this).closest(".banner-card");
        var preview = card.find(".banner-preview img")[0];
        if (!preview) {
            return;
        }

        var reader = new FileReader();
        reader.onload = function (event) {
            preview.src = event.target.result;
        };
        reader.readAsDataURL(file);
    });

    bannerGrid.on("click", ".btn-update", function () {
        if (!ensureAuth()) {
            return;
        }

        var card = $(this).closest(".banner-card");
        var bannerName = String(card.data("banner") || "");
        var input = card.find(".banner-file-input")[0];
        if (!input || !input.files || !input.files.length) {
            showAlert("Please select a JPG/PNG image before updating.", "danger");
            return;
        }

        var formData = new FormData();
        formData.append("banner", input.files[0]);

        $.ajax({
            url: "/admin/update-banner/" + encodeURIComponent(bannerName),
            method: "POST",
            data: formData,
            processData: false,
            contentType: false,
            headers: getAuthHeaders(),
            success: function (response) {
                showAlert(response.message || "Banner updated successfully.", "success");
                var img = card.find(".banner-preview img");
                var cacheBust = Date.now();
                var path = (response && response.path) || ("/uploads/" + bannerName);
                img.attr("src", path + "?v=" + cacheBust);
                input.value = "";
            },
            error: function (xhr) {
                if (handleAuthError(xhr)) {
                    return;
                }
                var msg = "Upload failed. Please try again.";
                if (xhr.responseJSON && xhr.responseJSON.message) {
                    msg = xhr.responseJSON.message;
                }
                showAlert(msg, "danger");
            },
        });
    });

    bannerGrid.on("click", ".btn-sequence", function () {
        if (!ensureAuth()) {
            return;
        }

        var card = $(this).closest(".banner-card");
        var bannerName = String(card.data("banner") || "");
        var sequence = Number(card.find(".banner-sequence-select").val());

        if (!bannerName || !Number.isInteger(sequence) || sequence < 1) {
            showAlert("Please select a valid sequence number.", "danger");
            return;
        }

        $.ajax({
            url: "/admin/carousel/reorder",
            method: "POST",
            contentType: "application/json",
            headers: getAuthHeaders(),
            data: JSON.stringify({ bannerName: bannerName, sequence: sequence }),
            success: function (response) {
                showAlert(response.message || "Carousel sequence updated successfully.", "success");
                renderBanners((response && response.banners) || []);
            },
            error: function (xhr) {
                if (handleAuthError(xhr)) {
                    return;
                }
                var msg = "Unable to update sequence.";
                if (xhr.responseJSON && xhr.responseJSON.message) {
                    msg = xhr.responseJSON.message;
                }
                showAlert(msg, "danger");
            },
        });
    });

    bannerGrid.on("click", ".btn-remove", function () {
        if (!ensureAuth()) {
            return;
        }

        var card = $(this).closest(".banner-card");
        var bannerName = String(card.data("banner") || "");
        if (!bannerName) {
            return;
        }

        if (!window.confirm("Remove " + bannerTitle(bannerName) + " from carousel?")) {
            return;
        }

        $.ajax({
            url: "/admin/carousel/" + encodeURIComponent(bannerName),
            method: "DELETE",
            headers: getAuthHeaders(),
            success: function (response) {
                showAlert(response.message || "Carousel banner removed successfully.", "success");
                loadBanners();
            },
            error: function (xhr) {
                if (handleAuthError(xhr)) {
                    return;
                }
                var msg = "Unable to remove carousel banner.";
                if (xhr.responseJSON && xhr.responseJSON.message) {
                    msg = xhr.responseJSON.message;
                }
                showAlert(msg, "danger");
            },
        });
    });

    refreshEnquiriesBtn.on("click", function () {
        if (!ensureAuth()) {
            return;
        }
        loadEnquiries();
    });

    addNewsBtn.on("click", function () {
        if (!ensureAuth()) {
            return;
        }
        resetNewsForm();
        openNewsFormModal();
    });

    if (newsFormModalEl) {
        $(newsFormModalEl).on("hidden.bs.modal", function () {
            newsSubmitBtn.prop("disabled", false);
            newsCancelBtn.prop("disabled", false);
            resetNewsForm();
        });
    }

    refreshNewsBtn.on("click", function () {
        if (!ensureAuth()) {
            return;
        }
        loadNewsItems();
    });

    toggleNewsPauseBtn.on("click", function () {
        if (!ensureAuth()) {
            return;
        }

        var nextPaused = !newsScrollPaused;
        toggleNewsPauseBtn.prop("disabled", true);

        $.ajax({
            url: "/admin/news-scroll-state",
            method: "PUT",
            headers: getAuthHeaders(),
            contentType: "application/json",
            data: JSON.stringify({
                paused: nextPaused,
            }),
            success: function (response) {
                setNewsPauseState(Boolean(response && response.paused));
                showAlert(response.message || "News scroll state updated.", "success");
            },
            error: function (xhr) {
                if (handleAuthError(xhr)) {
                    return;
                }
                var msg = "Unable to update news scroll state.";
                if (xhr.responseJSON && xhr.responseJSON.message) {
                    msg = xhr.responseJSON.message;
                }
                showAlert(msg, "danger");
            },
            complete: function () {
                toggleNewsPauseBtn.prop("disabled", false);
            },
        });
    });

    newsCancelBtn.on("click", function () {
        resetNewsForm();
        closeNewsFormModal();
    });

    newsContentInput.on("input", updateNewsContentCounter);

    newsForm.on("submit", function (event) {
        event.preventDefault();
        if (!ensureAuth()) {
            return;
        }

        var newsId = Number(newsIdInput.val());
        var title = String(newsTitleInput.val() || "").trim();
        var content = String(newsContentInput.val() || "").trim();
        var editing = Number.isInteger(newsId) && newsId > 0;
        var currentItem = editing
            ? currentNewsItems.find(function (item) {
                return Number(item && item.id) === newsId;
            })
            : null;
        var existingImageUrl = normalizeNewsUrl(currentItem && currentItem.imageUrl);
        var imageFile = newsImageFileInput[0] && newsImageFileInput[0].files
            ? newsImageFileInput[0].files[0]
            : null;

        if (!title || !content) {
            showAlert("Title and content are required.", "danger");
            return;
        }

        var url = editing
            ? "/admin/news-items/" + encodeURIComponent(String(newsId))
            : "/admin/news-items";
        var method = editing ? "PUT" : "POST";

        var setFormBusy = function (busy) {
            newsSubmitBtn.prop("disabled", busy);
            newsCancelBtn.prop("disabled", busy);
        };

        var saveNewsItem = function (resolvedImageUrl) {
            $.ajax({
                url: url,
                method: method,
                headers: getAuthHeaders(),
                contentType: "application/json",
                data: JSON.stringify({
                    title: title,
                    content: content,
                    imageUrl: resolvedImageUrl,
                }),
                success: function (response) {
                    showAlert(response.message || (editing ? "News updated successfully." : "News added successfully."), "success");
                    resetNewsForm();
                    closeNewsFormModal();
                    if (response && typeof response.paused === "boolean") {
                        setNewsPauseState(Boolean(response.paused));
                    }
                    if (response && Array.isArray(response.items)) {
                        renderNewsItems(response.items);
                    } else {
                        loadNewsItems();
                    }
                },
                error: function (xhr) {
                    if (handleAuthError(xhr)) {
                        return;
                    }
                    var msg = editing ? "Unable to update news item." : "Unable to add news item.";
                    if (xhr.responseJSON && xhr.responseJSON.message) {
                        msg = xhr.responseJSON.message;
                    }
                    showAlert(msg, "danger");
                },
                complete: function () {
                    setFormBusy(false);
                },
            });
        };

        setFormBusy(true);

        if (!imageFile) {
            saveNewsItem(existingImageUrl);
            return;
        }

        ensureNewsGalleryFolder()
            .done(function () {
                uploadNewsImageToGallery(imageFile)
                    .done(function (response) {
                        var uploadedList = Array.isArray(response && response.uploaded) ? response.uploaded : [];
                        var uploadedPath = normalizeNewsUrl(uploadedList[0] && uploadedList[0].path);
                        if (!uploadedPath) {
                            showAlert("Image uploaded but path was invalid. Please try again.", "danger");
                            setFormBusy(false);
                            return;
                        }
                        saveNewsItem(uploadedPath);
                    })
                    .fail(function (xhr) {
                        if (handleAuthError(xhr)) {
                            setFormBusy(false);
                            return;
                        }
                        var msg = "Unable to upload image into gallery.";
                        if (xhr.responseJSON && xhr.responseJSON.message) {
                            msg = xhr.responseJSON.message;
                        }
                        showAlert(msg, "danger");
                        setFormBusy(false);
                    });
            })
            .fail(function (xhr) {
                if (handleAuthError(xhr)) {
                    setFormBusy(false);
                    return;
                }
                var msg = "Unable to prepare gallery folder.";
                if (xhr.responseJSON && xhr.responseJSON.message) {
                    msg = xhr.responseJSON.message;
                }
                showAlert(msg, "danger");
                setFormBusy(false);
            });
    });

    newsListWrap.on("click", ".btn-news-edit", function () {
        if (!ensureAuth()) {
            return;
        }

        var newsId = Number($(this).data("newsId"));
        if (!Number.isInteger(newsId) || newsId <= 0) {
            showAlert("Invalid news id.", "danger");
            return;
        }

        var targetItem = currentNewsItems.find(function (item) {
            return Number(item && item.id) === newsId;
        });

        if (!targetItem) {
            showAlert("News item not found.", "danger");
            return;
        }

        newsIdInput.val(String(newsId));
        newsTitleInput.val(String(targetItem.title || ""));
        newsContentInput.val(String(targetItem.content || ""));
        updateNewsContentCounter();
        setNewsFormMode(true);
        openNewsFormModal();
    });

    newsListWrap.on("click", ".btn-news-delete", function () {
        if (!ensureAuth()) {
            return;
        }

        var button = $(this);
        var newsId = Number(button.data("newsId"));
        if (!Number.isInteger(newsId) || newsId <= 0) {
            showAlert("Invalid news id.", "danger");
            return;
        }

        if (!window.confirm("Delete this news item permanently?")) {
            return;
        }

        button.prop("disabled", true);

        $.ajax({
            url: "/admin/news-items/" + encodeURIComponent(String(newsId)),
            method: "DELETE",
            headers: getAuthHeaders(),
            success: function (response) {
                    if (Number(newsIdInput.val()) === newsId) {
                    resetNewsForm();
                }
                if (response && typeof response.paused === "boolean") {
                    setNewsPauseState(Boolean(response.paused));
                }
                showAlert(response.message || "News item deleted successfully.", "success");
                if (response && Array.isArray(response.items)) {
                    renderNewsItems(response.items);
                } else {
                    loadNewsItems();
                }
            },
            error: function (xhr) {
                if (handleAuthError(xhr)) {
                    button.prop("disabled", false);
                    return;
                }
                var msg = "Unable to delete news item.";
                if (xhr.responseJSON && xhr.responseJSON.message) {
                    msg = xhr.responseJSON.message;
                }
                showAlert(msg, "danger");
                button.prop("disabled", false);
            },
        });
    });

    enquiryListWrap.on("click", ".btn-enquiry-delete", function () {
        if (!ensureAuth()) {
            return;
        }

        var button = $(this);
        var enquiryId = Number(button.data("enquiryId"));
        if (!Number.isInteger(enquiryId) || enquiryId <= 0) {
            showAlert("Invalid enquiry id.", "danger");
            return;
        }

        if (!window.confirm("Delete this enquiry permanently?")) {
            return;
        }

        button.prop("disabled", true);

        $.ajax({
            url: "/admin/enquiries/" + encodeURIComponent(String(enquiryId)),
            method: "DELETE",
            headers: getAuthHeaders(),
            success: function (response) {
                showAlert(response.message || "Enquiry deleted successfully.", "success");
                loadEnquiries();
            },
            error: function (xhr) {
                if (handleAuthError(xhr)) {
                    button.prop("disabled", false);
                    return;
                }
                var msg = "Unable to delete enquiry.";
                if (xhr.responseJSON && xhr.responseJSON.message) {
                    msg = xhr.responseJSON.message;
                }
                showAlert(msg, "danger");
                button.prop("disabled", false);
            },
        });
    });

    galleryImageGrid.on("click", ".btn-gallery-remove", function () {
        if (!ensureAuth()) {
            return;
        }

        var button = $(this);
        var fileName = String(button.data("fileName") || "").trim();
        var folderName = normalizeFolderName(currentGalleryFolder);
        if (!fileName) {
            showAlert("Invalid file name.", "danger");
            return;
        }
        if (!folderName) {
            showAlert("Please select a valid folder.", "danger");
            return;
        }

        if (!window.confirm("Delete this image from folder?")) {
            return;
        }

        button.prop("disabled", true);

        $.ajax({
            url: "/admin/gallery-images/" + encodeURIComponent(fileName) + "?folder=" + encodeURIComponent(folderName),
            method: "DELETE",
            headers: getAuthHeaders(),
            success: function (response) {
                var serverFolder = normalizeFolderName(response && response.folder);
                if (serverFolder) {
                    currentGalleryFolder = serverFolder;
                }
                showAlert(response.message || "Image removed successfully.", "success");
                loadGalleryFolderCards(currentGalleryFolder);
            },
            error: function (xhr) {
                if (handleAuthError(xhr)) {
                    button.prop("disabled", false);
                    return;
                }
                var msg = "Unable to remove image.";
                if (xhr.responseJSON && xhr.responseJSON.message) {
                    msg = xhr.responseJSON.message;
                }
                showAlert(msg, "danger");
                button.prop("disabled", false);
            },
        });
    });

    videoFileGrid.on("click", ".btn-video-remove", function () {
        if (!ensureAuth()) {
            return;
        }

        var button = $(this);
        var fileName = String(button.data("fileName") || "").trim();
        var folderName = normalizeFolderName(currentVideoFolder);
        if (!fileName) {
            showAlert("Invalid file name.", "danger");
            return;
        }
        if (!folderName) {
            showAlert("Please select a valid folder.", "danger");
            return;
        }

        if (!window.confirm("Delete this video from folder?")) {
            return;
        }

        button.prop("disabled", true);

        $.ajax({
            url: "/admin/video-files/" + encodeURIComponent(fileName) + "?folder=" + encodeURIComponent(folderName),
            method: "DELETE",
            headers: getAuthHeaders(),
            success: function (response) {
                var serverFolder = normalizeFolderName(response && response.folder);
                if (serverFolder) {
                    currentVideoFolder = serverFolder;
                }
                showAlert(response.message || "Video removed successfully.", "success");
                loadVideoFolderCards(currentVideoFolder);
            },
            error: function (xhr) {
                if (handleAuthError(xhr)) {
                    button.prop("disabled", false);
                    return;
                }
                var msg = "Unable to remove video.";
                if (xhr.responseJSON && xhr.responseJSON.message) {
                    msg = xhr.responseJSON.message;
                }
                showAlert(msg, "danger");
                button.prop("disabled", false);
            },
        });
    });

    $(".logout-btn").on("click", function (event) {
        if (event && typeof event.preventDefault === "function") {
            event.preventDefault();
        }
        closeSidebarMenu();
        clearAuth();
        currentGalleryFolder = "";
        showOnlySelectedGalleryFolder = false;
        currentGalleryFolderOrder = [];
        currentVideoFolder = "";
        currentVideoFolderOrder = [];
        currentNewsItems = [];
        newsScrollPaused = false;
        activeGalleryFolderBadge.text("Folder: -");
        showAllGalleryFoldersBtn.addClass("d-none");
        if (galleryFolderSequenceWrap.length) {
            galleryFolderSequenceWrap.addClass("d-none");
        }
        galleryFolderSequenceSelect.html("");
        galleryFolderCardGrid.html("");
        activeVideoFolderBadge.text("Folder: -");
        if (videoFolderSequenceWrap.length) {
            videoFolderSequenceWrap.addClass("d-none");
        }
        videoFolderSequenceSelect.html("");
        videoFolderCardGrid.html("");
        newGalleryFolderName.val("");
        newVideoFolderName.val("");
        resetNewsForm();
        closeNewsFormModal();
        setNewsPauseState(false);
        renderEmptyState("Login required to manage carousel slides.");
        renderEnquiryEmptyState("Login required to view enquiries.");
        renderNewsEmptyState("Login required to manage news.");
        renderGalleryImageEmptyState("Login required to manage image folder.");
        renderVideoFileEmptyState("Login required to manage video folder.");
        resetDashboardMetrics();
        showAlert("Logged out successfully.", "success");
        if (loginModal) {
            loginModal.show();
        }
    });
});

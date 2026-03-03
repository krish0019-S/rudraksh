# Image Upload & Replace System

Admin portal to replace homepage carousel banners using Node.js, Express, Multer, jQuery, and Bootstrap.

## Features
- Upload new banner images
- Overwrite existing files safely
- Live preview before upload
- AJAX upload with success/error messages
- Home page loads `/uploads/banner1.jpg`, `/uploads/banner2.jpg`, `/uploads/banner3.jpg`

## Project Structure
- `routes/`
- `middleware/`
- `Public/uploads/`
- `Public/admin/`
- `server.js`

## Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Run server:
   ```bash
   node server.js
   ```
3. Open:
   - Admin portal: `http://localhost:1502/admin`
   - Home page: `http://localhost:1502/home.html`

## JWT Admin Login
- Admin login uses the `users` table in MySQL (`email` + `pass`).
- Create users via signup endpoint/page, then login in admin portal with the same credentials.
- Token expiry: **30 minutes**
- Optional env: set `JWT_SECRET`, `DB_URL`.

## Forgot Password
- Use the **Forgot password** link in the admin modal.
- Generates a 6-digit reset code (valid for 5 minutes).
- Code is shown in the admin modal (for local use).
- Set a new password and login again.

## Upload Rules
- Only JPG/JPEG files
- Max size: 5MB

## API
- `POST /admin/update-banner/:bannerName`
  - `bannerName` must be `banner1`, `banner2`, or `banner3`
  - Form field: `banner` (file)

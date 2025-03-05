# Love Frontend

This repository contains the front-end portion of the **Love That Gives Back** platform—a React SPA built with Vite that lets guests explore charities, donate, and view live donation stats, while couples can manage their profile and supported charities.

---

## Project Overview

**Love That Gives Back** celebrates love by inspiring generosity. The frontend provides:

- **Home Page:**  
  A hero section, a dynamic countdown to the couple’s wedding, live charity statistics, and an “About the Couple” section displaying the bride and groom’s names, bio, and location.

- **User Interaction:**  
  Pages for donating, exploring charities, and profile management (login, logout, and editing profile details).

- **Admin & Dashboard:**  
  Sections for managing donations, charities, and overall analytics.

---

## Tech Stack

- **Framework:** React
- **Build Tool:** Vite
- **Routing:** React Router v6
- **HTTP Client:** Axios (with a custom axios instance)
- **Styling:** Bootstrap (or custom CSS)

---

## Development Process

1. **Setup & Structure:**  
   - Bootstrapped with Vite and React.
   - Developed a set of components (Home, Login, Logout, Profile, DonationForm, ExploreCharities, ManageCharities, EditCharity, PrivateRoute).
   - Centralized API calls with a custom axios instance that uses the environment variable `VITE_API_URL` to dynamically set the backend URL (with `/api` appended).

2. **Environment Configuration:**  
   - Environment variables (e.g., `VITE_API_URL`) are used to switch between local and production settings.
   - The axios instance ensures all API calls automatically use the proper backend endpoint.

3. **Client-side Routing:**  
   - React Router handles all navigation.
   - A fallback configuration is provided (via `static.json` and/or a post-build step that copies `index.html` to `404.html`) so that every route (e.g., `/login`, `/charities`) loads the SPA.

4. **Deployment on Render:**  
   - Deployed as a static site.
   - **Build Command:** `npm install && npm run build` (with a post-build step to generate a `404.html` fallback).
   - **Publish Directory:** Set to `dist` (the output directory from Vite).
   - Custom environment variables (like `VITE_API_URL`) are configured in Render’s dashboard.
   - Ensure that proper CORS and cookie settings are configured on the backend for cross-origin requests.

---

## Project Structure

```
love_frontend/
├── public/                 # Static assets (if any)
├── src/
│   ├── api/
│   │   └── axiosInstance.js   # Custom axios instance using VITE_API_URL
│   ├── components/
│   │   ├── Home.jsx           # Home page with hero, countdown, and stats
│   │   ├── Login.jsx          # Login form
│   │   ├── Logout.jsx         # Logout process
│   │   ├── Profile.jsx        # Edit/view couple profile
│   │   ├── DonationForm.jsx   # Donation form for guests
│   │   ├── ExploreCharities.jsx  # Browse charities page
│   │   ├── ManageCharities.jsx   # Admin interface to manage charities
│   │   ├── EditCharity.jsx         # Edit charity details
│   │   └── PrivateRoute.jsx    # Protects authenticated routes
│   ├── main.jsx              # App entry point
│   └── index.css             # Global styles
├── index.html                # Main HTML file
├── vite.config.js            # Vite configuration (output set to `dist`)
└── package.json              # Project configuration and scripts
```

---

## Available Scripts

- **`npm install`**  
  Installs all dependencies.

- **`npm run dev`**  
  Runs the app in development mode.

- **`npm run build`**  
  Builds the app for production (output is in the `dist` directory).

- **Post-build Step (optional):**  
  Copy `index.html` to `404.html` to enable SPA routing fallback:
  ```json
  "postbuild": "cp dist/index.html dist/404.html"
  ```

---

## Deployment Checklist for Render.com

- **Environment Variables:**  
  Set `VITE_API_URL` (e.g., `https://love-backend-8wbj.onrender.com`) in Render’s environment variables.

- **Publish Directory:**  
  Set to `dist` (or `love_frontend/dist` if using a Root Directory).

- **Build Command:**  
  Ensure your build command is `npm install && npm run build` (and that the postbuild step copies index.html to 404.html).

- **Static Fallback:**  
  Use a `static.json` file or the 404.html workaround to ensure SPA routes work (so `/login` or `/charities` always load index.html).

- **Clear Browser/Cloudflare Cache:**  
  If routing changes aren’t reflecting, clear cache.

- **Test Endpoints:**  
  Verify that API calls from the frontend (using your custom axios instance) are properly reaching your backend.

---

## Future Enhancements

- **Improve Error Handling:**  
  Add better UI notifications for errors.

- **Lazy Loading:**  
  Optimize performance by lazy loading components.

- **Testing:**  
  Expand tests for components and API interactions.

---
# 🍽️ MealMind – Backend API

MealMind Backend is the server-side application powering the MealMind mobile experience. Built with **Node.js, Express, TypeScript, and MongoDB**, it provides a scalable RESTful API for authentication, AI-powered recipe generation, and meal organization.

## ✨ Features

- **Authentication & Authorization** – User registration, login, Google Sign-In, JWT authentication, and protected routes.
- **Email Verification** – Email verification and password recovery workflows.
- **Pending Registration** – Local accounts are persisted only after OTP verification.
- **External Meals** – Cached TheMealDB recipes with French labels and translated instructions.
- **User Management** – Profile management, password updates, and avatar uploads.
- **AI Recipe Generation** – Generate personalized recipes based on available ingredients using Google Gemini.
- **Recipe Management** – Create, retrieve, delete, and manage favorite recipes.
- **Cloud Image Storage** – Upload and manage user images with Cloudinary.
- **Shopping Lists** – Add, update, retrieve, and delete shopping list items.
- **Usage Quotas** – Manage recipe generation limits.
- **Subscription Management** – Handle premium access and subscription-related features.

## 🛠️ Technologies

- **Node.js** – JavaScript runtime
- **Express.js** – Web application framework
- **TypeScript** – Type-safe development
- **MongoDB** – NoSQL database
- **Mongoose** – MongoDB object modeling
- **JWT** – Authentication and authorization
- **Google Gemini API** – AI-powered recipe generation
- **Cloudinary** – Cloud image storage
- **Nodemailer** – Email delivery
- **Multer** – File upload handling

## 📁 Architecture

The backend follows a modular, feature-oriented architecture to keep the codebase organized, maintainable, and scalable.

```text
src/
├── config/
├── modules/
│   ├── auth/
│   ├── users/
│   ├── recipes/
│   ├── shopping/
│   └── subscriptions/
├── middlewares/
├── utils/
├── app.ts
└── server.ts
```

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone <repository-url>
cd backend
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file in the project root and configure the required credentials:

```env
MONGODB_URI_ATLAS=
JWT_SECRET=

GEMINI_API_KEY=
GOOGLE_CLIENT_IDS=

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

SMTP_HOST=
SMTP_PORT=
SMTP_SECURE=
SMTP_USER=
SMTP_PASS=
SMTP_FROM=

# Optional dedicated translation providers for TheMealDB recipe instructions.
DEEPL_AUTH_KEY=
# Alternatively: GOOGLE_TRANSLATE_API_KEY=
```

The TheMealDB proxy uses an in-memory cache with a one-hour TTL. Meal detail
instructions are translated when a meal is opened, not during summary searches.
Translations use `DEEPL_AUTH_KEY` (optionally with `DEEPL_API_URL`) or
`GOOGLE_TRANSLATE_API_KEY` when configured. Otherwise, the backend reuses
`GEMINI_API_KEY`. Requests that need translation return a clear
service-unavailable response only when none of these providers is configured.

### 4. Run the development server

```bash
npm run dev
```

### 5. Build for production

```bash
npm run build
npm start
```

## ☁️ Deploy on Vercel

1. Push the backend to a Git provider connected to your Vercel account.
2. In Vercel, create a project from that repository. If this is a monorepo,
   set **Root Directory** to `backend`.
3. Keep the Express framework's automatic build settings. Vercel detects the
   exported Express app in `src/app.ts`; no `PORT` variable or long-running
   server process is needed.
4. Add the backend's environment variables in **Project Settings → Environment
   Variables**. At minimum, configure `MONGODB_URI_ATLAS`, `JWT_SECRET`, and
   the `SMTP_*` settings. Add `CLIENT_URL` for the deployed web client and
   configure optional providers (Gemini, Cloudinary, Pexels, Google sign-in,
   translation, and RevenueCat) when those features are used. Never commit
   these values to Git. Missing SMTP settings no longer stop the API from
   starting, but email verification and password-reset emails require them.
5. Allow the Vercel deployment to reach MongoDB Atlas using the outbound
   networking option available to your Vercel plan. Then test
   `https://<deployment-domain>/api/health`.
6. Point the Flutter app at the deployed API when building:

   ```powershell
   flutter build apk --dart-define=API_BASE_URL=https://<deployment-domain>/api --dart-define=GOOGLE_SERVER_CLIENT_ID=<web-oauth-client-id>
   ```

For Google sign-in, `GOOGLE_CLIENT_IDS` must contain the same Web OAuth client
ID used as `GOOGLE_SERVER_CLIENT_ID` by Flutter. Use a comma-separated list if
the backend accepts multiple OAuth audiences. Android also needs an OAuth
Android client registered with the app's package name and signing SHA-1.
For iOS, configure `GOOGLE_IOS_CLIENT_ID` at build time and add Google's
`REVERSED_CLIENT_ID` as an iOS URL scheme.

The API connects to MongoDB on demand and reuses a warm function's connection.
Vercel deployment does not fix Atlas TLS, credentials, or network-access-list
errors; resolve those in Atlas if requests cannot reach the database.

## 🔐 Security

- JWT-based authentication
- Protected API routes
- Input validation
- Password hashing
- Environment-based configuration

## 🎯 Project Goal

MealMind Backend aims to provide a reliable and scalable foundation for intelligent meal planning, personalized recipe generation, and efficient food organization.

---

**Note:** This repository contains only the backend API. The Flutter mobile application is maintained in a separate repository.
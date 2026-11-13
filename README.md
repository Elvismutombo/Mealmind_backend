# 🍽️ MealMind – Backend API

MealMind Backend is the server-side application powering the MealMind mobile experience. Built with **Node.js, Express, TypeScript, and MongoDB**, it provides a scalable RESTful API for authentication, AI-powered recipe generation, and meal organization.

## ✨ Features

- **Authentication & Authorization** – User registration, login, Google Sign-In, JWT authentication, and protected routes.
- **Email Verification** – Email verification and password recovery workflows.
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
PORT=5000
MONGODB_URI=
JWT_SECRET=

GEMINI_API_KEY=

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
```

### 4. Run the development server

```bash
npm run dev
```

### 5. Build for production

```bash
npm run build
npm start
```

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
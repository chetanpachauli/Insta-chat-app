# Insta-chat-app

# 💬 MERN Real-Time Chat Application

A **full-stack MERN application** with **real-time chat**, **secure authentication**, **image upload**, and a **production-ready architecture**. This project is built to demonstrate **practical Full Stack skills** suitable for **interviews, viva, and GitHub portfolio**.

---

## 🚀 Features

* 🔐 User Authentication (JWT + Cookies)
* 🔒 Secure Password Hashing (bcrypt)
* 💬 Real-time Chat using Socket.io
* 🟢 Online / Offline User Status
* 🖼️ Profile Image Upload (Cloudinary)
* 🧾 One-to-One Messaging
* 🗑️ Account Delete Functionality
* 🌐 Production-ready (CORS + Environment Variables)
* 🔔 Toast Notifications (Success / Error)

---

## 🛠️ Tech Stack

### Frontend

* **React.js** – UI Development
* **React Router DOM** – Client-side Routing
* **Axios** – API Communication
* **Socket.io-client** – Real-time communication
* **React Hot Toast** – Notifications
* **Lucide-react / Heroicons** – Icons

### Backend

* **Node.js** – Runtime Environment
* **Express.js** – Backend Framework
* **MongoDB** – NoSQL Database
* **Mongoose** – MongoDB ODM
* **Socket.io** – WebSockets for real-time chat
* **JWT (jsonwebtoken)** – Authentication
* **bcryptjs** – Password Hashing
* **dotenv** – Environment Variables
* **cookie-parser** – Cookie Handling
* **Cloudinary** – Image Upload Service

---

## 📦 Project Structure

```
root
│
├── backend
│   ├── controllers
│   ├── models
│   ├── routes
│   ├── middleware
│   ├── socket
│   └── server.js
│
├── frontend
│   ├── src
│   │   ├── components
│   │   ├── pages
│   │   ├── context
│   │   ├── services
│   │   └── App.jsx
│   └── main.jsx
│
└── README.md
```

---

## 🔑 Authentication Flow (JWT)

1. User logs in / registers
2. Server generates a **JWT token**
3. Token is stored in **Cookies / LocalStorage**
4. Token is sent in headers with every request
5. Backend middleware verifies token
6. Protected routes are accessed securely

---

## 💬 Real-Time Chat Flow (Socket.io)

* User connects to Socket server
* Socket ID is mapped with User ID
* Messages are emitted using `socket.emit()`
* Receiver gets message instantly via `socket.on()`
* Messages are also stored in MongoDB for persistence

---

## 🖼️ Image Upload (Cloudinary)

* Image is selected on frontend
* Sent to backend as multipart/form-data
* Backend uploads image to Cloudinary
* Cloudinary returns secure image URL
* URL is saved in MongoDB

---

## ❗ Common Problems & Solutions (Interview Ready)

### 🔴 401 Unauthorized Error

**Reason:**

* Token missing or expired

**Solution:**

* Ensure token is sent in headers or cookies
* Handle token expiration properly

---

### 🌐 CORS Issues on Live Server

**Reason:**

* Frontend & Backend on different domains

**Solution:**

* Configure CORS properly
* Use correct `VITE_API_URL` in frontend

---

## 🗑️ Account Delete Logic

* Backend: `User.findByIdAndDelete()`
* Frontend: Clear state + logout user
* Socket disconnected after deletion

---

## ⚙️ Environment Variables

### Backend (.env)

```
PORT=5000
MONGO_URI=your_mongodb_url
JWT_SECRET=your_secret_key
CLOUDINARY_CLOUD_NAME=xxxx
CLOUDINARY_API_KEY=xxxx
CLOUDINARY_API_SECRET=xxxx
CLIENT_URL=https://your-frontend-url
```

### Frontend (.env)

```
VITE_API_URL=https://your-backend-url/api
```

---

## ▶️ How to Run Locally

### 1️⃣ Clone the Repository

```
git clone https://github.com/your-username/your-repo-name.git
```

### 2️⃣ Backend Setup

```
cd backend
npm install
npm run dev
```

### 3️⃣ Frontend Setup

```
cd frontend
npm install
npm run dev
```

---

## 🎯 Biggest Challenge (Interview Answer)

> "The biggest challenge was handling **authentication and token issues** while deploying the app from **localhost to a live server**. Managing **CORS**, **cookies**, and **environment variables** taught me how real-world production apps work."

---

## 📸 Screenshots

> (Add screenshots of Login, Chat UI, Profile, etc.)

---

## 📌 Why This Project?

* Demonstrates **Full Stack MERN skills**
* Covers **real-time systems**
* Shows **production deployment understanding**
* Interview & resume friendly

---

## 👨‍💻 Author

**Chetan**
Full Stack MERN Developer

---

⭐ If you like this project, don’t forget to star the repo!


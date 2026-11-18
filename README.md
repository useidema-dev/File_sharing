# 🚀 MyVault - Personal Cloud Storage

**Modern React application for personal file storage and management**

Built with React, Vite, and Supabase

---

## ⚡ Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open: **http://localhost:3000**

---

## 🔑 Login Credentials

Test accounts:
- **Bablu**: `bablu@myvault.com` / `Bablu@123`
- **Rahul**: `rahul@myvault.com` / `Rahul@123`
- **Balwinder**: `balwinder@myvault.com` / `Balwinder@123`

---

## ✨ Features

- 🔐 Secure authentication (Supabase)
- 📁 File upload/download
- 📊 Dashboard with statistics
- 🗂️ Folder organization
- ⭐ Favorites
- 🎨 Dark/Light theme
- 📱 Fully responsive

---

## 📁 Project Structure

```
src/
├── components/         # React components
├── context/           # Auth context
├── pages/             # Page components
│   ├── Landing.jsx
│   ├── Login.jsx
│   └── Dashboard.jsx
├── lib/               # Supabase client
└── main.jsx           # Entry point
```

---

## 🛠️ Tech Stack

- **Frontend**: React 18, React Router v6, Vite
- **Backend**: Supabase (Auth, Database, Storage)
- **Styling**: CSS3 with CSS Variables

---

## � Scripts

```bash
npm run dev       # Development server
npm run build     # Production build
npm run preview   # Preview build
```

---

## � Documentation

- **REACT_SETUP.md** - Complete setup guide
- **docs/** - Development documentation
- **supabase/schema.sql** - Database schema

---

## 🚀 Deployment

```bash
npm run build
```

Deploy `dist/` folder to:
- Netlify
- Vercel
- GitHub Pages

---

## � Supabase Setup

Already configured in `src/lib/supabase.js`

Database tables:
- profiles
- files
- folders
- file_shares

---

## 🎯 Roadmap

- [x] Authentication
- [x] Dashboard
- [x] File upload/download
- [x] Folders
- [ ] File preview
- [ ] Search & filter
- [ ] File sharing

---

**Version**: 2.0.0 (React Edition)  
**License**: Personal Use

Made with ❤️ using React + Supabase

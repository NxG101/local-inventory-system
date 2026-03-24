# STOCK. – Real-Time Clothing Inventory System

A clean, modern, and fully functional **inventory management app** built for small clothing businesses and warehouses. Track stock live, manage categories, place orders, and view public stock — powered by Firebase.

![STOCK. Preview](https://via.placeholder.com/800x420/2563eb/ffffff?text=STOCK.+Inventory+System)  
*(Replace this placeholder with a real screenshot once deployed)*

## ✨ Features

- **Public Visitor Page** (`index.html`) – Live stock list for customers (only shows items with stock > 0 + "No Data Available" message)
- **Admin Inventory** – Add, edit, delete items with auto SKU generation
- **Categories Management** – Full CRUD (Add + **Edit** + Delete) with live product count
- **Order System** – Place orders with real-time stock preview and automatic deduction
- **Order History** – Complete record of all orders with notes
- **Stats Dashboard** – Total items, categories, stock value, low-stock alerts
- **User Management** (Admin only) – Create/edit staff accounts with roles
- **Settings Panel** – Profile, dark/light mode, password change, backup & reset
- **Beautiful UI** – Responsive design + automatic light/dark theme
- **Toast Notifications** – Modern feedback instead of ugly alerts
- **Secure Firebase Backend** – Authentication + Firestore

## 🛠 Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Backend**: Firebase 10 (Firestore + Authentication)
- **Styling**: Custom CSS with CSS variables (fully responsive)
- **Deployment**: GitHub Pages (free custom domain supported)

## 📁 Project Structure
stock-inventory/
├── index.html          → Public visitor stock page
├── inventory.html      → Main admin inventory
├── categories.html     → Category management (with Edit)
├── order.html          → Place orders with live preview
├── history.html        → Order history
├── settings.html       → Profile, users, backup & settings
├── login.html          → Login page
├── signup.html         → Create admin account
├── script.js           → All Firebase logic + functions
├── style.css           → Full styling + dark mode
├── images/             → default-avatar.png + any category images
└── README.md


## 🚀 How to Run

1. Clone the repo
git clone https://github.com/YOUR_USERNAME/stock-inventory.git
cd stock-inventory

2. Setup Firebase
- Go to Firebase Console → Create new project
- Enable Firestore Database (start in test mode first, then secure it)
- Enable Authentication → Email/Password
- Copy your Firebase config
- Open script.js and replace the entire firebaseConfig object with your own keys

3. (Recommended) Create First Admin Account
- Open signup.html
- Fill in email, password, and Admin Key (you can set this in Firestore → settings/adminConfig)

4. Open the app
- Just open any .html file in your browser or deploy to GitHub Pages.

Important Security Notes
- The Admin Key is stored in Firestore (settings/adminConfig).
- Set proper Firestore security rules before making the app public.
- Never push your real Firebase API keys to public repositories (use GitHub Secrets for CI/CD).

Screenshots: 

[PC LAYOUT (Also works in Mobile)]: 
Visitor Page:
<img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/4d0dba69-0c21-4e79-82d6-6fcb9ff8fb85" />

Login Page:
<img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/b18599e4-bd0c-45da-85aa-6dbd6c857db1" />

Signup Page:
<img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/3b4dabde-ced2-4a33-86d2-18c3f8a67db3" />

Inventory (Dashboard)/ Admin Page:
<img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/a0e6f640-88c5-491f-a0af-be9c41799cb8" />

Categories Page:
<img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/d388ff0a-03a7-48b6-9bef-3f5c89d1d657" />

Order Item Page:
<img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/3986c15d-e936-4953-853b-963bbfcc5816" />

Order History Page:
<img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/45a2a677-324b-4410-a816-7d6bfd7fdf26" />

Settings Page (Dark mode "applicable globally"):
<img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/109e953c-1f38-4185-a43c-ca9fb0308fbf" />

Settings Page (Light mode "applicable globally"):
<img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/8b4e3301-3d8b-49d7-bc75-23dfbf3d5a8e" />

Developer
- Hurtarin – Built with  for small clothing businesses. 

## 📄 License & Usage Rights

**This project is proprietary software** developed exclusively for **[HUTRN STORE]**.

© 2026 [HUTRN]. All Rights Reserved.

**Authorized Use Only**  
The client has full permission to use, deploy, and modify this system for their internal business operations.  
Redistribution, resale, or public sharing of the source code is strictly prohibited without written consent.

For any inquiries or additional customizations, please contact the developer.

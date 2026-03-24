import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { 
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, updatePassword, signOut 
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import { 
  getFirestore, collection, addDoc, getDocs, deleteDoc, doc, updateDoc, 
  getDoc, setDoc, query, where, onSnapshot  
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";
import { serverTimestamp } from 
"https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";


const firebaseConfig = {
  apiKey: "AIzaSyBtgxtAbtr84q_CigTdt3W0wqadvsZkOGI",
  authDomain: "stock-inventory-78e6f.firebaseapp.com",
  projectId: "stock-inventory-78e6f",
  storageBucket: "stock-inventory-78e6f.firebasestorage.app",
  messagingSenderId: "437284393762",
  appId: "1:437284393762:web:d7441ef89cf88e35f94b7b",
  measurementId: "G-T7LDNHTFW3"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

window.db = db;

let ADMIN_KEY = "";
let editingId = null;
let editingCategoryId = null;
let allInventory = [];
let inventoryUnsubscribe = null;
let notificationTimeout = null;

// ================== ADMIN KEY ==================
async function fetchAdminKey() {
  try {
    const docRef = doc(db, "settings", "adminConfig");   // ← changed path
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      ADMIN_KEY = snap.data().adminKey;                 // ← changed field name
      console.log("✅ Admin key loaded:", ADMIN_KEY);   // helpful debug
    } else {
      console.error("Admin key document not found!");
    }
  } catch (err) {
    console.error("Error fetching admin key:", err.message);
  }
}

// ================== AUTH GUARD & PROFILE SYNC ==================
onAuthStateChanged(auth, (user) => {
  const protectedPages = ["inventory.html", "categories.html", "settings.html"];
  const currentPage = window.location.pathname.split("/").pop();

  // Redirect if not logged in
  if (!user && protectedPages.includes(currentPage)) {
    window.location.href = "login.html";
    return;
  }

  if (user) {
    loadProfile(); // Firestore loads username + profile image
  }

});

// ================== INVENTORY (updated – no userId filter) ==================
async function loadInventory() {
  const table = document.getElementById("inventory-table");
  if (!table) return;

  // Clean up previous listener if exists
  if (inventoryUnsubscribe) inventoryUnsubscribe();

  inventoryUnsubscribe = onSnapshot(collection(db, "inventory"), (snapshot) => {
    allInventory = [];
    let total = 0, low = 0, value = 0;

    snapshot.forEach(docItem => {
      const item = docItem.data();
      const id = docItem.id;
      allInventory.push({ ...item, id });
      total++;
      if (item.stock <= 5) low++;
      value += (item.stock * item.price) || 0;
    });

    renderInventoryTable(allInventory);
    const totalStock = allInventory.reduce((sum, item) => sum + (item.stock || 0), 0);
    updateStats(total, low, value, totalStock);
  });
}

function renderInventoryTable(data) {
    const table = document.getElementById("inventory-table");
    if (!table) return;

    table.innerHTML = "";

    if (data.length === 0) {
        table.innerHTML = `<tr><td colspan="9" style="text-align:center;color:var(--text-muted);padding:2rem;">No Data Available to Show</td></tr>`;
        return;
    }

    data.forEach(item => {
        const id = item.id;
        table.innerHTML += `
            <tr>
                <td>${item.name}</td>
                <td>${item.sku || id}</td>
                <td>${item.category || "-"}</td>
                <td>${item.size || "-"}</td>
                <td>${item.color || "-"}</td>
                <td>₱${item.price}</td>
                <td>${item.stock}</td>
                <td>${item.stock <= 5 ? `<span class="badge badge-low">Low</span>` : `<span class="badge badge-ok">OK</span>`}</td>
                <td>
                    <button onclick="editItem('${id}')" class="btn-outline">Edit</button>
                    <button onclick="deleteItem('${id}')" class="btn-outline" style="margin-left:5px">Delete</button>
                </td>
            </tr>`;
    });
}

function updateStats(total, low, value, totalStock) {
    const stats = document.querySelectorAll(".stat-value");
    if (stats.length >= 4) {
        stats[0].innerText = total;
        stats[1].innerText = low;
        stats[2].innerText = `₱${value}`;
        stats[3].innerText = totalStock;
    }
}

function applyFilters() {
  const term = (document.getElementById("search")?.value || "").toLowerCase().trim();
  const cat = document.getElementById("filter-category")?.value || "all";
  const filtered = allInventory.filter(item => {
    const searchMatch = !term || 
      item.name.toLowerCase().includes(term) || 
      (item.sku || "").toLowerCase().includes(term);
    const catMatch = cat === "all" || item.category === cat;
    return searchMatch && catMatch;
  });
  renderInventoryTable(filtered);
}

// Add / Edit handler
async function addInventoryItem(e) {
  if (!auth.currentUser) {
    alert("User not authenticated yet. Please wait or refresh.");
    return;
  }
  e.preventDefault();
  const name = document.getElementById("p-name").value.trim();
  const sku = document.getElementById("p-sku").value.trim();
  const category = document.getElementById("p-cat").value;
  const size = document.getElementById("p-size").value;
  const color = document.getElementById("p-color").value.trim();
  const price = parseFloat(document.getElementById("p-price").value);
  const stock = parseInt(document.getElementById("p-stock").value);

  if (!name || !sku || isNaN(price) || isNaN(stock)) {
    alert("Fill all required fields");
    return;
  }

  const itemData = {
    name, sku, category, size, color, price, stock,
    status: stock <= 5 ? "Low" : "OK",
    dateAdded: new Date().toISOString(),
    userId: auth.currentUser?.uid || null
  };

  try {
    if (editingId) {
      await updateDoc(doc(db, "inventory", editingId), itemData);
      alert("✅ Item updated!");
      editingId = null;
      document.querySelector("#modal h2").textContent = "Add New Item";
    } else {
      await addDoc(collection(db, "inventory"), itemData);
      alert("✅ Item added!");
    }
    closeModal();
    loadInventory();
  } catch (err) {
    alert("Error: " + err.message);
    console.error(err); 
  }
}

async function editItem(id) {
  try {
    const snap = await getDoc(doc(db, "inventory", id));
    if (!snap.exists()) return alert("Item not found");
    const item = snap.data();

    document.getElementById("p-name").value = item.name || "";
    document.getElementById("p-sku").value = item.sku || "";
    document.getElementById("p-cat").value = item.category || "Top";
    document.getElementById("p-size").value = item.size || "S";
    document.getElementById("p-color").value = item.color || "";
    document.getElementById("p-price").value = item.price || 0;
    document.getElementById("p-stock").value = item.stock || 0;

    // Allow manual SKU editing only when editing an existing item
    const skuInput = document.getElementById("p-sku");
    skuInput.readOnly = false;
    skuInput.style.background = "var(--bg-card)";
    skuInput.style.color = "var(--text-main)";
    editingId = id;
    document.querySelector("#modal h2").textContent = "Edit Item";
    openModal();
  } catch (e) {
    alert("Error: " + e.message);
  }
}

async function deleteItem(id) {
  if (!confirm("Delete this item?")) return;
  await deleteDoc(doc(db, "inventory", id));
  loadInventory();
}

function openModal() {
  document.getElementById("modal").style.display = "flex";
  
  // Load categories + auto SKU (safe, no async issues with onclick)
  populateCategoryDropdown().then(() => {
    updateAutoSKU();
  }).catch(err => {
    console.error("Category load error:", err);
    // Still open modal even if categories fail
  });
  
  // Clear previews
  const imagePrev = document.getElementById("image-preview");
  if (imagePrev) imagePrev.style.display = "none";
}

function closeModal() {
  document.getElementById("modal").style.display = "none";
  editingId = null;
  document.querySelector("#modal h2").textContent = "Add New Item";
}

// ================== CATEGORIES ==================
async function loadCategories() {
    const tbody = document.getElementById("categories-body");
    if (!tbody) return;
    tbody.innerHTML = "";

    const catSnapshot = await getDocs(collection(db, "categories"));
    const invSnapshot = await getDocs(collection(db, "inventory"));
    const inventoryItems = invSnapshot.docs.map(d => d.data());

    if (catSnapshot.empty) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:2rem;">No categories yet</td></tr>`;
        return;
    }

    catSnapshot.forEach(docItem => {
        const cat = docItem.data();
        const id = docItem.id;
        const totalProducts = inventoryItems.filter(item => item.category === cat.name).length;

        tbody.innerHTML += `
            <tr>
                <td>${cat.name}</td>
                <td>${cat.description || "-"}</td>
                <td>${totalProducts}</td>
                <td>
                    <button onclick="editCategory('${id}')" class="btn-outline">Edit</button>
                    <button onclick="deleteCategory('${id}')" class="btn-outline" style="margin-left:5px">Delete</button>
                </td>
            </tr>`;
    });
}

async function editCategory(id) {
    try {
        const snap = await getDoc(doc(db, "categories", id));
        if (!snap.exists()) return showNotification("Category not found", "error");

        const cat = snap.data();
        editingCategoryId = id;

        const modalTitle = document.querySelector("#category-modal h2");
        modalTitle.textContent = "Edit Category";

        document.getElementById("c-name").value = cat.name || "";
        document.getElementById("c-desc").value = cat.description || "";

        openCategoryModal();
    } catch (err) {
        showNotification("Error loading category: " + err.message, "error");
    }
}

async function saveCategory(e) {
    e.preventDefault();
    const name = document.getElementById("c-name").value.trim();
    const desc = document.getElementById("c-desc").value.trim();

    if (!name) {
        return showNotification("Category name is required", "error");
    }

    try {
        if (editingCategoryId) {
            await updateDoc(doc(db, "categories", editingCategoryId), { name, description: desc });
            showNotification("✅ Category updated successfully!", "success");
            editingCategoryId = null;
        } else {
            await addDoc(collection(db, "categories"), { name, description: desc });
            showNotification("✅ Category added successfully!", "success");
        }

        closeCategoryModal();
        loadCategories();
    } catch (err) {
        console.error(err);
        showNotification("Error: " + err.message, "error");
    }
}

function openCategoryModal() {
    document.getElementById("category-modal").style.display = "flex";
}

function closeCategoryModal() {
    document.getElementById("category-modal").style.display = "none";

    const modalTitle = document.querySelector("#category-modal h2");
    if (modalTitle) modalTitle.textContent = "Add New Category";

    editingCategoryId = null;

    // Clear form
    document.getElementById("c-name").value = "";
    document.getElementById("c-desc").value = "";
}

async function deleteCategory(id) {
    if (!confirm("Delete this category?")) return;

    try {
        await deleteDoc(doc(db, "categories", id));
        showNotification("✅ Category deleted!", "success");
        loadCategories();
    } catch (err) {
        showNotification("Error deleting category: " + err.message, "error");
    }
}

// ================== SETTINGS & BACKUP ==================
async function saveProfile() {

  const user = auth.currentUser;
  if (!user) return alert("User not logged in");

  const username = document.getElementById("profile-username").value.trim();
  const file = document.getElementById("profileImageInput").files[0];

  let imageUrl = null;

  try {

    // Upload new profile image
    if (file) {

      const storageRef = ref(storage, `profileImages/${user.uid}`);
      await uploadBytes(storageRef, file);

      imageUrl = await getDownloadURL(storageRef);

      document.getElementById("profilePreview").src = imageUrl;
    }

    const updateData = {};

    if (username) updateData.username = username;
    if (imageUrl) updateData.profileImage = imageUrl;

    await setDoc(doc(db, "users", user.uid), updateData, { merge: true });

    // Update UI
    if (username) {
      document.querySelectorAll("#username,#sidebar-username")
        .forEach(el => el.textContent = username);
    }

    alert("Profile updated successfully!");

  } catch (error) {
    console.error(error);
    alert("Error updating profile");
  }

}

function saveAlert() {
  const val = document.getElementById("low-stock").value;
  alert(`Low-stock threshold set to ${val} (badge uses 5 for demo)`);
}

async function resetInventory() {
    if (!confirm("Reset ALL inventory, orders, AND categories?\n\nThis action cannot be undone!")) return;

    if (!ADMIN_KEY) await fetchAdminKey();

    const key = prompt("Enter Admin Key:");
    if (key !== ADMIN_KEY) {
        showNotification("Invalid key", "error");
        return;
    }

    try {
        // Clear Inventory
        const invSnapshot = await getDocs(collection(db, "inventory"));
        for (const d of invSnapshot.docs) await deleteDoc(d.ref);

        // Clear Orders
        const orderSnapshot = await getDocs(collection(db, "orders"));
        for (const d of orderSnapshot.docs) await deleteDoc(d.ref);

        // Clear Categories
        const catSnapshot = await getDocs(collection(db, "categories"));
        for (const d of catSnapshot.docs) await deleteDoc(d.ref);

        showNotification("✅ Inventory, Orders, and Categories reset successfully!", "success");

        // Refresh current page tables
        if (document.getElementById("inventory-table")) loadInventory();
        if (document.getElementById("order-history")) loadOrderHistory();
        if (document.getElementById("categories-body")) loadCategories();

    } catch (err) {
        console.error(err);
        showNotification("Error resetting data: " + err.message, "error");
    }
}

async function exportBackup() {
  if (!confirm("Export backup?")) return;
  if (!ADMIN_KEY) await fetchAdminKey();   // ← THIS FIXES IT
  const key = prompt("Enter Admin Key:");
  if (key !== ADMIN_KEY) return alert("Invalid key");
  const snapshot = await getDocs(collection(db, "inventory"));
  const data = snapshot.docs.map(d => d.data());
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "inventory-backup.json";
  a.click();
}

async function exportCSV() {
  if (!confirm("Export CSV?")) return;
  const q = query(collection(db, "inventory"), where("userId", "==", auth.currentUser.uid));
  const snapshot = await getDocs(q);
  let csv = "Name,SKU,Category,Size,Color,Price,Stock\n";
  snapshot.forEach(d => {
    const i = d.data();
    csv += `"${i.name}","${i.sku || d.id}","${i.category || ""}","${i.size || ""}","${i.color || ""}",${i.price},${i.stock}\n`;
  });
  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "inventory.csv";
  a.click();
}

// ================== AUTH ==================
async function createAdmin() {
  const errorEl = document.getElementById("error");
  errorEl.style.display = "none";

  try {
    await fetchAdminKey();                    // ← moved inside try

    const email = document.getElementById("newEmail").value.trim();
    const password = document.getElementById("newPassword").value;
    const key = document.getElementById("adminKey").value;

    if (key !== ADMIN_KEY) {
      errorEl.textContent = "Invalid Admin Key";
      errorEl.style.display = "block";
      return;
    }

    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await setDoc(doc(db, "users", cred.user.uid), { 
      email, 
      role: "admin",
      username: email.split("@")[0] // optional nice default
    });

    alert("✅ Admin account created! Logging in...");
    window.location.href = "login.html";   // or directly to inventory.html if you want

  } catch (err) {
    console.error(err);
    errorEl.textContent = err.message.includes("permission") 
      ? "Firestore permission error - check your rules!" 
      : err.message;
    errorEl.style.display = "block";
  }
}

async function login() {
  const errorEl = document.getElementById("error");
  errorEl.style.display = "none";
  try {
    await signInWithEmailAndPassword(
      auth, document.getElementById("loginEmail").value.trim(), 
      document.getElementById("password").value);
    window.location.href = "inventory.html";
  } catch (err) {
    errorEl.textContent = "Invalid credentials";
    errorEl.style.display = "block";
  }
}

async function changePassword() {
  if (!ADMIN_KEY) await fetchAdminKey();
  const key = prompt("Enter Admin Key:");
  if (key !== ADMIN_KEY) return alert("Invalid key");
  const newPass = document.getElementById("new-password").value;
  if (!newPass) return alert("Password empty");
  await updatePassword(auth.currentUser, newPass);
  alert("Password updated!");
}

async function logout() {
    if (!confirm("Logout?")) return;

    try {
        await signOut(auth);
        
        // RESET THEME TO SYSTEM PREFERENCE
        localStorage.removeItem("theme");
        
        // Apply system default immediately
        const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.setAttribute("data-theme", systemDark ? "dark" : "light");

        window.location.href = "index.html";
    } catch (err) {
        console.error("Logout error:", err);
        window.location.href = "index.html";
    }
}

async function loadProfile() {
    const user = auth.currentUser;
    if (!user) return;

    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
        const data = userSnap.data();

        // Username
        if (data.username) {
            const usernameInput = document.getElementById("profile-username");
            if (usernameInput) usernameInput.value = data.username;
            document.querySelectorAll("#username,#sidebar-username")
                .forEach(el => el.textContent = data.username);
        }

        // Role
        const roleEl = document.getElementById("user-role");
        if (roleEl) {
            roleEl.textContent = data.role || "Inventory Manager";
        }

        // Profile image
        if (data.profileImage) {
            const preview = document.getElementById("profilePreview");
            if (preview) preview.src = data.profileImage;
        }

        // NEW: Show "All Registered Accounts" only for Admin
        const adminSection = document.getElementById("admin-users-section");
        if (adminSection) {
            if (data.role === "Admin") {
                adminSection.style.display = "block";
                loadAllUsers();           // ← loads the table
            } else {
                adminSection.style.display = "none";
            }
        }
    }
}

// ================== DYNAMIC CATEGORIES DROPDOWN ==================
async function populateCategoryDropdown() {
  const select = document.getElementById("p-cat");
  if (!select) return;

  select.innerHTML = "";

  const snapshot = await getDocs(collection(db, "categories"));

  if (snapshot.empty) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "No categories yet – add one in the Categories page first";
    opt.disabled = true;
    select.appendChild(opt);
    return;
  }

  snapshot.forEach(doc => {
    const cat = doc.data();
    const opt = document.createElement("option");
    opt.value = cat.name;           // ← uses the "name" field from your doc
    opt.textContent = cat.name;
    select.appendChild(opt);
  });
}

// ================== AUTO SKU GENERATION ==================
function generateSKU(category) {
  if (!category) return "ITEM-0001";
  
  const prefix = category.toUpperCase().slice(0, 3) + "-";   // TOP-, BOT-, OUT-, ACC-
  
  // Safe even if allInventory is still loading
  const existingNumbers = (allInventory || [])
    .filter(item => item.sku && item.sku.startsWith(prefix))
    .map(item => {
      const parts = item.sku.split("-");
      return parts.length > 1 ? parseInt(parts[1]) || 0 : 0;
    });
  
  const nextNumber = existingNumbers.length > 0 
    ? Math.max(...existingNumbers) + 1 
    : 1;
  
  return prefix + nextNumber.toString().padStart(4, "0");
}

function updateAutoSKU() {
  if (editingId !== null) return;   // don't auto-change when editing existing item
  
  const catSelect = document.getElementById("p-cat");
  const skuInput = document.getElementById("p-sku");
  if (!catSelect || !skuInput) return;
  
  const category = catSelect.value;
  if (category) {
    skuInput.value = generateSKU(category);
  }
}

// ================== DYNAMIC FILTER DROPDOWN ==================
async function populateFilterDropdown() {
  const select = document.getElementById("filter-category");
  if (!select) return;
  select.innerHTML = '<option value="all">All Categories</option>';

  const snapshot = await getDocs(collection(db, "categories"));
  snapshot.forEach(doc => {
    const cat = doc.data();
    const opt = document.createElement("option");
    opt.value = cat.name;
    opt.textContent = cat.name;
    select.appendChild(opt);
  });
}

// ================== Load Item Orders ==================
async function loadOrderItems() {

  const select = document.getElementById("order-item");
  if(!select) return;

  const snapshot = await getDocs(collection(db,"inventory"));

  select.innerHTML = "";

  snapshot.forEach(docItem => {

    const item = docItem.data();

    if(item.stock > 0){

      select.innerHTML += `
      <option value="${docItem.id}">
        ${item.name} (Stock: ${item.stock})
      </option>`;
    }

  });

}

async function updateStockPreview() {
    const select = document.getElementById("order-item");
    const qtyInput = document.getElementById("order-qty");
    const info = document.getElementById("stock-info");
    const currentSpan = document.getElementById("current-stock");
    const remainingSpan = document.getElementById("remaining-stock");

    if (!select.value) {
        info.style.display = "none";
        return;
    }

    try {
        const itemRef = doc(db, "inventory", select.value);
        const snap = await getDoc(itemRef);
        if (snap.exists()) {
            const item = snap.data();
            const qty = parseInt(qtyInput.value) || 0;
            const remaining = item.stock - qty;

            currentSpan.textContent = item.stock;
            remainingSpan.textContent = remaining;

            if (remaining < 0) {
                remainingSpan.style.color = "var(--danger)";
                remainingSpan.textContent = remaining + " (Not enough stock!)";
            } else if (remaining <= 5) {
                remainingSpan.style.color = "var(--accent)";
            } else {
                remainingSpan.style.color = "var(--success)";
            }

            info.style.display = "block";
        }
    } catch (err) {
        console.error("Stock preview error:", err);
    }
}

async function placeOrder(e){

  e.preventDefault();

  const itemId = document.getElementById("order-item").value;
  const qty = parseInt(document.getElementById("order-qty").value);

  const itemRef = doc(db,"inventory",itemId);
  const itemSnap = await getDoc(itemRef);

  if(!itemSnap.exists()) return alert("Item not found");

  const item = itemSnap.data();

  if(qty > item.stock) return alert("Not enough stock");

  const newStock = item.stock - qty;

  await updateDoc(itemRef,{
    stock:newStock
  });

  await addDoc(collection(db,"orders"),{

    itemName:item.name,
    sku:item.sku,
    quantity:qty,
    userId:auth.currentUser.uid,
    userEmail:auth.currentUser.email,
    date:new Date().toISOString()

  });

  alert("✅ Order completed");

  document.getElementById("order-form").reset();

  loadOrderItems();

}

async function completeOrder(e) {
    e.preventDefault();
    const itemId = document.getElementById("order-item").value;
    const qty = parseInt(document.getElementById("order-qty").value);
    const notes = document.getElementById("order-notes").value.trim();

    if (!itemId || !qty) return alert("Please fill all fields");

    try {
        const itemRef = doc(db, "inventory", itemId);
        const itemSnap = await getDoc(itemRef);
        if (!itemSnap.exists()) throw new Error("Item not found");

        const item = itemSnap.data();
        if (qty > item.stock) throw new Error("Not enough stock!");

        const newStock = item.stock - qty;

        // Get username from user profile
        const userRef = doc(db, "users", auth.currentUser.uid);
        const userSnap = await getDoc(userRef);
        const username = userSnap.exists() && userSnap.data().username 
            ? userSnap.data().username 
            : auth.currentUser.email.split("@")[0];

        await updateDoc(itemRef, { stock: newStock });

        await addDoc(collection(db, "orders"), {
            itemName: item.name,
            sku: item.sku || itemId,
            quantity: qty,
            username: username,           // ← this is what we display now
            user: auth.currentUser.email, // kept for Email column
            notes: notes || null,
            date: serverTimestamp()
        });

        alert("✅ Order completed successfully!");
        document.getElementById("order-form").reset();
        loadOrderItems();
        setTimeout(() => window.location.reload(), 800);

    } catch (err) {
        console.error(err);
        alert("❌ " + (err.message || "Something went wrong"));
    }
}

async function loadOrderHistory() {
    const table = document.getElementById("order-history");
    if (!table) return;

    table.innerHTML = "";

    const snapshot = await getDocs(collection(db, "orders"));

    if (snapshot.empty) {
        table.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:2rem;">No Orders to Show</td></tr>`;
        return;
    }

    snapshot.forEach(docItem => {
        const order = docItem.data();
        const notesText = order.notes && order.notes.trim() !== "" ? order.notes : "No Notes Written";
        const dateStr = order.date 
            ? (order.date.toDate ? order.date.toDate().toLocaleString() : new Date(order.date).toLocaleString()) 
            : "—";

        const orderedBy = order.username || order.user || order.userEmail || "-";

        table.innerHTML += `
            <tr>
                <td>${order.itemName || "-"}</td>
                <td>${order.sku || "-"}</td>
                <td>${order.quantity || 0}</td>
                <td>${orderedBy}</td>
                <td>${dateStr}</td>
                <td>${notesText}</td>
            </tr>
        `;
    });
}

// ================== NOTIFICATION SYSTEM (replaces all alerts) ==================
function showNotification(message, type = "info") {
    const notif = document.getElementById("notification");
    if (!notif) {
        console.warn("Notification element missing — falling back to alert");
        alert(message);
        return;
    }

    const msgEl = document.getElementById("notification-message");
    msgEl.innerHTML = message;   // keeps ✅ ❌ emojis

    notif.className = `notification ${type}`;
    notif.style.display = "flex";
    notif.style.animation = "slideInRight 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)";

    if (notificationTimeout) clearTimeout(notificationTimeout);
    notificationTimeout = setTimeout(hideNotification, 4500);
}

function hideNotification() {
    const notif = document.getElementById("notification");
    if (!notif) return;

    notif.style.animation = "slideOut 0.3s ease forwards";
    setTimeout(() => {
        notif.style.display = "none";
        notif.style.animation = "";
    }, 300);
}

// ================== CHANGE ROLE (requires Admin Key) ==================
async function changeRole() {
    const user = auth.currentUser;
    if (!user) {
        showNotification("You must be logged in", "error");
        return;
    }

    const newRole = document.getElementById("new-role").value.trim();
    if (!newRole) {
        showNotification("Please select a new role", "error");
        return;
    }

    if (!ADMIN_KEY) await fetchAdminKey();

    const key = prompt("Enter Admin Key to change role:");
    if (key !== ADMIN_KEY) {
        showNotification("Invalid Admin Key", "error");
        return;
    }

    try {
        await updateDoc(doc(db, "users", user.uid), { role: newRole });

        showNotification(`✅ Role changed to <strong>${newRole}</strong>`, "success");

        // Refresh sidebar instantly
        loadProfile();
    } catch (err) {
        console.error(err);
        showNotification("Error updating role: " + err.message, "error");
    }
}

// ================== LOAD ALL REGISTERED USERS (Admin Only) ==================
async function loadAllUsers() {
    const tableBody = document.getElementById("all-users-table");
    if (!tableBody) return;

    tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--text-muted);">Loading users...</td></tr>`;

    try {
        const snapshot = await getDocs(collection(db, "users"));

        tableBody.innerHTML = "";

        if (snapshot.empty) {
            tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--text-muted);">No registered accounts yet</td></tr>`;
            return;
        }

        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const id = docSnap.id;
            const roleClass = data.role === "Admin" ? "badge-ok" : "badge-low";

            tableBody.innerHTML += `
                <tr>
                    <td>${data.username || "-"}</td>
                    <td>${data.email || "-"}</td>
                    <td><span class="badge ${roleClass}">${data.role || "Staff"}</span></td>
                    <td>
                        <button onclick="editUser('${id}')" class="btn-outline" style="margin-right:4px">Edit</button>
                        <button onclick="deleteUser('${id}')" class="btn-red">Delete</button>
                    </td>
                </tr>
            `;
        });
    } catch (err) {
        console.error(err);
        tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--danger);">Error loading users</td></tr>`;
        showNotification("Error loading users list", "error");
    }
}

// ================== USER MANAGEMENT (Admin Only) ==================
let editingUserId = null;

function openUserModal(isEdit = false, userData = null) {
    editingUserId = isEdit && userData ? userData.id : null;

    document.getElementById("user-modal-title").textContent = isEdit ? "Edit User" : "Add New User";

    const emailInput = document.getElementById("user-email");
    const passInput = document.getElementById("user-password");
    const note = document.getElementById("password-note");

    emailInput.value = userData ? userData.email || "" : "";
    emailInput.readOnly = isEdit;                    // email can't be changed easily

    document.getElementById("user-username").value = userData ? userData.username || "" : "";
    document.getElementById("user-role-select").value = userData ? userData.role || "Inventory Manager" : "Inventory Manager";

    if (isEdit) {
        passInput.style.display = "none";
        note.style.display = "block";
        passInput.required = false;
    } else {
        passInput.style.display = "block";
        note.style.display = "none";
        passInput.required = true;
        passInput.value = "";
    }

    document.getElementById("user-modal").style.display = "flex";
}

function closeUserModal() {
    document.getElementById("user-modal").style.display = "none";
    editingUserId = null;
}

async function saveUser() {
    const user = auth.currentUser;
    if (!user) return showNotification("You must be logged in", "error");

    const email = document.getElementById("user-email").value.trim();
    const password = document.getElementById("user-password").value.trim();
    const username = document.getElementById("user-username").value.trim();
    const role = document.getElementById("user-role-select").value;

    if (!email || !username || !role) {
        return showNotification("Email, username and role are required", "error");
    }

    if (!ADMIN_KEY) await fetchAdminKey();

    const key = prompt("Enter Admin Key to continue:");
    if (key !== ADMIN_KEY) {
        return showNotification("Invalid Admin Key", "error");
    }

    try {
        if (!editingUserId) {
            // ADD NEW USER
            if (!password) return showNotification("Password is required for new users", "error");

            const cred = await createUserWithEmailAndPassword(auth, email, password);
            await setDoc(doc(db, "users", cred.user.uid), {
                email,
                username,
                role,
                createdAt: new Date().toISOString()
            });

            showNotification(`✅ New user <strong>${username}</strong> created!`, "success");
        } else {
            // EDIT EXISTING USER
            await updateDoc(doc(db, "users", editingUserId), { username, role });
            showNotification(`✅ User updated successfully!`, "success");
        }

        closeUserModal();
        loadAllUsers();           // refresh table
    } catch (err) {
        console.error(err);
        showNotification("Error: " + err.message, "error");
    }
}

async function editUser(uid) {
    try {
        const snap = await getDoc(doc(db, "users", uid));
        if (!snap.exists()) return showNotification("User not found", "error");

        const data = snap.data();
        data.id = uid;                    // attach id for editing
        openUserModal(true, data);
    } catch (err) {
        showNotification("Error loading user data", "error");
    }
}

async function deleteUser(uid) {
    if (!confirm("Delete this user permanently?\n\nThis cannot be undone.")) return;

    if (!ADMIN_KEY) await fetchAdminKey();

    const key = prompt("Enter Admin Key to delete user:");
    if (key !== ADMIN_KEY) {
        return showNotification("Invalid Admin Key", "error");
    }

    try {
        await deleteDoc(doc(db, "users", uid));
        showNotification("✅ User deleted", "success");
        loadAllUsers();
    } catch (err) {
        showNotification("Error deleting user: " + err.message, "error");
    }
}

// ================== GLOBAL EXPOSE + INIT ==================
window.addInventoryItem = addInventoryItem;
window.loadInventory = loadInventory;
window.deleteItem = deleteItem;
window.editItem = editItem;
window.openModal = openModal;
window.closeModal = closeModal;
window.loadCategories = loadCategories;
window.saveCategory = saveCategory;
window.editCategory = editCategory;
window.deleteCategory = deleteCategory;
window.openCategoryModal = openCategoryModal;
window.closeCategoryModal = closeCategoryModal;
window.resetInventory = resetInventory;
window.exportBackup = exportBackup;
window.exportCSV = exportCSV;
window.createAdmin = createAdmin;
window.login = login;
window.changePassword = changePassword;
window.logout = logout;
window.saveProfile = saveProfile;
window.saveAlert = saveAlert;
window.showNotification = showNotification;
window.hideNotification = hideNotification;
window.changeRole = changeRole;
window.loadAllUsers = loadAllUsers;
window.openUserModal = openUserModal;
window.closeUserModal = closeUserModal;
window.saveUser = saveUser;
window.editUser = editUser;
window.deleteUser = deleteUser;

window.addEventListener("DOMContentLoaded", () => {

    loadOrderItems();

    const orderForm = document.getElementById("order-form");
    if(orderForm){
        orderForm.addEventListener("submit", completeOrder);
    }

    // === NEW: Live stock preview listeners ===
    const orderSelect = document.getElementById("order-item");
    const orderQty = document.getElementById("order-qty");
    if (orderSelect) orderSelect.addEventListener("change", updateStockPreview);
    if (orderQty) orderQty.addEventListener("input", updateStockPreview);

    // Theme handling — respects system preference after logout
    const savedTheme = localStorage.getItem("theme");
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const themeToUse = savedTheme || (systemPrefersDark ? "dark" : "light");

    document.documentElement.setAttribute("data-theme", themeToUse);

    const toggle = document.getElementById("theme-toggle");
    if (toggle) {
        toggle.checked = themeToUse === "dark";

        toggle.addEventListener("change", () => {
            const newTheme = toggle.checked ? "dark" : "light";
            document.documentElement.setAttribute("data-theme", newTheme);
            localStorage.setItem("theme", newTheme);

            if (document.getElementById("filter-category")) {
                populateFilterDropdown();
            }
        });
    }

    // Filters
    const search = document.getElementById("search");
    const filterCat = document.getElementById("filter-category");
    if (search) search.addEventListener("input", applyFilters);
    if (filterCat) filterCat.addEventListener("change", applyFilters);

    const categorySelect = document.getElementById("p-cat");
    if (categorySelect) {
        categorySelect.addEventListener("change", updateAutoSKU);
    }

    // Category form
    const catForm = document.getElementById("add-category-form");
    if (catForm) catForm.addEventListener("submit", saveCategory);

    const addForm = document.getElementById("add-form");
    if (addForm) {
        addForm.addEventListener("submit", addInventoryItem);
    }

    // Auto-load tables
    if (document.getElementById("inventory-table")) loadInventory();
    if (document.getElementById("categories-body")) loadCategories();
    if (document.getElementById("order-history")) loadOrderHistory(); // from previous fix
    fetchAdminKey();
  });

export { db, loadInventory, addInventoryItem, deleteItem, editItem, openModal, closeModal, loadCategories, addCategory, deleteCategory, openCategoryModal, closeCategoryModal, createAdmin, login, changePassword, logout };

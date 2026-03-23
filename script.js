import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { 
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, updatePassword, signOut 
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import { 
  getFirestore, collection, addDoc, getDocs, deleteDoc, doc, updateDoc, 
  getDoc, setDoc, query, where 
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";
import { 
  getStorage, ref, uploadBytes, getDownloadURL 
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-storage.js";


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
const storage = getStorage(app);

window.db = db;

let ADMIN_KEY = "";
let editingId = null;
let currentEditingImage = null;
let allInventory = [];

// ================== ADMIN KEY ==================
async function fetchAdminKey() {
  const docRef = doc(db, "config", "admin");
  const snap = await getDoc(docRef);

  if (snap.exists()) {
    ADMIN_KEY = snap.data().key;
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
  table.innerHTML = "";
  allInventory = [];

  // ←←← CHANGED: no where() filter so your existing items show
  const snapshot = await getDocs(collection(db, "inventory"));

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
  updateStats(total, low, value);
}

function renderInventoryTable(data) {
  const table = document.getElementById("inventory-table");
  if (!table) return;
  table.innerHTML = "";
  data.forEach(item => {
    const id = item.id;
    const imgSrc = item.imageUrl || "https://via.placeholder.com/40x40/eee/666?text=No+Img";
    table.innerHTML += `
      <tr>
        <td><img src="${imgSrc}" class="product-img" style="width:40px;height:40px;object-fit:cover;border-radius:4px;"></td>
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

function updateStats(total, low, value) {
  const stats = document.querySelectorAll(".stat-value");
  if (stats.length >= 3) {
    stats[0].innerText = total;
    stats[1].innerText = low;
    stats[2].innerText = `₱${value}`;
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

  const imageFile = document.getElementById("p-image").files[0];
  let imageUrl = currentEditingImage;
  if (imageFile) {
    imageUrl = await uploadImage(imageFile);
  }

  const itemData = {
    name, sku, category, size, color, price, stock,
    status: stock <= 5 ? "Low" : "OK",
    dateAdded: new Date().toISOString(),
    imageUrl,
    userId: auth.currentUser?.uid || null
  };

  try {
    if (editingId) {
      await updateDoc(doc(db, "inventory", editingId), itemData);
      alert("✅ Item updated with new image!");
      editingId = null;
      document.querySelector("#modal h2").textContent = "Add New Item";
    } else {
      await addDoc(collection(db, "inventory"), itemData);
      alert("✅ Item added with image!");
    }
    closeModal();
    loadInventory();
  } catch (err) {
    alert("Error: " + err.message);
  }
}

async function editItem(id) {
  try {
    const snap = await getDoc(doc(db, "inventory", id));
    if (!snap.exists()) return alert("Item not found");
    const item = snap.data();
    currentEditingImage = item.imageUrl || null;

    document.getElementById("p-name").value = item.name || "";
    document.getElementById("p-sku").value = item.sku || "";
    document.getElementById("p-cat").value = item.category || "Top";
    document.getElementById("p-size").value = item.size || "S";
    document.getElementById("p-color").value = item.color || "";
    document.getElementById("p-price").value = item.price || 0;
    document.getElementById("p-stock").value = item.stock || 0;

    if (item.imageUrl) {
      const preview = document.getElementById("preview-img");
      const container = document.getElementById("image-preview");
      if (preview && container) {
        preview.src = item.imageUrl;
        container.style.display = "block";
      }
    }

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
  populateCategoryDropdown();
  document.getElementById("image-preview").style.display = "none";
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
  const snapshot = await getDocs(collection(db, "categories"));
  snapshot.forEach(docItem => {
    const cat = docItem.data();
    const id = docItem.id;
    tbody.innerHTML += `
      <tr>
        <td>${cat.name}</td>
        <td>${cat.description}</td>
        <td>-</td>
        <td><button onclick="deleteCategory('${id}')" class="btn-outline">Delete</button></td>
      </tr>`;
  });
}

async function addCategory(e) {
  e.preventDefault();
  const name = document.getElementById("c-name").value.trim();
  const desc = document.getElementById("c-desc").value.trim();
  if (!name) return;
  await addDoc(collection(db, "categories"), { name, description: desc });
  closeCategoryModal();
  loadCategories();
}

async function deleteCategory(id) {
  if (!confirm("Delete category?")) return;
  await deleteDoc(doc(db, "categories", id));
  loadCategories();
}

function openCategoryModal() {
  document.getElementById("category-modal").style.display = "flex";
}
function closeCategoryModal() {
  document.getElementById("category-modal").style.display = "none";
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

    await updateDoc(doc(db, "users", user.uid), updateData);

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
  if (!confirm("Reset ALL inventory?")) return;
  const key = prompt("Enter Admin Key:");
  if (key !== ADMIN_KEY) return alert("Invalid key");
  const snapshot = await getDocs(collection(db, "inventory"));
  for (const d of snapshot.docs) await deleteDoc(d.ref);
  alert("Inventory reset");
  loadInventory();
}

async function exportBackup() {
  if (!confirm("Export backup?")) return;
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
  
  await fetchAdminKey();
  
  const email = document.getElementById("newEmail").value.trim();
  const password = document.getElementById("newPassword").value;
  const key = document.getElementById("adminKey").value;

  if (key !== ADMIN_KEY) {
    errorEl.textContent = "Invalid Admin Key";
    errorEl.style.display = "block";
    return;
  }
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await setDoc(doc(db, "users", cred.user.uid), { email, role: "admin" });
    alert("Admin created! Logging in...");
    window.location.href = "login.html";
  } catch (err) {
    console.error(err); 
    errorEl.textContent = err.message;
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
  const key = prompt("Enter Admin Key:");
  if (key !== ADMIN_KEY) return alert("Invalid key");
  const newPass = document.getElementById("new-password").value;
  if (!newPass) return alert("Password empty");
  await updatePassword(auth.currentUser, newPass);
  alert("Password updated!");
}

function logout() {
  if (confirm("Logout?")) {
    signOut(auth);
    window.location.href = "login.html";
  }
}

async function loadProfile() {

  const user = auth.currentUser;
  if (!user) return;

  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {

    const data = userSnap.data();

    if (data.username) {
      const usernameInput = document.getElementById("profile-username");
      if (usernameInput) usernameInput.value = data.username;
      document.querySelectorAll("#username,#sidebar-username")
        .forEach(el => el.textContent = data.username);
    }

    if (data.profileImage) {
      document.getElementById("profilePreview").src = data.profileImage;
    }

  }
}

async function uploadImage(file) {
  if (!file) return null;
  const storageRef = ref(storage, `images/${Date.now()}-${file.name}`);
  await uploadBytes(storageRef, file);
  return await getDownloadURL(storageRef);
}

// ================== DYNAMIC CATEGORIES DROPDOWN ==================
async function populateCategoryDropdown() {
  const select = document.getElementById("p-cat");
  if (!select) return;
  select.innerHTML = "";
  const snapshot = await getDocs(collection(db, "categories"));
  snapshot.forEach(doc => {
    const cat = doc.data();
    const opt = document.createElement("option");
    opt.value = cat.name;
    opt.textContent = cat.name;
    select.appendChild(opt);
  });
}

// ================== GLOBAL EXPOSE + INIT ==================
window.addInventoryItem = addInventoryItem;
window.loadInventory = loadInventory;
window.deleteItem = deleteItem;
window.editItem = editItem;
window.openModal = openModal;
window.closeModal = closeModal;
window.loadCategories = loadCategories;
window.addCategory = addCategory;
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

window.addEventListener("DOMContentLoaded", () => {
  // Theme
  const toggle = document.getElementById("theme-toggle");
  if (toggle) {
    const saved = localStorage.getItem("theme") || "light";
    document.documentElement.setAttribute("data-theme", saved);
    toggle.checked = saved === "dark";
    toggle.addEventListener("change", () => {
      const theme = toggle.checked ? "dark" : "light";
      document.documentElement.setAttribute("data-theme", theme);
      localStorage.setItem("theme", theme);
    });
  }

  // Filters
  const search = document.getElementById("search");
  const filterCat = document.getElementById("filter-category");
  if (search) search.addEventListener("input", applyFilters);
  if (filterCat) filterCat.addEventListener("change", applyFilters);

  // Category form
  const catForm = document.getElementById("add-category-form");
  if (catForm) catForm.addEventListener("submit", addCategory);

  // ================== IMAGE PREVIEW LIVE (ADD THIS HERE) ==================
  const fileInput = document.getElementById("p-image");
  if (fileInput) {
    fileInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const preview = document.getElementById("preview-img");
          if (preview) preview.src = ev.target.result;
          const previewContainer = document.getElementById("image-preview");
          if (previewContainer) previewContainer.style.display = "block";
        };
        reader.readAsDataURL(file);
      }
    });
  }

  // Auto-load tables
  if (document.getElementById("inventory-table")) loadInventory();
  if (document.getElementById("categories-body")) loadCategories();
});

export { db, loadInventory, addInventoryItem, deleteItem, editItem, openModal, closeModal, loadCategories, addCategory, deleteCategory, openCategoryModal, closeCategoryModal, createAdmin, login, changePassword, logout };

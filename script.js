import {initializeApp 
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";

import {getFirestore, collection, addDoc, getDocs, deleteDoc, doc, updateDoc, getDoc
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, 
createUserWithEmailAndPassword, updatePassword, signOut } 
from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = "login.html";
    }
});

// Firebase Initialization
const firebaseConfig = {
apiKey: "AIzaSyBtgxtAbtr84q_CigTdt3W0wqadvsZkOGI",
authDomain: "stock-inventory-78e6f.firebaseapp.com",
projectId: "stock-inventory-78e6f",
storageBucket: "stock-inventory-78e6f.firebasestorage.app",
messagingSenderId: "437284393762",
appId: "1:437284393762:web:d7441ef89cf88e35f94b7b"
};

const auth = getAuth(app);
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

window.db = db;

// Global ADMIN_KEY
let ADMIN_KEY = "";

async function fetchAdminKey(){
const keyDoc = await getDoc(doc(db,"settings","adminConfig"));
ADMIN_KEY = keyDoc.data().adminKey;
}


// Call at startup
fetchAdminKey();

// ------------INVENTORY FUNCTIONS---------- //

// Load Inventory from Database
async function loadInventory(){

let table = document.getElementById("inventory-table");

table.innerHTML="";

const querySnapshot = await getDocs(collection(db,"inventory"));

querySnapshot.forEach((docItem)=>{

let data = docItem.data();

let row = `
<tr>
<td>${data.name}</td>
<td>${data.quantity}</td>
<td>${data.price}</td>
</tr>
`;

table.innerHTML += row;

});

}

// Add Inventory Item to Database 
async function addInventoryItem(){

let name = document.getElementById("item-name").value;
let quantity = document.getElementById("item-qty").value;
let price = document.getElementById("item-price").value;

if(!name || !quantity || !price){
alert("Please fill all fields");
return;
}

try{
await addDoc(collection(db,"inventory"),{
name:name,
quantity:parseInt(quantity),
price:parseFloat(price),
dateAdded:new Date().toISOString()
});

if(isNaN(quantity) || isNaN(price)){
    alert("Invalid number input");
    return;
}

alert("Item added successfully");
loadInventory();

}catch(error){
console.error(error);
}
}

// Reset Inventory from Firebase
async function resetInventory(){

if(!confirm("Are you sure you want to reset the entire inventory?")){
return;
}

let key = prompt("Enter Admin Key to confirm reset:");

if(key !== ADMIN_KEY){
alert("Invalid Admin Key!");
return;
}

const querySnapshot = await getDocs(collection(db,"inventory"));
for (const item of querySnapshot.docs){
    await deleteDoc(doc(db,"inventory",item.id));
}

alert("Inventory cleared");

loadInventory();

}

// Export Backup from Firebase
async function exportBackup(){

if(!confirm("Are you sure you want to export backup?")){
return;
}

let key = prompt("Enter Admin Key");

if(key !== ADMIN_KEY){
alert("Invalid key");
return;
}

const querySnapshot = await getDocs(collection(db,"inventory"));

let data=[];

querySnapshot.forEach((docItem)=>{

data.push(docItem.data());

});

let blob = new Blob([JSON.stringify(data,null,2)],{type:"application/json"});

let link=document.createElement("a");

link.href=URL.createObjectURL(blob);

link.download="inventory-backup.json";

link.click();

}

// ------------ADMIN FUNCTIONS--------------//

// Admin Account System
import { getAuth, createUserWithEmailAndPassword } 
from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

async function createAdmin(){

let email = document.getElementById("username").value;
let password = document.getElementById("password").value;
let adminKey = document.getElementById("admin-key").value;

if(adminKey !== ADMIN_KEY){
    alert("Invalid Admin Key");
    return;
}

try{
    await createUserWithEmailAndPassword(auth, email, password);

    // Optional: store role only (no password)
    await addDoc(collection(db,"admins"),{
        email: email,
        role: "admin"
    });

    alert("Admin account created securely!");

}catch(error){
    alert(error.message);
}
}

// Login Using Firebase Database "FireStore"
import { signInWithEmailAndPassword } 
from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

async function login(){

let email = document.getElementById("username").value;
let password = document.getElementById("password").value;

try{
    await signInWithEmailAndPassword(auth, email, password);

    localStorage.setItem("adminUser", email);
    window.location.href = "inventory.html";

}catch(error){
    alert("Invalid login");
}
}

// Change Password
import { updatePassword } 
from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

async function changePassword(){

let key = prompt("Enter Admin Key before changing password:");

if(key !== ADMIN_KEY){
    alert("Invalid Admin Key!");
    return;
}

let newPass = document.getElementById("new-password").value;

if(!newPass){
    alert("Password cannot be empty");
    return;
}

try{
    const user = auth.currentUser;
    await updatePassword(user, newPass);

    alert("Password updated securely!");

}catch(error){
    alert(error.message);
}
}

// LOGOUT
import { signOut } 
from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

function logout(){

if(confirm("Are you sure you want to logout?")){

    signOut(auth);
    localStorage.removeItem("adminUser");
    window.location.href="login.html";

}
}

// Expose functions to window
window.addInventoryItem = addInventoryItem;
window.loadInventory = loadInventory;
window.resetInventory = resetInventory;
window.exportBackup = exportBackup;
window.createAdmin = createAdmin;
window.login = login;
window.changePassword = changePassword;
window.logout = logout;

export { db };
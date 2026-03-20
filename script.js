import {initializeApp 
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";

import {getFirestore, collection, addDoc, getDocs, deleteDoc, doc, updateDoc
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";


// Firebase Initialization
const firebaseConfig = {
apiKey: "AIzaSyBtgxtAbtr84q_CigTdt3W0wqadvsZkOGI",
authDomain: "stock-inventory-78e6f.firebaseapp.com",
projectId: "stock-inventory-78e6f",
storageBucket: "stock-inventory-78e6f.firebasestorage.app",
messagingSenderId: "437284393762",
appId: "1:437284393762:web:d7441ef89cf88e35f94b7b"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

window.db = db;

// Global ADMIN_KEY
let ADMIN_KEY = "";

async function fetchAdminKey(){
const keyDoc = await getDoc(doc(db,"settings","adminConfig"));
const ADMIN_KEY = keyDoc.data().adminKey;
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

if(!name || !quantity){
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

if(key !== "OWNER123"){
alert("Invalid Admin Key!");
return;
}

const querySnapshot = await getDocs(collection(db,"inventory"));

querySnapshot.forEach(async (item)=>{

await deleteDoc(doc(db,"inventory",item.id));

});

alert("Inventory cleared");

loadInventory();

}

// Export Backup from Firebase
async function exportBackup(){

if(!confirm("Are you sure you want to export backup?")){
return;
}

let key = prompt("Enter Admin Key");

if(key !== "OWNER123"){
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
async function createAdmin(){

let username = document.getElementById("username").value;

let password = document.getElementById("password").value;

let adminKey = document.getElementById("admin-key").value;

if(adminKey !== "OWNER123"){

alert("Invalid Admin Key");

return;

}

await addDoc(collection(db,"admins"),{

username:username,
password:password,
role:"admin"

});

alert("Admin account created");

}

// Login Using Firebase Database "FireStore"
async function login(){

let username = document.getElementById("username").value;

let password = document.getElementById("password").value;

const querySnapshot = await getDocs(collection(db,"admins"));

let success=false;

querySnapshot.forEach((docUser)=>{

let data = docUser.data();

if(data.username === username && data.password === password){

success=true;

}

});

if(success){

localStorage.setItem("adminUser",username);

window.location.href="inventory.html";

}else{

alert("Invalid login");

}

}


// Change Password
function changePassword(){

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

localStorage.setItem("adminPass", newPass);

alert("Password updated successfully!");

}

// LOGOUT
function logout(){

if(confirm("Are you sure you want to logout?")){
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
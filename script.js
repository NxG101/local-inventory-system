const ADMIN_KEY = "OWNER123";

function exportBackup(){

if(!confirm("Are you sure you want to export backup?")){
return;
}

let key = prompt("Enter Admin Key to continue:");

if(key !== ADMIN_KEY){
alert("Invalid Admin Key!");
return;
}

let data = localStorage.getItem("inventoryData") || "[]";

let blob = new Blob([data],{type:"application/json"});

let link = document.createElement("a");

link.href = URL.createObjectURL(blob);

link.download = "inventory-backup.json";

link.click();

alert("Backup exported successfully!");

}

function resetInventory(){

if(!confirm("Are you sure you want to reset the entire inventory?")){
return;
}

let key = prompt("Enter Admin Key to confirm reset:");

if(key !== ADMIN_KEY){
alert("Invalid Admin Key!");
return;
}

localStorage.removeItem("inventoryData");

alert("Inventory has been reset!");

}

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

function logout(){

if(confirm("Are you sure you want to logout?")){
localStorage.removeItem("adminUser");
window.location.href="login.html";
}

}
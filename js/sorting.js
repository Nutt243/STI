import { db } from "./auth.js";
import { collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

let allPendingItems = []; 

// 1. ดึงรายการสินค้ารอคัดแยก
async function fetchPendingItems() {
  const listContainer = document.getElementById("pending-list");
  
  try {
    const q = query(collection(db, "products"), where("status", "==", "pending"));
    const querySnapshot = await getDocs(q);

    allPendingItems = [];
    querySnapshot.forEach((doc) => {
      allPendingItems.push({ id: doc.id, ...doc.data() });
    });

    renderItems(allPendingItems);
  } catch (error) {
    console.error("Error fetching items:", error);
    listContainer.innerHTML = `<p class="text-red-500 text-center">เกิดข้อผิดพลาดในการโหลดข้อมูล</p>`;
  }
}

// 2. เรนเดอร์รายการสินค้า (เคลียร์ DOM เก่าเพื่อแก้บั๊กรายการซ้ำ/ไม่หายไป)
function renderItems(items) {
  const container = document.getElementById("pending-list");

  // 🔴 ล้างข้อมูลเก่าบนหน้าจอก่อนทุกครั้งที่เรียกฟังก์ชัน!
  container.innerHTML = "";

  if (items.length === 0) {
    container.innerHTML = `
      <div class="text-center py-10 text-gray-400">
        ไม่พบรายการสินค้ารอคัดแยกในหมวดหมู่นี้
      </div>`;
    return;
  }

  items.forEach((item) => {
    const card = document.createElement("div");
    card.className = "p-4 border border-gray-200 rounded-lg flex justify-between items-center bg-gray-50 hover:bg-gray-100 transition";
    card.innerHTML = `
      <div>
        <h3 class="font-bold text-gray-800 text-lg">${item.name}</h3>
        <p class="text-xs text-gray-500 mt-1">
          หมวดหมู่: <span class="bg-blue-100 text-blue-700 px-2 py-0.5 rounded">${item.category}</span>
          | จำนวน: ${item.quantity || 1} ชิ้น
        </p>
      </div>
      <span class="px-3 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-700">
        รอคัดแยก
      </span>
    `;
    container.appendChild(card);
  });
}

// 3. กรองข้อมูลตามหมวดหมู่
export function filterCategory(category) {
  if (category === "all") {
    renderItems(allPendingItems);
  } else {
    const filtered = allPendingItems.filter(item => item.category === category);
    renderItems(filtered);
  }
}

window.filterCategory = filterCategory;

// เรียกทำงานทันทีเมื่อเปิดหน้า
fetchPendingItems();
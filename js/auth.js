import { auth } from "./firebase-config.js";
import { signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { db } from "./firebase-config.js";

// ฟังก์ชันออกจากระบบ พร้อมป๊อปอัปยืนยัน
export async function logoutUser() {
  const confirmLogout = confirm("คุณต้องการออกจากระบบใช่หรือไม่?");
  if (!confirmLogout) return;

  try {
    await signOut(auth);
    window.location.href = "login.html";
  } catch (error) {
    alert("เกิดข้อผิดพลาดในการออกจากระบบ: " + error.message);
  }
}

// ตรวจสอบสิทธิ์การเข้าใช้งาน
export function checkUserAuth(allowedRoles = []) {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = "login.html";
      return;
    }

    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        // แสดงชื่อผู้ใช้ใน Navbar
        const nameEl = document.getElementById("userDisplayName");
        if (nameEl) {
          nameEl.textContent = userData.name || user.email;
        }

        // ซ่อน/แสดง เมนูเฉพาะ Admin
        const adminElements = document.querySelectorAll(".admin-only");
        adminElements.forEach(el => {
          if (userData.role === "admin") {
            el.classList.remove("hidden");
          } else {
            el.classList.add("hidden");
          }
        });

        // ตรวจสอบ Role
        if (allowedRoles.length > 0 && !allowedRoles.includes(userData.role)) {
          alert("คุณไม่มีสิทธิ์เข้าถึงหน้านี้");
          window.location.href = "index.html";
        }
      }
    } catch (err) {
      console.error("Error checking auth status:", err);
    }
  });
}

// ผูก Event ให้ปุ่ม logout ทุกหน้าอัตโนมัติ
document.addEventListener("DOMContentLoaded", () => {
  const btnLogout = document.getElementById("btnLogout");
  if (btnLogout) {
    btnLogout.addEventListener("click", logoutUser);
  }
});
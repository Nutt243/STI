// js/auth.js
import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

/**
 * ฟังก์ชันตรวจเช็กการเข้าถึงหน้าเว็บตาม Role และ Status
 * @param {Array<string>} allowedRoles - เช่น ['admin', 'user']
 */
export function checkUserAuth(allowedRoles = ['admin', 'user']) {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      // ถ้ายังไม่ได้เข้าสู่ระบบ ให้ส่งกลับไปหน้า Login (หรือ index.html)
      if (!window.location.pathname.endsWith("index.html") && window.location.pathname !== "/") {
        window.location.href = "index.html";
      }
      return;
    }

    try {
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        alert("ไม่พบข้อมูลผู้ใช้งานในระบบ");
        await signOut(auth);
        window.location.href = "index.html";
        return;
      }

      const userData = userSnap.data();

      // 1. ตรวจสอบสถานะการอนุมัติ
      if (userData.status !== "approved") {
        alert("บัญชีของคุณยังไมได้รับการอนุมัติ หรือถูกระงับการใช้งาน");
        await signOut(auth);
        window.location.href = "index.html";
        return;
      }

      // 2. ตรวจสอบ Role ว่าตรงกับหน้าที่เข้าใช้งานหรือไม่
      const userRole = userData.role || "user";
      if (!allowedRoles.includes(userRole)) {
        alert("คุณไม่มีสิทธิ์เข้าถึงหน้านี้");
        window.location.href = userRole === "admin" ? "admin-dashboard.html" : "requisition.html";
        return;
      }

      // 3. ปรับ UI ของ Navbar ตามสิทธิ์ผู้ใช้
      updateNavbarUI(user, userData);

    } catch (error) {
      console.error("Error verifying user auth:", error);
    }
  });
}

/**
 * แสดง/ซ่อน เมนู Navbar และชื่อผู้ใช้
 */
function updateNavbarUI(user, userData) {
  const userDisplayName = document.getElementById("userDisplayName");
  if (userDisplayName) {
    userDisplayName.textContent = userData.name || user.email;
  }

  // ซ่อน/แสดง เมนูตาม Role
  const adminElements = document.querySelectorAll(".admin-only");
  adminElements.forEach(el => {
    el.style.display = (userData.role === "admin") ? "block" : "none";
  });

  // ผูก Event ปุ่ม Logout
  const btnLogout = document.getElementById("btnLogout");
  if (btnLogout) {
    btnLogout.onclick = async () => {
      try {
        await signOut(auth);
        window.location.href = "index.html";
      } catch (err) {
        console.error("Logout failed:", err);
      }
    };
  }
}
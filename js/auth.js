import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

/**
 * ฟังก์ชันตรวจสอบสิทธิ์การเข้าใช้งาน
 * @param {Array<string>} allowedRoles - รายชื่อ Role ที่อนุญาต เช่น ['admin'] หรือ ['admin', 'manager']
 */
export function checkUserAuth(allowedRoles = []) {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = "login.html";
      return;
    }

    try {
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      const userData = userSnap.exists() ? userSnap.data() : {};
      
      const userRole = (userData.role || "user").toLowerCase();
      const userStatus = (userData.status || "approved").toLowerCase(); // ค่าเริ่มต้นให้เป็น approved/active
      const userName = userData.name || user.displayName || user.email;

      // 🛑 ตรวจสอบการอนุมัติบัญชี: ยอมรับทั้ง 'approved' และ 'active'
      const isUserApproved = userStatus === "approved" || userStatus === "active";

      if (!isUserApproved) {
        alert("⚠️ บัญชีของคุณยังไม่อนุมัติการเข้าใช้งาน หรือถูกระงับสิทธิ์ โปรดติดต่อ Admin");
        await signOut(auth);
        window.location.href = "login.html";
        return;
      }

      // แสดงชื่อผู้ใช้และบทบาทบน Navbar
      const nameElem = document.getElementById("userDisplayName");
      if (nameElem) {
        nameElem.innerText = `${userName} (${userRole.toUpperCase()})`;
      }

      // ⚙️ แสดง/ซ่อน เมนูตามบทบาท
      // สิทธิ์ Manager & Admin (เห็นหน้า อนุมัติเบิก + รับสินค้าเข้า)
      if (userRole === "admin" || userRole === "manager") {
        document.querySelectorAll(".manager-only").forEach(el => el.classList.remove("hidden"));
      } else {
        document.querySelectorAll(".manager-only").forEach(el => el.classList.add("hidden"));
      }

      // สิทธิ์ Admin เท่านั้น (เห็นหน้า จัดการผู้ใช้งาน)
      if (userRole === "admin") {
        document.querySelectorAll(".admin-only").forEach(el => el.classList.remove("hidden"));
      } else {
        document.querySelectorAll(".admin-only").forEach(el => el.classList.add("hidden"));
      }

      // 🔒 บล็อกการเข้าถึงหน้า หากบทบาทไม่ตรง
      if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
        alert(`⚠️ หน้านี้สำหรับสิทธิ์ ${allowedRoles.join(" / ").toUpperCase()} เท่านั้น`);
        window.location.href = "index.html";
      }

    } catch (err) {
      console.error("Auth Check Error:", err);
    }
  });
}

// Event Logout
document.addEventListener("DOMContentLoaded", () => {
  const btnLogout = document.getElementById("btnLogout");
  if (btnLogout) {
    btnLogout.addEventListener("click", async () => {
      if (confirm("คุณต้องการออกจากระบบใช่หรือไม่?")) {
        await signOut(auth);
        window.location.href = "login.html";
      }
    });
  }
});
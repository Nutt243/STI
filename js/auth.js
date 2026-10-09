import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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
      const userStatus = (userData.status || "pending").toLowerCase();
      const userName = userData.name || user.displayName || user.email;

      const isUserApproved = userStatus === "active" || userStatus === "approved";

      if (!isUserApproved) {
        alert("⚠️ บัญชีของคุณยังไม่อนุมัติการเข้าใช้งาน หรือถูกระงับสิทธิ์ โปรดติดต่อ Admin");
        await signOut(auth);
        window.location.href = "login.html";
        return;
      }

      const nameElem = document.getElementById("userDisplayName");
      if (nameElem) nameElem.innerText = `${userName} (${userRole.toUpperCase()})`;
      
      const mobileNameElem = document.getElementById("mobileUserDisplayName");
      if (mobileNameElem) mobileNameElem.innerText = `${userName} (${userRole.toUpperCase()})`;

      if (userRole === "admin" || userRole === "manager") {
        document.querySelectorAll(".manager-only").forEach(el => el.classList.remove("hidden"));
      } else {
        document.querySelectorAll(".manager-only").forEach(el => el.classList.add("hidden"));
      }

      if (userRole === "admin") {
        document.querySelectorAll(".admin-only").forEach(el => el.classList.remove("hidden"));
      } else {
        document.querySelectorAll(".admin-only").forEach(el => el.classList.add("hidden"));
      }

      if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
        alert(`⚠️ หน้านี้สำหรับสิทธิ์ ${allowedRoles.join(" / ").toUpperCase()} เท่านั้น`);
        window.location.href = "index.html";
        return;
      }

      document.body.style.display = "block";

    } catch (err) {
      console.error("Auth Check Error:", err);
      await signOut(auth);
      window.location.href = "login.html";
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const handleLogout = async () => {
    if (confirm("คุณต้องการออกจากระบบใช่หรือไม่?")) {
      await signOut(auth);
      window.location.href = "login.html?loggedOut=true";
    }
  };

  const btnLogout = document.getElementById("btnLogout");
  if (btnLogout) btnLogout.addEventListener("click", handleLogout);

  const btnMobileLogout = document.getElementById("btnMobileLogout");
  if (btnMobileLogout) btnMobileLogout.addEventListener("click", handleLogout);

  const btnMobileMenu = document.getElementById("btnMobileMenu");
  const mobileNavMenu = document.getElementById("mobileNavMenu");
  if (btnMobileMenu && mobileNavMenu) {
    btnMobileMenu.addEventListener("click", () => {
      mobileNavMenu.classList.toggle("hidden");
    });
  }
});
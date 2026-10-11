import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc, collection, query, where, onSnapshot, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

let unsubscribePendingListener = null;
let unsubscribeUserPendingListener = null; // เพิ่มตัวแปรเก็บ listener ของ user

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
        setupPendingBadgeListener();
      } else {
        document.querySelectorAll(".manager-only").forEach(el => el.classList.add("hidden"));
      }

      if (userRole === "admin") {
        document.querySelectorAll(".admin-only").forEach(el => el.classList.remove("hidden"));
      } else {
        document.querySelectorAll(".admin-only").forEach(el => el.classList.add("hidden"));
      }

      // เรียกใช้งานฟังก์ชันผูกตัวเลขแจ้งเตือนค้างเบิกของผู้ใช้ทั่วไปในทุกหน้า
      setupUserPendingBadge(user);

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

function setupPendingBadgeListener() {
  if (unsubscribePendingListener) return;

  const qPending = query(collection(db, "requisitions"), where("status", "==", "pending"));
  unsubscribePendingListener = onSnapshot(qPending, (snapshot) => {
    const pendingCount = snapshot.size;

    const desktopBadge = document.getElementById("navPendingCount");
    const mobileBadge = document.getElementById("mobileNavPendingCount");

    if (pendingCount > 0) {
      if (desktopBadge) {
        desktopBadge.innerText = `(${pendingCount})`;
        desktopBadge.classList.remove("hidden");
      }
      if (mobileBadge) {
        mobileBadge.innerText = `(${pendingCount})`;
        mobileBadge.classList.remove("hidden");
      }
    } else {
      if (desktopBadge) desktopBadge.classList.add("hidden");
      if (mobileBadge) mobileBadge.classList.add("hidden");
    }
  }, (err) => {
    console.error("Error listening to pending requisitions:", err);
  });
}

// อัปเดตฟังก์ชันให้ทำงานแบบ Real-time ด้วย onSnapshot เพื่อให้ตัวเลขเปลี่ยนทันที
export function setupUserPendingBadge(currentUser) {
  if (!currentUser) return;
  if (unsubscribeUserPendingListener) return;

  const qMy = query(
    collection(db, "requisitions"), 
    where("userId", "==", currentUser.uid), 
    where("status", "==", "pending")
  );

  unsubscribeUserPendingListener = onSnapshot(qMy, (snapshot) => {
    const count = snapshot.size;

    const navHistoryBadge = document.getElementById("navHistoryPendingCount");
    const mobileNavHistoryBadge = document.getElementById("mobileNavHistoryPendingCount");

    if (count > 0) {
      if (navHistoryBadge) {
        navHistoryBadge.innerText = `(${count})`;
        navHistoryBadge.classList.remove("hidden");
      }
      if (mobileNavHistoryBadge) {
        mobileNavHistoryBadge.innerText = `(${count})`;
        mobileNavHistoryBadge.classList.remove("hidden");
      }
    } else {
      if (navHistoryBadge) navHistoryBadge.classList.add("hidden");
      if (mobileNavHistoryBadge) mobileNavHistoryBadge.classList.add("hidden");
    }
  }, (err) => {
    console.error("Error listening to user pending badge:", err);
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

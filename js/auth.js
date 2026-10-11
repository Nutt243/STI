import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc, collection, query, where, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

let unsubscribePendingListener = null;
let unsubscribeUserPendingListener = null; 

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

// ==========================================
// ระบบแจ้งเตือนกลาง (เปลี่ยนเป็นตุ่มแดงสถานะ เปิด/ปิด)
// ==========================================
let allUserRequisitionsCache = [];

export function initNotifications(requisitionsList) {
  allUserRequisitionsCache = requisitionsList || [];
  renderNotificationsGlobal();
}

function renderNotificationsGlobal() {
  const notifContainer = document.getElementById("notifListContainer");
  const badge = document.getElementById("notifBadge");
  const mobileBadge = document.getElementById("mobileNotifBadge");

  if (!notifContainer) return;

  const processedReqs = allUserRequisitionsCache.filter(r => r.status === "approved" || r.status === "rejected");

  if (processedReqs.length === 0) {
    notifContainer.innerHTML = `<p class="text-center text-slate-400 py-6 text-xs">ไม่มีการแจ้งเตือนใหม่</p>`;
    if (badge) badge.classList.add("hidden");
    if (mobileBadge) mobileBadge.classList.add("hidden");
    return;
  }

  const lastReadTime = parseInt(localStorage.getItem(`lastReadNotif_${auth.currentUser?.uid}`) || "0");

  // เช็คว่ามีรายการไหนที่เวลาอนุมัติ/ไม่อนุมัติ ใหม่กว่าเวลาที่กดอ่านล่าสุดหรือไม่
  const hasUnread = processedReqs.some(req => {
    const reqTime = req.approvedAt || req.rejectedAt ? (req.approvedAt || req.rejectedAt).toMillis() : 0;
    return reqTime > lastReadTime;
  });

  // ควบคุมการแสดงผลตุ่มแดง (เปิด/ปิด)
  if (hasUnread) {
    if (badge) badge.classList.remove("hidden");
    if (mobileBadge) mobileBadge.classList.remove("hidden");
  } else {
    if (badge) badge.classList.add("hidden");
    if (mobileBadge) mobileBadge.classList.add("hidden");
  }

  notifContainer.innerHTML = "";

  processedReqs.slice(0, 5).forEach(req => {
    const isApproved = req.status === "approved";
    const dateStr = req.approvedAt || req.rejectedAt 
      ? new Date((req.approvedAt || req.rejectedAt).toDate()).toLocaleDateString('th-TH') 
      : '-';
    const itemNames = (req.items || []).map(i => i.sku_name).join(", ");

    const div = document.createElement("a");
    div.href = "history.html";
    div.className = "block p-2.5 rounded-xl bg-slate-50 hover:bg-blue-50 border border-slate-100 transition text-xs space-y-1";

    div.innerHTML = `
      <div class="flex justify-between items-center">
        <span class="font-bold ${isApproved ? 'text-emerald-700' : 'text-rose-600'}">
          ${isApproved ? '🎉 คำขอได้รับการอนุมัติแล้ว' : '❌ คำขอไม่ได้รับการอนุมัติ'}
        </span>
        <span class="text-[10px] text-slate-400 font-mono">${dateStr}</span>
      </div>
      <p class="text-slate-700 font-medium truncate">${itemNames}</p>
      ${!isApproved && req.rejectReason ? `<p class="text-[10px] text-rose-500 truncate">เหตุผล: ${req.rejectReason}</p>` : ''}
    `;

    notifContainer.appendChild(div);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const btnBell = document.getElementById("btnNotifBell");
  const dropdown = document.getElementById("notifDropdown");
  const btnMobileBell = document.getElementById("btnMobileNotifBell");
  const badge = document.getElementById("notifBadge");
  const mobileBadge = document.getElementById("mobileNotifBadge");

  function markNotificationsAsRead() {
    if (dropdown && dropdown.classList.contains("hidden")) {
      // ซ่อนตุ่มแดงทันทีเมื่อกดเปิดดู
      if (badge) badge.classList.add("hidden");
      if (mobileBadge) mobileBadge.classList.add("hidden");
      
      const processedReqs = allUserRequisitionsCache.filter(r => r.status === "approved" || r.status === "rejected");
      if (processedReqs.length > 0) {
        // ใช้เวลาปัจจุบันบันทึกว่าอ่านแล้ว เพื่อให้ตุ่มแดงหายไปทุกหน้าพร้อมกัน
        const currentTime = Date.now();
        if (auth.currentUser) {
          localStorage.setItem(`lastReadNotif_${auth.currentUser.uid}`, currentTime);
        }
      }
    }
    if (dropdown) dropdown.classList.toggle("hidden");
  }

  if (btnBell && dropdown) {
    btnBell.addEventListener("click", (e) => {
      e.stopPropagation();
      markNotificationsAsRead();
    });

    document.addEventListener("click", (e) => {
      if (!dropdown.contains(e.target) && e.target !== btnBell) {
        dropdown.classList.add("hidden");
      }
    });
  }

  if (btnMobileBell && dropdown) {
    btnMobileBell.addEventListener("click", (e) => {
      e.stopPropagation();
      markNotificationsAsRead();
    });
  }
});
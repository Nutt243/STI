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

let allUserRequisitionsCache = [];

export function initNotifications(requisitionsList) {
  allUserRequisitionsCache = requisitionsList || [];
  renderNotificationsGlobal();
}

function renderNotificationsGlobal() {
  const notifContainers = document.querySelectorAll("#notifListContainer");
  const badges = document.querySelectorAll("#notifBadge, #mobileNotifBadge");

  if (notifContainers.length === 0) return;

  const processedReqs = allUserRequisitionsCache.filter(r => r.status === "approved" || r.status === "rejected");

  if (processedReqs.length === 0) {
    notifContainers.forEach(container => {
      container.innerHTML = `<p class="text-center text-slate-400 py-6 text-xs">ไม่มีการแจ้งเตือนใหม่</p>`;
    });
    badges.forEach(b => b.classList.add("hidden"));
    return;
  }

  const lastReadTime = parseInt(localStorage.getItem(`lastReadNotif_${auth.currentUser?.uid}`) || "0");

  const hasUnread = processedReqs.some(req => {
    const reqTime = req.approvedAt || req.rejectedAt ? (req.approvedAt || req.rejectedAt).toMillis() : 0;
    return reqTime > lastReadTime;
  });

  if (hasUnread) {
    badges.forEach(b => b.classList.remove("hidden"));
  } else {
    badges.forEach(b => b.classList.add("hidden"));
  }

  let htmlContent = "";
  processedReqs.slice(0, 5).forEach(req => {
    const isApproved = req.status === "approved";
    const dateStr = req.approvedAt || req.rejectedAt 
      ? new Date((req.approvedAt || req.rejectedAt).toDate()).toLocaleDateString('th-TH') 
      : '-';
    const itemNames = (req.items || []).map(i => i.sku_name).join(", ");

    htmlContent += `
      <a href="history.html" class="block p-2.5 rounded-xl bg-slate-50 hover:bg-blue-50 border border-slate-100 transition text-xs space-y-1">
        <div class="flex justify-between items-center">
          <span class="font-bold ${isApproved ? 'text-emerald-700' : 'text-rose-600'}">
            ${isApproved ? '🎉 คำขอได้รับการอนุมัติแล้ว' : '❌ คำขอไม่ได้รับการอนุมัติ'}
          </span>
          <span class="text-[10px] text-slate-400 font-mono">${dateStr}</span>
        </div>
        <p class="text-slate-700 font-medium truncate">${itemNames}</p>
        ${!isApproved && req.rejectReason ? `<p class="text-[10px] text-rose-500 truncate">เหตุผล: ${req.rejectReason}</p>` : ''}
      </a>
    `;
  });

  notifContainers.forEach(container => {
    container.innerHTML = htmlContent;
  });
}

window.addEventListener("storage", (e) => {
  if (auth.currentUser && e.key === `lastReadNotif_${auth.currentUser.uid}`) {
    renderNotificationsGlobal();
  }
});

document.addEventListener("DOMContentLoaded", () => {
  const btnBells = document.querySelectorAll("#btnNotifBell, #btnMobileNotifBell");
  const dropdowns = document.querySelectorAll("#notifDropdown");
  const badges = document.querySelectorAll("#notifBadge, #mobileNotifBadge");

  function toggleDropdown() {
    if (dropdowns.length === 0) return;
    
    const isHidden = dropdowns[0].classList.contains("hidden");

    if (isHidden) {
      badges.forEach(b => b.classList.add("hidden"));

      const processedReqs = allUserRequisitionsCache.filter(r => r.status === "approved" || r.status === "rejected");
      if (processedReqs.length > 0 && auth.currentUser) {
        const now = Date.now();
        localStorage.setItem(`lastReadNotif_${auth.currentUser.uid}`, now);
        window.dispatchEvent(new Event("storage"));
      }

      dropdowns.forEach(d => d.classList.remove("hidden"));
    } else {
      dropdowns.forEach(d => d.classList.add("hidden"));
    }
  }

  btnBells.forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleDropdown();
    });
  });

  document.addEventListener("click", (e) => {
    let clickedInside = false;
    btnBells.forEach(btn => { if (btn.contains(e.target)) clickedInside = true; });
    dropdowns.forEach(d => { if (d.contains(e.target)) clickedInside = true; });

    if (!clickedInside) {
      dropdowns.forEach(d => d.classList.add("hidden"));
    }
  });
});

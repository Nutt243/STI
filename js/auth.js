import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ⚙️ Firebase Config
const firebaseConfig = {
    apiKey: "process.env.FIREBASE_API_KEY",
  authDomain: "stockcom02-86eaf.firebaseapp.com",
  projectId: "stockcom02-86eaf",
  storageBucket: "stockcom02-86eaf.firebasestorage.app",
  messagingSenderId: "918587005644",
  appId: "1:918587005644:web:9eb2ae0df1dfe940970069",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// 🚪 ฟังก์ชัน Logout
export function handleLogout() {
  if (confirm("คุณต้องการออกจากระบบใช่หรือไม่?")) {
    signOut(auth)
      .then(() => {
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = "login.html";
      })
      .catch((error) => {
        alert("เกิดข้อผิดพลาดในการออกจากระบบ: " + error.message);
      });
  }
}

// ผูกเข้ากับ window เพื่อความปลอดภัยกรณีเรียกจาก inline HTML
window.handleLogout = handleLogout;

// 🛡️ ตรวจสอบสิทธิ์ผู้ใช้และเปิด/ปิด เมนู Admin
export function checkUserRole(onRoleFetched) {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      try {
        const userDocRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userDocRef);

        if (userSnap.exists()) {
          const userData = userSnap.data();
          const role = userData.role || "user";
          updateNavigationUI(role);
          if (onRoleFetched) onRoleFetched(user, role);
        } else {
          updateNavigationUI("user");
        }
      } catch (err) {
        console.error("Error checking role:", err);
      }
    } else {
      if (!window.location.pathname.includes("login.html")) {
        window.location.href = "login.html";
      }
    }
  });
}

function updateNavigationUI(role) {
  const adminElements = document.querySelectorAll(".admin-only");
  if (role === "admin") {
    adminElements.forEach((el) => el.classList.remove("hidden"));
  } else {
    adminElements.forEach((el) => el.classList.add("hidden"));
  }
}

// รันตรวจสิทธิ์อัตโนมัติ
checkUserRole();
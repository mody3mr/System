// استدعاء مكتبات فايربيس (تأكد من تعديل الروابط للإصدار الذي تستخدمه إذا لزم الأمر)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

// 1. إعدادات فايربيس (ضع إعدادات مشروعك هنا)
const firebaseConfig = {
  apiKey: "AIzaSyDQjq4pJ_zbPS8j05f7pENHUZNW2EduaIY",
  authDomain: "system-ca72d.firebaseapp.com",
  projectId: "system-ca72d",
  storageBucket: "system-ca72d.firebasestorage.app",
  messagingSenderId: "48224129684",
  appId: "1:48224129684:web:498d7055a253196f831a81"
};

// تهيئة فايربيس
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// عناصر الواجهة
const loginSection = document.getElementById('login-section');
const dashboardSection = document.getElementById('dashboard-section');
const loginForm = document.getElementById('login-form');
const currentUserRole = document.getElementById('current-user-role');
const logoutBtn = document.getElementById('nav-logout');

// 2. مراقبة حالة تسجيل الدخول والصلاحيات
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // إخفاء تسجيل الدخول وإظهار الداشبورد
        loginSection.style.display = 'none';
        dashboardSection.style.display = 'flex';
        
        // جلب صلاحية المستخدم من Firestore (بافتراض وجود كوليكشن users)
        try {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists()) {
                const userData = userDoc.data();
                const role = userData.role === 'admin' ? 'أدمن' : 'مشرف';
                currentUserRole.textContent = `مرحباً، ${userData.name || 'المستخدم'} (${role})`;
                
                // هنا يمكنك إخفاء بعض القوائم لو كان المستخدم "مشرف" وليس "أدمن"
                if (userData.role !== 'admin') {
                    document.getElementById('nav-settings').style.display = 'none'; // مثال: إخفاء الإعدادات
                }
            } else {
                currentUserRole.textContent = `مرحباً بك`;
            }
        } catch (error) {
            console.error("خطأ في جلب الصلاحيات:", error);
        }

        // رسم المخططات البيانية
        initCharts();
        // يمكنك هنا استدعاء دوال أخرى لجلب الإحصائيات والأرقام وملء الكروت
        
    } else {
        // إظهار تسجيل الدخول وإخفاء الداشبورد
        loginSection.style.display = 'flex';
        dashboardSection.style.display = 'none';
    }
});

// 3. تسجيل الدخول
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            console.log("تم تسجيل الدخول بنجاح");
        })
        .catch((error) => {
            alert("خطأ في تسجيل الدخول: " + error.message);
        });
});

// 4. تسجيل الخروج
logoutBtn.addEventListener('click', (e) => {
    e.preventDefault();
    signOut(auth).then(() => {
        console.log("تم تسجيل الخروج");
    }).catch((error) => {
        console.error("خطأ أثناء تسجيل الخروج:", error);
    });
});

// 5. المخططات البيانية (Chart.js)
function initCharts() {
    // مخطط عمليات البيع
    const salesCtx = document.getElementById('salesChart').getContext('2d');
    new Chart(salesCtx, {
        type: 'bar',
        data: {
            labels: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو'],
            datasets: [{
                label: 'مبيعات محصلة (أخضر)',
                data: [12000, 19000, 3000, 5000, 20000, 30000],
                backgroundColor: '#2ecc71'
            }, {
                label: 'مبيعات آجلة/ديون (أحمر)',
                data: [2000, 3000, 1000, 1500, 2000, 5000],
                backgroundColor: '#e74c3c'
            }]
        },
        options: { responsive: true }
    });

    // مخطط عمليات الشراء
    const purchasesCtx = document.getElementById('purchasesChart').getContext('2d');
    new Chart(purchasesCtx, {
        type: 'line',
        data: {
            labels: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو'],
            datasets: [{
                label: 'مشتريات مدفوعة (أخضر)',
                data: [8000, 15000, 5000, 10000, 12000, 25000],
                borderColor: '#2ecc71',
                fill: false,
                tension: 0.1
            }, {
                label: 'مشتريات آجلة/ديون (أحمر)',
                data: [4000, 2000, 3000, 5000, 8000, 10000],
                borderColor: '#e74c3c',
                fill: false,
                tension: 0.1
            }]
        },
        options: { responsive: true }
    });
}

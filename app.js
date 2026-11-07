import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import { getFirestore, doc, getDoc, collection, addDoc, onSnapshot, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

// ⚠️ ضع إعدادات مشروعك الحقيقية هنا ⚠️
const firebaseConfig = {
  apiKey: "AIzaSyDQjq4pJ_zbPS8j05f7pENHUZNW2EduaIY",
  authDomain: "system-ca72d.firebaseapp.com",
  projectId: "system-ca72d",
  storageBucket: "system-ca72d.firebasestorage.app",
  messagingSenderId: "48224129684",
  appId: "1:48224129684:web:498d7055a253196f831a81"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const loadingScreen = document.getElementById('loading-screen');
const loginSection = document.getElementById('login-section');
const dashboardSection = document.getElementById('dashboard-section');

// ================= التنقل بين الصفحات =================
const navLinks = {
    home: document.getElementById('nav-home'),
    products: document.getElementById('nav-products'),
    sales: document.getElementById('nav-sales'),
    purchases: document.getElementById('nav-purchases')
};
const sections = {
    home: document.getElementById('section-home'),
    products: document.getElementById('section-products'),
    sales: document.getElementById('section-sales'),
    purchases: document.getElementById('section-purchases')
};

function switchSection(activeKey) {
    Object.keys(sections).forEach(k => { if(sections[k]) sections[k].style.display = 'none'; if(navLinks[k]) navLinks[k].parentElement.classList.remove('active'); });
    if(sections[activeKey]) sections[activeKey].style.display = 'block';
    if(navLinks[activeKey]) navLinks[activeKey].parentElement.classList.add('active');
}
Object.keys(navLinks).forEach(k => { if(navLinks[k]) navLinks[k].addEventListener('click', (e) => { e.preventDefault(); switchSection(k); }); });

// ================= الدخول والصلاحيات =================
onAuthStateChanged(auth, async (user) => {
    loadingScreen.style.display = 'none';
    if (user) {
        loginSection.style.display = 'none';
        dashboardSection.style.display = 'flex';
        document.getElementById('current-user-role').textContent = `مرحباً بك في النظام`;
        initCharts();
        loadProducts();
        loadDashboardStats(); // تحميل إحصائيات الصفحة الرئيسية
    } else {
        loginSection.style.display = 'flex';
        dashboardSection.style.display = 'none';
    }
});

document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    signInWithEmailAndPassword(auth, document.getElementById('email').value, document.getElementById('password').value).catch(err => alert(err.message));
});

document.getElementById('nav-logout').addEventListener('click', (e) => {
    e.preventDefault(); signOut(auth);
});

// ================= إدارة المنتجات =================
let globalProducts = [];
const productsTableBody = document.getElementById('products-table-body');
const saleSelect = document.getElementById('sale-product-select');
const purchaseSelect = document.getElementById('purchase-product-select');

document.getElementById('btn-open-add-product').addEventListener('click', () => document.getElementById('modal-add-product').style.display='flex');
document.getElementById('btn-close-modal').addEventListener('click', () => document.getElementById('modal-add-product').style.display='none');

document.getElementById('form-add-product').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        await addDoc(collection(db, "products"), {
            code: document.getElementById('prod-code').value,
            name: document.getElementById('prod-name').value,
            category: document.getElementById('prod-category').value,
            quantity: parseInt(document.getElementById('prod-qty').value),
            price: parseFloat(document.getElementById('prod-price').value),
            createdAt: new Date()
        });
        document.getElementById('form-add-product').reset();
        document.getElementById('modal-add-product').style.display='none';
        alert("تم الحفظ!");
    } catch (err) { alert("حدث خطأ"); }
});

function loadProducts() {
    onSnapshot(collection(db, "products"), (snapshot) => {
        productsTableBody.innerHTML = ''; 
        saleSelect.innerHTML = '<option value="">اختر المنتج...</option>';
        purchaseSelect.innerHTML = '<option value="">اختر المنتج...</option>';
        globalProducts = [];
        
        snapshot.forEach((doc) => {
            const p = doc.data(); p.id = doc.id; globalProducts.push(p);
            productsTableBody.innerHTML += `<tr><td>${p.code}</td><td>${p.name}</td><td>${p.quantity}</td><td>${p.price} ج.م</td></tr>`;
            purchaseSelect.innerHTML += `<option value="${p.id}">${p.name} (متوفر: ${p.quantity})</option>`;
            if (p.quantity > 0) saleSelect.innerHTML += `<option value="${p.id}">${p.name} (متوفر: ${p.quantity})</option>`;
        });
    });
}

// ================= المبيعات (نقص المخزون) =================
let salesCart = [];
document.getElementById('btn-add-to-cart').addEventListener('click', () => {
    const pId = saleSelect.value; const qty = parseInt(document.getElementById('sale-qty').value);
    if(!pId || qty<=0) return;
    const p = globalProducts.find(x => x.id === pId);
    salesCart.push({ id: p.id, name: p.name, price: p.price, qty: qty, total: p.price * qty });
    updateSalesUI();
});

function updateSalesUI() {
    const tbody = document.getElementById('cart-table-body'); tbody.innerHTML = '';
    let tot = 0;
    salesCart.forEach((item, i) => {
        tot += item.total;
        tbody.innerHTML += `<tr><td>${item.name}</td><td>${item.price}</td><td>${item.qty}</td><td>${item.total}</td><td><button class="btn-danger" onclick="salesCart.splice(${i},1); updateSalesUI()">حذف</button></td></tr>`;
    });
    document.getElementById('cart-total').textContent = tot;
}
window.updateSalesUI = updateSalesUI; // لتشغيل زر الحذف من الـ HTML مباشرة

document.getElementById('btn-complete-sale').addEventListener('click', async () => {
    if(salesCart.length === 0) return;
    const totalSale = parseInt(document.getElementById('cart-total').textContent);
    await addDoc(collection(db, "sales"), { items: salesCart, total: totalSale, date: new Date() });
    
    for (const item of salesCart) {
        const pDb = globalProducts.find(x => x.id === item.id);
        await updateDoc(doc(db, "products", item.id), { quantity: pDb.quantity - item.qty });
    }
    alert('تم البيع بنجاح!'); salesCart = []; updateSalesUI();
});

// ================= المشتريات (زيادة المخزون) =================
let purchaseCart = [];
document.getElementById('btn-add-to-purchase-cart').addEventListener('click', () => {
    const pId = purchaseSelect.value;
    const qty = parseInt(document.getElementById('purchase-qty').value);
    const cost = parseInt(document.getElementById('purchase-cost').value);
    if(!pId || qty<=0) return;
    const p = globalProducts.find(x => x.id === pId);
    purchaseCart.push({ id: p.id, name: p.name, qty: qty, cost: cost });
    updatePurchaseUI();
});

function updatePurchaseUI() {
    const tbody = document.getElementById('purchase-cart-table-body'); tbody.innerHTML = '';
    let tot = 0;
    purchaseCart.forEach((item, i) => {
        tot += item.cost;
        tbody.innerHTML += `<tr><td>${item.name}</td><td>${item.qty}</td><td>${item.cost} ج.م</td><td><button class="btn-danger" onclick="purchaseCart.splice(${i},1); updatePurchaseUI()">حذف</button></td></tr>`;
    });
    document.getElementById('purchase-cart-total').textContent = tot;
}
window.updatePurchaseUI = updatePurchaseUI;

document.getElementById('btn-complete-purchase').addEventListener('click', async () => {
    if(purchaseCart.length === 0) return;
    const totalPurchase = parseInt(document.getElementById('purchase-cart-total').textContent);
    await addDoc(collection(db, "purchases"), { items: purchaseCart, total: totalPurchase, date: new Date() });
    
    for (const item of purchaseCart) {
        const pDb = globalProducts.find(x => x.id === item.id);
        await updateDoc(doc(db, "products", item.id), { quantity: pDb.quantity + item.qty }); // هنا بنزود المخزون (+)
    }
    alert('تم تسجيل المشتريات وزيادة المخزون!'); purchaseCart = []; updatePurchaseUI(); document.getElementById('purchase-cost').value = 0;
});


// ================= إحصائيات الصفحة الرئيسية الحية =================
function loadDashboardStats() {
    // حساب المبيعات
    onSnapshot(collection(db, "sales"), (snapshot) => {
        let totalSales = 0;
        snapshot.forEach(doc => totalSales += doc.data().total);
        document.getElementById('sales-green').textContent = totalSales;
    });

    // حساب المشتريات
    onSnapshot(collection(db, "purchases"), (snapshot) => {
        let totalPurchases = 0;
        snapshot.forEach(doc => totalPurchases += doc.data().total);
        // بنحط المصروفات في الكارت كفلوس خرجت (بالأخضر كمدفوعات أو أحمر، حسب رغبتك)
        document.getElementById('purchases-red').textContent = totalPurchases; 
    });
}

// ================= المخططات =================
function initCharts() {
    new Chart(document.getElementById('salesChart'), { type: 'bar', data: { labels: ['الشهر الحالي'], datasets: [{ label: 'مبيعات', data: [5000], backgroundColor: '#2ecc71' }] }});
    new Chart(document.getElementById('purchasesChart'), { type: 'line', data: { labels: ['الشهر الحالي'], datasets: [{ label: 'مشتريات', data: [3000], borderColor: '#e74c3c' }] }});
}

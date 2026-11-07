// استدعاء مكتبات فايربيس الأساسية
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import { getFirestore, doc, getDoc, collection, addDoc, onSnapshot, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

// ⚠️ ضع إعدادات مشروعك الخاصة بفايربيس هنا ⚠️
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

// عناصر الشاشة الأساسية
const loadingScreen = document.getElementById('loading-screen');
const loginSection = document.getElementById('login-section');
const dashboardSection = document.getElementById('dashboard-section');
const loginForm = document.getElementById('login-form');
const currentUserRole = document.getElementById('current-user-role');
const logoutBtn = document.getElementById('nav-logout');

// ================= نظام التنقل بين الصفحات (SPA) =================
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
    Object.keys(sections).forEach(key => {
        if(sections[key]) sections[key].style.display = 'none';
        if(navLinks[key]) navLinks[key].parentElement.classList.remove('active');
    });
    if(sections[activeKey]) sections[activeKey].style.display = 'block';
    if(navLinks[activeKey]) navLinks[activeKey].parentElement.classList.add('active');
}

Object.keys(navLinks).forEach(key => {
    if(navLinks[key]) {
        navLinks[key].addEventListener('click', (e) => {
            e.preventDefault();
            switchSection(key);
        });
    }
});

// ================= نظام تسجيل الدخول والصلاحيات =================
onAuthStateChanged(auth, async (user) => {
    loadingScreen.style.display = 'none';

    if (user) {
        loginSection.style.display = 'none';
        dashboardSection.style.display = 'flex';
        
        try {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists()) {
                const userData = userDoc.data();
                const role = userData.role === 'admin' ? 'أدمن' : 'مشرف';
                currentUserRole.textContent = `مرحباً، ${userData.name || 'المستخدم'} (${role})`;
            } else {
                currentUserRole.textContent = `مرحباً بك`;
            }
        } catch (error) {
            console.error("خطأ في جلب الصلاحيات:", error);
        }

        initCharts();
        loadProducts(); // جلب المنتجات للجدول وقائمة البيع
    } else {
        loginSection.style.display = 'flex';
        dashboardSection.style.display = 'none';
    }
});

loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    signInWithEmailAndPassword(auth, email, password)
        .catch((error) => alert("خطأ في تسجيل الدخول: " + error.message));
});

logoutBtn.addEventListener('click', (e) => {
    e.preventDefault();
    signOut(auth).catch((error) => console.error("خطأ أثناء تسجيل الخروج:", error));
});


// ================= إضافة وعرض المنتجات (ومزامنتها مع المبيعات) =================
const modalAddProduct = document.getElementById('modal-add-product');
const btnOpenAddProduct = document.getElementById('btn-open-add-product');
const btnCloseModal = document.getElementById('btn-close-modal');
const formAddProduct = document.getElementById('form-add-product');
const productsTableBody = document.getElementById('products-table-body');
const saleProductSelect = document.getElementById('sale-product-select');

let globalProducts = []; // مصفوفة لحفظ المنتجات واستخدامها في البيع

btnOpenAddProduct.addEventListener('click', () => modalAddProduct.style.display = 'flex');
btnCloseModal.addEventListener('click', () => modalAddProduct.style.display = 'none');

formAddProduct.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const code = document.getElementById('prod-code').value;
    const name = document.getElementById('prod-name').value;
    const category = document.getElementById('prod-category').value;
    const qty = parseInt(document.getElementById('prod-qty').value);
    const price = parseFloat(document.getElementById('prod-price').value);

    try {
        await addDoc(collection(db, "products"), {
            code: code,
            name: name,
            category: category,
            quantity: qty,
            price: price,
            createdAt: new Date()
        });
        
        formAddProduct.reset();
        modalAddProduct.style.display = 'none';
        alert("تمت إضافة المنتج بنجاح!");
    } catch (error) {
        console.error("خطأ أثناء إضافة المنتج: ", error);
        alert("حدث خطأ أثناء حفظ المنتج.");
    }
});

function loadProducts() {
    onSnapshot(collection(db, "products"), (snapshot) => {
        productsTableBody.innerHTML = ''; 
        saleProductSelect.innerHTML = '<option value="">اختر المنتج...</option>';
        globalProducts = [];
        
        if(snapshot.empty) {
            productsTableBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">لا توجد منتجات مسجلة حالياً.</td></tr>';
            return;
        }

        snapshot.forEach((doc) => {
            const product = doc.data();
            product.id = doc.id; // حفظ الـ ID لاستخدامه في الخصم من المخزن
            globalProducts.push(product);

            // إضافة للجدول
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${product.code}</td>
                <td>${product.name}</td>
                <td>${product.category}</td>
                <td>${product.quantity}</td>
                <td>${product.price} ج.م</td>
            `;
            productsTableBody.appendChild(row);

            // إضافة لقائمة اختيار البيع (المنتجات المتاحة فقط)
            if (product.quantity > 0) {
                const option = document.createElement('option');
                option.value = product.id;
                option.textContent = `${product.name} - متوفر (${product.quantity})`;
                saleProductSelect.appendChild(option);
            }
        });
    });
}

// ================= نظام عمليات البيع (الفاتورة) =================
let cart = [];
const btnAddToCart = document.getElementById('btn-add-to-cart');
const cartTableBody = document.getElementById('cart-table-body');
const cartTotalDisplay = document.getElementById('cart-total');
const btnCompleteSale = document.getElementById('btn-complete-sale');

// إضافة المنتج للفاتورة
btnAddToCart.addEventListener('click', () => {
    const productId = saleProductSelect.value;
    const qty = parseInt(document.getElementById('sale-qty').value);

    if(!productId || qty <= 0) return alert('يرجى اختيار منتج وتحديد كمية صحيحة.');

    const product = globalProducts.find(p => p.id === productId);
    
    // فحص الكمية في الكارت الحالي
    const existingItem = cart.find(item => item.id === productId);
    const currentCartQty = existingItem ? existingItem.qty : 0;

    if((currentCartQty + qty) > product.quantity) {
        return alert('الكمية المطلوبة تتخطى المتاح في المخزن!');
    }

    if(existingItem) {
        existingItem.qty += qty;
    } else {
        cart.push({ id: product.id, name: product.name, price: product.price, qty: qty });
    }

    updateCartUI();
});

// تحديث واجهة الفاتورة
function updateCartUI() {
    cartTableBody.innerHTML = '';
    let total = 0;

    cart.forEach((item, index) => {
        const itemTotal = item.price * item.qty;
        total += itemTotal;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.name}</td>
            <td>${item.price} ج.م</td>
            <td>${item.qty}</td>
            <td>${itemTotal} ج.م</td>
            <td><button class="btn-danger" style="padding: 5px 10px;" data-index="${index}">حذف</button></td>
        `;
        cartTableBody.appendChild(tr);
    });

    cartTotalDisplay.textContent = total;

    // تفعيل أزرار الحذف
    const deleteButtons = cartTableBody.querySelectorAll('.btn-danger');
    deleteButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = e.target.getAttribute('data-index');
            cart.splice(index, 1);
            updateCartUI();
        });
    });
}

// إتمام عملية البيع
btnCompleteSale.addEventListener('click', async () => {
    if(cart.length === 0) return alert('الفاتورة فارغة!');

    try {
        // 1. تسجيل الفاتورة في كوليكشن sales
        await addDoc(collection(db, "sales"), {
            items: cart,
            total: parseInt(cartTotalDisplay.textContent),
            date: new Date()
        });

        // 2. خصم الكميات من المخزن
        for (const item of cart) {
            const productRef = doc(db, "products", item.id);
            const productInDb = globalProducts.find(p => p.id === item.id);
            
            await updateDoc(productRef, {
                quantity: productInDb.quantity - item.qty
            });
        }

        alert('تم إتمام البيع وحفظ الفاتورة بنجاح!');
        
        // تفريغ الفاتورة
        cart = [];
        updateCartUI();
        document.getElementById('sale-qty').value = 1;
        saleProductSelect.value = '';

    } catch (error) {
        console.error("خطأ أثناء إتمام البيع: ", error);
        alert('حدث خطأ أثناء تسجيل الفاتورة.');
    }
});


// ================= المخططات البيانية (Charts) =================
let salesChartInstance = null;
let purchasesChartInstance = null;

function initCharts() {
    const salesCtx = document.getElementById('salesChart');
    const purchasesCtx = document.getElementById('purchasesChart');

    if(salesChartInstance) salesChartInstance.destroy();
    if(purchasesChartInstance) purchasesChartInstance.destroy();

    salesChartInstance = new Chart(salesCtx, {
        type: 'bar',
        data: {
            labels: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو'],
            datasets: [
                { label: 'محصل (أخضر)', data: [12000, 19000, 3000, 5000, 20000, 30000], backgroundColor: '#2ecc71' }, 
                { label: 'آجل (أحمر)', data: [2000, 3000, 1000, 1500, 2000, 5000], backgroundColor: '#e74c3c' }
            ]
        },
        options: { responsive: true }
    });

    purchasesChartInstance = new Chart(purchasesCtx, {
        type: 'line',
        data: {
            labels: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو'],
            datasets: [
                { label: 'مدفوع (أخضر)', data: [8000, 15000, 5000, 10000, 12000, 25000], borderColor: '#2ecc71', fill: false }, 
                { label: 'آجل (أحمر)', data: [4000, 2000, 3000, 5000, 8000, 10000], borderColor: '#e74c3c', fill: false }
            ]
        },
        options: { responsive: true }
    });
}

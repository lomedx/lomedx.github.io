importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');

const CACHE_NAME = 'lomedx-v28'; // رفعنا الإصدار

// الملفات الأساسية فقط
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/app.js',
  '/js/supabase.js',
  '/js/seo-data.js',
  '/manifest.json'
];

// 1. التثبيت
self.addEventListener('install', (event) => {
  // نستخدم catch هنا لضمان عدم فشل التثبيت إذا غاب ملف
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.all(
        CORE_ASSETS.map(url => cache.add(url).catch(() => console.log('خطأ في تحميل:', url)))
      );
    }).then(() => self.skipWaiting()) // تفعيل فوري
  );
});

// 2. التفعيل
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && !cacheName.includes('onesignal')) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. الجلب (بدون تعقيدات)
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  
  const url = new URL(req.url);
  
  // تجاهل كل الطلبات الخارجية
  if (url.origin !== self.location.origin) return;

  // معالجة التنقل (SPA)
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // الملفات الثابتة
  event.respondWith(
    fetch(req).then((networkRes) => {
      if (networkRes && networkRes.status === 200) {
        const clone = networkRes.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
      }
      return networkRes;
    }).catch(() => caches.match(req))
  );
});

// 4. استقبال الأوامر
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');

// ✅ رفعنا الإصدار إلى v28 لإجبار المتصفح على تحديث الكاش القديم
const CACHE_NAME = 'lomedx-pro-v28'; 
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
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)).then(() => {
      self.clients.matchAll({ type: 'window' }).then(clients => {
        clients.forEach(client => {
          client.postMessage({ type: 'SW_VERSION_REPLY', version: CACHE_NAME });
        });
      });
    })
  );
});

// 2. التفعيل ومسح الكاش القديم
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

// 3. استراتيجية الجلب (مع إصلاح روابط البطاقات)
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  
  const url = new URL(req.url);
  
  // تجاهل Supabase و OneSignal لتجنب مشاكل الإشعارات
  if (url.hostname.includes('supabase.co') || url.hostname.includes('onesignal.com')) return;

  // ✅ [الإصلاح الأهم] إذا كان الطلب تنقلاً (فتح صفحة جديدة أو رابط بطاقة)
  // نستخدم الشبكة مباشرة، وإذا فشلت نرجع index.html (لأن الموقع SPA)
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // ✅ الملفات الثابتة (CSS, JS, صور): نجلبها من الكاش أولاً لسرعة فائقة، ثم نحدثها في الخلفية
  event.respondWith(
    caches.match(req).then((cachedRes) => {
      const fetchPromise = fetch(req).then((networkRes) => {
        if (networkRes && networkRes.status === 200) {
          caches.open(CACHE_NAME).then((cache) => cache.put(req, networkRes.clone()));
        }
        return networkRes;
      }).catch(() => cachedRes);
      return cachedRes || fetchPromise;
    })
  );
});

// 4. استقبال أمر التحديث
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    if (event.source) {
      event.source.postMessage({ type: 'SW_VERSION_REPLY', version: CACHE_NAME });
    }
  }
});

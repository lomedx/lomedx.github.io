importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');

// ✅ [مهم] رفعنا الإصدار - سيظهر تنبيه التحديث لكل المستخدمين تلقائياً
const CACHE_NAME = 'lomedx-v27';

// ✅ [مهم] مسارات مطلقة بدل نسبية
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/app.js',
  '/js/supabase.js',
  '/js/seo-data.js',
  '/manifest.json'
];

// ═══════════════════════════════════════════════════════════
// 1. التثبيت
// ═══════════════════════════════════════════════════════════
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // ✅ نستخدم allSettled بدل addAll حتى لا يفشل كل شيء بسبب ملف واحد مفقود
      return Promise.allSettled(
        CORE_ASSETS.map(url => 
          cache.add(url).catch(err => console.warn('SW cache failed:', url, err))
        )
      );
    }).then(() => {
      // إرسال رقم الإصدار للمتصفح عند التثبيت (للمستخدمين المتصلين حالياً)
      self.clients.matchAll({ type: 'window' }).then(clients => {
        clients.forEach(client => {
          client.postMessage({ type: 'SW_VERSION_REPLY', version: CACHE_NAME });
        });
      });
    })
  );
});

// ═══════════════════════════════════════════════════════════
// 2. التفعيل ومسح الكاش القديم
// ═══════════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════════
// 3. استراتيجية الجلب - مع دعم SPA Routes ← التعديل الأهم
// ═══════════════════════════════════════════════════════════
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  
  const url = new URL(req.url);
  
  // تجاهل طلبات Supabase و OneSignal و Google و CDNs
  if (url.hostname.includes('supabase.co') || 
      url.hostname.includes('onesignal.com') ||
      url.hostname.includes('googleapis.com') ||
      url.hostname.includes('gstatic.com') ||
      url.hostname.includes('cloudflare.com') ||
      url.hostname.includes('jsdelivr.net') ||
      url.hostname.includes('unpkg.com') ||
      url.hostname.includes('cdnjs.cloudflare.com') ||
      url.hostname.includes('tailwindcss.com') ||
      url.hostname.includes('wsrv.nl') ||
      url.hostname.includes('nominatim.openstreetmap.org') ||
      url.hostname.includes('maps.google.com')) {
    return;
  }

  // ✅ [مهم جداً] معالجة SPA Navigation - أي طلب تنقّل يُخدَم من الشبكة أولاً
  // لا نستخدم الكاش هنا إطلاقاً للـ navigation لأن URL متغير
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => {
        // عند فشل الشبكة فقط، أعد index.html من الكاش
        return caches.match('/index.html');
      })
    );
    return;
  }

  // ✅ استراتيجية الشبكة أولاً للملفات الثابتة (CSS، JS، صور)
  event.respondWith(
    fetch(req).then((networkRes) => {
      // تخزين نسخة من الاستجابة عند النجاح
      if (networkRes && networkRes.status === 200 && networkRes.type === 'basic') {
        const clone = networkRes.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
      }
      return networkRes;
    }).catch(() => {
      // عند فشل الشبكة، ارجع للكاش
      return caches.match(req);
    })
  );
});

// ═══════════════════════════════════════════════════════════
// 4. استقبال أوامر من الصفحة
// ═══════════════════════════════════════════════════════════
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

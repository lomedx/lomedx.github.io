import { supabase } from './supabase.js';


const daysOfWeek = ["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"];

let currentAnnouncement = null;
let allAnnouncements = [];
let currentFilter = 'all';
let searchQuery = '';
let allData = [];
let bookings = []; 
let activeFollowupUnsub = null;
let currentFollowupBookingId = null;
let tempBooking = {}; 
let scrollLockCount = 0;
let unsubscribeMedRequests = null; 
let unsubscribeDocBookings = null;
let unsubscribeMedRequestsInterval = null;
let bloodRequests = []; 
let medicineDonations = [];
let burnState = { cause: null, degree: null, area: null };
let healthTips = [];
let tipInterval = null;
let currentHealthFileId = localStorage.getItem('healthFileId') || null;
let allQuestions = [];
let unsubscribeQuestions = null;
let currentRadarTab = 'summer';
let doctorDashboardInterval = null;
let radarSettings = { defaultSeason: 'summer', lastReset: 0 };
let unsubscribeRadar = null;
let unsubscribeRadarSettings = null;
let latestRadarReports = [];
let activeAds = [];
let currentAdIndex = 0;
let adInterval = null;
let allHomeAds = [];
let currentCity = 'all';
let allCities = ['كل المدن', 'الرحيبة']; // أضف أو عدل المدن كما تريد

// === محرك الإشعارات المركزي ===
// === محرك الإشعارات المركزي ===
async function sendPushNotification(userId, title, message, target = 'user', playerId = null) {
    try {
        const bodyData = { title, message, target };
        if (target === 'player' && playerId) {
            bodyData.player_id = playerId;
        } else if (userId) {
            bodyData.user_id = userId;
        }
        const { data, error } = await supabase.functions.invoke('send-push-notification', {
            body: bodyData
        });
        if (error) return;
    } catch (err) {
    }   
    
}
// 1. التهيئة (يجب أن توضع في أعلى الملف ليتم تنفيذها فور تحميل الصفحة)
window.OneSignalDeferred = window.OneSignalDeferred || [];
OneSignalDeferred.push(function(OneSignal) {
    OneSignal.init({
        appId: "2e008b4d-0516-4b06-96b1-8a522e0c1587", // ID تطبيقك
        allowLocalhostAsSecureOrigin: true,
        serviceWorker: { 
            path: "OneSignalSDKWorker.js", // اسم الملف الذي دمجناه
            scope: "/" 
        }
        // تم إزالة notifyButton لأنها قديمة ولا حاجة لها
    });
});

// 2. دالة التفعيل (سليمة تماماً ومعدلة لتتوافق مع الإصدار الجديد)
window.setupOneSignal = async () => {
    
    
    // تأكد أن المكتبة قيد التحميل
    if (!window.OneSignalDeferred) {
        showToast("جاري تهيئة النظام، انتظر لحظة...");
        return;
    }

    OneSignalDeferred.push(async function(OneSignal) {
        try {
            // التحقق من دعم المتصفح
            if (!OneSignal.Notifications.isPushSupported()) {
                showToast("متصفحك لا يدعم الإشعارات.");
                return;
            }

            // طلب الإذن (هذا السطر هو الأهم بعد مسح البيانات)
            const granted = await OneSignal.Notifications.requestPermission();
            
            if (granted) {
                showToast("تم تفعيل الإشعارات بنجاح ✅");
                
                // التأكد من الاشتراك
                if (!OneSignal.User.PushSubscription.optedIn) {
                    await OneSignal.User.PushSubscription.optIn();
                }
                
                // حفظ الـ ID
                const id = OneSignal.User.PushSubscription.id;
                if (id) {
                    localStorage.setItem('patient_push_id', id);
                    
                }
            } else {
                showToast("تم رفض الإذن، لن تصلك إشعارات.");
            }
        } catch (err) {
        }   
        
    });
};
function generateUniqueId() { return Math.random().toString(36).substring(2, 8).toUpperCase(); }
// دالة احترافية وآمنة جداً لتوليد رمز QR
function generateSecureQrToken() {
    return crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
}
function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
function lockScroll() { scrollLockCount++; document.body.style.overflow = 'hidden'; }
function unlockScroll() { scrollLockCount = Math.max(0, scrollLockCount - 1); if (scrollLockCount === 0) { document.body.style.overflow = ''; } }

// === فلتر الكلمات المسيئة (شامل) ===
const badWords = [
  "ahole", "anus", "ash0le", "ash0les", "asholes", "asshole", "assholes", "assholz", "asswipe", "azzhole",
  "bastard", "bastards", "bitch", "bitches", "biatch", "blowjob", "blow job", "butthole", "buttwipe",
  "c0ck", "c0cks", "c0k", "cawk", "clit", "clitoris", "cock", "cocks", "cocksucker", "cocksuckers", "cum", "cunt", "cunts",
  "dick", "dickhead", "dildo", "dildos", "dyke", "fag", "faggot", "faggots", "fags", "fuck", "fucker", "fuckers", "fucking", "fucks", "fuk", "fukker",
  "handjob", "jackoff", "jerkoff", "jizz", "knob", "kunt", "masochist", "masterbate", "masterbates", "masturbate",
  "motherfucker", "motherfuckers", "nigger", "nigga", "niggas", "niggaz", "orgasm", "paki", "pecker", "penis", "piss", "pissed", "prick",
  "pussy", "rectum", "retard", "retarded", "shit", "shits", "shitty", "slut", "sluts", "sonofabitch", "tit", "tits", "titties",
  "turd", "vagina", "vulva", "whore", "whores", "wank", "wanker", "a55", "a_s_s", "ar5e", "arrse", "assfucker", "assfukka", "b00bs", "b1tch", "b17ch", "bi+ch", "b!tch", "c0cksucker",
  "cl1t", "cnut", "cockmuncher", "cocksuka", "d1ck", "f4nny", "fcuk", "fecker", "fook", "fooker", "f_u_c_k", "fux0r",
  "m0f0", "m0fo", "m45terbate", "ma5terbate", "n1gga", "n1gger", "phuck", "phuk", "s_h_i_t", "sh1t", "shi+", "t1tties",
  "tw4t", "v1gra", "w00se", "5h1t", "5hit",
  "احا", "احه", "اير", "لعين", "واطي", "عاهر", "عاهره", "قحبه", "قحبة", "كحبه", "شرموط", "شرموطه", "شرموطة",
  "عرص", "خول", "متناك", "متناكة", "منيوك", "منيوكة", "زب", "زبي", "زبه", "كس", "كسي", "كسمك", "كسختك", "كس امك", "كس اختك",
  "طيز", "طيزي", "طيزك", "نيك", "انيك", "انيكك", "هنيكك", "نياكه", "نياكة", "يلعن", "يلعنك", "يلعن ابو", "يلعن ام",
  "ابن المتناكة", "ابن الشرموطة", "ابن القحبة", "ابن الوسخة", "ابن الكلب", "يا خول", "يا عرص", "يا شرموطة",
  "وسخ", "وسخة", "قذر", "قذرة", "حيوان", "كلب", "كلبة", "حمار", "حمارة", "خنيث", "مخنث", "لوطي", "لواط", "ديوث",
  "زق", "خرا", "خراء", "خره", "خرى", "تفو", "سافل", "ساقطة", "عبيط", "اهبل", "غبي", "نذل", "حقير", "خسيس",
  "ممحون", "ممحونة", "لبوه", "لبوة", "قواد", "قوادة", "فاجر", "فاسق", "زنا", "زناه", "اغتصاب", "احتلام",
  "فشخ", "فشخة", "جلخ", "جلق", "بعبص", "بعص", "لحس", "مص", "تمص", "بظر", "بزاز", "ثدي", "حلمه", "قضيب",
  "سكسي", "سيكس", "سكس", "اباحي", "اباحية","قحب","وسخ"
];

// دالة سريعة وآمنة للتحقق من وجود كلمات ممنوعة
function containsBadWords(text) {
    if (!text) return false;
    // إزالة المسافات والرموز الخاصة لتضييق الخناق على من يحاول تجاوز الفلتر
    const cleanedText = text.toLowerCase().replace(/[\s\.\-\_\ـ]/g, '');
    return badWords.some(word => cleanedText.includes(word.toLowerCase().replace(/[\s\.\-\_\ـ]/g, '')));
}

const localFallbackTips = [
    "احرص على شرب 8 أكواب من الماء يومياً للحفاظ على ترطيب الجسم ووظائف الكلى.",
    "تجنب شرب الشاي أو القهوة بعد الوجبات مباشرة لمنع تقليل امتصاص الحديد من الطعام.",
    "المشي لمدة 30 دقيقة يومياً يقلل من خطر الإصابة بأمراض القلب والسكري.",
    "لا تأخذ المضادات الحيوية دون وصفة طبية، فالاستهلاك الخاطئ يؤدي لمناعة البكتيريا.",
    "النوم لمدة 7-8 ساعات يومياً يعزز مناعة الجسم ويحسن المزاج العام.",
    "احرص على تناول وجبة الفطور، فهي أهم وجبة تمنحك الطاقة لبدء يومك.",
    "غسل اليدين بالماء والصابون لمدة 20 ثانية هو أفضل طريقة لمنع انتشار العدوى.",
    "الإكثار من تناول الخضروات والفواكه الطازجة يمد الجسم بالفيتامينات ومضادات الأكسدة.",
    "تجنب استخدام الهاتف المحمول قبل النوم لتحسين جودة النوم.",
    "الرضاعة الطبيعية لأول 6 أشهر توفر مناعة قوية للطفل.",
    "الفحص الدوري لضغط الدم بعد سن الأربعين يقي من الجلطات والسكتات الدماغية.",
    "الإقلاع عن التدخين يقلل خطر الإصابة بسرطان الرئة وأمراض القلب بشكل كبير.",
    "الحفاظ على وزن صحي يحمي المفاصل والعمود الفقري من التآكل المبكر.",
    "شرب الماء الدافئ بالليمون صباحاً يساعد في تنظيف الجهاز الهضمي وتنشيط الهضم.",
    "الحصول على لقاح الإنفلونزا الموسمي يحمي من مضاعفات البرد الشديدة.",
    "الابتعاد عن الأطعمة السريعة والمقليات يحافظ على صحة القلب والكبد.",
    "المداومة على فحص الأسنان كل 6 أشهر يقي من تسوس الأسنان وأمراض اللثة.",
    "تناول الأسماك الغنية بأوميغا 3 مرتين أسبوعياً يعزز صحة الدماغ والذاكرة.",
    "التعامل مع الضغط النفسي عبر الرياضة أو التأمل يقي من الاكتئاب والقلق.",
    "الابتعاد عن المشروبات الغازية لاحتوائها على نسب عالية من السكر والحمض.",
    "ارتداء النظارات الشمسية يحمي العينين من الأشعة فوق البنفسجية الضارة.",
    "تناول وجبات صغيرة ومتعددة أفضل من وجبات كبيرة وقليلة لتحسين الأيض.",
    "المشي بعد تناول العشاء لمدة 15 دقيقة يساعد في خفض مستوى السكر في الدم.",
    "غسل الخضار والفواكه جيداً قبل تناولها يقي من التسمم والعدوى المعوية.",
    "النوم في غرفة مظلمة وهادئة يحفز إفراز الميلاتونين الضروري للنوم العميق.",
    "الإقلال من الملح في الطعام يقي من ارتفاع ضغط الدم وأمراض الكلى.",
    "التمدد واليوجا يقيان من آلام الظهر وتصلب العضلات.",
    "استخدام واقي الشمس يومياً يحمي الجلد من التجاعيد المبكرة وسرطان الجلد.",
    "الاطمئنان على سلامة الأطفال وإبعاد المواد الخطيرة والكيميائية عن متناولهم.",
    "الاهتمام بالنظافة الشخصية كالاستحمام المنتظم وتقليم الأظافر يقي من الالتهابات.",
    "الإكثار من تناول الألياف الموجودة في الشوفان والبقوليات يساعد على تحسين الهضم ومنع الإمساك.",
    "الحفاظ على وضعية صحيحة أثناء الجلوس أمام الكمبيوتر يقي من آلام الرقبة والظهر المزمنة.",
    "لحماية العينين من إجهاد الشاشات، اتبع قاعدة 20-20-20: كل 20 دقيقة، انظر لشيء على بعد 20 قدماً لمدة 20 ثانية.",
    "احفظ الأدوية في مكان بارد وجاف بعيداً عن أشعة الشمس، ولا تتركها في خزنة السيارة أو الحمام.",
    "تأكد دائماً من تاريخ انتهاء الأدوية قبل تناولها وتخلص من الأدوية المنتهية الصلاحية بشكل آمن.",
    "عند السعال أو العطس، استخدم مرفقك أو منديلاً ورقياً بدلاً من يديك لمنع انتشار العدوى.",
    "عند رفع الأشياء الثقيلة من الأرض، اثنِ ركبتيك وليس ظهرك لتجنب الإصابة بالفتق أو آلام الظهر.",
    "تناول حفنة من المكسرات النيئة غير المملحة يومياً يوفر للجسم دهوناً صحية ويعزز صحة القلب.",
    "استبدل الخبز الأبيض والأرز الأبيض بالخبز الأسمر والأرز البني للاستفادة من العناصر الغذائية الكاملة.",
    "امضغ طعامك ببطء، فذلك يساعد على الشعور بالشبع ويحسن عملية الهضم.",
    "ارتداء أحذية مريحة وطبية تناسب شكل القدم يقي من آلام المفاصل والظهر في المستقبل.",
    "إجراء فحص دوري للعينين كل سنة أو سنتين يكشف مبكراً عن مشاكل كالزرق (الجلوكوما) والمياه البيضاء.",
    "ممارسة تمارين التنفس العميق لبضع دقائق يومياً تقلل من التوتر وتحسن من تدفق الأكسجين للدم.",
    "جهّز صندوق إسعافات أولية في منزلك وسيارتك يحتوي على الضمادات والمطهرات والأدوية الأساسية.",
    "تأكد من طهي اللحوم والدواجن جيداً حتى النضج التام لتجنب التسمم الغذائي والبكتيريا الضارة.",
    "تجنب رفع صوت السماعات (سماعات الأذن) لمستوى عالٍ، وحافظ على فترة راحة للأذنين حمايةً للسمع.",
    "اشرب كوباً من الماء بمجرد الاستيقاظ من النوم لتنشيط الأعضاء الداخلية وتعويض السوائل المفقودة.",
    "اعتد على قراءة الملصقات الغذائية عند التسوق للانتباه لكميات السكر والصوديوم والدهون المتحولة.",
    "الحفاظ على تواصل اجتماعي مع الأصدقاء والعائلة يعزز الصحة النفسية ويقلل من خطر الاكتئاب.",
    "خذ فترات راحة قصيرة للوقوف والتمدد كل ساعة أثناء العمل المكتبي لتنشيط الدورة الدموية.",
    "اغسل أدوات المطبخ وألواح التقطيع جيداً بعد استخدامها للحم النيء لمنع التلوث المتبادل.",
    "خصص يوماً في الأسبوع لتقليل استخدام الهاتف ووسائل التواصل الاجتماعي لتحسين التركيز والصحة النفسية.",
    "اعتمد على الشواء أو السلق أو الطبخ بالفرن بدلاً من القلي لتقليل السعرات والدهون الضارة.",
    "لا تتجاهل الصداع المتكرر أو المستمر، واستشر طبيبك لتحديد السبب الكامن وراءه.",
    "احرص على تهوية المنزل جيداً وفتح النوافذ يومياً لتجديد الهواء وتقليل تركيز الميكروبات والغبار.",
    "استخدم أطباقاً أصغر حجماً عند تناول الطعام، فهذه الحيلة البصرية تساعدك على تقليل كميات الطعام.",
    "تناول البروتين (كالبيض أو الزبادي) في وجبة الفطور يقلل من الشعور بالجوع طوال اليوم.",
    "الضحك يومياً يقلل من هرمونات التوتر (الكورتيزول) ويعزز مناعة الجسم بشكل طبيعي.",
    "لا تشارك أدواتك الشخصية كالمناشف أو فرشاة الأسنان مع الآخرين لمنع انتقال الفيروسات والبكتيريا."
];

function updateTipDisplay() {
    const tipEl = document.getElementById('dailyTipText');
    if (!tipEl) return;
    const tip = localFallbackTips[Math.floor(Math.random() * localFallbackTips.length)];
    tipEl.style.opacity = '0';
    setTimeout(() => {
        tipEl.innerText = tip;
        tipEl.style.opacity = '1';
    }, 300);
}

window.addEventListener('DOMContentLoaded', () => {
    const isOAuthRedirect = window.location.href.includes('code=') || window.location.href.includes('access_token=');
    const isGoogleIntent = sessionStorage.getItem('google_login_intent') === 'true';
    
    if (isOAuthRedirect) {
        window.history.replaceState(null, '', window.location.pathname);
    }

    if (isOAuthRedirect || isGoogleIntent) {
        let isOpening = false;
        const openFileIfPatient = (session) => {
            if (!isOpening && session && session.user.email && !session.user.email.endsWith('@tabibnet.app')) {
                isOpening = true; 
                sessionStorage.removeItem('google_login_intent'); 
                setTimeout(() => openHealthFile(), 500);
                return true;
            }
            return false;
        };

        supabase.auth.getSession().then(({ data: { session } }) => {
            openFileIfPatient(session);
        });

        const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
            if (openFileIfPatient(session)) {
                authListener.subscription.unsubscribe();
            }
        });
    }

    const splash = document.getElementById('appSplashScreen');
    if (splash) {
        if (sessionStorage.getItem('splashShown')) {
            splash.style.display = 'none';
        } else {
            setTimeout(() => {
                splash.classList.add('hidden');
                setTimeout(() => { splash.style.display = 'none'; }, 1000);
                sessionStorage.setItem('splashShown', 'true'); 
            }, 1200);
        }
    }
    
    if (window.location.hash.includes('article=')) {
        const artId = window.location.hash.split('=')[1];
    
        setTimeout(async () => {
            const { data, error } = await supabase.from('medical_articles').select('*').eq('id', artId).single();
            if (data) {
                allArticles = [data]; // وضع المقال في المصفوفة ليتمكن الكود من إيجاده
                openArticleReader(artId);
            }
        }, 1000);
    }
    
    const langToggle = document.getElementById('langToggle');
       let isEnglish = document.cookie.includes('googtrans=/ar/en');
    function applyLangLayout() {
        if (!langToggle) return;
        if (isEnglish) {
            langToggle.innerText = 'ع';
            document.documentElement.lang = 'en';
            document.documentElement.dir = 'LTR';
        } else {
            langToggle.innerText = 'EN';
            document.documentElement.lang = 'ar';
            document.documentElement.dir = 'rtl';
        }
    }
    if (langToggle) {
        applyLangLayout();
        langToggle.addEventListener('click', (e) => {
            e.preventDefault();
            if (isEnglish) {
                document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
                isEnglish = false;
            } else {
                document.cookie = 'googtrans=/ar/en; path=/';
                isEnglish = true;
            }
            location.reload();
        });
    }

    if (tipInterval) clearInterval(tipInterval);
    updateTipDisplay();
    tipInterval = setInterval(updateTipDisplay, 12000);
    
    const cachedData = localStorage.getItem('cached_listings');
    const forceUpdate = localStorage.getItem('force_listings_update') === 'true';
    if (cachedData) {
        allData = JSON.parse(cachedData);
        if (!forceUpdate) { renderData(); updateStats(); }
    }

    fetchListings();
    fetchBookings();
    fetchBloodRequests();
    fetchMedicineDonations();
    fetchEmergencyContacts();
    
    document.getElementById('lightbox').addEventListener('click', () => { document.getElementById('lightbox').classList.remove('active'); unlockScroll(); });
    document.getElementById('darkModeToggle').addEventListener('click', () => { document.documentElement.classList.toggle('dark'); localStorage.setItem('darkMode', document.documentElement.classList.contains('dark')); });
    if (localStorage.getItem('darkMode') === 'true') document.documentElement.classList.add('dark');
    
    const heroLogo = document.querySelector('.hero-medical-logo');
    if (heroLogo) {
        heroLogo.style.opacity = '0';
        heroLogo.style.transform = 'translateY(20px)';
        setTimeout(() => {
            heroLogo.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
            heroLogo.style.opacity = '1';
            heroLogo.style.transform = 'translateY(0)';
        }, 300);
    }
    // تفعيل البحث الذكي
    initSmartSearch();
    trackAndDisplayVisitors();
    // استدعاء دالة تحديد الموقع
    detectUserLocation();
}); // نهاية DOMContentLoaded

async function fetchListings() {
    // حماية: جلب أعمدة محددة فقط لمنع تسريب كلمات المرور
    const { data: freshData, error } = await supabase.from('listings').select('id, name, type, specialty, address, clinic, hours, consulthours, emergencyphone, departments, floors, services, tests, homesample, night, nightdetails, bookingnotes, rating, image, view_count, phone_clicks, phone, is_subscribed, isopen, workingdays, latlng, user_id, parent_id, capacity_info, facility_details, active_system, allowed_systems, working_hours');
    if (error) return;
    
    const forceUpdate = localStorage.getItem('force_listings_update') === 'true';
    if (JSON.stringify(freshData) !== JSON.stringify(allData) || forceUpdate) {
        allData = freshData || [];
        renderData(); 
        updateStats();
        try {
            localStorage.setItem('cached_listings', JSON.stringify(allData));
            localStorage.removeItem('force_listings_update');
        } catch (e) {}
    }
}
// === نظام الطوارئ الجديد المعتمد على النافذة المنبثقة ===
let allEmergencyContacts = [];

async function fetchEmergencyContacts() {
    const { data, error } = await supabase.from('emergency_contacts').select('*').order('id', { ascending: true });
    if (error) return;
    allEmergencyContacts = data || [];
    renderEmergencyPopup();
}

function renderEmergencyPopup() {
    const popupBody = document.getElementById('popupBodyContainer');
    if (!popupBody) return;

    const emergencies = allEmergencyContacts.filter(c => c.category === 'emergency');
    const hospitals = allEmergencyContacts.filter(c => c.category === 'hospital');
    
    let html = '';

    if (emergencies.length > 0) {
        html += emergencies.map(c => `
            <a href="tel:${escapeHtml(c.phone)}" style="display: flex; align-items: center; gap: 10px; padding: 10px; border-radius: 10px; background: var(--bg-deep); text-decoration: none; color: var(--fg); font-weight: 600; font-size: 0.85rem;">
                <i class="fas ${escapeHtml(c.icon)}" style="color: ${escapeHtml(c.color == 'red' ? '#DC2626' : c.color == 'blue' ? '#2563EB' : c.color == 'orange' ? '#EA580C' : '#10B981')}; width: 20px; text-align: center;"></i>
                <span>${escapeHtml(c.name)}</span>
                <span style="margin-right: auto; font-family: sans-serif; font-weight: 800;">${escapeHtml(c.phone)}</span>
            </a>
        `).join('');
    }

    if (hospitals.length > 0) {
        html += '<div style="border-top: 1px dashed var(--border); margin: 8px 0;"></div>';
        html += hospitals.map(c => `
            <a href="tel:${escapeHtml(c.phone)}" style="display: flex; align-items: center; gap: 10px; padding: 10px; border-radius: 10px; background: var(--bg-deep); text-decoration: none; color: var(--fg); font-weight: 600; font-size: 0.85rem;">
                <i class="fas ${escapeHtml(c.icon)}" style="color: ${escapeHtml(c.color == 'red' ? '#DC2626' : c.color == 'blue' ? '#2563EB' : c.color == 'orange' ? '#EA580C' : '#10B981')}; width: 20px; text-align: center;"></i>
                <span>${escapeHtml(c.name)}</span>
                <span style="margin-right: auto; font-family: sans-serif; font-weight: 800;">${escapeHtml(c.phone)}</span>
            </a>
        `).join('');
    }

    if (html === '') {
        html = '<p style="text-align: center; color: gray; font-size: 0.875rem; padding: 16px 0;">لا توجد أرقام مضافة حالياً.</p>';
    }

    popupBody.innerHTML = html;
}

// استدعاء الدالة عند تحميل الصفحة (أضف هذا السطر داخل DOMContentLoaded في الأعلى)
// fetchEmergencyContacts();
async function fetchBookings() {
    const { data, error } = await supabase.from('bookings').select('*');
    if (error) return;
    bookings = data || [];
    if (currentFollowupBookingId) renderFollowupChat(currentFollowupBookingId);
}

async function fetchBloodRequests() {
    const twentyHoursAgo = new Date(Date.now() - (20 * 60 * 60 * 1000)).toISOString();
    const { data, error } = await supabase.from('blood_requests').select('*').gt('created_at', twentyHoursAgo).neq('status', 'resolved');
    if (error) return;
    bloodRequests = data || [];
    renderHomeBloodAlerts();
}

async function fetchMedicineDonations() {
    const { data, error } = await supabase.from('medicine_donations').select('*').eq('status', 'active');
    if (error) return;
    medicineDonations = data || [];
    renderHomeMedicines();
}

function renderHomeBloodAlerts() {
    const section = document.getElementById('homeBloodAlertsSection');
    const container = document.getElementById('homeBloodAlerts');
    if (!section || !container) return;
    
    // إخفاء قسم استغاثات الدم تماماً من الصفحة الرئيسية
    section.classList.add('hidden');
    container.innerHTML = '';
    
    checkAlertsWrapperVisibility();
}

function renderHomeMedicines() {
    const section = document.getElementById('homeMedicinesSection');
    const container = document.getElementById('homeMedicinesList');
    if (!section || !container) return;
    
    // إخفاء قسم المستلزمات الطبية تماماً من الصفحة الرئيسية
    section.classList.add('hidden');
    container.innerHTML = '';
    
    checkAlertsWrapperVisibility();
}

function checkAlertsWrapperVisibility() {
    const wrapper = document.getElementById('homeAlertsWrapper');
    const bloodSection = document.getElementById('homeBloodAlertsSection');
    const medSection = document.getElementById('homeMedicinesSection');
    if (!wrapper || !bloodSection || !medSection) return;
    if (bloodSection.classList.contains('hidden') && medSection.classList.contains('hidden')) {
        wrapper.classList.add('hidden');
        wrapper.classList.remove('flex');
    } else {
        wrapper.classList.remove('hidden');
        wrapper.classList.add('flex');
    }
}

function updateStats() {
    document.getElementById('stat-hospital').textContent = allData.filter(d => d.type === 'hospital').length;
    document.getElementById('stat-center').textContent = allData.filter(d => d.type === 'center').length;
    document.getElementById('stat-lab').textContent = allData.filter(d => d.type === 'lab').length;
    document.getElementById('stat-doctor').textContent = allData.filter(d => d.type === 'doctor').length;
    document.getElementById('stat-pharmacy').textContent = allData.filter(d => d.type === 'pharmacy').length;
}
// دالة تحسين الصور الخارجية (مثل ImgBB) لتسريع التحميل
function getOptimizedImageUrl(url, width = 400, height = 300) {
    if (!url) return 'https://picsum.photos/seed/default/400/250';
    
    // 1. إذا كانت الصورة من Supabase (للمستقبل)
    if (url.includes('supabase.co/storage/v1/object/public/')) {
        return url.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/') + `?width=${width}&height=${height}&resize=cover&quality=75`;
    }
    
    // 2. إذا كانت الصورة رابطاً خارجياً (مثل ImgBB أو أي رابط آخر)
    if (url.startsWith('http://') || url.startsWith('https://')) {
        // استخدام خدمة wsrv.nl المجانية لضغط الصورة وتحويلها لـ WebP
        const cleanUrl = url.replace(/^https?:\/\//, '');
        return `https://wsrv.nl/?url=${encodeURIComponent(cleanUrl)}&w=${width}&h=${height}&fit=cover&output=webp&q=70`;
    }
    
    // إرجاع الرابط كما هو إذا لم يتحقق أي شرط
    return url;
}
// دالة للتحقق من معدل الطلبات (منع السبام)
function checkRateLimit(actionKey, hoursCooldown = 1) {
    const lastAction = localStorage.getItem(`ratelimit_${actionKey}`);
    if (!lastAction) return true;
    
    const diffHours = (Date.now() - parseInt(lastAction)) / (1000 * 60 * 60);
    if (diffHours < hoursCooldown) {
        showToast(`يرجى الانتظار. يمكنك إرسال طلب جديد بعد ${Math.ceil(hoursCooldown - diffHours)} ساعة.`);
        return false;
    }
    return true;
}

function setRateLimit(actionKey) {
    localStorage.setItem(`ratelimit_${actionKey}`, Date.now().toString());
}
function updateMetaTags(title, description, image) {
    document.title = title;
    
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
        metaDesc = document.createElement('meta');
        metaDesc.name = "description";
        document.head.appendChild(metaDesc);
    }
    metaDesc.content = description;

    document.querySelector('meta[property="og:title"]').setAttribute('content', title);
    document.querySelector('meta[property="og:description"]').setAttribute('content', description);
    if (image) {
        document.querySelector('meta[property="og:image"]').setAttribute('content', image);
    }
    
    document.querySelector('link[rel="canonical"]').setAttribute('href', window.location.href);
}
function createCard(item) {
    const typeMap = { 
        hospital: { cardClass: 'hospital-card', badgeClass: 'badge-hospital', iconClass: 'cat-icon-hospital', icon: 'fa-hospital-symbol', label: 'مشفى', color: 'var(--hospital)' }, 
        center: { cardClass: 'center-card', badgeClass: 'badge-center', iconClass: 'cat-icon-center', icon: 'fa-clinic-medical', label: 'مركز طبي', color: 'var(--center)' }, 
        lab: { cardClass: 'lab-card', badgeClass: 'badge-lab', iconClass: 'cat-icon-lab', icon: 'fa-flask', label: 'مخبر', color: 'var(--lab)' }, 
        doctor: { cardClass: 'doctor-card', badgeClass: 'badge-doctor', iconClass: 'cat-icon-doctor', icon: 'fa-user-md', label: 'طبيب', color: 'var(--doctor)' }, 
        pharmacy: { cardClass: 'pharmacy-card', badgeClass: 'badge-pharmacy', iconClass: 'cat-icon-pharmacy', icon: 'fa-pills', label: 'صيدلية', color: 'var(--pharmacy)' } 
    };
    const t = typeMap[item.type] || typeMap.doctor;
    const fullStars = Math.floor(item.rating || 0); const halfStar = (item.rating || 0) % 1 >= 0.5; let starsHTML = '';
    for (let i = 0; i < fullStars; i++) starsHTML += '<i class="fas fa-star"></i>';
    if (halfStar) starsHTML += '<i class="fas fa-star-half-alt"></i>';
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
    for (let i = 0; i < emptyStars; i++) starsHTML += '<i class="far fa-star"></i>';
    let detailsHTML = '';
    if (item.type === 'hospital') detailsHTML = `<div class="detail-row"><i class="fas fa-map-marker-alt"></i><span>${escapeHtml(item.address || '')}</span></div><div class="detail-row"><i class="fas fa-clock"></i><span>${escapeHtml(item.hours || '24/7 طوارئ')}</span></div>${item.emergencyphone ? '<div class="detail-row"><i class="fas fa-ambulance" style="color: var(--danger)"></i><span style="color: var(--danger); font-weight: 700">طوارئ: ' + escapeHtml(item.emergencyphone) + '</span></div>' : ''}`;
    else if (item.type === 'doctor') detailsHTML = `<div class="detail-row"><i class="fas fa-graduation-cap"></i><span>${escapeHtml(item.specialty || '')}</span></div><div class="detail-row"><i class="fas fa-map-marker-alt"></i><span>${escapeHtml(item.clinic || '')}</span></div><div class="detail-row"><i class="fas fa-clock"></i><span>${escapeHtml(item.consulthours || item.hours || '')}</span></div>`;
    else if (item.type === 'center') detailsHTML = `<div class="detail-row"><i class="fas fa-star-of-life"></i><span>${escapeHtml(item.services || item.specialty || '')}</span></div><div class="detail-row"><i class="fas fa-map-marker-alt"></i><span>${escapeHtml(item.address || '')}</span></div><div class="detail-row"><i class="fas fa-clock"></i><span>${escapeHtml(item.hours || '')}</span></div>`;
    else if (item.type === 'lab') detailsHTML = `<div class="detail-row"><i class="fas fa-vials"></i><span>${escapeHtml(item.tests || item.specialty || '')}</span></div><div class="detail-row"><i class="fas fa-map-marker-alt"></i><span>${escapeHtml(item.address || '')}</span></div>${item.homesample && item.homesample !== 'لا' ? '<div class="detail-row"><i class="fas fa-house-user" style="color: var(--accent)"></i><span style="color: var(--accent); font-weight: 600">يتوفر سحب منزلي</span></div>' : ''}`;
    else detailsHTML = `<div class="detail-row"><i class="fas fa-map-marker-alt"></i><span>${escapeHtml(item.address || '')}</span></div><div class="detail-row"><i class="fas fa-clock"></i><span>${escapeHtml(item.hours || '')}</span></div>${item.night ? '<div class="detail-row"><i class="fas fa-moon" style="color: var(--gold)"></i><span style="color: var(--gold); font-weight: 600">صيدلية مناوبة</span></div>' : ''}`;
    
    const canBook = item.type === 'doctor';
    let bookingBtn = '';
    if (canBook) {
        if (item.is_subscribed) {
            bookingBtn = `<button onclick="event.stopPropagation(); openBookingModal('${escapeHtml(item.id)}')" class="w-10 h-10 rounded-xl border flex items-center justify-center transition-all hover:bg-gray-50" style="border-color: var(--border); color: var(--accent);" aria-label="حجز"><i class="fas fa-calendar-plus"></i></button>`;
        } else {
            bookingBtn = `<button onclick="event.stopPropagation(); showToast('الحجز الإلكتروني متاح فقط للأطباء المشتركين. يرجى الاتصال هاتفياً.')" class="w-10 h-10 rounded-xl border flex items-center justify-center transition-all opacity-40 cursor-not-allowed" style="border-color: var(--border); color: var(--muted);" aria-label="الحجز متوقف"><i class="fas fa-calendar-xmark"></i></button>`;
        }
    }
    
    return `<div class="card ${t.cardClass} cursor-pointer" onclick="openModal('${escapeHtml(item.id)}')" data-type="${escapeHtml(item.type)}"><div class="relative h-40 overflow-hidden rounded-t-2xl">
<img src="${getOptimizedImageUrl(item.image, 400, 300)}" alt="${escapeHtml(item.name)}" class="w-full h-full object-cover transition-transform duration-500 hover:scale-110 cursor-zoom-in" loading="lazy" onclick="event.stopPropagation(); openLightbox(this.src)"><div class="absolute top-3 right-3"><span class="badge ${t.badgeClass}">${t.label}</span></div><div class="absolute top-3 left-3 flex flex-col gap-1 items-start">
    ${['doctor', 'pharmacy'].includes(item.type) && item.isopen === true ? '<span class="badge" style="background:#10B981;color:white"><i class="fas fa-door-open ml-1"></i>مفتوح</span>' : ''}
    ${['doctor', 'pharmacy'].includes(item.type) && item.isopen === false ? '<span class="badge" style="background:#EF4444;color:white"><i class="fas fa-door-closed ml-1"></i>مغلق</span>' : ''}
    ${item.night ? '<span class="badge" style="background:rgba(196,150,44,0.9);color:white"><i class="fas fa-moon ml-1"></i>ليلي</span>' : ''}
</div></div><div class="p-5"><div class="flex items-start gap-3 mb-3"><div class="cat-icon ${t.iconClass}"><i class="fas ${t.icon}"></i></div><div class="flex-1 min-w-0"><h3 class="font-bold text-sm mb-1 leading-tight" style="font-family: 'Noto Kufi Arabic'; color: var(--fg);">
    ${escapeHtml(item.name)}
    ${(['doctor', 'pharmacy'].includes(item.type) && item.is_subscribed) ? '<span class="verified-badge verified-gold"><i class="fas fa-circle-check"></i> موثق</span>' : ''}
</h3><div class="flex items-center gap-1 text-[11px]" style="color: ${t.color};">${starsHTML}<span class="mr-1 font-semibold">${escapeHtml(item.rating || 0)}</span></div></div></div><div class="flex flex-col gap-1.5 mb-4">${detailsHTML}</div><div class="flex items-center gap-2"> ${item.phone ? `<a href="tel:${escapeHtml(item.phone)}" onclick="event.stopPropagation(); trackPhoneClick('${escapeHtml(item.id)}')" class="call-btn flex-1 py-2.5 rounded-xl text-white text-xs font-semibold text-center flex items-center justify-center gap-2" style="background: ${t.color}"><i class="fas fa-phone-alt"></i><span dir="ltr">${escapeHtml(item.phone)}</span></a>` : (['doctor', 'pharmacy', 'lab'].includes(item.type) ? `<div class="flex-1 py-2.5 rounded-xl text-gray-400 text-xs font-semibold text-center flex items-center justify-center gap-2 bg-gray-100 cursor-not-allowed"><i class="fas fa-phone-slash"></i><span>لا يوجد رقم</span></div>` : '')}${bookingBtn}<button onclick="event.stopPropagation(); openModal('${escapeHtml(item.id)}')" class="w-10 h-10 rounded-xl border flex items-center justify-center transition-all hover:bg-gray-50" style="border-color: var(--border); color: var(--muted);" aria-label="تفاصيل"><i class="fas fa-info-circle"></i></button></div></div></div>`;
}

function renderData() {
    const grids = { 
        hospital: { el: document.getElementById('hospitalsGrid'), section: document.getElementById('hospitals'), data: allData.filter(d => d.type === 'hospital') }, 
        center: { el: document.getElementById('centersGrid'), section: document.getElementById('centers'), data: allData.filter(d => d.type === 'center') }, 
        lab: { el: document.getElementById('labsGrid'), section: document.getElementById('labs'), data: allData.filter(d => d.type === 'lab') }, 
        doctor: { el: document.getElementById('doctorsGrid'), section: document.getElementById('doctors'), data: allData.filter(d => d.type === 'doctor') }, 
        pharmacy: { el: document.getElementById('pharmaciesGrid'), section: document.getElementById('pharmacies'), data: allData.filter(d => d.type === 'pharmacy').sort((a,b) => (b.night === true) - (a.night === true)) } 
    };
    let total = 0;
    for (const [type, g] of Object.entries(grids)) { 
        let filtered = g.data.filter(matchItem); 
        filtered.sort((a, b) => (b.is_subscribed === true) - (a.is_subscribed === true));
        const show = filtered.length > 0 && (currentFilter === 'all' || currentFilter === type); 
        g.el.innerHTML = filtered.map(createCard).join(''); 
        g.section.style.display = show ? '' : 'none'; 
        total += filtered.length; 
    }
    
    const noResultsDiv = document.getElementById('noResults');
    if (noResultsDiv) {
        if (total === 0) {
            noResultsDiv.classList.remove('hidden');
            noResultsDiv.style.display = 'block'; 
        } else {
            noResultsDiv.classList.add('hidden');
            noResultsDiv.style.display = 'none';
        }
    }
    return total; 
}
function matchItem(item) { 
    if (currentFilter !== 'all' && item.type !== currentFilter) return false; 
    
    if (currentCity !== 'all') {
        const itemAddress = (item.address || item.clinic || '').toLowerCase();
        if (!itemAddress.includes(currentCity.toLowerCase())) return false;
    }
    
    if (!searchQuery) return true; 
    const q = searchQuery.toLowerCase(); 
    return ['name', 'specialty', 'address', 'description', 'services', 'tests', 'departments', 'floors', 'homesample', 'nightdetails', 'consulthours', 'bookingnotes'].some(key => (escapeHtml(item[key]) || '').toLowerCase().includes(q)); 
}

window.setFilter = (filter, btn) => { 
    currentFilter = filter; 
    document.querySelectorAll('.filter-btn').forEach(b => { b.classList.remove('active'); b.style.background = ''; b.style.color = ''; b.style.borderColor = ''; }); 
    btn.classList.add('active'); 
    const colors = { all: 'var(--accent)', hospital: 'var(--hospital)', clinic: 'var(--clinic)', center: 'var(--center)', lab: 'var(--lab)', doctor: 'var(--doctor)', pharmacy: 'var(--pharmacy)' }; 
    btn.style.background = colors[filter]; btn.style.color = 'white'; btn.style.borderColor = colors[filter]; 
    renderData(); 
}
window.handleSearch = (value) => { 
    searchQuery = value.trim(); 
    const heroSearch = document.getElementById('heroSearch'); 
    if(heroSearch) heroSearch.value = value; 
    
    const totalResults = renderData(); 
    
    if (totalResults === 0 && searchQuery !== '') {
        showToast('لا توجد نتائج مطابقة لبحثك. جرب كلمة أخرى أو عرض كل المدن');
    }
}
// === نظام البحث الذكي (Autocomplete) المعزول ===
let searchDebounceTimer;
let searchDropdown = null;

function initSmartSearch() {
    const searchInput = document.getElementById('heroSearch');
    if (!searchInput) return;

    // إنشاء القائمة و إضافتها للـ body مباشرة لتفادي أي تعارض مع CSS الحاوية
    searchDropdown = document.createElement('div');
    searchDropdown.id = 'smartSearchDropdown';
    searchDropdown.classList.add('hidden'); 
    document.body.appendChild(searchDropdown);

    // دالة لتحديث موقع القائمة تحت حقل البحث مباشرة
    const updateDropdownPosition = () => {
        if (!searchDropdown || !searchInput) return;
        const rect = searchInput.getBoundingClientRect();
        searchDropdown.style.position = 'fixed';
        searchDropdown.style.top = `${rect.bottom + 8}px`;
        searchDropdown.style.left = `${rect.left}px`;
        searchDropdown.style.width = `${rect.width}px`;
        searchDropdown.style.zIndex = '99999';
    };

    searchInput.addEventListener('input', (e) => {
        handleSmartSearch(e.target.value);
    });

    // تحديث الموقع عند تمرير الصفحة أو تكبير/تصغير الشاشة
    window.addEventListener('scroll', updateDropdownPosition, true);
    window.addEventListener('resize', updateDropdownPosition);
    
    // حفظ الدالة لاستخدامها عند ظهور النتائج
    window.updateSmartSearchPosition = updateDropdownPosition;

    // إخفاء القائمة عند النقر خارجها
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && searchDropdown && !searchDropdown.contains(e.target)) {
            searchDropdown.classList.add('hidden');
        }
    });
}

function handleSmartSearch(value) {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
        const q = value.toLowerCase().trim();
        if (q.length < 2) { 
            if(searchDropdown) searchDropdown.classList.add('hidden'); 
            return; 
        }

        const matches = allData.filter(item => {
            return (item.name?.toLowerCase().includes(q) ||
                    item.specialty?.toLowerCase().includes(q) ||
                    item.address?.toLowerCase().includes(q) ||
                    item.type?.toLowerCase().includes(q));
        }).slice(0, 6);

        renderSearchDropdown(matches);
    }, 300);
}

function renderSearchDropdown(matches) {
    if (!searchDropdown) return;
    
    const typeMap = {
        hospital: { icon: 'fa-hospital-symbol', color: 'var(--hospital)', label: 'مشفى' },
        center: { icon: 'fa-clinic-medical', color: 'var(--center)', label: 'مركز' },
        lab: { icon: 'fa-flask', color: 'var(--lab)', label: 'مخبر' },
        doctor: { icon: 'fa-user-md', color: 'var(--doctor)', label: 'طبيب' },
        pharmacy: { icon: 'fa-pills', color: 'var(--pharmacy)', label: 'صيدلية' }
    };

    if (matches.length === 0) {
        searchDropdown.innerHTML = '<div class="smart-empty">لا توجد نتائج مطابقة</div>';
    } else {
        searchDropdown.innerHTML = matches.map(item => {
            const t = typeMap[item.type] || typeMap.doctor;
            return `
                <div onclick="selectSearchResult('${escapeHtml(item.id)}')" class="smart-result-item">
                    <div class="smart-icon" style="background: ${t.color}15; color: ${t.color};">
                        <i class="fas ${t.icon}"></i>
                    </div>
                    <div class="smart-text">
                        <div class="smart-name">${escapeHtml(item.name)}</div>
                        <div class="smart-desc">${escapeHtml(item.specialty || item.address || t.label)}</div>
                    </div>
                    <i class="fas fa-arrow-left smart-arrow"></i>
                </div>
            `;
        }).join('');
    }

    // تحديد الموقع بدقة ثم إظهار القائمة
    if (window.updateSmartSearchPosition) window.updateSmartSearchPosition();
    searchDropdown.classList.remove('hidden');
}

window.selectSearchResult = (id) => {
    if(searchDropdown) searchDropdown.classList.add('hidden');
    const searchInput = document.getElementById('heroSearch');
    if(searchInput) searchInput.value = '';
    openModal(id);
};
        
window.openCitySelector = () => {
    const overlay = document.getElementById('citySelectorOverlay');
    const listContainer = document.getElementById('cityListContainer');
    listContainer.innerHTML = allCities.map(city => `
        <div class="city-option ${currentCity === city ? 'selected' : ''}" onclick="selectCity('${escapeHtml(city)}')">
            <div class="flex items-center gap-3">
                <i class="fas ${city === 'كل المدن' ? 'fa-globe' : 'fa-city'}" style="color: var(--accent)"></i>
                <span class="font-bold text-sm">${escapeHtml(city)}</span>
            </div>
            ${currentCity === city ? '<i class="fas fa-check-circle text-white"></i>' : ''}
        </div>
    `).join('');
    overlay.classList.add('active');
};

window.closeCitySelector = () => {
    document.getElementById('citySelectorOverlay').classList.remove('active');
};

window.selectCity = (city) => {
    currentCity = city;
    document.getElementById('currentCityText').innerText = city;
    closeCitySelector();
    renderData();
};  
window.resetSearch = () => { searchQuery = ''; currentFilter = 'all'; const heroSearch = document.getElementById('heroSearch'); if(heroSearch) heroSearch.value = ''; document.querySelectorAll('.filter-btn').forEach(b => { b.classList.remove('active'); b.style.background = ''; b.style.color = ''; b.style.borderColor = ''; }); const allBtn = document.querySelector('[data-filter="all"]'); allBtn.classList.add('active'); allBtn.style.background = 'var(--accent)'; allBtn.style.color = 'white'; allBtn.style.borderColor = 'var(--accent)'; renderData(); }
window.openModal = (id) => { 
    const item = allData.find(d => d.id === id);
    if (!item) return;
    
    if (['doctor', 'pharmacy'].includes(item.type)) {
        item.view_count = (item.view_count || 0) + 1; 
        supabase.rpc('increment_view_count', { listing_id: id }).then(); 
    }
    
    const typeMap = { 
        hospital: { label: 'مشفى', badgeClass: 'badge-hospital', color: 'var(--hospital)', icon: 'fa-hospital-symbol' }, 
        center: { label: 'مركز طبي', badgeClass: 'badge-center', color: 'var(--center)', icon: 'fa-clinic-medical' }, 
        lab: { label: 'مخبر', badgeClass: 'badge-lab', color: 'var(--lab)', icon: 'fa-flask' }, 
        doctor: { label: 'طبيب', badgeClass: 'badge-doctor', color: 'var(--doctor)', icon: 'fa-user-md' }, 
        pharmacy: { label: 'صيدلية', badgeClass: 'badge-pharmacy', color: 'var(--pharmacy)', icon: 'fa-pills' } 
    }; 
    const t = typeMap[item.type] || typeMap.doctor;
    const fullStars = Math.floor(item.rating || 0); 
    const halfStar = (item.rating || 0) % 1 >= 0.5; 
    let starsHTML = ''; 
    for (let i = 0; i < fullStars; i++) starsHTML += '<i class="fas fa-star"></i>'; 
    if (halfStar) starsHTML += '<i class="fas fa-star-half-alt"></i>'; 
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0); 
    for (let i = 0; i < emptyStars; i++) starsHTML += '<i class="far fa-star"></i>'; 
    
    let extraHTML = ''; 
    let doctorsListHtml = ''; // متغير مستقل للأطباء لوضعه أسفل البطاقة وأعلى الخريطة
    
    if (item.type === 'hospital' || item.type === 'center') {
        const primaryColor = item.type === 'hospital' ? 'teal' : 'purple';
        let cData = item.facility_details || {};
        
        // 1. شريط الإحصائيات الأنيق
        let statsHtml = '';
        if (cData.stats && cData.stats.length > 0) {
            statsHtml = `<div class="grid grid-cols-3 gap-3 mb-4">`;
            cData.stats.forEach(stat => {
                statsHtml += `
                    <div class="bg-white p-3 rounded-xl text-center shadow-sm border border-gray-100 flex flex-col items-center justify-center">
                        <i class="fas ${stat.icon || 'fa-circle'} text-${primaryColor}-600 text-xl mb-2"></i>
                        <div class="text-lg font-black text-gray-800">${escapeHtml(stat.value)}</div>
                        <div class="text-[10px] text-gray-500 mt-1">${escapeHtml(stat.label)}</div>
                    </div>
                `;
            });
            statsHtml += `</div>`;
        }

        // 2. معلومات السعة الاستيعابية
        let capacityHtml = '';
        if (item.capacity_info) {
            capacityHtml = `
                <div class="bg-${primaryColor}-50 border border-${primaryColor}-200 rounded-2xl p-4 mb-4 flex items-start gap-3">
                    <i class="fas fa-users text-${primaryColor}-600 text-xl mt-1"></i>
                    <div>
                        <h4 class="font-bold text-sm text-${primaryColor}-800 mb-1">السعة الاستيعابية والكادر</h4>
                        <p class="text-xs text-${primaryColor}-700 leading-relaxed">${escapeHtml(item.capacity_info)}</p>
                    </div>
                </div>
            `;
        }

        // 3. الأطباء المرتبطين (يتم وضعهم في متغير مستقل لعرضهم أسفل البطاقة وأعلى الخريطة)
        const facilityDoctors = allData.filter(d => d.parent_id === item.id);
        if (facilityDoctors.length > 0) {
            doctorsListHtml = `
                <div class="bg-white p-4 mt-5 rounded-2xl border" style="border-color: var(--border);">
                    <h4 class="font-bold text-sm mb-3 flex items-center gap-2" style="color: var(--fg);">
                        <i class="fas fa-user-md text-blue-600"></i> الأطباء المتواجدون داخل المنشأة (${facilityDoctors.length})
                    </h4>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        ${facilityDoctors.map(doc => `
                            <div onclick="closeModal(); setTimeout(() => openModal('${doc.id}'), 300)" class="flex items-center justify-between p-3 bg-gray-50 rounded-xl cursor-pointer border border-transparent hover:border-blue-200 transition-all">
                                <div class="flex items-center gap-3">
                                    <img src="${escapeHtml(doc.image)}" class="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm">
                                    <div><div class="font-bold text-sm text-gray-800">${escapeHtml(doc.name)}</div><div class="text-xs text-gray-500">${escapeHtml(doc.specialty)}</div></div>
                                </div>
                                <i class="fas fa-chevron-left text-blue-600 text-xs"></i>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

                // 4. أكورديون الأقسام الرئيسية
        let deptsHtml = '';
        if (cData.departments && cData.departments.length > 0) {
            deptsHtml = `
                <div class="accordion-item active bg-white rounded-2xl shadow-sm border border-gray-100 mb-4 overflow-hidden">
                    <div class="accordion-header p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50" onclick="toggleAccordion(this)">
                        <span class="font-bold text-sm text-gray-800 flex items-center gap-2"><i class="fas fa-hospital-symbol text-${primaryColor}-600"></i> الأقسام الطبية والخدمية الرئيسية</span>
                        <i class="fas fa-chevron-down text-xs text-gray-400 transition-transform"></i>
                    </div>
                    <div class="accordion-body p-4">
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            ${cData.departments.map(dept => `
                                <div class="flex items-start gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                                    <div class="w-8 h-8 rounded-lg bg-yellow-50 flex items-center justify-center flex-shrink-0">
                                        <i class="fas ${dept.icon || 'fa-circle'} text-yellow-500 text-sm"></i>
                                    </div>
                                    <div>
                                        <h4 class="text-sm font-bold text-gray-800">${escapeHtml(dept.title)}</h4>
                                        <p class="text-[11px] text-gray-500 mt-1 leading-relaxed">${escapeHtml(dept.desc)}</p>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            `;
        }

        // 5. أكورديون الوحدات الحرجة
        let unitsHtml = '';
        if (cData.units && cData.units.length > 0) {
            unitsHtml = `
                <div class="accordion-item bg-white rounded-2xl shadow-sm border border-gray-100 mb-4 overflow-hidden">
                    <div class="accordion-header p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50" onclick="toggleAccordion(this)">
                        <span class="font-bold text-sm text-gray-800 flex items-center gap-2"><i class="fas fa-procedures text-red-600"></i> الوحدات الحرجة الإضافية</span>
                        <i class="fas fa-chevron-down text-xs text-gray-400 transition-transform"></i>
                    </div>
                    <div class="accordion-body p-4">
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            ${cData.units.map(unit => `
                                <div class="flex items-start gap-3 p-3 bg-red-50/50 rounded-xl border border-red-100/50">
                                    <div class="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                                        <i class="fas fa-heart-pulse text-red-600 text-sm"></i>
                                    </div>
                                    <div>
                                        <h4 class="text-sm font-bold text-red-900">${escapeHtml(unit.title)}</h4>
                                        <p class="text-[11px] text-red-700/80 mt-1 leading-relaxed">${escapeHtml(unit.desc)}</p>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            `;
        }

        // 6. أكورديون الخدمات المساندة
        let servicesHtml = '';
        if (cData.services && cData.services.length > 0) {
            servicesHtml = `
                <div class="accordion-item bg-white rounded-2xl shadow-sm border border-gray-100 mb-4 overflow-hidden">
                    <div class="accordion-header p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50" onclick="toggleAccordion(this)">
                        <span class="font-bold text-sm text-gray-800 flex items-center gap-2"><i class="fas fa-pills text-green-600"></i> الخدمات الطبية المساندة</span>
                        <i class="fas fa-chevron-down text-xs text-gray-400 transition-transform"></i>
                    </div>
                    <div class="accordion-body p-4">
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            ${cData.services.map(serv => `
                                <div class="flex items-start gap-3 p-3 bg-green-50/50 rounded-xl border border-green-100/50">
                                    <div class="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                                        <i class="fas fa-check-circle text-green-600 text-sm"></i>
                                    </div>
                                    <div>
                                        <h4 class="text-sm font-bold text-green-900">${escapeHtml(serv.title)}</h4>
                                        <p class="text-[11px] text-green-700/80 mt-1 leading-relaxed">${escapeHtml(serv.desc)}</p>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            `;
        }
        // 7. قسم أرقام هواتف المنشأة
        let phonesHtml = '';
        if (cData.phones && cData.phones.length > 0) {
            phonesHtml = `
                <div class="bg-teal-50 border border-teal-200 rounded-2xl p-4 mb-4">
                    <h4 class="font-bold text-sm text-teal-800 mb-3 flex items-center gap-2"><i class="fas fa-phone-volume"></i> أرقام هواتف المنشأة</h4>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        ${cData.phones.map(p => `
                            <a href="tel:${escapeHtml(p.phone)}" class="flex items-center gap-2 p-2 bg-white rounded-lg border border-teal-100 hover:bg-teal-50 transition-colors">
                                <div class="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center flex-shrink-0">
                                    <i class="fas fa-phone text-teal-600 text-xs"></i>
                                </div>
                                <div>
                                    <span class="text-xs text-gray-500 block">${escapeHtml(p.label || 'هاتف')}</span>
                                    <span class="font-bold text-sm text-gray-800" dir="ltr">${escapeHtml(p.phone)}</span>
                                </div>
                            </a>
                        `).join('')}
                    </div>
                </div>
            `;
        }
        // دمج العناصر داخل extraHTML (بدون الأطباء)
        extraHTML = `
            ${statsHtml}
            ${capacityHtml}
            ${deptsHtml}
            ${unitsHtml}
            ${servicesHtml}
            ${phonesHtml}
        `;
    } else if (item.type === 'doctor') { 
        extraHTML = `${item.bookingnotes ? `<div class="flex items-center gap-3 p-3 rounded-xl" style="background: var(--bg)"><i class="fas fa-info-circle" style="color: var(--doctor)"></i><div><div class="text-xs" style="color: var(--muted)">تفاصيل إضافية</div><div class="text-sm font-bold">${escapeHtml(item.bookingnotes)}</div></div></div>` : ''}`;
    } else if (item.type === 'lab') {
        extraHTML = `${item.tests ? `<div class="flex items-center gap-3 p-3 rounded-xl" style="background: #FEE2E2"><i class="fas fa-vials" style="color: var(--lab)"></i><div><div class="text-xs" style="color: var(--muted)">نوع التحاليل والخدمات</div><div class="text-sm font-bold" style="color: var(--lab)">${escapeHtml(item.tests)}</div></div></div>` : ''}${item.homesample && item.homesample !== 'لا' ? `<div class="flex items-center gap-3 p-3 rounded-xl" style="background: #D1FAE5"><i class="fas fa-house-user" style="color: #059669"></i><div><div class="text-xs" style="color: var(--muted)">خدمة سحب العينات من المنزل</div><div class="text-sm font-bold" style="color: #059669">متوفرة</div></div></div>` : ''}`;
    } else if (item.type === 'pharmacy') {
        extraHTML = `${item.night ? `<div class="flex items-center gap-3 p-3 rounded-xl" style="background: var(--gold-light)"><i class="fas fa-moon" style="color: var(--gold)"></i><div><div class="text-xs" style="color: var(--muted)">المناوبة</div><div class="text-sm font-bold" style="color: var(--gold)">${escapeHtml(item.nightdetails || 'صيدلية مناوبة ليلية')}</div></div></div>` : ''}`;
    }

    const canBook = item.type === 'doctor' && item.is_subscribed; 
    let bookingBtnModal = ''; 
    if (canBook) {
        bookingBtnModal = `<button onclick="openBookingModal('${escapeHtml(item.id)}')" class="flex-1 py-3.5 rounded-xl text-white text-sm font-bold text-center flex items-center justify-center gap-2" style="background: var(--accent)"><i class="fas fa-calendar-check"></i> طلب موعد</button>`;
    }
    
    const mapQuery = item.latlng || ((item.address || item.clinic) + ' سوريا ');
    const mapEmbed = (mapQuery) ? `
    <div class="mt-5 rounded-2xl overflow-hidden border-2" style="border-color: var(--border)">
        <div class="bg-gray-50 px-4 py-3 flex items-center justify-between border-b" style="border-color: var(--border)">
            <div class="flex items-center gap-2 text-sm font-bold text-gray-700">
                <i class="fas fa-map-marked-alt" style="color: ${t.color}"></i>
                الموقع على الخريطة
            </div>
            <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}" target="_blank" class="text-xs bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg font-semibold hover:bg-blue-100 transition-colors flex items-center gap-1">
                <i class="fas fa-directions"></i> الاتجاهات
            </a>
        </div>
        <iframe width="100%" height="220" frameborder="0" style="border:0; display: block;" src="https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&z=16&output=embed" allowfullscreen loading="lazy"></iframe>
    </div>` : '';
    
    // لاحظ هنا أننا نضع ${doctorsListHtml} قبل ${mapEmbed} مباشرة
    document.getElementById('modalContent').innerHTML = `<div class="relative h-48 overflow-hidden rounded-t-2xl">
<img src="${getOptimizedImageUrl(item.image, 800, 400)}"  alt="${escapeHtml(item.name)}" class="w-full h-full object-cover cursor-zoom-in" onclick="openLightbox(this.src)"><div class="absolute inset-0" style="background: linear-gradient(to top, rgba(0,0,0,0.6), transparent)"></div><button onclick="closeModal()" class="absolute top-4 left-4 w-8 h-8 rounded-full bg-black/30 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/50 transition-all"><i class="fas fa-times text-sm"></i></button><div class="absolute bottom-4 right-5 left-5"><span class="badge ${t.badgeClass} mb-2 inline-block">${t.label}</span><h3 class="text-white font-bold text-lg" style="font-family: 'Noto Kufi Arabic'">${escapeHtml(item.name)}</h3></div></div><div class="p-6"><div class="flex items-center gap-2 mb-4"><div class="flex items-center gap-0.5 text-sm" style="color: ${t.color}">${starsHTML}</div><span class="text-sm font-bold">${escapeHtml(item.rating || 0)}</span><span class="text-xs" style="color: var(--muted)">/ 5</span></div><p class="text-sm leading-relaxed mb-5" style="color: var(--fg-light)">${escapeHtml(item.description || '')}</p><div class="flex flex-col gap-2 mb-5"><div class="flex items-center gap-3 p-3 rounded-xl" style="background: var(--bg)"><i class="fas ${t.icon}" style="color: ${t.color}"></i><div><div class="text-xs" style="color: var(--muted)">${item.type === 'doctor' ? 'التخصص' : (item.type === 'clinic' || item.type === 'center' ? 'التخصص الأساسي' : 'النوع')}</div><div class="text-sm font-bold">${escapeHtml(item.specialty || 'غير محدد')}</div></div></div> ${(item.address || item.clinic) ? `<div class="flex items-center gap-3 p-3 rounded-xl" style="background: var(--bg)"><i class="fas fa-map-marker-alt" style="color: ${t.color}"></i><div><div class="text-xs" style="color: var(--muted)">العنوان / الموقع</div><div class="text-sm font-bold">${escapeHtml(item.address || item.clinic)}</div></div></div>` : ''}<div class="flex items-center gap-3 p-3 rounded-xl" style="background: var(--bg)"><i class="fas fa-clock" style="color: ${t.color}"></i><div class="flex-1"><div class="text-xs" style="color: var(--muted)">${item.type === 'doctor' ? 'أوقات المعاينة' : 'أوقات العمل'}</div><div class="text-sm font-bold">${escapeHtml(item.consulthours || item.hours || '')}</div></div>${['doctor', 'clinic', 'pharmacy'].includes(item.type) && item.isopen === true ? '<span class="text-xs px-2 py-1 rounded bg-green-100 text-green-700 font-bold">مفتوح الآن</span>' : ''}${['doctor', 'clinic', 'pharmacy'].includes(item.type) && item.isopen === false ? '<span class="text-xs px-2 py-1 rounded bg-red-100 text-red-700 font-bold">مغلق حالياً</span>' : ''}</div>${extraHTML}</div>${doctorsListHtml}${mapEmbed}${item.phone ? `<div class="flex items-center gap-3 mt-4"> <a href="tel:${escapeHtml(item.phone)}" onclick="trackPhoneClick('${escapeHtml(item.id)}')" class="call-btn flex-1 py-3.5 rounded-xl text-white text-sm font-bold text-center flex items-center justify-center gap-2" style="background: ${t.color}"><i class="fas fa-phone-alt"></i> اتصال ${escapeHtml(item.phone)}</a><button onclick="copyNumber('${escapeHtml(item.phone)}')" class="w-12 h-12 rounded-xl border flex items-center justify-center transition-all hover:bg-gray-50 flex-shrink-0" style="border-color: var(--border)"><i class="fas fa-copy" style="color: var(--muted)"></i></button></div>` : ''}${canBook ? `<div class="mt-3">${bookingBtnModal}</div>` : ''}</div>`;  
    
    document.getElementById('modalOverlay').classList.add('active'); 
    lockScroll(); 
}

window.openLightbox = (src) => { const lightbox = document.getElementById('lightbox'); lightbox.querySelector('img').src = src.includes('picsum.photos') ? src.replace('/400/250', '/1200/800') : src; lightbox.classList.add('active'); lockScroll(); }
window.closeModal = (event) => { 
    if (event && event.target !== document.getElementById('modalOverlay')) return; 
    document.getElementById('modalOverlay').classList.remove('active'); 
    unlockScroll(); 
    
    // إعادة رابط الموقع وعنوان التبويب لوضعهما الطبيعي (SEO)
    if (window.location.hash.includes('article=')) {
        history.replaceState(null, '', window.location.pathname); // مسح #article=5 من الرابط
        updateMetaTags(
    'LomedX | مشافي، أطباء، صيدليات، مراكز طبية، مخابر', 
    'Lomedx منصة الطبية الشاملة في سوريا. ابحث عن أقرب المشفى، الطبيب، الصيدلية، المركز الطبي أو مخبر.',
    'https://z-cdn-media.chatglm.cn/files/981068e8-ce01-48cb-baf4-b93e843f3df9.jpg'
);
    }
}
window.copyNumber = (phone) => { navigator.clipboard.writeText(phone).then(() => showToast('تم نسخ رقم الهاتف بنجاح')).catch(() => showToast('تعذر النسخ')); }
window.trackPhoneClick = (id) => {
    const item = allData.find(d => d.id === id);
    if (!item) return;
    item.phone_clicks = (item.phone_clicks || 0) + 1;
    supabase.rpc('increment_phone_click', { listing_id: id }).catch(() => {});
};
window.copyText = (text) => { navigator.clipboard.writeText(text).then(() => showToast('تم نسخ الكود بنجاح')).catch(() => showToast('تعذر النسخ')); }

function showToast(message, type = 'info') { 
    const toast = document.getElementById('toast');
    
    // تحديد الأيقونة واللون حسب نوع الإشعار
    let icon = 'ℹ️'; // معلومات
    let bgColor = '#1B2A1B'; // اللون الأساسي
    
    if (type === 'success') {
        icon = '✅';
        bgColor = '#10B981'; // أخضر
    } else if (type === 'error') {
        icon = '❌';
        bgColor = '#EF4444'; // أحمر
    }
    
    toast.innerHTML = `<span style="margin-left: 8px;">${icon}</span> ${message}`;
    toast.style.backgroundColor = bgColor;
    
    toast.classList.add('show'); 
    setTimeout(() => toast.classList.remove('show'), 4000); 
}
window.showToast = showToast;
window.toggleMobileMenu = () => { const menu = document.getElementById('mobileMenu'); const overlay = document.getElementById('menuOverlay'); const icon = document.getElementById('menuIcon'); const isOpen = menu.classList.contains('open'); if (isOpen) { menu.classList.remove('open'); overlay.classList.add('hidden'); icon.className = 'fas fa-bars'; unlockScroll(); } else { menu.classList.add('open'); overlay.classList.remove('hidden'); icon.className = 'fas fa-times'; lockScroll(); } }
window.togglePlatformInfo = () => {
    const infoDiv = document.getElementById('platformInfo');
    const icon = document.getElementById('platformInfoIcon');
    if (infoDiv.classList.contains('hidden')) { infoDiv.classList.remove('hidden'); icon.style.transform = 'rotate(180deg)'; } 
    else { infoDiv.classList.add('hidden'); icon.style.transform = 'rotate(0deg)'; }
}
window.toggleFooterBox = (contentId, iconId) => {
    const content = document.getElementById(contentId);
    const icon = document.getElementById(iconId);
    if (content.classList.contains('hidden')) { content.classList.remove('hidden'); icon.style.transform = 'rotate(180deg)'; } 
    else { content.classList.add('hidden'); icon.style.transform = 'rotate(0deg)'; }
}

window.handleContactSubmit = (e) => { 
    e.preventDefault(); 
    const phoneInput = document.getElementById('contactPhone'); 
    const phone = phoneInput.value.trim(); 
    
    if (!/^09\d{8}$/.test(phone)) { 
        phoneInput.classList.add('input-invalid'); 
        showToast('رقم الهاتف غير صحيح', 'error'); 
        return; 
    } 
    phoneInput.classList.remove('input-invalid'); 
    
    // 1. تعريف المتغيرات أولاً
    const name = document.getElementById('contactName').value; 
    const type = document.getElementById('contactType').value; 
    const message = document.getElementById('contactMessage').value; 

    // 2. ثم فحص الكلمات المسيئة
    if (containsBadWords(name) || containsBadWords(message)) {
        showToast('تم رفض الرسالة لاحتوائها على كلمات غير لائقة.', 'error');
        return;
    }
    
    const text = `*رسالة جديدة من منصة LomedX الطبية*\n*الاسم:* ${name}\n*الهاتف:* ${phone}\n*النوع:* ${type}\n*الرسالة:* ${message}`; 
    
    const adminWhatsAppNumber = "963980390813";
    const whatsappUrl = `https://wa.me/${adminWhatsAppNumber}?text=${encodeURIComponent(text)}`;
    
    window.open(whatsappUrl, '_blank'); 
    showToast('جاري تحويلك إلى واتساب لإرسال الرسالة...', 'success'); 
    e.target.reset(); 
}

window.addEventListener('scroll', () => { document.getElementById('navbar').classList.toggle('scrolled', window.scrollY > 80); document.getElementById('backToTop').classList.toggle('visible', window.scrollY > 500); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { if (document.getElementById('lightbox').classList.contains('active')) { document.getElementById('lightbox').classList.remove('active'); unlockScroll(); } if (document.getElementById('modalOverlay').classList.contains('active')) closeModal(); if (document.getElementById('ctrlOverlay').classList.contains('active')) closeCtrlPanel(); if (document.getElementById('mobileMenu').classList.contains('open')) toggleMobileMenu(); } });

const allBtn = document.querySelector('[data-filter="all"]'); 
if(allBtn) { allBtn.style.background = 'var(--accent)'; allBtn.style.color = 'white'; allBtn.style.borderColor = 'var(--accent)'; }

window.openCtrlPanel = (title, contentHtml, headerColor = '#073D2E', preventClose = false) => { 
    document.getElementById('ctrlTitle').textContent = title; 
    document.getElementById('ctrlContent').innerHTML = contentHtml; 
    const overlay = document.getElementById('ctrlOverlay');
    if (!overlay.classList.contains('active')) {
        overlay.classList.add('active'); 
        document.querySelector('#ctrlOverlay .p-5').style.background = headerColor; 
        lockScroll(); 
    }
    overlay.dataset.preventClose = preventClose ? 'true' : 'false';
}
window.closeCtrlPanel = (event) => { 
    const overlay = document.getElementById('ctrlOverlay');
    if (event && event.target.id === 'ctrlOverlay' && overlay.dataset.preventClose === 'true') return; 
    
    overlay.classList.remove('active'); 
    unlockScroll(); 
    
    if (doctorDashboardInterval) { clearInterval(doctorDashboardInterval); doctorDashboardInterval = null; } 
    if (unsubscribeMedRequests) { supabase.removeChannel(unsubscribeMedRequests); unsubscribeMedRequests = null; } 
    if (unsubscribeMedRequestsInterval) { clearInterval(unsubscribeMedRequestsInterval); unsubscribeMedRequestsInterval = null; } 
    if (unsubscribeDocBookings) { supabase.removeChannel(unsubscribeDocBookings); unsubscribeDocBookings = null; }
    if (activeFollowupUnsub) { supabase.removeChannel(activeFollowupUnsub); activeFollowupUnsub = null; } 
    currentFollowupBookingId = null;
}

window.openBookingModal = (id) => { 
    closeModal(); 
    const item = allData.find(d => d.id === id); 
    if (!item) return; 
    tempBooking = { itemid: id, itemname: item.name, itemphone: (item.phone || '').replace(/[^0-9]/g, '') }; 
    
    let daysHTML = ''; let validDaysCount = 0; 
    for (let i = 1; i <= 14; i++) { 
        const date = new Date(); date.setDate(date.getDate() + i); 
        const dayName = date.toLocaleDateString('ar-EG', { weekday: 'long' }); 
        if (item.workingdays && item.workingdays.includes(dayName) && validDaysCount < 5) { 
            validDaysCount++; 
            const dayShort = date.toLocaleDateString('ar-EG', { weekday: 'short' }); 
            const dayNum = date.toLocaleDateString('ar-EG', { day: 'numeric' }); 
            const iso = date.toISOString(); 
            daysHTML += `<button onclick="selectDay('${iso}', this)" class="day-btn flex-shrink-0 w-16 h-20 rounded-xl flex flex-col items-center justify-center gap-1 bg-white"><span class="text-xs font-bold">${dayShort}</span><span class="text-2xl font-black">${dayNum}</span></button>`; 
        } 
    } 
    if (validDaysCount === 0) { daysHTML = '<p class="text-sm text-center w-full" style="color: var(--muted)">لا توجد أيام متاحة للحجز.</p>'; } 

    document.getElementById('modalContent').innerHTML = `<div class="p-6"><div class="flex justify-between items-center mb-6"><h3 class="font-bold text-lg"><i class="fas fa-calendar-plus ml-2" style="color: var(--accent)"></i> طلب موعد</h3><button onclick="closeModal()" class="text-2xl hover:text-gray-400 leading-none">&times;</button></div><div class="mb-4 p-3 rounded-xl flex items-center gap-3" style="background: var(--accent-light)"><i class="fas fa-hospital text-xl" style="color: var(--accent)"></i><div><div class="text-xs" style="color: var(--accent-dark)">سيتم طلب الموعد في:</div><div class="font-bold text-sm" style="color: var(--accent-dark)">${escapeHtml(item.name)}</div></div></div><div id="step1" class="booking-step active"><h4 class="text-sm font-bold mb-3">1. اختر اليوم المناسب:</h4><div class="flex gap-2 overflow-x-auto pb-2 mb-4">${daysHTML}</div><div id="slotsContainer" class="flex flex-wrap gap-2 mb-4"></div><button onclick="goToStep(2)" id="step1Next" disabled class="w-full py-3 rounded-xl text-white font-bold text-sm transition-all opacity-50 cursor-not-allowed" style="background: var(--accent)">التالي</button></div><div id="step2" class="booking-step"><h4 class="text-sm font-bold mb-3">2. أدخل بياناتك:</h4><div class="flex flex-col gap-3 mb-6"><input type="text" id="patientName" class="ctrl-input" placeholder="الاسم الكامل" required><input type="tel" id="patientPhone" class="ctrl-input" placeholder="09XXXXXXXX" required><textarea id="patientNotes" class="ctrl-input" rows="2" placeholder="ملاحظات (اختياري)"></textarea></div><div class="flex gap-2"><button onclick="goToStep(1)" class="w-1/3 py-3 rounded-xl border font-bold text-sm" style="border-color: var(--border)"><i class="fas fa-arrow-right ml-2"></i> رجوع</button><button onclick="confirmBooking()" class="w-2/3 py-3 rounded-xl text-white font-bold text-sm" style="background: var(--accent)">تأكيد</button></div></div></div>`; 
    document.getElementById('modalOverlay').classList.add('active'); lockScroll(); 
}

window.selectDay = async (iso, btn) => { 
    tempBooking.day = new Date(iso); 
    tempBooking.daystr = tempBooking.day.toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' }); 
    document.querySelectorAll('.day-btn').forEach(b => b.classList.remove('active')); 
    btn.classList.add('active'); 
    
    const item = allData.find(d => d.id === tempBooking.itemid); 
    const slotsContainer = document.getElementById('slotsContainer');
    const step1Next = document.getElementById('step1Next');

    // إذا كان النظام اليدوي هو النشط، نتركه يعمل كالسابق
    if (item.active_system !== 'slots' || !item.working_hours) {
        if(slotsContainer) slotsContainer.innerHTML = '';
        step1Next.disabled = false; 
        step1Next.classList.remove('opacity-50', 'cursor-not-allowed');
        return;
    }

    // إذا كان النظام الدقيق نشطاً، نعرض الأوقات
    slotsContainer.innerHTML = '<p class="text-xs text-gray-400 w-full text-center py-2"><i class="fas fa-spinner fa-spin"></i> جاري تحميل الأوقات...</p>';
    
    const { data: booked } = await supabase.from('bookings')
        .select('slot_time')
        .eq('itemid', tempBooking.itemid)
        .eq('daystr', tempBooking.daystr)
        .neq('status', 'canceled');
        
    const bookedSlots = booked ? booked.map(b => b.slot_time) : [];

    let slotsHtml = '';
    let start = new Date(`2024-01-01T${item.working_hours.start}:00`);
    let end = new Date(`2024-01-01T${item.working_hours.end}:00`);
    
    while(start < end) {
        const timeStr = start.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
        const isBooked = bookedSlots.includes(timeStr);
        slotsHtml += `<button ${isBooked ? 'disabled' : `onclick="selectSlot('${timeStr}', this)"`} class="px-3 py-2 rounded-lg text-xs font-bold transition-all ${isBooked ? 'bg-gray-100 text-gray-400 line-through cursor-not-allowed' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}">${timeStr}</button>`;
        start.setMinutes(start.getMinutes() + 20); // مدة كل موعد 20 دقيقة
    }

    slotsContainer.innerHTML = slotsHtml || '<p class="text-xs text-gray-400 w-full text-center py-2">لا توجد أوقات متاحة.</p>';
    step1Next.disabled = true; 
    step1Next.classList.add('opacity-50', 'cursor-not-allowed');
}

// دالة اختيار الوقت
window.selectSlot = (time, btn) => {
    tempBooking.slot_time = time;
    document.querySelectorAll('#slotsContainer button').forEach(b => b.classList.remove('bg-blue-600', 'text-white'));
    btn.classList.remove('bg-blue-50', 'text-blue-700');
    btn.classList.add('bg-blue-600', 'text-white');
    
    document.getElementById('step1Next').disabled = false; 
    document.getElementById('step1Next').classList.remove('opacity-50', 'cursor-not-allowed');
}
window.goToStep = (step) => { document.querySelectorAll('.booking-step').forEach(s => s.classList.remove('active')); document.getElementById(`step${step}`).classList.add('active'); }

window.confirmBooking = async () => { 
    const name = document.getElementById('patientName').value.trim(); 
    const phoneInput = document.getElementById('patientPhone'); 
    const phone = phoneInput.value.trim(); 
    const notes = document.getElementById('patientNotes').value.trim(); 
    if (!name || !phone) { showToast('الرجاء إدخال الاسم والهاتف'); return; } 
    if (!/^09\d{8}$/.test(phone)) { phoneInput.classList.add('input-invalid'); showToast('رقم هاتف غير صحيح'); return; } 
    phoneInput.classList.remove('input-invalid'); 
    const ref = `R-${Math.floor(Math.random() * 900000) + 100000}`;
    tempBooking.ref = ref; 
    tempBooking.name = name; 
    tempBooking.phone = phone; 
    tempBooking.notes = notes; 
    tempBooking.status = 'pending'; 
    tempBooking.time = tempBooking.slot_time || "بانتظار التحديد";
    tempBooking.chat = []; 

    // إرفاق معرف إشعارات المريض (إن وجد)
    const patientPushId = localStorage.getItem('patient_push_id');
    if (patientPushId) {
        tempBooking.patient_push_id = patientPushId;
    }
    try { 
        const { data, error } = await supabase.from('bookings').insert([tempBooking]).select(); 
        if (error) throw error;
        const newId = data[0].id;
                // === إشعار للطبيب بوجود حجز جديد ===
        const doctorData = allData.find(d => d.id === tempBooking.itemid);
        if (doctorData && doctorData.user_id) {
            sendPushNotification(doctorData.user_id, "موعد جديد 🗓️", `المريض ${tempBooking.name} طلب موعداً يوم ${tempBooking.daystr}`);
        }
        document.getElementById('step2').innerHTML = `
        <div class="text-center py-6 flex flex-col items-center">
            <div class="w-16 h-16 rounded-full flex items-center justify-center mb-4" style="background: var(--accent-light)"><i class="fas fa-check text-3xl" style="color: var(--accent)"></i></div>
            <h4 class="text-lg font-bold mb-2">تم إرسال طلبك!</h4>
            <p class="text-sm mb-2" style="color: var(--muted)">رقم المرجع: <span class="font-bold text-yellow-600">#${ref}</span></p>
            <button onclick="copyText('${ref}')" class="w-full py-3 rounded-xl text-white font-bold text-sm mb-2" style="background: var(--accent)"><i class="fas fa-copy ml-2"></i> نسخ الكود</button>
            <button onclick="closeModal(); openBookingFollowup('${newId}')" class="w-full py-3 rounded-xl text-white font-bold text-sm mb-2" style="background: var(--doctor)">متابعة الحجز والدردشة</button>
            <button onclick="closeModal()" class="w-full py-2 rounded-xl border font-bold text-sm" style="border-color: var(--border)">إغلاق</button>
        </div>`; 
        } catch (e) { 
        
        showToast('خطأ في الحفظ: ' + e.message, 'error');
    } 
}

window.openBookingFollowup = (bookingId) => {
    currentFollowupBookingId = bookingId;
    openCtrlPanel('متابعة الحجز والدردشة', `<div id="followupContent" class="flex flex-col gap-4"><p class="text-center py-8 text-gray-400">جاري تحميل بيانات الحجز...</p></div>`, '#0E7C5F');
    
    // إيقاف أي اشتراك سابق
    if (activeFollowupUnsub) { supabase.removeChannel(activeFollowupUnsub); activeFollowupUnsub = null; }
    
    // جلب البيانات لأول مرة
    fetchFollowupChat(bookingId);
    
    // الاستماع للتحديثات اللحظية (Realtime)
    activeFollowupUnsub = supabase
      .channel(`booking_chat_${bookingId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'bookings', filter: `id=eq.${bookingId}` }, payload => {
          // عند وصول رسالة جديدة، نقوم بتحديث الواجهة فوراً
          const updatedBooking = payload.new;
          const index = bookings.findIndex(b => b.id === bookingId);
          if (index !== -1) bookings[index] = updatedBooking;
          else bookings.push(updatedBooking);
          
          renderFollowupChat(bookingId);
      })
      .subscribe();
};

window.renderFollowupChat = (bookingId) => {
    const booking = bookings.find(b => b.id === bookingId); 
    const contentEl = document.getElementById('followupContent'); if (!contentEl) return;
    if (!booking) { contentEl.innerHTML = '<p class="text-center py-8 text-red-500">لم يتم العثور على الحجز.</p>'; return; }
    const b = booking;
    let statusBadge = '';
    if (b.status === 'accepted') statusBadge = `<span class="px-3 py-1 rounded text-sm" style="background: #D1FAE5; color: #065F46">🟢 تم التأكيد - ${escapeHtml(b.time)}</span>`;
    else if (b.status === 'canceled') statusBadge = `<span class="px-3 py-1 rounded text-sm" style="background: #FEE2E2; color: #991B1B">تم الإلغاء</span>`;
    else statusBadge = `<span class="px-3 py-1 rounded text-sm" style="background: #FEF3C7; color: #92400E">🟡 الحجز قيد المراجعة من العيادة</span>`;
    let chatHtml = '';
    if (b.chat && b.chat.length > 0) { chatHtml = b.chat.map(msg => `<div class="flex ${msg.sender === 'patient' ? 'justify-start' : 'justify-end'}"><div class="max-w-[75%] p-3 rounded-xl text-sm ${msg.sender === 'patient' ? 'bg-gray-100 text-gray-800' : 'bg-blue-500 text-white'}">${escapeHtml(msg.text)}</div></div>`).join(''); } 
    else { chatHtml = '<p class="text-center text-xs text-gray-400 my-4">لا توجد رسائل بعد. انتظر رد العيادة.</p>'; }
    
    const existingInput = document.getElementById('chatInput');
    if (!existingInput) {
        contentEl.innerHTML = `<div class="bg-white p-4 rounded-xl border" style="border-color: var(--border)"><div class="flex justify-between items-center mb-2"><div><div class="font-bold text-sm">${escapeHtml(b.itemname)}</div><div class="text-xs text-gray-500">${escapeHtml(b.daystr)}</div></div><div id="statusBadgeContainer">${statusBadge}</div></div><div class="text-xs text-yellow-600 font-bold mt-2">رقم المرجع: #${escapeHtml(b.ref)}</div></div><div class="bg-white p-4 rounded-xl border flex flex-col h-96" style="border-color: var(--border)"><div class="flex-1 overflow-y-auto flex flex-col gap-2 mb-3 pr-1" id="chatBox">${chatHtml}</div><div class="flex gap-2 border-t pt-3" style="border-color: var(--border)"><input type="text" id="chatInput" class="ctrl-input text-sm" placeholder="اكتب رسالتك للطبيب..." onkeydown="if(event.key==='Enter') sendChatMessage('${bookingId}')"><button onclick="sendChatMessage('${bookingId}')" class="px-4 rounded-xl text-white" style="background: var(--accent)"><i class="fas fa-paper-plane"></i></button></div></div>`;
    } else {
        const chatBox = document.getElementById('chatBox');
        const statusContainer = document.getElementById('statusBadgeContainer');
        if (chatBox) chatBox.innerHTML = chatHtml;
        if (statusContainer) statusContainer.innerHTML = statusBadge;
    }

    const chatBox = document.getElementById('chatBox'); if (chatBox) chatBox.scrollTop = chatBox.scrollHeight;
}

window.sendChatMessage = async (bookingId) => {
    const input = document.getElementById('chatInput'); 
    const text = input.value.trim(); 
    if (!text) return; 
    input.value = '';
    
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return;

    try {
        // استدعاء دالة SQL الآمنة لإضافة الرسالة
        const { error } = await supabase.rpc('append_chat_message', {
            p_booking_id: bookingId,
            p_sender: 'patient',
            p_text: text
        });
        
        if (error) throw error;
        
        // === إشعار للطبيب بوجود رسالة جديدة ===
        const doctorData = allData.find(d => d.id === booking.itemid);
        if (doctorData && doctorData.user_id) {
            sendPushNotification(doctorData.user_id, "رسالة جديدة 💬", `لديك رسالة جديدة من المريض ${booking.name}`);
        }
    } catch (err) {
        showToast('خطأ في الإرسال', 'error');
    }   
};

window.openPharmacyLogin = async () => { 
    const { data: { session } } = await supabase.auth.getSession();
    if (session && session.user.email && session.user.email.endsWith('@lomedx.app')) {
        const userId = session.user.id;
        const listing = allData.find(d => d.user_id === userId && d.type === 'pharmacy');
        if (listing) {
            if (listing.is_subscribed) {
                renderPharmacyDashboard(listing); 
            } else {
                openPaymentModal('صيدلية', listing.name);
            }
            return; 
        }
    }
    
    openCtrlPanel('لوحة الصيدليات', `<div class="max-w-sm mx-auto py-8"><div class="text-center mb-6"><div class="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-3" style="background: var(--accent-light)"><i class="fas fa-prescription-bottle-medical text-2xl" style="color: var(--accent)"></i></div><h3 class="font-bold text-lg">دخول الصيدليات</h3></div><form onsubmit="handlePharmacyLogin(event)" class="flex flex-col gap-4"><input type="text" id="pharmName" class="ctrl-input text-center" placeholder="اسم الصيدلية" required><input type="text" id="pharmPass" class="ctrl-input text-center font-mono" placeholder="كلمة المرور" required><button type="submit" class="w-full py-3 rounded-xl text-white font-bold text-sm" style="background: var(--accent)">دخول</button></form></div>`, '#0E7C5F'); 
}
window.handlePharmacyLogin = async (e) => { 
    e.preventDefault(); 
    const name = document.getElementById('pharmName').value.trim(); 
    const passInput = document.getElementById('pharmPass').value.trim();
    const pass = passInput;
    
    const dummyEmail = `pharm_${pass.toLowerCase()}@lomedx.app`;

    const { data, error } = await supabase.auth.signInWithPassword({ email: dummyEmail, password: pass });
    if (error) { showToast('بيانات الدخول غير صحيحة. يرجى المحاولة مرة أخرى.'); return; }

    const pharmData = allData.find(d => d.user_id === data.user.id && d.type === 'pharmacy'); 
    if (pharmData) { 
        if (!pharmData.is_subscribed) {
            await supabase.auth.signOut();
            showToast('انتهت فترة الاشتراك. يرجى التجديد لمتابعة استخدام اللوحة.');
            openPaymentModal('صيدلية', pharmData.name);
            return;
        }
        // === إضافة وسيط "صيدلية" لحساب OneSignal ===
        if (window.OneSignalDeferred) {
            OneSignalDeferred.push(function(OneSignal) {
                OneSignal.login(data.user.id);
                OneSignal.User.addTag("role", "pharmacy");
            });
        }
        renderPharmacyDashboard(pharmData); 
    } else {
        await supabase.auth.signOut();
        showToast('اسم الصيدلية غير مطابق للحساب'); 
    } 
}
        
window.logoutPharmacy = async () => {
    await supabase.auth.signOut();
    closeCtrlPanel();
    showToast('تم تسجيل الخروج بنجاح');
}
window.renderPharmacyDashboard = async (pharm) => { 
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        openPharmacyLogin();
        showToast('يجب تسجيل الدخول أولاً');
        return;
    }
    // === التعديل: العداد يبحث عن كل الأدوية التي وفرتها الصيدلية مسبقاً بغض النظر عن حالتها الحالية ===
const { count: providedCount } = await supabase
        .from('medicine_requests')
        .select('*', { count: 'exact', head: true })
        .eq('available_pharmacy', pharm.name);
    
    const providedMeds = providedCount || 0;
    
    openCtrlPanel(`لوحة تحكم: ${pharm.name}`, `<div class="flex flex-col gap-5"><div class="bg-white p-5 rounded-xl border flex items-center justify-between flex-col sm:flex-row gap-4" style="border-color: var(--border)"><div class="flex items-center gap-4"><img src="${escapeHtml(pharm.image)}" class="w-20 h-20 rounded-2xl object-cover"><div><h3 class="font-bold text-lg">${escapeHtml(pharm.name)}</h3><p class="text-sm" style="color: var(--pharmacy)">صيدلية</p></div></div><div class="bg-white p-3 rounded-xl border flex items-center justify-between gap-2 mb-3" style="border-color: var(--border);"><span class="text-sm font-bold text-gray-700">حالة العمل:</span><div class="flex gap-1 bg-gray-50 p-1 rounded-lg"><button onclick="setStatus('${pharm.id}', true)" class="px-4 py-1.5 rounded-md text-xs font-bold transition-all ${pharm.isopen === true ? 'bg-green-500 text-white shadow' : 'text-gray-500 hover:bg-gray-100'}">مفتوح</button><button onclick="setStatus('${pharm.id}', false)" class="px-4 py-1.5 rounded-md text-xs font-bold transition-all ${pharm.isopen === false ? 'bg-red-500 text-white shadow' : 'text-gray-500 hover:bg-gray-100'}">مغلق</button><button onclick="setStatus('${pharm.id}', null)" class="px-4 py-1.5 rounded-md text-xs font-bold transition-all ${pharm.isopen == null ? 'bg-gray-700 text-white shadow' : 'text-gray-500 hover:bg-gray-100'}">لا شيء</button></div></div><button onclick="toggleNightShift('${pharm.id}', ${!pharm.night})" class="w-full px-4 py-2 rounded-xl font-bold text-sm ${pharm.night ? 'bg-yellow-500 text-white' : 'bg-gray-200'}">${pharm.night ? 'إيقاف المناوبة الليلية' : 'تفعيل المناوبة الليلية'}</button></div> <div class="grid grid-cols-3 gap-3"><div class="bg-white p-4 rounded-xl border text-center" style="border-color: var(--border);"><i class="fas fa-eye text-blue-500 text-xl mb-1"></i><div class="text-2xl font-black text-gray-800">${pharm.view_count || 0}</div><div class="text-xs text-gray-500">زيارة الملف</div></div><div class="bg-white p-4 rounded-xl border text-center" style="border-color: var(--border);"><i class="fas fa-hand-holding-medical text-green-500 text-xl mb-1"></i><div class="text-2xl font-black text-gray-800">${providedMeds}</div><div class="text-xs text-gray-500">أدوية موفرة</div></div><div class="bg-white p-4 rounded-xl border text-center" style="border-color: var(--border);"><i class="fas fa-phone-alt text-purple-500 text-xl mb-1"></i><div class="text-2xl font-black text-gray-800">${pharm.phone_clicks || 0}</div><div class="text-xs text-gray-500">نقرات الهاتف</div></div></div> <div class="bg-white p-5 rounded-xl border" style="border-color: var(--border)"><h4 class="font-bold mb-4 text-sm">طلبات الأدوية الواردة</h4><div id="requestsContainer" class="flex flex-col gap-3"><p class="text-center py-10" style="color: var(--muted)">جاري تحميل الطلبات...</p></div></div> <button onclick="logoutPharmacy()" class="w-full py-3 rounded-xl border font-bold text-sm mt-3" style="border-color: #EF4444; color: #EF4444;"><i class="fas fa-sign-out-alt ml-2"></i> تسجيل الخروج</button></div>`, '#0E7C5F', true); 
    
        // إيقاف أي تحديث سابق
    if (unsubscribeMedRequests) { supabase.removeChannel(unsubscribeMedRequests); }
    if (unsubscribeMedRequestsInterval) { clearInterval(unsubscribeMedRequestsInterval); }
    
    // جلب البيانات لأول مرة
    fetchMedRequests(pharm.name);
    
    // الاشتراك في التحديثات اللحظية (Realtime) - تتحدث فور إضافة أو تعديل طلب
    unsubscribeMedRequests = supabase
      .channel('medicine_requests_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'medicine_requests' }, payload => {
          fetchMedRequests(pharm.name);
      })
      .subscribe();

    // مؤقت هادئ كل دقيقة فقط، للتحقق من الطلبات التي انتهت مدتها (30 دقيقة) لإخفائها
    unsubscribeMedRequestsInterval = setInterval(() => fetchMedRequests(pharm.name), 60000);
}

async function fetchMedRequests(pharmName) {
    const container = document.getElementById('requestsContainer'); 
    if (!container) return; 
    
    const activeElement = document.activeElement;
    if (activeElement && activeElement.id && activeElement.id.startsWith('medNotes_')) {
        return; 
    }
    
    container.innerHTML = '<p class="text-center py-10" style="color: var(--muted)">جاري تحديث الطلبات...</p>';
    
    // استخدام الدالة الآمنة RPC
    const { data: snapshot, error } = await supabase.rpc('get_active_med_requests');
        
    if (error || !snapshot) { container.innerHTML = '<p class="text-center py-10 text-red-500">حدث خطأ أو لا تملك صلاحية.</p>'; return; }
    if (snapshot.length === 0) { container.innerHTML = '<p class="text-center py-10" style="color: var(--muted)">لا توجد طلبات أدوية حالياً.</p>'; return; } 
    
    let html = ''; 
    snapshot.forEach(req => { 
        const date = new Date(req.created_at).toLocaleString('ar-EG', { date: 'short', time: 'short' }); 
        const phone = req.patient_phone; 
        
        let requestStatus = ''; 
        if (req.status === 'available') requestStatus = `<span class="text-xs px-2 py-1 rounded bg-green-100 text-green-700 inline-block mb-2">تم التوفير</span>`; 
        else if (req.status === 'unavailable') requestStatus = `<span class="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700 inline-block mb-2">غير متوفر</span>`; 
        else requestStatus = `<span class="text-xs px-2 py-1 rounded bg-yellow-100 text-yellow-700 inline-block mb-2">قيد البحث</span>`;

        let interactionArea = '';
        if (req.status === 'available') {
            if (req.available_pharmacy === pharmName) {
                interactionArea = `<div class="bg-green-50 text-green-700 text-sm font-bold p-3 rounded-lg text-center mb-2">أنت من وفر هذا الدواء للمريض</div><a href="tel:${escapeHtml(phone)}" class="flex-1 bg-blue-500 text-white px-3 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2"><i class="fas fa-phone"></i> اتصال للمريض</a><button onclick="updateMedStatus('${req.id}', 'searching')" class="w-full mt-2 bg-gray-200 text-gray-600 px-3 py-2 rounded-lg text-xs">تراجع عن التوفير</button>`;
            } else {
                interactionArea = `<div class="bg-gray-100 text-gray-500 text-sm font-bold p-3 rounded-lg text-center">تم إغلاق هذا الطلب (تم التوفير من صيدلية أخرى)</div>`;
            }
        } else if (req.status === 'unavailable') {
            interactionArea = `<div class="bg-gray-100 text-gray-400 text-sm font-bold p-3 rounded-lg text-center">قمت بإغلاق هذا الطلب</div><button onclick="updateMedStatus('${req.id}', 'searching')" class="w-full mt-2 bg-gray-200 text-gray-600 px-3 py-2 rounded-lg text-xs">إعادة فتح الطلب</button>`;
        } else {
            interactionArea = `<input type="text" id="medNotes_${req.id}" placeholder="ملاحظة للمواطن" value="${escapeHtml(req.notes || '')}" onblur="updateMedNotes('${req.id}', this.value)" class="ctrl-input text-sm py-1"><div class="flex gap-2 mt-2"><button onclick="setMedAvailable('${req.id}', '${escapeHtml(pharmName)}', '${escapeHtml(req.patient_push_id || '')}')" class="flex-1 bg-green-500 text-white px-3 py-2 rounded-lg text-sm font-semibold">توفّر الدواء</button><button onclick="updateMedStatus('${req.id}', 'unavailable')" class="flex-1 bg-gray-500 text-white px-3 py-2 rounded-lg text-sm font-semibold">غير متوفر</button></div><div class="flex gap-2 mt-2"><a href="tel:${escapeHtml(phone)}" class="flex-1 bg-blue-500 text-white px-3 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2"><i class="fas fa-phone"></i> اتصال</a></div>`;
        }

        html += `<div class="bg-white border rounded-xl p-4 flex flex-col gap-3" style="border-color: var(--border)"><div class="flex flex-col sm:flex-row gap-3 items-center">${req.image_url ? `<img src="${escapeHtml(req.image_url)}" class="w-full sm:w-24 h-24 object-cover rounded-lg cursor-zoom-in" onclick="openLightbox('${escapeHtml(req.image_url)}')">` : ''}<div class="flex-1 text-center sm:text-right"><h4 class="font-bold">${escapeHtml(req.patient_name)} <span class="text-xs text-yellow-600 font-mono">#${escapeHtml(req.med_ref || '')}</span></h4><p class="text-sm text-gray-700 font-semibold">${escapeHtml(req.med_list || '')}</p><p class="text-xs mt-1 text-red-500">الإلحاح: ${escapeHtml(req.urgency || 'عادي')}</p><p class="text-xs" style="color: var(--muted)"><i class="fas fa-clock"></i> ${escapeHtml(date)}</p>${requestStatus}</div></div><div class="flex flex-col gap-2 mt-2 border-t pt-3" style="border-color: var(--border)">${interactionArea}</div></div>`; 
    }); 
    container.innerHTML = html; 
}

window.toggleNightShift = async (id, currentStatus) => { try { await supabase.from('listings').update({ night: currentStatus }).eq('id', id); showToast(currentStatus ? 'تم تفعيل المناوبة!' : 'تم إيقاف المناوبة.'); localStorage.setItem('force_listings_update', 'true'); } catch (e) { showToast('خطأ في التحديث'); } }
// دالة تحديث الحالة (متوففر/غير متوفر/قيد البحث)
window.updateMedStatus = async (id, status) => { 
    try { 
        await supabase.rpc('update_med_request_status', {
            p_req_id: id,
            p_status: status
        });
        showToast('تم تحديث حالة الدواء'); 
    } catch (e) { showToast('خطأ في التحديث', 'error'); } 
}

// دالة تحديث الملاحظات
window.updateMedNotes = async (id, notes) => { 
    try { 
        await supabase.rpc('update_med_request_status', {
            p_req_id: id,
            p_status: 'searching', // نبقي الحالة كما هي
            p_notes: notes
        });
        showToast('تم حفظ الملاحظة'); 
    } catch (e) { showToast('خطأ في الحفظ', 'error'); } 
}

// دالة توفير الدواء
window.setMedAvailable = async (id, pharmName, patientPushId) => { 
    try { 
        const noteInput = document.getElementById(`medNotes_${id}`);
        const customNote = noteInput ? noteInput.value.trim() : '';
        
        let finalNotes = `الدواء متوفر لدى ${pharmName}. يرجى الحضور لاستلامه.`;
        if (customNote) {
            finalNotes += `\nملاحظة من الصيدلية: ${customNote}`;
        }

        await supabase.rpc('update_med_request_status', { 
            p_req_id: id, 
            p_status: 'available', 
            p_notes: finalNotes, 
            p_pharmacy_name: pharmName 
        }); 
        
        if (patientPushId) {
            let pushMessage = `تم توفير الدواء في  ${pharmName}. يرجى الحضور لاستلامه.`;
            if (customNote) pushMessage += ` (ملاحظة: ${customNote})`;
            sendPushNotification(null, "تم توفير دوائك ✅", pushMessage, 'player', patientPushId);
        }

        showToast('تم إعلام المريض بتوفر الدواء'); 
    } catch (e) { 
        showToast('خطأ في التحديث', 'error'); 
    } 
}
window.openDoctorLogin = async () => { 
    const { data: { session } } = await supabase.auth.getSession();
    if (session && session.user.email && session.user.email.endsWith('@lomedx.app')) {
        const userId = session.user.id;
        const listing = allData.find(d => d.user_id === userId && d.type === 'doctor');
        if (listing) {
            if (listing.is_subscribed) {
                renderDoctorDashboard(listing); 
            } else {
                openPaymentModal('طبيب', listing.name);
            }
            return; 
        }
    }
    
    openCtrlPanel('لوحة الطبيب', `<div class="max-w-sm mx-auto py-8"><div class="text-center mb-6"><div class="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-3" style="background: #DBEAFE"><i class="fas fa-user-md text-2xl" style="color: var(--doctor)"></i></div><h3 class="font-bold text-lg">دخول الطبيب</h3></div><form onsubmit="handleDoctorLogin(event)" class="flex flex-col gap-4"><input type="text" id="docName" class="ctrl-input text-center" placeholder="الاسم" required><input type="text" id="docPass" class="ctrl-input text-center font-mono" placeholder="كلمة المرور" required><button type="submit" class="w-full py-3 rounded-xl text-white font-bold text-sm" style="background: var(--doctor)">دخول</button></form></div>`, '#2563EB'); 
}
window.handleDoctorLogin = async (e) => { 
    e.preventDefault(); 
    const name = document.getElementById('docName').value.trim(); 
    const passInput = document.getElementById('docPass').value.trim();
    const pass = passInput;
    const dummyEmail = `doc_${pass.toLowerCase()}@lomedx.app`;
    
    const { data, error } = await supabase.auth.signInWithPassword({ email: dummyEmail, password: pass });
    if (error) { showToast('بيانات الدخول غير صحيحة. يرجى المحاولة مرة أخرى.'); return; }

    const docData = allData.find(d => d.user_id === data.user.id && d.type === 'doctor'); 
    if (docData) { 
        if (!docData.is_subscribed) {
            await supabase.auth.signOut();
            showToast('انتهت فترة الاشتراك. يرجى التجديد لمتابعة استخدام اللوحة.');
            openPaymentModal('طبيب', docData.name); 
            return;
        }
                if (window.OneSignalDeferred) {
            OneSignalDeferred.push(function(OneSignal) {
                OneSignal.login(data.user.id);
            });
        }
        renderDoctorDashboard(docData); 
    } else {
        await supabase.auth.signOut();
        showToast('اسم الطبيب غير مطابق للحساب'); 
    } 
}
window.renderDoctorDashboard = async (doc) => { 
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        openDoctorLogin();
        showToast('يجب تسجيل الدخول أولاً');
        return;
    }
    
    // === العداد التراكمي الذي لا يتنقص عند الحذف ===
    const totalBookings = doc.total_bookings_count || 0;

    const daysCheckboxes = daysOfWeek.map(day => `<label class="flex items-center gap-2 bg-gray-50 p-2 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"><input type="checkbox" name="docWorkingDays" value="${day}" class="w-4 h-4 accent-blue-600" ${doc.workingdays?.includes(day) ? 'checked' : ''}><span class="text-xs font-semibold">${day}</span></label>`).join(''); 
    
    openCtrlPanel(`لوحة: ${doc.name}`, `
    <div class="flex flex-col gap-5">
        <!-- 1. بطاقة الملف الشخصي وحالة العمل -->
        <div class="bg-white p-5 rounded-2xl border shadow-sm flex flex-col sm:flex-row items-center gap-4" style="border-color: var(--border)">
            <img src="${escapeHtml(doc.image)}" class="w-24 h-24 rounded-2xl object-cover border-4 border-blue-50 shadow-sm">
            <div class="flex-1 text-center sm:text-right w-full">
                <h3 class="font-bold text-xl">${escapeHtml(doc.name)}</h3>
                <p class="text-sm mb-3" style="color: var(--doctor)">${escapeHtml(doc.specialty)}</p>
                <div class="flex justify-center sm:justify-start items-center gap-2">
                    <span class="text-xs font-bold text-gray-600">حالة العيادة:</span>
                    <div class="flex gap-1 bg-gray-100 p-1 rounded-lg">
                        <button onclick="setStatus('${doc.id}', true)" class="px-4 py-1.5 rounded-md text-xs font-bold transition-all ${doc.isopen === true ? 'bg-green-500 text-white shadow' : 'text-gray-500 hover:bg-gray-50'}">مفتوح</button>
                        <button onclick="setStatus('${doc.id}', false)" class="px-4 py-1.5 rounded-md text-xs font-bold transition-all ${doc.isopen === false ? 'bg-red-500 text-white shadow' : 'text-gray-500 hover:bg-gray-50'}">مغلق</button>
                        <button onclick="setStatus('${doc.id}', null)" class="px-4 py-1.5 rounded-md text-xs font-bold transition-all ${doc.isopen == null ? 'bg-gray-700 text-white shadow' : 'text-gray-500 hover:bg-gray-50'}">لا شيء</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- 2. الإحصائيات -->
        <div class="grid grid-cols-3 gap-3">
            <div class="bg-white p-4 rounded-xl border text-center shadow-sm" style="border-color: var(--border);">
                <i class="fas fa-eye text-blue-500 text-xl mb-1"></i><div class="text-2xl font-black text-gray-800">${doc.view_count || 0}</div><div class="text-[10px] text-gray-500">زيارة الملف</div>
            </div>
            <div class="bg-white p-4 rounded-xl border text-center shadow-sm" style="border-color: var(--border);">
                <i class="fas fa-calendar-check text-green-500 text-xl mb-1"></i><div class="text-2xl font-black text-gray-800">${totalBookings || 0}</div><div class="text-[10px] text-gray-500">إجمالي الحجوزات</div>
            </div>
            <div class="bg-white p-4 rounded-xl border text-center shadow-sm" style="border-color: var(--border);">
                <i class="fas fa-phone-alt text-purple-500 text-xl mb-1"></i><div class="text-2xl font-black text-gray-800">${doc.phone_clicks || 0}</div><div class="text-[10px] text-gray-500">نقرات الهاتف</div>
            </div>
        </div>

        <!-- 3. أدوات سريعة -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button onclick="openDoctorScanner('${doc.id}')" class="w-full py-3 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm hover:shadow-md transition-all" style="background: #0D9488">
                <i class="fas fa-qrcode"></i> قراءة ملف المريض (QR)
            </button>
            <button onclick="openAskDoctor('${doc.name}')" class="w-full py-3 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm hover:shadow-md transition-all" style="background: #2563EB;">
                <i class="fas fa-comments"></i> قسم اسأل طبيب
            </button>
        </div>

        <!-- 4. إعدادات الحجز وأيام العمل (تم تنسيقها بالكامل) -->
        <div class="bg-white p-5 rounded-2xl border shadow-sm" style="border-color: var(--border)">
            <h4 class="font-bold mb-4 text-sm flex items-center gap-2"><i class="fas fa-calendar-week" style="color: var(--doctor)"></i> أيام العمل ونظام الحجز</h4>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">${daysCheckboxes}</div>
            
            <!-- اختيار النظام النشط -->
            <div class="p-4 rounded-xl border mb-4" style="border-color: var(--border); background: #F9FAFB;">
                <h4 class="text-sm font-bold mb-3 text-gray-700">نظام الحجز النشط حالياً</h4>
                <div class="flex gap-2">
                    <button onclick="setActiveSystem('${doc.id}', 'manual')" class="flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${doc.active_system === 'manual' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}" ${doc.allowed_systems?.includes('manual') ? '' : 'disabled style="opacity:0.5; cursor:not-allowed;"'}>النظام اليدوي</button>
                    <button onclick="setActiveSystem('${doc.id}', 'slots')" class="flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${doc.active_system === 'slots' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}" ${doc.allowed_systems?.includes('slots') ? '' : 'disabled style="opacity:0.5; cursor:not-allowed;"'}>المواعيد الدقيقة</button>
                </div>
                
                ${doc.active_system === 'slots' ? `
                <div class="mt-4 border-t pt-3" style="border-color: var(--border);">
                    <p class="text-xs text-gray-500 mb-2 font-semibold">أوقات دوامك (للفترات الدقيقة):</p>
                    <div class="grid grid-cols-2 gap-3 mb-3">
                        <div class="bg-white p-2 rounded-lg border border-gray-200"><label class="block text-[10px] font-semibold mb-1 text-gray-500">بداية الدوام</label><input type="time" id="docStartTime" value="${doc.working_hours?.start || '16:00'}" class="ctrl-input text-sm border-0 p-0"></div>
                        <div class="bg-white p-2 rounded-lg border border-gray-200"><label class="block text-[10px] font-semibold mb-1 text-gray-500">نهاية الدوام</label><input type="time" id="docEndTime" value="${doc.working_hours?.end || '20:00'}" class="ctrl-input text-sm border-0 p-0"></div>
                    </div>
                    <button onclick="saveWorkingHours('${doc.id}')" class="w-full py-2 rounded-xl text-white font-semibold text-xs bg-blue-500 hover:bg-blue-600 transition-colors"><i class="fas fa-save ml-2"></i> حفظ أوقات العمل</button>
                </div>
                ` : '<p class="text-xs text-gray-400 mt-3 text-center bg-white p-2 rounded-lg border border-dashed border-gray-200">المريض سيطلب الموعد وستقوم أنت بكتابة الوقت يدوياً عند القبول.</p>'}
            </div>

            <button onclick="saveDoctorSettings('${doc.id}')" class="w-full py-2.5 rounded-xl text-white font-semibold text-sm bg-blue-600 hover:bg-blue-700 transition-colors">
                <i class="fas fa-save ml-2"></i> حفظ أيام العمل
            </button>
        </div>

        <!-- 5. طلبات الحجز الواردة -->
        <div class="bg-white p-5 rounded-2xl border shadow-sm" style="border-color: var(--border)">
            <h4 class="font-bold mb-4 text-sm flex items-center gap-2"><i class="fas fa-calendar-check" style="color: var(--doctor)"></i> طلبات الحجز الواردة</h4>
            <div id="docBookingsContainer" class="flex flex-col gap-3">
                <p class="text-sm text-center py-4 text-gray-400">جاري تحميل الحجوزات...</p>
            </div>
        </div>
        
        <!-- 6. تسجيل الخروج -->
        <button onclick="logoutHealthFile()" class="w-full py-3 rounded-xl border font-bold text-sm mt-2 hover:bg-red-50 transition-colors" style="border-color: #EF4444; color: #EF4444;">
            <i class="fas fa-sign-out-alt ml-2"></i> تسجيل الخروج
        </button>
    </div>`, '#2563EB', true); 
    
    // إيقاف أي اشتراك سابق
    if (unsubscribeDocBookings) { supabase.removeChannel(unsubscribeDocBookings); }
    
    // جلب الحجوزات لأول مرة
    fetchDocBookings(doc.id);
    
    // === التحديث اللحظي (Realtime) ===
    unsubscribeDocBookings = supabase
      .channel('doctor_bookings_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings', filter: `itemid=eq.${doc.id}` }, payload => {
          fetchDocBookings(doc.id);
      })
      .subscribe();
}
async function fetchDocBookings(docId) {
    const container = document.getElementById('docBookingsContainer'); 
    if (!container) return; 
        // حماية الدردشة: إذا كان الطبيب يكتب حالياً، نؤجل التحديث
    const activeElement = document.activeElement;
    if (activeElement && activeElement.id && activeElement.id.startsWith('docChat_')) {
        return; 
    }
    // جلب الحجوزات النشطة (استثناء المؤرشفة)
    const { data: docBookings, error } = await supabase.from('bookings')
        .select('*').eq('itemid', docId).neq('status', 'archived').order('created_at', { ascending: false });
        
    if (error || !docBookings) { container.innerHTML = '<p class="text-sm text-center py-4 text-red-500">خطأ في تحميل الحجوزات.</p>'; return; }
    if (docBookings.length === 0) { container.innerHTML = '<p class="text-sm text-center py-4" style="color: var(--muted)">لا توجد طلبات حجز حالياً.</p>'; return; }
    
    const bookingsListHtml = docBookings.map(b => { 
        let statusBadge = ''; let actionButtons = ''; 
        if (b.status === 'accepted') { statusBadge = `<span class="text-xs px-2 py-1 rounded block mb-1" style="background: #D1FAE5; color: #065F46">مقبول - ${escapeHtml(b.time)}</span>`; actionButtons = `<button onclick="updateBookingStatus('${b.id}', 'canceled')" class="text-xs text-white px-2 py-1 rounded bg-red-500">إلغاء</button><button onclick="updateBookingStatus('${b.id}', 'deleted')" class="text-xs text-white px-2 py-1 rounded bg-gray-800">أرشفة</button>`; } 
        else if (b.status === 'canceled') { statusBadge = '<span class="text-xs px-2 py-1 rounded block mb-1" style="background: #F3F4F6; color: #4B5563">ملغي</span>'; actionButtons = `<button onclick="updateBookingStatus('${b.id}', 'pending')" class="text-xs text-white px-2 py-1 rounded bg-gray-500">استعادة</button><button onclick="updateBookingStatus('${b.id}', 'deleted')" class="text-xs text-white px-2 py-1 rounded bg-gray-800">أرشفة</button>`; } 
        else { statusBadge = '<span class="text-xs px-2 py-1 rounded block mb-1" style="background: #FEF3C7; color: #92400E">طلب جديد</span>'; actionButtons = `<div class="flex flex-col gap-1 w-full"><input type="text" id="time_${b.id}" placeholder="حدد الموعد" class="ctrl-input text-sm py-1"><div class="flex gap-1"><button onclick="acceptBooking('${b.id}')" class="text-xs text-white px-2 py-1 rounded bg-green-600 flex-1">قبول</button><button onclick="updateBookingStatus('${b.id}', 'canceled')" class="text-xs text-white px-2 py-1 rounded bg-red-500">رفض</button></div></div>`; }
        let chatHtml = '';
        if (b.chat && b.chat.length > 0) { chatHtml = b.chat.map(msg => `<div class="text-xs p-2 rounded-lg mb-1 ${msg.sender === 'doctor' ? 'bg-blue-100 text-left' : 'bg-gray-100 text-right'}">${escapeHtml(msg.text)}</div>`).join(''); }
        return `<div class="flex flex-col p-3 rounded-lg border mb-3" style="border-color: var(--border)"><div class="flex items-center justify-between mb-2"><div><span class="text-sm font-bold">${escapeHtml(b.name)}</span><br><span class="text-xs" style="color: var(--muted)">${escapeHtml(b.daystr)}</span></div><div>${statusBadge}<span class="text-[10px] text-gray-400">مرجع: #${escapeHtml(b.ref)}</span></div></div><div class="flex items-center justify-between border-t pt-2 mb-2" style="border-color: var(--border)"><a href="tel:${escapeHtml(b.phone)}" class="text-xs text-blue-600">${escapeHtml(b.phone)}</a><div class="flex gap-1">${actionButtons}</div></div><div class="border-t pt-2" style="border-color: var(--border)"><div class="text-xs font-bold text-gray-600 mb-1">المحادثة:</div><div class="max-h-32 overflow-y-auto mb-2 bg-gray-50 p-2 rounded-lg">${chatHtml || '<span class="text-xs text-gray-400">لا توجد رسائل</span>'}</div><div class="flex gap-1"><input type="text" id="docChat_${b.id}" placeholder="اكتب ردك..." class="ctrl-input text-sm py-1 flex-1"><button onclick="sendDocMessage('${b.id}')" class="text-xs text-white px-3 py-1 rounded bg-blue-500"><i class="fas fa-paper-plane"></i></button></div></div></div>`; 
    }).join('');
    
    container.innerHTML = bookingsListHtml;
}
window.acceptBooking = async (bookingId) => { 
    const timeInput = document.getElementById(`time_${bookingId}`); const time = timeInput.value.trim(); 
    if (!time) { showToast('أدخل وقت الموعد'); return; } 
    const booking = bookings.find(b => b.id === bookingId); if (!booking) return; 
    
    try { 
    
        const { error: updateError } = await supabase.from('bookings').update({ status: 'accepted', time: time }).eq('id', bookingId); 
        if (updateError) throw updateError;
        await supabase.rpc('append_chat_message', {
            p_booking_id: bookingId,
            p_sender: 'doctor',
            p_text: `تم تثبيت موعدك اليوم الساعة ${time}. نرحب بك في العيادة.`
        });
        
        // 3. إشعار للمريض بقبول موعده
        if (booking.patient_push_id) {
            sendPushNotification(null, "تم تأكيد موعدك ✅", `تم تأكيد موعدك مع ${booking.itemname} الساعة ${time}`, 'player', booking.patient_push_id);
        }

        showToast('تم قبول الموعد', 'success'); 
    } catch (e) { 
        showToast('حدث خطأ', 'error'); 
    } 
};
window.updateBookingStatus = async (bookingId, newStatus) => { 
    try { 
    
        if (newStatus === 'deleted') { 
            await supabase.from('bookings').delete().eq('id', bookingId); 
            showToast('تم حذف الطلب نهائياً', 'success'); 
            return; 
        } 
        await supabase.from('bookings').update({ status: newStatus }).eq('id', bookingId); 
        showToast('تم التحديث', 'success'); 
    } catch (e) { showToast('حدث خطأ', 'error'); } 
}
window.saveDoctorSettings = async (id) => { 
    const workingDays = Array.from(document.querySelectorAll('input[name="docWorkingDays"]:checked')).map(cb => cb.value); 
    try { await supabase.from('listings').update({ workingdays: workingDays }).eq('id', id); showToast('تم الحفظ!', 'success'); localStorage.setItem('force_listings_update', 'true'); } catch (e) { showToast('خطأ', 'error'); } 
}
// الطبيب يختار النظام النشط
window.setActiveSystem = async (id, system) => {
    try {
        await supabase.from('listings').update({ active_system: system }).eq('id', id);
        showToast('تم تفعيل النظام المختار', 'success');
        localStorage.setItem('force_listings_update', 'true');
        // إعادة تحميل اللوحة لتظهر الإعدادات الجديدة
        const { data: updatedDoc } = await supabase.from('listings').select('*').eq('id', id).single();
        if (updatedDoc) renderDoctorDashboard(updatedDoc);
    } catch (e) { showToast('خطأ في التحديث', 'error'); }
}

// الطبيب يحفظ أوقات العمل
window.saveWorkingHours = async (id) => {
    const start = document.getElementById('docStartTime').value;
    const end = document.getElementById('docEndTime').value;
    if (!start || !end) { showToast('يرجى إدخال وقت البداية والنهاية'); return; }
    try {
        await supabase.from('listings').update({ working_hours: { start, end } }).eq('id', id);
        showToast('تم حفظ أوقات العمل بنجاح!', 'success');
        localStorage.setItem('force_listings_update', 'true');
    } catch (e) { showToast('خطأ في الحفظ', 'error'); }
}
window.sendDocMessage = async (bookingId) => {
    const input = document.getElementById(`docChat_${bookingId}`); 
    const text = input.value.trim(); 
    if (!text) return; 
    input.value = '';
    
    const booking = bookings.find(b => b.id === bookingId); 
    if (!booking) return;

    try { 
        // استدعاء دالة SQL الآمنة لإضافة الرسالة
        const { error } = await supabase.rpc('append_chat_message', {
            p_booking_id: bookingId,
            p_sender: 'doctor',
            p_text: text
        });
        
        if (error) throw error;
        
        // === إشعار للمريض بوجود رد من الطبيب ===
        if (booking.patient_push_id) {
            sendPushNotification(null, "رد من الطبيب 💬", `لديك رسالة جديدة من ${booking.itemname}: ${text.substring(0, 30)}`, 'player', booking.patient_push_id);
        }
    } catch (e) { 
        showToast('خطأ في الإرسال', 'error'); 
    }
};

window.openDoctorScanner = (docId) => {
    const docData = allData.find(d => d.id === docId) || {};
    openCtrlPanel('قارئ الملفات الصحية للمريض', `<div class="flex flex-col gap-4"><div class="bg-blue-50 border border-blue-200 rounded-xl p-4 text-blue-800 text-sm flex items-center gap-3"><i class="fas fa-camera text-xl"></i><span>وجه كاميرا الهاتف نحو رمز QR الخاص بالمريض.</span></div><div id="qr-reader" style="width:100%"></div></div>`, '#2563EB');
    const html5QrCode = new Html5Qrcode("qr-reader");
    html5QrCode.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => { html5QrCode.stop().then(() => { fetchPatientHealthFile(decodedText, docData); }).catch(() => {}); },
        (errorMessage) => { }
    ).catch(err => { showToast("تعذر الوصول للكاميرا.", 'error'); });
}

window.fetchPatientHealthFile = async (userId, doctorData) => {
    try {
        const { data: p, error } = await supabase
  .rpc('get_patient_file_by_qr', { qr_token_param: userId })
  .maybeSingle();
        
        // فك تشفير البيانات للطبيب باستخدام رمز QR
        const decryptedP = decryptHealthFile(p, userId);
        
        if (error || !decryptedP) { showToast("لم يتم العثور على ملف بهذا الرمز.", 'error'); return; }
        closeCtrlPanel();
        
        let specializedRecordHtml = '';
        if (doctorData && doctorData.specialty) {
            if (doctorData.specialty.includes('أسنان')) {
                specializedRecordHtml = `<div class="p-3 rounded-xl border" style="border-color: #FED7AA; background: #FFF7ED;"><div class="text-xs text-orange-700 mb-1 font-bold"><i class="fas fa-tooth"></i> سجل الأسنان</div><div class="font-semibold text-sm text-gray-700 whitespace-pre-line">${escapeHtml(decryptedP.dental || 'لا يوجد.')}</div></div>`;
            } else if (doctorData.specialty.includes('عين') || doctorData.specialty.includes('عيون')) {
                specializedRecordHtml = `<div class="p-3 rounded-xl border" style="border-color: #BFDBFE; background: #EFF6FF;"><div class="text-xs text-blue-700 mb-1 font-bold"><i class="fas fa-eye"></i> سجل العيون</div><div class="font-semibold text-sm text-gray-700 whitespace-pre-line">${escapeHtml(decryptedP.eye || 'لا يوجد.')}</div></div>`;
            }
        }

        const docInfo = {
            name: doctorData?.name || 'طبيب',
            specialty: doctorData?.specialty || 'طبيب عام',
            id: doctorData?.id || 'unknown'
        };

        const prescriptionBtn = doctorData?.is_subscribed 
    ? `<button onclick='openPrescriptionModal("${escapeHtml(userId)}", "${escapeHtml(decryptedP.full_name)}", ${JSON.stringify(docInfo).replace(/'/g, "&#39;")})' class="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg"><i class="fas fa-file-prescription"></i> إنشاء روشتة</button>` 
            : `<button onclick="openPaymentModal('طبيب', '${doctorData?.name || 'طبيب'}')" class="text-xs bg-gray-300 text-gray-600 px-3 py-1.5 rounded-lg line-through cursor-not-allowed"><i class="fas fa-lock"></i> إنشاء روشتة</button>`;

        document.getElementById('modalContent').innerHTML = `<div class="p-6"><div class="flex justify-between items-center mb-6"><h3 class="font-bold text-lg"><i class="fas fa-file-medical ml-2" style="color: var(--doctor)"></i> الملف الصحي للمريض</h3><button onclick="closeModal()" class="text-2xl">&times;</button>${prescriptionBtn}</div><div class="flex flex-col gap-3"><div class="flex items-center gap-4 p-3 rounded-xl" style="background: #DBEAFE"><i class="fas fa-user-circle text-3xl" style="color: var(--doctor)"></i><div><h4 class="font-bold text-lg">${escapeHtml(decryptedP.full_name)}</h4><p class="text-sm text-gray-600">${escapeHtml(decryptedP.age || '-')} سنة | ${escapeHtml(decryptedP.gender || '-')}</p></div></div><div class="grid grid-cols-2 gap-3 text-sm"><div class="p-3 rounded-xl border"><div class="text-xs text-gray-500">فصيلة الدم</div><div class="font-bold text-red-600">${escapeHtml(decryptedP.blood_type || 'غير محدد')}</div></div><div class="p-3 rounded-xl border"><div class="text-xs text-gray-500">الوزن</div><div class="font-bold">${escapeHtml(decryptedP.weight || '-')} كغ</div></div></div><div class="p-3 rounded-xl border"><div class="text-xs text-gray-500 mb-1">الأمراض المزمنة</div><div class="font-semibold">${escapeHtml(decryptedP.diseases || 'لا يوجد')}</div></div><div class="p-3 rounded-xl border"><div class="text-xs text-gray-500 mb-1">الحساسية</div><div class="font-semibold text-red-600">${escapeHtml(decryptedP.allergies || 'لا يوجد')}</div></div><div class="p-3 rounded-xl border"><div class="text-xs text-gray-500 mb-1">الأدوية الحالية</div><div class="font-semibold">${escapeHtml(decryptedP.medications || 'لا يوجد')}</div></div>${specializedRecordHtml}<div class="p-3 rounded-xl bg-green-50 border border-green-200"><div class="text-xs text-green-700 mb-1">جهة طوارئ</div><div class="font-semibold">${escapeHtml(decryptedP.emergency_name || '')} - <span dir="ltr">${escapeHtml(decryptedP.emergency_phone || '')}</span></div></div></div></div>`;
        document.getElementById('modalOverlay').classList.add('active');
        lockScroll();
    } catch (e) { showToast("خطأ في قراءة الملف.", 'error'); }
}

window.openPrescriptionModal = (patientId, patientName, doctorInfo) => {
    window.currentDoctorInfo = doctorInfo; 
    closeModal(); 
    document.getElementById('modalContent').innerHTML = `
        <div class="p-6">
            <div class="flex justify-between items-center mb-6">
                <h3 class="font-bold text-lg"><i class="fas fa-file-prescription ml-2" style="color: var(--doctor)"></i> إنشاء روشتة طبية</h3>
                <button onclick="closeModal()" class="text-2xl hover:text-gray-400 leading-none">&times;</button>
            </div>
            <div class="bg-blue-50 p-3 rounded-xl mb-4 text-sm text-blue-800 flex items-center gap-2">
                <i class="fas fa-user"></i> المريض: <b>${escapeHtml(patientName)}</b>
            </div>
            <form onsubmit="generatePrescription(event, '${patientId}', '${patientName}')">
                <div id="medListContainer" class="flex flex-col gap-3 mb-4">
                    <div class="bg-gray-50 p-3 rounded-xl border" style="border-color: var(--border)">
                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <input type="text" required class="ctrl-input text-sm" placeholder="اسم الدواء" name="drugName[]">
                            <input type="text" required class="ctrl-input text-sm" placeholder="الجرعة (مثال: حبة)" name="dose[]">
                            <input type="text" required class="ctrl-input text-sm" placeholder="التكرار (مثال: 3 مرات يومياً)" name="freq[]">
                        </div>
                    </div>
                </div>
                <button type="button" onclick="addPrescriptionRow()" class="w-full py-2 mb-4 rounded-xl border-2 border-dashed text-sm font-semibold" style="border-color: var(--doctor); color: var(--doctor)">
                    <i class="fas fa-plus"></i> إضافة دواء آخر
                </button>
                <div class="mb-4">
                    <label class="block text-sm font-semibold mb-2">ملاحظات الطبيب / التعليمات</label>
                    <textarea class="ctrl-input text-sm" rows="2" placeholder="مثال: يؤخذ بعد الأكل، مراجعة بعد أسبوع..." name="rxNotes"></textarea>
                </div>
                <button type="submit" class="w-full py-3 rounded-xl text-white font-bold text-sm" style="background: var(--doctor)">
                    <i class="fas fa-save"></i> حفظ الروشتة في ملف المريض
                </button>
            </form>
        </div>`;
    document.getElementById('modalOverlay').classList.add('active');
    lockScroll();
}
window.generatePrescription = async (e, patientId, patientName) => {
    e.preventDefault();
    const form = e.target;
    const drugNames = form.elements['drugName[]'];
    const doses = form.elements['dose[]'];
    const freqs = form.elements['freq[]'];
    const notes = form.elements['rxNotes'].value;

    let rxText = `📋 *روشتة طبية إلكترونية*\n_______________________\n`;
    
    if (drugNames.length === undefined) {
        rxText += `\n💊 ${drugNames.value}\n   الجرعة: ${doses.value} | ${freqs.value}\n`;
    } else {
        for (let i = 0; i < drugNames.length; i++) {
            rxText += `\n${i + 1}. 💊 ${drugNames[i].value}\n   الجرعة: ${doses[i].value} | ${freqs[i].value}\n`;
        }
    }
    if (notes) rxText += `\n📝 *ملاحظات:* ${notes}\n`;
    rxText += `_______________________\nيرجى الالتزام بالجرعات ولا تنسَ المراجعة.`;

    const docInfo = window.currentDoctorInfo || { name: 'طبيب', specialty: 'طبيب عام', id: 'unknown' };
    const date = new Date();
    const verCode = btoa(`${docInfo.id}-${date.getTime()}`).substring(0, 12).toUpperCase();

    try {
        // patientId هنا هو رمز الـ QR (qr_token)
        // 1. جلب الروشتات السابقة للمرض
        const { data: docSnap, error } = await supabase.from('health_files').select('prescriptions').eq('qr_token', patientId).single();
        if (error) throw error;
        
        const currentRx = docSnap.prescriptions || [];
        // 2. تشفير نص الروشتة باستخدام رمز الـ QR قبل حفظها
        currentRx.push({ 
            doctor: docInfo.name, 
            specialty: docInfo.specialty, 
            verCode: verCode, 
            text: encryptField(rxText, patientId), 
            date: date.toISOString() 
        });
        
        // 3. حفظ الروشتة المشفرة في قاعدة البيانات
        await supabase.from('health_files').update({ prescriptions: currentRx }).eq('qr_token', patientId);
        
        showToast('تم حفظ الروشتة وتشفيرها في ملف المريض بنجاح!', 'success');
        closeModal();
        fetchPatientHealthFile(patientId, { specialty: 'general' }); 
    } catch (err) { 
        showToast('خطأ في حفظ الروشتة', 'error'); 
        
    }
}
window.addPrescriptionRow = () => {
    const container = document.getElementById('medListContainer');
    const newRow = document.createElement('div');
    newRow.className = 'bg-gray-50 p-3 rounded-xl border relative';
    newRow.innerHTML = `<button type="button" onclick="this.parentElement.remove()" class="absolute top-2 left-2 text-red-500"><i class="fas fa-times-circle"></i></button><div class="grid grid-cols-1 sm:grid-cols-3 gap-2"><input type="text" required class="ctrl-input text-sm" placeholder="اسم الدواء" name="drugName[]"><input type="text" required class="ctrl-input text-sm" placeholder="الجرعة" name="dose[]"><input type="text" required class="ctrl-input text-sm" placeholder="التكرار" name="freq[]"></div>`;
    container.appendChild(newRow);
}

window.deletePrescription = async (rxDate) => {
    if (!confirm("هل أنت متأكد من حذف هذه الروشتة؟")) return;
    try {
        const { data: docSnap, error } = await supabase.from('health_files').select('*').eq('id', currentHealthFileId).maybeSingle();
        if (error) return;
        const updatedRx = (docSnap.prescriptions || []).filter(p => p.date !== rxDate);
        await supabase.from('health_files').update({ prescriptions: updatedRx }).eq('id', currentHealthFileId);
        showToast('تم حذف الروشتة بنجاح', 'success');
        renderHealthDashboard({ ...docSnap, prescriptions: updatedRx });
    } catch (err) { showToast('حدث خطأ أثناء الحذف', 'error'); }
};
            
window.openMedicineDonation = () => {
    openCtrlPanel('مركز الأجهزة والمستلزمات الطبية (عرض وطلب)', `
        <div class="flex flex-col gap-5">
            <div class="bg-teal-50 border border-teal-200 rounded-xl p-4 text-teal-800 text-sm flex items-center gap-3">
                <i class="fas fa-laptop-medical text-xl"></i>
                <span>تبادل الأجهزة الطبية والمستلزمات. يمكنك <b>عرض جهاز</b> للتبرع أو الإعارة، أو <b>طلب جهاز</b> تحتاجه ولا تتوفر لديك.</span>
            </div>
            
            <div class="bg-red-50 border border-red-200 rounded-xl p-4 text-red-800 text-xs">
                <div class="font-bold mb-2 flex items-center gap-2"><i class="fas fa-shield-virus"></i> تنبيه أمان وتعقيم</div>
                <ul class="list-disc pr-5 space-y-1">
                    <li>يجب تعقيم الأجهزة الطبية وتنظيفها جيداً قبل تسليمها للمريض.</li>
                    <li>الرجاء التأكد من صلاحية المستلزمات الطبية وعدم انتهاء تاريخ صلاحيتها.</li>
                </ul>
            </div>
            
            <div class="bg-white p-5 rounded-xl border shadow-sm" style="border-color: var(--border)">
                <h4 class="font-bold mb-4 text-sm flex items-center gap-2"><i class="fas fa-hand-holding-heart text-teal-600"></i> أضف إعلاناً (عرض أو طلب)</h4>
                <form onsubmit="submitMedicineDonation(event)" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input type="text" id="medDonorName" class="ctrl-input text-sm" placeholder="اسم المعلن" required>
                    <input type="text" id="medDonationName" class="ctrl-input text-sm" placeholder="اسم الجهاز (مثال: جهاز ضغط، كرسي متحرك)" required>
                    <select id="medDonationType" class="ctrl-input text-sm">
                        <option>أعرض جهازاً (تبرع)</option>
                        <option>أعرض جهازاً (للإعارة)</option>
                        <option>أطلب جهازاً (أحتاجه للاستعارة)</option>
                        <option>مستلزمات طبية للتبادل (شاش، قطن، معقمات)</option>
                    </select>
                    <input type="text" id="medDonationExpiry" class="ctrl-input text-sm" placeholder="حالة الجهاز أو المدة المطلوبة )" required>
                    <input type="text" id="medDonationQty" class="ctrl-input text-sm" placeholder="الكمية (مثال: 1 جهاز، 2 كرسي متحرك)" required>
                    <input type="tel" id="medDonationPhone" class="ctrl-input text-sm" placeholder="رقم الهاتف 09XX" required>
                    <textarea id="medDonationNotes" class="ctrl-input text-sm col-span-1 sm:col-span-2" rows="2" placeholder="ملاحظات (مكان التسليم، مواصفات الجهاز، إلخ)"></textarea>
                    <button type="submit" id="medDonationSubmitBtn" class="col-span-1 sm:col-span-2 py-3 rounded-xl text-white font-bold text-sm transition-all hover:opacity-90" style="background: #0D9488;">
                       <i class="fas fa-bullhorn ml-2"></i> نشر الإعلان للمجتمع
                    </button>
                </form>
            </div>

            <div class="bg-white p-5 rounded-xl border shadow-sm" style="border-color: var(--border)">
                <h4 class="font-bold mb-4 text-sm flex items-center gap-2"><i class="fas fa-box-open text-teal-600"></i> إعلانات الأجهزة والمستلزمات</h4>
                <div id="medicineDonationsList" class="flex flex-col gap-3">
                    <p class="text-center py-8 text-gray-400 text-sm">جاري تحميل الإعلانات...</p>
                </div>
            </div>
        </div>
    `, '#0D9488');
    renderMedicineDonationsUI();
}

    function renderMedicineDonationsUI() {
    const list = document.getElementById('medicineDonationsList');
    if (!list) return;
    if (medicineDonations.length === 0) {
        list.innerHTML = '<p class="text-center py-8 text-gray-400 text-sm">لا توجد إعلانات حالياً. كن أول من يعرض أو يطلب جهازاً.</p>';
        return;
    }
    list.innerHTML = medicineDonations.map(m => {
        let typeBadge = '';
        let cardIcon = 'fa-laptop-medical';
        let iconColor = 'text-teal-600';
        let bgIconColor = 'bg-teal-50';

        if (m.medicine_type.includes('أطلب')) {
            typeBadge = `<span class="text-[9px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold">طلب</span>`;
            cardIcon = 'fa-bullhorn';
            iconColor = 'text-orange-600';
            bgIconColor = 'bg-orange-50';
        } else if (m.medicine_type.includes('أعرض')) {
            typeBadge = `<span class="text-[9px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">عرض ${escapeHtml(m.medicine_type.includes('إعارة') ? '(للإعارة)' : '(تبرع)')}</span>`;
        } else {
            typeBadge = `<span class="text-[9px] bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full font-bold">مستلزمات</span>`;
        }

        return `
            <div class="border rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all hover:shadow-md" style="border-color: var(--border); background: var(--card);">
                <div class="flex items-center gap-3 flex-1 min-w-0">
                    <div class="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${bgIconColor}">
                        <i class="fas ${cardIcon} ${iconColor} text-xl"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2 mb-1">
                            <div class="font-bold text-gray-800 text-sm truncate">${escapeHtml(m.medicine_name)}</div>
                            ${typeBadge}
                        </div>
                        <div class="text-[11px] text-gray-500 flex flex-wrap gap-x-3 gap-y-1 mt-1">
                            <span><i class="fas fa-tag ml-1"></i>${escapeHtml(m.medicine_type)}</span>
                            <span><i class="fas fa-box ml-1"></i>${escapeHtml(m.quantity)}</span>
                            <span class="text-purple-500 font-bold"><i class="fas fa-info-circle ml-1"></i>${escapeHtml(m.expiry_date)}</span>
                        </div>
                        ${m.notes ? `<div class="text-[10px] text-gray-400 mt-1 truncate"><i class="fas fa-pen"></i> ${escapeHtml(m.notes)}</div>` : ''}
                    </div>
                </div>
                <div class="flex gap-2 w-full sm:w-auto flex-shrink-0">
                    <a href="tel:${escapeHtml(m.phone)}" class="flex-1 sm:flex-none bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 hover:bg-teal-700 transition-colors"><i class="fas fa-phone"></i> تواصل</a>
                </div>
            </div>
        `;
    }).join('');
}
    
window.submitMedicineDonation = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('medDonationSubmitBtn');
    if (!btn) return;
    
    btn.disabled = true; 
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري النشر...';
    
    try {
        const name = document.getElementById('medDonorName').value.trim();
        const medName = document.getElementById('medDonationName').value.trim();
        const medType = document.getElementById('medDonationType').value;
        const expiryDate = document.getElementById('medDonationExpiry').value.trim(); 
        const quantity = document.getElementById('medDonationQty').value.trim();
        const phoneInput = document.getElementById('medDonationPhone');
        const phone = phoneInput.value.trim();
        const notes = document.getElementById('medDonationNotes').value.trim();

        if (!/^09\d{8}$/.test(phone)) { 
            phoneInput.classList.add('input-invalid'); 
            showToast('رقم هاتف غير صحيح', 'error'); 
            return; 
        }
                // فلتر الكلمات المسيئة في تبرع الأجهزة
        if (containsBadWords(name) || containsBadWords(medName) || containsBadWords(notes)) {
            phoneInput.classList.remove('input-invalid');
            showToast('تم رفض الإعلان لاحتوائه على كلمات غير لائقة.', 'error');
            return;
        }
        phoneInput.classList.remove('input-invalid');
        const { error } = await supabase.from('medicine_donations').insert([{ 
            donor_name: name, 
            medicine_name: medName, 
            medicine_type: medType, 
            expiry_date: expiryDate, 
            quantity: quantity, 
            phone: phone, 
            notes: notes, 
            status: 'active' 
        }]);

        if (error) throw error;
        
        // === إشعار لجميع المستخدمين بوجود جهاز طبي ===
        await sendPushNotification(null, "جهاز طبي متاح 🩺", `تم إضافة جهاز: ${medName}`, 'all');
        showToast('تم نشر إعلانك بنجاح !', 'success');
        document.querySelector('#ctrlContent form').reset();
        await fetchMedicineDonations();
        renderMedicineDonationsUI();

    } catch (err) {
        showToast('حدث خطأ: ' + err.message);
        
    } finally {
        btn.disabled = false; 
        btn.innerHTML = '<i class="fas fa-bullhorn ml-2"></i> نشر الإعلان للمجتمع';
    }
}
window.resolveMedicineDonation = async (id) => { 
    try { 
        await supabase.from('medicine_donations').update({ status: 'resolved' }).eq('id', id); 
        showToast('تمت الإزالة.', 'success'); 
        await fetchMedicineDonations(); 
        renderAdminDashboard(); 
    } catch (err) { showToast('حدث خطأ', 'error'); } 
}
window.openBloodBank = () => {
    const bloodTypes = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
    openCtrlPanel('بنك التبرع بالدم الرقمي (سوريا)', `
        <div class="flex flex-col gap-5">
            <div class="bg-red-50 border border-red-200 rounded-xl p-4 text-red-800 text-sm flex items-center gap-3">
                <i class="fas fa-tint text-xl"></i>
                <span>نظام رقمي لربط المرضى المحتاجين للدم بالمتبرعين في كل أنحاء سوريا. ساهم في إنقاذ حياة.</span>
            </div>
            
            <div class="bg-white p-5 rounded-xl border" style="border-color: var(--border)">
                <h4 class="font-bold mb-4 text-sm flex items-center gap-2"><i class="fas fa-plus-circle text-red-600"></i> نشر طلب استغاثة للدم</h4>
                <form onsubmit="submitBloodRequest(event)" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input type="text" id="bloodPatient" class="ctrl-input text-sm" placeholder="اسم المريض" required>
                    <select id="bloodType" class="ctrl-input text-sm" required>
                        ${bloodTypes.map(t => `<option value="${t}">الفصيلة: ${t}</option>`).join('')}
                    </select>
                    <input type="text" id="bloodHospital" class="ctrl-input text-sm" placeholder="المشفى / المدينة" required>
                    <input type="tel" id="bloodPhone" class="ctrl-input text-sm" placeholder="رقم التواصل 09XX" required>
                    <textarea id="bloodNotes" class="ctrl-input text-sm col-span-1 sm:col-span-2" rows="2" placeholder="ملاحظات (مثال: يحتاج 3 أكياس عاجلة)"></textarea>
                    <button type="submit" class="col-span-1 sm:col-span-2 py-3 rounded-xl text-white font-bold text-sm" style="background: #DC2626;">
                        <i class="fas fa-bullhorn ml-2"></i> نشر الاستغاثة
                    </button>
                </form>
            </div>
            
            <div class="bg-white p-5 rounded-xl border" style="border-color: var(--border)">
                <h4 class="font-bold mb-4 text-sm flex items-center gap-2"><i class="fas fa-list-alt text-red-600"></i> استغاثات الدم الحالية</h4>
                <div id="bloodRequestsList" class="flex flex-col gap-3">
                    <p class="text-center py-8 text-gray-400 text-sm">جاري تحميل الاستغاثات...</p>
                </div>
            </div>
        </div>
    `, '#DC2626');
    renderBloodBankUI();
}

function renderBloodBankUI() {
    const list = document.getElementById('bloodRequestsList');
    if (!list) return;
    if (bloodRequests.length === 0) {
        list.innerHTML = '<p class="text-center py-8 text-gray-400 text-sm">لا توجد استغاثات دم حالياً. شكراً لك.</p>';
        return;
    }
    list.innerHTML = bloodRequests.map(req => {
        return `
            <div class="border rounded-xl p-4 flex flex-col sm:flex-row items-center gap-4" style="border-color: var(--border)">
                <div class="blood-type-badge">${escapeHtml(req.blood_type)}</div>
                <div class="flex-1 text-center sm:text-right">
                    <div class="font-bold text-gray-800">${escapeHtml(req.patient_name)}</div>
                    <div class="text-xs text-gray-500 mt-1"><i class="fas fa-hospital ml-1"></i> ${escapeHtml(req.hospital)} ${req.notes ? `| <i class="fas fa-notes-medical ml-1"></i> ${escapeHtml(req.notes)}` : ''}</div>
                </div>
                <div class="flex gap-2">
                    <a href="tel:${escapeHtml(req.phone)}" class="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 hover:bg-blue-600"><i class="fas fa-phone"></i> اتصال</a>
                </div>
            </div>
        `;
    }).join('');
}

window.submitBloodRequest = async (e) => {
    e.preventDefault();
    if (!checkRateLimit('blood_request', 1)) return; 
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true; submitBtn.innerText = 'جاري النشر...';
    
    const name = document.getElementById('bloodPatient').value.trim();
    const bloodType = document.getElementById('bloodType').value;
    const hospital = document.getElementById('bloodHospital').value.trim();
    const phoneInput = document.getElementById('bloodPhone');
    const phone = phoneInput.value.trim();
    const notes = document.getElementById('bloodNotes').value.trim();

    if (!/^09\d{8}$/.test(phone)) { phoneInput.classList.add('input-invalid'); showToast('رقم هاتف غير صحيح'); submitBtn.disabled = false; submitBtn.innerText = 'نشر الاستغاثة'; return; }    // فلتر الكلمات المسيئة في بنك الدم
    if (containsBadWords(name) || containsBadWords(notes)) {
        showToast('تم رفض الاستغاثة لاحتوائها على كلمات غير لائقة.', 'error');
        submitBtn.disabled = false; submitBtn.innerText = 'نشر الاستغاثة';
        return;
    }
    phoneInput.classList.remove('input-invalid');
    try {
        await supabase.from('blood_requests').insert([{ patient_name: name, blood_type: bloodType, hospital: hospital, phone: phone, notes: notes, status: 'active' }]);
        setRateLimit('blood_request');
        // === إشعار لجميع المستخدمين بوجود استغاثة دم ===
        await sendPushNotification(null, "استغاثة دم طارئة 🩸", `المريض ${name} يحتاج فصيلة ${bloodType} في ${hospital}`, 'all');
        showToast('تم نشر استغاثتك بنجاح! سيتم التواصل معك قريباً.', 'success');
        e.target.reset();
    } catch (err) { 
        showToast('حدث خطأ أثناء النشر', 'error'); 
    } finally {
        submitBtn.disabled = false; submitBtn.innerText = 'نشر الاستغاثة';
    }
}

window.resolveBloodRequest = async (id) => { 
    try { 
        await supabase.from('blood_requests').update({ status: 'resolved' }).eq('id', id); 
        showToast('تم إنهاء الطلب.', 'success'); 
        await fetchBloodRequests(); 
        renderAdminDashboard();
    } catch (err) { showToast('حدث خطأ', 'error'); } 
}
window.respondToBloodRequest = (btnElement, reqId, patientName, phone) => {
    btnElement.disabled = true; btnElement.innerText = 'جاري التسجيل...'; btnElement.classList.add('opacity-50', 'cursor-not-allowed');
    const toast = document.getElementById('toast');
    toast.innerHTML = `<div class="flex flex-col items-center gap-3"><div class="text-sm">سيتم تسجيل استجابتك خلال 6 ثوانٍ...</div><button onclick="undoRespond()" style="background:#ef4444; color:white; padding:6px 16px; border-radius:8px; font-size:12px; border:none; cursor:pointer; font-weight:bold;">تراجع الآن</button></div>`;
    toast.classList.add('show');
    window.bloodUndoTimeout = setTimeout(async () => {
        toast.classList.remove('show');
        try {
            const req = bloodRequests.find(r => r.id === reqId);
            const newCount = (req?.responses_count || 0) + 1;
            await supabase.from('blood_requests').update({ responses_count: newCount }).eq('id', reqId);
            toast.innerHTML = `<div class="flex flex-col items-center gap-3"><div class="text-sm font-bold">بارك الله فيك! 🌹<br>تم تسجيل استجابتك.</div><a href="tel:${escapeHtml(phone)}" onclick="hideToast()" style="background:#2563EB; color:white; padding:8px 20px; border-radius:8px; font-size:14px; text-decoration:none; font-weight:bold; display:flex; align-items:center; gap:8px;"><i class="fas fa-phone-volume"></i> اتصال بالمريض</a></div>`;
            toast.classList.add('show');
            setTimeout(() => { toast.classList.remove('show'); }, 10000);
        } catch (err) { showToast('حدث خطأ أثناء التسجيل', 'error'); btnElement.disabled = false; btnElement.innerText = 'استجبت'; btnElement.classList.remove('opacity-50', 'cursor-not-allowed'); }
    }, 6000);
}
window.undoRespond = () => { if (window.bloodUndoTimeout) clearTimeout(window.bloodUndoTimeout); document.getElementById('toast').classList.remove('show'); setTimeout(() => showToast('تم التراجع.'), 300); }
window.hideToast = () => { document.getElementById('toast').classList.remove('show'); }

window.setStatus = async (id, status) => {
    try {
        await supabase.from('listings').update({ isopen: status }).eq('id', id);
        localStorage.setItem('force_listings_update', 'true');
        let msg = status === true ? 'تم تغيير الحالة إلى: مفتوح' : status === false ? 'تم تغيير الحالة إلى: مغلق' : 'تم تعيين الحالة إلى: لا شيء';
        showToast(msg);
        const item = allData.find(d => d.id === id);
        if (item) item.isopen = status;
        const buttons = document.querySelectorAll(`button[onclick*="setStatus('${id}',"]`);
        
        if (buttons.length > 0) {
            buttons.forEach(btn => {
                btn.classList.remove('bg-green-500', 'bg-red-500', 'bg-gray-700', 'text-white', 'shadow', 'hover:bg-gray-100');
                btn.classList.add('text-gray-500');
                
                const onclickAttr = btn.getAttribute('onclick');
                if (onclickAttr.includes('true') && status === true) {
                    btn.classList.add('bg-green-500', 'text-white', 'shadow');
                    btn.classList.remove('text-gray-500');
                } else if (onclickAttr.includes('false') && status === false) {
                    btn.classList.add('bg-red-500', 'text-white', 'shadow');
                    btn.classList.remove('text-gray-500');
                } else if (onclickAttr.includes('null') && status === null) {
                    btn.classList.add('bg-gray-700', 'text-white', 'shadow');
                    btn.classList.remove('text-gray-500');
                }
            });
        }

    } catch (e) { 
        showToast('حدث خطأ', 'error'); 
    }
}
window.openMedicineFinder = () => { 
    document.getElementById('modalContent').innerHTML = `<div class="p-6"><div class="flex justify-between items-center mb-6"><h3 class="font-bold text-lg" style="font-family: 'Noto Kufi Arabic'"><i class="fas fa-pills ml-2" style="color: var(--gold)"></i> ابحث عن دوائك</h3><button onclick="closeModal()" class="text-2xl hover:text-gray-400 leading-none">&times;</button></div><div class="mb-4 p-3 rounded-xl text-sm bg-emerald-50 dark:bg-slate-700 text-emerald-800 dark:text-emerald-200 border border-emerald-100 dark:border-slate-600"><i class="fas fa-info-circle ml-1"></i> اكتب الأدوية المطلوبة وحدد مستوى الإلحاح، وسنتولى إرسالها للصيدليات. سيقوم أول صيدلية يتوفر فيها الدواء بالاتصال بك مباشرة!</div><form onsubmit="submitMedicineRequest(event)"><div class="mb-4"><label class="block text-sm font-semibold mb-2">الأدوية المطلوبة (نصياً)</label><textarea id="medList" class="ctrl-input" rows="3" placeholder="مثال: كريب ستوب، أبرة معينة، شراب سيتامول" required></textarea></div><div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4"><div><label class="block text-sm font-semibold mb-2">اسم المريض (اختياري)</label><input type="text" id="medName" class="ctrl-input" placeholder="اكتب اسمك"></div><div><label class="block text-sm font-semibold mb-2">رقم الهاتف للتواصل</label><input type="tel" id="medPhone" class="ctrl-input" placeholder="09XXXXXXXX" required></div></div><div class="mb-4"><label class="block text-sm font-semibold mb-2">مستوى الإلحاح</label><select id="medUrgency" class="ctrl-input"><option value="عاجل جداً (طوارئ)">عاجل جداً (طوارئ)</option><option value="عاجل (خلال اليوم)">عاجل (خلال اليوم)</option><option value="عادي" selected>عادي</option></select></div><div class="mb-6"><label class="block text-sm font-semibold mb-2">صورة الوصفة الطبية (اختياري)</label><div class="file-input-wrapper"><label class="file-input-label" for="medImage"><i class="fas fa-camera text-2xl mb-2"></i><span>اضغط لاختيار صورة الوصفة (إن وجدت)</span><img id="imagePreview" class="preview-image hidden" src="" alt="معاينة"></label><input type="file" id="medImage" accept="image/*" onchange="previewMedicineImage(event)"></div></div><button type="submit" id="medSubmitBtn" class="w-full py-3.5 rounded-xl text-white font-bold text-sm transition-all hover:opacity-90 flex items-center justify-center gap-2" style="background: var(--accent)"><i class="fas fa-paper-plane"></i> إرسال للصيدليات</button></form></div>`; 
    document.getElementById('modalOverlay').classList.add('active'); 
    lockScroll(); 
}

window.previewMedicineImage = (event) => { 
    const file = event.target.files[0]; 
    const reader = new FileReader(); 
    reader.onload = (e) => { 
        const img = document.getElementById('imagePreview'); 
        img.src = e.target.result; 
        img.classList.remove('hidden'); 
    }; 
    reader.readAsDataURL(file); 
}

window.submitMedicineRequest = async (e) => { 
    e.preventDefault(); 
    if (!checkRateLimit('med_request', 1)) return;
    const medList = document.getElementById('medList').value.trim();
    const name = document.getElementById('medName').value.trim() || 'مريض'; 
    const phoneInput = document.getElementById('medPhone'); 
    const phone = phoneInput.value.trim(); 
    const urgency = document.getElementById('medUrgency').value;
    const fileInput = document.getElementById('medImage'); 
    const file = fileInput.files[0]; 
    
    if (!medList) { showToast('الرجاء كتابة الأدوية المطلوبة'); return; }
    if (!/^09\d{8}$/.test(phone)) { phoneInput.classList.add('input-invalid'); showToast('الرجاء إدخال رقم هاتف صحيح'); return; }     // فلتر الكلمات المسيئة في طلبات الأدوية
    if (containsBadWords(medList) || containsBadWords(name)) {
        showToast('تم رفض الطلب لاحتوائه على كلمات غير لائقة أو إعلانية.', 'error');
        phoneInput.classList.remove('input-invalid');
        submitBtn.disabled = false; 
        submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> إرسال للصيدليات';
        return;
    }
    phoneInput.classList.remove('input-invalid'); 
    
    const submitBtn = document.getElementById('medSubmitBtn'); 
    submitBtn.disabled = true; 
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري إرسال الطلب...'; 
    try { 
        let imageUrl = '';
                if (file) {
            const formData = new FormData(); 
            formData.append('image', file); 
            
            // استدعاء الدالة السرية في Supabase بدلاً من ImgBB مباشرة
            const { data: funcData, error: funcError } = await supabase.functions.invoke('upload-image', {
                body: formData
                
            });
            
            if (funcError) throw funcError;
            if (funcData && funcData.success) imageUrl = funcData.data.url;
        }
        const medRef = `MED-${Math.floor(Math.random() * 900000) + 100000}`;
        const { error } = await supabase.from('medicine_requests').insert([{ 
           
            med_ref: medRef, 
            med_list: medList,
            urgency: urgency,
            patient_name: name, 
            patient_phone: phone, 
            image_url: imageUrl, 
            status: 'searching', 
            notes: '', 
            available_pharmacy: '',
            patient_push_id: localStorage.getItem('patient_push_id') // إرفاق معرف المريض
        }]); 
        if (error) throw error;
        setRateLimit('med_request');
        // === إشعار للصيدليات فقط بوجود طلب دواء عاجل ===
        sendPushNotification(null, "طلب دواء عاجل 💊", `المريض ${name} يبحث عن: ${medList}`, 'pharmacies');
        
        document.getElementById('modalContent').innerHTML = `
        <div class="p-8 text-center">
            <div class="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4" style="background: var(--accent-light)"><i class="fas fa-check text-4xl" style="color: var(--accent)"></i></div>
            <h3 class="text-xl font-bold mb-2" style="font-family: 'Noto Kufi Arabic'">تم إرسال طلبك بنجاح!</h3>
            <p class="text-sm mb-2" style="color: var(--muted)">رقم طلبك الدوائي هو:</p>
            <div class="text-2xl font-black text-yellow-600 mb-4">#${medRef}</div>
            <p class="text-sm mb-6" style="color: var(--muted)">احفظ هذا الرقم للاستعلام عن حالة الدواء لاحقاً في خانة الاستعلام السريع أعلى الصفحة.</p>
            <button onclick="copyText('${medRef}')" class="w-full py-3 rounded-xl text-white font-bold text-sm mb-2" style="background: var(--accent)">
                <i class="fas fa-copy ml-2"></i> نسخ الكود
            </button>
            <button onclick="closeModal()" class="w-full py-2 rounded-xl border font-bold text-sm" style="border-color: var(--border)">حسناً</button>
        </div>`; 
    } catch (err) { 
        showToast('حدث خطأ أثناء إرسال الطلب', 'error'); 
        submitBtn.disabled = false; 
        submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> إرسال للصيدليات'; 
    } 
}
window.quickLookup = async () => {
    let val = document.getElementById('quickLookupInput').value.trim().toUpperCase().replace(/#/g, '').replace(/\s/g, '');
    if (!val) { showToast('الرجاء إدخال رقم الاستعلام'); return; }
    
    if (val.startsWith('R-')) {
        // استخدام الدالة الآمنة RPC بدلاً من البحث المباشر
        const { data, error } = await supabase.rpc('get_booking_by_ref', { p_ref: val });
        if (data && data.length > 0) { 
            openBookingFollowup(data[0].id); 
        } else { 
            showToast('لم يتم العثور على حجز'); 
        }
    } else if (val.startsWith('MED-')) {
        const { data, error } = await supabase.from('medicine_requests').select('*').eq('med_ref', val);
        if (data && data.length > 0) {
            const m = data[0];
            let statusText = '', statusColor = '', statusIcon = '';
            if (m.status === 'searching') { statusText = 'قيد البحث'; statusColor = '#F59E0B'; statusIcon = 'fa-clock'; }
            else if (m.status === 'available') { statusText = 'تم التوفير - جاهز للاستلام'; statusColor = '#10B981'; statusIcon = 'fa-check-circle'; }
            else if (m.status === 'unavailable') { statusText = 'غير متوفر حالياً'; statusColor = '#6B7280'; statusIcon = 'fa-times-circle'; }
            else { statusText = 'تم إنهاء الطلب'; statusColor = '#6B7280'; statusIcon = 'fa-archive'; }
            
            document.getElementById('modalContent').innerHTML = `<div class="p-6 text-center"><div class="flex justify-between items-center mb-6"><h3 class="font-bold text-lg"><i class="fas fa-pills ml-2" style="color: var(--gold)"></i> حالة طلب الدواء</h3><button onclick="closeModal()" class="text-2xl">&times;</button></div><div class="text-sm text-gray-500 mb-1">رقم الطلب</div><div class="text-xl font-black text-yellow-600 mb-6">#${escapeHtml(m.med_ref)}</div><div class="p-4 rounded-xl mb-4" style="background: ${statusColor}20; color: ${statusColor};"><i class="fas ${statusIcon} text-3xl mb-2"></i><div class="font-bold text-lg">${statusText}</div></div> ${m.notes ? `<div class="bg-gray-50 p-3 rounded-xl text-sm text-gray-700 text-right" style="white-space: pre-line;"><b>ملاحظة الصيدلية:</b><br>${escapeHtml(m.notes)}</div>` : '<div class="text-xs text-gray-400">لا توجد ملاحظات.</div>'}</div>`;
            
            document.getElementById('modalOverlay').classList.add('active'); lockScroll();
        } else { showToast('لم يتم العثور على طلب دواء', 'error'); }
    } else { showToast('صيغة غير صحيحة. استخدم R-XXX أو MED-XXX'); }
};
window.openAdminLogin = () => { 
    openCtrlPanel('لوحة الإدارة', `<div class="max-w-sm mx-auto py-8"><div class="text-center mb-6"><div class="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-3" style="background: var(--accent-light)"><i class="fas fa-user-shield text-2xl" style="color: var(--accent)"></i></div><h3 class="font-bold text-lg">دخول الإدارة</h3></div><form onsubmit="handleAdminLogin(event)" class="flex flex-col gap-4"><input type="email" id="adminEmail" class="ctrl-input text-center" placeholder="البريد الإلكتروني" required><input type="password" id="adminPass" class="ctrl-input text-center" placeholder="كلمة المرور" required><button type="submit" class="w-full py-3 rounded-xl text-white font-bold text-sm" style="background: var(--accent)">دخول</button></form></div>`, '#073D2E'); 
}
window.handleAdminLogin = async (e) => { 
    e.preventDefault(); 
    const email = document.getElementById('adminEmail').value.trim();
    const password = document.getElementById('adminPass').value.trim();
    
    const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password
    });
    
    if (error) { 
        showToast('الإيميل أو كلمة المرور غير صحيحة!', 'error'); 
        return; 
    }
    renderAdminDashboard(); 
}
window.logoutAdmin = async () => {
    await supabase.auth.signOut();
    closeCtrlPanel();
    showToast('تم تسجيل الخروج بنجاح', 'success');
}
window.updateAdminFormFields = (type) => {
    // إخفاء حقل الهاتف العام للمشافي والمراكز فقط
    const phoneInput = document.getElementById('new_phone');
    if (phoneInput) {
        if (type === 'hospital' || type === 'center') {
            phoneInput.classList.add('hidden');
        } else {
            phoneInput.classList.remove('hidden');
        }
    }
    // إخفاء حقل كلمة المرور للمشافي والمخابر والمراكز
    const passInput = document.getElementById('new_custom_password');
    if (passInput) {
        if (type === 'doctor' || type === 'pharmacy') {
            passInput.classList.remove('hidden'); // إظهار الحقل
        } else {
            passInput.classList.add('hidden'); // إخفاء الحقل
        }
    }
    let html = '';
        if (type === 'hospital' || type === 'center') {
        html = `
            <input type="text" id="new_capacity_info" class="ctrl-input text-sm col-span-1 sm:col-span-2" placeholder="معلومات السعة الاستيعابية (اختياري)">
            
            <div class="col-span-1 sm:col-span-2 p-4 bg-gray-50 rounded-xl border border-gray-200">
                <h4 class="font-bold text-sm mb-3 text-gray-700">شريط الإحصائيات السريعة</h4>
                <div id="statsContainer" class="grid grid-cols-1 gap-2"></div>
                <button type="button" onclick="addAdminRow('statsContainer', ['icon', 'value', 'label'])" class="mt-2 w-full py-2 rounded-xl border-2 border-dashed text-sm font-semibold text-teal-600 border-teal-500 hover:bg-teal-50">+ إضافة إحصائية</button>
            </div>
            
            <div class="col-span-1 sm:col-span-2 p-4 border-t border-dashed" style="border-color: var(--border);">
                <h4 class="font-bold text-sm mb-2 text-gray-700">الأقسام الطبية الرئيسية</h4>
                <div id="deptContainer" class="flex flex-col gap-2"></div>
                <button type="button" onclick="addAdminRow('deptContainer', ['icon', 'title', 'desc'])" class="mt-2 w-full py-2 rounded-xl border-2 border-dashed text-sm font-semibold text-teal-600 border-teal-500 hover:bg-teal-50">+ إضافة قسم</button>
            </div>
            
            <div class="col-span-1 sm:col-span-2 p-4 border-t border-dashed" style="border-color: var(--border);">
                <h4 class="font-bold text-sm mb-2 text-gray-700">الوحدات الحرجة</h4>
                <div id="unitContainer" class="flex flex-col gap-2"></div>
                <button type="button" onclick="addAdminRow('unitContainer', ['title', 'desc'])" class="mt-2 w-full py-2 rounded-xl border-2 border-dashed text-sm font-semibold text-red-600 border-red-500 hover:bg-red-50">+ إضافة وحدة</button>
            </div>

            <div class="col-span-1 sm:col-span-2 p-4 border-t border-dashed" style="border-color: var(--border);">
                <h4 class="font-bold text-sm mb-2 text-gray-700">الخدمات المساندة</h4>
                <div id="servContainer" class="flex flex-col gap-2"></div>
                <button type="button" onclick="addAdminRow('servContainer', ['title', 'desc'])" class="mt-2 w-full py-2 rounded-xl border-2 border-dashed text-sm font-semibold text-green-600 border-green-500 hover:bg-green-50">+ إضافة خدمة</button>
            </div>

            <!-- قسم أرقام الهواتف المتعددة (أسفل الخدمات المساندة) -->
            <div class="col-span-1 sm:col-span-2 p-4 border-t border-dashed" style="border-color: var(--border);">
                <h4 class="font-bold text-sm mb-2 text-gray-700"><i class="fas fa-phone-volume text-teal-600 ml-1"></i> أرقام هواتف المنشأة (متعدد)</h4>
                <div id="phoneContainer" class="flex flex-col gap-2"></div>
                <button type="button" onclick="addAdminRow('phoneContainer', ['label', 'phone'])" class="mt-2 w-full py-2 rounded-xl border-2 border-dashed text-sm font-semibold text-teal-600 border-teal-500 hover:bg-teal-50">+ إضافة رقم هاتف</button>
            </div>
        `;
            
          } else if (type === 'doctor') {
        html = `
        <input type="text" id="new_consult_hours" class="ctrl-input text-sm" placeholder="أوقات المعاينة (النظام قديم)">
        <input type="text" id="new_parent_id" class="ctrl-input text-sm" placeholder="ID المشفى التابع له (اختياري)">
        <input type="text" id="new_extra" class="ctrl-input text-sm" placeholder="تفاصيل إضافية">
        
        <div class="col-span-1 sm:col-span-2 p-4 bg-gray-50 rounded-xl border border-gray-200 mt-2">
            <h4 class="font-bold text-sm mb-3 text-gray-700"> الصلاحيات النظام الحجز </h4>
            <div class="flex flex-col gap-2 mb-4">
                <label class="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" id="allow_manual" class="w-5 h-5 accent-blue-600" checked>
                    <span class="text-sm font-bold">السماح للطبيب باستخدام النظام اليدوي</span>
                </label>
                <label class="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" id="allow_slots" class="w-5 h-5 accent-blue-600">
                    <span class="text-sm font-bold">السماح للطبيب باستخدام نظام المواعيد الدقيقة</span>
                </label>
            </div>
        </div>`;
    
    } else if (type === 'lab') {
        html = `<input type="text" id="new_extra" class="ctrl-input text-sm col-span-1 sm:col-span-2" placeholder="نوع التحاليل"><select id="new_home_sample" class="ctrl-input text-sm"><option value="لا">لا يوجد سحب منزلي</option><option value="نعم">يوجد سحب منزلي</option></select>`;
    } else if (type === 'pharmacy') {
        html = `<input type="text" id="new_night_details" class="ctrl-input text-sm" placeholder="تفاصيل المناوبة"><input type="text" id="new_extra" class="ctrl-input text-sm col-span-1 sm:col-span-2" placeholder="ملاحظات">`;
    }
    
    html += '<input type="text" id="new_latlng" class="ctrl-input text-sm col-span-1 sm:col-span-2 mt-2" placeholder="إحداثيات الموقع (33.5, 36.3)">';
    document.getElementById('adminExtraFields').innerHTML = html;
}

// دالة مساعدة لإنشاء صفوف الإدخال في لوحة التحكم
window.addAdminRow = (containerId, fields) => {
    const container = document.getElementById(containerId);
    if (!container) return;
    const row = document.createElement('div');
    row.className = 'flex gap-2 items-center';
    
    let innerHtml = '';
    fields.forEach(field => {
        if (field === 'icon') innerHtml += `<input type="text" class="row-icon ctrl-input text-xs w-24" placeholder="أيقونة (fa-bolt)">`;
        if (field === 'value') innerHtml += `<input type="text" class="row-value ctrl-input text-xs w-24" placeholder="القيمة (93)">`;
        if (field === 'label') innerHtml += `<input type="text" class="row-label ctrl-input text-xs w-32" placeholder="الوصف (استقبال)">`;
        if (field === 'phone') innerHtml += `<input type="text" class="row-phone ctrl-input text-xs flex-1" placeholder="رقم الهاتف" dir="ltr">`;
        if (field === 'title') innerHtml += `<input type="text" class="row-title ctrl-input text-xs flex-1" placeholder="العنوان">`;
        if (field === 'desc') innerHtml += `<input type="text" class="row-desc ctrl-input text-xs flex-1" placeholder="الوصف">`;
    });
    innerHtml += `<button type="button" onclick="this.parentElement.remove()" class="text-red-500 px-2"><i class="fas fa-times"></i></button>`;
    
    row.innerHTML = innerHtml;
    container.appendChild(row);
};

window.renderAdminDashboard = async () => { 
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        openAdminLogin();
        showToast('يجب تسجيل الدخول أولاً');
        return;
    }

    const { data: recentPatients } = await supabase.from('health_files').select('full_name, blood_type, created_at').order('created_at', { ascending: false }).limit(5);
    const { count: totalHealthFilesCount } = await supabase.from('health_files').select('*', { count: 'exact', head: true });
    let patientsHtml = '';
    if (recentPatients && recentPatients.length > 0) {
        patientsHtml = recentPatients.map(p => `<div class="flex items-center justify-between p-2 rounded-lg border" style="border-color: var(--border)"><div class="flex items-center gap-2"><i class="fas fa-user-circle text-gray-400"></i><span class="text-sm font-semibold">${escapeHtml(p.full_name)}</span></div><span class="text-xs text-red-500 font-bold">${escapeHtml(p.blood_type || 'غير محدد')}</span></div>`).join('');
    } else {
        patientsHtml = '<p class="text-center text-gray-400 text-sm py-4">لا يوجد مرضى مسجلين بعد.</p>';
    }
    const patientsAdminHtml = `<div class="bg-white p-5 rounded-xl border" style="border-color: var(--border)"><h4 class="font-bold mb-4 text-sm flex items-center gap-2" style="font-family: 'Noto Kufi Arabic'"><i class="fas fa-file-medical text-pink-600"></i> أحدث الملفات الصحية المسجلة</h4><div class="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">${patientsHtml}</div></div>`;
    const analyticsHtml = `
    <div class="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
        <div class="bg-white p-5 rounded-xl border shadow-sm flex flex-col items-center justify-center" style="border-color: var(--border)">
            <div class="text-4xl font-black text-pink-600 mb-1">${totalHealthFilesCount || 0}</div>
            <div class="text-xs text-gray-500 text-center">ملف صحي مسجل</div>
        </div>
        <div class="bg-white p-5 rounded-xl border shadow-sm flex flex-col items-center justify-center" style="border-color: var(--border)">
            <div class="text-4xl font-black text-indigo-600 mb-1">${allData.length}</div>
            <div class="text-xs text-gray-500 text-center">منشأة طبية</div>
        </div>
        <div class="bg-white p-5 rounded-xl border shadow-sm flex flex-col items-center justify-center col-span-2 sm:col-span-1" style="border-color: var(--border)">
            <div class="text-4xl font-black text-red-600 mb-1">${bloodRequests.length}</div>
            <div class="text-xs text-gray-500 text-center">استغاثة دم نشطة</div>
        </div>
    </div>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div class="bg-white p-5 rounded-xl border shadow-sm" style="border-color: var(--border)">
            <h4 class="font-bold mb-4 text-sm flex items-center gap-2" style="font-family: 'Noto Kufi Arabic'"><i class="fas fa-chart-pie text-teal-600"></i> توزيع المنشآت الطبية</h4>
            <div style="height: 250px;"><canvas id="facilitiesChart"></canvas></div>
        </div>
        <div class="bg-white p-5 rounded-xl border shadow-sm" style="border-color: var(--border)">
            <h4 class="font-bold mb-4 text-sm flex items-center gap-2" style="font-family: 'Noto Kufi Arabic'"><i class="fas fa-chart-bar text-red-600"></i> استغاثات الدم حسب الفصيلة</h4>
            <div style="height: 250px;"><canvas id="bloodChart"></canvas></div>
        </div>
    </div>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div class="bg-white p-5 rounded-xl border shadow-sm" style="border-color: var(--border)">
            <h4 class="font-bold mb-4 text-sm flex items-center gap-2" style="font-family: 'Noto Kufi Arabic'"><i class="fas fa-newspaper text-blue-600"></i> أكثر 5 مقالات قراءةً</h4>
            <div style="height: 250px;"><canvas id="articlesChart"></canvas></div>
        </div>
        <div class="bg-white p-5 rounded-xl border shadow-sm" style="border-color: var(--border)">
            <h4 class="font-bold mb-4 text-sm flex items-center gap-2" style="font-family: 'Noto Kufi Arabic'"><i class="fas fa-laptop-medical text-emerald-600"></i> توزيع المستلزمات والأجهزة</h4>
            <div style="height: 250px;"><canvas id="medEquivChart"></canvas></div>
        </div>
    </div>
    <div class="bg-white p-5 rounded-xl border shadow-sm mb-4" style="border-color: var(--border)">
        <h4 class="font-bold mb-4 text-sm flex items-center gap-2" style="font-family: 'Noto Kufi Arabic'"><i class="fas fa-satellite-dish text-indigo-600"></i> نشاط رادار الرحيبة الصحي</h4>
        <div style="height: 300px;"><canvas id="radarChart"></canvas></div>
    </div>`;
    
    const { data: topArticles } = await supabase.from('medical_articles').select('title, views').order('views', { ascending: false }).limit(5);
    const radarAdminHtml = `<div class="bg-white p-5 rounded-xl border" style="border-color: var(--border)"><h4 class="font-bold mb-4 text-sm flex items-center gap-2" style="font-family: 'Noto Kufi Arabic'"><i class="fas fa-satellite-dish text-indigo-600"></i> إدارة رادار الرحيبة الصحي</h4><div class="grid grid-cols-1 sm:grid-cols-2 gap-3"><div class="bg-gray-50 p-3 rounded-xl"><span class="text-xs text-gray-500 block mb-1">الفصل الافتراضي للزوار:</span><select id="adminRadarSeason" onchange="setRadarDefaultSeason()" class="ctrl-input text-sm"><option value="summer">☀️ صيف</option><option value="winter">❄️ شتاء</option></select></div><div class="bg-gray-50 p-3 rounded-xl flex flex-col justify-center"><span class="text-xs text-gray-500 block mb-1">تصفير العدادات الأسبوعي:</span><button onclick="resetRadarVotes()" class="bg-red-500 text-white py-2 rounded-lg text-sm font-bold hover:bg-red-600 transition-all">تصفير العدادات</button></div></div></div>`;
    const homeAdsHtml = `<div class="bg-white p-5 rounded-xl border" style="border-color: var(--border)"><h4 class="font-bold mb-4 text-sm flex items-center gap-2" style="font-family: 'Noto Kufi Arabic'"><i class="fas fa-photo-video text-purple-600"></i> إعلانات الصفحة الرئيسية (صور/فيديو)</h4><form onsubmit="saveHomeAd(event)" class="grid grid-cols-1 gap-3 mb-4"><select id="adType" class="ctrl-input text-sm"><option value="image">صورة (رابط مباشر ينتهي بـ .jpg أو .png)</option><option value="video">فيديو (رابط مباشر ينتهي بـ .mp4 فقط)</option></select><input type="text" id="adContent" class="ctrl-input text-sm" placeholder="الصق الرابط هنا..." required><input type="text" id="adLink" class="ctrl-input text-sm" placeholder="رابط التحويل عند الضغط (اختياري للصور)"><label class="flex items-center gap-2 text-sm"><input type="checkbox" id="adActiveCheck" class="w-5 h-5 accent-purple-600" checked> تفعيل وعرض الإعلان فوراً</label><button type="submit" class="py-2.5 rounded-xl text-white font-semibold text-sm" style="background: #8B5CF6"><i class="fas fa-plus ml-1"></i> إضافة إعلان</button></form><div id="adminHomeAdsList" class="flex flex-col gap-2 max-h-40 overflow-y-auto pr-1"><p class="text-center text-gray-400 text-sm py-2">جاري تحميل الإعلانات...</p></div></div>`;
    const announcementsHtml = `<div class="bg-white p-5 rounded-xl border" style="border-color: var(--border)"><h4 class="font-bold mb-4 text-sm flex items-center gap-2" style="font-family: 'Noto Kufi Arabic'"><i class="fas fa-bullhorn text-blue-600"></i> إدارة الشريط الإعلاني العلوي</h4><form onsubmit="saveAnnouncement(event)" class="grid grid-cols-1 gap-3 mb-4"><textarea id="annText" class="ctrl-input text-sm" rows="2" placeholder="نص الإعلان (مثال: افتتاحية قسم الطوارئ الجديد...)" required></textarea><input type="text" id="annLink" class="ctrl-input text-sm" placeholder="رابط التفاصيل (اتركه فارغاً لإخفاء الزر تماماً)"><input type="text" id="annLinkText" class="ctrl-input text-sm" placeholder="نص الزر (اختياري - افتراضي: اضغط هنا)"><button type="submit" class="py-2.5 rounded-xl text-white font-semibold text-sm" style="background: #2563EB"><i class="fas fa-paper-plane ml-1"></i> نشر الإعلان</button></form><div id="adminAnnouncementList" class="flex flex-col gap-2 max-h-40 overflow-y-auto pr-1"><p class="text-center text-gray-400 text-sm py-2">جاري تحميل الإعلانات...</p></div></div>`;
    const emergencyAdminHtml = `
<div class="bg-white p-5 rounded-xl border" style="border-color: var(--border)">
    <h4 class="font-bold mb-4 text-sm flex items-center gap-2"><i class="fas fa-phone-alt text-red-600"></i> إدارة أرقام الطوارئ والمشافي</h4>
    <form onsubmit="saveEmergencyContact(event)" class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <input type="text" id="emName" class="ctrl-input text-sm" placeholder="اسم الجهة (مثال: الإسعاف)" required>
        <input type="text" id="emPhone" class="ctrl-input text-sm" placeholder="الرقم (مثال: 110)" required>
        <input type="text" id="emIcon" class="ctrl-input text-sm" placeholder="أيقونة فونت أوسم (مثال: fa-ambulance)" required>
        <select id="emColor" class="ctrl-input text-sm">
            <option value="red">أحمر</option>
            <option value="blue">أزرق</option>
            <option value="orange">برتقالي</option>
            <option value="green">أخضر</option>
            <option value="purple">بنفسجي</option>
            <option value="yellow">أصفر</option>
        </select>
        <select id="emCategory" class="ctrl-input text-sm sm:col-span-2">
            <option value="emergency">طوارئ سريع</option>
            <option value="hospital">مستشفى / جهة</option>
        </select>
        <button type="submit" class="sm:col-span-2 py-2.5 rounded-xl text-white font-semibold text-sm" style="background: #DC2626">إضافة الرقم</button>
    </form>
    <div id="adminEmergencyList" class="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1"></div>
</div>`;

// ضع emergencyAdminHtml داخل القائمة الكبيرة للوحة الإدارة
    let listHtml = allData.map(item => `<div class="flex items-center justify-between p-3 rounded-xl border bg-white" style="border-color: var(--border)"><div class="flex flex-col gap-1"><div class="flex items-center gap-3"><span class="badge badge-${item.type}">${item.type}</span><span class="font-semibold text-sm">${escapeHtml(item.name)}</span></div></div><div class="flex gap-2 items-center"> ${['doctor', 'pharmacy'].includes(item.type) ? `
<div class="flex flex-col gap-1">
    <div class="flex gap-1 bg-gray-50 p-1 rounded-lg border" style="border-color: var(--border)">
        <button onclick="setStatus('${item.id}', true)" class="px-2 py-1 rounded text-[11px] font-bold transition-all ${item.isopen === true ? 'bg-green-500 text-white' : 'text-gray-500 hover:bg-gray-100'}">مفتوح</button>
        <button onclick="setStatus('${item.id}', false)" class="px-2 py-1 rounded text-[11px] font-bold transition-all ${item.isopen === false ? 'bg-red-500 text-white' : 'text-gray-500 hover:bg-gray-100'}">مغلق</button>
        <button onclick="setStatus('${item.id}', null)" class="px-2 py-1 rounded text-[11px] font-bold transition-all ${item.isopen == null ? 'bg-gray-700 text-white' : 'text-gray-500 hover:bg-gray-100'}">لا شيء</button>
    </div>
    <button onclick="toggleSubscription('${item.id}', ${!item.is_subscribed})" class="px-2 py-1 rounded text-[11px] font-bold transition-all ${item.is_subscribed ? 'bg-purple-500 text-white' : 'bg-gray-200 text-gray-500 hover:bg-gray-300'}">
        ${item.is_subscribed ? 'مشترك (إلغاء)' : 'تفعيل اشتراك'}
    </button>
</div>
` : ''} <button onclick="editFacility('${item.id}')" class="w-8 h-8 rounded-lg flex items-center justify-center text-blue-600 hover:bg-blue/50"><i class="fas fa-edit"></i></button><button onclick="deleteFacility('${item.id}')" class="w-8 h-8 rounded-lg flex items-center justify-center text-red-600 hover:bg-red-50"><i class="fas fa-trash"></i></button></div></div>`).join(''); 

    const twentyHoursAgo = new Date(Date.now() - (20 * 60 * 60 * 1000)).toISOString();
    const activeBloodRequests = bloodRequests.filter(b => b.created_at > twentyHoursAgo);
    let bloodHtml = activeBloodRequests.length === 0 ? '<p class="text-center py-4 text-gray-400 text-sm">لا توجد استغاثات حالياً.</p>' : activeBloodRequests.map(b => `<div class="flex items-center justify-between p-2 rounded-lg border" style="border-color: var(--border)"><div class="flex items-center gap-3"><span class="blood-type-badge text-sm py-1 px-3">${escapeHtml(b.blood_type)}</span><div><div class="text-sm font-semibold">${escapeHtml(b.patient_name)} ${b.responses_count > 0 ? '<span class="text-xs text-green-500">(مستجيب: '+escapeHtml(b.responses_count)+')</span>' : ''}</div><div class="text-xs text-gray-500">${escapeHtml(b.hospital)}</div></div></div><button onclick="resolveBloodRequest('${b.id}')" class="text-xs text-white px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 transition-colors">إنهاء الطلب</button></div>`).join('');
    let medDonHtml = medicineDonations.length === 0 ? '<p class="text-center py-4 text-gray-400 text-sm">لا توجد مستلزمات طبية مُتبرع او طلب حالياً.</p>' : medicineDonations.map(m => `<div class="flex items-center justify-between p-2 rounded-lg border" style="border-color: var(--border)"><div class="flex items-center gap-3"><i class="fas fa-pills text-green-600"></i><div><div class="text-sm font-semibold">${escapeHtml(m.medicine_name)} (${escapeHtml(m.quantity)})</div><div class="text-xs text-gray-500">ينتهي: ${escapeHtml(m.expiry_date)} | المتبرع: ${escapeHtml(m.donor_name)}</div></div></div><button onclick="resolveMedicineDonation('${m.id}')" class="text-xs text-white px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 transition-colors">حذف/إنهاء</button></div>`).join('');
    const blogAdminHtml = `
<div class="bg-white p-5 rounded-xl border" style="border-color: var(--border)">
    <h4 class="font-bold mb-4 text-sm flex items-center gap-2"><i class="fas fa-newspaper text-blue-600"></i> إدارة المدونة والمقالات</h4>
    <form id="articleForm" onsubmit="saveArticle(event)" class="grid grid-cols-1 gap-3 mb-4">
        <input type="hidden" id="editArtId">
        <input type="text" id="artTitle" class="ctrl-input text-sm" placeholder="عنوان المقال" required>
        <div class="grid grid-cols-2 gap-3">
           <input type="text" id="artCategory" class="ctrl-input text-sm" placeholder="التصنيف (مثال: أطفال، باطنة)">
           <input type="text" id="artImage" class="ctrl-input text-sm" placeholder="رابط الصورة (URL)">
        
        </div>
        <textarea id="artExcerpt" class="ctrl-input text-sm" rows="2" placeholder="ملخص قصير يظهر في بطاقة المقال (اختياري)"></textarea>
        <textarea id="artContent" class="ctrl-input text-sm" rows="6" placeholder="محتوى المقال..." required></textarea>
        <div class="flex gap-2">
            <button type="submit" id="artSubmitBtn" class="flex-1 py-2.5 rounded-xl text-white font-semibold text-sm" style="background: #2563EB">نشر المقال</button>
            <button type="button" onclick="resetArticleForm()" id="artCancelBtn" class="hidden px-4 py-2.5 rounded-xl border font-semibold text-sm" style="border-color: var(--border); color: var(--muted);">إلغاء</button>
        </div>
    </form>
    <div id="adminArticlesList" class="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
        <p class="text-center text-gray-400 text-sm py-2">جاري تحميل المقالات...</p>
    </div>
</div>`;
        openCtrlPanel('لوحة الإدارة', `<div class="flex flex-col gap-6"> 
        ${analyticsHtml} 
        ${announcementsHtml} 
        ${homeAdsHtml} 
        ${announcementsHtml} ${homeAdsHtml} ${radarAdminHtml} ${blogAdminHtml} ${patientsAdminHtml} ${emergencyAdminHtml} <div class="bg-white p-5 rounded-xl border" style="border-color: var(--border)"><h4 class="font-bold mb-4 text-sm flex items-center gap-2" style="font-family: 'Noto Kufi Arabic'"><i class="fas fa-tint text-red-600"></i> إدارة استغاثات الدم (${bloodRequests.length})</h4><div class="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">${bloodHtml}</div></div> <div class="bg-white p-5 rounded-xl border" style="border-color: var(--border)"><h4 class="font-bold mb-4 text-sm flex items-center gap-2" style="font-family: 'Noto Kufi Arabic'"><i class="fas fa-hand-holding-medical text-green-600"></i>إدارة المستلزمات الطبية (${medicineDonations.length})</h4><div class="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">${medDonHtml}</div></div> <div class="bg-white p-5 rounded-xl border" style="border-color: var(--border)"><h4 class="font-bold mb-4 text-sm"><i class="fas fa-plus-circle ml-2" style="color: var(--accent)"></i> <span id="formTitle">إضافة منشأة</span></h4><form onsubmit="saveFacility(event)" class="grid grid-cols-1 sm:grid-cols-2 gap-3"><input type="hidden" id="edit_id"><select id="new_type" class="ctrl-input text-sm" required onchange="updateAdminFormFields(this.value)"><option value="hospital">مشفى</option><option value="center">مركز</option><option value="lab">مخبر</option><option value="doctor">طبيب</option><option value="pharmacy">صيدلية</option></select><input type="text" id="new_name" class="ctrl-input text-sm" placeholder="الاسم" required><input type="text" id="new_specialty" class="ctrl-input text-sm" placeholder="التخصص الأساسي" required><input type="text" id="new_address" class="ctrl-input text-sm" placeholder="العنوان / الموقع" required><input type="text" id="new_phone" class="ctrl-input text-sm" placeholder="رقم الهاتف (اختياري)"><input type="text" id="new_hours" class="ctrl-input text-sm" placeholder="أوقات العمل"><input type="text" id="new_image_url" class="ctrl-input text-sm" placeholder="رابط الصورة (URL)"><input type="text" id="new_custom_password" class="ctrl-input text-sm col-span-1 sm:col-span-2" placeholder="كلمة مرور الطبيب/الصيدلية (6 أحرف فأكثر)"><textarea id="new_desc" class="ctrl-input text-sm col-span-2" placeholder="وصف عام (اختياري)" rows="2"></textarea><div id="adminExtraFields" class="contents"></div><button type="submit" class="col-span-1 sm:col-span-2 py-2.5 rounded-xl text-white font-semibold text-sm" style="background: var(--accent)"><i class="fas fa-save ml-1"></i> حفظ</button></form></div> <div class="bg-white p-5 rounded-xl border" style="border-color: var(--border)"><h4 class="font-bold mb-4 text-sm"><i class="fas fa-list ml-2"></i> المنشآت (${allData.length})</h4><div class="flex flex-col gap-2 max-h-96 overflow-y-auto">${listHtml}</div></div> <button onclick="logoutAdmin()" class="w-full py-2.5 rounded-xl border font-semibold text-sm mt-2" style="border-color: #EF4444; color: #EF4444;"><i class="fas fa-sign-out-alt ml-2"></i> تسجيل الخروج</button> </div>`, '#073D2E'); 
    renderAdminEmergencyList();
    fetchAnnouncements();
    fetchHomeAdsForAdmin();
    updateAdminFormFields('doctor');
    fetchAdminArticles();
        // === رسم الرسوم البيانية التحليلية ===
    setTimeout(() => {
        // 1. رسم توزيع المنشآت
        const ctxFac = document.getElementById('facilitiesChart');
        if (ctxFac) {
            const counts = { hospital: 0, center: 0, lab: 0, doctor: 0, pharmacy: 0 };
            allData.forEach(item => { if(counts[item.type] !== undefined) counts[item.type]++; });
            new Chart(ctxFac, {
                type: 'doughnut',
                data: {
                    labels: ['مشافي', 'مراكز', 'مخابر', 'أطباء', 'صيدليات'],
                    datasets: [{ data: [counts.hospital, counts.center, counts.lab, counts.doctor, counts.pharmacy], backgroundColor: ['#0D9488', '#9333EA', '#DC2626', '#2563EB', '#C4962C'], borderWidth: 0 }]
                },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { font: { family: 'IBM Plex Sans Arabic' } } } } }
            });
        }

        // 2. رسم استغاثات الدم
        const ctxBlood = document.getElementById('bloodChart');
        if (ctxBlood) {
            const bloodCounts = { "A+":0, "B+":0, "O+":0, "AB+":0, "A-":0, "B-":0, "O-":0, "AB-":0 };
            bloodRequests.forEach(req => { if(bloodCounts[req.blood_type] !== undefined) bloodCounts[req.blood_type]++; });
            new Chart(ctxBlood, {
                type: 'bar',
                data: {
                    labels: Object.keys(bloodCounts),
                    datasets: [{ label: 'عدد الاستغاثات', data: Object.values(bloodCounts), backgroundColor: '#DC2626', borderRadius: 8 }]
                },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { ticks: { stepSize: 1 }, grid: { color: 'rgba(0,0,0,0.05)' } }, x: { grid: { display: false } } } }
            });
        }

        // 3. رسم أكثر المقالات قراءةً
        const ctxArt = document.getElementById('articlesChart');
        if (ctxArt) {
            if (topArticles && topArticles.length > 0) {
                // أخذ أول 3 كلمات من العنوان لجعل الرسم البياني أنيقاً وغير مزدحم
                const labels = topArticles.map(a => {
                    const words = a.title.split(' ').slice(0, 3).join(' ');
                    return words + (a.title.split(' ').length > 3 ? '...' : '');
                });
                const data = topArticles.map(a => a.views || 0);

                new Chart(ctxArt, {
                    type: 'bar',
                    data: {
                        labels: labels,
                        datasets: [{
                            label: 'عدد المشاهدات',
                            data: data,
                            // ألوان متدرجة من الأقوى للأضعف
                            backgroundColor: [
                                'rgba(14, 124, 95, 0.9)',  // زمردي (الأكثر قراءة)
                                'rgba(196, 150, 44, 0.9)',  // ذهبي
                                'rgba(37, 99, 235, 0.9)',   // أزرق
                                'rgba(147, 51, 234, 0.9)',  // بنفسجي
                                'rgba(220, 38, 38, 0.9)'    // أحمر (الأقل قراءة)
                            ],
                            borderRadius: 8,
                            borderSkipped: false,
                            barThickness: 24, // عرض الأعمدة
                        }]
                    },
                    options: {
                        indexAxis: 'y', // لجعله أفقياً
                        responsive: true, 
                        maintainAspectRatio: false, 
                        plugins: {
                            legend: { display: false },
                            tooltip: {
                                // إظهار العنوان كاملاً عند تمرير الماوس
                                backgroundColor: 'rgba(7, 61, 46, 0.95)',
                                titleFont: { family: 'Noto Kufi Arabic', size: 14 },
                                bodyFont: { family: 'IBM Plex Sans Arabic', size: 12 },
                                padding: 12,
                                cornerRadius: 8,
                                callbacks: {
                                    title: (context) => topArticles[context[0].dataIndex].title,
                                    label: (context) => `قراءة: ${context.raw} مرة`
                                }
                            }
                        },
                        scales: {
                            x: { 
                                beginAtZero: true,
                                grid: { color: 'rgba(0,0,0,0.05)' }, 
                                ticks: { font: { family: 'IBM Plex Sans Arabic' }, color: '#7A8B7A', stepSize: 1 } 
                            },
                            y: { 
                                grid: { display: false }, 
                                ticks: { font: { family: 'Noto Kufi Arabic', weight: 'bold' }, color: '#1B2A1B' } 
                            }
                        }
                    }
                });
            } else {
                ctxArt.parentElement.innerHTML = '<p style="text-align:center; color:var(--muted); padding: 50px 0; font-size: 0.875rem;">لا توجد مقالات منشورة بعد.</p>';
            }
        }

        // 4. رسم توزيع المستلزمات الطبية
        const ctxMedEq = document.getElementById('medEquivChart');
        if (ctxMedEq) {
            const typeCounts = { 'تبرع': 0, 'إعارة': 0, 'طلب': 0, 'مستلزمات': 0 };
            medicineDonations.forEach(m => {
                if (m.medicine_type.includes('تبرع')) typeCounts['تبرع']++;
                else if (m.medicine_type.includes('إعارة')) typeCounts['إعارة']++;
                else if (m.medicine_type.includes('طلب')) typeCounts['طلب']++;
                else if (m.medicine_type.includes('مستلزمات')) typeCounts['مستلزمات']++;
            });
            new Chart(ctxMedEq, {
                type: 'doughnut',
                data: {
                    labels: ['تبرع', 'إعارة', 'طلبات', 'مستلزمات للتبادل'],
                    datasets: [{ data: [typeCounts['تبرع'], typeCounts['إعارة'], typeCounts['طلب'], typeCounts['مستلزمات']], backgroundColor: ['#10B981', '#F59E0B', '#3B82F6', '#9333EA'], borderWidth: 0 }]
                },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { font: { family: 'IBM Plex Sans Arabic' } } } } }
            });
        }

        // 5. رسم نشاط رادار الرحيبة
        const ctxRadar = document.getElementById('radarChart');
        if (ctxRadar) {
            supabase.from('disease_reports').select('disease_id, season').then(({ data: radarData }) => {
                const counts = {};
                const allDiseases = [...radarDiseasesData.summer, ...radarDiseasesData.winter];
                allDiseases.forEach(d => counts[d.name] = 0);
                radarData?.forEach(r => {
                    const disease = allDiseases.find(d => d.id === r.disease_id);
                    if (disease) counts[disease.name] = (counts[disease.name] || 0) + 1;
                });
                new Chart(ctxRadar, {
                    type: 'bar',
                    data: {
                        labels: Object.keys(counts),
                        datasets: [{ label: 'عدد الحالات المسجلة', data: Object.values(counts), backgroundColor: '#4F46E5', borderRadius: 8 }]
                    },
                    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { ticks: { stepSize: 1 }, grid: { color: 'rgba(0,0,0,0.05)' } }, x: { grid: { display: false } } } }
                });
            });
        }
    }, 500);
}
window.saveAnnouncement = async (e) => {
    e.preventDefault(); 
    const text = document.getElementById('annText').value.trim(); 
    const link = document.getElementById('annLink').value.trim(); 
    
    if (!text) { showToast('الرجاء إدخال نص'); return; }
    
    try { 
        await supabase.from('announcements').insert([{ text, link, is_active: true }]); 
        
        // === إشعار لجميع المستخدمين بوجود إعلان جديد ===
        await sendPushNotification(null, "إعلان جديد 📢", text, 'all');
        
        showToast('تم النشر!', 'success'); 
        e.target.reset(); 
        fetchAnnouncements(); 
    } catch (err) { 
        showToast('حدث خطأ', 'error'); 
    }
};
async function fetchAnnouncements() {
    const { data } = await supabase.from('announcements').select('*').order('created_at', { ascending: false });
    allAnnouncements = data || [];
    const annList = document.getElementById('adminAnnouncementList'); 
    if (annList) {
        if (allAnnouncements.length === 0) { annList.innerHTML = '<p class="text-center text-gray-400 text-sm">لا توجد إعلانات.</p>'; } 
        else { annList.innerHTML = allAnnouncements.map(ann => `<div class="flex items-center justify-between p-2 rounded-lg border"><div class="text-xs truncate flex-1">${escapeHtml(ann.text)}</div><div class="flex gap-1 mr-2"><button onclick="toggleAnnouncement('${ann.id}', ${!ann.is_active})" class="px-2 py-1 rounded text-xs ${ann.is_active ? 'bg-green-500 text-white' : 'bg-gray-200'}">${ann.is_active ? 'مفعّل' : 'معطّل'}</button><button onclick="deleteAnnouncement('${ann.id}')" class="px-2 py-1 rounded text-xs bg-red-500 text-white"><i class="fas fa-trash"></i></button></div></div>`).join(''); }
    }
    renderTopAnnouncement();
}
function renderTopAnnouncement() {
    const navbar = document.getElementById('navbar'); const annBar = document.getElementById('topAnnouncementBar'); const homeSection = document.getElementById('home');
    if (annBar && navbar && homeSection) {
        const activeAnns = allAnnouncements.filter(a => a.is_active);
        if (activeAnns.length > 0) {
            const ann = activeAnns[0]; currentAnnouncement = ann;
            const textEl = document.getElementById('announcementText'); textEl.innerText = ann.text;
            const linkEl = document.getElementById('announcementLink');
            if (ann.link) { let url = ann.link; if (!url.match(/^https?:\/\//i)) { url = 'https://' + url; } linkEl.href = url; linkEl.style.display = 'inline'; textEl.classList.add('no-marquee'); } 
            else { linkEl.style.display = 'none'; textEl.classList.remove('no-marquee'); }
            annBar.classList.remove('hidden'); navbar.style.top = '36px'; homeSection.style.paddingTop = '11rem';
        } else { currentAnnouncement = null; annBar.classList.add('hidden'); navbar.style.top = '0px'; homeSection.style.paddingTop = '6rem'; }
    }
}
window.toggleAnnouncement = async (id, status) => { try { await supabase.from('announcements').update({ is_active: status }).eq('id', id); showToast('تم التحديث'); } catch (err) { showToast('خطأ'); } };
window.deleteAnnouncement = async (id) => { try { await supabase.from('announcements').delete().eq('id', id); showToast('تم الحذف'); } catch (err) { showToast('خطأ'); } };
window.editFacility = (id) => { 
    const item = allData.find(d => d.id === id); if (!item) return; 
    document.getElementById('edit_id').value = id; document.getElementById('new_type').value = item.type; 
    updateAdminFormFields(item.type); 
    setTimeout(() => {
        document.getElementById('new_name').value = item.name; 
        document.getElementById('new_specialty').value = item.specialty || ''; 
        document.getElementById('new_address').value = item.address || item.clinic || ''; 
        document.getElementById('new_phone').value = item.phone; 
        document.getElementById('new_hours').value = item.hours; 
        document.getElementById('new_desc').value = item.description; 
       
        if(document.getElementById('new_facility_phone')) document.getElementById('new_facility_phone').value = item.phone || '';
                if (item.type === 'hospital' || item.type === 'center') { 
        if(document.getElementById('new_capacity_info')) document.getElementById('new_capacity_info').value = item.capacity_info || '';
        
        if (item.facility_details) {
            const cData = item.facility_details;
            if (cData.stats) cData.stats.forEach(s => { addAdminRow('statsContainer', ['icon', 'value', 'label']); const lastRow = document.querySelector('#statsContainer > div:last-child'); if(lastRow){ lastRow.querySelector('.row-icon').value = s.icon || ''; lastRow.querySelector('.row-value').value = s.value || ''; lastRow.querySelector('.row-label').value = s.label || ''; } });
            if (cData.departments) cData.departments.forEach(d => { addAdminRow('deptContainer', ['icon', 'title', 'desc']); const lastRow = document.querySelector('#deptContainer > div:last-child'); if(lastRow){ lastRow.querySelector('.row-icon').value = d.icon || ''; lastRow.querySelector('.row-title').value = d.title || ''; lastRow.querySelector('.row-desc').value = d.desc || ''; } });
            if (cData.units) cData.units.forEach(u => { addAdminRow('unitContainer', ['title', 'desc']); const lastRow = document.querySelector('#unitContainer > div:last-child'); if(lastRow){ lastRow.querySelector('.row-title').value = u.title || ''; lastRow.querySelector('.row-desc').value = u.desc || ''; } });
            if (cData.services) cData.services.forEach(s => { addAdminRow('servContainer', ['title', 'desc']); const lastRow = document.querySelector('#servContainer > div:last-child'); if(lastRow){ lastRow.querySelector('.row-title').value = s.title || ''; lastRow.querySelector('.row-desc').value = s.desc || ''; } });
            
            // جلب أرقام الهواتف المتعددة عند التعديل
            if (cData.phones && cData.phones.length > 0) {
                cData.phones.forEach(p => {
                    addAdminRow('phoneContainer', ['label', 'phone']);
                    const lastRow = document.querySelector('#phoneContainer > div:last-child');
                    if(lastRow){
                        lastRow.querySelector('.row-label').value = p.label || '';
                        lastRow.querySelector('.row-phone').value = p.phone || '';
                    }
                });
            }
        }
    }
         else if (item.type === 'doctor') { 
        document.getElementById('new_consult_hours').value = item.consulthours || ''; 
        document.getElementById('new_extra').value = item.bookingnotes || ''; 
        if(document.getElementById('new_parent_id')) document.getElementById('new_parent_id').value = item.parent_id || '';
        const allowed = item.allowed_systems || ['manual'];
        document.getElementById('allow_manual').checked = allowed.includes('manual');
        document.getElementById('allow_slots').checked = allowed.includes('slots');
    } 
        
        else if (item.type === 'pharmacy') { 
            document.getElementById('new_night_details').value = item.nightdetails || ''; 
            document.getElementById('new_extra').value = item.description || ''; 
        } 
        else if (item.type === 'lab') { 
            document.getElementById('new_extra').value = item.tests || ''; 
            document.getElementById('new_home_sample').value = item.homesample || 'لا'; 
        } 
        if(document.getElementById('new_latlng')) document.getElementById('new_latlng').value = item.latlng || '';
    }, 100);
    document.getElementById('new_image_url').value = item.image || ''; 
    document.getElementById('formTitle').textContent = `تعديل: ${item.name}`; 
    window.scrollTo({ top: 0, behavior: 'smooth' }); 
}

window.deleteFacility = async (id) => { 
    if (!confirm("متأكد من الحذف؟")) return; 
    try { 
        await supabase.from('listings').delete().eq('id', id); 
        localStorage.setItem('force_listings_update', 'true'); 
        showToast('تم الحذف', 'success'); 
        await fetchListings(); 
        renderAdminDashboard(); 
    } catch (e) { showToast('حدث خطأ', 'error'); } 
}
window.saveFacility = async (e) => { 
    e.preventDefault(); 
    const id = document.getElementById('edit_id').value; 
    const type = document.getElementById('new_type').value; 
    const name = document.getElementById('new_name').value; 
    const specialty = document.getElementById('new_specialty').value; 
    const address = document.getElementById('new_address').value; 
    const phone = document.getElementById('new_phone').value; 
    const hours = document.getElementById('new_hours').value; 
    const desc = document.getElementById('new_desc').value; 
    const imgURL = document.getElementById('new_image_url').value.trim(); 
    
    let data = { type, name, phone, hours, description: desc, rating: 4.0 }; 
    if(document.getElementById('new_latlng')) data.latlng = document.getElementById('new_latlng').value.trim();
    if (imgURL) data.image = imgURL; 
    
    // قراءة كلمة المرور التي أدخلها الأدمن يدوياً
    const customPassword = document.getElementById('new_custom_password').value.trim();
        // === تحديث كلمة المرور إذا كنا في وضع التعديل وأدخل الأدمن كلمة جديدة ===
    if (id && (type === 'doctor' || type === 'pharmacy') && customPassword.length >= 6) {
        const item = allData.find(d => d.id === id);
        if (item && item.user_id) {
            try {
                await supabase.functions.invoke('create-user', {
                    body: { action: 'update', user_id: item.user_id, password: customPassword , type: type}
                });
                showToast('تم تحديث كلمة المرور بنجاح', 'success');
            } catch (err) {
                showToast('خطأ في تحديث كلمة المرور', 'error');
            }
        }
    }
    
    if (!id && (type === 'doctor' || type === 'pharmacy')) { 
        if (!customPassword || customPassword.length < 6) {
            showToast('يرجى إدخال كلمة مرور (6 أحرف على الأقل)');
            return;
        }
        const randomPart = generateUniqueId();
                const dummyEmail = type === 'doctor' ? `doc_${customPassword.toLowerCase()}@lomedx.app` : `pharm_${customPassword.toLowerCase()}@lomedx.app`;
        
        try {
            // استدعاء دالة السيرفر لإنشاء المستخدم دون تسجيل خروج الأدمن
            const { data: funcData, error: funcError } = await supabase.functions.invoke('create-user', {
                body: { email: dummyEmail, password: customPassword }
            });
            
            if (funcError || !funcData || !funcData.user_id) { 
                showToast('خطأ في إنشاء حساب الدخول: ' + (funcError?.message || 'خطأ غير معروف'), 'error');
                return; 
            }
            data.user_id = funcData.user_id; 
        } catch (err) {
            showToast('خطأ في الاتصال بالسيرفر.', 'error');
            return;
        }
    } 
    
    if (type === 'hospital' || type === 'center') { 
        data.specialty = specialty; 
        data.address = address; 
        data.capacity_info = document.getElementById('new_capacity_info')?.value || '';
        
        let facilityData = { stats: [], departments: [], clinics: [], units: [], services: [], phones: [] };
        
        document.querySelectorAll('#statsContainer > div').forEach(row => {
            facilityData.stats.push({ icon: row.querySelector('.row-icon')?.value, value: row.querySelector('.row-value')?.value, label: row.querySelector('.row-label')?.value });
        });
        document.querySelectorAll('#deptContainer > div').forEach(row => {
            facilityData.departments.push({ icon: row.querySelector('.row-icon')?.value, title: row.querySelector('.row-title')?.value, desc: row.querySelector('.row-desc')?.value });
        });
        document.querySelectorAll('#unitContainer > div').forEach(row => {
            facilityData.units.push({ title: row.querySelector('.row-title')?.value, desc: row.querySelector('.row-desc')?.value });
        });
        document.querySelectorAll('#servContainer > div').forEach(row => {
            facilityData.services.push({ title: row.querySelector('.row-title')?.value, desc: row.querySelector('.row-desc')?.value });
        });
        
        document.querySelectorAll('#phoneContainer > div').forEach(row => {
            const pLabel = row.querySelector('.row-label')?.value || '';
            const pPhone = row.querySelector('.row-phone')?.value || '';
            if (pPhone) facilityData.phones.push({ label: pLabel, phone: pPhone });
        });

        data.phone = facilityData.phones[0]?.phone || ''; 
        data.facility_details = facilityData;
    } 
         else if (type === 'doctor') { 
        data.specialty = specialty; 
        data.clinic = address; 
        data.consulthours = document.getElementById('new_consult_hours')?.value || ''; 
        data.bookingnotes = document.getElementById('new_extra')?.value || ''; 
        data.parent_id = document.getElementById('new_parent_id')?.value || '';
        const systems = [];
        if (document.getElementById('allow_manual').checked) systems.push('manual');
        if (document.getElementById('allow_slots').checked) systems.push('slots');
        if (systems.length === 0) systems.push('manual'); // افتراضي
        data.allowed_systems = systems;
    } 
    else if (type === 'pharmacy') { 
        data.address = address; 
        data.night = false; 
        data.nightdetails = document.getElementById('new_night_details')?.value || ''; 
        data.description = document.getElementById('new_extra')?.value || ''; 
    } 
    else if (type === 'lab') { 
        data.specialty = specialty; 
        data.address = address; 
        data.tests = document.getElementById('new_extra')?.value || ''; 
        data.homesample = document.getElementById('new_home_sample')?.value || 'لا'; 
    } 
    
    try { 
        if (id) { 
            const { error } = await supabase.from('listings').update(data).eq('id', id); 
            if (error) throw error; 
            showToast('تم التعديل!', 'success'); 
        } else { 
            if (!data.image) data.image = `https://picsum.photos/seed/new${Date.now()}/400/250`; 
            const { error } = await supabase.from('listings').insert([data]); 
            if (error) throw error; 
            
            showToast('تمت إضافة المنشأة وإنشاء حساب الدخول بنجاح!', 'success');
        } 
        localStorage.setItem('force_listings_update', 'true');
        await fetchListings(); 
        renderAdminDashboard(); 
    } catch (err) { 
        showToast('خطأ في الحفظ: ' + err.message, 'error');
        
    } 
};
        
window.openHealthFile = async () => {
    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
        // فحص قاعدة البيانات بالتوازي: هل هو طبيب/صيدلي؟ وهل هو أدمن؟
        const [listingRes, adminRes] = await Promise.all([
            supabase.from('listings').select('id').eq('user_id', session.user.id).maybeSingle(),
            supabase.rpc('is_admin') // استدعاء دالة الأدمن الخاصة بك من قاعدة البيانات
        ]);

        const isStaff = listingRes.data; // طبيب أو صيدلي
        const isAdmin = adminRes.data;   // أدمن

        // إذا كان المستخدم طبيباً، صيدلياً، أو أدمن، نقوم بتسجيل خروجه لمنع تضارب الجلسات
        if (isStaff || isAdmin) {
            await supabase.auth.signOut();
            showToast('تم تسجيل الخروج من حساب العمل. يرجى تسجيل الدخول كمريض.');
            
            // عرض شاشة الدخول الخاصة بالمرضى
            openCtrlPanel('الملف الصحي الذكي', `
                <div class="flex flex-col gap-4 max-w-md mx-auto w-full">
                    <div class="bg-pink-50 border border-pink-200 rounded-xl p-4 text-pink-800 text-sm flex items-center gap-3">
                        <i class="fas fa-shield-heart text-xl"></i>
                        <span>ملفك الطبي الخاص، محمي بأمان عالي. يمكنك تسجيل الدخول بحساب Google لسرعة الوصول، أو عبر البريد الإلكتروني.</span>
                    </div>
                
                    <button onclick="signInWithGoogle()" class="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold py-3 rounded-xl transition-all shadow-sm">
                        <svg class="w-5 h-5" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path><path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path><path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path><path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path></svg>
                        المتابعة عبر حساب Google
                    </button>

                    <div class="relative my-2">
                        <div class="absolute inset-0 flex items-center"><div class="w-full border-t border-gray-300"></div></div>
                        <div class="relative flex justify-center"><span class="bg-transparent px-4 text-xs text-gray-500">أو سجل عبر البريد الإلكتروني</span></div>
                    </div>

                    <div class="flex gap-2 bg-gray-100 p-1 rounded-xl">
                        <button onclick="switchHealthTab('login')" id="tabLoginBtn" class="flex-1 py-2 rounded-lg text-sm font-bold bg-white shadow">تسجيل الدخول</button>
                        <button onclick="switchHealthTab('register')" id="tabRegBtn" class="flex-1 py-2 rounded-lg text-sm font-bold text-gray-500">حساب جديد</button>
                    </div>
                    <form id="loginForm" onsubmit="handleHealthLogin(event)" class="flex flex-col gap-3">
                        <input type="email" id="loginEmail" class="ctrl-input" placeholder="البريد الإلكتروني" required>
                        <input type="password" id="loginPassword" class="ctrl-input" placeholder="كلمة المرور" required>
                        <button type="submit" class="w-full py-3 rounded-xl text-white font-bold text-sm" style="background: #EC4899">دخول</button>
                    </form>
                    <form id="registerForm" onsubmit="handleHealthRegister(event)" class="hidden flex-col gap-3">
                        <input type="text" id="regFullName" class="ctrl-input" placeholder="الاسم الكامل" required>
                        <input type="email" id="regEmail" class="ctrl-input" placeholder="البريد الإلكتروني" required>
                        <input type="password" id="regPassword" class="ctrl-input" placeholder="اختر كلمة مرور قوية" required>
                        <button type="submit" class="w-full py-3 rounded-xl text-white font-bold text-sm" style="background: #EC4899">إنشاء الملف</button>
                    </form>
                </div>
            `, '#EC4899');
            return;
        }

        // إذا وصلنا إلى هنا، فالمستخدم ليس أدمن ولا طبيب/صيدلي => هو مريض
        currentHealthFileId = session.user.id;
        
        const { data: docSnap, error: fetchError } = await supabase.from('health_files').select('*').eq('id', currentHealthFileId).maybeSingle();
        
        if (fetchError) { 
            showToast('خطأ في جلب البيانات: ' + fetchError.message); 
            return; 
        }
        
        if (docSnap) { 
            renderHealthDashboard(docSnap); 
            return; 
        } else {
            const defaultName = session.user.email ? session.user.email.split('@')[0] : 'مريض';
            const newQrToken = generateSecureQrToken();
            const { data: newFile, error: insertError } = await supabase.from('health_files').insert([{ id: currentHealthFileId, full_name: defaultName, qr_token: newQrToken }]).select().single();
            if (insertError) {
                showToast('تعذر إنشاء ملف صحي جديد: ' + insertError.message, 'error');
                return;
            }
            if (newFile) { 
                renderHealthDashboard(newFile); 
                return; 
            }
        }
    }

    // إذا لم يكن مسجل دخول أبداً، اعرض له شاشة الدخول
    openCtrlPanel('الملف الصحي الذكي', `
        <div class="flex flex-col gap-4 max-w-md mx-auto w-full">
            <div class="bg-pink-50 border border-pink-200 rounded-xl p-4 text-pink-800 text-sm flex items-center gap-3">
                <i class="fas fa-shield-heart text-xl"></i>
                <span>ملفك الطبي الخاص، محمي بأمان عالي. يمكنك تسجيل الدخول بحساب Google لسرعة الوصول، أو عبر البريد الإلكتروني.</span>
            </div>
        
            <button onclick="signInWithGoogle()" class="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold py-3 rounded-xl transition-all shadow-sm">
                <svg class="w-5 h-5" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path><path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path><path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path><path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path></svg>
                المتابعة عبر حساب Google
            </button>

            <div class="relative my-2">
                <div class="absolute inset-0 flex items-center"><div class="w-full border-t border-gray-300"></div></div>
                <div class="relative flex justify-center"><span class="bg-transparent px-4 text-xs text-gray-500">أو سجل عبر البريد الإلكتروني</span></div>
            </div>

            <div class="flex gap-2 bg-gray-100 p-1 rounded-xl">
                <button onclick="switchHealthTab('login')" id="tabLoginBtn" class="flex-1 py-2 rounded-lg text-sm font-bold bg-white shadow">تسجيل الدخول</button>
                <button onclick="switchHealthTab('register')" id="tabRegBtn" class="flex-1 py-2 rounded-lg text-sm font-bold text-gray-500">حساب جديد</button>
            </div>
            <form id="loginForm" onsubmit="handleHealthLogin(event)" class="flex flex-col gap-3">
                <input type="email" id="loginEmail" class="ctrl-input" placeholder="البريد الإلكتروني" required>
                <input type="password" id="loginPassword" class="ctrl-input" placeholder="كلمة المرور" required>
                <button type="submit" class="w-full py-3 rounded-xl text-white font-bold text-sm" style="background: #EC4899">دخول</button>
            </form>
            <form id="registerForm" onsubmit="handleHealthRegister(event)" class="hidden flex-col gap-3">
                <input type="text" id="regFullName" class="ctrl-input" placeholder="الاسم الكامل" required>
                <input type="email" id="regEmail" class="ctrl-input" placeholder="البريد الإلكتروني" required>
                <input type="password" id="regPassword" class="ctrl-input" placeholder="اختر كلمة مرور قوية" required>
                <button type="submit" class="w-full py-3 rounded-xl text-white font-bold text-sm" style="background: #EC4899">إنشاء الملف</button>
            </form>
        </div>
    `, '#EC4899');
};

window.signInWithGoogle = async () => {
    sessionStorage.setItem('google_login_intent', 'true');
    
    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: window.location.href
        }
    });
    if (error) {
        sessionStorage.removeItem('google_login_intent');
        showToast('حدث خطأ أثناء الاتصال بـ Google', 'error');
        
    }
};

window.handleHealthRegister = async (e) => {
    e.preventDefault();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value.trim();
        if (password.length < 6) {
        showToast('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
        return;
    }
    const fullName = document.getElementById('regFullName').value.trim();

    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) { 
        showToast('حدث خطأ أثناء التسجيل: ' + error.message, 'error');
        return; 
    }
    
    const userId = data.user.id;
    
        const { error: dbError } = await supabase.from('health_files').insert([{ id: userId, full_name: fullName, qr_token: generateSecureQrToken() }]);
    if (dbError) { 
        showToast('تم إنشاء الحساب ولكن حدث خطأ في قاعدة البيانات'); 
        return; 
    }

    showToast('تم إنشاء الحساب بنجاح! يرجى تأكيد بريدك الإلكتروني ثم تسجيل الدخول.', 'success');
    switchHealthTab('login'); 
}
window.handleHealthLogin = async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value.trim();

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { 
        
        showToast('بيانات الدخول غير صحيحة. يرجى التحقق من البريد وكلمة المرور.', 'error'); 
        return; 
    }

    currentHealthFileId = data.user.id;
    localStorage.setItem('healthFileId', currentHealthFileId);
    
    let { data: fileData, error: fileError } = await supabase.from('health_files').select('*').eq('id', currentHealthFileId).maybeSingle();
    
    if (fileError) { 
        
         showToast('خطأ في جلب الملف: ' + fileError.message, 'error');
        return; 
    }
    
    if (!fileData) {
        const defaultName = data.user.email ? data.user.email.split('@')[0] : 'مريض';
                const { data: newFile, error: insertError } = await supabase.from('health_files').insert([{ id: currentHealthFileId, full_name: defaultName, qr_token: generateSecureQrToken() }]).select().single();
        if (insertError) {
            
            showToast('تعذر إنشاء ملف صحي: ' + insertError.message, 'error');
            return;
        }
        fileData = newFile;
    }
    
    renderHealthDashboard(fileData);
};
 window.renderHealthDashboard = (data) => {
    // فك تشفير البيانات قبل عرضها للمريض
    const encryptionKey = data.qr_token || currentHealthFileId;
    data = decryptHealthFile(data, encryptionKey);

    openCtrlPanel(`الملف الصحي: ${data.full_name || 'مريض'}`,  `
        <div class="bg-white p-6 rounded-2xl border-2 flex flex-col items-center" style="border-color: #EC4899;">
    <div class="flex items-center justify-between w-full mb-3">
        <div class="text-sm font-bold text-pink-500">رمز الطوارئ الطبي (QR)</div>
        <button onclick="regenerateQrToken()" class="text-[10px] bg-pink-100 text-pink-700 px-2 py-1 rounded-lg font-bold hover:bg-pink-200 transition-all">
            <i class="fas fa-rotate ml-1"></i> تغيير الرمز
        </button>
       </div>
    <div id="qrcode" class="bg-white p-3 rounded-xl border" style="border-color: var(--border)"></div>
      <p class="text-xs text-gray-500 mt-3 text-center">وجه الطبيب لمسح هذا الرمز للوصول لملفك فوراً دون كلمة مرور</p>
          </div>
            <form onsubmit="saveHealthProfile(event)" class="bg-white p-5 rounded-xl border grid grid-cols-1 sm:grid-cols-2 gap-3" style="border-color: var(--border)">
                <div class="col-span-1 sm:col-span-2"><label class="text-xs font-bold text-gray-500">الاسم الكامل</label><input type="text" id="hfFullName" class="ctrl-input" value="${escapeHtml(data.full_name || data.fullName || '')}" required></div>
                <div><label class="text-xs font-bold text-gray-500">العمر</label><input type="number" id="hfAge" class="ctrl-input" value="${escapeHtml(data.age || '')}"></div>
                <div><label class="text-xs font-bold text-gray-500">الجنس</label><select id="hfGender" class="ctrl-input"><option value="ذكر" ${data.gender === 'ذكر' ? 'selected' : ''}>ذكر</option><option value="أنثى" ${data.gender === 'أنثى' ? 'selected' : ''}>أنثى</option></select></div>
                <div><label class="text-xs font-bold text-gray-500">فصيلة الدم</label><select id="hfBloodType" class="ctrl-input">${["A+","A-","B+","B-","AB+","AB-","O+","O-","غير معروف"].map(t => `<option value="${t}" ${data.blood_type === t ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
                <div><label class="text-xs font-bold text-gray-500">الوزن (كغ)</label><input type="text" id="hfWeight" class="ctrl-input" value="${escapeHtml(data.weight || '')}"></div>
                <div class="col-span-1 sm:col-span-2"><label class="text-xs font-bold text-gray-500">الأمراض المزمنة</label><input type="text" id="hfDiseases" class="ctrl-input" value="${escapeHtml(data.diseases || '')}" placeholder="مثال: سكري، ضغط"></div>
                <div class="col-span-1 sm:col-span-2"><label class="text-xs font-bold text-gray-500">الحساسية (دوائية/غذائية)</label><input type="text" id="hfAllergies" class="ctrl-input" value="${escapeHtml(data.allergies || '')}" placeholder="مثال: بنسلين، مكسرات"></div>
                <div class="col-span-1 sm:col-span-2"><label class="text-xs font-bold text-gray-500">الأدوية الحالية</label><input type="text" id="hfMedications" class="ctrl-input" value="${escapeHtml(data.medications || '')}"></div>
                
                <div class="col-span-1 sm:col-span-2 mt-2 p-3 rounded-xl border" style="border-color: #FED7AA; background: #FFF7ED;">
                    <label class="text-xs font-bold text-orange-700 flex items-center gap-1"><i class="fas fa-tooth"></i> سجل الأسنان (يُقرأ فقط من قبل طبيب الأسنان)</label>
                    <textarea id="hfDental" class="ctrl-input mt-2" rows="2" placeholder="عمليات سابقة، تقويم، حساسية معينة...">${escapeHtml(data.dental || '')}</textarea>
                </div>

                <div class="col-span-1 sm:col-span-2 p-3 rounded-xl border" style="border-color: #BFDBFE; background: #EFF6FF;">
                    <label class="text-xs font-bold text-blue-700 flex items-center gap-1"><i class="fas fa-eye"></i> سجل العيون (يُقرأ فقط من قبل طبيب العيون)</label>
                    <textarea id="hfEye" class="ctrl-input mt-2" rows="2" placeholder="وصفة النظارة، ضغط العين، عمليات ليزك...">${escapeHtml(data.eye || '')}</textarea>
                </div>

                <div><label class="text-xs font-bold text-gray-500">اسم جهة الطوارئ</label><input type="text" id="hfEmergencyName" class="ctrl-input" value="${escapeHtml(data.emergency_name || '')}"></div>
                <div><label class="text-xs font-bold text-gray-500">هاتف جهة الطوارئ</label><input type="tel" id="hfEmergencyPhone" class="ctrl-input" value="${escapeHtml(data.emergency_phone || '')}"></div>
                <button type="submit" class="col-span-1 sm:col-span-2 py-3 rounded-xl text-white font-bold text-sm" style="background: #EC4899"><i class="fas fa-save ml-2"></i> حفظ التحديثات</button>
            </form>
            
            <div class="bg-white p-5 rounded-xl border" style="border-color: var(--border)">
                <h4 class="font-bold mb-4 text-sm flex items-center gap-2"><i class="fas fa-file-medical text-blue-600"></i> روشتي الطبية السابقة</h4>
                <div class="flex flex-col gap-4 mt-2">
                    ${data.prescriptions && data.prescriptions.length > 0 ? 
                        data.prescriptions.slice().reverse().map(rx => `
                            <div class="bg-gradient-to-br from-white to-blue-50/40 p-5 rounded-2xl border-2 border-dashed border-blue-300 relative shadow-sm">
                                <button onclick="deletePrescription('${rx.date}')" class="absolute top-3 left-3 w-8 h-8 rounded-full bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center shadow-sm" title="حذف الروشتة">
                                    <i class="fas fa-trash-alt text-xs"></i>
                                </button>
                                <div class="flex justify-between items-center mb-4 pb-3 border-b border-blue-200">
                                    <div class="flex items-center gap-2">
                                        <div class="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600"><i class="fas fa-user-md"></i></div>
                                        <div>
                                            <div class="font-bold text-blue-800 text-sm">د. ${escapeHtml(rx.doctor || 'طبيب')}</div>
                                            <div class="text-[10px] text-gray-500">${new Date(rx.date).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                                        </div>
                                    </div>
                                    <i class="fas fa-prescription-bottle-medical text-2xl text-blue-200"></i>
                                </div>
                                <div class="whitespace-pre-line font-sans text-gray-800 text-sm leading-loose" style="white-space: pre-wrap;">${escapeHtml(rx.text)}</div>
                                <div class="mt-4 pt-4 border-t-2 border-double border-blue-300 flex justify-between items-end">
                                    <div class="flex flex-col gap-0.5">
                                        <span class="font-bold text-sm text-blue-900" style="font-family: 'Noto Kufi Arabic'">${escapeHtml(rx.doctor || 'طبيب')}</span>
                                        <span class="text-[10px] text-gray-500">${escapeHtml(rx.specialty || 'طبيب عام')}</span>
                                        <span class="text-[10px] text-gray-400">${new Date(rx.date).toLocaleString('ar-EG', { date: 'short', time: 'short' })}</span>
                                    </div>
                                    <div class="flex flex-col items-end gap-1">
                                        <span class="bg-green-100 text-green-700 text-[9px] font-bold px-2 py-1 rounded-full flex items-center gap-1 border border-green-200">
                                            <i class="fas fa-shield-halved"></i> موثقة إلكترونياً
                                        </span>
                                        <span class="text-[9px] text-gray-400 font-mono" dir="ltr">VRX: ${escapeHtml(rx.verCode || 'N/A')}</span>
                                    </div>
                                </div>
                            </div> 
                        `).join('') 
                    : '<div class="text-center py-8 text-gray-400 text-sm flex flex-col items-center gap-2"><i class="fas fa-file-prescription text-4xl text-gray-200 mb-2"></i>لا توجد روشتات طبية محفوظة حالياً.</div>'}
                </div>
            </div>
            
            <button onclick="logoutHealthFile()" class="w-full py-3 rounded-xl border font-bold text-sm mt-4" style="border-color: #EC4899; color: #EC4899;">
                <i class="fas fa-sign-out-alt ml-2"></i> تسجيل الخروج من الملف الصحي
            </button>
        </div>
    `, '#EC4899');
    
        const qrContainer = document.getElementById('qrcode');
    if (qrContainer) {
        qrContainer.innerHTML = '';
        // استخدام الـ token إذا كان موجوداً، وإلا نستخدم الـ ID مؤقتاً للملفات القديمة
        const qrToken = data.qr_token || currentHealthFileId; 
        new QRCode(qrContainer, { text: qrToken, width: 180, height: 180, colorDark: "#000000", colorLight: "#ffffff", correctLevel: QRCode.CorrectLevel.H });
    }
}

window.saveHealthProfile = async (e) => {
    e.preventDefault();
    
    // 1. جلب الرمز السري لاستخدامه في التشفير
    const { data: userData } = await supabase.from('health_files').select('qr_token').eq('id', currentHealthFileId).single();
    const key = userData?.qr_token || currentHealthFileId;

    // 2. قراءة البيانات من الحقول وتشفيرها
    const encryptedData = {
        full_name: encryptField(document.getElementById('hfFullName').value, key),
        age: encryptField(document.getElementById('hfAge').value, key),
        gender: encryptField(document.getElementById('hfGender').value, key),
        blood_type: encryptField(document.getElementById('hfBloodType').value, key),
        weight: encryptField(document.getElementById('hfWeight').value, key),
        diseases: encryptField(document.getElementById('hfDiseases').value, key),
        allergies: encryptField(document.getElementById('hfAllergies').value, key),
        medications: encryptField(document.getElementById('hfMedications').value, key),
        dental: encryptField(document.getElementById('hfDental').value, key),
        eye: encryptField(document.getElementById('hfEye').value, key),
        emergency_name: encryptField(document.getElementById('hfEmergencyName').value, key),
        emergency_phone: encryptField(document.getElementById('hfEmergencyPhone').value, key)
    };

    try { 
        await supabase.from('health_files').update(encryptedData).eq('id', currentHealthFileId); 
        showToast('تم الحفظ والتشفير بنجاح!', 'success'); 
        
        // إعادة جلب البيانات وفك تشفيرها لعرضها للمريض
        const { data: updatedFile } = await supabase.from('health_files').select('*').eq('id', currentHealthFileId).maybeSingle();
        if (updatedFile) renderHealthDashboard(updatedFile);
    } catch (err) { showToast('حدث خطأ', 'error'); }
}
window.regenerateQrToken = async () => {
    if (!confirm("هل أنت متأكد من تغيير رمز QR؟ سيتم إعادة تشفير بياناتك بمفتاح جديد.")) return;
    try {
        // 1. جلب المفتاح القديم والبيانات الحالية
        const { data: currentFile } = await supabase.from('health_files').select('*').eq('id', currentHealthFileId).maybeSingle();
        if (!currentFile) return;
        
        const oldKey = currentFile.qr_token;
        // 2. فك تشفير البيانات القديمة
        const decryptedData = decryptHealthFile(currentFile, oldKey);

        // 3. توليد مفتاح جديد
        const newKey = generateSecureQrToken();

        // 4. إعادة تشفير البيانات بالمفتاح الجديد
        const newEncryptedData = {
            qr_token: newKey,
            full_name: encryptField(decryptedData.full_name, newKey),
            age: encryptField(decryptedData.age, newKey),
            gender: encryptField(decryptedData.gender, newKey),
            blood_type: encryptField(decryptedData.blood_type, newKey),
            weight: encryptField(decryptedData.weight, newKey),
            diseases: encryptField(decryptedData.diseases, newKey),
            allergies: encryptField(decryptedData.allergies, newKey),
            medications: encryptField(decryptedData.medications, newKey),
            dental: encryptField(decryptedData.dental, newKey),
            eye: encryptField(decryptedData.eye, newKey),
            emergency_name: encryptField(decryptedData.emergency_name, newKey),
            emergency_phone: encryptField(decryptedData.emergency_phone, newKey)
        };

        // 5. حفظ الرمز الجديد والبيانات المعاد تشفيرها
        await supabase.from('health_files').update(newEncryptedData).eq('id', currentHealthFileId);
        showToast('تم تغيير الرمز وإعادة تشفير البيانات بنجاح!', 'success');

        // إعادة تحميل اللوحة
        const { data: updatedFile } = await supabase.from('health_files').select('*').eq('id', currentHealthFileId).maybeSingle();
        if (updatedFile) renderHealthDashboard(updatedFile);
    } catch (err) {
        
        showToast('حدث خطأ أثناء تغيير الرمز', 'error');
    }
}
window.logoutHealthFile = async () => { 
    await supabase.auth.signOut();
    localStorage.removeItem('healthFileId'); 
    currentHealthFileId = null; 
    closeCtrlPanel(); 
    showToast('تم تسجيل الخروج بنجاح', 'success'); 
}
async function trackAndDisplayVisitors() {
    const cachedVisitors = localStorage.getItem('cached_visitors') || '0';
    const cachedViews = localStorage.getItem('cached_views') || '0';
    const lastFetch = parseInt(localStorage.getItem('stats_last_fetch') || '0');
    const oneHour = 60 * 60 * 1000;
    animateCounter(parseInt(cachedVisitors), 'visitorCount');
    animateCounter(parseInt(cachedViews), 'viewsCount');

    try {
        const { data: vData } = await supabase.from('site_stats').select('count').eq('id', 'views_metrics').single();
        const newViews = (vData?.count || 0) + 1;
        await supabase.from('site_stats').upsert({ id: 'views_metrics', count: newViews });

        const isNewSession = !sessionStorage.getItem('hasVisitedRaheba');
        if (isNewSession) {
            const { data: visData } = await supabase.from('site_stats').select('count').eq('id', 'visitor_metrics').single();
            const newVisitors = (visData?.count || 0) + 1;
            await supabase.from('site_stats').upsert({ id: 'visitor_metrics', count: newVisitors });
            sessionStorage.setItem('hasVisitedRaheba', 'true');
        }

        if (Date.now() - lastFetch > oneHour) {
            const { data: visSnap } = await supabase.from('site_stats').select('count').eq('id', 'visitor_metrics').single();
            const { data: viewsSnap } = await supabase.from('site_stats').select('count').eq('id', 'views_metrics').single();
            const realVisitors = visSnap?.count || 0;
            const realViews = viewsSnap?.count || 0;
            localStorage.setItem('cached_visitors', realVisitors.toString());
            localStorage.setItem('cached_views', realViews.toString());
            localStorage.setItem('stats_last_fetch', Date.now().toString());
            animateCounter(realVisitors, 'visitorCount');
            animateCounter(realViews, 'viewsCount');
        }
    } catch (error) {
    }
}
function animateCounter(target, elementId) {
    const el = document.getElementById(elementId); if (!el) return;
    let current = 0; const duration = 2000; const stepTime = 30; const steps = duration / stepTime; const inc = Math.max(1, Math.floor(target / steps));
    const timer = setInterval(() => { current += inc; if (current >= target) { current = target; clearInterval(timer); } el.innerText = current.toLocaleString('ar-EG'); }, stepTime);
}

window.renderAdSlide = (index) => {
    const container = document.getElementById('homeAdContainer'); const dotsContainer = document.getElementById('adDots');
    if (!container || activeAds.length === 0) return;
    const ad = activeAds[index]; let mediaHTML = '';
    if (adInterval) { clearTimeout(adInterval); clearInterval(adInterval); adInterval = null; }
    const isSingleAd = activeAds.length === 1;
    if (ad.type === 'image') {
        mediaHTML = `<a href="${escapeHtml(ad.link || '#')}" target="_blank" class="block w-full h-full"><img src="${escapeHtml(ad.content)}" alt="إعلان" class="w-full h-full object-cover"></a>`;
        if (!isSingleAd) adInterval = setTimeout(nextAdSlide, 10000);
        } else if (ad.type === 'video') {
        const loopAttr = isSingleAd ? 'loop' : ''; 
        const endedAttr = isSingleAd ? '' : 'onended="nextAdSlide()"';
        mediaHTML = `
        <div class="relative w-full h-full bg-black">
            <video id="homeAdVideo" autoplay muted playsinline ${loopAttr} ${endedAttr} onerror="nextAdSlide()" class="w-full h-full object-cover">
                <source src="${escapeHtml(ad.content)}" type="video/mp4">
            </video>
            <button onclick="toggleAdVideoSound()" class="absolute top-3 right-3 bg-black/50 hover:bg-black/70 text-white w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-sm z-30 transition-all">
                <i class="fas fa-volume-xmark" id="adVideoSoundIcon"></i>
            </button>
        </div>`;
    }
    
    container.innerHTML = `<div class="w-full h-full">${mediaHTML}</div>`;
    
    if (dotsContainer) { 
        if (isSingleAd) dotsContainer.innerHTML = ''; 
        else dotsContainer.innerHTML = activeAds.map((_, i) => `<span class="w-2 h-2 rounded-full bg-white/50 cursor-pointer ${i === index ? 'w-6 bg-white' : ''}" onclick="goToAdSlide(${i})"></span>`).join(''); 
    }
}
window.nextAdSlide = () => { if (activeAds.length === 0) return; currentAdIndex = (currentAdIndex + 1) % activeAds.length; renderAdSlide(currentAdIndex); }
window.toggleAdVideoSound = () => {
    const video = document.getElementById('homeAdVideo');
    const icon = document.getElementById('adVideoSoundIcon');
    if (!video) return;
    video.muted = !video.muted;
    if (video.muted) { icon.className = 'fas fa-volume-xmark'; } 
    else { icon.className = 'fas fa-volume-high'; }
};
window.prevAdSlide = () => { if (activeAds.length === 0) return; currentAdIndex = (currentAdIndex - 1 + activeAds.length) % activeAds.length; renderAdSlide(currentAdIndex); }
window.goToAdSlide = (index) => { currentAdIndex = index; renderAdSlide(currentAdIndex); }
window.saveHomeAd = async (e) => {
    e.preventDefault(); const type = document.getElementById('adType').value; const content = document.getElementById('adContent').value.trim(); const link = document.getElementById('adLink').value.trim();
    if (!content) { showToast('الرجاء إدخال رابط'); return; }
    try { await supabase.from('homepage_ads').insert([{ type, content, link, is_active: true }]); await supabase.from('app_config').upsert({ id: 'ads_sync', last_update: Date.now() }); showToast('تم الحفظ!'); e.target.reset(); fetchHomeAdsForAdmin(); } catch (err) { showToast('خطأ'); }
};
window.toggleHomeAdStatus = async (id, status) => { try { await supabase.from('homepage_ads').update({ is_active: status }).eq('id', id); await supabase.from('app_config').upsert({ id: 'ads_sync', last_update: Date.now() }); showToast('تم التحديث'); fetchHomeAdsForAdmin(); } catch (err) { showToast('خطأ'); } };
window.deleteHomeAd = async (id) => { try { await supabase.from('homepage_ads').delete().eq('id', id); await supabase.from('app_config').upsert({ id: 'ads_sync', last_update: Date.now() }); showToast('تم الحذف'); fetchHomeAdsForAdmin(); } catch (err) { showToast('خطأ'); } };
async function fetchHomeAdsForAdmin() {
    const { data } = await supabase.from('homepage_ads').select('*');
    allHomeAds = data || [];
    const list = document.getElementById('adminHomeAdsList'); if (!list) return;
    if (allHomeAds.length === 0) { list.innerHTML = '<p class="text-center text-gray-400 text-sm">لا توجد إعلانات.</p>'; return; }
    list.innerHTML = allHomeAds.map(ad => `<div class="flex items-center justify-between p-2 rounded-lg border"><div class="text-xs truncate flex-1 flex items-center gap-2"><i class="fas ${ad.type === 'image' ? 'fa-image text-blue-500' : 'fa-video text-purple-500'}"></i><span class="truncate">${escapeHtml(ad.content.substring(0, 30))}...</span></div><div class="flex gap-1 mr-2"><button onclick="toggleHomeAdStatus('${ad.id}', ${!ad.is_active})" class="px-2 py-1 rounded text-xs ${ad.is_active ? 'bg-green-500 text-white' : 'bg-gray-200'}">${ad.is_active ? 'مفعّل' : 'معطّل'}</button><button onclick="deleteHomeAd('${ad.id}')" class="px-2 py-1 rounded text-xs bg-red-500 text-white"><i class="fas fa-trash"></i></button></div></div>`).join('');
}
async function fetchHomeAdsPublic() {
    const cachedAds = localStorage.getItem('cached_home_ads');
    if (cachedAds) {
        activeAds = JSON.parse(cachedAds);
        const section = document.getElementById('homeMediaAdsSection');
        if (activeAds.length === 0) section.classList.add('hidden');
        else { section.classList.remove('hidden'); currentAdIndex = 0; renderAdSlide(currentAdIndex); }
    }
    const { data: configSnap } = await supabase.from('app_config').select('last_update').eq('id', 'ads_sync').single();
    let serverTime = configSnap?.last_update || 0;
    if (serverTime === 0) { await supabase.from('app_config').upsert({ id: 'ads_sync', last_update: Date.now() }); serverTime = Date.now(); }
    const localTime = parseInt(localStorage.getItem('ads_last_fetch') || '0');
    if (serverTime > localTime) {
        const { data: snap } = await supabase.from('homepage_ads').select('*').eq('is_active', true).limit(5);
        activeAds = snap || [];
        const section = document.getElementById('homeMediaAdsSection');
        if (activeAds.length === 0) { section.classList.add('hidden'); if (adInterval) clearInterval(adInterval); } 
        else { section.classList.remove('hidden'); currentAdIndex = 0; renderAdSlide(currentAdIndex); }
        try { localStorage.setItem('cached_home_ads', JSON.stringify(activeAds)); localStorage.setItem('ads_last_fetch', serverTime.toString()); } catch(e) {}
    }
}
fetchHomeAdsPublic();
fetchAnnouncements();
            
// === نظام التحديث الذكي والأنيق (محسّن) ===
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('OneSignalSDKWorker.js').then(reg => {
      
      // 1. الاستماع للتحديثات الجديدة أثناء التصفح
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        newWorker.addEventListener('statechange', () => {
          // إذا تم تثبيت نسخة جديدة بنجاح، أظهر الرسالة
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            showUpdateToast();
          }
        });
      });

      // 2. (الإضافة العبقرية) التحقق عند فتح الموقع إذا كان هناك تحديث ينتظر من قبل
      if (reg.waiting) {
        showUpdateToast();
      }

      // 3. فحص عند العودة للتبويب (بدون إزعاج)
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          reg.update();
        }
      });
      
    });
  });

  // إعادة التحميل تحدث فقط إذا ضغط المستخدم على زر التحديث
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });
}

// دالة إظهار رسالة التحديث الأنيقة
function showUpdateToast() {
  const toast = document.getElementById('toast');
  // التحقق مما إذا كانت الرسالة معروضة بالفعل لمنع التكرار
  if (toast.classList.contains('show') && toast.innerHTML.includes('يتوفر إصدار جديد')) return;

  toast.innerHTML = `
    <div class="flex flex-col items-center gap-3 w-full">
      <div class="text-sm font-bold text-blue-800">🎉 يتوفر إصدار جديد من المنصة بميزات أسرع.</div>
      <button id="updateBtn" class="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 transition-all">تحديث الآن</button>
    </div>`;
  toast.style.backgroundColor = '#EFF6FF';
  toast.classList.add('show');

  document.getElementById('updateBtn').onclick = () => {
    navigator.serviceWorker.getRegistration().then(reg => {
      if (reg && reg.waiting) {
        // إرسال أمر التفعيل للنسخة المنتظرة
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
    });
  };
}
// === الأدوات الطبية والرادار واسأل طبيب ===
window.openBurnCalculator = () => {
    burnState = { cause: null, degree: null, area: null };
    openCtrlPanel('مُسعف الحروق الذكي', `
        <div class="flex flex-col gap-5">
            <div class="bg-orange-50 border border-orange-200 rounded-xl p-4 text-orange-800 text-sm flex items-center gap-3">
                <i class="fas fa-fire-extinguisher text-xl"></i>
                <span>أجب عن الأسئلة التالية بدقة للحصول على إرشادات الإسعاف الأولى الصحيحة لحالة الحرق.</span>
            </div>
            <div id="burnCalcContent" class="bg-white p-6 rounded-2xl border" style="border-color: var(--border)"></div>
        </div>
    `, '#F97316');
    window.renderBurnStep();
}

window.renderBurnStep = () => {
    const content = document.getElementById('burnCalcContent');
    if (!content) return;

    if (!burnState.cause) {
        content.innerHTML = `
            <h4 class="font-bold text-sm mb-4 text-center">ما هو سبب الحرق؟</h4>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div onclick="window.selectBurnOption('cause', 'thermal')" class="burn-option"><i class="fas fa-fire text-2xl mb-2 text-orange-500"></i><br>حرق حراري (نار، سائل ساخن، معدن)</div>
                <div onclick="window.selectBurnOption('cause', 'chemical')" class="burn-option"><i class="fas fa-flask text-2xl mb-2 text-blue-500"></i><br>حرق كيميائي (مواد تنظيف، أحماض)</div>
                <div onclick="window.selectBurnOption('cause', 'electrical')" class="burn-option"><i class="fas fa-bolt text-2xl mb-2 text-yellow-500"></i><br>حرق كهربائي (تيار كهربائي)</div>
                <div onclick="window.selectBurnOption('cause', 'sun')" class="burn-option"><i class="fas fa-sun text-2xl mb-2 text-red-500"></i><br>حروق الشمس</div>
            </div>
        `;
    } else if (!burnState.degree) {
        content.innerHTML = `
            <h4 class="font-bold text-sm mb-4 text-center">ما هو عمق الحرق؟</h4>
            <div class="grid grid-cols-1 gap-3">
                <div onclick="window.selectBurnOption('degree', '1st')" class="burn-option"><i class="fas fa-layer-group text-xl mb-1 text-red-400"></i><br>درجة أولى (ألم واحمرار، لا فقاعات - مثل حرق الشمس الخفيف)</div>
                <div onclick="window.selectBurnOption('degree', '2nd')" class="burn-option"><i class="fas fa-layer-group text-xl mb-1 text-red-500"></i><br>درجة ثانية (ألم شديد، احمرار، وتكون فقاعات مملوءة بسائل)</div>
                <div onclick="window.selectBurnOption('degree', '3rd')" class="burn-option"><i class="fas fa-layer-group text-xl mb-1 text-gray-600"></i><br>درجة ثالثة (جلد متفحم، أبيض أو أسود، قد لا يكون هناك ألم لتلف الأعصاب)</div>
            </div>
        `;
    } else if (!burnState.area) {
        content.innerHTML = `
            <h4 class="font-bold text-sm mb-4 text-center">ما هي مساحة الحرق؟</h4>
            <div class="grid grid-cols-1 gap-3">
                <div onclick="window.selectBurnOption('area', 'small')" class="burn-option"><i class="fas fa-hand-paper text-xl mb-1 text-green-500"></i><br>صغيرة (أصغر من كف اليد المصاب)</div>
                <div onclick="window.selectBurnOption('area', 'large')" class="burn-option"><i class="fas fa-fire text-xl mb-1 text-orange-500"></i><br>كبيرة (أكبر من كف اليد)</div>
                <div onclick="window.selectBurnOption('area', 'sensitive')" class="burn-option"><i class="fas fa-face-dizzy text-xl mb-1 text-red-500"></i><br>في منطقة حساسة (الوجه، العنق، الأعضاء التناسلية، المفاصل)</div>
            </div>
        `;
    } else {
        let advice = ""; let emergency = false;
        if (burnState.cause === 'chemical') {
            advice = "1. ارتدِ قفازات واقية فوراً.\n2. اغسل المنطقة بكميات كبيرة من الماء الفاتر الجاري لمدة 20 دقيقة على الأقل.\n3. اخلع الملابس الملوثة بحذر أثناء الغسل.\n4. لا تحاول معادلة المادة الكيميائية.\n5. غطِ الحرق بقطعة قماش نظيفة جافة.";
            emergency = true;
        } else if (burnState.cause === 'electrical') {
            advice = "1. افصل التيار الكهربائي فوراً قبل لمس المصاب.\n2. لا تلمس المصاب بيديك العاريتين.\n3. تحقق من تنفسه ونبضه، إذا توقف ابدأ الإنعاش القلبي الرئوي (CPR).\n4. عالج الحروق الخارجية بكمادات ماء بارد (ليس ثلج).";
            emergency = true;
        } else {
            if (burnState.area === 'sensitive' || burnState.area === 'large' || burnState.degree === '3rd') {
                advice = "1. ضع المنطقة تحت ماء جارٍ بارد (ليس مثلجاً) لمدة 15-20 دقيقة لتبريد الحرق.\n2. اخلع الملابس أو الإكسسوارات المحيطة بلطف (إن لم تكن ملتصقة بالجلد).\n3. غطِ الحرق بضمادة معقمة أو قطعة قماش نظيفة وجافة.\n4. لا تضع معجون أسنان، زيت، أو ثلج على الحرق.\n5. لا تفتح الفقاعات إن وجدت.";
                emergency = true;
            } else if (burnState.degree === '2nd') {
                advice = "1. ضع المنطقة تحت ماء جارٍ بارد لمدة 15 دقيقة.\n2. غطِ الحرق بضمادة معقمة جافة.\n3. لا تفتح الفقاعات أبداً.\n4. يمكنك إعطاء مسكن للألم (باراسيتامول).";
            } else { 
                advice = "1. ضع المنطقة تحت ماء بارد الجري لمدة 10-15 دقيقة.\n2. لتخفيف الألم، يمكن استخدام كريم مرطب لطيف (مثل الفازلين الطبي) بعد تبريد الحرق.\n3. تجنب تعرض المنطقة للشمس لعدة أيام.\n4. شرب كميات كبيرة من الماء إذا كان الحرق من الشمس وحروق الجسم واسعة.";
            }
        }
        const emergencyBox = emergency ? `
            <div class="bg-red-50 border border-red-200 rounded-xl p-4 text-red-800 text-sm flex items-start gap-3 mt-4">
                <i class="fas fa-ambulance text-xl mt-1"></i>
                <div><b>تحذير طبي:</b> هذه الحالة تتطلب مراجعة الطوارئ فوراً بعد الإسعاف الأولي. لا تتأخر في طلب الإسعاف (110) أو التوجه لأقرب مشفى.</div>
            </div>
        ` : "";
        content.innerHTML = `
            <div class="text-center mb-4">
                <div class="w-16 h-16 mx-auto rounded-full bg-green-100 flex items-center justify-center mb-2"><i class="fas fa-check text-3xl text-green-600"></i></div>
                <h4 class="font-bold text-lg text-gray-800">إرشادات الإسعاف الأولى</h4>
            </div>
            <div class="bg-gray-50 p-4 rounded-xl text-sm text-gray-700 leading-relaxed whitespace-pre-line flex items-start gap-2">
                <i class="fas fa-notes-medical text-orange-500 mt-1"></i>
                <span>${escapeHtml(advice)}</span>
            </div>
            ${emergencyBox}
            <button onclick="openBurnCalculator()" class="w-full mt-4 py-3 rounded-xl text-white font-bold text-sm" style="background: #F97316;">
                <i class="fas fa-rotate-right ml-2"></i> تقييم حالة أخرى
            </button>
        `;
    }
}
window.selectBurnOption = (key, value) => { burnState[key] = value; window.renderBurnStep(); }

const seasonalDiseases = [
    { name: "التهاب الأمعاء الحاد / التسمم الغذائي", season: "الصيف", icon: "fa-temperature-high", color: "#F59E0B", cause: "ينتشر بكثرة بسبب موجات الحر، وتأثر سلامة المياه أحياناً، أو الأطعمة والمقبلات المكشوفة.", tip: "تجنب الأطعمة المكشوفة والتركيز على غسل الأيدي جيداً قبل تحضير الطعام وبعد استخدام المرحاض." },
    { name: "اللاشمانيا (حبة حلب / حبة السنة)", season: "الخريف والشتاء", icon: "fa-bug", color: "#D97706", cause: "تُعد من الأمراض الجلدية المتوطنة والمشهورة في مناطق ريف دمشق والمناطق شبه الصحراوية والقلمون، تنتقل بلدغات ذبابة الرمل في الصيف.", tip: "استخدام شبكات الناموسيات (المنخل) على النوافذ، وتجنب السير ليلاً في الأماكن شبه الصحراوية دون ملابس طويلة." },
    { name: "الإنفلونزا والتهاب البلعوم", season: "الخريف والشتاء", icon: "fa-virus", color: "#3B82F6", cause: "منطقة القلمون والرحيبة معروفة ببردها الجاف والشديد في الشتاء، مما يسبب موجات إنفلونزا حادة تصيب عائلات كاملة.", tip: "الراحة التامة، شرب السوائل الدافئة (المتة، الشاي، زهورات)، وتدفئة الجسم جيداً." },
    { name: "حساسية الربيع والجيوب الأنفية", season: "الربيع", icon: "fa-wind", color: "#10B981", cause: "بسبب طبيعة المنطقة الجغرافية والغبار والرياح الخمسينية، يعاني جزء كبير من السكان من نوبات الربو وحساسية الصدر والعيون.", tip: "إغلاق النوافذ جيداً في الأيام المغبرة وارتداء الكمامة عند الخروج." },
    { name: "جدري الماء (الحميقاء)", season: "أواخر الشتاء وبداية الربيع", icon: "fa-allergies", color: "#8B5CF6", cause: "مرض شديد العدوى وينتشر بسرعة بين طلاب المدارس والأطفال في الأحياء.", tip: "الامتناع التام عن استخدام البروفين والأسبرين للأطفال، تجنب الحك تماماً، وقص الأظافر لتجنب التهاب الجلد." }
];
window.openSeasonalDiseases = () => {
    const cardsHtml = seasonalDiseases.map(d => `
        <div class="disease-card">
            <div class="disease-header" style="background: ${d.color};">
                <i class="fas ${d.icon} text-2xl text-white"></i>
                <div>
                    <h4 class="font-bold text-white text-sm" style="font-family: 'Noto Kufi Arabic'">${escapeHtml(d.name)}</h4>
                    <div class="text-xs text-white/80">موسم الذروة: ${escapeHtml(d.season)}</div>
                </div>
            </div>
            <div class="disease-body">
                <div class="disease-section">
                    <div class="text-xs font-bold text-gray-500 mb-1">السبب المحلي:</div>
                    <div class="text-sm text-gray-700 leading-relaxed">${escapeHtml(d.cause)}</div>
                </div>
                <div class="disease-section">
                    <div class="text-xs font-bold mb-1" style="color: ${d.color};"><i class="fas fa-star ml-1"></i> نصيحة ذهبية:</div>
                    <div class="text-sm text-gray-700 leading-relaxed">${escapeHtml(d.tip)}</div>
                </div>
            </div>
        </div>
    `).join('');
    openCtrlPanel('دليل أمراض الرحيبة الموسمية', `<div class="flex flex-col gap-5"><div class="bg-purple-50 border border-purple-200 rounded-xl p-4 text-purple-800 text-sm flex items-center gap-3"><i class="fas fa-virus-covid text-xl"></i><span>دليل توعوي بأبرز الأمراض المنتشرة في منطقة الرحيبة والقلمون موسمياً، مع نصائح وقائية محلية.</span></div><div class="grid grid-cols-1 sm:grid-cols-2 gap-4">${cardsHtml}</div></div>`, '#8B5CF6');
}
// 4. Pregnancy Calculator
const pregnancyData = [
    { week: 4, length: "0.4 سم", weight: "< 1 غ", icon: "🌱", dev: "يبدأ القلب والدماغ بالنمو" },
    { week: 8, length: "1.6 سم", weight: "1 غ", icon: "🟢", dev: "بدأت الأطراف بالتشكل" },
    { week: 12, length: "5.4 سم", weight: "14 غ", icon: "👶", dev: "اكتملت الأعضاء الأساسية" },
    { week: 16, length: "11.6 سم", weight: "100 غ", icon: "🧠", dev: "يمكن للجنين السمع" },
    { week: 20, length: "25.6 سم", weight: "300 غ", icon: "🤰", dev: "يبدأ الجنين بالحركة" },
    { week: 24, length: "30 سم", weight: "600 غ", icon: "✨", dev: "تتكون الرئتان" },
    { week: 28, length: "37.6 سم", weight: "1 كغ", icon: "🌙", dev: "يفتح الجنين عينيه" },
    { week: 32, length: "42.4 سم", weight: "1.7 كغ", icon: "🦴", dev: "تتصلب العظام" },
    { week: 36, length: "47.4 سم", weight: "2.6 كغ", icon: "🧸", dev: "يأخذ وضعية الولادة" },
    { week: 40, length: "51.2 سم", weight: "3.5 كغ", icon: "🎉", dev: "موعد الولادة المتوقع" }
];
window.openPregnancyCalc = () => {
    openCtrlPanel('حاسبة موعد الولادة وتطور الجنين', `
        <div class="flex flex-col gap-5">
            <div class="bg-pink-50 border border-pink-200 rounded-xl p-4 text-pink-800 text-sm flex items-center gap-3">
                <i class="fas fa-info-circle text-xl"></i>
                <span>أدخلي تاريخ أول يوم من آخر دورة شهرية لحساب موعد الولادة المتوقع ورؤية تطور الجنين.</span>
            </div>
            <div class="bg-white p-5 rounded-xl border" style="border-color: var(--border)">
                <label class="block text-sm font-semibold mb-2">تاريخ آخر دورة شهرية:</label>
                <input type="date" id="lmpDate" class="ctrl-input" required>
                <button onclick="calcPregnancy()" class="w-full mt-4 py-3 rounded-xl text-white font-bold text-sm transition-all hover:opacity-90" style="background: #EC4899;">
                    <i class="fas fa-calculator ml-2"></i> احسبي الموعد
                </button>
            </div>
            <div id="pregResult" class="hidden flex flex-col gap-4"></div>
        </div>
    `, '#EC4899');
}
window.calcPregnancy = () => {
    const dateVal = document.getElementById('lmpDate').value;
    if (!dateVal) { showToast('الرجاء إدخال التاريخ'); return; }
    const lmpDate = new Date(dateVal);
    const today = new Date();
    const dueDate = new Date(lmpDate);
    dueDate.setDate(dueDate.getDate() + 280);
    const diffTime = Math.abs(today - lmpDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const currentWeek = Math.floor(diffDays / 7);
    if (currentWeek < 0 || currentWeek > 42) { showToast('التاريخ المدخل غير منطقي للحمل'); return; }
    const stage = pregnancyData.slice().reverse().find(p => currentWeek >= p.week) || pregnancyData[0];
    const dueStr = dueDate.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const daysLeft = Math.max(0, Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24)));
    document.getElementById('pregResult').classList.remove('hidden');
    document.getElementById('pregResult').innerHTML = `
        <div class="bg-white p-6 rounded-2xl border-2 text-center" style="border-color: #EC4899;">
            <div class="text-sm font-bold text-pink-500 mb-2">الموعد المتوقع للولادة</div>
            <div class="text-lg font-black text-gray-800 mb-4" style="font-family: 'Noto Kufi Arabic'">${escapeHtml(dueStr)}</div>
            <div class="grid grid-cols-2 gap-3 text-right">
                <div class="bg-pink-50 p-3 rounded-xl"><div class="text-xs text-pink-400">العمر الحملي الحالي</div><div class="text-xl font-bold text-pink-700">${escapeHtml(currentWeek)} أسبوع</div></div>
                <div class="bg-pink-50 p-3 rounded-xl"><div class="text-xs text-pink-400">الأيام المتبقية</div><div class="text-xl font-bold text-pink-700">${escapeHtml(daysLeft)} يوم</div></div>
            </div>
        </div>
        <div class="bg-gradient-to-br from-pink-50 to-purple-50 p-6 rounded-2xl border flex flex-col items-center text-center" style="border-color: var(--border)">
            <div class="w-24 h-24 rounded-full bg-white shadow-md flex items-center justify-center text-5xl mb-3">${escapeHtml(stage.icon)}</div>
            <div class="inline-block px-3 py-1 bg-pink-200 text-pink-800 rounded-full text-xs font-bold mb-2">الأسبوع ${escapeHtml(stage.week)}</div>
            <div class="flex justify-center gap-6 mb-4 w-full">
                <div><div class="text-xs text-gray-500">الطول</div><div class="text-lg font-black text-gray-800">${escapeHtml(stage.length)}</div></div>
                <div class="w-px bg-gray-300"></div>
                <div><div class="text-xs text-gray-500">الوزن التقريبي</div><div class="text-lg font-black text-gray-800">${escapeHtml(stage.weight)}</div></div>
            </div>
            <div class="bg-white p-3 rounded-xl shadow-sm text-sm text-gray-600 flex items-center gap-2 w-full"><i class="fas fa-heart text-pink-500"></i><span>${escapeHtml(stage.dev)}</span></div>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-2.5"><div class="bg-pink-600 h-2.5 rounded-full" style="width: ${escapeHtml(Math.min(100, (currentWeek/40)*100))}%"></div></div>
        <div class="text-center text-xs text-gray-500">${escapeHtml(Math.min(100, Math.round((currentWeek/40)*100)))}% من رحلة الحمل</div>
    `;
}

// 5. Dose Calculator
window.openDoseCalc = () => {
    openCtrlPanel('حاسبة الجرعات الذكية للأطفال', `
        <div class="flex flex-col gap-5">
            <div class="bg-blue-50 border border-blue-200 rounded-xl p-4 text-blue-800 text-sm flex items-center gap-3">
                <i class="fas fa-exclamation-triangle text-xl"></i>
                <span><b>تنبيه هام:</b> هذه الحاسبة استرشادية. لا تعطِ طفلك دوائين معاً دون استشارة طبيب. تجنب إعطاء (البروفين) للأطفال أقل من 6 أشهر.</span>
            </div>
            <div class="bg-white p-5 rounded-xl border" style="border-color: var(--border)">
                <div class="mb-4"><label class="block text-sm font-semibold mb-2">وزن الطفل (كيلوغرام):</label><input type="number" id="childWeight" class="ctrl-input" placeholder="مثال: 12 (من 3 إلى 45 كغ)" min="3" max="45" step="0.1"></div>
                <div class="mb-4"><label class="block text-sm font-semibold mb-2">نوع الدواء المتوفر لديك:</label><select id="medType" class="ctrl-input" onchange="toggleConcentration()"><option value="paracetamol">سيتامول (Paracetamol / خافض للحرارة)</option><option value="ibuprofen">بروفين (Ibuprofen / مسكن ومضاد التهاب)</option></select></div>
                <div class="mb-4" id="concDiv"><label class="block text-sm font-semibold mb-2">تركيز الشراب (مكتوب على العبوة):</label><select id="medConc" class="ctrl-input"><option value="120">سيتامول عادي (120 مغ/5 مل)</option><option value="250">سيتامول فورت (250 مغ/5 مل)</option></select></div>
                <button onclick="calcDose()" class="w-full py-3 rounded-xl text-white font-bold text-sm transition-all hover:opacity-90" style="background: #2563EB;"><i class="fas fa-syringe ml-2"></i> احسبي الجرعة الآمنة</button>
            </div>
            <div id="doseResult" class="hidden"></div>
        </div>
    `, '#2563EB');
}
window.toggleConcentration = () => {
    const type = document.getElementById('medType').value;
    const concSelect = document.getElementById('medConc');
    if (type === 'paracetamol') { concSelect.innerHTML = `<option value="120">سيتامول عادي (120 مغ/5 مل)</option><option value="250">سيتامول فورت (250 مغ/5 مل)</option>`; } 
    else { concSelect.innerHTML = `<option value="100">بروفين شراب (100 مغ/5 مل)</option><option value="40">بروفين للأطفال (40 مغ/5 مل)</option>`; }
}
window.calcDose = () => {
    const weight = parseFloat(document.getElementById('childWeight').value);
    const type = document.getElementById('medType').value;
    const conc = parseInt(document.getElementById('medConc').value);
    if (!weight || weight <= 0) { showToast('الرجاء إدخال وزن صحيح', 'error'); return; }
    if (weight < 3) { showToast('الوزن أقل من 3 كغ! يجب استشارة الطبيب.'); return; }
    if (weight > 45) { showToast('الوزن أكبر من 45 كغ! يرجى مراجعة الطبيب.'); return; }
    let doseMg = 0, maxDoseMg = 0, frequency = "", medName = "";
    if (type === 'paracetamol') { doseMg = weight * 15; maxDoseMg = 1000; frequency = "كل 6 إلى 8 ساعات (بحد أقصى 4 جرعات في اليوم)"; medName = "سيتامول (Paracetamol)"; } 
    else { if (weight < 6) { showToast('لا يُنصح بالبروفين للأطفال أقل من 6 أشهر (أقل من 6 كغ). استخدم السيتامول واستشر الطبيب.'); return; } doseMg = weight * 10; maxDoseMg = 400; frequency = "كل 6 إلى 8 ساعات (بحد أقصى 3 جرعات في اليوم)"; medName = "بروفين (Ibuprofen)"; }
    if (doseMg > maxDoseMg) doseMg = maxDoseMg;
    const doseMl = (doseMg * 5) / conc;
    document.getElementById('doseResult').classList.remove('hidden');
    document.getElementById('doseResult').innerHTML = `
        <div class="bg-white p-6 rounded-2xl border-2 text-center" style="border-color: #2563EB;">
            <div class="text-sm font-bold text-blue-500 mb-2">تعليمات الجرعة لطفل وزنه ${escapeHtml(weight)} كغ</div>
            <div class="text-lg font-black text-gray-800 mb-4" style="font-family: 'Noto Kufi Arabic'">${escapeHtml(medName)}</div>
            <div class="bg-blue-50 p-4 rounded-xl mb-4 flex flex-col items-center justify-center">
                <div class="text-xs text-blue-400 mb-1">الكمية المعطاة في المرة الواحدة</div>
                <div class="text-4xl font-black text-blue-700">${escapeHtml(doseMl.toFixed(1))} <span class="text-xl">مل</span></div>
                <div class="text-xs text-gray-500 mt-1">(تقريباً ${escapeHtml(Math.round(doseMl * 20))} قطرة)</div>
            </div>
            <div class="bg-gray-50 p-3 rounded-xl text-sm text-gray-700 mb-2 text-right flex items-start gap-2"><i class="fas fa-clock text-blue-500 mt-1"></i><span><b>التكرار:</b> ${escapeHtml(frequency)}</span></div>
            <div class="bg-gray-50 p-3 rounded-xl text-sm text-gray-700 mb-4 text-right flex items-start gap-2"><i class="fas fa-syringe text-blue-500 mt-1"></i><span><b>طريقة القياس:</b> يُفضل استخدام حقنة الفم المدرجة (السيرنج) لضمان دقة الكمية بدلاً من الملعقة.</span></div>
            <div class="bg-red-50 border border-red-200 p-3 rounded-xl text-xs text-red-700 flex items-start gap-2 text-right"><i class="fas fa-exclamation-circle mt-0.5"></i><span>هذه الجرعة استرشادية. إذا استمرت الحرارة أكثر من 3 أيام أو كانت مرتفعة جداً، توجه للطبيب فوراً. لا تجمع دوائين خافضين للحرارة في نفس الوقت دون استشارة.</span></div>
        </div>
    `;
}

// 6. Comprehensive First Aid Guide
const firstAidData = [
    { icon: "fa-heart-pulse", title: "الإنعاش القلبي الرئوي (CPR) للبالغين", steps: "1. تأكد من وعي الشخص، إذا لم يستجب اطلب الإسعاف (110).\n2. ضع كعب يدك في منتصف صدر الشخص (عظمة القص).\n3. اضغط بقوة وسرعة (100-120 ضغطة في الدقيقة) بعمق 5 سم.\n4. بعد كل 30 ضغطة، أعطِ نفسين إنقاذيين (تقريب الأنف والنفخ في الفم).\n5. استمر حتى وصول الإسعاف أو عودة النبض." },
    { icon: "fa-heart-pulse", title: "الإنعاش القلبي للأطفال والرضع", steps: "1. للأطفال: استخدم كف يد واحدة للضغط بعمق 4 سم.\n2. للرضع (أقل من سنة): استخدم إصبعين للضغط على الصدر بعمق 3 سم.\n3. أعطِ 30 ضغطة يليها نفسان بلطف (لا تنفخ بقوة للرضع).\n4. السرعة 100-120 ضغطة في الدقيقة." },
    { icon: "fa-stroke", title: "السكتة الدماغية", steps: "1. الوجه: هل يسيل اللعاب أو مائل لأحد الجانبين؟\n2. الذراع: هل يستطيع رفع كلتا يديه؟\n3. الكلام: هل كلامه متعثر وغير مفهوم؟\n4. الوقت: إذا توفرت أي علامة، اتصل بالإسعاف فوراً. الدقائق هنا تعني إنقاذ خلايا الدماغ." },
    { icon: "fa-heart-circle-bolt", title: "النوبة القلبية", steps: "1. اتصل بالإسعاف فوراً.\n2. اجلس المريض وأسند ظهره واطلب منه الاسترخاء وعدم الحركة.\n3. فك الملابس الضيقة.\n4. إذا لم يكن مصاباً بالقرحة، أعطه حبة أسبرين (300 مغ) ليبلعها ببطء.\n5. إذا فقد الوعي وتوقف قلبه، ابدأ الإنعاش القلبي الرئوي." },
    { icon: "fa-lungs", title: "الاختناق وبلع الأجسام الغريبة (البالغين)", steps: "1. إذا كان يسعل بقوة، شجعه على الاستمرار ولا تتدخل.\n2. إذا لم يستطع التنفس أو الكلام، قف خلفه وطبق مناورة هيمليك.\n3. ضع قبضة يدك بين السرة وأسفل القفص الصدري.\n4. اضغط للداخل والأعلى 5 مرات متتالية بحركة حادة.\n5. كرر حتى يخرج الجسم أو يفقد الوعي (عندها ابدأ الإنعاش القلبي)." },
    { icon: "fa-baby", title: "اختناق الرضيع", steps: "1. ضع الطفل على ذراعك ووجهه لأسفل (رأسه أقل من صدره).\n2. اضرب بظهره 5 ضربات متتالية بكعب يدك.\n3. إذا لم يخرج الجسم، اقلب الطفل ووجهه لأعلى.\n4. اضغط على صدره 5 مرات بإصبعين (كالإنعاش).\n5. كرر الظهر/الصدر حتى يخرج الجسم." },
    { icon: "fa-fire", title: "الحروق المنزلية (حرارية)", steps: "1. ضع المنطقة المصابة تحت ماء جارٍ بارد (ليس مثلجاً) لمدة 15-20 دقيقة.\n2. خلع الملابس أو الإكسسوارات المحيطة بلطف إن لم تكن ملتصقة.\n3. غط الحرق بضمادة معقمة جافة.\n4. لا تضع معجون أسنان، زيت، أو ثلج على الحرق.\n5. للحروق الكبيرة أو العميقة، اطلب الإسعاف فوراً." },
    { icon: "fa-burn", title: "الحروق الكيميائية", steps: "1. ارتدِ قفازات واقية إن أمكن.\n2. اغسل المنطقة المصابة بكميات كبيرة من الماء الفاتر لمدة 20 دقيقة.\n3. اخلع الملابس الملوثة بالكيمياء بحذر.\n4. لا تحاول معادلة الحمض بالقلوي أو العكس.\n5. انقل المصاب لأقرب مشفى مع إحضار عبوة المادة الكيميائية إن أمكن." },
    { icon: "fa-bone", title: "الكسور", steps: "1. لا تحرك العظمة المكسورة وحاول تثبيتها في وضعها الحالي.\n2. ضع جبيرة (خشبة أو مجلة صلبة) حول العظمة لتثبيتها.\n3. ضع كمادات ثلج ملفوفة بقطعة قماش لتخفيف التورم.\n4. لا تحاول إعادة العظمة لمكانها أبداً.\n5. انقل المصاب للمشفى بحذر شديد." },
    { icon: "fa-bleeding", title: "النزيف الشديد (الجروح)", steps: "1. ضع ضغطاً مباشراً وقوياً على الجرح بقطعة قماش نظيفة.\n2. ارفع العضو المصاب فوق مستوى القلب إن أمكن.\n3. إذا تشربت القماش بالدم، ضع طبقة أخرى فوقها ولا ترفع الأولى أبداً.\n4. إذا كان النزيف في الطرف ولم يتوقف، استخدم حزاماً ضاغطاً ووثق وقت وضعه.\n5. اطلب الإسعاف فوراً." },
    { icon: "fa-droplet", title: "نزيف الأنف (الرعاف)", steps: "1. اجلس المريض وأمِل رأسه للأمام قليلاً (لا تميله للخارج لئلا يبلع الدم).\n2. اضغط برفق على الجزء الطري من الأنف (الأجناف) لمدة 10-15 دقيقة.\n3. تنفس من الفم وضع كمادة باردة على الجبهة أو جسر الأنف.\n4. لا نفث الأنف لمدة ساعة بعد توقف النزيف." },
    { icon: "fa-bolt", title: "الصعق الكهربائي", steps: "1. افصل مصدر الكهربائي فوراً أو اسحب المصاب بعيداً باستخدام عازل (خشبة، بلاستيك).\n2. لا تلمس المصاب بيديك العاريتين قبل فصل التيار.\n3. تحقق من تنفسه ونبضه، إذا توقف ابدأ الإنعاش القلبي الرئوي.\n4. عالج الحروق الناتجة (حروق كهربائية) بكمادات باردة.\n5. انقل للمشفى حتى لو بدا سليماً (لخطر اضطراب نبض القلب)." },
    { icon: "fa-water", title: "الغرق", steps: "1. أخرج المصاب من الماء بأمان دون تعريض نفسك للخطر.\n2. تحقق من التنفس، إذا كان متوقفاً ابدأ الإنعاش القلبي الرئوي فوراً.\n3. إذا كان يتنفس، ضعه في وضعية الأمان (الإفاقة) لتجنب الشفط.\n4. أبعده عن البرد ولفه ببطانية.\n5. انقله للمشفى دائماً حتى لو بدا معافى (لخطر الغرق الثانوي)." },
    { icon: "fa-temperature-high", title: "ضربة الشمس", steps: "1. انقل المصاب لمكان بارد وظليل فوراً.\n2. اخلع ملابسه الفضفاضة وغير الضرورية.\n3. برّد جسمه برشه ماء بارد، أو وضع كمادات ثلج على الإبطين والرقبة والفخذين.\n4. إذا كان واعياً، أعطه ماء بارد ليشربه رشفاً (لا يشرب دفعة واحدة).\n5. اطلب الإسعاف، ضربة الشمس حالة طارئة مميتة." },
    { icon: "fa-skull-crossbones", title: "التسمم (بلع مواد سامة)", steps: "1. لا تجعله يتقيأ أبداً إلا إذا طلب ذلك مركز السموم.\n2. احفظ العبوة واقرأ الإسعافات الأولية المكتوبة عليها.\n3. إذا كان فاقداً للوعي، ضعه في وضعية الأمان.\n4. إذا كان المسم مادة كاوية (كلور/حمض)، أعطه كوب حليب أو ماء ليشربه لتخفيف المادة.\n5. انقل للمشفى فوراً مع عبوة السم." },
    { icon: "fa-spider", title: "لدغات العقارب والأفاعي", steps: "1. حاول إبقاء المريض هادئاً وثابتاً لمنع انتشار السم.\n2. ثبت الطرف الملدوغ في وضع منخفض عن مستوى القلب.\n3. اغسل مكان اللدغة بالماء والصابون بلطف.\n4. لا تحاول شفط السم، أو كي الجرح، أو وضع ثلج.\n5. انقل المريض للمشفى فوراً حتى لو لم تظهر أعراض خطيرة." },
    { icon: "fa-head-side-cough", title: "التشنجات (الصرع)", steps: "1. لا تحرك الشخص أو تقيده أبداً.\n2. أبعد عنه الأشياء الحادة أو الصلبة لتجنب إصابته.\n3. ضع شيئاً طرياً (مثل وسادة) تحت رأسه.\n4. لا تضع أي شيء في فمه أبداً (لا ماء، لا ملعقة).\n5. بعد انتهاء التشنج، ضعه في وضعية الأمان (على جنبه) ليفيق بهدوء." }
];
window.openFirstAid = () => {
    const accordionHtml = firstAidData.map((item, index) => `
        <div class="accordion-item ${index === 0 ? 'active' : ''}">
            <div class="accordion-header" onclick="toggleFirstAidAccordion(this)">
                <div class="flex items-center gap-3"><i class="fas ${escapeHtml(item.icon)} text-red-600 text-lg w-8"></i><span>${escapeHtml(item.title)}</span></div>
                <i class="fas fa-chevron-down transition-transform"></i>
            </div>
            <div class="accordion-body"><div class="accordion-body-inner whitespace-pre-line">${escapeHtml(item.steps)}</div></div>
        </div>
    `).join('');
    openCtrlPanel('دليل الإسعافات الأولية الشامل', `<div class="flex flex-col gap-4"><div class="bg-red-50 border border-red-200 rounded-xl p-4 text-red-800 text-sm flex items-center gap-3"><i class="fas fa-ambulance text-xl"></i><span>هذه الإرشادات أولية ولا تغني عن الاتصال بالإسعاف (110) فوراً في الحالات الخطيرة.</span></div><div>${accordionHtml}</div></div>`, '#DC2626');
}

window.toggleFirstAidAccordion = (el) => { const item = el.parentElement; const isActive = item.classList.contains('active'); document.querySelectorAll('.accordion-item').forEach(i => i.classList.remove('active')); if (!isActive) item.classList.add('active'); }
// 7. Medical Symbols Guide
const medSymbolsData = [
    { symbol: "CBC", name: "صورة دم كاملة", desc: "تحليل يقيس مكونات الدم (كريات حمر، بيض، صفائح) للكشف عن فقر الدم أو الالتهابات." },
    { symbol: "Hb / Hgb", name: "الخضاب (الهيموغلوبين)", desc: "بروتين كريات الدم الحمراء الذي يحمل الأوكسجين. انخفاضه يدل على فقر الدم." },
    { symbol: "FBS", name: "السكر الصيامي", desc: "قياس مستوى السكر في الدم بعد صيام 8-12 ساعة لتشخيص السكري." },
    { symbol: "HbA1c", name: "السكر التراكمي", desc: "يقاس متوسط السكر في الدم خلال آخر 3 أشهر لمتابعة مرضى السكري." },
    { symbol: "WBC", name: "الكريات البيضاء", desc: "ارتفاعها يدل على وجود التهاب أو عدوى بكتيرية في الجسم." },
    { symbol: "RBC", name: "الكريات الحمراء", desc: "خلايا تنقل الأوكسجين. انخفاضها يعني فقر الدم (الأنيميا)." },
    { symbol: "BID / BD", name: "مرتين يومياً", desc: "توصف لتناول الدواء صباحاً ومساءً (كل 12 ساعة)." },
    { symbol: "TID / TDS", name: "ثلاث مرات يومياً", desc: "توصف لتناول الدواء ثلاث مرات (تقريباً كل 8 ساعات)." },
    { symbol: "QID", name: "أربع مرات يومياً", desc: "توصف لتناول الدواء أربع مرات (تقريباً كل 6 ساعات)." },
    { symbol: "PRN", name: "عند اللزوم", desc: "تؤخذ فقط عند الحاجة (مثل مسكنات الألم أو خافضات الحرارة)." },
    { symbol: "STAT", name: "فوراً", desc: "توصف للحالات الإسعافية، يجب إعطاء الدواء مباشرة وبدون تأخير." },
    { symbol: "PO", name: "عن طريق الفم", desc: "تعني تناول الدواء بلعاً عبر الفم." }
];
window.openMedSymbols = () => {
    openCtrlPanel('دليل رموز التحاليل والروشتات الطبية', `<div class="flex flex-col gap-4"><div class="bg-teal-50 border border-teal-200 rounded-xl p-4 text-teal-800 text-sm flex items-center gap-3"><i class="fas fa-balance-scale text-xl"></i><span><b>إخلاء مسؤولية:</b> هذا الدليل للثقافة العامة فقط ولا يهدف للتشخيص. راجع طبيبك لتفسير النتائج.</span></div><div class="relative"><input type="text" id="symbolSearch" class="ctrl-input pr-10" placeholder="ابحث عن رمز أو اسم التحليل..." oninput="filterMedSymbols()"><i class="fas fa-search absolute top-4 left-4 text-gray-400"></i></div><div id="symbolsGrid" class="grid grid-cols-1 sm:grid-cols-2 gap-3"></div></div>`, '#0D9488');
    renderMedSymbols(medSymbolsData);
}
function renderMedSymbols(data) {
    const grid = document.getElementById('symbolsGrid');
    if (!grid) return;
    if (data.length === 0) { grid.innerHTML = `<div class="col-span-2 text-center py-8 text-gray-400">لا توجد نتائج مطابقة</div>`; return; }
    grid.innerHTML = data.map(item => `<div class="med-symbol-card"><div class="med-symbol-badge">${escapeHtml(item.symbol)}</div><div class="font-bold text-sm mb-1" style="font-family: 'Noto Kufi Arabic'; color: var(--fg)">${escapeHtml(item.name)}</div><div class="text-xs leading-relaxed" style="color: var(--muted)">${escapeHtml(item.desc)}</div></div>`).join('');
}
window.filterMedSymbols = () => {
    const q = document.getElementById('symbolSearch').value.toLowerCase();
    const filtered = medSymbolsData.filter(item => item.symbol.toLowerCase().includes(q) || item.name.toLowerCase().includes(q));
    renderMedSymbols(filtered);
}

// 8. Smart Health Calculator
window.openHealthCalc = () => {
    openCtrlPanel('حاسبة الصحة (الوزن والسعرات)', `
        <div class="flex flex-col gap-5">
            <div class="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-indigo-800 text-sm flex items-center gap-3">
                <i class="fas fa-weight-scale text-xl"></i>
                <span>أدخل بياناتك لحساب مؤشر كتلة الجسم (BMI)، الوزن المثالي، واحتياجك اليومي من السعرات الحرارية.</span>
            </div>
            <div class="bg-white p-5 rounded-xl border grid grid-cols-1 sm:grid-cols-2 gap-3" style="border-color: var(--border)">
                <div><label class="block text-sm font-semibold mb-2">الجنس:</label><select id="healthGender" class="ctrl-input"><option value="male">ذكر</option><option value="female">أنثى</option></select></div>
                <div><label class="block text-sm font-semibold mb-2">العمر (سنة):</label><input type="number" id="healthAge" class="ctrl-input" placeholder="مثال: 25" min="15"></div>
                <div><label class="block text-sm font-semibold mb-2">الوزن (كغ):</label><input type="number" id="healthWeight" class="ctrl-input" placeholder="مثال: 70" step="0.1"></div>
                <div><label class="block text-sm font-semibold mb-2">الطول (سم):</label><input type="number" id="healthHeight" class="ctrl-input" placeholder="مثال: 170" step="0.1"></div>
                <div class="col-span-1 sm:col-span-2"><label class="block text-sm font-semibold mb-2">مستوى النشاط البدني:</label><select id="healthActivity" class="ctrl-input"><option value="1.2">خامل (بدون رياضة)</option><option value="1.375">نشاط خفيف (1-3 أيام أسبوعياً)</option><option value="1.55">نشاط متوسط (3-5 أيام أسبوعياً)</option><option value="1.725">نشاط عالي (6-7 أيام أسبوعياً)</option></select></div>
                <button onclick="calcHealth()" class="col-span-1 sm:col-span-2 py-3 rounded-xl text-white font-bold text-sm transition-all hover:opacity-90" style="background: #4F46E5;"><i class="fas fa-calculator ml-2"></i> احسب النتائج</button>
            </div>
            <div id="healthResult" class="hidden"></div>
        </div>
    `, '#4F46E5');
}
window.calcHealth = () => {
    const gender = document.getElementById('healthGender').value;
    const age = parseFloat(document.getElementById('healthAge').value);
    const weight = parseFloat(document.getElementById('healthWeight').value);
    const height = parseFloat(document.getElementById('healthHeight').value);
    const activity = parseFloat(document.getElementById('healthActivity').value);
    if (!age || !weight || !height) { showToast('الرجاء إدخال جميع البيانات بشكل صحيح'); return; }
    const heightM = height / 100;
    const bmi = weight / (heightM * heightM);
    let bmiCategory = "", bmiColor = "", bmiIcon = "";
    if (bmi < 18.5) { bmiCategory = "نحافة"; bmiColor = "#F59E0B"; bmiIcon = "fa-arrow-down"; }
    else if (bmi < 25) { bmiCategory = "وزن مثالي"; bmiColor = "#10B981"; bmiIcon = "fa-check"; }
    else if (bmi < 30) { bmiCategory = "زيادة وزن"; bmiColor = "#F59E0B"; bmiIcon = "fa-arrow-up"; }
    else { bmiCategory = "سمنة"; bmiColor = "#EF4444"; bmiIcon = "fa-exclamation"; }
    let idealWeight = 0;
    if (gender === 'male') { idealWeight = 50 + 0.91 * (height - 152.4); } else { idealWeight = 45.5 + 0.91 * (height - 152.4); }
    let bmr = 0;
    if (gender === 'male') { bmr = (10 * weight) + (6.25 * height) - (5 * age) + 5; } else { bmr = (10 * weight) + (6.25 * height) - (5 * age) - 161; }
    const calories = bmr * activity;
    document.getElementById('healthResult').classList.remove('hidden');
    document.getElementById('healthResult').innerHTML = `
        <div class="flex flex-col gap-4">
            <div class="bg-white p-6 rounded-2xl border-2 text-center" style="border-color: #4F46E5;">
                <div class="text-sm font-bold text-indigo-500 mb-2">مؤشر كتلة الجسم (BMI)</div>
                <div class="text-5xl font-black text-gray-800 mb-2">${escapeHtml(bmi.toFixed(1))}</div>
                <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold" style="background: ${escapeHtml(bmiColor)}20; color: ${escapeHtml(bmiColor)};"><i class="fas ${escapeHtml(bmiIcon)}"></i> ${escapeHtml(bmiCategory)}</div>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div class="bg-white p-5 rounded-2xl border text-center" style="border-color: var(--border);"><div class="w-12 h-12 mx-auto rounded-full bg-green-100 flex items-center justify-center mb-2"><i class="fas fa-bullseye text-green-600"></i></div><div class="text-xs text-gray-500 mb-1">الوزن المثالي التقريبي</div><div class="text-2xl font-black text-gray-800">${escapeHtml(idealWeight.toFixed(1))} كغ</div></div>
                <div class="bg-white p-5 rounded-2xl border text-center" style="border-color: var(--border);"><div class="w-12 h-12 mx-auto rounded-full bg-orange-100 flex items-center justify-center mb-2"><i class="fas fa-fire text-orange-500"></i></div><div class="text-xs text-gray-500 mb-1">السعرات اليومية للحفاظ</div><div class="text-2xl font-black text-gray-800">${escapeHtml(Math.round(calories))} سعرة</div></div>
            </div>
            <div class="bg-indigo-50 p-4 rounded-xl text-sm text-indigo-800 flex items-start gap-2"><i class="fas fa-lightbulb mt-1"></i><span>لخسارة الوزن: قلل 500 سعرة من احتياجك اليومي. لزيادة الوزن: أضف 500 سعرة. احرص دائماً على استشارة أخصائي التغذية قبل اتباع أي حمية.</span></div>
        </div>
    `;
}

// 9. Daily Water Intake Calculator
window.openWaterCalc = () => {
    openCtrlPanel('حاسبة كمية الماء اليومية', `
        <div class="flex flex-col gap-5">
            <div class="bg-cyan-50 border border-cyan-200 rounded-xl p-4 text-cyan-800 text-sm flex items-center gap-3">
                <i class="fas fa-glass-water text-xl"></i>
                <span>احسب احتياجك اليومي من الماء بناءً على وزنك ونشاطك لتجنب الجفاف.</span>
            </div>
            <div class="bg-white p-5 rounded-xl border grid grid-cols-1 gap-4" style="border-color: var(--border)">
                <div><label class="block text-sm font-semibold mb-2">وزن الجسم (كغ):</label><input type="number" id="waterWeight" class="ctrl-input" placeholder="مثال: 70" step="0.1" min="10"></div>
                <div class="flex flex-col gap-2">
                    <label class="flex items-center gap-3 cursor-pointer p-3 rounded-xl border hover:bg-gray-50" style="border-color: var(--border)"><input type="checkbox" id="waterActivity" class="w-5 h-5 accent-cyan-600"><span class="text-sm font-semibold">أمارس الرياضة أو نشاط بدني مجهد</span></label>
                    <label class="flex items-center gap-3 cursor-pointer p-3 rounded-xl border hover:bg-gray-50" style="border-color: var(--border)"><input type="checkbox" id="waterWeather" class="w-5 h-5 accent-cyan-600"><span class="text-sm font-semibold">الطقس حار جداً (أعلى من 30 درجة)</span></label>
                </div>
                <button onclick="calcWater()" class="w-full py-3 rounded-xl text-white font-bold text-sm transition-all hover:opacity-90" style="background: #0891B2;"><i class="fas fa-droplet ml-2"></i> احسب احتياجي من الماء</button>
            </div>
            <div id="waterResult" class="hidden"></div>
        </div>
    `, '#0891B2');
}
window.calcWater = () => {
    const weight = parseFloat(document.getElementById('waterWeight').value);
    const activity = document.getElementById('waterActivity').checked;
    const weather = document.getElementById('waterWeather').checked;
    if (!weight || weight <= 0) { showToast('الرجاء إدخال وزن صحيح', 'error'); return; }
    let waterMl = weight * 35;
    if (activity) waterMl += 500;
    if (weather) waterMl += 500;
    const waterLiters = (waterMl / 1000).toFixed(2);
    const waterCups = Math.round(waterMl / 250);
    document.getElementById('waterResult').classList.remove('hidden');
    document.getElementById('waterResult').innerHTML = `
        <div class="bg-white p-6 rounded-2xl border-2 text-center" style="border-color: #0891B2;">
            <div class="w-20 h-20 mx-auto rounded-full bg-cyan-100 flex items-center justify-center mb-4"><i class="fas fa-droplet text-4xl text-cyan-500"></i></div>
            <div class="text-sm font-bold text-cyan-600 mb-2">احتياجك اليومي التقريبي من الماء</div>
            <div class="text-5xl font-black text-gray-800 mb-4">${escapeHtml(waterLiters)} <span class="text-xl">لتر</span></div>
            <div class="flex justify-center gap-6 mb-4"><div><div class="text-xs text-gray-500">عدد الأكواب (250 مل)</div><div class="text-2xl font-black text-gray-800">${escapeHtml(waterCups)} كوب</div></div></div>
            <div class="bg-cyan-50 p-3 rounded-xl text-sm text-cyan-800 flex items-start gap-2 text-right"><i class="fas fa-info-circle mt-1"></i><span>وزع هذا المقدار على ساعات اليوم. ابدأ بكوب صباحاً، واحرص على الشرب قبل الشعور بالعطش. تجنب شرب كميات كبيرة دفعة واحدة.</span></div>
        </div>
    `;
}

// === 1. Chronic Diseases Nutrition Guide ===
const chronicNutritionData = [
    { disease: "السكري (Diabetes)", color: "#3B82F6", icon: "fa-syringe", advice: "التركيز على الألياف (الخضار الورقية، الشوفان، البقوليات). تجنب السكريات المضافة والعصائر المحلاة والمشروبات الغازية. تقسيم الوجبات لثلاث رئيسية وثلاث خفيفة للحفاظ على مستوى السكر." },
    { disease: "ارتفاع ضغط الدم (Hypertension)", color: "#EF4444", icon: "fa-heart-pulse", advice: "تقليل ملح الطعام (الصوديوم) إلى أقل من 5 غرام يومياً. تجنب المعلبات، اللحوم المصنعة، والمخللات. الإكثار من البوتاسيوم الموجود في الموز، البطاطا، والطماطم." },
    { disease: "الكوليسترول والدهون (Cholesterol)", color: "#F59E0B", icon: "fa-droplet", advice: "الابتعاد عن الدهون المشبعة (السمنة الحيوانية، الزبدة، المقليات). الاعتماد على الدهون الصحية (زيت الزيتون، الأفوكادو، المكسرات). تناول الأسماك الدهنية مرتين أسبوعياً." },
    { disease: "القولون العصبي (IBS)", color: "#8B5CF6", icon: "fa-pills", advice: "تجنب الأطعمة المحفزة (المنبهات، البقوليات، الكرنب، البصل). تناول وجبات صغيرة ومضغ الطعام جيداً. شرب كميات كافية من الماء وتجنب الإمساك." },
    { disease: "النقرس (Gout)", color: "#06B6D4", icon: "fa-bone", advice: "تجنب الأطعمة الغنية بالبيورينات (اللحوم الحمراء، المشروبات الغازية، المأكولات البحرية). الإكثار من شرب الماء (أكثر من 2 لتر يومياً) وتناول الكرز الذي يساعد في خفض حمض اليوريك." }
];
window.openChronicNutrition = () => {
    const cardsHtml = chronicNutritionData.map(d => `
        <div class="disease-card">
            <div class="disease-header" style="background: ${escapeHtml(d.color)};"><i class="fas ${escapeHtml(d.icon)} text-2xl text-white"></i><div><h4 class="font-bold text-white text-sm" style="font-family: 'Noto Kufi Arabic'">${escapeHtml(d.disease)}</h4></div></div>
            <div class="disease-body"><div class="text-xs font-bold text-gray-500 mb-1">النصائح الغذائية:</div><div class="text-sm text-gray-700 leading-relaxed">${escapeHtml(d.advice)}</div></div>
        </div>`).join('');
    openCtrlPanel('قسم التغذية للأمراض المزمنة', `<div class="flex flex-col gap-4"><div class="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-emerald-800 text-sm flex items-center gap-3"><i class="fas fa-bowl-food text-xl"></i><span>دليل غذائي مبسط لأمراض مزمنة شائعة. هذه الإرشادات استرشادية ويجب الالتزام بخطة الطبيب المعالج.</span></div><div class="grid grid-cols-1 sm:grid-cols-2 gap-4">${cardsHtml}</div></div>`, '#10B981');
}

// === 2. Pre-Visit Guide ===
window.openPreVisitGuide = () => {
    openCtrlPanel('دليل الإرشادات قبل زيارة الطبيب أو المخبر', `
        <div class="flex flex-col gap-5">
            <div class="bg-blue-50 border border-blue-200 rounded-xl p-4 text-blue-800 text-sm flex items-center gap-3"><i class="fas fa-clipboard-list text-xl"></i><span>تحضير نفسك قبل الزيارة الطبية يوفر الوقت ويساعد الطبيب على التشخيص الدقيق.</span></div>
            <div class="bg-white p-5 rounded-xl border" style="border-color: var(--border)">
                <h4 class="font-bold mb-4 text-sm flex items-center gap-2"><i class="fas fa-user-md text-blue-600"></i> قبل زيارة الطبيب</h4>
                <ul class="list-disc pr-5 space-y-2 text-sm text-gray-700">
                    <li><b>اكتب الأعراض:</b> سجل متى بدأ الألم، نوعه، وشدته.</li>
                    <li><b>الأدوية الحالية:</b> أحضر قائمة بكل الأدوية والفيتامينات التي تتناولها (أو علوبها).</li>
                    <li><b>التاريخ الطبي:</b> جهز معلومات عن العمليات السابقة والأمراض الوراثية في العائلة.</li>
                    <li><b>الأسئلة:</b> اكتب أي استفسار تود طرحه على الطبيب لكي لا تنساه.</li>
                    <li><b>الصيام:</b> اسأل العيادة إن كنت بحاجة للصيام قبل الزيارة (خاصة لتحاليل السكر أو الكوليسترول).</li>
                </ul>
            </div>
            <div class="bg-white p-5 rounded-xl border" style="border-color: var(--border)">
                <h4 class="font-bold mb-4 text-sm flex items-center gap-2"><i class="fas fa-flask text-red-600"></i> قبل زيارة المخبر للتحاليل</h4>
                <ul class="list-disc pr-5 space-y-2 text-sm text-gray-700">
                    <li><b>الصيام:</b> معظم تحاليل الدم (السكر، الدهون، الكلى، الكبد) تتطلب صياماً من 8 إلى 12 ساعة. الماء مسموح به.</li>
                    <li><b>الأدوية:</b> اسأل طبيبك إن كنت يجب أن تتوقف عن أخذ دوائك صباح التحليل (خاصة أدوية السكر والضغط).</li>
                    <li><b>الترطيب:</b> شرب كوبين من الماء قبل سحب الدم يسهل العثور على الأوردة.</li>
                    <li><b>الملابس:</b> ارتدِ ملابس بأكمام واسعة لتسهيل رفعها أثناء سحب الدم.</li>
                    <li><b>النشاط البدني:</b> تجنب الرياضة المجهدة قبل التحليل مباشرة لأنها قد تؤثر على بعض النتائج.</li>
                </ul>
            </div>
        </div>
    `, '#3B82F6');
}

// === 3. Food Interactions Table ===
const foodInteractionsData = [
    { med: "أدوية الضغط (ACE Inhibitors)", food: "الموز، الأفوكادو، بدائل الملح", effect: "ارتفاع خطير في نسبة البوتاسيوم في الدم" },
    { med: "الوارفارين (مسيلات الدم)", food: "الخضار الورقية الداكنة (السبانخ، البقدونس)", effect: "تقلل فاعلية الدواء وتزيد سيولة الدم" },
    { med: "أدوية السكري (Metformin)", food: "الكحول", effect: "خطر حدوث حموضة لاكتكية شديدة" },
    { med: "المضادات الحيوية (Tetracycline)", food: "منتجات الألبان (الحليب، الجبن)", effect: "تمنع امتصاص الدواء وتراكيزه في الجسم" },
    { med: "أدوية الكوليسترول (Statins)", food: "عصير الجريب فروت", effect: "تراكم الدواء في الدم مما يسبب آلاماً عضلية" },
    { med: "مسكنات الألم (NSAIDs)", food: "الكحول، التوابل الحارة", effect: "زيادة خطر نزيف المعدة والقرحة" }
];
window.openFoodInteractions = () => {
    const tableRows = foodInteractionsData.map(item => `<tr class="border-b" style="border-color: var(--border)"><td class="p-3 text-sm font-bold text-gray-800">${escapeHtml(item.med)}</td><td class="p-3 text-sm text-red-600">${escapeHtml(item.food)}</td><td class="p-3 text-sm text-gray-600">${escapeHtml(item.effect)}</td></tr>`).join('');
    openCtrlPanel('جدول تعارضات الأدوية مع الطعام', `<div class="flex flex-col gap-4"><div class="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-800 text-sm flex items-center gap-3"><i class="fas fa-utensils text-xl"></i><span>جدول إرشادي لأهم التداخلات بين الأدوية الشائعة والأطعمة. استشر الصيدلاني دائماً.</span></div><div class="bg-white rounded-xl border overflow-hidden" style="border-color: var(--border)"><table class="w-full text-right"><thead class="bg-gray-50"><tr class="border-b" style="border-color: var(--border)"><th class="p-3 text-xs font-bold text-gray-500">الدواء</th><th class="p-3 text-xs font-bold text-gray-500">الطعام الممنوع/المحظور</th><th class="p-3 text-xs font-bold text-gray-500">التأثير الجانبي</th></tr></thead><tbody>${tableRows}</tbody></table></div></div>`, '#D97706');
}

// === 4. Patient Self-Reminder Book (Local Storage) ===
let patientReminders = JSON.parse(localStorage.getItem('patientReminders')) || [];
window.openPatientReminder = () => {
    patientReminders = JSON.parse(localStorage.getItem('patientReminders')) || [];
    openCtrlPanel('دفتر التذكير الذاتي للمريض', `
        <div class="flex flex-col gap-5">
            <div class="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-indigo-800 text-sm flex items-center gap-3"><i class="fas fa-bell text-xl"></i><span>سجل أدويتك ومواعيدك هنا. يتم حفظها على جهازك لتذكيرك ذاتياً دون الحاجة للإنترنت.</span></div>
            <div class="bg-white p-5 rounded-xl border" style="border-color: var(--border)">
                <h4 class="font-bold mb-4 text-sm flex items-center gap-2"><i class="fas fa-plus-circle text-indigo-600"></i> إضافة تذكير جديد</h4>
                <form onsubmit="saveReminder(event)" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input type="text" id="reminderTitle" class="ctrl-input text-sm" placeholder="عنوان التذكير (مثال: دواء الضغط)" required>
                    <input type="datetime-local" id="reminderDate" class="ctrl-input text-sm" required>
                    <textarea id="reminderNotes" class="ctrl-input text-sm col-span-1 sm:col-span-2" rows="2" placeholder="ملاحظات (مثال: بعد الأكل)"></textarea>
                    <button type="submit" class="col-span-1 sm:col-span-2 py-3 rounded-xl text-white font-bold text-sm" style="background: #6366F1;"><i class="fas fa-save ml-2"></i> حفظ التذكير</button>
                </form>
            </div>
            <div class="bg-white p-5 rounded-xl border" style="border-color: var(--border)">
                <h4 class="font-bold mb-4 text-sm flex items-center gap-2"><i class="fas fa-list text-indigo-600"></i> تذكيراتي المحفوظة</h4>
                <div id="remindersList" class="flex flex-col gap-3"><p class="text-center py-8 text-gray-400 text-sm">لا توجد تذكيرات بعد.</p></div>
            </div>
        </div>
    `, '#6366F1');
    renderRemindersList();
}
window.saveReminder = (e) => {
    e.preventDefault(); const title = document.getElementById('reminderTitle').value.trim(); const date = document.getElementById('reminderDate').value; const notes = document.getElementById('reminderNotes').value.trim();
    if(!title || !date) { showToast('يرجى إدخال العنوان والتاريخ'); return; }
    patientReminders.push({ id: Date.now(), title, date, notes }); localStorage.setItem('patientReminders', JSON.stringify(patientReminders)); document.querySelector('#ctrlContent form').reset(); renderRemindersList(); showToast('تم حفظ التذكير بنجاح!');
}
window.deleteReminder = (id) => { patientReminders = patientReminders.filter(r => r.id !== id); localStorage.setItem('patientReminders', JSON.stringify(patientReminders)); renderRemindersList(); showToast('تم حذف التذكير'); }
function renderRemindersList() {
    const list = document.getElementById('remindersList'); if (!list) return;
    if (patientReminders.length === 0) { list.innerHTML = '<p class="text-center py-8 text-gray-400 text-sm">لا توجد تذكيرات بعد.</p>'; return; }
    list.innerHTML = patientReminders.map(r => { const dateObj = new Date(r.date); const formattedDate = dateObj.toLocaleString('ar-EG', { date: 'short', time: 'short', weekday: 'long' }); return `<div class="border rounded-xl p-4 flex items-center justify-between gap-3" style="border-color: var(--border)"><div class="flex items-center gap-3"><div class="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0"><i class="fas fa-clock text-indigo-600"></i></div><div><div class="font-bold text-sm text-gray-800">${escapeHtml(r.title)}</div><div class="text-xs text-gray-500 mt-1">${escapeHtml(formattedDate)}</div>${r.notes ? `<div class="text-xs text-gray-400 mt-1">${escapeHtml(r.notes)}</div>` : ''}</div></div><button onclick="deleteReminder(${r.id})" class="text-red-500 hover:text-red-700"><i class="fas fa-trash"></i></button></div>`; }).join('');
}

// === 5. Medicine Renewal Calculator ===
window.openMedRenewalCalc = () => {
    openCtrlPanel('حاسبة موعد تجديد الدواء', `
        <div class="flex flex-col gap-5">
            <div class="bg-cyan-50 border border-cyan-200 rounded-xl p-4 text-cyan-800 text-sm flex items-center gap-3"><i class="fas fa-calendar-check text-xl"></i><span>احسب متى سينفد دوائك لتقوم بتجديده من الصيدلية في الوقت المناسب.</span></div>
            <div class="bg-white p-5 rounded-xl border grid grid-cols-1 sm:grid-cols-2 gap-3" style="border-color: var(--border)">
                <div class="col-span-1 sm:col-span-2"><label class="block text-sm font-semibold mb-2">عدد حبات الدواء المتوفرة حالياً:</label><input type="number" id="medPillsCount" class="ctrl-input" placeholder="مثال: 30 حبة" min="1"></div>
                <div><label class="block text-sm font-semibold mb-2">عدد الحبات في اليوم:</label><input type="number" id="medPillsPerDay" class="ctrl-input" placeholder="مثال: 2 حبة" min="0.5" step="0.5"></div>
                <div><label class="block text-sm font-semibold mb-2">تاريخ بدء تناول الدواء:</label><input type="date" id="medStartDate" class="ctrl-input"></div>
                <button onclick="calcRenewal()" class="col-span-1 sm:col-span-2 py-3 rounded-xl text-white font-bold text-sm" style="background: #06B6D4;"><i class="fas fa-calculator ml-2"></i> احسب موعد التجديد</button>
            </div>
            <div id="renewalResult" class="hidden"></div>
        </div>
    `, '#06B6D4');
}
window.calcRenewal = () => {
    const pills = parseFloat(document.getElementById('medPillsCount').value); const perDay = parseFloat(document.getElementById('medPillsPerDay').value); const startDateStr = document.getElementById('medStartDate').value;
    if(!pills || !perDay || !startDateStr) { showToast('الرجاء إدخال جميع الحقول'); return; }
    if(perDay <= 0) { showToast('يجب إدخال جرعة يومية صحيحة'); return; }
    const daysSupply = Math.floor(pills / perDay); const startDate = new Date(startDateStr); const renewDate = new Date(startDate); renewDate.setDate(renewDate.getDate() + daysSupply);
    const today = new Date(); const diffTime = renewDate - today; const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    let statusText = "", statusColor = "";
    if (diffDays < 0) { statusText = "لقد نفد الدواء! يرجى تجديده فوراً."; statusColor = "#EF4444"; }
    else if (diffDays === 0) { statusText = "الدواء سينفد اليوم! جدده اليوم."; statusColor = "#F59E0B"; }
    else if (diffDays <= 3) { statusText = `متبقى ${diffDays} أيام فقط! استعد لتجديد الدواء.`; statusColor = "#F59E0B"; }
    else { statusText = `متبقى ${diffDays} يوماً على نفاد الدواء.`; statusColor = "#10B981"; }
    const formattedDate = renewDate.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    document.getElementById('renewalResult').classList.remove('hidden');
    document.getElementById('renewalResult').innerHTML = `<div class="bg-white p-6 rounded-2xl border-2 text-center" style="border-color: #06B6D4;"><div class="w-16 h-16 mx-auto rounded-full bg-cyan-100 flex items-center justify-center mb-4"><i class="fas fa-pills text-3xl text-cyan-500"></i></div><div class="text-sm font-bold text-cyan-600 mb-2">موعد نفاد الدواء المتوقع</div><div class="text-lg font-black text-gray-800 mb-4" style="font-family: 'Noto Kufi Arabic'">${escapeHtml(formattedDate)}</div><div class="bg-cyan-50 p-3 rounded-xl text-sm font-bold" style="color: ${escapeHtml(statusColor)};"><i class="fas fa-info-circle ml-1"></i> ${escapeHtml(statusText)}</div><div class="text-xs text-gray-500 mt-4">مدة كفاية الدواء الحالي: ${escapeHtml(daysSupply)} يوم</div></div>`;
}

// === Tool 1: Pre-Test & Scan Instructions (Professional Edition) ===
const prelabData = [
    { id:1, name:'فحص السكر الصائم (FBS)', cat:'blood', fasting:'8-12 ساعة', fastingClass:'fasting-8', icon:'fa-droplet', color:'#DC2626', instructions:['صيام 8-12 ساعة عن الطعام','يُسمح بشرب الماء بكميات قليلة','تجنب الأطعمة الدسمة مساء اليوم السابق','أخذ العينة صباحاً بشكل مفضل'], notes:'السكر الطبيعي الصائم: 70-100 ملغ/دل' },
    { id:2, name:'فحص الشحوم والدهون (Lipid Profile)', cat:'blood', fasting:'12-14 ساعة', fastingClass:'fasting-12', icon:'fa-vial', color:'#F59E0B', instructions:['صيام تام 12-14 ساعة','لا يُسمح بشرب الماء خلال فترة الصيام','تجنب الكحوليات 48 ساعة قبل الفحص','الامتناع عن الأطعمة الدسمة يومين قبل'], notes:'يشمل: الكولسترول الكلي، HDL، LDL، الدهون الثلاثية' },
    { id:3, name:'تحليل CBC (صورة دم كاملة)', cat:'blood', fasting:'لا يُطلب صيام', fastingClass:'fasting-none', icon:'fa-flask', color:'#059669', instructions:['لا يتطلب صيام','يمكن أخذه في أي وقت من اليوم','أخبر الفني إذا كنت تتناول أدوية'], notes:'يشمل: كريات حمراء، بيضاء، صفائح دموية، هيموغلوبين' },
    { id:4, name:'وظائف الكبد (LFT)', cat:'blood', fasting:'8-10 ساعات', fastingClass:'fasting-10', icon:'fa-liver', color:'#8B5CF6', instructions:['صيام 8-10 ساعات يُفضل','تجنب الأدوية المسكنة قبل الفحص بيوم','إذا كنت تتناول أدوية كبدية، أبلغ الفني'], notes:'يشمل: ALT, AST, ALP, البيليروبين، الألبومين' },
    { id:5, name:'إيكو / سونار البطن (Abdominal US)', cat:'imaging', fasting:'6-8 ساعات', fastingClass:'fasting-special', icon:'fa-wave-square', color:'#7C3AED', instructions:['صيام 6-8 ساعات لتصوير البطن العلوي','شرب 4-6 أكواب ماء قبل الفحص بساعة (مثانة ممتلئة)','لا تتبول قبل الفحص','تجنب الأطعمة الغازية يوم قبل'], notes:'المثانة الممتلئة ضرورية لتصوير الحوض' },
    { id:6, name:'أشعة الصدر (Chest X-Ray)', cat:'imaging', fasting:'لا يُطلب صيام', fastingClass:'fasting-none', icon:'fa-lungs', color:'#0EA5E9', instructions:['لا يتطلب صيام أو تحضير خاص','إزالة المجوهرات المعدنية من منطقة الصدر','إزالة الأزرار والأحزمة المعدنية','إخبار الفني في حال وجود حمل'], notes:'مدة الفحص: دقائق معدودة' },
    { id:7, name:'رنين مغناطيسي (MRI)', cat:'imaging', fasting:'حسب المنطقة', fastingClass:'fasting-special', icon:'fa-magnet', color:'#A855F7', instructions:['إزالة جميع المعادن: ساعات، أقراط، أسنان صناعية','لا يدخل معك أي إلكترونيات','أبلغ الفني إذا كان لديك: دعامة، منظم نبض','لـ MRI البطن: صيام 4-6 ساعات'], notes:'مدة الفحص: 30-60 دقيقة حسب المنطقة' },
    { id:8, name:'تحليل بول عام (Urinalysis)', cat:'urine', fasting:'لا يُطلب صيام', fastingClass:'fasting-none', icon:'fa-flask-vial', color:'#14B8A6', instructions:['العينة الأولى في الصباح هي الأفضل','جمع منتصف التبول (تجاهل الجزء الأول والأخير)','استخدم العبوة المعقمة المخصصة','تسليم العينة للمخبر خلال ساعتين'], notes:'لا تجمع العينة أثناء الدورة الشهرية' },
    { id:9, name:'فحص الحمل (Beta HCG - دم)', cat:'special', fasting:'لا يُطلب صيام', fastingClass:'fasting-none', icon:'fa-baby', color:'#EC4899', instructions:['لا يتطلب صيام','يمكن أخذ العينة في أي وقت','أخبر الفني بتاريخ آخر دورة'], notes:'يظهر الحمل في الدم بعد 7-10 أيام من الإخصاب' },
    { id:10, name:'تحليل غازات الدم (ABG)', cat:'special', fasting:'لا يُطلب صيام', fastingClass:'fasting-none', icon:'fa-wind', color:'#EF4444', instructions:['يُؤخذ من الشريان (مؤلم أكثر من الوريد)','لا يتطلب صيام','أبلغ الفني إذا كنت تتناول أكسجين','الراحة لمدة 20 دقيقة قبل الفحص'], notes:'يجب وضع ضغط على مكان الوخز لمدة 5 دقائق' }
];
window.openPreTestGuide = () => {
    const initialHtml = `
        <div class="flex flex-col gap-5">
            <div class="bg-blue-50 border border-blue-200 rounded-xl p-4 text-blue-800 text-sm flex items-center gap-3"><i class="fas fa-clipboard-list text-xl"></i><span>دليل أرشيفي سريع يجيب على تساؤلاتك قبل الذهاب للمختبر أو الأشعة. اتبعها لضمان دقة النتائج.</span></div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div class="bg-white rounded-2xl p-5 border border-red-100 shadow-sm hover:shadow-md transition-all glow-border"><div class="flex items-center gap-3 mb-3"><div class="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-500"><i class="fas fa-clock"></i></div><h4 class="font-bold text-sm">كم ساعة صيام لفحص السكر؟</h4></div><div class="flex items-center gap-3"><span class="fasting-badge fasting-8"><i class="fas fa-moon"></i> 8 - 12 ساعة</span><span class="text-xs" style="color:var(--muted)">يُسمح بشرب الماء</span></div></div>
                <div class="bg-white rounded-2xl p-5 border border-purple-100 shadow-sm hover:shadow-md transition-all glow-border"><div class="flex items-center gap-3 mb-3"><div class="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-500"><i class="fas fa-wave-square"></i></div><h4 class="font-bold text-sm">تعليمات إيكو / سونار البطن؟</h4></div><div class="flex items-center gap-3"><span class="fasting-badge fasting-special"><i class="fas fa-moon"></i> 6 - 8 ساعات</span><span class="text-xs" style="color:var(--muted)">معدة فارغة + مثانة ممتلئة</span></div></div>
            </div>
            <div class="bg-white rounded-2xl border overflow-hidden shadow-sm" style="border-color:var(--border)"><div class="p-4 border-b flex flex-wrap gap-2" style="border-color:var(--border);background:var(--bg-deep)"><button class="tab-btn active" onclick="filterPrelab('all',this)">الكل</button><button class="tab-btn" onclick="filterPrelab('blood',this)"><i class="fas fa-tint ml-1"></i>تحاليل دم</button><button class="tab-btn" onclick="filterPrelab('imaging',this)"><i class="fas fa-x-ray ml-1"></i>أشعة وتصوير</button><button class="tab-btn" onclick="filterPrelab('urine',this)"><i class="fas fa-flask ml-1"></i>تحاليل بول</button><button class="tab-btn" onclick="filterPrelab('special',this)"><i class="fas fa-star ml-1"></i>فحوصات خاصة</button></div><div id="prelabList"></div></div>
        </div>`;
    openCtrlPanel('التعليمات قبل التحاليل والفحوصات', initialHtml, '#3B82F6');
    renderPrelab('all');
};
function renderPrelab(filter='all') {
    const container = document.getElementById('prelabList'); if(!container) return;
    const items = filter === 'all' ? prelabData : prelabData.filter(d => d.cat === filter);
    container.innerHTML = items.map(item => `
        <div class="prelab-accordion-item border-b" style="border-color:var(--border)">
            <div class="prelab-toggle flex items-center justify-between p-4" onclick="togglePrelab(this)">
                <div class="flex items-center gap-3"><div class="w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0" style="background:${escapeHtml(item.color)}"><i class="fas ${escapeHtml(item.icon)}"></i></div><div><div class="font-bold text-sm">${escapeHtml(item.name)}</div><span class="fasting-badge ${escapeHtml(item.fastingClass)} text-[0.7rem] mt-1"><i class="fas ${item.fastingClass==='fasting-none'?'fa-sun':'fa-moon'}"></i> ${escapeHtml(item.fasting)}</span></div></div>
                <i class="fas fa-chevron-down text-xs transition-transform" style="color:var(--muted)"></i>
            </div>
            <div class="prelab-accordion"><div class="px-4 pb-4 pr-[68px]"><div class="bg-gray-50 rounded-xl p-4 mb-3" style="background:var(--bg-deep)"><div class="text-xs font-bold mb-2" style="color:var(--accent)"><i class="fas fa-list-check ml-1"></i> التعليمات:</div><ul class="space-y-2">${item.instructions.map(i => `<li class="flex items-start gap-2 text-xs" style="color:var(--fg-light)"><i class="fas fa-check-circle mt-0.5 flex-shrink-0" style="color:var(--accent)"></i><span>${escapeHtml(i)}</span></li>`).join('')}</ul></div>${item.notes ? `<div class="flex items-start gap-2 text-xs p-3 rounded-lg" style="background:#FEF9C3;color:#92400E"><i class="fas fa-lightbulb mt-0.5 flex-shrink-0"></i><span>${escapeHtml(item.notes)}</span></div>` : ''}</div></div>
        </div>`).join('');
}
window.filterPrelab = (cat, btn) => { document.querySelectorAll('#ctrlContent .tab-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active'); renderPrelab(cat); }
window.togglePrelab = (el) => { const accordion = el.nextElementSibling; const icon = el.querySelector('.fa-chevron-down'); const isOpen = accordion.classList.contains('open'); document.querySelectorAll('#ctrlContent .prelab-accordion.open').forEach(a => { a.classList.remove('open'); a.previousElementSibling.querySelector('.fa-chevron-down').style.transform = ''; }); if (!isOpen) { accordion.classList.add('open'); icon.style.transform = 'rotate(180deg)'; } };

// === Tool 2: Events & Gatherings First Aid ===
window.openEventsFirstAid = () => {
    const data = [
        { icon: "fa-users-slash", title: "الإغماء وسط الازدحام", steps: "1. افسح المجال للهواء النقي حول المصاب فوراً.\n2. اجعل المصاب مستلقياً على ظهره وارفع قدميه 30 سم لتحسين تدفق الدم للدماغ.\n3. فك الملابس الضيقة (ربطة العنق، الياقة، الحزام).\n4. إذا لم يفق خلال دقيقة واحدة، اطلب الإسعاف فوراً وابدأ بفحص تنفسه." },
        { icon: "fa-hand-holding-medical", title: "الجروح والنزيف الطفيف", steps: "1. اغسل يديك جيداً قبل التعامل مع الجرح.\n2. اضغط بقطعة شاش نظيفة أو قطن على الجرح لإيقاف النزيف.\n3. قم بتطهير الجرح بمادة مطهرة (مثل البيتادين أو الكحول حول الجرح وليس داخله).\n4. غط الجرح بضمادة معقمة. إذا كان النزيف غزيراً ولا يتوقف، ارفع العضو المصاب واطلب الإسعاف." },
        { icon: "fa-mug-hot", title: "الحروق البسيطة (شاي، قهوة، أراكيل)", steps: "1. ضع مكان الحرق تحت ماء جارٍ بارد (ليس مثلجاً) لمدة 10 إلى 15 دقيقة.\n2. لا تضع معجون أسنان، ليمون، صابون، أو زيوت على الحرق أبداً.\n3. غط الحرق بقطعة قماش نظيفة وجافة.\n4. لا تفقع الفقاعات إن ظهرت للحفاظ على الجلد من التلوث." },
        { icon: "fa-burger", title: "التسمم الغذائي المفاجئ", steps: "1. أكثر من شرب السوائل (ماء، مفرزات، شوربة) لتجنب الجفاف.\n2. لا تأخذ دواء لإيقاف الإسهال أو القيء فوراً، دع الجسم يطرد السموم.\n3. تناول وجبات خفيفة وسوائل دافئة عند تحسن الحالة.\n4. إذا استمر القيء أكثر من 24 ساعة، أو ظهر دم في البراز، أو ارتفعت الحرارة بشدة، توجه للطوارئ فوراً." },
        { icon: "fa-sun", title: "ضربة الشمس (المناسبات المكشوفة)", steps: "1. انقل المصاب لمكان بارد ومظلل فوراً.\n2. اخلع الملابس الثقيلة وضعه على بطانية باردة.\n3. رش جسمه بالماء وضع كمادات ثلج على الإبطين، الرقبة، والفخذين.\n4. إذا كان واعياً، أعطه ماء بارد ليشربه رشفاً. إذا فقد الوعي، اطلب الإسعاف ولا تعطه ماء عن الفم." },
        { icon: "fa-lungs", title: "الاختناق أثناء تناول الطعام", steps: "1. إذا كان المصاب يسعل بقوة، شجعه على الاستمرار ولا تتدخل.\n2. إذا لم يستطع التنفس أو الكلام، قف خلفه ولف ذراعيك حول خصره.\n3. اضغط بقوة للداخل والأعلى (مناورة هيمليك) 5 مرات متتالية.\n4. كرر الضغط حتى يخرج الطعام أو يفقد الوعي (عندها ابدأ الإنعاش القلبي واطلب الإسعاف)." },
        { icon: "fa-bone", title: "السقوط والاشتباه بكسور", steps: "1. لا تحرك العضو المصاب وحاول تثبيته في وضعه الحالي.\n2. ضع جبيرة (خشبة، أو مجلة صلبة) حول العظمة لتثبيتها.\n3. ضع كمادات ثلج ملفوفة بقطعة قماش على مكان الإصابة لتخفيف التورم.\n4. لا تحرك إعادة العظمة لمكانها أبداً، وانقل المصاب للمشفى بحذر أو اطلب الإسعاف." },
        { icon: "fa-pills", title: "هبوط السكر المفاجئ (لمرضى السكري)", steps: "1. إذا شعر شخص بعرق شديد، رجفة، أو تشوش بالوعي، اعطه فوراً عصيراً محلى، أو قطعة سكر، أو ملعقة عسل.\n2. لا تعطه شيئاً عن الفم إذا كان فاقداً للوعي تماماً لتجنب اختناقه.\n3. انتظر 15 دقيقة، إذا لم يتحسن، أعطه جرعة أخرى من السكر واطلب الإسعاف.\n4. بعد أن يستعيد وعيه وتتحسن حالته، أعطه وجبة خفيفة تحتوي على نشويات (شطيرة) لضمان استقرار السكر." }
    ];
    const html = data.map(d => `<div class="accordion-item"><div class="accordion-header" onclick="toggleAccordion(this)"><div class="flex items-center gap-3"><i class="fas ${escapeHtml(d.icon)} text-red-600 text-lg w-8"></i><span>${escapeHtml(d.title)}</span></div><i class="fas fa-chevron-down transition-transform"></i></div><div class="accordion-body"><div class="accordion-body-inner whitespace-pre-line">${escapeHtml(d.steps)}</div></div></div>`).join('');
    openCtrlPanel('إسعافات المناسبات والتجمعات', `<div class="flex flex-col gap-4"><div class="bg-red-50 border border-red-200 rounded-xl p-4 text-red-800 text-sm flex items-center gap-3"><i class="fas fa-kit-medical text-xl"></i><span>دليل سريع للتعامل مع أكثر الحوادث شيوعاً في الأفراح، المهرجانات، والتجمعات العائلية.</span></div><div>${html}</div></div>`, '#DC2626');
};

// === Interactive Medical Map ===
window.openMedicalMap = () => {
    openCtrlPanel('الخريطة الطبية ', `
        <div class="flex flex-col sm:flex-row gap-4 h-[70vh]">
            <div class="w-full sm:w-1/3 flex flex-col gap-2 overflow-y-auto pr-1" id="mapListContainer">
                <p class="text-center text-gray-400 text-sm py-10">جاري تحميل المنشآت...</p>
            </div>
            <div class="w-full sm:w-2/3 rounded-xl overflow-hidden border" style="border-color: var(--border)">
                <iframe id="mapFrame" width="100%" height="100%" frameborder="0" style="border:0; min-height: 400px;" src="https://maps.google.com/maps?q=الرحيبة%20سوريا&output=embed" allowfullscreen></iframe>
            </div>
        </div>
    `, '#10B981');
    renderMapList();
}
function renderMapList() {
    const container = document.getElementById('mapListContainer');
    if (!container) return;
    if (allData.length === 0) { container.innerHTML = '<p class="text-center text-gray-400 text-sm py-10">لا توجد منشآت.</p>'; return; }
    const typeColors = { hospital: 'var(--hospital)', clinic: 'var(--clinic)', center: 'var(--center)', lab: 'var(--lab)', doctor: 'var(--doctor)', pharmacy: 'var(--pharmacy)' };
    container.innerHTML = allData.map(item => {
        const color = typeColors[item.type] || 'var(--accent)';
        const locationQuery = encodeURIComponent((item.address || item.clinic || item.name) + ' الرحيبة سوريا');
        return `<div onclick="updateMapFrame('${locationQuery}')" class="p-3 rounded-lg border cursor-pointer hover:bg-gray-50 transition-all" style="border-color: var(--border)"><div class="flex items-center gap-2"><span class="w-3 h-3 rounded-full" style="background: ${escapeHtml(color)}"></span><span class="font-bold text-sm text-gray-800 truncate">${escapeHtml(item.name)}</span></div><div class="text-xs text-gray-500 mt-1 truncate">${escapeHtml(item.address || item.clinic || 'الرحيبة')}</div></div>`;
    }).join('');
}
window.updateMapFrame = (query) => { const frame = document.getElementById('mapFrame'); if (frame) frame.src = `https://maps.google.com/maps?q=${query}&output=embed`; };

// === Raheba Health Radar ===
const radarDiseasesData = {
    summer: [
        { id: 'poisoning', name: 'تسمم ونزلة معوية', icon: 'fa-temperature-high', color: '#F59E0B', symptoms: 'ألم بطن، إسهال، استفراغ، أو مغص حاد', advice: 'لوحظ تسجيل حالات تسمم مؤخراً، يرجى التأكد من غسل الخضار جيداً وعدم ترك الأطعمة خارج الثلاجة.' },
        { id: 'summer_cold', name: 'رشح صيفي ووجع الحلق', icon: 'fa-virus', color: '#DC2626', symptoms: 'وجع حلق، احتقان، بحة صوت، وتكسير عظام', advice: 'الرشح الصيفي شائع بسبب المكيفات، اضبط حرارتها معتدلة وتجنب التعرض المباشر للهواء البارد.' },
        { id: 'sunstroke', name: 'ضربة شمس وصداع', icon: 'fa-sun', color: '#3B82F6', symptoms: 'وجع رأس، دوخة، لعيان نفس من الحر', advice: 'اشرب كميات وفيرة من الماء، تجنب الخروج في أوقات الذروة، واستخدم واقي الشمس.' },
        { id: 'skin_allergy', name: 'حساسية وطفح جلدي', icon: 'fa-allergies', color: '#10B981', symptoms: 'حكة بالجلد، احمرار من الحر، وقرص حشرات', advice: 'لتجنب حساسية الصيف، استخدم كريمات مرطبة وتجنب التعرض المباشر لأشعة الشمس الحارقة.' }
    ],
    winter: [
        { id: 'flu', name: 'إنفلونزا ونزلة صدرية', icon: 'fa-virus-covid', color: '#DC2626', symptoms: 'سعال قحّة، حرارة، وسيلان أنف', advice: 'للوقاية من الإنفلونزا، غسل اليدين ضروري، وتجنب الزحام، وخذ قسطاً من الراحة إذا شعرت بالتعب.' },
        { id: 'throat_ear', name: 'التهاب حلق وأذن', icon: 'fa-ear-listen', color: '#F59E0B', symptoms: 'ألم بالبلع، وجع أذن، والتهاب لوز', advice: 'التهاب الحلق والأذن يزداد في البرد، اشرب سوائل دافئة واغلق النوافذ ليلاً.' },
        { id: 'joints', name: 'آلام مفاصل وروماتيزم', icon: 'fa-bone', color: '#3B82F6', symptoms: 'وجع ظهر، وتيبّس ركب ومفاصل مع البرد', advice: 'لتحسين آلام المفاصل في الشتاء، حافظ على دفء جسمك وتجنب التيارات الهوائية الباردة.' },
        { id: 'asthma', name: 'ضيق تنفس وحساسية', icon: 'fa-lungs', color: '#10B981', symptoms: 'ألم بالصدر وضيق في التنفس', advice: 'مرضى الربو يجب عليهم حمل البخاخ الوقائي وتجنب الغبار والدخان.' }
    ]
};
window.openRahebaRadar = () => {
    openCtrlPanel('رادار الرحيبة الصحي (التفاعلي) 📡', `
        <div class="flex flex-col gap-6">
            <div class="flex justify-center gap-3 bg-white p-2 rounded-2xl shadow-sm max-w-md mx-auto w-full">
                <button id="tabSummer" onclick="switchRadarTab('summer')" class="tab-btn active flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2">☀️ <span>حالات الصيف</span></button>
                <button id="tabWinter" onclick="switchRadarTab('winter')" class="tab-btn flex-1 py-3 rounded-xl font-bold text-sm text-gray-500 flex items-center justify-center gap-2">❄️ <span>حالات الشتاء</span></button>
            </div>
            <div id="radarCardsContainer" class="grid grid-cols-1 sm:grid-cols-2 gap-4"></div>
            <div class="text-center mt-4 p-6 bg-white rounded-2xl shadow-sm border" style="border-color: var(--border)">
                <p class="text-sm text-gray-600 mb-4">إذا كنت تعاني من أحد هذه الأعراض، ساعد مجتمعك بتسجيل حالتك لمتابعة انتشار الأمراض.</p>
                <button onclick="openRadarRegisterModal()" class="pulse-register bg-red-500 text-white px-10 py-4 rounded-2xl font-bold text-lg shadow-lg hover:bg-red-600 transition-all w-full sm:w-auto">➕ سَجّل حالتك الصحية الآن</button>
            </div>
        </div>
    `, '#4F46E5');
    supabase.from('radar_settings').select('*').eq('id', 'config').single().then(({ data }) => {
        if (data) { radarSettings = data; currentRadarTab = data.default_season || 'summer'; switchRadarTab(currentRadarTab); } 
        else { supabase.from('radar_settings').upsert({ id: 'config', default_season: 'summer', last_reset: 0 }); switchRadarTab('summer'); }
    });
    fetchRadarReports();
}
async function fetchRadarReports() {
    const { data } = await supabase.from('disease_reports').select('*');
    latestRadarReports = data || [];
    renderRadarCards();
}
window.switchRadarTab = (season) => {
    currentRadarTab = season;
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active', 'text-gray-500'));
    const tabS = document.getElementById('tabSummer'); const tabW = document.getElementById('tabWinter');
    if (tabS && tabW) { if (season === 'summer') { tabS.classList.add('active'); tabW.classList.add('text-gray-500'); } else { tabW.classList.add('active'); tabS.classList.add('text-gray-500'); } }
    renderRadarCards();
}
function renderRadarCards() {
    const container = document.getElementById('radarCardsContainer'); if (!container) return;
    const diseases = radarDiseasesData[currentRadarTab];
    const validReports = latestRadarReports.filter(r => new Date(r.timestamp).getTime() > (radarSettings.last_reset || 0));
    const seasonReports = validReports.filter(r => r.season === currentRadarTab);
    let counts = {}, newTodayCounts = {}, ongoingCounts = {};
    const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0); const todayTime = startOfToday.getTime();
    seasonReports.forEach(r => {
        const time = new Date(r.timestamp).getTime();
        counts[r.disease_id] = (counts[r.disease_id] || 0) + 1;
        if (time >= todayTime) { newTodayCounts[r.disease_id] = (newTodayCounts[r.disease_id] || 0) + 1; } 
        else { ongoingCounts[r.disease_id] = (ongoingCounts[r.disease_id] || 0) + 1; }
    });
    container.innerHTML = diseases.map(d => {
        const count = counts[d.id] || 0; const newToday = newTodayCounts[d.id] || 0; const ongoing = ongoingCounts[d.id] || 0;
        let badgeText = "وضع طبيعي 🟢", badgeColor = "#10B981", badgeBg = "#D1FAE5", barColor = "#10B981";
        if (count >= 21 && count <= 50) { badgeText = "انتشار متوسط 🟡"; badgeColor = "#F59E0B"; badgeBg = "#FEF3C7"; barColor = "#F59E0B"; } 
        else if (count > 50) { badgeText = "تنبيه انتشار 🔴"; badgeColor = "#DC2626"; badgeBg = "#FEE2E2"; barColor = "#DC2626"; }
        let barWidth = Math.min(100, (count / 50) * 100); 
        return `<div class="p-5 rounded-2xl border transition-all duration-300 hover:shadow-lg cursor-pointer" style="background: var(--card); border-color: var(--border);" onclick="toggleRadarTip('${escapeHtml(d.id)}')"><div class="flex items-center justify-between mb-4"><div class="flex items-center gap-3"><div class="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style="background: ${escapeHtml(d.color)}20; color: ${escapeHtml(d.color)};"><i class="fas ${escapeHtml(d.icon)}"></i></div><div><h4 class="font-bold text-base" style="color: var(--fg);">${escapeHtml(d.name)}</h4><p class="text-[11px]" style="color: var(--muted);">${escapeHtml(d.symptoms)}</p></div></div><span class="text-[10px] font-black px-2 py-1 rounded-lg" style="color: ${escapeHtml(badgeColor)}; background: ${escapeHtml(badgeBg)};">${escapeHtml(badgeText)}</span></div><div class="flex justify-between items-center text-xs mb-2"><span class="font-bold" style="color: var(--fg-light);">${escapeHtml(count)} حالة مسجلة</span></div><div class="flex justify-between text-[11px] mb-3 font-semibold" style="color: var(--muted);"><span>⚡ حالة جديدة اليوم: ${escapeHtml(newToday)}</span><span>⏳ حالات سابقة: ${escapeHtml(ongoing)}</span></div><div class="w-full rounded-full h-2.5" style="background: var(--bg-deep);"><div class="h-2.5 rounded-full transition-all duration-700" style="width: ${escapeHtml(barWidth)}%; background: ${escapeHtml(barColor)};"></div></div><div id="radarTip_${escapeHtml(d.id)}" class="hidden mt-4 p-3 rounded-xl text-xs flex items-start gap-2" style="background: rgba(37, 99, 235, 0.1); color: var(--fg-light); border: 1px solid rgba(37, 99, 235, 0.2);"><i class="fas fa-lightbulb mt-0.5" style="color: #2563EB;"></i><div><b style="color: #2563EB;">نصيحة الرادار:</b> ${escapeHtml(d.advice)}</div></div></div>`;
    }).join('');
}
window.toggleRadarTip = (id) => { const tipDiv = document.getElementById(`radarTip_${id}`); if (tipDiv) tipDiv.classList.toggle('hidden'); };
window.openRadarRegisterModal = () => {
    let lastVoteTime = 0;
    try { lastVoteTime = parseInt(localStorage.getItem('lastRadarVoteTime') || '0'); } catch(e) {}
    if (lastVoteTime > 0) {
        let diff = Date.now() - lastVoteTime; let cooldown = 3 * 24 * 60 * 60 * 1000;
        if (diff < cooldown) { let daysLeft = Math.ceil((cooldown - diff) / (24 * 60 * 60 * 1000)); showToast(`شُكراً لك! يمكنك تسجيل حالة جديدة بعد ${daysLeft} أيام لمراقبة تطور الحالة.`); return; }
    }
    const diseases = radarDiseasesData[currentRadarTab];
    const optionsHtml = diseases.map((d, index) => `
        <label class="flex items-center gap-3 p-3 border-2 rounded-xl cursor-pointer hover:bg-gray-50 transition-all" style="border-color: ${index === 0 ? d.color : '#e5e7eb'}" onclick="selectRadarOption(this, '${escapeHtml(d.id)}')">
            <input type="radio" name="radarDisease" class="hidden" ${index === 0 ? 'checked' : ''}>
            <i class="fas ${escapeHtml(d.icon)} text-xl" style="color: ${escapeHtml(d.color)};"></i>
            <div><div class="font-bold text-sm">${escapeHtml(d.name)}</div><div class="text-[10px] text-gray-500">${escapeHtml(d.symptoms)}</div></div>
        </label>
    `).join('');
    document.getElementById('modalContent').innerHTML = `
        <div class="p-6">
            <div class="flex justify-between items-center mb-6"><h3 class="font-bold text-xl">تسجيل حالة صحية</h3><button onclick="closeModal()" class="text-2xl hover:text-gray-400">&times;</button></div>
            <p class="text-sm text-gray-500 mb-4">اختر الفئة التي تعاني منها:</p>
            <div id="radarModalOptions" class="flex flex-col gap-3 mb-6">${optionsHtml}</div>
            <div class="mb-6"><label class="block text-sm font-semibold mb-2">منذ متى تعاني من هذه الأعراض؟</label><select id="radarDuration" class="ctrl-input text-sm"><option value="يوم واحد">يوم واحد</option><option value="2-3 أيام">2-3 أيام</option><option value="أكثر من أسبوع">أكثر من أسبوع</option></select></div>
            <button onclick="submitRadarVote()" class="w-full bg-red-500 text-white py-3 rounded-xl font-bold hover:bg-red-600 transition-all">تأكيد التسجيل</button>
        </div>`;
    document.getElementById('modalOverlay').classList.add('active'); lockScroll();
    window.selectedRadarDisease = diseases[0].id;
}
window.selectRadarOption = (element, id) => { document.querySelectorAll('#radarModalOptions label').forEach(l => l.style.borderColor = '#e5e7eb'); element.style.borderColor = '#0E7C5F'; window.selectedRadarDisease = id; }

// === FIX: Added the missing closing brace '}' that caused the site to hang ===
window.submitRadarVote = async () => {
    if (!window.selectedRadarDisease) return;
    const duration = document.getElementById('radarDuration').value;
    try {
        await supabase.from('disease_reports').insert([{ disease_id: window.selectedRadarDisease, season: currentRadarTab, duration: duration, timestamp: new Date().toISOString() }]);
        localStorage.setItem('lastRadarVoteTime', Date.now().toString());
        closeModal(); showToast('تم تسجيل حالتك بنجاح!', 'success');
        fetchRadarReports();
        setTimeout(() => {
            document.getElementById('modalContent').innerHTML = `<div class="p-8 text-center"><div class="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"><i class="fas fa-heart text-4xl text-red-500"></i></div><h3 class="font-bold text-xl mb-2 text-gray-800">نتمنى لك الشفاء العاجل!</h3><p class="text-sm text-gray-500 mb-6">تم إضافتك لرادار الرحيبة الصحي. ساهم تسجيلك في حماية المجتمع.</p><button onclick="redirectToDoctorsSearch()" class="w-full bg-blue-500 text-white py-4 rounded-xl font-bold mb-2 hover:bg-blue-600 transition-all">👨‍⚕️ تواصل مع الأطباء المتاحين الآن</button><button onclick="closeModal()" class="text-gray-400 py-2 text-sm hover:text-gray-600">إغلاق</button></div>`;
            document.getElementById('modalOverlay').classList.add('active');
        }, 300);
    } catch (err) { showToast('حدث خطأ', 'error'); }
}; 

window.redirectToDoctorsSearch = () => {
    closeModal(); closeCtrlPanel();
    const doctorsSection = document.getElementById('doctors');
    if (doctorsSection) doctorsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => {
        const searchInput = document.getElementById('inlineSearch') || document.getElementById('heroSearch');
        if (searchInput) {
            searchInput.focus();
            searchInput.style.transition = 'box-shadow 0.4s ease';
            searchInput.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.5)';
            setTimeout(() => { searchInput.style.boxShadow = ''; }, 3000);
        }
    }, 1000); 
};
window.setRadarDefaultSeason = async () => { try { await supabase.from('radar_settings').upsert({ id: 'config', default_season: document.getElementById('adminRadarSeason').value, last_reset: radarSettings.last_reset || 0 }); showToast("تم تحديث الفصل الافتراضي"); } catch (e) {} };
window.resetRadarVotes = async () => { try { await supabase.from('radar_settings').upsert({ id: 'config', default_season: radarSettings.default_season, last_reset: Date.now() }); showToast("تم تصفير العدادات بنجاح"); } catch (e) {} };

// === 11. Smart Vaccine Scheduler ===
const vaccineSchedule = [
    { age: 'عند الولادة', months: 0, name: 'لقاح السل (BCG) وشلل الأطفال (OPV-0)', notes: 'يُعطى في المشفى خلال الأيام الأولى من الولادة.' },
    { age: 'الشهر الثاني', months: 2, name: 'الخماسي (Pentavalent) + شلل الأطفال (OPV-1) + شلل الأطفال الحقن (IPV)', notes: 'يُعطى في المركز الصحي.' },
    { age: 'الشهر الرابع', months: 4, name: 'الخماسي (Pentavalent) + شلل الأطفال (OPV-2)', notes: 'جرعة ثانية.' },
    { age: 'الشهر السادس', months: 6, name: 'الخماسي (Pentavalent) + شلل الأطفال (OPV-3) + شلل الأطفال الحقن (IPV)', notes: 'جرعة ثالثة وأخيرة للخماسي.' },
    { age: 'الشهر التاسع', months: 9, name: 'لقاح الحصبة (MR)', notes: 'جرعة أولى للحصبة والحصبة الألمانية.' },
    { age: 'الشهر الخامس عشر', months: 15, name: 'جرعة منشطة للحصبة (MR)', notes: 'جرعة ثانية منشطة.' },
    { age: 'سنة ونصف (18 شهر)', months: 18, name: 'المنشطة الأولى للخماسي وشلل الأطفال', notes: 'جرعة منشطة (DTP+OPV).' },
    { age: '4 إلى 6 سنوات', months: 54, name: 'المنشطة الثانية للخماسي وشلل الأطفال', notes: 'يُعطى قبل دخول المدرسة.' }
];
window.openVaccineScheduler = () => {
    openCtrlPanel('حاسبة جدول لقاحات الطفل', `
        <div class="flex flex-col gap-5">
            <div class="bg-orange-50 border border-orange-200 rounded-xl p-4 text-orange-800 text-sm flex items-center gap-3"><i class="fas fa-syringe text-xl"></i><span>أدخل تاريخ ميلاد طفلك لحساب مواعيد اللقاحات بدقة ومعرفة اللقاح المستحق حالياً.</span></div>
            <div class="bg-white p-5 rounded-xl border" style="border-color: var(--border)">
                <label class="block text-sm font-semibold mb-2">تاريخ ميلاد الطفل:</label>
                <input type="date" id="vaccBirthDate" class="ctrl-input" required>
                <button onclick="calcVaccines()" class="w-full mt-4 py-3 rounded-xl text-white font-bold text-sm transition-all hover:opacity-90" style="background: #F97316;"><i class="fas fa-calculator ml-2"></i> احسب جدول اللقاحات</button>
            </div>
            <div id="vaccResult" class="hidden flex flex-col gap-3"></div>
        </div>
    `, '#F97316');
}
window.calcVaccines = () => {
    const dateVal = document.getElementById('vaccBirthDate').value;
    if (!dateVal) { showToast('الرجاء إدخال تاريخ الميلاد'); return; }
    const birthDate = new Date(dateVal);
    const today = new Date();
    const diffTime = today - birthDate;
    const diffMonths = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 30.44));
    if (diffMonths < 0 || diffMonths > 72) { showToast('تاريخ الميلاد غير منطقي', 'error'); return; }
    const resultContainer = document.getElementById('vaccResult');
    resultContainer.classList.remove('hidden');
    let html = `<div class="bg-white p-4 rounded-xl border text-center mb-2" style="border-color: var(--border)"><div class="text-sm text-gray-500">عمر الطفل الحالي</div><div class="text-2xl font-black text-orange-600">${escapeHtml(diffMonths)} شهر</div></div>`;
    html += vaccineSchedule.map(v => {
        const vaccDate = new Date(birthDate); vaccDate.setMonth(vaccDate.getMonth() + v.months);
        const isPast = diffMonths > v.months + 1; const isDue = diffMonths >= v.months && diffMonths <= v.months + 1;
        let statusBadge = '', cardClass = 'border-gray-200 bg-gray-50', textColor = 'text-gray-500';
        if (isPast) { statusBadge = `<span class="text-xs px-2 py-1 rounded bg-green-100 text-green-700 inline-block mb-2"><i class="fas fa-check-circle"></i> تم تنفيذه</span>`; } 
        else if (isDue) { cardClass = 'border-orange-400 bg-orange-50 shadow-md'; textColor = 'text-orange-800'; statusBadge = `<span class="text-xs px-2 py-1 rounded bg-orange-200 text-orange-900 inline-block mb-2 animate-pulse font-bold"><i class="fas fa-exclamation-circle"></i> مستحق الآن</span>`; } 
        else { statusBadge = `<span class="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 inline-block mb-2"><i class="fas fa-clock"></i> قادم قريباً</span>`; }
        const formattedDate = vaccDate.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
        return `<div class="p-4 rounded-xl border ${escapeHtml(cardClass)} transition-all">${statusBadge}<div class="font-bold ${escapeHtml(textColor)} text-sm">${escapeHtml(v.name)}</div><div class="text-xs text-gray-400 mt-1">عمر الطفل وقتها: ${escapeHtml(v.age)}</div><div class="text-xs font-semibold text-gray-600 mt-1">الموعد المقترح: ${escapeHtml(formattedDate)}</div>${v.notes ? `<div class="text-xs mt-2 pt-2 border-t border-dashed" style="border-color:var(--border); color: var(--muted)"><i class="fas fa-info-circle"></i> ${escapeHtml(v.notes)}</div>` : ''}</div>`;
    }).join('');
    resultContainer.innerHTML = html;
}

// === 1. Ask a Doctor Q&A (اسأل طبيب ) ===
window.openAskDoctor = (docName) => {
    window.tempDoctorName = docName || null; 
    openCtrlPanel('اسأل طبيب ', `
        <div class="flex flex-col gap-5">
            <div class="bg-sky-50 border border-sky-200 rounded-xl p-4 text-sky-800 text-sm flex items-center gap-3">
                <i class="fas fa-comments text-xl"></i>
                <span>اطرح سؤالك الطبي ليقوم الأطباء بالإجابة عليه. (الأسئلة عامة ولا تغني عن الكشف المباشر).</span>
            </div>
            <div class="bg-white p-5 rounded-xl border" style="border-color: var(--border)">
                <h4 class="font-bold mb-4 text-sm flex items-center gap-2"><i class="fas fa-question-circle text-sky-600"></i> اطرح سؤالاً جديداً</h4>
              <form onsubmit="submitQuestion(event)" class="flex flex-col gap-3">
    <input type="text" id="website_url" name="website_url" style="position: absolute; left: -9999px; width: 1px; height: 1px; opacity: 0;" tabindex="-1" autocomplete="off">
    
    <input type="text" id="qaName" class="ctrl-input text-sm" placeholder="الاسم (اختياري - يمكن كتابة مجهول)" required>
    <select id="qaCategory" class="ctrl-input text-sm">
        <option>طب عام / باطنة</option><option>أطفال</option><option>نسائية وتوليد</option>
        <option>جلدية</option><option>عظمية</option><option>أسنان</option><option>أخرى</option>
    </select>
    <textarea id="qaText" class="ctrl-input text-sm" rows="3" placeholder="اكتب تفاصيل السؤال والأعراض بوضوح..." required></textarea>
    <button type="submit" class="py-3 rounded-xl text-white font-bold text-sm" style="background: #0EA5E9">نشر السؤال</button>
</form>
            </div>
            <div class="bg-white p-5 rounded-xl border" style="border-color: var(--border)">
                <h4 class="font-bold mb-4 text-sm">الأسئلة والإجابات</h4>
                <div id="qaListContainer" class="flex flex-col gap-4">
                    <p class="text-center py-8 text-gray-400 text-sm">جاري تحميل الأسئلة...</p>
                </div>
            </div>
        </div>
    `, '#0EA5E9');
        fetchQuestions();
    window.askDoctorOpenTime = Date.now(); 
}
async function fetchQuestions() {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase.from('medical_questions').select('*').in('status', ['open', 'answered']).gte('created_at', weekAgo);
    if (error) { 
        
        const container = document.getElementById('qaListContainer');
        if (container) container.innerHTML = '<p class="text-center py-8 text-red-500 text-sm">حدث خطأ في تحميل الأسئلة.</p>';
        return; 
    }
    allQuestions = data || [];
    renderQAList();
}
function renderQAList() {
    const container = document.getElementById('qaListContainer');
    if (!container) return;
    if (allQuestions.length === 0) {
        container.innerHTML = '<p class="text-center py-8 text-gray-400 text-sm">لا توجد أسئلة حالياً. كن أول من يطرح سؤالاً!</p>';
        return;
    }
    const isDoctorMode = window.tempDoctorName ? true : false;
    container.innerHTML = allQuestions.sort((a,b) => (b.created_at||'').localeCompare(a.created_at||'')).map(q => {
        let answersHtml = '';
        if (q.answers && q.answers.length > 0) {
            answersHtml = q.answers.map(ans => `
                <div class="bg-green-50 border border-green-200 p-3 rounded-lg mt-2 text-right">
                    <div class="text-xs font-bold text-green-800 flex items-center gap-1"><i class="fas fa-user-md"></i> ${escapeHtml(ans.doctorName)}</div>
                    <div class="text-sm text-gray-700 mt-1 whitespace-pre-line">${escapeHtml(ans.text)}</div>
                </div>
            `).join('');
        }
        let answerSection = '';
        if (isDoctorMode) {
            answerSection = `
                <textarea id="ansText_${q.id}" class="ctrl-input text-sm py-1" rows="2" placeholder="اكتب إجابتك كطبيب..."></textarea>
                <button onclick="submitAnswer('${q.id}')" class="mt-2 w-full py-2 rounded-lg bg-green-600 text-white text-sm font-semibold">إرسال الإجابة</button>
            `;
        } else {
            answerSection = `<p class="text-xs text-gray-400 text-center">يمكن للأطباء فقط الإجابة على هذا السؤال.</p>`;
        }
        return `
            <div class="border rounded-xl p-4" style="border-color: var(--border)">
                <div class="flex justify-between items-start mb-2">
                    <div>
                        <span class="text-xs px-2 py-1 rounded bg-sky-100 text-sky-700 inline-block mb-1">${escapeHtml(q.category)}</span>
                        <h5 class="font-bold text-sm text-gray-800">${escapeHtml(q.name)}</h5>
                    </div>
                </div>
                <p class="text-sm text-gray-600 whitespace-pre-line bg-gray-50 p-2 rounded-lg">${escapeHtml(q.text)}</p>
                ${answersHtml}
                <div class="mt-3 border-t pt-3" style="border-color: var(--border)">
                    ${answerSection}
                </div>
            </div>
        `;
    }).join('');
}
window.submitQuestion = async (e) => {
    e.preventDefault();
    const submitBtn = e.target.querySelector('button[type="submit"]');
    
    // 1. مصيدة البوتات (Honeypot): إذا تم ملء الحقل المخفي، فهو بوت
    const honeypotField = document.getElementById('website_url');
    if (honeypotField && honeypotField.value !== '') {
        showToast('تم رفض النشر.', 'error');
        return; // أوقف العملية بصمت
    }

    // 2. مصيدة الوقت (Time Trap): إذا أرسل السؤال في أقل من 3 ثوانٍ، فهو بوت
    if (window.askDoctorOpenTime && (Date.now() - window.askDoctorOpenTime < 3000)) {
        showToast('جاري المعالجة، يرجى الانتظار قليلاً قبل الإرسال.', 'error');
        return;
    }

    const name = document.getElementById('qaName').value.trim() || 'مجهول';
    const category = document.getElementById('qaCategory').value;
    const text = document.getElementById('qaText').value.trim();
    
    if (!text) return;

    // 3. فلتر الكلمات الممنوعة
    if (containsBadWords(text) || containsBadWords(name)) {
        showToast('تم رفض السؤال لاحتوائه على كلمات غير لائقة أو إعلانية.', 'error');
        return; // إيقاف الإرسال
    }

    submitBtn.disabled = true; 
    submitBtn.innerText = 'جاري النشر...';
    
    try {
        const { error } = await supabase.from('medical_questions').insert([{ name, category, text, status: 'open', answers: [] }]);
        if (error) throw error;
        
        // === إشعار للجميع بوجود سؤال طبي جديد ===
        await sendPushNotification(null, "سؤال طبي جديد ❓", `تم طرح سؤال جديد: ${text.substring(0, 40)}...`, 'all');
        
        showToast('تم نشر سؤالك بنجاح!', 'success');     
        e.target.reset();
        fetchQuestions();
    } catch (err) { 
        showToast('حدث خطأ أثناء النشر: ' + err.message, 'error'); 
    } finally {
        submitBtn.disabled = false; 
        submitBtn.innerText = 'نشر السؤال';
    }
}
window.submitAnswer = async (qId) => {
    const input = document.getElementById(`ansText_${qId}`);
    const text = input.value.trim();
    if (!text) return;
    const docName = window.tempDoctorName || 'طبيب';
    try {
        const q = allQuestions.find(x => x.id === qId);
        if (!q) return;
        const currentAnswers = q.answers || [];
        currentAnswers.push({ doctorName: docName, text: text, timestamp: new Date().toISOString() });
        const { error } = await supabase.from('medical_questions').update({ answers: currentAnswers, status: 'answered' }).eq('id', qId);
        if (error) throw error;
        showToast('تم نشر إجابتك!', 'success');
        fetchQuestions();
    } catch (err) { 
        showToast('خطأ في إرسال الإجابة: ', 'error' + err.message); 
        
    }
}

// === Payment Modal ===
window.openPaymentModal = (type, name) => {
    let featuresHtml = '';
    if (type === 'طبيب') {
        featuresHtml = `
        <div class="flex items-center gap-3"><i class="fas fa-circle-check text-emerald-600 text-lg"></i><span class="text-sm font-semibold text-gray-700">إحصائيات متقدمة (عدد زيارات ملفك وعدد الحجوزات).</span></div>
        <div class="flex items-center gap-3"><i class="fas fa-circle-check text-emerald-600 text-lg"></i><span class="text-sm font-semibold text-gray-700">إدارة الحجوزات والمواعيد واستقبال الطلبات مباشرة.</span></div>
        <div class="flex items-center gap-3"><i class="fas fa-circle-check text-emerald-600 text-lg"></i><span class="text-sm font-semibold text-gray-700">ظهور اسمك في <b>قمة نتائج البحث</b> قبل باقي الأطباء.</span></div>
        <div class="flex items-center gap-3"><i class="fas fa-circle-check text-emerald-600 text-lg"></i><span class="text-sm font-semibold text-gray-700">إمكانية <b>الحجز الإلكتروني</b> للمرضى من خلال موقعك.</span></div>
        <div class="flex items-center gap-3"><i class="fas fa-circle-check text-emerald-600 text-lg"></i><span class="text-sm font-semibold text-gray-700">غرفة محادثة <b>(دردشة مباشرة)</b> مع المريض داخل المنصة.</span></div>
        <div class="flex items-center gap-3"><i class="fas fa-circle-check text-emerald-600 text-lg"></i><span class="text-sm font-semibold text-gray-700">إصدار <b>روشتات طبية إلكترونية موثقة</b> تُحفظ في ملف المريض.</span></div>
        <div class="flex items-center gap-3"><i class="fas fa-circle-check text-emerald-600 text-lg"></i><span class="text-sm font-semibold text-gray-700">الوصول السريع للملف الصحي للمريض عبر <b>مسح رمز QR</b>.</span></div>
        `;
    } else { 
        featuresHtml = `
        <div class="flex items-center gap-3"><i class="fas fa-circle-check text-emerald-600 text-lg"></i><span class="text-sm font-semibold text-gray-700">ظهور اسم صيدليتك في <b>قمة نتائج البحث</b> قبل باقي الصيدليات.</span></div>
        <div class="flex items-center gap-3"><i class="fas fa-circle-check text-emerald-600 text-lg"></i><span class="text-sm font-semibold text-gray-700">استقبال <b>طلبات الأدوية العاجلة</b> من المرضى مباشرة في لوحة التحكم.</span></div>
        <div class="flex items-center gap-3"><i class="fas fa-circle-check text-emerald-600 text-lg"></i><span class="text-sm font-semibold text-gray-700">التحكم بإظهار حالة <b>(مفتوح / مغلق / مناوبة ليلية)</b> للمرضى.</span></div>
        <div class="flex items-center gap-3"><i class="fas fa-circle-check text-emerald-600 text-lg"></i><span class="text-sm font-semibold text-gray-700">إحصائيات متقدمة (عدد الأدوية التي قمت بتوفيرها للمرضى).</span></div>
        `;
    }

    // Using encodeURIComponent for URL safety
    const safeType = encodeURIComponent(type);
    const safeName = encodeURIComponent(name);
    const htmlSafeType = escapeHtml(type);
    const htmlSafeName = escapeHtml(name);

    document.getElementById('modalContent').innerHTML = `
        <div class="p-6 text-center">
            <div class="w-16 h-16 mx-auto rounded-full bg-gradient-to-tr from-yellow-400 to-orange-500 flex items-center justify-center mb-4 shadow-lg shadow-orange/30">
                <i class="fas fa-crown text-3xl text-white"></i>
            </div>
            <h3 class="text-xl font-black mb-1" style="font-family: 'Noto Kufi Arabic'">اشتراك ${htmlSafeType} الاحترافي</h3>
            <p class="text-xs text-gray-500 mb-5">أهلا دكتور/ة <b>${htmlSafeName}</b>، انضم لنخبة ${htmlSafeType === 'طبيب' ? 'الأطباء' : 'الصيدليات'} وأفتح أقساماً متقدمة في موقعك .</p>
            <div class="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-right mb-6 space-y-3">
                <div class="flex items-center gap-3"><i class="fas fa-star text-yellow-500 text-lg"></i><span class="text-sm font-bold text-gray-800">الحصول على <b>شارة التوثيق الذهبية</b> لزيادة ثقة المرضى.</span></div>
                ${featuresHtml}
            </div>
            <div class="bg-gray-50 border border-gray-200 rounded-2xl p-5 mb-5 relative overflow-hidden shadow-inner">
                <div class="absolute top-0 right-0 bg-yellow-400 text-yellow-900 text-[10px] font-bold py-1 px-3 rounded-bl-xl flex items-center gap-1 shadow-sm"><i class="fas fa-bolt"></i> دفع سريع ومباشر</div>
                <h4 class="font-bold text-gray-800 text-base mb-4 mt-3" style="font-family: 'Noto Kufi Arabic'">اختر طريقة الدفع المناسبة لك:</h4>
                <div class="grid grid-cols-2 gap-3 mb-5">
                    <button id="btn-shamcash" onclick="togglePaymentMethod('shamcash')" class="py-3 rounded-xl border-2 border-blue-500 bg-blue-50 text-blue-700 font-bold text-sm flex flex-col items-center justify-center gap-1 transition-all">
                        <i class="fas fa-mobile-screen text-xl"></i><span>شام كاش</span>
                    </button>
                    <button id="btn-cash" onclick="togglePaymentMethod('cash')" class="py-3 rounded-xl border-2 border-gray-300 bg-white text-gray-600 font-bold text-sm flex flex-col items-center justify-center gap-1 transition-all">
                        <i class="fas fa-hand-holding-dollar text-xl"></i><span>دفع النقدي(المباشر)</span>
                    </button>
                </div>
                <div id="shamcash-details" class="text-right">
                    <div class="bg-white p-2 rounded-2xl border-4 border-white shadow-lg w-44 h-44 mx-auto mb-5">
                        <img src="https://z-cdn-media.chatglm.cn/files/533bb04c-b262-4f21-826a-71b187260747.png?auth_key=1886692436-f4137efd272049179bd92d56b0081347-0-fdecf35d303f970d7d8aac45cca966ba" alt="رمز الدفع شام كاش" class="w-full h-full rounded-lg object-contain">
                    </div>
                    <div class="space-y-3 mb-5">
                        <div class="flex items-start gap-3"><div class="bg-green-500 text-white w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 shadow-md">1</div><div class="text-sm text-gray-700 leading-relaxed pt-0.5">افتح تطبيق <b>شام كاش</b> وامسح الرمز أعلاه لتتم عملية التحويل بكل سهولة.</div></div>
                        <div class="flex items-start gap-3"><div class="bg-green-500 text-white w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 shadow-md">2</div><div class="text-sm text-gray-700 leading-relaxed pt-0.5">احفظ صورة (Screenshot) لإشعار الدفع الناجح.</div></div>
                        <div class="flex items-start gap-3"><div class="bg-green-500 text-white w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 shadow-md">3</div><div class="text-sm text-gray-700 leading-relaxed pt-0.5">اضغط على زر الواتساب أدناه وأرسل الصورة لتقوم الإدارة بتفعيل حسابك فوراً.</div></div>
                    </div>
                </div>
                <div id="cash-details" class="text-right hidden">
                    <div class="space-y-3 mb-5">
                        <div class="flex items-start gap-3"><div class="bg-green-500 text-white w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 shadow-md">1</div><div class="text-sm text-gray-700 leading-relaxed pt-0.5">اضغط على زر الواتساب أدناه لمراسلة الإدارة .</div></div>
                        <div class="flex items-start gap-3"><div class="bg-green-500 text-white w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 shadow-md">2</div><div class="text-sm text-gray-700 leading-relaxed pt-0.5">قم بالدفع نقدياً (مباشر) .</div></div>
                        <div class="flex items-start gap-3"><div class="bg-green-500 text-white w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 shadow-md">3</div><div class="text-sm text-gray-700 leading-relaxed pt-0.5">سيتم تفعيل حسابك فوراً بعد تأكيد الدفع.</div></div>
                    </div>
                </div>
            </div>
            <a id="dynamicWpBtn" data-type="${htmlSafeType}" data-name="${htmlSafeName}" href="https://wa.me/963980390813?text=مرحباً، أريد تأكيد دفع اشتراك ${safeType}: ${safeName}" target="_blank" class="w-full py-3.5 rounded-xl bg-green-500 text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-green-600 transition-all shadow-md hover:shadow-lg">
                <i class="fas fa-whatsapp text-lg"></i> <span id="dynamicWpBtnText">تأكيد الدفع عبر الواتساب</span>
            </a>
            <button onclick="closeModal()" class="w-full py-2 mt-2 rounded-xl border font-bold text-sm transition-colors hover:bg-gray-50" style="border-color: var(--border); color: var(--muted)">إغلاق</button>
        </div>
    `;
    document.getElementById('modalOverlay').classList.add('active');
    lockScroll();
}

window.togglePaymentMethod = (method) => {
    const shamcashDetails = document.getElementById('shamcash-details');
    const cashDetails = document.getElementById('cash-details');
    const btnShamcash = document.getElementById('btn-shamcash');
    const btnCash = document.getElementById('btn-cash');
    const dynamicBtn = document.getElementById('dynamicWpBtn');
    const dynamicBtnText = document.getElementById('dynamicWpBtnText');
    
    // Secure extraction for URL
    const type = encodeURIComponent(dynamicBtn.dataset.type);
    const name = encodeURIComponent(dynamicBtn.dataset.name);

    if (method === 'shamcash') {
        shamcashDetails.classList.remove('hidden');
        cashDetails.classList.add('hidden');
        btnShamcash.classList.remove('border-gray-300', 'bg-white', 'text-gray-600');
        btnShamcash.classList.add('border-blue-500', 'bg-blue-50', 'text-blue-700');
        btnCash.classList.remove('border-blue-500', 'bg-blue-50', 'text-blue-700');
        btnCash.classList.add('border-gray-300', 'bg-white', 'text-gray-600');
        dynamicBtnText.innerText = "تأكيد الدفع عبر الواتساب";
        dynamicBtn.href = `https://wa.me/963980390813?text=مرحباً، أريد تأكيد دفع اشتراك ${type}: ${name}`;
    } else {
        shamcashDetails.classList.add('hidden');
        cashDetails.classList.remove('hidden');
        btnCash.classList.remove('border-gray-300', 'bg-white', 'text-gray-600');
        btnCash.classList.add('border-blue-500', 'bg-blue-50', 'text-blue-700');
        btnShamcash.classList.remove('border-blue-500', 'bg-blue-50', 'text-blue-700');
        btnShamcash.classList.add('border-gray-300', 'bg-white', 'text-gray-600');
        dynamicBtnText.innerText = "تنسيق موعد الدفع عبر الواتساب";
        dynamicBtn.href = `https://wa.me/963980390813?text=مرحباً، أريد تنسيق موعد دفع (نقدي مباشر) لاشتراك ${type}: ${name}`;
    }
};

window.toggleSubscription = async (id, currentStatus) => {
    try {
        await supabase.from('listings').update({ is_subscribed: currentStatus }).eq('id', id);
        showToast(currentStatus ? 'تم تفعيل الاشتراك بنجاح!' : 'تم إلغاء الاشتراك.', currentStatus ? 'success' : 'info');
        await fetchListings();
        renderAdminDashboard();
    } catch (e) { showToast('حدث خطأ', 'error'); }
}
// دالة لتشفير النص
function encryptField(text, key) {
    if (!text) return text; // إذا كان الحقل فارغاً اتركه كما هو
    try {
        return CryptoJS.AES.encrypt(String(text), key).toString();
    } catch (e) { return text; }
}

// دالة لفك تشفير النص
function decryptField(ciphertext, key) {
    if (!ciphertext || typeof ciphertext !== 'string' || !ciphertext.startsWith('U2FsdGVk')) return ciphertext; 
    try {
        const bytes = CryptoJS.AES.decrypt(ciphertext, key);
        const originalText = bytes.toString(CryptoJS.enc.Utf8);
        return originalText || ciphertext;
    } catch (e) { return ciphertext; }
}

// دالة لفك تشفير ملف المريض بالكامل
function decryptHealthFile(data, key) {
    if (!data) return data;
    
    // فك تشفير مصفوفة الروشتات الطبية
    let decryptedPrescriptions = [];
    if (data.prescriptions && Array.isArray(data.prescriptions)) {
        decryptedPrescriptions = data.prescriptions.map(rx => ({
            ...rx,
            text: decryptField(rx.text, key) // فك تشفير نص الروشتة فقط
        }));
    }

    return {
        ...data,
        full_name: decryptField(data.full_name, key),
        age: decryptField(data.age, key),
        gender: decryptField(data.gender, key),
        blood_type: decryptField(data.blood_type, key),
        weight: decryptField(data.weight, key),
        diseases: decryptField(data.diseases, key),
        allergies: decryptField(data.allergies, key),
        medications: decryptField(data.medications, key),
        dental: decryptField(data.dental, key),
        eye: decryptField(data.eye, key),
        emergency_name: decryptField(data.emergency_name, key),
        emergency_phone: decryptField(data.emergency_phone, key),
        prescriptions: decryptedPrescriptions // إضافة الروشتات المفكوك تشفيرها
    };
}
// دالة لتحديد موقع المستخدم تلقائياً
function detectUserLocation() {
    const locationBadge = document.getElementById('userLocationBadge');
    const locationText = document.getElementById('userLocationText');
    
    // إذا لم يتم العثور على العنصر، أخر من الدالة
    if (!locationBadge || !locationText) return;

    // إخفاء الحقل افتراضياً حتى يتم التأكد من الموقع
    locationBadge.style.display = 'none';

    // التحقق مما إذا كان المتصفح يدعم تحديد الموقع
    if (!navigator.geolocation) {
        return; // يبقى مخفياً
    }

    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const { latitude, longitude } = position.coords;
            try {
                // استخدام خدمة OpenStreetMap لجلب اسم المدينة بالعربية مجاناً
                const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=ar`);
                const data = await response.json();
                
                const address = data.address || {};
                const city = address.city || address.town || address.village || address.county || '';
                const state = address.state || '';
                
                if (city && state) {
                    locationText.innerText = `${city} - ${state}`;
                    locationBadge.style.display = 'inline-flex'; // إظهار الحقل
                } else if (city) {
                    locationText.innerText = city;
                    locationBadge.style.display = 'inline-flex'; // إظهار الحقل
                } else {
                    // إذا لم يتم العثور على مدينة واضحة، يبقى مخفياً
                }
            } catch (error) {
                // في حال حدوث خطأ في جلب البيانات، يبقى مخفياً
            }
        },
        (error) => {
            // في حال رفض المستخدم إعطاء إذن الموقع، يبقى مخفياً
        }
    );
}
window.saveEmergencyContact = async (e) => {
    e.preventDefault();
    const name = document.getElementById('emName').value.trim();
    const phone = document.getElementById('emPhone').value.trim();
    const icon = document.getElementById('emIcon').value.trim();
    const color = document.getElementById('emColor').value;
    const category = document.getElementById('emCategory').value;

    try {
        await supabase.from('emergency_contacts').insert([{ name, phone, icon, color, category }]);
        showToast('تمت الإضافة بنجاح!', 'success');
        e.target.reset();
        fetchEmergencyContacts();
        renderAdminEmergencyList();
    } catch (err) { showToast('حدث خطأ في الإضافة', 'error'); }
};

window.deleteEmergencyContact = async (id) => {
    try {
        await supabase.from('emergency_contacts').delete().eq('id', id);
        showToast('تم حذف الرقم', 'success');
        fetchEmergencyContacts();
        renderAdminEmergencyList();
    } catch (err) { showToast('خطأ في الحذف', 'error'); }
};

function renderAdminEmergencyList() {
    const list = document.getElementById('adminEmergencyList');
    if (!list) return;
    if (allEmergencyContacts.length === 0) {
        list.innerHTML = '<p class="text-center text-gray-400 text-sm py-4">لا توجد أرقام مضافة.</p>';
        return;
    }
    list.innerHTML = allEmergencyContacts.map(c => `
        <div class="flex items-center justify-between p-2 rounded-lg border" style="border-color: var(--border)">
            <div class="flex items-center gap-2">
               <i class="fas ${escapeHtml(c.icon)}" style="color: ${escapeHtml(c.color)};"></i>
                <span class="text-sm font-semibold">${escapeHtml(c.name)}</span>
                <span class="text-xs text-gray-500" dir="ltr">${escapeHtml(c.phone)}</span>
            </div>
            <button onclick="deleteEmergencyContact('${c.id}')" class="text-xs text-white px-2 py-1 rounded bg-red-500 hover:bg-red-600">حذف</button>
        </div>
    `).join('');
}
// دالة إخفاء زر الطوارئ العائم
window.hideEmergencyFab = () => {
    const wrapper = document.getElementById('emergencyFabWrapper');
    if (wrapper) {
        wrapper.classList.add('hidden-fab');
    }
}
// دالة فتح وإغلاق نافذة الطوارئ المنبثقة
window.toggleEmergencyPopup = () => {
    const popup = document.getElementById('emergencyPopup');
    if (popup) {
        popup.classList.toggle('show');
    }
};
// === دوال التحكم في نافذة الطوارئ المنبثقة ===
window.toggleEmergencyPopup = function() {
    var popup = document.getElementById('emergencyPopup');
    if (popup) {
        if (popup.style.display === 'none' || popup.style.display === '') {
            popup.style.display = 'block';
        } else {
            popup.style.display = 'none';
        }
    }
}

window.hideEmergencyFab = function() {
    var wrapper = document.getElementById('emergencyFabWrapper');
    if (wrapper) {
        wrapper.style.display = 'none';
    }
}
// === نظام المدونة الطبية المتطور ===
let allArticles = [];
let currentBlogCategory = 'all';
let savedArticleIds = JSON.parse(localStorage.getItem('lomedx_saved_articles') || '[]');
let ratedArticleIds = JSON.parse(localStorage.getItem('lomedx_rated_articles') || '[]');
// 1. فتح لوحة المدونة
window.openMedicalBlog = () => {
    openCtrlPanel('المدونة والمقالات الطبية', `
        <div class="flex flex-col gap-4">
            <div class="bg-blue-50 border border-blue-200 rounded-xl p-4 text-blue-800 text-sm flex items-center gap-3">
                <i class="fas fa-book-medical text-xl"></i>
                <span>مكتبة طبية شاملة. اقرأ أحدث المقالات المكتوبة بمراجعة طبية.</span>
            </div>
            
            <!-- قسم الأكثر قراءة (Trending) -->
            <div class="bg-gradient-to-l from-amber-50 to-orange-50 rounded-2xl p-4 border border-amber-200">
                <h4 class="font-bold text-sm text-amber-800 mb-3 flex items-center gap-2"><i class="fas fa-fire"></i> الأكثر قراءةً</h4>
                <div id="trendingArticlesList" class="flex gap-3 overflow-x-auto pb-2">
                    <p class="text-center text-gray-400 text-sm py-4 w-full">جاري التحميل...</p>
                </div>
            </div>

            <!-- حقل البحث والأزرار -->
                        <!-- حقل البحث والأزرار بصف واحد -->
            <div class="flex items-center gap-2">
                <button onclick="openBlogCategory()" class="flex-shrink-0 w-12 h-12 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center transition-all" title="التصنيفات">
                    <i class="fas fa-filter text-blue-500"></i>
                </button>
                <button onclick="showSavedArticles()" class="flex-shrink-0 w-12 h-12 rounded-xl bg-yellow-100 hover:bg-yellow-200 text-yellow-800 flex items-center justify-center transition-all" title="المحفوظات">
                    <i class="fas fa-bookmark"></i>
                </button>
                <div class="relative flex-1">
                    <input type="text" id="blogSearchInput" class="ctrl-input pr-10 w-full" placeholder="ابحث في المقالات..." oninput="searchArticles()">
                    <i class="fas fa-search absolute top-1/2 -translate-y-1/2 left-4 text-gray-400"></i>
                </div>
                </div>
            <div class="text-xs text-gray-500 mt-2">
                التصنيف الحالي: <span id="currentBlogCategoryText" class="font-bold text-blue-600">كل التصنيفات</span>
            </div>
            <div id="blogArticlesList" class="flex flex-col gap-4">
                <p class="text-center py-10 text-gray-400 text-sm">جاري تحميل المقالات...</p>
            </div>
        </div>
    `, '#0E7C5F');
    fetchTrendingArticles();
    fetchArticles();
}

// جلب مقالات الأكثر قراءة
async function fetchTrendingArticles() {
    const container = document.getElementById('trendingArticlesList');
    if (!container) return;
    const { data, error } = await supabase.from('medical_articles').select('*').order('views', { ascending: false }).limit(5);
    if (error || !data || data.length === 0) { container.innerHTML = '<p class="text-center text-gray-400 text-sm w-full">لا توجد مقالات رائجة بعد.</p>'; return; }
    
    container.innerHTML = data.map(art => `
        <div onclick="openArticleReader('${art.id}')" class="flex-shrink-0 w-40 cursor-pointer group">
            <div class="w-full h-24 rounded-xl overflow-hidden bg-gray-100 mb-2">
                ${art.image_url ? `<img src="${escapeHtml(art.image_url)}" class="w-full h-full object-cover group-hover:scale-105 transition-transform">` : `<div class="w-full h-full flex items-center justify-center"><i class="fas fa-notes-medical text-2xl text-gray-200"></i></div>`}
            </div>
            <h5 class="text-xs font-bold text-gray-700 line-clamp-2 group-hover:text-amber-600">${escapeHtml(art.title)}</h5>
        </div>
    `).join('');
}

// 2. دوال الحفظ (Bookmarks)
window.toggleSaveArticle = (id) => {
    id = String(id);
    const index = savedArticleIds.indexOf(id);
    if (index > -1) {
        savedArticleIds.splice(index, 1);
        showToast('تم إزالة المقال من المحفوظات', 'success');
    } else {
        savedArticleIds.push(id);
        showToast('تم حفظ المقال!', 'success');
    }
    localStorage.setItem('lomedx_saved_articles', JSON.stringify(savedArticleIds));
    
    // تحديث زر الحفظ في الواجهة الحالية
    const btn = document.querySelector(`.save-art-btn[data-id="${id}"]`);
    if (btn) {
        const isSaved = savedArticleIds.includes(id);
        btn.innerHTML = isSaved ? '<i class="fas fa-bookmark text-yellow-500"></i>' : '<i class="far fa-bookmark"></i>';
    }
};

window.showSavedArticles = async () => {
    currentBlogCategory = 'all';
    document.getElementById('currentBlogCategoryText').innerText = 'كل التصنيفات';
    document.getElementById('blogSearchInput').value = '';
    
    const listContainer = document.getElementById('blogArticlesList');
    if (savedArticleIds.length === 0) {
        listContainer.innerHTML = '<p class="text-center py-10 text-gray-400 text-sm">لا توجد مقالات محفوظة بعد.</p>';
        return;
    }
    
    listContainer.innerHTML = '<p class="text-center py-10 text-gray-400 text-sm">جاري تحميل المحفوظات...</p>';
    const { data, error } = await supabase.from('medical_articles').select('*').in('id', savedArticleIds).order('created_at', { ascending: false });
    if (error || !data) { listContainer.innerHTML = '<p class="text-center text-red-500 text-sm py-4">خطأ في التحميل.</p>'; return; }
    allArticles = data || [];
    renderArticlesList(allArticles);
};

// 3. جلب المقالات
async function fetchArticles(searchQuery = '') {
    const listContainer = document.getElementById('blogArticlesList');
    if (!listContainer) return;

    let query = supabase.from('medical_articles').select('*').order('created_at', { ascending: false });
    if (searchQuery) query = query.or(`title.ilike.%${searchQuery}%,content.ilike.%${searchQuery}%`);
    if (currentBlogCategory !== 'all') query = query.eq('category', currentBlogCategory);

    const { data, error } = await query.limit(30);
    if (error) { listContainer.innerHTML = '<p class="text-center text-red-500 text-sm py-4">خطأ في تحميل المقالات.</p>'; return; }
    allArticles = data || [];
    renderArticlesList(allArticles);
}

// 4. عرض بطاقات المقالات (مع زر الحفظ)
function renderArticlesList(articles) {
    const listContainer = document.getElementById('blogArticlesList');
    if (!listContainer) return;
    if (articles.length === 0) { listContainer.innerHTML = '<p class="text-center py-10 text-gray-400 text-sm">لا توجد مقالات مطابقة حالياً.</p>'; return; }

    listContainer.innerHTML = articles.map(art => {
        const dateStr = new Date(art.created_at).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' });
        const isSaved = savedArticleIds.includes(String(art.id));
        return `
        <div onclick="openArticleReader('${art.id}')" class="flex flex-col sm:flex-row-reverse bg-white border rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group" style="border-color: var(--border);">
            <div class="w-full sm:w-44 h-40 sm:h-auto flex-shrink-0 overflow-hidden bg-gray-100 relative">
                ${art.image_url ? `<img src="${escapeHtml(art.image_url)}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500">` : `<div class="w-full h-full flex items-center justify-center"><i class="fas fa-notes-medical text-5xl text-gray-200"></i></div>`}
                <span class="absolute top-2 right-2 text-[10px] bg-emerald-600 text-white px-2 py-1 rounded-full font-bold shadow-md">${escapeHtml(art.category || 'طب عام')}</span>
            </div>
            <div class="p-4 flex flex-col flex-1 justify-center">
                <h4 class="font-bold text-base text-gray-800 mb-2 line-clamp-2 group-hover:text-emerald-600 transition-colors" style="font-family: 'Noto Kufi Arabic';">${escapeHtml(art.title)}</h4>
                <p class="text-xs text-gray-500 leading-relaxed line-clamp-3 mb-3">${escapeHtml(art.excerpt || art.content.substring(0, 120))}...</p>
                <div class="flex items-center justify-between text-[10px] text-gray-400 mt-auto border-t pt-2" style="border-color: var(--border);">
    <div class="flex items-center gap-3">
        <span><i class="fas fa-calendar-day ml-1"></i> ${dateStr}</span>
        <span><i class="fas fa-eye ml-1"></i> ${art.views || 0}</span>
    </div>
    <div class="flex items-center gap-2">
        <span class="text-emerald-600 font-bold flex items-center gap-1 group-hover:gap-2 transition-all">اقرأ المزيد <i class="fas fa-chevron-left text-[8px]"></i></span>
        <button onclick="event.stopPropagation(); toggleSaveArticle('${art.id}')" class="save-art-btn text-gray-300 hover:text-yellow-500 transition-colors" data-id="${art.id}">
            <i class="${isSaved ? 'fas text-yellow-500' : 'far'} fa-bookmark"></i>
        </button>
    </div>
</div>
            </div>
        </div>`;
    }).join('');
}

// 5. دالة لمعالجة النص (الخط العريض وصناديق التنبيه)
function parseArticleContent(text) {
    let html = escapeHtml(text);
    html = html.replace(/^&gt;\s?(.*)$/gm, '<div class="my-4 p-4 bg-red-50 border-r-4 border-red-500 rounded-xl flex items-start gap-3"><i class="fas fa-exclamation-triangle text-red-500 mt-1"></i><div class="text-sm text-red-800 font-semibold">$1</div></div>');
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-gray-900">$1</strong>');
    html = html.replace(/^([^\n]+?):/gm, '<strong class="font-bold text-gray-900">$1:</strong>');
    return html;
}

// 6. فتح مقال للقراءة (مع المقالات ذات الصلة والتقييم وزر اسأل طبيب)
let currentFontSize = 1;
let isSpeaking = false;

window.openArticleReader = async (id) => {
    const article = allArticles.find(a => a.id == id);
    if (!article) return;

    window.location.hash = `article=${id}`;
    updateMetaTags(
    `${article.title} | Lomedx`, 
    article.excerpt || article.content.substring(0, 150), 
    article.image_url || 'https://i.ibb.co/d09VBmky/37414.png'
);
    supabase.from('medical_articles').update({ views: (article.views || 0) + 1 }).eq('id', id).then();

    const dateStr = new Date(article.created_at).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' });
    const wordCount = article.content.split(/\s+/).length;
    const readingTime = Math.max(1, Math.ceil(wordCount / 200));
    const processedContent = parseArticleContent(article.content);
    currentFontSize = 1;
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();

    // جلب المقالات ذات الصلة
    const { data: related } = await supabase.from('medical_articles').select('*').eq('category', article.category).neq('id', id).limit(3);
    let relatedHtml = '';
    if (related && related.length > 0) {
        relatedHtml = `
        <div class="mt-8 border-t pt-6">
            <h4 class="font-bold text-base mb-4 flex items-center gap-2"><i class="fas fa-link text-emerald-500"></i> مقالات ذات صلة</h4>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                ${related.map(r => `
                    <div onclick="closeModal(); setTimeout(() => openArticleReader('${r.id}'), 300)" class="bg-gray-50 rounded-xl p-3 cursor-pointer hover:shadow-md transition-all group">
                        <div class="w-full h-20 rounded-lg overflow-hidden bg-gray-200 mb-2">
                            ${r.image_url ? `<img src="${r.image_url}" class="w-full h-full object-cover">` : ''}
                        </div>
                        <h5 class="text-xs font-bold text-gray-700 line-clamp-2 group-hover:text-emerald-600">${escapeHtml(r.title)}</h5>
                    </div>
                `).join('')}
            </div>
        </div>`;
    }

        document.getElementById('modalContent').innerHTML = `
        <div class="flex flex-col h-full">
            <!-- شريط أدوات القراءة الذكي (ثابت دائماً في الأعلى) -->
            <div class="sticky top-0 z-20 bg-white/95 backdrop-blur-md p-3 border-b flex flex-wrap items-center justify-between gap-2 shadow-sm" style="border-color: var(--border);">
                <div class="flex items-center gap-2">
                    <button onclick="closeModal()" class="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition-all"><i class="fas fa-times text-sm"></i></button>
                    <div class="flex items-center gap-3 text-[11px] text-gray-500">
                        <span><i class="fas fa-eye"></i> ${article.views || 0}</span>
                        <span><i class="fas fa-clock"></i> ${readingTime} د</span>
                    </div>
                </div>
                <div class="flex items-center gap-1">
                    <button onclick="changeFontSize(-0.1)" class="w-7 h-7 rounded-lg hover:bg-gray-100 text-gray-600 flex items-center justify-center"><i class="fas fa-minus text-xs"></i></button>
                    <button onclick="changeFontSize(0.1)" class="w-7 h-7 rounded-lg hover:bg-gray-100 text-gray-600 flex items-center justify-center"><i class="fas fa-plus text-xs"></i></button>
                    <button id="ttsBtn" onclick="toggleSpeech()" class="w-7 h-7 rounded-lg hover:bg-gray-100 text-blue-600 flex items-center justify-center" title="استمع للمقال"><i class="fas fa-headphones text-sm"></i></button>
                    <button onclick="shareArticle('${escapeHtml(article.title)}')" class="w-7 h-7 rounded-lg hover:bg-gray-100 text-emerald-600 flex items-center justify-center" title="مشاركة"><i class="fas fa-share-alt text-sm"></i></button>
                </div>
            </div>

            <!-- شريط تقدم القراءة -->
            <div class="absolute top-[52px] right-0 left-0 h-1 bg-gray-200 z-10 overflow-hidden">
                <div id="readingProgressBar" class="h-full bg-emerald-500" style="width: 0%; transition: width 0.2s;"></div>
            </div>

            <div class="overflow-y-auto" id="modalScrollArea">
                ${article.image_url ? `
                <div class="relative h-56 sm:h-64 overflow-hidden">
                    <img src="${escapeHtml(article.image_url)}" class="w-full h-full object-cover">
                    <div class="absolute inset-0" style="background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);"></div>
                    <div class="absolute bottom-4 right-5 left-5">
                        <span class="text-[10px] bg-emerald-500 text-white px-2 py-1 rounded-full font-bold">${escapeHtml(article.category || 'طب عام')}</span>
                        <h2 class="text-white font-black text-xl sm:text-2xl mt-2" style="font-family: 'Noto Kufi Arabic';">${escapeHtml(article.title)}</h2>
                    </div>
                </div>` : `
                <div class="p-5 border-b" style="border-color: var(--border);">
                    <span class="text-xs bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full font-bold">${escapeHtml(article.category || 'طب عام')}</span>
                    <h2 class="text-2xl sm:text-3xl font-black text-gray-800 mt-3" style="font-family: 'Noto Kufi Arabic';">${escapeHtml(article.title)}</h2>
                </div>`}
               </div>
            <div class="p-6 sm:p-8">
                ${!article.image_url ? `<h2 class="text-2xl sm:text-3xl font-black text-gray-800 mb-3" style="font-family: 'Noto Kufi Arabic';">${escapeHtml(article.title)}</h2>` : ''}
                
                <div id="articleContentText" class="prose max-w-none text-gray-700 leading-loose space-y-4 transition-all" style="font-family: 'IBM Plex Sans Arabic'; font-size: ${currentFontSize}rem;">${processedContent}</div>
                
                                <!-- صندوق توجيه للطبيب (احترافي وربط ذكي) -->
                <div class="mt-8 p-6 bg-gradient-to-l from-blue-50 to-sky-50 rounded-2xl border border-blue-200 text-center">
                    <div class="w-12 h-12 mx-auto rounded-full bg-blue-100 flex items-center justify-center mb-3">
                        <i class="fas fa-user-md text-2xl text-blue-600"></i>
                    </div>
                    <h4 class="font-bold text-base text-blue-900 mb-2">هل تحتاج إلى استشارة طبية؟</h4>
                    <p class="text-xs text-blue-700 mb-4 max-w-md mx-auto">لا تعتمد على المقالات فقط. تواصل مباشرةً مع أطباء متخصصين عبر منصة لوميديكس.</p>
                    <div class="flex flex-col sm:flex-row gap-3 justify-center w-full max-w-md mx-auto">
    <!-- الزر الأول -->
    <button onclick="closeModal(); openAskDoctor()" class="flex-1 min-w-[160px] bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors shadow-md flex items-center justify-center gap-1">
        <i class="fas fa-comments"></i> اسأل طبيباً الآن
    </button>
    <!-- الزر الثاني -->
    <button onclick="closeModal(); redirectToDoctorsSearch('${escapeHtml(article.category || '')}')" class="flex-1 min-w-[160px] bg-white border border-blue-200 text-blue-700 px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-blue-50 transition-colors shadow-sm flex items-center justify-center gap-1">
        <i class="fas fa-search"></i> ابحث عن طبيب مختص
    </button>
</div>

                </div>



                                <!-- نظام التقييم (Helpful) ومنع التكرار -->
                <div id="ratingBox" class="mt-8 p-4 bg-gray-50 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
                    <span class="text-sm font-semibold text-gray-600">${ratedArticleIds.includes(String(id)) ? 'شكراً لتقييمك!' : 'هل كان هذا المقال مفيداً؟'}</span>
                    <div class="flex gap-2">
                        <button onclick="rateArticle('${id}', true)" class="rate-btn px-4 py-2 rounded-lg bg-emerald-100 text-emerald-700 font-bold text-sm hover:bg-emerald-200 transition-colors flex items-center gap-1 ${ratedArticleIds.includes(String(id)) ? 'opacity-50 cursor-not-allowed' : ''}" ${ratedArticleIds.includes(String(id)) ? 'disabled' : ''}><i class="fas fa-thumbs-up"></i> نعم</button>
                        <button onclick="rateArticle('${id}', false)" class="rate-btn px-4 py-2 rounded-lg bg-red-100 text-red-700 font-bold text-sm hover:bg-red-200 transition-colors flex items-center gap-1 ${ratedArticleIds.includes(String(id)) ? 'opacity-50 cursor-not-allowed' : ''}" ${ratedArticleIds.includes(String(id)) ? 'disabled' : ''}><i class="fas fa-thumbs-down"></i> لا</button>
                    </div>
                </div>

                ${relatedHtml}
            </div>
        </div>
    `;
    document.getElementById('modalOverlay').classList.add('active');
    lockScroll();
    
    // تفعيل مستمع التمرير لشريط التقدم
    const modalContent = document.getElementById('modalContent');
    modalContent.addEventListener('scroll', () => {
        const scrollBar = document.getElementById('readingProgressBar');
        if (scrollBar) {
            const scrollTop = modalContent.scrollTop;
            const scrollHeight = modalContent.scrollHeight - modalContent.clientHeight;
            const progress = (scrollTop / scrollHeight) * 100;
            scrollBar.style.width = `${progress}%`;
        }
    });
}

// دالة التقييم مع منع التكرار
window.rateArticle = async (id, isHelpful) => {
    id = String(id);
    
    // التحقق مما إذا كان المستخدم قد قيم هذا المقال سابقاً
    if (ratedArticleIds.includes(id)) {
        showToast('لقد قمت بتقييم هذا المقال مسبقاً');
        return;
    }

    showToast('شكراً لتقييمك!', 'success');
    
    // حفظ معرف المقال في قائمة المُقيّمة لمنع التكرار
    ratedArticleIds.push(id);
    localStorage.setItem('lomedx_rated_articles', JSON.stringify(ratedArticleIds));
    
    // تعطيل الأزرار وتغيير النص فوراً في الواجهة
    document.querySelectorAll('.rate-btn').forEach(b => {
        b.disabled = true;
        b.classList.add('opacity-50', 'cursor-not-allowed');
    });
    const ratingBox = document.getElementById('ratingBox');
    if(ratingBox) {
        ratingBox.style.opacity = '0.5';
        const span = ratingBox.querySelector('span');
        if(span) span.innerText = 'شكراً لتقييمك!';
    }

    // تحديث قاعدة البيانات
    const { data } = await supabase.from('medical_articles').select('likes, dislikes').eq('id', id).single();
    if (!data) return;
    
    const update = {};
    if (isHelpful) update.likes = (data.likes || 0) + 1;
    else update.dislikes = (data.dislikes || 0) + 1;
    
    await supabase.from('medical_articles').update(update).eq('id', id);
};

// دوال الأدوات الذكية (الخط والاستماع والمشاركة)
window.changeFontSize = (delta) => {
    currentFontSize = Math.max(0.8, Math.min(1.8, currentFontSize + delta));
    const contentDiv = document.getElementById('articleContentText');
    if (contentDiv) contentDiv.style.fontSize = `${currentFontSize}rem`;
}

window.toggleSpeech = () => {
    const btn = document.getElementById('ttsBtn');
    const contentDiv = document.getElementById('articleContentText');
    if (!contentDiv || !btn) return;

    if ('speechSynthesis' in window) {
        if (isSpeaking) {
            window.speechSynthesis.cancel();
            isSpeaking = false;
            btn.innerHTML = '<i class="fas fa-headphones text-sm"></i>';
            btn.classList.remove('text-red-600');
        } else {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = contentDiv.innerHTML;
            const textToRead = tempDiv.textContent || tempDiv.innerText;
            
            const utterance = new SpeechSynthesisUtterance(textToRead);
            utterance.lang = 'ar-SA';
            utterance.onend = () => {
                isSpeaking = false;
                btn.innerHTML = '<i class="fas fa-headphones text-sm"></i>';
                btn.classList.remove('text-red-600');
            };
            window.speechSynthesis.speak(utterance);
            isSpeaking = true;
            btn.innerHTML = '<i class="fas fa-stop text-sm"></i>';
            btn.classList.add('text-red-600');
        }
    } else {
        showToast("متصفحك لا يدعم ميزة الاستماع الصوتي.", 'error');
    }
}

window.shareArticle = (title) => {
    const url = window.location.href;
    const text = `مقال طبي مفيد من منصة Lomedx:\n\n${title}\n\nاقرأ المقال كاملاً من هنا:\n${url}`;
    
    // التحقق إذا كان المتصفح يدعم المشاركة الأصلية (خاصة للهواتف)
    if (navigator.share) {
        navigator.share({ 
            title: 'Lomedx', 
            text: text, 
            url: url 
        }).catch(() => {}); // تجاهل أي خطأ إذا أغلق المستخدم النافذة
    } else {
        // الحل البديل للمتصفحات التي لا تدعم المشاركة الأصلية
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    }
}
    
// === دوال إدارة المدونة ===
let adminArticlesCache = [];

// 1. حفظ أو تعديل المقال
window.saveArticle = async (e) => {
    e.preventDefault();
    const id = document.getElementById('editArtId').value;
    const title = document.getElementById('artTitle').value.trim();
    const category = document.getElementById('artCategory').value.trim();
    const image = document.getElementById('artImage').value.trim();
    const content = document.getElementById('artContent').value.trim();
    const excerpt = document.getElementById('artExcerpt').value.trim() || content.substring(0, 150);

    try {
        if (id) {
            // وضع التعديل
            await supabase.from('medical_articles').update({ title, category, image_url: image, content, excerpt }).eq('id', id);
            showToast('تم حفظ التعديلات بنجاح!', 'success');
        } else {
            // وضع الإضافة
            await supabase.from('medical_articles').insert([{ title, category, image_url: image, content, excerpt }]);
            showToast('تم نشر المقال بنجاح!', 'success');
        }
        resetArticleForm();
        fetchAdminArticles();
    } catch (err) {
        showToast('خطأ في الحفظ', 'error');
    }
};

// 2. تعبئة النموذج ببيانات المقال للتعديل
window.editArticle = (id) => {
    const art = adminArticlesCache.find(a => a.id == id);
    if (!art) return;
    
    document.getElementById('editArtId').value = art.id;
    document.getElementById('artTitle').value = art.title;
    document.getElementById('artCategory').value = art.category || '';
    document.getElementById('artImage').value = art.image_url || '';
    document.getElementById('artExcerpt').value = art.excerpt || '';
    document.getElementById('artContent').value = art.content;
    
    // تغيير شكل الزر لوضع التعديل
    document.getElementById('artSubmitBtn').innerText = 'حفظ التعديلات';
    document.getElementById('artSubmitBtn').style.background = '#F59E0B'; // لون برتقالي للتعديل
    document.getElementById('artCancelBtn').classList.remove('hidden');
    
    // تمرير الشاشة للأعلى لرؤية الحقول
    document.getElementById('artTitle').scrollIntoView({ behavior: 'smooth', block: 'center' });
};

// 3. إلغاء وضع التعديل وإفراغ الحقول
window.resetArticleForm = () => {
    document.getElementById('articleForm').reset();
    document.getElementById('editArtId').value = '';
    document.getElementById('artSubmitBtn').innerText = 'نشر المقال';
    document.getElementById('artSubmitBtn').style.background = '#2563EB';
    document.getElementById('artCancelBtn').classList.add('hidden');
};

// 4. حذف المقال
window.deleteArticle = async (id) => {
    if (!confirm("هل أنت متأكد من حذف هذا المقال؟")) return;
    try {
        await supabase.from('medical_articles').delete().eq('id', id);
        showToast('تم حذف المقال', 'success');
        fetchAdminArticles();
    } catch (err) {
        showToast('خطأ في الحذف', 'error');
    }
};

// 5. جلب المقالات وعرضها في لوحة الإدارة
async function fetchAdminArticles() {
    const list = document.getElementById('adminArticlesList');
    if (!list) return;
    const { data, error } = await supabase.from('medical_articles').select('*').order('created_at', { ascending: false });
    if (error || !data) { list.innerHTML = '<p class="text-center text-gray-400 text-sm py-2">لا توجد مقالات.</p>'; return; }
    if (data.length === 0) { list.innerHTML = '<p class="text-center text-gray-400 text-sm py-2">لا توجد مقالات منشورة بعد.</p>'; return; }
    
    adminArticlesCache = data; // حفظ البيانات في الذاكرة لاستخدامها عند التعديل
    
    list.innerHTML = data.map(art => `
        <div class="flex items-center justify-between p-2 rounded-lg border" style="border-color: var(--border)">
            <div class="flex items-center gap-2 flex-1 min-w-0">
                <i class="fas fa-file-lines text-blue-500"></i>
                <span class="text-sm font-semibold truncate">${escapeHtml(art.title)}</span>
                <span class="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">${escapeHtml(art.category || 'عام')}</span>
            </div>
            <div class="flex gap-1 flex-shrink-0">
                <button class="edit-art-btn text-xs text-white px-2 py-1 rounded bg-blue-500 hover:bg-blue-600" data-id="${art.id}">تعديل</button>
                <button class="delete-art-btn text-xs text-white px-2 py-1 rounded bg-red-500 hover:bg-red-600" data-id="${art.id}">حذف</button>
            </div>
        </div>
    `).join('');

    // إضافة مستمعي الأحداث (Event Listeners) للأزرار بعد رسمها
    list.querySelectorAll('.edit-art-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const id = this.getAttribute('data-id');
            window.editArticle(id); // تم التصحيح هنا
        });
    });

    list.querySelectorAll('.delete-art-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const id = this.getAttribute('data-id');
            window.deleteArticle(id); // تم التصحيح هنا
        });
    });
}
window.toggleAccordion = (el) => {
    // إذا تم تمرير عنصر (el)، فهذا يعني أن الضغط جاء من بطاقة المشفى أو الإسعافات
    if (el) {
        const item = el.parentElement;
        const isActive = item.classList.contains('active');
        // إغلاق جميع الأكورديونات الأخرى المفتوحة في نفس القسم
        item.parentElement.querySelectorAll('.accordion-item').forEach(i => i.classList.remove('active'));
        // فتح الأكورديون المضغوط عليه إذا كان مغلقاً
        if (!isActive) item.classList.add('active');
    } 
    // إذا لم يتم تمرير عنصر، فهذا يعني أن الضغط جاء من زر الحاسبات في قائمة الجوال
    else {
        const accordion = document.getElementById('toolsAccordion');
        if (accordion) {
            accordion.classList.toggle('accordion-active');
        }
    }
};
// === دوال تصنيفات المدونة المنزلقة (تعتمد على التصنيفات المضافة من لوحة الإدارة) ===
window.openBlogCategory = () => {
    const overlay = document.getElementById('blogCategoryOverlay');
    const listContainer = document.getElementById('blogCategoryList');
    if (!overlay || !listContainer) return;

    // 1. إضافة خيار "كل التصنيفات" افتراضياً
    let cats = ['كل التصنيفات'];
    
    // 2. استخراج التصنيفات الفريدة من المقالات المحملة في allArticles (التي جاءت من لوحة الإدارة)
    allArticles.forEach(a => {
        if (a.category && !cats.includes(a.category)) cats.push(a.category);
    });

    // 3. رسم القائمة
    listContainer.innerHTML = cats.map(cat => `
        <div class="city-option ${(currentBlogCategory === 'all' && cat === 'كل التصنيفات') || currentBlogCategory === cat ? 'selected' : ''}" onclick="selectBlogCategory('${escapeHtml(cat)}')">
            <div class="flex items-center gap-3">
                <i class="fas ${cat === 'كل التصنيفات' ? 'fa-globe' : 'fa-tag'}" style="color: var(--accent)"></i>
                <span class="font-bold text-sm">${escapeHtml(cat)}</span>
            </div>
            ${currentBlogCategory === cat ? '<i class="fas fa-check-circle text-white"></i>' : ''}
        </div>
    `).join('');

    overlay.classList.add('active');
};

window.closeBlogCategory = () => {
    const overlay = document.getElementById('blogCategoryOverlay');
    if (overlay) overlay.classList.remove('active');
};

window.selectBlogCategory = (cat) => {
    // إذا كان الخيار المختار هو "كل التصنيفات"، نعيد المتغير إلى 'all' لمنع الفلترة
    currentBlogCategory = (cat === 'كل التصنيفات') ? 'all' : cat;
    
    // تحديث النص الظاهر في المدونة
    const catText = document.getElementById('currentBlogCategoryText');
    if (catText) catText.innerText = cat;
    
    closeBlogCategory();
    
    // إعادة جلب المقالات
    const searchInput = document.getElementById('blogSearchInput');
    fetchArticles(searchInput ? searchInput.value : '');
};
// === نظام التحديث الذكي والأناق ===
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('OneSignalSDKWorker.js').then(reg => {
      
      // 1. فحص فوري عند فتح الموقع
      reg.update();

      // 2. فحص روتيني كل ساعة (3600000 مللي ثانية) بدلاً من دقيقة
      setInterval(() => { reg.update(); }, 3600000);

      // 3. (العبقرية) فحص فوري عندما يعود المستخدم للتبويب
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          reg.update();
        }
      });
      
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            showUpdateToast();
          }
        });
      });
    });
  });

  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });
}

// === نظام حماية الطلبات عند انقطاع الإنترنت ===
window.addEventListener('offline', () => {
  showToast('⚠️ يبدو أنك فقدت اتصالك بالإنترنت. التصفح متاح، لكن الحجز والدردشة وأستغاثة معطلة حتى عودة الاتصال.', 'error');
});

// دالة مساعدة لفحص الإنترنت قبل أي عملية حساسة
window.checkOnlineStatus = () => {
  if (!navigator.onLine) {
    showToast('لا يمكن إتمام هذه العملية. أنت غير متصل بالإنترنت حالياً.', 'error');
    return false;
  }
  return true;
};
// === نظام تثبيت التطبيق (PWA Install) ===
const PwaInstaller = (() => {
    let deferredPrompt = null;

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        toggleInstallButtonState(true);
    });

    window.addEventListener('appinstalled', () => {
        deferredPrompt = null;
        toggleInstallButtonState(false);
        showToast('تمت إضافة التطبيق إلى شاشتك الرئيسية بنجاح 🎉', 'success');
    });

    const isIos = () => {
        const userAgent = window.navigator.userAgent.toLowerCase();
        const isStandardIos = /iphone|ipad|ipod/.test(userAgent);
        const isIpadOs = navigator.maxTouchPoints > 1 && /macintosh/.test(userAgent);
        return isStandardIos || isIpadOs;
    };

    const isStandalone = () => {
        return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    };

    const toggleInstallButtonState = (visible) => {
        // تأكد أنك تملك عنصراً في HTML يحمل id="pwa-install-btn"
        const installBtn = document.getElementById('pwa-install-btn');
        if (installBtn) {
            installBtn.style.display = visible ? 'block' : 'none';
        }
    };

    return {
        async install() {
            try {
                if (isStandalone()) {
                    showToast('أنت تستخدم التطبيق المثبّت بالفعل.', 'info');
                    return;
                }

                if (deferredPrompt) {
                    deferredPrompt.prompt();
                    const { outcome } = await deferredPrompt.userChoice;
                    
                    if (outcome === 'accepted') {
                        showToast('جاري إضافة التطبيق إلى جهازك...', 'info');
                    } else {
                        // تم تعديل النص هنا
                        showToast('تم إغلاق نافذة التثبيت. يمكنك المحاولة لاحقاً.', 'info');
                    }
                    deferredPrompt = null;
                    toggleInstallButtonState(false); // إخفاء الزر بعد المحاولة
                    return;
                }

                if (isIos()) {
                    showToast('لتثبيت التطبيق: اضغط زر المشاركة ⎘ أسفل الشاشة، ثم اختر "إضافة إلى الشاشة الرئيسية ⊕".', 'info');
                    return;
                }

                showToast('التثبيت المباشر غير متاح حالياً. يمكنك إضافته من قائمة المتصفح (ثلاث نقاط) -> "إضافة إلى الشاشة الرئيسية".', 'warning');
            } catch (error) {
                console.error('PWA Installation Error:', error);
                showToast('تعذر تعقب طلب التثبيت، يرجى المحاولة لاحقاً.', 'error');
            }
        }
    };
})();

window.installPwaApp = () => PwaInstaller.install();
// نهاية ملف app.js

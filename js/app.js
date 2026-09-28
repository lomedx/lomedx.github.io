
/* ═══════════════════════════════════════════════════════════════════
   LomedX — app.js (منظّف بدون أدوات)
   Core Logic + Modals + Dashboards + Routing
   ═══════════════════════════════════════════════════════════════════ */

import { supabase } from './supabase.js';

/* ═══════════════════════════════════════════════════════════════════
   ═══════════════ 1. CONSTANTS & GLOBAL STATE ═══════════════════
   ═══════════════════════════════════════════════════════════════════ */

const daysOfWeek = ["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"];

// حالة عامة
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
let healthTips = [];
let tipInterval = null;
let favoriteDoctors = JSON.parse(localStorage.getItem('lomedx_favorites') || '[]');
let currentHealthFileId = localStorage.getItem('healthFileId') || null;
let doctorDashboardInterval = null;
let activeAds = [];
let currentAdIndex = 0;
let adInterval = null;
let allHomeAds = [];
let currentCity = 'all';
let activeQrScanner = null;
let renderLimits = {
    hospital: 4,
    center: 4,
    lab: 4,
    doctor: 8,
    pharmacy: 8
};

// المدن المتاحة
let allCities = ['كل المدن', 'الرحيبة', 'القطيفة', 'جيرود', 'المعضمية', 'النبك', 'ديرعطيه'];

// المدونة
let allArticles = [];
let currentBlogCategory = 'all';
let savedArticleIds = JSON.parse(localStorage.getItem('lomedx_saved_articles') || '[]');
let ratedArticleIds = JSON.parse(localStorage.getItem('lomedx_rated_articles') || '[]');
let adminArticlesCache = [];

// الطوارئ
let allEmergencyContacts = [];

// الأسئلة (اسأل طبيب - تبقى هنا لأنها مرتبطة بالمحتوى)
let allQuestions = [];
let unsubscribeQuestions = null;
let askDoctorOpenTime = null;

/* ═══════════════════════════════════════════════════════════════════
   ═══════════════ 2. UTILITIES ═══════════════
   ═══════════════════════════════════════════════════════════════════ */

/**
 * محرك الإشعارات المركزي — إرسال Push notification
 */
async function sendPushNotification(userId, title, message, target = 'user', playerId = null, city = null) {
    try {
        const bodyData = { title, message, target };
        if (city) bodyData.city = city;
        if (target === 'player' && playerId) {
            bodyData.player_id = playerId;
        } else if (userId) {
            body_data.user_id = userId;
        }
        const { data, error } = await supabase.functions.invoke('send-push-notification', {
            body: bodyData
        });
        if (error) return;
    } catch (err) {
        // Silent fail
    }
}

/**
 * تفعيل OneSignal Push Notifications
 */
window.setupOneSignal = async () => {
    if (!window.OneSignalDeferred) {
        showToast('جاري تهيئة النظام، انتظر لحظة...');
        return;
    }

    OneSignalDeferred.push(async function (OneSignal) {
        try {
            if (!OneSignal.Notifications.isPushSupported()) {
                showToast('متصفحك لا يدعم الإشعارات.', 'error');
                return;
            }

            const granted = await OneSignal.Notifications.requestPermission();

            if (granted) {
                showToast('تم تفعيل الإشعارات بنجاح', 'success');

                if (!OneSignal.User.PushSubscription.optedIn) {
                    await OneSignal.User.PushSubscription.optIn();
                }

                const id = OneSignal.User.PushSubscription.id;
                if (id) {
                    localStorage.setItem('patient_push_id', id);
                }
            } else {
                showToast('تم رفض الإذن، لن تصلك إشعارات.');
            }
        } catch (err) {
            // Silent fail
        }
    });
};

/**
 * تحميل مكتبة Chart.js عند الطلب
 */
function loadChartJs() {
    return new Promise((resolve) => {
        if (window.Chart) {
            resolve();
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
        script.onload = () => resolve();
        document.head.appendChild(script);
    });
}

/**
 * تحميل مكتبة ديناميكية عند الطلب
 */
function loadDynamicScript(src, globalVarName) {
    return new Promise((resolve, reject) => {
        if (window[globalVarName]) {
            resolve();
            return;
        }
        const script = document.createElement('script');
        script.src = src;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Failed to load ${src}`));
        document.head.appendChild(script);
    });
}

/**
 * توليد رمز آمن للتشفير (للـ QR tokens وغيرها)
 */
function generateSecureToken(length = 32) {
    const arr = new Uint8Array(length / 2);
    crypto.getRandomValues(arr);
    return Array.from(arr, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * تهريب النص لمنع XSS
 */
function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/**
 * قفل التمرير مع إيقاف الحركات (لتقليل حرارة الهاتف)
 */
function lockScroll() {
    scrollLockCount++;
    document.body.style.overflow = 'hidden';
    document.body.classList.add('stop-animations');
}

/**
 * فتح التمرير مع إعادة الحركات
 */
function unlockScroll() {
    scrollLockCount = Math.max(0, scrollLockCount - 1);
    if (scrollLockCount === 0) {
        document.body.style.overflow = '';
        document.body.classList.remove('stop-animations');
    }
}

/**
 * قائمة الكلمات المسيئة (للتحقق من المحتوى)
 */
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
    "سكسي", "سيكس", "سكس", "اباحي", "اباحية", "قحب", "وسخ"
];

/**
 * التحقق من وجود كلمات مسيئة في النص
 */
function containsBadWords(text) {
    if (!text) return false;
    const cleanedText = text.toLowerCase().replace(/[\s\.\-\_\ـ]/g, '');
    return badWords.some(word => cleanedText.includes(word.toLowerCase().replace(/[\s\.\-\_\ـ]/g, '')));
}

/**
 * نصائح طبية يومية (Fallback)
 */
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

/**
 * تحديث عرض النصيحة اليومية
 */
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

/* ═══════════════════════════════════════════════════════════════════
   ═══════════════ 3. DOMContentLoaded — INITIALIZATION ═══════════════
   ═══════════════════════════════════════════════════════════════════ */

window.addEventListener('DOMContentLoaded', () => {

    // ─── OAuth Redirect Handling ───
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

    // ─── Splash Screen ───
    const splash = document.getElementById('appSplashScreen');
    if (splash) {
        if (sessionStorage.getItem('splashShown')) {
            splash.remove();
        } else {
            setTimeout(() => {
                splash.style.animation = 'none';
                splash.querySelectorAll('*').forEach(el => el.style.animation = 'none');
                splash.classList.add('hidden');
                sessionStorage.setItem('splashShown', 'true');
                setTimeout(() => { splash.remove(); }, 1000);
            }, 1200);
        }
    }

    // ─── Deep-link للمقالات (article=xxx) ───
    if (window.location.hash.includes('article=')) {
        const artId = window.location.hash.split('=')[1];
        history.replaceState(null, '', window.location.pathname + window.location.search);

        let isPageReload = false;
        if (window.performance && window.performance.getEntriesByType) {
            const navEntries = window.performance.getEntriesByType('navigation');
            if (navEntries.length > 0 && navEntries[0].type === 'reload') {
                isPageReload = true;
            }
        } else if (window.performance && window.performance.navigation) {
            if (window.performance.navigation.type === 1) {
                isPageReload = true;
            }
        }

        if (!isPageReload) {
            setTimeout(async () => {
                const { data, error } = await supabase.from('medical_articles').select('*').eq('id', artId).single();
                if (data) {
                    allArticles = [data];
                    openArticleReader(artId);
                }
            }, 1000);
        }
    }

    // ─── Language Toggle (AR/EN) ───
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

    // ─── Tip Interval ───
    if (tipInterval) clearInterval(tipInterval);
    updateTipDisplay();
    tipInterval = setInterval(updateTipDisplay, 12000);

    // ─── Cache & Fetch ───
    const cachedData = localStorage.getItem('cached_listings');
    const forceUpdate = localStorage.getItem('force_listings_update') === 'true';
    if (cachedData) {
        allData = JSON.parse(cachedData);
        if (!forceUpdate) {
            renderData();
            updateStats();
        }
    }

    fetchListings();
    fetchBookings();
    fetchBloodRequests();
    fetchMedicineDonations();
    fetchEmergencyContacts();

    // ─── Lightbox ───
    const lightbox = document.getElementById('lightbox');
    if (lightbox) {
        lightbox.addEventListener('click', () => {
            lightbox.classList.remove('active');
            unlockScroll();
        });
    }

    // ─── Dark Mode ───
    const darkToggle = document.getElementById('darkModeToggle');
    if (darkToggle) {
        darkToggle.addEventListener('click', () => {
            document.documentElement.classList.toggle('dark');
            localStorage.setItem('darkMode', document.documentElement.classList.contains('dark'));
        });
    }
    if (localStorage.getItem('darkMode') === 'true') {
        document.documentElement.classList.add('dark');
    }

    // ─── Hero Logo Animation ───
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

    // ─── Smart Search ───
    initSmartSearch();

    // ─── Visitors Tracking ───
    trackAndDisplayVisitors();

    // ─── Location Detection ───
    detectUserLocation();

    // ─── Favorites Badge ───
    window.updateFavBadge();

}); // نهاية DOMContentLoaded

/* ═══════════════════════════════════════════════════════════════════
   ═══════════════ 4. FETCH & RENDER — Core Data ═══════════════
   ═══════════════════════════════════════════════════════════════════ */

/**
 * جلب القوائم الطبية من قاعدة البيانات
 */
async function fetchListings() {
    const { data: freshData, error } = await supabase.from('public_listings').select('*');
    if (error) return;

    const forceUpdate = localStorage.getItem('force_listings_update') === 'true';
    if (JSON.stringify(freshData) !== JSON.stringify(allData) || forceUpdate) {
        allData = freshData || [];
        renderData();
        updateStats();
        try {
            localStorage.setItem('cached_listings', JSON.stringify(allData));
            localStorage.removeItem('force_listings_update');
        } catch (e) { /* Quota exceeded */ }
    }
}

/**
 * جلب جهات الطوارئ
 */
async function fetchEmergencyContacts() {
    const { data, error } = await supabase.from('emergency_contacts').select('*').order('id', { ascending: true });
    if (error) return;
    allEmergencyContacts = data || [];
    renderEmergencyPopup();
}

/**
 * عرض نافذة الطوارئ
 */
function renderEmergencyPopup() {
    const popupBody = document.getElementById('popupBodyContainer');
    if (!popupBody) return;

    const emergencies = allEmergencyContacts.filter(c => c.category === 'emergency');
    const hospitals = allEmergencyContacts.filter(c => c.category === 'hospital');

    let html = '';

    const getColor = (color) => {
        return color === 'red' ? '#DC2626' :
               color === 'blue' ? '#2563EB' :
               color === 'orange' ? '#EA580C' :
               color === 'purple' ? '#7C3AED' :
               color === 'yellow' ? '#D97706' : '#10B981';
    };

    if (emergencies.length > 0) {
        html += emergencies.map(c => `
            <a href="tel:${escapeHtml(c.phone)}" style="display: flex; align-items: center; gap: 10px; padding: 10px; border-radius: 10px; background: var(--bg-deep); text-decoration: none; color: var(--fg); font-weight: 600; font-size: 0.85rem;">
                <i class="fas ${escapeHtml(c.icon)}" style="color: ${getColor(c.color)}; width: 20px; text-align: center;"></i>
                <span>${escapeHtml(c.name)}</span>
                <span style="margin-right: auto; font-family: sans-serif; font-weight: 800;">${escapeHtml(c.phone)}</span>
            </a>
        `).join('');
    }

    if (hospitals.length > 0) {
        html += '<div style="border-top: 1px dashed var(--border); margin: 8px 0;"></div>';
        html += hospitals.map(c => `
            <a href="tel:${escapeHtml(c.phone)}" style="display: flex; align-items: center; gap: 10px; padding: 10px; border-radius: 10px; background: var(--bg-deep); text-decoration: none; color: var(--fg); font-weight: 600; font-size: 0.85rem;">
                <i class="fas ${escapeHtml(c.icon)}" style="color: ${getColor(c.color)}; width: 20px; text-align: center;"></i>
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

/**
 * جلب الحجوزات
 */
async function fetchBookings() {
    const { data, error } = await supabase.from('bookings').select('id, itemid, itemname, name, phone, daystr, slot_time, time, status, ref, chat, patient_push_id, created_at');
    if (error) return;
    bookings = data || [];
    if (currentFollowupBookingId) renderFollowupChat(currentFollowupBookingId);
}

/**
 * جلب استغاثات الدم
 */
async function fetchBloodRequests() {
    const twentyHoursAgo = new Date(Date.now() - (20 * 60 * 60 * 1000)).toISOString();
    const { data, error } = await supabase.from('blood_requests')
        .select('id, patient_name, blood_type, hospital, phone, notes, created_at, status, responses_count')
        .gt('created_at', twentyHoursAgo)
        .neq('status', 'resolved');
    if (error) return;
    bloodRequests = data || [];
    renderHomeBloodAlerts();
}

/**
 * جلب المستلزمات الطبية
 */
async function fetchMedicineDonations() {
    const { data, error } = await supabase.from('medicine_donations')
        .select('id, donor_name, medicine_name, medicine_type, expiry_date, quantity, phone, notes, created_at, status')
        .eq('status', 'active');
    if (error) return;
    medicineDonations = data || [];
    renderHomeMedicines();
}

/**
 * عرض استغاثات الدم في الصفحة الرئيسية
 */
function renderHomeBloodAlerts() {
    const section = document.getElementById('homeBloodAlertsSection');
    const container = document.getElementById('homeBloodAlerts');
    if (!section || !container) return;
    section.classList.add('hidden');
    container.innerHTML = '';
    checkAlertsWrapperVisibility();
}

/**
 * عرض المستلزمات الطبية في الصفحة الرئيسية
 */
function renderHomeMedicines() {
    const section = document.getElementById('homeMedicinesSection');
    const container = document.getElementById('homeMedicinesList');
    if (!section || !container) return;
    section.classList.add('hidden');
    container.innerHTML = '';
    checkAlertsWrapperVisibility();
}

/**
 * فحص إظهار/إخفاء غلاف التنبيهات
 */
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

/**
 * تحديث الإحصائيات في الصفحة الرئيسية
 */
function updateStats() {
    const update = (id, count) => {
        const el = document.getElementById(id);
        if (el) el.textContent = count;
    };
    update('stat-hospital', allData.filter(d => d.type === 'hospital').length);
    update('stat-center', allData.filter(d => d.type === 'center').length);
    update('stat-lab', allData.filter(d => d.type === 'lab').length);
    update('stat-doctor', allData.filter(d => d.type === 'doctor').length);
    update('stat-pharmacy', allData.filter(d => d.type === 'pharmacy').length);
}

/**
 * تحسين روابط الصور (تحويل تلقائي إلى WebP)
 */
function getOptimizedImageUrl(url, width = 400, height = 300) {
    if (!url) return 'https://picsum.photos/seed/default/400/250';

    if (url.includes('supabase.co/storage/v1/object/public/')) {
        return url.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/') + `?width=${width}&height=${height}&resize=cover&quality=75`;
    }

    if (url.startsWith('http://') || url.startsWith('https://')) {
        const cleanUrl = url.replace(/^https?:\/\//, '');
        return `https://wsrv.nl/?url=${encodeURIComponent(cleanUrl)}&w=${width}&h=${height}&fit=cover&output=webp&q=70`;
    }

    return url;
}

/**
 * تحديث Meta Tags للـ SEO
 */
function updateMetaTags(title, description, image, keywords = '') {
    document.title = title;

    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
        metaDesc = document.createElement('meta');
        metaDesc.name = "description";
        document.head.appendChild(metaDesc);
    }
    metaDesc.content = description;

    let metaKeywords = document.querySelector('meta[name="keywords"]');
    if (!metaKeywords) {
        metaKeywords = document.createElement('meta');
        metaKeywords.name = "keywords";
        document.head.appendChild(metaKeywords);
    }
    metaKeywords.content = keywords;

    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', title);
    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute('content', description);
    if (image) {
        const ogImage = document.querySelector('meta[property="og:image"]');
        if (ogImage) ogImage.setAttribute('content', image);
    }

    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.setAttribute('href', window.location.href);
}

/**
 * SEO الافتراضي
 */
const DEFAULT_SEO = {
    title: 'LomedX | منصة طبية شاملة: حجز مواعيد، بحث عن دواء، وملف صحي ذكي',
    description: 'LomedX منصتك الطبية الشاملة في سوريا. احجز موعدك مع أفضل الأطباء، ابحث عن دواء في صيدليات مدينتك، أنشئ ملفك الصحي المشفر، واستفد من أدواتنا الطبية التفاعلية (حاسبات الجرعات، الإسعافات، بنك الدم).',
    image: 'https://z-cdn-media.chatglm.cn/files/981068e8-ce01-48cb-baf4-b93e843f3df9.jpg'
};

/**
 * إعادة Meta Tags للوضع الافتراضي
 */
function resetMetaTags() {
    updateMetaTags(DEFAULT_SEO.title, DEFAULT_SEO.description, DEFAULT_SEO.image);
    if (window.location.hash && !window.location.hash.includes('article=')) {
        history.replaceState(null, '', window.location.pathname + window.location.search);
    }
}

/**
 * إنشاء بطاقة منشأة (HTML)
 */
function createCard(item) {
    const typeMap = {
        hospital: { cardClass: 'hospital-card', badgeClass: 'badge-hospital', iconClass: 'cat-icon-hospital', icon: 'fa-hospital-symbol', label: 'مشفى', color: 'var(--hospital)' },
        center: { cardClass: 'center-card', badgeClass: 'badge-center', iconClass: 'cat-icon-center', icon: 'fa-clinic-medical', label: 'مركز طبي', color: 'var(--center)' },
        lab: { cardClass: 'lab-card', badgeClass: 'badge-lab', iconClass: 'cat-icon-lab', icon: 'fa-flask', label: 'مخبر', color: 'var(--lab)' },
        doctor: { cardClass: 'doctor-card', badgeClass: 'badge-doctor', iconClass: 'cat-icon-doctor', icon: 'fa-user-md', label: 'طبيب', color: 'var(--doctor)' },
        pharmacy: { cardClass: 'pharmacy-card', badgeClass: 'badge-pharmacy', iconClass: 'cat-icon-pharmacy', icon: 'fa-pills', label: 'صيدلية', color: 'var(--pharmacy)' }
    };
    const t = typeMap[item.type] || typeMap.doctor;

    // النجوم
    const fullStars = Math.floor(item.rating || 0);
    const halfStar = (item.rating || 0) % 1 >= 0.5;
    let starsHTML = '';
    for (let i = 0; i < fullStars; i++) starsHTML += '<i class="fas fa-star"></i>';
    if (halfStar) starsHTML += '<i class="fas fa-star-half-alt"></i>';
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
    for (let i = 0; i < emptyStars; i++) starsHTML += '<i class="far fa-star"></i>';

    // التفاصيل حسب النوع
    let detailsHTML = '';
    if (item.type === 'hospital') {
        detailsHTML = `
            <div class="detail-row"><i class="fas fa-map-marker-alt"></i><span>${escapeHtml(item.address || '')}</span></div>
            <div class="detail-row"><i class="fas fa-clock"></i><span>${escapeHtml(item.hours || '24/7 طوارئ')}</span></div>
            ${item.emergencyphone ? '<div class="detail-row"><i class="fas fa-ambulance" style="color: var(--danger)"></i><span style="color: var(--danger); font-weight: 700">طوارئ: ' + escapeHtml(item.emergencyphone) + '</span></div>' : ''}
        `;
    } else if (item.type === 'doctor') {
        detailsHTML = `
            <div class="detail-row"><i class="fas fa-graduation-cap"></i><span>${escapeHtml(item.specialty || '')}</span></div>
            <div class="detail-row"><i class="fas fa-map-marker-alt"></i><span>${escapeHtml(item.clinic || '')}</span></div>
            <div class="detail-row"><i class="fas fa-clock"></i><span>${escapeHtml(item.consulthours || item.hours || '')}</span></div>
        `;
    } else if (item.type === 'center') {
        detailsHTML = `
            <div class="detail-row"><i class="fas fa-star-of-life"></i><span>${escapeHtml(item.services || item.specialty || '')}</span></div>
            <div class="detail-row"><i class="fas fa-map-marker-alt"></i><span>${escapeHtml(item.address || '')}</span></div>
            <div class="detail-row"><i class="fas fa-clock"></i><span>${escapeHtml(item.hours || '')}</span></div>
        `;
    } else if (item.type === 'lab') {
        detailsHTML = `
            <div class="detail-row"><i class="fas fa-vials"></i><span>${escapeHtml(item.tests || item.specialty || '')}</span></div>
            <div class="detail-row"><i class="fas fa-map-marker-alt"></i><span>${escapeHtml(item.address || '')}</span></div>
            ${item.homesample && item.homesample !== 'لا' ? '<div class="detail-row"><i class="fas fa-house-user" style="color: var(--accent)"></i><span style="color: var(--accent); font-weight: 600">يتوفر سحب منزلي</span></div>' : ''}
        `;
    } else {
        detailsHTML = `
            <div class="detail-row"><i class="fas fa-map-marker-alt"></i><span>${escapeHtml(item.address || '')}</span></div>
            <div class="detail-row"><i class="fas fa-clock"></i><span>${escapeHtml(item.hours || '')}</span></div>
            ${item.night ? '<div class="detail-row"><i class="fas fa-moon" style="color: var(--gold)"></i><span style="color: var(--gold); font-weight: 600">صيدلية مناوبة</span></div>' : ''}
        `;
    }

    // زر الحجز (للأطباء فقط)
    const canBook = item.type === 'doctor';
    let bookingBtn = '';
    if (canBook) {
        if (item.is_subscribed) {
            bookingBtn = `<button onclick="event.stopPropagation(); openBookingModal('${escapeHtml(item.id)}')" class="w-10 h-10 rounded-xl border flex items-center justify-center transition-all hover:bg-gray-50" style="border-color: var(--border); color: var(--accent);" aria-label="حجز"><i class="fas fa-calendar-plus"></i></button>`;
        } else {
            bookingBtn = `<button onclick="event.stopPropagation(); showToast('الحجز الإلكتروني متاح فقط للأطباء المشتركين. يرجى الاتصال هاتفياً.')" class="w-10 h-10 rounded-xl border flex items-center justify-center transition-all opacity-40 cursor-not-allowed" style="border-color: var(--border); color: var(--muted);" aria-label="الحجز متوقف"><i class="fas fa-calendar-xmark"></i></button>`;
        }
    }

    // شارة التحقق
    const verifiedBadge = (['doctor', 'pharmacy'].includes(item.type) && item.is_subscribed)
        ? '<span class="verified-badge verified-gold"><i class="fas fa-circle-check"></i> موثق</span>'
        : '';

    // زر المفضلة
    const favBtn = item.type === 'doctor' ? `
        <button onclick="event.stopPropagation(); toggleFavorite('${escapeHtml(item.id)}', '${escapeHtml(item.name)}', this)" class="text-xl transition-all ${favoriteDoctors.includes(item.id) ? 'text-red-500' : 'text-gray-300 hover:text-red-400'}" aria-label="إضافة للمفضلة">
            <i class="${favoriteDoctors.includes(item.id) ? 'fas' : 'far'} fa-heart"></i>
        </button>
    ` : '';

    // شارات الحالة
    const statusBadges = `
        ${['doctor', 'pharmacy'].includes(item.type) && item.isopen === true ? '<span class="badge" style="background:#10B981;color:white"><i class="fas fa-door-open ml-1"></i>مفتوح</span>' : ''}
        ${['doctor', 'pharmacy'].includes(item.type) && item.isopen === false ? '<span class="badge" style="background:#EF4444;color:white"><i class="fas fa-door-closed ml-1"></i>مغلق</span>' : ''}
        ${item.night ? '<span class="badge" style="background:rgba(196,150,44,0.9);color:white"><i class="fas fa-moon ml-1"></i>ليلي</span>' : ''}
    `;

    return `<div class="card ${t.cardClass} cursor-pointer" onclick="openModal('${escapeHtml(item.id)}')" data-type="${escapeHtml(item.type)}">
        <div class="relative h-40 overflow-hidden rounded-t-2xl">
            <img src="${getOptimizedImageUrl(item.image, 400, 300)}" alt="${escapeHtml(item.name)} - ${escapeHtml(item.specialty || t.label)} في سوريا | منصة LomedX" class="w-full h-full object-cover transition-transform duration-500 hover:scale-110 cursor-zoom-in" loading="lazy" onclick="event.stopPropagation(); openLightbox(this.src, 'صورة ${escapeHtml(item.name)} - ${escapeHtml(item.specialty || t.label)} | LomedX')">
            <div class="absolute top-3 right-3"><span class="badge ${t.badgeClass}">${t.label}</span></div>
            <div class="absolute top-3 left-3 flex flex-col gap-1 items-start">${statusBadges}</div>
        </div>
        <div class="p-5">
            <div class="flex items-start gap-3 mb-3">
                <div class="cat-icon ${t.iconClass}"><i class="fas ${t.icon}"></i></div>
                <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 justify-between">
                        <h3 class="font-bold text-sm mb-1 leading-tight flex-1 min-w-0" style="font-family: 'Noto Kufi Arabic'; color: var(--fg);">
                            ${escapeHtml(item.name)}
                            ${verifiedBadge}
                        </h3>
                        ${favBtn}
                    </div>
                    <div class="flex items-center gap-1 text-[11px]" style="color: ${t.color};">${starsHTML}<span class="mr-1 font-semibold">${escapeHtml(item.rating || 0)}</span></div>
                </div>
            </div>
            <div class="flex flex-col gap-1.5 mb-4">${detailsHTML}</div>
            <div class="flex items-center gap-2">
                ${item.phone ? `<a href="javascript:void(0)" onclick="event.stopPropagation(); trackPhoneClick(event, '${escapeHtml(item.id)}', '${escapeHtml(item.phone)}')" class="call-btn flex-1 py-2.5 rounded-xl text-white text-xs font-semibold text-center flex items-center justify-center gap-2" style="background: ${t.color}"><i class="fas fa-phone-alt"></i><span dir="ltr">${escapeHtml(item.phone)}</span></a>` :
                (['doctor', 'pharmacy', 'lab'].includes(item.type) ? `<div class="flex-1 py-2.5 rounded-xl text-gray-400 text-xs font-semibold text-center flex items-center justify-center gap-2 bg-gray-100 cursor-not-allowed"><i class="fas fa-phone-slash"></i><span>لا يوجد رقم</span></div>` : '')}
                ${bookingBtn}
                <button onclick="event.stopPropagation(); openModal('${escapeHtml(item.id)}')" class="w-10 h-10 rounded-xl border flex items-center justify-center transition-all hover:bg-gray-50" style="border-color: var(--border); color: var(--muted);" aria-label="تفاصيل"><i class="fas fa-info-circle"></i></button>
            </div>
        </div>
    </div>`;
}

/**
 * توليد Schema.org ItemList للـ SEO
 */
function generateItemListSchema(items) {
    const oldSchema = document.getElementById('dynamicItemListSchema');
    if (oldSchema) oldSchema.remove();

    const itemListElement = items.slice(0, 10).map((item, index) => {
        let itemType = "Physician";
        if (item.type === 'hospital') itemType = "Hospital";
        else if (item.type === 'pharmacy') itemType = "Pharmacy";
        else if (item.type === 'lab') itemType = "MedicalClinic";

        return {
            "@type": "ListItem",
            "position": index + 1,
            "item": {
                "@type": itemType,
                "name": item.name,
                "telephone": item.phone || "",
                "image": item.image || "",
                "address": {
                    "@type": "PostalAddress",
                    "streetAddress": item.address || item.clinic || "",
                    "addressLocality": "سوريا"
                },
                "url": `https://lomedx.pages.dev/#${item.id}`
            }
        };
    });

    const schemaData = {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "name": "دليل الأطباء والمنشآت الطبية في سوريا - Lomedx",
        "itemListElement": itemListElement
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'dynamicItemListSchema';
    script.textContent = JSON.stringify(schemaData);
    document.head.appendChild(script);
}

/**
 * عرض البيانات (بعد الفلترة)
 */
function renderData() {
    const grids = {
        hospital: { el: document.getElementById('hospitalsGrid'), section: document.getElementById('hospitals'), data: allData.filter(d => d.type === 'hospital') },
        center: { el: document.getElementById('centersGrid'), section: document.getElementById('centers'), data: allData.filter(d => d.type === 'center') },
        lab: { el: document.getElementById('labsGrid'), section: document.getElementById('labs'), data: allData.filter(d => d.type === 'lab') },
        doctor: { el: document.getElementById('doctorsGrid'), section: document.getElementById('doctors'), data: allData.filter(d => d.type === 'doctor') },
        pharmacy: { el: document.getElementById('pharmaciesGrid'), section: document.getElementById('pharmacies'), data: allData.filter(d => d.type === 'pharmacy').sort((a, b) => (b.night === true) - (a.night === true)) }
    };

    let totalFiltered = 0;

    for (const [type, g] of Object.entries(grids)) {
        if (!g.el || !g.section) continue;

        let filtered = g.data.filter(matchItem);

        // ترتيب ذكي متعدد الطبقات
        filtered.sort((a, b) => {
            if (b.is_subscribed !== a.is_subscribed) {
                return (b.is_subscribed === true) - (a.is_subscribed === true);
            }
            const ratingA = a.rating || 0;
            const ratingB = b.rating || 0;
            if (ratingB !== ratingA) return ratingB - ratingA;
            const viewsA = a.view_count || 0;
            const viewsB = b.view_count || 0;
            return viewsB - viewsA;
        });

        totalFiltered += filtered.length;

        const show = filtered.length > 0 && (currentFilter === 'all' || currentFilter === type);
        const itemsToRender = filtered.slice(0, renderLimits[type]);

        g.el.innerHTML = itemsToRender.map(createCard).join('');
        generateItemListSchema(itemsToRender);
        g.section.style.display = show ? '' : 'none';

        const loadBtn = document.getElementById(`loadMore_${type}`);
        if (loadBtn) {
            if (show && filtered.length > renderLimits[type]) {
                loadBtn.classList.remove('hidden');
            } else {
                loadBtn.classList.add('hidden');
            }
        }
    }

    const noResultsDiv = document.getElementById('noResults');
    if (noResultsDiv) {
        noResultsDiv.classList.toggle('hidden', totalFiltered !== 0);
        noResultsDiv.style.display = totalFiltered === 0 ? 'block' : 'none';
    }

    return totalFiltered;
}

/**
 * زر "عرض المزيد" لكل قسم
 */
window.loadMoreSection = (type) => {
    renderLimits[type] += 8;
    renderData();

    setTimeout(() => {
        const loadBtn = document.getElementById(`loadMore_${type}`);
        if (loadBtn && !loadBtn.classList.contains('hidden')) {
            loadBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, 100);
};

/**
 * مطابقة عنصر مع الفلاتر الحالية
 */
function matchItem(item) {
    if (currentFilter !== 'all' && item.type !== currentFilter) return false;

    if (currentCity !== 'all') {
        const itemAddress = (item.address || item.clinic || '').toLowerCase();
        if (!itemAddress.includes(currentCity.toLowerCase())) return false;
    }

    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return ['name', 'specialty', 'address', 'description', 'services', 'tests', 'departments', 'floors', 'homesample', 'nightdetails', 'consulthours', 'bookingnotes']
        .some(key => (escapeHtml(item[key]) || '').toLowerCase().includes(q));
}

/**
 * تعيين الفلتر النشط
 */
window.setFilter = (filter, btn) => {
    renderLimits = { hospital: 4, center: 4, lab: 4, doctor: 8, pharmacy: 8 };
    currentFilter = filter;

    document.querySelectorAll('.filter-btn').forEach(b => {
        b.classList.remove('active');
        b.style.background = '';
        b.style.color = '';
        b.style.borderColor = '';
    });

    btn.classList.add('active');
    const colors = {
        all: 'var(--accent)', hospital: 'var(--hospital)', clinic: 'var(--clinic)',
        center: 'var(--center)', lab: 'var(--lab)', doctor: 'var(--doctor)', pharmacy: 'var(--pharmacy)'
    };
    btn.style.background = colors[filter];
    btn.style.color = 'white';
    btn.style.borderColor = colors[filter];

    renderData();
};

/**
 * معالج البحث الرئيسي
 */
window.handleSearch = (value) => {
    renderLimits = { hospital: 4, center: 4, lab: 4, doctor: 8, pharmacy: 8 };
    searchQuery = value.trim();
    const heroSearch = document.getElementById('heroSearch');
    if (heroSearch) heroSearch.value = value;

    const totalResults = renderData();

    if (totalResults === 0 && searchQuery !== '') {
        showToast('لا توجد نتائج مطابقة لبحثك. جرب كلمة أخرى أو عرض كل المدن');
    }
};

/* ═══════════════════════════════════════════════════════════════════
   ═══════════════ 5. SMART SEARCH (Autocomplete) ═══════════════
   ═══════════════════════════════════════════════════════════════════ */

let searchDebounceTimer;
let searchDropdown = null;

/**
 * Debounce helper
 */
function debounce(func, delay) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), delay);
    };
}

/**
 * تهيئة البحث الذكي
 */
function initSmartSearch() {
    const searchInput = document.getElementById('heroSearch');
    if (!searchInput) return;

    searchDropdown = document.createElement('div');
    searchDropdown.id = 'smartSearchDropdown';
    searchDropdown.classList.add('hidden');
    document.body.appendChild(searchDropdown);

    const updateDropdownPosition = () => {
        if (!searchDropdown || !searchInput) return;
        const rect = searchInput.getBoundingClientRect();
        searchDropdown.style.position = 'fixed';
        searchDropdown.style.top = `${rect.bottom + 8}px`;
        searchDropdown.style.left = `${rect.left}px`;
        searchDropdown.style.width = `${rect.width}px`;
        searchDropdown.style.zIndex = '99999';
    };

    searchInput.addEventListener('input', debounce((e) => {
        handleSmartSearch(e.target.value);
    }, 300));

    window.addEventListener('scroll', updateDropdownPosition, true);
    window.addEventListener('resize', updateDropdownPosition);
    window.updateSmartSearchPosition = updateDropdownPosition;

    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && searchDropdown && !searchDropdown.contains(e.target)) {
            searchDropdown.classList.add('hidden');
        }
    });
}

/**
 * معالجة البحث الذكي
 */
function handleSmartSearch(value) {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
        const q = value.toLowerCase().trim();
        if (q.length < 2) {
            if (searchDropdown) searchDropdown.classList.add('hidden');
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

/**
 * عرض نتائج البحث الذكي
 */
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

    if (window.updateSmartSearchPosition) window.updateSmartSearchPosition();
    searchDropdown.classList.remove('hidden');
}

/**
 * اختيار نتيجة من البحث
 */
window.selectSearchResult = (id) => {
    if (searchDropdown) searchDropdown.classList.add('hidden');
    const searchInput = document.getElementById('heroSearch');
    if (searchInput) searchInput.value = '';
    openModal(id);
};

/* ═══════════════════════════════════════════════════════════════════
   ═══════════════ 6. FAVORITES ═══════════════
   ═══════════════════════════════════════════════════════════════════ */

/**
 * تبديل حالة المفضلة
 */
window.toggleFavorite = (id, name, btnElement) => {
    const index = favoriteDoctors.indexOf(id);
    if (index > -1) {
        favoriteDoctors.splice(index, 1);
        showToast(`تم إزالة ${name} من المفضلة`);
    } else {
        favoriteDoctors.push(id);
        showToast(`تمت إضافة ${name} إلى المفضلة ❤️`, 'success');
    }
    localStorage.setItem('lomedx_favorites', JSON.stringify(favoriteDoctors));

    const icon = btnElement.querySelector('i');
    if (index > -1) {
        icon.className = 'far fa-heart';
        btnElement.classList.remove('text-red-500');
        btnElement.classList.add('text-gray-300');
    } else {
        icon.className = 'fas fa-heart';
        btnElement.classList.remove('text-gray-300');
        btnElement.classList.add('text-red-500');
    }

    window.updateFavBadge();
};

/**
 * فتح نافذة المفضلة
 */
window.openFavoritesModal = () => {
    const favDoctorsData = allData.filter(d => favoriteDoctors.includes(d.id));

    let contentHtml = '';
    if (favDoctorsData.length === 0) {
        contentHtml = `
            <div class="p-8 text-center">
                <div class="w-20 h-20 mx-auto rounded-full bg-red-50 flex items-center justify-center mb-4">
                    <i class="fas fa-heart-crack text-3xl text-red-400"></i>
                </div>
                <h3 class="text-lg font-bold text-gray-800 mb-2" style="font-family: 'Noto Kufi Arabic'">قائمة المفضلة فارغة</h3>
                <p class="text-sm text-gray-500 mb-6">لم تقم بحفظ أي طبيب. اضغط على أيقونة القلب (❤️) بجانب اسم الطبيب لإضافته هنا والوصول إليه بسرعة.</p>
                <button onclick="closeModal()" class="px-6 py-2.5 bg-blue-50 text-blue-600 rounded-lg text-sm font-semibold hover:bg-blue-100 transition-colors">تصفح الأطباء</button>
            </div>
        `;
    } else {
        contentHtml = `<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">${favDoctorsData.map(createCard).join('')}</div>`;
    }

    document.getElementById('modalContent').innerHTML = `
        <div class="p-6">
            <div class="flex justify-between items-center mb-6 pb-4 border-b" style="border-color: var(--border);">
                <h3 class="text-xl font-bold" style="font-family: 'Noto Kufi Arabic'; color: var(--fg);">
                    <i class="fas fa-heart text-red-500 ml-2"></i> قائمة المفضلة
                </h3>
                <button onclick="closeModal()" class="text-2xl hover:text-gray-400 leading-none">&times;</button>
            </div>
            ${contentHtml}
        </div>
    `;
    document.getElementById('modalOverlay').classList.add('active');
    lockScroll();
};

/**
 * تحديث عداد المفضلة في شريط التنقل
 */
window.updateFavBadge = () => {
    const favBadge = document.getElementById('favCountBadge');
    if (!favBadge) return;
    if (favoriteDoctors.length > 0) {
        favBadge.innerText = favoriteDoctors.length;
        favBadge.classList.remove('hidden');
    } else {
        favBadge.classList.add('hidden');
    }
};

/**
 * عرض قسم المفضلة في الصفحة الرئيسية
 */
function renderFavoritesSection() {
    const favSection = document.getElementById('favoritesSection');
    const favGrid = document.getElementById('favoritesGrid');
    if (!favSection || !favGrid) return;

    const favDoctorsData = allData.filter(d => favoriteDoctors.includes(d.id));

    if (favDoctorsData.length === 0) {
        favSection.classList.add('hidden');
        return;
    }

    favSection.classList.remove('hidden');
    favGrid.innerHTML = favDoctorsData.map(createCard).join('');
}

/* ═══════════════════════════════════════════════════════════════════
   ═══════════════ 7. CITY SELECTOR ═══════════════
   ═══════════════════════════════════════════════════════════════════ */

window.openCitySelector = () => {
    const overlay = document.getElementById('citySelectorOverlay');
    const listContainer = document.getElementById('cityListContainer');
    if (!overlay || !listContainer) return;

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
    const overlay = document.getElementById('citySelectorOverlay');
    if (overlay) overlay.classList.remove('active');
};

window.selectCity = (city) => {
    renderLimits = { hospital: 4, center: 4, lab: 4, doctor: 8, pharmacy: 8 };
    currentCity = city;
    const cityText = document.getElementById('currentCityText');
    if (cityText) cityText.innerText = city;
    closeCitySelector();
    renderData();
};

/**
 * إعادة تعيين البحث والفلاتر
 */
window.resetSearch = () => {
    searchQuery = '';
    currentFilter = 'all';
    const heroSearch = document.getElementById('heroSearch');
    if (heroSearch) heroSearch.value = '';

    document.querySelectorAll('.filter-btn').forEach(b => {
        b.classList.remove('active');
        b.style.background = '';
        b.style.color = '';
        b.style.borderColor = '';
    });

    const allBtn = document.querySelector('[data-filter="all"]');
    if (allBtn) {
        allBtn.classList.add('active');
        allBtn.style.background = 'var(--accent)';
        allBtn.style.color = 'white';
        allBtn.style.borderColor = 'var(--accent)';
    }

    renderData();
};
/* ═══════════════════════════════════════════════════════════════════
   ═══════════════ 8. MODALS & PANELS ═══════════════
   ═══════════════════════════════════════════════════════════════════ */

/**
 * فتح نافذة تفاصيل منشأة (Modal)
 */
window.openModal = (id) => {
    const item = allData.find(d => d.id === id);
    if (!item) return;

    // تتبع الزيارات (للأطباء والصيدليات فقط)
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

    // النجوم
    const fullStars = Math.floor(item.rating || 0);
    const halfStar = (item.rating || 0) % 1 >= 0.5;
    let starsHTML = '';
    for (let i = 0; i < fullStars; i++) starsHTML += '<i class="fas fa-star"></i>';
    if (halfStar) starsHTML += '<i class="fas fa-star-half-alt"></i>';
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
    for (let i = 0; i < emptyStars; i++) starsHTML += '<i class="far fa-star"></i>';

    let extraHTML = '';
    let doctorsListHtml = '';

    // ─── تفاصيل المشافي والمراكز ───
    if (item.type === 'hospital' || item.type === 'center') {
        const primaryColor = item.type === 'hospital' ? 'teal' : 'purple';
        let cData = item.facility_details || {};

        // شريط الإحصائيات
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

        // معلومات السعة
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

        // الأطباء المرتبطون
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

        // أكورديون الأقسام
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

        // أكورديون الوحدات الحرجة
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

        // أكورديون الخدمات المساندة
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

        // أرقام الهواتف المتعددة
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

        extraHTML = `${statsHtml}${capacityHtml}${deptsHtml}${unitsHtml}${servicesHtml}${phonesHtml}`;

    } else if (item.type === 'doctor') {
        // ─── تفاصيل الطبيب ───
        let queueWidget = '';
        if (item.current_queue !== -1) {
            const queueCount = item.current_queue || 0;
            const waitTime = item.avg_wait_time || 15;
            const totalWait = queueCount * waitTime;
            let queueStatusText = "العيادة فارغة الآن", queueColor = "#34D399";
            if (queueCount > 0 && queueCount <= 3) { queueStatusText = "ازدحام خفيف"; queueColor = "#fbbf24"; }
            else if (queueCount > 3) { queueStatusText = "ازدحام مرتفع"; queueColor = "#f87171"; }

            queueWidget = `
<div class="queue-tracker-card">
    <div class="qt-header">
        <div class="qt-icon" style="color: ${queueColor}; border-color: ${queueColor}40; background: ${queueColor}15;"><i class="fas fa-users"></i></div>
        <div class="qt-info">
            <span class="qt-title">حالة الازدحام المباشر</span>
            <span class="qt-status" style="color: ${queueColor};">
                <span class="qt-pulse-dot" style="background: ${queueColor};"></span> ${queueStatusText}
            </span>
        </div>
    </div>
    <div class="qt-stats">
        <div class="qt-stat-box">
            <span class="qt-num">${queueCount}</span>
            <span class="qt-label">شخص في الانتظار</span>
        </div>
        <div class="qt-divider"></div>
        <div class="qt-stat-box">
            <span class="qt-num">${totalWait}</span>
            <span class="qt-label">دقيقة متوقعة</span>
        </div>
    </div>
</div>`;
        }

        extraHTML = `${queueWidget}${item.bookingnotes ? `<div class="flex items-center gap-3 p-3 rounded-xl mt-3" style="background: var(--bg)"><i class="fas fa-info-circle" style="color: var(--doctor)"></i><div><div class="text-xs" style="color: var(--muted)">تفاصيل إضافية</div><div class="text-sm font-bold">${escapeHtml(item.bookingnotes)}</div></div></div>` : ''}`;

    } else if (item.type === 'lab') {
        extraHTML = `
            ${item.tests ? `<div class="flex items-center gap-3 p-3 rounded-xl" style="background: #FEE2E2"><i class="fas fa-vials" style="color: var(--lab)"></i><div><div class="text-xs" style="color: var(--muted)">نوع التحاليل والخدمات</div><div class="text-sm font-bold" style="color: var(--lab)">${escapeHtml(item.tests)}</div></div></div>` : ''}
            ${item.homesample && item.homesample !== 'لا' ? `<div class="flex items-center gap-3 p-3 rounded-xl" style="background: #D1FAE5"><i class="fas fa-house-user" style="color: #059669"></i><div><div class="text-xs" style="color: var(--muted)">خدمة سحب العينات من المنزل</div><div class="text-sm font-bold" style="color: #059669">متوفرة</div></div></div>` : ''}
        `;

    } else if (item.type === 'pharmacy') {
        extraHTML = `${item.night ? `<div class="flex items-center gap-3 p-3 rounded-xl" style="background: var(--gold-light)"><i class="fas fa-moon" style="color: var(--gold)"></i><div><div class="text-xs" style="color: var(--muted)">المناوبة</div><div class="text-sm font-bold" style="color: var(--gold)">${escapeHtml(item.nightdetails || 'صيدلية مناوبة ليلية')}</div></div></div>` : ''}`;
    }

    // زر الحجز
    const canBook = item.type === 'doctor' && item.is_subscribed;
    let bookingBtnModal = '';
    if (canBook) {
        bookingBtnModal = `<button onclick="openBookingModal('${escapeHtml(item.id)}')" class="flex-1 py-3.5 rounded-xl text-white text-sm font-bold text-center flex items-center justify-center gap-2" style="background: var(--accent)"><i class="fas fa-calendar-check"></i> طلب موعد</button>`;
    }

    // الخريطة
    const mapQuery = item.latlng || ((item.address || item.clinic) + ' سوريا ');
    const mapEmbed = mapQuery ? `
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
        </div>
    ` : '';

    // ─── بناء محتوى Modal ───
    document.getElementById('modalContent').innerHTML = `
        <div class="relative h-48 overflow-hidden rounded-t-2xl">
            <img src="${getOptimizedImageUrl(item.image, 800, 400)}" alt="${escapeHtml(item.name)}" class="w-full h-full object-cover cursor-zoom-in" onclick="openLightbox(this.src)">
            <div class="absolute inset-0" style="background: linear-gradient(to top, rgba(0,0,0,0.6), transparent)"></div>
            <button onclick="closeModal()" class="absolute top-4 left-4 w-8 h-8 rounded-full bg-black/30 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/50 transition-all"><i class="fas fa-times text-sm"></i></button>
            <div class="absolute bottom-4 right-5 left-5">
                <span class="badge ${t.badgeClass} mb-2 inline-block">${t.label}</span>
                <h3 class="text-white font-bold text-lg" style="font-family: 'Noto Kufi Arabic'">${escapeHtml(item.name)}</h3>
            </div>
        </div>
        <div class="p-6">
            <div class="flex items-center gap-2 mb-4">
                <div class="flex items-center gap-0.5 text-sm" style="color: ${t.color}">${starsHTML}</div>
                <span class="text-sm font-bold">${escapeHtml(item.rating || 0)}</span>
                <span class="text-xs" style="color: var(--muted)">/ 5</span>
            </div>
            <p class="text-sm leading-relaxed mb-5" style="color: var(--fg-light)">${escapeHtml(item.description || '')}</p>
            <div class="flex flex-col gap-2 mb-5">
                <div class="flex items-center gap-3 p-3 rounded-xl" style="background: var(--bg)">
                    <i class="fas ${t.icon}" style="color: ${t.color}"></i>
                    <div>
                        <div class="text-xs" style="color: var(--muted)">${item.type === 'doctor' ? 'التخصص' : (item.type === 'clinic' || item.type === 'center' ? 'التخصص الأساسي' : 'النوع')}</div>
                        <div class="text-sm font-bold">${escapeHtml(item.specialty || 'غير محدد')}</div>
                    </div>
                </div>
                ${(item.address || item.clinic) ? `<div class="flex items-center gap-3 p-3 rounded-xl" style="background: var(--bg)"><i class="fas fa-map-marker-alt" style="color: ${t.color}"></i><div><div class="text-xs" style="color: var(--muted)">العنوان / الموقع</div><div class="text-sm font-bold">${escapeHtml(item.address || item.clinic)}</div></div></div>` : ''}
                <div class="flex items-center gap-3 p-3 rounded-xl" style="background: var(--bg)">
                    <i class="fas fa-clock" style="color: ${t.color}"></i>
                    <div class="flex-1">
                        <div class="text-xs" style="color: var(--muted)">${item.type === 'doctor' ? 'أوقات المعاينة' : 'أوقات العمل'}</div>
                        <div class="text-sm font-bold">${escapeHtml(item.consulthours || item.hours || '')}</div>
                    </div>
                    ${['doctor', 'clinic', 'pharmacy'].includes(item.type) && item.isopen === true ? '<span class="text-xs px-2 py-1 rounded bg-green-100 text-green-700 font-bold">مفتوح الآن</span>' : ''}
                    ${['doctor', 'clinic', 'pharmacy'].includes(item.type) && item.isopen === false ? '<span class="text-xs px-2 py-1 rounded bg-red-100 text-red-700 font-bold">مغلق حالياً</span>' : ''}
                </div>
                ${extraHTML}
            </div>
            ${doctorsListHtml}
            ${mapEmbed}
            ${item.phone ? `
                <div class="flex items-center gap-3 mt-4">
                    <a href="javascript:void(0)" onclick="trackPhoneClick(event, '${escapeHtml(item.id)}', '${escapeHtml(item.phone)}')" class="call-btn flex-1 py-3.5 rounded-xl text-white text-sm font-bold text-center flex items-center justify-center gap-2" style="background: ${t.color}">
                        <i class="fas fa-phone-alt"></i> اتصال ${escapeHtml(item.phone)}
                    </a>
                    <button onclick="copyNumber('${escapeHtml(item.phone)}')" class="w-12 h-12 rounded-xl border flex items-center justify-center transition-all hover:bg-gray-50 flex-shrink-0" style="border-color: var(--border)">
                        <i class="fas fa-copy" style="color: var(--muted)"></i>
                    </button>
                </div>
            ` : ''}
            ${canBook ? `<div class="mt-3">${bookingBtnModal}</div>` : ''}
        </div>
    `;

    document.getElementById('modalOverlay').classList.add('active');
    lockScroll();
};

/**
 * إغلاق نافذة التفاصيل
 */
window.closeModal = (event) => {
    if (event && event.target !== document.getElementById('modalOverlay')) return;
    document.getElementById('modalOverlay').classList.remove('active');
    unlockScroll();

    resetMetaTags();
    const articleSchema = document.getElementById('dynamicArticleSchema');
    if (articleSchema) articleSchema.remove();
};

/**
 * فتح Lightbox للصور
 */
window.openLightbox = (src, imgAlt = 'صورة منشأة طبية من منصة LomedX') => {
    const lightbox = document.getElementById('lightbox');
    if (!lightbox) return;
    const imgEl = lightbox.querySelector('img');
    if (!imgEl) return;

    imgEl.src = src.includes('picsum.photos') ? src.replace('/400/250', '/1200/800') : src;
    imgEl.alt = imgAlt;

    lightbox.classList.add('active');
    lockScroll();
};

/**
 * نسخ رقم الهاتف
 */
window.copyNumber = (phone) => {
    navigator.clipboard.writeText(phone)
        .then(() => showToast('تم نسخ رقم الهاتف بنجاح'))
        .catch(() => showToast('تعذر النسخ'));
};

/**
 * نسخ نص عام
 */
window.copyText = (text) => {
    navigator.clipboard.writeText(text)
        .then(() => showToast('تم نسخ الكود بنجاح'))
        .catch(() => showToast('تعذر النسخ'));
};

/**
 * تتبع نقرات الهاتف (مع زيادة العداد)
 */
window.trackPhoneClick = async (event, id, phoneNumber) => {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }

    try {
        const { error } = await supabase.rpc('increment_phone_click', { p_listing_id: id });
        if (error) throw error;

        const item = allData.find(d => d.id === id);
        if (item) {
            item.phone_clicks = (item.phone_clicks || 0) + 1;

            const docPhoneClicksEl = document.getElementById('docPhoneClicks');
            if (docPhoneClicksEl && window.currentDashboardData?.id === id) {
                docPhoneClicksEl.innerText = item.phone_clicks;
            }

            const pharmPhoneClicksEl = document.getElementById('pharmPhoneClicks');
            if (pharmPhoneClicksEl && window.currentDashboardData?.id === id) {
                pharmPhoneClicksEl.innerText = item.phone_clicks;
            }
        }
    } catch (err) {
        console.error('Phone click RPC error:', err.message);
    } finally {
        if (phoneNumber) {
            window.location.href = `tel:${phoneNumber}`;
        }
    }
};

/* ═══════════════════════════════════════════════════════════════════
   ═══════════════ 9. TOAST & UI HELPERS ═══════════════
   ═══════════════════════════════════════════════════════════════════ */

/**
 * عرض إشعار Toast
 */
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;

    let icon = 'ℹ️';
    let bgColor = '#1B2A1B';

    if (type === 'success') {
        icon = '✅';
        bgColor = '#10B981';
    } else if (type === 'error') {
        icon = '❌';
        bgColor = '#EF4444';
    } else if (type === 'warning') {
        icon = '⚠️';
        bgColor = '#F59E0B';
    }

    toast.innerHTML = `<span style="margin-left: 8px;">${icon}</span> ${message}`;
    toast.style.backgroundColor = bgColor;

    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 4000);
}
window.showToast = showToast;

/**
 * إخفاء Toast فوراً
 */
window.hideToast = () => {
    const toast = document.getElementById('toast');
    if (toast) toast.classList.remove('show');
};

/**
 * تبديل قائمة الجوال
 */
window.toggleMobileMenu = () => {
    const menu = document.getElementById('mobileMenu');
    const overlay = document.getElementById('menuOverlay');
    const icon = document.getElementById('menuIcon');
    if (!menu || !overlay || !icon) return;

    const isOpen = menu.classList.contains('open');
    if (isOpen) {
        menu.classList.remove('open');
        overlay.classList.add('hidden');
        icon.className = 'fas fa-bars';
        unlockScroll();
    } else {
        menu.classList.add('open');
        overlay.classList.remove('hidden');
        icon.className = 'fas fa-times';
        lockScroll();
    }
};

/**
 * عرض/إخفاء معلومات المنصة
 */
window.togglePlatformInfo = () => {
    const infoDiv = document.getElementById('platformInfo');
    const icon = document.getElementById('platformInfoIcon');
    if (!infoDiv || !icon) return;

    if (infoDiv.classList.contains('hidden')) {
        infoDiv.classList.remove('hidden');
        icon.style.transform = 'rotate(180deg)';
    } else {
        infoDiv.classList.add('hidden');
        icon.style.transform = 'rotate(0deg)';
    }
};

/**
 * عرض/إخفاء صندوق الفوتر
 */
window.toggleFooterBox = (contentId, iconId) => {
    const content = document.getElementById(contentId);
    const icon = document.getElementById(iconId);
    if (!content || !icon) return;

    if (content.classList.contains('hidden')) {
        content.classList.remove('hidden');
        icon.style.transform = 'rotate(180deg)';
    } else {
        content.classList.add('hidden');
        icon.style.transform = 'rotate(0deg)';
    }
};

/**
 * معالج نموذج التواصل
 */
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

    const name = document.getElementById('contactName').value;
    const type = document.getElementById('contactType').value;
    const message = document.getElementById('contactMessage').value;

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
};

/* ═══════════════════════════════════════════════════════════════════
   ═══════════════ 10. SCROLL & KEYBOARD HANDLERS ═══════════════
   ═══════════════════════════════════════════════════════════════════ */

let scrollTicking = false;
window.addEventListener('scroll', () => {
    if (!scrollTicking) {
        window.requestAnimationFrame(() => {
            const navbar = document.getElementById('navbar');
            const backToTop = document.getElementById('backToTop');
            if (navbar) navbar.classList.toggle('scrolled', window.scrollY > 80);
            if (backToTop) backToTop.classList.toggle('visible', window.scrollY > 500);
            scrollTicking = false;
        });
        scrollTicking = true;
    }
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const lightbox = document.getElementById('lightbox');
        if (lightbox && lightbox.classList.contains('active')) {
            lightbox.classList.remove('active');
            unlockScroll();
        }
        const modalOverlay = document.getElementById('modalOverlay');
        if (modalOverlay && modalOverlay.classList.contains('active')) closeModal();
        const ctrlOverlay = document.getElementById('ctrlOverlay');
        if (ctrlOverlay && ctrlOverlay.classList.contains('active')) closeCtrlPanel();
        const mobileMenu = document.getElementById('mobileMenu');
        if (mobileMenu && mobileMenu.classList.contains('open')) toggleMobileMenu();
    }
});

// تفعيل زر "الكل" الافتراضي
const allFilterBtn = document.querySelector('[data-filter="all"]');
if (allFilterBtn) {
    allFilterBtn.style.background = 'var(--accent)';
    allFilterBtn.style.color = 'white';
    allFilterBtn.style.borderColor = 'var(--accent)';
}

/* ═══════════════════════════════════════════════════════════════════
   ═══════════════ 11. CTRL PANEL (النافذة العامة) ═══════════════
   ═══════════════════════════════════════════════════════════════════ */

/**
 * فتح النافذة الجانبية العامة
 */
window.openCtrlPanel = (title, contentHtml, headerColor = '#073D2E', preventClose = false) => {
    document.getElementById('ctrlTitle').textContent = title;
    document.getElementById('ctrlContent').innerHTML = contentHtml;

    const overlay = document.getElementById('ctrlOverlay');
    if (!overlay.classList.contains('active')) {
        overlay.classList.add('active');
        const header = document.querySelector('#ctrlOverlay .p-5');
        if (header) header.style.background = headerColor;
        lockScroll();
    }
    overlay.dataset.preventClose = preventClose ? 'true' : 'false';
};

/**
 * إغلاق النافذة الجانبية
 */
window.closeCtrlPanel = (event) => {
    const overlay = document.getElementById('ctrlOverlay');
    if (event && event.target.id === 'ctrlOverlay' && overlay.dataset.preventClose === 'true') return;

    if (typeof clearToolSEO === 'function') clearToolSEO();

    if (window.activeHealthFileSub) {
        supabase.removeChannel(window.activeHealthFileSub);
        window.activeHealthFileSub = null;
    }

    if (activeQrScanner) {
        activeQrScanner.stop().then(() => {
            activeQrScanner.clear();
            activeQrScanner = null;
        }).catch(() => { activeQrScanner = null; });
    }

    overlay.classList.remove('active');
    unlockScroll();
    document.getElementById('ctrlContent').innerHTML = '';

    resetMetaTags();
    if (window.location.pathname !== '/' && window.location.pathname !== '/index.html') {
        history.pushState({}, '', '/');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    if (doctorDashboardInterval) {
        clearInterval(doctorDashboardInterval);
        doctorDashboardInterval = null;
    }
    if (unsubscribeMedRequests) {
        supabase.removeChannel(unsubscribeMedRequests);
        unsubscribeMedRequests = null;
    }
    if (unsubscribeMedRequestsInterval) {
        clearInterval(unsubscribeMedRequestsInterval);
        unsubscribeMedRequestsInterval = null;
    }
    if (unsubscribeDocBookings) {
        supabase.removeChannel(unsubscribeDocBookings);
        unsubscribeDocBookings = null;
    }
    if (activeFollowupUnsub) {
        supabase.removeChannel(activeFollowupUnsub);
        activeFollowupUnsub = null;
    }
    currentFollowupBookingId = null;
};

/**
 * تبديل تبويبات نموذج الملف الصحي
 */
window.switchHealthTab = (tab) => {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const loginBtn = document.getElementById('tabLoginBtn');
    const registerBtn = document.getElementById('tabRegBtn');
    if (!loginForm || !registerForm) return;

    if (tab === 'login') {
        loginForm.classList.remove('hidden');
        loginForm.classList.add('flex');
        registerForm.classList.remove('flex');
        registerForm.classList.add('hidden');
        loginBtn.classList.add('bg-white', 'shadow');
        loginBtn.classList.remove('text-gray-500');
        registerBtn.classList.remove('bg-white', 'shadow');
        registerBtn.classList.add('text-gray-500');
    } else {
        loginForm.classList.remove('flex');
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
        registerForm.classList.add('flex');
        registerBtn.classList.add('bg-white', 'shadow');
        registerBtn.classList.remove('text-gray-500');
        loginBtn.classList.remove('bg-white', 'shadow');
        loginBtn.classList.add('text-gray-500');
    }
};

/**
 * بحث المقالات
 */
window.searchArticles = () => {
    const input = document.getElementById('blogSearchInput');
    if (input) fetchArticles(input.value);
};

/* ═══════════════════════════════════════════════════════════════════
   ═══════════════ 12. BOOKING SYSTEM ═══════════════
   ═══════════════════════════════════════════════════════════════════ */

/**
 * فتح نافذة الحجز
 */
window.openBookingModal = (id) => {
    closeModal();
    const item = allData.find(d => d.id === id);
    if (!item) return;

    tempBooking = {
        itemid: id,
        itemname: item.name,
        itemphone: (item.phone || '').replace(/[^0-9]/g, '')
    };

    let daysHTML = '';
    let validDaysCount = 0;

    for (let i = 1; i <= 14; i++) {
        const date = new Date();
        date.setDate(date.getDate() + i);
        const dayName = date.toLocaleDateString('ar-EG', { weekday: 'long' });

        if (item.workingdays && item.workingdays.includes(dayName) && validDaysCount < 5) {
            validDaysCount++;
            const dayShort = date.toLocaleDateString('ar-EG', { weekday: 'short' });
            const dayNum = date.toLocaleDateString('ar-EG', { day: 'numeric' });
            const iso = date.toISOString();
            daysHTML += `<button onclick="selectDay('${iso}', this)" class="day-btn flex-shrink-0 w-16 h-20 rounded-xl flex flex-col items-center justify-center gap-1 bg-white"><span class="text-xs font-bold">${dayShort}</span><span class="text-2xl font-black">${dayNum}</span></button>`;
        }
    }

    if (validDaysCount === 0) {
        daysHTML = '<p class="text-sm text-center w-full" style="color: var(--muted)">لا توجد أيام متاحة للحجز.</p>';
    }

    document.getElementById('modalContent').innerHTML = `
        <div class="p-6">
            <div class="flex justify-between items-center mb-6">
                <h3 class="font-bold text-lg"><i class="fas fa-calendar-plus ml-2" style="color: var(--accent)"></i> طلب موعد</h3>
                <button onclick="closeModal()" class="text-2xl hover:text-gray-400 leading-none">&times;</button>
            </div>
            <div class="mb-4 p-3 rounded-xl flex items-center gap-3" style="background: var(--accent-light)">
                <i class="fas fa-hospital text-xl" style="color: var(--accent)"></i>
                <div>
                    <div class="text-xs" style="color: var(--accent-dark)">سيتم طلب الموعد في:</div>
                    <div class="font-bold text-sm" style="color: var(--accent-dark)">${escapeHtml(item.name)}</div>
                </div>
            </div>
            <div id="step1" class="booking-step active">
                <h4 class="text-sm font-bold mb-3">1. اختر اليوم المناسب:</h4>
                <div class="flex gap-2 overflow-x-auto pb-2 mb-4">${daysHTML}</div>
                <div id="slotsContainer" class="flex flex-wrap gap-2 mb-4"></div>
                <button onclick="goToStep(2)" id="step1Next" disabled class="w-full py-3 rounded-xl text-white font-bold text-sm transition-all opacity-50 cursor-not-allowed" style="background: var(--accent)">التالي</button>
            </div>
            <div id="step2" class="booking-step">
                <h4 class="text-sm font-bold mb-3">2. أدخل بياناتك:</h4>
                <div class="flex flex-col gap-3 mb-6">
                    <input type="text" id="patientName" class="ctrl-input" placeholder="الاسم الكامل" required>
                    <input type="tel" id="patientPhone" class="ctrl-input" placeholder="09XXXXXXXX" required>
                    <textarea id="patientNotes" class="ctrl-input" rows="2" placeholder="ملاحظات (اختياري)"></textarea>
                </div>
                <div class="flex gap-2">
                    <button onclick="goToStep(1)" class="w-1/3 py-3 rounded-xl border font-bold text-sm" style="border-color: var(--border)"><i class="fas fa-arrow-right ml-2"></i> رجوع</button>
                    <button onclick="confirmBooking()" class="w-2/3 py-3 rounded-xl text-white font-bold text-sm" style="background: var(--accent)">تأكيد</button>
                </div>
            </div>
        </div>
    `;

    document.getElementById('modalOverlay').classList.add('active');
    lockScroll();
};

/**
 * اختيار يوم للحجز
 */
window.selectDay = async (iso, btn) => {
    tempBooking.day = new Date(iso);
    tempBooking.daystr = tempBooking.day.toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' });

    document.querySelectorAll('.day-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const item = allData.find(d => d.id === tempBooking.itemid);
    const slotsContainer = document.getElementById('slotsContainer');
    const step1Next = document.getElementById('step1Next');

    // النظام اليدوي
    if (item.active_system !== 'slots' || !item.working_hours) {
        if (slotsContainer) slotsContainer.innerHTML = '';
        step1Next.disabled = false;
        step1Next.classList.remove('opacity-50', 'cursor-not-allowed');
        return;
    }

    // النظام الدقيق
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

    while (start < end) {
        const timeStr = start.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
        const isBooked = bookedSlots.includes(timeStr);
        slotsHtml += `<button ${isBooked ? 'disabled' : `onclick="selectSlot('${timeStr}', this)"`} class="px-3 py-2 rounded-lg text-xs font-bold transition-all ${isBooked ? 'bg-gray-100 text-gray-400 line-through cursor-not-allowed' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}">${timeStr}</button>`;
        start.setMinutes(start.getMinutes() + 20);
    }

    slotsContainer.innerHTML = slotsHtml || '<p class="text-xs text-gray-400 w-full text-center py-2">لا توجد أوقات متاحة.</p>';
    step1Next.disabled = true;
    step1Next.classList.add('opacity-50', 'cursor-not-allowed');
};

/**
 * اختيار وقت للحجز
 */
window.selectSlot = (time, btn) => {
    tempBooking.slot_time = time;
    document.querySelectorAll('#slotsContainer button').forEach(b => b.classList.remove('bg-blue-600', 'text-white'));
    btn.classList.remove('bg-blue-50', 'text-blue-700');
    btn.classList.add('bg-blue-600', 'text-white');

    document.getElementById('step1Next').disabled = false;
    document.getElementById('step1Next').classList.remove('opacity-50', 'cursor-not-allowed');
};

/**
 * التنقل بين خطوات الحجز
 */
window.goToStep = (step) => {
    document.querySelectorAll('.booking-step').forEach(s => s.classList.remove('active'));
    const stepEl = document.getElementById(`step${step}`);
    if (stepEl) stepEl.classList.add('active');
};

/**
 * تأكيد الحجز
 */
window.confirmBooking = async () => {
    if (!window.checkOnlineStatus()) return;

    const name = document.getElementById('patientName').value.trim();
    const phoneInput = document.getElementById('patientPhone');
    const phone = phoneInput.value.trim();

    if (!name || !phone) {
        showToast('الرجاء إدخال الاسم والهاتف');
        return;
    }
    if (!/^09\d{8}$/.test(phone)) {
        phoneInput.classList.add('input-invalid');
        showToast('رقم هاتف غير صحيح');
        return;
    }
    phoneInput.classList.remove('input-invalid');

    const patientPushId = localStorage.getItem('patient_push_id') || null;

    // ─── بصمة الجهاز (Canvas + Hardware) ───
    const generateNativeFingerprint = () => {
        const nav = window.navigator || {};
        const screen = window.screen || {};

        let canvasCode = 'no_canvas';
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            ctx.textBaseline = "top";
            ctx.font = "14px 'Arial'";
            ctx.fillStyle = "#f60";
            ctx.fillRect(125, 1, 62, 20);
            ctx.fillStyle = "#069";
            ctx.fillText("LomedX_Security_FP", 2, 15);
            ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
            ctx.fillText("LomedX_Security_FP", 4, 17);
            canvasCode = canvas.toDataURL().slice(-50);
        } catch (e) { canvasCode = 'canvas_blocked'; }

        const data = [
            nav.userAgent || '', nav.language || '', nav.platform || '',
            nav.hardwareConcurrency || '', nav.deviceMemory || '',
            nav.maxTouchPoints || 0,
            screen.width + 'x' + screen.height,
            screen.colorDepth || '', window.devicePixelRatio || 1,
            new Date().getTimezoneOffset(), canvasCode
        ].join('|');

        let hash = 2166136261;
        for (let i = 0; i < data.length; i++) {
            hash ^= data.charCodeAt(i);
            hash = Math.imul(hash, 16777619);
        }

        return 'native_' + (hash >>> 0).toString(16);
    };

    const deviceFingerprint = generateNativeFingerprint();

    const submitBtn = document.querySelector('#step2 button:last-child');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التأكيد...';
    }

    try {
        const { data: funcData, error: funcError } = await supabase.functions.invoke('manage-public-requests', {
            body: {
                action: 'book',
                doctor_id: tempBooking.itemid,
                patient_name: name,
                patient_phone: phone,
                day: tempBooking.daystr,
                time: tempBooking.slot_time || "بانتظار التحديد",
                patient_push_id: patientPushId,
                fingerprint: deviceFingerprint
            }
        });

        if (funcError) {
            let errMsg = funcError.message;
            if (funcError.context && typeof funcError.context.json === 'function') {
                try {
                    const errBody = await funcError.context.json();
                    if (errBody.error) errMsg = errBody.error;
                } catch (e) { /* ignore */ }
            } else if (funcError.context && funcError.context.error) {
                errMsg = funcError.context.error;
            }
            throw new Error(errMsg);
        }

        const newId = funcData.booking[0].id;
        const ref = funcData.booking[0].ref;

        // إرسال إشعار للطبيب
        const { data: doctorData } = await supabase.from('listings').select('user_id').eq('id', tempBooking.itemid).single();
        if (doctorData && doctorData.user_id) {
            sendPushNotification(doctorData.user_id, "موعد جديد 🗓️", `المريض ${name} طلب موعداً يوم ${tempBooking.daystr}`);
        }

        document.getElementById('step2').innerHTML = `
            <div class="text-center py-6 flex flex-col items-center">
                <div class="w-16 h-16 rounded-full flex items-center justify-center mb-4" style="background: var(--accent-light)">
                    <i class="fas fa-check text-3xl" style="color: var(--accent)"></i>
                </div>
                <h4 class="text-lg font-bold mb-2">تم إرسال طلبك!</h4>
                <p class="text-sm mb-2" style="color: var(--muted)">رقم المرجع: <span class="font-bold text-yellow-600">#${ref}</span></p>
                <button onclick="copyText('${ref}')" class="w-full py-3 rounded-xl text-white font-bold text-sm mb-2" style="background: var(--accent)"><i class="fas fa-copy ml-2"></i> نسخ الكود</button>
                <button onclick="closeModal(); openBookingFollowup('${newId}')" class="w-full py-3 rounded-xl text-white font-bold text-sm mb-2" style="background: var(--doctor)">متابعة الحجز والدردشة</button>
                <button onclick="closeModal()" class="w-full py-2 rounded-xl border font-bold text-sm" style="border-color: var(--border)">إغلاق</button>
            </div>
        `;
    } catch (err) {
        showToast('خطأ: ' + err.message, 'error');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'تأكيد';
        }
    }
};

/**
 * فتح متابعة الحجز
 */
window.openBookingFollowup = async (bookingId) => {
    currentFollowupBookingId = bookingId;
    openCtrlPanel('متابعة الحجز والدردشة', `<div id="followupContent" class="flex flex-col gap-4"><p class="text-center py-8 text-gray-400">جاري تحميل بيانات الحجز...</p></div>`, '#0E7C5F');

    if (window.activeFollowupInterval) clearInterval(window.activeFollowupInterval);

    const fetchFollowupData = async () => {
        const { data: freshBooking } = await supabase.rpc('get_booking_by_id', { p_booking_id: bookingId }).maybeSingle();
        if (freshBooking) {
            const index = bookings.findIndex(b => b.id === bookingId);
            if (index !== -1) bookings[index] = freshBooking;
            else bookings.push(freshBooking);
            renderFollowupChat(bookingId);
        }
    };

    await fetchFollowupData();

    window.activeFollowupInterval = setInterval(async () => {
        if (!document.getElementById('followupContent')) {
            clearInterval(window.activeFollowupInterval);
            return;
        }
        await fetchFollowupData();
    }, 2000);
};

/**
 * عرض محادثة متابعة الحجز
 */
window.renderFollowupChat = (bookingId) => {
    const booking = bookings.find(b => b.id === bookingId);
    const contentEl = document.getElementById('followupContent');
    if (!contentEl) return;
    if (!booking) {
        contentEl.innerHTML = '<p class="text-center py-8 text-red-500">لم يتم العثور على الحجز.</p>';
        return;
    }

    const b = booking;
    let statusBadge = '';
    if (b.status === 'accepted') {
        statusBadge = `<span class="px-3 py-1 rounded text-sm" style="background: #D1FAE5; color: #065F46">🟢 تم التأكيد - ${escapeHtml(b.time)}</span>`;
    } else if (b.status === 'canceled') {
        statusBadge = `<span class="px-3 py-1 rounded text-sm" style="background: #FEE2E2; color: #991B1B">تم الإلغاء</span>`;
    } else {
        statusBadge = `<span class="px-3 py-1 rounded text-sm" style="background: #FEF3C7; color: #92400E">🟡 الحجز قيد المراجعة من العيادة</span>`;
    }

    let chatHtml = '';
    if (b.chat && b.chat.length > 0) {
        chatHtml = b.chat.map(msg => `
            <div class="flex ${msg.sender === 'patient' ? 'justify-start' : 'justify-end'}">
                <div class="max-w-[75%] p-3 rounded-xl text-sm ${msg.sender === 'patient' ? 'bg-gray-100 text-gray-800' : 'bg-blue-500 text-white'}">${escapeHtml(msg.text)}</div>
            </div>
        `).join('');
    } else {
        chatHtml = '<p class="text-center text-xs text-gray-400 my-4">لا توجد رسائل بعد. انتظر رد العيادة.</p>';
    }

    const existingInput = document.getElementById('chatInput');
    if (!existingInput) {
        contentEl.innerHTML = `
            <div class="bg-white p-4 rounded-xl border" style="border-color: var(--border)">
                <div class="flex justify-between items-center mb-2">
                    <div>
                        <div class="font-bold text-sm">${escapeHtml(b.itemname)}</div>
                        <div class="text-xs text-gray-500">${escapeHtml(b.daystr)}</div>
                    </div>
                    <div id="statusBadgeContainer">${statusBadge}</div>
                </div>
                <div class="text-xs text-yellow-600 font-bold mt-2">رقم المرجع: #${escapeHtml(b.ref)}</div>
            </div>
            <div class="bg-white p-4 rounded-xl border flex flex-col h-96" style="border-color: var(--border)">
                <div class="flex-1 overflow-y-auto flex flex-col gap-2 mb-3 pr-1" id="chatBox">${chatHtml}</div>
                <div class="flex gap-2 border-t pt-3" style="border-color: var(--border)">
                    ${b.status === 'accepted'
                ? `<input type="text" id="chatInput" class="ctrl-input text-sm" placeholder="اكتب رسالتك للطبيب..." onkeydown="if(event.key==='Enter') sendChatMessage('${bookingId}')"><button onclick="sendChatMessage('${bookingId}')" class="px-4 rounded-xl text-white" style="background: var(--accent)"><i class="fas fa-paper-plane"></i></button>`
                : `<input type="text" class="ctrl-input text-sm" placeholder="الدردشة متاحة بعد تأكيد الموعد" disabled style="cursor: not-allowed; opacity: 0.5;"><button disabled class="px-4 rounded-xl text-white" style="background: #ccc; cursor: not-allowed;"><i class="fas fa-paper-plane"></i></button>`
            }
                </div>
            </div>
        `;
    } else {
        const chatBox = document.getElementById('chatBox');
        const statusContainer = document.getElementById('statusBadgeContainer');
        if (chatBox) chatBox.innerHTML = chatHtml;
        if (statusContainer) statusContainer.innerHTML = statusBadge;
    }

    const chatBox = document.getElementById('chatBox');
    if (chatBox) chatBox.scrollTop = chatBox.scrollHeight;
};

/**
 * إرسال رسالة دردشة (من المريض)
 */
window.sendChatMessage = async (bookingId) => {
    if (!window.checkOnlineStatus()) return;

    const booking = bookings.find(b => b.id === bookingId);
    if (!booking || booking.status !== 'accepted') {
        showToast('الدردشة متاحة فقط بعد تأكيد الموعد من العيادة', 'error');
        return;
    }

    const input = document.getElementById('chatInput');
    const text = input.value.trim();
    if (!text) return;
    input.value = '';

    try {
        const { error } = await supabase.rpc('append_chat_message', {
            p_booking_id: bookingId,
            p_sender: 'patient',
            p_text: text
        });
        if (error) throw error;

        const { data: doctorData } = await supabase.from('listings').select('user_id').eq('id', booking.itemid).single();
        if (doctorData && doctorData.user_id) {
            sendPushNotification(doctorData.user_id, "رسالة جديدة 💬", `لديك رسالة جديدة من المريض ${booking.name}`);
        }
    } catch (err) {
        showToast('خطأ في الإرسال', 'error');
    }
};

/* ═══════════════════════════════════════════════════════════════════
   ═══════════════ 13. PHARMACY DASHBOARD ═══════════════
   ═══════════════════════════════════════════════════════════════════ */

window.openPharmacyLogin = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session && session.user.email && session.user.email.endsWith('@lomedx.app')) {
        const userId = session.user.id;
        const { data: listing } = await supabase.from('listings')
            .select('id, name, image, is_subscribed, isopen, night, phone_clicks, view_count, address')
            .eq('user_id', userId).eq('type', 'pharmacy').maybeSingle();

        if (listing) {
            if (listing.is_subscribed) renderPharmacyDashboard(listing);
            else openPaymentModal('صيدلية', listing.name);
            return;
        }
    }

    openCtrlPanel('لوحة الصيدليات', `
        <div class="max-w-sm mx-auto py-8">
            <div class="text-center mb-6">
                <div class="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-3" style="background: var(--accent-light)">
                    <i class="fas fa-prescription-bottle-medical text-2xl" style="color: var(--accent)"></i>
                </div>
                <h3 class="font-bold text-lg">دخول الصيدليات</h3>
            </div>
            <form onsubmit="handlePharmacyLogin(event)" class="flex flex-col gap-4">
                <input type="text" id="pharmPhone" class="ctrl-input text-center" placeholder="مُعرف الدخول (أو رقم الهاتف)" required>
                <input type="text" id="pharmPass" class="ctrl-input text-center font-mono" placeholder="كلمة المرور" required>
                <button type="submit" class="w-full py-3 rounded-xl text-white font-bold text-sm" style="background: var(--accent)">دخول</button>
            </form>
        </div>
    `, '#0E7C5F');
};

window.logoutPharmacy = async () => {
    await supabase.auth.signOut();
    closeCtrlPanel();
    showToast('تم تسجيل الخروج بنجاح', 'success');
};

/**
 * عرض لوحة تحكم الصيدلية
 */
window.renderPharmacyDashboard = async (pharm) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        openPharmacyLogin();
        showToast('يجب تسجيل الدخول أولاً');
        return;
    }

    // استخراج المدينة من العنوان
    let pharmCity = 'غير محدد';
    if (pharm.address) {
        const foundCity = allCities.find(c => c !== 'كل المدن' && pharm.address.includes(c));
        if (foundCity) pharmCity = foundCity;
    }

    // عدد الأدوية الموفرة
    const { count: providedCount } = await supabase
        .from('medicine_requests')
        .select('*', { count: 'exact', head: true })
        .eq('available_pharmacy', pharm.name)
        .eq('status', 'available');

    const providedMeds = providedCount || 0;

    openCtrlPanel(`لوحة تحكم: ${pharm.name}`, `
        <div class="flex flex-col gap-5">
            <div class="bg-white p-5 rounded-xl border flex items-center justify-between flex-col sm:flex-row gap-4" style="border-color: var(--border)">
                <div class="flex items-center gap-4">
                    <img src="${escapeHtml(pharm.image)}" class="w-20 h-20 rounded-2xl object-cover">
                    <div>
                        <h3 class="font-bold text-lg">${escapeHtml(pharm.name)}</h3>
                        <p class="text-sm" style="color: var(--pharmacy)">صيدلية</p>
                    </div>
                </div>
                <div class="bg-white p-3 rounded-xl border flex items-center justify-between gap-2 mb-3" style="border-color: var(--border)">
                    <span class="text-sm font-bold text-gray-700">حالة العمل:</span>
                    <div class="flex gap-1 bg-gray-50 p-1 rounded-lg">
                        <button onclick="setStatus('${pharm.id}', true)" class="px-4 py-1.5 rounded-md text-xs font-bold transition-all ${pharm.isopen === true ? 'bg-green-500 text-white shadow' : 'text-gray-500 hover:bg-gray-100'}">مفتوح</button>
                        <button onclick="setStatus('${pharm.id}', false)" class="px-4 py-1.5 rounded-md text-xs font-bold transition-all ${pharm.isopen === false ? 'bg-red-500 text-white shadow' : 'text-gray-500 hover:bg-gray-100'}">مغلق</button>
                        <button onclick="setStatus('${pharm.id}', null)" class="px-4 py-1.5 rounded-md text-xs font-bold transition-all ${pharm.isopen == null ? 'bg-gray-700 text-white shadow' : 'text-gray-500 hover:bg-gray-100'}">لا شيء</button>
                    </div>
                </div>
                <button onclick="toggleNightShift('${pharm.id}', ${!pharm.night})" class="w-full px-4 py-2 rounded-xl font-bold text-sm ${pharm.night ? 'bg-yellow-500 text-white' : 'bg-gray-200'}">${pharm.night ? 'إيقاف المناوبة الليلية' : 'تفعيل المناوبة الليلية'}</button>
            </div>

            <div class="grid grid-cols-3 gap-3">
                <div class="bg-white p-4 rounded-xl border text-center" style="border-color: var(--border);">
                    <i class="fas fa-eye text-blue-500 text-xl mb-1"></i>
                    <div class="text-2xl font-black text-gray-800" id="pharmViewCount">${pharm.view_count || 0}</div>
                    <div class="text-xs text-gray-500">زيارة الملف</div>
                </div>
                <div class="bg-white p-4 rounded-xl border text-center" style="border-color: var(--border);">
                    <i class="fas fa-hand-holding-medical text-green-500 text-xl mb-1"></i>
                    <div class="text-2xl font-black text-gray-800">${providedMeds}</div>
                    <div class="text-xs text-gray-500">أدوية موفرة</div>
                </div>
                <div class="bg-white p-4 rounded-xl border text-center" style="border-color: var(--border);">
                    <i class="fas fa-phone-alt text-purple-500 text-xl mb-1"></i>
                    <div class="text-2xl font-black text-gray-800" id="pharmPhoneClicks">${pharm.phone_clicks || 0}</div>
                    <div class="text-xs text-gray-500">نقرات الهاتف</div>
                </div>
            </div>

            <div class="bg-white p-5 rounded-xl border" style="border-color: var(--border)">
                <h4 class="font-bold mb-4 text-sm">طلبات الأدوية الواردة</h4>
                <div id="requestsContainer" class="flex flex-col gap-3">
                    <p class="text-center py-10" style="color: var(--muted)">جاري تحميل الطلبات...</p>
                </div>
            </div>

            <button onclick="logoutPharmacy()" class="w-full py-3 rounded-xl border font-bold text-sm mt-3" style="border-color: #EF4444; color: #EF4444;">
                <i class="fas fa-sign-out-alt ml-2"></i> تسجيل الخروج
            </button>
        </div>
    `, '#0E7C5F', true);

    // إيقاف الاشتراك السابق
    if (unsubscribeMedRequests) supabase.removeChannel(unsubscribeMedRequests);
    if (unsubscribeMedRequestsInterval) clearInterval(unsubscribeMedRequestsInterval);

    fetchMedRequests(pharm.name, pharmCity);

    // Realtime
    unsubscribeMedRequests = supabase
        .channel('medicine_requests_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'medicine_requests' }, payload => {
            fetchMedRequests(pharm.name, pharmCity);
        })
        .subscribe();

    // مؤقت هادئ
    unsubscribeMedRequestsInterval = setInterval(() => fetchMedRequests(pharm.name, pharmCity), 60000);
};

/**
 * جلب طلبات الأدوية للصيدلية
 */
async function fetchMedRequests(pharmName, pharmCity = null) {
    const container = document.getElementById('requestsContainer');
    if (!container) return;

    const activeElement = document.activeElement;
    if (activeElement && activeElement.id && activeElement.id.startsWith('medNotes_')) return;

    container.innerHTML = '<p class="text-center py-10" style="color: var(--muted)">جاري تحديث الطلبات...</p>';

    const { data: snapshot, error } = await supabase.rpc('get_active_med_requests');
    if (error || !snapshot) {
        container.innerHTML = '<p class="text-center py-10 text-red-500">حدث خطأ أو لا تملك صلاحية.</p>';
        return;
    }

    let filteredSnapshot = snapshot;
    if (pharmCity && pharmCity !== 'غير محدد') {
        filteredSnapshot = snapshot.filter(req => {
            let reqCity = req.city || 'غير محدد';
            return reqCity === pharmCity;
        });
    }

    if (filteredSnapshot.length === 0) {
        container.innerHTML = '<p class="text-center py-10" style="color: var(--muted)">لا توجد طلبات أدوية في مدينتك حالياً.</p>';
        return;
    }

    let html = '';
    filteredSnapshot.forEach(req => {
        const date = new Date(req.created_at).toLocaleString('ar-EG', { date: 'short', time: 'short' });
        const phone = req.patient_phone;

        let requestStatus = '';
        if (req.status === 'available') requestStatus = `<span class="text-xs px-2 py-1 rounded bg-green-100 text-green-700 inline-block mb-2">تم التوفير</span>`;
        else if (req.status === 'unavailable') requestStatus = `<span class="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700 inline-block mb-2">غير متوفر</span>`;
        else requestStatus = `<span class="text-xs px-2 py-1 rounded bg-yellow-100 text-yellow-700 inline-block mb-2">قيد البحث</span>`;

        let interactionArea = '';
        if (req.status === 'available') {
            if (req.available_pharmacy === pharmName) {
                interactionArea = `
                    <div class="bg-green-50 text-green-700 text-sm font-bold p-3 rounded-lg text-center mb-2">أنت من وفر هذا الدواء للمريض</div>
                    <a href="tel:${escapeHtml(phone)}" class="flex-1 bg-blue-500 text-white px-3 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2"><i class="fas fa-phone"></i> اتصال للمريض</a>
                    <button onclick="updateMedStatus('${req.id}', 'searching')" class="w-full mt-2 bg-gray-200 text-gray-600 px-3 py-2 rounded-lg text-xs">تراجع عن التوفير</button>
                `;
            } else {
                interactionArea = `<div class="bg-gray-100 text-gray-500 text-sm font-bold p-3 rounded-lg text-center">تم إغلاق هذا الطلب (تم التوفير من صيدلية أخرى)</div>`;
            }
        } else if (req.status === 'unavailable') {
            interactionArea = `
                <div class="bg-gray-100 text-gray-400 text-sm font-bold p-3 rounded-lg text-center">قمت بإغلاق هذا الطلب</div>
                <button onclick="updateMedStatus('${req.id}', 'searching')" class="w-full mt-2 bg-gray-200 text-gray-600 px-3 py-2 rounded-lg text-xs">إعادة فتح الطلب</button>
            `;
        } else {
            interactionArea = `
                <input type="text" id="medNotes_${req.id}" placeholder="ملاحظة للمواطن" value="${escapeHtml(req.notes || '')}" onblur="updateMedNotes('${req.id}', this.value)" class="ctrl-input text-sm py-1">
                <div class="flex gap-2 mt-2">
                    <button onclick="setMedAvailable('${req.id}', '${escapeHtml(pharmName)}', '${escapeHtml(req.patient_push_id || '')}')" class="flex-1 bg-green-500 text-white px-3 py-2 rounded-lg text-sm font-semibold">توفّر الدواء</button>
                    <button onclick="updateMedStatus('${req.id}', 'unavailable')" class="flex-1 bg-gray-500 text-white px-3 py-2 rounded-lg text-sm font-semibold">غير متوفر</button>
                </div>
                <div class="flex gap-2 mt-2">
                    <a href="tel:${escapeHtml(phone)}" class="flex-1 bg-blue-500 text-white px-3 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2"><i class="fas fa-phone"></i> اتصال</a>
                </div>
            `;
        }

        html += `
            <div class="bg-white border rounded-xl p-4 flex flex-col gap-3" style="border-color: var(--border)">
                <div class="flex flex-col sm:flex-row gap-3 items-center">
                    ${req.image_url ? `<img src="${escapeHtml(req.image_url)}" class="w-full sm:w-24 h-24 object-cover rounded-lg cursor-zoom-in" onclick="openLightbox('${escapeHtml(req.image_url)}')">` : ''}
                    <div class="flex-1 text-center sm:text-right">
                        <h4 class="font-bold">${escapeHtml(req.patient_name)} <span class="text-xs text-yellow-600 font-mono">#${escapeHtml(req.med_ref || '')}</span></h4>
                        <p class="text-sm text-gray-700 font-semibold">${escapeHtml(req.med_list || '')}</p>
                        <p class="text-xs mt-1 text-red-500">الإلحاح: ${escapeHtml(req.urgency || 'عادي')}</p>
                        <p class="text-xs" style="color: var(--muted)"><i class="fas fa-clock"></i> ${escapeHtml(date)}</p>
                        ${requestStatus}
                    </div>
                </div>
                <div class="flex flex-col gap-2 mt-2 border-t pt-3" style="border-color: var(--border)">${interactionArea}</div>
            </div>
        `;
    });

    container.innerHTML = html;
}

/**
 * تبديل المناوبة الليلية
 */
window.toggleNightShift = async (id, currentStatus) => {
    if (!window.checkOnlineStatus()) return;
    try {
        await supabase.from('listings').update({ night: currentStatus }).eq('id', id);
        const item = allData.find(d => d.id === id);
        if (item) item.night = currentStatus;

        const ctrlContent = document.getElementById('ctrlContent');
        const scrollTop = ctrlContent ? ctrlContent.scrollTop : 0;
        renderPharmacyDashboard(item);
        if (ctrlContent) ctrlContent.scrollTop = scrollTop;

        showToast(currentStatus ? 'تم تفعيل المناوبة!' : 'تم إيقاف المناوبة.');
    } catch (e) {
        showToast('خطأ في التحديث', 'error');
    }
};

/**
 * تحديث حالة طلب دواء
 */
window.updateMedStatus = async (id, status) => {
    if (!window.checkOnlineStatus()) return;
    try {
        await supabase.rpc('update_med_request_status', {
            p_req_id: id,
            p_status: status
        });
        showToast('تم تحديث حالة الدواء', 'success');
    } catch (e) {
        showToast('خطأ في التحديث', 'error');
    }
};

/**
 * تحديث ملاحظات الدواء
 */
window.updateMedNotes = async (id, notes) => {
    if (!window.checkOnlineStatus()) return;
    try {
        await supabase.rpc('update_med_request_status', {
            p_req_id: id,
            p_status: 'searching',
            p_notes: notes
        });
        showToast('تم حفظ الملاحظة', 'success');
    } catch (e) {
        showToast('خطأ في الحفظ', 'error');
    }
};

/**
 * تعيين دواء كمتوفر
 */
window.setMedAvailable = async (id, pharmName, patientPushId) => {
    if (!window.checkOnlineStatus()) return;
    try {
        const noteInput = document.getElementById(`medNotes_${id}`);
        const customNote = noteInput ? noteInput.value.trim() : '';

        let finalNotes = `الدواء متوفر لدى ${pharmName}. يرجى الحضور لاستلامه.`;
        if (customNote) finalNotes += `\nملاحظة من الصيدلية: ${customNote}`;

        await supabase.rpc('update_med_request_status', {
            p_req_id: id,
            p_status: 'available',
            p_notes: finalNotes,
            p_pharmacy_name: pharmName
        });

        if (patientPushId) {
            let pushMessage = `تم توفير الدواء في ${pharmName}. يرجى الحضور لاستلامه.`;
            if (customNote) pushMessage += ` (ملاحظة: ${customNote})`;
            sendPushNotification(null, "تم توفير دوائك ✅", pushMessage, 'player', patientPushId);
        }

        showToast('تم إعلام المريض بتوفر الدواء', 'success');
    } catch (e) {
        showToast('خطأ في التحديث', 'error');
    }
};

/* ═══════════════════════════════════════════════════════════════════
   ═══════════════ 14. DOCTOR DASHBOARD ═══════════════
   ═══════════════════════════════════════════════════════════════════ */

window.openDoctorLogin = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session && session.user.email && session.user.email.endsWith('@lomedx.app')) {
        const userId = session.user.id;
        const { data: listing } = await supabase.from('listings')
            .select('id, name, specialty, image, is_subscribed, active_system, allowed_systems, working_hours, workingdays, current_queue, avg_wait_time, phone_clicks, view_count')
            .eq('user_id', userId).eq('type', 'doctor').maybeSingle();

        if (listing) {
            if (listing.is_subscribed) renderDoctorDashboard(listing);
            else openPaymentModal('طبيب', listing.name);
            return;
        }
    }

    openCtrlPanel('لوحة الطبيب', `
        <div class="max-w-sm mx-auto py-8">
            <div class="text-center mb-6">
                <div class="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-3" style="background: #DBEAFE">
                    <i class="fas fa-user-md text-2xl" style="color: var(--doctor)"></i>
                </div>
                <h3 class="font-bold text-lg">دخول الطبيب</h3>
            </div>
            <form onsubmit="handleDoctorLogin(event)" class="flex flex-col gap-4">
                <input type="text" id="docPhone" class="ctrl-input text-center" placeholder="مُعرف الدخول (أو رقم الهاتف)" required>
                <input type="text" id="docPass" class="ctrl-input text-center font-mono" placeholder="كلمة المرور" required>
                <button type="submit" class="w-full py-3 rounded-xl text-white font-bold text-sm" style="background: var(--doctor)">دخول</button>
            </form>
        </div>
    `, '#2563EB');
};

/**
 * معالج تسجيل دخول الطبيب
 */
window.handleDoctorLogin = async (e) => {
    e.preventDefault();

    const loginInput = document.getElementById('docPhone');
    const passInput = document.getElementById('docPass');

    const loginId = loginInput.value.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    const pass = passInput.value.trim();

    if (!loginId || !pass) {
        showToast('يرجى إدخال مُعرف الدخول وكلمة المرور');
        return;
    }

    const dummyEmail = `doc_${loginId}@lomedx.app`;

    const { data, error } = await supabase.auth.signInWithPassword({ email: dummyEmail, password: pass });
    if (error) {
        showToast('بيانات الدخول غير صحيحة. تأكد من مُعرف الدخول وكلمة المرور.', 'error');
        return;
    }

    const { data: docData, error: fetchError } = await supabase.from('listings')
        .select('id, name, specialty, image, is_subscribed, active_system, allowed_systems, working_hours, workingdays, current_queue, avg_wait_time, phone_clicks, view_count')
        .eq('user_id', data.user.id).eq('type', 'doctor').maybeSingle();

    if (docData) {
        if (!docData.is_subscribed) {
            await supabase.auth.signOut();
            showToast('انتهت فترة الاشتراك. يرجى التجديد لمتابعة استخدام اللوحة.');
            openPaymentModal('طبيب', docData.name);
            return;
        }

        if (window.OneSignalDeferred) {
            OneSignalDeferred.push(function (OneSignal) {
                OneSignal.login(data.user.id);
                OneSignal.User.addTag("role", "doctor");
            });
        }
        renderDoctorDashboard(docData);
    } else {
        await supabase.auth.signOut();
        showToast('مُعرف الدخول غير مرتبط بحساب طبيب', 'error');
    }
};

/**
 * معالج تسجيل دخول الصيدلية
 */
window.handlePharmacyLogin = async (e) => {
    e.preventDefault();

    const loginInput = document.getElementById('pharmPhone');
    const passInput = document.getElementById('pharmPass');

    const loginId = loginInput.value.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    const pass = passInput.value.trim();

    if (!loginId || !pass) {
        showToast('يرجى إدخال مُعرف الدخول وكلمة المرور');
        return;
    }

    const dummyEmail = `pharm_${loginId}@lomedx.app`;

    const { data, error } = await supabase.auth.signInWithPassword({ email: dummyEmail, password: pass });
    if (error) {
        showToast('بيانات الدخول غير صحيحة. تأكد من مُعرف الدخول وكلمة المرور.', 'error');
        return;
    }

    const { data: pharmData, error: fetchError } = await supabase.from('listings')
        .select('id, name, image, is_subscribed, isopen, night, phone_clicks, view_count, address')
        .eq('user_id', data.user.id).eq('type', 'pharmacy').maybeSingle();

    if (pharmData) {
        if (!pharmData.is_subscribed) {
            await supabase.auth.signOut();
            showToast('انتهت فترة الاشتراك. يرجى التجديد لمتابعة استخدام اللوحة.');
            openPaymentModal('صيدلية', pharmData.name);
            return;
        }

        if (window.OneSignalDeferred) {
            OneSignalDeferred.push(function (OneSignal) {
                OneSignal.login(data.user.id);
                OneSignal.user.addTag("role", "pharmacy");

                let pharmCity = 'غير محدد';
                if (pharmData.address) {
                    const foundCity = allCities.find(c => c !== 'كل المدن' && pharmData.address.includes(c));
                    if (foundCity) pharmCity = foundCity;
                }
                OneSignal.User.addTag("city", pharmCity);
            });
        }
        renderPharmacyDashboard(pharmData);
    } else {
        await supabase.auth.signOut();
        showToast('مُعرف الدخول غير مرتبط بحساب صيدلية', 'error');
    }
};

/**
 * عرض لوحة تحكم الطبيب
 */
window.renderDoctorDashboard = async (doc) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        openDoctorLogin();
        showToast('يجب تسجيل الدخول أولاً');
        return;
    }

    // عدد الحجوزات
    const { count: totalBookingsCount } = await supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('itemid', doc.id);
    const totalBookings = totalBookingsCount || 0;

    const daysCheckboxes = daysOfWeek.map(day => `
        <label class="flex items-center gap-2 bg-gray-50 p-2 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
            <input type="checkbox" name="docWorkingDays" value="${day}" class="w-4 h-4 accent-blue-600" ${doc.workingdays?.includes(day) ? 'checked' : ''}>
            <span class="text-xs font-semibold">${day}</span>
        </label>
    `).join('');

    openCtrlPanel(`لوحة: ${doc.name}`, `
    <div class="flex flex-col gap-5">
        <!-- 1. بطاقة الملف الشخصي -->
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
                <i class="fas fa-eye text-blue-500 text-xl mb-1"></i>
                <div class="text-2xl font-black text-gray-800" id="docViewCount">${doc.view_count || 0}</div>
                <div class="text-[10px] text-gray-500">زيارة الملف</div>
            </div>
            <div class="bg-white p-4 rounded-xl border text-center shadow-sm" style="border-color: var(--border);">
                <i class="fas fa-calendar-check text-green-500 text-xl mb-1"></i>
                <div class="text-2xl font-black text-gray-800">${totalBookings}</div>
                <div class="text-[10px] text-gray-500">إجمالي الحجوزات</div>
            </div>
            <div class="bg-white p-4 rounded-xl border text-center shadow-sm" style="border-color: var(--border);">
                <i class="fas fa-phone-alt text-purple-500 text-xl mb-1"></i>
                <div class="text-2xl font-black text-gray-800" id="docPhoneClicks">${doc.phone_clicks || 0}</div>
                <div class="text-[10px] text-gray-500">نقرات الهاتف</div>
            </div>
        </div>

        <!-- 3. أدوات سريعة -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button onclick="openDoctorScanner('${doc.id}')" class="w-full py-3 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm hover:shadow-md transition-all" style="background: #0D9488">
                <i class="fas fa-qrcode"></i> قراءة ملف المريض (QR)
            </button>
            <button onclick="openAskDoctor('${escapeHtml(doc.name)}')" class="w-full py-3 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm hover:shadow-md transition-all" style="background: #2563EB;">
                <i class="fas fa-comments"></i> قسم اسأل طبيب
            </button>
        </div>

        <!-- 4. إدارة ازدحام العيادة -->
        <div class="bg-white p-5 rounded-2xl border shadow-sm" style="border-color: var(--border);">
            <div class="flex justify-between items-center mb-4">
                <h4 class="font-bold text-sm flex items-center gap-2"><i class="fas fa-users" style="color: var(--doctor)"></i> إدارة ازدحام العيادة</h4>
                <div class="flex gap-1 bg-gray-100 p-1 rounded-lg">
                    <button onclick="toggleQueueStatus('${doc.id}', true)" class="px-3 py-1.5 rounded-md text-xs font-bold transition-all ${(doc.current_queue !== -1) ? 'bg-green-500 text-white shadow' : 'text-gray-500 hover:bg-gray-50'}">مفعل</button>
                    <button onclick="toggleQueueStatus('${doc.id}', false)" class="px-3 py-1.5 rounded-md text-xs font-bold transition-all ${(doc.current_queue === -1) ? 'bg-gray-500 text-white shadow' : 'text-gray-500 hover:bg-gray-50'}">معطل</button>
                </div>
            </div>
            ${(doc.current_queue === -1)
            ? `<div class="text-center py-4 text-gray-400 text-sm">تم تعطيل نظام الازدحام. لن يظهر المؤشر للمرضى.</div>`
            : `
                <div class="flex items-center justify-between bg-gray-50 p-3 rounded-xl">
                    <button onclick="updateQueue('${doc.id}', -1)" class="w-12 h-12 rounded-full bg-red-100 text-red-600 font-bold text-2xl hover:bg-red-200 transition-all flex items-center justify-center">-</button>
                    <div class="text-center">
                        <div class="text-4xl font-black text-gray-800" id="docQueueCount">${doc.current_queue || 0}</div>
                        <div class="text-xs text-gray-500">منتظر حالياً</div>
                    </div>
                    <button onclick="updateQueue('${doc.id}', 1)" class="w-12 h-12 rounded-full bg-green-100 text-green-600 font-bold text-2xl hover:bg-green-200 transition-all flex items-center justify-center">+</button>
                </div>
                <p class="text-xs text-gray-400 mt-2 text-center">اضغط (+) عند دخول مريض جديد للصالة، و(-) عند خروج مريض للكشف.</p>
            `}
        </div>

        <!-- 5. إعدادات الحجز وأيام العمل -->
        <div class="bg-white p-5 rounded-2xl border shadow-sm" style="border-color: var(--border)">
            <h4 class="font-bold mb-4 text-sm flex items-center gap-2"><i class="fas fa-calendar-week" style="color: var(--doctor)"></i> أيام العمل ونظام الحجز</h4>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">${daysCheckboxes}</div>

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

        <!-- 6. طلبات الحجز الواردة -->
        <div class="bg-white p-5 rounded-2xl border shadow-sm" style="border-color: var(--border)">
            <div class="flex justify-between items-center mb-4">
                <h4 class="font-bold text-sm flex items-center gap-2"><i class="fas fa-calendar-check" style="color: var(--doctor)"></i> طلبات الحجز الواردة</h4>
                <button onclick="viewArchivedBookings('${doc.id}')" class="text-xs text-gray-500 hover:text-gray-800 flex items-center gap-1 border px-2 py-1 rounded-lg">
                    <i class="fas fa-archive"></i> عرض المؤرشفة
                </button>
            </div>
            <div id="docBookingsContainer" class="flex flex-col gap-3">
                <p class="text-sm text-center py-4 text-gray-400">جاري تحميل الحجوزات...</p>
            </div>
        </div>

        <!-- 7. تسجيل الخروج -->
        <button onclick="logoutHealthFile()" class="w-full py-3 rounded-xl border font-bold text-sm mt-2 hover:bg-red-50 transition-colors" style="border-color: #EF4444; color: #EF4444;">
            <i class="fas fa-sign-out-alt ml-2"></i> تسجيل الخروج
        </button>
    </div>
    `, '#2563EB', true);

    if (unsubscribeDocBookings) supabase.removeChannel(unsubscribeDocBookings);

    fetchDocBookings(doc.id);

    unsubscribeDocBookings = supabase
        .channel('doctor_bookings_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings', filter: `itemid=eq.${doc.id}` }, payload => {
            fetchDocBookings(doc.id);
        })
        .subscribe();
};

/**
 * جلب حجوزات الطبيب
 */
async function fetchDocBookings(docId) {
    const container = document.getElementById('docBookingsContainer');
    if (!container) return;

    const activeElement = document.activeElement;
    if (activeElement && activeElement.id && activeElement.id.startsWith('docChat_')) return;

    const { data: docBookings, error } = await supabase.from('bookings')
        .select('id, itemid, itemname, name, phone, daystr, slot_time, time, status, ref, chat, patient_push_id, created_at')
        .eq('itemid', docId).neq('status', 'archived').order('created_at', { ascending: false });

    if (error || !docBookings) {
        container.innerHTML = '<p class="text-sm text-center py-4 text-red-500">خطأ في تحميل الحجوزات.</p>';
        return;
    }
    if (docBookings.length === 0) {
        container.innerHTML = '<p class="text-sm text-center py-4" style="color: var(--muted)">لا توجد طلبات حجز حالياً.</p>';
        return;
    }

    bookings = docBookings;

    const bookingsListHtml = docBookings.map(b => {
        let statusBadge = '';
        let actionButtons = '';

        if (b.status === 'accepted') {
            statusBadge = `<span class="text-xs px-2 py-1 rounded block mb-1" style="background: #D1FAE5; color: #065F46">مقبول - ${escapeHtml(b.time)}</span>`;
            actionButtons = `<button data-action="cancel" data-id="${b.id}" class="text-xs text-white px-2 py-1 rounded bg-red-500">إلغاء</button><button data-action="archive" data-id="${b.id}" class="text-xs text-white px-2 py-1 rounded bg-gray-800">أرشفة</button>`;
        } else if (b.status === 'canceled') {
            statusBadge = '<span class="text-xs px-2 py-1 rounded block mb-1" style="background: #F3F4F6; color: #4B5563">ملغي</span>';
            actionButtons = `<button data-action="restore" data-id="${b.id}" class="text-xs text-white px-2 py-1 rounded bg-gray-500">استعادة</button><button data-action="archive" data-id="${b.id}" class="text-xs text-white px-2 py-1 rounded bg-gray-800">أرشفة</button>`;
        } else {
            statusBadge = '<span class="text-xs px-2 py-1 rounded block mb-1" style="background: #FEF3C7; color: #92400E">طلب جديد</span>';

            let timeHtml = '';
            if (b.slot_time && b.slot_time !== "بانتظار التحديد") {
                timeHtml = `<div class="text-xs font-bold text-blue-600 mb-1 bg-blue-50 p-1 rounded text-center">الوقت المحدد: ${escapeHtml(b.slot_time)}</div>`;
            } else {
                timeHtml = `<input type="time" id="time_${b.id}" placeholder="حدد الموعد" class="ctrl-input text-sm py-1 mb-1">`;
            }

            actionButtons = `<div class="flex flex-col gap-1 w-full">
                ${timeHtml}
                <div class="flex gap-1">
                    <button data-action="accept" data-id="${b.id}" class="text-xs text-white px-2 py-1 rounded bg-green-600 flex-1">قبول</button>
                    <button data-action="cancel" data-id="${b.id}" class="text-xs text-white px-2 py-1 rounded bg-red-500 flex-1">رفض</button>
                </div>
            </div>`;
        }

        let chatHtml = '';
        if (b.chat && b.chat.length > 0) {
            chatHtml = b.chat.map(msg => `<div class="text-xs p-2 rounded-lg mb-1 ${msg.sender === 'doctor' ? 'bg-blue-100 text-left' : 'bg-gray-100 text-right'}">${escapeHtml(msg.text)}</div>`).join('');
        }

        return `
            <div class="flex flex-col p-3 rounded-lg border mb-3" style="border-color: var(--border)">
                <div class="flex items-center justify-between mb-2">
                    <div>
                        <span class="text-sm font-bold">${escapeHtml(b.name)}</span><br>
                        <span class="text-xs" style="color: var(--muted)">${escapeHtml(b.daystr)}</span>
                    </div>
                    <div>
                        ${statusBadge}
                        <span class="text-[10px] text-gray-400">مرجع: #${escapeHtml(b.ref)}</span>
                    </div>
                </div>
                <div class="flex items-center justify-between border-t pt-2 mb-2" style="border-color: var(--border)">
                    <a href="tel:${escapeHtml(b.phone)}" class="text-xs text-blue-600">${escapeHtml(b.phone)}</a>
                    <div class="flex gap-1">${actionButtons}</div>
                </div>
                <div class="border-t pt-2" style="border-color: var(--border)">
                    <div class="text-xs font-bold text-gray-600 mb-1">المحادثة:</div>
                    <div class="max-h-32 overflow-y-auto mb-2 bg-gray-50 p-2 rounded-lg">${chatHtml || '<span class="text-xs text-gray-400">لا توجد رسائل</span>'}</div>
                    <div class="flex gap-1">
                        ${b.status === 'accepted'
                ? `<input type="text" id="docChat_${b.id}" placeholder="اكتب ردك..." class="ctrl-input text-sm py-1 flex-1"><button onclick="sendDocMessage('${b.id}')" class="text-xs text-white px-3 py-1 rounded bg-blue-500"><i class="fas fa-paper-plane"></i></button>`
                : `<input type="text" class="ctrl-input text-sm py-1 flex-1" placeholder="الدردشة متاحة بعد تأكيد الموعد" disabled style="cursor: not-allowed; opacity: 0.5;"><button disabled class="text-xs text-white px-3 py-1 rounded bg-blue-300 cursor-not-allowed"><i class="fas fa-paper-plane"></i></button>`
            }
                    </div>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = bookingsListHtml;

    // Event delegation
    if (!container.dataset.delegated) {
        container.addEventListener('click', (e) => {
            const btn = e.target.closest('button[data-action]');
            if (!btn) return;

            const action = btn.dataset.action;
            const id = btn.dataset.id;

            if (action === 'accept') acceptBooking(id);
            else if (action === 'cancel') updateBookingStatus(id, 'canceled');
            else if (action === 'restore') updateBookingStatus(id, 'pending');
            else if (action === 'archive') updateBookingStatus(id, 'archived');
        });
        container.dataset.delegated = 'true';
    }
}

/**
 * عرض الحجوزات المؤرشفة
 */
window.viewArchivedBookings = async (docId) => {
    const { data: archivedBookings, error } = await supabase.from('bookings')
        .select('id, name, daystr, time')
        .eq('itemid', docId).eq('status', 'archived').order('created_at', { ascending: false });

    if (error) {
        showToast('خطأ في جلب المؤرشفة', 'error');
        return;
    }

    let html = '';
    if (archivedBookings && archivedBookings.length > 0) {
        html = archivedBookings.map(b => `
            <div class="border rounded-lg p-3 mb-3 opacity-70" style="border-color: var(--border)">
                <div class="flex justify-between items-center mb-2">
                    <div>
                        <span class="text-sm font-bold">${escapeHtml(b.name)}</span><br>
                        <span class="text-xs text-gray-500">${escapeHtml(b.daystr)} ${b.time ? 'عند الساعة ' + escapeHtml(b.time) : ''}</span>
                    </div>
                    <span class="text-xs px-2 py-1 rounded bg-gray-200 text-gray-600">مؤرشف</span>
                </div>
                <div class="flex justify-end gap-1 mt-2 border-t pt-2" style="border-color: var(--border)">
                    <button onclick="updateBookingStatus('${b.id}', 'pending'); closeModal();" class="text-xs text-white px-2 py-1 rounded bg-blue-500">استعادة كطلب جديد</button>
                </div>
            </div>
        `).join('');
    } else {
        html = '<p class="text-sm text-center py-10 text-gray-400">لا توجد حجوزات مؤرشفة حالياً.</p>';
    }

    document.getElementById('modalContent').innerHTML = `
        <div class="p-6">
            <div class="flex justify-between items-center mb-6 pb-4 border-b" style="border-color: var(--border);">
                <h3 class="font-bold text-lg flex items-center gap-2"><i class="fas fa-archive"></i> الحجوزات المؤرشفة</h3>
                <button onclick="closeModal()" class="text-2xl hover:text-gray-400 leading-none">&times;</button>
            </div>
            <div>${html}</div>
        </div>
    `;
    document.getElementById('modalOverlay').classList.add('active');
    lockScroll();
};

/**
 * قبول الحجز
 */
window.acceptBooking = async (bookingId) => {
    if (!window.checkOnlineStatus()) return;

    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) {
        showToast('لم يتم العثور على بيانات الحجز', 'error');
        return;
    }

    let time = '';
    if (booking.slot_time && booking.slot_time !== "بانتظار التحديد") {
        time = booking.slot_time;
    } else {
        const timeInput = document.getElementById(`time_${bookingId}`);
        if (!timeInput) {
            showToast('تعذر العثور على حقل الوقت، يرجى المحاولة مجدداً.', 'error');
            return;
        }
        time = timeInput.value.trim();
    }

    if (!time) {
        showToast('أدخل وقت الموعد أولاً', 'error');
        return;
    }

    try {
        const { error: updateError } = await supabase.from('bookings')
            .update({ status: 'accepted', time: time })
            .eq('id', bookingId);

        if (updateError) throw updateError;

        await supabase.rpc('append_chat_message', {
            p_booking_id: bookingId,
            p_sender: 'doctor',
            p_text: `تم تثبيت موعدك اليوم الساعة ${time}. نرحب بك في العيادة.`
        });

        booking.status = 'accepted';
        booking.time = time;

        if (booking.patient_push_id) {
            sendPushNotification(null, "تم تأكيد موعدك ✅", `تم تأكيد موعدك مع ${booking.itemname} الساعة ${time}`, 'player', booking.patient_push_id);
        }

        showToast('تم قبول الموعد بنجاح', 'success');
        fetchDocBookings(booking.itemid);

    } catch (e) {
        showToast('حدث خطأ أثناء قبول الموعد', 'error');
    }
};

/**
 * تحديث حالة الحجز
 */
window.updateBookingStatus = async (bookingId, newStatus) => {
    if (!window.checkOnlineStatus()) return;
    try {
        if (newStatus === 'archived') {
            await supabase.from('bookings').update({ status: 'archived' }).eq('id', bookingId);
            showToast('تمت أرشفة الطلب بنجاح', 'success');
        } else {
            await supabase.from('bookings').update({ status: newStatus }).eq('id', bookingId);
            showToast('تم التحديث', 'success');
        }

        const booking = bookings.find(b => b.id === bookingId);
        if (booking) {
            const docId = booking.itemid;
            fetchDocBookings(docId);
        }
    } catch (e) {
        showToast('حدث خطأ', 'error');
    }
};

/**
 * حفظ إعدادات الطبيب (أيام العمل)
 */
window.saveDoctorSettings = async (id) => {
    if (!window.checkOnlineStatus()) return;
    const workingDays = Array.from(document.querySelectorAll('input[name="docWorkingDays"]:checked')).map(cb => cb.value);
    try {
        await supabase.from('listings').update({ workingdays: workingDays }).eq('id', id);
        showToast('تم الحفظ!', 'success');
        localStorage.setItem('force_listings_update', 'true');
    } catch (e) {
        showToast('خطأ', 'error');
    }
};

/**
 * تعيين النظام النشط للحجز
 */
window.setActiveSystem = async (id, system) => {
    if (!window.checkOnlineStatus()) return;
    try {
        await supabase.from('listings').update({ active_system: system }).eq('id', id);
        showToast('تم تفعيل النظام المختار', 'success');
        localStorage.setItem('force_listings_update', 'true');

        const { data: updatedDoc } = await supabase.from('listings').select('*').eq('id', id).single();
        if (updatedDoc) renderDoctorDashboard(updatedDoc);
    } catch (e) {
        showToast('خطأ في التحديث', 'error');
    }
};

/**
 * حفظ أوقات العمل
 */
window.saveWorkingHours = async (id) => {
    if (!window.checkOnlineStatus()) return;
    const start = document.getElementById('docStartTime').value;
    const end = document.getElementById('docEndTime').value;
    if (!start || !end) {
        showToast('يرجى إدخال وقت البداية والنهاية');
        return;
    }
    try {
        await supabase.from('listings').update({ working_hours: { start, end } }).eq('id', id);
        showToast('تم حفظ أوقات العمل بنجاح!', 'success');
        localStorage.setItem('force_listings_update', 'true');
    } catch (e) {
        showToast('خطأ في الحفظ', 'error');
    }
};

/**
 * إرسال رسالة من الطبيب
 */
window.sendDocMessage = async (bookingId) => {
    if (!window.checkOnlineStatus()) return;

    const booking = bookings.find(b => b.id === bookingId);
    if (!booking || booking.status !== 'accepted') {
        showToast('لا يمكن الرد على موعد لم يتم تأكيده بعد', 'error');
        return;
    }

    const input = document.getElementById(`docChat_${bookingId}`);
    const text = input.value.trim();
    if (!text) return;
    input.value = '';

    try {
        const { error } = await supabase.rpc('append_chat_message', {
            p_booking_id: bookingId,
            p_sender: 'doctor',
            p_text: text
        });
        if (error) throw error;

        if (booking.patient_push_id) {
            sendPushNotification(null, "رد من الطبيب 💬", `لديك رسالة جديدة من ${booking.itemname}: ${text.substring(0, 30)}`, 'player', booking.patient_push_id);
        }
    } catch (e) {
        showToast('خطأ في الإرسال', 'error');
    }
};

/**
 * فتح قارئ QR للملف الصحي
 */
window.openDoctorScanner = async (docId) => {
    const docData = allData.find(d => d.id === docId) || {};
    openCtrlPanel('قارئ الملفات الصحية للمريض', `
        <div class="flex flex-col gap-4">
            <div class="bg-blue-50 border border-blue-200 rounded-xl p-4 text-blue-800 text-sm flex items-center gap-3">
                <i class="fas fa-camera text-xl"></i>
                <span>جه كاميرا الهاتف نحو رمز QR الخاص بالمريض.</span>
            </div>
            <div id="qr-reader" style="width:100%"></div>
        </div>
    `, '#2563EB');

    try {
        await loadDynamicScript('https://unpkg.com/html5-qrcode', 'Html5Qrcode');

        activeQrScanner = new Html5Qrcode("qr-reader");
        activeQrScanner.start(
            { facingMode: "environment" },
            { fps: 10, qrbox: { width: 250, height: 250 } },
            (decodedText) => {
                activeQrScanner.stop().then(() => {
                    activeQrScanner = null;
                    fetchPatientHealthFile(decodedText, docData);
                }).catch(() => { /* ignore */ });
            },
            (errorMessage) => { /* ignore */ }
        ).catch(err => {
            showToast("تعذر الوصول للكاميرا.", 'error');
        });
    } catch (err) {
        showToast("تعذر تحميل قارئ QR، تحقق من الإنترنت.", 'error');
    }
};

/**
 * جلب ملف صحي للمريض (بعد مسح QR)
 */
window.fetchPatientHealthFile = async (userId, doctorData) => {
    try {
        const { data: p, error } = await supabase.functions.invoke('get-patient-file', {
            body: { qr_token: userId }
        });

        const decryptedP = p;

        if (error || !decryptedP) {
            showToast("لم يتم العثور على ملف بهذا الرمز.", 'error');
            return;
        }
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

        window.tempPatientContext = {
            userId: userId,
            patientName: decryptedP.full_name,
            doctorInfo: docInfo
        };

        const hasAddedRx = window.tempPatientContext?.hasAddedPrescription === true;

        let prescriptionBtn = '';
        if (doctorData?.is_subscribed && !hasAddedRx) {
            prescriptionBtn = `<button onclick="openPrescriptionModal()" class="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg"><i class="fas fa-file-prescription"></i> إنشاء روشتة</button>`;
        } else if (doctorData?.is_subscribed && hasAddedRx) {
            prescriptionBtn = `<button onclick="showToast('تمت إضافة روشتة لهذا المريض. يرجى مسح رمز QR مرة أخرى لإضافة روشتة جديدة.', 'info')" class="text-xs bg-gray-400 text-white px-3 py-1.5 rounded-lg cursor-pointer"><i class="fas fa-lock"></i> إنشاء روشتة</button>`;
        } else {
            prescriptionBtn = `<button onclick="openPaymentModal('طبيب', '${escapeHtml(doctorData?.name || 'طبيب')}')" class="text-xs bg-gray-300 text-gray-600 px-3 py-1.5 rounded-lg line-through cursor-not-allowed"><i class="fas fa-lock"></i> إنشاء روشتة</button>`;
        }

        document.getElementById('modalContent').innerHTML = `
            <div class="p-6">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="font-bold text-lg"><i class="fas fa-file-medical ml-2" style="color: var(--doctor)"></i> الملف الصحي للمريض</h3>
                    <button onclick="closeModal()" class="text-2xl">&times;</button>
                    ${prescriptionBtn}
                </div>
                <div class="flex flex-col gap-3">
                    <div class="flex items-center gap-4 p-3 rounded-xl" style="background: #DBEAFE">
                        <i class="fas fa-user-circle text-3xl" style="color: var(--doctor)"></i>
                        <div>
                            <h4 class="font-bold text-lg">${escapeHtml(decryptedP.full_name)}</h4>
                            <p class="text-sm text-gray-600">${escapeHtml(decryptedP.age || '-')} سنة | ${escapeHtml(decryptedP.gender || '-')}</p>
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-3 text-sm">
                        <div class="p-3 rounded-xl border"><div class="text-xs text-gray-500">فصيلة الدم</div><div class="font-bold text-red-600">${escapeHtml(decryptedP.blood_type || 'غير محدد')}</div></div>
                        <div class="p-3 rounded-xl border"><div class="text-xs text-gray-500">الوزن</div><div class="font-bold">${escapeHtml(decryptedP.weight || '-')} كغ</div></div>
                    </div>
                    <div class="p-3 rounded-xl border"><div class="text-xs text-gray-500 mb-1">الأمراض المزمنة</div><div class="font-semibold">${escapeHtml(decryptedP.diseases || 'لا يوجد')}</div></div>
                    <div class="p-3 rounded-xl border"><div class="text-xs text-gray-500 mb-1">الحساسية</div><div class="font-semibold text-red-600">${escapeHtml(decryptedP.allergies || 'لا يوجد')}</div></div>
                    <div class="p-3 rounded-xl border"><div class="text-xs text-gray-500 mb-1">الأدوية الحالية</div><div class="font-semibold">${escapeHtml(decryptedP.medications || 'لا يوجد')}</div></div>
                    ${specializedRecordHtml}
                    <div class="p-3 rounded-xl bg-green-50 border border-green-200">
                        <div class="text-xs text-green-700 mb-1">جهة طوارئ</div>
                        <div class="font-semibold">${escapeHtml(decryptedP.emergency_name || '')} - <span dir="ltr">${escapeHtml(decryptedP.emergency_phone || '')}</span></div>
                    </div>
                </div>
            </div>
        `;
        document.getElementById('modalOverlay').classList.add('active');
        lockScroll();
    } catch (e) {
        showToast("خطأ في قراءة الملف.", 'error');
    }
};

/**
 * فتح نموذج كتابة روشتة
 */
window.openPrescriptionModal = () => {
    const { userId, patientName, doctorInfo } = window.tempPatientContext;
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
            <form onsubmit="generatePrescription(event, '${userId}', '${escapeHtml(patientName)}')">
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
        </div>
    `;
    document.getElementById('modalOverlay').classList.add('active');
    lockScroll();
};

/**
 * توليد وحفظ الروشتة
 */
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

    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ والتشفير...';
    }

    try {
        const { error: funcError } = await supabase.functions.invoke('save-prescription', {
            body: { patient_id: patientId, text: rxText, date: date.toISOString() }
        });

        if (funcError) {
            let errMsg = funcError.message;
            if (funcError.context && funcError.context.error) errMsg = funcError.context.error;
            throw new Error(errMsg);
        }

        showToast('تم حفظ الروشتة وتشفيرها في ملف المريض بنجاح!', 'success');
        closeModal();
        window.tempPatientContext.hasAddedPrescription = true;
        fetchPatientHealthFile(patientId, { specialty: 'general' });
    } catch (err) {
        showToast('خطأ في حفظ الروشتة: ' + err.message, 'error');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-save"></i> حفظ الروشتة في ملف المريض';
        }
    }
};

/**
 * إضافة صف دواء آخر في الروشتة
 */
window.addPrescriptionRow = () => {
    const container = document.getElementById('medListContainer');
    const newRow = document.createElement('div');
    newRow.className = 'bg-gray-50 p-3 rounded-xl border relative';
    newRow.innerHTML = `
        <button type="button" onclick="this.parentElement.remove()" class="absolute top-2 left-2 text-red-500"><i class="fas fa-times-circle"></i></button>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input type="text" required class="ctrl-input text-sm" placeholder="اسم الدواء" name="drugName[]">
            <input type="text" required class="ctrl-input text-sm" placeholder="الجرعة" name="dose[]">
            <input type="text" required class="ctrl-input text-sm" placeholder="التكرار" name="freq[]">
        </div>
    `;
    container.appendChild(newRow);
};

/**
 * حذف روشتة
 */
window.deletePrescription = async (rxDate) => {
    if (!window.checkOnlineStatus()) return;
    if (!confirm("هل أنت متأكد من حذف هذه الروشتة؟")) return;
    try {
        const { error: funcError } = await supabase.functions.invoke('manage-health-file', {
            body: { action: 'delete_prescription', date: rxDate }
        });
        if (funcError) throw funcError;

        showToast('تم حذف الروشتة بنجاح', 'success');

        const { data: updatedFile } = await supabase.functions.invoke('manage-health-file', { body: { action: 'get' } });
        if (updatedFile) renderHealthDashboard(updatedFile);
    } catch (err) {
        showToast('حدث خطأ أثناء الحذف: ' + err.message, 'error');
    }
};

/* ═══════════════════════════════════════════════════════════════════
   ═══════════════ 15. MEDICINE DONATION & BLOOD BANK ═══════════════
   ═══════════════════════════════════════════════════════════════════ */

/**
 * فتح نافذة المستلزمات الطبية
 */
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
                    <input type="text" id="medDonationExpiry" class="ctrl-input text-sm" placeholder="حالة الجهاز أو المدة المطلوبة" required>
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
            ${generateToolSEOHtml('medicine-donation')}
        </div>
    `, '#0D9488');
    renderMedicineDonationsUI();
};

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

/**
 * إرسال إعلان مستلزمات طبية
 */
window.submitMedicineDonation = async (e) => {
    e.preventDefault();
    if (!window.checkOnlineStatus()) return;

    const btn = document.getElementById('medDonationSubmitBtn');
    if (!btn) return;

    const lastDonation = localStorage.getItem('last_donation_time');
    if (lastDonation && (Date.now() - parseInt(lastDonation)) < 3600000) {
        const minsLeft = Math.ceil((3600000 - (Date.now() - parseInt(lastDonation))) / 60000);
        showToast(`يرجى الانتظار ${minsLeft} دقيقة قبل نشر إعلان جديد.`, 'error');
        return;
    }

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
            showToast('رقم الهاتف غير صحيح', 'error');
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-bullhorn ml-2"></i>نشر الإعلان للمجتمع';
            return;
        }
        phoneInput.classList.remove('input-invalid');

        const { data: funcData, error: funcError } = await supabase.functions.invoke('manage-public-requests', {
            body: {
                action: 'submit_request',
                type: 'donation',
                patient_phone: phone,
                payload: {
                    donor_name: name,
                    medicine_name: medName,
                    medicine_type: medType,
                    expiry_date: expiryDate,
                    quantity: quantity,
                    notes: notes
                }
            }
        });

        if (funcError) {
            let errMsg = funcError.message;
            if (funcError.context && typeof funcError.context.json === 'function') {
                try {
                    const errBody = await funcError.context.json();
                    if (errBody.error) errMsg = errBody.error;
                } catch (e) { /* ignore */ }
            } else if (funcError.context && funcError.context.error) {
                errMsg = funcError.context.error;
            }
            throw new Error(errMsg);
        }
        if (funcData && funcData.error) throw new Error(funcData.error);

        localStorage.setItem('last_donation_time', Date.now().toString());

        await sendPushNotification(null, "جهاز طبي متاح 🩺", `تم إضافة جهاز: ${medName}`, 'all');
        showToast('تم نشر إعلانك بنجاح !', 'success');
        document.querySelector('#ctrlContent form').reset();
        await fetchMedicineDonations();
        renderMedicineDonationsUI();
    } catch (err) {
        showToast('حدث خطأ: ' + err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-bullhorn ml-2"></i> نشر الإعلان للمجتمع';
    }
};

/**
 * إزالة مستلزمات طبية
 */
window.resolveMedicineDonation = async (id) => {
    if (!window.checkOnlineStatus()) return;
    try {
        await supabase.from('medicine_donations').update({ status: 'resolved' }).eq('id', id);
        showToast('تمت الإزالة.', 'success');
        await fetchMedicineDonations();
        renderAdminDashboard();
    } catch (err) {
        showToast('حدث خطأ', 'error');
    }
};

/**
 * فتح بنك الدم
 */
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
            ${generateToolSEOHtml('blood-bank')}
        </div>
    `, '#DC2626');
    renderBloodBankUI();
};

function renderBloodBankUI() {
    const list = document.getElementById('bloodRequestsList');
    if (!list) return;
    if (bloodRequests.length === 0) {
        list.innerHTML = '<p class="text-center py-8 text-gray-400 text-sm">لا توجد استغاثات دم حالياً. شكراً لك.</p>';
        return;
    }

    list.innerHTML = bloodRequests.map(req => `
        <div class="border rounded-xl p-4 flex flex-col sm:flex-row items-center gap-4" style="border-color: var(--border)">
            <div class="blood-type-badge">${escapeHtml(req.blood_type)}</div>
            <div class="flex-1 text-center sm:text-right">
                <div class="font-bold text-gray-800">
                    ${escapeHtml(req.patient_name)}
                    ${req.responses_count > 0 ? `<span class="text-xs text-green-500 font-bold mr-2">(مستجيب: ${escapeHtml(req.responses_count)})</span>` : ''}
                </div>
                <div class="text-xs text-gray-500 mt-1">
                    <i class="fas fa-hospital ml-1"></i> ${escapeHtml(req.hospital)}
                    ${req.notes ? `| <i class="fas fa-notes-medical ml-1"></i> ${escapeHtml(req.notes)}` : ''}
                </div>
            </div>
            <div class="flex gap-2 w-full sm:w-auto">
                <a href="tel:${escapeHtml(req.phone)}" class="flex-1 sm:flex-none bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 hover:bg-blue-600 transition-colors">
                    <i class="fas fa-phone"></i> اتصال
                </a>
                <button onclick="respondToBloodRequest(this, '${req.id}', '${escapeHtml(req.patient_name)}', '${escapeHtml(req.phone)}')" class="flex-1 sm:flex-none bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 hover:bg-red-600 transition-colors">
                    <i class="fas fa-hand-holding-heart"></i> سأتبرع
                </button>
            </div>
        </div>
    `).join('');
}

/**
 * نشر استغاثة دم
 */
window.submitBloodRequest = async (e) => {
    e.preventDefault();
    if (!window.checkOnlineStatus()) return;

    const submitBtn = e.target.querySelector('button[type="submit"]');

    const lastBloodRequest = localStorage.getItem('last_blood_request_time');
    if (lastBloodRequest && (Date.now() - parseInt(lastBloodRequest)) < 3600000) {
        const minsLeft = Math.ceil((3600000 - (Date.now() - parseInt(lastBloodRequest))) / 60000);
        showToast(`لقد أرسلت استغاثة مؤخراً. يرجى الانتظار ${minsLeft} دقيقة.`, 'error');
        return;
    }

    submitBtn.disabled = true;
    submitBtn.innerText = 'جاري النشر...';

    const name = document.getElementById('bloodPatient').value.trim();
    const bloodType = document.getElementById('bloodType').value;
    const hospital = document.getElementById('bloodHospital').value.trim();
    const phoneInput = document.getElementById('bloodPhone');
    const phone = phoneInput.value.trim();
    const notes = document.getElementById('bloodNotes').value.trim();

    if (containsBadWords(name) || containsBadWords(hospital) || containsBadWords(notes)) {
        showToast('تم رفض الاستغاثة لاحتوائها على كلمات غير لائقة.', 'error');
        submitBtn.disabled = false;
        submitBtn.innerText = 'نشر الاستغاثة';
        return;
    }

    if (!/^09\d{8}$/.test(phone)) {
        phoneInput.classList.add('input-invalid');
        showToast('رقم الهاتف غير صحيح', 'error');
        submitBtn.disabled = false;
        submitBtn.innerText = 'نشر الاستغاثة';
        return;
    }
    phoneInput.classList.remove('input-invalid');

    try {
        const { data: funcData, error: funcError } = await supabase.functions.invoke('manage-public-requests', {
            body: {
                action: 'submit_request',
                type: 'blood',
                patient_phone: phone,
                payload: {
                    patient_name: name,
                    blood_type: bloodType,
                    hospital: hospital,
                    notes: notes
                }
            }
        });

        if (funcError) {
            let errMsg = funcError.message;
            if (funcError.context && typeof funcError.context.json === 'function') {
                try {
                    const errBody = await funcError.context.json();
                    if (errBody.error) errMsg = errBody.error;
                } catch (e) { /* ignore */ }
            } else if (funcError.context && funcError.context.error) {
                errMsg = funcError.context.error;
            }
            throw new Error(errMsg);
        }
        if (funcData && funcData.error) throw new Error(funcData.error);

        await sendPushNotification(null, "استغاثة دم طارئة 🩸", `المريض ${name} يحتاج فصيلة ${bloodType} في ${hospital}`, 'all');
        localStorage.setItem('last_blood_request_time', Date.now().toString());
        showToast('تم نشر استغاثتك بنجاح!', 'success');
        e.target.reset();
    } catch (err) {
        showToast('حدث خطأ اثناء النشر: ' + err.message, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = 'نشر الاستغاثة';
    }
};

/**
 * إغلاق استغاثة دم
 */
window.resolveBloodRequest = async (id) => {
    if (!window.checkOnlineStatus()) return;
    try {
        await supabase.from('blood_requests').update({ status: 'resolved' }).eq('id', id);
        showToast('تم إنهاء الطلب.', 'success');
        await fetchBloodRequests();
        renderAdminDashboard();
    } catch (err) {
        showToast('حدث خطأ', 'error');
    }
};

/**
 * الاستجابة لاستغاثة دم
 */
window.respondToBloodRequest = (btnElement, reqId, patientName, phone) => {
    btnElement.disabled = true;
    btnElement.innerText = 'جاري التسجيل...';
    btnElement.classList.add('opacity-50', 'cursor-not-allowed');
    window.activeDonateBtn = btnElement;

    const toast = document.getElementById('toast');
    toast.innerHTML = `
        <div class="flex flex-col items-center gap-3">
            <div class="text-sm">سيتم تسجيل استجابتك خلال 6 ثوانٍ...</div>
            <button onclick="undoRespond()" style="background:#ef4444; color:white; padding:6px 16px; border-radius:8px; font-size:12px; border:none; cursor:pointer; font-weight:bold;">تراجع الآن</button>
        </div>
    `;
    toast.classList.add('show');

    window.bloodUndoTimeout = setTimeout(async () => {
        toast.classList.remove('show');
        try {
            const { error } = await supabase.rpc('increment_blood_response', { p_req_id: reqId });
            if (error) throw error;

            const req = bloodRequests.find(r => r.id === reqId);
            if (req) req.responses_count = (req.responses_count || 0) + 1;

            renderBloodBankUI();

            toast.innerHTML = `
                <div class="flex flex-col items-center gap-3">
                    <div class="text-sm font-bold">بارك الله فيك! 🌹<br>تم تسجيل استجابتك.</div>
                    <a href="tel:${escapeHtml(phone)}" onclick="hideToast()" style="background:#2563EB; color:white; padding:8px 20px; border-radius:8px; font-size:14px; text-decoration:none; font-weight:bold; display:flex; align-items:center; gap:8px;">
                        <i class="fas fa-phone-volume"></i> اتصال بالمريض
                    </a>
                </div>
            `;
            toast.classList.add('show');
            setTimeout(() => { toast.classList.remove('show'); }, 10000);
        } catch (err) {
            showToast('حدث خطأ أثناء التسجيل: ' + err.message, 'error');
            btnElement.disabled = false;
            btnElement.innerText = 'سأتبرع';
            btnElement.classList.remove('opacity-50', 'cursor-not-allowed');
        }
    }, 6000);
};

/**
 * التراجع عن الاستجابة
 */
window.undoRespond = () => {
    if (window.bloodUndoTimeout) clearTimeout(window.bloodUndoTimeout);
    const toast = document.getElementById('toast');
    toast.classList.remove('show');

    if (window.activeDonateBtn) {
        window.activeDonateBtn.disabled = false;
        window.activeDonateBtn.innerText = 'سأتبرع';
        window.activeDonateBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        window.activeDonateBtn = null;
    }

    setTimeout(() => showToast('تم التراجع بنجاح.', 'info'), 300);
};

/**
 * تعيين حالة المنشأة (مفتوح / مغلق / لا شيء)
 */
window.setStatus = async (id, status) => {
    if (!window.checkOnlineStatus()) return;
    try {
        await supabase.from('listings').update({ isopen: status }).eq('id', id);
        localStorage.setItem('force_listings_update', 'true');

        let msg = status === true ? 'تم تغيير الحالة إلى: مفتوح' :
                  status === false ? 'تم تغيير الحالة إلى: مغلق' :
                  'تم تعيين الحالة إلى: لا شيء';
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
};

/**
 * تحديث عداد الازدحام
 */
window.updateQueue = async (docId, change) => {
    try {
        const doc = allData.find(d => d.id === docId);
        if (!doc || doc.current_queue === -1) return;

        const { error } = await supabase.rpc('update_doctor_queue', {
            doc_id: docId,
            change_amount: change
        });

        if (error) throw error;

        doc.current_queue = Math.max(0, (doc.current_queue || 0) + change);

        const countElement = document.getElementById('docQueueCount');
        if (countElement) countElement.innerText = doc.current_queue;

        showToast('تم تحديث حالة الازدحام', 'success');
    } catch (err) {
        showToast('خطأ في التحديث', 'error');
    }
};

/**
 * تفعيل/تعطيل نظام الازدحام
 */
window.toggleQueueStatus = async (id, enable) => {
    if (!window.checkOnlineStatus()) return;
    try {
        const newValue = enable ? 0 : -1;
        await supabase.from('listings').update({ current_queue: newValue }).eq('id', id);

        if (window.currentDashboardData && window.currentDashboardData.id === id) {
            window.currentDashboardData.current_queue = newValue;

            const ctrlContent = document.getElementById('ctrlContent');
            const scrollTop = ctrlContent ? ctrlContent.scrollTop : 0;
            renderDoctorDashboard(window.currentDashboardData);
            if (ctrlContent) ctrlContent.scrollTop = scrollTop;
        }
        showToast(enable ? 'تم تفعيل نظام الازدحام' : 'تم تعطيل نظام الازدحام', 'success');
    } catch (e) {
        showToast('حدث خطأ', 'error');
    }
};

/**
 * فتح نافذة البحث عن دواء
 */
window.openMedicineFinder = () => {
    history.replaceState(null, '', window.location.pathname + '#medicine-finder');
    updateMetaTags(
        'ابحث عن دوائك | LomedX',
        'خدمة ذكية للبحث عن الأدوية في صيدليات مدينتك. أرسل طلبك واحصل على إشعار فور توفر الدواء في أقرب صيدلية.'
    );

    closeCtrlPanel();
    closeModal();

    const cityOptions = allCities.filter(c => c !== 'كل المدن').map(city => `<option value="${city}">${city}</option>`).join('');

    document.getElementById('modalContent').innerHTML = `
        <div class="p-6">
            <div class="flex justify-between items-center mb-6">
                <h3 class="font-bold text-lg" style="font-family: 'Noto Kufi Arabic'"><i class="fas fa-pills ml-2" style="color: var(--gold)"></i> ابحث عن دوائك</h3>
                <button onclick="closeModal()" class="text-2xl hover:text-gray-400 leading-none">&times;</button>
            </div>
            <div class="mb-4 p-3 rounded-xl text-sm bg-emerald-50 dark:bg-slate-700 text-emerald-800 dark:text-emerald-200 border border-emerald-100 dark:border-slate-600">
                <i class="fas fa-info-circle ml-1"></i> اكتب الأدوية المطلوبة وحدد مدينتك، وسنتولى إرسالها للصيدليات في مدينتك فقط. سيقوم أول صيدلية يتوفر فيها الدواء بالاتصال بك مباشرة!
            </div>
            <form onsubmit="submitMedicineRequest(event)">
                <div class="mb-4">
                    <label class="block text-sm font-semibold mb-2">الأدوية المطلوبة (نصياً)</label>
                    <textarea id="medList" class="ctrl-input" rows="3" placeholder="مثال: كريب ستوب، أبرة معينة، شراب سيتامول" required></textarea>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                    <div>
                        <label class="block text-sm font-semibold mb-2">اسم المريض (اختياري)</label>
                        <input type="text" id="medName" class="ctrl-input" placeholder="اكتب اسمك">
                    </div>
                    <div>
                        <label class="block text-sm font-semibold mb-2">رقم الهاتف للتواصل</label>
                        <input type="tel" id="medPhone" class="ctrl-input" placeholder="09XXXXXXXX" required>
                    </div>
                    <div>
                        <label class="block text-sm font-semibold mb-2">المدينة</label>
                        <select id="medCity" class="ctrl-input" required>
                            ${cityOptions}
                        </select>
                    </div>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label class="block text-sm font-semibold mb-2">مستوى الإلحاح</label>
                        <select id="medUrgency" class="ctrl-input">
                            <option value="عاجل جداً (طوارئ)">عاجل جداً (طوارئ)</option>
                            <option value="عاجل (خلال اليوم)">عاجل (خلال اليوم)</option>
                            <option value="عادي" selected>عادي</option>
                        </select>
                    </div>
                </div>
                <div class="mb-6">
                    <label class="block text-sm font-semibold mb-2">صورة الوصفة الطبية (اختياري)</label>
                    <div class="file-input-wrapper">
                        <label class="file-input-label" for="medImage">
                            <i class="fas fa-camera text-2xl mb-2"></i>
                            <span>اضغط لاختيار صورة الوصفة (إن وجدت)</span>
                            <img id="imagePreview" class="preview-image hidden" src="" alt="معاينة">
                        </label>
                        <input type="file" id="medImage" accept="image/*" onchange="previewMedicineImage(event)">
                    </div>
                </div>
                <div class="mb-6 flex justify-center" id="turnstile-container"></div>
                <button type="submit" id="medSubmitBtn" class="w-full py-3.5 rounded-xl text-white font-bold text-sm transition-all hover:opacity-90 flex items-center justify-center gap-2" style="background: var(--accent)">
                    <i class="fas fa-paper-plane"></i> إرسال لصيدليات مدينتي
                </button>
            </form>
            ${generateToolSEOHtml('medicine-finder')}
        </div>
    `;

    document.getElementById('modalOverlay').classList.add('active');
    lockScroll();

    if (window.turnstile) {
        window.turnstile.render('#turnstile-container', {
            sitekey: '0x4AAAAAAE6WGao5dTYqh9U-',
            theme: 'light'
        });
    }
};

/**
 * معاينة صورة الوصفة
 */
window.previewMedicineImage = (event) => {
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = document.getElementById('imagePreview');
        if (img) {
            img.src = e.target.result;
            img.classList.remove('hidden');
        }
    };
    reader.readAsDataURL(file);
};

/**
 * إرسال طلب دواء
 */
window.submitMedicineRequest = async (e) => {
    e.preventDefault();
    if (!window.checkOnlineStatus()) return;

    const cfToken = document.querySelector('[name="cf-turnstile-response"]')?.value;
    if (!cfToken) {
        showToast('يرجى الانتظار ثانية حتى يكتمل التحقق الأمني.');
        return;
    }

    const submitBtn = document.getElementById('medSubmitBtn');
    const medList = document.getElementById('medList').value.trim();
    const name = document.getElementById('medName').value.trim() || 'مريض';
    const phoneInput = document.getElementById('medPhone');
    const phone = phoneInput.value.trim();
    const urgency = document.getElementById('medUrgency').value;
    const fileInput = document.getElementById('medImage');
    const file = fileInput.files[0];

    const citySelect = document.getElementById('medCity');
    const targetCity = citySelect ? citySelect.value : 'الرحيبة';

    if (!medList) {
        showToast('الرجاء كتابة الأدوية المطلوبة');
        return;
    }
    if (!/^09\d{8}$/.test(phone)) {
        phoneInput.classList.add('input-invalid');
        showToast('الرجاء إدخال رقم هاتف صحيح');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> إرسال لصيدليات مدينتي';
        return;
    }
    phoneInput.classList.remove('input-invalid');

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري إرسال الطلب...';

    try {
        let imageUrl = '';
        if (file) {
            const formData = new FormData();
            formData.append('image', file);
            const { data: funcData, error: funcError } = await supabase.functions.invoke('upload-image', { body: formData });
            if (funcError) throw funcError;
            if (funcData && funcData.success) imageUrl = funcData.data.url;
        }

        const medRef = `MED-${Math.floor(Math.random() * 900000) + 100000}`;

        const { data: reqData, error: reqError } = await supabase.functions.invoke('manage-public-requests', {
            body: {
                action: 'submit_request',
                type: 'medicine',
                patient_phone: phone,
                cf_token: cfToken,
                payload: {
                    med_ref: medRef,
                    med_list: medList,
                    urgency: urgency,
                    patient_name: name,
                    image_url: imageUrl,
                    patient_push_id: localStorage.getItem('patient_push_id'),
                    city: targetCity
                }
            }
        });

        if (reqError) {
            let errorMsg = reqError.message;
            if (reqError.context && typeof reqError.context.json === 'function') {
                try {
                    const errBody = await reqError.context.json();
                    if (errBody.error) errorMsg = errBody.error;
                } catch (e) { /* ignore */ }
            } else if (reqError.context && reqError.context.error) {
                errorMsg = reqError.context.error;
            }
            throw new Error(errorMsg);
        }
        if (reqData && reqData.error) throw new Error(reqData.error);

        sendPushNotification(null, "طلب دواء عاجل 💊", `المريض ${name} من ${targetCity} يبحث عن: ${medList}`, 'pharmacies', null, targetCity);

        document.getElementById('modalContent').innerHTML = `
            <div class="p-8 text-center">
                <div class="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4" style="background: var(--accent-light)">
                    <i class="fas fa-check text-4xl" style="color: var(--accent)"></i>
                </div>
                <h3 class="text-xl font-bold mb-2">تم بث طلبك لصيدليات ${targetCity}!</h3>
                <p class="text-sm mb-2" style="color: var(--muted)">احفظ هذا الرقم لتتبع حالتك:</p>
                <div class="text-2xl font-black text-yellow-600 mb-6">#${medRef}</div>
                <button onclick="copyText('${medRef}')" class="w-full py-3 rounded-xl text-white font-bold text-sm mb-2" style="background: var(--accent)">
                    <i class="fas fa-copy ml-2"></i> نسخ الكود
                </button>
                <p class="text-xs text-gray-400 mt-4">سيقوم النظام بإشعارك فور توفّر الدواء في أقرب صيدلية بمدينتك.</p>
                <button onclick="closeModal()" class="w-full py-2 mt-2 rounded-xl border font-bold text-sm" style="border-color: var(--border)">إغلاق</button>
            </div>
        `;
    } catch (err) {
        showToast('حدث خطأ: ' + err.message, 'error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> إرسال لصيدليات مدينتي';
    }
};

/* ═══════════════════════════════════════════════════════════════════
   ═══════════════ 16. ADMIN DASHBOARD ═══════════════
   ═══════════════════════════════════════════════════════════════════ */

window.openAdminLogin = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        const { data: isAdmin } = await supabase.rpc('is_admin');
        if (isAdmin) {
            renderAdminDashboard();
            return;
        } else {
            showToast('تم رفض الوصول: هذا الحساب لا يملك صلاحيات إدارية!', 'error');
            return;
        }
    }

    openCtrlPanel('لوحة الإدارة', `
        <div class="max-w-sm mx-auto py-8">
            <div class="text-center mb-6">
                <div class="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-3" style="background: var(--accent-light)">
                    <i class="fas fa-user-shield text-2xl" style="color: var(--accent)"></i>
                </div>
                <h3 class="font-bold text-lg">دخول الإدارة</h3>
            </div>
            <form onsubmit="handleAdminLogin(event)" class="flex flex-col gap-4">
                <input type="email" id="adminEmail" class="ctrl-input text-center" placeholder="البريد الإلكتروني" required>
                <input type="password" id="adminPass" class="ctrl-input text-center" placeholder="كلمة المرور" required>
                <button type="submit" class="w-full py-3 rounded-xl text-white font-bold text-sm" style="background: var(--accent)">دخول</button>
            </form>
        </div>
    `, '#073D2E');
};

window.handleAdminLogin = async (e) => {
    e.preventDefault();
    const email = document.getElementById('adminEmail').value.trim();
    const password = document.getElementById('adminPass').value.trim();

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
        showToast('الإيميل أو كلمة المرور غير صحيحة!', 'error');
        return;
    }

    const { data: isAdmin, error: rpcError } = await supabase.rpc('is_admin');
    if (rpcError || !isAdmin) {
        await supabase.auth.signOut();
        showToast('تم رفض الوصول: هذا الحساب لا يملك صلاحيات إدارية!', 'error');
        return;
    }
    renderAdminDashboard();
};

window.logoutAdmin = async () => {
    await supabase.auth.signOut();
    closeCtrlPanel();
    showToast('تم تسجيل الخروج بنجاح', 'success');
};

/**
 * تحديث حقول النموذج الإداري حسب النوع
 */
window.updateAdminFormFields = (type) => {
    const phoneInput = document.getElementById('new_phone');
    if (phoneInput) {
        if (type === 'hospital' || type === 'center') phoneInput.classList.add('hidden');
        else phoneInput.classList.remove('hidden');
    }

    const passInput = document.getElementById('new_custom_password');
    if (passInput) {
        if (type === 'doctor' || type === 'pharmacy') passInput.classList.remove('hidden');
        else passInput.classList.add('hidden');
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

            <div class="col-span-1 sm:col-span-2 p-4 border-t border-dashed" style="border-color: var(--border);">
                <h4 class="font-bold text-sm mb-2 text-gray-700"><i class="fas fa-phone-volume text-teal-600 ml-1"></i> أرقام هواتف المنشأة (متعدد)</h4>
                <div id="phoneContainer" class="flex flex-col gap-2"></div>
                <button type="button" onclick="addAdminRow('phoneContainer', ['label', 'phone'])" class="mt-2 w-full py-2 rounded-xl border-2 border-dashed text-sm font-semibold text-teal-600 border-teal-500 hover:bg-teal-50">+ إضافة رقم هاتف</button>
            </div>
        `;

    } else if (type === 'doctor') {
        html = `
            <input type="text" id="new_login_id" class="ctrl-input text-sm col-span-1 sm:col-span-2" placeholder="مُعرف الدخول (رقم الهاتف أو اسم مستخدم)" required>
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
            </div>
        `;

    } else if (type === 'lab') {
        html = `
            <input type="text" id="new_extra" class="ctrl-input text-sm col-span-1 sm:col-span-2" placeholder="نوع التحاليل">
            <select id="new_home_sample" class="ctrl-input text-sm">
                <option value="لا">لا يوجد سحب منزلي</option>
                <option value="نعم">يوجد سحب منزلي</option>
            </select>
        `;

    } else if (type === 'pharmacy') {
        html = `
            <input type="text" id="new_login_id" class="ctrl-input text-sm col-span-1 sm:col-span-2" placeholder="مُعرف الدخول (رقم الهاتف أو اسم مستخدم)" required>
            <input type="text" id="new_night_details" class="ctrl-input text-sm" placeholder="تفاصيل المناوبة">
            <input type="text" id="new_extra" class="ctrl-input text-sm col-span-1 sm:col-span-2" placeholder="ملاحظات">
        `;
    }

    html += '<input type="text" id="new_latlng" class="ctrl-input text-sm col-span-1 sm:col-span-2 mt-2" placeholder="إحداثيات الموقع (33.5, 36.3)">';
    document.getElementById('adminExtraFields').innerHTML = html;
};

/**
 * إضافة صف ديناميكي في النموذج الإداري
 */
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

/**
 * عرض لوحة تحكم الإدارة
 */
window.renderAdminDashboard = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        openAdminLogin();
        showToast('يجب تسجيل الدخول أولاً');
        return;
    }

    // إحصائيات الإدارة
    const { data: adminStats } = await supabase.rpc('get_admin_dashboard_stats');
    let recentPatients = [];
    let totalHealthFilesCount = 0;
    if (adminStats) {
        totalHealthFilesCount = adminStats.total_health_files || 0;
        recentPatients = adminStats.recent_files || [];
    }

    let patientsHtml = '';
    if (recentPatients && recentPatients.length > 0) {
        patientsHtml = recentPatients.map(p => `
            <div class="flex items-center justify-between p-2 rounded-lg border" style="border-color: var(--border)">
                <div class="flex items-center gap-2">
                    <i class="fas fa-user-circle text-gray-400"></i>
                    <span class="text-sm font-semibold">${escapeHtml(p.full_name)}</span>
                </div>
                <span class="text-xs text-red-500 font-bold">${escapeHtml(p.blood_type || 'غير محدد')}</span>
            </div>
        `).join('');
    } else {
        patientsHtml = '<p class="text-center text-gray-400 text-sm py-4">لا يوجد مرضى مسجلين بعد.</p>';
    }

    const patientsAdminHtml = `
        <div class="bg-white p-5 rounded-xl border" style="border-color: var(--border)">
            <h4 class="font-bold mb-4 text-sm flex items-center gap-2" style="font-family: 'Noto Kufi Arabic'"><i class="fas fa-file-medical text-pink-600"></i> أحدث الملفات الصحية المسجلة</h4>
            <div class="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">${patientsHtml}</div>
        </div>
    `;

    // الرسوم البيانية
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
        </div>
    `;

    const { data: topArticles } = await supabase.from('medical_articles').select('title, views').order('views', { ascending: false }).limit(5);

    const radarAdminHtml = `
        <div class="bg-white p-5 rounded-xl border" style="border-color: var(--border)">
            <h4 class="font-bold mb-4 text-sm flex items-center gap-2" style="font-family: 'Noto Kufi Arabic'"><i class="fas fa-satellite-dish text-indigo-600"></i> إدارة رادار الرحيبة الصحي</h4>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div class="bg-gray-50 p-3 rounded-xl">
                    <span class="text-xs text-gray-500 block mb-1">الفصل الافتراضي للزوار:</span>
                    <select id="adminRadarSeason" onchange="setRadarDefaultSeason()" class="ctrl-input text-sm">
                        <option value="summer">☀️ صيف</option>
                        <option value="winter">❄️ شتاء</option>
                    </select>
                </div>
                <div class="bg-gray-50 p-3 rounded-xl flex flex-col justify-center">
                    <span class="text-xs text-gray-500 block mb-1">تصفير العدادات الأسبوعي:</span>
                    <button onclick="resetRadarVotes()" class="bg-red-500 text-white py-2 rounded-lg text-sm font-bold hover:bg-red-600 transition-all">تصفير العدادات</button>
                </div>
            </div>
        </div>
    `;

    const homeAdsHtml = `
        <div class="bg-white p-5 rounded-xl border" style="border-color: var(--border)">
            <h4 class="font-bold mb-4 text-sm flex items-center gap-2" style="font-family: 'Noto Kufi Arabic'"><i class="fas fa-photo-video text-purple-600"></i> إعلانات الصفحة الرئيسية (صور/فيديو)</h4>
            <form onsubmit="saveHomeAd(event)" class="grid grid-cols-1 gap-3 mb-4">
                <select id="adType" class="ctrl-input text-sm">
                    <option value="image">صورة (رابط مباشر ينتهي بـ .jpg أو .png)</option>
                    <option value="video">فيديو (رابط مباشر ينتهي بـ .mp4 فقط)</option>
                </select>
                <input type="text" id="adContent" class="ctrl-input text-sm" placeholder="الصق الرابط هنا..." required>
                <input type="text" id="adLink" class="ctrl-input text-sm" placeholder="رابط التحويل عند الضغط (اختياري للصور)">
                <label class="flex items-center gap-2 text-sm">
                    <input type="checkbox" id="adActiveCheck" class="w-5 h-5 accent-purple-600" checked> تفعيل وعرض الإعلان فوراً
                </label>
                <button type="submit" class="py-2.5 rounded-xl text-white font-semibold text-sm" style="background: #8B5CF6"><i class="fas fa-plus ml-1"></i> إضافة إعلان</button>
            </form>
            <div id="adminHomeAdsList" class="flex flex-col gap-2 max-h-40 overflow-y-auto pr-1">
                <p class="text-center text-gray-400 text-sm py-2">جاري تحميل الإعلانات...</p>
            </div>
        </div>
    `;

    const announcementsHtml = `
        <div class="bg-white p-5 rounded-xl border" style="border-color: var(--border)">
            <h4 class="font-bold mb-4 text-sm flex items-center gap-2" style="font-family: 'Noto Kufi Arabic'"><i class="fas fa-bullhorn text-blue-600"></i> إدارة الشريط الإعلاني العلوي</h4>
            <form onsubmit="saveAnnouncement(event)" class="grid grid-cols-1 gap-3 mb-4">
                <textarea id="annText" class="ctrl-input text-sm" rows="2" placeholder="نص الإعلان (مثال: افتتاحية قسم الطوارئ الجديد...)" required></textarea>
                <input type="text" id="annLink" class="ctrl-input text-sm" placeholder="رابط التفاصيل (اتركه فارغاً لإخفاء الزر تماماً)">
                <input type="text" id="annLinkText" class="ctrl-input text-sm" placeholder="نص الزر (اختياري - افتراضي: اضغط هنا)">
                <button type="submit" class="py-2.5 rounded-xl text-white font-semibold text-sm" style="background: #2563EB"><i class="fas fa-paper-plane ml-1"></i> نشر الإعلان</button>
            </form>
            <div id="adminAnnouncementList" class="flex flex-col gap-2 max-h-40 overflow-y-auto pr-1">
                <p class="text-center text-gray-400 text-sm py-2">جاري تحميل الإعلانات...</p>
            </div>
        </div>
    `;

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
        </div>
    `;

    // قائمة المنشآت
    const listHtml = allData.map(item => `
        <div class="flex items-center justify-between p-3 rounded-xl border bg-white" style="border-color: var(--border)">
            <div class="flex flex-col gap-1">
                <div class="flex items-center gap-3">
                    <span class="badge badge-${item.type}">${item.type}</span>
                    <span class="font-semibold text-sm">${escapeHtml(item.name)}</span>
                </div>
            </div>
            <div class="flex gap-2 items-center">
                ${['doctor', 'pharmacy'].includes(item.type) ? `
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
                ` : ''}
                <button onclick="editFacility('${item.id}')" class="w-8 h-8 rounded-lg flex items-center justify-center text-blue-600 hover:bg-blue-50"><i class="fas fa-edit"></i></button>
                <button onclick="deleteFacility('${item.id}')" class="w-8 h-8 rounded-lg flex items-center justify-center text-red-600 hover:bg-red-50"><i class="fas fa-trash"></i></button>
            </div>
        </div>
    `).join('');

    // استغاثات الدم النشطة
    const twentyHoursAgo = new Date(Date.now() - (20 * 60 * 60 * 1000)).toISOString();
    const activeBloodRequests = bloodRequests.filter(b => b.created_at > twentyHoursAgo);

    const bloodHtml = activeBloodRequests.length === 0
        ? '<p class="text-center py-4 text-gray-400 text-sm">لا توجد استغاثات حالياً.</p>'
        : activeBloodRequests.map(b => `
            <div class="flex items-center justify-between p-2 rounded-lg border" style="border-color: var(--border)">
                <div class="flex items-center gap-3">
                    <span class="blood-type-badge text-sm py-1 px-3">${escapeHtml(b.blood_type)}</span>
                    <div>
                        <div class="text-sm font-semibold">${escapeHtml(b.patient_name)} ${b.responses_count > 0 ? '<span class="text-xs text-green-500">(مستجيب: ' + escapeHtml(b.responses_count) + ')</span>' : ''}</div>
                        <div class="text-xs text-gray-500">${escapeHtml(b.hospital)}</div>
                    </div>
                </div>
                <button onclick="resolveBloodRequest('${b.id}')" class="text-xs text-white px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 transition-colors">إنهاء الطلب</button>
            </div>
        `).join('');

    // المستلزمات الطبية
    const medDonHtml = medicineDonations.length === 0
        ? '<p class="text-center py-4 text-gray-400 text-sm">لا توجد مستلزمات طبية مُتبرع او طلب حالياً.</p>'
        : medicineDonations.map(m => `
            <div class="flex items-center justify-between p-2 rounded-lg border" style="border-color: var(--border)">
                <div class="flex items-center gap-3">
                    <i class="fas fa-pills text-green-600"></i>
                    <div>
                        <div class="text-sm font-semibold">${escapeHtml(m.medicine_name)} (${escapeHtml(m.quantity)})</div>
                        <div class="text-xs text-gray-500">ينتهي: ${escapeHtml(m.expiry_date)} | المتبرع: ${escapeHtml(m.donor_name)}</div>
                    </div>
                </div>
                <button onclick="resolveMedicineDonation('${m.id}')" class="text-xs text-white px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 transition-colors">حذف/إنهاء</button>
            </div>
        `).join('');

    // مدونة الإدارة
    const blogAdminHtml = `
        <div class="bg-white p-5 rounded-xl border" style="border-color: var(--border)">
            <h4 class="font-bold mb-4 text-sm flex items-center gap-2"><i class="fas fa-newspaper text-blue-600"></i> إدارة المدونة والمقالات</h4>
            <form id="articleForm" onsubmit="saveArticle(event)" class="grid grid-cols-1 gap-3 mb-4">
                <input type="hidden" id="editArtId">
                <input type="text" id="artTitle" class="ctrl-input text-sm" placeholder="عنوان المقال" required>
                <div class="grid grid-cols-2 gap-3">
                    <input type="text" id="artCategory" class="ctrl-input text-sm" placeholder="التصنيف (مثال: أطفال، باطنة)">
                    <input type="text" id="artImage" class="ctrl-input text-sm" placeholder="رابط الصورة (URL)">
                    <input type="text" id="artAuthorName" class="ctrl-input text-sm" placeholder="اسم الطبيب الكاتب (مثال: د. أحمد)" required>
                    <input type="text" id="artAuthorCredential" class="ctrl-input text-sm" placeholder="الاختصاص (مثال: استشاري باطنة)" required>
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
        </div>
    `;

    openCtrlPanel('لوحة الإدارة', `
        <div class="flex flex-col gap-6">
            ${analyticsHtml}
            ${announcementsHtml}
            ${homeAdsHtml}
            ${radarAdminHtml}
            ${blogAdminHtml}
            ${patientsAdminHtml}
            ${emergencyAdminHtml}

            <div class="bg-white p-5 rounded-xl border" style="border-color: var(--border)">
                <h4 class="font-bold mb-4 text-sm flex items-center gap-2" style="font-family: 'Noto Kufi Arabic'"><i class="fas fa-tint text-red-600"></i> إدارة استغاثات الدم (${bloodRequests.length})</h4>
                <div class="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">${bloodHtml}</div>
            </div>

            <div class="bg-white p-5 rounded-xl border" style="border-color: var(--border)">
                <h4 class="font-bold mb-4 text-sm flex items-center gap-2" style="font-family: 'Noto Kufi Arabic'"><i class="fas fa-hand-holding-medical text-green-600"></i>إدارة المستلزمات الطبية (${medicineDonations.length})</h4>
                <div class="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">${medDonHtml}</div>
            </div>

            <div class="bg-white p-5 rounded-xl border" style="border-color: var(--border)">
                <h4 class="font-bold mb-4 text-sm"><i class="fas fa-plus-circle ml-2" style="color: var(--accent)"></i> <span id="formTitle">إضافة منشأة</span></h4>
                <form onsubmit="saveFacility(event)" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input type="hidden" id="edit_id">
                    <select id="new_type" class="ctrl-input text-sm" required onchange="updateAdminFormFields(this.value)">
                        <option value="hospital">مشفى</option>
                        <option value="center">مركز</option>
                        <option value="lab">مخبر</option>
                        <option value="doctor">طبيب</option>
                        <option value="pharmacy">صيدلية</option>
                    </select>
                    <input type="text" id="new_name" class="ctrl-input text-sm" placeholder="الاسم" required>
                    <input type="text" id="new_specialty" class="ctrl-input text-sm" placeholder="التخصص الأساسي" required>
                    <input type="text" id="new_address" class="ctrl-input text-sm" placeholder="العنوان / الموقع" required>
                    <input type="text" id="new_phone" class="ctrl-input text-sm" placeholder="رقم الهاتف (اختياري)">
                    <input type="text" id="new_hours" class="ctrl-input text-sm" placeholder="أوقات العمل">
                    <input type="text" id="new_image_url" class="ctrl-input text-sm" placeholder="رابط الصورة (URL)">
                    <input type="text" id="new_custom_password" class="ctrl-input text-sm col-span-1 sm:col-span-2" placeholder="كلمة مرور الطبيب/الصيدلية (6 أحرف فأكثر)">
                    <textarea id="new_desc" class="ctrl-input text-sm col-span-2" placeholder="وصف عام (اختياري)" rows="2"></textarea>
                    <div id="adminExtraFields" class="contents"></div>
                    <button type="submit" class="col-span-1 sm:col-span-2 py-2.5 rounded-xl text-white font-semibold text-sm" style="background: var(--accent)"><i class="fas fa-save ml-1"></i> حفظ</button>
                </form>
            </div>

            <div class="bg-white p-5 rounded-xl border" style="border-color: var(--border)">
                <h4 class="font-bold mb-4 text-sm"><i class="fas fa-list ml-2"></i> المنشآت (${allData.length})</h4>
                <div class="flex flex-col gap-2 max-h-96 overflow-y-auto">${listHtml}</div>
            </div>

            <button onclick="logoutAdmin()" class="w-full py-2.5 rounded-xl border font-semibold text-sm mt-2" style="border-color: #EF4444; color: #EF4444;">
                <i class="fas fa-sign-out-alt ml-2"></i> تسجيل الخروج
            </button>
        </div>
    `, '#073D2E');

    renderAdminEmergencyList();
    fetchAnnouncements();
    fetchHomeAdsForAdmin();
    updateAdminFormFields('doctor');
    fetchAdminArticles();

    // ─── الرسوم البيانية ───
    setTimeout(async () => {
        await loadChartJs();

        // 1. توزيع المنشآت
        const ctxFac = document.getElementById('facilitiesChart');
        if (ctxFac) {
            const existingFacChart = Chart.getChart(ctxFac);
            if (existingFacChart) existingFacChart.destroy();

            const counts = { hospital: 0, center: 0, lab: 0, doctor: 0, pharmacy: 0 };
            allData.forEach(item => { if (counts[item.type] !== undefined) counts[item.type]++; });

            new Chart(ctxFac, {
                type: 'doughnut',
                data: {
                    labels: ['مشافي', 'مراكز', 'مخابر', 'أطباء', 'صيدليات'],
                    datasets: [{
                        data: [counts.hospital, counts.center, counts.lab, counts.doctor, counts.pharmacy],
                        backgroundColor: ['#0D9488', '#9333EA', '#DC2626', '#2563EB', '#C4962C'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { position: 'bottom', labels: { font: { family: 'IBM Plex Sans Arabic' } } } }
                }
            });
        }

        // 2. استغاثات الدم
        const ctxBlood = document.getElementById('bloodChart');
        if (ctxBlood) {
            const existingBloodChart = Chart.getChart(ctxBlood);
            if (existingBloodChart) existingBloodChart.destroy();

            const bloodCounts = { "A+": 0, "B+": 0, "O+": 0, "AB+": 0, "A-": 0, "B-": 0, "O-": 0, "AB-": 0 };
            bloodRequests.forEach(req => { if (bloodCounts[req.blood_type] !== undefined) bloodCounts[req.blood_type]++; });

            new Chart(ctxBlood, {
                type: 'bar',
                data: {
                    labels: Object.keys(bloodCounts),
                    datasets: [{ label: 'عدد الاستغاثات', data: Object.values(bloodCounts), backgroundColor: '#DC2626', borderRadius: 8 }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { y: { ticks: { stepSize: 1 }, grid: { color: 'rgba(0,0,0,0.05)' } }, x: { grid: { display: false } } }
                }
            });
        }

        // 3. أكثر المقالات قراءة
        const ctxArt = document.getElementById('articlesChart');
        if (ctxArt) {
            const existingArtChart = Chart.getChart(ctxArt);
            if (existingArtChart) existingArtChart.destroy();

            if (topArticles && topArticles.length > 0) {
                const labels = topArticles.map(a => a.title.split(' ').slice(0, 3).join(' ') + (a.title.split(' ').length > 3 ? '...' : ''));
                const data = topArticles.map(a => a.views || 0);

                new Chart(ctxArt, {
                    type: 'bar',
                    data: {
                        labels: labels,
                        datasets: [{
                            label: 'عدد المشاهدات',
                            data: data,
                            backgroundColor: ['rgba(14, 124, 95, 0.9)', 'rgba(196, 150, 44, 0.9)', 'rgba(37, 99, 235, 0.9)', 'rgba(147, 51, 234, 0.9)', 'rgba(220, 38, 38, 0.9)'],
                            borderRadius: 8, borderSkipped: false, barThickness: 24
                        }]
                    },
                    options: {
                        indexAxis: 'y', responsive: true, maintainAspectRatio: false,
                        plugins: {
                            legend: { display: false },
                            tooltip: {
                                backgroundColor: 'rgba(7, 61, 46, 0.95)',
                                titleFont: { family: 'Noto Kufi Arabic', size: 14 },
                                bodyFont: { family: 'IBM Plex Sans Arabic', size: 12 },
                                padding: 12, cornerRadius: 8,
                                callbacks: {
                                    title: (context) => topArticles[context[0].dataIndex].title,
                                    label: (context) => `قراءة: ${context.raw} مرة`
                                }
                            }
                        },
                        scales: {
                            x: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { font: { family: 'IBM Plex Sans Arabic' }, color: '#7A8B7A', stepSize: 1 } },
                            y: { grid: { display: false }, ticks: { font: { family: 'Noto Kufi Arabic', weight: 'bold' }, color: '#1B2A1B' } }
                        }
                    }
                });
            } else {
                ctxArt.parentElement.innerHTML = '<p style="text-align:center; color:var(--muted); padding: 50px 0; font-size: 0.875rem;">لا توجد مقالات منشورة بعد.</p>';
            }
        }

        // 4. توزيع المستلزمات
        const ctxMedEq = document.getElementById('medEquivChart');
        if (ctxMedEq) {
            const existingMedChart = Chart.getChart(ctxMedEq);
            if (existingMedChart) existingMedChart.destroy();

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
                    datasets: [{
                        data: [typeCounts['تبرع'], typeCounts['إعارة'], typeCounts['طلب'], typeCounts['مستلزمات']],
                        backgroundColor: ['#10B981', '#F59E0B', '#3B82F6', '#9333EA'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { position: 'bottom', labels: { font: { family: 'IBM Plex Sans Arabic' } } } }
                }
            });
        }

        // 5. نشاط الرادار
        const ctxRadar = document.getElementById('radarChart');
        if (ctxRadar) {
            const existingRadarChart = Chart.getChart(ctxRadar);
            if (existingRadarChart) existingRadarChart.destroy();

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
                    options: {
                        responsive: true, maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: { y: { ticks: { stepSize: 1 }, grid: { color: 'rgba(0,0,0,0.05)' } }, x: { grid: { display: false } } }
                    }
                });
            });
        }
    }, 500);
};

/* ═══════════════════════════════════════════════════════════════════
   ═══════════════ 17. ANNOUNCEMENTS ═══════════════
   ═══════════════════════════════════════════════════════════════════ */

window.saveAnnouncement = async (e) => {
    e.preventDefault();
    const text = document.getElementById('annText').value.trim();
    const link = document.getElementById('annLink').value.trim();

    if (!text) {
        showToast('الرجاء إدخال نص');
        return;
    }

    try {
        await supabase.from('announcements').insert([{ text, link, is_active: true }]);
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
        if (allAnnouncements.length === 0) {
            annList.innerHTML = '<p class="text-center text-gray-400 text-sm">لا توجد إعلانات.</p>';
        } else {
            annList.innerHTML = allAnnouncements.map(ann => `
                <div class="flex items-center justify-between p-2 rounded-lg border">
                    <div class="text-xs truncate flex-1">${escapeHtml(ann.text)}</div>
                    <div class="flex gap-1 mr-2">
                        <button onclick="toggleAnnouncement('${ann.id}', ${!ann.is_active})" class="px-2 py-1 rounded text-xs ${ann.is_active ? 'bg-green-500 text-white' : 'bg-gray-200'}">${ann.is_active ? 'مفعّل' : 'معطّل'}</button>
                        <button onclick="deleteAnnouncement('${ann.id}')" class="px-2 py-1 rounded text-xs bg-red-500 text-white"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            `).join('');
        }
    }
    renderTopAnnouncement();
}

function renderTopAnnouncement() {
    const navbar = document.getElementById('navbar');
    const annBar = document.getElementById('topAnnouncementBar');
    const homeSection = document.getElementById('home');

    if (annBar && navbar && homeSection) {
        const activeAnns = allAnnouncements.filter(a => a.is_active);
        if (activeAnns.length > 0) {
            const ann = activeAnns[0];
            currentAnnouncement = ann;
            const textEl = document.getElementById('announcementText');
            if (textEl) textEl.innerText = ann.text;

            const linkEl = document.getElementById('announcementLink');
            if (linkEl) {
                if (ann.link) {
                    let url = ann.link;
                    if (!url.match(/^https?:\/\//i)) url = 'https://' + url;
                    linkEl.href = url;
                    linkEl.style.display = 'inline';
                    if (textEl) textEl.classList.add('no-marquee');
                } else {
                    linkEl.style.display = 'none';
                    if (textEl) textEl.classList.remove('no-marquee');
                }
            }
            annBar.classList.remove('hidden');
            navbar.style.top = '36px';
            homeSection.style.paddingTop = '11rem';
        } else {
            currentAnnouncement = null;
            annBar.classList.add('hidden');
            navbar.style.top = '0px';
            homeSection.style.paddingTop = '6rem';
        }
    }
}

window.toggleAnnouncement = async (id, status) => {
    if (!window.checkOnlineStatus()) return;
    try {
        await supabase.from('announcements').update({ is_active: status }).eq('id', id);
        showToast('تم التحديث');
    } catch (err) {
        showToast('خطأ');
    }
};

window.deleteAnnouncement = async (id) => {
    if (!window.checkOnlineStatus()) return;
    try {
        await supabase.from('announcements').delete().eq('id', id);
        showToast('تم الحذف');
    } catch (err) {
        showToast('خطأ');
    }
};

/* ═══════════════════════════════════════════════════════════════════
   ═══════════════ 18. FACILITY CRUD ═══════════════
   ═══════════════════════════════════════════════════════════════════ */

window.editFacility = (id) => {
    if (!window.checkOnlineStatus()) return;
    const item = allData.find(d => d.id === id);
    if (!item) return;

    document.getElementById('edit_id').value = id;
    document.getElementById('new_type').value = item.type;
    updateAdminFormFields(item.type);

    setTimeout(() => {
        document.getElementById('new_name').value = item.name;
        document.getElementById('new_specialty').value = item.specialty || '';
        document.getElementById('new_address').value = item.address || item.clinic || '';
        document.getElementById('new_phone').value = item.phone;
        document.getElementById('new_hours').value = item.hours;
        document.getElementById('new_desc').value = item.description;

        if (document.getElementById('new_facility_phone')) {
            document.getElementById('new_facility_phone').value = item.phone || '';
        }

        if (item.type === 'hospital' || item.type === 'center') {
            if (document.getElementById('new_capacity_info')) {
                document.getElementById('new_capacity_info').value = item.capacity_info || '';
            }

            if (item.facility_details) {
                const cData = item.facility_details;

                if (cData.stats) cData.stats.forEach(s => {
                    addAdminRow('statsContainer', ['icon', 'value', 'label']);
                    const lastRow = document.querySelector('#statsContainer > div:last-child');
                    if (lastRow) {
                        lastRow.querySelector('.row-icon').value = s.icon || '';
                        lastRow.querySelector('.row-value').value = s.value || '';
                        lastRow.querySelector('.row-label').value = s.label || '';
                    }
                });

                if (cData.departments) cData.departments.forEach(d => {
                    addAdminRow('deptContainer', ['icon', 'title', 'desc']);
                    const lastRow = document.querySelector('#deptContainer > div:last-child');
                    if (lastRow) {
                        lastRow.querySelector('.row-icon').value = d.icon || '';
                        lastRow.querySelector('.row-title').value = d.title || '';
                        lastRow.querySelector('.row-desc').value = d.desc || '';
                    }
                });

                if (cData.units) cData.units.forEach(u => {
                    addAdminRow('unitContainer', ['title', 'desc']);
                    const lastRow = document.querySelector('#unitContainer > div:last-child');
                    if (lastRow) {
                        lastRow.querySelector('.row-title').value = u.title || '';
                        lastRow.querySelector('.row-desc').value = u.desc || '';
                    }
                });

                if (cData.services) cData.services.forEach(s => {
                    addAdminRow('servContainer', ['title', 'desc']);
                    const lastRow = document.querySelector('#servContainer > div:last-child');
                    if (lastRow) {
                        lastRow.querySelector('.row-title').value = s.title || '';
                        lastRow.querySelector('.row-desc').value = s.desc || '';
                    }
                });

                if (cData.phones && cData.phones.length > 0) {
                    cData.phones.forEach(p => {
                        addAdminRow('phoneContainer', ['label', 'phone']);
                        const lastRow = document.querySelector('#phoneContainer > div:last-child');
                        if (lastRow) {
                            lastRow.querySelector('.row-label').value = p.label || '';
                            lastRow.querySelector('.row-phone').value = p.phone || '';
                        }
                    });
                }
            }
        } else if (item.type === 'doctor') {
            document.getElementById('new_consult_hours').value = item.consulthours || '';
            document.getElementById('new_extra').value = item.bookingnotes || '';
            if (document.getElementById('new_parent_id')) {
                document.getElementById('new_parent_id').value = item.parent_id || '';
            }
            const allowed = item.allowed_systems || ['manual'];
            document.getElementById('allow_manual').checked = allowed.includes('manual');
            document.getElementById('allow_slots').checked = allowed.includes('slots');
        } else if (item.type === 'pharmacy') {
            document.getElementById('new_night_details').value = item.nightdetails || '';
            document.getElementById('new_extra').value = item.description || '';
        } else if (item.type === 'lab') {
            document.getElementById('new_extra').value = item.tests || '';
            document.getElementById('new_home_sample').value = item.homesample || 'لا';
        }

        if (document.getElementById('new_latlng')) {
            document.getElementById('new_latlng').value = item.latlng || '';
        }
    }, 100);

    document.getElementById('new_image_url').value = item.image || '';
    document.getElementById('formTitle').textContent = `تعديل: ${item.name}`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.deleteFacility = async (id) => {
    if (!window.checkOnlineStatus()) return;
    if (!confirm("متأكد من الحذف؟")) return;
    try {
        await supabase.from('listings').delete().eq('id', id);
        localStorage.setItem('force_listings_update', 'true');
        showToast('تم الحذف', 'success');
        await fetchListings();
        renderAdminDashboard();
    } catch (e) {
        showToast('حدث خطأ', 'error');
    }
};

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

    if (document.getElementById('new_latlng')) data.latlng = document.getElementById('new_latlng').value.trim();
    if (imgURL) data.image = imgURL;

    const customPassword = document.getElementById('new_custom_password').value.trim();

    // تحديث كلمة المرور (وضع التعديل)
    if (id && (type === 'doctor' || type === 'pharmacy') && customPassword.length >= 6) {
        const { data: facilityData } = await supabase.from('listings').select('user_id').eq('id', id).single();
        if (facilityData && facilityData.user_id) {
            try {
                await supabase.functions.invoke('create-user', {
                    body: { action: 'update', user_id: facilityData.user_id, password: customPassword }
                });
                showToast('تم تحديث كلمة المرور بنجاح', 'success');
            } catch (err) {
                showToast('خطأ في تحديث كلمة المرور', 'error');
            }
        }
    }

    // إنشاء حساب جديد (وضع الإضافة)
    if (!id && (type === 'doctor' || type === 'pharmacy')) {
        if (!customPassword || customPassword.length < 6) {
            showToast('يرجى إدخال كلمة مرور (6 أحرف على الأقل)');
            return;
        }

        const loginIdInput = document.getElementById('new_login_id');
        let loginId = loginIdInput ? loginIdInput.value.trim().toLowerCase().replace(/[^a-z0-9]/g, '') : '';

        if (!loginId) {
            loginId = Math.floor(100000 + Math.random() * 900000).toString();
            showToast('لم يتم إدخال مُعرف دخول، تم توليد رقم عشوائي تلقائياً.', 'info');
        }

        const dummyEmail = type === 'doctor' ? `doc_${loginId}@lomedx.app` : `pharm_${loginId}@lomedx.app`;

        try {
            const { data: funcData, error: funcError } = await supabase.functions.invoke('create-user', {
                body: { email: dummyEmail, password: customPassword }
            });

            if (funcError || !funcData || !funcData.user_id) {
                showToast('خطأ في إنشاء حساب الدخول: ' + (funcError?.message || 'مُعرف الدخول مستخدم مسبقاً'), 'error');
                return;
            }
            data.user_id = funcData.user_id;
        } catch (err) {
            showToast('خطأ في الاتصال بالسيرفر.', 'error');
            return;
        }
    }

    // بيانات المشافي والمراكز
    if (type === 'hospital' || type === 'center') {
        data.specialty = specialty;
        data.address = address;
        data.capacity_info = document.getElementById('new_capacity_info')?.value || '';

        let facilityData = { stats: [], departments: [], clinics: [], units: [], services: [], phones: [] };

        document.querySelectorAll('#statsContainer > div').forEach(row => {
            facilityData.stats.push({
                icon: row.querySelector('.row-icon')?.value,
                value: row.querySelector('.row-value')?.value,
                label: row.querySelector('.row-label')?.value
            });
        });
        document.querySelectorAll('#deptContainer > div').forEach(row => {
            facilityData.departments.push({
                icon: row.querySelector('.row-icon')?.value,
                title: row.querySelector('.row-title')?.value,
                desc: row.querySelector('.row-desc')?.value
            });
        });
        document.querySelectorAll('#unitContainer > div').forEach(row => {
            facilityData.units.push({
                title: row.querySelector('.row-title')?.value,
                desc: row.querySelector('.row-desc')?.value
            });
        });
        document.querySelectorAll('#servContainer > div').forEach(row => {
            facilityData.services.push({
                title: row.querySelector('.row-title')?.value,
                desc: row.querySelector('.row-desc')?.value
            });
        });
        document.querySelectorAll('#phoneContainer > div').forEach(row => {
            const pLabel = row.querySelector('.row-label')?.value || '';
            const pPhone = row.querySelector('.row-phone')?.value || '';
            if (pPhone) facilityData.phones.push({ label: pLabel, phone: pPhone });
        });

        data.phone = facilityData.phones[0]?.phone || '';
        data.facility_details = facilityData;

    } else if (type === 'doctor') {
        data.specialty = specialty;
        data.clinic = address;
        data.consulthours = document.getElementById('new_consult_hours')?.value || '';
        data.bookingnotes = document.getElementById('new_extra')?.value || '';
        data.parent_id = document.getElementById('new_parent_id')?.value || '';

        const systems = [];
        if (document.getElementById('allow_manual').checked) systems.push('manual');
        if (document.getElementById('allow_slots').checked) systems.push('slots');
        if (systems.length === 0) systems.push('manual');
        data.allowed_systems = systems;

    } else if (type === 'pharmacy') {
        data.address = address;
        data.night = false;
        data.nightdetails = document.getElementById('new_night_details')?.value || '';
        data.description = document.getElementById('new_extra')?.value || '';

    } else if (type === 'lab') {
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

/**
 * تبديل حالة الاشتراك
 */
window.toggleSubscription = async (id, currentStatus) => {
    if (!window.checkOnlineStatus()) return;
    try {
        await supabase.from('listings').update({ is_subscribed: currentStatus }).eq('id', id);
        showToast(currentStatus ? 'تم تفعيل الاشتراك بنجاح!' : 'تم إلغاء الاشتراك.', currentStatus ? 'success' : 'info');
        await fetchListings();
        renderAdminDashboard();
    } catch (e) {
        showToast('حدث خطأ', 'error');
    }
};

/* ═══════════════════════════════════════════════════════════════════
   ═══════════════ 19. HEALTH FILE ═══════════════
   ═══════════════════════════════════════════════════════════════════ */

window.openHealthFile = async () => {
    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
        const [listingRes, adminRes] = await Promise.all([
            supabase.from('listings').select('id').eq('user_id', session.user.id).maybeSingle(),
            supabase.rpc('is_admin')
        ]);

        const isStaff = listingRes.data;
        const isAdmin = adminRes.data;

        if (isStaff || isAdmin) {
            await supabase.auth.signOut();
            showToast('تم تسجيل الخروج من حساب العمل. يرجى تسجيل الدخول كمريض.');

            openHealthLoginPanel();
            return;
        }

        currentHealthFileId = session.user.id;

        const { data: fileData, error: funcError } = await supabase.functions.invoke('manage-health-file', {
            body: { action: 'get' }
        });

        if (funcError) {
            showToast('خطأ في جلب الملف الصحي', 'error');
            return;
        }

        renderHealthDashboard(fileData);
        return;
    }

    openHealthLoginPanel();
};

function openHealthLoginPanel() {
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
                <div class="relative flex justify-center"><span class="bg-transparent px-4 text-xs text-gray-500"> أو سجل عبر البريد الإلكتروني </span></div>
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
}

window.signInWithGoogle = async () => {
    sessionStorage.setItem('google_login_intent', 'true');

    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.href }
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

    const { error: dbError } = await supabase.from('health_files').insert([{
        id: userId,
        full_name: fullName,
        qr_token: generateSecureToken(64)
    }]);
    if (dbError) {
        showToast('تم إنشاء الحساب ولكن حدث خطأ في الخادم');
        return;
    }

    showToast('تم إنشاء الحساب بنجاح! يرجى تأكيد بريدك الإلكتروني ثم تسجيل الدخول.', 'success');
    switchHealthTab('login');
};

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

    const { data: fileData, error: funcError } = await supabase.functions.invoke('manage-health-file', {
        body: { action: 'get' }
    });

    if (funcError) {
        showToast('خطأ في جلب الملف: ' + funcError.message, 'error');
        return;
    }

    renderHealthDashboard(fileData);
};

/**
 * عرض لوحة الملف الصحي
 */
window.renderHealthDashboard = (data) => {
    const safe = (val) => {
        if (val === null || val === undefined || val === 'null' || val === 'undefined' || val === '') return '';
        return val;
    };

    openCtrlPanel(`الملف الصحي: ${safe(data.full_name) || 'مريض'}`, `
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
            <div class="col-span-1 sm:col-span-2"><label class="text-xs font-bold text-gray-500">الاسم الكامل</label><input type="text" id="hfFullName" class="ctrl-input" value="${escapeHtml(safe(data.full_name) || safe(data.fullName))}" required></div>
            <div><label class="text-xs font-bold text-gray-500">العمر</label><input type="number" id="hfAge" class="ctrl-input" value="${escapeHtml(safe(data.age))}"></div>
            <div><label class="text-xs font-bold text-gray-500">الجنس</label><select id="hfGender" class="ctrl-input"><option value="ذكر" ${safe(data.gender) === 'ذكر' ? 'selected' : ''}>ذكر</option><option value="أنثى" ${safe(data.gender) === 'أنثى' ? 'selected' : ''}>أنثى</option></select></div>
            <div><label class="text-xs font-bold text-gray-500">فصيلة الدم</label><select id="hfBloodType" class="ctrl-input">${["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "غير معروف"].map(t => `<option value="${t}" ${safe(data.blood_type) === t ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
            <div><label class="text-xs font-bold text-gray-500">الوزن (كغ)</label><input type="text" id="hfWeight" class="ctrl-input" value="${escapeHtml(safe(data.weight))}"></div>
            <div class="col-span-1 sm:col-span-2"><label class="text-xs font-bold text-gray-500">الأمراض المزمنة</label><input type="text" id="hfDiseases" class="ctrl-input" value="${escapeHtml(safe(data.diseases))}" placeholder="مثال: سكري، ضغط"></div>
            <div class="col-span-1 sm:col-span-2"><label class="text-xs font-bold text-gray-500">الحساسية (دوائية/غذائية)</label><input type="text" id="hfAllergies" class="ctrl-input" value="${escapeHtml(safe(data.allergies))}" placeholder="مثال: بنسلين، مكسرات"></div>
            <div class="col-span-1 sm:col-span-2"><label class="text-xs font-bold text-gray-500">الأدوية الحالية</label><input type="text" id="hfMedications" class="ctrl-input" value="${escapeHtml(safe(data.medications))}"></div>

            <div class="col-span-1 sm:col-span-2 mt-2 p-3 rounded-xl border" style="border-color: #FED7AA; background: #FFF7ED;">
                <label class="text-xs font-bold text-orange-700 flex items-center gap-1"><i class="fas fa-tooth"></i> سجل الأسنان (يُقرأ فقط من قبل طبيب الأسنان)</label>
                <textarea id="hfDental" class="ctrl-input mt-2" rows="2" placeholder="عمليات سابقة، تقويم، حساسية معينة...">${escapeHtml(safe(data.dental))}</textarea>
            </div>

            <div class="col-span-1 sm:col-span-2 p-3 rounded-xl border" style="border-color: #BFDBFE; background: #EFF6FF;">
                <label class="text-xs font-bold text-blue-700 flex items-center gap-1"><i class="fas fa-eye"></i> سجل العيون (يُقرأ فقط من قبل طبيب العيون)</label>
                <textarea id="hfEye" class="ctrl-input mt-2" rows="2" placeholder="وصفة النظارة، ضغط العين، عمليات ليزك...">${escapeHtml(safe(data.eye))}</textarea>
            </div>

            <div><label class="text-xs font-bold text-gray-500">اسم جهة الطوارئ</label><input type="text" id="hfEmergencyName" class="ctrl-input" value="${escapeHtml(safe(data.emergency_name))}"></div>
            <div><label class="text-xs font-bold text-gray-500">هاتف جهة الطوارئ</label><input type="tel" id="hfEmergencyPhone" class="ctrl-input" value="${escapeHtml(safe(data.emergency_phone))}"></div>
            <button type="submit" class="col-span-1 sm:col-span-2 py-3 rounded-xl text-white font-bold text-sm" style="background: #EC4899"><i class="fas fa-save ml-2"></i> حفظ التحديثات</button>
        </form>

        <div class="bg-white p-5 rounded-xl border" style="border-color: var(--border)">
            <h4 class="font-bold mb-4 text-sm flex items-center gap-2"><i class="fas fa-file-medical text-blue-600"></i> روشتي الطبية السابقة</h4>
            <div class="flex flex-col gap-4 mt-2">
                ${data.prescriptions && data.prescriptions.length > 0
            ? data.prescriptions.slice().reverse().map(rx => `
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
    `, '#EC4899');

    const qrContainer = document.getElementById('qrcode');
    if (qrContainer) {
        qrContainer.innerHTML = '';
        const qrToken = data.qr_token || currentHealthFileId;
        new QRCode(qrContainer, {
            text: qrToken,
            width: 180, height: 180,
            colorDark: "#000000", colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });
    }

    if (window.activeHealthFileSub) supabase.removeChannel(window.activeHealthFileSub);
    window.activeHealthFileSub = supabase
        .channel(`health_files_${data.id}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'health_files', filter: `id=eq.${data.id}` }, payload => {
            supabase.functions.invoke('manage-health-file', { body: { action: 'get' } }).then(({ data: freshData }) => {
                if (freshData) renderHealthDashboard(freshData);
            });
        })
        .subscribe();
};

/**
 * حفظ الملف الصحي
 */
window.saveHealthProfile = async (e) => {
    e.preventDefault();
    const submitBtn = e.target.querySelector('button[type="submit"]');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...';
    }

    const plainData = {
        full_name: document.getElementById('hfFullName').value,
        age: document.getElementById('hfAge').value,
        gender: document.getElementById('hfGender').value,
        blood_type: document.getElementById('hfBloodType').value,
        weight: document.getElementById('hfWeight').value,
        diseases: document.getElementById('hfDiseases').value,
        allergies: document.getElementById('hfAllergies').value,
        medications: document.getElementById('hfMedications').value,
        dental: document.getElementById('hfDental').value,
        eye: document.getElementById('hfEye').value,
        emergency_name: document.getElementById('hfEmergencyName').value,
        emergency_phone: document.getElementById('hfEmergencyPhone').value
    };

    try {
        const { error: funcError } = await supabase.functions.invoke('manage-health-file', {
            body: { action: 'update', data: plainData }
        });
        if (funcError) throw funcError;

        showToast('تم الحفظ والتشفير بنجاح!', 'success');

        const { data: updatedFile } = await supabase.functions.invoke('manage-health-file', { body: { action: 'get' } });
        if (updatedFile) renderHealthDashboard(updatedFile);
    } catch (err) {
        showToast('حدث خطأ: ' + err.message, 'error');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-save ml-2"></i> حفظ التحديثات';
        }
    }
};

/**
 * تجديد رمز QR
 */
window.regenerateQrToken = async () => {
    if (!window.checkOnlineStatus()) return;
    if (!confirm("هل أنت متأكد من تغيير رمز QR؟ سيتم إعادة تشفير بياناتك وروشتاتك السابقة بمفتاح جديد.")) return;
    try {
        const { error: funcError } = await supabase.functions.invoke('manage-health-file', {
            body: { action: 'regenerate_token' }
        });
        if (funcError) throw funcError;

        showToast('تم تغيير الرمز وإعادة تشفير الروشتات بنجاح!', 'success');

        const { data: updatedFile } = await supabase.functions.invoke('manage-health-file', { body: { action: 'get' } });
        if (updatedFile) renderHealthDashboard(updatedFile);
    } catch (err) {
        showToast('حدث خطأ أثناء تغيير الرمز: ' + err.message, 'error');
    }
};

/**
 * تسجيل خروج الملف الصحي
 */
window.logoutHealthFile = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('healthFileId');
    currentHealthFileId = null;
    closeCtrlPanel();
    showToast('تم تسجيل الخروج بنجاح', 'success');
};

/* ═══════════════════════════════════════════════════════════════════
   ═══════════════ 20. VISITORS & ADS ═══════════════
   ═══════════════════════════════════════════════════════════════════ */

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
        // Silent fail
    }
}

function animateCounter(target, elementId) {
    const el = document.getElementById(elementId);
    if (!el) return;

    let current = 0;
    const duration = 2000;
    const stepTime = 30;
    const steps = duration / stepTime;
    const inc = Math.max(1, Math.floor(target / steps));

    const timer = setInterval(() => {
        current += inc;
        if (current >= target) {
            current = target;
            clearInterval(timer);
        }
        el.innerText = current.toLocaleString('ar-EG');
    }, stepTime);
}

/**
 * عرض إعلان
 */
window.renderAdSlide = (index) => {
    const container = document.getElementById('homeAdContainer');
    const dotsContainer = document.getElementById('adDots');
    if (!container || activeAds.length === 0) return;

    const ad = activeAds[index];
    let mediaHTML = '';

    if (adInterval) {
        clearTimeout(adInterval);
        adInterval = null;
    }

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
            </div>
        `;
    }

    container.innerHTML = `<div class="w-full h-full">${mediaHTML}</div>`;

    if (dotsContainer) {
        if (isSingleAd) dotsContainer.innerHTML = '';
        else {
            dotsContainer.innerHTML = activeAds.map((_, i) =>
                `<span class="w-2 h-2 rounded-full bg-white/50 cursor-pointer ${i === index ? 'w-6 bg-white' : ''}" onclick="goToAdSlide(${i})"></span>`
            ).join('');
        }
    }
};

window.nextAdSlide = () => {
    if (activeAds.length === 0) return;
    currentAdIndex = (currentAdIndex + 1) % activeAds.length;
    renderAdSlide(currentAdIndex);
};

window.toggleAdVideoSound = () => {
    const video = document.getElementById('homeAdVideo');
    const icon = document.getElementById('adVideoSoundIcon');
    if (!video) return;
    video.muted = !video.muted;
    if (video.muted) icon.className = 'fas fa-volume-xmark';
    else icon.className = 'fas fa-volume-high';
};

window.prevAdSlide = () => {
    if (activeAds.length === 0) return;
    currentAdIndex = (currentAdIndex - 1 + activeAds.length) % activeAds.length;
    renderAdSlide(currentAdIndex);
};

window.goToAdSlide = (index) => {
    currentAdIndex = index;
    renderAdSlide(currentAdIndex);
};

window.saveHomeAd = async (e) => {
    e.preventDefault();
    const type = document.getElementById('adType').value;
    const content = document.getElementById('adContent').value.trim();
    const link = document.getElementById('adLink').value.trim();
    if (!content) {
        showToast('الرجاء إدخال رابط');
        return;
    }
    try {
        await supabase.from('homepage_ads').insert([{ type, content, link, is_active: true }]);
        await supabase.from('app_config').upsert({ id: 'ads_sync', last_update: Date.now() });
        showToast('تم الحفظ!');
        e.target.reset();
        fetchHomeAdsForAdmin();
    } catch (err) {
        showToast('خطأ');
    }
};

window.toggleHomeAdStatus = async (id, status) => {
    if (!window.checkOnlineStatus()) return;
    try {
        await supabase.from('homepage_ads').update({ is_active: status }).eq('id', id);
        await supabase.from('app_config').upsert({ id: 'ads_sync', last_update: Date.now() });
        showToast('تم التحديث');
        fetchHomeAdsForAdmin();
    } catch (err) {
        showToast('خطأ');
    }
};

window.deleteHomeAd = async (id) => {
    if (!window.checkOnlineStatus()) return;
    try {
        await supabase.from('homepage_ads').delete().eq('id', id);
        await supabase.from('app_config').upsert({ id: 'ads_sync', last_update: Date.now() });
        showToast('تم الحذف');
        fetchHomeAdsForAdmin();
    } catch (err) {
        showToast('خطأ');
    }
};

async function fetchHomeAdsForAdmin() {
    const { data } = await supabase.from('homepage_ads').select('*');
    allHomeAds = data || [];

    const list = document.getElementById('adminHomeAdsList');
    if (!list) return;
    if (allHomeAds.length === 0) {
        list.innerHTML = '<p class="text-center text-gray-400 text-sm">لا توجد إعلانات.</p>';
        return;
    }
    list.innerHTML = allHomeAds.map(ad => `
        <div class="flex items-center justify-between p-2 rounded-lg border">
            <div class="text-xs truncate flex-1 flex items-center gap-2">
                <i class="fas ${ad.type === 'image' ? 'fa-image text-blue-500' : 'fa-video text-purple-500'}"></i>
                <span class="truncate">${escapeHtml(ad.content.substring(0, 30))}...</span>
            </div>
            <div class="flex gap-1 mr-2">
                <button onclick="toggleHomeAdStatus('${ad.id}', ${!ad.is_active})" class="px-2 py-1 rounded text-xs ${ad.is_active ? 'bg-green-500 text-white' : 'bg-gray-200'}">${ad.is_active ? 'مفعّل' : 'معطّل'}</button>
                <button onclick="deleteHomeAd('${ad.id}')" class="px-2 py-1 rounded text-xs bg-red-500 text-white"><i class="fas fa-trash"></i></button>
            </div>
        </div>
    `).join('');
}

async function fetchHomeAdsPublic() {
    const cachedAds = localStorage.getItem('cached_home_ads');
    if (cachedAds) {
        activeAds = JSON.parse(cachedAds);
        const section = document.getElementById('homeMediaAdsSection');
        if (activeAds.length === 0) section.classList.add('hidden');
        else {
            section.classList.remove('hidden');
            currentAdIndex = 0;
            renderAdSlide(currentAdIndex);
        }
    }

    const { data: configSnap } = await supabase.from('app_config').select('last_update').eq('id', 'ads_sync').single();
    let serverTime = configSnap?.last_update || 0;

    if (serverTime === 0) {
        await supabase.from('app_config').upsert({ id: 'ads_sync', last_update: Date.now() });
        serverTime = Date.now();
    }

    const localTime = parseInt(localStorage.getItem('ads_last_fetch') || '0');

    if (serverTime > localTime) {
        const { data: snap } = await supabase.from('homepage_ads').select('*').eq('is_active', true).limit(5);
        activeAds = snap || [];

        const section = document.getElementById('homeMediaAdsSection');
        if (activeAds.length === 0) {
            section.classList.add('hidden');
            if (adInterval) clearTimeout(adInterval);
        } else {
            section.classList.remove('hidden');
            currentAdIndex = 0;
            renderAdSlide(currentAdIndex);
        }

        try {
            localStorage.setItem('cached_home_ads', JSON.stringify(activeAds));
            localStorage.setItem('ads_last_fetch', serverTime.toString());
        } catch (e) { /* Quota exceeded */ }
    }
}

fetchHomeAdsPublic();
fetchAnnouncements();

/* ═══════════════════════════════════════════════════════════════════
   ═══════════════ 21. EMERGENCY CONTACTS ═══════════════
   ═══════════════════════════════════════════════════════════════════ */

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
    } catch (err) {
        showToast('حدث خطأ في الإضافة', 'error');
    }
};

window.deleteEmergencyContact = async (id) => {
    try {
        await supabase.from('emergency_contacts').delete().eq('id', id);
        showToast('تم حذف الرقم', 'success');
        fetchEmergencyContacts();
        renderAdminEmergencyList();
    } catch (err) {
        showToast('خطأ في الحذف', 'error');
    }
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

/**
 * إخفاء زر الطوارئ العائم
 */
window.hideEmergencyFab = () => {
    const wrapper = document.getElementById('emergencyFabWrapper');
    if (wrapper) wrapper.classList.add('hidden-fab');
};

/**
 * فتح/إغلاق نافذة الطوارئ
 */
window.toggleEmergencyPopup = () => {
    const popup = document.getElementById('emergencyPopup');
    if (popup) popup.classList.toggle('show');
};

/* ═══════════════════════════════════════════════════════════════════
   ═══════════════ 22. BLOG & ARTICLES ═══════════════
   ═══════════════════════════════════════════════════════════════════ */

window.openMedicalBlog = () => {
    const skeletonHtml = `
        <div class="flex flex-col gap-4">
            <div class="flex flex-col sm:flex-row-reverse bg-white border rounded-2xl overflow-hidden" style="border-color: var(--border);">
                <div class="w-full sm:w-44 h-40 sm:h-auto flex-shrink-0 bg-gray-100"><div class="skeleton-loader w-full h-full"></div></div>
                <div class="p-4 flex flex-col flex-1 justify-center gap-3">
                    <div class="skeleton-loader" style="width: 75%; height: 24px;"></div>
                    <div class="skeleton-loader" style="width: 100%; height: 12px;"></div>
                    <div class="skeleton-loader" style="width: 50%; height: 12px;"></div>
                </div>
            </div>
        </div>
    `;

    openCtrlPanel('المدونة والمقالات الطبية', `
        <div class="flex flex-col gap-4">
            <div class="bg-blue-50 border border-blue-200 rounded-xl p-4 text-blue-800 text-sm flex items-center gap-3">
                <i class="fas fa-book-medical text-xl"></i>
                <span>مكتبة طبية شاملة. اقرأ أحدث المقالات المكتوبة بمراجعة طبية.</span>
            </div>

            <div class="bg-gradient-to-l from-amber-50 to-orange-50 rounded-2xl p-4 border border-amber-200">
                <h4 class="font-bold text-sm text-amber-800 mb-3 flex items-center gap-2"><i class="fas fa-fire"></i> الأكثر قراءةً</h4>
                <div id="trendingArticlesList" class="flex gap-3 overflow-x-auto pb-2">
                    <div class="flex-shrink-0 w-40">
                        <div class="skeleton-loader w-full h-24 mb-2"></div>
                        <div class="skeleton-loader w-full h-3 mb-1"></div>
                        <div class="skeleton-loader w-3/4 h-3"></div>
                    </div>
                </div>
            </div>

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

            <div id="blogArticlesList" class="flex flex-col gap-4">${skeletonHtml}</div>
            ${generateToolSEOHtml('blog')}
        </div>
    `, '#0E7C5F');
    fetchTrendingArticles();
    fetchArticles();
};

async function fetchTrendingArticles() {
    const container = document.getElementById('trendingArticlesList');
    if (!container) return;

    const { data, error } = await supabase.from('medical_articles').select('*').order('views', { ascending: false }).limit(5);
    if (error || !data || data.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-400 text-sm w-full">لا توجد مقالات رائجة بعد.</p>';
        return;
    }

    container.innerHTML = data.map(art => `
        <div onclick="openArticleReader('${art.id}')" class="flex-shrink-0 w-40 cursor-pointer group">
            <div class="w-full h-24 rounded-xl overflow-hidden bg-gray-100 mb-2">
                ${art.image_url ? `<img src="${escapeHtml(art.image_url)}" class="w-full h-full object-cover group-hover:scale-105 transition-transform">` : `<div class="w-full h-full flex items-center justify-center"><i class="fas fa-notes-medical text-2xl text-gray-200"></i></div>`}
            </div>
            <h5 class="text-xs font-bold text-gray-700 line-clamp-2 group-hover:text-amber-600">${escapeHtml(art.title)}</h5>
        </div>
    `).join('');
}

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

    const btn = document.querySelector(`.save-art-btn[data-id="${id}"]`);
    if (btn) {
        const isSaved = savedArticleIds.includes(id);
        btn.innerHTML = isSaved ? '<i class="fas fa-bookmark text-yellow-500"></i>' : '<i class="far fa-bookmark"></i>';
    }
};

window.showSavedArticles = async () => {
    currentBlogCategory = 'all';
    const catText = document.getElementById('currentBlogCategoryText');
    if (catText) catText.innerText = 'كل التصنيفات';
    const searchInput = document.getElementById('blogSearchInput');
    if (searchInput) searchInput.value = '';

    const listContainer = document.getElementById('blogArticlesList');
    if (savedArticleIds.length === 0) {
        listContainer.innerHTML = '<p class="text-center py-10 text-gray-400 text-sm">لا توجد مقالات محفوظة بعد.</p>';
        return;
    }

    listContainer.innerHTML = '<p class="text-center py-10 text-gray-400 text-sm">جاري تحميل المحفوظات...</p>';
    const { data, error } = await supabase.from('medical_articles').select('*').in('id', savedArticleIds).order('created_at', { ascending: false });
    if (error || !data) {
        listContainer.innerHTML = '<p class="text-center text-red-500 text-sm py-4">خطأ في التحميل.</p>';
        return;
    }
    allArticles = data || [];
    renderArticlesList(allArticles);
};

async function fetchArticles(searchQuery = '') {
    const listContainer = document.getElementById('blogArticlesList');
    if (!listContainer) return;

    let query = supabase.from('medical_articles').select('*').order('created_at', { ascending: false });
    if (searchQuery) query = query.or(`title.ilike.%${searchQuery}%,content.ilike.%${searchQuery}%`);
    if (currentBlogCategory !== 'all') query = query.eq('category', currentBlogCategory);

    const { data, error } = await query.limit(30);
    if (error) {
        listContainer.innerHTML = '<p class="text-center text-red-500 text-sm py-4">خطأ في تحميل المقالات.</p>';
        return;
    }
    allArticles = data || [];
    renderArticlesList(allArticles);
}

function renderArticlesList(articles) {
    const listContainer = document.getElementById('blogArticlesList');
    if (!listContainer) return;
    if (articles.length === 0) {
        listContainer.innerHTML = '<p class="text-center py-10 text-gray-400 text-sm">لا توجد مقالات مطابقة حالياً.</p>';
        return;
    }

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
            </div>
        `;
    }).join('');
}

function parseArticleContent(text) {
    let html = escapeHtml(text);
    html = html.replace(/^&gt;\s?(.*)$/gm, '<div class="my-4 p-4 bg-red-50 border-r-4 border-red-500 rounded-xl flex items-start gap-3"><i class="fas fa-exclamation-triangle text-red-500 mt-1"></i><div class="text-sm text-red-800 font-semibold">$1</div></div>');
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-gray-900">$1</strong>');
    html = html.replace(/^([^\n]+?):/gm, '<strong class="font-bold text-gray-900">$1:</strong>');
    return html;
}

let currentFontSize = 1;
let isSpeaking = false;

window.openArticleReader = async (id) => {
    let article = allArticles.find(a => a.id == id);

    if (!article) {
        showToast('جاري فتح المقال...', 'info');
        const { data, error } = await supabase.from('medical_articles').select('*').eq('id', id).single();
        if (data) {
            allArticles.push(data);
            article = data;
        } else {
            showToast('تعذر العثور على المقال', 'error');
            return;
        }
    }

    window.location.hash = `article=${id}`;
    updateMetaTags(
        `${article.title} | Lomedx`,
        article.excerpt || article.content.substring(0, 150),
        article.image_url || 'https://i.ibb.co/d09VBmky/37414.png'
    );

    supabase.from('medical_articles').update({ views: (article.views || 0) + 1 }).eq('id', id).then();

    const dateStr = new Date(article.created_at).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' });

    const authorDisplay = article.author_name ? `
        <div class="flex items-center gap-2 mt-2 mb-4 p-3 bg-blue-50 rounded-xl">
            <i class="fas fa-user-md text-blue-600"></i>
            <div>
                <span class="font-bold text-sm text-gray-800">${escapeHtml(article.author_name)}</span>
                <span class="text-xs text-gray-500 block">${escapeHtml(article.author_credential || 'طبيب مختص')}</span>
            </div>
        </div>
    ` : '';

    const wordCount = article.content.split(/\s+/).length;
    const readingTime = Math.max(1, Math.ceil(wordCount / 200));
    const processedContent = parseArticleContent(article.content);
    currentFontSize = 1;
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();

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
            </div>
        `;
    }

    document.getElementById('modalContent').innerHTML = `
        <div class="flex flex-col h-full">
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
                    </div>
                ` : `
                    <div class="p-5 border-b" style="border-color: var(--border);">
                        <span class="text-xs bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full font-bold">${escapeHtml(article.category || 'طب عام')}</span>
                        <h2 class="text-2xl sm:text-3xl font-black text-gray-800 mt-3" style="font-family: 'Noto Kufi Arabic';">${escapeHtml(article.title)}</h2>
                    </div>
                `}
            </div>
            <div class="p-6 sm:p-8">
                ${!article.image_url ? `<h2 class="text-2xl sm:text-3xl font-black text-gray-800 mb-3" style="font-family: 'Noto Kufi Arabic';">${escapeHtml(article.title)}</h2>` : ''}
                ${authorDisplay}
                <div id="articleContentText" class="prose max-w-none text-gray-700 leading-loose space-y-4 transition-all" style="font-family: 'IBM Plex Sans Arabic'; font-size: ${currentFontSize}rem;">${processedContent}</div>

                <div class="mt-8 p-6 bg-gradient-to-l from-blue-50 to-sky-50 rounded-2xl border border-blue-200 text-center">
                    <div class="w-12 h-12 mx-auto rounded-full bg-blue-100 flex items-center justify-center mb-3">
                        <i class="fas fa-user-md text-2xl text-blue-600"></i>
                    </div>
                    <h4 class="font-bold text-base text-blue-900 mb-2">هل تحتاج إلى استشارة طبية؟</h4>
                    <p class="text-xs text-blue-700 mb-4 max-w-md mx-auto">لا تعتمد على المقالات فقط. تواصل مباشرةً مع أطباء متخصصين عبر منصة لوميديكس.</p>
                    <div class="flex flex-col sm:flex-row gap-3 justify-center w-full max-w-md mx-auto">
                        <button onclick="closeAllOverlays(); openAskDoctor()" class="flex-1 min-w-[160px] bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors shadow-md flex items-center justify-center gap-1">
                            <i class="fas fa-comments"></i> اسأل طبيباً الآن
                        </button>
                        <button onclick="closeAllOverlays(); redirectToDoctorsSearch('${escapeHtml(article.category || '')}')" class="flex-1 min-w-[160px] bg-white border border-blue-200 text-blue-700 px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-blue-50 transition-colors shadow-sm flex items-center justify-center gap-1">
                            <i class="fas fa-search"></i> ابحث عن طبيب مختص
                        </button>
                    </div>
                </div>

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

    const articleSchema = {
        "@context": "https://schema.org",
        "@type": "MedicalWebPage",
        "headline": article.title,
        "description": article.excerpt || article.content.substring(0, 150),
        "datePublished": article.created_at,
        "image": { "@type": "ImageObject", "url": article.image_url || "https://i.ibb.co/d09VBmky/37414.png" },
        "author": {
            "@type": "Physician",
            "name": article.author_name || "Lomedx Medical Team",
            "jobTitle": article.author_credential || "طبيب مختص"
        },
        "publisher": {
            "@type": "Organization",
            "name": "Lomedx",
            "logo": { "@type": "ImageObject", "url": "https://i.ibb.co/d09VBmky/37414.png" }
        },
        "text": article.content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'dynamicArticleSchema';
    script.textContent = JSON.stringify(articleSchema);
    document.head.appendChild(script);
};

window.rateArticle = async (id, isHelpful) => {
    id = String(id);

    if (ratedArticleIds.includes(id)) {
        showToast('لقد قمت بتقييم هذا المقال مسبقاً');
        return;
    }

    showToast('شكراً لتقييمك!', 'success');

    ratedArticleIds.push(id);
    localStorage.setItem('lomedx_rated_articles', JSON.stringify(ratedArticleIds));

    document.querySelectorAll('.rate-btn').forEach(b => {
        b.disabled = true;
        b.classList.add('opacity-50', 'cursor-not-allowed');
    });
    const ratingBox = document.getElementById('ratingBox');
    if (ratingBox) {
        ratingBox.style.opacity = '0.5';
        const span = ratingBox.querySelector('span');
        if (span) span.innerText = 'شكراً لتقييمك!';
    }

    const { data } = await supabase.from('medical_articles').select('likes, dislikes').eq('id', id).single();
    if (!data) return;

    const update = {};
    if (isHelpful) update.likes = (data.likes || 0) + 1;
    else update.dislikes = (data.dislikes || 0) + 1;

    await supabase.from('medical_articles').update(update).eq('id', id);
};

window.changeFontSize = (delta) => {
    currentFontSize = Math.max(0.8, Math.min(1.8, currentFontSize + delta));
    const contentDiv = document.getElementById('articleContentText');
    if (contentDiv) contentDiv.style.fontSize = `${currentFontSize}rem`;
};

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
};

window.shareArticle = (title) => {
    const url = window.location.href;
    const text = `مقال طبي مفيد من منصة Lomedx:\n\n${title}\n\nاقرأ المقال كاملاً من هنا:\n${url}`;

    if (navigator.share) {
        navigator.share({ title: 'Lomedx', text: text, url: url }).catch(() => { /* user cancelled */ });
    } else {
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    }
};

/* ═══════════════════════════════════════════════════════════════════
   ═══════════════ 23. ADMIN ARTICLES ═══════════════
   ═══════════════════════════════════════════════════════════════════ */

window.saveArticle = async (e) => {
    e.preventDefault();
    const id = document.getElementById('editArtId').value;
    const title = document.getElementById('artTitle').value.trim();
    const category = document.getElementById('artCategory').value.trim();
    const image = document.getElementById('artImage').value.trim();
    const content = document.getElementById('artContent').value.trim();
    const excerpt = document.getElementById('artExcerpt').value.trim() || content.substring(0, 150);
    const authorName = document.getElementById('artAuthorName').value.trim();
    const authorCredential = document.getElementById('artAuthorCredential').value.trim();

    try {
        if (id) {
            await supabase.from('medical_articles').update({
                title, category, image_url: image, content, excerpt,
                author_name: authorName, author_credential: authorCredential
            }).eq('id', id);
            showToast('تم حفظ التعديلات بنجاح!', 'success');
        } else {
            await supabase.from('medical_articles').insert([{
                title, category, image_url: image, content, excerpt,
                author_name: authorName, author_credential: authorCredential
            }]);
            showToast('تم نشر المقال بنجاح!', 'success');
        }
        resetArticleForm();
        fetchAdminArticles();
    } catch (err) {
        showToast('خطأ في الحفظ', 'error');
    }
};

window.editArticle = (id) => {
    const art = adminArticlesCache.find(a => a.id == id);
    if (!art) return;

    document.getElementById('editArtId').value = art.id;
    document.getElementById('artTitle').value = art.title;
    document.getElementById('artCategory').value = art.category || '';
    document.getElementById('artImage').value = art.image_url || '';
    document.getElementById('artExcerpt').value = art.excerpt || '';
    document.getElementById('artContent').value = art.content;

    document.getElementById('artSubmitBtn').innerText = 'حفظ التعديلات';
    document.getElementById('artSubmitBtn').style.background = '#F59E0B';
    document.getElementById('artCancelBtn').classList.remove('hidden');

    document.getElementById('artTitle').scrollIntoView({ behavior: 'smooth', block: 'center' });
};

window.resetArticleForm = () => {
    document.getElementById('articleForm').reset();
    document.getElementById('editArtId').value = '';
    document.getElementById('artSubmitBtn').innerText = 'نشر المقال';
    document.getElementById('artSubmitBtn').style.background = '#2563EB';
    document.getElementById('artCancelBtn').classList.add('hidden');
};

window.deleteArticle = async (id) => {
    if (!window.checkOnlineStatus()) return;
    if (!confirm("هل أنت متأكد من حذف هذا المقال؟")) return;
    try {
        await supabase.from('medical_articles').delete().eq('id', id);
        showToast('تم حذف المقال', 'success');
        fetchAdminArticles();
    } catch (err) {
        showToast('خطأ في الحذف', 'error');
    }
};

async function fetchAdminArticles() {
    const list = document.getElementById('adminArticlesList');
    if (!list) return;
    const { data, error } = await supabase.from('medical_articles').select('*').order('created_at', { ascending: false });
    if (error || !data) {
        list.innerHTML = '<p class="text-center text-gray-400 text-sm py-2">لا توجد مقالات.</p>';
        return;
    }
    if (data.length === 0) {
        list.innerHTML = '<p class="text-center text-gray-400 text-sm py-2">لا توجد مقالات منشورة بعد.</p>';
        return;
    }

    adminArticlesCache = data;

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

    list.querySelectorAll('.edit-art-btn').forEach(btn => {
        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            window.editArticle(this.getAttribute('data-id'));
        });
    });

    list.querySelectorAll('.delete-art-btn').forEach(btn => {
        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            window.deleteArticle(this.getAttribute('data-id'));
        });
    });
}

/* ═══════════════════════════════════════════════════════════════════
   ═══════════════ 24. BLOG CATEGORIES ═══════════════
   ═══════════════════════════════════════════════════════════════════ */

window.openBlogCategory = () => {
    const overlay = document.getElementById('blogCategoryOverlay');
    const listContainer = document.getElementById('blogCategoryList');
    if (!overlay || !listContainer) return;

    let cats = ['كل التصنيفات'];
    allArticles.forEach(a => {
        if (a.category && !cats.includes(a.category)) cats.push(a.category);
    });

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
    currentBlogCategory = (cat === 'كل التصنيفات') ? 'all' : cat;

    const catText = document.getElementById('currentBlogCategoryText');
    if (catText) catText.innerText = cat;

    closeBlogCategory();

    const searchInput = document.getElementById('blogSearchInput');
    fetchArticles(searchInput ? searchInput.value : '');
};

/* ═══════════════════════════════════════════════════════════════════
   ═══════════════ 25. TOGGLE ACCORDION (موحّد) ═══════════════
   ═══════════════════════════════════════════════════════════════════ */

window.toggleAccordion = (el) => {
    if (el) {
        const item = el.parentElement;
        if (!item) return;
        const isActive = item.classList.contains('active');

        const siblings = item.parentElement?.querySelectorAll('.accordion-item') || [];
        siblings.forEach(i => {
            if (i !== item) i.classList.remove('active');
        });

        item.classList.toggle('active');
    } else {
        const accordion = document.getElementById('toolsAccordion');
        if (accordion) accordion.classList.toggle('accordion-active');
    }
};

/* ═══════════════════════════════════════════════════════════════════
   ═══════════════ 26. OFFLINE / ONLINE STATUS ═══════════════
   ═══════════════════════════════════════════════════════════════════ */

window.addEventListener('offline', () => {
    showToast('⚠️ يبدو أنك فقدت اتصالك بالإنترنت. التصفح متاح، لكن الحجز والدردشة وأستغاثة معطلة حتى عودة الاتصال.', 'error');
});

window.addEventListener('online', () => {
    showToast('✅ عاد الاتصال بالإنترنت! يمكنك الآن استخدام جميع الميزات بسلام.', 'success');
});

window.checkOnlineStatus = () => {
    if (!navigator.onLine) {
        showToast('لا يمكن إتمام هذه العملية. أنت غير متصل بالإنترنت حالياً.', 'error');
        return false;
    }
    return true;
};

/* ═══════════════════════════════════════════════════════════════════
   ═══════════════ 27. SERVICE WORKER + PWA ═══════════════
   ═══════════════════════════════════════════════════════════════════ */

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('OneSignalSDKWorker.js').then(reg => {
            navigator.serviceWorker.addEventListener('message', event => {
                if (event.data && event.data.type === 'SW_VERSION_REPLY') {
                    const newVersion = event.data.version;
                    const savedVersion = localStorage.getItem('lomedx_sw_version');

                    if (newVersion !== savedVersion) {
                        showUpdateToast(newVersion);
                    }
                }
            });

            if (navigator.serviceWorker.controller) {
                navigator.serviceWorker.controller.postMessage({ type: 'GET_VERSION' });
            }

            reg.addEventListener('updatefound', () => {
                const newWorker = reg.installing;
                if (!newWorker) return;
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        newWorker.postMessage({ type: 'GET_VERSION' });
                    }
                });
            });
        });
    });

    function showUpdateToast(newVersion) {
        const toast = document.getElementById('toast');
        if (toast.classList.contains('show') && toast.innerHTML.includes('يتوفر إصدار جديد')) return;

        toast.innerHTML = `
            <div class="flex flex-col items-center gap-3 w-full">
                <div class="text-sm font-bold text-blue-800">🎉 يتوفر إصدار جديد من المنصة (${newVersion}).</div>
                <div class="flex gap-2">
                    <button id="updateBtn" class="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 transition-all">تحديث الآن</button>
                </div>
            </div>
        `;
        toast.style.backgroundColor = '#EFF6FF';
        toast.classList.add('show');

        document.getElementById('updateBtn').onclick = () => {
            localStorage.setItem('lomedx_sw_version', newVersion);

            navigator.serviceWorker.getRegistration().then(reg => {
                if (reg && reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
                else window.location.reload();
            });
        };
    }

    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
    });
}

/**
 * PWA Installer
 */
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
        const installBtn = document.getElementById('pwa-install-btn');
        if (installBtn) installBtn.style.display = visible ? 'block' : 'none';
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

                    if (outcome === 'accepted') showToast('جاري إضافة التطبيق إلى جهازك...', 'info');
                    else showToast('تم إغلاق نافذة التثبيت. يمكنك المحاولة لاحقاً.', 'info');

                    deferredPrompt = null;
                    toggleInstallButtonState(false);
                    return;
                }

                if (isIos()) {
                    showToast('لتثبيت التطبيق: اضغط زر المشاركة ⎘ أسفل الشاشة، ثم اختر "إضافة إلى الشاشة الرئيسية ⊕".', 'info');
                    return;
                }

                showToast('التثبيت المباشر غير متاح حالياً. يمكنك إضافته من قائمة المتصفح (ثلاث نقاط) -> "إضافة إلى الشاشة الرئيسية".', 'warning');
            } catch (error) {
                showToast('تعذر تعقب طلب التثبيت، يرجى المحاولة لاحقاً.', 'error');
            }
        }
    };
})();

window.installPwaApp = () => PwaInstaller.install();

/* ═══════════════════════════════════════════════════════════════════
   ═══════════════ 28. SMART MENU (إبقاء القائمة مفتوحة) ═══════════════
   ═══════════════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {

    // Realtime updates للأطباء
    supabase
        .channel('public:listings_updates')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'listings' }, payload => {
            const updatedItem = allData.find(d => d.id === payload.new.id);
            if (updatedItem) {
                updatedItem.current_queue = payload.new.current_queue;
                updatedItem.phone_clicks = payload.new.phone_clicks;
                updatedItem.view_count = payload.new.view_count;

                const docQueueCountEl = document.getElementById('docQueueCount');
                if (docQueueCountEl) docQueueCountEl.innerText = updatedItem.current_queue || 0;

                const docViewCountEl = document.getElementById('docViewCount');
                if (docViewCountEl) docViewCountEl.innerText = updatedItem.view_count || 0;

                const docPhoneClicksEl = document.getElementById('docPhoneClicks');
                if (docPhoneClicksEl) docPhoneClicksEl.innerText = updatedItem.phone_clicks || 0;

                const modalContent = document.getElementById('modalContent');
                if (modalContent && modalContent.innerHTML.includes(payload.new.id) && payload.new.type === 'doctor') {
                    const lqCount = modalContent.querySelector('.lq-count');
                    const lqTime = modalContent.querySelector('.lq-time');
                    if (lqCount) {
                        const qCount = payload.new.current_queue || 0;
                        const waitTime = payload.new.avg_wait_time || 15;
                        lqCount.innerHTML = `${qCount} <span style="font-size:12px; color:#8ea8a1;">منتظر</span>`;
                        if (lqTime) lqTime.innerText = `~ ${qCount * waitTime} دقيقة`;
                    }
                }
            }
        })
        .subscribe();

    const mobileMenu = document.getElementById('mobileMenu');
    const menuOverlay = document.getElementById('menuOverlay');
    if (!mobileMenu) return;

    let openedFromMenu = false;

    window.closeAllOverlays = () => {
        openedFromMenu = false;
        closeModal();
        closeCtrlPanel();

        if (mobileMenu && mobileMenu.classList.contains('open')) {
            mobileMenu.classList.remove('open');
            menuOverlay.classList.add('hidden');
            unlockScroll();
        }
    };

    mobileMenu.querySelectorAll('a, button').forEach(btn => {
        const onclickVal = btn.getAttribute('onclick');
        const hrefVal = btn.getAttribute('href');

        const isOpeningLink = (hrefVal && hrefVal.startsWith('/') && !hrefVal.startsWith('//')) ||
            (onclickVal && (onclickVal.includes('open') || onclickVal.includes('show') || onclickVal.includes('toggleEmergency')));

        if (isOpeningLink) {
            if (onclickVal && onclickVal.includes('toggleMobileMenu()')) {
                btn.setAttribute('onclick', onclickVal.replace(/toggleMobileMenu\(\);?\s*/g, ''));
            }

            btn.addEventListener('click', () => {
                openedFromMenu = true;
                menuOverlay.classList.add('hidden');
                mobileMenu.classList.remove('open');
                unlockScroll();
            });
        }
    });

    // اعتراض إغلاق CtrlPanel
    const originalCloseCtrl = window.closeCtrlPanel;
    window.closeCtrlPanel = (event) => {
        originalCloseCtrl(event);

        if (openedFromMenu) {
            openedFromMenu = false;
            setTimeout(() => {
                mobileMenu.classList.add('open');
                menuOverlay.classList.remove('hidden');
                lockScroll();
            }, 150);
        }
    };

    // اعتراض إغلاق Modal
    const originalCloseModal = window.closeModal;
    window.closeModal = (event) => {
        originalCloseModal(event);

        const isCtrlActive = document.getElementById('ctrlOverlay')?.classList.contains('active');

        if (openedFromMenu && !isCtrlActive) {
            openedFromMenu = false;
            setTimeout(() => {
                mobileMenu.classList.add('open');
                menuOverlay.classList.remove('hidden');
                lockScroll();
            }, 150);
        }
    };
});

/* ═══════════════════════════════════════════════════════════════════
   ═══════════════ 29. PAGE VISIBILITY MANAGEMENT ═══════════════
   ═══════════════════════════════════════════════════════════════════ */

let pageVisibilityTimers = {};

document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        if (window.activeFollowupInterval) {
            clearInterval(window.activeFollowupInterval);
            pageVisibilityTimers.followup = currentFollowupBookingId;
        }
        if (tipInterval) {
            clearInterval(tipInterval);
            pageVisibilityTimers.tips = true;
        }
        if (window.activeHealthFileSub) {
            supabase.removeChannel(window.activeHealthFileSub);
        }
    } else if (pageVisibilityTimers.followup || pageVisibilityTimers.tips) {
        if (pageVisibilityTimers.followup) {
            supabase.rpc('get_booking_by_id', { p_booking_id: pageVisibilityTimers.followup }).then(({ data }) => {
                if (data) renderFollowupChat(pageVisibilityTimers.followup);
            });

            window.activeFollowupInterval = setInterval(async () => {
                if (!document.getElementById('followupContent')) {
                    clearInterval(window.activeFollowupInterval);
                    return;
                }
                const { data: freshBooking } = await supabase.rpc('get_booking_by_id', { p_booking_id: currentFollowupBookingId }).maybeSingle();
                if (freshBooking) renderFollowupChat(currentFollowupBookingId);
            }, 3000);
        }

        if (pageVisibilityTimers.tips) {
            updateTipDisplay();
            tipInterval = setInterval(updateTipDisplay, 12000);
        }

        pageVisibilityTimers = {};
    }
});

/**
 * إيقاف أنيميشن الهيرو عند التمرير لأسفل
 */
const heroSection = document.getElementById('home');
const heroBg = document.querySelector('.hero-bg');
if (heroSection && heroBg) {
    const heroObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) heroBg.classList.remove('paused-anim');
            else heroBg.classList.add('paused-anim');
        });
    }, { threshold: 0.1 });
    heroObserver.observe(heroSection);
}

/* ═══════════════════════════════════════════════════════════════════
   ═══════════════ 30. ROUTING (History API) ═══════════════
   ═══════════════════════════════════════════════════════════════════ */

const routesConfig = {
    '/blog': { title: 'المدونة والمقالات الطبية | LomedX', desc: 'مكتبة طبية شاملة.', keywords: 'مقالات طبية, مدونة صحة, نصائح طبية, Lomedx', handler: 'openMedicalBlog' },
    '/blood-bank': { title: 'بنك التبرع بالدم الرقمي | LomedX', desc: 'ربط المرضى بالدم بالمتبرعين.', keywords: 'بنك الدم, تبرع بالدم, استغاثة دم, سوريا, Lomedx', handler: 'openBloodBank' },
    '/first-aid': { title: 'دليل الإسعافات الأولية | LomedX', desc: 'التعامل مع الحوادث والطوارئ.', keywords: 'إسعافات أولية, طوارئ, إنعاش قلبي, حروق, Lomedx', handler: 'openFirstAid' },
    '/ask-doctor': { title: 'اسأل طبيب | LomedX', desc: 'استشارة طبية مجانية.', keywords: 'اسأل طبيب, استشارة طبية, سؤال طبي, Lomedx', handler: 'openAskDoctor' },
    '/medicine-finder': { title: 'ابحث عن دوائك | LomedX', desc: 'بحث عن الدواء في صيدليات مدينتك.', keywords: 'بحث عن دواء, صيدليات سوريا, طلب دواء, Lomedx', handler: 'openMedicineFinder' },
    '/health-file': { title: 'الملف الصحي الذكي | LomedX', desc: 'سجلك الطبي المشفر.', keywords: 'ملف صحي, سجل طبي إلكتروني, رمز QR طبي, Lomedx', handler: 'openHealthFile' },
    '/burn-calculator': { title: 'مُسعف الحروق الذكي | LomedX', desc: 'إسعافات أولية للحروق.', keywords: 'حرق, إسعاف حروق, حرق بالماء الساخن, Lomedx', handler: 'openBurnCalculator' },
    '/raheba-radar': { title: 'الرادار الصحي التفاعلي | LomedX', desc: 'رصد الأمراض الموسمية.', keywords: 'رادار صحي, أمراض موسمية, إنفلونزا, Lomedx', handler: 'openRahebaRadar' },
    '/medicine-donation': { title: 'مركز الأجهزة الطبية | LomedX', desc: 'تبادل الأجهزة الطبية.', keywords: 'تبرع أجهزة طبية, كرسي متحرك, Lomedx', handler: 'openMedicineDonation' },
    '/medical-map': { title: 'الخريطة الطبية | LomedX', desc: 'عرض المنشآت على الخريطة.', keywords: 'خريطة طبية, أقرب مشفى, Lomedx', handler: 'openMedicalMap' },
    '/events-first-aid': { title: 'إسعافات المناسبات | LomedX', desc: 'حوادث التجمعات.', keywords: 'إسعافات المناسبات, حوادث الأفراح, Lomedx', handler: 'openEventsFirstAid' },
    '/pregnancy-calc': { title: 'حاسبة الحمل والولادة | LomedX', desc: 'تطور الجنين أسبوعياً.', keywords: 'حاسبة الحمل, موعد الولادة, تطور الجنين, Lomedx', handler: 'openPregnancyCalc' },
    '/dose-calc': { title: 'حاسبة جرعات الأطفال | LomedX', desc: 'سيتامول وبروفين آمن.', keywords: 'جرعات الأطفال, سيتامول, بروفين, Lomedx', handler: 'openDoseCalc' },
    '/vaccine-scheduler': { title: 'جدول لقاحات الطفل | LomedX', desc: 'حاسبة مواعيد التطعيم.', keywords: 'لقاحات الطفل, جدول التطعيم, Lomedx', handler: 'openVaccineScheduler' },
    '/health-calc': { title: 'حاسبة الصحة | LomedX', desc: 'BMI والسعرات.', keywords: 'حاسبة BMI, السعرات الحرارية, الوزن المثالي, Lomedx', handler: 'openHealthCalc' },
    '/water-calc': { title: 'حاسبة الماء اليومية | LomedX', desc: 'حسب الوزن والطقس.', keywords: 'حاسبة الماء, شرب الماء, الجفاف, Lomedx', handler: 'openWaterCalc' },
    '/med-renewal-calc': { title: 'حاسبة تجديد الدواء | LomedX', desc: 'أسبوعي/شهري.', keywords: 'تجديد الدواء, انتهاء الدواء, Lomedx', handler: 'openMedRenewalCalc' },
    '/med-symbols': { title: 'رموز التحاليل والروشتات | LomedX', desc: 'فهم المصطلحات.', keywords: 'رموز التحاليل, CBC, HbA1c, روشتة طبية, Lomedx', handler: 'openMedSymbols' },
    '/chronic-nutrition': { title: 'تغذية الأمراض المزمنة | LomedX', desc: 'نظام غذائي خاص.', keywords: 'تغذية الأمراض المزمنة, حمية السكري, Lomedx', handler: 'openChronicNutrition' },
    '/pre-visit-guide': { title: 'إرشادات قبل زيارة الطبيب | LomedX', desc: 'دليل الطبيب والمخبر.', keywords: 'زيارة الطبيب, التحضير للطبيب, Lomedx', handler: 'openPreVisitGuide' },
    '/pre-test-guide': { title: 'تعليمات قبل التحاليل | LomedX', desc: 'دليل الفحوصات والأشعة.', keywords: 'التحاليل الطبية, الصيام للتحاليل, إيكو, Lomedx', handler: 'openPreTestGuide' },
    '/food-interactions': { title: 'تعارضات الأدوية والطعام | LomedX', desc: 'جدول الصيدلية.', keywords: 'تعارض الأدوية, الأدوية والطعام, Lomedx', handler: 'openFoodInteractions' },
    '/patient-reminder': { title: 'دفتر التذكير الذاتي | LomedX', desc: 'مواعيد الأدوية والزيارات.', keywords: 'تذكير الأدوية, مواعيد الدواء, Lomedx', handler: 'openPatientReminder' },
    '/seasonal-diseases': { title: 'الأمراض الموسمية الشائعة في منطقة القلمون | LomedX', desc: 'دليل توعوي بأبرز الأمراض المنتشرة في منطقة القلمون موسمياً.', keywords: 'الأمراض الموسمية, الرحيبة, القلمون, Lomedx', handler: 'openSeasonalDiseases' }
};

function handleRouteChange() {
    const path = window.location.pathname;
    if (path === '/' || path === '/index.html') {
        resetMetaTags();
        return;
    }

    const route = routesConfig[path];
    if (route && typeof window[route.handler] === 'function') {
        updateMetaTags(route.title, route.desc, DEFAULT_SEO.image, route.keywords);

        const mobileMenu = document.getElementById('mobileMenu');
        if (mobileMenu && mobileMenu.classList.contains('open')) toggleMobileMenu();

        setTimeout(() => window[route.handler](), 100);
    }
}

window.addEventListener('popstate', handleRouteChange);

document.addEventListener('click', (e) => {
    if (e.defaultPrevented) return;

    const link = e.target.closest('a[href^="/"]');
    if (link && !link.hasAttribute('target') && !link.hasAttribute('download')) {
        if (link.getAttribute('href').startsWith('//')) return;
        e.preventDefault();
        const path = new URL(link.href).pathname;
        history.pushState({}, '', path);
        handleRouteChange();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
});

if (window.location.pathname !== '/' && window.location.pathname !== '/index.html') {
    let isPageReload = false;
    if (window.performance && window.performance.getEntriesByType) {
        const navEntries = window.performance.getEntriesByType('navigation');
        if (navEntries.length > 0 && navEntries[0].type === 'reload') isPageReload = true;
    }
    if (!isPageReload) {
        setTimeout(handleRouteChange, 1200);
    }
}

/* ═══════════════════════════════════════════════════════════════════
   ═══════════════ 31. LMX MODAL — Add Facility ═══════════════
   ═══════════════════════════════════════════════════════════════════ */

/**
 * فتح نافذة إضافة منشأة طبية
 */
window.openAddFacilityModal = () => {
    const overlay = document.getElementById('addFacilityOverlay');
    if (!overlay) return;

    overlay.classList.add('active');

    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    window.__scrollY = window.scrollY;

    setTimeout(() => {
        const firstInput = document.getElementById('facName');
        if (firstInput) firstInput.focus({ preventScroll: true });
    }, 400);
};

/**
 * إغلاق نافذة إضافة المنشأة
 */
window.closeAddFacilityModal = () => {
    const overlay = document.getElementById('addFacilityOverlay');
    if (!overlay) return;

    overlay.classList.remove('active');

    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.width = '';

    if (window.__scrollY !== undefined) {
        window.scrollTo(0, window.__scrollY);
        window.__scrollY = undefined;
    }

    const form = document.getElementById('addFacilityForm');
    if (form) form.reset();

    const submitBtn = document.querySelector('.lmx-form__submit');
    if (submitBtn && submitBtn.disabled) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i><span>إرسال طلب التسجيل</span>';
    }

    if (document.activeElement && document.activeElement.blur) {
        document.activeElement.blur();
    }
};

/**
 * معالج النقر على الخلفية
 */
window.handleOverlayClick = (event) => {
    if (event.target.id === 'addFacilityOverlay') {
        closeAddFacilityModal();
    }
};

// ESC لإغلاق Modal
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const modal = document.getElementById('addFacilityOverlay');
        if (modal && modal.classList.contains('active')) {
            closeAddFacilityModal();
        }
    }
});

/**
 * إرسال طلب إضافة منشأة عبر واتساب
 */
window.submitFacilityRequest = (e) => {
    e.preventDefault();

    const name = document.getElementById('facName').value.trim();
    const type = document.getElementById('facType').value;
    const city = document.getElementById('facCity').value.trim();
    const phone = document.getElementById('facPhone').value.trim();

    if (name.length < 3) {
        showToast('الرجاء إدخال اسم كامل للمنشأة', 'error');
        document.getElementById('facName').focus();
        return;
    }

    const cleanPhone = phone.replace(/[\s\-()]/g, '');
    const phoneRegex = /^(09\d{8}|9\d{8}|\+?9639\d{8})$/;
    if (!phoneRegex.test(cleanPhone)) {
        showToast('الرجاء إدخال رقم هاتف سوري صحيح', 'error');
        document.getElementById('facPhone').focus();
        return;
    }

    if (city.length < 2) {
        showToast('الرجاء إدخال اسم المدينة', 'error');
        document.getElementById('facCity').focus();
        return;
    }

    const submitBtn = document.querySelector('.lmx-form__submit');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>جاري التحويل...</span>';
    }

    const adminWhatsApp = "963980390813";
    const message = [
        '*📋 طلب تسجيل منشأة طبية جديدة على LomedX*',
        '',
        `*🏥 اسم المنشأة/الطبيب:* ${name}`,
        `*📌 النوع:* ${type}`,
        `*📍 المدينة:* ${city}`,
        `*📞 هاتف التواصل:* ${phone}`,
        '',
        '_تم الإرسال من نموذج LomedX_'
    ].join('\n');

    const whatsappUrl = `https://wa.me/${adminWhatsApp}?text=${encodeURIComponent(message)}`;

    setTimeout(() => {
        window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
        showToast('✓ تم تجهيز طلبك! يرجى إرسال الرسالة عبر واتساب.', 'success');
        closeAddFacilityModal();
    }, 400);
};

/**
 * iOS Keyboard Handling
 */
if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', () => {
        const modal = document.querySelector('.lmx-modal__box');
        if (!modal || !modal.closest('.lmx-modal.active')) return;

        const availableHeight = window.visualViewport.height - 40;
        modal.style.maxHeight = Math.min(availableHeight, window.innerHeight * 0.92) + 'px';
    });
}

/* ═══════════════════════════════════════════════════════════════════
   ═══════════════ 32. DETECT USER LOCATION ═══════════════
   ═══════════════════════════════════════════════════════════════════ */

function detectUserLocation() {
    const locationBadge = document.getElementById('userLocationBadge');
    const locationText = document.getElementById('userLocationText');

    if (!locationBadge || !locationText) return;

    locationBadge.style.display = 'none';

    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const { latitude, longitude } = position.coords;
            try {
                const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=ar`);
                const data = await response.json();

                const address = data.address || {};
                const city = address.city || address.town || address.village || address.county || '';
                const state = address.state || '';

                if (city && state) {
                    locationText.innerText = `${city} - ${state}`;
                    locationBadge.style.display = 'inline-flex';
                } else if (city) {
                    locationText.innerText = city;
                    locationBadge.style.display = 'inline-flex';
                }
            } catch (error) {
                // Silent fail
            }
        },
        (error) => {
            // Silent fail
        }
    );
}

/* ═══════════════════════════════════════════════════════════════════
   ═══════════════ 33. SUBSCRIBE TO LISTINGS UPDATES ═══════════════
   ═══════════════════════════════════════════════════════════════════ */

window.addEventListener('load', () => {
    supabase
        .channel('public:listings_realtime')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'listings' }, payload => {
            const item = allData.find(d => d.id === payload.new.id);
            if (item) {
                item.current_queue = payload.new.current_queue;
                item.phone_clicks = payload.new.phone_clicks;
                item.view_count = payload.new.view_count;
            }
        })
        .subscribe();
});

/* ═══════════════════════════════════════════════════════════════════
   ═══════════════ END OF FILE ═══════════════
   ═══════════════════════════════════════════════════════════════════ */

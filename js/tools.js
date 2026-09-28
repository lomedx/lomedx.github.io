/* ═══════════════════════════════════════════════════════════════════
   LomedX — tools.js
   الأدوات الطبية التفاعلية (منفصلة عن app.js للتنظيم)
   ═══════════════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════════════
   ═══════════════ 1. TOOL STATE ═══════════════
   ═══════════════════════════════════════════════════════════════════ */

// حالة حاسبة الحروق
let burnState = { cause: null, degree: null, area: null };

// حالة الرادار الصحي
let currentRadarTab = 'summer';
let currentRadarCity = 'الرحيبة';
let radarSettings = { default_season: 'summer', last_reset: 0 };
let latestRadarReports = [];
let unsubscribeRadar = null;
let unsubscribeRadarSettings = null;

// حالة دفتر التذكير
let patientReminders = JSON.parse(localStorage.getItem('patientReminders')) || [];

// حالة "اسأل طبيب"
let allQuestions = [];
let unsubscribeQuestions = null;
let askDoctorOpenTime = null;
let tempDoctorName = null;

/* ═══════════════════════════════════════════════════════════════════
   ═══════════════ 2. BURN CALCULATOR (مُسعف الحروق) ═══════════════
   ═══════════════════════════════════════════════════════════════════ */

window.openBurnCalculator = () => {
    burnState = { cause: null, degree: null, area: null };
    openCtrlPanel('مُسعف الحروق الذكي', `
        <div class="flex flex-col gap-5">
            <div class="bg-orange-50 border border-orange-200 rounded-xl p-4 text-orange-800 text-sm flex items-center gap-3">
                <i class="fas fa-fire-extinguisher text-xl"></i>
                <span>أجب عن الأسئلة التالية بدقة للحصول على إرشادات الإسعاف الأولى الصحيحة لحالة الحرق.</span>
            </div>
            <div id="burnCalcContent" class="bg-white p-6 rounded-2xl border" style="border-color: var(--border)"></div>
            ${generateToolSEOHtml('burn-calculator')}
        </div>
    `, '#F97316');
    window.renderBurnStep();
};

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
        let advice = "";
        let emergency = false;

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
};

window.selectBurnOption = (key, value) => {
    burnState[key] = value;
    window.renderBurnStep();
};

/* ═══════════════════════════════════════════════════════════════════
   ═══════════════ 3. SEASONAL DISEASES (الأمراض الموسمية) ═══════════════
   ═══════════════════════════════════════════════════════════════════ */

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

    openCtrlPanel('دليل الأمراض الموسمية الشائعة في منطقة القلمون', `
        <div class="flex flex-col gap-5">
            <div class="bg-purple-50 border border-purple-200 rounded-xl p-4 text-purple-800 text-sm flex items-center gap-3">
                <i class="fas fa-virus-covid text-xl"></i>
                <span>دليل توعوي بأبرز الأمراض المنتشرة في مناطق القلمون موسمياً، مع نصائح وقائية محلية.</span>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">${cardsHtml}</div>
            ${generateToolSEOHtml('seasonal-diseases')}
        </div>
    `, '#8B5CF6');
};

/* ═══════════════════════════════════════════════════════════════════
   ═══════════════ 4. PREGNANCY CALCULATOR (حاسبة الحمل) ═══════════════
   ═══════════════════════════════════════════════════════════════════ */

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
            ${generateToolSEOHtml('pregnancy-calc')}
        </div>
    `, '#EC4899');
};

window.calcPregnancy = () => {
    const dateVal = document.getElementById('lmpDate').value;
    if (!dateVal) {
        showToast('الرجاء إدخال التاريخ');
        return;
    }

    const lmpDate = new Date(dateVal);
    const today = new Date();
    const dueDate = new Date(lmpDate);
    dueDate.setDate(dueDate.getDate() + 280);

    const diffTime = Math.abs(today - lmpDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const currentWeek = Math.floor(diffDays / 7);

    if (currentWeek < 0 || currentWeek > 42) {
        showToast('التاريخ المدخل غير منطقي للحمل');
        return;
    }

    const stage = pregnancyData.slice().reverse().find(p => currentWeek >= p.week) || pregnancyData[0];
    const dueStr = dueDate.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const daysLeft = Math.max(0, Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24)));

    document.getElementById('pregResult').classList.remove('hidden');
    document.getElementById('pregResult').innerHTML = `
        <div class="bg-white p-6 rounded-2xl border-2 text-center" style="border-color: #EC4899;">
            <div class="text-sm font-bold text-pink-500 mb-2">الموعد المتوقع للولادة</div>
            <div class="text-lg font-black text-gray-800 mb-4" style="font-family: 'Noto Kufi Arabic'">${escapeHtml(dueStr)}</div>
            <div class="grid grid-cols-2 gap-3 text-right">
                <div class="bg-pink-50 p-3 rounded-xl">
                    <div class="text-xs text-pink-400">العمر الحملي الحالي</div>
                    <div class="text-xl font-bold text-pink-700">${escapeHtml(currentWeek)} أسبوع</div>
                </div>
                <div class="bg-pink-50 p-3 rounded-xl">
                    <div class="text-xs text-pink-400">الأيام المتبقية</div>
                    <div class="text-xl font-bold text-pink-700">${escapeHtml(daysLeft)} يوم</div>
                </div>
            </div>
        </div>
        <div class="bg-gradient-to-br from-pink-50 to-purple-50 p-6 rounded-2xl border flex flex-col items-center text-center" style="border-color: var(--border)">
            <div class="w-24 h-24 rounded-full bg-white shadow-md flex items-center justify-center text-5xl mb-3">${escapeHtml(stage.icon)}</div>
            <div class="inline-block px-3 py-1 bg-pink-200 text-pink-800 rounded-full text-xs font-bold mb-2">الأسبوع ${escapeHtml(stage.week)}</div>
            <div class="flex justify-center gap-6 mb-4 w-full">
                <div>
                    <div class="text-xs text-gray-500">الطول</div>
                    <div class="text-lg font-black text-gray-800">${escapeHtml(stage.length)}</div>
                </div>
                <div class="w-px bg-gray-300"></div>
                <div>
                    <div class="text-xs text-gray-500">الوزن التقريبي</div>
                    <div class="text-lg font-black text-gray-800">${escapeHtml(stage.weight)}</div>
                </div>
            </div>
            <div class="bg-white p-3 rounded-xl shadow-sm text-sm text-gray-600 flex items-center gap-2 w-full">
                <i class="fas fa-heart text-pink-500"></i>
                <span>${escapeHtml(stage.dev)}</span>
            </div>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-2.5">
            <div class="bg-pink-600 h-2.5 rounded-full" style="width: ${escapeHtml(Math.min(100, (currentWeek / 40) * 100))}%"></div>
        </div>
        <div class="text-center text-xs text-gray-500">${escapeHtml(Math.min(100, Math.round((currentWeek / 40) * 100)))}% من رحلة الحمل</div>
    `;
};

/* ═══════════════════════════════════════════════════════════════════
   ═══════════════ 5. DOSE CALCULATOR (حاسبة الجرعات) ═══════════════
   ═══════════════════════════════════════════════════════════════════ */

window.openDoseCalc = () => {
    openCtrlPanel('حاسبة الجرعات الذكية للأطفال', `
        <div class="flex flex-col gap-5">
            <div class="bg-blue-50 border border-blue-200 rounded-xl p-4 text-blue-800 text-sm flex items-center gap-3">
                <i class="fas fa-exclamation-triangle text-xl"></i>
                <span><b>تنبيه هام:</b> هذه الحاسبة استرشادية. لا تعطِ طفلك دوائين معاً دون استشارة طبيب. تجنب إعطاء (البروفين) للأطفال أقل من 6 أشهر.</span>
            </div>
            <div class="bg-white p-5 rounded-xl border" style="border-color: var(--border)">
                <div class="mb-4">
                    <label class="block text-sm font-semibold mb-2">وزن الطفل (كيلوغرام):</label>
                    <input type="number" id="childWeight" class="ctrl-input" placeholder="مثال: 12 (من 3 إلى 45 كغ)" min="3" max="45" step="0.1">
                </div>
                <div class="mb-4">
                    <label class="block text-sm font-semibold mb-2">نوع الدواء المتوفر لديك:</label>
                    <select id="medType" class="ctrl-input" onchange="toggleConcentration()">
                        <option value="paracetamol">سيتامول (Paracetamol / خافض للحرارة)</option>
                        <option value="ibuprofen">بروفين (Ibuprofen / مسكن ومضاد التهاب)</option>
                    </select>
                </div>
                <div class="mb-4" id="concDiv">
                    <label class="block text-sm font-semibold mb-2">تركيز الشراب (مكتوب على العبوة):</label>
                    <select id="medConc" class="ctrl-input">
                        <option value="120">سيتامول عادي (120 مغ/5 مل)</option>
                        <option value="250">سيتامول فورت (250 مغ/5 مل)</option>
                    </select>
                </div>
                <button onclick="calcDose()" class="w-full py-3 rounded-xl text-white font-bold text-sm transition-all hover:opacity-90" style="background: #2563EB;">
                    <i class="fas fa-syringe ml-2"></i> احسبي الجرعة الآمنة
                </button>
            </div>
            <div id="doseResult" class="hidden"></div>
            ${generateToolSEOHtml('dose-calc')}
        </div>
    `, '#2563EB');
};

window.toggleConcentration = () => {
    const type = document.getElementById('medType').value;
    const concSelect = document.getElementById('medConc');
    if (!concSelect) return;

    if (type === 'paracetamol') {
        concSelect.innerHTML = `
            <option value="120">سيتامول عادي (120 مغ/5 مل)</option>
            <option value="250">سيتامول فورت (250 مغ/5 مل)</option>
        `;
    } else {
        concSelect.innerHTML = `
            <option value="100">بروفين شراب (100 مغ/5 مل)</option>
            <option value="40">بروفين للأطفال (40 مغ/5 مل)</option>
        `;
    }
};

window.calcDose = () => {
    const weight = parseFloat(document.getElementById('childWeight').value);
    const type = document.getElementById('medType').value;
    const conc = parseInt(document.getElementById('medConc').value);

    if (!weight || weight <= 0) {
        showToast('الرجاء إدخال وزن صحيح', 'error');
        return;
    }
    if (weight < 3) {
        showToast('الوزن أقل من 3 كغ! يجب استشارة الطبيب.');
        return;
    }
    if (weight > 45) {
        showToast('الوزن أكبر من 45 كغ! يرجى مراجعة الطبيب.');
        return;
    }

    let doseMg = 0, maxDoseMg = 0, frequency = "", medName = "";

    if (type === 'paracetamol') {
        doseMg = weight * 15;
        maxDoseMg = 1000;
        frequency = "كل 6 إلى 8 ساعات (بحد أقصى 4 جرعات في اليوم)";
        medName = "سيتامول (Paracetamol)";
    } else {
        if (weight < 6) {
            showToast('لا يُنصح بالبروفين للأطفال أقل من 6 أشهر (أقل من 6 كغ). استخدم السيتامول واستشر الطبيب.');
            return;
        }
        doseMg = weight * 10;
        maxDoseMg = 400;
        frequency = "كل 6 إلى 8 ساعات (بحد أقصى 3 جرعات في اليوم)";
        medName = "بروفين (Ibuprofen)";
    }

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
            <div class="bg-gray-50 p-3 rounded-xl text-sm text-gray-700 mb-2 text-right flex items-start gap-2">
                <i class="fas fa-clock text-blue-500 mt-1"></i>
                <span><b>التكرار:</b> ${escapeHtml(frequency)}</span>
            </div>
            <div class="bg-gray-50 p-3 rounded-xl text-sm text-gray-700 mb-4 text-right flex items-start gap-2">
                <i class="fas fa-syringe text-blue-500 mt-1"></i>
                <span><b>طريقة القياس:</b> يُفضل استخدام حقنة الفم المدرجة (السيرنج) لضمان دقة الكمية بدلاً من الملعقة.</span>
            </div>
            <div class="bg-red-50 border border-red-200 p-3 rounded-xl text-xs text-red-700 flex items-start gap-2 text-right">
                <i class="fas fa-exclamation-circle mt-0.5"></i>
                <span>هذه الجرعة استرشادية. إذا استمرت الحرارة أكثر من 3 أيام أو كانت مرتفعة جداً، توجه للطبيب فوراً. لا تجمع دوائين خافضين للحرارة في نفس الوقت دون استشارة.</span>
            </div>
        </div>
    `;
};

/* ═══════════════════════════════════════════════════════════════════
   ═══════════════ 6. FIRST AID GUIDE (الإسعافات الأولية) ═══════════════
   ═══════════════════════════════════════════════════════════════════ */

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
                <div class="flex items-center gap-3">
                    <i class="fas ${escapeHtml(item.icon)} text-red-600 text-lg w-8"></i>
                    <span>${escapeHtml(item.title)}</span>
                </div>
                <i class="fas fa-chevron-down transition-transform"></i>
            </div>
            <div class="accordion-body">
                <div class="accordion-body-inner whitespace-pre-line">${escapeHtml(item.steps)}</div>
            </div>
        </div>
    `).join('');

    openCtrlPanel('دليل الإسعافات الأولية الشامل', `
        <div class="flex flex-col gap-4">
            <div class="bg-red-50 border border-red-200 rounded-xl p-4 text-red-800 text-sm flex items-center gap-3">
                <i class="fas fa-ambulance text-xl"></i>
                <span>هذه الإرشادات أولية ولا تغني عن الاتصال بالإسعاف (110) فوراً في الحالات الخطيرة.</span>
            </div>
            <div>${accordionHtml}</div>
            ${generateToolSEOHtml('first-aid')}
        </div>
    `, '#DC2626');
};

window.toggleFirstAidAccordion = (el) => {
    const item = el.parentElement;
    const isActive = item.classList.contains('active');
    document.querySelectorAll('.accordion-item').forEach(i => i.classList.remove('active'));
    if (!isActive) item.classList.add('active');
};

/* ═══════════════════════════════════════════════════════════════════
   ═══════════════ 7. MEDICAL SYMBOLS GUIDE (رموز التحاليل) ═══════════════
   ═══════════════════════════════════════════════════════════════════ */

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
    openCtrlPanel('دليل رموز التحاليل والروشتات الطبية', `
        <div class="flex flex-col gap-4">
            <div class="bg-teal-50 border border-teal-200 rounded-xl p-4 text-teal-800 text-sm flex items-center gap-3">
                <i class="fas fa-balance-scale text-xl"></i>
                <span><b>إخلاء مسؤولية:</b> هذا الدليل للثقافة العامة فقط ولا يهدف للتشخيص. راجع طبيبك لتفسير النتائج.</span>
            </div>
            <div class="relative">
                <input type="text" id="symbolSearch" class="ctrl-input pr-10" placeholder="ابحث عن رمز أو اسم التحليل..." oninput="filterMedSymbols()">
                <i class="fas fa-search absolute top-4 left-4 text-gray-400"></i>
            </div>
            <div id="symbolsGrid" class="grid grid-cols-1 sm:grid-cols-2 gap-3"></div>
            ${generateToolSEOHtml('med-symbols')}
        </div>
    `, '#0D9488');
    renderMedSymbols(medSymbolsData);
};

function renderMedSymbols(data) {
    const grid = document.getElementById('symbolsGrid');
    if (!grid) return;

    if (data.length === 0) {
        grid.innerHTML = `<div class="col-span-2 text-center py-8 text-gray-400">لا توجد نتائج مطابقة</div>`;
        return;
    }

    grid.innerHTML = data.map(item => `
        <div class="med-symbol-card">
            <div class="med-symbol-badge">${escapeHtml(item.symbol)}</div>
            <div class="font-bold text-sm mb-1" style="font-family: 'Noto Kufi Arabic'; color: var(--fg)">${escapeHtml(item.name)}</div>
            <div class="text-xs leading-relaxed" style="color: var(--muted)">${escapeHtml(item.desc)}</div>
        </div>
    `).join('');
}

window.filterMedSymbols = () => {
    const searchInput = document.getElementById('symbolSearch');
    if (!searchInput) return;
    const q = searchInput.value.toLowerCase();
    const filtered = medSymbolsData.filter(item =>
        item.symbol.toLowerCase().includes(q) ||
        item.name.toLowerCase().includes(q)
    );
    renderMedSymbols(filtered);
};

/* ═══════════════════════════════════════════════════════════════════
   ═══════════════ 8. HEALTH CALCULATOR (حاسبة الصحة) ═══════════════
   ═══════════════════════════════════════════════════════════════════ */

window.openHealthCalc = () => {
    openCtrlPanel('حاسبة الصحة (الوزن والسعرات)', `
        <div class="flex flex-col gap-5">
            <div class="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-indigo-800 text-sm flex items-center gap-3">
                <i class="fas fa-weight-scale text-xl"></i>
                <span>أدخل بياناتك لحساب مؤشر كتلة الجسم (BMI)، الوزن المثالي، واحتياجك اليومي من السعرات الحرارية.</span>
            </div>
            <div class="bg-white p-5 rounded-xl border grid grid-cols-1 sm:grid-cols-2 gap-3" style="border-color: var(--border)">
                <div>
                    <label class="block text-sm font-semibold mb-2">الجنس:</label>
                    <select id="healthGender" class="ctrl-input">
                        <option value="male">ذكر</option>
                        <option value="female">أنثى</option>
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-semibold mb-2">العمر (سنة):</label>
                    <input type="number" id="healthAge" class="ctrl-input" placeholder="مثال: 25" min="15">
                </div>
                <div>
                    <label class="block text-sm font-semibold mb-2">الوزن (كغ):</label>
                    <input type="number" id="healthWeight" class="ctrl-input" placeholder="مثال: 70" step="0.1">
                </div>
                <div>
                    <label class="block text-sm font-semibold mb-2">الطول (سم):</label>
                    <input type="number" id="healthHeight" class="ctrl-input" placeholder="مثال: 170" step="0.1">
                </div>
                <div class="col-span-1 sm:col-span-2">
                    <label class="block text-sm font-semibold mb-2">مستوى النشاط البدني:</label>
                    <select id="healthActivity" class="ctrl-input">
                        <option value="1.2">خامل (بدون رياضة)</option>
                        <option value="1.375">نشاط خفيف (1-3 أيام أسبوعياً)</option>
                        <option value="1.55">نشاط متوسط (3-5 أيام أسبوعياً)</option>
                        <option value="1.725">نشاط عالي (6-7 أيام أسبوعياً)</option>
                    </select>
                </div>
                <button onclick="calcHealth()" class="col-span-1 sm:col-span-2 py-3 rounded-xl text-white font-bold text-sm transition-all hover:opacity-90" style="background: #4F46E5;">
                    <i class="fas fa-calculator ml-2"></i> احسب النتائج
                </button>
            </div>
            <div id="healthResult" class="hidden"></div>
            ${generateToolSEOHtml('health-calc')}
        </div>
    `, '#4F46E5');
};

window.calcHealth = () => {
    const gender = document.getElementById('healthGender').value;
    const age = parseFloat(document.getElementById('healthAge').value);
    const weight = parseFloat(document.getElementById('healthWeight').value);
    const height = parseFloat(document.getElementById('healthHeight').value);
    const activity = parseFloat(document.getElementById('healthActivity').value);

    if (!age || !weight || !height) {
        showToast('الرجاء إدخال جميع البيانات بشكل صحيح');
        return;
    }

    const heightM = height / 100;
    const bmi = weight / (heightM * heightM);

    let bmiCategory = "", bmiColor = "", bmiIcon = "";
    if (bmi < 18.5) {
        bmiCategory = "نحافة"; bmiColor = "#F59E0B"; bmiIcon = "fa-arrow-down";
    } else if (bmi < 25) {
        bmiCategory = "وزن مثالي"; bmiColor = "#10B981"; bmiIcon = "fa-check";
    } else if (bmi < 30) {
        bmiCategory = "زيادة وزن"; bmiColor = "#F59E0B"; bmiIcon = "fa-arrow-up";
    } else {
        bmiCategory = "سمنة"; bmiColor = "#EF4444"; bmiIcon = "fa-exclamation";
    }

    let idealWeight = 0;
    if (gender === 'male') idealWeight = 50 + 0.91 * (height - 152.4);
    else idealWeight = 45.5 + 0.91 * (height - 152.4);

    let bmr = 0;
    if (gender === 'male') bmr = (10 * weight) + (6.25 * height) - (5 * age) + 5;
    else bmr = (10 * weight) + (6.25 * height) - (5 * age) - 161;

    const calories = bmr * activity;

    document.getElementById('healthResult').classList.remove('hidden');
    document.getElementById('healthResult').innerHTML = `
        <div class="flex flex-col gap-4">
            <div class="bg-white p-6 rounded-2xl border-2 text-center" style="border-color: #4F46E5;">
                <div class="text-sm font-bold text-indigo-500 mb-2">مؤشر كتلة الجسم (BMI)</div>
                <div class="text-5xl font-black text-gray-800 mb-2">${escapeHtml(bmi.toFixed(1))}</div>
                <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold" style="background: ${escapeHtml(bmiColor)}20; color: ${escapeHtml(bmiColor)};">
                    <i class="fas ${escapeHtml(bmiIcon)}"></i> ${escapeHtml(bmiCategory)}
                </div>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div class="bg-white p-5 rounded-2xl border text-center" style="border-color: var(--border);">
                    <div class="w-12 h-12 mx-auto rounded-full bg-green-100 flex items-center justify-center mb-2">
                        <i class="fas fa-bullseye text-green-600"></i>
                    </div>
                    <div class="text-xs text-gray-500 mb-1">الوزن المثالي التقريبي</div>
                    <div class="text-2xl font-black text-gray-800">${escapeHtml(idealWeight.toFixed(1))} كغ</div>
                </div>
                <div class="bg-white p-5 rounded-2xl border text-center" style="border-color: var(--border);">
                    <div class="w-12 h-12 mx-auto rounded-full bg-orange-100 flex items-center justify-center mb-2">
                        <i class="fas fa-fire text-orange-500"></i>
                    </div>
                    <div class="text-xs text-gray-500 mb-1">السعرات اليومية للحفاظ</div>
                    <div class="text-2xl font-black text-gray-800">${escapeHtml(Math.round(calories))} سعرة</div>
                </div>
            </div>
            <div class="bg-indigo-50 p-4 rounded-xl text-sm text-indigo-800 flex items-start gap-2">
                <i class="fas fa-lightbulb mt-1"></i>
                <span>لخسارة الوزن: قلل 500 سعرة من احتياجك اليومي. لزيادة الوزن: أضف 500 سعرة. احرص دائماً على استشارة أخصائي التغذية قبل اتباع أي حمية.</span>
            </div>
        </div>
    `;
};

/* ═══════════════════════════════════════════════════════════════════
   ═══════════════ 9. WATER CALCULATOR (حاسبة الماء) ═══════════════
   ═══════════════════════════════════════════════════════════════════ */

window.openWaterCalc = () => {
    openCtrlPanel('حاسبة كمية الماء اليومية', `
        <div class="flex flex-col gap-5">
            <div class="bg-cyan-50 border border-cyan-200 rounded-xl p-4 text-cyan-800 text-sm flex items-center gap-3">
                <i class="fas fa-glass-water text-xl"></i>
                <span>احسب احتياجك اليومي من الماء بناءً على وزنك ونشاطك لتجنب الجفاف.</span>
            </div>
            <div class="bg-white p-5 rounded-xl border grid grid-cols-1 gap-4" style="border-color: var(--border)">
                <div>
                    <label class="block text-sm font-semibold mb-2">وزن الجسم (كغ):</label>
                    <input type="number" id="waterWeight" class="ctrl-input" placeholder="مثال: 70" step="0.1" min="10">
                </div>
                <div class="flex flex-col gap-2">
                    <label class="flex items-center gap-3 cursor-pointer p-3 rounded-xl border hover:bg-gray-50" style="border-color: var(--border)">
                        <input type="checkbox" id="waterActivity" class="w-5 h-5 accent-cyan-600">
                        <span class="text-sm font-semibold">أمارس الرياضة أو نشاط بدني مجهد</span>
                    </label>
                    <label class="flex items-center gap-3 cursor-pointer p-3 rounded-xl border hover:bg-gray-50" style="border-color: var(--border)">
                        <input type="checkbox" id="waterWeather" class="w-5 h-5 accent-cyan-600">
                        <span class="text-sm font-semibold">الطقس حار جداً (أعلى من 30 درجة)</span>
                    </label>
                </div>
                <button onclick="calcWater()" class="w-full py-3 rounded-xl text-white font-bold text-sm transition-all hover:opacity-90" style="background: #0891B2;">
                    <i class="fas fa-droplet ml-2"></i> احسب احتياجي من الماء
                </button>
            </div>
            <div id="waterResult" class="hidden"></div>
            ${generateToolSEOHtml('water-calc')}
        </div>
    `, '#0891B2');
};

window.calcWater = () => {
    const weight = parseFloat(document.getElementById('waterWeight').value);
    const activity = document.getElementById('waterActivity').checked;
    const weather = document.getElementById('waterWeather').checked;

    if (!weight || weight <= 0) {
        showToast('الرجاء إدخال وزن صحيح', 'error');
        return;
    }

    let waterMl = weight * 35;
    if (activity) waterMl += 500;
    if (weather) waterMl += 500;

    const waterLiters = (waterMl / 1000).toFixed(2);
    const waterCups = Math.round(waterMl / 250);

    document.getElementById('waterResult').classList.remove('hidden');
    document.getElementById('waterResult').innerHTML = `
        <div class="bg-white p-6 rounded-2xl border-2 text-center" style="border-color: #0891B2;">
            <div class="w-20 h-20 mx-auto rounded-full bg-cyan-100 flex items-center justify-center mb-4">
                <i class="fas fa-droplet text-4xl text-cyan-500"></i>
            </div>
            <div class="text-sm font-bold text-cyan-600 mb-2">احتياجك اليومي التقريبي من الماء</div>
            <div class="text-5xl font-black text-gray-800 mb-4">${escapeHtml(waterLiters)} <span class="text-xl">لتر</span></div>
            <div class="flex justify-center gap-6 mb-4">
                <div>
                    <div class="text-xs text-gray-500">عدد الأكواب (250 مل)</div>
                    <div class="text-2xl font-black text-gray-800">${escapeHtml(waterCups)} كوب</div>
                </div>
            </div>
            <div class="bg-cyan-50 p-3 rounded-xl text-sm text-cyan-800 flex items-start gap-2 text-right">
                <i class="fas fa-info-circle mt-1"></i>
                <span>وزع هذا المقدار على ساعات اليوم. ابدأ بكوب صباحاً، واحرص على الشرب قبل الشعور بالعطش. تجنب شرب كميات كبيرة دفعة واحدة.</span>
            </div>
        </div>
    `;
};

/* ═══════════════════════════════════════════════════════════════════
   ═══════════════ 10. CHRONIC NUTRITION (تغذية الأمراض المزمنة) ═══════════════
   ═══════════════════════════════════════════════════════════════════ */

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
            <div class="disease-header" style="background: ${escapeHtml(d.color)};">
                <i class="fas ${escapeHtml(d.icon)} text-2xl text-white"></i>
                <div>
                    <h4 class="font-bold text-white text-sm" style="font-family: 'Noto Kufi Arabic'">${escapeHtml(d.disease)}</h4>
                </div>
            </div>
            <div class="disease-body">
                <div class="text-xs font-bold text-gray-500 mb-1">النصائح الغذائية:</div>
                <div class="text-sm text-gray-700 leading-relaxed">${escapeHtml(d.advice)}</div>
            </div>
        </div>
    `).join('');

    openCtrlPanel('قسم التغذية للأمراض المزمنة', `
        <div class="flex flex-col gap-4">
            <div class="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-emerald-800 text-sm flex items-center gap-3">
                <i class="fas fa-bowl-food text-xl"></i>
                <span>دليل غذائي مبسط لأمراض مزمنة شائعة. هذه الإرشادات استرشادية ويجب الالتزام بخطة الطبيب المعالج.</span>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">${cardsHtml}</div>
            ${generateToolSEOHtml('chronic-nutrition')}
        </div>
    `, '#10B981');
};

/* ═══════════════════════════════════════════════════════════════════
   ═══════════════ 11. PRE-VISIT GUIDE (إرشادات قبل الزيارة) ═══════════════
   ═══════════════════════════════════════════════════════════════════ */

window.openPreVisitGuide = () => {
    openCtrlPanel('دليل الإرشادات قبل زيارة الطبيب أو المخبر', `
        <div class="flex flex-col gap-5">
            <div class="bg-blue-50 border border-blue-200 rounded-xl p-4 text-blue-800 text-sm flex items-center gap-3">
                <i class="fas fa-clipboard-list text-xl"></i>
                <span>تحضير نفسك قبل الزيارة الطبية يوفر الوقت ويساعد الطبيب على التشخيص الدقيق.</span>
            </div>
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
            ${generateToolSEOHtml('pre-visit-guide')}
        </div>
    `, '#3B82F6');
};

/* ═══════════════════════════════════════════════════════════════════
   ═══════════════ 12. FOOD INTERACTIONS (تعارضات الأدوية) ═══════════════
   ═══════════════════════════════════════════════════════════════════ */

const foodInteractionsData = [
    { med: "أدوية الضغط (ACE Inhibitors)", food: "الموز، الأفوكادو، بدائل الملح", effect: "ارتفاع خطير في نسبة البوتاسيوم في الدم" },
    { med: "الوارفارين (مسيلات الدم)", food: "الخضار الورقية الداكنة (السبانخ، البقدونس)", effect: "تقلل فاعلية الدواء وتزيد سيولة الدم" },
    { med: "أدوية السكري (Metformin)", food: "الكحول", effect: "خطر حدوث حموضة لاكتكية شديدة" },
    { med: "المضادات الحيوية (Tetracycline)", food: "منتجات الألبان (الحليب، الجبن)", effect: "تمنع امتصاص الدواء وتراكيزه في الجسم" },
    { med: "أدوية الكوليسترول (Statins)", food: "عصير الجريب فروت", effect: "تراكم الدواء في الدم مما يسبب آلاماً عضلية" },
    { med: "مسكنات الألم (NSAIDs)", food: "الكحول، التوابل الحارة", effect: "زيادة خطر نزيف المعدة والقرحة" }
];

window.openFoodInteractions = () => {
    const tableRows = foodInteractionsData.map(item => `
        <tr class="border-b" style="border-color: var(--border)">
            <td class="p-3 text-sm font-bold text-gray-800">${escapeHtml(item.med)}</td>
            <td class="p-3 text-sm text-red-600">${escapeHtml(item.food)}</td>
            <td class="p-3 text-sm text-gray-600">${escapeHtml(item.effect)}</td>
        </tr>
    `).join('');

    openCtrlPanel('جدول تعارضات الأدوية مع الطعام', `
        <div class="flex flex-col gap-4">
            <div class="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-800 text-sm flex items-center gap-3">
                <i class="fas fa-utensils text-xl"></i>
                <span>جدول إرشادي لأهم التداخلات بين الأدوية الشائعة والأطعمة. استشر الصيدلاني دائماً.</span>
            </div>
            <div class="bg-white rounded-xl border overflow-hidden" style="border-color: var(--border)">
                <table class="w-full text-right">
                    <thead class="bg-gray-50">
                        <tr class="border-b" style="border-color: var(--border)">
                            <th class="p-3 text-xs font-bold text-gray-500">الدواء</th>
                            <th class="p-3 text-xs font-bold text-gray-500">الطعام الممنوع/المحظور</th>
                            <th class="p-3 text-xs font-bold text-gray-500">التأثير الجانبي</th>
                        </tr>
                    </thead>
                    <tbody>${tableRows}</tbody>
                </table>
            </div>
            ${generateToolSEOHtml('food-interactions')}
        </div>
    `, '#D97706');
};

/* ═══════════════════════════════════════════════════════════════════
   ═══════════════ 13. PATIENT REMINDER (دفتر التذكير) ═══════════════
   ═══════════════════════════════════════════════════════════════════ */

window.openPatientReminder = () => {
    patientReminders = JSON.parse(localStorage.getItem('patientReminders')) || [];
    openCtrlPanel('دفتر التذكير الذاتي للمريض', `
        <div class="flex flex-col gap-5">
            <div class="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-indigo-800 text-sm flex items-center gap-3">
                <i class="fas fa-bell text-xl"></i>
                <span>سجل أدويتك ومواعيدك هنا. يتم حفظها على جهازك لتذكيرك ذاتياً دون الحاجة للإنترنت.</span>
            </div>
            <div class="bg-white p-5 rounded-xl border" style="border-color: var(--border)">
                <h4 class="font-bold mb-4 text-sm flex items-center gap-2"><i class="fas fa-plus-circle text-indigo-600"></i> إضافة تذكير جديد</h4>
                <form onsubmit="saveReminder(event)" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input type="text" id="reminderTitle" class="ctrl-input text-sm" placeholder="عنوان التذكير (مثال: دواء الضغط)" required>
                    <input type="datetime-local" id="reminderDate" class="ctrl-input text-sm" required>
                    <textarea id="reminderNotes" class="ctrl-input text-sm col-span-1 sm:col-span-2" rows="2" placeholder="ملاحظات (مثال: بعد الأكل)"></textarea>
                    <button type="submit" class="col-span-1 sm:col-span-2 py-3 rounded-xl text-white font-bold text-sm" style="background: #6366F1;">
                        <i class="fas fa-save ml-2"></i> حفظ التذكير
                    </button>
                </form>
            </div>
            <div class="bg-white p-5 rounded-xl border" style="border-color: var(--border)">
                <h4 class="font-bold mb-4 text-sm flex items-center gap-2"><i class="fas fa-list text-indigo-600"></i> تذكيراتي المحفوظة</h4>
                <div id="remindersList" class="flex flex-col gap-3">
                    <p class="text-center py-8 text-gray-400 text-sm">لا توجد تذكيرات بعد.</p>
                </div>
            </div>
            ${generateToolSEOHtml('patient-reminder')}
        </div>
    `, '#6366F1');
    renderRemindersList();
};

window.saveReminder = (e) => {
    e.preventDefault();
    const title = document.getElementById('reminderTitle').value.trim();
    const date = document.getElementById('reminderDate').value;
    const notes = document.getElementById('reminderNotes').value.trim();

    if (!title || !date) {
        showToast('يرجى إدخال العنوان والتاريخ');
        return;
    }

    patientReminders.push({ id: Date.now(), title, date, notes });
    localStorage.setItem('patientReminders', JSON.stringify(patientReminders));
    document.querySelector('#ctrlContent form').reset();
    renderRemindersList();
    showToast('تم حفظ التذكير بنجاح!');
};

window.deleteReminder = (id) => {
    patientReminders = patientReminders.filter(r => r.id !== id);
    localStorage.setItem('patientReminders', JSON.stringify(patientReminders));
    renderRemindersList();
    showToast('تم حذف التذكير');
};

function renderRemindersList() {
    const list = document.getElementById('remindersList');
    if (!list) return;

    if (patientReminders.length === 0) {
        list.innerHTML = '<p class="text-center py-8 text-gray-400 text-sm">لا توجد تذكيرات بعد.</p>';
        return;
    }

    list.innerHTML = patientReminders.map(r => {
        const dateObj = new Date(r.date);
        const formattedDate = dateObj.toLocaleString('ar-EG', { date: 'short', time: 'short', weekday: 'long' });

        return `
            <div class="border rounded-xl p-4 flex items-center justify-between gap-3" style="border-color: var(--border)">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                        <i class="fas fa-clock text-indigo-600"></i>
                    </div>
                    <div>
                        <div class="font-bold text-sm text-gray-800">${escapeHtml(r.title)}</div>
                        <div class="text-xs text-gray-500 mt-1">${escapeHtml(formattedDate)}</div>
                        ${r.notes ? `<div class="text-xs text-gray-400 mt-1">${escapeHtml(r.notes)}</div>` : ''}
                    </div>
                </div>
                <button onclick="deleteReminder(${r.id})" class="text-red-500 hover:text-red-700"><i class="fas fa-trash"></i></button>
            </div>
        `;
    }).join('');
}

/* ═══════════════════════════════════════════════════════════════════
   ═══════════════ 14. MED RENEWAL CALCULATOR (حاسبة تجديد الدواء) ═══════════════
   ═══════════════════════════════════════════════════════════════════ */

window.openMedRenewalCalc = () => {
    openCtrlPanel('حاسبة موعد تجديد الدواء', `
        <div class="flex flex-col gap-5">
            <div class="bg-cyan-50 border border-cyan-200 rounded-xl p-4 text-cyan-800 text-sm flex items-center gap-3">
                <i class="fas fa-calendar-check text-xl"></i>
                <span>احسب متى سينفد دوائك لتقوم بتجديده من الصيدلية في الوقت المناسب.</span>
            </div>
            <div class="bg-white p-5 rounded-xl border grid grid-cols-1 sm:grid-cols-2 gap-3" style="border-color: var(--border)">
                <div class="col-span-1 sm:col-span-2">
                    <label class="block text-sm font-semibold mb-2">عدد حبات الدواء المتوفرة حالياً:</label>
                    <input type="number" id="medPillsCount" class="ctrl-input" placeholder="مثال: 30 حبة" min="1">
                </div>
                <div>
                    <label class="block text-sm font-semibold mb-2">عدد الحبات في اليوم:</label>
                    <input type="number" id="medPillsPerDay" class="ctrl-input" placeholder="مثال: 2 حبة" min="0.5" step="0.5">
                </div>
                <div>
                    <label class="block text-sm font-semibold mb-2">تاريخ بدء تناول الدواء:</label>
                    <input type="date" id="medStartDate" class="ctrl-input">
                </div>
                <button onclick="calcRenewal()" class="col-span-1 sm:col-span-2 py-3 rounded-xl text-white font-bold text-sm" style="background: #06B6D4;">
                    <i class="fas fa-calculator ml-2"></i> احسب موعد التجديد
                </button>
            </div>
            <div id="renewalResult" class="hidden"></div>
            ${generateToolSEOHtml('med-renewal-calc')}
        </div>
    `, '#06B6D4');
};

window.calcRenewal = () => {
    const pills = parseFloat(document.getElementById('medPillsCount').value);
    const perDay = parseFloat(document.getElementById('medPillsPerDay').value);
    const startDateStr = document.getElementById('medStartDate').value;

    if (!pills || !perDay || !startDateStr) {
        showToast('الرجاء إدخال جميع الحقول');
        return;
    }
    if (perDay <= 0) {
        showToast('يجب إدخال جرعة يومية صحيحة');
        return;
    }

    const daysSupply = Math.floor(pills / perDay);
    const startDate = new Date(startDateStr);
    const renewDate = new Date(startDate);
    renewDate.setDate(renewDate.getDate() + daysSupply);

    const today = new Date();
    const diffTime = renewDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let statusText = "", statusColor = "";
    if (diffDays < 0) {
        statusText = "لقد نفد الدواء! يرجى تجديده فوراً.";
        statusColor = "#EF4444";
    } else if (diffDays === 0) {
        statusText = "الدواء سينفد اليوم! جدده اليوم.";
        statusColor = "#F59E0B";
    } else if (diffDays <= 3) {
        statusText = `متبقى ${diffDays} أيام فقط! استعد لتجديد الدواء.`;
        statusColor = "#F59E0B";
    } else {
        statusText = `متبقى ${diffDays} يوماً على نفاد الدواء.`;
        statusColor = "#10B981";
    }

    const formattedDate = renewDate.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    document.getElementById('renewalResult').classList.remove('hidden');
    document.getElementById('renewalResult').innerHTML = `
        <div class="bg-white p-6 rounded-2xl border-2 text-center" style="border-color: #06B6D4;">
            <div class="w-16 h-16 mx-auto rounded-full bg-cyan-100 flex items-center justify-center mb-4">
                <i class="fas fa-pills text-3xl text-cyan-500"></i>
            </div>
            <div class="text-sm font-bold text-cyan-600 mb-2">موعد نفاد الدواء المتوقع</div>
            <div class="text-lg font-black text-gray-800 mb-4" style="font-family: 'Noto Kufi Arabic'">${escapeHtml(formattedDate)}</div>
            <div class="bg-cyan-50 p-3 rounded-xl text-sm font-bold" style="color: ${escapeHtml(statusColor)};">
                <i class="fas fa-info-circle ml-1"></i> ${escapeHtml(statusText)}
            </div>
            <div class="text-xs text-gray-500 mt-4">مدة كفاية الدواء الحالي: ${escapeHtml(daysSupply)} يوم</div>
        </div>
    `;
};

/* ═══════════════════════════════════════════════════════════════════
   ═══════════════ 15. PRE-TEST GUIDE (تعليمات قبل التحاليل) ═══════════════
   ═══════════════════════════════════════════════════════════════════ */

const prelabData = [
    { id: 1, name: 'فحص السكر الصائم (FBS)', cat: 'blood', fasting: '8-12 ساعة', fastingClass: 'fasting-8', icon: 'fa-droplet', color: '#DC2626', instructions: ['صيام 8-12 ساعة عن الطعام', 'يُسمح بشرب الماء بكميات قليلة', 'تجنب الأطعمة الدسمة مساء اليوم السابق', 'أخذ العينة صباحاً بشكل مفضل'], notes: 'السكر الطبيعي الصائم: 70-100 ملغ/دل' },
    { id: 2, name: 'فحص الشحوم والدهون (Lipid Profile)', cat: 'blood', fasting: '12-14 ساعة', fastingClass: 'fasting-12', icon: 'fa-vial', color: '#F59E0B', instructions: ['صيام تام 12-14 ساعة', 'لا يُسمح بشرب الماء خلال فترة الصيام', 'تجنب الكحوليات 48 ساعة قبل الفحص', 'الامتناع عن الأطعمة الدسمة يومين قبل'], notes: 'يشمل: الكولسترول الكلي، HDL، LDL، الدهون الثلاثية' },
    { id: 3, name: 'تحليل CBC (صورة دم كاملة)', cat: 'blood', fasting: 'لا يُطلب صيام', fastingClass: 'fasting-none', icon: 'fa-flask', color: '#059669', instructions: ['لا يتطلب صيام', 'يمكن أخذه في أي وقت من اليوم', 'أخبر الفني إذا كنت تتناول أدوية'], notes: 'يشمل: كريات حمراء، بيضاء، صفائح دموية، هيموغلوبين' },
    { id: 4, name: 'وظائف الكبد (LFT)', cat: 'blood', fasting: '8-10 ساعات', fastingClass: 'fasting-10', icon: 'fa-liver', color: '#8B5CF6', instructions: ['صيام 8-10 ساعات يُفضل', 'تجنب الأدوية المسكنة قبل الفحص بيوم', 'إذا كنت تتناول أدوية كبدية، أبلغ الفني'], notes: 'يشمل: ALT, AST, ALP، البيليروبين، الألبومين' },
    { id: 5, name: 'إيكو / سونار البطن (Abdominal US)', cat: 'imaging', fasting: '6-8 ساعات', fastingClass: 'fasting-special', icon: 'fa-wave-square', color: '#7C3AED', instructions: ['صيام 6-8 ساعات لتصوير البطن العلوي', 'شرب 4-6 أكواب ماء قبل الفحص بساعة (مثانة ممتلئة)', 'لا تتبول قبل الفحص', 'تجنب الأطعمة الغازية يوم قبل'], notes: 'المثانة الممتلئة ضرورية لتصوير الحوض' },
    { id: 6, name: 'أشعة الصدر (Chest X-Ray)', cat: 'imaging', fasting: 'لا يُطلب صيام', fastingClass: 'fasting-none', icon: 'fa-lungs', color: '#0EA5E9', instructions: ['لا يتطلب صيام أو تحضير خاص', 'إزالة المجوهرات المعدنية من منطقة الصدر', 'إزالة الأزرار والأحزمة المعدنية', 'إخبار الفني في حال وجود حمل'], notes: 'مدة الفحص: دقائق معدودة' },
    { id: 7, name: 'رنين مغناطيسي (MRI)', cat: 'imaging', fasting: 'حسب المنطقة', fastingClass: 'fasting-special', icon: 'fa-magnet', color: '#A855F7', instructions: ['إزالة جميع المعادن: ساعات، أقراط، أسنان صناعية', 'لا يدخل معك أي إلكترونيات', 'أبلغ الفني إذا كان لديك: دعامة، منظم نبض', 'لـ MRI البطن: صيام 4-6 ساعات'], notes: 'مدة الفحص: 30-60 دقيقة حسب المنطقة' },
    { id: 8, name: 'تحليل بول عام (Urinalysis)', cat: 'urine', fasting: 'لا يُطلب صيام', fastingClass: 'fasting-none', icon: 'fa-flask-vial', color: '#14B8A6', instructions: ['العينة الأولى في الصباح هي الأفضل', 'جمع منتصف التبول (تجاهل الجزء الأول والأخير)', 'استخدم العبوة المعقمة المخصصة', 'تسليم العينة للمخبر خلال ساعتين'], notes: 'لا تجمع العينة أثناء الدورة الشهرية' },
    { id: 9, name: 'فحص الحمل (Beta HCG - دم)', cat: 'special', fasting: 'لا يُطلب صيام', fastingClass: 'fasting-none', icon: 'fa-baby', color: '#EC4899', instructions: ['لا يتطلب صيام', 'يمكن أخذ العينة في أي وقت', 'أخبر الفني بتاريخ آخر دورة'], notes: 'يظهر الحمل في الدم بعد 7-10 أيام من الإخصاب' },
    { id: 10, name: 'تحليل غازات الدم (ABG)', cat: 'special', fasting: 'لا يُطلب صيام', fastingClass: 'fasting-none', icon: 'fa-wind', color: '#EF4444', instructions: ['يُؤخذ من الشريان (مؤلم أكثر من الوريد)', 'لا يتطلب صيام', 'أبلغ الفني إذا كنت تتناول أكسجين', 'الراحة لمدة 20 دقيقة قبل الفحص'], notes: 'يجب وضع ضغط على مكان الوخز لمدة 5 دقائق' }
];

window.openPreTestGuide = () => {
    const initialHtml = `
        <div class="flex flex-col gap-5">
            <div class="bg-blue-50 border border-blue-200 rounded-xl p-4 text-blue-800 text-sm flex items-center gap-3">
                <i class="fas fa-clipboard-list text-xl"></i>
                <span>دليل أرشيفي سريع يجيب على تساؤلاتك قبل الذهاب للمختبر أو الأشعة. اتبعها لضمان دقة النتائج.</span>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div class="bg-white rounded-2xl p-5 border border-red-100 shadow-sm hover:shadow-md transition-all">
                    <div class="flex items-center gap-3 mb-3">
                        <div class="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-500"><i class="fas fa-clock"></i></div>
                        <h4 class="font-bold text-sm">كم ساعة صيام لفحص السكر؟</h4>
                    </div>
                    <div class="flex items-center gap-3">
                        <span class="fasting-badge fasting-8"><i class="fas fa-moon"></i> 8 - 12 ساعة</span>
                        <span class="text-xs" style="color:var(--muted)">يُسمح بشرب الماء</span>
                    </div>
                </div>
                <div class="bg-white rounded-2xl p-5 border border-purple-100 shadow-sm hover:shadow-md transition-all">
                    <div class="flex items-center gap-3 mb-3">
                        <div class="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-500"><i class="fas fa-wave-square"></i></div>
                        <h4 class="font-bold text-sm">تعليمات إيكو / سونار البطن؟</h4>
                    </div>
                    <div class="flex items-center gap-3">
                        <span class="fasting-badge fasting-special"><i class="fas fa-moon"></i> 6 - 8 ساعات</span>
                        <span class="text-xs" style="color:var(--muted)">معدة فارغة + مثانة ممتلئة</span>
                    </div>
                </div>
            </div>
            <div class="bg-white rounded-2xl border overflow-hidden shadow-sm" style="border-color:var(--border)">
                <div class="p-4 border-b flex flex-wrap gap-2" style="border-color:var(--border);background:var(--bg-deep)">
                    <button class="tab-btn active" onclick="filterPrelab('all',this)">الكل</button>
                    <button class="tab-btn" onclick="filterPrelab('blood',this)"><i class="fas fa-tint ml-1"></i>تحاليل دم</button>
                    <button class="tab-btn" onclick="filterPrelab('imaging',this)"><i class="fas fa-x-ray ml-1"></i>أشعة وتصوير</button>
                    <button class="tab-btn" onclick="filterPrelab('urine',this)"><i class="fas fa-flask ml-1"></i>تحاليل بول</button>
                    <button class="tab-btn" onclick="filterPrelab('special',this)"><i class="fas fa-star ml-1"></i>فحوصات خاصة</button>
                </div>
                <div id="prelabList"></div>
            </div>
            ${generateToolSEOHtml('pre-test-guide')}
        </div>
    `;
    openCtrlPanel('التعليمات قبل التحاليل والفحوصات', initialHtml, '#3B82F6');
    renderPrelab('all');
};

function renderPrelab(filter = 'all') {
    const container = document.getElementById('prelabList');
    if (!container) return;

    const items = filter === 'all' ? prelabData : prelabData.filter(d => d.cat === filter);

    container.innerHTML = items.map(item => `
        <div class="prelab-accordion-item border-b" style="border-color:var(--border)">
            <div class="prelab-toggle flex items-center justify-between p-4" onclick="togglePrelab(this)">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0" style="background:${escapeHtml(item.color)}">
                        <i class="fas ${escapeHtml(item.icon)}"></i>
                    </div>
                    <div>
                        <div class="font-bold text-sm">${escapeHtml(item.name)}</div>
                        <span class="fasting-badge ${escapeHtml(item.fastingClass)} text-[0.7rem] mt-1">
                            <i class="fas ${item.fastingClass === 'fasting-none' ? 'fa-sun' : 'fa-moon'}"></i> ${escapeHtml(item.fasting)}
                        </span>
                    </div>
                </div>
                <i class="fas fa-chevron-down text-xs transition-transform" style="color:var(--muted)"></i>
            </div>
            <div class="prelab-accordion">
                <div class="px-4 pb-4 pr-[68px]">
                    <div class="bg-gray-50 rounded-xl p-4 mb-3" style="background:var(--bg-deep)">
                        <div class="text-xs font-bold mb-2" style="color:var(--accent)"><i class="fas fa-list-check ml-1"></i> التعليمات:</div>
                        <ul class="space-y-2">
                            ${item.instructions.map(i => `
                                <li class="flex items-start gap-2 text-xs" style="color:var(--fg-light)">
                                    <i class="fas fa-check-circle mt-0.5 flex-shrink-0" style="color:var(--accent)"></i>
                                    <span>${escapeHtml(i)}</span>
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                    ${item.notes ? `
                        <div class="flex items-start gap-2 text-xs p-3 rounded-lg" style="background:#FEF9C3;color:#92400E">
                            <i class="fas fa-lightbulb mt-0.5 flex-shrink-0"></i>
                            <span>${escapeHtml(item.notes)}</span>
                        </div>
                    ` : ''}
                </div>
            </div>
        </div>
    `).join('');
}

window.filterPrelab = (cat, btn) => {
    document.querySelectorAll('#ctrlContent .tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderPrelab(cat);
};

window.togglePrelab = (el) => {
    const accordion = el.nextElementSibling;
    const icon = el.querySelector('.fa-chevron-down');
    const isOpen = accordion.classList.contains('open');

    document.querySelectorAll('#ctrlContent .prelab-accordion.open').forEach(a => {
        a.classList.remove('open');
        a.previousElementSibling.querySelector('.fa-chevron-down').style.transform = '';
    });

    if (!isOpen) {
        accordion.classList.add('open');
        icon.style.transform = 'rotate(180deg)';
    }
};

/* ═══════════════════════════════════════════════════════════════════
   ═══════════════ 16. EVENTS FIRST AID (إسعافات المناسبات) ═══════════════
   ═══════════════════════════════════════════════════════════════════ */

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

    const html = data.map(d => `
        <div class="accordion-item">
            <div class="accordion-header" onclick="toggleAccordion(this)">
                <div class="flex items-center gap-3">
                    <i class="fas ${escapeHtml(d.icon)} text-red-600 text-lg w-8"></i>
                    <span>${escapeHtml(d.title)}</span>
                </div>
                <i class="fas fa-chevron-down transition-transform"></i>
            </div>
            <div class="accordion-body">
                <div class="accordion-body-inner whitespace-pre-line">${escapeHtml(d.steps)}</div>
            </div>
        </div>
    `).join('');

    openCtrlPanel('إسعافات المناسبات والتجمعات', `
        <div class="flex flex-col gap-4">
            <div class="bg-red-50 border border-red-200 rounded-xl p-4 text-red-800 text-sm flex items-center gap-3">
                <i class="fas fa-kit-medical text-xl"></i>
                <span>دليل سريع للتعامل مع أكثر الحوادث شيوعاً في الأفراح، المهرجانات، والتجمعات العائلية.</span>
            </div>
            <div>${html}</div>
            ${generateToolSEOHtml('events-first-aid')}
        </div>
    `, '#DC2626');
};

/* ═══════════════════════════════════════════════════════════════════
   ═══════════════ 17. MEDICAL MAP (الخريطة الطبية) ═══════════════
   ═══════════════════════════════════════════════════════════════════ */

window.openMedicalMap = () => {
    openCtrlPanel('الخريطة الطبية', `
        <div class="flex flex-col sm:flex-row gap-4 h-[70vh]">
            <div class="w-full sm:w-1/3 flex flex-col gap-2 overflow-y-auto pr-1" id="mapListContainer">
                <p class="text-center text-gray-400 text-sm py-10">جاري تحميل المنشآت...</p>
            </div>
            <div class="w-full sm:w-2/3 rounded-xl overflow-hidden border" style="border-color: var(--border)">
                <iframe id="mapFrame" width="100%" height="100%" frameborder="0" style="border:0; min-height: 400px;" src="https://maps.google.com/maps?q=الرحيبة%20سوريا&output=embed" allowfullscreen></iframe>
            </div>
        </div>
        ${generateToolSEOHtml('medical-map')}
    `, '#10B981');
    renderMapList();
};

function renderMapList() {
    const container = document.getElementById('mapListContainer');
    if (!container) return;

    if (allData.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-400 text-sm py-10">لا توجد منشآت.</p>';
        return;
    }

    const typeColors = {
        hospital: 'var(--hospital)', clinic: 'var(--clinic)', center: 'var(--center)',
        lab: 'var(--lab)', doctor: 'var(--doctor)', pharmacy: 'var(--pharmacy)'
    };

    container.innerHTML = allData.map(item => {
        const color = typeColors[item.type] || 'var(--accent)';
        const locationQuery = encodeURIComponent((item.address || item.clinic || item.name) + ' الرحيبة سوريا');
        return `
            <div onclick="updateMapFrame('${locationQuery}')" class="p-3 rounded-lg border cursor-pointer hover:bg-gray-50 transition-all" style="border-color: var(--border)">
                <div class="flex items-center gap-2">
                    <span class="w-3 h-3 rounded-full" style="background: ${escapeHtml(color)}"></span>
                    <span class="font-bold text-sm text-gray-800 truncate">${escapeHtml(item.name)}</span>
                </div>
                <div class="text-xs text-gray-500 mt-1 truncate">${escapeHtml(item.address || item.clinic || 'الرحيبة')}</div>
            </div>
        `;
    }).join('');
}

window.updateMapFrame = (query) => {
    const frame = document.getElementById('mapFrame');
    if (frame) frame.src = `https://maps.google.com/maps?q=${query}&output=embed`;
};

/* ═══════════════════════════════════════════════════════════════════
   ═══════════════ 18. VACCINE SCHEDULER (جدول اللقاحات) ═══════════════
   ═══════════════════════════════════════════════════════════════════ */

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
            <div class="bg-orange-50 border border-orange-200 rounded-xl p-4 text-orange-800 text-sm flex items-center gap-3">
                <i class="fas fa-syringe text-xl"></i>
                <span>أدخل تاريخ ميلاد طفلك لحساب مواعيد اللقاحات بدقة ومعرفة اللقاح المستحق حالياً.</span>
            </div>
            <div class="bg-white p-5 rounded-xl border" style="border-color: var(--border)">
                <label class="block text-sm font-semibold mb-2">تاريخ ميلاد الطفل:</label>
                <input type="date" id="vaccBirthDate" class="ctrl-input" required>
                <button onclick="calcVaccines()" class="w-full mt-4 py-3 rounded-xl text-white font-bold text-sm transition-all hover:opacity-90" style="background: #F97316;">
                    <i class="fas fa-calculator ml-2"></i> احسب جدول اللقاحات
                </button>
            </div>
            <div id="vaccResult" class="hidden flex flex-col gap-3"></div>
            ${generateToolSEOHtml('vaccine-scheduler')}
        </div>
    `, '#F97316');
};

window.calcVaccines = () => {
    const dateVal = document.getElementById('vaccBirthDate').value;
    if (!dateVal) {
        showToast('الرجاء إدخال تاريخ الميلاد');
        return;
    }

    const birthDate = new Date(dateVal);
    const today = new Date();
    const diffTime = today - birthDate;
    const diffMonths = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 30.44));

    if (diffMonths < 0 || diffMonths > 72) {
        showToast('تاريخ الميلاد غير منطقي', 'error');
        return;
    }

    const resultContainer = document.getElementById('vaccResult');
    resultContainer.classList.remove('hidden');

    let html = `
        <div class="bg-white p-4 rounded-xl border text-center mb-2" style="border-color: var(--border)">
            <div class="text-sm text-gray-500">عمر الطفل الحالي</div>
            <div class="text-2xl font-black text-orange-600">${escapeHtml(diffMonths)} شهر</div>
        </div>
    `;

    html += vaccineSchedule.map(v => {
        const vaccDate = new Date(birthDate);
        vaccDate.setMonth(vaccDate.getMonth() + v.months);

        const isPast = diffMonths > v.months + 1;
        const isDue = diffMonths >= v.months && diffMonths <= v.months + 1;

        let statusBadge = '';
        let cardClass = 'border-gray-200 bg-gray-50';
        let textColor = 'text-gray-500';

        if (isPast) {
            statusBadge = `<span class="text-xs px-2 py-1 rounded bg-green-100 text-green-700 inline-block mb-2"><i class="fas fa-check-circle"></i> تم تنفيذه</span>`;
        } else if (isDue) {
            cardClass = 'border-orange-400 bg-orange-50 shadow-md';
            textColor = 'text-orange-800';
            statusBadge = `<span class="text-xs px-2 py-1 rounded bg-orange-200 text-orange-900 inline-block mb-2 animate-pulse font-bold"><i class="fas fa-exclamation-circle"></i> مستحق الآن</span>`;
        } else {
            statusBadge = `<span class="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 inline-block mb-2"><i class="fas fa-clock"></i> قادم قريباً</span>`;
        }

        const formattedDate = vaccDate.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });

        return `
            <div class="p-4 rounded-xl border ${escapeHtml(cardClass)} transition-all">
                ${statusBadge}
                <div class="font-bold ${escapeHtml(textColor)} text-sm">${escapeHtml(v.name)}</div>
                <div class="text-xs text-gray-400 mt-1">عمر الطفل وقتها: ${escapeHtml(v.age)}</div>
                <div class="text-xs font-semibold text-gray-600 mt-1">الموعد المقترح: ${escapeHtml(formattedDate)}</div>
                ${v.notes ? `<div class="text-xs mt-2 pt-2 border-t border-dashed" style="border-color:var(--border); color: var(--muted)"><i class="fas fa-info-circle"></i> ${escapeHtml(v.notes)}</div>` : ''}
            </div>
        `;
    }).join('');

    resultContainer.innerHTML = html;
};

/* ═══════════════════════════════════════════════════════════════════
   ═══════════════ 19. ASK DOCTOR (اسأل طبيب) ═══════════════
   ═══════════════════════════════════════════════════════════════════ */

window.openAskDoctor = (docName) => {
    tempDoctorName = docName || null;

    openCtrlPanel('اسأل طبيب', `
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
                        <option>طب عام / باطنة</option>
                        <option>أطفال</option>
                        <option>نسائية وتوليد</option>
                        <option>جلدية</option>
                        <option>عظمية</option>
                        <option>أسنان</option>
                        <option>أخرى</option>
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
            ${generateToolSEOHtml('ask-doctor')}
        </div>
    `, '#0EA5E9');

    fetchQuestions();
    askDoctorOpenTime = Date.now();
};

async function fetchQuestions() {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
        .from('medical_questions')
        .select('*')
        .in('status', ['open', 'answered'])
        .gte('created_at', weekAgo);

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

    const isDoctorMode = !!tempDoctorName;

    container.innerHTML = allQuestions
        .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
        .map(q => {
            let answersHtml = '';
            if (q.answers && q.answers.length > 0) {
                answersHtml = q.answers.map(ans => `
                    <div class="bg-green-50 border border-green-200 p-3 rounded-lg mt-2 text-right">
                        <div class="text-xs font-bold text-green-800 flex items-center gap-1">
                            <i class="fas fa-user-md"></i> ${escapeHtml(ans.doctorName)}
                        </div>
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
                    <div class="mt-3 border-t pt-3" style="border-color: var(--border)">${answerSection}</div>
                </div>
            `;
        }).join('');
}

window.submitQuestion = async (e) => {
    e.preventDefault();
    if (!window.checkOnlineStatus()) return;

    const submitBtn = e.target.querySelector('button[type="submit"]');

    const lastQuestion = localStorage.getItem('last_question_time');
    if (lastQuestion && (Date.now() - parseInt(lastQuestion)) < 3600000) {
        const minsLeft = Math.ceil((3600000 - (Date.now() - parseInt(lastQuestion))) / 60000);
        showToast(`يرجى الانتظار ${minsLeft} دقيقة قبل إرسال سؤال جديد.`, 'error');
        return;
    }

    const honeypotField = document.getElementById('website_url');
    if (honeypotField && honeypotField.value !== '') {
        showToast('تم رفض النشر.', 'error');
        return;
    }

    if (askDoctorOpenTime && (Date.now() - askDoctorOpenTime < 3000)) {
        showToast('جاري المعالجة، يرجى الانتظار قليلاً.', 'error');
        return;
    }

    const name = document.getElementById('qaName').value.trim() || 'مجهول';
    const category = document.getElementById('qaCategory').value;
    const text = document.getElementById('qaText').value.trim();
    if (!text) return;

    submitBtn.disabled = true;
    submitBtn.innerText = 'جاري النشر...';

    try {
        const { data: funcData, error: funcError } = await supabase.functions.invoke('manage-public-requests', {
            body: {
                action: 'submit_request',
                type: 'question',
                patient_phone: null,
                payload: { name, category, text }
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

        localStorage.setItem('last_question_time', Date.now().toString());

        await sendPushNotification(null, "سؤال طبي جديد ❓", `تم طرح سؤال جديد: ${text.substring(0, 40)}...`, 'doctors');
        showToast('تم نشر سؤالك بنجاح!', 'success');
        e.target.reset();
        fetchQuestions();
    } catch (err) {
        showToast('حدث خطأ: ' + err.message, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = 'نشر السؤال';
    }
};

window.submitAnswer = async (qId) => {
    if (!window.checkOnlineStatus()) return;

    const input = document.getElementById(`ansText_${qId}`);
    const text = input.value.trim();
    if (!text) return;

    const docName = tempDoctorName || 'طبيب';

    try {
        const q = allQuestions.find(x => x.id === qId);
        if (!q) return;

        const currentAnswers = q.answers || [];
        currentAnswers.push({ doctorName: docName, text: text, timestamp: new Date().toISOString() });

        const { error } = await supabase
            .from('medical_questions')
            .update({ answers: currentAnswers, status: 'answered' })
            .eq('id', qId);

        if (error) throw error;

        showToast('تم نشر إجابتك!', 'success');
        fetchQuestions();
    } catch (err) {
        showToast('خطأ في إرسال الإجابة: ' + err.message, 'error');
    }
};

/* ═══════════════════════════════════════════════════════════════════
   ═══════════════ 20. HEALTH RADAR (الرادار الصحي) ═══════════════
   ═══════════════════════════════════════════════════════════════════ */

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

window.openRahebaRadar = async () => {
    const { data } = await supabase.from('radar_settings').select('*').eq('id', 'config').single();
    if (data) {
        radarSettings = data;
        currentRadarTab = data.default_season || 'summer';
    } else {
        await supabase.from('radar_settings').upsert({ id: 'config', default_season: 'summer', last_reset: 0 });
        radarSettings = { default_season: 'summer', last_reset: 0 };
        currentRadarTab = 'summer';
    }

    const cityOptions = allCities
        .filter(c => c !== 'كل المدن')
        .map(c => `<option value="${c}" ${currentRadarCity === c ? 'selected' : ''}>${c}</option>`)
        .join('');

    const isSummerDefault = radarSettings.default_season === 'summer';

    const summerBtnClass = isSummerDefault ? 'tab-btn active' : 'tab-btn text-gray-500 opacity-50 cursor-not-allowed';
    const winterBtnClass = !isSummerDefault ? 'tab-btn active' : 'tab-btn text-gray-500 opacity-50 cursor-not-allowed';

    const summerBtnAttr = isSummerDefault ? '' : 'disabled';
    const winterBtnAttr = !isSummerDefault ? '' : 'disabled';

    let seasonTabHtml = `
        <button id="tabSummer" onclick="switchRadarTab('summer')" class="${summerBtnClass} flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2" ${summerBtnAttr}>☀️ <span>الصيف</span></button>
        <button id="tabWinter" onclick="switchRadarTab('winter')" class="${winterBtnClass} flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2" ${winterBtnAttr}>❄️ <span>الشتاء</span></button>
    `;

    openCtrlPanel('الرادار الصحي التفاعلي 📡', `
        <div class="flex flex-col gap-6">
            <div class="flex flex-col sm:flex-row justify-center items-center gap-3 bg-white p-3 rounded-2xl shadow-sm max-w-md mx-auto w-full">
                <select id="radarCitySelect" onchange="changeRadarCity(this.value)" class="ctrl-input text-sm mb-2 sm:mb-0">
                    ${cityOptions}
                </select>
                <div class="flex gap-3 w-full sm:w-auto">${seasonTabHtml}</div>
            </div>
            <div id="radarCardsContainer" class="grid grid-cols-1 sm:grid-cols-2 gap-4"></div>
            <div class="text-center mt-4 p-6 bg-white rounded-2xl shadow-sm border" style="border-color: var(--border)">
                <p class="text-sm text-gray-600 mb-4">
                    إذا كنت تعاني من أحد هذه الأعراض في
                    <span id="radarCurrentCityName" style="font-weight: bold; color: var(--accent);">${currentRadarCity}</span>،
                    ساعد مجتمعك بتسجيل حالتك لمتابعة انتشار الأمراض.
                </p>
                <button onclick="openRadarRegisterModal()" class="pulse-register bg-red-500 text-white px-10 py-4 rounded-2xl font-bold text-lg shadow-lg hover:bg-red-600 transition-all w-full sm:w-auto">
                    ➕ سَجّل حالتك الصحية الآن
                </button>
            </div>
            ${generateToolSEOHtml('raheba-radar')}
        </div>
    `, '#4F46E5');

    fetchRadarReports();
};

async function fetchRadarReports() {
    const { data } = await supabase
        .from('disease_reports')
        .select('*')
        .eq('city', currentRadarCity);

    latestRadarReports = data || [];
    renderRadarCards();
}

window.switchRadarTab = (season) => {
    currentRadarTab = season;

    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active', 'text-gray-500'));
    const tabS = document.getElementById('tabSummer');
    const tabW = document.getElementById('tabWinter');

    if (tabS && tabW) {
        if (season === 'summer') {
            tabS.classList.add('active');
            tabW.classList.add('text-gray-500');
        } else {
            tabW.classList.add('active');
            tabS.classList.add('text-gray-500');
        }
    }
    renderRadarCards();
};

window.changeRadarCity = (city) => {
    currentRadarCity = city;

    const cityNameEl = document.getElementById('radarCurrentCityName');
    if (cityNameEl) cityNameEl.innerText = city;

    const registerTextEl = document.querySelector('#ctrlContent p.text-sm.text-gray-600.mb-4');
    if (registerTextEl) {
        registerTextEl.innerHTML = `إذا كنت تعاني من أحد هذه الأعراض في <span id="radarCurrentCityName" style="font-weight: bold; color: var(--accent);">${city}</span>، ساعد مجتمعك بتسجيل حالتك لمتابعة انتشار الأمراض.`;
    }

    fetchRadarReports();
};

function renderRadarCards() {
    const container = document.getElementById('radarCardsContainer');
    if (!container) return;

    const diseases = radarDiseasesData[currentRadarTab];
    const validReports = latestRadarReports.filter(r => new Date(r.timestamp).getTime() > (radarSettings.last_reset || 0));
    const seasonReports = validReports.filter(r => r.season === currentRadarTab);

    let counts = {}, newTodayCounts = {}, ongoingCounts = {};
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todayTime = startOfToday.getTime();

    seasonReports.forEach(r => {
        const time = new Date(r.timestamp).getTime();
        counts[r.disease_id] = (counts[r.disease_id] || 0) + 1;
        if (time >= todayTime) {
            newTodayCounts[r.disease_id] = (newTodayCounts[r.disease_id] || 0) + 1;
        } else {
            ongoingCounts[r.disease_id] = (ongoingCounts[r.disease_id] || 0) + 1;
        }
    });

    container.innerHTML = diseases.map(d => {
        const count = counts[d.id] || 0;
        const newToday = newTodayCounts[d.id] || 0;
        const ongoing = ongoingCounts[d.id] || 0;

        let badgeText = "وضع طبيعي 🟢";
        let badgeColor = "#10B981";
        let badgeBg = "#D1FAE5";
        let barColor = "#10B981";

        if (count >= 21 && count <= 50) {
            badgeText = "انتشار متوسط 🟡";
            badgeColor = "#F59E0B";
            badgeBg = "#FEF3C7";
            barColor = "#F59E0B";
        } else if (count > 50) {
            badgeText = "تنبيه انتشار 🔴";
            badgeColor = "#DC2626";
            badgeBg = "#FEE2E2";
            barColor = "#DC2626";
        }

        let barWidth = Math.min(100, (count / 50) * 100);

        return `
            <div class="p-5 rounded-2xl border transition-all duration-300 hover:shadow-lg cursor-pointer" style="background: var(--card); border-color: var(--border);" onclick="toggleRadarTip('${escapeHtml(d.id)}')">
                <div class="flex items-center justify-between mb-4">
                    <div class="flex items-center gap-3">
                        <div class="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style="background: ${escapeHtml(d.color)}20; color: ${escapeHtml(d.color)};">
                            <i class="fas ${escapeHtml(d.icon)}"></i>
                        </div>
                        <div>
                            <h4 class="font-bold text-base" style="color: var(--fg);">${escapeHtml(d.name)}</h4>
                            <p class="text-[11px]" style="color: var(--muted);">${escapeHtml(d.symptoms)}</p>
                        </div>
                    </div>
                    <span class="text-[10px] font-black px-2 py-1 rounded-lg" style="color: ${escapeHtml(badgeColor)}; background: ${escapeHtml(badgeBg)};">${escapeHtml(badgeText)}</span>
                </div>
                <div class="flex justify-between items-center text-xs mb-2">
                    <span class="font-bold" style="color: var(--fg-light);">${escapeHtml(count)} حالة مسجلة</span>
                </div>
                <div class="flex justify-between text-[11px] mb-3 font-semibold" style="color: var(--muted);">
                    <span>⚡ حالة جديدة اليوم: ${escapeHtml(newToday)}</span>
                    <span>⏳ حالات سابقة: ${escapeHtml(ongoing)}</span>
                </div>
                <div class="w-full rounded-full h-2.5" style="background: var(--bg-deep);">
                    <div class="h-2.5 rounded-full transition-all duration-700" style="width: ${escapeHtml(barWidth)}%; background: ${escapeHtml(barColor)};"></div>
                </div>
                <div id="radarTip_${escapeHtml(d.id)}" class="hidden mt-4 p-3 rounded-xl text-xs flex items-start gap-2" style="background: rgba(37, 99, 235, 0.1); color: var(--fg-light); border: 1px solid rgba(37, 99, 235, 0.2);">
                    <i class="fas fa-lightbulb mt-0.5" style="color: #2563EB;"></i>
                    <div><b style="color: #2563EB;">نصيحة الرادار:</b> ${escapeHtml(d.advice)}</div>
                </div>
            </div>
        `;
    }).join('');
}

window.toggleRadarTip = (id) => {
    const tipDiv = document.getElementById(`radarTip_${id}`);
    if (tipDiv) tipDiv.classList.toggle('hidden');
};

window.openRadarRegisterModal = () => {
    let lastVoteTime = 0;
    try {
        lastVoteTime = parseInt(localStorage.getItem('lastRadarVoteTime') || '0');
    } catch (e) { /* ignore */ }

    if (lastVoteTime > 0) {
        let diff = Date.now() - lastVoteTime;
        let cooldown = 3 * 24 * 60 * 60 * 1000;
        if (diff < cooldown) {
            let daysLeft = Math.ceil((cooldown - diff) / (24 * 60 * 60 * 1000));
            showToast(`شُكراً لك! يمكنك تسجيل حالة جديدة بعد ${daysLeft} أيام لمراقبة تطور الحالة.`);
            return;
        }
    }

    const diseases = radarDiseasesData[currentRadarTab];
    const optionsHtml = diseases.map((d, index) => `
        <label class="flex items-center gap-3 p-3 border-2 rounded-xl cursor-pointer hover:bg-gray-50 transition-all" style="border-color: ${index === 0 ? d.color : '#e5e7eb'}" onclick="selectRadarOption(this, '${escapeHtml(d.id)}')">
            <input type="radio" name="radarDisease" class="hidden" ${index === 0 ? 'checked' : ''}>
            <i class="fas ${escapeHtml(d.icon)} text-xl" style="color: ${escapeHtml(d.color)};"></i>
            <div>
                <div class="font-bold text-sm">${escapeHtml(d.name)}</div>
                <div class="text-[10px] text-gray-500">${escapeHtml(d.symptoms)}</div>
            </div>
        </label>
    `).join('');

    document.getElementById('modalContent').innerHTML = `
        <div class="p-6">
            <div class="flex justify-between items-center mb-6">
                <h3 class="font-bold text-xl">تسجيل حالة صحية</h3>
                <button onclick="closeModal()" class="text-2xl hover:text-gray-400">&times;</button>
            </div>
            <p class="text-sm text-gray-500 mb-4">اختر الفئة التي تعاني منها:</p>
            <div id="radarModalOptions" class="flex flex-col gap-3 mb-6">${optionsHtml}</div>
            <div class="mb-6">
                <label class="block text-sm font-semibold mb-2">منذ متى تعاني من هذه الأعراض؟</label>
                <select id="radarDuration" class="ctrl-input text-sm">
                    <option value="يوم واحد">يوم واحد</option>
                    <option value="2-3 أيام">2-3 أيام</option>
                    <option value="أكثر من أسبوع">أكثر من أسبوع</option>
                </select>
            </div>
            <button onclick="submitRadarVote()" class="w-full bg-red-500 text-white py-3 rounded-xl font-bold hover:bg-red-600 transition-all">تأكيد التسجيل</button>
        </div>
    `;

    document.getElementById('modalOverlay').classList.add('active');
    lockScroll();
    window.selectedRadarDisease = diseases[0].id;
};

window.selectRadarOption = (element, id) => {
    document.querySelectorAll('#radarModalOptions label').forEach(l => l.style.borderColor = '#e5e7eb');
    element.style.borderColor = '#0E7C5F';
    window.selectedRadarDisease = id;
};

window.submitRadarVote = async () => {
    if (!window.selectedRadarDisease) return;

    const duration = document.getElementById('radarDuration').value;

    try {
        const targetCity = currentRadarCity || 'الرحيبة';

        const { data, error } = await supabase
            .from('disease_reports')
            .insert([{
                disease_id: window.selectedRadarDisease,
                season: currentRadarTab,
                duration: duration,
                timestamp: new Date().toISOString(),
                city: targetCity
            }])
            .select();

        localStorage.setItem('lastRadarVoteTime', Date.now().toString());
        closeModal();
        showToast('تم تسجيل حالتك بنجاح!', 'success');
        fetchRadarReports();

        setTimeout(() => {
            document.getElementById('modalContent').innerHTML = `
                <div class="p-8 text-center">
                    <div class="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i class="fas fa-heart text-4xl text-red-500"></i>
                    </div>
                    <h3 class="font-bold text-xl mb-2 text-gray-800">نتمنى لك الشفاء العاجل!</h3>
                    <p class="text-sm text-gray-500 mb-6">تمت إضافتك لرادار الصحي. ساهم تسجيلك في حماية المجتمع.</p>
                    <button onclick="closeAllOverlays(); redirectToDoctorsSearch()" class="w-full bg-blue-500 text-white py-4 rounded-xl font-bold mb-2 hover:bg-blue-600 transition-all">
                        👨‍⚕️ تواصل مع الأطباء المتاحين الآن
                    </button>
                    <button onclick="closeModal()" class="text-gray-400 py-2 text-sm hover:text-gray-600">إغلاق</button>
                </div>
            `;
            document.getElementById('modalOverlay').classList.add('active');
        }, 300);
    } catch (err) {
        showToast('حدث خطأ', 'error');
    }
};

window.redirectToDoctorsSearch = () => {
    closeModal();
    closeCtrlPanel();
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

window.setRadarDefaultSeason = async () => {
    if (!window.checkOnlineStatus()) return;
    try {
        await supabase.from('radar_settings').upsert({
            id: 'config',
            default_season: document.getElementById('adminRadarSeason').value,
            last_reset: radarSettings.last_reset || 0
        });
        showToast("تم تحديث الفصل الافتراضي");
    } catch (e) { /* ignore */ }
};

window.resetRadarVotes = async () => {
    if (!window.checkOnlineStatus()) return;
    try {
        await supabase.from('radar_settings').upsert({
            id: 'config',
            default_season: radarSettings.default_season,
            last_reset: Date.now()
        });
        showToast("تم تصفير العدادات بنجاح");
    } catch (e) { /* ignore */ }
};

/* ═══════════════════════════════════════════════════════════════════
   ═══════════════ END OF TOOLS.JS ═══════════════
   ═══════════════════════════════════════════════════════════════════ */

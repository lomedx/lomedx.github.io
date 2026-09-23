function initializeCinematicIntro() {
    const overlay = document.getElementById('cinematicIntroOverlay');
    if (!overlay || !window.THREE) return;

    // 1. حقن الـ HTML و CSS داخل الحاوية
    overlay.innerHTML = `
    <style>
      :root {
        --bg: #020c0a; --green: #0d9488; --green-soft: #2dd4bf;
        --cyan: #22d3ee; --gold: #d4a017; --text: #f0fdfa;
        --text2: #99b8b0; --border: rgba(13, 148, 136, 0.22);
      }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      
      .cinema-app { width: 100vw; height: 100vh; position: relative; font-family: 'Noto Kufi Arabic', sans-serif; color: var(--text); overflow: hidden; background: #000; }
      #globe-container { width: 100%; height: 100%; position: absolute; inset: 0; }

      .intro-overlay { position: absolute; inset: 0; z-index: 100; background: #010807; display: flex; align-items: center; justify-content: center; flex-direction: column; transition: opacity 1.8s ease, visibility 1.8s; }
      .intro-overlay.hide { opacity: 0; visibility: hidden; }
      .intro-logo { width: 64px; height: 64px; border-radius: 16px; margin-bottom: 28px; opacity: 0; animation: introFade 1.2s ease forwards 0.3s; border: 1px solid rgba(212,160,23,0.4); }
      .intro-text { font-size: 13px; font-weight: 500; letter-spacing: 6px; color: var(--green-soft); opacity: 0; animation: introFade 1.2s ease forwards 0.6s; }
      .intro-line { width: 0; height: 1px; margin-top: 24px; background: linear-gradient(90deg, transparent, var(--green-soft), transparent); animation: introLine 1.6s ease forwards 1s; }
      @keyframes introFade { to { opacity: 1; } }
      @keyframes introLine { to { width: 180px; } }

      .vignette { position: absolute; inset: 0; z-index: 8; pointer-events: none; box-shadow: inset 0 0 180px 40px rgba(0,0,0,0.65); }
      .hud-corner { position: absolute; width: 70px; height: 70px; z-index: 12; border: 1px solid rgba(13,148,136,0.25); pointer-events: none; }
      .hud-tl { top: 16px; left: 16px; border-right: none; border-bottom: none; border-radius: 12px 0 0 0; }
      .hud-tr { top: 16px; right: 16px; border-left: none; border-bottom: none; border-radius: 0 12px 0 0; }
      .hud-bl { bottom: 16px; left: 16px; border-right: none; border-top: none; border-radius: 0 0 0 12px; }
      .hud-br { bottom: 16px; right: 16px; border-left: none; border-top: none; border-radius: 0 0 12px 0; }

      .top-bar { position: absolute; top: 0; left: 0; right: 0; z-index: 50; display: flex; justify-content: space-between; align-items: center; padding: 22px 40px; background: linear-gradient(to bottom, rgba(2,12,10,0.85), transparent); pointer-events: none; }
      .top-bar > * { pointer-events: auto; }
      .logo { display: flex; align-items: center; gap: 12px; font-weight: 800; font-size: 20px; }
      .logo img { width: 38px; height: 38px; border-radius: 10px; border: 1px solid rgba(212,160,23,0.35); }
      .logo span { background: linear-gradient(135deg, #d4a017, #f0d78c); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }

      .controls { display: flex; gap: 8px; align-items: center; }
      .ctrl-btn { background: rgba(6,24,21,0.55); border: 1px solid var(--border); color: var(--green-soft); padding: 8px 14px; border-radius: 8px; font-family: inherit; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.25s; display: flex; align-items: center; gap: 6px; backdrop-filter: blur(6px); }
      .ctrl-btn:hover { background: rgba(13,148,136,0.12); border-color: rgba(13,148,136,0.4); }
      .ctrl-btn.active { background: rgba(13,148,136,0.2); border-color: var(--green); color: #5eead4; }
      .ctrl-btn.danger { border-color: rgba(248,113,113,0.35); color: #fca5a5; }
      .ctrl-btn.danger:hover { background: rgba(248,113,113,0.12); }

      .progress-wrap { position: absolute; top: 78px; left: 50%; transform: translateX(-50%); z-index: 45; width: min(320px, 70vw); opacity: 0; transition: opacity 0.4s; pointer-events: none; }
      .progress-wrap.show { opacity: 1; }
      .progress-track { height: 3px; background: rgba(255,255,255,0.08); border-radius: 4px; overflow: hidden; }
      .progress-fill { height: 100%; width: 0%; background: linear-gradient(90deg, var(--green), var(--cyan)); border-radius: 4px; transition: width 0.6s ease; }
      .progress-text { text-align: center; font-size: 11px; color: var(--text2); margin-top: 6px; letter-spacing: 1px; }

      .section-label { position: absolute; z-index: 30; padding: 7px 14px 7px 12px; background: rgba(4,18,16,0.82); border: 1px solid rgba(13,148,136,0.3); border-radius: 40px; color: #e0f2f1; font-size: 12px; font-weight: 600; backdrop-filter: blur(10px); cursor: pointer; transition: all 0.3s ease; white-space: nowrap; display: flex; align-items: center; gap: 7px; opacity: 0; box-shadow: 0 4px 20px rgba(0,0,0,0.25); }
      .section-label.visible { opacity: 0.92; }
      .section-label:hover { background: rgba(13,148,136,0.18); border-color: rgba(45,212,191,0.5); transform: scale(1.04); }
      .section-label.highlight { background: rgba(13,148,136,0.28); border-color: var(--green-soft); color: #fff; box-shadow: 0 0 24px rgba(45,212,191,0.25); transform: scale(1.06); opacity: 1; }
      .section-label i { font-size: 12px; color: var(--green-soft); }

      .bot-bar { position: absolute; bottom: 32px; left: 50%; transform: translateX(-50%); z-index: 40; background: rgba(4,18,16,0.9); border: 1px solid rgba(212,160,23,0.25); border-radius: 50px; padding: 12px 22px; display: flex; align-items: center; gap: 14px; backdrop-filter: blur(14px); max-width: 92%; opacity: 0; transition: all 0.45s ease; box-shadow: 0 8px 32px rgba(0,0,0,0.3); }
      .bot-bar.show { opacity: 1; bottom: 40px; }
      .bot-avatar { width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, var(--green), #0f766e); display: grid; place-items: center; font-size: 15px; flex-shrink: 0; }
      .bot-text { font-size: 13.5px; color: #c5d9d3; line-height: 1.45; min-height: 20px; }
      .bot-text strong { color: var(--green-soft); font-weight: 700; }

      .cinema-panel { position: absolute; inset: 0; z-index: 70; background: rgba(1,8,7,0.78); backdrop-filter: blur(16px); display: none; align-items: center; justify-content: center; padding: 24px; }
      .cinema-panel.open { display: flex; animation: fadeIn 0.4s ease; }
      @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

      .panel-box { max-width: 680px; width: 100%; background: rgba(6,22,20,0.96); border: 1px solid rgba(13,148,136,0.28); border-radius: 20px; padding: 40px 36px; position: relative; max-height: 82vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.4); transform: translateY(24px); opacity: 0; animation: panelIn 0.5s cubic-bezier(0.16,1,0.3,1) forwards; }
      @keyframes panelIn { to { transform: translateY(0); opacity: 1; } }

      .panel-close { position: absolute; top: 16px; left: 16px; width: 34px; height: 34px; border-radius: 50%; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #a7c4bb; font-size: 15px; cursor: pointer; display: grid; place-items: center; transition: 0.25s; }
      .panel-close:hover { background: rgba(248,113,113,0.15); border-color: #f87171; color: #fca5a5; }

      .panel-tag { font-size: 11px; font-weight: 600; color: var(--gold); letter-spacing: 2.5px; margin-bottom: 8px; }
      .panel-box h2 { font-size: 26px; font-weight: 800; margin-bottom: 12px; letter-spacing: -0.3px; }
      .panel-box > p { color: var(--text2); font-size: 14.5px; line-height: 1.75; margin-bottom: 24px; }

      .panel-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
      .panel-card { background: rgba(255,255,255,0.025); border: 1px solid rgba(255,255,255,0.06); border-radius: 14px; padding: 16px; transition: 0.25s; }
      .panel-card:hover { background: rgba(13,148,136,0.08); border-color: rgba(13,148,136,0.25); }
      .panel-card i { font-size: 18px; color: var(--green-soft); margin-bottom: 10px; display: block; }
      .panel-card h4 { font-size: 14.5px; font-weight: 700; margin-bottom: 4px; color: #fff; }
      .panel-card p { font-size: 12.5px; color: #6d8f84; margin: 0; line-height: 1.5; }

      .panel-metrics { display: flex; gap: 32px; margin-top: 24px; padding-top: 18px; border-top: 1px solid rgba(255,255,255,0.06); }
      .panel-metrics strong { display: block; font-size: 24px; font-weight: 800; color: var(--cyan); }
      .panel-metrics span { font-size: 11.5px; color: #6d8f84; }

      .hint { position: absolute; bottom: 18px; left: 50%; transform: translateX(-50%); z-index: 20; font-size: 11px; color: rgba(255,255,255,0.28); pointer-events: none; letter-spacing: 1px; }

      @media (max-width: 700px) {
        .top-bar { padding: 14px 16px; flex-direction: column; gap: 10px; }
        .panel-grid { grid-template-columns: 1fr; }
        .panel-box { padding: 32px 20px; }
        .panel-box h2 { font-size: 22px; }
        .hud-corner { width: 40px; height: 40px; }
        .controls { flex-wrap: wrap; justify-content: center; }
        .progress-wrap { top: 110px; }
      }
    </style>

    <div class="cinema-app">
      <div class="intro-overlay" id="intro">
        <img class="intro-logo" src="https://i.ibb.co/d09VBmky/37414.png" alt="LomedX">
        <div class="intro-text">LOMEDX</div>
        <div class="intro-line"></div>
      </div>

      <div id="globe-container"></div>
      <div class="vignette"></div>

      <div class="hud-corner hud-tl"></div>
      <div class="hud-corner hud-tr"></div>
      <div class="hud-corner hud-bl"></div>
      <div class="hud-corner hud-br"></div>

      <div class="top-bar">
        <div class="logo">
          <img src="https://i.ibb.co/d09VBmky/37414.png" alt="LomedX">
          Lomed<span>X</span>
        </div>
        <div class="controls">
          <button class="ctrl-btn" id="btn-manual" onclick="cinematicIntro.setMode('manual')">
            <i class="fas fa-hand-pointer"></i> يدوي
          </button>
          <button class="ctrl-btn active" id="btn-auto" onclick="cinematicIntro.setMode('auto')">
            <i class="fas fa-film"></i> سينمائي
          </button>
          <button class="ctrl-btn" id="btn-pause" onclick="cinematicIntro.togglePause()" style="display:none;">
            <i class="fas fa-pause" id="pause-icon"></i> <span id="pause-text">إيقاف</span>
          </button>
          <button class="ctrl-btn danger" id="btn-skip" onclick="cinematicIntro.skipTour()" style="display:none;">
            <i class="fas fa-forward"></i> تخطي
          </button>
        </div>
      </div>

      <div class="progress-wrap" id="progress-wrap">
        <div class="progress-track"><div class="progress-fill" id="progress-fill"></div></div>
        <div class="progress-text" id="progress-text">1 / 8</div>
      </div>

      <div class="section-label" id="label-home" data-section="home"><i class="fas fa-home"></i> النظام الأساسي</div>
      <div class="section-label" id="label-doc" data-section="doc"><i class="fas fa-user-doctor"></i> وحدة الأطباء</div>
      <div class="section-label" id="label-pharm" data-section="pharm"><i class="fas fa-prescription-bottle-medical"></i> وحدة الصيدليات</div>
      <div class="section-label" id="label-file" data-section="file"><i class="fas fa-shield-heart"></i> الملف الصحي</div>
      <div class="section-label" id="label-blood" data-section="blood"><i class="fas fa-droplet"></i> بنك الدم والتكافل</div>
      <div class="section-label" id="label-calc" data-section="calc"><i class="fas fa-calculator"></i> الحاسبات الطبية</div>
      <div class="section-label" id="label-radar" data-section="radar"><i class="fas fa-satellite-dish"></i> الرادار والمدونة</div>
      <div class="section-label" id="label-vision" data-section="vision"><i class="fas fa-eye"></i> البروتوكول المستقبلي</div>

      <div class="bot-bar" id="bot-bar">
        <div class="bot-avatar"><i class="fas fa-robot"></i></div>
        <div class="bot-text" id="bot-text">جاري تهيئة النظام...</div>
      </div>

      <div class="hint" id="hint" style="display:none;">اسحب لتدوير الكوكب • انقر على العلامات لاستكشاف الأقسام</div>

      <div class="cinema-panel" id="panel-home">
        <div class="panel-box">
          <button class="panel-close" onclick="cinematicIntro.closePanel()"><i class="fas fa-times"></i></button>
          <div class="panel-tag">SYSTEM CORE</div>
          <h2>النظام الأساسي لرعاية ذكية</h2>
          <p>منصة LomedX نظام تشغيل طبي متكامل يمكّن المرضى من إدارة ملفاتهم الصحية بذكاء، حجز المواعيد، والوصول للطوارئ بكل أمان وسهولة.</p>
          <div class="panel-metrics">
            <div><strong>100%</strong><span>تشفير البيانات</span></div>
            <div><strong>24/7</strong><span>استجابة طوارئ</span></div>
            <div><strong>40%+</strong><span>كفاءة التشغيل</span></div>
          </div>
        </div>
      </div>

      <div class="cinema-panel" id="panel-doc">
        <div class="panel-box">
          <button class="panel-close" onclick="cinematicIntro.closePanel()"><i class="fas fa-times"></i></button>
          <div class="panel-tag">DOCTOR MODULE</div>
          <h2>وحدة الطاقم الطبي</h2>
          <p>نظام إدارة عيادات متكامل يوفر وقت الطبيب ويضمن دقة بيانات المرضى.</p>
          <div class="panel-grid">
            <div class="panel-card"><i class="fas fa-calendar-check"></i><h4>إدارة الحجوزات</h4><p>مواعيد دقيقة مع دردشة مباشرة.</p></div>
            <div class="panel-card"><i class="fas fa-file-prescription"></i><h4>الروشتات الإلكترونية</h4><p>إصدار روشتات موثقة ومشفرة.</p></div>
            <div class="panel-card"><i class="fas fa-qrcode"></i><h4>مسح QR للطوارئ</h4><p>وصول فوري لملف المريض.</p></div>
            <div class="panel-card"><i class="fas fa-users"></i><h4>إدارة الازدحام</h4><p>مؤشر مباشر لازدحام العيادة.</p></div>
          </div>
        </div>
      </div>

      <div class="cinema-panel" id="panel-pharm">
        <div class="panel-box">
          <button class="panel-close" onclick="cinematicIntro.closePanel()"><i class="fas fa-times"></i></button>
          <div class="panel-tag">PHARMACY MODULE</div>
          <h2>وحدة الصيدليات</h2>
          <p>منصة موحدة لعرض خدمات الصيدليات وتوسيع الوصول للمرضى.</p>
          <div class="panel-grid">
            <div class="panel-card"><i class="fas fa-pills"></i><h4>طلبات الأدوية</h4><p>استقبال طلبات عاجلة والرد عليها.</p></div>
            <div class="panel-card"><i class="fas fa-moon"></i><h4>المناوبات الليلية</h4><p>تحديد حالة الصيدلية بدقة.</p></div>
            <div class="panel-card"><i class="fas fa-chart-line"></i><h4>إحصائيات المجتمع</h4><p>تتبع الأدوية الموفرة للمجتمع.</p></div>
            <div class="panel-card"><i class="fas fa-store"></i><h4>إدارة المخزون</h4><p>تحديث حالة توفر الأدوية.</p></div>
          </div>
        </div>
      </div>

      <div class="cinema-panel" id="panel-file">
        <div class="panel-box">
          <button class="panel-close" onclick="cinematicIntro.closePanel()"><i class="fas fa-times"></i></button>
          <div class="panel-tag">HEALTH FILE</div>
          <h2>الملف الصحي المشفر</h2>
          <p>سجل طبي شخصي مشفر يرافقك في كل مكان مع إمكانية الوصول السريع في الطوارئ.</p>
          <div class="panel-grid">
            <div class="panel-card"><i class="fas fa-notes-medical"></i><h4>السجل المرضي</h4><p>الأمراض المزمنة والحساسية.</p></div>
            <div class="panel-card"><i class="fas fa-file-medical"></i><h4>أرشيف الروشتات</h4><p>كل الوصفات في مكان واحد.</p></div>
            <div class="panel-card"><i class="fas fa-qrcode"></i><h4>QR للطوارئ</h4><p>وصول دون كلمة مرور.</p></div>
            <div class="panel-card"><i class="fas fa-tooth"></i><h4>سجلات متخصصة</h4><p>الأسنان والعيون وغيرها.</p></div>
          </div>
        </div>
      </div>

      <div class="cinema-panel" id="panel-blood">
        <div class="panel-box">
          <button class="panel-close" onclick="cinematicIntro.closePanel()"><i class="fas fa-times"></i></button>
          <div class="panel-tag">SOLIDARITY SYSTEM</div>
          <h2>بنك الدم والتكافل الطبي</h2>
          <p>منظومة تكافلية تربط المتبرعين بالمحتاجين في أسرع وقت.</p>
          <div class="panel-grid">
            <div class="panel-card"><i class="fas fa-droplet"></i><h4>بنك الدم الرقمي</h4><p>ربط المتبرعين بالمحتاجين.</p></div>
            <div class="panel-card"><i class="fas fa-hand-holding-medical"></i><h4>تبرع الأجهزة</h4><p>إعارة وتبرع بالمعدات الطبية.</p></div>
            <div class="panel-card"><i class="fas fa-search"></i><h4>ابحث عن دوائك</h4><p>خدمة البحث السريع عن الدواء.</p></div>
            <div class="panel-card"><i class="fas fa-comments"></i><h4>تواصل مباشر</h4><p>قنوات تواصل فورية.</p></div>
          </div>
        </div>
      </div>

      <div class="cinema-panel" id="panel-calc">
        <div class="panel-box">
          <button class="panel-close" onclick="cinematicIntro.closePanel()"><i class="fas fa-times"></i></button>
          <div class="panel-tag">MEDICAL TOOLS</div>
          <h2>الحاسبات الطبية</h2>
          <p>أدوات حسابية دقيقة لدعم القرارات الصحية اليومية.</p>
          <div class="panel-grid">
            <div class="panel-card"><i class="fas fa-baby"></i><h4>جرعات الأطفال</h4><p>حاسبة آمنة حسب الوزن.</p></div>
            <div class="panel-card"><i class="fas fa-person-pregnant"></i><h4>حاسبة الحمل</h4><p>تتبع مراحل الحمل بدقة.</p></div>
            <div class="panel-card"><i class="fas fa-weight-scale"></i><h4>مؤشر كتلة الجسم</h4><p>BMI مع توصيات.</p></div>
            <div class="panel-card"><i class="fas fa-glass-water"></i><h4>احتياج الماء</h4><p>حساب الاحتياج اليومي.</p></div>
          </div>
        </div>
      </div>

      <div class="cinema-panel" id="panel-radar">
        <div class="panel-box">
          <button class="panel-close" onclick="cinematicIntro.closePanel()"><i class="fas fa-times"></i></button>
          <div class="panel-tag">HEALTH RADAR</div>
          <h2>الرادار الصحي والمدونة</h2>
          <p>رصد حي للأمراض الموسمية مع مكتبة طبية موثوقة.</p>
          <div class="panel-grid">
            <div class="panel-card"><i class="fas fa-satellite-dish"></i><h4>الرادار التفاعلي</h4><p>رصد الأمراض الموسمية حياً.</p></div>
            <div class="panel-card"><i class="fas fa-virus"></i><h4>دليل الأمراض</h4><p>دليل وقائي محلي.</p></div>
            <div class="panel-card"><i class="fas fa-book-medical"></i><h4>المدونة الذكية</h4><p>مقالات ودليل التحاليل.</p></div>
            <div class="panel-card"><i class="fas fa-vial"></i><h4>تعليمات التحاليل</h4><p>إرشادات ما قبل الفحص.</p></div>
          </div>
        </div>
      </div>

      <div class="cinema-panel" id="panel-vision">
        <div class="panel-box">
          <button class="panel-close" onclick="cinematicIntro.closePanel()"><i class="fas fa-times"></i></button>
          <div class="panel-tag">FUTURE PROTOCOL</div>
          <h2>البروتوكول المستقبلي</h2>
          <p>نعمل على سد الفجوة بين المريض ومقدم الرعاية، ليصبح الوصول للبيانات الطبية والتبرع بالدم بسيطاً وآمناً ومتاحاً للجميع.</p>
          <div class="panel-metrics">
            <div><strong>100%</strong><span>بيانات مشفرة</span></div>
            <div><strong>24/7</strong><span>دعم متواصل</span></div>
            <div><strong>∞</strong><span>تكافل مجتمعي</span></div>
          </div>
        </div>
      </div>
    </div>
    `;

    // 2. أكواد الجافاسكريبت الخاصة بالكوكب (من ملفك الأصلي)
    const sections = [
      { id: 'home',  angle: 0.4,  elev: 0.35, bot: 'تهيئة <strong>النظام الأساسي</strong>... نقطة الانطلاق لمنظومة LomedX', pause: 9000 },
      { id: 'doc',   angle: 1.2,  elev: -0.1, bot: 'تحميل <strong>وحدة الطاقم الطبي</strong>... الحجوزات والروشتات الإلكترونية', pause: 9000 },
      { id: 'pharm', angle: 2.1,  elev: 0.2,  bot: 'تفعيل <strong>وحدة الصيدليات</strong>... الطلبات العاجلة وإدارة المناوبات', pause: 9000 },
      { id: 'file',  angle: 3.0,  elev: -0.25,bot: 'تأمين <strong>الملف الصحي المشفر</strong>... وصول فوري عبر QR في الطوارئ', pause: 9000 },
      { id: 'blood', angle: 3.9,  elev: 0.15, bot: 'إطلاق <strong>منظومة التكافل</strong>... بنك الدم وتبادل الأجهزة الطبية', pause: 9000 },
      { id: 'calc',  angle: 4.8,  elev: -0.2, bot: 'استعراض <strong>الحاسبات الطبية</strong>... أدوات دقيقة لدعم قراراتك', pause: 9000 },
      { id: 'radar', angle: 5.6,  elev: 0.25, bot: 'مسح <strong>الرادار الصحي والمدونة</strong>... رصد الأمراض ومكتبة موثوقة', pause: 9000 },
      { id: 'vision',angle: 6.3,  elev: -0.1, bot: 'استعراض <strong>البروتوكول المستقبلي</strong>... نحو رعاية رقمية للجميع', pause: 9000 }
    ];

    let scene, camera, renderer, controls, globeGroup, core, network;
    let mode = 'auto', tourIndex = 0, tourTimer = null, isTouring = false, isPaused = false;
    let clock = new THREE.Clock();
    let arcs = [];
    let animationFrameId = null;

    // دالة تنظيف وإخفاء العرض (أضيفت لتحرير الذاكرة ومنع التكرار)
    function finishCinematicIntro() {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (tourTimer) clearTimeout(tourTimer);
      if (renderer) {
        renderer.dispose();
        renderer.forceContextLoss();
      }
      overlay.innerHTML = '';
      overlay.style.display = 'none';
      localStorage.setItem('lomedx_cinematic_seen', 'true');
    }

    function initGlobe() {
      const container = document.getElementById('globe-container');
      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 1000);
      camera.position.set(0, 40, 340);

      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      container.appendChild(renderer.domElement);

      controls = new THREE.OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.06;
      controls.minDistance = 160;
      controls.maxDistance = 480;
      controls.enablePan = false;

      globeGroup = new THREE.Group();
      scene.add(globeGroup);

      globeGroup.add(new THREE.Mesh(
        new THREE.SphereGeometry(88, 48, 48),
        new THREE.MeshBasicMaterial({ color: 0x021a16, transparent: true, opacity: 0.92 })
      ));

      globeGroup.add(new THREE.Mesh(
        new THREE.SphereGeometry(89, 28, 20),
        new THREE.MeshBasicMaterial({ color: 0x0d9488, wireframe: true, transparent: true, opacity: 0.12 })
      ));

      const pGeo = new THREE.BufferGeometry();
      const count = 1400;
      const pos = new Float32Array(count * 3);
      const colors = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        const phi = Math.acos(2 * Math.random() - 1);
        const theta = Math.random() * Math.PI * 2;
        const r = 90.5;
        pos[i*3] = r * Math.sin(phi) * Math.cos(theta);
        pos[i*3+1] = r * Math.cos(phi);
        pos[i*3+2] = r * Math.sin(phi) * Math.sin(theta);
        if (Math.random() > 0.92) {
          colors[i*3] = 0.85; colors[i*3+1] = 0.65; colors[i*3+2] = 0.15;
        } else {
          colors[i*3] = 0.15; colors[i*3+1] = 0.7; colors[i*3+2] = 0.55;
        }
      }
      pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      pGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      globeGroup.add(new THREE.Points(pGeo, new THREE.PointsMaterial({
        size: 1.0, vertexColors: true, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending
      })));

      core = new THREE.Mesh(
        new THREE.SphereGeometry(13, 24, 24),
        new THREE.MeshBasicMaterial({ color: 0x14b8a6, transparent: true, opacity: 0.28 })
      );
      globeGroup.add(core);

      globeGroup.add(new THREE.Mesh(
        new THREE.SphereGeometry(97, 32, 32),
        new THREE.MeshBasicMaterial({ color: 0x0d9488, transparent: true, opacity: 0.04, side: THREE.BackSide })
      ));

      const ring1 = new THREE.Mesh(
        new THREE.TorusGeometry(115, 0.35, 12, 80),
        new THREE.MeshBasicMaterial({ color: 0xd4a017, transparent: true, opacity: 0.25 })
      );
      ring1.rotation.x = Math.PI / 3.2;
      globeGroup.add(ring1);

      const ring2 = new THREE.Mesh(
        new THREE.TorusGeometry(132, 0.3, 12, 80),
        new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.18 })
      );
      ring2.rotation.x = -Math.PI / 4.5;
      globeGroup.add(ring2);

      createNetwork();
      createArcs();

      document.querySelectorAll('.section-label').forEach(el => {
        el.addEventListener('click', () => {
          if (mode === 'manual') openPanel(el.dataset.section);
        });
      });

      animate();

      setTimeout(() => {
        document.getElementById('intro').classList.add('hide');
        setTimeout(() => { if (mode === 'auto') startTour(); }, 2000);
      }, 2800);
    }

    function createNetwork() {
      const geo = new THREE.BufferGeometry();
      const vertices = [];
      const corePos = new THREE.Vector3(0, 0, 0);

      sections.forEach(s => {
        const theta = s.angle;
        const phi = Math.PI / 2 - s.elev;
        const r = 90;
        const p = new THREE.Vector3(
          r * Math.sin(phi) * Math.cos(theta),
          r * Math.cos(phi),
          r * Math.sin(phi) * Math.sin(theta)
        );
        s.vec3 = p;
        vertices.push(p.x, p.y, p.z, corePos.x, corePos.y, corePos.z);
      });

      for (let i = 0; i < sections.length; i++) {
        const p1 = sections[i].vec3;
        const p2 = sections[(i + 1) % sections.length].vec3;
        vertices.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z);
      }

      geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      network = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({
        color: 0x2dd4bf, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending
      }));
      globeGroup.add(network);
    }

    function createArcs() {
      for (let i = 0; i < 5; i++) {
        const phi1 = Math.acos(2 * Math.random() - 1);
        const theta1 = Math.random() * Math.PI * 2;
        const phi2 = Math.acos(2 * Math.random() - 1);
        const theta2 = Math.random() * Math.PI * 2;
        const start = new THREE.Vector3(88 * Math.sin(phi1) * Math.cos(theta1), 88 * Math.cos(phi1), 88 * Math.sin(phi1) * Math.sin(theta1));
        const end = new THREE.Vector3(88 * Math.sin(phi2) * Math.cos(theta2), 88 * Math.cos(phi2), 88 * Math.sin(phi2) * Math.sin(theta2));
        const mid = start.clone().add(end).multiplyScalar(0.5).normalize().multiplyScalar(88 + 30 + Math.random() * 25);
        const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
        const arc = new THREE.Mesh(
          new THREE.TubeGeometry(curve, 24, 0.28, 6, false),
          new THREE.MeshBasicMaterial({ color: 0x2dd4bf, transparent: true, opacity: 0.35 })
        );
        globeGroup.add(arc);
        arcs.push(arc);
      }
    }

    function updateLabels() {
      const radius = 108;
      sections.forEach(s => {
        const el = document.getElementById('label-' + s.id);
        if (!el) return;

        const theta = s.angle + globeGroup.rotation.y;
        const phi = Math.PI / 2 - s.elev;
        const x = radius * Math.sin(phi) * Math.cos(theta);
        const y = radius * Math.cos(phi);
        const z = radius * Math.sin(phi) * Math.sin(theta);

        const vec = new THREE.Vector3(x, y, z);
        vec.applyMatrix4(globeGroup.matrixWorld);
        vec.project(camera);

        const sx = (vec.x * 0.5 + 0.5) * window.innerWidth;
        const sy = (-vec.y * 0.5 + 0.5) * window.innerHeight;

        el.style.left = sx + 'px';
        el.style.top = sy + 'px';
        el.style.transform = 'translate(-50%, -50%)';
        el.style.zIndex = vec.z < 1 ? 30 : 5;

        if (vec.z < 1) {
          el.classList.add('visible');
          if (!el.classList.contains('highlight')) el.style.opacity = '';
        } else {
          el.classList.remove('visible');
          el.style.opacity = '0.12';
          el.style.pointerEvents = 'none';
        }
      });
    }

    function animate() {
      animationFrameId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      if (mode === 'manual' && !isTouring) {
        globeGroup.rotation.y += 0.0008;
      }

      const s = 1 + Math.sin(t * 1.8) * 0.12;
      core.scale.set(s, s, s);
      if (network) network.material.opacity = 0.08 + Math.sin(t * 1.2) * 0.06;

      arcs.forEach((arc, i) => {
        arc.material.opacity = 0.2 + Math.sin(t * 1.3 + i) * 0.2;
      });

      controls.update();
      renderer.render(scene, camera);
      updateLabels();
    }

    // ===== Tour Logic =====
    function setMode(m) {
      mode = m;
      isPaused = false;
      document.getElementById('btn-auto').classList.toggle('active', m === 'auto');
      document.getElementById('btn-manual').classList.toggle('active', m === 'manual');
      document.getElementById('hint').style.display = m === 'manual' ? 'block' : 'none';
      document.getElementById('btn-skip').style.display = m === 'auto' ? 'flex' : 'none';
      document.getElementById('btn-pause').style.display = m === 'auto' ? 'flex' : 'none';
      document.getElementById('progress-wrap').classList.toggle('show', m === 'auto');

      stopTour();
      if (m === 'auto') setTimeout(startTour, 500);
      else {
        hideBot();
        clearHighlights();
        closePanel();
        camera.position.z = 340;
      }
    }

    function startTour() {
      if (isTouring) return;
      isTouring = true;
      isPaused = false;
      tourIndex = 0;
      updateProgress();
      document.getElementById('btn-pause').style.display = 'flex';
      document.getElementById('btn-skip').style.display = 'flex';
      showBot('مرحباً بك في العرض السينمائي لمنصة <strong>LomedX</strong>. استرخِ ودعنا نأخذك في جولة.');
      tourTimer = setTimeout(() => nextTourStep(), 4200);
    }

    function stopTour() {
      isTouring = false;
      isPaused = false;
      clearTimeout(tourTimer);
      clearHighlights();
      const pauseIcon = document.getElementById('pause-icon');
      const pauseText = document.getElementById('pause-text');
      if(pauseIcon) pauseIcon.className = 'fas fa-pause';
      if(pauseText) pauseText.textContent = 'إيقاف';
    }

    function togglePause() {
      if (!isTouring) return;
      isPaused = !isPaused;
      document.getElementById('pause-icon').className = isPaused ? 'fas fa-play' : 'fas fa-pause';
      document.getElementById('pause-text').textContent = isPaused ? 'متابعة' : 'إيقاف';

      if (isPaused) {
        clearTimeout(tourTimer);
        showBot('تم إيقاف الجولة مؤقتاً...');
      } else {
        showBot('متابعة الجولة...');
        tourTimer = setTimeout(() => nextTourStep(), 1200);
      }
    }

    function skipTour() {
      stopTour();
      hideBot();
      closePanel();
      // تم التعديل: استدعاء دالة الإخفاء بدلاً من وضع اليدوي
      finishCinematicIntro(); 
    }

    function updateProgress() {
      const total = sections.length;
      const current = Math.min(tourIndex + 1, total);
      document.getElementById('progress-fill').style.width = ((tourIndex / total) * 100) + '%';
      document.getElementById('progress-text').textContent = current + ' / ' + total;
    }

    function nextTourStep() {
      if (!isTouring || mode !== 'auto' || isPaused) return;

      if (tourIndex >= sections.length) {
        document.getElementById('progress-fill').style.width = '100%';
        showBot('اكتمل العرض السينمائي.');
        // تم التعديل: استدعاء دالة الإخفاء بدلاً من وضع اليدوي
        setTimeout(() => finishCinematicIntro(), 3500);
        return;
      }

      const sec = sections[tourIndex];
      clearHighlights();
      updateProgress();

      const label = document.getElementById('label-' + sec.id);
      if (label) label.classList.add('highlight');

      const targetRotY = -sec.angle + Math.PI * 0.45;
      animateCinematic(targetRotY, 210, 2800);
      showBot(sec.bot);

      tourTimer = setTimeout(() => {
        if (isPaused || !isTouring) return;
        openPanel(sec.id);

        tourTimer = setTimeout(() => {
          if (isPaused || !isTouring) return;
          closePanel();
          tourIndex++;
          animateCinematic(globeGroup.rotation.y + 0.4, 340, 1400);
          tourTimer = setTimeout(nextTourStep, 1600);
        }, sec.pause);
      }, 3000);
    }

    function animateCinematic(targetY, targetZ, duration) {
      const startY = globeGroup.rotation.y;
      const startZ = camera.position.z;
      const start = performance.now();

      function tick(now) {
        if (isPaused) return;
        const p = Math.min((now - start) / duration, 1);
        const ease = 1 - Math.pow(1 - p, 3.5);
        globeGroup.rotation.y = startY + (targetY - startY) * ease;
        camera.position.z = startZ + (targetZ - startZ) * ease;
        if (p < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    }

    function clearHighlights() {
      document.querySelectorAll('.section-label').forEach(l => l.classList.remove('highlight'));
    }

    function showBot(html) {
      document.getElementById('bot-text').innerHTML = html;
      document.getElementById('bot-bar').classList.add('show');
    }
    function hideBot() {
      const botBar = document.getElementById('bot-bar');
      if(botBar) botBar.classList.remove('show');
    }

    function openPanel(id) {
      document.querySelectorAll('.cinema-panel').forEach(p => p.classList.remove('open'));
      const panel = document.getElementById('panel-' + id);
      if (panel) panel.classList.add('open');
    }
    function closePanel() {
      document.querySelectorAll('.cinema-panel').forEach(p => p.classList.remove('open'));
    }

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        if (isTouring) skipTour();
        else closePanel();
      }
    });

    window.addEventListener('resize', () => {
      if(camera && renderer) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      }
    });

    // تشغيل الكوكب
    initGlobe();

    // إتاحة الدوال للاستدعاء من خلال أزرار الـ HTML
    window.cinematicIntro = {
      setMode,
      togglePause,
      skipTour,
      closePanel
    };
}

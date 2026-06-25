/**
 * App-UI language (chrome: buttons, labels, toasts). Separate from the
 * response language the agents write in (profiles.preferred_language).
 *
 * Kept as a plain module (no React, no server deps) so both server and
 * client components can import it.
 */

export type AppLanguage = "en" | "tr";
/** Stored preference: "auto" resolves from the browser's Accept-Language. */
export type AppLanguagePref = AppLanguage | "auto";

const en = {
  // shared
  close: "Close",
  cancel: "Cancel",
  save: "Save",
  delete: "Delete",
  review: "Review",

  // top bar
  newChat: "New chat",
  history: "History",
  historyTitle: "Chat history",
  searchChats: "Search chats…",
  new: "New",
  noChatsFound: "No chats found.",
  noChatsYet: "No chats yet.",
  rename: "Rename",
  renameChat: "Rename chat",
  deleteChat: "Delete chat",
  chatRenamed: "Chat renamed",
  renameFailed: "Could not rename chat",
  chatDeleted: "Chat deleted",
  deleteFailed: "Could not delete chat",
  deleteAsk: 'Delete "{title}"?',
  groupToday: "Today",
  groupYesterday: "Yesterday",
  groupWeek: "Previous 7 days",
  groupOlder: "Older",

  // profile panel
  profileTitle: "Profile & settings",
  preferences: "Preferences",
  theme: "Theme",
  themeLight: "Light",
  themeDark: "Dark",
  themeAuto: "Auto",
  defaultMode: "Default mode",
  appLanguage: "App language",
  repliesIn: "Replies in",
  langAuto: "Auto",
  usage: "Usage",
  statChats: "Chats",
  statMessages: "Messages",
  statTokens: "Tokens",
  statCost: "Cost",
  adminPanel: "Admin panel",
  signOut: "Sign out",

  // modes
  modeBuild: "Build",
  modePlan: "Plan",
  modeDiscuss: "Discuss",
  tipBuild: "The team delivers the result directly.",
  tipPlan: "The team outlines the approach and checks in first.",
  tipDiscuss: "The team weighs options and trade-offs together.",

  // routing control
  routingAuto: "Agent: Auto",
  whoHandles: "Which agent handles this",
  routingAutoDesc: "Onit reads it, asks if unclear, then routes",
  orPinRoles: "or pin agents",
  nRoles: "{n} agents",

  // project board (tasks + decisions + rules)
  board: "Project",
  boardTitle: "Project board",
  tabTasks: "Tasks",
  tabDecisions: "Decisions",
  tabRules: "Rules",
  tasksExplain:
    "Tasks from plans you approve land here and stay with the project. Click one to change its status.",
  tasksEmpty:
    "No tracked tasks yet. When you approve a multi-step plan, its tasks land here.",
  decisionsExplain:
    "Adopted decisions become standing constraints: every specialist respects them in future answers. Onit proposes new ones after team runs.",
  decisionsEmpty:
    "No decisions yet. When the team settles something worth remembering, it lands here for your review.",
  rulesExplain:
    'Every specialist in this project follows these rules. Examples: "Answer in English." "Our stack is Next.js + Supabase." "Prefer free, open-source tools."',
  rulesPlaceholder: "Write the rules your team should always follow…",
  saveRules: "Save rules",
  rulesSaved: "Team rules saved",
  rulesCleared: "Team rules cleared",
  rulesSaveFailed: "Could not save the rules",
  adopt: "Adopt",
  dismiss: "Dismiss",
  markSuperseded: "Mark superseded",
  why: "Why:",
  tradeoff: "Trade-off accepted:",
  decisionUpdateFailed: "Could not update the decision.",
  statusTodo: "todo",
  statusDoing: "doing",
  statusDone: "done",
  statusProposed: "proposed",
  statusAdopted: "adopted",
  statusSuperseded: "superseded",
  changeStatus: "Click to change status",
  decisionCaptured1: "Onit captured a decision for your review",
  decisionCapturedN: "Onit captured {n} decisions for your review",

  // chat chrome
  export: "Export",
  exportTitle: "Export chat as Markdown",
  chatExported: "Chat exported",
  copied: "Copied to clipboard",
  copyFailed: "Could not copy",
  copy: "Copy",
  edit: "Edit",
  done: "Done",
  regenerate: "Regenerate",
  goodAnswer: "Good answer",
  badAnswer: "Bad answer",
  saveResend: "Save & resend",
  edited: "edited by you",
  thinking: "Thinking",
  couldntFinish: "couldn't finish",
  you: "You",
  sessionExpired: "Your session expired. Please sign in again.",
  modelError: "Couldn't reach the model (HTTP {status}){detail}. Please try again.",
  networkError: "Network error. Please try again.",
  routingWorking: "Onit is picking the right specialists",
  synthWorking: "Onit is wrapping up the team's work",
  statusNoActivity: "I don't have enough activity to report on yet.",
  routedTo: "Routed to {handle}",
  planHeader: "Here's the plan:",
  emptyTitle: "Your team is ready.",
  emptyBody:
    "Describe what you need and Onit hands it to the right specialists, or @mention a role to pick yourself.",
  composerPlaceholder: "Describe what you need. Onit routes it, or @mention a role…",
  stopLabel: "Stop",
  sendLabel: "Send",
  scrollBottom: "Scroll to bottom",

  // plan card + step-by-step
  planDrafted: "Onit drafted a {n}-step plan",
  planEditHint: "Edit anything before the team runs.",
  taskPlaceholder: "What should this role do?",
  donePlaceholder: "Done when ... (optional)",
  addStep: "Add a step",
  runPlan: "Run the plan",
  runStepByStep: "Run step by step",
  runStepTitle: "Run one step at a time; you approve each next step",
  removeStep: "Remove step",
  assignedRole: "Assigned role",
  stepDone: "Step {x} of {n} done",
  nextUp: "Next up",
  runNext: "Run next step",
  finishHere: "Finish here",

  // plan mode: edit the document, then push it to build
  pushTitle: "Plan ready?",
  pushHint: "Edit the answer above until it's right, then push it to the team.",
  pushToBuild: "Push to build",
  keepPlanning: "Keep refining",
  pushMessage: "The plan above is approved as written. Switch to build and execute it.",
  msgUpdated: "Saved. The team will work from your edited version.",
  msgUpdateFailed: "Could not save your edit.",

  // billing / plan
  upgradeTitle: "Upgrade to Pro",
  upgradeLimit:
    "You have used your {n} free messages for today. Upgrade to Pro for unlimited.",
  upgradeBlurb: "More room to think with your team, every day.",
  proPrice: "${price}/mo",
  proBenefit1: "Unlimited messages, every day",
  proBenefit2: "The full product team, no daily cap",
  proBenefit3: "Early access to new features",
  upgradeCta: "Upgrade to Pro",
  upgradeSoon: "Checkout is coming soon. Thanks for the interest.",
  upgradeMaybe: "Maybe later",
  upgradeProfile: "Upgrade to Pro",
  planFree: "Free",
  planPro: "Pro",

  // home / landing
  heroTitle: "Tell us your idea.",
  heroAccent: "We're on it.",
  heroTagline:
    "Describe it once, and a full AI product team challenges it, shapes it, and turns it into a plan you can build on.",
  howKicker: "How it works",
  how1Title: "Tell us your idea",
  how1Body:
    "Describe the app or idea you have in plain words. No forms, no long setup.",
  how2Title: "The team gets to work",
  how2Body:
    "Onit hands it to the right specialists. They ask the right questions, spot the risks, and shape a clear plan.",
  how3Title: "Like the plan, start building",
  how3Body: "Tweak the plan however you want, then move to build when it is ready.",
  askAnything: "Ask your team anything…",
  agentsChip: "agents",
  nAgents: "{n} agents",
  panelAgents: "Agents",
  panelModes: "Modes",
  noMatchingAgent: "No matching agent.",
  noMatchingMode: "No matching mode.",

  // public header
  signIn: "Sign in",
  switchLanguage: "Switch language",
  devChip: "Built by",
  devAria: "About the developer",
  devRole: "Product Manager & Builder",

  // retro team story
  storyKicker: "Meet the team",
  storyNext: "Continue",
  storyTapHint: "Click the box to continue, or a character to hear them",
  storyCta: "Write your idea",
  storyIntro1: "You have an idea.",
  storyIntro2: "You shouldn't have to build it alone. Meet your team.",
  storyAnalyst:
    "I turn ideas into requirements and user stories. Nothing vague gets past me.",
  storyProductManager:
    "I own the roadmap. I decide what we build next, and I can tell you why.",
  storyProjectManager:
    "I plan the sprints and clear the blockers. We ship on time.",
  storyProductDesigner:
    "I map the flows and design interfaces people actually enjoy.",
  storyQa: "I break things before your users do. Bugs fear me.",
  storyOutro: "One brief is enough. Write it. We're on it.",

  signinTitle: "Taking you to sign in",
  resumeTitle: "You're in. Briefing your team",
  openTitle: "Briefing your team",
  signinSub: "Your brief is saved. We'll pick it up right after.",
  openSub: "Opening your chat. This takes a second.",

  // quick starters: a lead-in then short example chips that insert a full prompt
  starterLead: "Try one of these:",
  // home (new visitor): 2 build, 2 QA, 1 plan, 1 data
  starterCalLabel: "Calorie tracker",
  starterCalPrompt: "Build a calorie tracker where I log a meal by snapping a photo.",
  starterHabitLabel: "Habit app",
  starterHabitPrompt: "Build a habit tracker that nudges me right when I'm about to slip.",
  starterCheckoutLabel: "Checkout edge cases",
  starterCheckoutPrompt:
    "List the edge cases and test scenarios for an e-commerce checkout flow.",
  starterLoginLabel: "Login test plan",
  starterLoginPrompt:
    "Write a test plan for a login screen with email, Google sign-in, and 2FA.",
  starterSprintLabel: "2-week sprint plan",
  starterSprintPrompt:
    "Break my idea into a prioritized 2-week sprint with clear acceptance criteria.",
  starterChurnLabel: "Find churn drivers",
  starterChurnPrompt:
    "I have user activity data. Help me find what's driving churn and which metrics to watch.",
  // chat (existing project): task-oriented, the user already has context
  starterBacklogLabel: "Prioritize the backlog",
  starterBacklogPrompt: "Turn what we've discussed into a prioritized backlog.",
  starterTestsLabel: "Write test cases",
  starterTestsPrompt: "Write test cases for what we just built.",
  starterMetricsLabel: "Pick metrics to track",
  starterMetricsPrompt: "What metrics should we track to know this is working?",
  starterPrdLabel: "Draft the PRD",
  starterPrdPrompt: "Draft a PRD for this feature.",
} as const;

export type I18nKey = keyof typeof en;

const tr: Record<I18nKey, string> = {
  close: "Kapat",
  cancel: "Vazgeç",
  save: "Kaydet",
  delete: "Sil",
  review: "İncele",

  newChat: "Yeni sohbet",
  history: "Geçmiş",
  historyTitle: "Sohbet geçmişi",
  searchChats: "Sohbetlerde ara…",
  new: "Yeni",
  noChatsFound: "Sohbet bulunamadı.",
  noChatsYet: "Henüz sohbet yok.",
  rename: "Yeniden adlandır",
  renameChat: "Sohbeti yeniden adlandır",
  deleteChat: "Sohbeti sil",
  chatRenamed: "Sohbet yeniden adlandırıldı",
  renameFailed: "Sohbet yeniden adlandırılamadı",
  chatDeleted: "Sohbet silindi",
  deleteFailed: "Sohbet silinemedi",
  deleteAsk: '"{title}" silinsin mi?',
  groupToday: "Bugün",
  groupYesterday: "Dün",
  groupWeek: "Son 7 gün",
  groupOlder: "Daha eski",

  profileTitle: "Profil ve ayarlar",
  preferences: "Tercihler",
  theme: "Tema",
  themeLight: "Açık",
  themeDark: "Koyu",
  themeAuto: "Otomatik",
  defaultMode: "Varsayılan mod",
  appLanguage: "Uygulama dili",
  repliesIn: "Yanıt dili",
  langAuto: "Otomatik",
  usage: "Kullanım",
  statChats: "Sohbet",
  statMessages: "Mesaj",
  statTokens: "Token",
  statCost: "Maliyet",
  adminPanel: "Yönetim paneli",
  signOut: "Çıkış yap",

  modeBuild: "Üret",
  modePlan: "Planla",
  modeDiscuss: "Tartış",
  tipBuild: "Ekip sonucu doğrudan üretir.",
  tipPlan: "Ekip önce yaklaşımı planlar ve onayını alır.",
  tipDiscuss: "Ekip seçenekleri ve ödünleri birlikte tartar.",

  routingAuto: "Ajan: Otomatik",
  whoHandles: "Bunu hangi ajan üstlenecek",
  routingAutoDesc: "Onit isteği okur, gerekirse soru sorar, doğru role yönlendirir",
  orPinRoles: "veya ajan sabitle",
  nRoles: "{n} ajan",

  board: "Proje",
  boardTitle: "Proje panosu",
  tabTasks: "Görevler",
  tabDecisions: "Kararlar",
  tabRules: "Kurallar",
  tasksExplain:
    "Onayladığın planların görevleri burada durur ve projeyle birlikte yaşar. Durumunu değiştirmek için tıkla.",
  tasksEmpty:
    "Henüz görev yok. Çok adımlı bir planı onayladığında görevleri buraya düşer.",
  decisionsExplain:
    "Benimsenen kararlar kalıcı kısıta dönüşür: ekip sonraki tüm işlerde bunlara uyar. Onit ekip çalışmalarından sonra yeni karar önerir.",
  decisionsEmpty:
    "Henüz karar yok. Ekip hatırlanmaya değer bir şeye karar verdiğinde onayın için buraya düşer.",
  rulesExplain:
    'Bu projedeki tüm uzmanlar bu kurallara uyar. Örnek: "Türkçe yanıt ver." "Stack: Next.js + Supabase." "Ücretsiz ve açık kaynak araçları tercih et."',
  rulesPlaceholder: "Ekibinin her zaman uyması gereken kuralları yaz…",
  saveRules: "Kuralları kaydet",
  rulesSaved: "Ekip kuralları kaydedildi",
  rulesCleared: "Ekip kuralları temizlendi",
  rulesSaveFailed: "Kurallar kaydedilemedi",
  adopt: "Benimse",
  dismiss: "Yok say",
  markSuperseded: "Geçersiz işaretle",
  why: "Neden:",
  tradeoff: "Kabul edilen ödün:",
  decisionUpdateFailed: "Karar güncellenemedi.",
  statusTodo: "bekliyor",
  statusDoing: "sürüyor",
  statusDone: "bitti",
  statusProposed: "öneri",
  statusAdopted: "benimsendi",
  statusSuperseded: "geçersiz",
  changeStatus: "Durumu değiştirmek için tıkla",
  decisionCaptured1: "Onit onayın için bir karar önerdi",
  decisionCapturedN: "Onit onayın için {n} karar önerdi",

  export: "Dışa aktar",
  exportTitle: "Sohbeti Markdown olarak dışa aktar",
  chatExported: "Sohbet dışa aktarıldı",
  copied: "Panoya kopyalandı",
  copyFailed: "Kopyalanamadı",
  copy: "Kopyala",
  edit: "Düzenle",
  done: "Bitti",
  regenerate: "Yeniden üret",
  goodAnswer: "İyi yanıt",
  badAnswer: "Kötü yanıt",
  saveResend: "Kaydet ve yeniden gönder",
  edited: "senin düzenlemen",
  thinking: "Düşünce",
  couldntFinish: "tamamlanamadı",
  you: "Sen",
  sessionExpired: "Oturumun sona erdi. Lütfen tekrar giriş yap.",
  modelError: "Modele ulaşılamadı (HTTP {status}){detail}. Lütfen tekrar dene.",
  networkError: "Ağ hatası. Lütfen tekrar dene.",
  routingWorking: "Onit doğru uzmanları seçiyor",
  synthWorking: "Onit ekibin işini topluyor",
  statusNoActivity: "Henüz raporlayacak kadar etkinlik yok.",
  routedTo: "{handle} rolüne yönlendirildi",
  planHeader: "İşte plan:",
  emptyTitle: "Ekibin hazır.",
  emptyBody:
    "İhtiyacını anlat, Onit doğru uzmanlara iletsin; ya da @ ile rolü kendin seç.",
  composerPlaceholder: "İhtiyacını anlat. Onit yönlendirsin ya da @ ile rol seç…",
  stopLabel: "Durdur",
  sendLabel: "Gönder",
  scrollBottom: "En alta in",

  planDrafted: "Onit {n} adımlık bir plan hazırladı",
  planEditHint: "Ekip başlamadan önce dilediğini düzenle.",
  taskPlaceholder: "Bu rol ne yapmalı?",
  donePlaceholder: "Bittiğinde ... (opsiyonel)",
  addStep: "Adım ekle",
  runPlan: "Planı çalıştır",
  runStepByStep: "Adım adım çalıştır",
  runStepTitle: "Adımlar tek tek çalışır; her adımı sen onaylarsın",
  removeStep: "Adımı kaldır",
  assignedRole: "Atanan rol",
  stepDone: "{n} adımdan {x}. tamam",
  nextUp: "Sıradaki",
  runNext: "Sonraki adımı çalıştır",
  finishHere: "Burada bitir",

  pushTitle: "Plan hazır mı?",
  pushHint: "Yukarıdaki yanıtı istediğin hale gelene dek düzenle, sonra ekibe gönder.",
  pushToBuild: "Üretime gönder",
  keepPlanning: "Planlamaya devam",
  pushMessage: "Yukarıdaki plan bu haliyle onaylandı. Üretime geçin ve uygulayın.",
  msgUpdated: "Kaydedildi. Ekip senin düzenlediğin sürümle çalışacak.",
  msgUpdateFailed: "Düzenleme kaydedilemedi.",

  // billing / plan
  upgradeTitle: "Pro'ya geç",
  upgradeLimit:
    "Bugünkü {n} ücretsiz mesajını kullandın. Sınırsız için Pro'ya geç.",
  upgradeBlurb: "Ekibinle düşünmek için her gün daha çok alan.",
  proPrice: "${price}/ay",
  proBenefit1: "Her gün sınırsız mesaj",
  proBenefit2: "Tam ürün ekibi, günlük limit yok",
  proBenefit3: "Yeni özelliklere erken erişim",
  upgradeCta: "Pro'ya geç",
  upgradeSoon: "Ödeme yakında. İlgin için teşekkürler.",
  upgradeMaybe: "Belki sonra",
  upgradeProfile: "Pro'ya geç",
  planFree: "Free",
  planPro: "Pro",

  heroTitle: "Fikrini söyle.",
  heroAccent: "Ekibin üretsin.",
  heroTagline:
    "Bir kez anlat; tam bir yapay zeka ürün ekibi onu sorgular, biçimlendirir ve üzerine inşa edebileceğin bir plana dönüştürür.",
  howKicker: "Nasıl çalışır",
  how1Title: "Fikrini yaz",
  how1Body:
    "Aklındaki uygulamayı ya da fikri gündelik dille anlat. Form yok, uzun kurulum yok.",
  how2Title: "Ekip işe koyulur",
  how2Body:
    "Onit doğru uzmanlara dağıtır; doğru soruları sorar, riskleri görür ve sana net bir plan çıkarır.",
  how3Title: "Planı beğen, başla",
  how3Body: "Planı dilediğin gibi düzenle, hazır olunca üretime geç.",
  askAnything: "Ekibine ne istersen sor…",
  agentsChip: "ajanlar",
  nAgents: "{n} ajan",
  panelAgents: "Ajanlar",
  panelModes: "Modlar",
  noMatchingAgent: "Eşleşen ajan yok.",
  noMatchingMode: "Eşleşen mod yok.",

  signIn: "Giriş yap",
  switchLanguage: "Dili değiştir",
  devChip: "Geliştiren",
  devAria: "Geliştirici hakkında",
  devRole: "Ürün Yöneticisi & Geliştirici",

  storyKicker: "Takımla tanış",
  storyNext: "Devam",
  storyTapHint: "İlerlemek için kutuya, dinlemek için karaktere tıkla",
  storyCta: "Fikrini yaz",
  storyIntro1: "Bir fikrin var.",
  storyIntro2: "Onu tek başına inşa etmek zorunda değilsin. Ekibinle tanış.",
  storyAnalyst:
    "Fikirleri gereksinimlere ve kullanıcı hikayelerine çeviririm. Benden muğlak iş geçmez.",
  storyProductManager:
    "Yol haritası bende. Sırada ne üreteceğimize karar verir, nedenini de söylerim.",
  storyProjectManager:
    "Sprintleri planlar, engelleri kaldırırım. Zamanında teslim ederiz.",
  storyProductDesigner:
    "Akışları haritalar, insanların gerçekten sevdiği arayüzler tasarlarım.",
  storyQa: "Kullanıcıların bulmadan önce ben bozarım. Buglar benden korkar.",
  storyOutro: "Tek bir brief yeter. Yaz. Gerisi bizde.",

  signinTitle: "Girişe yönlendiriliyorsun",
  resumeTitle: "Giriş tamam. Ekibine brief veriliyor",
  openTitle: "Ekibine brief veriliyor",
  signinSub: "Brief'in kaydedildi. Girişten hemen sonra kaldığın yerden devam.",
  openSub: "Sohbetin açılıyor. Bir saniye sürer.",

  starterLead: "Şunlardan birini dene:",
  starterCalLabel: "Kalori takibi",
  starterCalPrompt: "Yemeğin fotoğrafını çekince kaloriyi kaydeden bir uygulama yapalım.",
  starterHabitLabel: "Alışkanlık uygulaması",
  starterHabitPrompt: "Tam pes edeceğim anda beni dürten bir alışkanlık takip uygulaması yapalım.",
  starterCheckoutLabel: "Ödeme uç durumları",
  starterCheckoutPrompt:
    "Bir e-ticaret ödeme akışı için uç durumları ve test senaryolarını çıkar.",
  starterLoginLabel: "Giriş test planı",
  starterLoginPrompt:
    "E-posta, Google ile giriş ve 2FA içeren bir giriş ekranı için test planı yaz.",
  starterSprintLabel: "2 haftalık sprint",
  starterSprintPrompt:
    "Fikrimi, net kabul kriterleriyle önceliklendirilmiş 2 haftalık bir sprinte böl.",
  starterChurnLabel: "Kayıp nedenleri",
  starterChurnPrompt:
    "Kullanıcı aktivite verim var. Kaybı neyin tetiklediğini ve hangi metrikleri izlemem gerektiğini bulmama yardım et.",
  starterBacklogLabel: "Backlog'u önceliklendir",
  starterBacklogPrompt: "Konuştuklarımızı önceliklendirilmiş bir backlog'a dönüştür.",
  starterTestsLabel: "Test senaryoları yaz",
  starterTestsPrompt: "Az önce yaptığımız şey için test senaryoları yaz.",
  starterMetricsLabel: "Metrikleri seç",
  starterMetricsPrompt: "Bunun işe yaradığını anlamak için hangi metrikleri izlemeliyiz?",
  starterPrdLabel: "PRD taslağı çıkar",
  starterPrdPrompt: "Bu özellik için bir PRD taslağı çıkar.",
};

const DICTS: Record<AppLanguage, Record<I18nKey, string>> = { en, tr };

export function translate(
  lang: AppLanguage,
  key: I18nKey,
  vars?: Record<string, string | number>,
): string {
  let s = DICTS[lang][key] ?? en[key];
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      s = s.replaceAll(`{${k}}`, String(v));
    }
  }
  return s;
}

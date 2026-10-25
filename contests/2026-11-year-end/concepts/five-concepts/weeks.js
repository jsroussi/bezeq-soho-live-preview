// The nine weeks of "60 יום מסביב לעולם", in travel order. Everything week-specific on the page comes from here.
//
// - Order is the array order. Move or swap entries and the week numbers, the Sunday–Thursday dates and the route
//   follow by themselves; the design does not change. A week can pin its own dates with `dates: { start, end }`.
// - image: a normal file in images/ (16:9, up to 2K). Until the file exists the page shows a placeholder with `brief`.
//   The stand-in photos there now are credited in images/photos.js.
// - line: one sentence that opens the week.
// - palette: four colours taken from the place itself, light to deep. accent: the one colour the interface borrows.
// - light: the time of day on the globe and in the placeholder (morning | noon | golden | dusk | blue | night).
// - texture: the material pattern behind the stage. motion: how this week's elements arrive.
// - peakDay: theme (Hebrew name) and name { he, local, lang, en }: the peak day in Hebrew, the local language and
//   English (local is skipped on screen when it repeats one of the others). Then the activity from the revised peak-days document (activity, tie to the contest, ops, twist,
//   caution); brief and image are the photo slot. All of it still needs ops approval.
// - peakDay.prize stays null until the budget is set: the page shows a neutral card and never an amount.
window.CONTEST = { name: '60 יום מסביב לעולם', start: '2026-11-01', end: '2026-12-31', home: { city: 'ירושלים', lat: 31.7683, lng: 35.2137 } };

window.WEEKS = [
  {
    country: 'צרפת', city: 'פריז', countryEn: 'France', cityEn: 'Paris', lat: 48.8566, lng: 2.3522,
    image: 'images/paris.jpg', brief: 'גגות פריז בשעה הכחולה, מגדל אייפל ברקע',
    line: 'השבוע מתחיל על גגות פריז, ברגע שהעיר נדלקת בשעה הכחולה.',
    palette: ['#B9A7D6', '#E8D3A3', '#3E4A5C', '#1E2633'], accent: '#B9A7D6',
    light: 'blue', texture: 'zinc', motion: 'drift',
    peakDay: { theme: 'השקה פריזאית', brief: 'פריז בלילה: מלון ובילוי', image: 'images/paris-peak.jpg', palette: ['#8E1B2B', '#0D0D0D', '#C9A24A'], prize: null,
      name: { he: 'השקה פריזאית', local: 'Le Lancement parisien', lang: 'fr', en: 'Parisian Launch' },
      activity: 'עמדת צילום קטנה עם מסגרת פריזאית או רקע דיגיטלי, שאלת טריוויה קצרה על פריז, ופתיחת מפת המסע באתר.',
      tie: 'כל אחד מוצא את עצמו באתר ורואה את נקודת הפתיחה האישית.',
      ops: 'מסך או פוסטר אחד, QR או קישור פנימי, בלי אביזרים לכל עובד.',
      twist: 'משימת הבונוס של מגדל אייפל: אתגר יומי קצר שמוגדר מראש בתקנון.',
    },
  },
  {
    country: 'איטליה', city: 'מילאנו', countryEn: 'Italy', cityEn: 'Milan', lat: 45.4642, lng: 9.19,
    image: 'images/milan.jpg', brief: 'הגלריה ויטוריו אמנואלה בבוקר, אור דרך כיפת הזכוכית',
    line: 'אור בוקר בגלריה, והמסלול של מילאנו מחכה לצעד הראשון.',
    palette: ['#EFE4DC', '#D9A44E', '#8A877F', '#1C1C1E'], accent: '#E07B24',
    light: 'morning', texture: 'mosaic', motion: 'runway',
    peakDay: { theme: 'יום הסטייל של מילאנו', brief: 'מסלול תצוגה: אור לבן, בד, צל', image: 'images/milan-peak.jpg', palette: ['#0E0E0E', '#F4EEE6', '#7A1E2B'], prize: null,
      name: { he: 'יום הסטייל של מילאנו', local: 'La giornata dello stile milanese', lang: 'it', en: 'Milan Style Day' },
      activity: 'הצבעה מהירה על ״הלוק של השבוע״ או אביזר אופנתי מינימלי, לצד טיפ קצר על הצגת ערך ללקוח.',
      tie: 'מדגישים איכות מכירה ולא רק כמות, עם נתון אחד ברור לכל תחום.',
      ops: 'הצבעה דיגיטלית או תמונה קבוצתית אופציונלית. בלי תצוגת אופנה.',
      twist: 'מילאנו מדויקת: חידת התאמה קצרה בין צורך עסקי לפתרון SOHO.',
    },
  },
  {
    country: 'מרוקו', city: 'מרקש', countryEn: 'Morocco', cityEn: 'Marrakech', lat: 31.6295, lng: -7.9811,
    image: 'images/marrakech.jpg', brief: 'חצר ריאד בצהריים: קירות אדמה ורודה, צל ומים',
    line: 'חצר שקטה בצהריים: צל, מים ואדמה ורודה. בחוץ השוק כבר ער.',
    palette: ['#E9C99A', '#C9674A', '#3F5F45', '#2B211C'], accent: '#1F7A5C',
    light: 'noon', texture: 'plaster', motion: 'sweep',
    peakDay: { theme: 'השוק של מרקש', brief: 'חצר בלילה, שולחן ארוך ואור פנסים', image: 'images/marrakech-peak.jpg', palette: ['#2A1A14', '#D98E3A', '#7A2E1F'], prize: null,
      name: { he: 'השוק של מרקש', local: 'سوق مراكش', lang: 'ar', en: 'Marrakech Market' },
      activity: 'שולחן תה או כיבוד קטן לפי אפשרויות האתר, או חידות עם מעטפות דיגיטליות.',
      tie: 'כל פתרון נכון פותח עובדה או חותמת באתר, בלי יתרון תחרותי שאינו בתקנון.',
      ops: 'כיבוד בסיסי שאושר. בלי קייטרינג ובלי תפאורה.',
      twist: 'מצאנו בשוק: שלוש שאלות קצרות על שירות, מוצר או ידע עסקי.',
    },
  },
  {
    country: 'ארה״ב', city: 'לאס וגאס', countryEn: 'USA', cityEn: 'Las Vegas', lat: 36.1699, lng: -115.1398,
    image: 'images/las-vegas.jpg', brief: 'המדבר בדמדומים, והסטריפ נדלק באופק',
    line: 'המדבר מתקרר, הסטריפ נדלק, והשבוע עולה הילוך.',
    palette: ['#F0A36A', '#B5502F', '#4A2F45', '#120F1E'], accent: '#E2408A',
    light: 'dusk', texture: 'strata', motion: 'flicker',
    peakDay: { theme: 'האתגר של וגאס', brief: 'לילה של אורות ומופע', image: 'images/las-vegas-peak.jpg', palette: ['#0B0B12', '#FF3E7F', '#FFC93C'], prize: null,
      name: { he: 'האתגר של וגאס', local: 'Vegas Challenge', lang: 'en', en: 'Vegas Challenge' },
      activity: 'חשיפת לוח תוצאות חי, ספירה לאחור ואתגר צוותי קצר.',
      tie: 'מבליטים את הקפיצה השבועית ואת ההתקדמות לסף הכניסה.',
      ops: 'האתר הוא האטרקציה. ראש צוות מקריא עדכון של 5 דקות בכל חלון משמרת.',
      twist: 'Jackpot של ידע: שאלת ידע יומית, עם פרס סמלי או הגרלה רק אם התקנון מאשר.',
      caution: 'בלי מכונות מזל, הימורים או רמיזה שזכייה אקראית מחליפה ביצועים.',
    },
  },
  {
    country: 'מקסיקו', city: 'קנקון', countryEn: 'Mexico', cityEn: 'Cancún', lat: 21.1619, lng: -86.8515,
    image: 'images/cancun.jpg', brief: 'לגונה בצבע טורקיז בשעת זהב, חול לבן וג׳ונגל',
    line: 'מים בצבע טורקיז, חול לבן, ושבוע שכולו גל אחד ארוך.',
    palette: ['#F4ECDD', '#23B3B0', '#2F6B48', '#0F3B3A'], accent: '#23B3B0',
    light: 'golden', texture: 'caustics', motion: 'wave',
    peakDay: { theme: 'בריחה לקנקון', brief: 'פיאסטה על החוף בשקיעה', image: 'images/cancun-peak.jpg', palette: ['#FF5A5F', '#FFC145', '#0F6E6E'], prize: null,
      name: { he: 'בריחה לקנקון', local: 'Escapada a Cancún', lang: 'es', en: 'Cancún Escape' },
      activity: 'הפסקת רענון קצרה במשמרות, עם מוזיקה, צבע ומשימת ״יעד החופשה״.',
      tie: 'מציגים את קטגוריות הפרסים: חופשה, ספא, אוכל, מזוודות וקניות.',
      ops: 'בלי תחפושות ובלי להוציא את כל הצוות מהעמדות. הבחירה מוצגת באתר.',
      twist: 'לאן הייתם בורחים לסופ״ש? סקר קליל שלא משפיע על הדירוג.',
    },
  },
  {
    country: 'יפן', city: 'טוקיו', countryEn: 'Japan', cityEn: 'Tokyo', lat: 35.6762, lng: 139.6503,
    image: 'images/tokyo.jpg', brief: 'טוקיו בדמדומי חורף מגבוה, הר פוג׳י באופק',
    line: 'ערב חורף מעל העיר והר פוג׳י באופק. צעד אחרי צעד, בדיוק.',
    palette: ['#F1EEE8', '#9A9A96', '#E4572E', '#1E1F24'], accent: '#E4572E',
    light: 'dusk', texture: 'kumiko', motion: 'step',
    peakDay: { theme: 'הדיוק של טוקיו', brief: 'דלפק עץ הינוקי, ערב אומקסה', image: 'images/tokyo-peak.jpg', palette: ['#E6CFA3', '#111111', '#A8322A'], prize: null,
      name: { he: 'הדיוק של טוקיו', local: '東京・一秒の精度', lang: 'ja', en: 'Tokyo Precision' },
      activity: 'אתגר של 60 שניות: חידת לוגיקה, זיהוי צורך לקוח או התאמת מוצר.',
      tie: 'מחברים מהירות, דיוק וחוויית לקוח, גם באיכות שירות ולא רק במכירות.',
      ops: 'בטופס פנימי או באתר, בזמן שמתאים למשמרת.',
      twist: 'Perfect Match: התאמה בין עסק קטן לאינטרנט, טלפוניה, פרסום דיגיטלי או חשמל.',
      caution: 'לא למדוד זמן תגובה באופן שפוגע במי שתלוי בעומס שיחות.',
    },
  },
  {
    country: 'יוון', city: 'אתונה', countryEn: 'Greece', cityEn: 'Athens', lat: 37.9715, lng: 23.7257,
    image: 'images/athens.jpg', brief: 'שקיעה על האקרופוליס, העיר הלבנה למרגלותיו',
    line: 'שקיעה על האקרופוליס, והעיר הלבנה נדלקת למרגלותיה.',
    palette: ['#F1ECE2', '#C8643B', '#7D8B5C', '#1E2A36'], accent: '#C8643B',
    light: 'golden', texture: 'deco', motion: 'rise',
    // DRAFT for Sally to approve: the peak-day document's week 7 was Shanghai; this follows its skyline idea.
    peakDay: { theme: 'האקרופוליס נדלק', brief: 'טיוטה לאישור: האקרופוליס נדלק עם ההתקדמות של הצוות', image: 'images/athens-peak.jpg', palette: ['#14161C', '#C8643B', '#E9C46A'], prize: null,
      draft: 'הוצע במקום יום השיא של שנגחאי, אחרי שיוון נבחרה לשבוע 7. ממתין לאישור סאלי.',
      name: { he: 'האקרופוליס נדלק', local: 'Η Ακρόπολη φωτίζεται', lang: 'el', en: 'The Acropolis Lights Up' },
      activity: 'אקרופוליס דיגיטלי שנדלק עמוד אחר עמוד עם ההתקדמות של הצוות.',
      tie: 'כל הישג מאושר מדליק עמוד נוסף, לצד המספר המדויק ולא במקומו.',
      ops: 'בלי אירוע פיזי. מסך במשרד ותמונה באתר.',
      twist: 'העמוד האחרון: יעד ביניים קבוצתי, עם עדכון אחד ביום.',
    },
  },
  {
    country: 'הודו', city: 'ניו דלהי', countryEn: 'India', cityEn: 'New Delhi', lat: 28.6129, lng: 77.2295,
    image: 'images/new-delhi.jpg', brief: 'שער הודו בערב, השדרה הרחבה מתמלאת באנשים',
    line: 'ערב בניו דלהי: שער הודו נדלק, והשדרה הרחבה מתמלאת באנשים.',
    palette: ['#E9B9A2', '#E58FA0', '#F4A230', '#0F5E63'], accent: '#E58FA0',
    light: 'dusk', texture: 'jali', motion: 'bloom',
    peakDay: { theme: 'הצבעים של הודו', brief: 'קיר דיגיטלי של צבעים וחותמות לקראת השבוע האחרון', image: 'images/new-delhi-peak.jpg', palette: ['#1F7A5A', '#F4A230', '#D4AF37'], prize: null,
      name: { he: 'הצבעים של הודו', local: 'भारत के रंग', lang: 'hi', en: 'Colours of India' },
      activity: 'קיר דיגיטלי של צבעים וחותמות, עם הודעות עידוד של הצוותים לקראת השבוע האחרון.',
      tie: 'מה נותר עד הסף, כמה ימי עבודה נשארו ואילו קטגוריות עדיין פתוחות.',
      ops: 'לוח דיגיטלי או פוסטר אחד. בלי אבקות צבע ובלי תחפושות.',
      twist: 'הצעד האחרון: כל אחד בוחר יעד אישי ריאלי לשבוע האחרון.',
    },
  },
  {
    country: 'ישראל', city: 'ירושלים', countryEn: 'Israel', cityEn: 'Jerusalem', lat: 31.7683, lng: 35.2137,
    image: 'images/jerusalem.jpg', brief: 'העיר העתיקה בשעת זהב',
    line: 'חוזרים הביתה: העיר העתיקה בשעת זהב, וכל המסלול מאחורינו.',
    palette: ['#EADBC0', '#D9A441', '#F2B35B', '#4B3B6B'], accent: '#D9A441',
    light: 'golden', texture: 'ashlar', motion: 'golden',
    peakDay: { theme: 'חוזרים הביתה', brief: 'ירושלים בלילה, כל המסלול מואר', image: 'images/jerusalem-peak.jpg', palette: ['#2A2140', '#F2B35B', '#EADBC0'], prize: null,
      name: { he: 'חוזרים הביתה', local: 'חוזרים הביתה', lang: 'he', en: 'Homecoming Finale' },
      activity: 'חשיפת התוצאות הסופיות, הוקרת צוותים, סרטון מסע קצר והצגת הזוכים לפי התקנון.',
      tie: 'מפת המסע נסגרת בירושלים, וכל החותמות מופיעות במסלול שהושלם.',
      ops: 'טקס קצר או כמה הכרזות מתוזמנות, בלי להשבית מוקדים. אם אין אירוע מרכזי, אותו רגע משודר באתר.',
      twist: 'המזוודה נפתחת: חשיפת הפרסים המאושרים. אין להציג פרס או זוכה לפני אישור.',
    },
  },
];

// The admin page's weeks table (../_shared/admin-weeks.js, when the page loads it before this file): the weeks in the
// table's order, with its country, city and peak-day title. Until a title is entered, the peak day is
// "יום שיא בסגנון <country>" (tbd). The peak-days document's idea stays on the week as peakDay.idea, as a suggestion.
if (window.ADMIN_WEEKS) {
  window.WEEKS = window.ADMIN_WEEKS.arrange(window.WEEKS, (w) => w.city).map((w, i) => {
    const row = window.ADMIN_WEEKS.weeks[i], p = w.peakDay || {};
    return { ...w, city: row.he, country: row.country, peakDay: { ...p, theme: row.peak.title, name: { he: row.peak.title }, tbd: row.peak.tbd,
      date: row.peak.date, text: row.peak.text, activity: null, tie: null, ops: null, twist: null, caution: null, draft: null, idea: p } };
  });
}

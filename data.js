// Единственный файл, который нужно править: предметы, тренажёры, расписание.
// Как добавить тренажёр — см. ТЗ_для_Opus.md.
self.EGE_DATA = {
  // Меняй при ЛЮБОМ изменении файлов: по этой строке телефон обновляет офлайн-кэш.
  version: "2026-11-11-1",

  subjects: [
    { id: "math", title: "Математика" },
    { id: "rus",  title: "Русский" },
    { id: "phys", title: "Физика" },
    { id: "inf",  title: "Информатика" }
  ],

  // id      — короткое имя латиницей, не менять после подключения (на нём держится история открытий)
  // subject — id предмета из списка выше
  // file    — путь к офлайн-файлу тренажёра в папке trainers/ (имя латиницей, без пробелов)
  // days    — дни недели, когда тренажёр попадает в кнопку «Сегодня»: 1 — пн … 7 — вс
  // ready   — false, пока файл не положен в trainers/ (в меню он серый и не открывается)
  // preset  — необязательно: что записать в память браузера перед открытием файла.
  //           Так семь строк орфографии открывают один общий файл сразу на нужном задании.
  trainers: [
    { id: "pervyi-hod", subject: "math", title: "Первый ход (планиметрия, №18)",         file: "trainers/pervyi-hod.html", days: [2],    ready: true },
    { id: "razminka",   subject: "math", title: "Разминка по чертежу",                   file: "trainers/razminka.html",   days: [2],    ready: true },
    { id: "teoriya",    subject: "math", title: "Формулы и факты (теория планиметрии)",  file: "trainers/teoriya.html",    days: [2],    ready: true },

    { id: "rus-9",      subject: "rus",  title: "№9. Гласные в корне",                   file: "trainers/orfografiya.html", preset: { "ege-offline-task": "t9"  }, days: [1, 4], ready: true },
    { id: "rus-10",     subject: "rus",  title: "№10. Приставки, Ъ и Ь",                 file: "trainers/orfografiya.html", preset: { "ege-offline-task": "t10" }, days: [1, 4], ready: true },
    { id: "rus-11",     subject: "rus",  title: "№11. Суффиксы",                         file: "trainers/orfografiya.html", preset: { "ege-offline-task": "t11" }, days: [1, 4], ready: true },
    { id: "rus-12",     subject: "rus",  title: "№12. Окончания глаголов, причастия",    file: "trainers/orfografiya.html", preset: { "ege-offline-task": "t12" }, days: [1, 4], ready: true },
    { id: "rus-13",     subject: "rus",  title: "№13. НЕ и НИ",                          file: "trainers/orfografiya.html", preset: { "ege-offline-task": "t13" }, days: [1, 4], ready: true },
    { id: "rus-14",     subject: "rus",  title: "№14. Слитно, дефис, раздельно",         file: "trainers/orfografiya.html", preset: { "ege-offline-task": "t14" }, days: [1, 4], ready: true },
    { id: "rus-15",     subject: "rus",  title: "№15. Н и НН",                           file: "trainers/orfografiya.html", preset: { "ege-offline-task": "t15" }, days: [1, 4], ready: true },

    { id: "electro",    subject: "phys", title: "Электродинамика 11–15",                 file: "trainers/electro.html",    days: [3, 5], ready: true }
  ],

  // Обычная неделя из плана v4 (действует с 23.11). Ключ — день недели, 1 — пн … 7 — вс.
  // У строки с id есть галочка; строка без id — просто напоминание (допы, школьная ДЗ).
  // Чтобы убрать блок «План на сегодня» с главной, удали week целиком.
  week: {
    1: [
      { id: "mem", title: "Память: 10 минут дома и 10 в дороге" },
      { title: "Школьная ДЗ" },
      { id: "idz", title: "И-ДЗ", time: "19:45–20:45" },
      { title: "Семинар по физике", time: "21:00–23:00" }
    ],
    2: [
      { id: "mem", title: "Память: 10 минут дома и 10 в дороге" },
      { title: "Школьная ДЗ" },
      { id: "fdz", title: "Ф-ДЗ", time: "18:30–19:30" },
      { id: "r",   title: "Р: теория номера недели", time: "20:00–21:00" },
      { title: "Резерв: долг или отдых", time: "21:15–22:00" }
    ],
    3: [
      { id: "mem", title: "Память: 10 минут дома и 10 в дороге" },
      { title: "Школьная ДЗ" },
      { title: "Информатика", time: "19:00–22:00" }
    ],
    4: [
      { id: "mem", title: "Память: 10 минут дома и 10 в дороге" },
      { title: "Школьная ДЗ" },
      { title: "С 18:30 свободно" }
    ],
    5: [
      { id: "mem", title: "Память: 10 минут дома и 10 в дороге" },
      { id: "idz", title: "И-ДЗ", time: "17:25–18:15" },
      { id: "mv",  title: "М-В: вебинар к воскресенью", time: "18:30–19:30" },
      { title: "Лекция по физике", time: "21:00–22:30" }
    ],
    6: [
      { title: "Бег", time: "9:30" },
      { id: "fdz", title: "Ф-ДЗ", time: "11:00–12:00" },
      { id: "fv",  title: "Ф-вперёд", time: "12:15–13:15" },
      { id: "rs",  title: "Р-С: тренажёр по номеру и 10 заданий", time: "14:15–15:15" },
      { title: "Резерв: долг или отдых", time: "15:30–16:30" }
    ],
    7: [
      { title: "До 15:45 свободно" },
      { title: "Математика", time: "16:00–19:00" },
      { id: "m2", title: "М-2: закрепление после занятия", time: "19:30–20:30" },
      { title: "ДЗ на понедельник", time: "20:30–22:00" }
    ]
  }
};

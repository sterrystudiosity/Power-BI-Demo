/** @typedef {"none" | "low" | "high"} UsageTier */

const DataModel = {
  SEED: 42,
  STUDENT_COUNT: 1000,
  ACCENT: "#0d9488",
  ACCENT_LIGHT: "rgba(13, 148, 136, 0.15)",
  ACCENT_MUTED: "#14b8a6",

  USAGE_TIERS: {
    NONE: "none",
    LOW: "low",
    HIGH: "high",
  },

  USAGE_TIER_LABELS: {
    none: "0 uses",
    low: "1–2 uses",
    high: "3+ uses",
  },

  /** @type {Record<UsageTier, number>} Grade lift in points vs non-users */
  TIER_LIFT: {
    none: 0,
    low: 0.8,
    high: 3.2,
  },

  BENCHMARKS: {
    gradeLiftHigh: 5.0,
    dfwUserRate: 0.081,
    dfwNonUserRate: 0.389,
    persistenceHigh: 0.95,
    persistenceLow: 0.828,
  },

  SCORE_KEYS: [
    "spelling_and_grammar_average_score",
    "choice_of_language_average_score",
    "structure_average_score",
    "use_of_sources_average_score",
    "critical_thinking_average_score",
  ],

  SCORE_LABELS: [
    "Spelling & grammar",
    "Choice of language",
    "Structure",
    "Use of sources",
    "Critical thinking",
  ],

  LOCALE: "en-US",
  CAMPUSES: ["Atlanta", "Chicago", "Denver", "Online"],
  FACULTIES: [
    "Faculty of Business",
    "Faculty of Science",
    "Faculty of Arts",
    "Faculty of Health",
    "Faculty of Engineering",
  ],
  SUBJECTS: ["Essay", "Report", "Reflection", "Case study", "Literature review"],
  YEAR_LEVELS: [
    "1st Year Undergraduate",
    "2nd Year Undergraduate",
    "3rd Year Undergraduate",
    "Postgraduate",
  ],
  FIRST_NAMES: [
    "Alex", "Jordan", "Sam", "Taylor", "Casey", "Morgan", "Riley", "Jamie",
    "Quinn", "Avery", "Blake", "Drew", "Hayden", "Logan", "Parker",
  ],
  LAST_NAMES: [
    "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller",
    "Davis", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson",
  ],
  COURSE_TEMPLATES: [
    { name: "Introduction to Business", faculty: "Faculty of Business" },
    { name: "Academic Writing", faculty: "Faculty of Arts" },
    { name: "Research Methods", faculty: "Faculty of Science" },
    { name: "Data Analytics", faculty: "Faculty of Science" },
    { name: "Professional Communication", faculty: "Faculty of Business" },
    { name: "Critical Thinking", faculty: "Faculty of Arts" },
    { name: "Human Anatomy", faculty: "Faculty of Health" },
    { name: "Structural Engineering", faculty: "Faculty of Engineering" },
    { name: "Marketing Principles", faculty: "Faculty of Business" },
    { name: "Organic Chemistry", faculty: "Faculty of Science" },
    { name: "Modern History", faculty: "Faculty of Arts" },
    { name: "Nursing Practice", faculty: "Faculty of Health" },
    { name: "Software Design", faculty: "Faculty of Engineering" },
    { name: "Financial Accounting", faculty: "Faculty of Business" },
    { name: "Statistics", faculty: "Faculty of Science" },
  ],

  /**
   * @param {number} wfCount
   * @returns {UsageTier}
   */
  getUsageTier(wfCount) {
    if (wfCount >= 3) return this.USAGE_TIERS.HIGH;
    if (wfCount >= 1) return this.USAGE_TIERS.LOW;
    return this.USAGE_TIERS.NONE;
  },

  /**
   * @param {number} grade
   * @param {boolean} withdrawn
   * @returns {boolean}
   */
  isDfw(grade, withdrawn) {
    return withdrawn || grade < 60;
  },

  /**
   * @param {number} grade
   * @returns {string}
   */
  letterGrade(grade) {
    if (grade >= 90) return "A";
    if (grade >= 80) return "B";
    if (grade >= 70) return "C";
    if (grade >= 60) return "D";
    return "F";
  },

  /**
   * @param {number} grade
   * @returns {number}
   */
  gpaPoints(grade) {
    if (grade >= 90) return 4.0;
    if (grade >= 80) return 3.0;
    if (grade >= 70) return 2.0;
    if (grade >= 60) return 1.0;
    return 0.0;
  },
};

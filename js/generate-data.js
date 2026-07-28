const DataGenerator = {
  _rngState: DataModel.SEED,

  _seededRandom() {
    this._rngState = (this._rngState * 1664525 + 1013904223) & 0xffffffff;
    return (this._rngState >>> 0) / 0xffffffff;
  },

  _resetRng() {
    this._rngState = DataModel.SEED;
  },

  _pick(arr) {
    return arr[Math.floor(this._seededRandom() * arr.length)];
  },

  _uuid() {
    const hex = () => Math.floor(this._seededRandom() * 16).toString(16);
    return `${hex()}${hex()}${hex()}${hex()}${hex()}${hex()}${hex()}${hex()}-${hex()}${hex()}${hex()}${hex()}-4${hex()}${hex()}${hex()}-${hex()}${hex()}${hex()}${hex()}-${hex()}${hex()}${hex()}${hex()}${hex()}${hex()}${hex()}${hex()}${hex()}${hex()}${hex()}${hex()}${hex()}`;
  },

  _clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  },

  semesterDateRange(semesterId) {
    if (semesterId === "2024-S2") {
      return { start: new Date("2024-07-15"), end: new Date("2024-11-22") };
    }
    return { start: new Date("2025-02-10"), end: new Date("2025-06-20") };
  },

  _randomDateInRange(start, end) {
    const startMs = start.getTime();
    const endMs = end.getTime();
    return new Date(startMs + this._seededRandom() * (endMs - startMs));
  },

  _generateStudents() {
    const students = [];
    for (let i = 0; i < DataModel.STUDENT_COUNT; i++) {
      const firstName = this._pick(DataModel.FIRST_NAMES);
      const lastName = this._pick(DataModel.LAST_NAMES);
      students.push({
        student_id: String(100000 + i),
        studiosity_student_id: 200000 + i,
        first_name: firstName,
        last_name: lastName,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.edu`,
        campus: this._pick(DataModel.CAMPUSES),
        faculty: this._pick(DataModel.FACULTIES),
        year_level: this._pick(DataModel.YEAR_LEVELS),
        prior_gpa: Math.round((1.5 + this._seededRandom() * 2.3) * 100) / 100,
        is_studiosity_user: this._seededRandom() < 0.4,
      });
    }
    return students;
  },

  _generateSemesters() {
    return [
      { semester_id: "2024-S2", label: "2024 Semester 2", year: 2024, term: "S2" },
      { semester_id: "2025-S1", label: "2025 Semester 1", year: 2025, term: "S1" },
    ];
  },

  _generateCourses(semesters) {
    const courses = [];
    let courseCounter = 1000;
    for (const semester of semesters) {
      for (const template of DataModel.COURSE_TEMPLATES) {
        courses.push({
          course_id: String(courseCounter++),
          course_name: template.name,
          faculty: template.faculty,
          semester_id: semester.semester_id,
        });
      }
    }
    return courses;
  },

  _assignWfCount(student) {
    if (!student.is_studiosity_user) return 0;
    const roll = this._seededRandom();
    if (roll < 0.45) return 0;
    if (roll < 0.7) return Math.floor(this._seededRandom() * 2) + 1;
    return Math.floor(this._seededRandom() * 4) + 3;
  },

  _computeFinalGrade(priorGpa, wfCount, courseDifficulty) {
    const tier = DataModel.getUsageTier(wfCount);
    const base = 35 + priorGpa * 12 + courseDifficulty;
    const lift = DataModel.TIER_LIFT[tier];
    const noise = (this._seededRandom() - 0.5) * 10;
    let grade = base + lift + noise;

    const withdrawn = this._seededRandom() < (tier === DataModel.USAGE_TIERS.NONE ? 0.12 : 0.02);
    if (withdrawn) {
      return { final_grade: 0, letter_grade: "W", dfw: true, withdrawn: true, gpa_points: 0 };
    }

    if (tier === DataModel.USAGE_TIERS.NONE && this._seededRandom() < 0.22) {
      grade = 40 + this._seededRandom() * 9;
    }

    if (tier === DataModel.USAGE_TIERS.LOW && this._seededRandom() < 0.05) {
      grade = 44 + this._seededRandom() * 5;
    }

    grade = this._clamp(Math.round(grade * 10) / 10, 0, 100);
    return {
      final_grade: grade,
      letter_grade: DataModel.letterGrade(grade),
      dfw: DataModel.isDfw(grade, false),
      withdrawn: false,
      gpa_points: DataModel.gpaPoints(grade),
    };
  },

  _generateEnrollmentsAndGrades(students, courses, semesters) {
    const enrollments = [];
    const courseGrades = [];
    const lmsSubmissions = [];
    const wfCountsByEnrollment = new Map();

    for (const student of students) {
      for (const semester of semesters) {
        const semesterCourses = courses.filter((c) => c.semester_id === semester.semester_id);
        const shuffled = [...semesterCourses].sort(() => this._seededRandom() - 0.5);
        const enrollCount = 3 + Math.floor(this._seededRandom() * 3);
        const enrolled = shuffled.slice(0, enrollCount);

        for (const course of enrolled) {
          const key = `${student.student_id}|${course.course_id}|${course.semester_id}`;
          const wfCount = this._assignWfCount(student);
          wfCountsByEnrollment.set(key, wfCount);

          enrollments.push({
            student_id: student.student_id,
            course_id: course.course_id,
            semester_id: course.semester_id,
          });

          const courseDifficulty = (this._seededRandom() - 0.5) * 10;
          const gradeResult = this._computeFinalGrade(student.prior_gpa, wfCount, courseDifficulty);
          courseGrades.push({
            student_id: student.student_id,
            course_id: course.course_id,
            semester_id: course.semester_id,
            ...gradeResult,
          });

          lmsSubmissions.push({
            student_id: student.student_id,
            course_id: course.course_id,
            semester_id: course.semester_id,
            assignment_count: 4 + Math.floor(this._seededRandom() * 6),
            on_time_rate: Math.round((0.55 + this._seededRandom() * 0.45) * 100) / 100,
          });
        }
      }
    }

    return { enrollments, courseGrades, lmsSubmissions, wfCountsByEnrollment };
  },

  _generateInteractions(students, courses, wfCountsByEnrollment) {
    const interactions = [];
    const studentMap = new Map(students.map((s) => [s.student_id, s]));

    for (const [key, wfCount] of wfCountsByEnrollment) {
      if (wfCount === 0) continue;

      const [studentId, courseId, semesterId] = key.split("|");
      const student = studentMap.get(studentId);
      const course = courses.find((c) => c.course_id === courseId);
      if (!student || !course) continue;

      const { start, end } = this.semesterDateRange(semesterId);

      for (let i = 0; i < wfCount; i++) {
        const startTime = this._randomDateInRange(start, end);
        const statusRoll = this._seededRandom();
        const status = statusRoll < 0.7 ? "reviewed" : statusRoll < 0.9 ? "submitted" : "cancelled";
        const hasRating = status === "reviewed" && this._seededRandom() > 0.15;
        const rating = hasRating ? Math.ceil(this._seededRandom() * 5) : null;
        const isEarlyIntervention = this._seededRandom() < 0.08;

        const scores = {};
        const tier = DataModel.getUsageTier(wfCount);
        const scoreBase = tier === DataModel.USAGE_TIERS.HIGH ? 3.5 : tier === DataModel.USAGE_TIERS.LOW ? 3.0 : 2.5;
        for (const scoreKey of DataModel.SCORE_KEYS) {
          scores[scoreKey] = Math.round((scoreBase + this._seededRandom() * 1.5) * 10) / 10;
        }

        interactions.push({
          uuid: this._uuid(),
          start_time: startTime.toISOString(),
          service: "WF+",
          subject: this._pick(DataModel.SUBJECTS),
          year_level: student.year_level,
          minutes: Math.floor(this._seededRandom() * 35) + 10,
          first_name: student.first_name,
          last_name: student.last_name,
          email: student.email,
          student_question: "Could you please help me improve this draft?",
          external_user_id: student.student_id,
          student_id: student.student_id,
          study_mode: student.campus === "Online" ? "Online" : this._seededRandom() > 0.3 ? "Campus" : "Online",
          study_type: this._seededRandom() > 0.25 ? "Full time" : "Part time",
          faculty: course.faculty,
          campus: student.campus,
          semester_id: semesterId,
          additional_parameters: {
            course_id: course.course_id,
            course_name: course.course_name,
          },
          feedback: hasRating && rating >= 4 ? "Very helpful, thank you!" : null,
          studiosity_student_id: student.studiosity_student_id,
          rating,
          early_intervention: isEarlyIntervention ? "true" : "false",
          early_intervention_reason: isEarlyIntervention ? "Multiple low scores on recent submissions" : null,
          submission_details: {
            status,
            word_count: Math.floor(this._seededRandom() * 1800) + 300,
            ...scores,
            action_type: status === "cancelled" ? "student_cancelled" : null,
          },
        });
      }
    }

    return interactions.sort((a, b) => new Date(b.start_time) - new Date(a.start_time));
  },

  generate() {
    this._resetRng();
    const students = this._generateStudents();
    const semesters = this._generateSemesters();
    const courses = this._generateCourses(semesters);
    const { enrollments, courseGrades, lmsSubmissions, wfCountsByEnrollment } =
      this._generateEnrollmentsAndGrades(students, courses, semesters);
    const interactions = this._generateInteractions(students, courses, wfCountsByEnrollment);

    return {
      students,
      semesters,
      courses,
      enrollments,
      courseGrades,
      lmsSubmissions,
      interactions,
    };
  },
};

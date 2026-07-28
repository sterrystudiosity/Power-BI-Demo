const Analytics = (() => {
  /**
   * @param {ReturnType<typeof DataGenerator.generate>} dataset
   */
  function buildIndexes(dataset) {
    const studentMap = new Map(dataset.students.map((s) => [s.student_id, s]));
    const courseMap = new Map(dataset.courses.map((c) => [c.course_id, c]));
    const semesterMap = new Map(dataset.semesters.map((s) => [s.semester_id, s]));

    const wfCountMap = new Map();
    for (const interaction of dataset.interactions) {
      const courseId = interaction.additional_parameters.course_id;
      const key = `${interaction.student_id}|${courseId}|${interaction.semester_id}`;
      wfCountMap.set(key, (wfCountMap.get(key) || 0) + 1);
    }

    const gradeMap = new Map();
    for (const grade of dataset.courseGrades) {
      gradeMap.set(`${grade.student_id}|${grade.course_id}|${grade.semester_id}`, grade);
    }

    const lmsMap = new Map();
    for (const lms of dataset.lmsSubmissions) {
      lmsMap.set(`${lms.student_id}|${lms.course_id}|${lms.semester_id}`, lms);
    }

    return { studentMap, courseMap, semesterMap, wfCountMap, gradeMap, lmsMap };
  }

  /**
   * @param {ReturnType<typeof DataGenerator.generate>} dataset
   * @param {ReturnType<typeof buildIndexes>} indexes
   */
  function buildOutcomeRows(dataset, indexes) {
    const rows = [];
    for (const enrollment of dataset.enrollments) {
      const key = `${enrollment.student_id}|${enrollment.course_id}|${enrollment.semester_id}`;
      const student = indexes.studentMap.get(enrollment.student_id);
      const course = indexes.courseMap.get(enrollment.course_id);
      const grade = indexes.gradeMap.get(key);
      const lms = indexes.lmsMap.get(key);
      if (!student || !course || !grade) continue;

      const wfCount = indexes.wfCountMap.get(key) || 0;
      rows.push({
        student_id: enrollment.student_id,
        course_id: enrollment.course_id,
        semester_id: enrollment.semester_id,
        course_name: course.course_name,
        faculty: course.faculty,
        campus: student.campus,
        year_level: student.year_level,
        wf_count: wfCount,
        usage_tier: DataModel.getUsageTier(wfCount),
        is_user: wfCount > 0,
        final_grade: grade.final_grade,
        letter_grade: grade.letter_grade,
        dfw: grade.dfw,
        withdrawn: grade.withdrawn,
        gpa_points: grade.gpa_points,
        lms_assignment_count: lms ? lms.assignment_count : 0,
        lms_on_time_rate: lms ? lms.on_time_rate : 0,
      });
    }
    return rows;
  }

  function defaultFilters(semesters) {
    return {
      semester: semesters[semesters.length - 1].semester_id,
      faculty: "",
      campus: "",
      course: "",
      subject: "",
      dateFrom: "",
      dateTo: "",
    };
  }

  function filterOutcomeRows(rows, filters) {
    return rows.filter((r) => {
      if (filters.semester && r.semester_id !== filters.semester) return false;
      if (filters.faculty && r.faculty !== filters.faculty) return false;
      if (filters.campus && r.campus !== filters.campus) return false;
      if (filters.course && r.course_id !== filters.course) return false;
      return true;
    });
  }

  function filterInteractions(interactions, filters, courses) {
    const courseMap = new Map(courses.map((c) => [c.course_id, c]));
    return interactions.filter((r) => {
      const day = r.start_time.slice(0, 10);
      if (filters.dateFrom && day < filters.dateFrom) return false;
      if (filters.dateTo && day > filters.dateTo) return false;
      if (filters.semester && r.semester_id !== filters.semester) return false;
      if (filters.campus && r.campus !== filters.campus) return false;
      if (filters.faculty && r.faculty !== filters.faculty) return false;
      if (filters.subject && r.subject !== filters.subject) return false;
      if (filters.course && r.additional_parameters.course_id !== filters.course) return false;
      return true;
    });
  }

  function avg(values) {
    if (!values.length) return null;
    return values.reduce((s, v) => s + v, 0) / values.length;
  }

  function rate(items, predicate) {
    if (!items.length) return null;
    return items.filter(predicate).length / items.length;
  }

  function computeOutcomesKpis(rows) {
    const users = rows.filter((r) => r.is_user && !r.withdrawn);
    const nonUsers = rows.filter((r) => !r.is_user && !r.withdrawn);
    const highTier = rows.filter((r) => r.usage_tier === DataModel.USAGE_TIERS.HIGH && !r.withdrawn);
    const nonUserGrades = nonUsers.map((r) => r.final_grade);
    const userGrades = users.map((r) => r.final_grade);
    const highGrades = highTier.map((r) => r.final_grade);
    const avgUserGrade = avg(userGrades);
    const avgNonUserGrade = avg(nonUserGrades);
    const avgHighGrade = avg(highGrades);

    return {
      avgUserGrade,
      avgNonUserGrade,
      gradeDelta: avgUserGrade != null && avgNonUserGrade != null ? avgUserGrade - avgNonUserGrade : null,
      highTierLift:
        avgHighGrade != null && avgNonUserGrade != null ? avgHighGrade - avgNonUserGrade : null,
      dfwUserRate: rate(rows.filter((r) => r.is_user), (r) => r.dfw),
      dfwNonUserRate: rate(rows.filter((r) => !r.is_user), (r) => r.dfw),
      avgGpa: avg(rows.filter((r) => !r.withdrawn).map((r) => r.gpa_points)),
      enrollmentCount: rows.length,
      userCount: rows.filter((r) => r.is_user).length,
    };
  }

  function buildUsageTierChart(rows) {
    const tiers = [DataModel.USAGE_TIERS.NONE, DataModel.USAGE_TIERS.LOW, DataModel.USAGE_TIERS.HIGH];
    const active = rows.filter((r) => !r.withdrawn);
    return {
      labels: tiers.map((t) => DataModel.USAGE_TIER_LABELS[t]),
      data: tiers.map((t) => {
        const subset = active.filter((r) => r.usage_tier === t);
        return avg(subset.map((r) => r.final_grade)) ?? 0;
      }),
      counts: tiers.map((t) => active.filter((r) => r.usage_tier === t).length),
    };
  }

  function buildDfwChart(rows) {
    const userRows = rows.filter((r) => r.is_user);
    const nonUserRows = rows.filter((r) => !r.is_user);
    return {
      labels: ["Studiosity users", "Non-users"],
      data: [
        (rate(userRows, (r) => r.dfw) ?? 0) * 100,
        (rate(nonUserRows, (r) => r.dfw) ?? 0) * 100,
      ],
    };
  }

  function buildGradeByWfBucket(rows) {
    const buckets = [
      { label: "0", min: 0, max: 0 },
      { label: "1", min: 1, max: 1 },
      { label: "2", min: 2, max: 2 },
      { label: "3–4", min: 3, max: 4 },
      { label: "5+", min: 5, max: 99 },
    ];
    const active = rows.filter((r) => !r.withdrawn);
    return {
      labels: buckets.map((b) => b.label),
      data: buckets.map((b) => {
        const subset = active.filter((r) => r.wf_count >= b.min && r.wf_count <= b.max);
        return avg(subset.map((r) => r.final_grade)) ?? 0;
      }),
    };
  }

  function buildCourseOutcomeTable(rows) {
    const byCourse = new Map();
    for (const row of rows) {
      if (!byCourse.has(row.course_id)) {
        byCourse.set(row.course_id, {
          course_id: row.course_id,
          course_name: row.course_name,
          faculty: row.faculty,
          rows: [],
        });
      }
      byCourse.get(row.course_id).rows.push(row);
    }

    return Array.from(byCourse.values())
      .map((entry) => {
        const users = entry.rows.filter((r) => r.is_user && !r.withdrawn);
        const nonUsers = entry.rows.filter((r) => !r.is_user && !r.withdrawn);
        const avgUser = avg(users.map((r) => r.final_grade));
        const avgNon = avg(nonUsers.map((r) => r.final_grade));
        return {
          course_name: entry.course_name,
          faculty: entry.faculty.replace("Faculty of ", ""),
          enrollments: entry.rows.length,
          userPct: entry.rows.length ? (entry.rows.filter((r) => r.is_user).length / entry.rows.length) * 100 : 0,
          avgUserGrade: avgUser,
          avgNonUserGrade: avgNon,
          lift: avgUser != null && avgNon != null ? avgUser - avgNon : null,
        };
      })
      .sort((a, b) => (b.lift ?? 0) - (a.lift ?? 0));
  }

  function computeLmsKpis(rows) {
    const totalLms = rows.reduce((s, r) => s + r.lms_assignment_count, 0);
    const totalWf = rows.reduce((s, r) => s + r.wf_count, 0);
    const courses = new Set(rows.map((r) => r.course_id)).size;
    const adoptionByCourse = buildCourseOutcomeTable(rows);
    const topCourse = adoptionByCourse.sort((a, b) => b.userPct - a.userPct)[0];

    return {
      totalLmsSubmissions: totalLms,
      avgLmsPerStudent: rows.length ? totalLms / rows.length : 0,
      totalWfSubmissions: totalWf,
      courseCount: courses,
      topAdoptionCourse: topCourse ? topCourse.course_name : "—",
      topAdoptionPct: topCourse ? topCourse.userPct : null,
    };
  }

  function buildLmsByCourseChart(rows) {
    const byCourse = new Map();
    for (const row of rows) {
      const key = row.course_name;
      if (!byCourse.has(key)) byCourse.set(key, { lms: 0, wf: 0 });
      const entry = byCourse.get(key);
      entry.lms += row.lms_assignment_count;
      entry.wf += row.wf_count;
    }
    const sorted = Array.from(byCourse.entries()).sort((a, b) => b[1].lms - a[1].lms).slice(0, 10);
    return {
      labels: sorted.map(([name]) => name),
      lmsData: sorted.map(([, v]) => v.lms),
      wfData: sorted.map(([, v]) => v.wf),
    };
  }

  function buildLmsCourseTable(rows, semesterLabel) {
    const byCourse = new Map();
    for (const row of rows) {
      if (!byCourse.has(row.course_id)) {
        byCourse.set(row.course_id, {
          course_name: row.course_name,
          enrollments: 0,
          lms: 0,
          wf: 0,
          users: 0,
        });
      }
      const entry = byCourse.get(row.course_id);
      entry.enrollments++;
      entry.lms += row.lms_assignment_count;
      entry.wf += row.wf_count;
      if (row.is_user) entry.users++;
    }

    return Array.from(byCourse.values())
      .map((c) => ({
        ...c,
        semester: semesterLabel,
        adoptionPct: c.enrollments ? (c.users / c.enrollments) * 100 : 0,
      }))
      .sort((a, b) => b.lms - a.lms);
  }

  function avgScore(record) {
    const sd = record.submission_details;
    const sum = DataModel.SCORE_KEYS.reduce((acc, key) => acc + (sd[key] || 0), 0);
    return sum / DataModel.SCORE_KEYS.length;
  }

  function computeUsageKpis(records) {
    const total = records.length;
    const rated = records.filter((r) => r.rating != null);
    const avgRating = avg(rated.map((r) => r.rating));
    const avgWords = total ? avg(records.map((r) => r.submission_details.word_count)) : null;
    const avgQuality = total ? avg(records.map((r) => avgScore(r))) : null;
    return { total, avgRating, avgWords, avgQuality, ratedCount: rated.length };
  }

  function buildTimeChartData(records, dayLabels) {
    const counts = {};
    for (const day of dayLabels) counts[day] = 0;
    for (const r of records) {
      const day = r.start_time.slice(0, 10);
      if (counts[day] !== undefined) counts[day]++;
    }
    return {
      labels: dayLabels.map((d) => {
        const dt = new Date(`${d}T00:00:00`);
        return dt.toLocaleDateString(DataModel.LOCALE, { weekday: "short", day: "numeric", month: "short" });
      }),
      data: dayLabels.map((d) => counts[d]),
    };
  }

  function buildQualityChartData(records) {
    if (!records.length) return { labels: DataModel.SCORE_LABELS, data: DataModel.SCORE_KEYS.map(() => 0) };
    return {
      labels: DataModel.SCORE_LABELS,
      data: DataModel.SCORE_KEYS.map((key) => {
        const sum = records.reduce((s, r) => s + r.submission_details[key], 0);
        return Math.round((sum / records.length) * 10) / 10;
      }),
    };
  }

  function buildFacultyChartData(records) {
    const counts = {};
    for (const f of DataModel.FACULTIES) counts[f] = 0;
    for (const r of records) counts[r.faculty] = (counts[r.faculty] || 0) + 1;
    const entries = Object.entries(counts).filter(([, v]) => v > 0);
    return {
      labels: entries.map(([k]) => k.replace("Faculty of ", "")),
      data: entries.map(([, v]) => v),
    };
  }

  function buildWfByCourseChart(records) {
    const counts = new Map();
    for (const r of records) {
      const name = r.additional_parameters.course_name;
      counts.set(name, (counts.get(name) || 0) + 1);
    }
    const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10);
    return {
      labels: sorted.map(([k]) => k),
      data: sorted.map(([, v]) => v),
    };
  }

  function buildRatingChartData(records) {
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const r of records) {
      if (r.rating != null) counts[r.rating]++;
    }
    return {
      labels: ["1 star", "2 stars", "3 stars", "4 stars", "5 stars"],
      data: [counts[1], counts[2], counts[3], counts[4], counts[5]],
    };
  }

  function getDayLabelsForSemester(semesterId) {
    const { start, end } = DataGenerator.semesterDateRange(semesterId);
    const labels = [];
    const cursor = new Date(start);
    cursor.setHours(0, 0, 0, 0);
    const endDate = new Date(end);
    endDate.setHours(0, 0, 0, 0);
    while (cursor <= endDate) {
      labels.push(cursor.toISOString().slice(0, 10));
      cursor.setDate(cursor.getDate() + 7);
    }
    return labels;
  }

  function getWeeklyDayLabels(records) {
    if (!records.length) return [];
    const days = records.map((r) => r.start_time.slice(0, 10)).sort();
    const min = days[0];
    const max = days[days.length - 1];
    const labels = [];
    const cursor = new Date(`${min}T00:00:00`);
    const end = new Date(`${max}T00:00:00`);
    while (cursor <= end) {
      labels.push(cursor.toISOString().slice(0, 10));
      cursor.setDate(cursor.getDate() + 7);
    }
    return labels.length ? labels : [min];
  }

  return {
    buildIndexes,
    buildOutcomeRows,
    defaultFilters,
    filterOutcomeRows,
    filterInteractions,
    computeOutcomesKpis,
    buildUsageTierChart,
    buildDfwChart,
    buildGradeByWfBucket,
    buildCourseOutcomeTable,
    computeLmsKpis,
    buildLmsByCourseChart,
    buildLmsCourseTable,
    computeUsageKpis,
    buildTimeChartData,
    buildQualityChartData,
    buildFacultyChartData,
    buildWfByCourseChart,
    buildRatingChartData,
    getDayLabelsForSemester,
    getWeeklyDayLabels,
    avgScore,
  };
})();

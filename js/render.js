const DashboardRender = (() => {
  const charts = {};
  let sortState = { col: "date", dir: "desc", table: "usage" };

  function formatDate(iso) {
    return new Date(iso).toLocaleDateString(DataModel.LOCALE, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  function formatPct(value) {
    return value != null ? `${value.toFixed(1)}%` : "—";
  }

  function formatNum(value, decimals = 1) {
    return value != null ? value.toFixed(decimals) : "—";
  }

  function statusBadge(status) {
    return `<span class="status-badge status-${status}">${status}</span>`;
  }

  function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  function showTab(tabId) {
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    document.getElementById(`panel-${tabId}`)?.classList.add("active");
    document.querySelector(`.tab-btn[data-tab="${tabId}"]`)?.classList.add("active");

    document.querySelectorAll(".usage-only-filter").forEach((el) => {
      el.style.display = tabId === "usage" ? "flex" : "none";
    });
  }

  function initCharts() {
    const commonOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
    };

    charts.usageTime = new Chart(document.getElementById("chart-time"), {
      type: "bar",
      data: { labels: [], datasets: [{ data: [], backgroundColor: DataModel.ACCENT, borderRadius: 4 }] },
      options: {
        ...commonOptions,
        scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } }, x: { grid: { display: false } } },
      },
    });

    charts.usageQuality = new Chart(document.getElementById("chart-quality"), {
      type: "bar",
      data: { labels: [], datasets: [{ data: [], backgroundColor: DataModel.ACCENT, borderRadius: 4 }] },
      options: {
        ...commonOptions,
        indexAxis: "y",
        scales: { x: { beginAtZero: true, max: 5, ticks: { stepSize: 1 } }, y: { grid: { display: false } } },
      },
    });

    charts.usageFaculty = new Chart(document.getElementById("chart-faculty"), {
      type: "doughnut",
      data: {
        labels: [],
        datasets: [{
          data: [],
          backgroundColor: ["#0d9488", "#14b8a6", "#2dd4bf", "#5eead4", "#99f6e4", "#ccfbf1"],
          borderWidth: 0,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: "right", labels: { boxWidth: 12, font: { size: 11 } } } },
      },
    });

    charts.usageRating = new Chart(document.getElementById("chart-rating"), {
      type: "bar",
      data: {
        labels: ["1 star", "2 stars", "3 stars", "4 stars", "5 stars"],
        datasets: [{
          data: [],
          backgroundColor: DataModel.ACCENT_LIGHT,
          borderColor: DataModel.ACCENT,
          borderWidth: 1,
          borderRadius: 4,
        }],
      },
      options: {
        ...commonOptions,
        scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } }, x: { grid: { display: false } } },
      },
    });

    charts.usageCourse = new Chart(document.getElementById("chart-wf-course"), {
      type: "bar",
      data: { labels: [], datasets: [{ data: [], backgroundColor: DataModel.ACCENT_MUTED, borderRadius: 4 }] },
      options: {
        ...commonOptions,
        indexAxis: "y",
        scales: { x: { beginAtZero: true, ticks: { stepSize: 1 } }, y: { grid: { display: false } } },
      },
    });

    charts.outcomesTier = new Chart(document.getElementById("chart-outcomes-tier"), {
      type: "bar",
      data: { labels: [], datasets: [{ data: [], backgroundColor: DataModel.ACCENT, borderRadius: 4 }] },
      options: {
        ...commonOptions,
        scales: { y: { beginAtZero: true, max: 100, title: { display: true, text: "Avg course grade" } }, x: { grid: { display: false } } },
      },
    });

    charts.outcomesDfw = new Chart(document.getElementById("chart-outcomes-dfw"), {
      type: "bar",
      data: {
        labels: [],
        datasets: [{
          label: "DFW rate",
          data: [],
          backgroundColor: [DataModel.ACCENT, "#94a3b8"],
          borderRadius: 4,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, max: 100, ticks: { callback: (v) => `${v}%` } }, x: { grid: { display: false } } },
      },
    });

    charts.outcomesBucket = new Chart(document.getElementById("chart-outcomes-bucket"), {
      type: "line",
      data: {
        labels: [],
        datasets: [{
          data: [],
          borderColor: DataModel.ACCENT,
          backgroundColor: DataModel.ACCENT_LIGHT,
          fill: true,
          tension: 0.3,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: false, min: 40, max: 100, title: { display: true, text: "Avg course grade" } } },
      },
    });

    charts.lmsCourse = new Chart(document.getElementById("chart-lms-course"), {
      type: "bar",
      data: {
        labels: [],
        datasets: [
          { label: "LMS submissions", data: [], backgroundColor: "#64748b", borderRadius: 4 },
          { label: "WF+ submissions", data: [], backgroundColor: DataModel.ACCENT, borderRadius: 4 },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: "top", labels: { boxWidth: 12, font: { size: 11 } } } },
        scales: { y: { beginAtZero: true }, x: { grid: { display: false } } },
      },
    });
  }

  function renderUsageTab(filteredInteractions, allInteractions, filters, dayLabels) {
    const kpis = Analytics.computeUsageKpis(filteredInteractions);
    setText("kpi-total", kpis.total.toLocaleString());
    setText("kpi-rating", formatNum(kpis.avgRating));
    setText("kpi-rating-sub", kpis.ratedCount > 0 ? `From ${kpis.ratedCount} rated submissions` : "No ratings yet");
    setText("kpi-words", kpis.avgWords != null ? Math.round(kpis.avgWords).toLocaleString() : "—");
    setText("kpi-quality", formatNum(kpis.avgQuality));

    const active = [
      filters.semester !== "",
      filters.faculty !== "",
      filters.campus !== "",
      filters.course !== "",
      filters.subject !== "",
      filters.dateFrom !== "",
      filters.dateTo !== "",
    ].filter(Boolean).length;
    setText(
      "filter-count",
      `Showing ${filteredInteractions.length} of ${allInteractions.length} submissions${active ? ` · ${active} filter${active > 1 ? "s" : ""} active` : ""}`
    );

    const time = Analytics.buildTimeChartData(filteredInteractions, dayLabels);
    charts.usageTime.data.labels = time.labels;
    charts.usageTime.data.datasets[0].data = time.data;
    charts.usageTime.update();

    const quality = Analytics.buildQualityChartData(filteredInteractions);
    charts.usageQuality.data.labels = quality.labels;
    charts.usageQuality.data.datasets[0].data = quality.data;
    charts.usageQuality.update();

    const faculty = Analytics.buildFacultyChartData(filteredInteractions);
    charts.usageFaculty.data.labels = faculty.labels;
    charts.usageFaculty.data.datasets[0].data = faculty.data;
    charts.usageFaculty.update();

    const rating = Analytics.buildRatingChartData(filteredInteractions);
    charts.usageRating.data.datasets[0].data = rating.data;
    charts.usageRating.update();

    const byCourse = Analytics.buildWfByCourseChart(filteredInteractions);
    charts.usageCourse.data.labels = byCourse.labels;
    charts.usageCourse.data.datasets[0].data = byCourse.data;
    charts.usageCourse.update();

    renderUsageTable(filteredInteractions);
  }

  function renderUsageTable(records) {
    const rows = records.slice(0, 15).map((r) => ({
      date: r.start_time,
      subject: r.subject,
      faculty: r.faculty.replace("Faculty of ", ""),
      campus: r.campus,
      wordCount: r.submission_details.word_count,
      avgScore: Analytics.avgScore(r),
      rating: r.rating,
      status: r.submission_details.status,
    }));

    const tbody = document.getElementById("table-body-usage");
    if (!tbody) return;
    tbody.innerHTML = rows
      .map(
        (r) => `<tr>
          <td>${formatDate(r.date)}</td>
          <td>${r.subject}</td>
          <td>${r.faculty}</td>
          <td>${r.campus}</td>
          <td>${r.wordCount.toLocaleString()}</td>
          <td>${r.avgScore.toFixed(1)}</td>
          <td>${r.rating != null ? `${r.rating} ★` : "—"}</td>
          <td>${statusBadge(r.status)}</td>
        </tr>`
      )
      .join("");
  }

  function renderOutcomesTab(rows) {
    const kpis = Analytics.computeOutcomesKpis(rows);
    setText("kpi-outcomes-user-grade", formatNum(kpis.avgUserGrade));
    setText("kpi-outcomes-non-grade", formatNum(kpis.avgNonUserGrade));
    setText("kpi-outcomes-delta", kpis.gradeDelta != null ? `${kpis.gradeDelta >= 0 ? "+" : ""}${kpis.gradeDelta.toFixed(1)} pts` : "—");
    setText("kpi-outcomes-dfw-user", formatPct(kpis.dfwUserRate != null ? kpis.dfwUserRate * 100 : null));
    setText("kpi-outcomes-dfw-non", formatPct(kpis.dfwNonUserRate != null ? kpis.dfwNonUserRate * 100 : null));
    setText("kpi-outcomes-gpa", formatNum(kpis.avgGpa, 2));
    setText("kpi-outcomes-high-lift", kpis.highTierLift != null ? `+${kpis.highTierLift.toFixed(1)} pts` : "—");

    const tier = Analytics.buildUsageTierChart(rows);
    charts.outcomesTier.data.labels = tier.labels;
    charts.outcomesTier.data.datasets[0].data = tier.data;
    charts.outcomesTier.update();

    const dfw = Analytics.buildDfwChart(rows);
    charts.outcomesDfw.data.labels = dfw.labels;
    charts.outcomesDfw.data.datasets[0].data = dfw.data;
    charts.outcomesDfw.update();

    const bucket = Analytics.buildGradeByWfBucket(rows);
    charts.outcomesBucket.data.labels = bucket.labels;
    charts.outcomesBucket.data.datasets[0].data = bucket.data;
    charts.outcomesBucket.update();

    const tableRows = Analytics.buildCourseOutcomeTable(rows).slice(0, 15);
    const tbody = document.getElementById("table-body-outcomes");
    if (tbody) {
      tbody.innerHTML = tableRows
        .map(
          (r) => `<tr>
            <td>${r.course_name}</td>
            <td>${r.faculty}</td>
            <td>${r.enrollments.toLocaleString()}</td>
            <td>${r.userPct.toFixed(1)}%</td>
            <td>${formatNum(r.avgUserGrade)}</td>
            <td>${formatNum(r.avgNonUserGrade)}</td>
            <td>${r.lift != null ? `${r.lift >= 0 ? "+" : ""}${r.lift.toFixed(1)}` : "—"}</td>
          </tr>`
        )
        .join("");
    }
  }

  function renderLmsTab(rows, semesterLabel) {
    const kpis = Analytics.computeLmsKpis(rows);
    setText("kpi-lms-total", kpis.totalLmsSubmissions.toLocaleString());
    setText("kpi-lms-avg", formatNum(kpis.avgLmsPerStudent));
    setText("kpi-lms-wf", kpis.totalWfSubmissions.toLocaleString());
    setText("kpi-lms-top", kpis.topAdoptionCourse);
    setText("kpi-lms-top-sub", kpis.topAdoptionPct != null ? `${kpis.topAdoptionPct.toFixed(1)}% adoption` : "");

    const lmsChart = Analytics.buildLmsByCourseChart(rows);
    charts.lmsCourse.data.labels = lmsChart.labels;
    charts.lmsCourse.data.datasets[0].data = lmsChart.lmsData;
    charts.lmsCourse.data.datasets[1].data = lmsChart.wfData;
    charts.lmsCourse.update();

    const tableRows = Analytics.buildLmsCourseTable(rows, semesterLabel).slice(0, 15);
    const tbody = document.getElementById("table-body-lms");
    if (tbody) {
      tbody.innerHTML = tableRows
        .map(
          (r) => `<tr>
            <td>${r.course_name}</td>
            <td>${r.semester}</td>
            <td>${r.enrollments.toLocaleString()}</td>
            <td>${r.lms.toLocaleString()}</td>
            <td>${r.wf.toLocaleString()}</td>
            <td>${r.adoptionPct.toFixed(1)}%</td>
          </tr>`
        )
        .join("");
    }
  }

  function populateFilters(dataset, filters) {
    const semesterEl = document.getElementById("filter-semester");
    semesterEl.innerHTML = "";
    for (const s of dataset.semesters) {
      semesterEl.innerHTML += `<option value="${s.semester_id}">${s.label}</option>`;
    }
    semesterEl.value = filters.semester;

    const campusEl = document.getElementById("filter-campus");
    campusEl.innerHTML = '<option value="">All campuses</option>';
    for (const c of DataModel.CAMPUSES) {
      campusEl.innerHTML += `<option value="${c}">${c}</option>`;
    }

    const facultyEl = document.getElementById("filter-faculty");
    facultyEl.innerHTML = '<option value="">All faculties</option>';
    for (const f of DataModel.FACULTIES) {
      facultyEl.innerHTML += `<option value="${f}">${f.replace("Faculty of ", "")}</option>`;
    }

    const courseEl = document.getElementById("filter-course");
    courseEl.innerHTML = '<option value="">All courses</option>';
    const semesterCourses = dataset.courses.filter((c) => c.semester_id === filters.semester);
    for (const c of semesterCourses) {
      courseEl.innerHTML += `<option value="${c.course_id}">${c.course_name}</option>`;
    }

    const subjectEl = document.getElementById("filter-subject");
    subjectEl.innerHTML = '<option value="">All subjects</option>';
    for (const s of DataModel.SUBJECTS) {
      subjectEl.innerHTML += `<option value="${s}">${s}</option>`;
    }

    populateDateFilters(filters);
  }

  function populateDateFilters(filters) {
    const dayLabels = Analytics.getDayLabelsForSemester(filters.semester);
    const dateFrom = document.getElementById("filter-date-from");
    const dateTo = document.getElementById("filter-date-to");
    dateFrom.innerHTML = "";
    dateTo.innerHTML = "";
    for (const day of dayLabels) {
      const label = new Date(`${day}T00:00:00`).toLocaleDateString(DataModel.LOCALE, {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
      dateFrom.innerHTML += `<option value="${day}">${label}</option>`;
      dateTo.innerHTML += `<option value="${day}">${label}</option>`;
    }
    if (!filters.dateFrom) filters.dateFrom = dayLabels[0];
    if (!filters.dateTo) filters.dateTo = dayLabels[dayLabels.length - 1];
    dateFrom.value = filters.dateFrom;
    dateTo.value = filters.dateTo;
  }

  return {
    charts,
    showTab,
    initCharts,
    renderUsageTab,
    renderOutcomesTab,
    renderLmsTab,
    populateFilters,
    populateDateFilters,
    formatDate,
  };
})();

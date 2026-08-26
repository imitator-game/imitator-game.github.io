/* ============================================================
   full-task-suite.js — renders the "Full task-suite reference
   (50 tasks)" table on leaderboard.html from data supplied by
   full-task-suite-data.js (window.FULL_TASK_SUITE), instead of
   hand-written <tr> rows.

   Must load AFTER full-task-suite-data.js.
   Target: <table class="ptr-table"> inside #full-suite, with
   an empty <tbody></tbody> and <tfoot></tfoot>.
   ============================================================ */
document.addEventListener('DOMContentLoaded', function () {
  var table = document.querySelector('#full-suite .ptr-table');
  if (!table) return;

  var tbody = table.querySelector('tbody');
  var tfoot = table.querySelector('tfoot');
  if (!tbody || !tfoot) return;

  var data = window.FULL_TASK_SUITE;
  if (!data) {
    console.error('full-task-suite.js: window.FULL_TASK_SUITE not found — is full-task-suite-data.js loaded first?');
    tbody.innerHTML = '<tr><td class="ptr-task" colspan="11">Failed to load task data.</td></tr>';
    return;
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function rowCells(vals) {
    return vals.map(function (v) { return '<td>' + esc(v) + '</td>'; }).join('');
  }

  var rowsHtml = data.tasks.map(function (t) {
    return '<tr>' +
      '<td class="ptr-task">' + esc(t.name) + '</td>' +
      rowCells(t.dp) +
      rowCells(t.act) +
      '<td class="ptr-mean">' + esc(t.meanDP.toFixed(1)) + '</td>' +
      '<td class="ptr-mean">' + esc(t.meanACT.toFixed(1)) + '</td>' +
      '</tr>';
  }).join('');
  tbody.innerHTML = rowsHtml;

  var avg = data.average;
  tfoot.innerHTML =
    '<tr class="ptr-avg-row">' +
    '<td class="ptr-task">' + esc(avg.label) + '</td>' +
    rowCells(avg.dp) +
    rowCells(avg.act) +
    '<td class="ptr-mean">' + esc(avg.meanDP.toFixed(1)) + '</td>' +
    '<td class="ptr-mean">' + esc(avg.meanACT.toFixed(1)) + '</td>' +
    '</tr>';
});
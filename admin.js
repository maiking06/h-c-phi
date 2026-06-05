const loginPanel = document.querySelector("#loginPanel");
const adminPanel = document.querySelector("#adminPanel");
const loginForm = document.querySelector("#loginForm");
const loginMessage = document.querySelector("#loginMessage");
const passwordInput = document.querySelector("#passwordInput");
const currentUserBadge = document.querySelector("#currentUserBadge");
const logoutBtn = document.querySelector("#logoutBtn");
const monthPicker = document.querySelector("#monthPicker");
const searchInput = document.querySelector("#searchInput");
const classFilter = document.querySelector("#classFilter");
const exportCsvBtn = document.querySelector("#exportCsvBtn");
const rolloverBtn = document.querySelector("#rolloverBtn");
const totalStudents = document.querySelector("#totalStudents");
const paidStudents = document.querySelector("#paidStudents");
const unpaidStudents = document.querySelector("#unpaidStudents");
const monthlyRevenue = document.querySelector("#monthlyRevenue");
const expectedRevenue = document.querySelector("#expectedRevenue");
const missingRevenue = document.querySelector("#missingRevenue");
const rolloverHint = document.querySelector("#rolloverHint");
const rolloverMessage = document.querySelector("#rolloverMessage");
const monthLabel = document.querySelector("#monthLabel");
const settingsForm = document.querySelector("#settingsForm");
const schoolNameInput = document.querySelector("#schoolNameInput");
const scheduleInput = document.querySelector("#scheduleInput");
const bankOwnerInput = document.querySelector("#bankOwnerInput");
const bankNameInput = document.querySelector("#bankNameInput");
const bankCodeInput = document.querySelector("#bankCodeInput");
const accountNumberInput = document.querySelector("#accountNumberInput");
const transferNoteInput = document.querySelector("#transferNoteInput");
const studentForm = document.querySelector("#studentForm");
const studentFormTitle = document.querySelector("#studentFormTitle");
const editingId = document.querySelector("#editingId");
const studentCode = document.querySelector("#studentCode");
const studentName = document.querySelector("#studentName");
const studentClass = document.querySelector("#studentClass");
const classOptions = document.querySelector("#classOptions");
const tuitionAmount = document.querySelector("#tuitionAmount");
const noteInput = document.querySelector("#noteInput");
const paidInput = document.querySelector("#paidInput");
const cancelEditBtn = document.querySelector("#cancelEditBtn");
const passwordForm = document.querySelector("#passwordForm");
const currentPasswordInput = document.querySelector("#currentPasswordInput");
const newPasswordInput = document.querySelector("#newPasswordInput");
const passwordMessage = document.querySelector("#passwordMessage");
const studentsTable = document.querySelector("#studentsTable");
const emptyState = document.querySelector("#emptyState");
const unpaidTable = document.querySelector("#unpaidTable");
const unpaidEmpty = document.querySelector("#unpaidEmpty");
const unpaidListCount = document.querySelector("#unpaidListCount");
const qrDialog = document.querySelector("#qrDialog");
const closeQrBtn = document.querySelector("#closeQrBtn");
const qrTitle = document.querySelector("#qrTitle");
const qrImage = document.querySelector("#qrImage");
const qrStudentName = document.querySelector("#qrStudentName");
const qrAmount = document.querySelector("#qrAmount");
const qrContent = document.querySelector("#qrContent");
const qrDownloadLink = document.querySelector("#qrDownloadLink");

const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const monthFormatter = new Intl.DateTimeFormat("vi-VN", {
  month: "long",
  year: "numeric",
});

let state = { students: [], bank: {}, schoolName: "", schedule: "" };

function currentMonthValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthDate(monthValue) {
  const [year, month] = monthValue.split("-").map(Number);
  return new Date(year, month - 1, 1);
}

function previousMonthValue(monthValue) {
  const [year, month] = monthValue.split("-").map(Number);
  const date = new Date(year, month - 2, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthCode(monthValue) {
  return monthValue.replace("-", "");
}

function statusPill(student) {
  const status = document.createElement("span");
  status.className = `status-pill ${student.paid ? "is-paid" : "is-unpaid"}`;
  status.textContent = student.paid ? "Đã thanh toán" : "Chưa thanh toán";
  return status;
}

function transferContent(student) {
  const template = state.bank.transferNote || "HP-{MA_HOC_VIEN}-{THANG}";
  return template
    .replaceAll("{MA_HOC_VIEN}", student.code)
    .replaceAll("{TEN_HOC_VIEN}", student.name)
    .replaceAll("{THANG}", monthCode(student.month))
    .replaceAll("{THANG_NAM}", student.month);
}

function qrUrl(student) {
  const bankCode = encodeURIComponent(state.bank.bankCode || "MB");
  const accountNumber = encodeURIComponent(state.bank.accountNumber || "");
  const amount = encodeURIComponent(String(Math.round(student.amount || 0)));
  const addInfo = encodeURIComponent(transferContent(student));
  const accountName = encodeURIComponent(state.bank.owner || "");
  return `https://img.vietqr.io/image/${bankCode}-${accountNumber}-compact2.png?amount=${amount}&addInfo=${addInfo}&accountName=${accountName}`;
}

function showQr(student) {
  const content = transferContent(student);
  const url = qrUrl(student);
  qrTitle.textContent = `QR ${student.code}`;
  qrImage.src = url;
  qrStudentName.textContent = student.name;
  qrAmount.textContent = currencyFormatter.format(student.amount);
  qrContent.textContent = content;
  qrDownloadLink.href = url;
  qrDownloadLink.download = `qr-${student.code}.png`;
  qrDialog.showModal();
}

function api(path, options = {}) {
  return fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  }).then(async (response) => {
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "Có lỗi xảy ra.");
    return payload;
  });
}

function filteredStudents() {
  const query = searchInput.value.trim().toLowerCase();
  const selectedClass = classFilter.value;
  return state.students
    .filter((student) => student.month === monthPicker.value)
    .filter((student) => !selectedClass || (student.className || "Lớp chính") === selectedClass)
    .filter((student) => {
      if (!query) return true;
      return `${student.code} ${student.name} ${student.className || ""} ${student.note}`.toLowerCase().includes(query);
    })
    .sort((a, b) => {
      const classCompare = (a.className || "Lớp chính").localeCompare(b.className || "Lớp chính", "vi");
      return classCompare || a.name.localeCompare(b.name, "vi");
    });
}

function classNamesForMonth(monthValue) {
  return Array.from(
    new Set(
      state.students
        .filter((student) => student.month === monthValue)
        .map((student) => student.className || "Lớp chính"),
    ),
  ).sort((a, b) => a.localeCompare(b, "vi"));
}

function allClassNames() {
  return Array.from(new Set(state.students.map((student) => student.className || "Lớp chính"))).sort((a, b) =>
    a.localeCompare(b, "vi"),
  );
}

function renderClassControls() {
  const currentClass = classFilter.value;
  const classes = classNamesForMonth(monthPicker.value);
  classFilter.replaceChildren(new Option("Tất cả lớp", ""));
  classes.forEach((className) => classFilter.append(new Option(className, className)));
  classFilter.value = classes.includes(currentClass) ? currentClass : "";

  classOptions.replaceChildren();
  allClassNames().forEach((className) => {
    const option = document.createElement("option");
    option.value = className;
    classOptions.append(option);
  });
}

function renderSettings() {
  schoolNameInput.value = state.schoolName || "";
  scheduleInput.value = state.schedule || "";
  bankOwnerInput.value = state.bank.owner || "";
  bankNameInput.value = state.bank.bankName || "";
  bankCodeInput.value = state.bank.bankCode || "MB";
  accountNumberInput.value = state.bank.accountNumber || "";
  transferNoteInput.value = state.bank.transferNote || "HP-{MA_HOC_VIEN}-{THANG}";
}

function render() {
  const monthStudents = state.students.filter((student) => student.month === monthPicker.value);
  renderClassControls();
  const selectedClass = classFilter.value;
  const countedStudents = selectedClass
    ? monthStudents.filter((student) => (student.className || "Lớp chính") === selectedClass)
    : monthStudents;
  const paidCount = countedStudents.filter((student) => student.paid).length;
  const collected = countedStudents.filter((student) => student.paid).reduce((sum, student) => sum + Number(student.amount || 0), 0);
  const expected = countedStudents.reduce((sum, student) => sum + Number(student.amount || 0), 0);
  const visibleStudents = filteredStudents();

  totalStudents.textContent = String(countedStudents.length);
  paidStudents.textContent = String(paidCount);
  unpaidStudents.textContent = String(countedStudents.length - paidCount);
  monthlyRevenue.textContent = currencyFormatter.format(collected);
  expectedRevenue.textContent = currencyFormatter.format(expected);
  missingRevenue.textContent = currencyFormatter.format(expected - collected);
  monthLabel.textContent = monthFormatter.format(getMonthDate(monthPicker.value));
  rolloverHint.textContent = `Tạo từ ${monthFormatter.format(getMonthDate(previousMonthValue(monthPicker.value)))} sang ${monthFormatter.format(getMonthDate(monthPicker.value))}.`;
  studentsTable.replaceChildren();
  unpaidTable.replaceChildren();
  emptyState.hidden = visibleStudents.length > 0;
  const visibleUnpaidStudents = visibleStudents.filter((student) => !student.paid);
  unpaidEmpty.hidden = visibleUnpaidStudents.length > 0;
  unpaidListCount.textContent = String(visibleUnpaidStudents.length);

  visibleStudents.forEach((student) => {
    const row = document.createElement("tr");
    const paidAt = student.paidAt ? dateFormatter.format(new Date(student.paidAt)) : "-";
    row.innerHTML = `
      <td data-label="Mã">${student.code}</td>
      <td data-label="Học viên"><strong>${student.name}</strong></td>
      <td data-label="Lớp">${student.className || "Lớp chính"}</td>
      <td data-label="Học phí">${currencyFormatter.format(student.amount)}</td>
      <td data-label="Trạng thái"></td>
      <td data-label="Ngày xác nhận">${paidAt}</td>
      <td data-label="Ghi chú">${student.note || "-"}</td>
      <td data-label="Thao tác" class="row-actions"></td>
    `;

    row.children[4].append(statusPill(student));

    const toggleBtn = document.createElement("button");
    toggleBtn.type = "button";
    toggleBtn.className = `button small ${student.paid ? "ghost" : "primary"}`;
    toggleBtn.textContent = student.paid ? "Chưa thanh toán" : "Đã thanh toán";
    toggleBtn.addEventListener("click", () => updateStudent(student.id, { ...student, paid: !student.paid }));

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "button small ghost";
    editBtn.textContent = "Sửa";
    editBtn.addEventListener("click", () => fillStudentForm(student));

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "button small danger";
    deleteBtn.textContent = "Xóa";
    deleteBtn.addEventListener("click", () => deleteStudent(student));

    const qrBtn = document.createElement("button");
    qrBtn.type = "button";
    qrBtn.className = "button small secondary";
    qrBtn.textContent = "QR";
    qrBtn.addEventListener("click", () => showQr(student));

    row.lastElementChild.append(qrBtn, toggleBtn, editBtn, deleteBtn);
    studentsTable.append(row);
  });

  visibleUnpaidStudents.forEach((student) => {
    const row = document.createElement("tr");
    row.className = "unpaid-row";
    row.innerHTML = `
      <td data-label="Mã">${student.code}</td>
      <td data-label="Học viên"><strong>${student.name}</strong></td>
      <td data-label="Lớp">${student.className || "Lớp chính"}</td>
      <td data-label="Học phí">${currencyFormatter.format(student.amount)}</td>
      <td data-label="Ghi chú">${student.note || "-"}</td>
      <td data-label="Thao tác" class="row-actions"></td>
    `;

    const qrBtn = document.createElement("button");
    qrBtn.type = "button";
    qrBtn.className = "button small secondary";
    qrBtn.textContent = "QR";
    qrBtn.addEventListener("click", () => showQr(student));

    const markPaidBtn = document.createElement("button");
    markPaidBtn.type = "button";
    markPaidBtn.className = "button small primary";
    markPaidBtn.textContent = "Đã thanh toán";
    markPaidBtn.addEventListener("click", () => updateStudent(student.id, { ...student, paid: true }));

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "button small ghost";
    editBtn.textContent = "Sửa";
    editBtn.addEventListener("click", () => fillStudentForm(student));

    row.lastElementChild.append(qrBtn, markPaidBtn, editBtn);
    unpaidTable.append(row);
  });
}

async function loadAdminData() {
  state = await api("/api/admin");
  loginPanel.hidden = true;
  adminPanel.hidden = false;
  logoutBtn.hidden = false;
  currentUserBadge.hidden = false;
  currentUserBadge.textContent = state.currentUser?.displayName || "Quản trị";
  renderSettings();
  render();
}

async function updateStudent(id, student) {
  await api(`/api/students/${id}`, {
    method: "PUT",
    body: JSON.stringify({ ...student, month: student.month || monthPicker.value }),
  });
  await loadAdminData();
}

async function deleteStudent(student) {
  if (!window.confirm(`Xóa học viên "${student.name}"?`)) return;
  await api(`/api/students/${student.id}`, { method: "DELETE" });
  await loadAdminData();
}

function fillStudentForm(student) {
  editingId.value = student.id;
  studentCode.value = student.code;
  studentName.value = student.name;
  studentClass.value = student.className || "Lớp chính";
  tuitionAmount.value = student.amount;
  noteInput.value = student.note || "";
  paidInput.checked = student.paid;
  studentFormTitle.textContent = "Sửa học viên";
  studentName.focus();
}

function resetStudentForm() {
  studentForm.reset();
  editingId.value = "";
  studentFormTitle.textContent = "Thêm học viên";
}

function csvEscape(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function exportCsv() {
  const header = ["Tháng", "Mã", "Học viên", "Học phí", "Trạng thái", "Ngày xác nhận", "Ghi chú"];
  const rows = filteredStudents().map((student) => [
    monthFormatter.format(getMonthDate(student.month)),
    student.code,
    student.name,
    student.className || "Lớp chính",
    student.amount,
    student.paid ? "Đã thanh toán" : "Chưa thanh toán",
    student.paidAt ? dateFormatter.format(new Date(student.paidAt)) : "",
    student.note || "",
  ]);
  const csvHeader = ["Tháng", "Mã", "Học viên", "Lớp", "Học phí", "Trạng thái", "Ngày xác nhận", "Ghi chú"];
  const csv = [csvHeader, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
  const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `hoc-phi-${monthPicker.value}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

async function rolloverStudents() {
  const targetMonth = monthPicker.value;
  const sourceMonth = previousMonthValue(targetMonth);
  const confirmed = window.confirm(
    `Tạo danh sách ${monthFormatter.format(getMonthDate(targetMonth))} từ ${monthFormatter.format(getMonthDate(sourceMonth))}?`,
  );
  if (!confirmed) return;

  rolloverMessage.textContent = "";
  const result = await api("/api/rollover-students", {
    method: "POST",
    body: JSON.stringify({ targetMonth, sourceMonth }),
  });

  await loadAdminData();
  rolloverMessage.textContent =
    result.created.length > 0
      ? `Đã tạo ${result.created.length} học sinh cho tháng này.`
      : "Không có học sinh mới cần tạo, danh sách tháng này đã có sẵn.";
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginMessage.textContent = "";

  try {
    await api("/api/login", {
      method: "POST",
      body: JSON.stringify({ password: passwordInput.value }),
    });
    passwordInput.value = "";
    await loadAdminData();
  } catch (error) {
    loginMessage.textContent = error.message;
  }
});

logoutBtn.addEventListener("click", async () => {
  await api("/api/logout", { method: "POST", body: "{}" });
  loginPanel.hidden = false;
  adminPanel.hidden = true;
  logoutBtn.hidden = true;
  currentUserBadge.hidden = true;
  currentUserBadge.textContent = "";
});

settingsForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  state = await api("/api/settings", {
    method: "PUT",
    body: JSON.stringify({
      schoolName: schoolNameInput.value,
      schedule: scheduleInput.value,
      bank: {
        owner: bankOwnerInput.value,
        bankName: bankNameInput.value,
        bankCode: bankCodeInput.value,
        accountNumber: accountNumberInput.value,
        transferNote: transferNoteInput.value,
      },
    }),
  });
  renderSettings();
  render();
});

passwordForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  passwordMessage.textContent = "";

  try {
    await api("/api/password", {
      method: "PUT",
      body: JSON.stringify({
        currentPassword: currentPasswordInput.value,
        newPassword: newPasswordInput.value,
      }),
    });
    passwordForm.reset();
    passwordMessage.textContent = "Đã đổi mật khẩu quản trị.";
  } catch (error) {
    passwordMessage.textContent = error.message;
  }
});

studentForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const payload = {
    code: studentCode.value,
    month: monthPicker.value,
    name: studentName.value,
    className: studentClass.value,
    amount: Number(tuitionAmount.value),
    paid: paidInput.checked,
    note: noteInput.value,
  };

  if (editingId.value) {
    await updateStudent(editingId.value, payload);
  } else {
    await api("/api/students", { method: "POST", body: JSON.stringify(payload) });
    await loadAdminData();
  }

  resetStudentForm();
});

cancelEditBtn.addEventListener("click", resetStudentForm);
monthPicker.addEventListener("change", render);
searchInput.addEventListener("input", render);
classFilter.addEventListener("change", render);
exportCsvBtn.addEventListener("click", exportCsv);
rolloverBtn.addEventListener("click", rolloverStudents);
closeQrBtn.addEventListener("click", () => qrDialog.close());

monthPicker.value = currentMonthValue();
loadAdminData().catch(() => {
  loginPanel.hidden = false;
  adminPanel.hidden = true;
  logoutBtn.hidden = true;
  currentUserBadge.hidden = true;
});

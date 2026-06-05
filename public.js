const monthPicker = document.querySelector("#monthPicker");
const searchInput = document.querySelector("#searchInput");
const classFilter = document.querySelector("#classFilter");
const studentsTable = document.querySelector("#studentsTable");
const emptyState = document.querySelector("#emptyState");
const schoolName = document.querySelector("#schoolName");
const scheduleText = document.querySelector("#scheduleText");
const bankOwner = document.querySelector("#bankOwner");
const bankName = document.querySelector("#bankName");
const accountNumber = document.querySelector("#accountNumber");
const transferNote = document.querySelector("#transferNote");
const totalStudents = document.querySelector("#totalStudents");
const paidStudents = document.querySelector("#paidStudents");
const unpaidStudents = document.querySelector("#unpaidStudents");
const monthLabel = document.querySelector("#monthLabel");
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

function filteredStudents() {
  const query = searchInput.value.trim().toLowerCase();
  const selectedClass = classFilter.value;
  return state.students
    .filter((student) => student.month === monthPicker.value)
    .filter((student) => !selectedClass || (student.className || "Lớp chính") === selectedClass)
    .filter((student) => {
      if (!query) return true;
      return `${student.code} ${student.name} ${student.className || ""}`.toLowerCase().includes(query);
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

function renderClassFilter() {
  const currentClass = classFilter.value;
  const classes = classNamesForMonth(monthPicker.value);
  classFilter.replaceChildren(new Option("Tất cả lớp", ""));
  classes.forEach((className) => classFilter.append(new Option(className, className)));
  classFilter.value = classes.includes(currentClass) ? currentClass : "";
}

function render() {
  const monthStudents = state.students.filter((student) => student.month === monthPicker.value);
  renderClassFilter();
  const selectedClass = classFilter.value;
  const countedStudents = selectedClass
    ? monthStudents.filter((student) => (student.className || "Lớp chính") === selectedClass)
    : monthStudents;
  const paidCount = countedStudents.filter((student) => student.paid).length;
  const visibleStudents = filteredStudents();

  schoolName.textContent = state.schoolName || "Lớp học";
  scheduleText.textContent = state.schedule || "Chưa cập nhật lịch học";
  bankOwner.textContent = state.bank.owner || "-";
  bankName.textContent = state.bank.bankName || "-";
  accountNumber.textContent = state.bank.accountNumber || "-";
  transferNote.textContent = state.bank.transferNote || "-";
  totalStudents.textContent = String(countedStudents.length);
  paidStudents.textContent = String(paidCount);
  unpaidStudents.textContent = String(countedStudents.length - paidCount);
  monthLabel.textContent = monthFormatter.format(getMonthDate(monthPicker.value));

  studentsTable.replaceChildren();
  emptyState.hidden = visibleStudents.length > 0;

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
      <td data-label="Thanh toán"></td>
    `;
    row.children[4].append(statusPill(student));
    const qrBtn = document.createElement("button");
    qrBtn.type = "button";
    qrBtn.className = "button small secondary";
    qrBtn.textContent = "Quét QR";
    qrBtn.addEventListener("click", () => showQr(student));
    row.children[6].append(qrBtn);
    studentsTable.append(row);
  });
}

async function loadData() {
  const response = await fetch("/api/public");
  state = await response.json();
  render();
}

monthPicker.value = currentMonthValue();
monthPicker.addEventListener("change", render);
searchInput.addEventListener("input", render);
classFilter.addEventListener("change", render);
closeQrBtn.addEventListener("click", () => qrDialog.close());

loadData();
setInterval(loadData, 15000);

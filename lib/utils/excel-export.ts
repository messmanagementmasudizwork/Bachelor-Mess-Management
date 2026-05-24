// ============================================================
// Excel Export — Corporate styled Monthly Report
// Uses ExcelJS for full cell styling support
// ============================================================
import type { MemberReportData, DailyMealEntry } from "@/components/reports/MemberReportCard";

interface MonthlyReport {
  total_meals: number;
  meal_rate: number;
  total_expense: number;
  total_deposited: number;
  manager_name?: string;
  members: MemberReportData[];
  is_closed: boolean;
}

// ── Helpers ────────────────────────────────────────────────────
function getEndDay(month: string): number {
  const today = new Date().toISOString().split("T")[0];
  const [year, mon] = month.split("-").map(Number);
  const lastDay = new Date(year, mon, 0).getDate();
  return month === new Date().toISOString().slice(0, 7)
    ? parseInt(today.split("-")[2], 10)
    : lastDay;
}

function getReportPeriod(month: string): string {
  const [year, mon] = month.split("-").map(Number);
  const endDay = getEndDay(month);
  const names = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const m = names[mon - 1];
  return `01 ${m} – ${String(endDay).padStart(2, "0")} ${m} ${year}`;
}

function cellLabel(entry: DailyMealEntry | undefined): string {
  if (!entry) return "";
  const p: string[] = [];
  if (entry.b) p.push("B");
  if (entry.l) p.push("L");
  if (entry.d) p.push("D");
  const regular = p.join("+");
  const guest = entry.g > 0 ? `G:${entry.g}` : "";
  if (!regular && !guest) return "";
  if (!regular) return guest;
  if (!guest) return regular;
  return `${regular} ${guest}`;
}

function colLetter(n: number): string {
  let r = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    r = String.fromCharCode(65 + rem) + r;
    n = Math.floor((n - 1) / 26);
  }
  return r;
}

// ── Corporate colors ───────────────────────────────────────────
const C = {
  NAVY:        "FF121E34",
  MID_NAVY:    "FF1E2D4A",
  NAVY_TEXT:   "FF0F172A",
  WHITE:       "FFFFFFFF",
  MUTED_BLUE:  "FFA0AFC8",
  LIGHT_GRAY:  "FFF7F8FA",
  BORDER_GRAY: "FFD2D7E1",
  MUTED_TEXT:  "FF6B7280",
  DARK_RED:    "FF7F1D1D",
  DARK_GREEN:  "FF14532D",
  MED_RED:     "FF991B1B",
  MED_GREEN:   "FF166534",
  ALT_ROW:     "FFF8F9FA",
  HDR_ROW:     "FF334155",
  ADV_BG:      "FFF0FDF4",
  DUE_BG:      "FFFEF2F2",
};

// ── Style helpers ─────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type XlCell = any;

function fill(cell: XlCell, argb: string) {
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb } };
}
function font(cell: XlCell, opts: object) {
  cell.font = { name: "Calibri", ...opts };
}
function align(cell: XlCell, h: string, v = "middle") {
  cell.alignment = { horizontal: h, vertical: v, wrapText: true };
}
function border(cell: XlCell, color = C.BORDER_GRAY, style = "thin") {
  const s = { style, color: { argb: color } };
  cell.border = { top: s, bottom: s, left: s, right: s };
}
function topBorder(cell: XlCell, argb: string, thick = false) {
  const side = { style: thick ? "medium" : "thin", color: { argb } };
  cell.border = {
    top: side,
    bottom: { style: "thin", color: { argb: C.BORDER_GRAY } },
    left:   { style: "thin", color: { argb: C.BORDER_GRAY } },
    right:  { style: "thin", color: { argb: C.BORDER_GRAY } },
  };
}

export async function exportReportToExcel(
  report: MonthlyReport,
  monthLabel: string,
  messName: string,
  month: string
): Promise<void> {
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.default.Workbook();
  workbook.creator = "MessPilot";
  workbook.created = new Date();

  const ws = workbook.addWorksheet("Monthly Report", {
    pageSetup: {
      orientation: "landscape",
      paperSize: 9,
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.5, right: 0.5, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 },
    },
  });

  const [year, mon] = month.split("-").map(Number);
  const endDay = getEndDay(month);
  const days = Array.from({ length: endDay }, (_, i) => i + 1);
  const period = getReportPeriod(month);
  const generatedOn = new Date().toLocaleDateString("en-GB");
  const netBalance = report.total_deposited - report.total_expense;

  // ── Column widths ─────────────────────────────────────────────
  const totalCols = 2 + days.length + 5;
  const LAST = colLetter(totalCols);

  ws.columns = [
    { width: 5  }, // SL
    { width: 22 }, // Name
    ...days.map(() => ({ width: 8 })),
    { width: 13 }, // Total Meals
    { width: 16 }, // Cost
    { width: 17 }, // Deposited
    { width: 16 }, // Balance
    { width: 12 }, // Status
  ];

  // ── Merge helper (1-indexed cols) ─────────────────────────────
  const mc = (r1: number, c1: number, r2: number, c2: number) =>
    ws.mergeCells(r1, c1, r2, c2);

  // ─────────────────────────────────────────────────────────────
  // ROW 1: Main banner
  // Left: MessPilot | Center: Mess Name | Right: Generated date
  // ─────────────────────────────────────────────────────────────
  const leftEnd  = Math.floor(totalCols * 0.25);
  const rightStart = Math.floor(totalCols * 0.8) + 1;

  ws.addRow([]); // row 1
  ws.getRow(1).height = 26;

  mc(1, 1, 1, leftEnd);
  mc(1, leftEnd + 1, 1, rightStart - 1);
  mc(1, rightStart, 1, totalCols);

  const r1left = ws.getCell(1, 1);
  fill(r1left, C.NAVY);
  font(r1left, { bold: true, size: 16, color: { argb: C.WHITE } });
  align(r1left, "left");
  r1left.value = "MessPilot";

  const r1center = ws.getCell(1, leftEnd + 1);
  fill(r1center, C.NAVY);
  font(r1center, { bold: true, size: 16, color: { argb: C.WHITE } });
  align(r1center, "center");
  r1center.value = messName;

  const r1right = ws.getCell(1, rightStart);
  fill(r1right, C.NAVY);
  font(r1right, { size: 9, color: { argb: C.MUTED_BLUE } });
  align(r1right, "right");
  r1right.value = `Generated: ${generatedOn}${report.is_closed ? "   [ CLOSED ]" : ""}`;

  // Fill all cells navy in row 1
  for (let c = 1; c <= totalCols; c++) {
    fill(ws.getCell(1, c), C.NAVY);
  }

  // ─────────────────────────────────────────────────────────────
  // ROW 2: Subtitle
  // ─────────────────────────────────────────────────────────────
  ws.addRow([]); // row 2
  ws.getRow(2).height = 16;
  mc(2, 1, 2, leftEnd);
  mc(2, leftEnd + 1, 2, totalCols);

  const r2left = ws.getCell(2, 1);
  fill(r2left, C.MID_NAVY);
  font(r2left, { size: 8, color: { argb: C.MUTED_BLUE } });
  align(r2left, "left");
  r2left.value = "Bachelor Mess Management";

  const r2center = ws.getCell(2, leftEnd + 1);
  fill(r2center, C.MID_NAVY);
  font(r2center, { size: 9, color: { argb: C.MUTED_BLUE } });
  align(r2center, "center");
  r2center.value = `Monthly Report  ·  ${monthLabel}`;

  for (let c = 1; c <= totalCols; c++) {
    fill(ws.getCell(2, c), C.MID_NAVY);
  }

  // ─────────────────────────────────────────────────────────────
  // ROW 3: Info strip
  // ─────────────────────────────────────────────────────────────
  ws.addRow([]); // row 3
  ws.getRow(3).height = 20;
  mc(3, 1, 3, totalCols);

  const r3 = ws.getCell(3, 1);
  fill(r3, C.LIGHT_GRAY);
  font(r3, { size: 9, color: { argb: C.NAVY_TEXT } });
  align(r3, "left");
  r3.value = `  Mess: ${messName}          Manager: ${report.manager_name ?? "N/A"}          Period: ${period}`;
  border(r3, C.BORDER_GRAY);

  for (let c = 1; c <= totalCols; c++) {
    fill(ws.getCell(3, c), C.LIGHT_GRAY);
  }

  // ─────────────────────────────────────────────────────────────
  // ROW 4: Spacer
  // ─────────────────────────────────────────────────────────────
  ws.addRow([]);
  ws.getRow(4).height = 6;

  // ─────────────────────────────────────────────────────────────
  // ROWS 5-7: Summary stat cards
  // ─────────────────────────────────────────────────────────────
  const statDefs = [
    {
      label: "Total Meals", value: String(report.total_meals),
      unit: "meals counted",
      topColor: C.HDR_ROW, valColor: C.NAVY_TEXT,
    },
    {
      label: "Meal Rate", value: `BDT ${report.meal_rate.toFixed(2)}`,
      unit: "per meal",
      topColor: C.HDR_ROW, valColor: C.NAVY_TEXT,
    },
    {
      label: "Total Expense", value: `BDT ${report.total_expense.toFixed(2)}`,
      unit: "variable + fixed",
      topColor: C.DARK_RED, valColor: C.MED_RED,
    },
    {
      label: "Total Deposited", value: `BDT ${report.total_deposited.toFixed(2)}`,
      unit: "all members",
      topColor: C.DARK_GREEN, valColor: C.MED_GREEN,
    },
    {
      label: "Net Balance", value: `BDT ${Math.abs(netBalance).toFixed(2)}`,
      unit: netBalance >= 0 ? "surplus" : "deficit",
      topColor: netBalance >= 0 ? C.DARK_GREEN : C.DARK_RED,
      valColor: netBalance >= 0 ? C.MED_GREEN : C.MED_RED,
    },
  ];

  const cardW = Math.floor(totalCols / 5);
  const cardStarts = statDefs.map((_, i) => i * cardW + 1);
  const cardEnds   = statDefs.map((_, i) =>
    i === 4 ? totalCols : (i + 1) * cardW
  );

  ws.addRow([]); ws.getRow(5).height = 18; // value row
  ws.addRow([]); ws.getRow(6).height = 14; // label row
  ws.addRow([]); ws.getRow(7).height = 12; // unit row

  statDefs.forEach((stat, i) => {
    const c1 = cardStarts[i];
    const c2 = cardEnds[i];
    mc(5, c1, 5, c2);
    mc(6, c1, 6, c2);
    mc(7, c1, 7, c2);

    const vCell = ws.getCell(5, c1);
    fill(vCell, C.WHITE);
    font(vCell, { bold: true, size: 11, color: { argb: stat.valColor } });
    align(vCell, "center");
    vCell.value = stat.value;
    topBorder(vCell, stat.topColor, true);

    const lCell = ws.getCell(6, c1);
    fill(lCell, C.WHITE);
    font(lCell, { bold: true, size: 8, color: { argb: C.NAVY_TEXT } });
    align(lCell, "center");
    lCell.value = stat.label;
    border(lCell, C.BORDER_GRAY);

    const uCell = ws.getCell(7, c1);
    fill(uCell, C.WHITE);
    font(uCell, { size: 7, color: { argb: C.MUTED_TEXT } });
    align(uCell, "center");
    uCell.value = stat.unit;
    border(uCell, C.BORDER_GRAY);

    // Fill all cells in each row of the card
    for (let row = 5; row <= 7; row++) {
      for (let c = c1; c <= c2; c++) {
        fill(ws.getCell(row, c), C.WHITE);
      }
    }
  });

  // ─────────────────────────────────────────────────────────────
  // ROW 8: Spacer
  // ─────────────────────────────────────────────────────────────
  ws.addRow([]);
  ws.getRow(8).height = 8;

  // ─────────────────────────────────────────────────────────────
  // ROW 9: Section title
  // ─────────────────────────────────────────────────────────────
  ws.addRow([]);
  ws.getRow(9).height = 16;
  mc(9, 1, 9, totalCols);

  const r9 = ws.getCell(9, 1);
  fill(r9, C.NAVY);
  font(r9, { bold: true, size: 10, color: { argb: C.WHITE } });
  align(r9, "left");
  r9.value = "  MEMBER BREAKDOWN    ·    B = Breakfast   L = Lunch   D = Dinner   G:n = Guest Meals";

  for (let c = 1; c <= totalCols; c++) {
    fill(ws.getCell(9, c), C.NAVY);
  }

  // ─────────────────────────────────────────────────────────────
  // ROW 10: Table header
  // ─────────────────────────────────────────────────────────────
  const tableHdr: (string | number)[] = [
    "SL", "Name",
    ...days.map((d) => d),
    "Total Meals", "Cost (BDT)", "Deposited (BDT)", "Balance (BDT)", "Status",
  ];
  const tHdrRow = ws.addRow(tableHdr);
  tHdrRow.height = 18;

  tHdrRow.eachCell((cell) => {
    fill(cell, C.MID_NAVY);
    font(cell, { bold: true, size: 8, color: { argb: C.WHITE } });
    align(cell, "center");
  });

  // ─────────────────────────────────────────────────────────────
  // DATA ROWS
  // ─────────────────────────────────────────────────────────────
  report.members.forEach((m, idx) => {
    const balance   = m.balance ?? 0;
    const isAdvance = m.status === "advance";
    const isClear   = m.status === "clear";
    const status    = isAdvance ? "Advance" : isClear ? "Clear" : "Due";

    const dayVals = days.map((d) => {
      const dateKey = `${year}-${String(mon).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      return cellLabel(m.daily_meals?.[dateKey]);
    });

    const rowData: (string | number)[] = [
      idx + 1,
      m.member_name,
      ...dayVals,
      m.meal_summary?.total_meals ?? 0,
      parseFloat(m.total_cost.toFixed(2)),
      parseFloat(m.deposited.toFixed(2)),
      parseFloat(balance.toFixed(2)),
      status,
    ];

    const dataRow = ws.addRow(rowData);
    dataRow.height = 16;

    const rowBg = idx % 2 === 0 ? C.WHITE : C.ALT_ROW;

    dataRow.eachCell({ includeEmpty: true }, (cell, colNum) => {
      fill(cell, rowBg);
      font(cell, { size: 8, color: { argb: C.NAVY_TEXT } });
      align(cell, colNum <= 2 ? "left" : "center");
      border(cell);
    });

    // SL: center + muted
    const slCell = dataRow.getCell(1);
    font(slCell, { size: 8, color: { argb: C.MUTED_TEXT } });
    align(slCell, "center");

    // Name: left + bold
    const nameCell = dataRow.getCell(2);
    font(nameCell, { bold: true, size: 8, color: { argb: C.NAVY_TEXT } });
    align(nameCell, "left");

    // Day cells: green text for B/L/D, purple for G:
    days.forEach((_, di) => {
      const dCell = dataRow.getCell(3 + di);
      const val = String(dCell.value ?? "");
      if (!val) {
        font(dCell, { size: 7, color: { argb: C.BORDER_GRAY } });
        dCell.value = "-";
      } else if (val.includes("G:")) {
        font(dCell, { size: 7, color: { argb: "FF6D28D9" } }); // purple
      } else {
        font(dCell, { size: 7, color: { argb: C.MED_GREEN } }); // dark green
      }
    });

    // Total meals
    const tmCol = 3 + days.length;
    const tmCell = dataRow.getCell(tmCol);
    font(tmCell, { bold: true, size: 8, color: { argb: C.NAVY_TEXT } });

    // Balance: colored
    const balCol = tmCol + 3;
    const balCell = dataRow.getCell(balCol);
    const balColor = isAdvance ? C.MED_GREEN : isClear ? C.MUTED_TEXT : C.MED_RED;
    font(balCell, { bold: true, size: 8, color: { argb: balColor } });

    // Status: bg + text
    const statCol = balCol + 1;
    const statCell = dataRow.getCell(statCol);
    const statBg = isAdvance ? C.ADV_BG : isClear ? C.LIGHT_GRAY : C.DUE_BG;
    const statColor = isAdvance ? C.MED_GREEN : isClear ? C.MUTED_TEXT : C.MED_RED;
    fill(statCell, statBg);
    font(statCell, { bold: true, size: 8, color: { argb: statColor } });
    align(statCell, "center");
  });

  // ─────────────────────────────────────────────────────────────
  // Footer row
  // ─────────────────────────────────────────────────────────────
  ws.addRow([]);
  const footerRow = ws.addRow([]);
  footerRow.height = 14;
  ws.mergeCells(footerRow.number, 1, footerRow.number, totalCols);
  const footerCell = ws.getCell(footerRow.number, 1);
  fill(footerCell, C.LIGHT_GRAY);
  font(footerCell, { size: 7, italic: true, color: { argb: C.MUTED_TEXT } });
  align(footerCell, "center");
  footerCell.value = "Generated by MessPilot — Bachelor Mess Management Platform";

  // ── Write file ────────────────────────────────────────────────
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `messpilot-${messName.replace(/\s/g, "-")}-${monthLabel}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

// ============================================================
// PDF Export — Monthly Report (Landscape A4)
// Daily meal breakdown per member with date columns
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

const PAGE_W  = 297;
const PAGE_H  = 210;
const MARGIN  = 12;
const CONTENT_W = PAGE_W - MARGIN * 2;

function tk(amount: number): string {
  return `${amount.toFixed(0)}`;
}

function getEndDay(month: string): number {
  const today = new Date().toISOString().split("T")[0];
  const [year, mon] = month.split("-").map(Number);
  const lastDay = new Date(year, mon, 0).getDate();
  const currentMonthStr = new Date().toISOString().slice(0, 7);
  return month === currentMonthStr
    ? parseInt(today.split("-")[2], 10)
    : lastDay;
}

function getReportPeriod(month: string): string {
  const [year, mon] = month.split("-").map(Number);
  const endDay = getEndDay(month);
  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const mName = monthNames[mon - 1];
  return `01 ${mName} – ${String(endDay).padStart(2, "0")} ${mName} ${year}`;
}

function mealParts(entry: DailyMealEntry | undefined): { regular: string; guest: string } {
  if (!entry) return { regular: "", guest: "" };
  const parts: string[] = [];
  if (entry.b) parts.push("B");
  if (entry.l) parts.push("L");
  if (entry.d) parts.push("D");
  return {
    regular: parts.join(""),
    guest: entry.g > 0 ? `G:${entry.g}` : "",
  };
}

export async function exportReportToPDF(
  report: MonthlyReport,
  monthLabel: string,
  messName: string,
  month: string
): Promise<void> {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  const [year, mon] = month.split("-").map(Number);
  const endDay = getEndDay(month);
  const days = Array.from({ length: endDay }, (_, i) => i + 1);
  const period = getReportPeriod(month);

  // ── Column layout ────────────────────────────────────────────
  // Fixed: SL(7) Name(28) ... TotalMeals(15) Cost(20) Deposited(21) Balance(20) Status(15)
  const SL_W   = 7;
  const NAME_W = 28;
  const TM_W   = 15;
  const COST_W = 20;
  const DEP_W  = 21;
  const BAL_W  = 20;
  const STAT_W = 15;
  const FIXED_W = SL_W + NAME_W + TM_W + COST_W + DEP_W + BAL_W + STAT_W; // 126

  const DATE_AREA = CONTENT_W - FIXED_W;           // 273 - 126 = 147
  const DAY_W     = DATE_AREA / days.length;        // dynamic per month

  // x positions
  const X_SL   = MARGIN;
  const X_NAME = X_SL + SL_W;
  const X_DAYS = X_NAME + NAME_W;
  const X_TM   = X_DAYS + days.length * DAY_W;
  const X_COST = X_TM + TM_W;
  const X_DEP  = X_COST + COST_W;
  const X_BAL  = X_DEP + DEP_W;
  const X_STAT = X_BAL + BAL_W;

  let y = 14;

  // ══════════════════════════════════════════════════════════════
  // ── CORPORATE HEADER BANNER ───────────────────────────────────
  // ══════════════════════════════════════════════════════════════

  // Full-width dark navy banner
  const BANNER_H = 18;
  doc.setFillColor(18, 30, 52);           // deep navy
  doc.rect(MARGIN, y, CONTENT_W, BANNER_H, "F");

  // Left: MessPilot branding (white)
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("MessPilot", MARGIN + 4, y + 8);

  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(160, 175, 200);        // muted slate-blue
  doc.text("Bachelor Mess Management", MARGIN + 4, y + 13.5);

  // Thin vertical divider
  doc.setDrawColor(255, 255, 255, 0.2);
  doc.setLineWidth(0.3);
  doc.line(MARGIN + 58, y + 3, MARGIN + 58, y + BANNER_H - 3);
  doc.setLineWidth(0.2);

  // Center: Mess name + report title (white)
  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text(messName, PAGE_W / 2, y + 8, { align: "center" });

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(180, 195, 215);
  doc.text(`Monthly Report  ·  ${monthLabel}`, PAGE_W / 2, y + 14, { align: "center" });

  // Right: generated date (muted)
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(160, 175, 200);
  doc.text(`Generated: ${new Date().toLocaleDateString("en-GB")}`, PAGE_W - MARGIN - 4, y + 8, { align: "right" });

  if (report.is_closed) {
    doc.setFillColor(255, 255, 255);
    doc.setTextColor(18, 30, 52);
    doc.setFontSize(6);
    doc.setFont("helvetica", "bold");
    doc.roundedRect(PAGE_W - MARGIN - 20, y + 10.5, 16, 4.5, 0.8, 0.8, "F");
    doc.text("CLOSED", PAGE_W - MARGIN - 12, y + 13.8, { align: "center" });
  }

  doc.setTextColor(0, 0, 0);
  y += BANNER_H + 4;

  // ── Info row ─────────────────────────────────────────────────
  doc.setFillColor(247, 248, 250);        // near-white gray
  doc.rect(MARGIN, y, CONTENT_W, 8.5, "F");
  doc.setDrawColor(218, 222, 230);
  doc.setLineWidth(0.25);
  doc.rect(MARGIN, y, CONTENT_W, 8.5, "S");
  doc.setLineWidth(0.2);

  const infoItems = [
    { label: "Mess:",    value: messName,                    x: MARGIN + 5 },
    { label: "Manager:", value: report.manager_name ?? "N/A", x: MARGIN + 90 },
    { label: "Period:",  value: period,                      x: MARGIN + 175 },
  ];
  infoItems.forEach(({ label, value, x }) => {
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(80, 90, 110);
    doc.text(label, x, y + 5.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(20, 25, 40);
    const lw = doc.getTextWidth(label);
    doc.text(value, x + lw + 2, y + 5.5);
  });
  doc.setTextColor(0, 0, 0);
  y += 12;

  // ── Summary stat cards ────────────────────────────────────────
  const netBalance = report.total_deposited - report.total_expense;

  // Corporate: white cards, thin border, subtle top rule, dark text
  const statCards = [
    {
      label: "Total Meals",
      value: String(report.total_meals),
      unit: "meals counted",
      topColor: [71, 85, 105] as [number, number, number],   // slate-600
      valColor: [18, 30, 52] as [number, number, number],    // navy
    },
    {
      label: "Meal Rate",
      value: `BDT ${report.meal_rate.toFixed(2)}`,
      unit: "per meal",
      topColor: [71, 85, 105] as [number, number, number],
      valColor: [18, 30, 52] as [number, number, number],
    },
    {
      label: "Total Expense",
      value: `BDT ${report.total_expense.toFixed(2)}`,
      unit: "variable + fixed",
      topColor: [127, 29, 29] as [number, number, number],   // dark red
      valColor: [127, 29, 29] as [number, number, number],
    },
    {
      label: "Total Deposited",
      value: `BDT ${report.total_deposited.toFixed(2)}`,
      unit: "all members",
      topColor: [20, 83, 45] as [number, number, number],    // dark green
      valColor: [20, 83, 45] as [number, number, number],
    },
    {
      label: "Net Balance",
      value: `BDT ${Math.abs(netBalance).toFixed(2)}`,
      unit: netBalance >= 0 ? "surplus" : "deficit",
      topColor: netBalance >= 0
        ? [20, 83, 45] as [number, number, number]
        : [127, 29, 29] as [number, number, number],
      valColor: netBalance >= 0
        ? [20, 83, 45] as [number, number, number]
        : [127, 29, 29] as [number, number, number],
    },
  ];

  const CARD_W = (CONTENT_W - (statCards.length - 1)) / statCards.length;
  const CARD_H = 14;

  statCards.forEach((card, i) => {
    const cx = MARGIN + i * (CARD_W + 1);

    // White card
    doc.setFillColor(255, 255, 255);
    doc.rect(cx, y, CARD_W, CARD_H, "F");

    // Thin border
    doc.setDrawColor(210, 215, 225);
    doc.setLineWidth(0.25);
    doc.rect(cx, y, CARD_W, CARD_H, "S");
    doc.setLineWidth(0.2);

    // Top rule (2px colored line)
    doc.setFillColor(...card.topColor);
    doc.rect(cx, y, CARD_W, 1.5, "F");

    // Value (bold, colored)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...card.valColor);
    doc.text(card.value, cx + 4, y + 7.5);

    // Label (dark gray)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6);
    doc.setTextColor(45, 55, 72);
    doc.text(card.label, cx + 4, y + 10.5);

    // Unit (muted)
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.5);
    doc.setTextColor(140, 148, 165);
    doc.text(card.unit, cx + 4, y + 13);
  });

  doc.setTextColor(0, 0, 0);
  y += CARD_H + 5;

  // Thin separator line before table
  doc.setDrawColor(200, 206, 216);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  doc.setLineWidth(0.2);
  y += 4;

  // ── Member Breakdown title ────────────────────────────────────
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Member Breakdown", MARGIN, y);
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120, 120, 120);
  doc.text("B=Breakfast  L=Lunch  D=Dinner  G:n=Guest meals", MARGIN + 32, y);
  doc.setTextColor(0, 0, 0);
  y += 5;

  // ── Table header row ─────────────────────────────────────────
  const TABLE_HDR_H = 7;
  const ROW_H       = 8;

  const drawTableHeader = () => {
    doc.setFillColor(55, 65, 81);
    doc.rect(MARGIN, y, CONTENT_W, TABLE_HDR_H, "F");
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);

    doc.text("SL",        X_SL + SL_W / 2,     y + 4.5, { align: "center" });
    doc.text("Name",      X_NAME + 2,           y + 4.5);
    // day numbers
    days.forEach((d, i) => {
      const cx = X_DAYS + i * DAY_W + DAY_W / 2;
      doc.text(String(d), cx, y + 4.5, { align: "center" });
    });
    doc.text("Meals",     X_TM + TM_W / 2,      y + 4.5, { align: "center" });
    doc.text("Cost",      X_COST + COST_W / 2,  y + 4.5, { align: "center" });
    doc.text("Deposited", X_DEP + DEP_W / 2,    y + 4.5, { align: "center" });
    doc.text("Balance",   X_BAL + BAL_W / 2,    y + 4.5, { align: "center" });
    doc.text("Status",    X_STAT + STAT_W / 2,  y + 4.5, { align: "center" });

    doc.setTextColor(0, 0, 0);
    y += TABLE_HDR_H;
  };

  drawTableHeader();

  // ── Member rows ──────────────────────────────────────────────
  report.members.forEach((m, rowIdx) => {
    // page break
    if (y + ROW_H > PAGE_H - 12) {
      doc.addPage();
      y = 14;
      drawTableHeader();
    }

    const isAdvance = m.status === "advance";
    const isClear   = m.status === "clear";
    const balance   = m.balance ?? 0;

    // Alternating row bg
    if (rowIdx % 2 === 0) {
      doc.setFillColor(248, 249, 251);
      doc.rect(MARGIN, y, CONTENT_W, ROW_H, "F");
    }

    // Thin row divider
    doc.setDrawColor(230, 230, 230);
    doc.line(MARGIN, y + ROW_H, PAGE_W - MARGIN, y + ROW_H);

    // SL
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    doc.text(String(rowIdx + 1), X_SL + SL_W / 2, y + 5, { align: "center" });

    // Name
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.text(m.member_name.slice(0, 16), X_NAME + 1, y + 5);
    doc.setFont("helvetica", "normal");

    // Date columns
    days.forEach((d, i) => {
      const dateKey = `${year}-${String(mon).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const entry = m.daily_meals?.[dateKey];
      const { regular, guest } = mealParts(entry);
      const cx = X_DAYS + i * DAY_W + DAY_W / 2;

      if (regular) {
        doc.setFontSize(5.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(15, 100, 50);
        doc.text(regular, cx, y + (guest ? 3.5 : 5), { align: "center" });
      }
      if (guest) {
        doc.setFontSize(4.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(120, 50, 180);
        doc.text(guest, cx, y + 7, { align: "center" });
      }
      if (!regular && !guest) {
        doc.setFontSize(5);
        doc.setTextColor(200, 200, 200);
        doc.text("-", cx, y + 5, { align: "center" });
      }
    });

    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");

    // Total Meals
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "bold");
    doc.text(String(m.meal_summary?.total_meals ?? 0), X_TM + TM_W / 2, y + 5, { align: "center" });
    doc.setFont("helvetica", "normal");

    // Cost
    doc.setFontSize(6);
    doc.text(tk(m.total_cost), X_COST + COST_W - 1, y + 5, { align: "right" });

    // Deposited
    doc.text(tk(m.deposited), X_DEP + DEP_W - 1, y + 5, { align: "right" });

    // Balance (colored)
    if (isAdvance) doc.setTextColor(22, 163, 74);
    else if (isClear) doc.setTextColor(100, 100, 100);
    else doc.setTextColor(220, 38, 38);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6);
    const balSign = isAdvance ? "+" : isClear ? "" : "-";
    doc.text(`${balSign}${tk(Math.abs(balance))}`, X_BAL + BAL_W - 1, y + 5, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);

    // Status badge
    const statusBg: [number, number, number] = isAdvance
      ? [22, 163, 74]
      : isClear
      ? [100, 100, 100]
      : [220, 38, 38];
    doc.setFillColor(...statusBg);
    doc.roundedRect(X_STAT + 1, y + 1.5, STAT_W - 2, 5, 0.8, 0.8, "F");
    doc.setFontSize(5.5);
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.text(
      isAdvance ? "Advance" : isClear ? "Clear" : "Due",
      X_STAT + STAT_W / 2, y + 5, { align: "center" }
    );
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");

    y += ROW_H;
  });

  // ── Footer ───────────────────────────────────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFontSize(6);
    doc.setTextColor(170, 170, 170);
    doc.text(
      "Generated by MessPilot — Bachelor Mess Management Platform",
      PAGE_W / 2, PAGE_H - 5, { align: "center" }
    );
    doc.text(`Page ${p} of ${totalPages}`, PAGE_W - MARGIN, PAGE_H - 5, { align: "right" });
    doc.setTextColor(0, 0, 0);
  }

  const safeName = messName.replace(/\s/g, "-");
  doc.save(`messpilot-${safeName}-${monthLabel}.pdf`);
}

import type PDFDocument from 'pdfkit';
import type { ReportsService } from '../reports.service.js';

type Report = Awaited<
  ReturnType<ReportsService['getHealthReport']>
>;

type Indicators = Report['indicators'];

const NAVY = '#183153';
const BLUE = '#2563EB';
const GREEN = '#16A34A';
const AMBER = '#F59E0B';
const RED = '#DC2626';
const GRAY = '#667085';
const LIGHT = '#E2E8F0';

const MARGIN = 46;
const WIDTH = 595.28 - MARGIN * 2;

function heading(
  doc: PDFKit.PDFDocument,
  title: string,
  y: number,
) {
  doc
    .fillColor(NAVY)
    .font('Helvetica-Bold')
    .fontSize(13)
    .text(title, MARGIN, y);

  doc
    .strokeColor(LIGHT)
    .lineWidth(1)
    .moveTo(MARGIN, y + 22)
    .lineTo(MARGIN + WIDTH, y + 22)
    .stroke();
}

function bar(
  doc: PDFKit.PDFDocument,
  label: string,
  value: number,
  max: number,
  y: number,
  color: string,
) {
  const x = MARGIN + 175;
  const available = WIDTH - 235;
  const safeMax = Math.max(1, max);
  const length = Math.max(0, value) / safeMax * available;

  doc
    .fillColor(NAVY)
    .font('Helvetica')
    .fontSize(9)
    .text(label, MARGIN, y + 4, {
      width: 165,
    });

  doc
    .fillColor('#F1F5F9')
    .roundedRect(x, y, available, 17, 4)
    .fill();

  if (length > 0) {
    doc
      .fillColor(color)
      .roundedRect(x, y, length, 17, 4)
      .fill();
  }

  doc
    .fillColor(NAVY)
    .font('Helvetica-Bold')
    .fontSize(9)
    .text(String(value), x + available + 10, y + 4, {
      width: 45,
    });
}

function donut(
  doc: PDFKit.PDFDocument,
  values: number[],
  colors: string[],
  cx: number,
  cy: number,
) {
  const total = values.reduce((a, b) => a + b, 0);
  const radius = 62;
  const innerRadius = 37;

  if (total === 0) {
    doc
      .fillColor(LIGHT)
      .circle(cx, cy, radius)
      .fill();
  } else {
    let start = -Math.PI / 2;

    values.forEach((value, index) => {
      if (value <= 0) return;

      const end = start + value / total * Math.PI * 2;
      const steps = Math.max(2, Math.ceil((end - start) / 0.05));

      doc
        .fillColor(colors[index])
        .moveTo(cx, cy);

      for (let step = 0; step <= steps; step++) {
        const angle = start + (end - start) * step / steps;

        doc.lineTo(
          cx + Math.cos(angle) * radius,
          cy + Math.sin(angle) * radius,
        );
      }

      doc.closePath().fill();
      start = end;
    });
  }

  doc
    .fillColor('#FFFFFF')
    .circle(cx, cy, innerRadius)
    .fill();

  doc
    .fillColor(NAVY)
    .font('Helvetica-Bold')
    .fontSize(17)
    .text(String(total), cx - 30, cy - 10, {
      width: 60,
      align: 'center',
    });
}

export function drawHealthReportCharts(
  doc: PDFKit.PDFDocument,
  indicators: Indicators,
): void {
  doc.addPage();

  heading(doc, 'Clinical Analytics', 48);

  doc
    .fillColor(GRAY)
    .font('Helvetica')
    .fontSize(9)
    .text(
      'Visual summary of the selected reporting period',
      MARGIN,
      82,
    );

  heading(doc, '1. Clinical Activity', 113);

  const activity = [
    ['New patient registrations', indicators.patientRegistration.newPatients],
    ['Total consultations', indicators.consultations.totalEncounters],
    ['Laboratory orders', indicators.laboratory.ordersPlaced],
    ['Radiology orders', indicators.radiology.ordersPlaced],
  ] as const;

  const activityMax = Math.max(
    1,
    ...activity.map((item) => item[1]),
  );

  activity.forEach(([label, value], index) => {
    bar(
      doc,
      label,
      value,
      activityMax,
      151 + index * 32,
      BLUE,
    );
  });

  heading(doc, '2. Encounter Status', 300);

  const statuses = [
    indicators.consultations.completedEncounters,
    indicators.consultations.inProgressEncounters,
    indicators.consultations.cancelledEncounters,
  ];

  const total = statuses.reduce((a, b) => a + b, 0);

  donut(
    doc,
    statuses,
    [GREEN, BLUE, RED],
    MARGIN + 105,
    415,
  );

  const labels = [
    'Completed',
    'In progress',
    'Cancelled',
  ];

  statuses.forEach((value, index) => {
    const y = 365 + index * 35;
    const percent = total > 0 ? value / total * 100 : 0;

    doc
      .fillColor([GREEN, BLUE, RED][index])
      .rect(MARGIN + 230, y + 3, 11, 11)
      .fill();

    doc
      .fillColor(NAVY)
      .font('Helvetica')
      .fontSize(10)
      .text(
        `${labels[index]}: ${value} (${percent.toFixed(1)}%)`,
        MARGIN + 250,
        y,
      );
  });

  heading(doc, '3. Diagnostic Activity', 510);

  const diagnostics = [
    {
      name: 'Laboratory',
      orders: indicators.laboratory.ordersPlaced,
      results: indicators.laboratory.resultsRecorded,
    },
    {
      name: 'Radiology',
      orders: indicators.radiology.ordersPlaced,
      results: indicators.radiology.resultsRecorded,
    },
  ];

  const diagnosticMax = Math.max(
    1,
    ...diagnostics.flatMap((d) => [d.orders, d.results]),
  );

  diagnostics.forEach((item, index) => {
    const y = 550 + index * 80;

    doc
      .fillColor(NAVY)
      .font('Helvetica-Bold')
      .fontSize(10)
      .text(item.name, MARGIN, y);

    bar(
      doc,
      'Orders placed',
      item.orders,
      diagnosticMax,
      y + 20,
      BLUE,
    );

    bar(
      doc,
      'Results recorded',
      item.results,
      diagnosticMax,
      y + 43,
      GREEN,
    );
  });
}
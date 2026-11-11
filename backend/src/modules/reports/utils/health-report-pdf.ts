
import PDFDocument from 'pdfkit';
import type { ReportsService } from '../reports.service.js';

type HealthReport = Awaited<
  ReturnType<ReportsService['getHealthReport']>
>;

type IndicatorRow = {
  label: string;
  value: number;
};

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 46;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

const NAVY = '#183153';
const BLUE = '#2363A0';
const GRAY = '#667085';
const LIGHT = '#F1F5F9';
const BORDER = '#D9E2EC';

export function generateHealthReportPdf(
  report: HealthReport,
): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: MARGIN,
      bufferPages: true,
      info: {
        Title: 'Health Office Performance Report',
        Author: report.facility.name,
        Subject: report.reportingPeriod.label,
        Creator: 'PIMS',
      },
    });

    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });

    doc.on('error', reject);

    doc.on('end', () => {
      resolve(Buffer.concat(chunks));
    });

    // Header
// Ethiopian health facility reporting header
doc
  .fillColor(GRAY)
  .font('Helvetica-Bold')
  .fontSize(9)
  .text(
    'OROMIA - HEALTH OFFICE REPORTING',
    MARGIN,
    35,
    {
      width: CONTENT_WIDTH,
      align: 'center',
    },
  );

doc
  .fillColor(NAVY)
  .font('Helvetica-Bold')
  .fontSize(17)
  .text(
    report.facility.name,
    MARGIN,
    52,
    {
      width: CONTENT_WIDTH,
      align: 'center',
    },
  );

doc
  .fillColor(BLUE)
  .font('Helvetica-Bold')
  .fontSize(11)
  .text(
    'HEALTH OFFICE SERVICE PERFORMANCE REPORT',
    MARGIN,
    81,
    {
      width: CONTENT_WIDTH,
      align: 'center',
    },
  );

    doc
      .strokeColor(BLUE)
      .lineWidth(1.5)
      .moveTo(MARGIN, 104)
      .lineTo(PAGE_WIDTH - MARGIN, 104)
      .stroke();

    // Facility and reporting metadata
    let y = 122;

    const metadata: Array<[string, string]> = [
  [
    'Facility Name',
    report.facility.name,
  ],
  [
    'Facility Code',
    report.facility.code,
  ],
  [
    'Facility Type',
    report.facility.facilityType ?? 'Not specified',
  ],
  [
    'Woreda / Address',
    report.facility.address ?? 'Not specified',
  ],
  [
    'City / Locality',
    report.facility.city ?? 'Not specified',
  ],
  [
    'Region',
    report.facility.region ?? 'Not specified',
  ],
  [
    'Country',
    report.facility.country ?? 'Ethiopia',
  ],
  [
    'Reporting Period',
    report.reportingPeriod.label,
  ],
  [
    'Period Type',
    report.reportingPeriod.period,
  ],
  [
    'Timezone',
    report.reportingPeriod.timezone,
  ],
  [
    'Calendar',
    report.reportingPeriod.calendar,
  ],
  [
    'Generated At (UTC)',
    report.generatedAt,
  ],
];

    for (const [label, value] of metadata) {
      doc
        .fillColor(GRAY)
        .font('Helvetica')
        .fontSize(9)
        .text(label, MARGIN, y, {
          width: 145,
        });

      doc
        .fillColor(NAVY)
        .font('Helvetica-Bold')
        .fontSize(9)
        .text(value, MARGIN + 150, y, {
          width: CONTENT_WIDTH - 150,
        });

      y += 21;
    }

    // Performance indicator table
    y += 13;

    doc
      .fillColor(NAVY)
      .font('Helvetica-Bold')
      .fontSize(12)
      .text('Performance Indicators', MARGIN, y);

    y += 25;

    doc
      .fillColor(NAVY)
      .rect(MARGIN, y, CONTENT_WIDTH, 26)
      .fill();

    doc
      .fillColor('#FFFFFF')
      .font('Helvetica-Bold')
      .fontSize(9)
      .text('Indicator', MARGIN + 12, y + 8)
      .text(
        'Value',
        PAGE_WIDTH - MARGIN - 90,
        y + 8,
        {
          width: 75,
          align: 'right',
        },
      );

    y += 26;

    const i = report.indicators;

    const rows: IndicatorRow[] = [
      {
        label: 'New Patient Registrations',
        value: i.patientRegistration.newPatients,
      },
      {
        label: 'Total Consultations',
        value: i.consultations.totalEncounters,
      },
      {
        label: 'Completed Consultations',
        value: i.consultations.completedEncounters,
      },
      {
        label: 'Consultations In Progress',
        value: i.consultations.inProgressEncounters,
      },
      {
        label: 'Cancelled Consultations',
        value: i.consultations.cancelledEncounters,
      },
      {
        label: 'Unique Patients Served',
        value: i.consultations.uniquePatientsServed,
      },
      {
        label: 'Recorded Diagnoses',
        value: i.diagnoses.recordedDiagnoses,
      },
      {
        label: 'Laboratory Orders',
        value: i.laboratory.ordersPlaced,
      },
      {
        label: 'Laboratory Results',
        value: i.laboratory.resultsRecorded,
      },
      {
        label: 'Radiology Orders',
        value: i.radiology.ordersPlaced,
      },
      {
        label: 'Radiology Results',
        value: i.radiology.resultsRecorded,
      },
    ];

    rows.forEach((row, index) => {
      const rowHeight = 23;

      if (index % 2 === 0) {
        doc
          .fillColor(LIGHT)
          .rect(
            MARGIN,
            y,
            CONTENT_WIDTH,
            rowHeight,
          )
          .fill();
      }

      doc
        .fillColor(NAVY)
        .font('Helvetica')
        .fontSize(9)
        .text(row.label, MARGIN + 12, y + 7, {
          width: CONTENT_WIDTH - 125,
        });

      doc
        .font('Helvetica-Bold')
        .text(
          row.value.toLocaleString('en-US'),
          PAGE_WIDTH - MARGIN - 90,
          y + 7,
          {
            width: 75,
            align: 'right',
          },
        );

      y += rowHeight;
    });

    // Reporting notes
    y += 17;

    doc
      .fillColor(NAVY)
      .font('Helvetica-Bold')
      .fontSize(11)
      .text('Reporting Notes', MARGIN, y);

    y += 20;

    doc
      .fillColor(GRAY)
      .font('Helvetica')
      .fontSize(8);

    for (const note of report.notes) {
      const noteHeight = doc.heightOfString(
        `- ${note}`,
        {
          width: CONTENT_WIDTH,
          lineGap: 2,
        },
      );

      if (y + noteHeight > PAGE_HEIGHT - 175) {
        doc.addPage();
        y = MARGIN;
      }

      doc.text(`- ${note}`, MARGIN, y, {
        width: CONTENT_WIDTH,
        lineGap: 2,
      });

      y += noteHeight + 4;
    }

    // Approval section
    if (y + 125 > PAGE_HEIGHT - 55) {
      doc.addPage();
      y = MARGIN;
    }

    y += 24;

    doc
      .fillColor(NAVY)
      .font('Helvetica-Bold')
      .fontSize(10)
      .text('Prepared By', MARGIN, y)
      .text(
        'Approved By',
        MARGIN + 260,
        y,
      );

    y += 23;

    doc
      .fillColor(GRAY)
      .font('Helvetica')
      .fontSize(9)
      .text('Name: ____________________', MARGIN, y)
      .text(
        'Name: ____________________',
        MARGIN + 260,
        y,
      );

    y += 21;

    doc
      .text('Signature: _______________', MARGIN, y)
      .text(
        'Signature: _______________',
        MARGIN + 260,
        y,
      );

    y += 21;

    doc
      .text('Date: _____________________', MARGIN, y)
      .text(
        'Date: _____________________',
        MARGIN + 260,
        y,
      );

    y += 28;

    doc
      .strokeColor(BORDER)
      .dash(4, { space: 3 })
      .rect(MARGIN, y, CONTENT_WIDTH, 43)
      .stroke()
      .undash();

    doc
      .fillColor(GRAY)
      .fontSize(9)
      .text(
        'Reserved for Authorized Official Stamp',
        MARGIN,
        y + 16,
        {
          width: CONTENT_WIDTH,
          align: 'center',
        },
      );

    // Page numbering
    const pageRange = doc.bufferedPageRange();

    for (
      let page = 0;
      page < pageRange.count;
      page++
    ) {
      doc.switchToPage(page);

      doc
        .fillColor(GRAY)
        .font('Helvetica')
        .fontSize(8)
        .text(
          `PIMS Health Office Report | Page ${page + 1} of ${pageRange.count}`,
          MARGIN,
          PAGE_HEIGHT - 35,
          {
            width: CONTENT_WIDTH,
            align: 'center',
            lineBreak: false,
          },
        );
    }

    doc.end();
  });
}

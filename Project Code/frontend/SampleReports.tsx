'use client'

interface SampleReport {
  title: string;
  text: string;
}

interface SampleReportsProps {
  reports: SampleReport[];
  onSelect: (text: string) => void;
}

export default function SampleReports({ reports, onSelect }: SampleReportsProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4">Sample Medical Reports</h2>
      <div className="space-y-2">
        {reports.map((report, idx) => (
          <button
            key={idx}
            onClick={() => onSelect(report.text)}
            className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded border border-gray-200 transition"
          >
            <div className="font-medium text-sm">{report.title}</div>
          </button>
        ))}
      </div>
    </div>
  );
}


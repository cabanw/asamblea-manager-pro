import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download } from "lucide-react";
import { toast } from "sonner";
import { QUORUM_FRACTION } from "@/lib/quorum";
import FiadahLogo from "@/assets/FIADAH_Logo.jpg";

interface AttendeeRow {
  name: string;
  type: 'Miembro' | 'Invitado';
  position: string | null;
}

interface ReportsSectionProps {
  sessionId: string | undefined;
  stats: Stats;
  attendeeList: AttendeeRow[];
}

interface Stats {
  totalMembers: number;
  presentMembers: number;
  totalGuests: number;
  presentGuests: number;
  quorumAchieved: boolean;
}

export const ReportsSection = ({ sessionId, stats, attendeeList }: ReportsSectionProps) => {
  const membersNeededForQuorum = Math.ceil(QUORUM_FRACTION * stats.totalMembers);
  const membersNeeded = Math.max(0, membersNeededForQuorum - stats.presentMembers);
  const quorumPercentage = stats.totalMembers > 0
    ? ((stats.presentMembers / stats.totalMembers) * 100).toFixed(2)
    : "0.00";

  const generatePDFReport = () => {
    try {
      if (!sessionId) {
        toast.error("No active session");
        return;
      }

      const printWindow = window.open("", "", "height=600,width=800");
      if (!printWindow) {
        toast.error("Por favor habilita pop-ups para generar PDF");
        return;
      }

      const now = new Date().toLocaleString('es-ES');
      const quorumColor = stats.quorumAchieved ? "#16a34a" : "#ca8a04";
      const quorumBg = stats.quorumAchieved ? "#f0fdf4" : "#fefce8";

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8" />
          <title>Reporte de Asamblea General</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 32px; color: #1f2937; }
            .header { display: flex; align-items: center; gap: 16px; margin-bottom: 4px; }
            .header img { height: 56px; width: auto; }
            h1 { font-size: 22px; margin-bottom: 4px; }
            h2 { font-size: 14px; font-weight: normal; color: #6b7280; margin-top: 0; }
            .meta { font-size: 12px; color: #6b7280; margin-bottom: 24px; }
            .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
            .stat-box { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; text-align: center; }
            .stat-box .label { font-size: 11px; color: #6b7280; }
            .stat-box .value { font-size: 22px; font-weight: bold; }
            .quorum-block { border-radius: 8px; padding: 16px; margin-bottom: 24px; background: ${quorumBg}; border: 1px solid ${quorumColor}; }
            .quorum-block .status { color: ${quorumColor}; font-weight: bold; font-size: 16px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
            th, td { border: 1px solid #e5e7eb; padding: 8px 12px; text-align: left; font-size: 13px; }
            th { background: #f9fafb; }
            footer { font-size: 11px; color: #9ca3af; text-align: center; margin-top: 32px; }
            @media print {
              body { padding: 12px; }
              .stat-box, .quorum-block, table { break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="${FiadahLogo}" alt="FIADAH" />
            <div>
              <h1>Reporte de Asamblea General</h1>
              <h2>FIADAH</h2>
            </div>
          </div>
          <div class="meta">Generado: ${now} | Sesión: ${sessionId}</div>

          <div class="stats-grid">
            <div class="stat-box">
              <div class="label">Miembros Totales</div>
              <div class="value">${stats.totalMembers}</div>
            </div>
            <div class="stat-box">
              <div class="label">Miembros Presentes</div>
              <div class="value">${stats.presentMembers}</div>
            </div>
            <div class="stat-box">
              <div class="label">Total Invitados</div>
              <div class="value">${stats.totalGuests}</div>
            </div>
            <div class="stat-box">
              <div class="label">Invitados Presentes</div>
              <div class="value">${stats.presentGuests}</div>
            </div>
          </div>

          <div class="quorum-block">
            <div class="status">${stats.quorumAchieved ? "✓ Quórum Alcanzado" : "✗ Quórum No Alcanzado"}</div>
            <div>Umbral requerido: ${membersNeededForQuorum} miembros (2/3)</div>
            <div>Presentes: ${stats.presentMembers} de ${stats.totalMembers} (${quorumPercentage}%)</div>
          </div>

          <table>
            <thead>
              <tr><th>Métrica</th><th>Valor</th></tr>
            </thead>
            <tbody>
              <tr><td>Miembros Totales</td><td>${stats.totalMembers}</td></tr>
              <tr><td>Miembros Presentes</td><td>${stats.presentMembers}</td></tr>
              <tr><td>Total Invitados</td><td>${stats.totalGuests}</td></tr>
              <tr><td>Invitados Presentes</td><td>${stats.presentGuests}</td></tr>
              <tr><td>Umbral de Quórum (2/3)</td><td>${membersNeededForQuorum}</td></tr>
              <tr><td>Porcentaje de Asistencia</td><td>${quorumPercentage}%</td></tr>
              <tr><td>Estado de Quórum</td><td>${stats.quorumAchieved ? "ALCANZADO" : "NO ALCANZADO"}</td></tr>
            </tbody>
          </table>

          <div class="section">
            <h2>👥 Listado de Asistentes (${attendeeList.length})</h2>
            ${attendeeList.length === 0 ? `
              <p>Sin asistentes registrados aún</p>
            ` : `
              <table>
                <tr><th>Nombre</th><th>Tipo</th><th>Posición</th></tr>
                ${attendeeList.map(a => `
                  <tr>
                    <td>${a.name}</td>
                    <td>${a.type}</td>
                    <td>${a.position ?? '—'}</td>
                  </tr>
                `).join('')}
              </table>
            `}
          </div>

          <footer>Generado por Asamblea Manager Pro v2.0 | Desarrollado por Wilfredo Caban - WC Developer</footer>
        </body>
        </html>
      `;

      printWindow.document.write(html);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
      }, 250);

      toast.success("Usa 'Guardar como PDF' en la ventana de print");
    } catch (error) {
      toast.error("Error al generar el reporte PDF");
    }
  };

  const generateExcelReport = () => {
    try {
      if (!sessionId) {
        toast.error("No active session");
        return;
      }

      const now = new Date().toLocaleString('es-ES');
      const rows: string[][] = [
        ["Reporte de Asamblea General"],
        [`Generado: ${now}`],
        [`Sesión: ${sessionId}`],
        [],
        ["RESUMEN DE SESIÓN"],
        ["Miembros Totales", String(stats.totalMembers)],
        ["Miembros Presentes", String(stats.presentMembers)],
        ["Total Invitados", String(stats.totalGuests)],
        ["Invitados Presentes", String(stats.presentGuests)],
        [],
        ["ANÁLISIS DE QUÓRUM"],
        ["Umbral requerido (2/3)", String(membersNeededForQuorum)],
        ["Presentes", String(stats.presentMembers)],
        ["Porcentaje de Asistencia", `${quorumPercentage}%`],
        ["Estado", stats.quorumAchieved ? "ALCANZADO" : "NO ALCANZADO"],
        [],
        ["LISTADO DE ASISTENTES"],
        ["Nombre", "Tipo", "Posición"],
        ...attendeeList.map((a) => [a.name, a.type, a.position ?? "—"]),
        [],
        ["Generado por Asamblea Manager Pro v2.0 | Desarrollado por Wilfredo Caban - WC Developer"],
      ];

      const csv = rows
        .map((row) => row.map((cell) => `"${cell}"`).join(","))
        .join("\r\n");

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `reporte-asamblea-${sessionId}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Reporte Excel descargado");
    } catch (error) {
      toast.error("Error al generar el reporte Excel");
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card className="shadow-lg">
        <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Session Summary
          </CardTitle>
          <CardDescription>Current assembly session statistics</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total Members</p>
              <p className="text-2xl font-bold">{stats.totalMembers}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Present Members</p>
              <p className="text-2xl font-bold text-primary">{stats.presentMembers}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total Guests</p>
              <p className="text-2xl font-bold">{stats.totalGuests}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Present Guests</p>
              <p className="text-2xl font-bold text-accent">{stats.presentGuests}</p>
            </div>
          </div>

          <div className="pt-4 border-t">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Quorum Status</p>
              <p className={`text-2xl font-bold ${stats.quorumAchieved ? "text-success" : "text-warning"}`}>
                {stats.quorumAchieved ? "Achieved" : "Not Achieved"}
              </p>
              <p className="text-sm text-muted-foreground">
                {stats.quorumAchieved
                  ? `Quorum was achieved with ${stats.presentMembers} of ${membersNeededForQuorum} members present.`
                  : `${membersNeeded} more member${membersNeeded !== 1 ? 's' : ''} needed for quorum (${membersNeededForQuorum} required).`}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader className="bg-gradient-to-r from-accent/10 to-accent/5">
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Reports
          </CardTitle>
          <CardDescription>Download attendance and quorum reports</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-3">
            <Button
              className="w-full"
              variant="default"
              onClick={generatePDFReport}
              disabled={!sessionId}
            >
              <FileText className="mr-2 h-4 w-4" />
              Generate PDF Report
            </Button>

            <Button
              className="w-full"
              variant="secondary"
              onClick={generateExcelReport}
              disabled={!sessionId}
            >
              <Download className="mr-2 h-4 w-4" />
              Export to Excel
            </Button>
          </div>

          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              Reports will include:
            </p>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              <li>• Session attendance summary</li>
              <li>• Member and guest counts</li>
              <li>• Quorum calculation and threshold</li>
              <li>• Attendance percentage</li>
              <li>• Generation timestamp</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

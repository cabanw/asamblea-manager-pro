import { useState, useEffect } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { QUORUM_FRACTION } from "@/lib/quorum";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Users, Plus, Search, Upload, Download, Edit, Trash2, X } from "lucide-react";

interface Position {
  id: string;
  name: string;
}

interface MemberRow {
  id: string;
  name: string;
  id_number: string | null;
  email: string | null;
  phone: string | null;
  position_id: string | null;
  organization: string | null;
  is_active: boolean | null;
  position: { name: string } | null;
}

interface ImportRow {
  name: string;
  id_number: string;
  email: string;
  phone: string;
  position: string;
  organization: string;
  is_active: boolean;
}

interface ImportError {
  row: number;
  message: string;
}

const memberFormSchema = z.object({
  name: z.string().trim().min(1, "El nombre es requerido").max(100, "Máximo 100 caracteres"),
  id_number: z.string().trim().max(50, "Máximo 50 caracteres").optional().or(z.literal("")),
  email: z.string().trim().max(255, "Máximo 255 caracteres").email("Email inválido").optional().or(z.literal("")),
  phone: z.string().trim().max(20, "Máximo 20 caracteres").optional().or(z.literal("")),
  position_id: z.string().uuid("Posición inválida").optional().or(z.literal("")),
  organization: z.string().trim().max(200, "Máximo 200 caracteres").optional().or(z.literal("")),
});

const emptyMemberForm = {
  name: "",
  id_number: "",
  email: "",
  phone: "",
  position_id: "",
  organization: "",
  is_active: true,
};

const NO_FILTER = "all";
const NO_POSITION_FILTER = "none";

// Parser CSV manual: soporta campos entre comillas con comas internas
const parseCSVLine = (line: string): string[] => {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
};

const parseCSV = (text: string): Record<string, string>[] => {
  const lines = text.split(/\r\n|\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) return [];

  const headers = parseCSVLine(lines[0]).map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const values = parseCSVLine(line);
    const row: Record<string, string> = {};
    headers.forEach((header, idx) => {
      row[header] = (values[idx] ?? "").trim();
    });
    return row;
  });
};

const parseIsActive = (value: string): boolean => {
  const v = value.trim().toLowerCase();
  if (["false", "0", "inactivo", "no"].includes(v)) return false;
  return true;
};

const MemberManager = () => {
  const { isAdmin } = useAuth();

  const [members, setMembers] = useState<MemberRow[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<MemberRow[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterOrganization, setFilterOrganization] = useState(NO_FILTER);
  const [filterPosition, setFilterPosition] = useState(NO_FILTER);

  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<MemberRow | null>(null);
  const [memberForm, setMemberForm] = useState(emptyMemberForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<ImportRow[]>([]);
  const [importResult, setImportResult] = useState<{ succeeded: number; total: number; errors: ImportError[] } | null>(null);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    loadMembers();
    loadPositions();
  }, []);

  useEffect(() => {
    const query = searchQuery.toLowerCase();
    setFilteredMembers(
      members.filter((m) => {
        const matchesSearch =
          m.name.toLowerCase().includes(query) ||
          (m.id_number && m.id_number.toLowerCase().includes(query));
        const matchesOrganization =
          filterOrganization === NO_FILTER || (m.organization || "") === filterOrganization;
        const matchesPosition =
          filterPosition === NO_FILTER ||
          (filterPosition === NO_POSITION_FILTER ? !m.position_id : m.position_id === filterPosition);
        return matchesSearch && matchesOrganization && matchesPosition;
      })
    );
  }, [searchQuery, filterOrganization, filterPosition, members]);

  const organizationOptions = Array.from(
    new Set(
      members
        .map((m) => m.organization)
        .filter((o): o is string => !!o && o.trim() !== "")
    )
  ).sort((a, b) => a.localeCompare(b));

  const hasActiveFilters =
    searchQuery !== "" || filterOrganization !== NO_FILTER || filterPosition !== NO_FILTER;

  const handleClearFilters = () => {
    setSearchQuery("");
    setFilterOrganization(NO_FILTER);
    setFilterPosition(NO_FILTER);
  };

  const loadMembers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("members")
      .select("*, position:positions(name)")
      .order("name");

    if (error) {
      toast.error("Error al cargar la matrícula de miembros");
      setLoading(false);
      return;
    }

    setMembers((data as unknown as MemberRow[]) || []);
    setLoading(false);
  };

  const loadPositions = async () => {
    const { data, error } = await supabase.from("positions").select("id, name").order("name");
    if (!error) setPositions(data || []);
  };

  const totalMembers = members.length;
  const activeMembers = members.filter((m) => m.is_active).length;
  const quorumThreshold = Math.ceil(QUORUM_FRACTION * activeMembers);

  const handleToggleActive = async (member: MemberRow) => {
    const newValue = !member.is_active;
    const { error } = await supabase
      .from("members")
      .update({ is_active: newValue })
      .eq("id", member.id);

    if (error) {
      toast.error("Error al actualizar estado del miembro");
      return;
    }

    setMembers((prev) => prev.map((m) => (m.id === member.id ? { ...m, is_active: newValue } : m)));
    toast.success(newValue ? "Miembro activado" : "Miembro desactivado");
  };

  const openAddDialog = () => {
    setEditingMember(null);
    setMemberForm(emptyMemberForm);
    setMemberDialogOpen(true);
  };

  const openEditDialog = (member: MemberRow) => {
    setEditingMember(member);
    setMemberForm({
      name: member.name,
      id_number: member.id_number || "",
      email: member.email || "",
      phone: member.phone || "",
      position_id: member.position_id || "",
      organization: member.organization || "",
      is_active: member.is_active ?? true,
    });
    setMemberDialogOpen(true);
  };

  const handleSaveMember = async () => {
    const validation = memberFormSchema.safeParse(memberForm);
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    const data = validation.data;
    setSaving(true);

    try {
      const payload = {
        name: data.name,
        id_number: data.id_number || null,
        email: data.email || null,
        phone: data.phone || null,
        position_id: data.position_id || null,
        organization: data.organization || null,
        is_active: memberForm.is_active,
      };

      if (editingMember) {
        const { error } = await supabase.from("members").update(payload).eq("id", editingMember.id);
        if (error) throw error;
        toast.success("Miembro actualizado correctamente");
      } else {
        const { error } = await supabase.from("members").insert(payload);
        if (error) throw error;
        toast.success("Miembro agregado correctamente");
      }

      setMemberDialogOpen(false);
      loadMembers();
    } catch (error) {
      const err = error as Error;
      toast.error(err.message || "Error al guardar el miembro");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMember = async (id: string) => {
    setDeleting(id);
    try {
      const { error } = await supabase.from("members").delete().eq("id", id);
      if (error) throw error;
      toast.success("Miembro eliminado correctamente");
      loadMembers();
    } catch (error) {
      const err = error as Error;
      toast.error(err.message || "Error al eliminar el miembro");
    } finally {
      setDeleting(null);
    }
  };

  const downloadTemplate = () => {
    const csv = [
      "name,id_number,email,phone,position,organization,is_active",
      '"Juan Pérez","12345678","juan@example.com","+18095551234","Miembro","Casa de Dios Adulam","true"',
    ].join("\r\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "plantilla-miembros.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const rawRows = parseCSV(text);
        const rows: ImportRow[] = rawRows.map((r) => ({
          name: r.name || "",
          id_number: r.id_number || "",
          email: r.email || "",
          phone: r.phone || "",
          position: r.position || "",
          organization: r.organization || "",
          is_active: parseIsActive(r.is_active || ""),
        }));
        setImportPreview(rows);
        setImportResult(null);
      } catch {
        toast.error("Error al leer el archivo CSV");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const resolvePositionId = (name: string): string | null => {
    if (!name.trim()) return null;
    const match = positions.find((p) => p.name.toLowerCase() === name.trim().toLowerCase());
    return match ? match.id : null;
  };

  const handleConfirmImport = async () => {
    if (importPreview.length === 0) return;
    setImporting(true);

    const errors: ImportError[] = [];
    const upsertRows = importPreview
      .map((row, idx) => {
        if (!row.name.trim()) {
          errors.push({ row: idx + 2, message: "Nombre requerido" });
          return null;
        }
        return {
          name: row.name.trim(),
          id_number: row.id_number.trim() || null,
          email: row.email.trim() || null,
          phone: row.phone.trim() || null,
          position_id: resolvePositionId(row.position),
          organization: row.organization.trim() || null,
          is_active: row.is_active,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    try {
      if (upsertRows.length > 0) {
        const { data, error } = await supabase
          .from("members")
          .upsert(upsertRows, { onConflict: "id_number" })
          .select();

        if (error) {
          errors.push({ row: 0, message: error.message });
        }

        setImportResult({
          total: importPreview.length,
          succeeded: data?.length || 0,
          errors,
        });
      } else {
        setImportResult({ total: importPreview.length, succeeded: 0, errors });
      }

      loadMembers();
    } catch (error) {
      const err = error as Error;
      toast.error(err.message || "Error al importar miembros");
    } finally {
      setImporting(false);
    }
  };

  const closeImportDialog = () => {
    setImportDialogOpen(false);
    setImportPreview([]);
    setImportResult(null);
  };

  if (loading) {
    return <div className="flex justify-center p-8">Cargando...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <Card className="shadow-lg bg-gradient-to-r from-primary/10 to-primary/5">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" />
            <div>
              <p className="text-lg font-semibold">
                Matrícula: {activeMembers} activos de {totalMembers} miembros totales
              </p>
              <p className="text-sm text-muted-foreground">
                Quórum requerido (2/3): {quorumThreshold} miembros
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle>Gestión de Matrícula</CardTitle>
              <CardDescription>Administrar miembros activos e inactivos</CardDescription>
            </div>
            <div className="flex gap-2">
              <Dialog open={importDialogOpen} onOpenChange={(open) => (open ? setImportDialogOpen(true) : closeImportDialog())}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Upload className="h-4 w-4 mr-2" />
                    Importar CSV
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Importar Miembros desde CSV</DialogTitle>
                    <DialogDescription>
                      Sube un archivo CSV con columnas: name, id_number, email, phone, position, organization, is_active
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4 py-2">
                    <Button variant="link" className="px-0" onClick={downloadTemplate}>
                      <Download className="h-4 w-4 mr-2" />
                      Descargar plantilla
                    </Button>

                    <Input type="file" accept=".csv" onChange={handleFileSelect} />

                    {importPreview.length > 0 && !importResult && (
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">
                          Vista previa ({importPreview.length} filas totales, mostrando hasta 20)
                        </p>
                        <div className="border rounded-md overflow-x-auto max-h-64">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Nombre</TableHead>
                                <TableHead>ID</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Teléfono</TableHead>
                                <TableHead>Posición</TableHead>
                                <TableHead>Iglesia</TableHead>
                                <TableHead>Activo</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {importPreview.slice(0, 20).map((row, idx) => (
                                <TableRow key={idx}>
                                  <TableCell>{row.name}</TableCell>
                                  <TableCell>{row.id_number}</TableCell>
                                  <TableCell>{row.email}</TableCell>
                                  <TableCell>{row.phone}</TableCell>
                                  <TableCell>{row.position}</TableCell>
                                  <TableCell>{row.organization}</TableCell>
                                  <TableCell>{row.is_active ? "Sí" : "No"}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )}

                    {importResult && (
                      <div className="space-y-2 border rounded-md p-4 bg-muted/30">
                        <p className="font-medium">
                          {importResult.succeeded} de {importResult.total} filas importadas correctamente
                        </p>
                        {importResult.errors.length > 0 && (
                          <div className="text-sm text-destructive space-y-1">
                            {importResult.errors.map((e, idx) => (
                              <p key={idx}>Fila {e.row}: {e.message}</p>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <DialogFooter>
                    <Button variant="outline" onClick={closeImportDialog}>
                      {importResult ? "Cerrar" : "Cancelar"}
                    </Button>
                    {!importResult && (
                      <Button onClick={handleConfirmImport} disabled={importPreview.length === 0 || importing}>
                        {importing ? "Importando..." : "Confirmar Importación"}
                      </Button>
                    )}
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={memberDialogOpen} onOpenChange={setMemberDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={openAddDialog}>
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Miembro
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingMember ? "Editar Miembro" : "Agregar Miembro"}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <div className="space-y-2">
                      <Label htmlFor="member-name">Nombre Completo *</Label>
                      <Input
                        id="member-name"
                        value={memberForm.name}
                        onChange={(e) => setMemberForm({ ...memberForm, name: e.target.value.slice(0, 100) })}
                        placeholder="Juan Pérez"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="member-id-number">ID Number</Label>
                      <Input
                        id="member-id-number"
                        value={memberForm.id_number}
                        onChange={(e) => setMemberForm({ ...memberForm, id_number: e.target.value.slice(0, 50) })}
                        placeholder="12345678"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="member-email">Email</Label>
                        <Input
                          id="member-email"
                          type="email"
                          value={memberForm.email}
                          onChange={(e) => setMemberForm({ ...memberForm, email: e.target.value.slice(0, 255) })}
                          placeholder="email@example.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="member-phone">Teléfono</Label>
                        <Input
                          id="member-phone"
                          value={memberForm.phone}
                          onChange={(e) => setMemberForm({ ...memberForm, phone: e.target.value.slice(0, 20) })}
                          placeholder="+1234567890"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="member-position">Posición</Label>
                      <Select
                        value={memberForm.position_id}
                        onValueChange={(value) => setMemberForm({ ...memberForm, position_id: value })}
                      >
                        <SelectTrigger id="member-position">
                          <SelectValue placeholder="Selecciona posición" />
                        </SelectTrigger>
                        <SelectContent>
                          {positions.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="member-organization">Iglesia</Label>
                      <Input
                        id="member-organization"
                        value={memberForm.organization}
                        onChange={(e) => setMemberForm({ ...memberForm, organization: e.target.value.slice(0, 200) })}
                        placeholder="Casa de Dios Adulam"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="member-active">Activo</Label>
                      <Switch
                        id="member-active"
                        checked={memberForm.is_active}
                        onCheckedChange={(checked) => setMemberForm({ ...memberForm, is_active: checked })}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setMemberDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleSaveMember} disabled={saving}>
                      {saving ? "Guardando..." : "Guardar"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={filterOrganization} onValueChange={setFilterOrganization}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Iglesia" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_FILTER}>Todas las iglesias</SelectItem>
                {organizationOptions.map((org) => (
                  <SelectItem key={org} value={org}>
                    {org}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterPosition} onValueChange={setFilterPosition}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Posición" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_FILTER}>Todas las posiciones</SelectItem>
                <SelectItem value={NO_POSITION_FILTER}>Sin posición</SelectItem>
                {positions.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={handleClearFilters} className="gap-1">
                <X className="h-4 w-4" />
                Limpiar filtros
              </Button>
            )}
          </div>

          <p className="text-sm text-muted-foreground mb-4">
            Mostrando {filteredMembers.length} de {totalMembers} miembros
          </p>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>ID Number</TableHead>
                  <TableHead>Posición</TableHead>
                  <TableHead>Iglesia</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Activo</TableHead>
                  <TableHead className="w-[100px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMembers.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">{member.name}</TableCell>
                    <TableCell>{member.id_number || "—"}</TableCell>
                    <TableCell>
                      {member.position?.name ? (
                        <Badge variant="secondary">{member.position.name}</Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>{member.organization || "—"}</TableCell>
                    <TableCell>{member.email || "—"}</TableCell>
                    <TableCell>{member.phone || "—"}</TableCell>
                    <TableCell>
                      <Switch
                        checked={member.is_active ?? false}
                        onCheckedChange={() => handleToggleActive(member)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(member)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        {isAdmin && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                                disabled={deleting === member.id}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Eliminar miembro?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta acción no se puede deshacer. Se eliminará permanentemente a{" "}
                                  {member.name} de la matrícula.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteMember(member.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Eliminar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredMembers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      No se encontraron miembros
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MemberManager;

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Settings, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type PositionType = Database["public"]["Enums"]["position_type"];
type Position = Database["public"]["Tables"]["positions"]["Row"];

// Valid database enum values
const POSITION_TYPES: PositionType[] = [
  "president",
  "vice_president",
  "secretary",
  "treasurer",
  "board_member",
  "member",
];

// Display labels
const POSITION_TYPE_LABELS: Record<PositionType, string> = {
  president: "Presidente",
  vice_president: "Vice Presidente",
  secretary: "Secretario",
  treasurer: "Tesorero",
  board_member: "Miembro de Junta",
  member: "Miembro",
};

export const PositionManager = () => {
  const defaultForm = {
    name: "",
    type: "member" as PositionType,
    quorum_weight: 1,
  };

  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingPosition, setEditingPosition] = useState<Position | null>(null);
  const [formData, setFormData] = useState(defaultForm);

  useEffect(() => {
    loadPositions();
  }, []);

  const loadPositions = async () => {
    const { data, error } = await supabase
      .from("positions")
      .select("*")
      .order("type", { ascending: true });

    if (error) {
      toast.error("Failed to load positions");
      return;
    }

    setPositions(data || []);
  };

  const resetForm = () => setFormData(defaultForm);

  const handleAdd = async () => {
    if (!formData.name.trim()) {
      toast.error("Position name is required");
      return;
    }

    setLoading(true);
    const { error } = await supabase.from("positions").insert({
      name: formData.name,
      type: formData.type,
      quorum_weight: formData.quorum_weight,
    });

    if (error) {
      toast.error("Failed to add position: " + error.message);
    } else {
      toast.success("Position added successfully");
      await loadPositions();
      setIsAddOpen(false);
      resetForm();
    }

    setLoading(false);
  };

  const handleEdit = async () => {
    if (!editingPosition || !formData.name.trim()) {
      toast.error("Position name is required");
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from("positions")
      .update({
        name: formData.name,
        type: formData.type,
        quorum_weight: formData.quorum_weight,
      })
      .eq("id", editingPosition.id);

    if (error) {
      toast.error("Failed to update position: " + error.message);
    } else {
      toast.success("Position updated successfully");
      await loadPositions();
      setIsEditOpen(false);
      setEditingPosition(null);
      resetForm();
    }

    setLoading(false);
  };

  const handleDelete = async (position: Position) => {
    if (!confirm(`Are you sure you want to delete "${position.name}"?`)) return;

    setLoading(true);
    const { error } = await supabase
      .from("positions")
      .delete()
      .eq("id", position.id);

    if (error) {
      toast.error("Failed to delete position: " + error.message);
    } else {
      toast.success("Position deleted successfully");
      await loadPositions();
    }

    setLoading(false);
  };

  const openEditDialog = (position: Position) => {
    setEditingPosition(position);
    setFormData({
      name: position.name,
      type: position.type,
      quorum_weight: position.quorum_weight || 1,
    });
    setIsEditOpen(true);
  };

  const PositionForm = ({
    onSubmit,
    submitLabel,
  }: {
    onSubmit: () => void;
    submitLabel: string;
  }) => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nombre de la Posición</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Ej: Ministro Ordenado"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="type">Tipo de Posición</Label>
        <Select
          value={formData.type}
          onValueChange={(value: PositionType) =>
            setFormData({ ...formData, type: value })
          }
        >
          <SelectTrigger className="bg-background">
            <SelectValue placeholder="Seleccionar tipo" />
          </SelectTrigger>
          <SelectContent className="bg-background border z-50">
            {POSITION_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {POSITION_TYPE_LABELS[type]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="weight">Peso para Quorum</Label>
        <Input
          id="weight"
          type="number"
          min={1}
          max={10}
          value={formData.quorum_weight}
          onChange={(e) =>
            setFormData({
              ...formData,
              quorum_weight: parseInt(e.target.value) || 1,
            })
          }
        />
        <p className="text-xs text-muted-foreground">
          Peso aplicado al calcular el quorum (default: 1)
        </p>
      </div>

      <Button disabled={loading} onClick={onSubmit} className="w-full">
        {loading ? "Guardando..." : submitLabel}
      </Button>
    </div>
  );

  return (
    <Card className="shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Gestión de Posiciones
        </CardTitle>

        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={resetForm}>
              <Plus className="h-4 w-4 mr-1" />
              Agregar Posición
            </Button>
          </DialogTrigger>

          <DialogContent className="bg-background">
            <DialogHeader>
              <DialogTitle>Agregar Nueva Posición</DialogTitle>
            </DialogHeader>

            <PositionForm onSubmit={handleAdd} submitLabel="Agregar Posición" />
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-center">Peso Quorum</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {positions.map((position) => (
              <TableRow key={position.id}>
                <TableCell className="font-medium">{position.name}</TableCell>
                <TableCell>{POSITION_TYPE_LABELS[position.type]}</TableCell>
                <TableCell className="text-center">
                  {position.quorum_weight}
                </TableCell>

                <TableCell className="text-right space-x-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditDialog(position)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(position)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}

            {positions.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center text-muted-foreground py-8"
                >
                  No hay posiciones. Agregue su primera posición.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* Edit Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="bg-background">
            <DialogHeader>
              <DialogTitle>Editar Posición</DialogTitle>
            </DialogHeader>

            <PositionForm onSubmit={handleEdit} submitLabel="Guardar Cambios" />
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

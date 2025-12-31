import { useState, useEffect } from "react";
import { Database } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Edit, Trash2 } from "lucide-react";

type PositionType = Database["public"]["Enums"]["position_type"];
type Position = Database["public"]["Tables"]["positions"]["Row"];

// Valid database enum values
const POSITION_TYPES: PositionType[] = [
  "MinistroOrdenado",
  "MinistroLicenciado",
  "MinistroCertificado",
  "Delegado",
  "member",
];

// Display labels
const POSITION_TYPE_LABELS: Record<PositionType, string> = {
  MinistroOrdenado: "Ordained Minister",
  MinistroLicenciado: "Licensed Minister",
  MinistroCertificado: "Certified Minister",
  Delegado: "Delegate",
  member: "Member",
};

export const PositionManager = () => {
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPosition, setEditingPosition] = useState<Position | null>(null);
  const [formData, setFormData] = useState({ name: "", type: '' as PositionType });

  useEffect(() => {
    fetchPositions();
  }, []);

  const fetchPositions = async () => {
    const { data, error } = await supabase.from("positions").select("*");
    if (error) {
      toast.error("Error fetching positions.");
    } else {
      setPositions(data);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.type) {
      toast.error("Please fill in all fields.");
      return;
    }

    const { error } = await supabase
      .from("positions")
      .upsert({ ...editingPosition, ...formData });

    if (error) {
      toast.error(`Error saving position: ${error.message}`);
    } else {
      toast.success('Position saved successfully.');
      fetchPositions();
      setDialogOpen(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("positions").delete().eq("id", id);
    if (error) {
      toast.error(`Error deleting position: ${error.message}`);
    } else {
      toast.success("Position deleted successfully.");
      fetchPositions();
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Position Management</CardTitle>
              <CardDescription>Manage member positions</CardDescription>
            </div>
            <Button onClick={() => {
              setEditingPosition(null);
              setFormData({ name: '', type: '' as PositionType });
              setDialogOpen(true);
            }}>
              <Plus className="mr-2 h-4 w-4" /> Add Position
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={3}>Loading...</TableCell></TableRow>
              ) : (
                positions.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.name}</TableCell>
                    <TableCell>{POSITION_TYPE_LABELS[p.type]}</TableCell>
                    <TableCell>
                      <Button variant="outline" size="icon" className="mr-2" onClick={() => {
                        setEditingPosition(p);
                        setFormData({ name: p.name, type: p.type });
                        setDialogOpen(true);
                      }}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="destructive" size="icon" onClick={() => handleDelete(p.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPosition ? "Edit" : "Add"} Position</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Position Name</Label>
              <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Position Type</Label>
              <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value as PositionType })}>
                <SelectTrigger id="type">
                  <SelectValue placeholder="Select a type" />
                </SelectTrigger>
                <SelectContent>
                  {POSITION_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {POSITION_TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSave} className="w-full">Save Position</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

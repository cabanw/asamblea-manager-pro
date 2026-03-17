import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Copy } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';

interface RegistrationLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  link: string;
}

export const RegistrationLinkDialog: React.FC<RegistrationLinkDialogProps> = ({ open, onOpenChange, link }) => {

  const handleCopy = () => {
    navigator.clipboard.writeText(link);
    toast.success('Link copied to clipboard!');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registration Link</DialogTitle>
          <DialogDescription>Share this link or QR code to allow attendees to register.</DialogDescription>
        </DialogHeader>
        <div className="flex items-center space-x-2 mt-4">
          <Input value={link} readOnly />
          <Button onClick={handleCopy} size="icon">
            <Copy className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex justify-center mt-4">
          <QRCodeCanvas value={link} size={256} />
        </div>
      </DialogContent>
    </Dialog>
  );
};
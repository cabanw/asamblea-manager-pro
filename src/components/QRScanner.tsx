import { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, X } from "lucide-react";

interface QRScannerProps {
  open: boolean;
  onClose: () => void;
  onScan: (data: string) => void;
  title?: string;
}

interface QrError extends Error {
    name: string;
    message: string;
}

export const QRScanner = ({ open, onClose, onScan, title = "Scan QR Code" }: QRScannerProps) => {
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasScannedRef = useRef(false);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (err) {
        // Ignore stop errors
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
  }, []);

  const startScanner = useCallback(async () => {
    if (!containerRef.current) return;
    hasScannedRef.current = false;

    try {
      setError(null);
      setIsScanning(true);

      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;

      let cameraIdOrConfig: any = { facingMode: "environment" };
      try {
        const cameras = await Html5Qrcode.getCameras();
        if (cameras && cameras.length > 0) {
          const backCamera = cameras.find(c => c.label.toLowerCase().includes('back') || c.label.toLowerCase().includes('environment'));
          if (backCamera) {
            cameraIdOrConfig = backCamera.id;
          } else {
             cameraIdOrConfig = cameras[cameras.length - 1].id;
          }
        }
      } catch (err) {
        console.warn("Could not get cameras list, falling back to facingMode", err);
      }

      await scanner.start(
        cameraIdOrConfig,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          if (hasScannedRef.current) return;
          hasScannedRef.current = true;
          onScan(decodedText);
          stopScanner();
          onClose();
        },
        () => {
          // Ignore scan failures (no QR detected)
        }
      );
    } catch (err) {
        const qrError = err as QrError;
      setIsScanning(false);
      if (qrError.name === "NotAllowedError") {
        setError("Camera permission denied. Please allow camera access.");
      } else if (qrError.name === "NotFoundError") {
        setError("No camera found on this device.");
      } else {
        setError(qrError.message || "Failed to start camera");
      }
    }
  }, [onClose, onScan, stopScanner]);

  useEffect(() => {
    if (open && containerRef.current) {
      startScanner();
    }

    return () => {
      stopScanner();
    };
  }, [open, startScanner, stopScanner]);

  const handleClose = () => {
    stopScanner();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4">
          <div
            id="qr-reader"
            ref={containerRef}
            className="w-full max-w-[300px] aspect-square bg-muted rounded-lg overflow-hidden"
          />

          {error && (
            <div className="text-destructive text-sm text-center p-3 bg-destructive/10 rounded-md w-full">
              {error}
            </div>
          )}

          {isScanning && (
            <p className="text-sm text-muted-foreground text-center">
              Point camera at a QR code or barcode on the ID card
            </p>
          )}

          <Button variant="outline" onClick={handleClose} className="w-full">
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

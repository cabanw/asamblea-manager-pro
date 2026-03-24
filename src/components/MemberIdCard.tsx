import { useState, useEffect } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { User, ShieldCheck } from "lucide-react";
import { signQRData } from "@/lib/security";

export interface MemberData {
  id_number: string;
  name: string;
  email?: string;
  phone?: string;
  organization?: string;
}

export interface MemberIdCardProps {
  member: MemberData;
  logoUrl?: string;
}

// A simple blue shield SVG data URI as a default fallback logo
const DEFAULT_LOGO = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMGI2M2Q4IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTEyIDIyczgtNCA4LTEwVjVsLTgtMy04IDN2N2MwIDYgOCAxMCA4IDEweiIvPjwvc3ZnPg==";

export const MemberIdCard = ({ member, logoUrl = DEFAULT_LOGO }: MemberIdCardProps) => {
  const [qrData, setQrData] = useState<string>("");

  useEffect(() => {
    const generateSecureQR = async () => {
      const securedString = await signQRData({
        id_number: member.id_number,
        name: member.name,
        email: member.email,
        phone: member.phone,
        organization: member.organization,
      });
      setQrData(securedString);
    };
    generateSecureQR();
  }, [member]);

  if (!qrData) {
    return (
      <Card className="w-full max-w-sm mx-auto overflow-hidden shadow-xl border-zinc-200">
        <CardContent className="flex items-center justify-center min-h-[400px]">
          <div className="animate-pulse text-zinc-400">Securing pass...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm mx-auto overflow-hidden shadow-xl border-zinc-200">
      <CardHeader className="bg-primary text-primary-foreground text-center pb-8 pt-6">
        <CardTitle className="text-2xl font-bold tracking-tight">Assembly ID</CardTitle>
        <CardDescription className="text-primary-foreground/80 mt-1">
          Official Member Identification
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center pt-8 pb-8 bg-zinc-50 relative">
        <div className="absolute -top-12 bg-zinc-50 p-2 rounded-full shadow-sm">
          <div className="bg-primary/10 p-4 rounded-full">
            <User className="h-8 w-8 text-primary" />
          </div>
        </div>

        <div className="mt-4 mb-6 text-center w-full">
          <h3 className="text-xl font-bold text-zinc-900 truncate px-4">{member.name}</h3>
          <p className="text-sm font-medium text-zinc-500 mt-1">ID: {member.id_number}</p>
          {member.organization && (
            <p className="text-sm text-zinc-500 mt-1 truncate px-4">{member.organization}</p>
          )}
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-zinc-100 relative">
          <QRCodeCanvas 
            value={qrData}
            size={200}
            level="H"
            includeMargin={false}
            imageSettings={{
              src: logoUrl,
              height: 48,
              width: 48,
              excavate: true,
            }}
          />
        </div>
        
        <div className="flex items-center gap-2 mt-6 text-zinc-500 bg-zinc-100 px-3 py-1.5 rounded-full border border-zinc-200">
          <ShieldCheck className="h-4 w-4 text-emerald-500" />
          <span className="text-xs font-medium">Valid Entry Pass</span>
        </div>
      </CardContent>
    </Card>
  );
};

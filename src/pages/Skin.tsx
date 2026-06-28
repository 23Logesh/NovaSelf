import { SectionHeader } from "@/components/novaself/SectionHeader";
import { SkinCheckIn } from "@/components/novaself/SkinCheckIn";

export default function Skin() {
  return (
    <div className="space-y-7">
      <SectionHeader
        eyebrow="Daily"
        title="Skin & Hair"
        description="Five-second checklist + how things feel today."
      />
      <SkinCheckIn />
    </div>
  );
}
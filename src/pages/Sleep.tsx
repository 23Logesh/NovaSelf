import { SectionHeader } from "@/components/novaself/SectionHeader";
import { SleepCheckIn } from "@/components/novaself/SleepCheckIn";

export default function Sleep() {
  return (
    <div className="space-y-7">
      <SectionHeader
        eyebrow="Daily"
        title="Sleep"
        description="Bed time, wake time, and how rested you actually feel."
      />
      <SleepCheckIn />
    </div>
  );
}
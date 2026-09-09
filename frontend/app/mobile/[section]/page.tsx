import MobileFeaturePage, { type MobileSection } from "../_components/MobileFeaturePage";

const sections: MobileSection[] = [
  "dashboard", "camera-ai", "players", "analysis", "growth-analysis", "measurements",
  "medical", "report", "team", "player-profile", "gps-test",
];

export default async function MobileSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!sections.includes(section as MobileSection)) {
    return <MobileFeaturePage section="dashboard" />;
  }
  return <MobileFeaturePage section={section as MobileSection} />;
}

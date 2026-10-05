import { Banner } from '@/components/Banner';

export function SimulatedBanner({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <Banner
      tone="warning"
      title="Simulated result"
      message="Mock recognition mode: identity and visual features are development fixtures, not analysis of your photo."
    />
  );
}

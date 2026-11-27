import { HeroWorld } from "./hero-world";
import { Journey } from "./journey";
import { FinalCta, PricingStairs, SetupLevel } from "./sections";

export function PixelWorldPage() {
  return (
    <div className="overflow-x-clip bg-[#090909]">
      <HeroWorld />
      <Journey />
      <SetupLevel />
      <PricingStairs />
      <FinalCta />
    </div>
  );
}

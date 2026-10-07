import { PARTNERS } from '@/app/(marketing)/_data';
import { Container } from '@/components/layout';

function PartnerList({ isDuplicate = false }: { isDuplicate?: boolean }) {
  return (
    <ul className="flex shrink-0 items-center gap-3 pr-3" aria-hidden={isDuplicate || undefined}>
      {PARTNERS.map((partner) => {
        const Icon = partner.icon;
        return (
          <li
            key={partner.name}
            className="group/logo flex items-center gap-2.5 rounded-full border border-line bg-white px-5 py-3 whitespace-nowrap transition-colors duration-300 hover:border-brand-muted"
          >
            <Icon className="size-5 text-ink-subtle transition-colors duration-300 group-hover/logo:text-brand" />
            <span className="text-[0.9375rem] font-semibold tracking-tight text-ink-muted transition-colors duration-300 group-hover/logo:text-ink">
              {partner.name}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

// Slide otomatis tak berujung: daftar ditulis dua kali, lalu digeser -50% secara berulang.
export function PartnerMarquee() {
  return (
    <section aria-label="Perusahaan mitra" className="border-y border-line bg-surface-soft py-10">
      <Container>
        <p className="text-center text-sm text-ink-subtle">
          B2B Case Study disusun bersama perusahaan mitra dari berbagai industri
        </p>
      </Container>
      <div className="group mt-6 flex overflow-hidden mask-fade-x">
        <div className="flex animate-marquee group-hover:[animation-play-state:paused] motion-reduce:animate-none">
          <PartnerList />
          <PartnerList isDuplicate />
        </div>
      </div>
    </section>
  );
}

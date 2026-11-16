import Image from 'next/image';

import { PARTNERS } from '@/app/(marketing)/_data';
import { Container } from '@/components/layout';

function PartnerList({ isDuplicate = false }: { isDuplicate?: boolean }) {
  return (
    <ul className="flex shrink-0 items-center gap-16 pr-16" aria-hidden={isDuplicate || undefined}>
      {PARTNERS.map((partner) => (
        <li key={partner.name} className="flex shrink-0 items-center justify-center">
          <Image
            src={partner.logo}
            alt={partner.name}
            width={240}
            height={64}
            className="h-16 w-auto max-w-[240px] object-contain opacity-90 transition-opacity duration-300 hover:opacity-100"
          />
        </li>
      ))}
    </ul>
  );
}

// Slide otomatis tak berujung: daftar ditulis dua kali, lalu digeser -50% secara berulang.
export function PartnerMarquee() {
  return (
    <section aria-label="Perusahaan mitra" className="border-y border-line bg-white py-10">
      <Container>
        <p className="text-center text-sm text-ink-subtle">
          B2B Case Study disusun bersama perusahaan mitra dari berbagai industri
        </p>
      </Container>
      <div className="group mt-7 flex overflow-hidden mask-fade-x">
        <div className="flex animate-marquee group-hover:[animation-play-state:paused] motion-reduce:animate-none">
          <PartnerList />
          <PartnerList isDuplicate />
        </div>
      </div>
    </section>
  );
}

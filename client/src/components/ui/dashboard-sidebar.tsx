'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { ChevronRight, type LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

// Sidebar dashboard generik: grup menu, sub-menu yang bisa dibuka-tutup, badge, dan petunjuk
// shortcut. Status aktif dihitung pemanggil, agar komponen ini tidak bergantung pada router.

export interface ISidebarItem {
  id: string;
  label: string;
  icon?: LucideIcon;
  /** Tautan tujuan. Item tanpa href harus punya onSelect. */
  href?: string;
  onSelect?: () => void;
  /** Ikon di kotak berwarna, mis. penanda tier di sub-menu (hijau = AI, biru = B2B). */
  iconTone?: 'ai' | 'brand';
  badge?: number | string;
  /** attention = menunggu tindakan (biru); muted = sekadar jumlah. */
  badgeTone?: 'attention' | 'muted';
  /** Teks petunjuk keyboard, misalnya "Ctrl K". */
  shortcut?: string;
  isActive?: boolean;
  children?: ISidebarItem[];
}

export interface ISidebarGroup {
  id: string;
  heading?: string;
  items: ISidebarItem[];
}

interface DashboardSidebarProps {
  groups: ISidebarGroup[];
  header?: ReactNode;
  footer?: ReactNode;
  /** Dipanggil setelah item dipilih, misalnya untuk menutup sheet di ponsel. */
  onNavigate?: () => void;
  ariaLabel?: string;
  className?: string;
}

const rowClass = (isActive: boolean, isNested: boolean) =>
  cn(
    'group/row flex min-w-0 flex-1 items-center gap-2.5 rounded-lg py-2 pr-2 text-left text-[0.8125rem] transition-colors duration-200 outline-none focus-visible:ring-3 focus-visible:ring-brand/30',
    isNested ? 'pl-9' : 'pl-2.5',
    isActive
      ? 'bg-brand-soft font-semibold text-brand'
      : 'font-medium text-ink-muted hover:bg-surface-soft hover:text-ink'
  );

function ItemContent({ item, isActive }: { item: ISidebarItem; isActive: boolean }) {
  const Icon = item.icon;
  return (
    <>
      {Icon && item.iconTone ? (
        <span
          className={cn(
            'grid size-5 shrink-0 place-items-center rounded-md',
            item.iconTone === 'ai' ? 'bg-ai-soft text-ai' : 'bg-brand-soft text-brand'
          )}
          aria-hidden="true"
        >
          <Icon className="size-3" strokeWidth={2.25} />
        </span>
      ) : (
        Icon && (
          <Icon
            className={cn(
              'size-[1.0625rem] shrink-0 transition-colors',
              isActive ? 'text-brand' : 'text-ink-subtle group-hover/row:text-ink-muted'
            )}
            strokeWidth={1.75}
          />
        )
      )}
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {item.shortcut && (
        <kbd className="hidden h-5 items-center rounded border border-line bg-white px-1.5 font-sans text-[0.625rem] font-medium text-ink-subtle group-hover/row:inline-flex group-focus-visible/row:inline-flex">
          {item.shortcut}
        </kbd>
      )}
      {item.badge !== undefined && (
        <span
          className={cn(
            'grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[0.6875rem] font-semibold tabular-nums',
            isActive
              ? 'bg-white text-brand'
              : item.badgeTone === 'muted'
                ? 'bg-surface-soft font-medium text-ink-subtle'
                : 'bg-brand-soft text-brand'
          )}
        >
          {item.badge}
        </span>
      )}
    </>
  );
}

function ItemRow({
  item,
  isNested,
  onNavigate,
}: {
  item: ISidebarItem;
  isNested: boolean;
  onNavigate?: () => void;
}) {
  const isActive = !!item.isActive;
  const className = rowClass(isActive, isNested);

  if (item.href) {
    return (
      <Link
        href={item.href}
        onClick={onNavigate}
        aria-current={isActive ? 'page' : undefined}
        className={className}
      >
        <ItemContent item={item} isActive={isActive} />
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={() => {
        item.onSelect?.();
        onNavigate?.();
      }}
      className={className}
    >
      <ItemContent item={item} isActive={isActive} />
    </button>
  );
}

function SidebarItem({ item, onNavigate }: { item: ISidebarItem; onNavigate?: () => void }) {
  const children = item.children ?? [];
  const hasActiveChild = children.some((child) => child.isActive);
  // null = ikuti rute (terbuka bila sub-menu aktif); true/false = pilihan manual pengguna.
  const [openOverride, setOpenOverride] = useState<boolean | null>(null);
  const isOpen = openOverride ?? (hasActiveChild || !!item.isActive);

  if (children.length === 0)
    return <ItemRow item={item} isNested={false} onNavigate={onNavigate} />;

  const submenuId = `submenu-${item.id}`;
  return (
    <div>
      <div className="flex items-center gap-0.5">
        <ItemRow
          item={{ ...item, isActive: item.isActive && !hasActiveChild }}
          isNested={false}
          onNavigate={onNavigate}
        />
        <button
          type="button"
          onClick={() => setOpenOverride(!isOpen)}
          aria-expanded={isOpen}
          aria-controls={submenuId}
          aria-label={`${isOpen ? 'Tutup' : 'Buka'} submenu ${item.label}`}
          className="grid size-8 shrink-0 place-items-center rounded-lg text-ink-subtle transition-colors outline-none hover:bg-surface-soft hover:text-ink focus-visible:ring-3 focus-visible:ring-brand/30"
        >
          <ChevronRight
            className={cn('size-3.5 transition-transform duration-200', isOpen && 'rotate-90')}
            strokeWidth={2}
          />
        </button>
      </div>

      <div
        id={submenuId}
        inert={!isOpen}
        className={cn(
          'grid transition-[grid-template-rows,opacity] duration-300 ease-out',
          isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        )}
      >
        <div className="relative min-h-0 overflow-hidden">
          <span
            className="absolute top-1 bottom-1 left-[1.1875rem] w-px bg-line"
            aria-hidden="true"
          />
          <ul className="grid gap-0.5 pt-0.5">
            {children.map((child) => (
              <li key={child.id}>
                <ItemRow item={child} isNested onNavigate={onNavigate} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export function DashboardSidebar({
  groups,
  header,
  footer,
  onNavigate,
  ariaLabel = 'Menu utama',
  className,
}: DashboardSidebarProps) {
  return (
    <div className={cn('flex h-full flex-col bg-white', className)}>
      {header}

      <nav aria-label={ariaLabel} className="scrollbar-none flex-1 overflow-y-auto px-3 py-2">
        {groups.map((group) => (
          <div key={group.id} className="mb-5 last:mb-0">
            {group.heading && (
              <p className="mb-1.5 px-2.5 text-[0.6875rem] font-semibold tracking-[0.14em] text-ink-subtle uppercase">
                {group.heading}
              </p>
            )}
            <ul className="grid gap-0.5">
              {group.items.map((item) => (
                <li key={item.id}>
                  <SidebarItem item={item} onNavigate={onNavigate} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {footer}
    </div>
  );
}

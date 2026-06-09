"use client";

import { Atom, ChevronDown, Factory, Library, Tags, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const ITEMS = [
  { href: "/owners", label: "Owners", Icon: User },
  { href: "/manufacturers", label: "Manufacturers", Icon: Factory },
  { href: "/types", label: "Types", Icon: Tags },
  { href: "/steels", label: "Steels", Icon: Atom },
] as const;

export function LibraryMenu() {
  const pathname = usePathname();
  const active = ITEMS.some(
    (i) => pathname === i.href || pathname.startsWith(`${i.href}/`),
  );
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={
          active
            ? "inline-flex items-center gap-1.5 font-medium text-foreground outline-none"
            : "inline-flex items-center gap-1.5 text-muted-foreground outline-none transition-colors hover:text-foreground"
        }
      >
        <Library className="h-4 w-4" />
        Library
        <ChevronDown className="h-3 w-3 opacity-60" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={8} className="min-w-44">
        {ITEMS.map(({ href, label, Icon }) => (
          <DropdownMenuItem key={href} render={<Link href={href} />}>
            <Icon className="h-4 w-4" />
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

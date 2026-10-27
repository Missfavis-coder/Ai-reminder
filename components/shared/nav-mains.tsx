"use client";

import { IconType } from "react-icons";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
    SidebarGroup,
    SidebarGroupContent,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from "../ui/sidebar";

export function NavMain({
    items,
}: {
    items: {
        group: string;
        items: {
            title: string;
            url: string;
            icon?: IconType;
        }[];
    }[];
}) {
    const pathname = usePathname();
    const { isMobile, setOpenMobile } = useSidebar();

    const handleLinkClick = () => {
        if (isMobile) {
            setOpenMobile(false);
        }
    };

    return (
        <SidebarGroup>
            <SidebarGroupContent className="flex flex-col gap-5">
                {items.map((section) => (
                    <div key={section.group}>
                        <p className="px-3 mb-2 text-[12px] t
                        racking-wide text-muted-foreground uppercase mt-2 mb-4 font-bold">
                            {section.group}
                        </p>

                        <SidebarMenu>
                            {section.items.map((item) => {
                                const isActive =
                                    pathname === item.url ||
                                    (item.url !== "/dashboard" &&
                                        pathname.startsWith(item.url + "/"));

                                return (
                                    <SidebarMenuItem key={item.title}>
                                        <Link
                                            href={item.url}
                                            onClick={handleLinkClick}
                                        >
                                            <SidebarMenuButton
                                                isActive={isActive}
                                                className={clsx(
                                                    "py-5 transition-all duration-300 rounded-[6px] text-sm tracking-wide text-neutral-600 cursor-pointer mb-1 border-neutral-700",
                                                    isActive
                                                        ? "bg-muted text-black  shadow-xs font-bold"
                                                        : "text-neutral-700 hover:text-foreground hover:bg-muted/10 font-semibold"
                                                )}
                                            >
                                                {item.icon && (
                                                    <item.icon
                                                        className={clsx(
                                                            "w-6 h-6 font-semibold text-neutraal-700",
                                                            isActive
                                                                ? "text-primary font-semibold"
                                                                : "font-bold"
                                                        )}
                                                    />
                                                )}

                                                <span>{item.title}</span>
                                            </SidebarMenuButton>
                                        </Link>
                                    </SidebarMenuItem>
                                );
                            })}
                        </SidebarMenu>
                    </div>
                ))}
            </SidebarGroupContent>
        </SidebarGroup>
    );
}
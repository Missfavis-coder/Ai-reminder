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
                        <p className="px-3 mb-2 text-[12px] tracking-wide text-muted-foreground uppercase mt-2 font-bold">
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
                                                    "py-5 transition-all duration-300 rounded-[6px] text-[13px] tracking-wide",
                                                    isActive
                                                        ? "!bg-primary/[0.03] !px-3"
                                                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                                                )}
                                            >
                                                {item.icon && (
                                                    <item.icon
                                                        className={clsx(
                                                            "w-6 h-6 font-semi",
                                                            isActive
                                                                ? "text-primary"
                                                                : "text-muted-foreground"
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
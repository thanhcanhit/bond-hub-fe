// import { Calendar, Home, Inbox, Search, Settings } from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  // SidebarGroup,
  // SidebarGroupContent,
  // SidebarGroupLabel,
  SidebarHeader,
  // SidebarMenu,
  // SidebarMenuButton,
  // SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import { TeamSwitcher } from "@/components/team-switcher";

const data = {
  user: {
    name: "Nhu Twm",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  teams: [
    {
      name: "Nâng cấp tài khoản",
      // logo: GalleryVerticalEnd,
      plan: "Enterprise",
    },
    {
      name: "Hồ sơ của bạn",
      // logo: AudioWaveform,
      plan: "Startup",
    },
    {
      name: "Cài đặt",
      // logo: Command,
      plan: "Free",
    },
  ],
  navMain: [
    {
      title: "Tin nhắn",
      url: "#",
      // icon: SquareTerminal,
      isActive: true,
    },
    {
      title: "Danh bạ",
      url: "#",
      // icon: Bot,
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

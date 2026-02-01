"use client"

import * as React from "react"
import {
  IconDots,
  IconFolder,
  IconShare3,
  IconTrash,
  IconSearch,
  type Icon,
} from "@tabler/icons-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarInput,
  useSidebar,
} from "@/components/ui/sidebar"

export function NavAgents({
  items,
}: {
  items: {
    name: string
    url: string
    icon: Icon | string
  }[]
}) {
  const { isMobile } = useSidebar()
  const [searchQuery, setSearchQuery] = React.useState("")

  // Filter agents based on search query
  const filteredItems = React.useMemo(() => {
    if (!searchQuery.trim()) {
      return items
    }
    const query = searchQuery.toLowerCase()
    return items.filter((item) =>
      item.name.toLowerCase().includes(query)
    )
  }, [items, searchQuery])

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>Agents</SidebarGroupLabel>
      <div className="px-2 pb-2">
        <div className="relative">
          <IconSearch className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-sidebar-foreground/50 pointer-events-none" />
          <SidebarInput
            type="text"
            placeholder="Search agents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>
      <SidebarMenu>
        {filteredItems.map((item) => (
          <SidebarMenuItem key={item.name}>
            <SidebarMenuButton asChild>
              <a href={item.url}>
                {typeof item.icon === 'string' ?
                  item.icon.startsWith('http') ? <img src={item.icon} alt={item.name} className="w-4 h-4" /> : (<span className="text-sidebar-foreground/70">{item.icon}</span>) : <item.icon />}
                <span>{item.name}</span>
              </a>
            </SidebarMenuButton>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuAction
                  showOnHover
                  className="data-[state=open]:bg-accent rounded-sm"
                >
                  <IconDots />
                  <span className="sr-only">More</span>
                </SidebarMenuAction>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-24 rounded-lg"
                side={isMobile ? "bottom" : "right"}
                align={isMobile ? "end" : "start"}
              >
                <DropdownMenuItem>
                  <IconFolder />
                  <span>Open</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <IconShare3 />
                  <span>Share</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive">
                  <IconTrash />
                  <span>Delete</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        ))}
        <SidebarMenuItem>
          <SidebarMenuButton className="text-sidebar-foreground/70">
            <IconDots className="text-sidebar-foreground/70" />
            <span>More</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  )
}

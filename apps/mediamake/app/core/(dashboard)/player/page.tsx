"use client";

import type { NextPage } from "next";
// import { RenderControls } from "../components/RenderControls";
// import { Tips } from "../components/Tips/Tips";
// import { Spacing } from "../components/Spacing";
import { MediaMakePlayer } from "@/components/editor/player/player";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset } from "@/components/ui/sidebar";

const Player: NextPage = () => {

    return (
        <SidebarInset>
            <SiteHeader title="Player" />
            <div className="flex flex-1 flex-col">
                <div className="@container/main flex flex-1 flex-col gap-2">
                    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                        <div className="flex h-[calc(100vh-8rem)]">
                            <MediaMakePlayer />
                        </div>
                    </div>
                </div>
            </div>
        </SidebarInset>
    );
};

export default Player;

"use client";
import { Plane, Megaphone } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VacationTab } from "@/components/mess/VacationTab";
import { NoticePanel } from "@/components/administration/NoticePanel";

export default function AdministrationPage() {
  return (
    <div className="space-y-5 animate-fade-in">
      <Tabs defaultValue="notices">
        <p className="text-sm text-muted-foreground mb-3">Vacation management &amp; official notices for members</p>
        <TabsList className="w-full grid grid-cols-2 h-10">
          <TabsTrigger value="notices" className="text-xs font-medium gap-1.5">
            <Megaphone className="h-3.5 w-3.5" />
            Notice Panel
          </TabsTrigger>
          <TabsTrigger value="vacation" className="text-xs font-medium gap-1.5">
            <Plane className="h-3.5 w-3.5" />
            Vacation
          </TabsTrigger>
        </TabsList>

        <TabsContent value="notices" className="mt-4">
          <NoticePanel />
        </TabsContent>

        <TabsContent value="vacation" className="mt-4">
          <VacationTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

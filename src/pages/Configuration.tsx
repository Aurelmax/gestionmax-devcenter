import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ProjectManager from "./Configuration/ProjectManager";
import AutoScanProject from "./Configuration/AutoScanProject";

export default function Configuration() {
  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-6">
      <div className="container mx-auto">
        <h1 className="text-3xl font-bold mb-6">Configuration</h1>
        
        <Tabs defaultValue="autoscan" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="autoscan">Auto-Scan</TabsTrigger>
            <TabsTrigger value="projects">Project Manager</TabsTrigger>
            <TabsTrigger value="settings" disabled>Paramètres</TabsTrigger>
          </TabsList>
          
          <TabsContent value="autoscan">
            <AutoScanProject />
          </TabsContent>
          
          <TabsContent value="projects">
            <ProjectManager />
          </TabsContent>
          
          <TabsContent value="settings">
            <div className="text-center text-gray-400 py-8">
              Paramètres — À venir
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}


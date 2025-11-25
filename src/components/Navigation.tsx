import { useNavigate, useLocation } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutDashboard, Terminal, Settings, Info, BookOpen } from "lucide-react";

export default function Navigation() {
  const navigate = useNavigate();
  const location = useLocation();

  const getActiveTab = () => {
    if (location.pathname === "/dashboard") return "dashboard";
    if (location.pathname === "/logs") return "logs";
    if (location.pathname === "/config") return "config";
    if (location.pathname === "/about") return "about";
    if (location.pathname === "/docs") return "docs";
    return "dashboard";
  };

  const handleTabChange = (value: string) => {
    navigate(`/${value}`);
  };

  return (
    <nav className="bg-gray-800/50 border-b border-gray-700/50">
      <div className="container mx-auto px-6">
        <Tabs value={getActiveTab()} onValueChange={handleTabChange}>
          <TabsList className="bg-transparent">
            <TabsTrigger value="dashboard" className="data-[state=active]:bg-gray-700">
              <LayoutDashboard className="w-4 h-4 mr-2" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="logs" className="data-[state=active]:bg-gray-700">
              <Terminal className="w-4 h-4 mr-2" />
              Logs
            </TabsTrigger>
            <TabsTrigger value="config" className="data-[state=active]:bg-gray-700">
              <Settings className="w-4 h-4 mr-2" />
              Configuration
            </TabsTrigger>
            <TabsTrigger value="about" className="data-[state=active]:bg-gray-700">
              <Info className="w-4 h-4 mr-2" />
              À propos
            </TabsTrigger>
            <TabsTrigger value="docs" className="data-[state=active]:bg-gray-700">
              <BookOpen className="w-4 h-4 mr-2" />
              Documentation
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    </nav>
  );
}

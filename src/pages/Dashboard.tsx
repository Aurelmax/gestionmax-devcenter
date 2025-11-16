import { useMemo } from "react";
import { Cpu, HardDrive, MemoryStick, Clock, Skull } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import DashboardHeader from "@/components/DashboardHeader";
import StatusCard from "@/components/StatusCard";
import Grid from "@/components/Grid";
import ProjectCompactView from "@/components/ProjectCompactView";
import { useSystemStatus } from "@/hooks/useSystemStatus";
import { useService, useStopAll, useKillZombies } from "@/hooks/useCommand";
import { ServiceName } from "@/lib/commands";
import { formatUptime } from "@/lib/system";

export default function Dashboard() {
  const { status, globalStatus, refetch } = useSystemStatus();
  const stopAll = useStopAll(refetch);

  // Services
  const tunnel = useService("tunnel", refetch);
  const backend = useService("backend", refetch);
  const frontend = useService("frontend", refetch);
  const netdata = useService("netdata", refetch);
  const killZombies = useKillZombies(refetch);

  // Métriques système (dummy pour l'instant)
  const systemMetrics = useMemo(() => {
    if (!status) {
      return {
        cpu: 0,
        ram: 0,
        disk: 0,
        uptime: 0,
      };
    }
    return {
      cpu: status.cpu,
      ram: status.ram,
      disk: status.disk,
      uptime: status.uptime,
    };
  }, [status]);

  const services: Array<{
    service: ServiceName;
    isActive: boolean;
    onStart: ReturnType<typeof useService>["start"];
    onStop: ReturnType<typeof useService>["stop"];
  }> = useMemo(() => {
    if (!status) return [];
    return [
      {
        service: "tunnel",
        isActive: status.services.tunnel,
        onStart: tunnel.start,
        onStop: tunnel.stop,
      },
      {
        service: "backend",
        isActive: status.services.backend,
        onStart: backend.start,
        onStop: backend.stop,
      },
      {
        service: "frontend",
        isActive: status.services.frontend,
        onStart: frontend.start,
        onStop: frontend.stop,
      },
      {
        service: "netdata",
        isActive: status.services.netdata,
        onStart: netdata.start,
        onStop: netdata.stop,
      },
    ];
  }, [status, tunnel, backend, frontend, netdata]);

  return (
    <div className="text-gray-100">
      <DashboardHeader globalStatus={globalStatus} onStopAll={stopAll} />

      <main className="container mx-auto px-6 py-8">
        {/* Métriques système */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-300">Système</h2>
          <Grid columns={4} gap="md">
            {/* CPU */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Cpu className="w-5 h-5 text-[#00B5FF]" />
                  <span className="text-2xl font-bold">
                    {systemMetrics.cpu.toFixed(1)}%
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">CPU Usage</p>
              </CardContent>
            </Card>

            {/* RAM */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <MemoryStick className="w-5 h-5 text-purple-400" />
                  <span className="text-2xl font-bold">
                    {systemMetrics.ram.toFixed(1)}%
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">RAM Usage</p>
              </CardContent>
            </Card>

            {/* Disk */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <HardDrive className="w-5 h-5 text-[#00FF9D]" />
                  <span className="text-2xl font-bold">
                    {systemMetrics.disk.toFixed(1)}%
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Disk Usage</p>
              </CardContent>
            </Card>

            {/* Uptime */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Clock className="w-5 h-5 text-[#FFBF00]" />
                  <span className="text-lg font-bold">
                    {formatUptime(systemMetrics.uptime)}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Uptime</p>
              </CardContent>
            </Card>
          </Grid>
        </section>

        {/* Services */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-300">Services</h2>
            <Button
              onClick={killZombies.execute}
              disabled={killZombies.isLoading}
              variant="secondary"
              size="sm"
            >
              <Skull className="w-4 h-4 mr-2" />
              Kill Zombies
            </Button>
          </div>
          <Grid columns={4} gap="md">
            {services.map((service) => (
              <StatusCard
                key={service.service}
                service={service.service}
                isActive={service.isActive}
                uptime={service.isActive ? systemMetrics.uptime : 0}
                onStart={service.onStart}
                onStop={service.onStop}
              />
            ))}
          </Grid>
        </section>

        {/* Vue compacte des projets */}
        <section>
          <h2 className="text-xl font-semibold mb-4 text-gray-300">Projets</h2>
          <ProjectCompactView />
        </section>
      </main>
    </div>
  );
}

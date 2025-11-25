import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Code, 
  Zap, 
  GitBranch, 
  Settings, 
  Monitor, 
  Terminal,
  Github,
  ExternalLink,
  Shield,
  Rocket,
  Layers
} from "lucide-react";

export default function About() {
  const version = "0.1.0";
  const features = [
    {
      icon: Monitor,
      title: "Dashboard Centralisé",
      description: "Vue d'ensemble de tous vos services avec statut en temps réel, métriques système et contrôle centralisé.",
    },
    {
      icon: GitBranch,
      title: "Import Git Automatique",
      description: "Clonez un dépôt Git et configurez-le automatiquement en un clic. Zéro configuration manuelle.",
    },
    {
      icon: Zap,
      title: "AutoScan v2 (Monorepo)",
      description: "Détection intelligente de la structure de votre projet (Backend, Frontend, Scripts) avec ignore list.",
    },
    {
      icon: Settings,
      title: "Project Manager",
      description: "Gérez tous vos projets localement avec CRUD complet, configuration des services et ports.",
    },
    {
      icon: Terminal,
      title: "Logs en Direct",
      description: "Surveillez les logs de tous vos services en temps réel avec interface terminal moderne.",
    },
    {
      icon: Shield,
      title: "Gestion des Services",
      description: "Démarrez, arrêtez et surveillez vos services (Tunnel SSH, Backend, Frontend, Netdata).",
    },
  ];

  const technologies = [
    { name: "Tauri", description: "Framework desktop multiplateforme" },
    { name: "React", description: "Bibliothèque UI moderne" },
    { name: "TypeScript", description: "Typage statique" },
    { name: "Rust", description: "Backend performant et sécurisé" },
    { name: "Tailwind CSS", description: "Framework CSS utility-first" },
    { name: "Shadcn UI", description: "Composants UI accessibles" },
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-6">
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-green-500 flex items-center justify-center">
              <Rocket className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold">GestionMax DevCenter</h1>
          </div>
          <p className="text-xl text-gray-400 mb-2">
            Dashboard DevOps local pour piloter votre environnement de développement
          </p>
          <div className="flex items-center justify-center gap-2">
            <Badge variant="outline" className="text-sm">
              Version {version}
            </Badge>
            <Badge variant="outline" className="text-sm">
              Tauri + React
            </Badge>
          </div>
        </div>

        {/* Description principale */}
        <Card className="mb-8 bg-gray-800/50 border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="w-5 h-5" />
              À propos
            </CardTitle>
            <CardDescription>
              GestionMax DevCenter est une application desktop moderne conçue pour simplifier la gestion
              de votre environnement de développement local. Contrôlez vos services, surveillez vos projets
              et automatisez vos workflows DevOps depuis une interface unique et intuitive.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div className="text-center p-4 bg-gray-700/30 rounded-lg">
                <div className="text-2xl font-bold text-blue-400">100%</div>
                <div className="text-sm text-gray-400">Automatisation</div>
              </div>
              <div className="text-center p-4 bg-gray-700/30 rounded-lg">
                <div className="text-2xl font-bold text-green-400">Zéro</div>
                <div className="text-sm text-gray-400">Configuration manuelle</div>
              </div>
              <div className="text-center p-4 bg-gray-700/30 rounded-lg">
                <div className="text-2xl font-bold text-yellow-400">Temps réel</div>
                <div className="text-sm text-gray-400">Monitoring</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Fonctionnalités */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Layers className="w-6 h-6" />
            Fonctionnalités principales
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card key={index} className="bg-gray-800/50 border-gray-700 hover:border-blue-500/50 transition-colors">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-blue-400" />
                      </div>
                      <CardTitle className="text-lg">{feature.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-400">{feature.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Technologies */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Code className="w-6 h-6" />
            Technologies
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {technologies.map((tech, index) => (
              <Card key={index} className="bg-gray-800/50 border-gray-700">
                <CardContent className="pt-6">
                  <div className="font-semibold text-blue-400 mb-1">{tech.name}</div>
                  <div className="text-sm text-gray-400">{tech.description}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Liens et ressources */}
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader>
            <CardTitle>Liens et ressources</CardTitle>
            <CardDescription>
              Documentation, dépôt source et ressources utiles
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <a
                href="https://github.com/Aurelmax/gestionmax-devcenter"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-lg bg-gray-700/30 hover:bg-gray-700/50 transition-colors group"
              >
                <Github className="w-5 h-5 text-gray-400 group-hover:text-white" />
                <div>
                  <div className="font-semibold text-white">Dépôt GitHub</div>
                  <div className="text-sm text-gray-400">github.com/Aurelmax/gestionmax-devcenter</div>
                </div>
                <ExternalLink className="w-4 h-4 text-gray-400 ml-auto" />
              </a>
              <div className="p-3 rounded-lg bg-gray-700/30">
                <div className="font-semibold text-white mb-1">Documentation</div>
                <div className="text-sm text-gray-400">
                  Consultez le dossier <code className="px-1 py-0.5 bg-gray-800 rounded text-blue-400">docs/</code> pour
                  la documentation complète, l'architecture et les guides d'utilisation.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-12 text-center text-gray-400 text-sm">
          <p className="mb-2">
            Développé avec ❤️ pour simplifier le développement local
          </p>
          <p>
            © 2024 GestionMax DevCenter - Tous droits réservés
          </p>
        </div>
      </div>
    </div>
  );
}


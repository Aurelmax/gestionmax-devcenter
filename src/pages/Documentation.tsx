import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { openPath } from "@tauri-apps/plugin-opener";
import readmeDoc from "../../docs/README.md?raw";
import architectureDoc from "../../docs/ARCHITECTURE.md?raw";
import commandsDoc from "../../docs/COMMANDS.md?raw";
import devWorkflowDoc from "../../docs/DEV_WORKFLOW.md?raw";
import glossaryDoc from "../../docs/GLOSSARY.md?raw";
import projectManagerDoc from "../../docs/PROJECT_MANAGER.md?raw";

const DOCS_BASE_PATH = "/home/gestionmax-aur-lien/CascadeProjects/gestionmax-devcenter/docs";

const docs = [
  {
    id: "readme",
    title: "README",
    description: "Vue d’ensemble du DevCenter, objectifs et stack utilisée.",
    file: "README.md",
    content: readmeDoc,
  },
  {
    id: "architecture",
    title: "Architecture",
    description: "Structure interne de l’application et flux principaux.",
    file: "ARCHITECTURE.md",
    content: architectureDoc,
  },
  {
    id: "commands",
    title: "Commandes",
    description: "Liste exhaustive des commandes Rust ↔ React disponibles.",
    file: "COMMANDS.md",
    content: commandsDoc,
  },
  {
    id: "workflow",
    title: "Workflow",
    description: "Guide pas-à-pas pour développer, tester et builder.",
    file: "DEV_WORKFLOW.md",
    content: devWorkflowDoc,
  },
  {
    id: "projectManager",
    title: "Project Manager",
    description: "Documentation complète du module de gestion de projets.",
    file: "PROJECT_MANAGER.md",
    content: projectManagerDoc,
  },
  {
    id: "glossary",
    title: "Glossaire",
    description: "Définitions des termes techniques utilisés dans le DevCenter.",
    file: "GLOSSARY.md",
    content: glossaryDoc,
  },
];

export default function Documentation() {
  const handleOpenFile = async (file: string) => {
    try {
      await openPath(`${DOCS_BASE_PATH}/${file}`);
    } catch (error) {
      console.error("Failed to open documentation file", error);
    }
  };

  return (
    <div className="container mx-auto px-6 py-10 text-gray-100">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-widest text-gray-400">Ressources</p>
        <h1 className="text-3xl font-bold text-white">Documentation DevCenter</h1>
        <p className="text-gray-400 mt-2 max-w-3xl">
          Retrouvez toutes les ressources essentielles pour comprendre l’architecture, les commandes et les workflows du
          DevCenter. Utilisez les onglets pour naviguer entre les documents, lire les contenus et ouvrir les fichiers
          originaux en un clic.
        </p>
      </div>

      <Tabs defaultValue={docs[0].id} className="space-y-6">
        <TabsList className="bg-gray-800/60 border border-gray-700/50">
          {docs.map((doc) => (
            <TabsTrigger key={doc.id} value={doc.id} className="data-[state=active]:bg-gray-700">
              {doc.title}
            </TabsTrigger>
          ))}
        </TabsList>

        {docs.map((doc) => (
          <TabsContent key={doc.id} value={doc.id}>
            <Card className="bg-gray-800/80 border-gray-700/70">
              <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle className="text-2xl text-white">{doc.title}</CardTitle>
                  <CardDescription className="text-gray-400">{doc.description}</CardDescription>
                </div>
                <div className="flex gap-3">
                  <Button variant="secondary" onClick={() => handleOpenFile(doc.file)}>
                    Ouvrir le fichier
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border border-gray-700 bg-gray-900 p-4">
                  <div className="max-h-[60vh] overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-gray-100">
                    {doc.content}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}


import { useProjectContext } from "./project.context";
import { ProjectV3 } from "@/types/ProjectV3";

/**
 * Hook simplifié pour accéder au projet actif
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { project, isLoading } = useActiveProject();
 *   if (isLoading) return <div>Loading...</div>;
 *   if (!project) return <div>No active project</div>;
 *   return <div>{project.name}</div>;
 * }
 * ```
 */
export function useActiveProject() {
  const { activeProject, isLoading } = useProjectContext();
  return { 
    project: activeProject, 
    isLoading 
  };
}

/**
 * Hook pour vérifier si un projet spécifique est actif
 * 
 * @example
 * ```tsx
 * function ProjectButton({ projectId }: { projectId: string }) {
 *   const isActive = useIsProjectActive(projectId);
 *   return <button className={isActive ? 'active' : ''}>Project</button>;
 * }
 * ```
 */
export function useIsProjectActive(projectId: string): boolean {
  const { activeProject } = useProjectContext();
  return activeProject?.id === projectId;
}

/**
 * Hook pour obtenir tous les projets
 * 
 * @example
 * ```tsx
 * function ProjectList() {
 *   const { projects, isLoading } = useProjects();
 *   return projects.map(p => <div key={p.id}>{p.name}</div>);
 * }
 * ```
 */
export function useProjects() {
  const { projects, isLoading } = useProjectContext();
  return { projects, isLoading };
}

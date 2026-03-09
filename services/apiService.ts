
import { ProjectState, ProjectMetrics } from "../types";

export const analyzeProject = async (project: ProjectState): Promise<ProjectMetrics> => {
  try {
    const resp = await fetch('/api/analyze-project', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project })
    });
    if (!resp.ok) {
      const errMsg = await resp.text();
      throw new Error(errMsg || 'Ошибка анализа проекта');
    }
    const data = await resp.json();
    return data as ProjectMetrics;
  } catch (error: any) {
    console.error("Analyze Error:", error);
    throw error;
  }
};

export const generateVisualization = async (project: ProjectState): Promise<string | null> => {
  if (!project.base64Image) return null;
  try {
    const resp = await fetch('/api/generate-visualization', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project })
    });
    if (!resp.ok) {
      return null;
    }
    const data = await resp.json();
    return data?.imageUrl ?? null;
  } catch (error) {
    console.error("Visualization Error:", error);
    return null;
  }
};

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }
    const { generateVisualizationImpl } = await import('../server/logic.js');
    const project = req.body?.project;
    if (!project) {
      res.status(400).json({ error: 'project payload is required' });
      return;
    }
    const data = await generateVisualizationImpl(project);
    res.status(200).json(data);
  } catch (e) {
    const detail = e?.message || 'Failed to generate visualization';
    res.status(502).json({ imageUrl: null, error: 'Stability API error', detail });
  }
}


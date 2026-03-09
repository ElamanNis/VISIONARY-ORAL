export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }
    const { analyzeProjectImpl } = await import('../server/logic.js');
    const project = req.body?.project;
    if (!project) {
      res.status(400).json({ error: 'project payload is required' });
      return;
    }
    const data = await analyzeProjectImpl(project);
    res.status(200).json(data);
  } catch (e) {
    const detail = e?.message || 'Failed to analyze project';
    res.status(500).json({ error: 'Failed to analyze project', detail });
  }
}


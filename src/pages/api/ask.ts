import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { query, data } = req.body;

  if (!query || query.trim() === '') {
    return res.status(400).json({ error: 'Query is required' });
  }

  try {
    // Azure OpenAI configuration
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const apiKey = process.env.AZURE_OPENAI_API_KEY;
    const deployment = process.env.AZURE_OPENAI_DEPLOYMENT_GPT5;
    const apiVersion = process.env.AZURE_OPENAI_API_VERSION;

    if (!endpoint || !apiKey || !deployment) {
      return res.status(500).json({ error: 'Azure OpenAI configuration missing' });
    }

    // Prepare the prompt with grocery data context
    const systemPrompt = `You are a retail analytics expert analyzing grocery basket data. You have access to the following key metrics:

Key Performance Indicators:
- Total grocery transactions: ${data?.kpi?.totalGroceryTxns?.toLocaleString() || '24,745,410'}
- Total grocery sales: $${data?.kpi?.totalGrocerySales?.toLocaleString() || '508,220,881'}
- Mixed grocery transactions: ${data?.kpi?.mixedTxns?.toLocaleString() || '13,137,779'} (${data?.kpi?.pctMixed ? (data.kpi.pctMixed * 100).toFixed(1) : '53.1'}% of total)
- Mixed grocery sales: $${data?.kpi?.mixedSales?.toLocaleString() || '274,735,865'}
- Pure grocery transactions: ${data?.kpi?.pureTxns?.toLocaleString() || '11,607,631'} (${data?.kpi?.pctPure ? (data.kpi.pctPure * 100).toFixed(1) : '46.9'}% of total)
- Pure grocery sales: $${data?.kpi?.pureSales?.toLocaleString() || '233,485,016'}

Average Ticket Analysis:
- Overall average ticket: $${data?.kpi?.avgAll?.toFixed(2) || '20.54'}
- Mixed basket average ticket: $${data?.kpi?.avgMixed?.toFixed(2) || '20.91'}
- Pure grocery average ticket: $${data?.kpi?.avgPure?.toFixed(2) || '20.11'}
- Mixed basket uplift: $${data?.kpi ? (data.kpi.avgMixed - data.kpi.avgPure).toFixed(2) : '0.80'}

Category Mix Analysis (Non-exclusive incidence):
${data?.mixCats?.map((cat: any) => `- ${cat.name}: ${cat.mixTxns.toLocaleString()} transactions (${(cat.mixTxns / data.kpi.mixedTxns * 100).toFixed(1)}% of mixed), $${cat.mixSales.toLocaleString()} sales, avg ticket $${cat.avgTicket.toFixed(2)}`).join('\n') || ''}

Provide strategic insights and analysis based on this data. Focus on business opportunities, conversion strategies, and actionable recommendations.`;

    // Call Azure OpenAI
    const response = await fetch(`${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: query }
        ],
        max_completion_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Azure OpenAI API error:', response.status, errorText);
      return res.status(500).json({ error: `Azure OpenAI API error: ${response.status}` });
    }

    const result = await response.json();
    const answer = result.choices?.[0]?.message?.content || 'No response generated';

    res.status(200).json({ answer });
  } catch (error) {
    console.error('Error processing query:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

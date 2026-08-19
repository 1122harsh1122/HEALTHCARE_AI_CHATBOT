import { NextRequest, NextResponse } from 'next/server';
import { getKnowledgeDatabase, getDatasetStats, findConditionsBySymptoms } from '@/lib/dataset-parser';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q');
    const symptom = searchParams.get('symptom');
    const statsOnly = searchParams.get('stats') === 'true';

    if (statsOnly) {
      return NextResponse.json({ success: true, stats: getDatasetStats() });
    }

    const db = getKnowledgeDatabase();

    if (symptom) {
      const matched = findConditionsBySymptoms([symptom]);
      return NextResponse.json({ success: true, count: matched.length, results: matched });
    }

    if (query) {
      const q = query.toLowerCase();
      const matchedConditions = db.conditions.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q) ||
          c.symptoms.some((s) => s.toLowerCase().includes(q))
      );
      const matchedFaqs = db.faqs.filter(
        (f) => f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q)
      );

      return NextResponse.json({
        success: true,
        conditions: matchedConditions,
        faqs: matchedFaqs
      });
    }

    return NextResponse.json({
      success: true,
      stats: getDatasetStats(),
      conditions: db.conditions,
      faqs: db.faqs
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

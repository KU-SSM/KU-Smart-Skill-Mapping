
export interface SkillMapRadarRow {
  skill: string;
  student: number;
  ai: number;
  teacher: number;
}

export interface MockRubricTableRow {
  skillArea: string;
  values: string[];
}

export interface MockRubricScoreSession {
  title: string;
  headers: string[];
  rows: MockRubricTableRow[];
}

export interface MockSkillEvaluation {
  id: string;
  title: string;
  rubricHint: string;
  rows: SkillMapRadarRow[];
  rubricScore: MockRubricScoreSession;
}

const LEVEL_HEADERS = [
  'Level 1 — Beginning',
  'Level 2 — Developing',
  'Level 3 — Proficient',
  'Level 4 — Advanced',
  'Level 5 — Exemplary',
] as const;

interface SkillAxisAndRubric {
  skillArea: string;
  student: number;
  ai: number;
  teacher: number;
  levels: readonly [string, string, string, string, string];
}

function buildEvaluation(
  id: string,
  title: string,
  rubricHint: string,
  rubricTitle: string,
  skills: SkillAxisAndRubric[]
): MockSkillEvaluation {
  const rows: SkillMapRadarRow[] = skills.map((s) => ({
    skill: s.skillArea,
    student: s.student,
    ai: s.ai,
    teacher: s.teacher,
  }));

  const rubricRows: MockRubricTableRow[] = skills.map((s) => ({
    skillArea: s.skillArea,
    values: [...s.levels],
  }));

  return {
    id,
    title,
    rubricHint,
    rows,
    rubricScore: {
      title: rubricTitle,
      headers: [...LEVEL_HEADERS],
      rows: rubricRows,
    },
  };
}

export const MOCK_SKILL_EVALUATIONS: MockSkillEvaluation[] = [
  buildEvaluation(
    'eval-portfolio-jan',
    'Portfolio — Design sprint',
    'General professional skills',
    'Design sprint rubric',
    [
      {
        skillArea: 'Communication',
        student: 3,
        ai: 4,
        teacher: 4,
        levels: [
          'Rarely clear; audience confused',
          'Sometimes unclear; gaps in updates',
          'Clear in most settings; timely updates',
          'Clear, persuasive; adapts to audience',
          'Exemplary professional tone and clarity',
        ],
      },
      {
        skillArea: 'Problem solving',
        student: 4,
        ai: 3,
        teacher: 4,
        levels: [
          'Avoids or deflects problems',
          'Basic attempts; needs direction',
          'Structured approach; meets expectations',
          'Creative solutions; anticipates risks',
          'Leads complex resolution across stakeholders',
        ],
      },
      {
        skillArea: 'Teamwork',
        student: 3,
        ai: 3,
        teacher: 5,
        levels: [
          'Minimal contribution to group outcomes',
          'Inconsistent participation',
          'Reliable partner; meets commitments',
          'Strengthens team velocity and morale',
          'Drives collaboration and shared ownership',
        ],
      },
      {
        skillArea: 'Technical depth',
        student: 2,
        ai: 4,
        teacher: 3,
        levels: [
          'Surface-only understanding',
          'Gaps evident under questioning',
          'Meets technical expectations for role',
          'Strong depth; sound tradeoff reasoning',
          'Expert-level insight and execution',
        ],
      },
      {
        skillArea: 'Leadership',
        student: 2,
        ai: 2,
        teacher: 3,
        levels: [
          'No initiative beyond assigned tasks',
          'Follows direction only',
          'Supports goals; steps up when needed',
          'Guides peers; unblocks others',
          'Inspires ownership and clear direction',
        ],
      },
      {
        skillArea: 'Documentation',
        student: 4,
        ai: 5,
        teacher: 4,
        levels: [
          'Missing, messy, or hard to follow',
          'Incomplete; hard for others to reuse',
          'Adequate records for handoff',
          'Thorough; easy to navigate',
          'Publication-ready; industry best practice',
        ],
      },
    ]
  ),

  buildEvaluation(
    'eval-capstone',
    'Capstone review',
    'Engineering rubric v2',
    'Engineering rubric v2',
    [
      {
        skillArea: 'Requirements',
        student: 4,
        ai: 4,
        teacher: 5,
        levels: [
          'Requirements ignored or misunderstood',
          'Partial coverage; unstable scope',
          'Meets spec; traceable to needs',
          'Refines requirements with stakeholders',
          'Outstanding elicitation and prioritization',
        ],
      },
      {
        skillArea: 'Architecture',
        student: 5,
        ai: 4,
        teacher: 4,
        levels: [
          'No coherent structure',
          'Ad hoc design; weak boundaries',
          'Sound modular design for problem size',
          'Scalable patterns; clear interfaces',
          'Novel architecture; research-grade choices',
        ],
      },
      {
        skillArea: 'Implementation',
        student: 4,
        ai: 5,
        teacher: 5,
        levels: [
          'Incorrect or fragile code',
          'Works minimally; tech debt heavy',
          'Correct, readable, maintainable',
          'Efficient; strong error handling',
          'Exemplary quality and craftsmanship',
        ],
      },
      {
        skillArea: 'Testing',
        student: 4,
        ai: 4,
        teacher: 4,
        levels: [
          'Little or no verification',
          'Manual checks only',
          'Automated tests for core paths',
          'Strong coverage; CI-friendly',
          'Rigorous quality gates and edge cases',
        ],
      },
      {
        skillArea: 'Security',
        student: 3,
        ai: 3,
        teacher: 4,
        levels: [
          'Obvious vulnerabilities',
          'Reactive fixes only',
          'Baseline secure coding practices',
          'Threat-aware design and review',
          'Defense in depth; formal mindset',
        ],
      },
      {
        skillArea: 'Presentation',
        student: 3,
        ai: 4,
        teacher: 3,
        levels: [
          'Demo unclear or incomplete',
          'Minimal story; weak visuals',
          'Clear walkthrough of outcomes',
          'Stakeholder-ready narrative',
          'Compelling; answers hard questions fluently',
        ],
      },
    ]
  ),

  buildEvaluation(
    'eval-internship',
    'Internship mid-term',
    'Workplace readiness',
    'Workplace readiness',
    [
      {
        skillArea: 'Communication',
        student: 3,
        ai: 3,
        teacher: 3,
        levels: [
          'Needs frequent coaching on tone and clarity',
          'Improving; inconsistent in email and standups',
          'Professional baseline for workplace settings',
          'Confident with managers and cross-functional peers',
          'Role model for concise, respectful communication',
        ],
      },
      {
        skillArea: 'Ownership',
        student: 3,
        ai: 4,
        teacher: 3,
        levels: [
          'Waits for explicit tasks',
          'Completes work only with reminders',
          'Independent on routine assignments',
          'Proactively closes gaps and follows through',
          'Drives outcomes beyond stated scope',
        ],
      },
      {
        skillArea: 'Collaboration',
        student: 5,
        ai: 4,
        teacher: 4,
        levels: [
          'Reluctant to engage with team',
          'Participates when directly asked',
          'Consistent contributor in rituals and reviews',
          'Strengthens team culture and knowledge sharing',
          'Key anchor others rely on',
        ],
      },
      {
        skillArea: 'Tools & process',
        student: 3,
        ai: 3,
        teacher: 4,
        levels: [
          'Struggles with standard tooling',
          'Applies tools with frequent support',
          'Meets org expectations for stack and workflow',
          'Efficient; mentors others on process',
          'Improves tooling and practices for the team',
        ],
      },
      {
        skillArea: 'Initiative',
        student: 2,
        ai: 2,
        teacher: 2,
        levels: [
          'Observes only; no unprompted ideas',
          'Shows occasional ownership',
          'Takes small leads without assignment',
          'Guides interns/peers on tasks',
          'Formal leadership readiness evident',
        ],
      },
      {
        skillArea: 'Time management',
        student: 2,
        ai: 3,
        teacher: 3,
        levels: [
          'Often misses deadlines or scope',
          'Improving prioritization habits',
          'Meets commitments predictably',
          'Clear handoffs and estimates',
          'Best-practice planning under ambiguity',
        ],
      },
    ]
  ),
];

export function getMockEvaluationById(id: string): MockSkillEvaluation | undefined {
  return MOCK_SKILL_EVALUATIONS.find((e) => e.id === id);
}

export function maxRankForRows(rows: SkillMapRadarRow[]): number {
  let m = 5;
  for (const r of rows) {
    m = Math.max(m, r.student, r.ai, r.teacher);
  }
  return m;
}

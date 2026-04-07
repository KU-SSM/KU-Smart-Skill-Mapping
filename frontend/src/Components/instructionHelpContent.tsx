import React from 'react';

const B = {
  pageTitle: 'ihb-page-title' as const,
  sectionTitle: 'ihb-section-title' as const,
  para: 'ihb-paragraph' as const,
  steps: 'ihb-steps-label' as const,
  list: 'ihb-list' as const,
};

export const instructionStudentRubricList: React.ReactNode = (
  <div className="ihb-body">
    <p className={B.pageTitle}>Rubric score Page:</p>
    <p className={B.para}>
      You can view rubric scores for different careers, their criteria and date time of updates.
    </p>
  </div>
);

export const instructionStudentEvaluationOverview: React.ReactNode = (
  <div className="ihb-body">
    <p className={B.pageTitle}>Evaluation Page:</p>
    <p className={B.steps}>Steps:</p>
    <ul className={B.list}>
      <li>Upload your resume or portfolio.</li>
      <li>Choose the rubric score to use for your evaluation.</li>
      <li>Perform evaluation.</li>
      <li>Save changes &amp; request for teacher evaluation.</li>
    </ul>
  </div>
);

export const instructionStudentSkillMap: React.ReactNode = (
  <div className="ihb-body">
    <p className={B.pageTitle}>Skill Map Page:</p>
    <ul className={`${B.list} ihb-list--flat`}>
      <li>
        You may choose your evaluated score to visualize the result as a chart as well as see the
        justification reason table on AI part.
      </li>
    </ul>
  </div>
);

export const instructionTeacherSkillMap: React.ReactNode = (
  <div className="ihb-body">
    <p className={B.pageTitle}>Skill Map Page:</p>
    <ul className={`${B.list} ihb-list--flat`}>
      <li>
        You may choose student evaluated scores to visualize the result as a chart as well as see the
        justification reason table on AI part.
      </li>
    </ul>
  </div>
);

export const instructionStudentCertificate: React.ReactNode = (
  <div className="ihb-body">
    <p className={B.pageTitle}>Certificate Page:</p>
    <ul className={`${B.list} ihb-list--flat`}>
      <li>You can choose your approved evaluation results to make a certificate to export.</li>
    </ul>
  </div>
);

export const instructionTeacherCertificate: React.ReactNode = (
  <div className="ihb-body">
    <p className={B.pageTitle}>Certificate Page:</p>
    <ul className={`${B.list} ihb-list--flat`}>
      <li>You can choose the approved evaluation results to make a certificate to export.</li>
    </ul>
  </div>
);

export const instructionTeacherRubricManage: React.ReactNode = (
  <div className="ihb-body">
    <p className={B.pageTitle}>Rubric Score Page:</p>
    <p className={B.para}>Create, update and delete your rubric scores criteria.</p>
  </div>
);

export const instructionTeacherRubricTable: React.ReactNode = (
  <div className="ihb-body">
    <p className={B.pageTitle}>Rubric Table Page</p>
    <p className={B.para}>
      The rubric score table which will be used for skill evaluation criteria.
    </p>
    <ul className={B.list}>
      <li>Add your rubric criteria table with headers being levels of your skills.</li>
      <li>Add your desire skill areas on first column.</li>
      <li>Add criteria for corresponding skill areas and levels.</li>
      <li>View Rubric Score version history on upper right icon.</li>
    </ul>
  </div>
);

export const instructionTeacherRubricSaveExpiration: React.ReactNode = (
  <div className="ihb-body">
    <p className={B.pageTitle}>Update Rubric Table Pop-up:</p>
    <p className={B.para}>
      Set up the expiration date for the previous rubric version (After update, the validation status of
      evaluation results that used older version of rubric will change then expired after the expiration
      date.)
    </p>
  </div>
);

export const instructionTeacherEvaluation: React.ReactNode = (
  <div className="ihb-body">
    <p className={B.pageTitle}>Evaluation Page:</p>
    <p className={B.steps}>Steps:</p>
    <ul className={B.list}>
      <li>View the uploaded portfolio from student.</li>
      <li>Choose the rubric score to use for your evaluation.</li>
      <li>Perform evaluation.</li>
      <li>Save changes &amp; submit.</li>
    </ul>
  </div>
);

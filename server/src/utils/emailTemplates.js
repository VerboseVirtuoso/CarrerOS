/**
 * emailTemplates.js
 * Plain-text email body generators for CareerOS automated / manual send.
 */

// ─── followUpTemplate ─────────────────────────────────────────────────────────
/**
 * Generates a professional, 4-sentence follow-up email for a job application.
 *
 * @param  {Object} job          - A Job document (or plain object)
 * @param  {string} job.company  - Company name
 * @param  {string} job.role     - Job title / role
 * @param  {string} [job.status] - Current pipeline status (optional context)
 * @returns {string}             Plain-text email body ready to copy/send
 */
const followUpTemplate = (job) => {
  const { company, role } = job;

  return `Subject: Following Up — ${role} Application at ${company}

Hi [Hiring Manager's Name],

I hope this message finds you well. I wanted to reach out to follow up on my application for the ${role} position at ${company}, which I submitted recently and remain very enthusiastic about.

I am particularly excited by ${company}'s work and believe my background aligns closely with what your team is looking for in this role. Please let me know if there is any additional information — such as work samples, references, or a completed skills assessment — that would help move my application forward.

I appreciate you taking the time to consider my candidacy and look forward to the possibility of contributing to your team.

Warm regards,
[Your Full Name]
[Your Phone Number]
[Your LinkedIn URL]`.trim();
};

// ─── interviewConfirmTemplate (bonus) ────────────────────────────────────────
/**
 * Short confirmation/thank-you template for after an interview is scheduled.
 *
 * @param  {Object} job
 * @returns {string}
 */
const interviewConfirmTemplate = (job) => {
  const { company, role } = job;

  return `Subject: Thank You — ${role} Interview at ${company}

Hi [Interviewer's Name],

Thank you so much for the opportunity to interview for the ${role} position at ${company}. I am looking forward to our conversation and learning more about the team's goals and how I can contribute.

Please let me know if there is anything I should prepare or bring ahead of our meeting.

Best regards,
[Your Full Name]
[Your Phone Number]`.trim();
};

module.exports = {
  followUpTemplate,
  interviewConfirmTemplate,
};

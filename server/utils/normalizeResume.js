// utils/normalizeResume.js

const SKILL_SYNONYMS = {
  js: "javascript",
  javascript: "javascript",
  node: "node.js",
  nodejs: "node.js",
  reactjs: "react",
  react: "react",
  html5: "html",
  css3: "css",
  postgres: "postgresql",
  pg: "postgresql",
};

function normalizeSkill(skill) {
  const s = skill.toLowerCase().trim();
  return SKILL_SYNONYMS[s] || s;
}

function extractYear(value) {
  if (!value) return null;

  // Handles: "2021", "2021-06", "Jun 2021", "Present"
  const match = value.toString().match(/(19|20)\d{2}/);
  return match ? parseInt(match[0]) : null;
}

export function normalizeResume(parsedResume) {
  if (!parsedResume || typeof parsedResume !== "object") {
    return null;
  }

  /* ================== SKILLS ================== */
  const skillsSet = new Set();

  if (Array.isArray(parsedResume.positions)) {
    parsedResume.positions.forEach((pos) => {
      if (Array.isArray(pos.skills)) {
        pos.skills.forEach((skill) =>
          skillsSet.add(skill.toLowerCase())
        );
      }
    });
  }

  const skills = Array.from(skillsSet);

  /* ================== ROLES ================== */
  const roles = Array.isArray(parsedResume.positions)
    ? parsedResume.positions
        .map((p) => p.position_name)
        .filter(Boolean)
        .map((r) => r.toLowerCase())
    : [];

  /* ================== EXPERIENCE ================== */
  let experienceYears = 0;

  if (Array.isArray(parsedResume.positions)) {
    parsedResume.positions.forEach((pos) => {
      const startYear = pos.start_date
        ? new Date(pos.start_date).getFullYear()
        : null;

      const endYear = pos.end_date
        ? new Date(pos.end_date).getFullYear()
        : new Date().getFullYear();

      if (startYear && endYear && endYear >= startYear) {
        experienceYears += endYear - startYear;
      }
    });
  }

  /* ================== EDUCATION ================== */
  const education = Array.isArray(parsedResume.education_qualifications)
    ? parsedResume.education_qualifications
        .map((edu) => {
          const degree = edu.degree_type || "";
          const specialization = edu.specialization_subjects || "";
          return `${degree} ${specialization}`.trim().toLowerCase();
        })
        .filter(Boolean)
    : [];

  /* ================== SENIORITY ================== */
  let seniority = "junior";
  if (experienceYears >= 5) seniority = "senior";
  else if (experienceYears >= 2) seniority = "mid";

  return {
    skills,
    roles,
    education,
    experience_years: experienceYears,
    seniority,
  };
}

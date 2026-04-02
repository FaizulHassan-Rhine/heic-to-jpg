import { forwardRef } from "react";
import { Mail, Phone, MapPin, Globe, Linkedin } from "lucide-react";

const FONT_MAP = {
  "Inter": "'Inter', sans-serif",
  "Helvetica": "'Helvetica Neue', Helvetica, Arial, sans-serif",
  "Georgia": "Georgia, 'Times New Roman', serif",
  "Merriweather": "'Merriweather', Georgia, serif",
  "Lato": "'Lato', sans-serif",
  "Roboto": "'Roboto', sans-serif",
  "Open Sans": "'Open Sans', sans-serif",
  "Playfair Display": "'Playfair Display', Georgia, serif",
  "Source Sans 3": "'Source Sans 3', sans-serif",
  "Nunito": "'Nunito', sans-serif",
};

export const FONT_OPTIONS = Object.keys(FONT_MAP);

function ContactItem({ icon: Icon, value, accent }) {
  if (!value?.trim()) return null;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "10.5px", color: "#4b5563" }}>
      <Icon size={10} style={{ color: accent, flexShrink: 0 }} />
      <span style={{ wordBreak: "break-all" }}>{value}</span>
    </span>
  );
}

function SectionTitle({ title, accent }) {
  return (
    <div style={{ marginBottom: "8px", marginTop: "16px" }}>
      <h2 style={{ fontSize: "12px", fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "#111827", margin: 0 }}>{title}</h2>
      <div style={{ height: "1.5px", background: accent, marginTop: "3px", opacity: 0.7 }} />
    </div>
  );
}

function SkillBadge({ label, accent }) {
  return (
    <span style={{
      display: "inline-block", border: `1px solid ${accent}40`, borderRadius: "4px",
      padding: "2px 8px", fontSize: "9.5px", color: "#374151", marginRight: "6px", marginBottom: "6px",
      background: `${accent}08`,
    }}>
      {label}
    </span>
  );
}

const ResumePreview = forwardRef(function ResumePreview({ resume, fontFamily = "Inter", accentColor = "#2563eb" }, ref) {
  const {
    fullName, headline, email, phone, location, website, linkedin,
    summary, experience, skills, education, certifications, projects, languages, custom,
  } = resume;

  const accent = accentColor;
  const font = FONT_MAP[fontFamily] || FONT_MAP["Inter"];
  const hasContact = email || phone || location || website || linkedin;

  return (
    <div
      ref={ref}
      id="resume-preview"
      style={{
        width: "794px",
        minHeight: "1123px",
        padding: "40px 44px",
        fontFamily: font,
        fontSize: "11px",
        lineHeight: "1.55",
        boxSizing: "border-box",
        background: "#ffffff",
        color: "#111827",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: "12px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: 900, lineHeight: 1.15, color: "#111827", margin: 0 }}>
          {fullName || "Your Name"}
        </h1>
        {headline && (
          <p style={{ fontSize: "13.5px", fontWeight: 600, marginTop: "3px", color: accent, margin: "3px 0 0 0" }}>
            {headline}
          </p>
        )}
        {hasContact && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 16px", marginTop: "8px" }}>
            <ContactItem icon={Mail} value={email} accent={accent} />
            <ContactItem icon={Phone} value={phone} accent={accent} />
            <ContactItem icon={MapPin} value={location} accent={accent} />
            <ContactItem icon={Globe} value={website} accent={accent} />
            <ContactItem icon={Linkedin} value={linkedin} accent={accent} />
          </div>
        )}
      </div>

      {/* Summary */}
      {summary?.trim() && (
        <>
          <SectionTitle title="Summary" accent={accent} />
          <p style={{ fontSize: "10.5px", color: "#374151", lineHeight: 1.65, whiteSpace: "pre-line", margin: 0 }}>{summary}</p>
        </>
      )}

      {/* Experience */}
      {experience?.some((e) => e.title || e.company) && (
        <>
          <SectionTitle title="Experience" accent={accent} />
          {experience.map((exp, i) => (
            <div key={i} style={{ marginBottom: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <div>
                  {exp.title && <p style={{ fontSize: "11.5px", fontWeight: 700, color: "#111827", margin: 0 }}>{exp.title}</p>}
                  {exp.company && <p style={{ fontSize: "10.5px", fontWeight: 600, color: accent, margin: "1px 0 0 0" }}>{exp.company}</p>}
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  {(exp.startDate || exp.endDate) && (
                    <p style={{ fontSize: "9.5px", color: "#6b7280", margin: 0 }}>
                      {exp.startDate}{exp.startDate && exp.endDate ? " – " : ""}{exp.endDate || (exp.startDate ? "Present" : "")}
                    </p>
                  )}
                  {exp.location && <p style={{ fontSize: "9.5px", color: "#6b7280", margin: 0 }}>{exp.location}</p>}
                </div>
              </div>
              {exp.description?.trim() && (
                <p style={{ fontSize: "10px", color: "#6b7280", marginTop: "3px", fontStyle: "italic" }}>{exp.description}</p>
              )}
              {exp.bullets?.filter(b => b.trim()).length > 0 && (
                <ul style={{ margin: "5px 0 0 0", paddingLeft: "14px", listStyleType: "disc" }}>
                  {exp.bullets.filter(b => b.trim()).map((b, bi) => (
                    <li key={bi} style={{ fontSize: "10px", color: "#374151", marginBottom: "2px" }}>{b}</li>
                  ))}
                </ul>
              )}
              {i < experience.length - 1 && <div style={{ borderBottom: "1px dashed #e5e7eb", marginTop: "8px" }} />}
            </div>
          ))}
        </>
      )}

      {/* Skills */}
      {skills?.trim() && (
        <>
          <SectionTitle title="Skills" accent={accent} />
          <div style={{ display: "flex", flexWrap: "wrap" }}>
            {skills.split(",").map(s => s.trim()).filter(Boolean).map((s, i) => (
              <SkillBadge key={i} label={s} accent={accent} />
            ))}
          </div>
        </>
      )}

      {/* Projects */}
      {projects?.some((p) => p.name) && (
        <>
          <SectionTitle title="Projects" accent={accent} />
          {projects.map((proj, i) => (
            <div key={i} style={{ marginBottom: "10px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <div>
                  {proj.name && <p style={{ fontSize: "11px", fontWeight: 700, color: "#111827", margin: 0 }}>{proj.name}</p>}
                  {proj.url && <p style={{ fontSize: "9.5px", color: accent, margin: "1px 0 0 0" }}>{proj.url}</p>}
                </div>
                {(proj.startDate || proj.endDate) && (
                  <p style={{ fontSize: "9.5px", color: "#6b7280", margin: 0, flexShrink: 0 }}>
                    {proj.startDate}{proj.startDate && proj.endDate ? " – " : ""}{proj.endDate}
                  </p>
                )}
              </div>
              {proj.description?.trim() && (
                <p style={{ fontSize: "10px", color: "#374151", marginTop: "3px" }}>{proj.description}</p>
              )}
              {proj.bullets?.filter(b => b.trim()).length > 0 && (
                <ul style={{ margin: "5px 0 0 0", paddingLeft: "14px", listStyleType: "disc" }}>
                  {proj.bullets.filter(b => b.trim()).map((b, bi) => (
                    <li key={bi} style={{ fontSize: "10px", color: "#374151", marginBottom: "2px" }}>{b}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </>
      )}

      {/* Education */}
      {education?.some((e) => e.degree || e.institution) && (
        <>
          <SectionTitle title="Education" accent={accent} />
          {education.map((edu, i) => (
            <div key={i} style={{ marginBottom: "10px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <div>
                  {edu.degree && <p style={{ fontSize: "11px", fontWeight: 700, color: "#111827", margin: 0 }}>{edu.degree}</p>}
                  {edu.institution && <p style={{ fontSize: "10.5px", fontWeight: 600, color: accent, margin: "1px 0 0 0" }}>{edu.institution}</p>}
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  {(edu.startDate || edu.endDate) && (
                    <p style={{ fontSize: "9.5px", color: "#6b7280", margin: 0 }}>
                      {edu.startDate}{edu.startDate && edu.endDate ? " – " : ""}{edu.endDate}
                    </p>
                  )}
                  {edu.location && <p style={{ fontSize: "9.5px", color: "#6b7280", margin: 0 }}>{edu.location}</p>}
                </div>
              </div>
              {edu.description?.trim() && (
                <p style={{ fontSize: "10px", color: "#374151", marginTop: "3px" }}>{edu.description}</p>
              )}
            </div>
          ))}
        </>
      )}

      {/* Certifications */}
      {certifications?.some((c) => c.name) && (
        <>
          <SectionTitle title="Certifications" accent={accent} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 24px" }}>
            {certifications.map((cert, i) => (
              <div key={i} style={{ marginBottom: "8px" }}>
                {cert.name && <p style={{ fontSize: "11px", fontWeight: 700, color: "#111827", margin: 0 }}>{cert.name}</p>}
                {cert.issuer && <p style={{ fontSize: "9.5px", color: accent, margin: "1px 0 0 0" }}>{cert.issuer}</p>}
                {cert.date && <p style={{ fontSize: "9.5px", color: "#9ca3af", margin: 0 }}>{cert.date}</p>}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Languages */}
      {languages?.some((l) => l.name) && (
        <>
          <SectionTitle title="Languages" accent={accent} />
          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 16px" }}>
            {languages.filter(l => l.name).map((lang, i) => (
              <span key={i} style={{ fontSize: "10px", color: "#374151" }}>
                <span style={{ fontWeight: 600 }}>{lang.name}</span>
                {lang.level && <span style={{ color: "#9ca3af" }}> — {lang.level}</span>}
              </span>
            ))}
          </div>
        </>
      )}

      {/* Custom Sections */}
      {custom?.map((sec, si) => sec.title && (
        <div key={si}>
          <SectionTitle title={sec.title} accent={accent} />
          {sec.entries?.map((entry, ei) => (
            <div key={ei} style={{ marginBottom: "8px" }}>
              {entry.title && <p style={{ fontSize: "11px", fontWeight: 700, color: "#111827", margin: 0 }}>{entry.title}</p>}
              {entry.subtitle && <p style={{ fontSize: "10px", color: "#6b7280", margin: 0 }}>{entry.subtitle}</p>}
              {entry.description && <p style={{ fontSize: "10px", color: "#374151", marginTop: "3px" }}>{entry.description}</p>}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
});

export default ResumePreview;

import { useState, useRef, useEffect, useCallback, useId } from "react";
import dynamic from "next/dynamic";
import ToolPageShell, { ToolPageHeader } from "../components/ToolPageShell";
import { Button } from "../components/ui/button";
import {
  Plus, Trash2, ChevronDown, ChevronUp, Download, RotateCcw,
  User, FileText, Briefcase, GraduationCap, Award, Code2, Languages as LanguagesIcon, Layers,
  Grip, ArrowUp, ArrowDown, Type, Palette, Eye, PenLine, Settings2,
} from "lucide-react";
import toast from "react-hot-toast";

const ResumePreview = dynamic(
  () => import("../components/resume/ResumePreview").then(m => ({ default: m.default })),
  { ssr: false }
);

const FONT_OPTIONS = [
  "Inter", "Helvetica", "Georgia", "Merriweather", "Lato",
  "Roboto", "Open Sans", "Playfair Display", "Source Sans 3", "Nunito",
];

const ACCENT_PRESETS = [
  "#2563eb", "#0891b2", "#059669", "#7c3aed", "#dc2626",
  "#d97706", "#be185d", "#4338ca", "#0d9488", "#111827",
];

const GOOGLE_FONT_URL = "https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&family=Merriweather:wght@400;700;900&family=Lato:wght@400;700;900&family=Roboto:wght@400;500;700;900&family=Open+Sans:wght@400;600;700;800&family=Playfair+Display:wght@400;700;900&family=Source+Sans+3:wght@400;600;700;900&family=Nunito:wght@400;600;700;900&display=swap";

// ─── Helpers ──────────────────────────────────────────────────────────────────

let _id = 0;
function uid() { return `id-${++_id}-${Math.random().toString(36).slice(2, 7)}`; }

function newExp() {
  return { id: uid(), title: "", company: "", startDate: "", endDate: "", location: "", description: "", bullets: [""] };
}
function newEdu() {
  return { id: uid(), degree: "", institution: "", startDate: "", endDate: "", location: "", description: "" };
}
function newCert() {
  return { id: uid(), name: "", issuer: "", date: "", url: "" };
}
function newProject() {
  return { id: uid(), name: "", url: "", startDate: "", endDate: "", description: "", bullets: [""] };
}
function newLang() {
  return { id: uid(), name: "", level: "" };
}
function newCustomSection() {
  return { id: uid(), title: "Custom Section", entries: [{ id: uid(), title: "", subtitle: "", description: "" }] };
}

const DEFAULT = {
  fullName: "", headline: "", email: "", phone: "", location: "", website: "", linkedin: "",
  summary: "",
  experience: [newExp()],
  skills: "",
  education: [newEdu()],
  certifications: [newCert()],
  projects: [],
  languages: [],
  custom: [],
};

// ─── Tiny UI pieces ───────────────────────────────────────────────────────────

function Field({ label, value, onChange, placeholder, type = "text", rows, className: cls }) {
  const id = useId();
  const base = "w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand-mid/30 focus:border-brand-mid transition-all";
  return (
    <div className={cls}>
      {label && <label htmlFor={id} className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">{label}</label>}
      {rows ? (
        <textarea id={id} rows={rows} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={base + " resize-none"} />
      ) : (
        <input id={id} type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={base} />
      )}
    </div>
  );
}

function Grid2({ children }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{children}</div>;
}

function AddBtn({ onClick, label }) {
  return (
    <button onClick={onClick} className="mt-3 flex items-center gap-1.5 text-[12px] font-semibold text-primary hover:text-brand-navy transition">
      <Plus size={14} /> {label}
    </button>
  );
}

function MoveButtons({ onUp, onDown }) {
  return (
    <div className="flex gap-0.5">
      <button onClick={onUp} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-muted-foreground transition"><ArrowUp size={12} /></button>
      <button onClick={onDown} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-muted-foreground transition"><ArrowDown size={12} /></button>
    </div>
  );
}

function SectionCard({ icon: Icon, title, children, defaultOpen = true, onRemove, accent }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden transition-shadow hover:shadow-md">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/40/80 transition text-left"
      >
        <div className={`p-1.5 rounded-lg ${accent || "bg-brand-sky/50"}`}>
          <Icon size={15} className="text-primary" />
        </div>
        <span className="flex-1 text-[13px] font-semibold text-foreground">{title}</span>
        {onRemove && (
          <button onClick={e => { e.stopPropagation(); onRemove(); }} className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 mr-1"><Trash2 size={13} /></button>
        )}
        {open ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
      </button>
      {open && <div className="px-4 pb-4 pt-2 space-y-3 border-t border-border">{children}</div>}
    </div>
  );
}

function EntryCard({ children, onRemove, onMoveUp, onMoveDown }) {
  return (
    <div className="relative rounded-lg border border-border bg-muted/40/80 p-3.5 space-y-2.5">
      <div className="absolute top-2.5 right-2.5 flex items-center gap-0.5">
        {onMoveUp && <MoveButtons onUp={onMoveUp} onDown={onMoveDown} />}
        {onRemove && (
          <button onClick={onRemove} title="Remove" className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 transition">
            <Trash2 size={13} />
          </button>
        )}
      </div>
      <div className="pr-20 space-y-2.5">{children}</div>
    </div>
  );
}

function BulletsEditor({ bullets, onChange }) {
  const add = () => onChange([...bullets, ""]);
  const update = (i, v) => { const a = [...bullets]; a[i] = v; onChange(a); };
  const remove = (i) => onChange(bullets.filter((_, idx) => idx !== i));

  return (
    <div>
      <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Bullet Points</label>
      <div className="space-y-1.5">
        {bullets.map((b, i) => (
          <div key={i} className="flex gap-2 items-center">
            <span className="text-muted-foreground text-xs select-none">•</span>
            <input
              value={b}
              onChange={e => update(i, e.target.value)}
              placeholder={`Achievement ${i + 1}`}
              className="flex-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand-mid/30 focus:border-brand-mid transition-all"
            />
            {bullets.length > 1 && (
              <button onClick={() => remove(i)} className="text-muted-foreground hover:text-red-500 transition"><Trash2 size={12} /></button>
            )}
          </div>
        ))}
      </div>
      <AddBtn onClick={add} label="Add bullet" />
    </div>
  );
}

// ─── Section Editors ──────────────────────────────────────────────────────────

function PersonalInfoEditor({ resume, onChange }) {
  const set = (key) => (val) => onChange({ ...resume, [key]: val });
  return (
    <SectionCard icon={User} title="Personal Information" defaultOpen accent="bg-brand-sky/50">
      <Grid2>
        <Field label="Full Name" value={resume.fullName} onChange={set("fullName")} placeholder="e.g. Alex Johnson" />
        <Field label="Headline / Title" value={resume.headline} onChange={set("headline")} placeholder="e.g. Senior Frontend Developer" />
      </Grid2>
      <Grid2>
        <Field label="Email" value={resume.email} onChange={set("email")} placeholder="you@email.com" type="email" />
        <Field label="Phone" value={resume.phone} onChange={set("phone")} placeholder="+1 (555) 000-0000" />
      </Grid2>
      <Grid2>
        <Field label="Location" value={resume.location} onChange={set("location")} placeholder="City, Country" />
        <Field label="Website" value={resume.website} onChange={set("website")} placeholder="https://yoursite.com" />
      </Grid2>
      <Field label="LinkedIn" value={resume.linkedin} onChange={set("linkedin")} placeholder="linkedin.com/in/username" />
    </SectionCard>
  );
}

function SummaryEditor({ resume, onChange }) {
  return (
    <SectionCard icon={FileText} title="Summary" accent="bg-indigo-50">
      <Field value={resume.summary} onChange={v => onChange({ ...resume, summary: v })} placeholder="Write a compelling 2–4 sentence professional summary..." rows={4} />
    </SectionCard>
  );
}

function ExperienceEditor({ resume, onChange }) {
  const update = (i, patch) => {
    const arr = resume.experience.map((e, idx) => idx === i ? { ...e, ...patch } : e);
    onChange({ ...resume, experience: arr });
  };
  const add = () => onChange({ ...resume, experience: [...resume.experience, newExp()] });
  const remove = (i) => onChange({ ...resume, experience: resume.experience.filter((_, idx) => idx !== i) });
  const move = (i, dir) => {
    const arr = [...resume.experience]; const j = i + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]]; onChange({ ...resume, experience: arr });
  };

  return (
    <SectionCard icon={Briefcase} title="Experience" accent="bg-orange-50">
      <div className="space-y-3">
        {resume.experience.map((exp, i) => (
          <EntryCard key={exp.id} onRemove={() => remove(i)} onMoveUp={() => move(i, -1)} onMoveDown={() => move(i, 1)}>
            <Grid2>
              <Field label="Job Title" value={exp.title} onChange={v => update(i, { title: v })} placeholder="e.g. Software Engineer" />
              <Field label="Company" value={exp.company} onChange={v => update(i, { company: v })} placeholder="Company Name" />
            </Grid2>
            <Grid2>
              <Field label="Start Date" value={exp.startDate} onChange={v => update(i, { startDate: v })} placeholder="e.g. 01/2022" />
              <Field label="End Date" value={exp.endDate} onChange={v => update(i, { endDate: v })} placeholder="Present" />
            </Grid2>
            <Field label="Location" value={exp.location} onChange={v => update(i, { location: v })} placeholder="City, Country" />
            <Field label="Company Description" value={exp.description} onChange={v => update(i, { description: v })} placeholder="Brief description..." rows={2} />
            <BulletsEditor bullets={exp.bullets} onChange={v => update(i, { bullets: v })} />
          </EntryCard>
        ))}
      </div>
      <AddBtn onClick={add} label="Add experience" />
    </SectionCard>
  );
}

function SkillsEditor({ resume, onChange }) {
  return (
    <SectionCard icon={Layers} title="Skills" accent="bg-brand-sky/50">
      <Field value={resume.skills} onChange={v => onChange({ ...resume, skills: v })} placeholder="React.js, Next.js, TypeScript, Node.js, Git..." rows={3} />
      <p className="text-[11px] text-muted-foreground -mt-1">Separate skills with commas — they appear as badges.</p>
    </SectionCard>
  );
}

function ProjectsEditor({ resume, onChange }) {
  const update = (i, patch) => {
    const arr = (resume.projects || []).map((e, idx) => idx === i ? { ...e, ...patch } : e);
    onChange({ ...resume, projects: arr });
  };
  const add = () => onChange({ ...resume, projects: [...(resume.projects || []), newProject()] });
  const remove = (i) => onChange({ ...resume, projects: (resume.projects || []).filter((_, idx) => idx !== i) });
  const move = (i, dir) => {
    const arr = [...(resume.projects || [])]; const j = i + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]]; onChange({ ...resume, projects: arr });
  };

  return (
    <SectionCard icon={Code2} title="Projects" accent="bg-violet-50">
      <div className="space-y-3">
        {(resume.projects || []).map((proj, i) => (
          <EntryCard key={proj.id} onRemove={() => remove(i)} onMoveUp={() => move(i, -1)} onMoveDown={() => move(i, 1)}>
            <Grid2>
              <Field label="Project Name" value={proj.name} onChange={v => update(i, { name: v })} placeholder="Project Name" />
              <Field label="URL" value={proj.url} onChange={v => update(i, { url: v })} placeholder="https://..." />
            </Grid2>
            <Grid2>
              <Field label="Start Date" value={proj.startDate} onChange={v => update(i, { startDate: v })} placeholder="03/2023" />
              <Field label="End Date" value={proj.endDate} onChange={v => update(i, { endDate: v })} placeholder="Present" />
            </Grid2>
            <Field label="Description" value={proj.description} onChange={v => update(i, { description: v })} placeholder="Brief description..." rows={2} />
            <BulletsEditor bullets={proj.bullets || [""]} onChange={v => update(i, { bullets: v })} />
          </EntryCard>
        ))}
      </div>
      <AddBtn onClick={add} label="Add project" />
    </SectionCard>
  );
}

function EducationEditor({ resume, onChange }) {
  const update = (i, patch) => {
    const arr = resume.education.map((e, idx) => idx === i ? { ...e, ...patch } : e);
    onChange({ ...resume, education: arr });
  };
  const add = () => onChange({ ...resume, education: [...resume.education, newEdu()] });
  const remove = (i) => onChange({ ...resume, education: resume.education.filter((_, idx) => idx !== i) });
  const move = (i, dir) => {
    const arr = [...resume.education]; const j = i + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]]; onChange({ ...resume, education: arr });
  };

  return (
    <SectionCard icon={GraduationCap} title="Education" accent="bg-cyan-50">
      <div className="space-y-3">
        {resume.education.map((edu, i) => (
          <EntryCard key={edu.id} onRemove={() => remove(i)} onMoveUp={() => move(i, -1)} onMoveDown={() => move(i, 1)}>
            <Grid2>
              <Field label="Degree / Program" value={edu.degree} onChange={v => update(i, { degree: v })} placeholder="BSc Computer Science" />
              <Field label="Institution" value={edu.institution} onChange={v => update(i, { institution: v })} placeholder="University Name" />
            </Grid2>
            <Grid2>
              <Field label="Start Date" value={edu.startDate} onChange={v => update(i, { startDate: v })} placeholder="09/2018" />
              <Field label="End Date" value={edu.endDate} onChange={v => update(i, { endDate: v })} placeholder="06/2022" />
            </Grid2>
            <Field label="Location" value={edu.location} onChange={v => update(i, { location: v })} placeholder="City, Country" />
            <Field label="Notes" value={edu.description} onChange={v => update(i, { description: v })} placeholder="GPA, honors..." rows={2} />
          </EntryCard>
        ))}
      </div>
      <AddBtn onClick={add} label="Add education" />
    </SectionCard>
  );
}

function CertificationsEditor({ resume, onChange }) {
  const update = (i, patch) => {
    const arr = resume.certifications.map((c, idx) => idx === i ? { ...c, ...patch } : c);
    onChange({ ...resume, certifications: arr });
  };
  const add = () => onChange({ ...resume, certifications: [...resume.certifications, newCert()] });
  const remove = (i) => onChange({ ...resume, certifications: resume.certifications.filter((_, idx) => idx !== i) });

  return (
    <SectionCard icon={Award} title="Certifications" accent="bg-yellow-50">
      <div className="space-y-3">
        {resume.certifications.map((cert, i) => (
          <EntryCard key={cert.id} onRemove={() => remove(i)}>
            <Grid2>
              <Field label="Name" value={cert.name} onChange={v => update(i, { name: v })} placeholder="AWS Solutions Architect" />
              <Field label="Issuer" value={cert.issuer} onChange={v => update(i, { issuer: v })} placeholder="Amazon Web Services" />
            </Grid2>
            <Grid2>
              <Field label="Date" value={cert.date} onChange={v => update(i, { date: v })} placeholder="June 2023" />
              <Field label="URL" value={cert.url} onChange={v => update(i, { url: v })} placeholder="https://..." />
            </Grid2>
          </EntryCard>
        ))}
      </div>
      <AddBtn onClick={add} label="Add certification" />
    </SectionCard>
  );
}

function LanguagesEditor({ resume, onChange }) {
  const update = (i, patch) => {
    const arr = (resume.languages || []).map((l, idx) => idx === i ? { ...l, ...patch } : l);
    onChange({ ...resume, languages: arr });
  };
  const add = () => onChange({ ...resume, languages: [...(resume.languages || []), newLang()] });
  const remove = (i) => onChange({ ...resume, languages: (resume.languages || []).filter((_, idx) => idx !== i) });

  return (
    <SectionCard icon={LanguagesIcon} title="Languages" accent="bg-pink-50">
      <div className="space-y-3">
        {(resume.languages || []).map((lang, i) => (
          <EntryCard key={lang.id} onRemove={() => remove(i)}>
            <Grid2>
              <Field label="Language" value={lang.name} onChange={v => update(i, { name: v })} placeholder="English" />
              <Field label="Proficiency" value={lang.level} onChange={v => update(i, { level: v })} placeholder="Native / Fluent / Intermediate" />
            </Grid2>
          </EntryCard>
        ))}
      </div>
      <AddBtn onClick={add} label="Add language" />
    </SectionCard>
  );
}

function CustomSectionsEditor({ resume, onChange }) {
  const update = (si, patch) => {
    const arr = (resume.custom || []).map((s, idx) => idx === si ? { ...s, ...patch } : s);
    onChange({ ...resume, custom: arr });
  };
  const updateEntry = (si, ei, patch) => {
    const sections = [...(resume.custom || [])];
    sections[si] = { ...sections[si], entries: sections[si].entries.map((e, idx) => idx === ei ? { ...e, ...patch } : e) };
    onChange({ ...resume, custom: sections });
  };
  const addSection = () => onChange({ ...resume, custom: [...(resume.custom || []), newCustomSection()] });
  const removeSection = (si) => onChange({ ...resume, custom: (resume.custom || []).filter((_, idx) => idx !== si) });
  const addEntry = (si) => {
    const sections = [...(resume.custom || [])];
    sections[si] = { ...sections[si], entries: [...(sections[si].entries || []), { id: uid(), title: "", subtitle: "", description: "" }] };
    onChange({ ...resume, custom: sections });
  };
  const removeEntry = (si, ei) => {
    const sections = [...(resume.custom || [])];
    sections[si] = { ...sections[si], entries: sections[si].entries.filter((_, idx) => idx !== ei) };
    onChange({ ...resume, custom: sections });
  };

  return (
    <>
      {(resume.custom || []).map((sec, si) => (
        <SectionCard key={sec.id} icon={Grip} title={sec.title || "Custom Section"} accent="bg-muted" onRemove={() => removeSection(si)}>
          <Field label="Section Title" value={sec.title} onChange={v => update(si, { title: v })} placeholder="Volunteer Work, Awards..." />
          <div className="space-y-2">
            {(sec.entries || []).map((entry, ei) => (
              <EntryCard key={entry.id} onRemove={() => removeEntry(si, ei)}>
                <Field label="Title" value={entry.title} onChange={v => updateEntry(si, ei, { title: v })} placeholder="Entry title" />
                <Field label="Subtitle" value={entry.subtitle} onChange={v => updateEntry(si, ei, { subtitle: v })} placeholder="Subtitle or date" />
                <Field label="Description" value={entry.description} onChange={v => updateEntry(si, ei, { description: v })} placeholder="Details..." rows={2} />
              </EntryCard>
            ))}
          </div>
          <AddBtn onClick={() => addEntry(si)} label="Add entry" />
        </SectionCard>
      ))}
      <button
        onClick={addSection}
        className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border py-3.5 text-sm text-muted-foreground font-medium hover:border-brand-mid hover:text-primary transition-all"
      >
        <Plus size={14} /> Add Custom Section
      </button>
    </>
  );
}

// ─── Section registry ─────────────────────────────────────────────────────────

const BUILT_IN_SECTIONS = [
  { key: "summary",        label: "Summary",        icon: FileText },
  { key: "experience",     label: "Experience",     icon: Briefcase },
  { key: "skills",         label: "Skills",         icon: Layers },
  { key: "projects",       label: "Projects",       icon: Code2 },
  { key: "education",      label: "Education",      icon: GraduationCap },
  { key: "certifications", label: "Certifications", icon: Award },
  { key: "languages",      label: "Languages",      icon: LanguagesIcon },
];

// ─── Design Settings Panel ────────────────────────────────────────────────────

function DesignPanel({ fontFamily, onFontChange, accentColor, onAccentChange }) {
  return (
    <div className="space-y-5">
      {/* Font */}
      <div>
        <label className="flex items-center gap-2 text-[12px] font-semibold text-foreground mb-2">
          <Type size={14} /> Font Family
        </label>
        <div className="grid grid-cols-2 gap-2">
          {FONT_OPTIONS.map(f => (
            <button
              key={f}
              onClick={() => onFontChange(f)}
              className={`px-3 py-2 rounded-lg border text-[12px] text-left transition-all ${
                fontFamily === f
                  ? "border-primary bg-brand-sky/50 text-brand-navy font-semibold ring-1 ring-brand-mid/30"
                  : "border-border bg-card text-muted-foreground hover:border-border hover:bg-muted/40"
              }`}
              style={{ fontFamily: f === "Helvetica" ? "'Helvetica Neue', Helvetica, Arial, sans-serif" : `'${f}', sans-serif` }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Accent Color */}
      <div>
        <label className="flex items-center gap-2 text-[12px] font-semibold text-foreground mb-2">
          <Palette size={14} /> Accent Color
        </label>
        <div className="flex flex-wrap gap-2.5">
          {ACCENT_PRESETS.map(c => (
            <button
              key={c}
              onClick={() => onAccentChange(c)}
              className={`w-8 h-8 rounded-full border-2 transition-all ${
                accentColor === c ? "border-foreground scale-110 shadow-md" : "border-border hover:scale-105"
              }`}
              style={{ backgroundColor: c }}
              title={c}
            />
          ))}
        </div>
        <div className="flex items-center gap-2 mt-3">
          <input
            type="color"
            value={accentColor}
            onChange={e => onAccentChange(e.target.value)}
            className="w-8 h-8 rounded cursor-pointer border-0 p-0"
          />
          <input
            type="text"
            value={accentColor}
            onChange={e => onAccentChange(e.target.value)}
            className="flex-1 rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-brand-mid/30"
            placeholder="#2563eb"
          />
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ResumeBuilderPage() {
  const [resume, setResume] = useState(DEFAULT);
  const [generating, setGenerating] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [fontFamily, setFontFamily] = useState("Inter");
  const [accentColor, setAccentColor] = useState("#2563eb");
  const [activeTab, setActiveTab] = useState("edit");
  const [visibleSections, setVisibleSections] = useState(
    () => new Set(["summary", "experience", "skills", "education", "certifications"])
  );

  const previewContainerRef = useRef(null);
  const [previewScale, setPreviewScale] = useState(1);

  useEffect(() => {
    function calcScale() {
      if (!previewContainerRef.current) return;
      const containerW = previewContainerRef.current.clientWidth - 48;
      const scale = Math.min(containerW / 794, 1);
      setPreviewScale(scale);
    }
    calcScale();
    window.addEventListener("resize", calcScale);
    return () => window.removeEventListener("resize", calcScale);
  }, []);

  const toggleSection = (key) => {
    setVisibleSections(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const resetForm = () => {
    setShowResetConfirm(true);
  };

  const confirmResetForm = () => {
    setResume(DEFAULT);
    setFontFamily("Inter");
    setAccentColor("#2563eb");
    setShowResetConfirm(false);
    toast.success("Resume reset.");
  };

  const downloadPDF = async () => {
    const el = document.getElementById("resume-preview");
    if (!el) return toast.error("Preview not ready.");
    setGenerating(true);
    const toastId = toast.loading("Generating high-quality PDF...");
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);

      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ unit: "px", format: "a4", orientation: "portrait" });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();
      const ratio = canvas.height / canvas.width;
      const imgH = pdfW * ratio;

      let yOffset = 0;
      let remaining = imgH;

      while (remaining > 0) {
        pdf.addImage(imgData, "PNG", 0, -yOffset, pdfW, imgH);
        remaining -= pdfH;
        if (remaining > 0) { pdf.addPage(); yOffset += pdfH; }
      }

      const name = (resume.fullName || "resume").replace(/\s+/g, "_").toLowerCase();
      pdf.save(`${name}_resume.pdf`);
      toast.success("PDF downloaded!", { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate PDF.", { id: toastId });
    } finally {
      setGenerating(false);
    }
  };

  const LEFT_TABS = [
    { key: "edit", label: "Editor", icon: PenLine },
    { key: "design", label: "Design & Font", icon: Settings2 },
  ];

  return (
    <ToolPageShell containerClassName="max-w-none" mainClassName="!px-0 !py-0 w-full">
      {/* ── Sticky Top Bar ── */}
      <div className="sticky top-16 z-40 bg-card border-b border-border shadow-sm">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-brand-sky/50">
              <FileText size={16} className="text-primary" />
              <span className="text-sm font-bold text-brand-navy">Resume Builder</span>
            </div>
            <span className="text-sm font-bold text-foreground sm:hidden">Resume Builder</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={resetForm}
              className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-lg px-3 py-2 hover:bg-muted/40 transition"
            >
              <RotateCcw size={13} /> Reset
            </button>

            {/* Mobile: view toggle */}
            <div className="flex sm:hidden border border-border rounded-lg overflow-hidden">
              <button
                onClick={() => setActiveTab("edit")}
                className={`px-3 py-1.5 text-xs font-medium transition ${activeTab === "edit" ? "bg-primary text-white" : "text-muted-foreground"}`}
              >
                <PenLine size={14} />
              </button>
              <button
                onClick={() => setActiveTab("preview")}
                className={`px-3 py-1.5 text-xs font-medium transition ${activeTab === "preview" ? "bg-primary text-white" : "text-muted-foreground"}`}
              >
                <Eye size={14} />
              </button>
            </div>

            <Button
              onClick={downloadPDF}
              disabled={generating}
              className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white text-sm px-4 py-2 rounded-lg shadow-sm"
            >
              <Download size={14} />
              <span className="hidden sm:inline">{generating ? "Generating..." : "Download PDF"}</span>
              <span className="sm:hidden">{generating ? "..." : "PDF"}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* ── Main Layout ── */}
      <div className="flex min-h-[calc(100vh-120px)] bg-muted">

        {/* ── LEFT PANEL (Editor) ── */}
        <div className={`w-full sm:w-[480px] lg:w-[520px] flex-shrink-0 bg-card border-r border-border flex flex-col ${activeTab !== "edit" && activeTab !== "design" ? "hidden sm:flex" : "flex"}`}>

          {/* Panel Tabs */}
          <div className="flex border-b border-border bg-muted/40/80">
            {LEFT_TABS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-[12px] font-semibold transition-all border-b-2 ${
                  activeTab === key || (key === "edit" && activeTab === "edit")
                    ? "border-primary text-brand-navy bg-card"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === "edit" && (
              <>
                {/* Section Toggles */}
                <div className="p-4 border-b border-border bg-muted/40/50">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2.5">Visible Sections</p>
                  <div className="flex flex-wrap gap-2">
                    {BUILT_IN_SECTIONS.map(({ key, label, icon: Icon }) => (
                      <button
                        key={key}
                        onClick={() => toggleSection(key)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all border ${
                          visibleSections.has(key)
                            ? "bg-primary text-white border-primary shadow-sm"
                            : "bg-card text-muted-foreground border-border hover:border-brand-mid hover:text-primary"
                        }`}
                      >
                        <Icon size={11} />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Section Forms */}
                <div className="p-4 space-y-3">
                  <PersonalInfoEditor resume={resume} onChange={setResume} />
                  {visibleSections.has("summary") && <SummaryEditor resume={resume} onChange={setResume} />}
                  {visibleSections.has("experience") && <ExperienceEditor resume={resume} onChange={setResume} />}
                  {visibleSections.has("skills") && <SkillsEditor resume={resume} onChange={setResume} />}
                  {visibleSections.has("projects") && <ProjectsEditor resume={resume} onChange={setResume} />}
                  {visibleSections.has("education") && <EducationEditor resume={resume} onChange={setResume} />}
                  {visibleSections.has("certifications") && <CertificationsEditor resume={resume} onChange={setResume} />}
                  {visibleSections.has("languages") && <LanguagesEditor resume={resume} onChange={setResume} />}
                  <CustomSectionsEditor resume={resume} onChange={setResume} />
                  <div className="h-8" />
                </div>
              </>
            )}

            {activeTab === "design" && (
              <div className="p-5">
                <DesignPanel
                  fontFamily={fontFamily}
                  onFontChange={setFontFamily}
                  accentColor={accentColor}
                  onAccentChange={setAccentColor}
                />
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT PANEL (Live Preview) ── */}
        <div
          ref={previewContainerRef}
          className={`flex-1 overflow-auto bg-muted ${activeTab === "preview" ? "flex" : "hidden sm:flex"} justify-center items-start p-6`}
        >
          <div
            className="shadow-2xl rounded-sm origin-top-left"
            style={{
              transform: `scale(${previewScale})`,
              transformOrigin: "top center",
            }}
          >
            <ResumePreview
              resume={resume}
              fontFamily={fontFamily}
              accentColor={accentColor}
            />
          </div>
        </div>
      </div>

      {showResetConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-xl bg-card shadow-2xl border border-border">
            <div className="px-5 py-4 border-b border-border">
              <h3 className="text-base font-semibold text-foreground">Reset resume data?</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                This will clear all fields and restore default design settings.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-4">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/40 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmResetForm}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition"
              >
                Yes, Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </ToolPageShell>
  );
}

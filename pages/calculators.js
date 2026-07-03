"use client";

import { useState, useEffect, useCallback } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Select } from "../components/ui/select";
import { DatePicker } from "../components/ui/date-picker";
import { TimePicker } from "../components/ui/time-picker";
import { DateTimePicker } from "../components/ui/datetime-picker";
import { Calculator, Calendar, Clock, Scale, Flame, Percent, DollarSign, Globe } from "lucide-react";
import { cn } from "../lib/utils";

const CALCULATOR_SEGMENTS = [
  {
    title: "Date & Time",
    options: [
      { id: "age", label: "Age Calculator", icon: Calendar },
      { id: "date", label: "Date Calculator", icon: Calendar },
      { id: "time", label: "Time Calculator", icon: Clock },
      { id: "timezone", label: "Time Zone Converter", icon: Globe },
    ],
  },
  {
    title: "Health & Body",
    options: [
      { id: "bmi", label: "BMI Calculator", icon: Scale },
      { id: "calorie", label: "Calorie Calculator", icon: Flame },
      { id: "bodyfat", label: "Body Fat Calculator", icon: Scale },
      { id: "bmr", label: "BMR Calculator", icon: Flame },
      { id: "idealweight", label: "Ideal Weight Calculator", icon: Scale },
    ],
  },
  {
    title: "Units & Currency",
    options: [
      { id: "units", label: "Unit Conversion", icon: Calculator },
      { id: "currency", label: "Currency Converter", icon: DollarSign },
    ],
  },
  {
    title: "Percentage & Tip",
    options: [
      { id: "percent", label: "Percentage / Discount / Tip", icon: Percent },
    ],
  },
];

function getTodayISO() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

export default function CalculatorsPage() {
  const [active, setActive] = useState("age");

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8 lg:gap-10">
          {/* Left panel: tool selector */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 p-5 shadow-sm">
              <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
                Calculators & Converters
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                Choose a tool below.
              </p>
              <nav className="space-y-5">
                {CALCULATOR_SEGMENTS.map((segment) => (
                  <div key={segment.title}>
                    <h2 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                      {segment.title}
                    </h2>
                    <div className="space-y-1">
                      {segment.options.map((opt) => {
                        const Icon = opt.icon;
                        return (
                          <button
                            key={opt.id}
                            onClick={() => setActive(opt.id)}
                            className={cn(
                              "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left",
                              active === opt.id
                                ? "bg-primary text-primary-foreground shadow-sm"
                                : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                            )}
                          >
                            <Icon className="h-4 w-4 flex-shrink-0" />
                            <span className="truncate">{opt.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </nav>
            </div>
          </aside>

          {/* Right panel: active calculator */}
          <div className="min-w-0">
            {active === "age" && <AgeCalculator />}
            {active === "date" && <DateCalculator />}
            {active === "time" && <TimeCalculator />}
            {active === "bmi" && <BMICalculator />}
            {active === "calorie" && <CalorieCalculator />}
            {active === "bodyfat" && <BodyFatCalculator />}
            {active === "bmr" && <BMRCalculator />}
            {active === "idealweight" && <IdealWeightCalculator />}
            {active === "units" && <UnitConversion />}
            {active === "currency" && <CurrencyConverter />}
            {active === "timezone" && <TimeZoneConverter />}
            {active === "percent" && <PercentageDiscountTip />}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function AgeCalculator() {
  const [birthDate, setBirthDate] = useState("1990-01-01");
  const [asOfDate, setAsOfDate] = useState(getTodayISO());
  const [result, setResult] = useState(null);

  useEffect(() => {
    const b = new Date(birthDate);
    const a = new Date(asOfDate);
    if (isNaN(b.getTime()) || isNaN(a.getTime()) || b > a) {
      setResult(null);
      return;
    }
    let years = a.getFullYear() - b.getFullYear();
    let months = a.getMonth() - b.getMonth();
    let days = a.getDate() - b.getDate();
    if (days < 0) {
      months--;
      days += new Date(a.getFullYear(), a.getMonth(), 0).getDate();
    }
    if (months < 0) {
      years--;
      months += 12;
    }
    const totalDays = Math.floor((a - b) / (1000 * 60 * 60 * 24));
    setResult({ years, months, days, totalDays });
  }, [birthDate, asOfDate]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Age Calculator</CardTitle>
        <CardDescription>Calculate age from birth date to any date.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Birth date</label>
            <DatePicker value={birthDate} onChange={(e) => setBirthDate(e.target.value)} placeholder="Select date" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">As of date</label>
            <DatePicker value={asOfDate} onChange={(e) => setAsOfDate(e.target.value)} placeholder="Select date" />
          </div>
        </div>
        {result && (
          <div className="p-4 rounded-lg bg-primary/10 text-primary font-medium">
            Age: {result.years} years, {result.months} months, {result.days} days
            <br />
            <span className="text-sm text-slate-600 dark:text-slate-400">Total: {result.totalDays} days</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DateCalculator() {
  const [mode, setMode] = useState("diff"); // diff | add
  const [date1, setDate1] = useState(getTodayISO());
  const [date2, setDate2] = useState(getTodayISO());
  const [addDays, setAddDays] = useState(0);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (mode === "diff") {
      const d1 = new Date(date1);
      const d2 = new Date(date2);
      if (isNaN(d1.getTime()) || isNaN(d2.getTime())) {
        setResult(null);
        return;
      }
      const diff = Math.abs(Math.floor((d2 - d1) / (1000 * 60 * 60 * 24)));
      setResult({ type: "diff", days: diff });
    } else {
      const d = new Date(date1);
      if (isNaN(d.getTime())) {
        setResult(null);
        return;
      }
      d.setDate(d.getDate() + Number(addDays));
      setResult({ type: "add", date: d.toISOString().slice(0, 10) });
    }
  }, [mode, date1, date2, addDays]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Date Calculator</CardTitle>
        <CardDescription>Difference between two dates or add/subtract days from a date.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <button
            onClick={() => setMode("diff")}
            className={cn("px-3 py-1.5 rounded text-sm font-medium", mode === "diff" ? "bg-primary text-primary-foreground" : "bg-slate-100 dark:bg-slate-800")}
          >
            Date difference
          </button>
          <button
            onClick={() => setMode("add")}
            className={cn("px-3 py-1.5 rounded text-sm font-medium", mode === "add" ? "bg-primary text-primary-foreground" : "bg-slate-100 dark:bg-slate-800")}
          >
            Add / Subtract days
          </button>
        </div>
        {mode === "diff" ? (
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">From date</label>
              <DatePicker value={date1} onChange={(e) => setDate1(e.target.value)} placeholder="Select date" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">To date</label>
              <DatePicker value={date2} onChange={(e) => setDate2(e.target.value)} placeholder="Select date" />
            </div>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Start date</label>
              <DatePicker value={date1} onChange={(e) => setDate1(e.target.value)} placeholder="Select date" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Days to add (negative to subtract)</label>
              <input type="number" value={addDays} onChange={(e) => setAddDays(e.target.value)} className="input-theme" />
            </div>
          </div>
        )}
        {result && (
          <div className="p-4 rounded-lg bg-primary/10 text-primary font-medium">
            {result.type === "diff" ? `${result.days} days between dates` : `Result date: ${result.date}`}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TimeCalculator() {
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("17:00");
  const [result, setResult] = useState(null);

  useEffect(() => {
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);
    let mins = (eh * 60 + em) - (sh * 60 + sm);
    if (mins < 0) mins += 24 * 60;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    setResult({ hours: h, minutes: m, totalMinutes: mins });
  }, [start, end]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Time Calculator</CardTitle>
        <CardDescription>Duration between two times.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Start time</label>
            <TimePicker value={start} onChange={(e) => setStart(e.target.value)} placeholder="Select time" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">End time</label>
            <TimePicker value={end} onChange={(e) => setEnd(e.target.value)} placeholder="Select time" />
          </div>
        </div>
        {result && (
          <div className="p-4 rounded-lg bg-primary/10 text-primary font-medium">
            Duration: {result.hours}h {result.minutes}m ({result.totalMinutes} minutes)
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function BMICalculator() {
  const [weight, setWeight] = useState(70);
  const [heightCm, setHeightCm] = useState(170);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!weight || !heightCm || heightCm <= 0) {
      setResult(null);
      return;
    }
    const hM = heightCm / 100;
    const bmi = (weight / (hM * hM)).toFixed(1);
    let category = "";
    if (bmi < 18.5) category = "Underweight";
    else if (bmi < 25) category = "Normal";
    else if (bmi < 30) category = "Overweight";
    else category = "Obese";
    setResult({ bmi, category });
  }, [weight, heightCm]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>BMI Calculator</CardTitle>
        <CardDescription>Body Mass Index from weight and height.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Weight (kg)</label>
            <input type="number" min="1" step="0.1" value={weight} onChange={(e) => setWeight(Number(e.target.value))} className="input-theme" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Height (cm)</label>
            <input type="number" min="1" value={heightCm} onChange={(e) => setHeightCm(Number(e.target.value))} className="input-theme" />
          </div>
        </div>
        {result && (
          <div className="p-4 rounded-lg bg-primary/10 text-primary font-medium">
            BMI: {result.bmi} — {result.category}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CalorieCalculator() {
  const [weight, setWeight] = useState(70);
  const [heightCm, setHeightCm] = useState(170);
  const [age, setAge] = useState(30);
  const [gender, setGender] = useState("male");
  const [activity, setActivity] = useState(1.55); // sedentary 1.2, light 1.375, moderate 1.55, active 1.725, very 1.9
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!weight || !heightCm || !age) return;
    const hM = heightCm / 100;
    // Mifflin-St Jeor
    let bmr = 10 * weight + 6.25 * heightCm - 5 * age;
    if (gender === "male") bmr += 5;
    else bmr -= 161;
    const tdee = Math.round(bmr * activity);
    const maintain = tdee;
    const lose = tdee - 500;
    const gain = tdee + 500;
    setResult({ bmr: Math.round(bmr), maintain, lose, gain });
  }, [weight, heightCm, age, gender, activity]);

  const activityLabels = [
    { value: 1.2, label: "Sedentary" },
    { value: 1.375, label: "Light" },
    { value: 1.55, label: "Moderate" },
    { value: 1.725, label: "Active" },
    { value: 1.9, label: "Very active" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Calorie Calculator</CardTitle>
        <CardDescription>Daily calorie needs (TDEE) based on BMR and activity.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Weight (kg)</label>
            <input type="number" min="1" value={weight} onChange={(e) => setWeight(Number(e.target.value))} className="input-theme" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Height (cm)</label>
            <input type="number" min="1" value={heightCm} onChange={(e) => setHeightCm(Number(e.target.value))} className="input-theme" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Age</label>
            <input type="number" min="1" value={age} onChange={(e) => setAge(Number(e.target.value))} className="input-theme" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Gender</label>
            <Select value={gender} onChange={(e) => setGender(e.target.value)}>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium mb-1">Activity level</label>
            <Select value={activity} onChange={(e) => setActivity(Number(e.target.value))}>
              {activityLabels.map((a) => (
                <option key={a.value} value={a.value}>{a.label}</option>
              ))}
            </Select>
          </div>
        </div>
        {result && (
          <div className="p-4 rounded-lg bg-primary/10 space-y-1 text-primary font-medium">
            <div>Maintain: {result.maintain} cal/day</div>
            <div>Lose (~0.5 kg/week): {result.lose} cal/day</div>
            <div>Gain (~0.5 kg/week): {result.gain} cal/day</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function BodyFatCalculator() {
  const [gender, setGender] = useState("male");
  const [weight, setWeight] = useState(70);
  const [heightCm, setHeightCm] = useState(170);
  const [waistCm, setWaistCm] = useState(80);
  const [neckCm, setNeckCm] = useState(38);
  const [hipCm, setHipCm] = useState(95); // for female
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!weight || !heightCm || !waistCm || !neckCm) return;
    // US Navy method
    let bodyFat;
    if (gender === "male") {
      bodyFat = 495 / (1.0324 - 0.19077 * Math.log10(waistCm - neckCm) + 0.15456 * Math.log10(heightCm)) - 450;
    } else {
      if (!hipCm) return;
      bodyFat = 495 / (1.29579 - 0.35004 * Math.log10(waistCm + hipCm - neckCm) + 0.22100 * Math.log10(heightCm)) - 450;
    }
    if (bodyFat > 0 && bodyFat < 100) setResult({ bodyFat: bodyFat.toFixed(1) });
    else setResult(null);
  }, [gender, weight, heightCm, waistCm, neckCm, hipCm]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Body Fat Calculator</CardTitle>
        <CardDescription>US Navy method (waist, neck, hip, height).</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Gender</label>
          <Select value={gender} onChange={(e) => setGender(e.target.value)}>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </Select>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Weight (kg)</label>
            <input type="number" min="1" value={weight} onChange={(e) => setWeight(Number(e.target.value))} className="input-theme" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Height (cm)</label>
            <input type="number" min="1" value={heightCm} onChange={(e) => setHeightCm(Number(e.target.value))} className="input-theme" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Waist (cm)</label>
            <input type="number" min="1" value={waistCm} onChange={(e) => setWaistCm(Number(e.target.value))} className="input-theme" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Neck (cm)</label>
            <input type="number" min="1" value={neckCm} onChange={(e) => setNeckCm(Number(e.target.value))} className="input-theme" />
          </div>
          {gender === "female" && (
            <div>
              <label className="block text-sm font-medium mb-1">Hip (cm)</label>
              <input type="number" min="1" value={hipCm} onChange={(e) => setHipCm(Number(e.target.value))} className="input-theme" />
            </div>
          )}
        </div>
        {result && (
          <div className="p-4 rounded-lg bg-primary/10 text-primary font-medium">
            Estimated body fat: {result.bodyFat}%
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function BMRCalculator() {
  const [weight, setWeight] = useState(70);
  const [heightCm, setHeightCm] = useState(170);
  const [age, setAge] = useState(30);
  const [gender, setGender] = useState("male");
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!weight || !heightCm || !age) return;
    let bmr = 10 * weight + 6.25 * heightCm - 5 * age;
    if (gender === "male") bmr += 5;
    else bmr -= 161;
    setResult({ bmr: Math.round(bmr) });
  }, [weight, heightCm, age, gender]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>BMR Calculator</CardTitle>
        <CardDescription>Basal Metabolic Rate (Mifflin-St Jeor).</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Weight (kg)</label>
            <input type="number" min="1" value={weight} onChange={(e) => setWeight(Number(e.target.value))} className="input-theme" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Height (cm)</label>
            <input type="number" min="1" value={heightCm} onChange={(e) => setHeightCm(Number(e.target.value))} className="input-theme" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Age</label>
            <input type="number" min="1" value={age} onChange={(e) => setAge(Number(e.target.value))} className="input-theme" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Gender</label>
            <Select value={gender} onChange={(e) => setGender(e.target.value)}>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </Select>
          </div>
        </div>
        {result && (
          <div className="p-4 rounded-lg bg-primary/10 text-primary font-medium">
            BMR: {result.bmr} calories/day
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function IdealWeightCalculator() {
  const [heightCm, setHeightCm] = useState(170);
  const [gender, setGender] = useState("male");
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!heightCm || heightCm <= 0) return;
    const hInch = heightCm / 2.54;
    // Devine formula
    let ideal;
    if (gender === "male") {
      ideal = 50 + 2.3 * (hInch - 60);
    } else {
      ideal = 45.5 + 2.3 * (hInch - 60);
    }
    if (hInch < 60) ideal = gender === "male" ? 50 : 45.5;
    setResult({ kg: ideal.toFixed(1), lb: (ideal * 2.205).toFixed(1) });
  }, [heightCm, gender]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ideal Weight Calculator</CardTitle>
        <CardDescription>Devine formula (height-based).</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Height (cm)</label>
            <input type="number" min="1" value={heightCm} onChange={(e) => setHeightCm(Number(e.target.value))} className="input-theme" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Gender</label>
            <Select value={gender} onChange={(e) => setGender(e.target.value)}>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </Select>
          </div>
        </div>
        {result && (
          <div className="p-4 rounded-lg bg-primary/10 text-primary font-medium">
            Ideal weight: {result.kg} kg ({result.lb} lb)
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const UNIT_GROUPS = {
  length: [
    { name: "Meter", toMeter: 1 },
    { name: "Kilometer", toMeter: 1000 },
    { name: "Centimeter", toMeter: 0.01 },
    { name: "Millimeter", toMeter: 0.001 },
    { name: "Mile", toMeter: 1609.344 },
    { name: "Yard", toMeter: 0.9144 },
    { name: "Foot", toMeter: 0.3048 },
    { name: "Inch", toMeter: 0.0254 },
  ],
  weight: [
    { name: "Kilogram", toKg: 1 },
    { name: "Gram", toKg: 0.001 },
    { name: "Pound", toKg: 0.453592 },
    { name: "Ounce", toKg: 0.0283495 },
  ],
  volume: [
    { name: "Liter", toLiter: 1 },
    { name: "Milliliter", toLiter: 0.001 },
    { name: "Gallon (US)", toLiter: 3.78541 },
    { name: "Fluid ounce (US)", toLiter: 0.0295735 },
    { name: "Cup (US)", toLiter: 0.236588 },
  ],
  temperature: [
    { name: "Celsius", id: "C" },
    { name: "Fahrenheit", id: "F" },
    { name: "Kelvin", id: "K" },
  ],
};

function UnitConversion() {
  const [group, setGroup] = useState("length");
  const [fromUnit, setFromUnit] = useState("Meter");
  const [toUnit, setToUnit] = useState("Kilometer");
  const [fromVal, setFromVal] = useState(1);
  const [result, setResult] = useState(null);

  const units = UNIT_GROUPS[group];
  const isTemp = group === "temperature";

  useEffect(() => {
    if (!units || !fromUnit || !toUnit) return;
    if (isTemp) {
      let celsius = fromVal;
      if (fromUnit === "F") celsius = (fromVal - 32) * 5 / 9;
      if (fromUnit === "K") celsius = fromVal - 273.15;
      let out = celsius;
      if (toUnit === "F") out = celsius * 9 / 5 + 32;
      if (toUnit === "K") out = celsius + 273.15;
      setResult(out.toFixed(2));
    } else {
      const uFrom = units.find((u) => u.name === fromUnit);
      const uTo = units.find((u) => u.name === toUnit);
      if (!uFrom || !uTo) return;
      const baseFrom = uFrom.toMeter ?? uFrom.toKg ?? uFrom.toLiter;
      const baseTo = uTo.toMeter ?? uTo.toKg ?? uTo.toLiter;
      if (baseFrom && baseTo) setResult((fromVal * baseFrom / baseTo).toFixed(6));
    }
  }, [group, fromUnit, toUnit, fromVal, units, isTemp]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Unit Conversion</CardTitle>
        <CardDescription>Length, weight, volume, temperature.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Type</label>
          <Select
            value={group}
            onChange={(e) => {
              const g = e.target.value;
              setGroup(g);
              const u = UNIT_GROUPS[g];
              if (g === "temperature") {
                setFromUnit("C");
                setToUnit("F");
              } else if (u && u.length >= 2) {
                setFromUnit(u[0].name);
                setToUnit(u[1].name);
              } else {
                setFromUnit("");
                setToUnit("");
              }
            }}
          >
            <option value="length">Length</option>
            <option value="weight">Weight</option>
            <option value="volume">Volume</option>
            <option value="temperature">Temperature</option>
          </Select>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">From</label>
            <Select value={fromUnit} onChange={(e) => setFromUnit(e.target.value)} placeholder="Select">
              <option value="">Select</option>
              {group === "temperature"
                ? UNIT_GROUPS.temperature.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)
                : units.map((u) => <option key={u.name} value={u.name}>{u.name}</option>)}
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">To</label>
            <Select value={toUnit} onChange={(e) => setToUnit(e.target.value)} placeholder="Select">
              <option value="">Select</option>
              {group === "temperature"
                ? UNIT_GROUPS.temperature.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)
                : units.map((u) => <option key={u.name} value={u.name}>{u.name}</option>)}
            </Select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Value</label>
          <input type="number" step="any" value={fromVal} onChange={(e) => setFromVal(Number(e.target.value))} className="input-theme" />
        </div>
        {result != null && fromUnit && toUnit && (
          <div className="p-4 rounded-lg bg-primary/10 text-primary font-medium">
            Result: {result}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CurrencyConverter() {
  const [amount, setAmount] = useState(1);
  const [from, setFrom] = useState("USD");
  const [to, setTo] = useState("EUR");
  const [rates, setRates] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchRates = useCallback(async () => {
    setLoading(true);
    setError(null);
    const fromLower = from.toLowerCase();
    const toLower = to.toLowerCase();

    try {
      // Try Frankfurter first (no key, but limited currencies e.g. no BDT)
      const res = await fetch(`https://api.frankfurter.app/latest?from=${from}&to=${to}`);
      if (res.ok) {
        const data = await res.json();
        if (data.rates && data.rates[to] != null) {
          setRates({ rate: data.rates[to], date: data.date });
          setLoading(false);
          return;
        }
      }
      // Fallback: Fawazahmed0 API (supports BDT and 200+ currencies, no key)
      const fallbackRes = await fetch(
        `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${fromLower}.json`
      );
      if (!fallbackRes.ok) throw new Error("Failed to fetch rates");
      const fallbackData = await fallbackRes.json();
      const ratesFrom = fallbackData[fromLower];
      const rate = ratesFrom && ratesFrom[toLower];
      if (rate != null) {
        setRates({ rate, date: fallbackData.date || "—" });
      } else {
        throw new Error("Currency not supported");
      }
    } catch (e) {
      setError(e.message || "Could not fetch live rates. Try again later.");
      setRates(null);
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    fetchRates();
  }, [fetchRates]);

  const result = rates ? (amount * rates.rate).toFixed(4) : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Currency Converter</CardTitle>
        <CardDescription>Live FX rates (Frankfurter + fallback for BDT and more).</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Amount</label>
            <input type="number" step="any" min="0" value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="input-theme" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">From</label>
            <Select value={from} onChange={(e) => setFrom(e.target.value)}>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
              <option value="JPY">JPY</option>
              <option value="CHF">CHF</option>
              <option value="CAD">CAD</option>
              <option value="AUD">AUD</option>
              <option value="INR">INR</option>
              <option value="BDT">BDT</option>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">To</label>
            <Select value={to} onChange={(e) => setTo(e.target.value)}>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
              <option value="JPY">JPY</option>
              <option value="CHF">CHF</option>
              <option value="CAD">CAD</option>
              <option value="AUD">AUD</option>
              <option value="INR">INR</option>
              <option value="BDT">BDT</option>
            </Select>
          </div>
        </div>
        {loading && <p className="text-sm text-slate-500">Loading rates…</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        {result != null && !loading && (
          <div className="p-4 rounded-lg bg-primary/10 text-primary font-medium">
            {amount} {from} = {result} {to}
            {rates?.date && <span className="block text-xs text-slate-500 mt-1">Rate date: {rates.date}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const TZ_OPTIONS = typeof Intl !== "undefined" && Intl.supportedValuesOf
  ? Intl.supportedValuesOf("timeZone")
  : ["UTC", "America/New_York", "America/Los_Angeles", "Europe/London", "Europe/Paris", "Asia/Tokyo", "Asia/Kolkata", "Australia/Sydney"];

function TimeZoneConverter() {
  const [dateTime, setDateTime] = useState(() => {
    const n = new Date();
    return n.toISOString().slice(0, 16);
  });
  const [tzFrom, setTzFrom] = useState("UTC");
  const [tzTo, setTzTo] = useState("America/New_York");
  const [result, setResult] = useState(null);

  useEffect(() => {
    try {
      const fromDate = new Date(dateTime);
      if (isNaN(fromDate.getTime())) {
        setResult(null);
        return;
      }
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: tzTo,
        dateStyle: "full",
        timeStyle: "long",
      });
      setResult(formatter.format(fromDate));
    } catch {
      setResult(null);
    }
  }, [dateTime, tzFrom, tzTo]);

  const tzOptions = TZ_OPTIONS;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Time Zone Converter</CardTitle>
        <CardDescription>Convert date and time between time zones.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Date & time (local)</label>
          <DateTimePicker value={dateTime} onChange={(e) => setDateTime(e.target.value)} placeholder="Select date & time" />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">From time zone</label>
            <Select value={tzFrom} onChange={(e) => setTzFrom(e.target.value)}>
              {tzOptions.map((tz) => (
                <option key={tz} value={tz}>{tz.replace(/_/g, " ")}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">To time zone</label>
            <Select value={tzTo} onChange={(e) => setTzTo(e.target.value)}>
              {tzOptions.map((tz) => (
                <option key={tz} value={tz}>{tz.replace(/_/g, " ")}</option>
              ))}
            </Select>
          </div>
        </div>
        {result && (
          <div className="p-4 rounded-lg bg-primary/10 text-primary font-medium">
            {result}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PercentageDiscountTip() {
  const [mode, setMode] = useState("percent"); // percent | discount | tip
  const [value, setValue] = useState(100);
  const [pct, setPct] = useState(20);
  const [originalPrice, setOriginalPrice] = useState(100);
  const [discountPct, setDiscountPct] = useState(10);
  const [billAmount, setBillAmount] = useState(50);
  const [tipPct, setTipPct] = useState(15);
  const [people, setPeople] = useState(1);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (mode === "percent") {
      setResult((value * pct / 100).toFixed(2));
    } else if (mode === "discount") {
      const discount = originalPrice * discountPct / 100;
      setResult({ final: (originalPrice - discount).toFixed(2), saved: discount.toFixed(2) });
    } else {
      const tip = billAmount * tipPct / 100;
      const total = billAmount + tip;
      setResult({
        total: total.toFixed(2),
        tip: tip.toFixed(2),
        perPerson: people > 1 ? (total / people).toFixed(2) : null,
      });
    }
  }, [mode, value, pct, originalPrice, discountPct, billAmount, tipPct, people]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Percentage / Discount / Tip Calculator</CardTitle>
        <CardDescription>Calculate percentage of a number, discount, or tip.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setMode("percent")} className={cn("px-3 py-1.5 rounded text-sm font-medium", mode === "percent" ? "bg-primary text-primary-foreground" : "bg-slate-100 dark:bg-slate-800")}>Percentage</button>
          <button onClick={() => setMode("discount")} className={cn("px-3 py-1.5 rounded text-sm font-medium", mode === "discount" ? "bg-primary text-primary-foreground" : "bg-slate-100 dark:bg-slate-800")}>Discount</button>
          <button onClick={() => setMode("tip")} className={cn("px-3 py-1.5 rounded text-sm font-medium", mode === "tip" ? "bg-primary text-primary-foreground" : "bg-slate-100 dark:bg-slate-800")}>Tip</button>
        </div>
        {mode === "percent" && (
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Value</label>
              <input type="number" step="any" value={value} onChange={(e) => setValue(Number(e.target.value))} className="input-theme" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Percentage (%)</label>
              <input type="number" step="any" value={pct} onChange={(e) => setPct(Number(e.target.value))} className="input-theme" />
            </div>
          </div>
        )}
        {mode === "discount" && (
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Original price</label>
              <input type="number" step="any" value={originalPrice} onChange={(e) => setOriginalPrice(Number(e.target.value))} className="input-theme" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Discount (%)</label>
              <input type="number" step="any" value={discountPct} onChange={(e) => setDiscountPct(Number(e.target.value))} className="input-theme" />
            </div>
          </div>
        )}
        {mode === "tip" && (
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Bill amount</label>
              <input type="number" step="any" value={billAmount} onChange={(e) => setBillAmount(Number(e.target.value))} className="input-theme" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tip (%)</label>
              <input type="number" step="any" value={tipPct} onChange={(e) => setTipPct(Number(e.target.value))} className="input-theme" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Split between (people)</label>
              <input type="number" min="1" value={people} onChange={(e) => setPeople(Number(e.target.value))} className="input-theme" />
            </div>
          </div>
        )}
        {result != null && (
          <div className="p-4 rounded-lg bg-primary/10 text-primary font-medium">
            {mode === "percent" && `${pct}% of ${value} = ${result}`}
            {mode === "discount" && typeof result === "object" && (
              <>Final price: {result.final} (saved {result.saved})</>
            )}
            {mode === "tip" && typeof result === "object" && (
              <>Total: {result.total} | Tip: {result.tip}{result.perPerson != null ? ` | Each pays: ${result.perPerson}` : ""}</>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

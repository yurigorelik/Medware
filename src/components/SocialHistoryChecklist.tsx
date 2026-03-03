"use client";

export interface SocialHistoryData {
  smoking: string;
  smokingDetails: string;
  alcohol: string;
  alcoholDetails: string;
  drugs: string;
  drugDetails: string;
}

export const defaultSocialHistory: SocialHistoryData = {
  smoking: "",
  smokingDetails: "",
  alcohol: "",
  alcoholDetails: "",
  drugs: "",
  drugDetails: "",
};

interface SocialHistoryChecklistProps {
  value: SocialHistoryData;
  onChange: (value: SocialHistoryData) => void;
}

export default function SocialHistoryChecklist({
  value,
  onChange,
}: SocialHistoryChecklistProps) {
  function handleChange(field: keyof SocialHistoryData, val: string) {
    onChange({ ...value, [field]: val });
  }

  return (
    <div>
      <label className="label">Social History</label>
      <div className="space-y-4 border border-gray-200 rounded-lg p-4 bg-gray-50">
        {/* Smoking */}
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="text-sm font-medium text-gray-700 w-20">
              Smoking
            </span>
            <div className="flex flex-wrap gap-2">
              {["Never", "Former", "Current"].map((opt) => (
                <label
                  key={opt}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm cursor-pointer border transition-colors ${
                    value.smoking === opt
                      ? "bg-primary-100 border-primary-400 text-primary-800"
                      : "bg-white border-gray-300 text-gray-600 hover:border-gray-400"
                  }`}
                >
                  <input
                    type="radio"
                    name="smoking"
                    value={opt}
                    checked={value.smoking === opt}
                    onChange={(e) => handleChange("smoking", e.target.value)}
                    className="sr-only"
                  />
                  {opt}
                </label>
              ))}
            </div>
          </div>
          {(value.smoking === "Former" || value.smoking === "Current") && (
            <input
              type="text"
              value={value.smokingDetails}
              onChange={(e) => handleChange("smokingDetails", e.target.value)}
              className="input-field mt-1 ml-[5.25rem]"
              placeholder={
                value.smoking === "Former"
                  ? "e.g., Quit 5 years ago, 10 pack-years"
                  : "e.g., 1 pack/day for 10 years"
              }
            />
          )}
        </div>

        {/* Alcohol */}
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="text-sm font-medium text-gray-700 w-20">
              Alcohol
            </span>
            <div className="flex flex-wrap gap-2">
              {["Never", "Occasional", "Regular", "Heavy"].map((opt) => (
                <label
                  key={opt}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm cursor-pointer border transition-colors ${
                    value.alcohol === opt
                      ? "bg-primary-100 border-primary-400 text-primary-800"
                      : "bg-white border-gray-300 text-gray-600 hover:border-gray-400"
                  }`}
                >
                  <input
                    type="radio"
                    name="alcohol"
                    value={opt}
                    checked={value.alcohol === opt}
                    onChange={(e) => handleChange("alcohol", e.target.value)}
                    className="sr-only"
                  />
                  {opt}
                </label>
              ))}
            </div>
          </div>
          {value.alcohol && value.alcohol !== "Never" && (
            <input
              type="text"
              value={value.alcoholDetails}
              onChange={(e) => handleChange("alcoholDetails", e.target.value)}
              className="input-field mt-1 ml-[5.25rem]"
              placeholder="e.g., 2-3 drinks/week, wine socially"
            />
          )}
        </div>

        {/* Drugs */}
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="text-sm font-medium text-gray-700 w-20">
              Drugs
            </span>
            <div className="flex flex-wrap gap-2">
              {["Never", "Former", "Current"].map((opt) => (
                <label
                  key={opt}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm cursor-pointer border transition-colors ${
                    value.drugs === opt
                      ? "bg-primary-100 border-primary-400 text-primary-800"
                      : "bg-white border-gray-300 text-gray-600 hover:border-gray-400"
                  }`}
                >
                  <input
                    type="radio"
                    name="drugs"
                    value={opt}
                    checked={value.drugs === opt}
                    onChange={(e) => handleChange("drugs", e.target.value)}
                    className="sr-only"
                  />
                  {opt}
                </label>
              ))}
            </div>
          </div>
          {(value.drugs === "Former" || value.drugs === "Current") && (
            <input
              type="text"
              value={value.drugDetails}
              onChange={(e) => handleChange("drugDetails", e.target.value)}
              className="input-field mt-1 ml-[5.25rem]"
              placeholder="e.g., Cannabis occasionally, no IV drug use"
            />
          )}
        </div>
      </div>
    </div>
  );
}

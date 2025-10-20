import { Foundation } from "@/app/lib/types";
import Link from "next/link";
import { useState } from "react";

export default function FoundationEditor({
  foundation,
  onSave,
}: {
  foundation: Foundation;
  onSave: (updates: Partial<Foundation>) => void;
}) {
  const [form, setForm] = useState<Foundation>(
    foundation ?? {
      id: 0,
      name: "",
      contact: "",
      website: "",
      founding_year: undefined,
      average_class_size: undefined,
      balance_sheet: undefined,
      district_id: 0,
    }
  );

  const handleChange = (field: keyof Foundation, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
  };
  if (!form) return <div>Loading...</div>;
  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 bg-white p-4 rounded shadow-md"
    >
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Foundation Name
        </label>
        <input
          type="text"
          value={form.name as string}
          onChange={(e) => handleChange("name", e.target.value)}
          className="mt-1 block w-full border border-gray-300 rounded px-3 py-2"
        />
      </div>
      <Link href={`/districts/${foundation.district_id}`}>
        <div className="text-lg font-semibold text-gray-500 text-center">
          {foundation.district_id}
        </div>
      </Link>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Contact
        </label>
        <input
          type="text"
          value={form.contact as string}
          onChange={(e) => handleChange("contact", e.target.value)}
          className="mt-1 block w-full border border-gray-300 rounded px-3 py-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Website
        </label>
        <input
          type="url"
          value={form.website as string}
          onChange={(e) => handleChange("website", e.target.value)}
          className="mt-1 block w-full border border-gray-300 rounded px-3 py-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Founding Year
        </label>
        <input
          type="number"
          value={form.founding_year ?? ""}
          onChange={(e) =>
            handleChange("founding_year", Number(e.target.value))
          }
          className="mt-1 block w-full border border-gray-300 rounded px-3 py-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Avg Class Size
        </label>
        <input
          type="number"
          step="0.1"
          value={form.average_class_size ?? ""}
          onChange={(e) =>
            handleChange("average_class_size", Number(e.target.value))
          }
          className="mt-1 block w-full border border-gray-300 rounded px-3 py-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Balance Sheet ($)
        </label>
        <input
          type="number"
          value={form.balance_sheet ?? ""}
          onChange={(e) =>
            handleChange("balance_sheet", Number(e.target.value))
          }
          className="mt-1 block w-full border border-gray-300 rounded px-3 py-2"
        />
      </div>

      <button
        type="submit"
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        Save Foundation
      </button>
    </form>
  );
}

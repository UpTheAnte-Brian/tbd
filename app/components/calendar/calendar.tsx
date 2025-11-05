import React, { useState } from "react";

type CalendarProps = {
  month: number; // 0 = Jan, 11 = Dec
  year: number;
  campaignDays: Date[]; // Days when the business is signed up
  initialData?: Record<string, number>; // key = 'YYYY-MM-DD', value = expected transactions
  onChange?: (data: Record<string, number>) => void;
};

export const Calendar: React.FC<CalendarProps> = ({
  month,
  year,
  campaignDays,
  initialData = {},
  onChange,
}) => {
  const [data, setData] = useState<Record<string, number>>(initialData);

  // const startOfMonth = new Date(year, month, 1);
  const endOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = endOfMonth.getDate();

  const handleChange = (dateStr: string, value: number) => {
    const updated = { ...data, [dateStr]: value };
    setData(updated);
    if (onChange) onChange(updated);
  };

  const isCampaignDay = (date: Date) =>
    campaignDays.some(
      (d) =>
        d.getFullYear() === date.getFullYear() &&
        d.getMonth() === date.getMonth() &&
        d.getDate() === date.getDate()
    );

  const renderDays = () => {
    const cells = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateStr = date.toISOString().split("T")[0]; // YYYY-MM-DD
      cells.push(
        <div
          key={dateStr}
          style={{
            border: "1px solid #ccc",
            padding: "8px",
            backgroundColor: isCampaignDay(date) ? "#e0f7fa" : "#fff",
          }}
        >
          <div>{day}</div>
          {isCampaignDay(date) && (
            <input
              type="number"
              min={0}
              value={data[dateStr] || ""}
              onChange={(e) => handleChange(dateStr, Number(e.target.value))}
              placeholder="Expected transactions"
              style={{ width: "100%" }}
            />
          )}
        </div>
      );
    }
    return cells;
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(7, 1fr)",
        gap: "4px",
      }}
    >
      {renderDays()}
    </div>
  );
};

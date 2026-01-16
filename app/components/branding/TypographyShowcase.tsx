"use client";

import { useBranding } from "@/app/providers/EntityThemeProviderClient";

interface Block {
  label: string;
  font: string;
  size: string;
}

const blocks: Block[] = [
  { label: "Header One", font: "header1", size: "Size 46 pt" },
  { label: "Header Two", font: "header2", size: "Size 26 pt" },
  { label: "Subheader", font: "subheader", size: "Size 18 pt" },
  { label: "Body Copy", font: "body", size: "Size 10 pt" },
];

export function TypographyShowcase() {
  const { colors, fonts } = useBranding();
  const highlight = colors.secondary1 || colors.primary1 || "#cfe8ff";
  const textColor = colors.secondary0 || "#0f172a";
  const fontFor = (key: string) => {
    switch (key) {
      case "header1":
        return fonts.header1 || fonts.header2 || fonts.display || fonts.body;
      case "header2":
        return fonts.header2 || fonts.header1 || fonts.display || fonts.body;
      case "subheader":
        return fonts.subheader || fonts.header2 || fonts.body;
      case "body":
      default:
        return fonts.body || fonts.header2;
    }
  };
  const headingFont = fontFor("header1");
  const bodyFont = fontFor("body");

  return (
    <div className="mt-10 rounded-lg border border-brand-secondary-1 bg-brand-secondary-2 p-6">
      <div className="flex flex-col gap-8 md:flex-row md:items-start">
        <div className="flex flex-col gap-6 text-sm text-brand-secondary-0 md:w-1/4">
          <div className="text-xs uppercase tracking-wide text-brand-secondary-0 opacity-60">
            Typography
          </div>
          {blocks.map((b) => (
            <div key={b.label} className="space-y-0.5">
              <div className="font-semibold uppercase text-brand-secondary-0">
                {b.label}
              </div>
              <div className="capitalize text-brand-secondary-0 opacity-70">
                {b.font.replace(/header/, "header ")}
              </div>
              <div className="text-brand-secondary-0 opacity-60">{b.size}</div>
            </div>
          ))}
        </div>

        <div className="flex-1 space-y-3 md:space-y-4">
          <div
            className="inline-block px-3 py-2 text-5xl leading-none md:text-6xl"
            style={{
              backgroundColor: highlight,
              color: textColor,
              fontFamily: headingFont,
            }}
          >
            Minnesota
            <br />
            Public Schools
          </div>

          <div
            className="inline-block px-3 py-2 text-3xl font-extrabold leading-snug md:text-4xl"
            style={{
              backgroundColor: highlight,
              color: textColor,
              fontFamily: headingFont,
            }}
          >
            Small School Advantages.
            <br />
            Big School Opportunities.
          </div>

          <div
            className="inline-block px-3 py-2 text-2xl font-medium leading-snug md:text-3xl"
            style={{
              backgroundColor: highlight,
              color: textColor,
              fontFamily: headingFont,
            }}
          >
            An educational community experience unlike any other.
          </div>

          <div
            className="px-3 py-2 text-base font-light leading-relaxed md:text-lg"
            style={{
              backgroundColor: highlight,
              color: textColor,
              fontFamily: bodyFont,
            }}
          >
            Mo mauris rem incindanis sequos alibus, ne officipsa ne dolorem
            velesti orecitor aperiat upica con re mi quos vera con pa conestis
            event. Licis vei miliquiis et intemiscie di in quid nonemos atibate
            atendusandi culparcienid aut aut fuga nonsed ullandae ipidi qui. Dis
            ut essequam soluptas sima ius et quam dolupta cuptatur, sa
            nonsequibus quiatent endi sit moluptati dolupta tistiam, te perfer
            eration commolique volit ium imeniat lit volorest as duscipientam.
            Itatisint quatur, ente officia re dus doluptas and qui dest quas
            acepta nitatispe notibati entibuscium ut eos et, testi non num num
            eos et aut et repeq quam aut moditia qui.
          </div>
        </div>
      </div>
    </div>
  );
}

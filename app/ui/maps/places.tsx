import Autocomplete from "@mui/material/Autocomplete";
import React from "react";
import usePlacesAutocomplete, {
  getGeocode,
  getLatLng,
} from "use-places-autocomplete";
import TextField from "@mui/material/TextField";
import { debounce } from "@mui/material/utils";
import { useTheme } from "@mui/material/styles";

import LocationOnIcon from "@mui/icons-material/LocationOn";
import parse from "autosuggest-highlight/parse";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Grid2 from "@mui/material/Grid2";
import Paper, { PaperProps } from "@mui/material/Paper";
import PlaceSearch from "./place-search";

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

interface MainTextMatchedSubstrings {
  offset: number;
  length: number;
}
interface StructuredFormatting {
  main_text: string;
  main_text_matched_substrings: readonly MainTextMatchedSubstrings[];
  secondary_text?: string;
}
interface PlaceType {
  description: string;
  structured_formatting: StructuredFormatting;
}
type PlacesProps = {
  setPoint: (position: google.maps.LatLngLiteral) => void;
};
const emptyOptions = [] as any;

function Places({ setPoint }: PlacesProps) {
  const {
    ready,
    value,
    setValue,
    suggestions: { status, data },
    clearSuggestions,
  } = usePlacesAutocomplete();

  const handleSelect = async (val: string) => {
    setValue(val, true);
    clearSuggestions();

    const results = await getGeocode({ address: val });
    const { lat, lng } = await getLatLng(results[0]);
    setPoint({ lat, lng });
  };
  return (
    <>
      <label>
        Text input:
        <PlaceSearch setPoint={handleSelect}></PlaceSearch>
      </label>
      <hr />
    </>
  );
}

export default React.memo(Places);

const fakeAnswer = {
  p: [
    {
      description: "Portugal",
      structured_formatting: {
        main_text: "Portugal",
        main_text_matched_substrings: [{ offset: 0, length: 1 }],
      },
    },
    {
      description: "Puerto Rico",
      structured_formatting: {
        main_text: "Puerto Rico",
        main_text_matched_substrings: [{ offset: 0, length: 1 }],
      },
    },
    {
      description: "Pakistan",
      structured_formatting: {
        main_text: "Pakistan",
        main_text_matched_substrings: [{ offset: 0, length: 1 }],
      },
    },
    {
      description: "Philippines",
      structured_formatting: {
        main_text: "Philippines",
        main_text_matched_substrings: [{ offset: 0, length: 1 }],
      },
    },
    {
      description: "Paris, France",
      structured_formatting: {
        main_text: "Paris",
        main_text_matched_substrings: [{ offset: 0, length: 1 }],
        secondary_text: "France",
      },
    },
  ],
  paris: [
    {
      description: "Paris, France",
      structured_formatting: {
        main_text: "Paris",
        main_text_matched_substrings: [{ offset: 0, length: 5 }],
        secondary_text: "France",
      },
    },
    {
      description: "Paris, TX, USA",
      structured_formatting: {
        main_text: "Paris",
        main_text_matched_substrings: [{ offset: 0, length: 5 }],
        secondary_text: "TX, USA",
      },
    },
    {
      description: "Paris Beauvais Airport, Route de l'Aéroport, Tillé, France",
      structured_formatting: {
        main_text: "Paris Beauvais Airport",
        main_text_matched_substrings: [{ offset: 0, length: 5 }],
        secondary_text: "Route de l'Aéroport, Tillé, France",
      },
    },
    {
      description:
        "Paris Las Vegas, South Las Vegas Boulevard, Las Vegas, NV, USA",
      structured_formatting: {
        main_text: "Paris Las Vegas",
        main_text_matched_substrings: [{ offset: 0, length: 5 }],
        secondary_text: "South Las Vegas Boulevard, Las Vegas, NV, USA",
      },
    },
    {
      description:
        "Paris La Défense Arena, Jardin de l'Arche, Nanterre, France",
      structured_formatting: {
        main_text: "Paris La Défense Arena",
        main_text_matched_substrings: [{ offset: 0, length: 5 }],
        secondary_text: "Jardin de l'Arche, Nanterre, France",
      },
    },
  ],
};

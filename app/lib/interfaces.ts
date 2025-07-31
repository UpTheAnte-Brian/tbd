import { Feature, Geometry } from "geojson";

export interface ExtendedFeature extends Feature<Geometry, DistrictProperties> {
    centroid_lat?: number;
    centroid_lng?: number;
}
export interface DistrictProperties {
    ACRES: string;
    FORMID: string;
    SDTYPE: string;
    SDORGID: string;
    SQMILES: string;
    WEB_URL: string;
    PREFNAME: string;
    SDNUMBER: string;
    SHORTNAME: string;
    Shape_Area: string;
    Shape_Leng: string;
}

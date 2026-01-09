import type { Feature, FeatureCollection, Geometry } from "geojson";

export type EntityMapProperties = {
    entity_id: string;
    entity_type: string;
    slug: string | null;
    name: string | null;
    active: boolean;
    child_count: number;
};

export type EntityFeature = Feature<
    Geometry,
    EntityMapProperties
>;

export type EntityFeatureCollection = FeatureCollection<
    Geometry,
    EntityMapProperties
>;

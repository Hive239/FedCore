declare module '@mapbox/mapbox-gl-geocoder' {
  import { LngLatLike, FitBoundsOptions, Map } from 'mapbox-gl';

  export interface GeocoderOptions {
    accessToken: string;
    mapboxgl?: any;
    marker?: boolean | { color?: string };
    placeholder?: string;
    proximity?: LngLatLike;
    trackProximity?: boolean;
    collapsed?: boolean;
    clearAndBlurOnEsc?: boolean;
    clearOnBlur?: boolean;
    bbox?: [number, number, number, number];
    countries?: string;
    types?: string;
    minLength?: number;
    limit?: number;
    language?: string;
    filter?: (item: any) => boolean;
    localGeocoder?: (query: string) => any[];
    reverseGeocode?: boolean;
    enableEventLogging?: boolean;
    render?: (item: any) => string;
    getItemValue?: (item: any) => string;
    mode?: 'mapbox.places' | 'mapbox.places-permanent';
    localGeocoderOnly?: boolean;
  }

  export default class MapboxGeocoder {
    constructor(options: GeocoderOptions);
    addTo(container: string | HTMLElement): this;
    onAdd(map: Map): HTMLElement;
    onRemove(): void;
    setInput(value: string): this;
    setProximity(proximity: LngLatLike): this;
    getProximity(): LngLatLike;
    setRenderFunction(fn: (item: any) => string): this;
    getRenderFunction(): (item: any) => string;
    setLanguage(language: string): this;
    getLanguage(): string;
    getZoom(): number;
    setZoom(zoom: number): this;
    getFlyTo(): boolean | FitBoundsOptions;
    setFlyTo(flyTo: boolean | FitBoundsOptions): this;
    getPlaceholder(): string;
    setPlaceholder(placeholder: string): this;
    getBbox(): [number, number, number, number];
    setBbox(bbox: [number, number, number, number]): this;
    getCountries(): string;
    setCountries(countries: string): this;
    getTypes(): string;
    setTypes(types: string): this;
    getMinLength(): number;
    setMinLength(minLength: number): this;
    getLimit(): number;
    setLimit(limit: number): this;
    getFilter(): (item: any) => boolean;
    setFilter(filter: (item: any) => boolean): this;
    setOrigin(origin: string): this;
    getOrigin(): string;
    setAutocomplete(autocomplete: boolean): this;
    getAutocomplete(): boolean;
    setFuzzyMatch(fuzzyMatch: boolean): this;
    getFuzzyMatch(): boolean;
    setRouting(routing: boolean): this;
    getRouting(): boolean;
    setWorldview(worldview: string): this;
    getWorldview(): string;
    query(query: string): this;
    clear(ev?: Event): void;
    clearSuggestions(): void;
    on(type: string, fn: Function): this;
    off(type: string, fn: Function): this;
  }
}
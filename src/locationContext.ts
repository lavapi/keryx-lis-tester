import type { Location } from "./locations.js";

const POLYGON_OFFSET_DEGREES = 0.001;
const DEFAULT_ALTITUDE_METRES = "50.0";

const formatCoord = (n: number): string => n.toFixed(6);

const buildPolygonPosList = (latitude: number, longitude: number): string => {
  const latNorth = latitude + POLYGON_OFFSET_DEGREES;
  const latSouth = latitude - POLYGON_OFFSET_DEGREES;
  const lonEast = longitude + POLYGON_OFFSET_DEGREES;
  const lonWest = longitude - POLYGON_OFFSET_DEGREES;
  return [
    `${formatCoord(latNorth)} ${formatCoord(lonWest)}`,
    `${formatCoord(latNorth)} ${formatCoord(lonEast)}`,
    `${formatCoord(latSouth)} ${formatCoord(lonEast)}`,
    `${formatCoord(latSouth)} ${formatCoord(lonWest)}`,
    `${formatCoord(latNorth)} ${formatCoord(lonWest)}`,
  ].join(" ");
};

export const buildLocationContext = (loc: Location): Record<string, string> => ({
  latitude: formatCoord(loc.latitude),
  longitude: formatCoord(loc.longitude),
  altitude: DEFAULT_ALTITUDE_METRES,
  streetNumber: loc.streetNumber,
  streetName: loc.streetName,
  streetSuffix: loc.streetSuffix,
  city: loc.city,
  county: loc.county,
  state: "CA",
  country: "US",
  postalCode: loc.postalCode,
  building: loc.extended.building,
  floor: loc.extended.floor,
  room: loc.extended.room,
  placeType: loc.extended.placeType,
  name: loc.extended.name,
  landmark: loc.extended.landmark,
  polygonPosList: buildPolygonPosList(loc.latitude, loc.longitude),
});

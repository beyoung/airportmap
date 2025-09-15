import maplibregl from "maplibre-gl";

// Props interface for mini map
interface MiniMapProps {
  latitude: number;
  longitude: number;
  name: string;
  ident: string;
  municipality?: string;
  iso_country?: string;
}

// Initialize mini map with given props
export function initMiniMap(props: MiniMapProps) {
  const { latitude, longitude, name, ident, municipality, iso_country } = props;

  // Get DOM elements
  const miniMapContainer = document.getElementById("mini-map");
  const loadingEl = document.getElementById("mini-map-loading");

  if (miniMapContainer && latitude && longitude) {
    // Clear the mini-map container
    miniMapContainer.innerHTML = "";

    // Create map instance
    const map = new maplibregl.Map({
      container: miniMapContainer,
      style: {
        version: 8,
        glyphs: "https://fonts.openmaptiles.org/{fontstack}/{range}.pbf",
        sources: {
          "raster-tiles": {
            type: "raster",
            tiles: [
              "https://api.maptiler.com/maps/satellite/256/{z}/{x}/{y}.jpg?key=48F3wFYg8K0uzswJ8cdr",
            ],
            tileSize: 256,
            attribution: "© OpenStreetMap contributors",
          },
        },
        layers: [
          {
            id: "simple-tiles",
            type: "raster",
            source: "raster-tiles",
            minzoom: 0,
            maxzoom: 14,
          },
        ],
      },
      center: [longitude, latitude],
      zoom: 12,
      maxZoom: 18,
      minZoom: 1,
    });

    // Hide loading indicator when map loads
    map.on("load", () => {
      if (loadingEl) {
        loadingEl.style.display = "none";
      }

      // Add fullscreen control
      map.addControl(new maplibregl.FullscreenControl(), 'top-right');

      // Add airport marker
      new maplibregl.Marker({
        color: "#ef4444",
      })
        .setLngLat([longitude, latitude])
        .addTo(map);

      map.addSource("airports", {
        type: "vector",
        tiles: ["https://tiles.ayamap.com/airport/{z}/{x}/{y}.mvt"],
        attribution: "© RadiosMap",
      });

      // Add airport points layer
      map.addLayer({
        id: "airports-points",
        type: "circle",
        source: "airports",
        "source-layer": "airports",
        paint: {
          "circle-color": "#08ff18",
          "circle-radius": 2,
          "circle-stroke-width": 2,
          "circle-stroke-color": "#08ff18",
        },
        minzoom: 0,
        maxzoom: 18,
      });

      // Add airport labels layer
      map.addLayer({
        id: "airports-labels",
        type: "symbol",
        source: "airports",
        "source-layer": "airports",
        layout: {
          "text-field": ["get", "ident"],
          "text-font": ["Noto Sans Regular"],
          "text-size": 12,
          "text-offset": [0, 1.5],
          "text-anchor": "top",
          "text-allow-overlap": false,
          "text-ignore-placement": false,
        },
        paint: {
          "text-color": "#ffffff",
          "text-halo-color": "#000000",
          "text-halo-width": 1,
        },
        minzoom: 8,
        maxzoom: 18,
      });

      // Change cursor on hover for both points and labels
      map.on("mouseenter", "airports-points", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "airports-points", () => {
        map.getCanvas().style.cursor = "";
      });
      map.on("mouseenter", "airports-labels", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "airports-labels", () => {
        map.getCanvas().style.cursor = "";
      });
    });
    
    return map;
  }
  
  return null;
}
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
        glyphs:
          "https://api.maptiler.com/fonts/{fontstack}/{range}.pbf?key=48F3wFYg8K0uzswJ8cdr", // 添加字体支持
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
      maxZoom: 14,
      minZoom: 1,
    });

    // Hide loading indicator when map loads
    map.on("load", () => {
      if (loadingEl) {
        loadingEl.style.display = "none";
      }

      // Add fullscreen control
      map.addControl(new maplibregl.FullscreenControl(), "top-right");

      // Add airport marker
      new maplibregl.Marker({
        color: "#ef4444",
      })
        .setLngLat([longitude, latitude])
        .addTo(map);

      map.addSource("airports", {
        type: "vector",
        tiles: ["https://tiles.ayamap.com/airport/{z}/{x}/{y}.mvt"],
        attribution: "© ayamap",
        minzoom: 0,
        maxzoom: 4, // 与PMTiles数据的maxzoom保持一致
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
        maxzoom: 14,
      });

      // Add airport points layer
      map.addLayer({
        id: "airports-points",
        type: "circle",
        source: "airports",
        "source-layer": "airports",
        paint: {
          "circle-color": "#08ff18",
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            0,
            0.5, // 在缩放级别0时，圆点半径为1
            2,
            0.6, // 在缩放级别2时，圆点半径为2
            4,
            0.8, // 在缩放级别4时，圆点半径为4
            8,
            1.2, // 在缩放级别8时，圆点半径为6
            12,
            1.6, // 在缩放级别12时，圆点半径为8
          ],
          "circle-stroke-width": [
            "interpolate",
            ["linear"],
            ["zoom"],
            0,
            0.5, // 在缩放级别0时，边框宽度为1
            2,
            0.6, // 在缩放级别2时，边框宽度为2
            4,
            0.8, // 在缩放级别4时，边框宽度为3
            8,
            1.2, // 在缩放级别8时，边框宽度为4
            12,
            1.6, // 在缩放级别12时，边框宽度为5
          ],
          "circle-stroke-color": "#08ff18",
        },
        minzoom: 0,
        maxzoom: 14, // 允许图层在更高缩放级别显示，使用最后一级的瓦片数据
      });

      // Add airport labels layer
      map.addLayer({
        id: "airports-labels",
        type: "symbol",
        source: "airports",
        "source-layer": "airports",
        layout: {
          "text-field": [
            "case",
            ["has", "name"],
            ["get", "name"], // 优先使用name字段
            ["has", "ident"],
            ["get", "ident"], // 如果没有name则使用ident
            "", // 都没有则为空
          ],
          "text-font": ["Open Sans Regular", "Arial Unicode MS Regular"],
          "text-size": [
            "interpolate",
            ["linear"],
            ["zoom"],
            8,
            12, // 在缩放级别8时，字体大小为12
            12,
            14, // 在缩放级别12时，字体大小为14
          ],
          "text-offset": [0, 1.5], // 文字偏移，避免与圆点重叠
          "text-anchor": "top",
          "text-allow-overlap": false, // 避免文字重叠
          "text-optional": true,
        },
        paint: {
          "text-color": "#ffffff",
          "text-halo-color": "#000000",
          "text-halo-width": 1.5,
          "text-opacity": [
            "interpolate",
            ["linear"],
            ["zoom"],
            8,
            0.8, // 在缩放级别4时，透明度为0.8
            10,
            1.0, // 在缩放级别8及以上时，完全不透明
          ],
        },
        minzoom: 6, // 从缩放级别3开始显示文字，避免低缩放时过于拥挤
        maxzoom: 14, // 允许在更高缩放级别显示
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

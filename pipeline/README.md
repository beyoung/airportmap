# 全球机场数据 PMTiles 转换

本项目将全球机场CSV数据转换为PMTiles格式，用于高效的地图瓦片服务。

## 文件说明

- `airports.csv` - 原始机场数据（83,248条记录）
- `csv_to_geojson.py` - CSV到GeoJSON转换脚本
- `airports.geojson` - 中间GeoJSON文件（36MB）
- `airports.pmtiles` - 最终PMTiles文件（93MB）

## 数据字段

### 几何信息
- `latitude_deg` - 纬度（转换为GeoJSON Point几何）
- `longitude_deg` - 经度（转换为GeoJSON Point几何）

### 属性信息
- `id` - 机场唯一标识符
- `ident` - 机场代码
- `type` - 机场类型（small_airport, heliport, large_airport等）
- `name` - 机场名称
- `elevation_ft` - 海拔高度（英尺）
- `continent` - 大洲代码
- `iso_country` - 国家ISO代码
- `iso_region` - 地区ISO代码
- `municipality` - 所属城市
- `scheduled_service` - 是否有定期航班服务
- `icao_code` - ICAO代码
- `iata_code` - IATA代码
- `gps_code` - GPS代码
- `local_code` - 本地代码
- `home_link` - 官方网站链接
- `wikipedia_link` - 维基百科链接
- `keywords` - 关键词

## 转换过程

### 1. CSV到GeoJSON转换
```bash
python csv_to_geojson.py airports.csv airports.geojson
```

### 2. GeoJSON到PMTiles转换
tippecanoe 原生支持 minzoom/maxzoom 属性，可以让你精确控制不同类型的点在不同 zoom 出现。
```bash
tippecanoe \
  -o airports.pmtiles \
  -zg \
  --force \
  airports.geojson
```

## PMTiles参数说明

- `--maximum-zoom=14` - 最大缩放级别14，适合机场点数据的详细显示
- `--minimum-zoom=0` - 最小缩放级别0，支持全球视图
- `--drop-densest-as-needed` - 在密集区域自动删除点以避免过度拥挤
- `--extend-zooms-if-still-dropping` - 如果仍在删除点则扩展缩放级别

## 使用PMTiles文件

PMTiles文件可以用于：

1. **Web地图服务** - 使用PMTiles库在网页中显示
2. **移动应用** - 离线地图数据
3. **GIS软件** - 支持PMTiles格式的GIS工具
4. **地图服务器** - 如MapLibre、Mapbox等

### 示例：在网页中使用

```javascript
import { PMTiles, Protocol } from 'pmtiles';
import maplibregl from 'maplibre-gl';

const protocol = new Protocol();
maplibregl.addProtocol('pmtiles', protocol.tile);

const map = new maplibregl.Map({
  container: 'map',
  style: {
    version: 8,
    sources: {
      airports: {
        type: 'vector',
        url: 'pmtiles://airports.pmtiles'
      }
    },
    layers: [
      {
        id: 'airports',
        source: 'airports',
        'source-layer': 'airports',
        type: 'circle',
        paint: {
          'circle-radius': 4,
          'circle-color': '#ff0000'
        }
      }
    ]
  }
});
```

## 数据统计

- 总机场数量：83,247个
- 文件大小：93MB（PMTiles）
- 缩放级别：0-14
- 数据完整性：99.99%（仅1个记录因缺少经纬度被跳过）

## 注意事项

1. PMTiles文件包含了所有原始CSV中的属性信息
2. 经纬度数据已验证范围有效性
3. 空值已正确处理为null
4. 数值字段（id、elevation_ft）已转换为适当的数据类型



```bash
 tippecanoe \
    -o ./airports.pmtiles \
    --force \
    -zg \
    --read-parallel \
    --drop-densest-as-needed \
    --include=name \
    --include=ident \
    --include=elevation_ft \
    --include=iso_country \
    --include=continent \
    --include=iso_region \
    --include=icao_code \
    --include=iata_code \
    --include=type \
    --layer=airports \
    airports.geojson
```
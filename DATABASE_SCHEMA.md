# 机场数据库结构文档

## 概述

本数据库包含全球机场信息，采用SQLite格式存储。数据源来自airports.csv文件，经过结构化处理和优化，支持高效的地理位置查询和统计分析。

## 数据库文件

- **文件名**: `airports.db`
- **格式**: SQLite 3
- **总记录数**: 83,247条机场记录，43,329条地址记录，246个国家统计记录
- **数据来源**: airports.csv

## 表结构

### 1. airport 表（机场信息表）

存储全球机场的基本信息和运营数据。

| 字段名 | 数据类型 | 约束 | 描述 |
|--------|----------|------|------|
| id | TEXT | PRIMARY KEY | 机场唯一标识符（ICAO/IATA代码） |
| ident | TEXT | | 机场识别码 |
| type | TEXT | | 机场类型（如small_airport, heliport等） |
| name | TEXT | | 机场名称 |
| latitude_deg | REAL | | 纬度（十进制度数） |
| longitude_deg | REAL | | 经度（十进制度数） |
| elevation_ft | INTEGER | | 海拔高度（英尺） |
| continent | TEXT | | 所属大洲 |
| iso_country | TEXT | | ISO 3166-1 alpha-2国家代码 |
| iso_region | TEXT | | ISO 3166-2地区代码 |
| municipality | TEXT | | 所属城市/自治区 |
| scheduled_service | TEXT | | 是否提供定期航班服务（yes/no） |
| gps_code | TEXT | | GPS代码 |
| iata_code | TEXT | | IATA机场代码 |
| local_code | TEXT | | 本地机场代码 |
| home_link | TEXT | | 机场官方网站 |
| wikipedia_link | TEXT | | 维基百科链接 |
| keywords | TEXT | | 关键词标签 |
| address_id | INTEGER | FOREIGN KEY | 关联地址表的外键 |

**索引**:
- `idx_airport_type`: type字段索引
- `idx_airport_country`: iso_country字段索引
- `idx_airport_region`: iso_region字段索引
- `idx_airport_location`: latitude_deg, longitude_deg复合索引
- `idx_airport_address`: address_id字段索引

### 2. address 表（地址信息表）

存储去重后的地址信息，包含ISO代码和对应的真实名称。

| 字段名 | 数据类型 | 约束 | 描述 |
|--------|----------|------|------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | 地址唯一标识符 |
| country | TEXT | NOT NULL | ISO 3166-1 alpha-2国家代码 |
| region | TEXT | | ISO 3166-2地区代码 |
| municipality | TEXT | | 城市/自治区名称 |
| country_name | TEXT | | 真实国家名称（如"United States"） |
| region_name | TEXT | | 真实地区名称（如"California"） |

**索引**:
- `idx_address_country`: country字段索引
- `idx_address_country_name`: country_name字段索引
- `idx_address_region_name`: region_name字段索引

### 3. country_stats 表（国家统计表）

存储各国机场数量统计信息，支持快速统计查询。

| 字段名 | 数据类型 | 约束 | 描述 |
|--------|----------|------|------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | 统计记录唯一标识符 |
| country_code | TEXT | NOT NULL UNIQUE | ISO 3166-1 alpha-2国家代码 |
| country_name | TEXT | | 真实国家名称 |
| airport_count | INTEGER | DEFAULT 0 | 该国机场总数 |
| last_updated | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 最后更新时间 |

**索引**:
- `idx_country_stats_code`: country_code字段索引
- `idx_country_stats_name`: country_name字段索引

## 表关系

```
airport (N) ←→ (1) address
airport (N) ←→ (1) country_stats (通过iso_country关联)
```

- **airport ↔ address**: 多对一关系，外键airport.address_id → address.id
- **airport ↔ country_stats**: 多对一关系，通过airport.iso_country与country_stats.country_code关联
- **说明**: 多个机场可以共享同一个地址记录，实现数据去重和存储优化；国家统计表提供预计算的统计数据

## 机场类型统计

| 类型 | 数量 | 描述 |
|------|------|------|
| small_airport | 42,249 | 小型机场 |
| heliport | 21,914 | 直升机场 |
| closed | 12,623 | 已关闭机场 |
| medium_airport | 4,687 | 中型机场 |
| seaplane_base | 1,232 | 水上飞机基地 |
| large_airport | 485 | 大型机场 |
| balloonport | 57 | 气球港 |

## 国家分布（前10）

| 国家 | 机场数量 |
|------|----------|
| United States | 32,123 |
| Brazil | 7,555 |
| Japan | 3,744 |
| Canada | 3,288 |
| Australia | 2,754 |
| Mexico | 2,685 |
| Russian Federation | 1,738 |
| France | 1,718 |
| United Kingdom | 1,571 |
| South Korea | 1,408 |

## 数据质量

- **完整性**: 所有记录都包含基本的位置信息（纬度、经度）
- **一致性**: ISO代码标准化，地址信息去重
- **准确性**: 100%的地址记录成功转换为真实名称
- **时效性**: 数据来源于最新的airports.csv文件

## 查询性能优化

1. **地理位置查询**: 使用复合索引`idx_airport_location`优化经纬度范围查询
2. **国家/地区查询**: 分别为ISO代码和真实名称创建索引
3. **类型筛选**: `idx_airport_type`索引支持快速按机场类型筛选
4. **关联查询**: `idx_airport_address`索引优化表连接性能
5. **统计查询**: `country_stats`表提供预计算的国家统计数据，避免实时聚合计算
6. **国家统计**: 使用`idx_country_stats_code`和`idx_country_stats_name`索引快速查询国家统计信息

## 使用建议

1. **地理查询**: 使用经纬度范围查询时，建议先按国家或地区筛选以提高性能
2. **统计分析**: 利用真实名称字段进行用户友好的统计报告
3. **数据导出**: 可以选择性导出ISO代码或真实名称，满足不同应用需求
4. **扩展性**: 地址表设计支持未来添加更多地理信息字段
5. **快速统计**: 使用`country_stats`表获取国家级统计数据，避免复杂的JOIN和GROUP BY操作
6. **数据一致性**: 统计表会在数据更新时自动刷新，确保统计数据的准确性

## 相关文件

- `csv_to_sqlite.py`: 初始数据转换脚本
- `optimize_address_table.py`: 地址表优化脚本
- `iso_mappings.py`: ISO代码映射数据
- `database_examples.sql`: 查询示例集合

---

*文档版本: 1.0*  
*最后更新: 2024年*  
*数据库版本: 优化版（包含真实名称字段）*
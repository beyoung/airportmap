-- SQLite数据库查询示例
-- 机场数据库查询操作示例

-- 1. 查看数据库基本信息
-- 查看所有表
.tables

-- 查看表结构
.schema airport
.schema address

-- 2. 基本统计查询
-- 总机场数量
SELECT COUNT(*) as total_airports FROM airport;

-- 总地址数量
SELECT COUNT(*) as total_addresses FROM address;

-- 按机场类型统计
SELECT type, COUNT(*) as count 
FROM airport 
WHERE type IS NOT NULL 
GROUP BY type 
ORDER BY count DESC;

-- 按国家统计机场数量
SELECT iso_country, COUNT(*) as count 
FROM airport 
WHERE iso_country IS NOT NULL 
GROUP BY iso_country 
ORDER BY count DESC 
LIMIT 20;

-- 3. 具体机场查询
-- 查询特定机场信息（示例：00A）
SELECT 
    a.ident,
    a.type,
    a.name,
    a.latitude_deg,
    a.longitude_deg,
    a.elevation_ft,
    a.iso_country,
    a.iso_region,
    a.municipality,
    a.home_link,
    a.wikipedia_link,
    a.keywords,
    addr.country,
    addr.region
FROM airport a
LEFT JOIN address addr ON a.address_id = addr.id
WHERE a.ident = '00A';

-- 查询美国的所有直升机场
SELECT 
    a.ident,
    a.name,
    a.municipality,
    a.latitude_deg,
    a.longitude_deg
FROM airport a
WHERE a.iso_country = 'US' AND a.type = 'heliport'
ORDER BY a.name
LIMIT 10;

-- 4. 地理位置查询
-- 查询特定经纬度范围内的机场（示例：美国东海岸）
SELECT 
    a.ident,
    a.name,
    a.type,
    a.latitude_deg,
    a.longitude_deg,
    a.municipality
FROM airport a
WHERE a.latitude_deg BETWEEN 35 AND 45
  AND a.longitude_deg BETWEEN -80 AND -70
  AND a.iso_country = 'US'
ORDER BY a.name
LIMIT 20;

-- 查询海拔最高的机场
SELECT 
    a.ident,
    a.name,
    a.elevation_ft,
    a.iso_country,
    a.municipality
FROM airport a
WHERE a.elevation_ft IS NOT NULL
ORDER BY a.elevation_ft DESC
LIMIT 10;

-- 5. 关联查询示例
-- 查询每个国家的机场类型分布
SELECT 
    addr.country,
    a.type,
    COUNT(*) as count
FROM airport a
JOIN address addr ON a.address_id = addr.id
WHERE a.type IS NOT NULL
GROUP BY addr.country, a.type
HAVING COUNT(*) > 10
ORDER BY addr.country, count DESC;

-- 查询有官方网站的机场
SELECT 
    a.ident,
    a.name,
    a.home_link,
    addr.country
FROM airport a
LEFT JOIN address addr ON a.address_id = addr.id
WHERE a.home_link IS NOT NULL AND a.home_link != ''
ORDER BY addr.country, a.name
LIMIT 20;

-- 6. 复杂查询示例
-- 查询每个地区的大型机场数量
SELECT 
    addr.country,
    addr.region,
    COUNT(*) as large_airports
FROM airport a
JOIN address addr ON a.address_id = addr.id
WHERE a.type = 'large_airport'
GROUP BY addr.country, addr.region
ORDER BY large_airports DESC;

-- 查询同一城市有多个机场的情况
SELECT 
    a.municipality,
    a.iso_country,
    COUNT(*) as airport_count,
    GROUP_CONCAT(a.ident, ', ') as airport_codes
FROM airport a
WHERE a.municipality IS NOT NULL AND a.municipality != ''
GROUP BY a.municipality, a.iso_country
HAVING COUNT(*) > 5
ORDER BY airport_count DESC
LIMIT 20;

-- 7. 数据质量检查
-- 检查缺少经纬度的机场
SELECT COUNT(*) as missing_coordinates
FROM airport
WHERE latitude_deg IS NULL OR longitude_deg IS NULL;

-- 检查缺少名称的机场
SELECT COUNT(*) as missing_names
FROM airport
WHERE name IS NULL OR name = '';

-- 检查地址表中的重复项
SELECT country, region, municipality, COUNT(*) as duplicates
FROM address
GROUP BY country, region, municipality
HAVING COUNT(*) > 1;

-- 8. 使用真实名称的查询示例（优化后）
-- 按真实国家名称查询机场
SELECT 
    a.ident,
    a.name,
    a.type,
    addr.country_name,
    addr.region_name,
    a.municipality
FROM airport a
JOIN address addr ON a.address_id = addr.id
WHERE addr.country_name = 'United States'
ORDER BY addr.region_name, a.name
LIMIT 10;

-- 按真实地区名称查询机场
SELECT 
    a.ident,
    a.name,
    a.type,
    addr.country_name,
    addr.region_name
FROM airport a
JOIN address addr ON a.address_id = addr.id
WHERE addr.region_name = 'California'
ORDER BY a.name
LIMIT 10;

-- 统计各国家的机场数量（使用真实名称）
SELECT 
    addr.country_name,
    COUNT(*) as airport_count
FROM airport a
JOIN address addr ON a.address_id = addr.id
GROUP BY addr.country_name
ORDER BY airport_count DESC
LIMIT 15;

-- 统计各地区的机场数量（使用真实名称）
SELECT 
    addr.country_name,
    addr.region_name,
    COUNT(*) as airport_count
FROM airport a
JOIN address addr ON a.address_id = addr.id
WHERE addr.region_name IS NOT NULL
GROUP BY addr.country_name, addr.region_name
ORDER BY airport_count DESC
LIMIT 20;

-- 比较ISO代码和真实名称
SELECT DISTINCT
    a.iso_country,
    addr.country_name,
    a.iso_region,
    addr.region_name
FROM airport a
JOIN address addr ON a.address_id = addr.id
WHERE a.iso_country IN ('US', 'CA', 'AU', 'DE', 'FR')
ORDER BY addr.country_name, addr.region_name
LIMIT 20;

-- 查找特定国家的大型机场
SELECT 
    a.ident,
    a.name,
    a.type,
    addr.country_name,
    addr.region_name,
    a.municipality,
    a.home_link
FROM airport a
JOIN address addr ON a.address_id = addr.id
WHERE addr.country_name = 'China' AND a.type = 'large_airport'
ORDER BY a.name;

-- 9. 性能优化查询
-- 使用索引的查询示例
EXPLAIN QUERY PLAN 
SELECT * FROM airport WHERE ident = '00A';

EXPLAIN QUERY PLAN 
SELECT * FROM airport WHERE iso_country = 'US';

EXPLAIN QUERY PLAN 
SELECT * FROM airport WHERE type = 'large_airport';

-- 使用新索引的查询性能测试
EXPLAIN QUERY PLAN 
SELECT * FROM address WHERE country_name = 'United States';

EXPLAIN QUERY PLAN 
SELECT * FROM address WHERE region_name = 'California';}]}}
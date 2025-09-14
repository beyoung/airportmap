#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CSV to SQLite Converter for Airport Data
将机场CSV数据转换为SQLite数据库，包含airport表和地址表
"""

import csv
import sqlite3
import sys
from iso_mappings import get_country_name, get_full_region_name

def create_database_schema(conn: sqlite3.Connection) -> None:
    """
    创建数据库表结构
    
    Args:
        conn: SQLite数据库连接
    """
    cursor = conn.cursor()
    
    # 创建地址表
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS address (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            country TEXT NOT NULL,
            region TEXT,
            municipality TEXT,
            country_name TEXT,
            region_name TEXT,
            UNIQUE(country, region, municipality)
        )
    """)
    
    # 创建机场表
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS airport (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ident TEXT NOT NULL UNIQUE,
            type TEXT,
            name TEXT,
            latitude_deg REAL,
            longitude_deg REAL,
            elevation_ft INTEGER,
            iso_country TEXT,
            iso_region TEXT,
            municipality TEXT,
            icao_code TEXT,
            iata_code TEXT,
            gps_code TEXT,
            local_code TEXT,
            home_link TEXT,
            wikipedia_link TEXT,
            keywords TEXT,
            address_id INTEGER,
            FOREIGN KEY (address_id) REFERENCES address(id)
        )
    """)
    
    # 创建国家统计表
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS country_stats (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            country_code TEXT NOT NULL UNIQUE,
            country_name TEXT,
            airport_count INTEGER DEFAULT 0,
            large_airport_count INTEGER DEFAULT 0,
            medium_airport_count INTEGER DEFAULT 0,
            small_airport_count INTEGER DEFAULT 0,
            heliport_count INTEGER DEFAULT 0,
            seaplane_base_count INTEGER DEFAULT 0,
            other_count INTEGER DEFAULT 0,
            last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # 创建索引以提高查询性能
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_airport_ident ON airport(ident)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_airport_country ON airport(iso_country)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_airport_type ON airport(type)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_address_country ON address(country)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_address_country_name ON address(country_name)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_address_region_name ON address(region_name)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_country_stats_code ON country_stats(country_code)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_country_stats_name ON country_stats(country_name)")
    
    conn.commit()
    print("数据库表结构创建完成")

def get_or_create_address(cursor: sqlite3.Cursor, country: str, region: str, municipality: str) -> int:
    """
    获取或创建地址记录
    
    Args:
        cursor: 数据库游标
        country: 国家代码
        region: 地区代码
        municipality: 城市
        
    Returns:
        地址记录的ID
    """
    # 处理空值
    country = country.strip() if country else None
    region = region.strip() if region else None
    municipality = municipality.strip() if municipality else None
    
    if not country:
        return None
    
    # 查找现有地址
    cursor.execute("""
        SELECT id FROM address 
        WHERE country = ? AND 
              (region = ? OR (region IS NULL AND ? IS NULL)) AND 
              (municipality = ? OR (municipality IS NULL AND ? IS NULL))
    """, (country, region, region, municipality, municipality))
    
    result = cursor.fetchone()
    if result:
        return result[0]
    
    # 转换ISO代码为真实名称
    country_name = get_country_name(country) if country else None
    region_name = get_full_region_name(country, region) if region else None
    
    # 创建新地址记录
    cursor.execute("""
        INSERT INTO address (country, region, municipality, country_name, region_name) 
        VALUES (?, ?, ?, ?, ?)
    """, (country, region, municipality, country_name, region_name))
    
    return cursor.lastrowid

def convert_csv_to_sqlite(csv_file_path: str, db_file_path: str) -> None:
    """
    将CSV文件转换为SQLite数据库
    
    Args:
        csv_file_path: 输入CSV文件路径
        db_file_path: 输出SQLite数据库文件路径
    """
    try:
        # 连接数据库
        conn = sqlite3.connect(db_file_path)
        cursor = conn.cursor()
        
        # 创建表结构
        create_database_schema(conn)
        
        # 读取CSV文件
        with open(csv_file_path, 'r', encoding='utf-8') as csvfile:
            reader = csv.DictReader(csvfile)
            
            airport_count = 0
            address_count = 0
            error_count = 0
            
            for row_num, row in enumerate(reader, start=2):
                try:
                    # 获取经纬度
                    lat_str = row.get('latitude_deg', '').strip()
                    lon_str = row.get('longitude_deg', '').strip()
                    
                    latitude = None
                    longitude = None
                    
                    if lat_str and lon_str:
                        try:
                            latitude = float(lat_str)
                            longitude = float(lon_str)
                            
                            # 验证经纬度范围
                            if not (-90 <= latitude <= 90) or not (-180 <= longitude <= 180):
                                print(f"警告: 第{row_num}行经纬度超出有效范围")
                                latitude = longitude = None
                        except ValueError:
                            print(f"警告: 第{row_num}行经纬度格式错误")
                    
                    # 处理海拔高度
                    elevation_ft = None
                    elevation_str = row.get('elevation_ft', '').strip()
                    if elevation_str:
                        try:
                            elevation_ft = int(float(elevation_str))
                        except ValueError:
                            pass
                    
                    # 获取或创建地址记录
                    country = row.get('iso_country', '').strip()
                    region = row.get('iso_region', '').strip()
                    municipality = row.get('municipality', '').strip()
                    
                    address_id = None
                    if country:
                        address_id = get_or_create_address(cursor, country, region, municipality)
                        if cursor.rowcount > 0:  # 新创建的地址
                            address_count += 1
                    
                    # 处理其他字段
                    ident = row.get('ident', '').strip()
                    if not ident:
                        print(f"警告: 第{row_num}行缺少ident字段，跳过")
                        continue
                    
                    airport_type = row.get('type', '').strip() or None
                    name = row.get('name', '').strip() or None
                    icao_code = row.get('icao_code', '').strip() or None
                    iata_code = row.get('iata_code', '').strip() or None
                    gps_code = row.get('gps_code', '').strip() or None
                    local_code = row.get('local_code', '').strip() or None
                    home_link = row.get('home_link', '').strip() or None
                    wikipedia_link = row.get('wikipedia_link', '').strip() or None
                    keywords = row.get('keywords', '').strip() or None
                    
                    # 插入机场记录
                    cursor.execute("""
                        INSERT OR REPLACE INTO airport (
                            ident, type, name, latitude_deg, longitude_deg, 
                            elevation_ft, iso_country, iso_region, municipality,
                            icao_code, iata_code, gps_code, local_code,
                            home_link, wikipedia_link, keywords, address_id
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        ident, airport_type, name, latitude, longitude,
                        elevation_ft, country or None, region or None, municipality or None,
                        icao_code, iata_code, gps_code, local_code,
                        home_link, wikipedia_link, keywords, address_id
                    ))
                    
                    airport_count += 1
                    
                    # 每1000条记录提交一次
                    if airport_count % 1000 == 0:
                        conn.commit()
                        print(f"已处理 {airport_count} 条机场记录...")
                        
                except Exception as e:
                    error_count += 1
                    print(f"错误: 处理第{row_num}行时出错: {e}")
                    continue
        
        # 最终提交
        conn.commit()
        
        # 填充国家统计表
        print("\n正在生成国家统计数据...")
        cursor.execute("""
            INSERT OR REPLACE INTO country_stats (
                country_code, country_name, airport_count, 
                large_airport_count, medium_airport_count, small_airport_count,
                heliport_count, seaplane_base_count, other_count, last_updated
            )
            SELECT 
                a.iso_country as country_code,
                addr.country_name,
                COUNT(a.id) as airport_count,
                SUM(CASE WHEN a.type = 'large_airport' THEN 1 ELSE 0 END) as large_airport_count,
                SUM(CASE WHEN a.type = 'medium_airport' THEN 1 ELSE 0 END) as medium_airport_count,
                SUM(CASE WHEN a.type = 'small_airport' THEN 1 ELSE 0 END) as small_airport_count,
                SUM(CASE WHEN a.type = 'heliport' THEN 1 ELSE 0 END) as heliport_count,
                SUM(CASE WHEN a.type = 'seaplane_base' THEN 1 ELSE 0 END) as seaplane_base_count,
                SUM(CASE WHEN a.type NOT IN ('large_airport', 'medium_airport', 'small_airport', 'heliport', 'seaplane_base') OR a.type IS NULL THEN 1 ELSE 0 END) as other_count,
                CURRENT_TIMESTAMP as last_updated
            FROM airport a
            LEFT JOIN address addr ON a.address_id = addr.id
            WHERE a.iso_country IS NOT NULL
            GROUP BY a.iso_country, addr.country_name
        """)
        
        conn.commit()
        
        # 统计信息
        cursor.execute("SELECT COUNT(*) FROM airport")
        total_airports = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM address")
        total_addresses = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM country_stats")
        total_countries = cursor.fetchone()[0]
        
        print(f"\n转换完成！")
        print(f"输入文件: {csv_file_path}")
        print(f"输出数据库: {db_file_path}")
        print(f"总机场数: {total_airports}")
        print(f"总地址数: {total_addresses}")
        print(f"总国家数: {total_countries}")
        print(f"错误记录数: {error_count}")
        
        # 显示一些统计信息
        cursor.execute("""
            SELECT type, COUNT(*) as count 
            FROM airport 
            WHERE type IS NOT NULL 
            GROUP BY type 
            ORDER BY count DESC 
            LIMIT 10
        """)
        
        print("\n机场类型统计（前10）:")
        for airport_type, count in cursor.fetchall():
            print(f"  {airport_type}: {count}")
        
        cursor.execute("""
            SELECT country, COUNT(*) as count 
            FROM address 
            GROUP BY country 
            ORDER BY count DESC 
            LIMIT 10
        """)
        
        print("\n国家统计（前10）:")
        for country, count in cursor.fetchall():
            print(f"  {country}: {count}")
        
        # 显示地址区域的机场统计
        cursor.execute("""
            SELECT 
                COALESCE(a.country_name, a.country) as country_display,
                COALESCE(a.region_name, a.region) as region_display,
                a.municipality, 
                COUNT(ap.id) as airport_count
            FROM address a
            LEFT JOIN airport ap ON a.id = ap.address_id
            GROUP BY a.country, a.region, a.municipality
            HAVING airport_count > 0
            ORDER BY airport_count DESC
            LIMIT 15
        """)
        
        print("\n地址区域机场统计（前15）:")
        for country_display, region_display, municipality, airport_count in cursor.fetchall():
            location = f"{country_display}"
            if region_display:
                location += f", {region_display}"
            if municipality:
                location += f", {municipality}"
            print(f"  {location}: {airport_count} 个机场")
        
        # 显示国家统计
        print("\n国家机场统计 (前15个):")
        cursor.execute("""
            SELECT 
                COALESCE(country_name, country_code) as country_display,
                airport_count
            FROM country_stats
            ORDER BY airport_count DESC
            LIMIT 15
        """)
        
        for country_display, airport_count in cursor.fetchall():
            print(f"  {country_display}: {airport_count} 个机场")
        
        print("\n数据库创建完成！")
         
    except FileNotFoundError:
        print(f"错误: 找不到文件 {csv_file_path}")
        sys.exit(1)
    except Exception as e:
        print(f"错误: 转换过程中出错: {e}")
        sys.exit(1)
    finally:
        if 'conn' in locals():
            conn.close()

def main():
    """
    主函数
    """
    if len(sys.argv) != 3:
        print("用法: python csv_to_sqlite.py <输入CSV文件> <输出SQLite数据库文件>")
        print("示例: python csv_to_sqlite.py airports.csv airports.db")
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_file = sys.argv[2]
    
    convert_csv_to_sqlite(input_file, output_file)

if __name__ == "__main__":
    main()
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CSV to SQLite Converter for Airport Data
将机场CSV数据转换为SQLite数据库，包含airport表和地址表
"""

import csv
import sqlite3
import sys
from typing import Dict, Any, Optional

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
    
    # 创建索引以提高查询性能
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_airport_ident ON airport(ident)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_airport_country ON airport(iso_country)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_airport_type ON airport(type)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_address_country ON address(country)")
    
    conn.commit()
    print("数据库表结构创建完成")

def get_or_create_address(cursor: sqlite3.Cursor, country: str, region: str, municipality: str) -> int:
    """
    获取或创建地址记录
    
    Args:
        cursor: 数据库游标
        country: 国家
        region: 地区
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
    
    # 创建新地址记录
    cursor.execute("""
        INSERT INTO address (country, region, municipality) 
        VALUES (?, ?, ?)
    """, (country, region, municipality))
    
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
        
        # 统计信息
        cursor.execute("SELECT COUNT(*) FROM airport")
        total_airports = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM address")
        total_addresses = cursor.fetchone()[0]
        
        print(f"\n转换完成！")
        print(f"输入文件: {csv_file_path}")
        print(f"输出数据库: {db_file_path}")
        print(f"机场记录数: {total_airports}")
        print(f"地址记录数: {total_addresses}")
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
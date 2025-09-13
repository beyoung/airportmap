#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
地址表优化脚本
将ISO代码转换为真实的国家和地区名称
"""

import sqlite3
import sys
from iso_mappings import get_country_name, get_full_region_name

def optimize_address_table(db_path):
    """
    优化地址表，添加真实名称字段并转换现有数据
    """
    try:
        # 连接数据库
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        print(f"正在优化数据库: {db_path}")
        
        # 1. 添加新字段到address表
        print("\n1. 添加新字段到address表...")
        try:
            cursor.execute("""
                ALTER TABLE address ADD COLUMN country_name TEXT;
            """)
            print("   - 添加country_name字段")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e).lower():
                print("   - country_name字段已存在")
            else:
                raise
        
        try:
            cursor.execute("""
                ALTER TABLE address ADD COLUMN region_name TEXT;
            """)
            print("   - 添加region_name字段")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e).lower():
                print("   - region_name字段已存在")
            else:
                raise
        
        # 2. 获取所有地址记录
        print("\n2. 获取现有地址数据...")
        cursor.execute("""
            SELECT id, country, region, municipality 
            FROM address 
            ORDER BY id
        """)
        addresses = cursor.fetchall()
        print(f"   - 找到 {len(addresses)} 条地址记录")
        
        # 3. 更新地址记录
        print("\n3. 转换ISO代码为真实名称...")
        updated_count = 0
        error_count = 0
        
        for addr_id, country_code, region_code, municipality in addresses:
            try:
                # 转换国家代码
                country_name = get_country_name(country_code) if country_code else None
                
                # 转换地区代码
                region_name = None
                if region_code:
                    region_name = get_full_region_name(country_code, region_code)
                
                # 更新记录
                cursor.execute("""
                    UPDATE address 
                    SET country_name = ?, region_name = ?
                    WHERE id = ?
                """, (country_name, region_name, addr_id))
                
                updated_count += 1
                
                # 显示进度
                if updated_count % 1000 == 0:
                    print(f"   - 已处理 {updated_count} 条记录...")
                    
            except Exception as e:
                print(f"   - 错误处理记录 {addr_id}: {e}")
                error_count += 1
        
        # 4. 创建索引以提高查询性能
        print("\n4. 创建索引...")
        try:
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_address_country_name ON address(country_name);")
            print("   - 创建country_name索引")
        except sqlite3.OperationalError:
            print("   - country_name索引已存在")
        
        try:
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_address_region_name ON address(region_name);")
            print("   - 创建region_name索引")
        except sqlite3.OperationalError:
            print("   - region_name索引已存在")
        
        # 5. 提交更改
        conn.commit()
        
        # 6. 验证结果
        print("\n5. 验证转换结果...")
        
        # 统计转换结果
        cursor.execute("""
            SELECT 
                COUNT(*) as total,
                COUNT(country_name) as with_country_name,
                COUNT(region_name) as with_region_name
            FROM address
        """)
        total, with_country_name, with_region_name = cursor.fetchone()
        
        print(f"   - 总记录数: {total}")
        print(f"   - 有国家名称: {with_country_name} ({with_country_name/total*100:.1f}%)")
        print(f"   - 有地区名称: {with_region_name} ({with_region_name/total*100:.1f}%)")
        
        # 显示一些示例
        print("\n6. 转换示例:")
        cursor.execute("""
            SELECT country, country_name, region, region_name, municipality
            FROM address 
            WHERE country_name IS NOT NULL
            ORDER BY country, region
            LIMIT 10
        """)
        
        examples = cursor.fetchall()
        for country, country_name, region, region_name, municipality in examples:
            region_info = f" -> {region_name}" if region_name and region_name != region else ""
            municipality_info = f" ({municipality})" if municipality else ""
            print(f"   - {country} -> {country_name}, {region}{region_info}{municipality_info}")
        
        # 显示国家统计
        print("\n7. 国家分布统计（前10）:")
        cursor.execute("""
            SELECT country_name, COUNT(*) as count
            FROM address 
            WHERE country_name IS NOT NULL
            GROUP BY country_name
            ORDER BY count DESC
            LIMIT 10
        """)
        
        country_stats = cursor.fetchall()
        for country_name, count in country_stats:
            print(f"   - {country_name}: {count}")
        
        print(f"\n转换完成！")
        print(f"成功更新: {updated_count} 条记录")
        print(f"错误记录: {error_count} 条")
        
        return True
        
    except Exception as e:
        print(f"错误: {e}")
        return False
    finally:
        if 'conn' in locals():
            conn.close()

def show_schema_changes(db_path):
    """
    显示优化后的数据库结构
    """
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        print("\n优化后的address表结构:")
        cursor.execute("PRAGMA table_info(address)")
        columns = cursor.fetchall()
        
        for col in columns:
            col_id, name, col_type, not_null, default, pk = col
            nullable = "NOT NULL" if not_null else "NULL"
            primary = "PRIMARY KEY" if pk else ""
            print(f"  {name}: {col_type} {nullable} {primary}")
        
        print("\n索引信息:")
        cursor.execute("PRAGMA index_list(address)")
        indexes = cursor.fetchall()
        
        for idx in indexes:
            seq, name, unique, origin, partial = idx
            cursor.execute(f"PRAGMA index_info({name})")
            idx_info = cursor.fetchall()
            columns = [info[2] for info in idx_info]
            print(f"  {name}: {', '.join(columns)}")
        
    except Exception as e:
        print(f"错误: {e}")
    finally:
        if 'conn' in locals():
            conn.close()

def main():
    if len(sys.argv) != 2:
        print("使用方法: python optimize_address_table.py <数据库文件>")
        print("示例: python optimize_address_table.py airports.db")
        sys.exit(1)
    
    db_path = sys.argv[1]
    
    # 检查文件是否存在
    import os
    if not os.path.exists(db_path):
        print(f"错误: 数据库文件 '{db_path}' 不存在")
        sys.exit(1)
    
    # 执行优化
    success = optimize_address_table(db_path)
    
    if success:
        # 显示结构变化
        show_schema_changes(db_path)
        print(f"\n地址表优化完成！数据库已更新: {db_path}")
    else:
        print("\n地址表优化失败！")
        sys.exit(1)

if __name__ == "__main__":
    main()
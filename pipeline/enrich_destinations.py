#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Enrich destinations.json with latitude/longitude from airports.db
- For each airport in direct_flights, look up coords by ICAO or IATA
- Adds `latitude_deg` and `longitude_deg` to each airport entry
- Writes a backup of the original file and updates the original JSON in-place
"""

import json
import os
import sqlite3
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(ROOT, 'pipeline', 'airports.db')
JSON_PATH = os.path.join(ROOT, 'pipeline', 'destinations.json')
BACKUP_PATH = os.path.join(ROOT, 'pipeline', 'destinations.backup.json')


def is_valid(code: str) -> bool:
    return isinstance(code, str) and code.strip() != ''


def lookup_coords(cur: sqlite3.Cursor, icao: str, iata: str):
    row = None
    try:
        if is_valid(icao):
            row = cur.execute(
                "SELECT latitude_deg, longitude_deg FROM airport WHERE UPPER(icao_code) = ? LIMIT 1",
                (icao.strip().upper(),),
            ).fetchone()
        if row is None and is_valid(iata):
            row = cur.execute(
                "SELECT latitude_deg, longitude_deg FROM airport WHERE UPPER(iata_code) = ? LIMIT 1",
                (iata.strip().upper(),),
            ).fetchone()
    except Exception:
        row = None
    return row


def main():
    if not os.path.exists(DB_PATH):
        print(f"错误: 找不到数据库 {DB_PATH}")
        print("请先使用 pipeline 脚本生成 airports.db")
        sys.exit(1)
    if not os.path.exists(JSON_PATH):
        print(f"错误: 找不到 JSON 文件 {JSON_PATH}")
        sys.exit(1)

    # 读取 JSON
    try:
        with open(JSON_PATH, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except Exception as e:
        print(f"错误: 解析 JSON 失败: {e}")
        sys.exit(1)

    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    total = 0
    enriched = 0
    missing = 0

    # 遍历 direct_flights 的机场
    for item in data:
        flights = item.get('direct_flights')
        if not isinstance(flights, list):
            continue
        for df in flights:
            airports = df.get('airports')
            if not isinstance(airports, list):
                continue
            for ap in airports:
                total += 1
                icao = ap.get('icao') or ''
                iata = ap.get('iata') or ''
                row = lookup_coords(cur, icao, iata)
                if row and row[0] is not None and row[1] is not None:
                    ap['latitude_deg'] = row[0]
                    ap['longitude_deg'] = row[1]
                    enriched += 1
                else:
                    missing += 1

    conn.close()

    # 备份原文件
    try:
        with open(JSON_PATH, 'r', encoding='utf-8') as f_in, open(BACKUP_PATH, 'w', encoding='utf-8') as f_bak:
            f_bak.write(f_in.read())
        print(f"🗂️  已生成备份: {BACKUP_PATH}")
    except Exception as e:
        print(f"错误: 写入备份失败: {e}")
        sys.exit(1)

    # 写回更新后的 JSON
    try:
        with open(JSON_PATH, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"✅ 已补齐经纬度并写回: {JSON_PATH}")
        print(f"总机场数: {total}, 已补齐: {enriched}, 缺失: {missing}")
    except Exception as e:
        print(f"错误: 写入更新后的 JSON 失败: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()
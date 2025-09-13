#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CSV to GeoJSON Converter for Airport Data
将机场CSV数据转换为GeoJSON格式，用于后续的tippecanoe处理
"""

import csv
import json
import sys
from typing import Dict, Any, List

zoom_rules = {
    "balloonport": 2,
    "seaplane_base": 1,
    "closed": 8,
    "medium_airport": 0,
    "large_airport": 0,
    "heliport": 5,
    "small_airport": 0,
}


def csv_to_geojson(csv_file_path: str, output_file_path: str) -> None:
    """
    将CSV文件转换为GeoJSON格式

    Args:
        csv_file_path: 输入CSV文件路径
        output_file_path: 输出GeoJSON文件路径
    """
    features = []
    wiki_url = 0
    try:
        with open(csv_file_path, "r", encoding="utf-8") as csvfile:
            reader = csv.DictReader(csvfile)

            for row_num, row in enumerate(
                reader, start=2
            ):  # 从第2行开始计数（第1行是标题）
                try:
                    # 获取经纬度
                    lat = row.get("latitude_deg", "").strip()
                    lon = row.get("longitude_deg", "").strip()

                    # 跳过没有经纬度的记录
                    if not lat or not lon or lat == "" or lon == "":
                        print(f"警告: 第{row_num}行缺少经纬度数据，跳过")
                        continue

                    # 转换为浮点数
                    try:
                        latitude = float(lat)
                        longitude = float(lon)
                    except ValueError:
                        print(f"警告: 第{row_num}行经纬度格式错误，跳过")
                        continue

                    # 验证经纬度范围
                    if not (-90 <= latitude <= 90) or not (-180 <= longitude <= 180):
                        print(f"警告: 第{row_num}行经纬度超出有效范围，跳过")
                        continue

                    # 创建属性字典，排除经纬度字段
                    properties = {}
                    for key, value in row.items():
                        if key not in ["latitude_deg", "longitude_deg"]:
                            # 处理空值
                            if value.strip() == "":
                                properties[key] = None
                            else:
                                # 尝试转换数值类型
                                if key in ["id", "elevation_ft"]:
                                    try:
                                        properties[key] = (
                                            int(value) if value.strip() else None
                                        )
                                    except ValueError:
                                        properties[key] = value.strip()
                                else:
                                    properties[key] = value.strip()
                    del properties["scheduled_service"]
                    # del properties["icao_code"]
                    # del properties["iata_code"]
                    del properties["gps_code"]
                    del properties["local_code"]
                    del properties["continent"]
                    del properties["id"]
                    if properties["wikipedia_link"]:
                        wiki_url += 1
                    properties["minzoom"] = zoom_rules[properties["type"]]
                    # 创建GeoJSON Feature
                    feature = {
                        "type": "Feature",
                        "geometry": {
                            "type": "Point",
                            "coordinates": [
                                longitude,
                                latitude,
                            ],  # GeoJSON格式是[经度, 纬度]
                        },
                        "properties": properties,
                    }

                    features.append(feature)

                except Exception as e:
                    print(f"错误: 处理第{row_num}行时出错: {e}")
                    continue

    except FileNotFoundError:
        print(f"错误: 找不到文件 {csv_file_path}")
        sys.exit(1)
    except Exception as e:
        print(f"错误: 读取CSV文件时出错: {e}")
        sys.exit(1)

    # 创建GeoJSON对象
    geojson = {"type": "FeatureCollection", "features": features}

    # 写入GeoJSON文件
    try:
        with open(output_file_path, "w", encoding="utf-8") as outfile:
            json.dump(geojson, outfile)

        print(f"转换完成！")
        print(f"输入文件: {csv_file_path}")
        print(f"输出文件: {output_file_path}")
        print(f"成功转换 {len(features)} 个机场记录")
        print(f"total wikipedia airports {wiki_url}")

    except Exception as e:
        print(f"错误: 写入GeoJSON文件时出错: {e}")
        sys.exit(1)


def main():
    """
    主函数
    """
    if len(sys.argv) != 3:
        print("用法: python csv_to_geojson.py <输入CSV文件> <输出GeoJSON文件>")
        print("示例: python csv_to_geojson.py airports.csv airports.geojson")
        sys.exit(1)

    input_file = sys.argv[1]
    output_file = sys.argv[2]

    csv_to_geojson(input_file, output_file)


if __name__ == "__main__":
    main()

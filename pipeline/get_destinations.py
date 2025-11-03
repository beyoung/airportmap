import os
import json
import csv
import time
# To run this code you need to install the following dependencies:
# pip install google-genai

from google import genai
from google.genai import types


sample = {
    "departure_airport": {
        "name": "Chengdu Tianfu International Airport",
        "iata": "TFU",
        "icao": "ZUUU",
    },
    "direct_flights": [
        {
            "city": "Beijing",
            "airports": [
                {
                    "name": "Beijing Capital International Airport",
                    "iata": "PEK",
                    "icao": "ZBAA",
                },
                {
                    "name": "Beijing Daxing International Airport",
                    "iata": "PKX",
                    "icao": "ZBAD",
                },
            ],
        }
    ],
}


def read_large_airports(csv_file):
    """读取CSV文件并过滤出type为large_airport的机场"""
    large_airports = []
    with open(csv_file, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row["type"] == "large_airport":
                large_airports.append(
                    {
                        "name": row["name"],
                        "iata": row["iata_code"],
                        "icao": row["icao_code"],
                        "municipality": row["municipality"],
                        "iso_country": row["iso_country"],
                    }
                )
    return large_airports


def get_direct_flights(client, airport):
    """调用Gemini API获取指定机场的直飞目的地"""
    airport_name = airport["name"]
    iata = airport["iata"]
    icao = airport["icao"]

    # 构建prompt
    prompt = f"""获取 {airport_name} (IATA: {iata}, ICAO: {icao}) 能直飞的所有机场。
请给出其他机场的IATA code、ICAO code、机场名称和所在城市。
请以JSON格式输出，格式如下：
{{
    "departure_airport": {{
        "name": "{airport_name}",
        "iata": "{iata}",
        "icao": "{icao}"
    }},
    "direct_flights": [
        {{
            "city": "城市名",
            "airports": [
                {{
                    "name": "机场名称",
                    "iata": "IATA代码",
                    "icao": "ICAO代码"
                }}
            ]
        }}
    ]
}}

只返回JSON数据，不要其他说明文字，并且返回的数据最好是英文， 不要翻译成中文。"""

    model = "gemini-flash-lite-latest"
    contents = [
        types.Content(
            role="user",
            parts=[
                types.Part.from_text(text=prompt),
            ],
        ),
    ]

    generate_content_config = types.GenerateContentConfig(
        response_modalities=["TEXT"],
        temperature=0.3,
    )

    try:
        response_text = ""
        for chunk in client.models.generate_content_stream(
            model=model,
            contents=contents,
            config=generate_content_config,
        ):
            if chunk.text:
                response_text += chunk.text

        # 尝试解析JSON
        # 移除可能的markdown代码块标记
        response_text = response_text.strip()
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.startswith("```"):
            response_text = response_text[3:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
        response_text = response_text.strip()

        result = json.loads(response_text)
        return result
    except Exception as e:
        print(f"Error processing {airport_name}: {e}")
        return None


def main():
    # 初始化Gemini客户端
    client = genai.Client(api_key="AIzaSyDBLYVI74jslh8FwfJJbRSRW6IJX3WAIK0")

    # 读取large_airport数据
    csv_file = "/Users/tutu/project/youth/airportmap/pipeline/airports.csv"
    print("Reading airports.csv...")
    large_airports = read_large_airports(csv_file)
    print(f"Found {len(large_airports)} large airports")

    # 存储所有结果
    all_destinations = []

    # 处理每个机场
    for i, airport in enumerate(large_airports):
        print(
            f"\nProcessing {i + 1}/{len(large_airports)}: {airport['name']} ({airport['iata']})"
        )

        # 跳过没有IATA或ICAO代码的机场
        if not airport["iata"] or not airport["icao"]:
            print(f"  Skipping - missing IATA or ICAO code")
            continue

        result = get_direct_flights(client, airport)
        if result:
            all_destinations.append(result)
            print(
                f"  Success - found {len(result.get('direct_flights', []))} destination cities"
            )

        # 添加延迟以避免API限流
        if i < len(large_airports) - 1:
            time.sleep(2)

    # 保存到destinations.json
    output_file = "/Users/tutu/project/youth/airportmap/pipeline/destinations.json"
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(all_destinations, f, ensure_ascii=False, indent=2)

    print(f"\n\nCompleted! Saved {len(all_destinations)} airports to {output_file}")


if __name__ == "__main__":
    main()

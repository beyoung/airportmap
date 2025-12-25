import os
import sys
import argparse
import sqlite3
from typing import List, Dict, Any, Iterable

try:
    from supabase import create_client, Client
except Exception:
    create_client = None
    Client = None


def chunk(iterable: Iterable[Dict[str, Any]], size: int) -> Iterable[List[Dict[str, Any]]]:
    buf = []
    for item in iterable:
        buf.append(item)
        if len(buf) >= size:
            yield buf
            buf = []
    if buf:
        yield buf


def load_sqlite_from_sql(sql_path: str) -> sqlite3.Connection:
    conn = sqlite3.connect(":memory:")
    conn.executescript(open(sql_path, "r", encoding="utf-8").read())
    return conn


def fetch_all(conn: sqlite3.Connection, table: str) -> List[Dict[str, Any]]:
    cur = conn.cursor()
    cur.execute(f"SELECT * FROM {table}")
    cols = [c[0] for c in cur.description]
    rows = []
    for r in cur.fetchall():
        rows.append({cols[i]: r[i] for i in range(len(cols))})
    return rows


def ensure_supabase_client(url_env: str = "SUPABASE_URL", key_env: str = "SUPABASE_KEY") -> Client:
    if create_client is None:
        raise RuntimeError("supabase-py 未安装，请先安装：pip install supabase")
    url: str = "https://supa.ayamap.com"
    key: str = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzY2NjM0NjY5LCJleHAiOjE5MjQzMTQ2Njl9.ZYneHy-3BUl9gA5I3e4DkXE-uUfDKT-VsOPAU2wHNKs"
    return create_client(url, key)


def upsert_table(supabase: Client, table_name: str, rows: List[Dict[str, Any]], batch_size: int = 1000) -> None:
    for batch in chunk(rows, batch_size):
        resp = supabase.table(table_name).upsert(batch).execute()
        if hasattr(resp, "error") and resp.error:
            raise RuntimeError(f"Upsert {table_name} 失败: {resp.error}")


def main():
    parser = argparse.ArgumentParser(description="将 SQL 数据迁移到 Supabase")
    parser.add_argument("--sql", type=str, default=os.path.join(os.path.dirname(__file__), "airports-db.sql"))
    parser.add_argument("--tables", type=str, default="address,airport,country_stats", help="要迁移的表，逗号分隔")
    parser.add_argument("--batch", type=int, default=1000, help="批量大小")
    parser.add_argument("--truncate", action="store_true", help="迁移前清空 Supabase 目标表")
    args = parser.parse_args()

    conn = load_sqlite_from_sql(args.sql)
    supabase = ensure_supabase_client()

    tables = [t.strip() for t in args.tables.split(",") if t.strip()]
    if args.truncate and set(tables) >= {"address", "airport"}:
        supabase.table("airport").delete().neq("id", -1).execute()
        supabase.table("address").delete().neq("id", -1).execute()
        if "country_stats" in tables:
            supabase.table("country_stats").delete().neq("country_code", "").execute()
    address_map = {}
    if "address" in tables:
        address_rows = fetch_all(conn, "address")
        original_id_to_key = {
            r["id"]: (r["country"], r["region"], r["municipality"]) for r in address_rows
        }
        address_rows = [
            {k: v for k, v in r.items() if k != "id"} for r in address_rows
        ]
        for batch in chunk(address_rows, args.batch):
            resp = supabase.table("address").upsert(batch, on_conflict="country,region,municipality").execute()
            if hasattr(resp, "error") and resp.error:
                raise RuntimeError(f"Upsert address 失败: {resp.error}")
        resp = supabase.table("address").select("*").execute()
        current_rows = resp.data if hasattr(resp, "data") else []
        key_to_new_id = {
            (r.get("country"), r.get("region"), r.get("municipality")): r.get("id")
            for r in current_rows
        }
        address_map = {
            old_id: key_to_new_id.get(key) for old_id, key in original_id_to_key.items()
        }
        print(f"表 address 已迁移，行数: {len(address_rows)}")
    if "airport" in tables:
        airport_rows = fetch_all(conn, "airport")
        sanitized = []
        for r in airport_rows:
            rr = {k: v for k, v in r.items() if k != "id"}
            aid = rr.get("address_id")
            if aid is not None and aid in address_map and address_map[aid] is not None:
                rr["address_id"] = address_map[aid]
            else:
                rr["address_id"] = None
            sanitized.append(rr)
        for batch in chunk(sanitized, args.batch):
            resp = supabase.table("airport").upsert(batch, on_conflict="ident").execute()
            if hasattr(resp, "error") and resp.error:
                raise RuntimeError(f"Upsert airport 失败: {resp.error}")
        print(f"表 airport 已迁移，行数: {len(sanitized)}")
    if "country_stats" in tables:
        cs_rows = fetch_all(conn, "country_stats")
        for batch in chunk(cs_rows, args.batch):
            resp = supabase.table("country_stats").upsert(batch, on_conflict="country_code").execute()
            if hasattr(resp, "error") and resp.error:
                raise RuntimeError(f"Upsert country_stats 失败: {resp.error}")
        print(f"表 country_stats 已迁移，行数: {len(cs_rows)}")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"迁移失败: {e}", file=sys.stderr)
        sys.exit(1)

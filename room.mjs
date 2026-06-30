import { getStore } from "@netlify/blobs";

/* 롤 공략집 — 온라인 공유 방 저장 함수.
   같은 사이트(도메인) 안에서 동작하므로 CORS/프리플라이트 문제가 전혀 없습니다.
   저장은 Netlify Blobs(무료 내장 저장소)를 사용합니다.

   POST  /.netlify/functions/room          → 새 방 생성, { "id": "<코드>" } 반환
   GET   /.netlify/functions/room?id=<코드> → 방 내용(JSON) 반환
   PUT   /.netlify/functions/room?id=<코드> → 방 내용 갱신
*/

const STORE = "lol-guide-rooms";
const j = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } });

function newId() {
  // 짧고 읽기 쉬운 6자리 코드 (혼동되는 0/o/1/l 제외)
  const a = "abcdefghjkmnpqrstuvwxyz23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += a[Math.floor(Math.random() * a.length)];
  return s;
}

export default async (req) => {
  const store = getStore(STORE);
  const url = new URL(req.url);
  const id = url.searchParams.get("id");

  try {
    if (req.method === "POST") {
      const body = await req.text();
      // 충돌 방지: 비어있는 코드를 찾을 때까지 (사실상 1회)
      let code = newId();
      for (let i = 0; i < 5 && (await store.get(code)) != null; i++) code = newId();
      await store.set(code, body || "{}");
      return j({ id: code });
    }

    if (req.method === "GET") {
      if (!id) return j({ error: "no id" }, 400);
      const data = await store.get(id);
      if (data == null) return j({ error: "not found" }, 404);
      return new Response(data, { headers: { "content-type": "application/json" } });
    }

    if (req.method === "PUT") {
      if (!id) return j({ error: "no id" }, 400);
      const body = await req.text();
      await store.set(id, body || "{}");
      return j({ ok: true });
    }

    return j({ error: "method not allowed" }, 405);
  } catch (e) {
    return j({ error: String(e && e.message ? e.message : e) }, 500);
  }
};

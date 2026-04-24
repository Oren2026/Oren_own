#!/usr/bin/env python3
"""聊天啊!尬殿 API 測試（每個用戶獨立 session）"""
import urllib.request, urllib.error, http.cookiejar, json, sys

BASE = "http://localhost:3000"
PASS = 0
FAIL = 0

def make_opener():
    cj = http.cookiejar.CookieJar()
    return urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))

def req(opener, method, path, data=None, headers=None):
    url = BASE + path
    h = {"Content-Type": "application/json"}
    if headers: h.update(headers)
    body = json.dumps(data).encode() if data else None
    try:
        r = urllib.request.Request(url, data=body, headers=h, method=method)
        resp = opener.open(r, timeout=10)
        return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        try: return json.loads(e.read().decode())
        except: return {"error": str(e)}
    except Exception as e:
        return {"error": str(e)}

def check(label, cond, got=None):
    global PASS, FAIL
    if cond:
        PASS += 1
        print(f"  [PASS] {label}")
    else:
        FAIL += 1
        print(f"  [FAIL] {label}")
        if got is not None:
            print(f"         got: {str(got)[:200]}")

oa = make_opener()  # opener A
ob = make_opener()  # opener B

print("\n=== 聊天啊!尬殿 API 測試 ===\n")

# 1. health
h = req(oa, "GET", "/api/health")
check("Health endpoint", "status" in h)

# 2. register A
r = req(oa, "POST", "/api/auth/register",
    {"username": "tsta", "password": "test123", "displayName": "TestA"})
check("Register User A", "user" in r and r["user"]["username"] == "tsta", r)
csrf_a = r.get("csrfToken", "")

# 3. A 發文
p1 = req(oa, "POST", "/api/posts", {"content": "A 的文章"}, {"X-CSRF-Token": csrf_a})
check("A 發文成功", "post" in p1, p1)
id1 = p1.get("post",{}).get("id")

# 4. A 按讚
l1 = req(oa, "POST", f"/api/posts/{id1}/like", None, {"X-CSRF-Token": csrf_a})
check("A 按讚成功", l1.get("liked") == True, l1)

# 5. A 留言（第一次）
c1 = req(oa, "POST", f"/api/posts/{id1}/comment",
    {"content": "A 第一條"}, {"X-CSRF-Token": csrf_a})
check("A 留言第一次", "commentId" in c1, c1)

# 6. A 再留言（同一 token 回歸測試）
c2 = req(oa, "POST", f"/api/posts/{id1}/comment",
    {"content": "A 第二條"}, {"X-CSRF-Token": csrf_a})
check("同一 token 再留言（回歸）", "commentId" in c2, c2)

# 7. A 再按讚（同一 token 回歸測試）
l1b = req(oa, "POST", f"/api/posts/{id1}/like", None, {"X-CSRF-Token": csrf_a})
check("同一 token 取消按讚", l1b.get("liked") == False, l1b)

# 8. register B（獨立 session）
r2 = req(ob, "POST", "/api/auth/register",
    {"username": "tstb", "password": "test123", "displayName": "TestB"})
check("Register User B", "user" in r2 and r2["user"]["username"] == "tstb", r2)
csrf_b = r2.get("csrfToken", "")

# 9. B 發文
p2 = req(ob, "POST", "/api/posts", {"content": "B 的文章"}, {"X-CSRF-Token": csrf_b})
check("B 發文成功", "post" in p2, p2)

# 10. B 對 A 文章按讚
l2 = req(ob, "POST", f"/api/posts/{id1}/like", None, {"X-CSRF-Token": csrf_b})
check("B 對 A 文章按讚", l2.get("liked") == True, l2)

# 11. B 對 A 文章留言
c3 = req(ob, "POST", f"/api/posts/{id1}/comment",
    {"content": "B 來留言"}, {"X-CSRF-Token": csrf_b})
check("B 對 A 文章留言", "commentId" in c3, c3)

# 12. 動態牆（跨用戶可見）
posts = req(oa, "GET", "/api/posts").get("posts", [])
check("動態牆有 A 文章", any(p["username"] == "tsta" for p in posts))
check("動態牆有 B 文章（跨可見）", any(p["username"] == "tstb" for p in posts))
check("動態牆 >= 2 篇", len(posts) >= 2, f"got {len(posts)}")

# 13. 看文章詳情（含留言/讚）
detail = req(oa, "GET", f"/api/posts/{id1}")
dp = detail.get("post", detail)
check("A 文章有 2 條留言", len(dp.get("comments",[])) >= 2)
check("A 文章讚數 >= 1", dp.get("likeCount",0) >= 1)
# 時間格式驗證
created = dp.get("createdAt","")
check(f"時間含時區後綴: {created}", "+08:00" in created or "Z" in created or "+" in created[-6:], created)

# 14. A 刪除自己文章
d = req(oa, "DELETE", f"/api/posts/{id1}", None, {"X-CSRF-Token": csrf_a})
check("A 刪除文章成功", d.get("ok") == True, d)

# 15. 刪除後不存在
gone = req(oa, "GET", f"/api/posts/{id1}")
check("刪除後不存在", "error" in gone, gone)

# 16. 活動
act = req(oa, "POST", "/api/activities", {
    "title": "揪團", "content": "寫 code",
    "eventTime": "2026-05-01T10:00:00Z", "location": "線上"
}, {"X-CSRF-Token": csrf_a})
check("創建活動成功", "activity" in act or "id" in act, act)
act_id = act.get("activity",act).get("id",act.get("id"))

# 17. 活動留言
ac = req(oa, "POST", f"/api/activities/{act_id}/comment",
    {"content": "我要參加！"}, {"X-CSRF-Token": csrf_a})
check("活動留言成功", "commentId" in ac, ac)

# 18. 活動列表
acts = req(oa, "GET", "/api/activities").get("activities",[])
check("活動列表 >= 1", len(acts) >= 1)
# 活動時間格式
if acts:
    ad = acts[0].get("createdAt","")
    check(f"活動時間含時區: {ad}", "+08:00" in ad or "Z" in ad or "+" in ad[-6:], ad)

print(f"\n{'='*40}")
print(f"  結果：{PASS} 通過，{FAIL} 失敗")
if FAIL > 0:
    sys.exit(1)

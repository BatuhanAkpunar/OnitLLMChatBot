# Onit AI — Pazar Araştırması ve Bulgular (2026-06)

Kaynak: Reddit (opencli/agent-reach ile çekildi), ChatPRD resmi site/blog, web.
Ham veriler `docs/research/raw/` altında. Bu doküman ham notların sentezidir.

## 1. Kategorinin iki varoluşsal eleştirisi

Onit "fikir → PRD/plan, bir AI ekibiyle" konumunda. Reddit'te PM'lerin bu
kategoriye (ChatPRD ve benzeri) yönelttiği iki ana eleştiri var. Onit'in
hayatta kalması bu ikisine net cevap vermesine bağlı.

### Eleştiri A: "Sadece bir LLM wrapper'ı"
r/ProductManagement "ChatPRD - Looking for advice" thread'i (gerçek alıntılar):
- En yüksek oy (43): "nothing ChatPRD can do that Claude can't do with the
  right skill instructions and context."
- (17): "the value of it over a general purpose LLM is rapidly diminishing."
- (1): "As models have got better (especially Claude), there's less value add
  from prompt wrapper tools... the delta is not enough to justify a whole
  separate tool."
- Tekrarlanan tema: "it's a wrapper, use Claude Skills."
- Kime yarıyor (dürüst itiraf, 3-4 oy): "thin template wrapper exist for people
  who already have no idea what a PRD is. So they service a purpose." +
  "I used it where I had no time to build context in an LLM. Nice for someone
  who knew what they wanted but didn't have time to build it."

**Çıkarım:** Üretim (generation) artık moat değil. Model her ay yaklaşıyor.
Onit'in değeri "daha iyi prompt"ta olamaz; kalıcı bağlam, süreç ve çıktıda
olmalı.

### Eleştiri B: "AI ajan ekipleri tiyatro, ilerleme değil"
"The Contrarian Take: Why AI Agent Teams Are Overrated" postu Onit'in tam
çekirdeğini (5 rollü ekip) hedef alıyor ve örnek olarak PRD'yi kullanıyor:
- "agent teams are more theater than leverage. They add coordination costs,
  compound mistakes... a lot of words but not a lot of progress."
- 3 gizli maliyet: (1) koordinasyon overhead'i, her handoff'ta bağlam kaybı;
  (2) robustluk taklidi yapan tekrar (iki ajan = iki hallucination); (3)
  hesap verebilirlik kaybı ("Agent A said X, B disagreed, C merged it. So
  what's true?").
- Birebir PRD senaryosu: "A team might create (1) an overlong market summary,
  (2) a feature list that doesn't match constraints, (3) a critical review that
  nitpicks tone, then (4) a final merge that contradicts itself. A single
  well-instructed assistant... often produces a tighter PRD in less time."

**Çıkarım:** Çok-rollü ekip ancak şu koşulda kazanır: TEK, sıkı, hesap
verebilir bir çıktı üretir; her rolün katkısı ayrı ve tekrarsızdır; daha az
laf, daha çok karar. "Mushy aggregate" ölümdür.

## 2. ChatPRD rakip teardown (resmi konumlandırma)

Başlık: "The AI product manager for your entire team". 100k+ kullanıcı iddiası,
"haftada ~10 saat tasarruf". Free tier + Enterprise (SOC2, SSO, custom model).

4 sütun:
1. **AI Documentation** - prompt/toplantı notu/ham fikirden PRD, user story,
   spec; otomatik gap analizi + edge case tespiti.
2. **AI Coaching** - dokümanı "bir CPO gibi" inceler, stratejik boşluk +
   varsayım sorgular ("3x kalite" iddiası).
3. **Integrations** - 12+ araç: Linear, Notion, Slack, GitHub, v0, Lovable,
   Bolt. Tek tık export (Notion/Confluence/Google Docs/Linear).
4. **Team Features** - paylaşımlı workspace, custom AI persona, non-PM rolleri
   için agentic PM.

**Gerçek moat'ları (Reddit eleştirisiyle çapraz okuyunca):** Üretim DEĞİL.
Asıl bağlayıcılar: (a) entegrasyon/export (Linear/Notion tek tık), (b) coaching
çerçevesi (CPO gözüyle review), (c) takım workspace'i + persona'lar.

## 3. PM/QA tarafı sinyaller
- "AI-generated workslop is destroying productivity" (150 oy): AI çıktısı "iş
  gibi görünüp" aşağı akışta temizlik yaratıyor. PM'ler cila değil, karar ve
  netlik istiyor. Onit "workslop üretmeme" sözü vermeli.
- "Soon it's going to be very hard to hire and keep good PMs" (r/PM, 80 oy):
  PM rolü AI ile yeniden tanımlanıyor; araçtan beklenti "düşünme ortağı".
- QA tarafı: agentic PR review + browser QA benchmark'ları popüler
  (Opus/Sonnet karşılaştırmaları). QA değerinin somut/test-edilebilir olması
  bekleniyor (coverage değil, yakalanan bug).

## 4. Onit için stratejik sonuçlar (bu turda uygulanacak yön)

1. **Wrapper algısını kır:** Tek farklılaşma üretim değil; (a) projeyle kalan
   karar/görev/kural hafızası, (b) fikre meydan okuyan opinionated süreç,
   (c) "push to build"e giden somut artefakt (PRD + görev + test planı + edge
   case). Bunlar UI'da görünür olmalı.
2. **"Tiyatro" tuzağından kaç:** Ekip arka planda çalışsın, kullanıcı TEK
   otoriter çıktı görsün. Her rolün katkısı etiketli, tekrarsız, kısa. Cevaplar
   kısa ve karar-odaklı; duvar-metin yasak.
3. **Final-aşama PRD'yi sahiplen:** Konuşmadan biriken bağlamla vanilla LLM'den
   ölçülebilir biçimde daha iyi bir PRD üret. "Bir sonraki seviye" =
   görevleştirme, riskli varsayım, edge case, test planı.
4. **En basit arayüz:** Sohbet ekranı sade. 5 ajanı sürekli göstermek
   "tiyatro" hissi verir. Varsayılan: tek akış + tek artefakt; ekip detayı
   isteyene açılır.
